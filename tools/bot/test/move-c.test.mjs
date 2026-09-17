import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decideMove} from '../strategy/move.mjs';
const view={x:0,y:0,ts:16,hpFrac:1,dashReady:false,seed:1,enemies:[],blocked:()=>false,
 pickups:[{x:100,y:0,type:'xp'},{x:-80,y:0,type:'gold'}]};
test('C: XP weight 1.5 changes competing pickup direction while default remains A',()=>{
 assert.ok(decideMove(view).move.x<0);
 assert.deepEqual(decideMove(view),decideMove(view,1));
 assert.ok(decideMove(view,1.5).move.x>0);
});
test('C: no XP, closed safety gate and excluded XP retain A output',()=>{
 for(const v of [
 {...view,pickups:[{x:100,y:0,type:'gold'},{x:-80,y:0,type:'heart'}]},
 {...view,enemies:[{x:10,y:0,dist:10}]},
 {...view,enemies:[{x:30,y:0,dist:30}],pickups:[{x:100,y:0,type:'xp'}]}
 ])assert.deepEqual(decideMove(v,1.5),decideMove(v,1));
});
test('C: walls and dash rules still apply; outputs are pure and seeded',()=>{
 const v={...view,blocked:(x,y)=>x>0, hpFrac:0.3,dashReady:true,enemies:[{x:20,y:0,dist:20}]};
 const a=decideMove(v,1.5);assert.ok(a.move.x<=0);assert.equal(a.dash,true);
 for(let i=0;i<100;i++)assert.deepEqual(decideMove(v,1.5),a);
});
test('C: reject invalid XP weights',()=>{
 for(const weight of [0,-1,NaN,Infinity,'1.5'])assert.throws(()=>decideMove(view,weight),/xpWeight/);
});

test('C: eligible XP cannot bypass a blocking wall',()=>{
 const out=decideMove({...view,blocked:x=>x>0},1.5);
 assert.ok(out.move.x<=1e-12);assert.ok(Math.hypot(out.move.x,out.move.y)<=1+1e-12);
});
