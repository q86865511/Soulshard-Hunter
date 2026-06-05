// Auto-firing weapons (Vampire-Survivors style). The player walks; weapons aim
// and fire themselves. Each weapon can level up; some evolve (fuse) at max level
// when the player also owns a required passive ability. Workflow adds more.
//
// Schema:
//   { id, name, desc, icon:'weapon_<id>', tier, weight, maxLevel,
//     cooldown(level) -> sec,                 // periodic attack (optional)
//     fire(world, player, inst),              // called every cooldown; inst.level
//     update(world, player, inst, dt),        // optional persistent behaviour
//     draw(world, player, inst),              // optional persistent visual
//     levelDesc(level), evolveInto, evolveReq // fusion: maxLevel + own passive evolveReq
//     evolved: true                           // hides from the random level-up pool }
import { Weapons } from './registry.js';
import { Projectile } from '../projectile.js';
import { BALANCE } from '../balance.js';
import { applyStatus } from '../status.js';
import { META } from '../state.js';
import { isUnlocked } from './unlocks.js';
import { P, withAlpha } from '../../engine/palette.js';
import { dist2, TAU } from '../../engine/math.js';
import { glowWorld, fillCircleWorld, drawSprite } from '../../engine/renderer.js';
import { getSprite } from '../../engine/sprites.js';
import { Sfx } from '../../engine/audio.js';

// 原#5: auto-target only foes within AIM_RANGE and with clear line-of-sight (no wall between).
function nearestN(world, x, y, n, maxD = BALANCE.AIM_RANGE) {
  const r = [];
  for (const e of world.enemies) { if (e.dead || e.spawnT > 0) continue; const d = dist2(x, y, e.x, e.y); if (d < maxD * maxD && (!BALANCE.AIM_LOS || world.lineClear(x, y, e.x, e.y))) r.push([d, e]); }
  r.sort((a, b) => a[0] - b[0]);
  return r.slice(0, n).map((p) => p[1]);
}
function roll(p, base) {
  const crit = Math.random() < (p.stats.critChance || 0);
  return { dmg: base * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1) * (crit ? (p.stats.critMult || 2) : 1) * (0.92 + Math.random() * 0.16), crit };
}
const faceA = (p) => Math.atan2(p.faceY || 0, p.faceX || 1);
const W = (o) => Weapons.register(o);

// ---- core weapons ----------------------------------------------------------
W({
  id: 'w_soulbolt', name: '魂晶彈', icon: 'weapon_w_soulbolt', tier: 1, weight: 10, maxLevel: 8,
  cooldown: (l) => Math.max(0.24, 0.66 - l * 0.04),
  fire(world, p, inst) {
    const l = inst.level;
    const count = 1 + Math.floor(l / 2) + (p.stats.projCountAdd || 0);
    const targets = nearestN(world, p.x, p.y, count);
    if (!targets.length) return;
    for (let i = 0; i < count; i++) {
      const t = targets[i % targets.length];
      const a = Math.atan2(t.y - p.y, t.x - p.x) + (Math.random() - 0.5) * 0.08;
      const { dmg, crit } = roll(p, 9 + l * 3.5);
      const sp = 260 * (p.stats.projSpeedMult || 1);
      world.addProjectile(new Projectile({ x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, damage: dmg, crit, faction: 'player', sprite: 'bolt', color: P.shard, pierce: Math.floor(l / 4) + (p.stats.pierceAdd || 0), knockback: 18, life: 1.1 }));
    }
    Sfx.play('shoot');
  },
  levelDesc: (l) => `彈數 ${1 + Math.floor(l / 2)}・傷害 ${(9 + l * 3.5) | 0}・穿透 ${Math.floor(l / 4)}`,
  evolveInto: 'w_soulstorm', evolveReq: 'power', desc: '向最近的敵人連射魂晶彈。',
});

W({
  id: 'w_fan', name: '魂焰扇', icon: 'weapon_w_fan', tier: 1, weight: 8, maxLevel: 6,
  cooldown: (l) => Math.max(0.5, 1.1 - l * 0.08),
  fire(world, p, inst) {
    const l = inst.level, count = 2 + Math.floor(l * 0.6), spread = 0.95, base = faceA(p);
    for (let i = 0; i < count; i++) {
      const a = base + (count > 1 ? (i / (count - 1) - 0.5) * spread : 0);
      const { dmg, crit } = roll(p, 7 + l * 2.4);
      world.addProjectile(new Projectile({ x: p.x, y: p.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, damage: dmg, crit, faction: 'player', sprite: 'bolt_fire', color: P.ember, radius: 3, knockback: 14, life: 0.62, statusOnHit: { type: 'burn' } }));
    }
    Sfx.play('shoot');
  },
  desc: '朝行進方向扇形噴射火焰魂彈，命中點燃敵人（灼燒）。',
});

