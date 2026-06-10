// Unified level-up choice pool: new weapons, weapon upgrades, and passives.
import { Abilities } from './content/registry.js';
import { applyAbility } from './content/abilities.js';
import { weaponPool } from './content/weapons.js';
import { BALANCE, weaponMaxLevel, isWeaponMaxed } from './balance.js';
import { META } from './state.js';
import { isUnlocked } from './content/unlocks.js';
import { rng } from '../engine/math.js';
import { P } from '../engine/palette.js';

// per-character acquisition caps (so power can't pile up without bound)
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 14;

function eligibleAbilities(run) {
  const maxTier = run.level >= 8 ? 3 : run.level >= 4 ? 2 : 1;
  return Abilities.all().filter((d) => (d.tier ?? 1) <= maxTier && (run.abilityLevels[d.id] || 0) < (d.maxStacks ?? 99) && isUnlocked(META, 'abilities', d.id));
}

export function getRunChoices(run, player, n = 3) {
  const pool = [];
  for (const inst of player.weapons) {
    if (!inst.def.evolved && !inst.def.equipped && inst.level < weaponMaxLevel(inst.def)) pool.push({ kind: 'weaponup', id: inst.def.id, def: inst.def, weight: 9, level: inst.level });
  }
  if (player.weapons.filter((w) => !w.def.equipped).length < MAX_WEAPONS) {   // signature (equip) weapons don't count toward the cap
    for (const w of weaponPool()) if (!player.hasWeapon(w.id) && !(run.evolvedWeaponIds && run.evolvedWeaponIds.has(w.id))) pool.push({ kind: 'weapon', id: w.id, def: w, weight: (w.weight ?? 5) * 0.8 });   // 10.1: skip weapons already consumed by an evolution
  }
  const atPassiveCap = (run.abilities || []).length >= MAX_PASSIVES;
  for (const a of eligibleAbilities(run)) {
    if (atPassiveCap && !(run.abilityLevels[a.id] > 0)) continue;   // at cap: only stack already-owned passives
    pool.push({ kind: 'ability', id: a.id, def: a, weight: a.weight ?? 5 });
  }

  // fusion (合成): an evolvable, MAXED weapon can be synthesised when the player has
  // either 2+ maxed weapons (sacrifice the spare), or 1 maxed weapon + a passive.
  // The exact recipe is deliberately not spelled out on the card (C2 — hidden formula).
  {
    const maxed = player.weapons.filter((w) => !w.def.evolved && !w.def.equipped && isWeaponMaxed(w));
    const target = maxed.find((w) => w.def.evolveInto);
    if (target) {
      const passives = (run.abilities || []).length;
      const otherMaxed = maxed.find((w) => w !== target) || null;
      let sacrifice = null, via = null;
      if (maxed.length >= BALANCE.FUSE_MAXED_WEAPONS && otherMaxed) { sacrifice = otherMaxed; via = `犧牲滿級的「${otherMaxed.def.name}」`; }
      else if (passives >= BALANCE.FUSE_PASSIVES) { sacrifice = null; via = '燃燒一道被動之力'; }
      if (via) pool.push({ kind: 'fuse', id: 'fuse_' + target.def.id, def: { name: '武器合成 · ' + target.def.name, desc: `${via}，令「${target.def.name}」覺醒進化為更強型態。` }, target, sacrifice, weight: 7 });
    }
  }

  const picks = [];
  let p = pool.slice();
  for (let i = 0; i < n && p.length; i++) {
    const c = rng.weighted(p, (x) => x.weight);
    picks.push(c);
    p = p.filter((x) => !(x.kind === c.kind && x.id === c.id));
  }
  return picks;
}

// Whether a weapon fusion is currently possible (used for the "can-fuse" hint —
// the recipe itself is never spelled out). Mirrors the gating in getRunChoices.
export function fusionAvailable(run, player) {
  const maxed = player.weapons.filter((w) => !w.def.evolved && !w.def.equipped && isWeaponMaxed(w));
  if (!maxed.some((w) => w.def.evolveInto)) return false;
  return maxed.length >= BALANCE.FUSE_MAXED_WEAPONS || (run.abilities || []).length >= BALANCE.FUSE_PASSIVES;
}

