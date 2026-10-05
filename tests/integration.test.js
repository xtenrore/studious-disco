import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import argon2 from 'argon2';
import {WebSocket} from 'ws';
const token='workspace-test-token-'.repeat(3), secret='session-test-secret-'.repeat(3),origin='http://localhost:13900';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await delay(100);}throw new Error('Service failed to start');}
function start(file,env){const child=spawn(process.execPath,[file],{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});child.stderr.on('data',data=>process.stderr.write(data));return child;}
async function stop(child){if(child.exitCode!==null)return;child.kill();await new Promise(r=>child.once('exit',r));}
async function rejectSocket(headers){await new Promise((resolve,reject)=>{const ws=new WebSocket(origin.replace('http','ws')+'/ws/terminal',{headers});ws.once('unexpected-response',(req,res)=>{res.resume();assert.ok([401,403].includes(res.statusCode));resolve();});ws.once('open',()=>{ws.close();reject(new Error('Unauthorized socket connected'));});ws.once('error',()=>{});});}
async function terminal(cookie){const ws=new WebSocket(origin.replace('http','ws')+'/ws/terminal',{headers:{origin,cookie}});let output='';let ready;const connected=new Promise((resolve,reject)=>{ready=resolve;ws.once('error',reject);});ws.on('message',data=>{const m=JSON.parse(data.toString());if(m.type==='ready')ready();if(m.type==='output')output+=m.data;});await connected;return {ws,output:()=>output,send:data=>ws.send(JSON.stringify({type:'input',data}))};}
test('gateway authentication, CSRF, real files, tmux reconnect, persistence and logout',{timeout:60000},async t=>{
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'agy-integration-'));const hash=await argon2.hash('test-password',{type:argon2.argon2id});const env={WORKSPACE_TOKEN:token,AGY_HOME:home,PORT:'13901',TMUX_TMPDIR:home};let workspace=start('apps/workspace/server.js',env);const web=start('apps/web/server.js',{PORT:'13900',NODE_ENV:'development',APP_ORIGIN:origin,WORKSPACE_URL:'http://localhost:13901',WORKSPACE_TOKEN:token,SESSION_SECRET:secret,PASSWORD_HASH:hash});
 try{
 await waitFor(origin+'/health');await waitFor('http://localhost:13901/health');
 assert.equal((await fetch(origin+'/api/files')).status,401);assert.equal((await fetch('http://localhost:13901/api/files')).status,401);
 const login=await fetch(origin+'/api/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password:'test-password'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);const {csrf}=await login.json();
 const request=(route,method='GET',body,headers={})=>fetch(origin+'/api'+route,{method,headers:{cookie,origin,'content-type':'application/json','x-csrf-token':csrf,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 assert.equal((await request('/folder','POST',{path:'project'},{'x-csrf-token':'wrong'})).status,403);assert.equal((await request('/folder','POST',{path:'project'},{origin:'https://evil.example'})).status,403);
 assert.equal((await request('/folder','POST',{path:'project'})).status,200);
 const text='hello\n  🌍 日本語\n';assert.equal((await request('/file','PUT',{path:'project/notes.md',content:text,create:true})).status,200);assert.equal((await (await request('/file?path=project%2Fnotes.md')).json()).content,text);
 assert.equal((await request('/file?path=..%2Fsecret')).status,403);
 assert.equal((await request('/rename','POST',{path:'project/notes.md',to:'project/memory.md'})).status,200);
 assert.equal(await (await request('/download?path=project%2Fmemory.md')).text(),text);
 const upload=await fetch(origin+'/api/upload?path=project%2Fbinary.bin',{method:'POST',headers:{cookie,origin,'x-csrf-token':csrf,'content-type':'application/octet-stream'},body:Buffer.from([0,1,2,255])});assert.equal(upload.status,200);assert.equal((await request('/file?path=project%2Fbinary.bin')).status,415);
 await rejectSocket({origin});await rejectSocket({origin:'https://evil.example',cookie});
 const first=await terminal(cookie);await delay(200);first.send('export AGY_PERSIST_TEST=STILL_HERE\r');await delay(100);first.ws.close();await delay(200);
 const second=await terminal(cookie);await delay(200);second.send('printf "persistence:%s\\n" "$AGY_PERSIST_TEST"\r');for(let i=0;i<30&&!second.output().includes('persistence:STILL_HERE');i++)await delay(100);assert.ok(second.output().includes('persistence:STILL_HERE'));
 const large=('  indented code 🌍 日本語 '+ 'x'.repeat(120)+'\n').repeat(1400);
 second.send("stty -echo; python3 -c 'import sys; from pathlib import Path; Path(\"big-paste.txt\").write_bytes(sys.stdin.buffer.read())'; stty echo\r");await delay(300);
 for(let i=0;i<large.length;i+=4096){second.send(large.slice(i,i+4096));await delay(2);}await delay(300);second.send('\x04');
 for(let i=0;i<100;i++){try{const result=await fs.readFile(path.join(home,'projects','big-paste.txt'),'utf8');if(result===large)break;}catch{}await delay(100);}
 assert.equal(await fs.readFile(path.join(home,'projects','big-paste.txt'),'utf8'),large);second.ws.close();
 await stop(workspace);workspace=start('apps/workspace/server.js',env);await waitFor('http://localhost:13901/health');assert.equal((await request('/me')).status,200);assert.equal((await (await request('/file?path=project%2Fmemory.md')).json()).content,text);
 assert.equal((await request('/logout','POST',{})).status,200);assert.equal((await request('/me')).status,401);await rejectSocket({origin,cookie});
 }finally{await stop(web);await stop(workspace);try{execFileSync('tmux',['kill-server'],{env:{...process.env,TMUX_TMPDIR:home},stdio:'ignore'});}catch{}await fs.rm(home,{recursive:true,force:true});}
});
