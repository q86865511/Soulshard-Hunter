import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideChoice } from '../strategy/choice.mjs';
const state = { weapons: [{id:'old',level:2}], passives:[], MAX_WEAPONS:6, MAX_PASSIVES:14, seed:9 };
const reg = { weapon:id => ({maxLevel:7, evolveReq:id==='old'?'evolve':null}) };
const pair = [{kind:'weapon',id:'new'},{kind:'ability',id:'plain'}];
test('AB: only general passive and new weapon order changes', () => {
  assert.equal(decideChoice('level',pair,state,reg),0);
  assert.equal(decideChoice('level',pair,state,reg,'A'),0);
  assert.equal(decideChoice('level',pair,state,reg,'B'),1);
});
test('AB: reject unknown strategy instead of silently using A', () => {
  assert.throws(()=>decideChoice('level',pair,state,reg,'unknown'), /strategy/);
});
for (const strategy of ['A','B']) {
  test(strategy+': preserve evolve > fuse > owned upgrade > other priorities', () => {
    for (const top of [{kind:'ability',id:'evolve'},{kind:'fuse',sacrifice:null},{kind:'weaponup',id:'old'}])
      assert.equal(decideChoice('level',[...pair,top],state,reg,strategy),2);
    assert.equal(decideChoice('level',[{kind:'fuse'}, {kind:'ability',id:'evolve'}],state,reg,strategy),1);
    assert.equal(decideChoice('level',[{kind:'weaponup',id:'old'},{kind:'fuse'}],state,reg,strategy),1);
  });
  test(strategy+': preserve capacity, capped upgrade, prized fuse and signature', () => {
    assert.equal(decideChoice('level',pair,{...state,passives:['x'],MAX_PASSIVES:1},reg,strategy),0);
    assert.equal(decideChoice('level',pair,{...state,MAX_WEAPONS:1},reg,strategy),1);
    assert.equal(decideChoice('level',pair,{...state,MAX_WEAPONS:1,weapons:[{id:'old',equipped:true}]},reg,strategy),strategy==='A'?0:1);
    assert.equal(decideChoice('level',[{kind:'weaponup',id:'old'},pair[1]],{...state,weapons:[{id:'old',level:7}]},reg,strategy),1);
    assert.equal(decideChoice('level',[{kind:'fuse',sacrifice:{id:'old'}},pair[1]],{...state,weapons:[{id:'old',level:7,evolved:true}]},reg,strategy),1);
    assert.equal(decideChoice('equip',[{slot:'weapon',tier:9}],state,reg,strategy),-1);
  });
  test(strategy+': deterministic tie and nonlevel behavior unchanged', () => {
    for(let seed=0;seed<100;seed++) {
      const opts=[{kind:'ability',id:'x'},{kind:'ability',id:'y'}];
      assert.equal(decideChoice('level',opts,{...state,seed},reg,strategy),decideChoice('level',opts,{...state,seed},reg,'A'));
    }
    for(const [kind,expected] of [['event',0],['curse',0],['shop',-1],['unknown',-1]])
      assert.equal(decideChoice(kind,pair,state,reg,strategy),expected);
  });
}
