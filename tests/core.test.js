import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {FileStore} from '../apps/workspace/files.js';
import {Sessions} from '../apps/workspace/sessions.js';
import {signSession,readSession,validOrigin,sameSecret} from '../apps/shared/security.js';
test('signed sessions reject tampering and origin checks are exact',()=>{
 const secret='a'.repeat(32),token=signSession('abc',secret);
 assert.equal(readSession('foo=bar; agy_session='+token,secret),'abc');assert.equal(readSession('agy_session='+token+'x',secret),null);assert.equal(readSession('agy_session='+token+'.extra',secret),null);assert.equal(readSession('agy_session='+token,'b'.repeat(32)),null);
 assert.equal(validOrigin('https://private.example','https://private.example'),true);assert.equal(validOrigin('https://private.example.evil','https://private.example'),false);assert.equal(validOrigin(undefined,'https://private.example'),false);assert.equal(sameSecret('',undefined),false);
});
test('file operations preserve Unicode and deny traversal and symlinks',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'agy-files-'));const files=new FileStore(root);
 try{
  await fs.mkdir(path.join(root,'project'));await files.write('project/notes.md','  hello\n🌍 日本語\n',true);
  assert.equal(await fs.readFile(await files.resolve('project/notes.md'),'utf8'),'  hello\n🌍 日本語\n');
  assert.equal((await files.search('NOTES'))[0].path,'project/notes.md');
  await assert.rejects(files.resolve('../outside'),/outside/);await assert.rejects(files.resolve('/etc/passwd'),/Invalid path/);
  await fs.symlink('/etc',path.join(root,'escape'));await assert.rejects(files.resolve('escape/passwd'),/Symbolic/);
  await fs.symlink('/etc/passwd',path.join(root,'passwd'));await assert.rejects(files.write('passwd','bad'),/Symbolic/);
  await assert.rejects(files.write('project/notes.md','overwrite',true),{code:'EEXIST'});
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('sessions persist through daemon restarts, expire, and revoke',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'agy-session-'));const file=path.join(dir,'sessions.json');
 try{const a=new Sessions(file);await a.init();await a.set('opaque-token',{csrf:'csrf',expires:Date.now()+60000});await a.set('expired',{csrf:'bad',expires:Date.now()-1});const b=new Sessions(file);await b.init();assert.equal(b.get('opaque-token').csrf,'csrf');assert.equal(b.get('expired'),null);assert.ok(!(await fs.readFile(file,'utf8')).includes('opaque-token'));await b.delete('opaque-token');const c=new Sessions(file);await c.init();assert.equal(c.get('opaque-token'),null);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
