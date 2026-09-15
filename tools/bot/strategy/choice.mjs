// tools/bot/strategy/choice.mjs
// 純 ESM、零 Node API — 可在瀏覽器 import('/tools/bot/strategy/choice.mjs')，也可被 node --test 載入。
// 對應 specs/bot-balance-sim/requirements.md R4（選擇策略，懂進化）、R9（策略層可重現）；
// design.md「介面與資料模型」strategy/choice.mjs 一行；tasks.md T3。
//
// decideChoice(kind, options, state, reg) → number（選項 index；-1 ＝ 關閉/不買/放棄）
//
// state = {
//   weapons: [{ id, level, evolved, equipped }],
//   passives: [id], passiveLevels: { id: level },
//   equipment: { weapon, armor, trinket }（各為 { id, tier } 或 null）,
//   MAX_WEAPONS, MAX_PASSIVES, seed
// }
// reg = {
//   weapon(id) → { evolveReq, evolveInto, maxLevel } | undefined,
//   equip(id)  → { slot, tier, exclusive }            | undefined
// }

import { makeRng } from './rng.mjs';

/** level 面板中「佔用武器欄位」的選項種類（全滿級時的退路要跳過這些）。 */
const WEAPONISH = new Set(['weapon', 'weaponup', 'fuse']);

/** 優先序：數字越小越優先（R4：進化配對＞fuse＞持有升級＞新武器＞被動＞其他）。 */
const PRI_EVOLVE = 0;
const PRI_FUSE = 1;
const PRI_WEAPONUP = 2;
const PRI_NEWWEAPON = 3;
const PRI_ABILITY = 4;
const PRI_OTHER = 5;

function asArray(v) {
  return Array.isArray(v) ? v : null;
}

function regWeapon(reg, id) {
  if (!reg || typeof reg.weapon !== 'function') return undefined;
  try {
    return reg.weapon(id);
  } catch {
    return undefined;
  }
}

function regEquip(reg, id) {
  if (!reg || typeof reg.equip !== 'function') return undefined;
  try {
    return reg.equip(id);
  } catch {
    return undefined;
  }
}

/** 取武器參照的 id：接受 id 字串、簡化實例 {id} 與遊戲實際的武器實例 {def:{id}}。 */
function weaponRefId(ref) {
  if (typeof ref === 'string') return ref;
  if (!ref || typeof ref !== 'object') return null;
  if (typeof ref.id === 'string') return ref.id;
  if (ref.def && typeof ref.def.id === 'string') return ref.def.id;
  return null;
}

function ownedWeapons(state) {
  return asArray(state && state.weapons) || [];
}

function ownedPassives(state) {
  return asArray(state && state.passives) || [];
}

/**
 * 同優先序候選的 tie-break：以 makeRng(state.seed) 取一個 index。
 * 每次呼叫都重新建立 rng（不留狀態）→ 同 seed 同輸入必定同結果（R9）。
 */
function pickTied(pool, seed) {
  if (pool.length === 1) return pool[0];
  const sorted = pool.slice().sort((a, b) => a - b);
  const rng = makeRng(Number.isFinite(seed) ? seed : 0);
  const i = Math.floor(rng() * sorted.length);
  return sorted[Math.min(i, sorted.length - 1)];
}

/** 從候選（{index, pri, sub}）中選出最優：先比 pri，再比 sub，最後 seed tie-break。 */
function bestOf(cands, seed) {
  if (!cands.length) return -1;
  let bestPri = Infinity;
  for (const c of cands) if (c.pri < bestPri) bestPri = c.pri;
  const tier = cands.filter((c) => c.pri === bestPri);
  let bestSub = Infinity;
  for (const c of tier) if (c.sub < bestSub) bestSub = c.sub;
  const pool = tier.filter((c) => c.sub === bestSub).map((c) => c.index);
  return pickTied(pool, seed);
}

