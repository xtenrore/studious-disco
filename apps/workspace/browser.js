let discoveredProject;
async function browserRequest(route){
  const res=await fetch('https://api.browserbase.com/v1/'+route,{headers:{'x-bb-api-key':process.env.BROWSERBASE_API_KEY},signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Object.assign(new Error(`Browserbase request failed (${res.status})`),{status:502});return res.json();
}
export async function resolveBrowserProject(){
  if(process.env.BROWSERBASE_PROJECT_ID)return process.env.BROWSERBASE_PROJECT_ID;
  if(discoveredProject)return discoveredProject;
  const projects=await browserRequest('projects');
  if(!Array.isArray(projects)||projects.length!==1)throw Object.assign(new Error('Set BROWSERBASE_PROJECT_ID to select one of your Browserbase projects.'),{status:409});
  discoveredProject=projects[0].id;return discoveredProject;
}
export async function browserSessions() {
  if(!process.env.BROWSERBASE_API_KEY)return {configured:false,sessions:[]};
  const project=await resolveBrowserProject();
  const list=await browserRequest('sessions');
  const active=(Array.isArray(list)?list:list.sessions||[]).filter(s=>s.status==='RUNNING'&&s.projectId===project).slice(0,10);
  const sessions=await Promise.all(active.map(async s=>{const debug=await browserRequest(`sessions/${encodeURIComponent(s.id)}/debug`);const liveUrl=debug.debuggerFullscreenUrl||debug.debuggerUrl;const url=new URL(liveUrl);if(url.protocol!=='https:'||!(url.hostname==='browserbase.com'||url.hostname.endsWith('.browserbase.com')))throw new Error('Invalid live view URL');return {id:s.id,createdAt:s.createdAt,liveUrl};}));
  return {configured:true,sessions};
}
