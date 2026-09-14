// T4 — tools/bot/record.mjs 驗收測試（TDD 分代理：本檔只寫測試，不寫實作）
// 對應 specs/bot-balance-sim/requirements.md R5、design.md「介面與資料模型」record.mjs、tasks.md T4
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOOL_VERSION, makeRecord, validateRecord } from '../record.mjs';

// 合法紀錄：涵蓋 design.md「JSONL 紀錄型別」全部欄位（R5 全欄位）。
function legalRecord(overrides = {}) {
  return {
    biome: 'crypt',
    char: 'hunter',
    diff: 1,
    mode: 'normal',
    runIdx: 0,
    seed: 42,
    result: 'clear',
    cleared: true,
    endReason: 'finishRun',
    time: 1230,
    level: 20,
    kills: 300,
    score: 5000,
    stage: 5,
    deathSrc: null,
    dmgTakenBySrc: [['slime', 100]],
    dmgBySource: [['sword', 500]],
    weapons: ['sword'],
    abilities: ['power'],
    bossKills: 3,
    reaperSlain: true,
    hpTimeline: [1, 0.8, 0.5],
    simMs: 12345,
    ticks: 1000,
    toolVersion: TOOL_VERSION,
    gameVersion: 'V2.0',
    ...overrides,
  };
}

// makeRecord 的 cfg 引數：{biome,char,diff,mode,runIdx,seed}
function baseCfg(overrides = {}) {
  return { biome: 'crypt', char: 'hunter', diff: 1, mode: 'normal', runIdx: 0, seed: 42, ...overrides };
}

// makeRecord 的 raw 引數：頁內收集的原始物件（R5 定義的欄位集）
function baseRaw(overrides = {}) {
  return {
    cleared: false,
    endReason: 'finishRun',
    time: 300,
    level: 10,
    kills: 50,
    score: 1000,
    stage: 3,
    deathSrc: 'slime',
    dmgTakenBySrc: [['slime', 100]],
    dmgBySource: [['sword', 200]],
    weapons: ['sword'],
    abilities: [],
    bossKills: 0,
    reaperSlain: false,
    hpTimeline: [1, 0.9],
    simMs: 5000,
    ticks: 600,
    gameVersion: 'V2.0',
    ...overrides,
  };
}

test('TOOL_VERSION：字串常數 0.1.0', () => {
  assert.equal(TOOL_VERSION, '0.1.0');
});

test('validateRecord：合法紀錄回傳空陣列', () => {
  assert.deepStrictEqual(validateRecord(legalRecord()), []);
});

test('validateRecord：缺 result 回傳含 "result" 的陣列', () => {
  const { result, ...rec } = legalRecord();
  assert.ok(validateRecord(rec).includes('result'));
});

test('validateRecord：time 為字串回傳含 "time" 的陣列', () => {
  const rec = legalRecord({ time: '1230' });
  assert.ok(validateRecord(rec).includes('time'));
});

test('validateRecord：缺 cleared 回傳含 "cleared" 的陣列', () => {
  const { cleared, ...rec } = legalRecord();
  assert.ok(validateRecord(rec).includes('cleared'));
});

test('validateRecord：缺 endReason 回傳含 "endReason" 的陣列', () => {
  const { endReason, ...rec } = legalRecord();
  assert.ok(validateRecord(rec).includes('endReason'));
});

test('validateRecord：缺 gameVersion 回傳含 "gameVersion" 的陣列', () => {
  const { gameVersion, ...rec } = legalRecord();
  assert.ok(validateRecord(rec).includes('gameVersion'));
});

test('makeRecord：result 推導 — cleared:true, endReason:sim_cap → clear', () => {
  const record = makeRecord(baseCfg(), baseRaw({ cleared: true, endReason: 'sim_cap' }));
  assert.equal(record.result, 'clear');
});

test('makeRecord：result 推導 — cleared:false, endReason:sim_cap → timeout', () => {
  const record = makeRecord(baseCfg(), baseRaw({ cleared: false, endReason: 'sim_cap' }));
  assert.equal(record.result, 'timeout');
});

test('makeRecord：result 推導 — endReason:error → error', () => {
  const record = makeRecord(baseCfg(), baseRaw({ cleared: false, endReason: 'error', error: 'boom' }));
  assert.equal(record.result, 'error');
});

test('makeRecord：result 推導 — cleared:false, endReason:finishRun, runResult:death → death', () => {
  const record = makeRecord(baseCfg(), baseRaw({ cleared: false, endReason: 'finishRun', runResult: 'death' }));
  assert.equal(record.result, 'death');
});

test('makeRecord：timeout 的 raw 產出通過 validateRecord 的紀錄，且 time 等於 raw.time', () => {
  const raw = baseRaw({ cleared: false, endReason: 'sim_cap', time: 1350 });
  const record = makeRecord(baseCfg(), raw);
  assert.deepStrictEqual(validateRecord(record), []);
  assert.equal(record.time, raw.time);
});