export function applyChoice(run, player, world, c) {
  if (c.kind === 'ability') applyAbility(run, player, world, c.def);
  else if (c.kind === 'weapon') player.addWeapon(c.id, world);
  else if (c.kind === 'weaponup') { const inst = player.weapons.find((w) => w.def.id === c.id); if (inst) player.levelWeapon(inst, world); }
  else if (c.kind === 'fuse') player.fuseWeapons(c.target, c.sacrifice, world);
}

// R17/5.1: FOUR rarity tiers in the conventional colour language — 普通白 / 稀有藍 /
// 史詩紫 / 傳說黃. ONE row drives everything on a card (top bar + bg tint + rarity pill)
// so the card body always matches its rarity; the separate TYPE badge says what KIND of
// thing the offer is (武器/被動/升級/合成/裝備/詛咒), independent of how rare it is.
export const RARITY = {
  1: { tag: '普通', accent: '#e6e9f2', bg: '#262b3e' },
  2: { tag: '稀有', accent: '#58a6ff', bg: '#16294a' },
  3: { tag: '史詩', accent: P.purpleL, bg: '#2c1c4a' },
  4: { tag: '傳說', accent: P.goldL, bg: '#42330f' },
};
export const CHOICE_TYPE = {
  weapon: { label: '武器', col: P.shardL },
  weaponup: { label: '升級', col: '#58a6ff' },
  ability: { label: '被動', col: P.manaL },
  fuse: { label: '合成', col: P.goldL },
  equip: { label: '裝備', col: P.goldL },
  curse: { label: '詛咒', col: P.redL },
};
// fusion/evolution flows and hero-exclusive gear read as LEGENDARY; everything else by tier
export function rarityOf(def, kind) {
  if (kind === 'fuse') return 4;
  if (def && def.exclusive) return 4;
  return Math.min(4, (def && def.tier) || 1);
}
export function choiceStyle(c) {
  if (c.kind === 'fuse') {
    const r = RARITY[4];
    return { icon: 'weapon_' + (c.target ? c.target.def.id : 'w_soulbolt'), sub: '武器合成', type: 'fuse', tag: r.tag, rarity: 4, accent: r.accent, tagCol: r.accent, bg: r.bg, desc: c.def.desc, effect: '' };
  }
  if (c.kind === 'weapon') {
    const ri = rarityOf(c.def, 'weapon'); const r = RARITY[ri];
    return { icon: 'weapon_' + c.id, sub: '新武器', type: 'weapon', tag: r.tag, rarity: ri, accent: r.accent, tagCol: r.accent, bg: r.bg, desc: c.def.desc, effect: c.def.levelDesc ? c.def.levelDesc(1) : '' };
  }
  if (c.kind === 'weaponup') {
    // rarity follows the WEAPON's tier (a tier-1 weapon's level-up is a 普通 offer) — the type badge says 升級
    const ri = rarityOf(c.def, 'weaponup'); const r = RARITY[ri];
    return { icon: 'weapon_' + c.id, sub: `強化 Lv.${c.level}→${c.level + 1}`, type: 'weaponup', tag: r.tag, rarity: ri, accent: r.accent, tagCol: r.accent, bg: r.bg, desc: c.def.desc, effect: (c.def.levelDesc && c.def.levelDesc(c.level + 1)) || '' };
  }
  if (c.def && c.def.cursed) {
    // cursed keeps its RED identity on the frame/bg; the rarity pill still tells the true tier
    const ri = rarityOf(c.def, 'ability'); const r = RARITY[ri];
    return { icon: 'ability_' + c.id, sub: '詛咒強化', type: 'curse', tag: r.tag, rarity: ri, accent: P.redL, tagCol: r.accent, bg: '#3a1622', desc: c.def.desc, effect: '' };
  }
  const ri = rarityOf(c.def, 'ability'); const r = RARITY[ri];
  return { icon: 'ability_' + c.id, sub: '被動', type: 'ability', tag: r.tag, rarity: ri, accent: r.accent, tagCol: r.accent, bg: r.bg, desc: c.def.desc, effect: '' };
}
