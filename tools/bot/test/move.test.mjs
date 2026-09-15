// T2 — tools/bot/strategy/move.mjs 驗收測試（TDD 分代理：本檔只寫測試，不寫實作）
// 對應 specs/bot-balance-sim/requirements.md R3、R9、design.md「介面與資料模型」strategy/move.mjs、
// design.md「測試策略」R3 六列＋R9 可重現列、tasks.md T2。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideMove } from '../strategy/move.mjs';

const TS = 16;
const SEED = 20260914;

// 玩家固定於 (0,0)、ts=16、blocked 恆 false，除非個別測試覆寫。
function makeEnemy(x, y, overrides = {}) {
  return {
    x,
    y,
    radius: 12,
    boss: false,
    hpFrac: 1,
    dist: Math.hypot(x, y),
    ...overrides,
  };
}

function baseView(overrides = {}) {
  return {
    x: 0,
    y: 0,
    hpFrac: 1,
    dashReady: false,
    ts: TS,
    enemies: [],
    pickups: [],
    blocked: () => false,
    seed: SEED,
    ...overrides,
  };
}

test('R3: 單一敵人在正右方 (40,0) → move.x < 0（遠離敵人）', () => {
  const view = baseView({ enemies: [makeEnemy(40, 0)] });
  const { move } = decideMove(view);
  assert.ok(move.x < 0, `move.x 應 < 0，實際 ${move.x}`);
});

test('R3: 三面包圍（北西南各一敵）走東側 → move.x > 0 且 |move.y| < |move.x|', () => {
  const view = baseView({
    enemies: [makeEnemy(0, -40), makeEnemy(-40, 0), makeEnemy(0, 40)],
  });
  const { move } = decideMove(view);
  assert.ok(move.x > 0, `move.x 應 > 0，實際 ${move.x}`);
  assert.ok(
    Math.abs(move.y) < Math.abs(move.x),
    `|move.y|(${move.y}) 應 < |move.x|(${move.x})`
  );
});

test('R3: 無敵人、pickup 在右上 (48,-48) → 朝 pickup（move.x>0 且 move.y<0）', () => {
  const view = baseView({ pickups: [{ x: 48, y: -48, type: 'gold' }] });
  const { move } = decideMove(view);
  assert.ok(move.x > 0, `move.x 應 > 0，實際 ${move.x}`);
  assert.ok(move.y < 0, `move.y 應 < 0，實際 ${move.y}`);
});

test('R3: 敵人在右、左側 blocked 為真 → 不朝被擋方向（|move.x| < 0.2 或改走 y）', () => {
  const view = baseView({
    enemies: [makeEnemy(40, 0)],
    blocked: (wx) => wx < -8,
  });
  const { move } = decideMove(view);
  const avoidedBlockedDir = Math.abs(move.x) < 0.2 || Math.abs(move.y) > Math.abs(move.x);
  assert.ok(
    avoidedBlockedDir,
    `應避開被擋方向：|move.x|<0.2 或改走 y，實際 move=(${move.x}, ${move.y})`
  );
});

test('R3: hpFrac 0.3、敵距 20、dashReady true → dash:true', () => {
  const view = baseView({ hpFrac: 0.3, dashReady: true, enemies: [makeEnemy(20, 0, { dist: 20 })] });
  const { dash } = decideMove(view);
  assert.equal(dash, true);
});

test('R3: hpFrac 0.3、敵距 20、dashReady false → dash:false', () => {
  const view = baseView({ hpFrac: 0.3, dashReady: false, enemies: [makeEnemy(20, 0, { dist: 20 })] });
  const { dash } = decideMove(view);
  assert.equal(dash, false);
});

test('R3: hpFrac 0.9（未低血）、敵距 20、dashReady true → dash:false', () => {
  const view = baseView({ hpFrac: 0.9, dashReady: true, enemies: [makeEnemy(20, 0, { dist: 20 })] });
  const { dash } = decideMove(view);
  assert.equal(dash, false);
});

test('R3: 空敵人空 pickup → move 深等於 {x:0,y:0} 且 dash:false', () => {
  const view = baseView();
  const result = decideMove(view);
  assert.deepStrictEqual(result.move, { x: 0, y: 0 });
  assert.equal(result.dash, false);
});

