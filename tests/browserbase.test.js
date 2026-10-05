import test from 'node:test';
import assert from 'node:assert/strict';
test('key-only Browserbase configuration discovers a project and exposes only its active live view',async()=>{
 const original=globalThis.fetch,oldKey=process.env.BROWSERBASE_API_KEY,oldProject=process.env.BROWSERBASE_PROJECT_ID;
 process.env.BROWSERBASE_API_KEY='test-key-not-for-client';delete process.env.BROWSERBASE_PROJECT_ID;const routes=[];
 globalThis.fetch=async(url,options)=>{assert.equal(options.headers['x-bb-api-key'],'test-key-not-for-client');routes.push(url);const data=url.endsWith('/projects')?[{id:'project'}]:url.endsWith('/sessions')?[{id:'active',projectId:'project',status:'RUNNING',createdAt:'today'},{id:'ended',projectId:'project',status:'COMPLETED'},{id:'other',projectId:'other-project',status:'RUNNING'}]:{debuggerFullscreenUrl:'https://www.browserbase.com/devtools/inspector.html?session=active'};return {ok:true,json:async()=>data};};
 try{const {browserSessions}=await import('../apps/workspace/browser.js?test=key-only');const data=await browserSessions();assert.equal(data.configured,true);assert.equal(data.sessions.length,1);assert.equal(data.sessions[0].id,'active');assert.ok(!JSON.stringify(data).includes('test-key'));assert.equal(routes.length,3);}finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.BROWSERBASE_API_KEY;else process.env.BROWSERBASE_API_KEY=oldKey;if(oldProject===undefined)delete process.env.BROWSERBASE_PROJECT_ID;else process.env.BROWSERBASE_PROJECT_ID=oldProject;}
});
test('Browserbase refuses ambiguous projects and untrusted live-view hosts',async()=>{
 const original=globalThis.fetch,oldKey=process.env.BROWSERBASE_API_KEY,oldProject=process.env.BROWSERBASE_PROJECT_ID;process.env.BROWSERBASE_API_KEY='test';delete process.env.BROWSERBASE_PROJECT_ID;
 try{
  globalThis.fetch=async()=>({ok:true,json:async()=>[{id:'a'},{id:'b'}]});const ambiguous=await import('../apps/workspace/browser.js?test=ambiguous');await assert.rejects(ambiguous.browserSessions(),/BROWSERBASE_PROJECT_ID/);
  process.env.BROWSERBASE_PROJECT_ID='project';globalThis.fetch=async url=>({ok:true,json:async()=>url.endsWith('/sessions')?[{id:'active',projectId:'project',status:'RUNNING'}]:{debuggerFullscreenUrl:'https://browserbase.com.evil.example/live'}});const unsafe=await import('../apps/workspace/browser.js?test=unsafe');await assert.rejects(unsafe.browserSessions(),/Invalid live view/);
 }finally{globalThis.fetch=original;if(oldKey===undefined)delete process.env.BROWSERBASE_API_KEY;else process.env.BROWSERBASE_API_KEY=oldKey;if(oldProject===undefined)delete process.env.BROWSERBASE_PROJECT_ID;else process.env.BROWSERBASE_PROJECT_ID=oldProject;}
});
test('managed-browser launcher requires only the Browserbase key and preserves an optional context',async()=>{
 const {createRemoteSession}=await import('../scripts/browserbase-mcp.js');let body;
 const request=async(url,options)=>{assert.equal(url,'https://api.browserbase.com/v1/sessions');assert.equal(options.headers['x-bb-api-key'],'only-key');body=JSON.parse(options.body);return {ok:true,json:async()=>({id:'session',connectUrl:'wss://connect.browserbase.com?sessionId=session'})};};
 const session=await createRemoteSession('project',{apiKey:'only-key',contextId:'saved-context',request});assert.equal(session.id,'session');assert.deepEqual(body,{projectId:'project',browserSettings:{context:{id:'saved-context',persist:true}}});
 await createRemoteSession('project',{apiKey:'only-key',request});assert.deepEqual(body,{projectId:'project'});
 await assert.rejects(createRemoteSession('project',{}),/BROWSERBASE_API_KEY/);
 await assert.rejects(createRemoteSession('project',{apiKey:'key',request:async()=>({ok:true,json:async()=>({id:'session',connectUrl:'wss://browserbase.com.evil.example'})})}),/Invalid Browserbase/);
});
