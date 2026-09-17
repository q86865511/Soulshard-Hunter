import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGrowthDiagnostics, validateGrowthDiagnostic} from '../growth-diagnostics.mjs';
function fixture(){
 const calls=[];
 const run={time:0,xp:0,xpNext:10,level:1,kills:0};
 const scene={run,player:{weapons:[],stats:{pickupRange:26},x:0,y:0}};
 const world={run,pickups:[],player:scene.player,
  gainXp(v){calls.push(['gainXp',this,v]);if(v==='boom')throw sentinel;run.xp+=v;while(run.xp>=run.xpNext){run.xp-=run.xpNext;run.level++;run.xpNext+=10;}return 19;},
  collect(type,value){calls.push(['collect',this,type,value]);if(type==='xp')this.gainXp(value);return 7;},
  addPickup(type,x,y,value=1){calls.push(['add',this,type,x,y,value]);const p={type,x,y,value,age:0,life:30,dead:false,
   collect(w){if(this.dead)return;this.dead=true;return w.collect(this.type,this.value);},
   update(dt,w){this.age+=dt;if(this.age>this.life)this.dead=true;return 'updated';}};this.pickups.push(p);return p;}
 };
 scene.world=world;const sentinel=new Error('original error');
 return {scene,world,run,calls,sentinel};
}
test('growth: XP production, collection, expiry and remaining conserve value',()=>{
 const {scene,world,run}=fixture();const d=createGrowthDiagnostics(scene);
 const a=world.addPickup('xp',0,0,8);run.time=2;a.age=2;assert.equal(a.collect(world),7);
 const b=world.addPickup('xp',0,0,25);run.time=4;b.age=2;b.collect(world);
 const c=world.addPickup('xp',0,0,7);run.time=35;c.update(31,world);
 world.addPickup('xp',0,0,5);d.afterTick();
 const out=d.collect();
 assert.equal(out.pickups.xp.spawned.value,45);
 assert.equal(out.pickups.xp.collected.value,33);
 assert.equal(out.pickups.xp.expired.value,7);
 assert.equal(out.pickups.xp.remaining.value,5);
 assert.equal(out.xp.credited,33);assert.equal(out.xp.spent,30);assert.equal(out.xp.final,3);
 assert.equal(out.levels.length,2);assert.equal(out.levels[0].level,2);assert.equal(out.levels[1].level,3);
 assert.deepEqual(validateGrowthDiagnostic(out),[]);
 run.xp-=2;assert.equal(d.collect().xp.outsideGainDelta,-2);
});
test('growth: wrappers preserve this, return, exceptions and original call counts',()=>{
 const {scene,world,calls,sentinel}=fixture();const original=world.gainXp;
 const d=createGrowthDiagnostics(scene);
 assert.equal(world.gainXp(2),19);
 assert.equal(calls.filter(c=>c[0]==='gainXp').length,1);
 assert.equal(calls[0][1],world);
 assert.throws(()=>world.gainXp('boom'),e=>e===sentinel);
 d.dispose();assert.equal(world.gainXp,original);
});
test('growth: double collect never double counts; unexpected removal is explicit',()=>{
 const {scene,world}=fixture();const d=createGrowthDiagnostics(scene);
 const a=world.addPickup('xp',0,0,2);a.collect(world);a.collect(world);
 const b=world.addPickup('xp',0,0,4);b.dead=true;d.afterTick();
 const out=d.collect();assert.equal(out.pickups.xp.collected.count,1);assert.equal(out.pickups.xp.other.value,4);
 assert.deepEqual(validateGrowthDiagnostic(out),[]);
});
test('growth: offered panels and options are distinct; actual selection and upgrade levels recorded',()=>{
 const {scene}=fixture();const d=createGrowthDiagnostics(scene);
 d.choice([{kind:'weaponup',id:'old'},{kind:'weaponup',id:'new'},{kind:'ability',id:'a'}],0,{weapons:[{id:'old',level:3}]});
 const out=d.collect();
 assert.equal(out.choices.panels,1);assert.equal(out.choices.offered.weaponup,2);
 assert.equal(out.choices.panelsWith.weaponup,1);assert.equal(out.choices.selected.weaponup,1);
 assert.equal(out.choiceEvents[0].chosen.levelBefore,3);
});
test('growth: safety gate and XP alignment are sampled without modifying input',()=>{
 const {scene}=fixture();const d=createGrowthDiagnostics(scene);
 const view={x:0,y:0,ts:16,enemies:[{x:100,y:0,dist:100}],pickups:[{x:0,y:30,type:'xp'},{x:-30,y:0,type:'gold'}]};
 const copy=structuredClone(view);d.motion(view,{move:{x:0,y:1}},0);
 const out=d.collect();assert.equal(out.motion.samples,1);assert.equal(out.motion.safeGate,1);
 assert.equal(out.motion.eligibleXp,1);assert.equal(out.motion.towardXp,1);assert.deepEqual(view,copy);
});
test('growth: truncation and broken conservation cannot pass validation',()=>{
 const {scene,world}=fixture();const d=createGrowthDiagnostics(scene,{maxEvents:1});
 d.choice([{kind:'weapon',id:'w'}],0,{weapons:[]});d.choice([{kind:'weapon',id:'w'}],0,{weapons:[]});
 const out=d.collect();assert.ok(validateGrowthDiagnostic(out).includes('truncatedEvents'));
 world.addPickup('xp',0,0,5);const broken=d.collect();broken.pickups.xp.spawned.value++;
 assert.ok(validateGrowthDiagnostic(broken).includes('xpConservation'));
});

test('growth: terminal pickups release their hooks immediately',()=>{
 const {scene,world}=fixture();const p=world.addPickup('xp',0,0,3);
 const collect=p.collect,update=p.update;createGrowthDiagnostics(scene);
 p.collect(world);assert.equal(p.collect,collect);assert.equal(p.update,update);
});

test('growth: floating point boundary produces one periodic snapshot and final state refreshes',()=>{
 const {scene,run,world}=fixture();const d=createGrowthDiagnostics(scene);
 run.time=29.99999999999;d.afterTick();run.time=30.008333;d.afterTick();run.time=31;d.afterTick();
 assert.equal(d.collect().snapshots.filter(s=>s.time>=29.9).length,2); // one periodic + final
 const count=d.collect().snapshots.length;
 world.gainXp(2);const latest=d.collect();
 assert.equal(latest.snapshots.length,count);assert.equal(latest.snapshots.at(-1).xp,2);
});
test('growth: no selected option is explicitly none',()=>{
 const {scene}=fixture();const d=createGrowthDiagnostics(scene);d.choice([], -1, {weapons:[]});
 assert.equal(d.collect().choiceEvents[0].chosen.kind,'none');
});
