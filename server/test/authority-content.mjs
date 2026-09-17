import assert from 'node:assert/strict';
import {installHeadless,makeCanvas} from '../src/authority/headless.js';
installHeadless();await import('../../src/bootstrap.js');
const {AuthoritySimulation}=await import('../../src/game/net/authority-simulation.js');
const {initRenderer}=await import('../../src/engine/renderer.js');initRenderer(makeCanvas());
const {META}=await import('../../src/game/state.js');META.settings.analytics=false;
const {Characters,registryStats}=await import('../../src/game/content/registry.js');
const {BIOMES}=await import('../../src/art/biomes.js');
let worlds=0,ticks=0;
for(const biome of BIOMES)for(const char of Characters.all()){
 const room={code:'fixture',hostCid:'h',cfg:{biomeId:biome.id,difficulty:1},members:[{cid:'h',uid:'1',username:'H',host:true,charId:char.id,weaponId:char.startWeapon},{cid:'g',uid:'2',username:'G',charId:'hunter'}]};
 const sim=new AuthoritySimulation(room,'fixture',()=>{});
 try{
  for(let i=0;i<120;i++){sim.input('h',{t:'input',mv:[1,0],dash:false});sim.input('g',{t:'input',mv:[0,1],dash:false});sim.step();ticks++;}
  assert.equal(sim.scene.map.biome.id,biome.id);
  assert.equal(sim.scene.run.characterId,char.id);
  for(const p of sim.scene.world.players)for(const value of [p.x,p.y,p.hp,p.stats.speed,p.stats.maxHp])assert.ok(Number.isFinite(value),biome.id+'/'+char.id);
  worlds++;
 }finally{sim.dispose();}
}
assert.equal(worlds,270);
console.log(JSON.stringify({worlds,ticks,registry:registryStats(),scope:'every biome and hero boots a two-player world for one second; not a long-run balance test'}));
