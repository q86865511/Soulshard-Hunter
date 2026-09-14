// tools/bot/record.mjs — R5 每局紀錄：欄位定義與驗證集中一處。
// 純 ESM，零 Node API；Node 與瀏覽器（driver.mjs）共用。
// 對應 specs/bot-balance-sim/requirements.md R5、design.md「介面與資料模型」/「JSONL 紀錄型別」、tasks.md T4。

export const TOOL_VERSION = '0.1.0';

const END_REASONS = ['finishRun', 'abandon', 'reaper_timeout', 'sim_cap', 'error'];

// pairs 可為 [src,v] 陣列或 {src:v} 物件 map；兩者皆依 v 降冪排序後取前 n。
function topN(pairs, n) {
  let list;
  if (Array.isArray(pairs)) {
    list = pairs;
  } else if (pairs && typeof pairs === 'object') {
    list = Object.entries(pairs);
  } else {
    return [];
  }
  return list.slice().sort((a, b) => b[1] - a[1]).slice(0, n);
}

// result 推導：error > cleared(不論 endReason) > raw.runResult(death/leave 照抄)
// > 其餘依 endReason 預設：finishRun→death、abandon→leave、其餘（sim_cap/reaper_timeout 等）→timeout。
function deriveResult(raw) {
  if (raw.endReason === 'error') return 'error';
  if (raw.cleared === true) return 'clear';
  if (raw.runResult === 'death' || raw.runResult === 'leave') return raw.runResult;
  if (raw.endReason === 'finishRun') return 'death';
  if (raw.endReason === 'abandon') return 'leave';
  return 'timeout';
}

export function makeRecord(cfg, raw) {
  const record = {
    biome: cfg.biome,
    char: cfg.char,
    diff: cfg.diff,
    mode: cfg.mode,
    runIdx: cfg.runIdx,
    seed: cfg.seed,
    result: deriveResult(raw),
    cleared: raw.cleared,
    endReason: raw.endReason,
    time: raw.time,
    level: raw.level,
    kills: raw.kills,
    score: raw.score,
    stage: raw.stage,
    deathSrc: raw.deathSrc,
    dmgTakenBySrc: topN(raw.dmgTakenBySrc, 5),
    dmgBySource: topN(raw.dmgBySource, 5),
    weapons: raw.weapons,
    abilities: raw.abilities,
    bossKills: raw.bossKills,
    reaperSlain: raw.reaperSlain,
    hpTimeline: raw.hpTimeline,
    simMs: raw.simMs,
    ticks: raw.ticks,
    toolVersion: TOOL_VERSION,
    gameVersion: raw.gameVersion,
  };
  if (raw.error !== undefined) record.error = raw.error;
  return record;
}

export function validateRecord(obj) {
  const errors = [];
  if (obj.result === undefined || obj.result === null) errors.push('result');
  if (typeof obj.time !== 'number' || !Number.isFinite(obj.time)) errors.push('time');
  if (typeof obj.cleared !== 'boolean') errors.push('cleared');
  if (typeof obj.endReason !== 'string' || !END_REASONS.includes(obj.endReason)) errors.push('endReason');
  if (typeof obj.gameVersion !== 'string') errors.push('gameVersion');
  return errors;
}
