// T5 — tools/bot/summarize.mjs 驗收測試（TDD 分代理：本檔只寫測試，不寫實作）
// 對應 specs/bot-balance-sim/requirements.md R6、R9、design.md「測試策略」fixture F6、tasks.md T5
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../summarize.mjs';

// 合法紀錄：R5 全欄位合法預設值（design.md「fixture F6」：欄位以外一律合法預設值）。
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
    dmgTakenBySrc: [],
    dmgBySource: [],
    weapons: [],
    abilities: [],
    bossKills: 0,
    reaperSlain: false,
    hpTimeline: [],
    simMs: 1000,
    ticks: 100,
    toolVersion: '0.1.0',
    gameVersion: 'V2.0',
    ...overrides,
  };
}

// design.md「fixture F6」（R6 單元測試的固定輸入，6 筆，2 生態 2 角色）。
const FIXTURE_F6 = [
  legalRecord({ biome: 'crypt', char: 'hunter', diff: 1, result: 'clear', cleared: true, endReason: 'finishRun', time: 1230, deathSrc: null }),
  legalRecord({ biome: 'crypt', char: 'hunter', diff: 1, result: 'death', cleared: false, endReason: 'finishRun', time: 300, deathSrc: 'slime' }),
  legalRecord({ biome: 'crypt', char: 'hunter', diff: 1, result: 'death', cleared: false, endReason: 'finishRun', time: 420, deathSrc: 'slime' }),
  legalRecord({ biome: 'desert', char: 'ranger', diff: 3, result: 'death', cleared: false, endReason: 'finishRun', time: 200, deathSrc: 'scorpion' }),
  legalRecord({ biome: 'desert', char: 'ranger', diff: 3, result: 'death', cleared: false, endReason: 'finishRun', time: 250, deathSrc: 'scorpion' }),
  legalRecord({ biome: 'desert', char: 'ranger', diff: 3, result: 'timeout', cleared: false, endReason: 'sim_cap', time: 1350, deathSrc: null }),
];

test('summarize(fixture F6)：crypt×1 格列含 n（有效）/通關率/p25/p50/p75（nearest-rank）', () => {
  const md = summarize(FIXTURE_F6);
  assert.ok(
    md.includes('| crypt | 1 | 3（有效 3） | 33% | 300 | 420 | 1230 |'),
    `輸出應含 crypt×1 格列，實際輸出：\n${md}`
  );
});

test('summarize(fixture F6)：desert×3 格列含 n（有效）/通關率 0%', () => {
  const md = summarize(FIXTURE_F6);
  assert.ok(
    md.includes('| desert | 3 | 3（有效 2） | 0% |'),
    `輸出應含 desert×3 格列，實際輸出：\n${md}`
  );
});

test('summarize(fixture F6)：異常清單含「desert×3：通關率 0%」', () => {
  const md = summarize(FIXTURE_F6);
  assert.ok(md.includes('desert×3：通關率 0%'), `異常清單應含通關率 0% 項，實際輸出：\n${md}`);
});

test('summarize(fixture F6)：異常清單含「desert×3：死因 scorpion 100%」', () => {
  const md = summarize(FIXTURE_F6);
  assert.ok(
    md.includes('desert×3：死因 scorpion 100%'),
    `異常清單應含死因集中項，實際輸出：\n${md}`
  );
});

test('summarize(fixture F6)：異常清單不含「角色極差」（33pp 未達 50pp 門檻）', () => {
  const md = summarize(FIXTURE_F6);
  assert.ok(!md.includes('角色極差'), `33pp < 50pp 不應觸發角色極差異常，實際輸出：\n${md}`);
});

test('summarize(fixture F6)：角色表 hunter 名次 1、ranger 名次 2', () => {
  const md = summarize(FIXTURE_F6);
  const lines = md.split('\n').map((l) => l.trim());
  const hunterLine = lines.find((l) => l.startsWith('| hunter |'));
  const rangerLine = lines.find((l) => l.startsWith('| ranger |'));
  assert.ok(hunterLine, `角色表應有 hunter 列，實際輸出：\n${md}`);
  assert.ok(rangerLine, `角色表應有 ranger 列，實際輸出：\n${md}`);
  const hunterCols = hunterLine.split('|').map((s) => s.trim()).filter(Boolean);
  const rangerCols = rangerLine.split('|').map((s) => s.trim()).filter(Boolean);
  assert.equal(hunterCols[hunterCols.length - 1], '1', `hunter 名次應為 1，該列：${hunterLine}`);
  assert.equal(rangerCols[rangerCols.length - 1], '2', `ranger 名次應為 2，該列：${rangerLine}`);
});

test('summarize(fixture F6)：報告開頭（首個表格前）含 RNG 聲明與系統性質聲明', () => {
  const md = summarize(FIXTURE_F6);
  const tableStart = md.indexOf('|');
  assert.ok(tableStart > 0, `報告應含表格，實際輸出：\n${md}`);
  const head = md.slice(0, tableStart);
  assert.ok(head.includes('遊戲 RNG 不受控'), `開頭應含 RNG 聲明，開頭段：\n${head}`);
  assert.ok(head.includes('不代表真人退出與重試行為'), `開頭應含系統性質聲明，開頭段：\n${head}`);
});

test('F8: 報告開頭（首個表格前）含策略等級聲明（走位＋懂進化的選擇；event/curse 固定第一項、shop 不買）', () => {
  const md = summarize(FIXTURE_F6);
  const tableStart = md.indexOf('|');
  const head = md.slice(0, tableStart);
  assert.ok(head.includes('走位＋懂進化的選擇'), `開頭應含策略等級聲明，開頭段：\n${head}`);
  assert.ok(
    head.includes('event/curse 固定第一項、shop 不買'),
    `開頭應含 event/curse/shop 聲明，開頭段：\n${head}`
  );
});

test('summarize([])：含「無資料」且不拋例外', () => {
  let md;
  assert.doesNotThrow(() => {
    md = summarize([]);
  });
  assert.ok(md.includes('無資料'), `空輸入應含「無資料」，實際輸出：\n${md}`);
});

test('summarize：某格全為 timeout（有效 0）→ 該格列 N/A×4、異常清單不含該格、輸出不含 NaN', () => {
  const allTimeout = [
    legalRecord({ biome: 'plains', char: 'mage', diff: 2, result: 'timeout', cleared: false, endReason: 'sim_cap', time: 100, deathSrc: null }),
    legalRecord({ biome: 'plains', char: 'mage', diff: 2, result: 'timeout', cleared: false, endReason: 'sim_cap', time: 200, deathSrc: null }),
    legalRecord({ biome: 'plains', char: 'mage', diff: 2, result: 'timeout', cleared: false, endReason: 'sim_cap', time: 300, deathSrc: null }),
  ];
  const md = summarize(allTimeout);
  assert.ok(
    md.includes('3（有效 0） | N/A | N/A | N/A | N/A'),
    `全 timeout 格應輸出 N/A×4，實際輸出：\n${md}`
  );
  assert.ok(!md.includes('plains×2'), `有效 0 的格不應參與異常判定，實際輸出：\n${md}`);
  assert.ok(!md.includes('NaN'), `輸出不得出現 NaN，實際輸出：\n${md}`);
});
