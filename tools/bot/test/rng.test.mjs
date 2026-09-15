// T1 — tools/bot/strategy/rng.mjs 驗收測試（TDD 分代理：本檔只寫測試，不寫實作）
// 對應 specs/bot-balance-sim/requirements.md R9、design.md「介面與資料模型」rng.mjs、tasks.md T1
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, hashSeed } from '../strategy/rng.mjs';

test('makeRng: 同 seed 兩個實例的前 100 個值深相等', () => {
  const rngA = makeRng(12345);
  const rngB = makeRng(12345);
  const seqA = Array.from({ length: 100 }, () => rngA());
  const seqB = Array.from({ length: 100 }, () => rngB());
  assert.deepStrictEqual(seqA, seqB);
});

test('makeRng: seed 1 與 seed 2 的前 10 個值不全相等', () => {
  const rng1 = makeRng(1);
  const rng2 = makeRng(2);
  const seq1 = Array.from({ length: 10 }, () => rng1());
  const seq2 = Array.from({ length: 10 }, () => rng2());
  assert.notDeepStrictEqual(seq1, seq2);
});

test('makeRng: 所有值都落在 [0,1) 區間', () => {
  const rng = makeRng(42);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.equal(typeof v, 'number');
    assert.ok(v >= 0, `值 ${v} 應 >= 0`);
    assert.ok(v < 1, `值 ${v} 應 < 1`);
  }
});

test('hashSeed: 對同 parts 連呼兩次結果相等，且為 0..2^32-1 的整數', () => {
  const h1 = hashSeed('crypt', 'hunter', 1);
  const h2 = hashSeed('crypt', 'hunter', 1);
  assert.equal(h1, h2);
  assert.ok(Number.isInteger(h1));
  assert.ok(h1 >= 0 && h1 <= 0xffffffff);
});

test('hashSeed: 對 parts 順序敏感（不同順序得不同結果）', () => {
  const hAB = hashSeed('a', 'b');
  const hBA = hashSeed('b', 'a');
  assert.notEqual(hAB, hBA);
});
