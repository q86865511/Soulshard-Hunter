// run/shared.js — file-scope helpers & constants shared across the run-scene mixins.
// Extracted verbatim from run.js (R21.3 scene-file split). Pure module-level exports,
// no `this` — see run/*.js mixins and run.js (the assembler).
import { BALANCE, weaponMaxLevel } from '../../balance.js';
import { Weapons } from '../../content/registry.js';
import { isUnlocked } from '../../content/unlocks.js';
import { META } from '../../state.js';
import { rng } from '../../../engine/math.js';
import { currentKeyFor, keyLabel } from '../../../engine/input.js';

export const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

// 原#1: stat fields shown in equip before/after diffs, with display formatting.
export const STAT_LABELS = [
  ['maxHp', '生命上限', 'int'], ['damageMult', '傷害', 'mult'], ['fireRateMult', '射速', 'mult'],
  ['critChance', '暴擊率', 'pct'], ['critMult', '暴擊傷害', 'mult'], ['speed', '移速', 'int'],
  ['defense', '減傷', 'int'], ['dodge', '閃避', 'pct'], ['lifesteal', '吸血', 'pct'],
  ['projCountAdd', '投射物', 'plus'], ['pierceAdd', '穿透', 'plus'], ['area', '範圍', 'mult'],
  ['projSpeedMult', '彈速', 'mult'], ['pickupRange', '拾取', 'int'], ['luck', '幸運', 'f2'],
  ['hpRegen', '生命回復', 'f1'], ['goldMult', '金幣', 'mult'], ['xpMult', '經驗', 'mult'],
];
export const fmtStat = (v, fmt) => {
  if (fmt === 'mult') return '×' + (v || 0).toFixed(2);
  if (fmt === 'pct') return Math.round((v || 0) * 100) + '%';
  if (fmt === 'plus') return '+' + Math.round(v || 0);
  if (fmt === 'f2') return (v || 0).toFixed(2);
  if (fmt === 'f1') return (v || 0).toFixed(1);
  return String(Math.round(v || 0));
};

// Stat-anvil POOL. Buying an anvil (C1) opens a paused 3-of-these random pick.
// R17 B15: apply(s, p, f) — `f` is the per-NAME diminishing factor (ANVIL_DIMINISH^prior buys).
// The B8 anvil nerf only covered the gen ground-item anvils; this primary B-shop path had
// none, so repeat purchases stacked at full strength. `flat: true` = integer gains exempt.
export const ANVIL_POOL = [
  { name: '力量鐵砧', desc: '傷害 ×1.08', apply: (s, p, f = 1) => { s.damageMult *= 1 + 0.08 * f; } },
  { name: '迅捷鐵砧', desc: '射速 ×1.07', apply: (s, p, f = 1) => { s.fireRateMult *= 1 + 0.07 * f; } },
  { name: '堅韌鐵砧', desc: '生命上限 +16', apply: (s, p, f = 1) => { const g = Math.max(5, Math.round(16 * f)); s.maxHp += g; p.heal(g); } },
  { name: '銳利鐵砧', desc: '暴擊率 +4%', apply: (s, p, f = 1) => { s.critChance += 0.04 * f; } },
  { name: '疾風鐵砧', desc: '移速 ×1.05', apply: (s, p, f = 1) => { s.speed *= 1 + 0.05 * f; } },
  { name: '壁壘鐵砧', desc: '減傷 +1', flat: true, apply: (s) => { s.defense += 1; } },
  { name: '貫穿鐵砧', desc: '穿透 +1', flat: true, apply: (s) => { s.pierceAdd = (s.pierceAdd || 0) + 1; } },
  { name: '增幅鐵砧', desc: '範圍 ×1.10', apply: (s, p, f = 1) => { s.area = (s.area || 1) * (1 + 0.10 * f); } },
  { name: '吸血鐵砧', desc: '吸血 +2%', apply: (s, p, f = 1) => { s.lifesteal = (s.lifesteal || 0) + 0.02 * f; } },
  { name: '狂暴鐵砧', desc: '暴擊傷害 +0.3', apply: (s, p, f = 1) => { s.critMult = (s.critMult || 2) + 0.3 * f; } },
];

