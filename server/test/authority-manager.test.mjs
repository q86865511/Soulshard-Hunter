import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {AuthorityManager} from '../src/authority/manager.js';
const room={code:'R',hostCid:'h',members:[{cid:'h',uid:'1'},{cid:'g',uid:'2'}]};
function factory({fail=false}={}){
 const children=[];const spawn=()=>{
  const child=new EventEmitter();child.stderr=new EventEmitter();child.stdout=new EventEmitter();child.sent=[];child.killed=false;
  child.kill=()=>{child.killed=true;child.emit('exit',0);};
  child.send=m=>{child.sent.push(m);if(m.t==='boot')queueMicrotask(()=>child.emit('message',fail?{t:'fatal',message:'fixture'}:{t:'ready'}));return true;};
  children.push(child);return child;
 };return {children,spawn};
}
test('reserves capacity during async loading and cleans failed boot',async()=>{
 const f=factory({fail:true});let release;
 const mgr=new AuthorityManager({maxRooms:1,spawn:f.spawn,loadMeta:()=>new Promise(r=>release=r)});
 const first=mgr.start(room,()=>{});await assert.rejects(mgr.start({...room,code:'B'},()=>{}),/已滿/);
 release({});await assert.rejects(first,/fixture/);assert.equal(mgr.rooms.size,0);assert.equal(mgr.users.size,0);assert.ok(f.children[0].killed);
});
test('forbids duplicate accounts and concurrent room membership',async()=>{
 const f=factory();const mgr=new AuthorityManager({maxRooms:2,spawn:f.spawn});
 await assert.rejects(mgr.start({...room,members:[{cid:'h',uid:'1'},{cid:'g',uid:'1'}]},()=>{}),/同一帳號/);
 await mgr.start(room,()=>{});await assert.rejects(mgr.start({...room,code:'B'},()=>{}),/同一帳號/);mgr.close();
});
test('single settlement, private save never leaves manager, errors fail closed',async()=>{
 const f=factory();const messages=[];let settles=0;
 const mgr=new AuthorityManager({spawn:f.spawn,settle:async()=>{settles++;return{saved:true};}});
 const run=await mgr.start(room,m=>messages.push(m));run.activate();
 const child=f.children[0];const end={t:'runend',meta:{private:'fixture'},summary:{}};
 child.emit('message',end);child.emit('message',end);
 await new Promise(r=>setImmediate(r));
 assert.equal(settles,1);assert.equal(messages.length,2);assert.equal(messages[0].t,'runend');assert.equal(messages[1].t,'settlement');assert.equal(messages[0].meta,undefined);assert.equal(messages[1].meta,undefined);assert.ok(child.killed);assert.equal(mgr.rooms.size,0);
});
test('worker crash reports failure once and reclaims room',async()=>{
 const f=factory();const output=[];const mgr=new AuthorityManager({spawn:f.spawn});
 await mgr.start(room,m=>output.push(m));
 f.children[0].emit('error',Error('fixture crash'));
 assert.equal(output[0].t,'authority:error');assert.equal(mgr.rooms.size,0);assert.equal(mgr.users.size,0);
});
test('closing while loading cannot resurrect a worker',async()=>{
 const f=factory();let release;const mgr=new AuthorityManager({spawn:f.spawn,loadMeta:()=>new Promise(r=>release=r)});
 const pending=mgr.start(room,()=>{});mgr.close();release({});
 await assert.rejects(pending,/已關閉/);assert.equal(f.children.length,0);assert.equal(mgr.users.size,0);
});

