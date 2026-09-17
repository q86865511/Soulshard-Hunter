import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {initSchema} from '../src/db.js';
import {authorityPersistence} from '../src/authority/persistence.js';
const db=await PGlite.create();
const query=async(sql,args)=> {
 if(!args){await db.exec(sql);return {rows:[],rowCount:0};}
 const r=await db.query(sql,args);return {...r,rowCount:r.affectedRows};
};
const pool={query};
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
try{
 await initSchema(pool);await initSchema(pool);
 await query("INSERT INTO users(id,username,password_hash) VALUES(1,'fixture','none')",[]);
 const base={version:2,slot:1,saveSeq:10,gold:100,settings:{analytics:false}};
 await query('INSERT INTO saves(user_id,meta,save_version) VALUES($1,$2,2)',[1,JSON.stringify(base)]);
 const store=authorityPersistence(pool,r=>r.kills*12+r.stage*400+r.time_s+r.difficulty*600+(r.reaper?5000:0));
 const state={runId:randomUUID(),meta:base,room:{hostCid:'h',members:[{cid:'h',uid:'1'}]}};
 const message={summary:{hostUid:'1',stage:1,kills:3,time_s:30,character:'hunter',biome:'crypt',difficulty:1,cleared:false,reaper:false,coop_size:2},meta:{...base,saveSeq:11,gold:130}};
 let out=await store.settle(state,message);
 ok(out.saved,'initial settlement saves');
 const stored=(await query('SELECT meta FROM saves WHERE user_id=$1',[1])).rows[0].meta;
 ok(stored.gold===130&&stored.slot===1&&stored.version===2&&stored.saveSeq===12,'existing format and slot retained, sequence advanced');
 await store.settle(state,{...message,meta:{...message.meta,gold:999999}});
 ok((await query('SELECT meta FROM saves WHERE user_id=$1',[1])).rows[0].meta.gold===130,'replay cannot re-award or replace result');
 ok(Number((await query('SELECT count(*) n FROM runs',[])).rows[0].n)===1,'one leaderboard row on replay');
 const next={...state,runId:randomUUID()};
 out=await store.settle(next,message);
 ok(!out.saved,'stale starting save detected');
 ok((await query('SELECT meta FROM saves WHERE user_id=$1',[1])).rows[0].meta.gold===130,'newer save not overwritten');
 ok((await query('SELECT meta FROM authority_results WHERE run_id=$1',[next.runId])).rows[0].meta.gold===130,'conflict result retained');
 const differentSlot={...base,slot:2,gold:500,saveSeq:1};
 await query('UPDATE saves SET meta=$2 WHERE user_id=$1',[1,JSON.stringify(differentSlot)]);
 out=await store.settle({...state,runId:randomUUID()},message);
 ok(!out.saved,'slot switch cannot be overwritten by end of prior run');
 const before=Number((await query('SELECT count(*) n FROM authority_results',[])).rows[0].n);
 await assert.rejects(store.settle({...state,runId:randomUUID(),meta:differentSlot},{...message,summary:{...message.summary,kills:2147483647}}));
 ok(Number((await query('SELECT count(*) n FROM authority_results',[])).rows[0].n)===before,'leaderboard SQL failure rolls back receipt and save together');
 const receipt=(await query('SELECT authority_run_id FROM runs ORDER BY id LIMIT 1',[])).rows[0];
 ok(receipt.authority_run_id===state.runId,'verified board provenance is server receipt');
 console.log(JSON.stringify({checks,engine:'PGlite PostgreSQL',tables:'actual initSchema and settlement SQL',limitations:'single database session; not a multi-process PostgreSQL load test'}));
}finally{await db.close();}