W({
  id: 'w_orbit', name: '環衛刃', icon: 'weapon_w_orbit', tier: 2, weight: 7, maxLevel: 6,
  update(world, p, inst, dt) {
    const l = inst.level, n = 2 + Math.floor(l * 0.7), R = 30 + l * 3;
    inst.st.a = (inst.st.a || 0) + dt * 2.6;
    inst.st.cd = inst.st.cd || new Map();
    for (let i = 0; i < n; i++) {
      const a = inst.st.a + i / n * TAU, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
      for (const e of world.enemies) {
        if (e.dead || e.spawnT > 0) continue;
        if (dist2(ox, oy, e.x, e.y) < (e.radius + 6) ** 2) {
          const last = inst.st.cd.get(e) || 0;
          if (world.time > last) { inst.st.cd.set(e, world.time + 0.25); const { dmg, crit } = roll(p, 7 + l * 4); e.hurt(dmg, Math.cos(a) * 30, Math.sin(a) * 30, world, crit); }
        }
      }
    }
  },
  draw(world, p, inst) {
    const l = inst.level, n = 2 + Math.floor(l * 0.7), R = 30 + l * 3, sp = getSprite('fx_blade');
    for (let i = 0; i < n; i++) { const a = (inst.st.a || 0) + i / n * TAU, ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R; glowWorld(ox, oy, 6, P.shardL, 0.4); drawSprite(sp.frames[0], ox, oy, { ax: sp.ax, ay: sp.ay, rot: a + Math.PI / 2 }); }
  },
  desc: '召喚環繞的魂刃，持續切割周圍敵人。',
});

W({
  id: 'w_aura', name: '灼蝕光環', icon: 'weapon_w_aura', tier: 2, weight: 6, maxLevel: 6,
  cooldown: () => 0.5,
  fire(world, p, inst) { const l = inst.level, R = (34 + l * 6) * (p.stats.area || 1); const { dmg } = roll(p, 5 + l * 2.2); world.dealAreaDamage(p.x, p.y, R, dmg, { knockback: 8 }); },
  draw(world, p, inst) {
    const l = inst.level, R = (34 + l * 6) * (p.stats.area || 1);
    fillCircleWorld(p.x, p.y, R, withAlpha(P.ember, 0.07));
    if (Math.random() < 0.4) world.particles.spawn({ x: p.x + (Math.random() - 0.5) * R * 1.7, y: p.y + (Math.random() - 0.5) * R * 1.7, life: 0.3, size: 2, color: P.emberL, glow: true, drag: 0.9 });
  },
  evolveInto: 'w_inferno', evolveReq: 'overload', desc: '環繞自身的灼熱領域，持續灼燒接近的敵人。',
});

W({
  id: 'w_whip', name: '魂鞭', icon: 'weapon_w_whip', tier: 2, weight: 7, maxLevel: 6,
  cooldown: (l) => Math.max(0.4, 0.9 - l * 0.06),
  fire(world, p, inst) {
    const l = inst.level, sides = l >= 4 ? 2 : 1, range = (36 + l * 6) * (p.stats.area || 1), base = faceA(p);
    for (let s = 0; s < sides; s++) {
      const dir = base + (s ? Math.PI : 0), hx = p.x + Math.cos(dir) * range * 0.6, hy = p.y + Math.sin(dir) * range * 0.6;
      const { dmg } = roll(p, 12 + l * 5);
      world.dealAreaDamage(hx, hy, range * 0.6, dmg, { knockback: 70 });
      world.particles.burst(hx, hy, 9, { angle: dir, spread: 1.3, speed: 130, color: [P.shardL, '#fff'], size: 2.2, life: 0.22, glow: true });
    }
    Sfx.play('shoot');
  },
  desc: '朝行進方向揮出魂鞭橫掃，高等級可雙向。',
});

