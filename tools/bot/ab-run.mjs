// Sequential experiment orchestrator. Never changes game files or old batch directories.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { makeSchedule, auditCell, checkManifest } from './experiment.mjs';
import { sourceIdentity, writeJson } from './experiment-io.mjs';
import { expandCombos, readJsonlTolerant } from './plan.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [phase,outArg,...extra]=process.argv.slice(2);
if(!['pilot','confirm'].includes(phase)||!outArg||extra.length)throw Error('Usage: node tools/bot/ab-run.mjs pilot|confirm tools/bot/out/<new-phase-dir>');
const out=path.resolve(ROOT,outArg),ids=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/bot/ids.json')));
if(!out.startsWith(path.join(ROOT,'tools/bot/out')+path.sep))throw Error('experiment out must be under tools/bot/out/');
if(ids.biomes.length!==10||ids.chars.length!==27)throw Error('Expected 10 biomes and 27 characters');
const dirty=execFileSync('git',['status','--porcelain','--','src/','tools/bot/','tools/serve.mjs','index.html'],{cwd:ROOT,encoding:'utf8'});
if(dirty.trim())throw Error('Commit experiment sources before long batches: '+dirty);
const identity={experimentVersion:1,phase,...sourceIdentity(ROOT),schedule:makeSchedule(ids,phase),chars:ids.chars};
fs.mkdirSync(out,{recursive:true});
const lock=path.join(out,'orchestrator.lock');
if(fs.existsSync(lock)){
 const previous=JSON.parse(fs.readFileSync(lock,'utf8'));
 let alive=true;try{process.kill(previous.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}
 if(alive)throw Error('orchestrator already live, pid='+previous.pid);
 fs.renameSync(lock,lock+'.stale-'+Date.now());
}
fs.writeFileSync(lock,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:'wx'});
const state={pid:process.pid,phase,startedAt:new Date().toISOString(),status:'running',completed:[],current:null};
const save=()=>writeJson(path.join(out,'progress.json'),state);
const phaseManifest=path.join(out,'experiment.json');
const available=()=>new Promise((resolve,reject)=>{
 const probe=net.createServer();
 probe.once('error',()=>reject(Error('5173 occupied; stop and identify owner')));
 probe.listen(5173,'127.0.0.1',()=>probe.close(resolve));
});
let child=null;
function runChild(args,dir,attempt){
 return new Promise((resolve,reject)=>{
  const log=path.join(dir,'launcher-'+Date.now()+'-'+attempt);
  const stdout=fs.openSync(log+'.stdout.txt','wx'),stderr=fs.openSync(log+'.stderr.txt','wx');
  child=spawn(process.execPath,['tools/bot/run.mjs',...args],{cwd:ROOT,stdio:['ignore',stdout,stderr],windowsHide:true});
  const session={pid:child.pid,args,startedAt:new Date().toISOString(),startedMs:Date.now()};
  writeJson(log+'.json',session);
  state.current={...state.current,pid:child.pid,log};save();
  child.once('error',reject);
  child.once('close',(code,signal)=>{
   fs.closeSync(stdout);fs.closeSync(stderr);child=null;
   Object.assign(session,{exitCode:code,signal,endedAt:new Date().toISOString(),wallMs:Date.now()-session.startedMs});
   writeJson(log+'.json',session);
   resolve({code,stdout:fs.readFileSync(log+'.stdout.txt','utf8'),stderr:fs.readFileSync(log+'.stderr.txt','utf8')});
  });
 });
}
try{
 if(fs.existsSync(phaseManifest)){
  const mismatch=checkManifest(JSON.parse(fs.readFileSync(phaseManifest,'utf8')),identity);
  if(mismatch)throw Error(mismatch);
 }else writeJson(phaseManifest,identity);
 save();
 for(const cell of identity.schedule){
  const dir=path.join(out,cell.id);
  fs.mkdirSync(dir,{recursive:true});
  const args=['--strategy',cell.strategy,'--biomes',cell.biome,'--chars','all','--diffs','1',
   '--runs',String(cell.runs),'--seed',String(cell.seed),'--parallel','4','--out',dir];
  const combos=expandCombos({biomes:[cell.biome],chars:ids.chars,diffs:[1],runs:cell.runs});
  let complete=false;
  for(let attempt=0;attempt<=2;attempt++){
   const current=sourceIdentity(ROOT);
   if(current.commit!==identity.commit||current.sourceHash!==identity.sourceHash)throw Error('source changed during experiment');
   await available();
   state.current={cell:cell.id,attempt};save();
   const result=await runChild(args,dir,attempt);
   if(/Chromium|browserType.launch/.test(result.stderr))throw Error('Chromium launch/restart failed; user action required: '+result.stderr);
   if(result.code!==0&&result.code!==3)throw Error('batch failed; no automatic workaround: '+result.stderr);
   const parsed=readJsonlTolerant(fs.readFileSync(path.join(dir,'runs.jsonl'),'utf8'));
   const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
   const audit=auditCell(parsed.records,combos,manifest);
   if(audit.errors.length)throw Error('invalid records: '+audit.errors.join(','));
   complete=audit.complete&&!parsed.truncatedTail&&fs.existsSync(path.join(dir,'report.md'))
    &&/api_hits=\d+\r?\nbrowser_restarts=\d+\s*$/.test(result.stdout);
   const {records,...compact}=audit;
   writeJson(path.join(dir,'audit.json'),compact);
   if(complete){state.completed.push(cell.id);save();process.stdout.write(cell.id+' complete '+audit.unique+'\n');break;}
   process.stdout.write(cell.id+' incomplete; same-parameter retry '+(attempt+1)+'\n');
  }
  if(!complete)throw Error('two consecutive resume attempts failed; user action required');
 }
 state.status='completed';state.current=null;state.endedAt=new Date().toISOString();save();
 process.stdout.write('experiment_completed='+phase+' cells='+state.completed.length+'\n');
}catch(e){
 state.status='failed';state.error=String(e.stack||e);state.endedAt=new Date().toISOString();save();
 process.stderr.write(state.error+'\n');process.exitCode=1;
}finally{
 if(!child&&fs.existsSync(lock)&&JSON.parse(fs.readFileSync(lock,'utf8')).pid===process.pid)fs.unlinkSync(lock);
}