test('stale startup failure cannot stop a replacement room with the same code',async()=>{
 const f=factory();let release;let first=true;
 const mgr=new AuthorityManager({spawn:f.spawn,loadMeta:()=>{if(first){first=false;return new Promise(r=>release=r);}return{};}});
 const old=mgr.start(room,()=>{});mgr.stop('R');
 const current=await mgr.start(room,()=>{});
 release({});await assert.rejects(old,/已關閉/);
 assert.equal(mgr.rooms.get('R').runId,current.runId);assert.equal(f.children[0].killed,false);mgr.close();
});
test('stale settlement completion cannot kill a replacement room',async()=>{
 const f=factory();let release;
 const mgr=new AuthorityManager({spawn:f.spawn,settle:()=>new Promise(r=>release=r)});
 await mgr.start(room,()=>{});f.children[0].emit('message',{t:'runend',meta:{}});
 mgr.stop('R');const current=await mgr.start(room,()=>{});
 release({saved:true});await new Promise(r=>setImmediate(r));
 assert.equal(mgr.rooms.get('R').runId,current.runId);assert.equal(f.children[1].killed,false);mgr.close();
});


test('a healthy ongoing match has no new wall-clock gameplay cutoff',async()=>{
 const f=factory();const mgr=new AuthorityManager({spawn:f.spawn});
 try{
  await mgr.start(room,()=>{});const state=mgr.rooms.get('R');state.startedAt=Date.now()-46*60*1000;
  await new Promise(r=>setTimeout(r,1150));
  assert.equal(mgr.rooms.get('R'),state);assert.equal(f.children[0].killed,false);
 }finally{mgr.close();}
});
test('a missing worker heartbeat still terminates the room',async()=>{
 const f=factory();const mgr=new AuthorityManager({spawn:f.spawn});
 try{
  await mgr.start(room,()=>{});mgr.rooms.get('R').lastBeat=Date.now()-11000;
  await new Promise(r=>setTimeout(r,1150));
  assert.equal(mgr.rooms.size,0);assert.equal(f.children[0].killed,true);
 }finally{mgr.close();}
});


test('terminal world result arrives before a slow database confirmation',async()=>{
 const f=factory();const messages=[];let release;
 const mgr=new AuthorityManager({spawn:f.spawn,settle:()=>new Promise(r=>release=r)});
 try{
  await mgr.start(room,m=>messages.push(m));
  f.children[0].emit('message',{t:'runend',won:true,summary:{},meta:{private:'fixture'}});
  assert.equal(messages[0]?.t,'runend');assert.equal(messages[0]?.settlement?.pending,true);
  assert.equal(f.children[0].killed,true);
  await new Promise(r=>setImmediate(r));release({saved:true});
  await new Promise(r=>setImmediate(r));
  assert.equal(messages[1]?.t,'settlement');assert.equal(messages[1]?.settlement?.saved,true);
  assert.equal(messages[1]?.meta,undefined);assert.equal(mgr.rooms.size,0);
 }finally{mgr.close();release?.({saved:false});}
});


test('database confirmation timeout preserves the game result and releases resources',async()=>{
 const f=factory();const messages=[];let settleReply,arrived,timeoutGuard;
 const confirmed=new Promise(r=>arrived=r);
 const mgr=new AuthorityManager({spawn:f.spawn,settlementTimeoutMs:20,settle:()=>new Promise(r=>settleReply=r)});
 try{
  await mgr.start(room,m=>{messages.push(m);if(m.t==='settlement')arrived();});
  f.children[0].emit('message',{t:'runend',won:true,meta:{private:'fixture'},summary:{}});
  await Promise.race([confirmed,new Promise((resolve,reject)=>{timeoutGuard=setTimeout(()=>reject(Error('confirmation did not arrive')),1000);})]);
  clearTimeout(timeoutGuard);
  assert.equal(messages[0].won,true);assert.equal(messages[1].settlement.pending,true);
  assert.equal(messages[1].settlement.saved,null);assert.equal(mgr.rooms.size,0);
  assert.equal(f.children[0].killed,true);
  settleReply({saved:true});await new Promise(r=>setImmediate(r));
  assert.equal(messages.length,2,'late SQL completion cannot emit a second confirmation');
 }finally{clearTimeout(timeoutGuard);mgr.close();settleReply?.({saved:false});}
});
