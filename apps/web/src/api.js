let csrf='';
export function setCsrf(value){csrf=value;}
export async function api(route, options={}) {
  const headers={...options.headers};
  if(options.body && typeof options.body!=='string' && !(options.body instanceof Blob)){headers['content-type']='application/json';options={...options,body:JSON.stringify(options.body)};}
  if(options.method && options.method!=='GET') {headers['x-csrf-token']=csrf;headers['content-type']||='application/json';}
  const res=await fetch('/api'+route,{...options,headers,credentials:'same-origin'});
  if(res.status===401 && route!=='/login'){window.dispatchEvent(new Event('session-expired'));}
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed');return data;
}
