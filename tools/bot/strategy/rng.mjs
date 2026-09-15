// tools/bot/strategy/rng.mjs
// 純 ESM、零 Node API — 可在瀏覽器 import，也可被 Node 測試載入。
// 對應 specs/bot-balance-sim/requirements.md R9（策略層可重現）、design.md「介面與資料模型」。
//
// makeRng(seed) → () => number   （mulberry32，回傳 [0,1) 浮點）
// hashSeed(...parts) → uint32    （FNV-1a 混合任意字串/數字 parts，同 parts 同結果、順序敏感）

/**
 * mulberry32 PRNG。
 * @param {number} seed 任意數字；內部會正規化為 uint32。
 * @returns {() => number} 每次呼叫回傳 [0,1) 區間的浮點數。
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a 風格的字串/數字混合雜湊，順序敏感，穩定回傳 0..2^32-1 的整數。
 * @param {...(string|number)} parts
 * @returns {number} uint32
 */
export function hashSeed(...parts) {
  let h = 0x811c9dc5; // FNV offset basis
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193); // FNV prime
    }
    // part 之間插入分隔符位元組，避免 ('a','b') 與 ('ab') 之類的碰撞
    h ^= 0x1f;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
