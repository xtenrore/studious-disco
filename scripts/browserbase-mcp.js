#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolveBrowserProject} from '../apps/workspace/browser.js';

export async function createRemoteSession(projectId, {apiKey, contextId, request=fetch}={}) {
  if (!apiKey) throw new Error('Set BROWSERBASE_API_KEY before starting Browserbase MCP.');
  const body={projectId};
  if(contextId) body.browserSettings={context:{id:contextId,persist:true}};
  const response=await request('https://api.browserbase.com/v1/sessions',{
    method:'POST',headers:{'x-bb-api-key':apiKey,'content-type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(15000)
  });
  if(!response.ok)throw new Error(`Browserbase session creation failed (${response.status}).`);
  const session=await response.json();
  if(!session.id||!session.connectUrl)throw new Error('Browserbase did not return a browser connection.');
  const endpoint=new URL(session.connectUrl);
  if(endpoint.protocol!=='wss:'||!endpoint.hostname.endsWith('.browserbase.com'))throw new Error('Invalid Browserbase connection URL.');
  return session;
}

async function main(){
  const projectId=await resolveBrowserProject();
  const session=await createRemoteSession(projectId,{apiKey:process.env.BROWSERBASE_API_KEY,contextId:process.env.BROWSERBASE_CONTEXT_ID});
  // Connect only to managed Chromium: no local browser launch or model calls.
  const child=spawn('/usr/local/bin/playwright-mcp',['--cdp-endpoint',session.connectUrl,'--no-webmcp','--codegen','none'],{stdio:'inherit'});
  let finishing=false;
  async function finish(code){
    if(finishing)return;finishing=true;
    try{await fetch(`https://api.browserbase.com/v1/sessions/${encodeURIComponent(session.id)}`,{
      method:'POST',headers:{'x-bb-api-key':process.env.BROWSERBASE_API_KEY,'content-type':'application/json'},
      body:JSON.stringify({projectId,status:'REQUEST_RELEASE'}),signal:AbortSignal.timeout(10000)
    });}catch{console.error('Browserbase release request failed; the provider session timeout still applies.');}
    process.exit(code);
  }
  child.once('error',()=>{console.error('Playwright MCP could not start.');void finish(1);});
  child.once('exit',(code)=>void finish(code??0));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
