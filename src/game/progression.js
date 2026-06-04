// Unified level-up choice pool: new weapons, weapon upgrades, and passives.
import { Abilities } from './content/registry.js';
import { applyAbility } from './content/abilities.js';
import { weaponPool } from './content/weapons.js';
import { rng } from '../engine/math.js';
import { P } from '../engine/palette.js';

function eligibleAbilities(run) {
  const maxTier = run.level >= 8 ? 3 : run.level >= 4 ? 2 : 1;
  return Abilities.all().filter((d) => (d.tier ?? 1) <= maxTier && (run.abilityLevels[d.id] || 0) < (d.maxStacks ?? 99));
}

export function getRunChoices(run, player, n = 3) {
  const pool = [];
  for (const inst of player.weapons) {
    if (!inst.def.evolved && inst.level < (inst.def.maxLevel || 8)) pool.push({ kind: 'weaponup', id: inst.def.id, def: inst.def, weight: 9, level: inst.level });
  }
  if (player.weapons.length < 6) {
    for (const w of weaponPool()) if (!player.hasWeapon(w.id)) pool.push({ kind: 'weapon', id: w.id, def: w, weight: (w.weight ?? 5) * 0.8 });
  }
  for (const a of eligibleAbilities(run)) pool.push({ kind: 'ability', id: a.id, def: a, weight: a.weight ?? 5 });

  // fusion: sacrifice a weapon to instantly max + evolve another (R8 / #8)
  if (player.weapons.length >= 2) {
    const target = player.weapons.find((w) => w.def.evolveInto && !w.def.evolved);
    if (target) {
      const sacrifice = player.weapons.find((w) => w !== target);
      if (sacrifice) pool.push({ kind: 'fuse', id: 'fuse_' + target.def.id, def: { name: '武器融合 · ' + target.def.name, desc: `犧牲「${sacrifice.def.name}」使「${target.def.name}」直接滿級並進化` }, target, sacrifice, weight: 4 });
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
  if (c.kind === 'fuse') return { icon: 'weapon_' + (c.target ? c.target.def.id : 'w_soulbolt'), sub: '武器融合', tag: '融合', rarity: 3, accent: P.goldL, bg: '#4a3a16', desc: c.def.desc, effect: '' };
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
