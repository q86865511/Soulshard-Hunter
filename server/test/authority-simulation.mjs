import assert from 'node:assert/strict';
import {installHeadless,makeCanvas} from '../src/authority/headless.js';
installHeadless();
await import('../../src/bootstrap.js');
const {initRenderer}=await import('../../src/engine/renderer.js');initRenderer(makeCanvas());
const {META}=await import('../../src/game/state.js');META.settings.analytics=false;
const {AuthoritySimulation}=await import('../../src/game/net/authority-simulation.js');
const {registryStats}=await import('../../src/game/content/registry.js');
assert.deepEqual(registryStats(),{enemies:63,items:28,equipment:60,abilities:54,talents:20,facilities:11,weapons:43,characters:27});
const messages=[];
const room={code:'LOCAL',hostCid:'h',cfg:{difficulty:1},members:[{cid:'h',uid:'1',username:'H',host:true,charId:'hunter'},{cid:'g',uid:'2',username:'G',charId:'ranger'}]};
const sim=new AuthoritySimulation(room,'r',m=>messages.push(m));
let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
try{
 const host=sim.coop.players[0],guest=sim.coop.players[1],s=sim.scene;
 ok(s.run.biomeId==='crypt'&&s.map.biome.id==='crypt','default room preserves the original crypt biome');
 ok(!host.player.netInput,'original leader retains local progression hooks');
 ok(messages[0].t==='runstart'&&messages[0].runId==='r','server start packet');
 // Use a clear arena from the real map, preserving real collision and movement code.
 host.player.x=s.map.entrance.x;host.player.y=s.map.entrance.y;
 const x=host.player.x,y=host.player.y;
 for(let i=0;i<120;i++){
  sim.input('h',{t:'input',mv:[1,0],dash:false});sim.input('g',{t:'input',mv:[0,1],dash:false});sim.step();
 }
 ok(Math.hypot(host.player.x-x,host.player.y-y)>1,'leader driven by remote input');
 ok(Math.abs(s.run.time-1)<1e-9,'120 fixed steps = 1 sim second');
 ok(messages.some(m=>m.t==='snap'&&m.protocol===2),'server snapshots');
 s.world.gainXp(s.run.xpNext+1);sim.step();
 const offer=messages.findLast(m=>m.t==='levelup'&&m.cid==='h');
 ok(offer&&offer.opts.length>0,'leader gets original full choice pool');
 const choice=s.coopPick;
 sim.input('h',{t:'levelpick',choiceId:offer.choiceId+1,i:0});
 ok(s.coopPick===choice,'stale/forged choice rejected');
 sim.input('h',{t:'levelpick',choiceId:offer.choiceId,i:0});
 ok(!s.coopPick,'leader applies actual selected option');
 const guestOffer=messages.findLast(m=>m.t==='levelup'&&m.cid==='g');
 sim.input('g',{t:'levelpick',choiceId:guestOffer.choiceId,i:0});
 ok(!guest.pendingOpts,'guest weapon choice applied');
 if(s.shrinePos){host.player.x=s.shrinePos.x;host.player.y=s.shrinePos.y;sim.input('h',{t:'input',mv:[0,0],dash:false,interact:true});sim.step();ok(s.shrineUsed,'original leader interaction is transmitted');}
 sim.coop.retire('h','silence');sim.input('h',{t:'input',mv:[0,0],dash:false});ok(!host.left,'a connected sender recovers after input silence');
 sim.disconnect('h');ok(host.left&&!s.dead,'leader loss keeps guest world alive');
 sim.reconnect('h','h2');ok(!host.left&&!host.player.dead&&host.cid==='h2','reconnect same avatar');
 ok(s.run.biomeId==='crypt'&&s.map.biome.id==='crypt','default room preserves the original crypt biome');
 ok(!host.player.netInput,'leader progression hook restored after reconnect');
 const n=messages.length;sim.input('h',{t:'input',mv:[-1,0],dash:true});
 ok(messages.length===n,'old cid has no slot');
 sim.disconnect('h2');sim.disconnect('g');const pausedAt=s.run.time;sim.step();ok(!s.dead&&s.run.time>pausedAt,'whole-team network blip retains actors and advances world');
 sim.reconnect('h2','h3');sim.reconnect('g','g2');sim.step();ok(s.run.time>pausedAt&&!host.player.dead&&!guest.player.dead,'whole team returns to original living avatars');
 guest.player.dead=true;host.player.dead=true;s.onDeath();
 ok(s.dead,'real world terminal path');
 const end=messages.filter(m=>m.t==='runend');
 ok(end.length===1&&end[0].summary.coop_size===2,'single server result');
 s.onDeath();ok(messages.filter(m=>m.t==='runend').length===1,'terminal idempotence');
 console.log(JSON.stringify({checks,registry:registryStats(),terminal:end[0]}));
}finally{sim.dispose();}
