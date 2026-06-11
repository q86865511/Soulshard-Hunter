// Achievement system: lifetime milestones tracked on META.stats. Unlocked ids live
// in META.achievements. Achievements are also an UNLOCK SOURCE (A2): a reward()
// pushes content ids into META.unlocked.* so gameplay pools (content/unlocks.js)
// start offering them. There are 100+ achievements — most are generated tier families;
// a handful are hand-authored unlock rewards or hidden goals.
//
// Schema: { id, name, desc, hidden?, check(stats,meta)->bool, prog?(stats,meta)->[cur,goal],
//           reward?(meta), rewardLabel? }
import { BIOMES } from '../../art/biomes.js';
import { SKINS } from './characters.js';   // 3.10-B: hidden-skin collection goals

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
  // 原#6: more achievement-unlockable content (the new workflow weapons/abilities)
  { id: 'unlock_volatile', name: '爆裂研究', desc: '累計擊敗 3 名首領', check: (s) => (s.bossKills || 0) >= 3, prog: (s) => [s.bossKills || 0, 3], reward: U('abilities', 'ac_volatile_rounds'), rewardLabel: '被動「揮發彈頭」' },
  { id: 'unlock_harvest', name: '靈魂學徒', desc: '單局存活 5 分鐘', check: (s) => (s.bestTime || 0) >= 300, prog: (s) => [Math.min(s.bestTime || 0, 300), 300], reward: U('abilities', 'ac_soul_harvest'), rewardLabel: '被動「靈魂收割」' },
  { id: 'unlock_riposte', name: '不屈鬥志', desc: '累計倒下 10 次仍不放棄', check: (s) => (s.deaths || 0) >= 10, prog: (s) => [s.deaths || 0, 10], reward: U('abilities', 'ac_riposte'), rewardLabel: '被動「絕地反擊」' },
  { id: 'unlock_turret', name: '軍械工程', desc: '累計通關 1 次', check: (s) => (s.clears || 0) >= 1, prog: (s) => [s.clears || 0, 1], reward: U('weapons', 'wc_turret'), rewardLabel: '武器「守護砲塔」' },
  { id: 'unlock_beam', name: '聚能研究', desc: '達到威脅 8 級', check: (s) => (s.bestStage || 0) >= 8, prog: (s) => [s.bestStage || 0, 8], reward: U('weapons', 'wc_beam'), rewardLabel: '武器「聚能光束」' },
  // ---- round-5 (task 2): many more unlock-tied achievements across varied conditions ----
  { id: 'r5_halo', name: '環刃學', desc: '累計擊殺 1500 名敵人', check: (s) => (s.kills || 0) >= 1500, prog: (s) => [s.kills || 0, 1500], reward: U('weapons', 'g_halo'), rewardLabel: '武器「光環刃」' },
  { id: 'r5_dartfan', name: '飛鏢匠', desc: '累計擊殺 30 隻小王', check: (s) => (s.miniBossKills || 0) >= 30, prog: (s) => [s.miniBossKills || 0, 30], reward: U('weapons', 'g_dartfan'), rewardLabel: '武器「散鏢扇」' },
  { id: 'r5_cone', name: '錐擊研究', desc: '累計擊敗 20 名首領', check: (s) => (s.bossKills || 0) >= 20, prog: (s) => [s.bossKills || 0, 20], reward: U('weapons', 'wc_cone'), rewardLabel: '武器「魂錐爆」' },
  { id: 'r5_blackhole', name: '奇點馴服', desc: '累計擊殺死神 3 次', check: (s) => (s.reaperKills || 0) >= 3, prog: (s) => [s.reaperKills || 0, 3], reward: U('weapons', 'g_blackhole'), rewardLabel: '武器「黑洞」' },
  { id: 'r5_overload', name: '過載協議', desc: '達到威脅 9 級', check: (s) => (s.bestStage || 0) >= 9, prog: (s) => [s.bestStage || 0, 9], reward: U('abilities', 'overload'), rewardLabel: '被動「過載」' },
  { id: 'r5_warbanner', name: '無瑕之證', desc: '不受傷通關 1 次', check: (s) => (s.noDmgClears || 0) >= 1, prog: (s) => [s.noDmgClears || 0, 1], reward: U('abilities', 'ac_warbanner'), rewardLabel: '被動「戰旗」' },
  { id: 'r5_executioner', name: '處決術', desc: '以同一英雄通關 3 次（任一）', check: (s) => maxCharClears(s) >= 3, prog: (s) => [maxCharClears(s), 3], reward: U('abilities', 'g_executioner'), rewardLabel: '被動「處決」' },
  { id: 'r5_chain', name: '連鎖大師', desc: '單局角色等級達 25', check: (s) => (s.bestCharLevel || 0) >= 25, prog: (s) => [s.bestCharLevel || 0, 25], reward: U('abilities', 'g_chainlight'), rewardLabel: '被動「連鎖閃電」' },
  { id: 'r5_detonate', name: '引爆學', desc: '累計觸發羈絆 30 次', check: (s) => (s.bondsTriggered || 0) >= 30, prog: (s) => [s.bondsTriggered || 0, 30], reward: U('abilities', 'g_detonate'), rewardLabel: '被動「引爆」' },
  { id: 'r5_starfall', name: '星墜', desc: '單局分數達 40000', check: (s) => (s.bestScore || 0) >= 40000, prog: (s) => [s.bestScore || 0, 40000], reward: U('equipment', 'ep_starfall_orb'), rewardLabel: '史詩裝備「星墜法球」' },
  { id: 'r5_machinegun', name: '量產軍械', desc: '金庫累計 30000 金幣', check: (s) => (s.totalGold || 0) >= 30000, prog: (s) => [s.totalGold || 0, 30000], reward: U('equipment', 'g_machinegun'), rewardLabel: '裝備「連發槍」' },
  { id: 'r5_sniper', name: '鍛造名匠', desc: '累計鍛造強化 10 次', check: (s) => (s.forgeUpgrades || 0) >= 10, prog: (s) => [s.forgeUpgrades || 0, 10], reward: U('equipment', 'g_sniper'), rewardLabel: '裝備「狙擊杖」' },
  { id: 'r5_shocknova', name: '雷霆收藏', desc: '累計出擊 30 次', check: (s) => (s.runs || 0) >= 30, prog: (s) => [s.runs || 0, 30], reward: U('items', 'it_shock_nova'), rewardLabel: '道具「震雷新星」' },
  { id: 'r5_coincache', name: '城鎮之友', desc: '與 6 位城鎮居民交談', check: (s) => (s.npcTalks || 0) >= 6, prog: (s) => [s.npcTalks || 0, 6], reward: U('items', 'ic_coin_cache'), rewardLabel: '道具「藏金匣」' },
  { id: 'r5_dragonscale', name: '龍鱗匠', desc: '累計通關 8 次', check: (s) => (s.clears || 0) >= 8, prog: (s) => [s.clears || 0, 8], reward: U('equipment', 'g_dragon_scale'), rewardLabel: '裝備「龍鱗甲」' },
  // round-6: unlock sources for content that previously had NO grant path (was permanently unobtainable)
  { id: 'r6_ricochet', name: '跳彈工藝', desc: '累計擊殺 2500 名敵人', check: (s) => (s.kills || 0) >= 2500, prog: (s) => [s.kills || 0, 2500], reward: U('weapons', 'g_ricochet'), rewardLabel: '武器「跳彈」' },
  { id: 'r6_wc_ricochet', name: '連跳研究', desc: '累計擊殺 6000 名敵人', check: (s) => (s.kills || 0) >= 6000, prog: (s) => [s.kills || 0, 6000], reward: U('weapons', 'wc_ricochet'), rewardLabel: '武器「連跳彈」' },
  { id: 'r6_glaser', name: '鐳射工程', desc: '達到威脅 11 級', check: (s) => (s.bestStage || 0) >= 11, prog: (s) => [s.bestStage || 0, 11], reward: U('equipment', 'g_laser'), rewardLabel: '裝備「鐳射砲」' },
  { id: 'r6_doom', name: '末日散射', desc: '單局分數達 60000', check: (s) => (s.bestScore || 0) >= 60000, prog: (s) => [s.bestScore || 0, 60000], reward: U('equipment', 'ep_doom_scatter'), rewardLabel: '史詩裝備「末日散射」' },
  { id: 'r6_prism', name: '稜光鍛造', desc: '累計通關 12 次', check: (s) => (s.clears || 0) >= 12, prog: (s) => [s.clears || 0, 12], reward: U('equipment', 'ep_prism_lance'), rewardLabel: '史詩裝備「稜光長槍」' },
  { id: 'r6_infernobomb', name: '煉獄軍火', desc: '累計擊敗 30 名首領', check: (s) => (s.bossKills || 0) >= 30, prog: (s) => [s.bossKills || 0, 30], reward: U('items', 'g_inferno_bomb'), rewardLabel: '道具「煉獄炸彈」' },
  { id: 'r6_toxic', name: '毒術蒐藏', desc: '累計擊殺 50 隻小王', check: (s) => (s.miniBossKills || 0) >= 50, prog: (s) => [s.miniBossKills || 0, 50], reward: U('items', 'ic_toxic_flask'), rewardLabel: '道具「劇毒燒瓶」' },
  { id: 'r6_static', name: '靜電力場', desc: '單局角色等級達 30', check: (s) => (s.bestCharLevel || 0) >= 30, prog: (s) => [s.bestCharLevel || 0, 30], reward: U('abilities', 'ac_static_field'), rewardLabel: '被動「靜電力場」' },
  { id: 'r6_blink', name: '閃現大師', desc: '累計出擊 50 次', check: (s) => (s.runs || 0) >= 50, prog: (s) => [s.runs || 0, 50], reward: U('abilities', 'g_blink_master'), rewardLabel: '被動「閃現大師」' },
  { id: 'r6_titan', name: '泰坦詛咒', desc: '累計擊殺死神 5 次', check: (s) => (s.reaperKills || 0) >= 5, prog: (s) => [s.reaperKills || 0, 5], reward: U('abilities', 'curse_titan'), rewardLabel: '詛咒被動「泰坦詛咒」（並啟用嗜血/玻璃羈絆）' },
];
// helper: highest single-hero clear count (for "clear N times with one hero")
function maxCharClears(s) { const c = s && s.charClears; if (!c) return 0; let m = 0; for (const k in c) if (c[k] > m) m = c[k]; return m; }

