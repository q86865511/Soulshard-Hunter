import {isDeepStrictEqual} from 'node:util';
// Dev-only shared adapter for BOTH fake pools. Production SQL is independently
// tested against PostgreSQL in authority-persistence.mjs.
export function makeAuthorityStub({saves,runs,nextRunId}){
 const receipts=new Map();
 return (s,args)=>{
  if(s.startsWith('WITH locked AS (')){
   const [run_id,uid,resultJSON,metaJSON,baseJSON,score,stage,kills,character,biome,difficulty,time_s,cleared,reaper,coop_size]=args;
   const save=saves.get(String(uid));
   if(receipts.has(run_id)||!save)return {rows:[],rowCount:0};
   const meta=JSON.parse(metaJSON),saved=isDeepStrictEqual(save.meta,JSON.parse(baseJSON)),created_at=new Date().toISOString();
   receipts.set(run_id,{run_id,host_uid:String(uid),result:JSON.parse(resultJSON),meta,saved,created_at});
   if(saved)saves.set(String(uid),{meta,save_version:2});
   runs.push({id:nextRunId(),user_id:uid,guest_name:null,score,stage,kills,character,biome,difficulty,time_s,cleared,reaper,coop_size,mode:'normal',challenge_key:null,authority_run_id:run_id,authority:true,created_at});
   return {rows:[{saved}],rowCount:1};
  }
  if(s.startsWith('SELECT saved FROM authority_results')){
   const row=receipts.get(args[0]);return {rows:row?.host_uid===String(args[1])?[{saved:row.saved}]:[],rowCount:row?1:0};
  }
  if(s.startsWith('SELECT run_id, result, saved, created_at FROM authority_results')){
   const rows=[...receipts.values()].filter(r=>r.host_uid===String(args[0])).slice(-10).reverse().map(({run_id,result,saved,created_at})=>({run_id,result,saved,created_at}));
   return {rows,rowCount:rows.length};
  }
  return null;
 };
}
