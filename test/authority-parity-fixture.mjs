// Runs only in test processes/pages. Production RNG remains uncontrolled.
export async function authorityParityFixture() {
 const {AuthoritySimulation}=await import('../src/game/net/authority-simulation.js');
 const {makeRng,rng}=await import('../src/engine/math.js');
 const {META}=await import('../src/game/state.js');
 const {Audio}=await import('../src/engine/audio.js');Audio.setVolumes({muted:true});
 const {encodeSnapshot}=await import('../src/game/net/protocol.js');
 const {Enemies,registryStats}=await import('../src/game/content/registry.js');
 const oldRandom=Math.random,oldNext=rng.next;
 Math.random=makeRng(20260916).next;rng.next=Math.random;META.settings.analytics=false;
 const room={code:'PARITY',hostCid:'h',cfg:{biomeId:'crypt',difficulty:1},members:[{cid:'h',uid:'1',username:'H',host:true,charId:'hunter'},{cid:'g',uid:'2',username:'G',charId:'ranger'}]};
 const messages=[];const sim=new AuthoritySimulation(room,'parity',m=>messages.push(m));
 const defs=sim.startPacket().defs;
 try{
  const s=sim.scene,host=sim.coop.players[0],guest=sim.coop.players[1];
  const checkpoints=[];
  for(let i=0;i<1200;i++){
   sim.input('h',{t:'input',mv:[i<600?1:-1,0],dash:i===0||i===720});
   sim.input('g',{t:'input',mv:[0,i<600?1:-1],dash:i===360});
   if(i===240)s.world.gainXp(s.run.xpNext+4);
   if(i===360)host.player.takeDamage(20,0,s.world,'fixture');
   sim.step();
   for(const slot of sim.coop.players){
    if(slot.pendingOpts&&slot.choiceId)sim.input(slot.cid,{t:'levelpick',choiceId:slot.choiceId,i:0});
   }
   if(i%120===119)checkpoints.push({snap:encodeSnapshot(s),xp:s.run.xp,level:s.run.level,kills:s.run.kills,
     weapons:sim.coop.players.map(p=>p.player.weapons.map(w=>[w.def.id,w.level]))});
  }
  s.cleared=true;s.run.cleared=true;s.finishRun(true);
  return {defs,registry:registryStats(),checkpoints,result:sim.result(),terminalCount:messages.filter(m=>m.t==='runend').length};
 }finally{sim.dispose();Math.random=oldRandom;rng.next=oldNext;}
}
