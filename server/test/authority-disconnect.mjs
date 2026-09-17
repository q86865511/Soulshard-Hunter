import assert from 'node:assert/strict';
import {installHeadless,makeCanvas} from '../src/authority/headless.js';
installHeadless();await import('../../src/bootstrap.js');
const {AuthoritySimulation}=await import('../../src/game/net/authority-simulation.js');
const {initRenderer}=await import('../../src/engine/renderer.js');initRenderer(makeCanvas());
const {META}=await import('../../src/game/state.js');META.settings.analytics=false;
const room={code:'DC',hostCid:'h',cfg:{biomeId:'crypt',difficulty:1},members:[{cid:'h',uid:'1',username:'H',host:true,charId:'hunter'},{cid:'g',uid:'2',username:'G',charId:'hunter'}]};
const sim=new AuthoritySimulation(room,'disconnect-fixture',()=>{});
try{
 const host=sim.coop.players[0].player;
 host.invuln=0;host.dashT=0;
 sim.disconnect('h');
 const before=host.hp;
 assert.equal(host.takeDamage(20,0,sim.scene.world,'fixture'),true,'disconnect must not grant damage immunity');
 const hurt=host.hp;assert.ok(hurt<before);
 sim.reconnect('h','h2');assert.equal(host.hp,hurt,'reconnect retains actual health');
 sim.disconnect('h2');host.invuln=0;host.takeDamage(100000,0,sim.scene.world,'fixture');
 sim.reconnect('h2','h3');assert.equal(host.dead,true,'combat death during disconnect cannot revive');
 sim.disconnect('g');const time=sim.scene.run.time;sim.step();
 assert.ok(sim.scene.run.time>time,'server clock cannot be paused by disconnecting');
 console.log(JSON.stringify({checks:5,scope:'disconnect stops control but preserves damage, death and world clock'}));
}finally{sim.dispose();}
