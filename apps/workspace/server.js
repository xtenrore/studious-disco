import express from 'express';
import { WebSocketServer } from 'ws';
import pty from 'node-pty';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FileStore } from './files.js';
import { Sessions } from './sessions.js';
import { browserSessions } from './browser.js';
import { sameSecret, requireSecret } from '../shared/security.js';
const token=requireSecret('WORKSPACE_TOKEN');
const home=process.env.AGY_HOME||'/home/agy';
const root=path.join(home,'projects');
const state=path.join(home,'.local/share/personal-agy');
await fs.mkdir(root,{recursive:true});await fs.mkdir(state,{recursive:true,mode:0o700});await fs.mkdir(path.join(home,'memory'),{recursive:true});
const files=new FileStore(root), sessions=new Sessions(path.join(state,'sessions.json'));await sessions.init();
const app=express();app.disable('x-powered-by');app.get('/health',(_,res)=>res.json({ok:true}));
app.use((req,res,next)=>sameSecret(req.headers.authorization,`Bearer ${token}`)?next():res.status(401).json({error:'Unauthorized'}));
app.use(express.json({limit:'20mb'}));
app.get('/api/session/:id',(req,res)=>{const s=sessions.get(req.params.id);res.status(s?200:401).json(s||{error:'Session expired'});});
app.put('/api/session/:id',async(req,res)=>{const {csrf,expires}=req.body;if(typeof csrf!=='string'||!Number.isFinite(expires))return res.sendStatus(400);await sessions.set(req.params.id,{csrf,expires});res.json({ok:true});});
app.delete('/api/session/:id',async(req,res)=>{await sessions.delete(req.params.id);res.json({ok:true});});
app.get('/api/status',(_,res)=>res.json({home,projects:root,terminal:'agy-main',browserConfigured:!!process.env.BROWSERBASE_API_KEY,agentInstalled:!!execFileSync('sh',['-c','command -v agy || true'],{encoding:'utf8'}).trim()}));
app.get('/api/files',async(req,res)=>res.json(await files.list(req.query.path||'')));
app.get('/api/search',async(req,res)=>res.json(await files.search(req.query.q,req.query.path||'')));
app.get('/api/file',async(req,res)=>{const file=await files.resolve(req.query.path);const stat=await fs.stat(file);if(!stat.isFile())return res.status(400).json({error:'Choose a file'});if(stat.size>5*1024*1024)return res.status(413).json({error:'File is too large for the editor; use Download'});const data=await fs.readFile(file);if(data.includes(0))return res.status(415).json({error:'Binary file; use Download'});res.json({content:data.toString('utf8')});});
app.get('/api/download',async(req,res)=>res.download(await files.resolve(req.query.path)));
app.put('/api/file',async(req,res)=>{if(typeof req.body.content!=='string')return res.sendStatus(400);await files.write(req.body.path,req.body.content,!!req.body.create);res.json({ok:true});});
app.post('/api/folder',async(req,res)=>{const dir=await files.resolve(req.body.path,true);if(dir===root)return res.sendStatus(400);await fs.mkdir(dir,{mode:0o700});res.json({ok:true});});
app.post('/api/rename',async(req,res)=>{const source=await files.resolve(req.body.path);const dest=await files.resolve(req.body.to,true);if(source===root||dest===root)return res.sendStatus(400);try{await fs.lstat(dest);return res.status(409).json({error:'Destination already exists'});}catch(e){if(e.code!=='ENOENT')throw e;}await fs.rename(source,dest);res.json({ok:true});});
app.delete('/api/file',async(req,res)=>{const file=await files.resolve(req.body.path);if(file===root)return res.sendStatus(400);await fs.rm(file,{recursive:true});res.json({ok:true});});
app.post('/api/upload',express.raw({type:'application/octet-stream',limit:'20mb'}),async(req,res)=>{if(!Buffer.isBuffer(req.body))return res.sendStatus(400);await files.write(req.query.path,req.body,true);res.json({ok:true});});
app.get('/api/browser',async(_,res)=>res.json(await browserSessions()));
app.use((err,req,res,next)=>{if(res.headersSent)return next(err);res.status(err.status||({ENOENT:404,EEXIST:409,EISDIR:400,ENOTDIR:400}[err.code])||500).json({error:err.status||err.code?err.message:'Workspace operation failed'});});
const server=app.listen(Number(process.env.PORT||3001),'::',()=>console.log('Workspace listening'));
const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024});
server.on('upgrade',(req,socket,head)=>{if(req.url!=='/ws/terminal'||!sameSecret(req.headers.authorization,`Bearer ${token}`)){socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');return;}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));});
wss.on('connection',ws=>{
  // Create a shell only when the user attaches. AGY is started exclusively by user input.
  try{
    try{execFileSync('tmux',['has-session','-t','agy-main'],{stdio:'ignore'});}catch{execFileSync('tmux',['-f',fileURLToPath(new URL('./tmux.conf',import.meta.url)),'new-session','-d','-s','agy-main','-c',root,'/bin/bash','-l']);execFileSync('tmux',['set-option','-t','agy-main','history-limit','50000']);execFileSync('tmux',['set-option','-t','agy-main','status','off']);}
    try{const history=execFileSync('tmux',['capture-pane','-p','-e','-J','-t','agy-main','-S','-50000','-E','-1'],{encoding:'utf8',maxBuffer:16*1024*1024});if(history.trim()){const replay=history.replace(/\r?\n/g,'\r\n');for(let i=0;i<replay.length;i+=32768)ws.send(JSON.stringify({type:'output',data:replay.slice(i,i+32768)}));}}catch{}
    const child=pty.spawn('tmux',['attach-session','-t','agy-main'],{name:'xterm-256color',cols:80,rows:24,cwd:root,env:{...process.env,HOME:home,TERM:'xterm-256color'}});
    let paused=false;
    const output=child.onData(data=>{if(ws.readyState===1){ws.send(JSON.stringify({type:'output',data}));if(ws.bufferedAmount>2*1024*1024&&!paused){child.pause();paused=true;}}});
    const flow=setInterval(()=>{if(paused&&ws.bufferedAmount<65536){child.resume();paused=false;}},50);
    child.onExit(()=>{if(ws.readyState===1)ws.close(1000,'Terminal detached');});
    ws.on('message',raw=>{try{const m=JSON.parse(raw.toString());if(m.type==='input'&&typeof m.data==='string'&&m.data.length<=65536)child.write(m.data);else if(m.type==='resize'&&Number.isInteger(m.cols)&&Number.isInteger(m.rows))child.resize(Math.max(10,Math.min(m.cols,500)),Math.max(2,Math.min(m.rows,200)));}catch{ws.close(1003,'Invalid terminal message');}});
    ws.on('close',()=>{clearInterval(flow);output.dispose();child.kill();});ws.on('error',()=>{});
  }catch{ws.close(1011,'Terminal unavailable');}
});
