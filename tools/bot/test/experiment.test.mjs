import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkManifest, makeSchedule, auditCell } from '../experiment.mjs';
import { bootstrapDifference, adoption, metrics } from '../ab-stats.mjs';
import { makeRecord } from '../record.mjs';
const identity={strategy:'A',commit:'a'.repeat(40),sourceHash:'b'.repeat(64),toolVersion:'0.1.0',gameVersion:'V2.0',args:{seed:1,runs:1}};
test('manifest: every identity component rejects drift; same contents accept key order',()=>{
 assert.equal(checkManifest(identity,{...identity}),null);
 for(const k of Object.keys(identity)) assert.match(checkManifest(identity,{...identity,[k]:'changed'}),new RegExp(k));
 assert.equal(checkManifest({...identity,args:{runs:1,seed:1}},identity),null);
 assert.match(checkManifest(null,identity),/manifest/);
});
test('schedule: pilot 540 and confirm 8100, balanced alternating AB/BA, unique cell dirs',()=>{
 const ids={biomes:Array.from({length:10},(_,i)=>'b'+i),chars:Array.from({length:27},(_,i)=>'c'+i)};
 for(const [phase,total] of [['pilot',540],['confirm',8100]]) {
  const cells=makeSchedule(ids,phase);
  assert.equal(cells.reduce((n,c)=>n+c.runs*ids.chars.length,0),total);
  assert.deepEqual(cells.slice(0,4).map(c=>c.strategy),['A','B','B','A']);
  assert.equal(new Set(cells.map(c=>c.id)).size,cells.length);
  assert.ok(cells.every(c=>c.diff===1));
 }
 assert.throws(()=>makeSchedule(ids,'unknown'));
});
const combo={biome:'crypt',char:'hunter',diff:1,runIdx:1,seed:1};
function rec(result='death',over={}) {
 const r=makeRecord({...combo,mode:'normal'},{cleared:result==='clear',endReason:result==='timeout'?'sim_cap':result==='error'?'error':'finishRun',time:20,gameVersion:'V2.0'});
 return {...r,strategy:'A',choiceAudit:{choices:0,divergences:0,selectedAbility:0,selectedWeapon:0},level:1,weapons:[],abilities:[],simMs:2,ticks:2400,...over};
}
test('audit: latest key, errors and mismatched strategy/seed/extra key are detected',()=>{
 const m={...identity,args:{seed:1}};
 assert.equal(auditCell([rec('error'),rec()], [combo],m).complete,true);
 assert.equal(auditCell([rec(),rec('error')], [combo],m).complete,false);
 for(const over of [{strategy:'B'},{seed:2},{char:'extra'},{gameVersion:'other'},{choiceAudit:{choices:1,divergences:1,selectedAbility:1,selectedWeapon:0}}])
  assert.equal(auditCell([rec('death',over)], [combo],m).complete,false);
 assert.equal(auditCell([], [combo],m).complete,false);
});
test('metrics: effective vs all denominator, empty groups and endReasons',()=>{
 const m=metrics([rec('clear'),rec('death'),rec('timeout'),rec('error')]);
 assert.equal(m.rate,0.5); assert.equal(m.allRate,0.25); assert.equal(m.excludedRate,0.5);
 assert.equal(metrics([]).rate,null);
});
test('bootstrap: degenerate independent groups give known difference, no paired assumption',()=>{
 const a=Array.from({length:30},(_,i)=>rec('death',{char:'c'+(i%2)}));
 const b=a.map(r=>({...r,result:'clear'}));
 assert.deepEqual(bootstrapDifference(a,b,{iterations:100,seed:1}).effective,[1,1]);
 assert.deepEqual(bootstrapDifference(a,a,{iterations:100,seed:1}).all,[0,0]);
 assert.equal(bootstrapDifference([],b,{iterations:100}).effective,null);
 assert.throws(()=>bootstrapDifference(a,b.slice(1),{iterations:10}),/strat/);
});
test('adoption: all preregistered gates required',()=>{
 const a={rate:0.02,allRate:0.02,excludedRate:0};
 const b={rate:0.04,allRate:0.04,excludedRate:0};
 assert.equal(adoption(a,b,{effective:[0.001,0.04]}).adopt,true);
 assert.equal(adoption(a,{...b,rate:0.025},{effective:[0.001,0.04]}).adopt,false);
 assert.equal(adoption(a,b,{effective:[-0.001,0.04]}).adopt,false);
 assert.equal(adoption(a,{...b,excludedRate:0.01},{effective:[0.001,0.04]}).adopt,false);
});

test('bootstrap: nondegenerate independent samples agree with binomial uncertainty',()=>{
 const rows=(clears,arm)=>Array.from({length:200},(_,i)=>rec(i%100<clears?'clear':'death',{char:'c'+Math.floor(i/100),strategy:arm}));
 const ci=bootstrapDifference(rows(10,'A'),rows(20,'B'));
 // Estimated SE = sqrt(.1*.9/200 + .2*.8/200) = .03536; expected 95% roughly [.031,.169].
 assert.ok(ci.effective[0]>0.01&&ci.effective[0]<0.055,JSON.stringify(ci));
 assert.ok(ci.effective[1]>0.145&&ci.effective[1]<0.19,JSON.stringify(ci));
 const none=Array.from({length:4},()=>rec('timeout'));
 assert.equal(bootstrapDifference(none,none,{iterations:20}).effective,null);
});