test('R3: 任意情境下 |move| ≤ 1.0000001（各種敵人/拾取組合）', () => {
  const scenarios = [
    baseView({ enemies: [makeEnemy(40, 0)] }),
    baseView({ enemies: [makeEnemy(0, -40), makeEnemy(-40, 0), makeEnemy(0, 40)] }),
    baseView({ pickups: [{ x: 48, y: -48, type: 'gold' }] }),
    baseView({ enemies: [makeEnemy(40, 0)], blocked: (wx) => wx < -8 }),
    baseView({
      enemies: [
        makeEnemy(40, 0, { boss: true, radius: 30 }),
        makeEnemy(-10, -10, { dist: Math.hypot(10, 10) }),
        makeEnemy(5, 30, { dist: Math.hypot(5, 30) }),
      ],
      pickups: [{ x: -20, y: 20, type: 'gold' }],
    }),
    baseView(),
  ];
  for (const view of scenarios) {
    const { move } = decideMove(view);
    const len = Math.hypot(move.x, move.y);
    assert.ok(len <= 1.0000001, `|move| 應 ≤ 1.0000001，實際 ${len}（view=${JSON.stringify({ enemies: view.enemies, pickups: view.pickups })}）`);
  }
});

test('R9: 同 seed 同 view 連呼 100 次結果深相等', () => {
  const view = baseView({
    hpFrac: 0.5,
    dashReady: true,
    enemies: [makeEnemy(40, 0), makeEnemy(-15, 25, { dist: Math.hypot(15, 25) })],
    pickups: [{ x: -48, y: -10, type: 'gem' }],
  });
  const first = decideMove(view);
  for (let i = 0; i < 100; i++) {
    const again = decideMove(view);
    assert.deepStrictEqual(again, first);
  }
});

// ---- 第 2 波審查裁決 F1–F3、F7 追加測試（本節新增，鎖定修正後的走位/衝刺行為）----

test('F1: 近敵在右、左側被牆擋 → 不可選擇被擋方向（move.x >= -0.2 且非零向量）', () => {
  const view = baseView({
    enemies: [makeEnemy(1, 0, { radius: 6, dist: 1 })],
    blocked: (wx) => wx < -4,
  });
  const { move } = decideMove(view);
  assert.ok(move.x >= -0.2, `move.x 應 >= -0.2（不往左撞牆），實際 ${move.x}`);
  assert.ok(!(move.x === 0 && move.y === 0), `move 不應為零向量（要往 y 方向逃），實際 (${move.x}, ${move.y})`);
});

test('F2: 一格厚的牆（正東 30–46px）不可被取樣點跳過（不可直直往東走）', () => {
  const view = baseView({
    enemies: [makeEnemy(-40, 0, { dist: 40 })],
    blocked: (wx, wy) => wx >= 30 && wx <= 46 && Math.abs(wy) <= 8,
  });
  const { move } = decideMove(view);
  const avoidsWall = move.x <= 0.3 || Math.abs(move.y) >= Math.abs(move.x);
  assert.ok(
    avoidsWall,
    `不應直直撞牆：move.x<=0.3 或 |move.y|>=|move.x|，實際 move=(${move.x}, ${move.y})`
  );
});

test('F3(a): 敵距 30 > 24px 撿拾閘門、pickup 背離敵人方向 → 會去撿（move.y < 0）', () => {
  const view = baseView({
    enemies: [makeEnemy(0, 30, { dist: 30 })],
    pickups: [{ x: 0, y: -60, type: 'xp' }],
  });
  const { move } = decideMove(view);
  assert.ok(move.y < 0, `move.y 應 < 0，實際 ${move.y}`);
});

test('F3(b): 敵距 20 < 24px 撿拾閘門仍關閉，逃離為主（move.y < 0）', () => {
  const view = baseView({
    enemies: [makeEnemy(0, 20, { dist: 20 })],
    pickups: [{ x: 60, y: 0, type: 'xp' }],
  });
  const { move } = decideMove(view);
  assert.ok(move.y < 0, `move.y 應 < 0（逃離為主），實際 ${move.y}`);
});

test('F3(c): pickup 與敵人同方向（敵在北方 30px、pickup 更北）→ 不朝敵人方向去撿（move.y > 0）', () => {
  const view = baseView({
    enemies: [makeEnemy(0, -30, { dist: 30 })],
    pickups: [{ x: 0, y: -60, type: 'xp' }],
  });
  const { move } = decideMove(view);
  assert.ok(move.y > 0, `move.y 應 > 0（不朝敵人方向去撿），實際 ${move.y}`);
});

test('F7(a): dash 門檻為絕對 24px（ts=32、敵距 30 > 24）→ dash:false', () => {
  const view = baseView({
    ts: 32,
    hpFrac: 0.2,
    dashReady: true,
    enemies: [makeEnemy(30, 0, { dist: 30 })],
  });
  const { dash } = decideMove(view);
  assert.equal(dash, false);
});

test('F7(b): dash 門檻為絕對 24px（ts=32、敵距 24 = 閾值）→ dash:true', () => {
  const view = baseView({
    ts: 32,
    hpFrac: 0.2,
    dashReady: true,
    enemies: [makeEnemy(24, 0, { dist: 24 })],
  });
  const { dash } = decideMove(view);
  assert.equal(dash, true);
});
