import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
export class Sessions {
  constructor(file){this.file=file;this.sessions={};this.queue=Promise.resolve();}
  key(id){return createHash('sha256').update(id).digest('hex');}
  async init(){try{this.sessions=JSON.parse(await fs.readFile(this.file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
  get(id){const s=this.sessions[this.key(id)];return s && s.expires>Date.now()?s:null;}
  async save(){this.queue=this.queue.catch(()=>{}).then(async()=>{for(const [k,v] of Object.entries(this.sessions))if(v.expires<=Date.now())delete this.sessions[k];await fs.writeFile(this.file+'.tmp',JSON.stringify(this.sessions),{mode:0o600});await fs.rename(this.file+'.tmp',this.file);});await this.queue;}
  async set(id,session){this.sessions[this.key(id)]=session;await this.save();}
  async delete(id){delete this.sessions[this.key(id)];await this.save();}
}
