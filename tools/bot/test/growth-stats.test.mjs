import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeGrowth} from '../growth-stats.mjs';
const bucket=(count,value)=>({count,value});
function row(time=60){
 const partial=time===20;
 const values=partial?[0,20]:[0,30,100],times=partial?[0,20]:[0,30,60],collected=partial?[0,10]:[0,10,40];
 return {strategy:'A',biome:'crypt',char:'hunter',result:'death',time,level:partial?2:3,kills:partial?8:20,
 diagnostics:{schema:'growth-v1',time,truncatedEvents:0,errorCount:0,errors:[],
 pickups:{xp:{initial:bucket(0,0),spawned:bucket(partial?2:10,partial?20:100),collected:bucket(partial?1:4,partial?10:40),expired:bucket(partial?0:1,partial?0:10),other:bucket(0,0),remaining:bucket(partial?1:5,partial?10:50),valueAdjustments:0}},
 xp:{initial:0,credited:partial?10:40,spent:partial?10:30,final:partial?0:10,outsideGainDelta:0},
 levels:partial?[{time:10,level:2,interval:10}]:[{time:20,level:2,interval:20},{time:50,level:3,interval:30}],
 choices:{panels:0,offered:{},panelsWith:{},selected:{},multipleUpgrades:0},choiceEvents:[],
 motion:{samples:time,safeGate:time/2,xpVisibleSamples:time/2,eligibleXp:time,eligibleOther:time*3,towardXp:time/4,nearestXpDistanceSum:time*10},
 collectionDelay:{edges:[1,3,5,10,20,30],counts:[0,0,0,partial?1:4,0,0,0],sum:partial?6:24,count:partial?1:4},
 snapshots:times.map((t,i)=>({time:t,level:i+1,kills:partial?(i?8:0):i*10,xpSpawned:values[i],xpCollected:collected[i],xpExpired:i===2?10:0,xpRemaining:values[i]-collected[i]-(i===2?10:0),xpCredited:collected[i],choices:0,weapons:1,passives:0}))
 }};
}
test('growth summary: distinguish XP production, collection and expiry',()=>{
 const s=summarizeGrowth([row()]);
 assert.equal(s.n,1);assert.equal(s.xp.spawned,100);assert.equal(s.xp.collected,40);
 assert.equal(s.xp.collectionFraction,0.4);assert.equal(s.xp.expiredFraction,0.1);
 assert.equal(s.xp.spawnedPerMinute,100);assert.equal(s.killsPerMinute,20);
 assert.equal(s.collectionDelayMean,6);
});
test('growth summary: early deaths contribute actual exposure, not survivor-only windows',()=>{
 const s=summarizeGrowth([row(),row(20)]);
 assert.equal(s.windows[0].atRisk,2);assert.equal(s.windows[0].exposureSeconds,50);
 assert.equal(s.windows[0].xpSpawned,50);assert.equal(s.windows[0].xpSpawnedPerMinute,60);
 assert.equal(s.windows[1].atRisk,1);assert.equal(s.windows[1].exposureSeconds,30);
 assert.equal(s.windows[1].xpSpawned,70);
 assert.equal(s.windows[2].atRisk,0);assert.equal(s.windows[2].xpSpawnedPerMinute,null);
});
test('growth summary: invalid diagnostics reject; empty group reports N/A',()=>{
 const bad=row();bad.diagnostics.pickups.xp.spawned.value++;
 assert.throws(()=>summarizeGrowth([bad]),/diagnostic/);
 assert.equal(summarizeGrowth([]).xp.collectionFraction,null);
});

test('growth summary: a death just after a boundary uses its closest final snapshot',()=>{
 const r=row();r.time=30.008;r.diagnostics.time=r.time;r.diagnostics.snapshots[2].time=r.time;
 const s=summarizeGrowth([r]);assert.ok(Math.abs(s.windows[1].exposureSeconds-0.008)<1e-9);
 assert.equal(s.windows[1].xpSpawned,70);
});
test('growth summary: missing motion evidence is rejected',()=>{
 const r=row();delete r.diagnostics.motion;
 assert.throws(()=>summarizeGrowth([r]),/diagnostic/);
});
