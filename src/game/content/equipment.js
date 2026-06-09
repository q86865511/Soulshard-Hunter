// Core equipment: weapons (replace the active weapon) and armor/trinkets
// (apply stat mods for the rest of the run). Workflow adds more.
//
// Schema:
//   { id, name, slot:'weapon'|'armor'|'trinket', tier, weight, price,
//     icon:'equip_<id>', desc,
//     weapon?: { ...weapon stats }   // when slot==='weapon'
//     apply?(player)                 // when slot==='armor'|'trinket' }
import { Equipment } from './registry.js';
import { BALANCE } from '../balance.js';
import { P } from '../../engine/palette.js';
import { Projectile } from '../projectile.js';

const E = (o) => Equipment.register(o);

// Turn a weapon-slot equip's `weapon` stat block into a real auto-fire weapon
// (a "signature weapon"). One generic def drives every weapon-slot equip; it
// aims at the nearest foe and respects the player's damage/crit/pierce stats.
function makeEquipWeaponDef(eq) {
  const w = eq.weapon || {};
  return {
    id: 'equipw', icon: eq.icon, name: w.name || eq.name, equipped: true,
    cooldown: () => Math.max(0.14, 1 / (w.fireRate || 1.5)),
    fire(world, p, inst) {
      const count = w.projCount || 1;
      const tgt = world.aimTarget ? world.aimTarget(p.x, p.y) : (world.nearestEnemy ? world.nearestEnemy(p.x, p.y, 720) : null);   // 原#5
      const base = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : Math.atan2(p.faceY || 0, p.faceX || 1);
      const spread = w.spread || 0;
      for (let i = 0; i < count; i++) {
        const off = count > 1 ? (i / (count - 1) - 0.5) * spread * count : 0;
        const a = base + off + (Math.random() - 0.5) * 0.04;
        const crit = Math.random() < Math.min(BALANCE.CRIT_CAP, p.stats.critChance || 0);
        const dmg = (w.damage || 8) * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1) * (crit ? (p.stats.critMult || 2) : 1) * (0.92 + Math.random() * 0.16);   // apply the global nerf (was skipped — signature weapons hit ~18% over baseline)
        world.addProjectile(new Projectile({
          x: p.x, y: p.y, vx: Math.cos(a) * (w.projSpeed || 200), vy: Math.sin(a) * (w.projSpeed || 200),
          damage: dmg, crit, faction: 'player', sprite: w.projSprite || 'bolt', color: w.projColor || P.shard,
          radius: w.projRadius || 3, pierce: (w.pierce || 0) + (p.stats.pierceAdd || 0), knockback: w.knockback || 16,
          life: w.projLife || 1.4, scale: w.projScale || 1,
        }));
      }
    },
  };
}

// ---- weapons ---------------------------------------------------------------
E({
  id: 'rapid_rod', name: '速射魔棒', slot: 'weapon', tier: 1, weight: 8, price: 45, icon: 'equip_rapid_rod',
  desc: '射速極快但單發較弱',
  weapon: { name: '速射魔棒', damage: 6, fireRate: 7.5, projSpeed: 200, projCount: 1, spread: 0.10, pierce: 0, knockback: 12, projSprite: 'bolt', projColor: P.iceD, projRadius: 2.5, projLife: 1.2 },
});
E({
  id: 'shotgun_wand', name: '散射法杖', slot: 'weapon', tier: 2, weight: 6, price: 70, icon: 'equip_shotgun_wand',
  desc: '一次擊發五道魂彈，近距離爆發',
  weapon: { name: '散射法杖', damage: 7, fireRate: 1.8, projSpeed: 180, projCount: 5, spread: 0.30, pierce: 0, knockback: 30, projSprite: 'bolt', projColor: P.emberL, projRadius: 3, projLife: 0.7 },
});
E({
  id: 'cannon_staff', name: '轟擊魔杖', slot: 'weapon', tier: 2, weight: 5, price: 80, icon: 'equip_cannon_staff',
  desc: '緩慢但威力巨大、可貫穿',
  weapon: { name: '轟擊魔杖', damage: 34, fireRate: 1.2, projSpeed: 150, projCount: 1, spread: 0.02, pierce: 2, knockback: 60, projSprite: 'bolt', projColor: P.purpleL, projRadius: 5, projLife: 2, projScale: 1.6 },
});

