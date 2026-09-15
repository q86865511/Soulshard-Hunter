// tools/bot/test/preflight.test.mjs — 第 3 波審查裁決的純函式層（TDD 鎖定測試）。
//
// 執行：`node --test "tools/bot/test/*.test.mjs"`（於 repo 根）。
//
// ────────────────────────────────────────────────────────────────────────────
// 實作契約（本檔為 TDD 鎖定測試，實作代理照此做）
// ────────────────────────────────────────────────────────────────────────────
// 新純函式模組 `tools/bot/preflight.mjs`：零 Node API（不得 import fs/path/process），
// 新檔，不動已 TDD 鎖定的 plan.mjs。檔案內容一律由呼叫端（run.mjs）讀好再傳進來。
//
//  1) `parseBench(text) → {medianMs:number, inflation:number, calibrated:boolean}`
//     BENCH.md 內容須同時含 `median_ms: <整數>` 與 `inflation: <小數>` 兩行
//     （允許前後空白、行內其他文字、千分位逗號如 `median_ms: 1,407`）。
//     缺任一行 → `{medianMs:60000, inflation:1, calibrated:false}`。
//  2) `readGameVersionFromSource(text) → string|null`
//     以 regex 從 `src/game/content/patchnotes.js` 原文取
//     `export const GAME_VERSION = '<v>'`（單雙引號皆可）；找不到回 null。
//  3) `readBalanceCapFromSource(text) → number|null`
//     從 `src/game/balance.js` 原文取 `LEVEL_TIME: <expr>` 與 `REAPER_DELAY: <expr>`
//     （expr 允許 `20 * 60` 這種乘法算式或整數），回 LEVEL_TIME + REAPER_DELAY + 120；
//     任一缺 → null。
//  4) `nextConsecFail(prev, rec) → number`：`rec.result === 'error'` → prev+1，否則 0。
//  5) `dedupeLatest(records) → records`：同 keyOf（biome|char|diff|runIdx）保留最後一筆，
//     保序（以該 key 第一次出現的位置排序）。
//  6) `resumeDoneKeys(records) → Set`：只收 `result !== 'error'` 的 key
//     （error 局續跑要重試）。
//
// 對應 specs/bot-balance-sim：requirements.md R2/R8、design.md「關鍵流程」批次調度段。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseBench, readGameVersionFromSource, readBalanceCapFromSource,
  nextConsecFail, dedupeLatest, resumeDoneKeys,
} from '../preflight.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const FALLBACK = { medianMs: 60000, inflation: 1, calibrated: false };

// ── parseBench ──────────────────────────────────────────────────────────────

test('parseBench 正常（含千分位逗號）→ 解出 medianMs / inflation 且 calibrated', () => {
  const text = [
    '# BENCH — bot-balance-sim 基準',
    '',
    '單局中位耗時 median_ms: 1,407  （headless Chromium，parallel 1）',
    '並行膨脹 inflation: 1.35',
    '',
  ].join('\n');
  assert.deepEqual(parseBench(text), { medianMs: 1407, inflation: 1.35, calibrated: true });
});

test('parseBench 缺 inflation 一行 → 整組回退且 calibrated:false', () => {
  const text = 'median_ms: 1407\n（尚未量並行膨脹）\n';
  assert.deepEqual(parseBench(text), FALLBACK);
});

test('parseBench 空字串 → 回退值', () => {
  assert.deepEqual(parseBench(''), FALLBACK);
});

// ── readGameVersionFromSource ───────────────────────────────────────────────

test('readGameVersionFromSource 對實際 patchnotes.js 回 V2.0', () => {
  const text = readSrc(path.join('src', 'game', 'content', 'patchnotes.js'));
  assert.equal(readGameVersionFromSource(text), 'V2.0');
});

test('readGameVersionFromSource 對雙引號寫法也解得出', () => {
  assert.equal(readGameVersionFromSource('export const GAME_VERSION = "V9.9";'), 'V9.9');
});

test('readGameVersionFromSource 找不到 → null', () => {
  assert.equal(readGameVersionFromSource('nothing'), null);
});

// ── readBalanceCapFromSource ────────────────────────────────────────────────

test('readBalanceCapFromSource 對實際 balance.js 回 1350（1200+30+120）', () => {
  const text = readSrc(path.join('src', 'game', 'balance.js'));
  assert.equal(readBalanceCapFromSource(text), 1350);
});

test('readBalanceCapFromSource 支援整數字面量寫法', () => {
  assert.equal(readBalanceCapFromSource('{ LEVEL_TIME: 1200, REAPER_DELAY: 30, }'), 1350);
});

test('readBalanceCapFromSource 缺 REAPER_DELAY → null', () => {
  assert.equal(readBalanceCapFromSource('export const BALANCE = { LEVEL_TIME: 20 * 60, };'), null);
});

// ── nextConsecFail ──────────────────────────────────────────────────────────

test('nextConsecFail：error 紀錄累加', () => {
  assert.equal(nextConsecFail(2, { result: 'error' }), 3);
});

test('nextConsecFail：非 error 紀錄歸零', () => {
  assert.equal(nextConsecFail(2, { result: 'timeout' }), 0);
});

// ── dedupeLatest ────────────────────────────────────────────────────────────

test('dedupeLatest：同 key 三筆取最後一筆，且保留首次出現的順序', () => {
  const recs = [
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 1, tag: 'a1' },
    { biome: 'cavern', char: 'ranger', diff: 2, runIdx: 1, tag: 'b1' },
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 1, tag: 'a2' },
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 1, tag: 'a3' },
  ];
  const out = dedupeLatest(recs);
  assert.equal(out.length, 2, `同 key 應收斂為 1 筆，實得 ${JSON.stringify(out.map((r) => r.tag))}`);
  assert.deepEqual(out.map((r) => r.tag), ['a3', 'b1'], 'crypt 組應取最後一筆且仍排在前面');
});

test('dedupeLatest：無重複時原樣回傳（不改順序）', () => {
  const recs = [
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 1 },
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 2 },
  ];
  assert.deepEqual(dedupeLatest(recs).map((r) => r.runIdx), [1, 2]);
});

// ── resumeDoneKeys ──────────────────────────────────────────────────────────

test('resumeDoneKeys：error 局不算已完成，其餘算', () => {
  const recs = [
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 1, result: 'error' },
    { biome: 'crypt', char: 'hunter', diff: 1, runIdx: 2, result: 'death' },
  ];
  const keys = resumeDoneKeys(recs);
  assert.ok(keys instanceof Set, 'resumeDoneKeys 應回 Set');
  assert.equal(keys.size, 1, `只有非 error 局算完成，實得 ${JSON.stringify([...keys])}`);
  assert.ok(keys.has('crypt|hunter|1|2'), 'death 局的 key 應在集合內');
  assert.ok(!keys.has('crypt|hunter|1|1'), 'error 局的 key 不得在集合內（續跑要重試）');
});
