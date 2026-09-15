// T0 冒煙測試：只證明 `node --test` runner 在 tools/bot/test/ 底下能被發現並執行。
// 之後 T1+ 的單元/整合測試會取代/擴充本檔驗證的內容；本測試本身不驗證任何 bot 邏輯。
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('smoke: node --test runner can run a basic assertion', () => {
  // 斷言 1+1===2：證明本目錄下的測試會被 `node --test tools/bot/test/*.test.mjs`
  // 以及 test/ 底下的 `npm run test:bot` 正確發現、載入、執行到底並回報 pass。
  assert.equal(1 + 1, 2);
});