// ---- armor -----------------------------------------------------------------
E({
  id: 'leather_armor', name: '皮革護甲', slot: 'armor', tier: 1, weight: 8, price: 40, icon: 'equip_leather_armor',
  desc: '生命上限 +18、減傷 +2', apply: (p) => { p.stats.maxHp += 18; p.heal(18); p.stats.defense += 2; },
});
E({
  id: 'mage_robe', name: '法師長袍', slot: 'armor', tier: 2, weight: 6, price: 55, icon: 'equip_mage_robe',
  desc: '傷害 +20%，但生命上限 -15', apply: (p) => { p.stats.damageMult *= 1.2; p.stats.maxHp = Math.max(20, p.stats.maxHp - 15); p.hp = Math.min(p.hp, p.stats.maxHp); },
});

// ---- trinkets --------------------------------------------------------------
E({
  id: 'swift_ring', name: '疾風之戒', slot: 'trinket', tier: 1, weight: 8, price: 38, icon: 'equip_swift_ring',
  desc: '移動速度 +12%、拾取範圍 +30%', apply: (p) => { p.stats.speed *= 1.12; p.stats.pickupRange *= 1.3; },
});
E({
  id: 'vamp_amulet', name: '吸血護符', slot: 'trinket', tier: 2, weight: 6, price: 60, icon: 'equip_vamp_amulet',
  desc: '吸血 +2.5%', apply: (p) => { p.stats.lifesteal += 0.025; },
});

// ---- stat-diff tracking (原#1) ---------------------------------------------
// Snapshot the displayable stat fields so a slot's contribution can be measured
// (before/after) when an item is equipped or considered for swap.
export const DELTA_FIELDS = ['maxHp', 'damageMult', 'fireRateMult', 'critChance', 'critMult', 'speed', 'defense', 'dodge', 'lifesteal', 'projCountAdd', 'pierceAdd', 'area', 'projSpeedMult', 'pickupRange', 'luck', 'hpRegen', 'goldMult', 'xpMult', 'knockbackMult', 'armorMult'];
export function statSnapshot(stats) { const o = {}; for (const f of DELTA_FIELDS) o[f] = stats[f] || 0; return o; }
export function statDelta(before, after) { const d = {}; for (const f of DELTA_FIELDS) { const dv = (after[f] || 0) - (before[f] || 0); if (Math.abs(dv) > 1e-9) d[f] = dv; } return d; }

// ---- apply helper ----------------------------------------------------------
// recordRun: write the slot into the shared run.equipment/equipDelta/gearTaken record.
// In co-op a REMOTE avatar picking up gear still gets the stats + signature weapon, but
// must NOT clobber the host's shared run record — callers pass recordRun=false for it.
export function equipItem(player, run, def, recordRun = true) {
  if (!def) return;
  if (run && recordRun) run.gearTaken = true;   // taking ANY gear disqualifies the stat-purist boon
  if (def.slot === 'weapon') {
    if (run && recordRun) run.equipment.weapon = def.id;
    if (player.weapons) {   // add as a real auto-fire signature weapon (replacing any previous one)
      player.weapons = player.weapons.filter((inst) => !inst.def.equipped);
      player.weapons.push({ def: makeEquipWeaponDef(def), level: 1, t: 0, st: {} });
    }
  } else {
    const slot = def.slot;
    // 4.17 BUG fix: swapping armor/trinket previously LEFT the old item's stat bonus
    // permanently applied (only the new item's apply() ran), so each swap stacked stale
    // effects. Revert the slot's recorded contribution BEFORE applying the new item.
    // (Local/authoritative player only — co-op remotes pass recordRun=false and the slot
    // delta in run.equipDelta belongs to the host's shared run, so we must not touch it.)
    if (run && recordRun && run.equipDelta && run.equipDelta[slot]) {
      const old = run.equipDelta[slot];
      for (const k in old) player.stats[k] = (player.stats[k] || 0) - old[k];
    }
    const before = statSnapshot(player.stats);                              // 原#1: record this slot's contribution
    try { def.apply?.(player); } catch (e) { console.warn('equip apply failed', def.id, e); }
    if (player.hp > player.stats.maxHp) player.hp = player.stats.maxHp;      // clamp after a maxHp-reducing swap
    if (run && recordRun) { run.equipment[slot] = def.id; run.equipDelta = run.equipDelta || {}; run.equipDelta[slot] = statDelta(before, statSnapshot(player.stats)); }
  }
}
