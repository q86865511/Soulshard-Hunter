// T3 — tools/bot/strategy/choice.mjs 驗收測試（TDD 分代理：本檔只寫測試，不寫實作）
// 對應 specs/bot-balance-sim/requirements.md R4、R9；design.md「介面與資料模型」strategy/choice.mjs
// 一行＋「測試策略」R4 七列、R9 可重現性列；specs/bot-balance-sim/tasks.md T3。
//
// state 形狀：{ weapons:[{id,level,evolved,equipped}], passives:[id], passiveLevels:{},
//              equipment:{weapon,armor,trinket}(各 {id,tier}|null), MAX_WEAPONS, MAX_PASSIVES, seed }
// reg 形狀：{ weapon(id)→{evolveReq,evolveInto,maxLevel}|undefined,
//            equip(id)→{slot,tier,exclusive}|undefined }
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideChoice } from '../strategy/choice.mjs';

function makeState(overrides = {}) {
  return Object.assign(
    {
      weapons: [],
      passives: [],
      passiveLevels: {},
      equipment: { weapon: null, armor: null, trinket: null },
      MAX_WEAPONS: 6,
      MAX_PASSIVES: 14,
      seed: 1,
    },
    overrides,
  );
}

function makeReg(weapons = {}, equips = {}) {
  return {
    weapon: (id) => weapons[id],
    equip: (id) => equips[id],
  };
}

