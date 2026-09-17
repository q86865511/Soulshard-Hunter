// Shared real-game adapter. Exactly one instance per isolated room process.
// No client-supplied dt, stats, entities, damage, XP or result enters this API.
import { CoopHost } from './coophost.js';
import { buildRunStart } from './protocol.js';
import { runScene } from '../scenes/run.js';
import { newRun } from '../state.js';
import { Music } from '../../engine/audio.js';
export const SIM_DT = 1 / 120;
export class AuthoritySimulation {
  constructor(room, runId, emit) {
    this.room = room; this.runId = runId; this.emit = emit; this.closed = false; this.listeners = new Map();
    const output = m => emit({ ...m, runId, protocol: 2 });
    const transport = {
      on: (type, fn) => { let set=this.listeners.get(type); if(!set)this.listeners.set(type,set=new Set());set.add(fn);return()=>set.delete(fn); },
      isConnected:()=>!this.closed, send:output,
      runStart:m=>output({t:'runstart',...m}),
      snap:m=>output({t:'snap',...m}),
      runEnd:m=>{ output({t:'runend',...m, summary:this.result()}); },
    };
    this.coop = new CoopHost(room, room.hostCid, {transport,remoteHost:true});
    const host = room.members.find(m=>m.cid===room.hostCid);
    if(!host)throw Error('Missing simulation leader');
    this.scene = runScene;
    this.scene.enter({run:newRun({biomeId:room.cfg.biomeId||'crypt',difficulty:room.cfg.difficulty,characterId:host.charId,startWeapon:host.weaponId}),coop:this.coop});
    this.scene._stopPresence();
  }
  signal(type,message){ for(const fn of this.listeners.get(type)||[])fn(message); }
  input(cid,message){ if(!this.closed)this.signal(message.t,{...message,cid}); }
  disconnect(cid, permanent=false){ if(!this.closed)this.coop.retire(cid,permanent?'leave':'disconnect'); }
  finish(){if(!this.closed&&!this.scene.dead)this.scene.finishRun(this.scene.cleared,'leave');}
  reconnect(prevCid,cid){
    if(this.closed)return;
    this.coop.reattach(prevCid,cid);
    if(this.coop.selfCid===prevCid)this.coop.selfCid=cid;
    const member=this.room.members.find(m=>m.cid===prevCid);if(member)member.cid=cid;
    if(this.room.hostCid===prevCid)this.room.hostCid=cid;
  }
  startPacket(){return {...buildRunStart(this.scene),t:'runstart',protocol:2,runId:this.runId};}
  step(){
    if(this.closed||this.scene.dead)return;
    this.scene.update(SIM_DT);
  }
  result(){
    const r=this.scene.run;
    return {stage:r.stage,kills:r.kills,time_s:Math.floor(r.time),character:r.characterId,biome:r.biomeId,
      difficulty:r.difficulty,cleared:!!r.cleared,reaper:!!this.scene.reaperSlain,score:r.score,
      coop_size:this.coop.size(),mode:r.mode, gold:r.gold, result:r.result,
      hostUid:this.coop.players.find(p=>p.isLocal)?.uid};
  }
  dispose(){if(this.closed)return;this.closed=true;this.scene._stopPresence();this.coop.dispose();Music.stop();this.listeners.clear();}
}