// ---- generated tier families -----------------------------------------------
const FAMILIES = [
  ...fam('kills', '殺戮', (g) => `累計擊殺 ${g} 名敵人`, (s) => s.kills || 0, [100, 250, 1000, 2000, 3500, 5000, 7500, 10000, 15000, 25000, 50000, 100000]),
  ...fam('survive', '倖存', (g) => `單局存活 ${fmtTime(g)}`, (s) => s.bestTime || 0, [60, 120, 180, 300, 450, 600, 900, 1200]),
  ...fam('endless', '無盡', (g) => `無盡模式存活 ${fmtTime(g)}`, (s) => s.bestEndlessTime || 0, [600, 1200, 1800, 2400, 3600]),   // R18/B7 (+5; endless_1200 also gates g_stormcaller)
  ...fam('threat', '深淵', (g) => `達到威脅 ${g} 級`, (s) => s.bestStage || 0, [2, 3, 4, 6, 8, 10, 12, 13]),
  ...fam('boss', '屠王', (g) => `累計擊敗 ${g} 名首領`, (s) => s.bossKills || 0, [3, 5, 25, 50, 100, 200]),
  ...fam('gold', '斂財', (g) => `金庫累計 ${g} 金幣`, (s) => s.totalGold || 0, [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000]),
  ...fam('runs', '出征', (g) => `累計出擊 ${g} 次`, (s) => s.runs || 0, [1, 5, 10, 25, 50, 100, 200, 500]),
  ...fam('score', '高分', (g) => `單局分數達 ${g}`, (s) => s.bestScore || 0, [1000, 5000, 10000, 25000, 50000, 100000, 250000]),
  ...fam('clear', '通關', (g) => `累計通關 ${g} 次`, (s) => s.clears || 0, [1, 3, 10, 25, 50]),
  ...fam('reaper', '弒神', (g) => `累計擊殺死神 ${g} 次`, (s) => s.reaperKills || 0, [1, 3, 5, 10]),
  ...fam('mini', '獵王', (g) => `累計擊殺小王 ${g} 隻`, (s) => s.miniBossKills || 0, [3, 10, 30, 60, 120]),
  ...fam('fall', '不屈', (g) => `累計倒下 ${g} 次仍不放棄`, (s) => s.deaths || 0, [5, 25, 75, 150]),
  ...fam('open', '開拓', (g) => `解鎖 ${g} 個關卡`, (s, m) => (m && m.levels && m.levels.unlocked) || 1, [2, 3, 4, 5]),
  ...fam('roster', '群英', (g) => `解鎖 ${g} 名角色`, (s, m) => ((m && m.unlocked && m.unlocked.characters) || []).length, [3, 6, 10, 14, 17, 21]),
  ...fam('armory', '軍火', (g) => `解鎖 ${g} 把武器`, (s, m) => ((m && m.unlocked && m.unlocked.weapons) || []).length, [5, 10, 16, 24]),
  ...fam('codex', '博識', (g) => `解鎖 ${g} 個被動`, (s, m) => ((m && m.unlocked && m.unlocked.abilities) || []).length, [10, 20, 35, 45]),
  ...fam('wardrobe', '蒐藏', (g) => `解鎖 ${g} 件裝備`, (s, m) => ((m && m.unlocked && m.unlocked.equipment) || []).length, [8, 16, 24, 32]),
];

