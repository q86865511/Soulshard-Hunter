import {test} from 'node:test';
import assert from 'node:assert/strict';
import {policyOf} from '../strategy/policy.mjs';
import {experimentPlan,auditCell} from '../experiment.mjs';
test('policy: C inherits A choices and only increases XP weight',()=>{
 assert.deepEqual(policyOf('A'),{id:'A',choiceStrategy:'A',xpWeight:1});
 assert.deepEqual(policyOf('B'),{id:'B',choiceStrategy:'B',xpWeight:1});
 assert.deepEqual(policyOf('C'),{id:'C',choiceStrategy:'A',xpWeight:1.5});
 assert.throws(()=>policyOf('unknown'),/policy/);
});
test('C schedule: AC/CA 540 and 8100; both arms diagnostic, legacy phases preserved',()=>{
 const ids={biomes:Array.from({length:10},(_,i)=>'b'+i),chars:Array.from({length:27},(_,i)=>'c'+i)};
 for(const [phase,total]of [['pilot-c',540],['confirm-c',8100]]){
  const p=experimentPlan(ids,phase);
  assert.deepEqual(p.arms,['A','C']);assert.equal(p.diagnostics,'growth-v1');
  assert.deepEqual(p.schedule.slice(0,4).map(c=>c.strategy),['A','C','C','A']);
  assert.equal(p.schedule.reduce((n,c)=>n+c.runs*27,0),total);
  assert.ok(p.schedule.every(c=>c.id.endsWith('/'+c.strategy)));
 }
 assert.deepEqual(experimentPlan(ids,'pilot').arms,['A','B']);
 assert.equal(experimentPlan(ids,'pilot').diagnostics,null);
 assert.equal(experimentPlan(ids,'diagnose').diagnostics,'growth-v1');
 assert.throws(()=>experimentPlan(ids,'unknown'));
});
test('C audit: profile, movement sampling and A-family choice evidence cannot drift',()=>{
 const combo={biome:'crypt',char:'hunter',diff:1,runIdx:1};
 const manifest={experimentVersion:2,strategy:'C',profile:policyOf('C'),toolVersion:'0.1.0',gameVersion:'V2.0',args:{seed:1}};
 const record={...combo,seed:1,strategy:'C',policy:policyOf('C'),toolVersion:'0.1.0',gameVersion:'V2.0',result:'death',cleared:false,endReason:'finishRun',time:1,level:1,weapons:[],abilities:[],simMs:1,ticks:120,
 choiceAudit:{choices:1,divergences:1,selectedAbility:0,selectedWeapon:1},
 moveAudit:{xpWeight:1.5,samples:1,policyDivergences:1,xpPresentSamples:1}};
 assert.equal(auditCell([record],[combo],manifest).complete,true);
 for(const bad of [
 {...record,policy:policyOf('A')},
 {...record,moveAudit:undefined},
 {...record,moveAudit:{...record.moveAudit,xpWeight:1}},
 {...record,moveAudit:{...record.moveAudit,samples:2}},
 {...record,choiceAudit:{...record.choiceAudit,selectedAbility:1,selectedWeapon:0}}
 ])assert.equal(auditCell([bad],[combo],manifest).complete,false);
 assert.equal(auditCell([record],[combo],{...manifest,profile:undefined}).complete,false);
});
