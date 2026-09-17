// One SQL statement owns the result, save CAS and leaderboard insert.
// A concurrent save is retained; its un-applied result remains in authority_results.
export const AUTHORITY_SCHEMA = `
CREATE TABLE IF NOT EXISTS authority_results (
  run_id uuid PRIMARY KEY,
  host_uid bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  result jsonb NOT NULL,
  meta jsonb NOT NULL,
  saved boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS authority_results_host_idx ON authority_results(host_uid, created_at DESC);
`;
export function authorityPersistence(pool, computeScore) {
  return {
    async loadMeta(uid) {
      const r=await pool.query('SELECT meta, save_version FROM saves WHERE user_id=$1',[uid]);
      if(!r.rows[0]?.meta)throw Error('請先使用帳號的雲端同步功能儲存進度，再開始合作');
      return r.rows[0].meta;
    },
    async settle(state,message) {
      const r=message.summary,host=state.room.members.find(p=>p.cid===state.room.hostCid);
      if(!host||String(r.hostUid)!==String(host.uid))throw Error('Settlement actor mismatch');
      for(const k of ['stage','kills','time_s','difficulty','coop_size'])if(!Number.isSafeInteger(r[k])||r[k]<0||r[k]>2147483647)throw Error('Invalid server result');
      if(!message.meta||![1,2].includes(message.meta.version))throw Error('Invalid saved result format');
      const runId=state.runId,uid=host.uid,score=computeScore(r);
      const meta={...message.meta,slot:state.meta.slot||0,saveSeq:Math.max(state.meta.saveSeq||0,message.meta.saveSeq||0)+1,savedAt:Date.now()};
      const q=await pool.query(`
        WITH locked AS (
          SELECT meta FROM saves WHERE user_id=$2 FOR UPDATE
        ), claim AS (
          INSERT INTO authority_results(run_id,host_uid,result,meta,saved)
          SELECT $1::uuid,$2,$3::jsonb,$4::jsonb,meta=$5::jsonb FROM locked
          ON CONFLICT(run_id) DO NOTHING RETURNING saved
        ), written AS (
          UPDATE saves SET meta=$4::jsonb,save_version=2,updated_at=now()
          WHERE user_id=$2 AND EXISTS(SELECT 1 FROM claim WHERE saved) RETURNING user_id
        ), board AS (
          INSERT INTO runs(user_id,score,stage,kills,character,biome,difficulty,time_s,cleared,reaper,coop_size,mode,challenge_key,authority_run_id)
          SELECT $2,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'normal',NULL,$1::uuid FROM claim
          RETURNING id
        )
        SELECT saved FROM claim
      `,[runId,uid,JSON.stringify({...r,score}),JSON.stringify(meta),JSON.stringify(state.meta),score,r.stage,r.kills,r.character,r.biome,r.difficulty,r.time_s,!!r.cleared,!!r.reaper,r.coop_size]);
      let saved=q.rows[0]?.saved;
      if(saved===undefined){
        const existing=await pool.query('SELECT saved FROM authority_results WHERE run_id=$1 AND host_uid=$2',[runId,uid]);
        if(!existing.rows[0])throw Error('Missing settlement save');
        saved=existing.rows[0].saved;
      }
      return {saved,runId,error:saved?undefined:'雲端進度已變更；已保留本局結果，未覆蓋較新存檔'};
    },
  };
}
