import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {experimentPlan} from '../experiment.mjs';
import {policyOf} from '../strategy/policy.mjs';
import {makeRecord,TOOL_VERSION} from '../record.mjs';
import {createGrowthDiagnostics} from '../growth-diagnostics.mjs';
import {summarize} from '../summarize.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
function diagnostic(){
 const run={time:0,level:1,xp:0,xpNext:10,kills:0},pickups=[{type:'xp',x:100,y:0,value:1,age:0,life:30,dead:false,collect(){},update(){}}];
 const scene={run,world:{run,pickups,addPickup(){},gainXp(){}},player:{weapons:[],x:0,y:0}};
 const d=createGrowthDiagnostics(scene);
 d.motion({x:0,y:0,ts:16,enemies:[],pickups}, {move:{x:1,y:0}},0);
 run.time=1;d.motion({x:0,y:0,ts:16,enemies:[],pickups},{move:{x:1,y:0}},120);
 run.time=2;return d.collect();
}
function fixture(){
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'bot-analysis-c-'));
 const ids=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/bot/ids.json'),'utf8'));
 const plan=experimentPlan(ids,'pilot-c');
 const identity={experimentVersion:2,phase:'pilot-c',commit:'a'.repeat(40),sourceHash:'b'.repeat(64),schedule:plan.schedule,chars:ids.chars,arms:plan.arms,diagnostics:plan.diagnostics};
 fs.writeFileSync(path.join(out,'experiment.json'),JSON.stringify(identity));
 fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({status:'completed'}));
 for(const cell of plan.schedule){
  const dir=path.join(out,cell.id);fs.mkdirSync(dir,{recursive:true});
  const manifest={experimentVersion:2,strategy:cell.strategy,profile:policyOf(cell.strategy),commit:identity.commit,sourceHash:identity.sourceHash,toolVersion:TOOL_VERSION,gameVersion:'V2.0',
   args:{seed:1,biomes:[cell.biome],chars:ids.chars,diffs:[1],runs:1,maxSimSec:1350,parallel:4,diagnostics:'growth-v1'}};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
  const rows=ids.chars.map(char=>({...makeRecord({biome:cell.biome,char,diff:1,runIdx:1,mode:'normal',seed:1},
   {cleared:false,endReason:'finishRun',runResult:'death',time:2,level:1,kills:0,score:0,stage:1,deathSrc:null,dmgTakenBySrc:{},dmgBySource:{},weapons:[],abilities:[],bossKills:0,reaperSlain:false,hpTimeline:[1],simMs:1,ticks:240,gameVersion:'V2.0'}),
   strategy:cell.strategy,policy:policyOf(cell.strategy),choiceAudit:{choices:0,divergences:0,selectedAbility:0,selectedWeapon:0},
   moveAudit:{xpWeight:policyOf(cell.strategy).xpWeight,samples:2,policyDivergences:1,xpPresentSamples:2},diagnostics:diagnostic()}));
  fs.writeFileSync(path.join(dir,'runs.jsonl'),rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
  fs.writeFileSync(path.join(dir,'report.md'),summarize(rows));
  fs.writeFileSync(path.join(dir,'session-test.json'),JSON.stringify({identity:manifest,startedAt:'2026-09-16T00:00:00Z',endedAt:'2026-09-16T00:00:01Z',wallMs:1000,exitCode:0,apiHits:0,browserRestarts:0}));
 }
 return out;
}
test('comparison analyzer: AC labels, diagnostics and verify-only preserve existing artifacts',()=>{
 const out=fixture();fs.writeFileSync(path.join(out,'analysis.json'),'sentinel');
 const result=spawnSync(process.execPath,['tools/bot/ab-analyze.mjs',out,'--verify-only'],{cwd:ROOT,encoding:'utf8',timeout:30000,windowsHide:true});
 assert.equal(result.status,0,result.stderr);
 const a=JSON.parse(result.stdout);assert.equal(a.candidate,'C');assert.equal(a.unique,540);assert.equal(a.stats.C.n,270);
 assert.equal(a.stats.B,undefined);assert.equal(a.growth.C.n,270);assert.equal(a.moveAudit.C.xpWeight,1.5);
 assert.equal(a.decision.adopt,false);assert.equal(a.ci,null);assert.equal(fs.readFileSync(path.join(out,'analysis.json'),'utf8'),'sentinel');
 const written=spawnSync(process.execPath,['tools/bot/ab-analyze.mjs',out],{cwd:ROOT,encoding:'utf8',timeout:30000,windowsHide:true});
 assert.equal(written.status,0,written.stderr);const md=fs.readFileSync(path.join(out,'analysis.md'),'utf8');
 assert.ok(md.includes('A/C'));assert.ok(md.includes('1.5'));assert.ok(md.includes('次要'));
});
