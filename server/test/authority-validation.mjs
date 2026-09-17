import assert from 'node:assert/strict';
import {AuthorityManager} from '../src/authority/manager.js';
const room={code:'V',hostCid:'h',cfg:{biomeId:'crypt',difficulty:1},members:[{cid:'h',uid:'1',username:'H',host:true,charId:'hunter'},{cid:'g',uid:'2',username:'G',charId:'hunter'}]};
let checks=0;
for(const meta of [
 {version:2,slot:'1'},
 {version:2,slot:3},
 {version:2,gold:'invalid'},
 {version:2,stats:{runs:'invalid'}},
 JSON.parse('{"version":2,"__proto__":{"speed":999}}'),
 {version:2,talents:{t_speed:999999}},
 {version:2,facilities:{f_dojo:999999}},
 {version:2,forge:{w_soulbolt:{level:5,effects:['swift','swift']}}},
 {version:2,forge:{w_soulbolt:{level:-1,effects:[]}}},
]){
 const manager=new AuthorityManager({loadMeta:async()=>meta});
 try{await assert.rejects(manager.start(room,()=>{}),/Invalid saved/);assert.equal(manager.rooms.size,0);assert.equal(manager.users.size,0);checks++;}finally{manager.close();}
}
const manager=new AuthorityManager();
try{
 await assert.rejects(manager.start({...room,members:room.members.map(m=>({...m,weaponId:'w_soulstorm'}))},()=>{}),/Invalid starting weapon/);
 assert.equal(manager.rooms.size,0);checks++;
}finally{manager.close();}
console.log(JSON.stringify({checks,scope:'actual worker rejects inflated progression, forged forge stacks and mismatched/evolved start weapons'}));