// A level lasts 20 minutes (E2): a DISTINCT mini-boss every 5 min, the level's
// FINAL BOSS at 20:00, then 30s after it dies a killable Reaper appears (hidden).
// Clearing the final boss unlocks the next level + difficulty.
export const LEVEL_TIME = BALANCE.LEVEL_TIME;
// 6.2 首局戰鬥提示：在第一場戰鬥的指定秒數淡入淡出的底部橫幅（看過一次後不再）。
export const BATTLE_HINTS = [
  { t: 3, text: '武器自動瞄準並射擊，無需手動操作。' },
  // R21: 衝刺鍵可重綁,動態顯示目前綁定鍵(預設 Shift),避免硬寫「空白/右鍵」與實際不符。
  { t: 12, text: () => '按【' + keyLabel(currentKeyFor('dash')) + '】可緊急閃避（短暫無敵）。' },
  { t: 22, text: '按【B】隨時開啟商店，花費魂晶強化裝備。' },
  { t: 33, text: '按【M】查看放大地圖，按【Tab】查看目前配裝。' },
  { t: 45, text: '升級時時間暫停，從三個選項中挑選強化。' },
];
// R18/B3: the 5 R9 biomes (verdant/desert/swamp/abyss/celestial) now have dedicated
// multi-phase final bosses (content/bosses_biome.js) — no longer the random fallback.
export const FINAL_BOSS = { crypt: 'g_plagueheart', cavern: 'g_stormtyrant', frost: 'b2_glacierseer', inferno: 'b2_emberlord', void: 'b2_voidweaver',
  verdant: 'b3_thornking', desert: 'b3_sandpharaoh', swamp: 'b3_bogmaw', abyss: 'b3_leviathan', celestial: 'b3_seraphjudge' };
export const REAPER_ID = 'reaper';
// task-4: cardinal probes (px) used to detect the player backing into a wall during 魂牢
export const SURROUND_PROBES = [[14, 0], [-14, 0], [0, 14], [0, -14]];

// Co-op level-up: build up to 3 WEAPON choices for a player (level an owned weapon /
// grant a new one). Per-avatar, so it's safe to apply to any player without the shared
// run-stats tangle. Sent to guests for display; the host applies the pick.
export function buildWeaponChoices(player) {
  const opts = [];
  for (const w of player.weapons) if (!w.def.evolved && w.level < weaponMaxLevel(w.def)) opts.push({ act: 'level', wid: w.def.id, name: w.def.name, icon: w.def.icon || ('weapon_' + w.def.id), lvl: w.level });
  if (player.weapons.length < 6) {
    const have = new Set(player.weapons.map((w) => w.def.id));
    const pool = Weapons.all().filter((d) => !d.evolved && !have.has(d.id) && isUnlocked(META, 'weapons', d.id));
    for (let i = 0; i < 4 && pool.length; i++) { const d = pool.splice(rng.int(0, pool.length - 1), 1)[0]; opts.push({ act: 'new', wid: d.id, name: d.name, icon: d.icon || ('weapon_' + d.id), lvl: 0 }); }
  }
  for (let i = opts.length - 1; i > 0; i--) { const j = rng.int(0, i); const t = opts[i]; opts[i] = opts[j]; opts[j] = t; }   // shuffle
  const pick = opts.slice(0, 3);
  if (!pick.length) pick.push({ act: 'heal', wid: '', name: '回復生命', icon: 'ability_vitality', lvl: 0 });
  return pick;
}
export function applyWeaponChoice(player, opt, world) {
  if (!opt) { player.heal(player.maxHp * 0.12); return; }
  if (opt.act === 'level') { const inst = player.weapons.find((w) => w.def.id === opt.wid); if (inst) player.levelWeapon(inst, world); else player.addWeapon(opt.wid, world); }
  else if (opt.act === 'new') player.addWeapon(opt.wid, world);
  else player.heal(player.maxHp * 0.15);
}