// ---- round-5 families: variety across the new mastery / hub systems (task 2) ----
const R5_FAMILIES = [
  ...fam('charlvl', '修為', (g) => `單局角色等級達 ${g}`, (s) => s.bestCharLevel || 0, [10, 20, 30, 40, 50]),
  ...fam('nohit', '無瑕', (g) => `不受傷通關 ${g} 次`, (s) => s.noDmgClears || 0, [1, 3, 8, 20]),
  ...fam('synergy', '共鳴', (g) => `累計觸發羈絆 ${g} 次`, (s) => s.bondsTriggered || 0, [10, 30, 80, 150]),
  ...fam('forge', '鍛魂', (g) => `累計鍛造強化 ${g} 次`, (s) => s.forgeUpgrades || 0, [1, 5, 15, 30]),
  ...fam('social', '人脈', (g) => `與 ${g} 位城鎮居民交談`, (s) => s.npcTalks || 0, [3, 6, 10]),
  ...fam('rep', '聲望', (g) => `公會聲望累計 ${g}`, (s, m) => (m && m.guild && m.guild.xp) || 0, [500, 2000, 6000, 16000]),
  ...fam('fashion', '時尚', (g) => `擁有 ${g} 套造型`, (s, m) => ((m && m.ownedSkins) || []).length, [1, 5, 12, 25]),
  ...fam('hero_master', '群英之師', (g) => `以同一英雄通關 ${g} 次`, (s) => maxCharClears(s), [3, 5, 10, 20]),
];

