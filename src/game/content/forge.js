// 5-5 鍛造 (weapon forging). At the blacksmith the player spends gold to permanently
// upgrade a weapon OUT of run: a forge LEVEL (raw damage) plus up to 3 special EFFECTS.
// Forge data lives on META.forge[weaponId] = { level, effects:[id,...] }. When a weapon
// instance is created in a run (player.addWeapon) we attach the aggregated modifiers; the
// central weapon loop (player.updateWeapons) applies them only while THAT weapon fires, so
// the bonus is per-weapon and works across every weapon file without touching their fire().
import { META } from '../state.js';
import { Weapons } from './registry.js';
import { isUnlocked } from './unlocks.js';
import { P } from '../../engine/palette.js';
import { BALANCE } from '../balance.js';

export const FORGE_MAX_LEVEL = 5;
export const FORGE_MAX_EFFECTS = 3;

// each effect contributes stat riders injected around the weapon's fire()/update()
export const FORGE_EFFECTS = [
  { id: 'keen',   name: '銳利', desc: '暴擊率 +10%、暴擊傷害 +0.4', color: P.gold,    mods: { crit: 0.10, critMult: 0.4 } },
  { id: 'pierce', name: '貫穿', desc: '彈射武器額外穿透 +1',       color: P.shardL,  mods: { pierce: 1 } },
  { id: 'mighty', name: '巨力', desc: '該武器傷害 +18%',           color: P.redL,    mods: { dmgMul: 1.18 } },
  { id: 'wide',   name: '廣域', desc: '範圍型武器範圍 +18%',       color: P.greenL,  mods: { areaMul: 1.18 } },
  { id: 'swift',  name: '疾速', desc: '該武器射速 +18%',           color: P.blueL,   mods: { haste: 1.18 } },
];
export const forgeEffect = (id) => FORGE_EFFECTS.find((e) => e.id === id);

const cost = (base, growth, n) => Math.round(base * Math.pow(growth, n));
// round16/9.2: base cost ×MUL. *Base variants exclude the 9.3 dynamic surcharge (used for reset refunds).
export const forgeLevelCostBase = (level) => cost(180 * BALANCE.FORGE_LEVEL_MUL, 1.6, level);
export const forgeEffectCostBase = (count) => cost(260 * BALANCE.FORGE_EFFECT_MUL, 1.8, count);
// round16/9.3: VS-style dynamic surcharge from the shared forge purchase counter. Display (hub.js) and
// charge (buyForge*) both call these so they always agree.
const forgeHubMul = (meta) => Math.pow(BALANCE.HUB_COST_GROWTH, (meta.hub && meta.hub.forgePurchases) || 0);
export const forgeLevelCost = (level, meta = META) => Math.round(forgeLevelCostBase(level) * forgeHubMul(meta));   // gold for the NEXT level (level = current)
export const forgeEffectCost = (count, meta = META) => Math.round(forgeEffectCostBase(count) * forgeHubMul(meta));  // gold for the NEXT effect slot

export function forgeOf(meta, id) {
  meta.forge = meta.forge || {};
  const f = meta.forge[id] || { level: 0, effects: [] };
  if (!Array.isArray(f.effects)) f.effects = [];
  return f;
}

// weapons the player may forge: unlocked, non-evolved, real (positive weight) weapons
export function forgeableWeapons(meta) {
  return Weapons.all().filter((w) => !w.evolved && (w.weight ?? 1) > 0 && isUnlocked(meta, 'weapons', w.id));
}

export function buyForgeLevel(meta, id) {
  const f = forgeOf(meta, id);
  if (f.level >= FORGE_MAX_LEVEL) return false;
  const c = forgeLevelCost(f.level, meta);
  if ((meta.gold || 0) < c) return false;
  meta.gold -= c;
  f.level += 1; meta.forge[id] = f;
  meta.hub = meta.hub || {}; meta.hub.forgePurchases = (meta.hub.forgePurchases || 0) + 1;   // 9.3: raise this panel's prices
  meta.stats.forgeUpgrades = (meta.stats.forgeUpgrades || 0) + 1;
  return true;
}
export function buyForgeEffect(meta, id, effectId) {
  const f = forgeOf(meta, id);
  if (f.effects.length >= FORGE_MAX_EFFECTS || f.effects.includes(effectId) || !forgeEffect(effectId)) return false;
  const c = forgeEffectCost(f.effects.length, meta);
  if ((meta.gold || 0) < c) return false;
  meta.gold -= c;
  f.effects.push(effectId); meta.forge[id] = f;
  meta.hub = meta.hub || {}; meta.hub.forgePurchases = (meta.hub.forgePurchases || 0) + 1;   // 9.3
  meta.stats.forgeUpgrades = (meta.stats.forgeUpgrades || 0) + 1;
  return true;
}

// aggregate the per-weapon modifiers a run should apply for this weapon id.
// Returns null when the weapon is unforged (so the hot loop can skip cheaply).
export function computeForgeMods(id, meta = META) {
  if (!meta || !meta.forge || !meta.forge[id]) return null;
  const f = forgeOf(meta, id);
  if (!f.level && !f.effects.length) return null;
  const m = { dmgMul: 1 + 0.08 * f.level, crit: 0, critMult: 0, pierce: 0, areaMul: 1, haste: 1 };
  for (const eid of f.effects) {
    const e = forgeEffect(eid); if (!e) continue;
    if (e.mods.dmgMul) m.dmgMul *= e.mods.dmgMul;
    if (e.mods.crit) m.crit += e.mods.crit;
    if (e.mods.critMult) m.critMult += e.mods.critMult;
    if (e.mods.pierce) m.pierce += e.mods.pierce;
    if (e.mods.areaMul) m.areaMul *= e.mods.areaMul;
    if (e.mods.haste) m.haste *= e.mods.haste;
  }
  return m;
}

// short "Lv.2 ·銳利貫穿" summary for UI
export function forgeSummary(meta, id) {
  const f = forgeOf(meta, id);
  if (!f.level && !f.effects.length) return '';
  const eff = f.effects.map((e) => (forgeEffect(e) || {}).name || '').join('');
  return (f.level ? '+' + f.level : '') + (eff ? ' ·' + eff : '');
}
