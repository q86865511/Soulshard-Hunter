// tools/bot/preflight.mjs
//
// 純函式層：批次開跑前的來源解析（BENCH 基準、遊戲版本、模擬上限）與續跑/失敗計數輔助。
// 零 Node API（不得 import fs/path/process）——檔案文字一律由呼叫端（tools/bot/run.mjs）讀好傳入。
//
// 對應 specs/bot-balance-sim/requirements.md R2、R8；design.md「關鍵流程」批次調度段、「風險」段。

import { keyOf } from './plan.mjs';

const BENCH_FALLBACK = { medianMs: 60000, inflation: 1, calibrated: false };

/**
 * 解析 BENCH.md：須同時含 `median_ms: <整數>` 與 `inflation: <小數>` 兩行，缺任一行整組回退。
 * 允許千分位逗號（`median_ms: 1,407`）與行內其他文字。
 */
export function parseBench(text) {
  const src = String(text || '');
  const m = /median_ms\s*:\s*([0-9][0-9,]*)/i.exec(src);
  const f = /inflation\s*:\s*([0-9]+(?:\.[0-9]+)?)/i.exec(src);
  if (!m || !f) return { ...BENCH_FALLBACK };
  const medianMs = Number(m[1].replace(/,/g, ''));
  const inflation = Number(f[1]);
  if (!Number.isFinite(medianMs) || !Number.isFinite(inflation)) return { ...BENCH_FALLBACK };
  return { medianMs, inflation, calibrated: true };
}

/** 從 src/game/content/patchnotes.js 原文取 GAME_VERSION（不開瀏覽器）。 */
export function readGameVersionFromSource(text) {
  const m = /export\s+const\s+GAME_VERSION\s*=\s*['"]([^'"]+)['"]/.exec(String(text || ''));
  return m ? m[1] : null;
}

/** `20 * 60` 這種乘法算式或整數字面量 → 數值；取不到回 null。 */
function readSeconds(text, key) {
  const m = new RegExp(`${key}\\s*:\\s*(\\d+(?:\\s*\\*\\s*\\d+)*)`).exec(text);
  if (!m) return null;
  const n = m[1].split('*').reduce((acc, part) => acc * Number(part.trim()), 1);
  return Number.isFinite(n) ? n : null;
}

/** 從 src/game/balance.js 原文推單局模擬上限：LEVEL_TIME + REAPER_DELAY + 120 秒緩衝。 */
export function readBalanceCapFromSource(text) {
  const src = String(text || '');
  const levelTime = readSeconds(src, 'LEVEL_TIME');
  const reaperDelay = readSeconds(src, 'REAPER_DELAY');
  if (levelTime == null || reaperDelay == null) return null;
  return levelTime + reaperDelay + 120;
}

/** 連續失敗計數：error 紀錄累加，其餘歸零。 */
export function nextConsecFail(prev, rec) {
  return (rec && rec.result === 'error') ? prev + 1 : 0;
}

/** 同 key 保留最後一筆，順序依該 key 首次出現的位置。 */
export function dedupeLatest(records) {
  const at = new Map();
  const out = [];
  for (const rec of records) {
    const k = keyOf(rec);
    if (at.has(k)) out[at.get(k)] = rec;
    else { at.set(k, out.length); out.push(rec); }
  }
  return out;
}

/** 續跑時已完成的 key：error 局不算（要重跑）。 */
export function resumeDoneKeys(records) {
  const keys = new Set();
  for (const rec of records) {
    if (rec && rec.result !== 'error') keys.add(keyOf(rec));
  }
  return keys;
}
