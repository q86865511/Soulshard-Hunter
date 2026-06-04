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
}

// presentation metadata for a choice card
export function choiceStyle(c) {
  if (c.kind === 'weapon') return { icon: 'weapon_' + c.id, sub: '新武器', desc: c.def.desc, bg: '#1a3a4a', accent: P.shardL };
  if (c.kind === 'weaponup') return { icon: 'weapon_' + c.id, sub: `強化 Lv.${c.level}→${c.level + 1}`, desc: (c.def.levelDesc && c.def.levelDesc(c.level + 1)) || c.def.desc, bg: '#1f2a52', accent: P.blueL };
  const TIER = { 1: { bg: '#26305a', accent: P.gray4, label: '被動' }, 2: { bg: '#3a2a6a', accent: P.purpleL, label: '稀有被動' }, 3: { bg: '#5a4011', accent: P.goldL, label: '史詩被動' } };
  const t = TIER[c.def.tier || 1];
  return { icon: 'ability_' + c.id, sub: t.label, desc: c.def.desc, bg: t.bg, accent: t.accent };
}
