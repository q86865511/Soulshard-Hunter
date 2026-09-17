import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
const root=path.resolve(process.argv[2]);
const moduleAt=relative=>import(pathToFileURL(path.join(root,relative)).href);
process.env.SOULSHARD_NO_LISTEN='1';
const {buildApp}=await moduleAt('server/src/server.js');
const app=await buildApp({query:async()=>({rows:[],rowCount:0})});
const health=await app.inject({url:'/api/health'});assert.equal(health.statusCode,200);await app.close();
const {AuthorityManager}=await moduleAt('server/src/authority/manager.js');
const events=[];let settlement;
const manager=new AuthorityManager({loadMeta:async()=>({version:2}),settle:async(s,m)=>{settlement=m;return{saved:true};}});
const room={code:'PKG',hostCid:'h',cfg:{biomeId:'crypt',difficulty:1},members:[{cid:'h',uid:'1',username:'H',host:true,charId:'hunter'},{cid:'g',uid:'2',username:'G',charId:'ranger'}]};
const wait=async fn=>{for(let i=0;i<300;i++){if(fn())return;await delay(20);}throw Error('packaged runtime timed out');};
try{
 const launch=await manager.start(room,m=>events.push(m));launch.activate();
 await wait(()=>events.some(m=>m.t==='snap'));
 manager.finish('PKG');await wait(()=>manager.rooms.size===0);
 assert.equal(settlement.meta.version,2);assert.equal(settlement.summary.result,'leave');
 assert.ok(events.some(m=>m.t==='settlement'&&m.settlement.saved));
 assert.equal(fs.existsSync(path.join(root,'server/node_modules/@electric-sql/pglite')),false);
 assert.equal(fs.existsSync(path.join(root,'assets')),false);
 console.log(JSON.stringify({runtime:process.version,apiHealth:true,roomBoot:true,snapshot:true,settlement:true,devDependencyExcluded:true,assetFilesNeeded:false,scope:process.env.AUTHORITY_TEST_CONTAINER?'actual Docker Linux '+process.arch+' test, network disabled; ARM64 capacity unverified':'Docker COPY-equivalent filesystem layout; not an ARM64 test'}));
}finally{manager.close();}
