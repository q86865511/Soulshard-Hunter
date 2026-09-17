import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
process.env.SOULSHARD_NO_LISTEN='1';
const {buildApp}=await import('../src/server.js');
const {initSchema}=await import('../src/db.js');
const db=await PGlite.create();
const pool={query:async(sql,args)=>{
 if(!args){await db.exec(sql);return {rows:[],rowCount:0};}
 const r=await db.query(sql,args);return {...r,rowCount:r.affectedRows};
}};
await initSchema(pool);const app=await buildApp(pool,{rateMax:10000});
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
try{
 const reg=await app.inject({method:'POST',url:'/api/register',payload:{username:'authfixture',password:'FixturePassword123!'}});
 const {token,user}=reg.json();assert.equal(reg.statusCode,200);
 const headers={authorization:'Bearer '+token};
 const base={version:2,slot:0,saveSeq:10,gold:20};
 let response=await app.inject({method:'PUT',url:'/api/save',headers,payload:{meta:base,saveVersion:2}});
 ok(response.statusCode===200,'existing save route works');
 ok((await app.inject({url:'/api/authority/results'})).statusCode===401,'receipt history requires auth');
 app.realtime.authority.users.add(String(user.id));
 response=await app.inject({method:'PUT',url:'/api/save',headers,payload:{meta:{...base,gold:999},saveVersion:2}});
 ok(response.statusCode===409,'live cooperative account cannot overwrite starting save');
 app.realtime.authority.users.delete(String(user.id));
 const summary={stage:1,kills:3,time_s:30,character:'hunter',biome:'crypt',difficulty:1,coop_size:2,cleared:false,reaper:false};
 response=await app.inject({method:'POST',url:'/api/runs',headers,payload:summary});
 ok(response.statusCode===403,'authenticated client cannot forge a coop score');
 response=await app.inject({method:'POST',url:'/api/runs/guest',payload:{...summary,name:'fixture'}});
 ok(response.statusCode===403,'guest cannot forge a coop score');
 const state={runId:randomUUID(),meta:base,room:{hostCid:'h',members:[{cid:'h',uid:String(user.id)}]}};
 await app.realtime.authority.settle(state,{summary:{...summary,hostUid:String(user.id)},meta:{...base,gold:30}});
 await app.realtime.authority.settle(state,{summary:{...summary,hostUid:String(user.id)},meta:{...base,gold:300}});
 response=await app.inject({url:'/api/save',headers});
 ok(response.json().meta.gold===30,'actual SQL settles reward exactly once');
 response=await app.inject({url:'/api/authority/results',headers});
 ok(response.json().rows.length===1&&response.json().rows[0].run_id===state.runId&&!('meta' in response.json().rows[0]),'receipt endpoint scopes history without exposing whole save');
 const other=(await app.inject({method:'POST',url:'/api/register',payload:{username:'otherfixture',password:'FixturePassword123!'}})).json();
 response=await app.inject({url:'/api/authority/results',headers:{authorization:'Bearer '+other.token}});
 ok(response.json().rows.length===0,'different account cannot read receipt');
 response=await app.inject({url:'/api/leaderboard'});
 ok(response.json().rows[0].authority===true,'board exposes genuine provenance from server DB');
 response=await app.inject({method:'POST',url:'/api/runs',headers,payload:{...summary,coop_size:1,authority:true,authority_run_id:randomUUID()}});
 ok(response.statusCode===200,'legacy solo remains supported');
 const rows=await pool.query('SELECT authority_run_id FROM runs ORDER BY id',[]);
 ok(rows.rows.length===2&&rows.rows[1].authority_run_id===null,'claimed provenance cannot mint verified run');
 console.log(JSON.stringify({checks,engine:'PGlite + real Fastify routes'}));
}finally{await app.close();await db.close();}
