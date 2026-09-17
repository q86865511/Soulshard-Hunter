import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readVerifiedInterruptions} from '../interruption-evidence.mjs';
import {summarizeSessions} from '../session-audit.mjs';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../.pipeline');
fs.mkdirSync(base,{recursive:true});
function fixture(change={}){
 const dir=fs.mkdtempSync(path.join(base,'interruption-test-'));
 const cell='seed-1/crypt/C',sessionFile=cell+'/session-1-a.json';
 const session={pid:47,startedAt:'2020-01-01T00:00:00Z',...change.session};
 const progress={pid:46,current:{pid:47,cell},completed:[],...change.progress};
 const pause={status:'paused_by_user',batchStopped:true,batchPid:46,currentCell:cell,completedCells:0,requestedAt:'2020-01-01T00:00:02Z',...change.pause};
 const entry={reason:'user-request',session:sessionFile,progress:'evidence/progress.json',pause:'evidence/pause.json'};
 const values={session,progress,pause};
 for(const key of ['session','progress','pause']){
  const file=path.join(dir,entry[key]);fs.mkdirSync(path.dirname(file),{recursive:true});
  const body=JSON.stringify(values[key]);fs.writeFileSync(file,body);
  entry[key+'Sha256']=createHash('sha256').update(body).digest('hex');
 }
 const write=()=>fs.writeFileSync(path.join(dir,'interruptions.json'),JSON.stringify({version:1,entries:[entry]}));
 write();
 const close=()=>{const absolute=path.resolve(dir);assert.ok(absolute.startsWith(base+path.sep)&&path.basename(absolute).startsWith('interruption-test-'));fs.rmSync(absolute,{recursive:true,force:true});};
 return {dir,session,sessionFile,entry,write,close};
}
const terminal={startedAt:'2020-01-01T00:00:02Z',endedAt:'2020-01-01T00:00:03Z',wallMs:1000,exitCode:0,apiHits:2,browserRestarts:1};
test('verified user stop retains unknown counters and duration without mutating original session',()=>{
 const f=fixture();try{
  const before=fs.readFileSync(path.join(f.dir,f.sessionFile));
  const evidence=readVerifiedInterruptions(f.dir);
  const out=summarizeSessions([terminal,{...f.session,auditKey:f.sessionFile}],evidence);
  assert.equal(out.interruptedSessions,1);assert.equal(out.missingWallTimes,1);
  assert.equal(out.apiHitsKnown,2);assert.equal(out.browserRestartsKnown,1);
  assert.equal(out.missingApiCounters,1);assert.equal(out.missingRestartCounters,1);assert.equal(out.wallMs,1000);
  assert.deepEqual(fs.readFileSync(path.join(f.dir,f.sessionFile)),before);
 }finally{f.close();}
});
test('missing, live, mismatched or fabricated stop evidence remains rejected',()=>{
 const f=fixture();try{
  assert.throws(()=>summarizeSessions([terminal,{...f.session,auditKey:f.sessionFile,externalStop:true}]),/terminal/);
  fs.appendFileSync(path.join(f.dir,f.entry.progress),' ');
  assert.throws(()=>readVerifiedInterruptions(f.dir),/hash/);
 }finally{f.close();}
 for(const change of [{pause:{batchStopped:false}},{progress:{current:{pid:48,cell:'seed-1/crypt/C'}}},{session:{exitCode:0}},{pause:{requestedAt:'2019-01-01T00:00:00Z'}}]){
  const x=fixture(change);try{assert.throws(()=>readVerifiedInterruptions(x.dir),/does not identify/);}finally{x.close();}
 }
});
test('receipt paths cannot escape the phase; successful counters are still required',()=>{
 const f=fixture();try{
  f.entry.progress='../outside.json';f.write();
  assert.throws(()=>readVerifiedInterruptions(f.dir),/outside/);
  assert.throws(()=>summarizeSessions([{...terminal,apiHits:undefined}]),/counter missing/);
 }finally{f.close();}
});
