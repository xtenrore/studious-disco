import {chromium,webkit,devices} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import argon2 from 'argon2';
import assert from 'node:assert/strict';
const selectedEngines=process.env.BROWSER_ENGINES||'desktop,iphone-chromium,iphone-webkit';
const home=await fs.mkdtemp(path.join(os.tmpdir(),'agy-browser-'));const origin='http://localhost:14900';
const shared={...process.env,WORKSPACE_TOKEN:'browser-test-workspace-token'.repeat(2),SESSION_SECRET:'browser-test-session-secret'.repeat(2)};
await fs.mkdir(path.join(home,'projects','demo-project','.private-memory'),{recursive:true});await fs.writeFile(path.join(home,'projects','demo-project','hello.md'),'# Hello\n\nUnicode: 🌍 日本語\n');
const workspace=spawn(process.execPath,['apps/workspace/server.js'],{env:{...shared,PORT:'14901',AGY_HOME:home,TMUX_TMPDIR:home},stdio:'inherit'});
const web=spawn(process.execPath,['apps/web/server.js'],{env:{...shared,PORT:'14900',APP_ORIGIN:origin,NODE_ENV:'development',WORKSPACE_URL:'http://localhost:14901',PASSWORD_HASH:await argon2.hash('browser-test-password',{type:argon2.argon2id})},stdio:'inherit'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/health')).ok)break;}catch{}await delay(100);}
 await fs.mkdir('docs/screenshots',{recursive:true});
 for(const [name,engine,device] of [['desktop',chromium,{viewport:{width:1440,height:1000}}],['iphone-chromium',chromium,{...devices['iPhone 13'],defaultBrowserType:undefined}],['iphone-webkit',webkit,{...devices['iPhone 13'],defaultBrowserType:undefined}]]){
  if(!selectedEngines.split(',').includes(name))continue;
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext(device), page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin);await page.waitForURL('**/login');await page.screenshot({path:`docs/screenshots/${name}-login.png`,fullPage:true});
   await page.getByLabel('Workspace password').fill('browser-test-password');await page.getByRole('button',{name:'Open workspace'}).click();await page.waitForURL(origin+'/');await page.getByText('Connected',{exact:true}).waitFor();await page.waitForTimeout(500);
   await page.screenshot({path:`docs/screenshots/${name}-terminal.png`,fullPage:true});
   const navigation=page.getByRole('navigation',{name:name==='desktop'?'Main navigation':'Mobile navigation',exact:true});
   await navigation.getByRole('button',{name:'Files',exact:true}).click();await page.getByRole('button',{name:'demo-project',exact:false}).first().click();await page.getByRole('button',{name:'hello.md',exact:false}).first().click();await page.locator('.cm-content').waitFor();assert.ok((await page.locator('.cm-content').innerText()).includes('Unicode: 🌍 日本語'));
   await page.screenshot({path:`docs/screenshots/${name}-files.png`,fullPage:true});
   await navigation.getByRole('button',{name:'Memory',exact:true}).click();await page.locator('.project-select select').selectOption('demo-project');await page.getByRole('button',{name:'File',exact:true}).click();await page.getByPlaceholder('Name',{exact:true}).fill(`notes-${name}.md`);await page.getByRole('button',{name:'Create',exact:true}).click();await page.getByRole('button',{name:`notes-${name}.md`,exact:false}).first().waitFor();
   await navigation.getByRole('button',{name:'Browser',exact:true}).click();await page.getByRole('heading',{name:'Connect your cloud browser'}).waitFor();
   await navigation.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('heading',{name:'Private by design'}).waitFor();
   assert.equal(new URL(page.url()).pathname,'/');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
   await page.reload();await page.getByText('Connected',{exact:true}).waitFor();assert.equal(new URL(page.url()).pathname,'/');
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
   assert.deepEqual(errors,[]);await context.close();console.log(`${name}: login, terminal, files, memory, browser, settings, persistence and landscape passed`);
  }finally{await browser.close();}
 }
}finally{
 for(const child of [web,workspace]){child.kill();await new Promise(r=>child.once('exit',r));}
 try{execFileSync('tmux',['kill-server'],{env:{...process.env,TMUX_TMPDIR:home},stdio:'ignore'});}catch{}
 await fs.rm(home,{recursive:true,force:true});
}