// ---- per-biome clears -------------------------------------------------------
const dClr = (m, id) => (m && m.levels && m.levels.diff && m.levels.diff[id]) || 0;
const BIOME_ACH = [];
for (const b of BIOMES) {
  BIOME_ACH.push({ id: `clr_${b.id}`, name: `征服 · ${b.name}`, desc: `通關「${b.name}」`, check: (s, m) => dClr(m, b.id) >= 1, prog: (s, m) => [Math.min(1, dClr(m, b.id)), 1] });
  BIOME_ACH.push({ id: `clr3_${b.id}`, name: `精通 · ${b.name}`, desc: `以難度 3+ 通關「${b.name}」`, check: (s, m) => dClr(m, b.id) >= 3, prog: (s, m) => [dClr(m, b.id), 3] });
}

// ---- hidden goals -----------------------------------------------------------
const HIDDEN = [
  { id: 'legend_score', name: '？？？', realName: '傳奇分數', desc: '單局分數突破 100000', hidden: true, check: (s) => (s.bestScore || 0) >= 100000 },
  { id: 'godspeed', name: '？？？', realName: '神速', desc: '達到威脅 13 級', hidden: true, check: (s) => (s.bestStage || 0) >= 13 },
  { id: 'death_slayer', name: '？？？', realName: '死神剋星', desc: '擊殺死神', hidden: true, check: (s) => (s.reaperKills || 0) >= 1 },
];

