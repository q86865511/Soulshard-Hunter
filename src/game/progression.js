// Unified level-up choice pool: new weapons, weapon upgrades, and passives.
import { Abilities } from './content/registry.js';
import { applyAbility } from './content/abilities.js';
import { weaponPool } from './content/weapons.js';
import { BALANCE, weaponMaxLevel, isWeaponMaxed } from './balance.js';
import { rng } from '../engine/math.js';
import { P } from '../engine/palette.js';

// per-character acquisition caps (so power can't pile up without bound)
export const MAX_WEAPONS = 6;
export const MAX_PASSIVES = 14;

function eligibleAbilities(run) {
  const maxTier = run.level >= 8 ? 3 : run.level >= 4 ? 2 : 1;
  return Abilities.all().filter((d) => (d.tier ?? 1) <= maxTier && (run.abilityLevels[d.id] || 0) < (d.maxStacks ?? 99));
}

export function getRunChoices(run, player, n = 3) {
  const pool = [];
  for (const inst of player.weapons) {
    if (!inst.def.evolved && !inst.def.equipped && inst.level < weaponMaxLevel(inst.def)) pool.push({ kind: 'weaponup', id: inst.def.id, def: inst.def, weight: 9, level: inst.level });
  }
  if (player.weapons.filter((w) => !w.def.equipped).length < MAX_WEAPONS) {   // signature (equip) weapons don't count toward the cap
    for (const w of weaponPool()) if (!player.hasWeapon(w.id)) pool.push({ kind: 'weapon', id: w.id, def: w, weight: (w.weight ?? 5) * 0.8 });
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

// presentation metadata for a choice card — rarity-coloured, with a numeric
// "effect" line (weapon stats) shown above the flavour text on the card.
const RARITY = { 1: { accent: P.gray4, tag: '普通' }, 2: { accent: P.purpleL, tag: '稀有' }, 3: { accent: P.goldL, tag: '史詩' } };
export function choiceStyle(c) {
  if (c.kind === 'fuse') return { icon: 'weapon_' + (c.target ? c.target.def.id : 'w_soulbolt'), sub: '武器合成', tag: '合成', rarity: 3, accent: P.goldL, bg: '#4a3a16', desc: c.def.desc, effect: '' };
  if (c.kind === 'weapon') {
    const r = RARITY[c.def.tier || 1];
    return { icon: 'weapon_' + c.id, sub: '新武器', tag: r.tag, rarity: c.def.tier || 1, accent: P.shardL, bg: '#163a44', desc: c.def.desc, effect: c.def.levelDesc ? c.def.levelDesc(1) : '' };
  }
  if (c.kind === 'weaponup') {
    return { icon: 'weapon_' + c.id, sub: `強化 Lv.${c.level}→${c.level + 1}`, tag: '升級', rarity: 2, accent: P.blueL, bg: '#1f2a52', desc: c.def.desc, effect: (c.def.levelDesc && c.def.levelDesc(c.level + 1)) || '' };
  }
  if (c.def && c.def.cursed) return { icon: 'ability_' + c.id, sub: '詛咒強化', tag: '詛咒', rarity: 3, accent: P.redL, bg: '#3a1622', desc: c.def.desc, effect: '' };
  const TIERBG = { 1: '#26305a', 2: '#2e2a6a', 3: '#5a4011' };
  const r = RARITY[c.def.tier || 1];
  return { icon: 'ability_' + c.id, sub: '被動', tag: r.tag, rarity: c.def.tier || 1, accent: r.accent, bg: TIERBG[c.def.tier || 1], desc: c.def.desc, effect: '' };
}
