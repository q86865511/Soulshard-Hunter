import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { checkManifest } from './experiment.mjs';
export function sourceIdentity(root){
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const files=git('ls-files','--cached','--others','--exclude-standard','--','src/','tools/bot/','tools/serve.mjs','index.html')
  .split(/\r?\n/).filter(f=>f&&!f.startsWith('tools/bot/test/')&&/\.(js|mjs|json|html)$/.test(f)).sort();
 const hash=createHash('sha256');
 for(const name of [...new Set(files)])hash.update(name+'\0').update(fs.readFileSync(path.join(root,name))).update('\0');
 return {commit:git('rev-parse','HEAD'),sourceHash:hash.digest('hex')};
}
export function writeJson(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n','utf8');}
export function openManifest(outDir,identity){
 const file=path.join(outDir,'manifest.json');
 if(fs.existsSync(file)){
  const mismatch=checkManifest(JSON.parse(fs.readFileSync(file,'utf8')),identity);
  if(mismatch)throw Error(mismatch+'; use original arguments or new --out');
 } else {
  if(fs.existsSync(path.join(outDir,'runs.jsonl')))throw Error('manifest missing for existing runs; use new --out');
  fs.mkdirSync(outDir,{recursive:true});
  fs.writeFileSync(file,JSON.stringify(identity,null,2)+'\n',{encoding:'utf8',flag:'wx'});
 }
}
export function sessionFile(outDir){return path.join(outDir,'session-'+Date.now()+'-'+randomUUID()+'.json');}
