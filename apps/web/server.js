import express from 'express';
import helmet from 'helmet';
import argon2 from 'argon2';
import { WebSocket, WebSocketServer } from 'ws';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { sameSecret, randomToken, signSession, readSession, validOrigin, requireSecret } from '../shared/security.js';
const secret=requireSecret('SESSION_SECRET'), token=requireSecret('WORKSPACE_TOKEN');
const hash=process.env.PASSWORD_HASH;if(!hash?.startsWith('$argon2id$'))throw new Error('PASSWORD_HASH must be an Argon2id hash');
const workspace=process.env.WORKSPACE_URL||'http://localhost:3001';
const origin=process.env.APP_ORIGIN;if(!origin || new URL(origin).origin!==origin)throw new Error('APP_ORIGIN must be the exact app origin');
const secure=process.env.NODE_ENV!=='development';if(secure&&!origin.startsWith('https://'))throw new Error('Production requires HTTPS APP_ORIGIN');
const duration=30*24*60*60*1000;
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],frameSrc:['https://*.browserbase.com','https://browserbase.com'],objectSrc:["'none'"],baseUri:["'self'"],formAction:["'self'"],upgradeInsecureRequests:secure?[]:null}},referrerPolicy:{policy:'no-referrer'}}));
app.get('/health',(_,res)=>res.json({ok:true}));
async function internal(route,options={}){return fetch(workspace+route,{...options,headers:{...options.headers,authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});}
async function session(req){const id=readSession(req.headers.cookie,secret);if(!id)return null;const r=await internal('/api/session/'+id);if(!r.ok)return null;return {id,...await r.json()};}
app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store');if(!['GET','HEAD'].includes(req.method)){if(!validOrigin(req.headers.origin,origin))return res.status(403).json({error:'Invalid request origin'});if(!['application/json','application/octet-stream'].includes((req.headers['content-type']||'').split(';')[0]))return res.status(415).json({error:'Unsupported request type'});}next();});
const attempts=new Map();let loginBusy=false,globalAttempts={count:0,until:0};
app.post('/api/login',express.json({limit:'2kb'}),async(req,res)=>{
  const ip=req.ip, now=Date.now();let a=attempts.get(ip);if(!a||a.until<now)a={count:0,until:now+15*60*1000};
  if(globalAttempts.until<now)globalAttempts={count:0,until:now+15*60*1000};
  if(a.count>=5||globalAttempts.count>=10||loginBusy)return res.status(429).json({error:'Too many attempts. Try again later.'});
  a.count++;globalAttempts.count++;attempts.set(ip,a);if(attempts.size>5000)for(const [k,v] of attempts)if(v.until<now)attempts.delete(k);
  loginBusy=true;let valid=false;try{if(typeof req.body.password==='string' && req.body.password.length<=1024)valid=await argon2.verify(hash,req.body.password);}finally{loginBusy=false;}
  if(!valid)return res.status(401).json({error:'Incorrect password'});
  const id=randomToken(), csrf=randomToken(),expires=now+duration;
  const r=await internal('/api/session/'+id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({csrf,expires})});if(!r.ok)throw new Error('Session storage unavailable');
  attempts.delete(ip);globalAttempts.count=0;res.cookie('agy_session',signSession(id,secret),{httpOnly:true,secure,sameSite:'strict',path:'/',maxAge:duration});res.json({csrf,expires});
});
app.use('/api',async(req,res,next)=>{req.session=await session(req);if(!req.session)return res.status(401).json({error:'Session expired'});if(!['GET','HEAD'].includes(req.method)&&!sameSecret(req.headers['x-csrf-token'],req.session.csrf))return res.status(403).json({error:'Invalid CSRF token'});next();});
app.get('/api/me',(req,res)=>res.json({csrf:req.session.csrf,expires:req.session.expires}));
app.post('/api/logout',async(req,res)=>{await internal('/api/session/'+req.session.id,{method:'DELETE'});for(const ws of wss.clients)if(ws.sessionId===req.session.id)ws.close(4001,'Signed out');res.clearCookie('agy_session',{httpOnly:true,secure,sameSite:'strict',path:'/'});res.json({ok:true});});
const allowed=new Map([['/status',['GET']],['/files',['GET']],['/search',['GET']],['/file',['GET','PUT','DELETE']],['/folder',['POST']],['/rename',['POST']],['/upload',['POST']],['/download',['GET']],['/browser',['GET']]]);
app.use('/api',express.raw({type:()=>true,limit:'20mb'}),async(req,res)=>{
  if(!allowed.get(req.path)?.includes(req.method))return res.status(404).json({error:'Unknown operation'});
  const options={method:req.method,headers:{'content-type':req.headers['content-type']||'application/json'}};if(!['GET','HEAD'].includes(req.method))options.body=req.body;
  const upstream=await internal('/api'+req.url,options);res.status(upstream.status);
  for(const name of ['content-type','content-disposition','content-length'])if(upstream.headers.has(name))res.setHeader(name,upstream.headers.get(name));
  if(upstream.body)Readable.fromWeb(upstream.body).pipe(res);else res.end();
});
const dist=path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
app.use(express.static(dist,{index:false,maxAge:'1h'}));
for(const route of ['/','/login'])app.get(route,(_,res)=>{res.setHeader('Cache-Control','no-store');res.sendFile(path.join(dist,'index.html'));});
app.use((err,req,res,next)=>{console.error(err.message);if(res.headersSent)return next(err);res.status(err.status||502).json({error:err.status===413?'Request exceeds 20 MB':'Service unavailable. Please reconnect.'});});
const server=app.listen(Number(process.env.PORT||3000),'::',()=>console.log('Web gateway listening'));
const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024});
server.on('upgrade',async(req,socket,head)=>{
  socket.on('error',()=>{});
  try{
    if(req.url!=='/ws/terminal'||!validOrigin(req.headers.origin,origin)){socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');return;}
    const s=await session(req);if(!s){socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>{ws.sessionId=s.id;wss.emit('connection',ws,s);});
  }catch{socket.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');}
});
wss.on('connection',(client,s)=>{
  const upstream=new WebSocket(workspace.replace(/^http/,'ws')+'/ws/terminal',{headers:{authorization:`Bearer ${token}`},maxPayload:1024*1024,handshakeTimeout:15000});
  const expiry=setInterval(()=>{if(Date.now()>=s.expires)client.close(4001,'Session expired');},10000);
  let alive=true;
  const heartbeat=setInterval(()=>{if(!alive){client.terminate();return;}alive=false;client.ping();},30000);
  client.on('pong',()=>{alive=true;});
  upstream.on('open',()=>{if(client.readyState===1)client.send(JSON.stringify({type:'ready'}));else upstream.close();});
  client.on('message',data=>{if(upstream.readyState===1){if(upstream.bufferedAmount>4*1024*1024){client.close(1013,'Input buffer full');return;}upstream.send(data,{binary:false});}});
  upstream.on('message',data=>{if(client.readyState===1){client.send(data,{binary:false});if(client.bufferedAmount>4*1024*1024)client.close(1013,'Reconnect to resume output');}});
  upstream.on('close',()=>client.close(1012,'Workspace disconnected'));
  upstream.on('error',()=>client.close(1011,'Workspace unavailable'));
  client.on('close',()=>{clearInterval(expiry);clearInterval(heartbeat);upstream.close();});client.on('error',()=>{});
});