W({
  id: 'w_nova', name: '震爆波', icon: 'weapon_w_nova', tier: 2, weight: 6, maxLevel: 6,
  cooldown: (l) => Math.max(1.4, 2.6 - l * 0.2),
  fire(world, p, inst) { const l = inst.level, R = (40 + l * 8) * (p.stats.area || 1); const { dmg } = roll(p, 14 + l * 6); world.spawnExplosion(p.x, p.y, R, P.manaL, dmg, { knockback: 120, status: { type: 'knockup' } }); },
  desc: '週期釋放魂能衝擊波，震退並擊飛四周敵人。',
});

W({
  id: 'w_homing', name: '追魂彈', icon: 'weapon_w_homing', tier: 2, weight: 6, maxLevel: 6,
  cooldown: (l) => Math.max(0.5, 1.0 - l * 0.06),
  fire(world, p, inst) {
    const l = inst.level, count = 2 + Math.floor(l * 0.8);
    // launch toward the nearest foes (then home) instead of spraying randomly
    const targets = nearestN(world, p.x, p.y, Math.max(1, count));
    for (let i = 0; i < count; i++) {
      const t = targets.length ? targets[i % targets.length] : null;
      const baseA = t ? Math.atan2(t.y - p.y, t.x - p.x) : faceA(p);
      const a = baseA + (Math.random() - 0.5) * 0.5;
      const { dmg, crit } = roll(p, 8 + l * 3);
      world.addProjectile(new Projectile({ x: p.x, y: p.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, damage: dmg, crit, faction: 'player', sprite: 'bolt_void', color: P.purpleL, homing: 4.2, life: 2.2, knockback: 14 }));
    }
    Sfx.play('shoot');
  },
  desc: '發射自動追蹤敵人的魂彈。',
});

W({
  id: 'w_lightning', name: '連鎖閃電', icon: 'weapon_w_lightning', tier: 3, weight: 5, maxLevel: 6,
  cooldown: (l) => Math.max(0.6, 1.3 - l * 0.08),
  fire(world, p, inst) {
    const l = inst.level, chains = 2 + l, hit = new Set();
    let from = { x: p.x, y: p.y };
    for (let c = 0; c < chains; c++) {
      let best = null, bd = 170 * 170;
      for (const e of world.enemies) { if (e.dead || e.spawnT > 0 || hit.has(e)) continue; const d = dist2(from.x, from.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
      if (!best) break;
      hit.add(best);
      const { dmg, crit } = roll(p, 10 + l * 4);
      best.hurt(dmg, 0, 0, world, crit);
      if (c === 0) applyStatus(best, 'stun', world, { dur: 0.5 });   // first link stuns (D6)
      world.addBeam(from.x, from.y, best.x, best.y, P.emberL);
      world.particles.spawn({ x: best.x, y: best.y, life: 0.2, size: 3, color: P.emberL, glow: true });
      from = { x: best.x, y: best.y };
    }
    Sfx.play('crit');
  },
  desc: '閃電擊中最近敵人並向周圍連鎖跳躍。',
});

// ---- evolutions (hidden from random pool) ----------------------------------
W({
  id: 'w_soulstorm', name: '魂晶風暴', icon: 'weapon_w_soulstorm', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 0.34,
  fire(world, p) {
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + world.time * 2.2; const { dmg, crit } = roll(p, 20); world.addProjectile(new Projectile({ x: p.x, y: p.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, damage: dmg, crit, faction: 'player', sprite: 'bolt', color: P.shardL, pierce: 3, life: 1.1, knockback: 16 })); }
  },
  desc: '【進化】向八方持續噴射穿透魂彈。',
});
W({
  id: 'w_inferno', name: '煉獄光環', icon: 'weapon_w_inferno', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 0.35,
  fire(world, p) { const R = 92 * (p.stats.area || 1); const { dmg } = roll(p, 16); world.dealAreaDamage(p.x, p.y, R, dmg, { knockback: 24 }); },
  draw(world, p) { const R = 92 * (p.stats.area || 1); fillCircleWorld(p.x, p.y, R, withAlpha(P.red, 0.1)); for (let i = 0; i < 2; i++) world.particles.spawn({ x: p.x + (Math.random() - 0.5) * R * 1.8, y: p.y + (Math.random() - 0.5) * R * 1.8, life: 0.4, size: 3, color: P.ember, glow: true, grav: -30 }); },
  desc: '【進化】巨大的煉獄領域，灼燒範圍內所有敵人。',
});

// the random level-up pool excludes evolved/0-weight weapons
export function weaponPool() { return Weapons.all().filter((w) => !w.evolved && (w.weight ?? 1) > 0 && isUnlocked(META, 'weapons', w.id)); }
