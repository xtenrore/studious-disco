import fs from 'node:fs/promises';
import path from 'node:path';
export class FileStore {
  constructor(root) {this.root=path.resolve(root);}
  async resolve(input='', allowMissing=false) {
    if(typeof input!=='string' || input.includes('\0') || path.isAbsolute(input)) throw Object.assign(new Error('Invalid path'),{status:400});
    const target=path.resolve(this.root,input);
    if(target!==this.root && !target.startsWith(this.root+path.sep)) throw Object.assign(new Error('Path outside projects'),{status:403});
    const parts=path.relative(this.root,target).split(path.sep).filter(Boolean);
    let current=this.root;
    for(let i=0;i<parts.length;i++) {
      current=path.join(current,parts[i]);
      try {if((await fs.lstat(current)).isSymbolicLink()) throw Object.assign(new Error('Symbolic links cannot be accessed'),{status:403});}
      catch(e) {if(allowMissing && e.code==='ENOENT' && i===parts.length-1) break; throw e;}
    }
    return target;
  }
  async list(input='') {
    const dir=await this.resolve(input); const entries=await fs.readdir(dir,{withFileTypes:true});
    return Promise.all(entries.map(async e=>({name:e.name,path:path.posix.join(input,e.name),directory:e.isDirectory(),symlink:e.isSymbolicLink(),size:(await fs.lstat(path.join(dir,e.name))).size}))).then(x=>x.sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name)));
  }
  async search(query, input='') {
    if(!query || query.length>200) return [];
    const results=[]; let visited=0;
    const visit=async dir=>{
      for(const entry of await this.list(dir)) {
        if(++visited>10000 || results.length>=100) return;
        if(entry.symlink) continue;
        if(entry.name.toLowerCase().includes(query.toLowerCase())) results.push(entry);
        if(entry.directory && !['.git','node_modules'].includes(entry.name)) await visit(entry.path);
      }
    }; await visit(input); return results;
  }
  async write(input, data, create=false) {
    const file=await this.resolve(input,true); if(file===this.root) throw Object.assign(new Error('Choose a file'),{status:400});
    await fs.writeFile(file,data,{flag:create?'wx':'w',mode:0o600});
  }
}
