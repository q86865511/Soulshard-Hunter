// Achievement system: lifetime milestones tracked on META.stats. Unlocked ids live
// in META.achievements. Achievements are also an UNLOCK SOURCE (A2): a reward()
// pushes content ids into META.unlocked.* so gameplay pools (content/unlocks.js)
// start offering them. There are 100+ achievements — most are generated tier families;
// a handful are hand-authored unlock rewards or hidden goals.
//
// Schema: { id, name, desc, hidden?, check(stats,meta)->bool, prog?(stats,meta)->[cur,goal],
//           reward?(meta), rewardLabel? }
import { BIOMES } from '../../art/biomes.js';

// reward helper: idempotently unlock a content id of a given kind
const U = (kind, id) => (meta) => {
  if (!meta.unlocked) meta.unlocked = {};
  const arr = meta.unlocked[kind] = Array.isArray(meta.unlocked[kind]) ? meta.unlocked[kind] : [];
  if (!arr.includes(id)) arr.push(id);
};

const NUM = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X', ' XI', ' XII', ' XIII', ' XIV', ' XV'];
// build a tiered family of achievements from a stat accessor
function fam(prefix, name, descOf, statOf, tiers) {
  return tiers.map((g, i) => ({
    id: `${prefix}_${g}`, name: name + (i < NUM.length ? NUM[i] : ` +${i}`), desc: descOf(g),
    check: (s, m) => statOf(s, m) >= g, prog: (s, m) => [Math.floor(statOf(s, m)), g],
  }));
}
const fmtTime = (v) => Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0');

// ---- hand-authored UNLOCK rewards (A2) -------------------------------------
const REWARDS = [
  { id: 'first_blood', name: '初次狩獵', desc: '累計擊殺 1 名敵人', check: (s) => (s.kills || 0) >= 1, prog: (s) => [s.kills || 0, 1], reward: U('abilities', 'bigshot'), rewardLabel: '被動「巨型魂晶」' },
  { id: 'slayer_500', name: '小有名氣', desc: '累計擊殺 500 名敵人', check: (s) => (s.kills || 0) >= 500, prog: (s) => [s.kills || 0, 500], reward: U('weapons', 'w_homing'), rewardLabel: '武器「追魂彈」' },
  { id: 'threat_5', name: '威脅升級', desc: '達到威脅 5 級', check: (s) => (s.bestStage || 0) >= 5, prog: (s) => [s.bestStage || 0, 5], reward: U('abilities', 'glasscannon'), rewardLabel: '被動「玻璃大砲」' },
  { id: 'boss_1', name: '首領終結者', desc: '擊敗 1 名首領', check: (s) => (s.bossKills || 0) >= 1, prog: (s) => [s.bossKills || 0, 1], reward: U('weapons', 'w_lightning'), rewardLabel: '武器「連鎖閃電」' },
  { id: 'boss_10', name: '首領剋星', desc: '擊敗 10 名首領', check: (s) => (s.bossKills || 0) >= 10, prog: (s) => [s.bossKills || 0, 10], reward: U('equipment', 'cannon_staff'), rewardLabel: '裝備「加農法杖」' },
];