/** level 面板：回傳選項 index，無可選候選時退回第一個非武器項，仍無則 -1。 */
function decideLevel(options, state, reg, strategy) {
  const weapons = ownedWeapons(state);
  const passives = ownedPassives(state);
  const maxWeapons = Number.isFinite(state && state.MAX_WEAPONS) ? state.MAX_WEAPONS : 6;
  const maxPassives = Number.isFinite(state && state.MAX_PASSIVES) ? state.MAX_PASSIVES : 14;
  // 佔用武器欄位的只算「非 equipped（非 signature）」的持有武器。
  const weaponSlotsUsed = weapons.filter((w) => w && !w.equipped).length;

  // 進化配對：某持有武器未進化、其 evolveReq 被動尚未持有 → 該被動是最高優先。
  const wantedEvolveReq = new Set();
  for (const w of weapons) {
    if (!w || w.evolved) continue;
    const def = regWeapon(reg, w.id);
    const req = def && def.evolveReq;
    if (req && !passives.includes(req)) wantedEvolveReq.add(req);
  }

  const cands = [];
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (!o || typeof o !== 'object') {
      cands.push({ index: i, pri: PRI_OTHER, sub: 0 });
      continue;
    }
    const kind = o.kind;

    if (kind === 'ability') {
      const owned = passives.includes(o.id);
      const hasRoom = owned || passives.length < maxPassives;
      if (!hasRoom) continue;
      if (wantedEvolveReq.has(o.id)) cands.push({ index: i, pri: PRI_EVOLVE, sub: 0 });
      else cands.push({ index: i, pri: strategy === 'B' ? PRI_NEWWEAPON : PRI_ABILITY, sub: 0 });
      continue;
    }

    if (kind === 'fuse') {
      // 遊戲實際形狀是 { target, sacrifice }（src/game/progression.js:46），sacrifice 為
      // 武器實例或 null（null＝燃燒被動路徑，沒有犧牲品）；舊的 sources:[id] 形狀保留相容。
      // 任一犧牲品是「已進化且達滿級」的武器就放棄這個 fuse。
      const refs = asArray(o.sources) || (o.sacrifice ? [o.sacrifice] : []);
      let sacrificesPrized = false;
      for (const ref of refs) {
        const sid = weaponRefId(ref);
        if (sid == null) continue;
        // 以局內狀態為準；state.weapons 查不到就退回選項自帶的實例。
        const w = weapons.find((x) => x && weaponRefId(x) === sid) || (typeof ref === 'object' ? ref : null);
        if (!w || !w.evolved) continue;
        const def = regWeapon(reg, sid);
        const ml = def && Number.isFinite(def.maxLevel) ? def.maxLevel : null;
        // 查不到 maxLevel 就不算滿級（與 weaponup 分支一致），不因查詢失敗誤棄 fuse。
        if (ml != null && Number.isFinite(w.level) && w.level >= ml) {
          sacrificesPrized = true;
          break;
        }
      }
      if (sacrificesPrized) continue;
      cands.push({ index: i, pri: PRI_FUSE, sub: 0 });
      continue;
    }

    if (kind === 'weaponup') {
      const w = weapons.find((x) => x && x.id === o.id);
      const lvl = w && Number.isFinite(w.level) ? w.level : Number.isFinite(o.level) ? o.level : 0;
      const def = regWeapon(reg, o.id);
      const ml = def && Number.isFinite(def.maxLevel) ? def.maxLevel : null;
      if (ml != null && lvl >= ml) continue; // 滿級升級項不選
      cands.push({ index: i, pri: PRI_WEAPONUP, sub: lvl }); // 等級低者優先
      continue;
    }

    if (kind === 'weapon') {
      if (weaponSlotsUsed >= maxWeapons) continue; // 武器槽已滿 → 不選新武器
      cands.push({ index: i, pri: strategy === 'B' ? PRI_ABILITY : PRI_NEWWEAPON, sub: 0 });
      continue;
    }

    cands.push({ index: i, pri: PRI_OTHER, sub: 0 });
  }

  const best = bestOf(cands, state && state.seed);
  if (best >= 0) return best;

  // 無任何可選候選（例如 options 全為滿級升級）→ 第一個非武器項；仍無則 -1。
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    const kind = o && typeof o === 'object' ? o.kind : undefined;
    if (!WEAPONISH.has(kind)) return i;
  }
  return -1;
}

/** equip 面板：weapon 槽（signature）一律不選；同槽只換 tier 更高者；無合格者 -1。 */
function decideEquip(options, state, reg) {
  const equipment = (state && state.equipment) || {};
  const cands = [];
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (!o || typeof o !== 'object') continue;
    const def = regEquip(reg, o.id);
    const slot = o.slot != null ? o.slot : def && def.slot;
    const tier = Number.isFinite(o.tier) ? o.tier : def && Number.isFinite(def.tier) ? def.tier : null;
    if (slot === 'weapon') continue; // 不動基準武器
    if (!slot || tier == null) continue;
    const cur = equipment[slot];
    const curTier = cur && Number.isFinite(cur.tier) ? cur.tier : null;
    if (curTier != null && curTier >= tier) continue; // 沒變強就不換
    cands.push({ index: i, pri: 0, sub: -tier }); // tier 最高者優先
  }
  return bestOf(cands, state && state.seed);
}

/**
 * 純函式選擇策略。
 * @param {'level'|'equip'|'event'|'curse'|'shop'|string} kind 選擇面板種類
 * @param {Array<object>} options 選項陣列
 * @param {object} state 機器人所見的局內狀態
 * @param {object} reg 內容登錄查詢器（weapon/equip）
 * @returns {number} 選項 index；-1 ＝ 關閉 / 不買 / 放棄
 */
export function decideChoice(kind, options, state, reg, strategy = 'A') {
  if (strategy !== 'A' && strategy !== 'B') throw new Error('unknown strategy: ' + strategy);
  const opts = asArray(options);
  if (!opts || opts.length === 0) return -1;
  switch (kind) {
    case 'level':
      return decideLevel(opts, state || {}, reg, strategy);
    case 'equip':
      return decideEquip(opts, state || {}, reg);
    case 'event':
    case 'curse':
      return 0;
    case 'shop':
      return -1;
    default:
      return -1;
  }
}

export default decideChoice;