// ---- round-5b (task 2 follow-up): more variety + more weapon/item/equipment unlock ties ----
const maxDiffCleared = (m) => { const d = (m && m.levels && m.levels.diff) || {}; let x = 0; for (const k in d) if (d[k] > x) x = d[k]; return x; };
const R5B = [
  // new milestone family: highest difficulty cleared anywhere (a fresh progression axis)
  ...fam('mastery', '生態精通', (g) => `以難度 ${g}+ 通關任一生態`, (s, m) => maxDiffCleared(m), [2, 3, 4, 5]),
  ...fam('veteran', '百戰', (g) => `累計通關 ${g} 次`, (s) => s.clears || 0, [15, 30, 60, 100]),
  // more achievement -> content unlocks (the ids exist; this adds alternate earn paths + goals)
  { id: 'r5b_voidmantle', name: '虛空之證', desc: '以難度 4+ 通關任一生態', check: (s, m) => maxDiffCleared(m) >= 4, prog: (s, m) => [maxDiffCleared(m), 4], reward: U('equipment', 'ep_void_mantle'), rewardLabel: '史詩裝備「虛空斗篷」' },
  { id: 'r5b_chromatic', name: '彩晶大師', desc: '達到威脅 11 級', check: (s) => (s.bestStage || 0) >= 11, prog: (s) => [s.bestStage || 0, 11], reward: U('equipment', 'ep_chromatic_core'), rewardLabel: '史詩裝備「彩晶核心」' },
  { id: 'r5b_purge', name: '淨化萬軍', desc: '累計擊殺 8000 名敵人', check: (s) => (s.kills || 0) >= 8000, prog: (s) => [s.kills || 0, 8000], reward: U('items', 'g_purge_wave'), rewardLabel: '道具「淨化波」' },
  { id: 'r5b_timeslow', name: '時之掌控', desc: '單局存活 15 分鐘', check: (s) => (s.bestTime || 0) >= 900, prog: (s) => [Math.min(s.bestTime || 0, 900), 900], reward: U('items', 'it_timeslow_burst'), rewardLabel: '道具「時滯爆發」' },
  { id: 'r5b_laser', name: '聚能權威', desc: '累計擊敗 40 名首領', check: (s) => (s.bossKills || 0) >= 40, prog: (s) => [s.bossKills || 0, 40], reward: U('weapons', 'g_laserbeam'), rewardLabel: '武器「聚能雷射」' },
  { id: 'r5b_fashionista', name: '時尚教主', desc: '擁有 8 套造型', check: (s, m) => ((m && m.ownedSkins) || []).length >= 8, prog: (s, m) => [((m && m.ownedSkins) || []).length, 8], reward: U('abilities', 'g_chainlight'), rewardLabel: '被動「連鎖閃電」' },
  { id: 'r5b_richtown', name: '富甲一方', desc: '金庫累計 80000 金幣', check: (s) => (s.totalGold || 0) >= 80000, prog: (s) => [s.totalGold || 0, 80000], reward: U('weapons', 'g_blackhole'), rewardLabel: '武器「黑洞」' },
  // a couple more hidden goals for variety
  { id: 'r5b_flawless5', name: '？？？', realName: '無瑕傳說', desc: '不受傷以難度 3+ 通關', hidden: true, check: (s, m) => (s.noDmgClears || 0) >= 1 && maxDiffCleared(m) >= 3 },
  { id: 'r5b_socialite', name: '？？？', realName: '鎮民摯友', desc: '與全部 10 位居民交談', hidden: true, check: (s) => (s.npcTalks || 0) >= 10 },
];

// ---- round16/3.10-B: hidden full-body skin collection (the prestige cosmetics) ----
const HIDDEN_SKIN_IDS = SKINS.filter((s) => s.hidden).map((s) => s.id);
const ownsHiddenN = (m) => new Set(((m && m.ownedSkins) || []).map((k) => String(k).split(':')[1]).filter((id) => HIDDEN_SKIN_IDS.includes(id))).size;
const SKIN16 = [
  { id: 'skin_hidden1', name: '異界之姿', desc: '擁有任一隱藏全身造型', check: (s, m) => ownsHiddenN(m) >= 1, prog: (s, m) => [Math.min(ownsHiddenN(m), 1), 1], reward: U('items', 'g_swift_draught'), rewardLabel: '道具「疾風靈藥」' },
  { id: 'skin_hidden_all', name: '？？？', realName: '形態大師', desc: '集齊全部隱藏全身造型', hidden: true, check: (s, m) => HIDDEN_SKIN_IDS.length > 0 && ownsHiddenN(m) >= HIDDEN_SKIN_IDS.length, prog: (s, m) => [ownsHiddenN(m), HIDDEN_SKIN_IDS.length] },
];
export const ACHIEVEMENTS = [...REWARDS, ...FAMILIES, ...R5_FAMILIES, ...R5B, ...SKIN16, ...BIOME_ACH, ...HIDDEN];

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
