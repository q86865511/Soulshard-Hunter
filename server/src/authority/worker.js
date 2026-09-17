// Trusted room process. Browser modules never enter the API server's global scope.
import { installHeadless, makeCanvas } from './headless.js';
import { performance } from 'node:perf_hooks';
installHeadless();
let sim, timer, previous, accumulator=0, stopped=false, busy=false, pendingSnap=null;
const critical=[];
const tickCosts=new Float64Array(2048);let tickCount=0;
function tickMetrics(){const count=Math.min(tickCount,tickCosts.length),values=Array.from(tickCosts.subarray(0,count)).sort((a,b)=>a-b);const q=p=>values[Math.max(0,Math.ceil(count*p)-1)]||0;return{sampleCount:count,p50:q(.5),p95:q(.95),p99:q(.99),max:values.at(-1)||0};}
function send(packet) {
  if(!process.connected)return shutdown();
  if(busy){if(packet.t==='snap')pendingSnap=packet;else {critical.push(packet);if(critical.length>24)shutdown();}return;}
  busy=true;
  process.send(packet, error=>{
    busy=false;if(error)return shutdown();
    const next=critical.shift()||pendingSnap;if(next===pendingSnap)pendingSnap=null;
    if(next)send(next);
  });
}
function shutdown(){if(stopped)return;stopped=true;clearInterval(timer);sim?.dispose();process.disconnect?.();process.exit(0);}
async function boot(message){
  await import('../../../src/bootstrap.js');
  const { AuthoritySimulation, SIM_DT }=await import('../../../src/game/net/authority-simulation.js');
  const {registryStats,Characters,Weapons,Talents,Facilities}=await import('../../../src/game/content/registry.js');
  const expected={enemies:63,items:28,equipment:60,abilities:54,talents:20,facilities:11,weapons:43,characters:27};
  if(JSON.stringify(registryStats())!==JSON.stringify(expected))throw Error('Incomplete game content');
  // Whole cloud save keeps its existing format. Never load credentials or DOM code from it.
  const meta=message.meta||{};
  if(typeof meta!=='object'||Array.isArray(meta))throw Error('Invalid saved metadata');
  const inspect=(value,depth=0)=>{
    if(depth>32)throw Error('Invalid saved metadata depth');
    if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid saved metadata number');
    if(value&&typeof value==='object'){
      const entries=Object.entries(value);if(entries.length>10000)throw Error('Invalid saved metadata size');
      for(const [key,item] of entries){if(['__proto__','constructor','prototype'].includes(key))throw Error('Invalid saved metadata key');inspect(item,depth+1);}
    }
  };
  inspect(meta);
  for(const field of ['gold','saveSeq','savedAt'])if(meta[field]!=null&&(typeof meta[field]!=='number'||!Number.isFinite(meta[field])||meta[field]<0))throw Error('Invalid saved metadata '+field);
  if(meta.saveSeq!=null&&!Number.isSafeInteger(meta.saveSeq))throw Error('Invalid saved metadata saveSeq');
  for(const field of ['stats','bank','guild','levels','talents','facilities','forge','unlocked'])if(meta[field]!=null&&(typeof meta[field]!=='object'||Array.isArray(meta[field])))throw Error('Invalid saved metadata '+field);
  for(const [field,value] of Object.entries(meta.stats||{}))if(!['history','charClears'].includes(field)&&(typeof value!=='number'||!Number.isFinite(value)||value<0))throw Error('Invalid saved metadata stats');

  for(const [field,registry] of [['talents',Talents],['facilities',Facilities]]){
    for(const [id,level] of Object.entries(meta[field]||{})){
      const def=registry.get(id);
      if(!def||!Number.isInteger(level)||level<0||level>def.maxLevel)throw Error('Invalid saved progression: '+field);
    }
  }
  const {FORGE_MAX_LEVEL,FORGE_MAX_EFFECTS,forgeEffect}=await import('../../../src/game/content/forge.js');
  for(const [id,f] of Object.entries(meta.forge||{})){
    const level=f?.level??0,effects=f?.effects??[];
    if(!f||typeof f!=='object'||Array.isArray(f)||!Weapons.has(id)||!Number.isInteger(level)||level<0||level>FORGE_MAX_LEVEL||!Array.isArray(effects)||effects.length>FORGE_MAX_EFFECTS||new Set(effects).size!==effects.length||effects.some(e=>!forgeEffect(e)))throw Error('Invalid saved forge');
  }
  for(const m of message.room.members.filter(m=>!m.spectator)){
    m.charId ||= 'hunter';
    if(!Characters.has(m.charId))throw Error('Unknown character');
    if(m.weaponId && m.weaponId !== Characters.get(m.charId).startWeapon)throw Error('Invalid starting weapon');
    m.weaponId = Characters.get(m.charId).startWeapon;
  }
  const state=await import('../../../src/game/state.js');
  if(meta.slot!=null&&(!Number.isInteger(meta.slot)||meta.slot<0||meta.slot>=state.SLOTS))throw Error('Invalid saved metadata slot');
  localStorage.setItem('soulshard.save.v1.slot0',JSON.stringify({...meta,slot:0}));
  state.loadMeta(0);
  const userSettings=structuredClone(state.META.settings);state.META.settings.analytics=false;
  // The stored slot identity is retained in the persisted result; slot0 is process-local only.
  const {initRenderer}=await import('../../../src/engine/renderer.js');initRenderer(makeCanvas());
  sim=new AuthoritySimulation(message.room,message.runId,m=>{
    if(m.t==='runend'){
      send({...m,meta:{...state.META,slot:meta.slot||0,settings:userSettings}});
      clearInterval(timer);
    }else send(m);
  });
  previous=performance.now();
  timer=setInterval(()=>{
    try{
      const now=performance.now();accumulator+=(now-previous)/1000;previous=now;
      if(accumulator>2)throw Error('Simulation overload');
      const begin=performance.now();let ticks=0;
      while(accumulator>=SIM_DT&&ticks<30&&!sim.scene.dead){const at=performance.now();sim.step();tickCosts[tickCount++%tickCosts.length]=performance.now()-at;accumulator-=SIM_DT;ticks++;}
      if(sim.scene.dead){clearInterval(timer);return;}
      if(now-lastHeartbeat>1000){send({t:'heartbeat',tickMs:performance.now()-begin,ticks,simTime:sim.scene.run.time,rss:process.memoryUsage().rss,tick:tickMetrics()});lastHeartbeat=now;}
    }catch(error){send({t:'fatal',message:String(error.message)});clearInterval(timer);}
  },8);
  send({t:'ready',registry:registryStats()});
}
let lastHeartbeat=0,starting=false;
process.on('message',message=>{
  if(message?.t==='boot'&&!starting){starting=true;boot(message).catch(error=>send({t:'fatal',message:String(error.stack||error)}));return;}
  if(!sim||stopped)return;
  try{
    if(message.t==='input'||message.t==='levelpick')sim.input(message.cid,message);
    else if(message.t==='disconnect')sim.disconnect(message.cid,!!message.permanent);
    else if(message.t==='reconnect'){
      sim.reconnect(message.prevCid,message.cid);send({...sim.startPacket(),rejoin:message.cid});
      const slot=sim.coop.players.find(p=>p.cid===message.cid);
      if(slot?.pendingOpts)send({t:'levelup',runId:sim.runId,protocol:2,cid:slot.cid,choiceId:slot.choiceId,opts:slot.pendingOpts});
    }else if(message.t==='finish')sim.finish();
    else if(message.t==='stop')shutdown();
  }catch(error){send({t:'fatal',message:String(error.stack||error)});}
});
process.on('disconnect',shutdown);
