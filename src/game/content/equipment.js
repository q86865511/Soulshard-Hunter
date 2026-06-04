// Core equipment: weapons (replace the active weapon) and armor/trinkets
// (apply stat mods for the rest of the run). Workflow adds more.
//
// Schema:
//   { id, name, slot:'weapon'|'armor'|'trinket', tier, weight, price,
//     icon:'equip_<id>', desc,
//     weapon?: { ...weapon stats }   // when slot==='weapon'
//     apply?(player)                 // when slot==='armor'|'trinket' }
import { Equipment } from './registry.js';
import { P } from '../../engine/palette.js';

const E = (o) => Equipment.register(o);

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
  desc: '吸血 +3.5%', apply: (p) => { p.stats.lifesteal += 0.035; },
});

// ---- apply helper ----------------------------------------------------------
export function equipItem(player, run, def) {
  if (!def) return;
  if (run) run.gearTaken = true;   // taking ANY gear disqualifies the stat-purist boon
  if (def.slot === 'weapon') {
    player.weapon = { ...def.weapon };
    run.weapon = player.weapon;
    run.equipment.weapon = def.id;
  } else {
    try { def.apply?.(player); } catch (e) { console.warn('equip apply failed', def.id, e); }
    run.equipment[def.slot] = def.id;
  }
}