// ---- generated tier families -----------------------------------------------
const FAMILIES = [
  ...fam('kills', '殺戮', (g) => `累計擊殺 ${g} 名敵人`, (s) => s.kills || 0, [100, 250, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 25000, 50000, 100000]),
  ...fam('survive', '倖存', (g) => `單局存活 ${fmtTime(g)}`, (s) => s.bestTime || 0, [60, 120, 180, 300, 450, 600, 900, 1200]),
  ...fam('threat', '深淵', (g) => `達到威脅 ${g} 級`, (s) => s.bestStage || 0, [2, 3, 4, 6, 8, 10, 12, 13]),
  ...fam('boss', '屠王', (g) => `累計擊敗 ${g} 名首領`, (s) => s.bossKills || 0, [3, 5, 25, 50, 100, 200]),
  ...fam('gold', '斂財', (g) => `金庫累計 ${g} 金幣`, (s) => s.totalGold || 0, [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000]),
  ...fam('runs', '出征', (g) => `累計出擊 ${g} 次`, (s) => s.runs || 0, [1, 5, 10, 25, 50, 100, 200, 500]),
  ...fam('score', '高分', (g) => `單局分數達 ${g}`, (s) => s.bestScore || 0, [1000, 5000, 10000, 25000, 50000, 100000, 250000]),
  ...fam('clear', '通關', (g) => `累計通關 ${g} 次`, (s) => s.clears || 0, [1, 3, 10, 25, 50]),
  ...fam('reaper', '弒神', (g) => `累計擊殺死神 ${g} 次`, (s) => s.reaperKills || 0, [1, 3, 5, 10]),
  ...fam('mini', '獵王', (g) => `累計擊殺小王 ${g} 隻`, (s) => s.miniBossKills || 0, [3, 10, 30, 60, 120]),
  ...fam('fall', '不屈', (g) => `累計倒下 ${g} 次仍不放棄`, (s) => s.deaths || 0, [5, 25, 75, 150]),
  ...fam('open', '開拓', (g) => `解鎖 ${g} 個關卡`, (s, m) => (m.levels && m.levels.unlocked) || 1, [2, 3, 4, 5]),
  ...fam('roster', '群英', (g) => `解鎖 ${g} 名角色`, (s, m) => (m.unlocked && m.unlocked.characters || []).length, [3, 6, 10, 14, 17]),
  ...fam('armory', '軍火', (g) => `解鎖 ${g} 把武器`, (s, m) => (m.unlocked && m.unlocked.weapons || []).length, [5, 10, 16, 24]),
  ...fam('codex', '博識', (g) => `解鎖 ${g} 個被動`, (s, m) => (m.unlocked && m.unlocked.abilities || []).length, [10, 20, 35, 45]),
  ...fam('wardrobe', '蒐藏', (g) => `解鎖 ${g} 件裝備`, (s, m) => (m.unlocked && m.unlocked.equipment || []).length, [8, 16, 24, 32]),
];

// ---- per-biome clears -------------------------------------------------------
const BIOME_ACH = [];
for (const b of BIOMES) {
  BIOME_ACH.push({ id: `clr_${b.id}`, name: `征服 · ${b.name}`, desc: `通關「${b.name}」`, check: (s, m) => ((m.levels && m.levels.diff && m.levels.diff[b.id]) || 0) >= 1, prog: (s, m) => [Math.min(1, (m.levels && m.levels.diff && m.levels.diff[b.id]) || 0), 1] });
  BIOME_ACH.push({ id: `clr3_${b.id}`, name: `精通 · ${b.name}`, desc: `以難度 3+ 通關「${b.name}」`, check: (s, m) => ((m.levels && m.levels.diff && m.levels.diff[b.id]) || 0) >= 3, prog: (s, m) => [(m.levels && m.levels.diff && m.levels.diff[b.id]) || 0, 3] });
}

// ---- hidden goals -----------------------------------------------------------
const HIDDEN = [
  { id: 'legend_score', name: '？？？', realName: '傳奇分數', desc: '單局分數突破 100000', hidden: true, check: (s) => (s.bestScore || 0) >= 100000 },
  { id: 'godspeed', name: '？？？', realName: '神速', desc: '達到威脅 13 級', hidden: true, check: (s) => (s.bestStage || 0) >= 13 },
  { id: 'death_slayer', name: '？？？', realName: '死神剋星', desc: '擊殺死神', hidden: true, check: (s) => (s.reaperKills || 0) >= 1 },
];

export const ACHIEVEMENTS = [...REWARDS, ...FAMILIES, ...BIOME_ACH, ...HIDDEN];

// Re-apply rewards for already-earned achievements (idempotent) so unlocks survive
// across updates / older saves.
export function reconcileUnlocks(meta) {
  const got = meta.achievements || [];
  for (const a of ACHIEVEMENTS) if (got.includes(a.id) && a.reward) { try { a.reward(meta); } catch (e) { /* */ } }
}

// Returns the array of newly-unlocked achievement defs (for banners / results screen).
export function checkAchievements(meta) {
  if (!meta.achievements) meta.achievements = [];
  reconcileUnlocks(meta);
  const s = meta.stats || {};
  const got = meta.achievements;
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (got.includes(a.id)) continue;
    try { if (a.check(s, meta)) { got.push(a.id); newly.push(a); if (a.reward) a.reward(meta); } } catch (e) { /* */ }
  }
  return newly;
}

export function achievementProgress(meta) {
  return { unlocked: (meta.achievements || []).length, total: ACHIEVEMENTS.length };
}
