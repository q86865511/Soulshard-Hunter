import test from 'node:test';
import assert from 'node:assert/strict';
import {Realtime} from '../src/realtime.js';
import {makeFakePool} from './fakepool.mjs';
const client=(cid,uid)=>({cid,protocol:2,user:{uid,username:cid},send(){},close(){}});
async function fixture(){
 const calls=[];const authority={depart(){},disconnect(){},finish(){calls.push('finish');},stop(){calls.push('stop');},reconnect(...args){calls.push(args);}};
 const rt=new Realtime(makeFakePool(),{authority,genCode:()=> 'REJOIN'});
 const host=client('h','1'),guest=client('g','2');
 await rt.onConnect(host);await rt.onConnect(guest);rt.createRoom(host);rt.joinRoom(guest,'REJOIN');
 const room=rt.myRoom(host);room.started=true;room.runId='fixture';
 return {rt,host,guest,room,calls};
}
test('owner departure preserves a disconnected teammate within grace',async()=>{
 const {rt,host,guest,room,calls}=await fixture();
 await rt.onClose(guest);rt.leaveRoom(host);
 assert.equal(rt.rooms.get('REJOIN'),room);assert.ok(rt.pendingRejoin.has('g'));assert.deepEqual(calls,[]);
 const rejoined=client('g2','2');rejoined.resumeCid='g';await rt.onConnect(rejoined);
 assert.equal(rt.myRoom(rejoined),room);assert.equal(room.hostCid,'g2');
});
test('socket closed during async connection setup never consumes a held actor',async()=>{
 const {rt,guest}=await fixture();await rt.onClose(guest);
 let release;rt.pushFriends=()=>new Promise(r=>release=r);
 const stale=client('stale','2');stale.resumeCid='g';
 const connecting=rt.onConnect(stale);await rt.onClose(stale);release();await connecting;
 assert.ok(rt.pendingRejoin.has('g'));assert.equal(rt.roomOf.has('stale'),false);assert.equal(rt.byCid.has('stale'),false);
});
