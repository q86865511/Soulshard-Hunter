// Core consumable items. Picked up into the inventory, used with 1-4 keys.
// Workflow adds more.
//
// Schema:
//   { id, name, desc, tier, weight, price, icon:'item_<id>',
//     use(world, player, run) -> truthy if consumed }
import { Items } from './registry.js';
import { P } from '../../engine/palette.js';

const I = (o) => Items.register(o);

I({
  id: 'heal_potion', name: '治療藥水', desc: '立即回復 45 點生命', tier: 1, weight: 10, price: 18, icon: 'item_heal_potion',
  use: (w, p) => { if (p.hp >= p.maxHp) return false; p.heal(36); w.particles.text(p.x, p.y - 16, '+36', { color: P.redL, size: 14 }); return true; },
});
I({
  id: 'big_potion', name: '大型藥水', desc: '立即回復 110 點生命', tier: 2, weight: 5, price: 40, icon: 'item_big_potion',
  use: (w, p) => { if (p.hp >= p.maxHp) return false; p.heal(85); w.particles.text(p.x, p.y - 16, '+85', { color: P.redL, size: 15 }); return true; },
});
I({
  id: 'bomb', name: '魂晶炸彈', desc: '對周圍敵人造成大量範圍傷害', tier: 1, weight: 8, price: 25, icon: 'item_bomb',
  use: (w, p) => { w.spawnExplosion(p.x, p.y, 64, P.ember, 70, { knockback: 140 }); return true; },
});
I({
  id: 'magnet_scroll', name: '吸引卷軸', desc: '吸引場上所有掉落物', tier: 1, weight: 6, price: 15, icon: 'item_magnet_scroll',
  use: (w, p) => { for (const pk of w.pickups) pk.magnet = true; w.particles.ring(p.x, p.y, P.shardL, 20, 120); return true; },
});
I({
  id: 'frenzy_brew', name: '狂熱藥劑', desc: '6 秒內 射速 +80%', tier: 2, weight: 5, price: 35, icon: 'item_frenzy_brew',
  use: (w, p) => { p.addTimedBuff(6, (pl) => pl.stats.fireRateMult *= 1.8, (pl) => pl.stats.fireRateMult /= 1.8, P.emberL); return true; },
});
I({
  id: 'shield_charm', name: '護盾符', desc: '4 秒內免疫傷害', tier: 2, weight: 4, price: 38, icon: 'item_shield_charm',
  use: (w, p) => { p.invuln = Math.max(p.invuln, 4); p.shieldT = 4; w.particles.ring(p.x, p.y, P.iceD, 18, 90); return true; },
});
