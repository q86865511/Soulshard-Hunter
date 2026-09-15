// tools/bot/test/pw_util.test.mjs — page.evaluate 逾時護欄（TDD 鎖定測試）。
//
// 執行：`node --test "tools/bot/test/*.test.mjs"`（於 repo 根）。
//
// ────────────────────────────────────────────────────────────────────────────
// 實作契約（本檔為 TDD 鎖定測試，實作代理照此做）
// ────────────────────────────────────────────────────────────────────────────
// 新 Node 模組 `tools/bot/pw_util.mjs`：
//   `evaluateWithTimeout(page, fn, arg, ms) → Promise`
//   - 在 ms 毫秒內未 resolve → reject 一個 Error，其 `name === 'EvaluateTimeout'`。
//   - page 只需具備 `evaluate(fn, arg)`（測試以假物件替身，不依賴 Playwright）。
//   - 正常 resolve 時原值透傳。
// run.mjs 的每次 page.evaluate 都必須經由它（預設 60000ms，`--evalTimeoutMs N` 可覆寫）。
//
// 對應 specs/bot-balance-sim：requirements.md R8、design.md「關鍵流程」批次調度段。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateWithTimeout } from '../pw_util.mjs';

test('evaluateWithTimeout：永不 resolve 的 evaluate → 逾時 reject EvaluateTimeout', async () => {
  const page = { evaluate: () => new Promise(() => {}) };
  await assert.rejects(
    () => evaluateWithTimeout(page, () => 1, null, 50),
    (err) => {
      assert.ok(err instanceof Error, 'reject 值應為 Error');
      assert.equal(err.name, 'EvaluateTimeout', `err.name 應為 EvaluateTimeout，實得 ${err.name}`);
      return true;
    },
  );
});

test('evaluateWithTimeout：正常 resolve 時原值透傳', async () => {
  const page = { evaluate: () => Promise.resolve(42) };
  assert.equal(await evaluateWithTimeout(page, () => 42, null, 5000), 42);
});

test('evaluateWithTimeout：fn 與 arg 原樣轉交給 page.evaluate', async () => {
  const seen = [];
  const page = { evaluate: (fn, arg) => { seen.push([fn, arg]); return Promise.resolve(fn(arg)); } };
  const fn = (x) => x * 2;
  assert.equal(await evaluateWithTimeout(page, fn, 21, 5000), 42);
  assert.equal(seen.length, 1, 'page.evaluate 應恰被呼叫一次');
  assert.equal(seen[0][0], fn, 'fn 應原樣轉交');
  assert.equal(seen[0][1], 21, 'arg 應原樣轉交');
});
