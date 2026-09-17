import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {AuthorityManager} from '../src/authority/manager.js';
const manager=new AuthorityManager({maxRooms:2});
const rooms=[0,1].map(i=>({code:'LOAD'+i,hostCid:'h'+i,cfg:{biomeId:i?'inferno':'crypt',difficulty:1},members:[0,1,2].map(j=>({cid:j?'g'+i+j:'h'+i,uid:String(i*3+j+1),username:'fixture',host:j===0,charId:'hunter'}))}));
const samples=[];let timer;const sequences=new Map();
try{
 for(const room of rooms){const launch=await manager.start(room,()=>{});launch.activate();}
 await assert.rejects(manager.start({...rooms[0],code:'OVER'},()=>{}),/已滿/);
 timer=setInterval(()=>{for(const state of manager.rooms.values())for(const m of state.room.members){const seq=(sequences.get(m.cid)||0)+1;sequences.set(m.cid,seq);manager.input(state.room.code,m.cid,{t:'input',runId:state.runId,protocol:2,seq,mv:[0,0],dash:false});}},30);
 for(let i=0;i<12;i++){await delay(1000);samples.push([...manager.rooms.values()].map(s=>s.metrics));}
 const result={node:process.version,platform:process.platform,arch:process.arch,rooms:2,playersPerRoom:3,durationSeconds:12,
  samples:samples.at(-1),scope:'first 12 seconds of real gameplay, concurrent with local bot batch; not late-wave load or Oracle ARM capacity'};
 for(const s of result.samples){assert.ok(s.tick.sampleCount>900);assert.ok(s.simTime>=10);}
 console.log(JSON.stringify(result));
}finally{clearInterval(timer);manager.close();}
