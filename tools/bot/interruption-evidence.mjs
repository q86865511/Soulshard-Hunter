import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
// Explicit, hashed evidence for externally stopped processes. Never rewrites a session.
export function readVerifiedInterruptions(out) {
 const root=fs.realpathSync(out),result=new Map(),pids=new Set();
 if(!fs.existsSync(path.join(root,'interruptions.json')))return result;
 const inside=relative=>{
  if(typeof relative!=='string'||path.isAbsolute(relative))throw Error('interruption evidence path invalid');
  const full=path.resolve(root,relative),rel=path.relative(root,full);
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('interruption evidence outside phase');
  const real=fs.realpathSync(full),rr=path.relative(root,real);
  if(rr==='..'||rr.startsWith('..'+path.sep)||path.isAbsolute(rr))throw Error('interruption evidence symlink outside phase');
  return real;
 };
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
 const doc=read(inside('interruptions.json'));
 if(doc.version!==1||!Array.isArray(doc.entries))throw Error('interruption evidence schema invalid');
 for(const e of doc.entries) {
  if(e.reason!=='user-request')throw Error('interruption reason invalid');
  const values={};
  for(const key of ['session','progress','pause']){
   const file=inside(e[key]),body=fs.readFileSync(file);
   if(createHash('sha256').update(body).digest('hex')!==e[key+'Sha256'])throw Error('interruption evidence hash mismatch');
   values[key]=JSON.parse(body.toString('utf8').replace(/^\uFEFF/,''));
  }
  const {session:s,progress:p,pause:q}=values;
  const name=e.session.replaceAll('\\','/'),cell=path.posix.dirname(name);
  const start=Date.parse(s.startedAt),observed=Date.parse(q.requestedAt);
  if(!/^session-[\w-]+\.json$/.test(path.posix.basename(name))||
    !Number.isInteger(s.pid)||s.pid<=0||s.endedAt!=null||s.exitCode!=null||s.wallMs!=null||
    q.status!=='paused_by_user'||q.batchStopped!==true||q.batchPid!==p.pid||
    p.current?.pid!==s.pid||p.current?.cell!==cell||q.currentCell!==cell||
    !Array.isArray(p.completed)||q.completedCells!==p.completed.length||
    !Number.isFinite(start)||!Number.isFinite(observed)||observed<start||observed>Date.now())
      throw Error('interruption evidence does not identify a stopped session');
  if(result.has(name)||pids.has(s.pid))throw Error('duplicate interruption evidence');
  pids.add(s.pid);
  result.set(name,{pid:s.pid,startedAt:s.startedAt,observedStoppedAt:q.requestedAt,reason:e.reason,evidence:e});
 }
 return result;
}