test('makeRecord：error 的 raw 產出通過 validateRecord 的紀錄，且 time 等於 raw.time', () => {
  const raw = baseRaw({ cleared: false, endReason: 'error', error: 'boom', time: 88 });
  const record = makeRecord(baseCfg(), raw);
  assert.deepStrictEqual(validateRecord(record), []);
  assert.equal(record.time, raw.time);
});

test('makeRecord：JSON.stringify(record) 不含換行', () => {
  const record = makeRecord(baseCfg(), baseRaw());
  assert.doesNotMatch(JSON.stringify(record), /\n/);
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F3: dmgTakenBySrc/dmgBySource 為物件 map 時也要轉成 [src,v] 前 5 降冪陣列
// ---------------------------------------------------------------------------

test('makeRecord：dmgTakenBySrc 為物件 map → 轉為 [src,v] 陣列、依 v 降冪取前 5', () => {
  const raw = baseRaw({
    dmgTakenBySrc: { slime: 30, spike: 120, bat: 5, boss: 400, fire: 50, arrow: 1 },
  });
  const record = makeRecord(baseCfg(), raw);
  assert.deepStrictEqual(record.dmgTakenBySrc[0], ['boss', 400]);
  assert.equal(record.dmgTakenBySrc.length, 5);
  assert.ok(
    !record.dmgTakenBySrc.some(([src]) => src === 'arrow'),
    '前 5 不應含被擠出的 arrow'
  );
});

test('makeRecord：dmgBySource 為物件 map → 同樣轉為 [src,v] 陣列並依 v 降冪', () => {
  const raw = baseRaw({ dmgBySource: { sword: 10, bow: 99, staff: 50 } });
  const record = makeRecord(baseCfg(), raw);
  assert.deepStrictEqual(record.dmgBySource[0], ['bow', 99]);
  assert.deepStrictEqual(record.dmgBySource, [
    ['bow', 99],
    ['staff', 50],
    ['sword', 10],
  ]);
});

test('makeRecord：dmgTakenBySrc 既有陣列輸入仍可用（依 v 降冪取前 5）', () => {
  const raw = baseRaw({
    dmgTakenBySrc: [['slime', 100], ['spike', 20]],
  });
  const record = makeRecord(baseCfg(), raw);
  assert.deepStrictEqual(record.dmgTakenBySrc, [
    ['slime', 100],
    ['spike', 20],
  ]);
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F4: result 推導改依 endReason（runResult 缺席時的預設值）
// ---------------------------------------------------------------------------

test('makeRecord：result 推導 — cleared:false, endReason:finishRun 缺 runResult → death', () => {
  const raw = baseRaw({ cleared: false, endReason: 'finishRun' });
  const record = makeRecord(baseCfg(), raw);
  assert.equal(record.result, 'death');
});

test('makeRecord：result 推導 — cleared:false, endReason:abandon → leave', () => {
  const raw = baseRaw({ cleared: false, endReason: 'abandon' });
  const record = makeRecord(baseCfg(), raw);
  assert.equal(record.result, 'leave');
});

test('makeRecord：result 推導 — cleared:false, endReason:sim_cap → timeout', () => {
  const raw = baseRaw({ cleared: false, endReason: 'sim_cap' });
  const record = makeRecord(baseCfg(), raw);
  assert.equal(record.result, 'timeout');
});

test('makeRecord：result 推導 — cleared:true, endReason:reaper_timeout → clear', () => {
  const raw = baseRaw({ cleared: true, endReason: 'reaper_timeout' });
  const record = makeRecord(baseCfg(), raw);
  assert.equal(record.result, 'clear');
});

test('makeRecord：result 推導 — cleared:false, endReason:finishRun, runResult:leave → leave（有值照抄）', () => {
  const raw = baseRaw({ cleared: false, endReason: 'finishRun', runResult: 'leave' });
  const record = makeRecord(baseCfg(), raw);
  assert.equal(record.result, 'leave');
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F7: topN 覆蓋缺口（經由 makeRecord 驗證陣列輸入的降冪排序與截斷）
// ---------------------------------------------------------------------------

test('makeRecord：dmgTakenBySrc 陣列輸入 6 筆 → 依 v 降冪取前 5（b,f,d,c,e）', () => {
  const raw = baseRaw({
    dmgTakenBySrc: [['a', 1], ['b', 9], ['c', 5], ['d', 7], ['e', 3], ['f', 8]],
  });
  const record = makeRecord(baseCfg(), raw);
  assert.deepStrictEqual(record.dmgTakenBySrc, [
    ['b', 9],
    ['f', 8],
    ['d', 7],
    ['c', 5],
    ['e', 3],
  ]);
});