// ---- level：進化配對優先於其他一切（design.md R4 表列 1） ----
test('level: 持有 A 未進化、options 含其 evolveReq 被動 power → 選 power（index 1）', () => {
  const state = makeState({
    weapons: [{ id: 'A', level: 3, evolved: false, equipped: false }],
    passives: [],
  });
  const reg = makeReg({ A: { evolveReq: 'power', evolveInto: 'A_evo', maxLevel: 7 } });
  const options = [
    { kind: 'ability', id: 'shield' },
    { kind: 'ability', id: 'power' },
    { kind: 'weaponup', id: 'A', level: 3 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

// ---- level：fuse 優先於一般升級與被動（design.md R4 表列 2） ----
test('level: fuse 優先於持有升級與無關被動 → 選 fuse（index 1）', () => {
  const state = makeState({
    weapons: [
      { id: 'A', level: 2, evolved: false, equipped: false },
      { id: 'B', level: 2, evolved: false, equipped: false },
    ],
    passives: [],
  });
  const reg = makeReg({
    A: { evolveReq: 'unrelated', evolveInto: null, maxLevel: 7 },
    B: { evolveReq: 'unrelated2', evolveInto: null, maxLevel: 7 },
  });
  const options = [
    { kind: 'ability', id: 'shield' },
    { kind: 'fuse', id: 'fuseAB', sources: ['A', 'B'] },
    { kind: 'weaponup', id: 'A', level: 2 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

// ---- level：fuse 不犧牲已進化滿級武器，退而選持有升級（design.md R4 表列 3） ----
test('level: fuse 來源含 evolved 且滿級的武器 → 不選 fuse，改選 weaponup A（index 2）', () => {
  const state = makeState({
    weapons: [
      { id: 'A', level: 2, evolved: false, equipped: false },
      { id: 'B', level: 7, evolved: true, equipped: false },
    ],
    passives: [],
  });
  const reg = makeReg({
    A: { evolveReq: 'unrelated', evolveInto: null, maxLevel: 7 },
    B: { evolveReq: 'unrelated2', evolveInto: null, maxLevel: 7 },
  });
  const options = [
    { kind: 'ability', id: 'shield' },
    { kind: 'fuse', id: 'fuseAB', sources: ['A', 'B'] },
    { kind: 'weaponup', id: 'A', level: 2 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 2);
});

// ---- level：不選滿級升級；全滿級時退回第一個非武器項 / 無非武器項時 -1（design.md R4 表列 4） ----
test('level: A 已滿級 → 不選其 weaponup，改選被動 x（index 1）', () => {
  const state = makeState({
    weapons: [{ id: 'A', level: 7, evolved: false, equipped: false }],
    passives: [],
  });
  const reg = makeReg({ A: { evolveReq: null, evolveInto: null, maxLevel: 7 } });
  const options = [
    { kind: 'weaponup', id: 'A', level: 7 },
    { kind: 'ability', id: 'x' },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

test('level: options 全為滿級升級（僅一項且是武器項）→ 回 -1', () => {
  const state = makeState({
    weapons: [{ id: 'A', level: 7, evolved: false, equipped: false }],
    passives: [],
  });
  const reg = makeReg({ A: { evolveReq: null, evolveInto: null, maxLevel: 7 } });
  const options = [{ kind: 'weaponup', id: 'A', level: 7 }];
  assert.equal(decideChoice('level', options, state, reg), -1);
});

// ---- level：武器槽已滿 → 不選新武器，改選被動（design.md R4 表列 4 的另一半） ----
test('level: 已持有 6 把非 equipped 武器（槽滿）→ 不選新武器，改選被動 x（index 1）', () => {
  const state = makeState({
    weapons: Array.from({ length: 6 }, (_, i) => ({
      id: `W${i}`,
      level: 1,
      evolved: false,
      equipped: false,
    })),
    passives: [],
    MAX_WEAPONS: 6,
  });
  const reg = makeReg({});
  const options = [
    { kind: 'weapon', id: 'N' },
    { kind: 'ability', id: 'x' },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

// ---- level：一般優先序＝升級＞新武器＞被動；同序 tie-break 吃 seed（design.md R4 表列 5） ----
test('level: 升級＞新武器＞被動 → 選 weaponup B（index 2）', () => {
  const state = makeState({
    weapons: [{ id: 'B', level: 2, evolved: false, equipped: false }],
    passives: [],
    MAX_WEAPONS: 6,
  });
  const reg = makeReg({ B: { evolveReq: null, evolveInto: null, maxLevel: 7 } });
  const options = [
    { kind: 'ability', id: 'x' },
    { kind: 'weapon', id: 'N' },
    { kind: 'weaponup', id: 'B', level: 2 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 2);
});

test('level: 两個同优先级候选（同 seed）连呼两次结果相同', () => {
  const state = makeState({
    weapons: [
      { id: 'B', level: 2, evolved: false, equipped: false },
      { id: 'C', level: 2, evolved: false, equipped: false },
    ],
    passives: [],
    seed: 777,
  });
  const reg = makeReg({
    B: { evolveReq: null, evolveInto: null, maxLevel: 7 },
    C: { evolveReq: null, evolveInto: null, maxLevel: 7 },
  });
  const options = [
    { kind: 'weaponup', id: 'B', level: 2 },
    { kind: 'weaponup', id: 'C', level: 2 },
  ];
  const r1 = decideChoice('level', options, state, reg);
  const r2 = decideChoice('level', options, state, reg);
  assert.equal(r1, r2);
  assert.ok(r1 === 0 || r1 === 1, `tie-break 應在候選範圍內，實際 ${r1}`);
});

// ---- level：requirements.md R4 最後一列——options 空/非陣列 → -1，不拋例外 ----
test('level: options 為空陣列 → 回 -1', () => {
  const state = makeState();
  const reg = makeReg({});
  assert.equal(decideChoice('level', [], state, reg), -1);
});

test('level: options 非陣列（null/undefined）→ 回 -1，不拋例外', () => {
  const state = makeState();
  const reg = makeReg({});
  assert.doesNotThrow(() => decideChoice('level', null, state, reg));
  assert.equal(decideChoice('level', null, state, reg), -1);
  assert.doesNotThrow(() => decideChoice('level', undefined, state, reg));
  assert.equal(decideChoice('level', undefined, state, reg), -1);
});

// ---- equip：同槽比 tier、signature（weapon 槽）不選、空陣列 -1（design.md R4 表列 6） ----
test('equip: 同槽現有裝備 tier 更低 → 選 tier 較高者（index 0）', () => {
  const state = makeState({ equipment: { weapon: null, armor: { id: 'a1', tier: 1 }, trinket: null } });
  const reg = makeReg({}, {});
  const options = [{ id: 'a2', slot: 'armor', tier: 2 }];
  assert.equal(decideChoice('equip', options, state, reg), 0);
});

test('equip: weapon 槽（signature）一律不選 → 回 -1', () => {
  const state = makeState({ equipment: { weapon: null, armor: null, trinket: null } });
  const reg = makeReg({}, {});
  const options = [{ id: 'w', slot: 'weapon', tier: 5 }];
  assert.equal(decideChoice('equip', options, state, reg), -1);
});

test('equip: options 空陣列 → 回 -1', () => {
  const state = makeState();
  const reg = makeReg({}, {});
  assert.equal(decideChoice('equip', [], state, reg), -1);
});

// ---- event/curse/shop 與未知 kind（design.md R4 表列 7） ----
test('event: 非空 options → 固定回 0', () => {
  const state = makeState();
  const reg = makeReg({}, {});
  assert.equal(decideChoice('event', [{ id: 'e0' }, { id: 'e1' }], state, reg), 0);
});

test('curse: 非空 options → 固定回 0', () => {
  const state = makeState();
  const reg = makeReg({}, {});
  assert.equal(decideChoice('curse', [{ id: 'c0' }], state, reg), 0);
});

test('shop: 一律回 -1', () => {
  const state = makeState();
  const reg = makeReg({}, {});
  assert.equal(decideChoice('shop', [{ kind: 'stat' }, { kind: 'gear' }], state, reg), -1);
});

test('kind 未知 → 回 -1，且不拋例外', () => {
  const state = makeState();
  const reg = makeReg({}, {});
  assert.doesNotThrow(() => decideChoice('unknown', [{ id: 'x' }], state, reg));
  assert.equal(decideChoice('unknown', [{ id: 'x' }], state, reg), -1);
});

// ---- 第 2 波審查裁決 F4–F6 追加測試（fuse 依遊戲實際形狀 target/sacrifice，無 sources 欄位）----

test('F4(a): fuse 犧牲武器已進化且滿級 → 不選 fuse，改選未滿級的 weaponup（index 2）', () => {
  const state = makeState({
    weapons: [
      { id: 'B', level: 7, evolved: true, equipped: false },
      { id: 'C', level: 2, evolved: false, equipped: false },
    ],
    passives: [],
  });
  const reg = makeReg({
    B: { evolveReq: null, evolveInto: null, maxLevel: 7 },
    C: { evolveReq: null, evolveInto: null, maxLevel: 7 },
  });
  const options = [
    { kind: 'ability', id: 'x' },
    {
      kind: 'fuse',
      id: 'fuse_A',
      target: { id: 'A', level: 7, evolved: false },
      sacrifice: { id: 'B', level: 7, evolved: true },
    },
    { kind: 'weaponup', id: 'C', level: 2 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 2);
});

test('F4(b): fuse 犧牲武器未進化 → 選 fuse（index 1）', () => {
  const state = makeState({
    weapons: [
      { id: 'B', level: 7, evolved: false, equipped: false },
      { id: 'C', level: 2, evolved: false, equipped: false },
    ],
    passives: [],
  });
  const reg = makeReg({
    B: { evolveReq: null, evolveInto: null, maxLevel: 7 },
    C: { evolveReq: null, evolveInto: null, maxLevel: 7 },
  });
  const options = [
    { kind: 'ability', id: 'x' },
    {
      kind: 'fuse',
      id: 'fuse_A',
      target: { id: 'A', level: 7, evolved: false },
      sacrifice: { id: 'B', level: 7, evolved: false },
    },
    { kind: 'weaponup', id: 'C', level: 2 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

test('F4(c): fuse sacrifice 為 null（燃燒被動路徑）→ 選 fuse（index 1）', () => {
  const state = makeState({
    weapons: [{ id: 'C', level: 2, evolved: false, equipped: false }],
    passives: [],
  });
  const reg = makeReg({ C: { evolveReq: null, evolveInto: null, maxLevel: 7 } });
  const options = [
    { kind: 'ability', id: 'x' },
    { kind: 'fuse', id: 'fuse_A', target: { id: 'A', level: 7, evolved: false }, sacrifice: null },
    { kind: 'weaponup', id: 'C', level: 2 },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

test('F5: sacrifice 武器在 reg 查不到 maxLevel（reg.weapon 回 undefined）且 evolved:true → 不視為不可犧牲，仍選 fuse（index 1）', () => {
  const state = makeState({
    weapons: [{ id: 'B', level: 7, evolved: true, equipped: false }],
    passives: [],
  });
  const reg = makeReg({}, {}); // reg.weapon('B') → undefined
  const options = [
    { kind: 'ability', id: 'x' },
    {
      kind: 'fuse',
      id: 'fuse_A',
      target: { id: 'A', level: 7, evolved: false },
      sacrifice: { id: 'B', level: 7, evolved: true },
    },
  ];
  assert.equal(decideChoice('level', options, state, reg), 1);
});

test('F6(a): equip 多候選（同槽）取最高 tier（index 1）', () => {
  const state = makeState({ equipment: { weapon: null, armor: { id: 'a1', tier: 1 }, trinket: null } });
  const reg = makeReg({}, {});
  const options = [
    { id: 'a2', slot: 'armor', tier: 2 },
    { id: 'a3', slot: 'armor', tier: 4 },
    { id: 'a3b', slot: 'armor', tier: 3 },
  ];
  assert.equal(decideChoice('equip', options, state, reg), 1);
});

test('F6(b): equip 選項缺 slot/tier → 由 reg.equip 補齊（index 0）', () => {
  const state = makeState({ equipment: { weapon: null, armor: null, trinket: null } });
  const reg = makeReg({}, { t9: { slot: 'trinket', tier: 3, exclusive: false } });
  const options = [{ id: 't9' }];
  assert.equal(decideChoice('equip', options, state, reg), 0);
});

test('F6(c): equip 選項缺 slot/tier、由 reg.equip 補齊後為 weapon 槽（signature）→ 回 -1', () => {
  const state = makeState();
  const reg = makeReg({}, { w9: { slot: 'weapon', tier: 9 } });
  const options = [{ id: 'w9' }];
  assert.equal(decideChoice('equip', options, state, reg), -1);
});

// ---- R9：策略可重現——同 seed 同輸入連呼 100 次深相等 ----
test('R9: 同 seed 同輸入連呼 100 次，decideChoice 輸出深相等', () => {
  const state = makeState({
    weapons: [{ id: 'A', level: 2, evolved: false, equipped: false }],
    passives: [],
    seed: 999,
  });
  const reg = makeReg({ A: { evolveReq: null, evolveInto: null, maxLevel: 7 } });
  const options = [
    { kind: 'ability', id: 'x' },
    { kind: 'weaponup', id: 'A', level: 2 },
  ];
  const results = Array.from({ length: 100 }, () => decideChoice('level', options, state, reg));
  assert.deepStrictEqual(results, new Array(100).fill(results[0]));
});
