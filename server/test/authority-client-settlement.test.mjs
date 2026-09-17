import test from 'node:test';
import assert from 'node:assert/strict';
import {installHeadless} from '../src/authority/headless.js';
installHeadless();await import('../../src/bootstrap.js');
const {coopScene}=await import('../../src/game/scenes/coop.js');
const {getMeta,saveMeta}=await import('../../src/game/state.js');
const {Net}=await import('../../src/net/api.js');
const {RT}=await import('../../src/net/rt.js');
async function delayedResult(change){
 const oldGet=Net.getSave,oldToken=Net.authToken;
 let release,token='original';
 try{
  Net.authToken=()=>token;Net.getSave=()=>new Promise(r=>release=r);RT.uid='1';
  coopScene.authority=true;coopScene.runId='fixture';
  const before=structuredClone(getMeta());
  const pending=coopScene.syncSettlement({runId:'fixture',summary:{hostUid:'1'},settlement:{saved:true}});
  change(()=>{token='other';RT.uid='2';});
  release({meta:{...before,gold:123456,saveSeq:(before.saveSeq||0)+100,slot:0}});
  await pending;
 }finally{Net.getSave=oldGet;Net.authToken=oldToken;}
}
test('late settlement read cannot overwrite newer local progress',async()=>{
 await delayedResult(()=>{getMeta().gold=777;saveMeta();});
 assert.equal(getMeta().gold,777);
});
test('late result from previous account cannot import into changed session',async()=>{
 getMeta().gold=888;
 await delayedResult(changeAccount=>changeAccount());
 assert.equal(getMeta().gold,888);
});
test('late result cannot update a later co-op scene',async()=>{
 getMeta().gold=999;
 await delayedResult(()=>{coopScene.runId='new-run';});
 assert.equal(getMeta().gold,999);
});

test('separate settlement acknowledgement imports only the current completed run',async()=>{
 const oldGet=Net.getSave,oldToken=Net.authToken;
 try{
  let calls=0;Net.authToken=()=> 'fixture-token';Net.getSave=async()=>{calls++;return{meta:{...structuredClone(getMeta()),gold:321,slot:0}};};
  coopScene.authority=true;coopScene.runId='ack-run';coopScene.runOver=true;RT.uid='1';
  await coopScene.onSettlement({protocol:2,runId:'older',summary:{hostUid:'1'},settlement:{saved:true}});
  assert.equal(calls,0);
  await coopScene.onSettlement({protocol:2,runId:'ack-run',summary:{hostUid:'1'},settlement:{saved:true}});
  assert.equal(calls,1);assert.equal(getMeta().gold,321);
 }finally{Net.getSave=oldGet;Net.authToken=oldToken;}
});
