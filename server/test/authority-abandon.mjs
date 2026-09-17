import assert from 'node:assert/strict';
import {installHeadless,makeCanvas} from '../src/authority/headless.js';
installHeadless();await import('../../src/bootstrap.js');
const {AuthoritySimulation}=await import('../../src/game/net/authority-simulation.js');
const {initRenderer}=await import('../../src/engine/renderer.js');initRenderer(makeCanvas());
const {META}=await import('../../src/game/state.js');META.settings.analytics=false;
const room={code:'LEAVE',hostCid:'h',cfg:{biomeId:'crypt',difficulty:3},members:[{cid:'h',uid:'1',username:'H',host:true,charId:'hunter'},{cid:'g',uid:'2',username:'G',charId:'hunter'}]};
const sim=new AuthoritySimulation(room,'leave-fixture',()=>{});
try{
 sim.scene.run.kills=5;sim.scene.run.stage=2;sim.scene.run.time=10;
 const before=META.guild.xp;
 sim.finish();
 assert.equal(sim.scene.run.result,'leave');
 assert.equal(sim.scene.run.score,870,'existing abandon formula: kills*12 + stage*400 + time');
 assert.equal(META.guild.xp-before,3,'existing abandon reputation formula remains unchanged');
 console.log(JSON.stringify({checks:3,score:870,guildGain:3}));
}finally{sim.dispose();}
