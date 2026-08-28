// Round-20 hero signature weapons — the final six heroes' starting kits.
// HAND-WRITTEN content file (NOT gen/ — safe from integrate.mjs re-runs).
//
// 6 base auto-fire weapons + 6 evolved forms + 12 icons. Every damage roll goes
// through r20Roll(), which applies BALANCE.PLAYER_DAMAGE_MULT and clamps crit by
// BALANCE.CRIT_CAP (the historical gen_weapons leak — do not bypass it).
// Update-driven weapons divide their self-gating re-arm / per-enemy hit timers
// by (inst.fmHaste || 1) so the forge 疾速 effect speeds them up (round6.4 rule).
import { Weapons } from './registry.js';
import { Projectile } from '../projectile.js';
import { BALANCE } from '../balance.js';
import { applyStatus } from '../status.js';
import { P, withAlpha, lighten, darken, mix } from '../../engine/palette.js';
import { dist2, TAU } from '../../engine/math.js';
import { glowWorld, fillCircleWorld, drawSprite } from '../../engine/renderer.js';
import { getSprite, defineSprite } from '../../engine/sprites.js';
import { defineIcon } from '../../art/icons.js';
import { Sfx } from '../../engine/audio.js';

// ---- shared helpers (copied conventions from weapons.js / gen_weapons_a) ----
function r20NearestN(world, x, y, n, maxD = BALANCE.AIM_RANGE) {
  const r = [];
  for (const e of world.enemies) { if (e.dead || e.spawnT > 0) continue; const d = dist2(x, y, e.x, e.y); if (d < maxD * maxD && (!BALANCE.AIM_LOS || world.lineClear(x, y, e.x, e.y))) r.push([d, e]); }
  r.sort((a, b) => a[0] - b[0]);
  return r.slice(0, n).map((q) => q[1]);
}
function r20Roll(p, base) {
  const crit = Math.random() < Math.min(BALANCE.CRIT_CAP, p.stats.critChance || 0);
  return { dmg: base * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1) * (crit ? (p.stats.critMult || 2) : 1) * (0.92 + Math.random() * 0.16), crit };
}
const r20FaceA = (p) => Math.atan2(p.faceY || 0, p.faceX || 1);
function r20AngDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return Math.abs(d); }
function r20LerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * Math.min(1, t); }
const W = (o) => Weapons.register(o);

// ===========================================================================
// 1) 審判戰錘 — h4_paladin. A slow, heavy spectral warhammer that circles the
//    knight and SLAMS down in punishing holy AoE bursts. Smashes orbit the
//    player when nothing is close; snaps to the nearest foe when one is.
//    → 黎明聖印: triple dawn-seal slams that launch enemies skyward.
// ===========================================================================
W({
  id: 'w_h4_judgment', name: '審判戰錘', icon: 'weapon_w_h4_judgment', tier: 2, weight: 7, maxLevel: 7,
  cooldown: (l) => Math.max(1.0, 1.7 - l * 0.09),
  fire(world, p, inst) {
    const l = inst.level;
    inst.st.a = (inst.st.a || 0) + 2.4;                       // slams walk around the player (orbit-smash)
    const R = (34 + l * 4) * (p.stats.area || 1);
    const tgt = r20NearestN(world, p.x, p.y, 1, 130)[0];      // snap to a close threat if any
    const a = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : inst.st.a;
    const hx = p.x + Math.cos(a) * 38, hy = p.y + Math.sin(a) * 38;
    const { dmg, crit } = r20Roll(p, 18 + l * 7);
    world.spawnExplosion(hx, hy, R, P.holy, dmg, { knockback: 130, crit, status: l >= 5 ? { type: 'stun', dur: 0.45, chance: 0.35 } : undefined });
    world.particles.burst(hx, hy, 8, { speed: 110, color: [P.holyL, P.gold], size: 2.2, life: 0.3, glow: true });
  },
  levelDesc: (l) => `傷害 ${(18 + l * 7) | 0}・半徑 ${(34 + l * 4) | 0}${l >= 5 ? '・35% 暈眩' : ''}`,
  desc: '沉重的聖印戰錘繞身輪轉落下，重擊震退周圍敵人。',
  evolveInto: 'w_h4_judgment_evo', evolveReq: 'vitality',
});

// ===========================================================================
// 2) 迴時刃 — h4_chronomancer. A time-bent crescent blade thrown in an arc
//    that REWINDS back to the caster's hand, slicing everything both ways.
//    → 永劫迴環: a storm of returning loops that drag foes out of tempo (slow).
// ===========================================================================
function chronoFire(world, p, inst, { count, reach, base, dur }) {
  const tgt = r20NearestN(world, p.x, p.y, 1)[0];
  const baseA = tgt ? Math.atan2(tgt.y - p.y, tgt.x - p.x) : r20FaceA(p);
  inst.st.blades = inst.st.blades || [];
  for (let i = 0; i < count; i++) {
    const a = baseA + (count > 1 ? (i / (count - 1) - 0.5) * 0.6 : 0);
    const { dmg } = r20Roll(p, base);
    inst.st.blades.push({ x: p.x, y: p.y, a, t: 0, reach, dmg, dur, hits: new Map(), spin: 0 });
  }
  Sfx.play('shoot');
}
function chronoUpdate(world, p, inst, dt, { slowOnHit }) {
  const blades = inst.st.blades; if (!blades || !blades.length) return;
  for (let i = blades.length - 1; i >= 0; i--) {
    const b = blades[i];
    b.t += dt; b.spin += dt * 16;
    const k = Math.min(1, b.t / b.dur);
    const out = Math.sin(k * Math.PI) * b.reach;              // 0 → reach → 0 (out-and-back)
    if (k > 0.5) b.a = r20LerpAngle(b.a, Math.atan2(p.y - b.y, p.x - b.x), dt * 3.4);   // rewind home to the moving caster
    b.x = p.x + Math.cos(b.a) * out;
    b.y = p.y + Math.sin(b.a) * out;
    for (const e of world.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (e.radius + 9) * (e.radius + 9)) {
        const last = b.hits.get(e) || 0;
        if (world.time > last) {
          b.hits.set(e, world.time + 0.3 / (inst.fmHaste || 1));   // per-enemy re-hit gate — forge 疾速 applies
          const crit = Math.random() < Math.min(BALANCE.CRIT_CAP, p.stats.critChance || 0);
          e.hurt(b.dmg * (crit ? (p.stats.critMult || 2) : 1), Math.cos(b.a) * 22, Math.sin(b.a) * 22, world, crit);
          if (slowOnHit) applyStatus(e, 'slow', world, { dur: 1.6 });
        }
      }
    }
    if (b.t >= b.dur) blades.splice(i, 1);
  }
}
function chronoDraw(world, p, inst) {
  const blades = inst.st.blades; if (!blades) return;
  const sp = getSprite('r20_fx_chrono');
  for (const b of blades) { glowWorld(b.x, b.y, 7, P.neonL, 0.4, { deco: true }); drawSprite(sp.frames[0], b.x, b.y, { ax: sp.ax, ay: sp.ay, rot: b.spin }); }
}
W({
  id: 'w_h4_chronoblade', name: '迴時刃', icon: 'weapon_w_h4_chronoblade', tier: 2, weight: 7, maxLevel: 7,
  cooldown: (l) => Math.max(0.7, 1.35 - l * 0.08),
  fire(world, p, inst) { const l = inst.level; chronoFire(world, p, inst, { count: 1 + Math.floor(l / 2), reach: (72 + l * 10) * (p.stats.area || 1), base: 10 + l * 4, dur: 1.0 }); },
  update(world, p, inst, dt) { chronoUpdate(world, p, inst, dt, { slowOnHit: false }); },
  draw: chronoDraw,
  levelDesc: (l) => `刃 ${1 + Math.floor(l / 2)}・傷害 ${(10 + l * 4) | 0}・射程 ${(72 + l * 10) | 0}`,
  desc: '擲出逆轉時間的弦月刃，飛出後迴溯返航、往返雙向切割。',
  evolveInto: 'w_h4_chronoblade_evo', evolveReq: 'velocity',
});

// ===========================================================================
// 3) 提線傀儡 — h4_puppeteer. Deploys marionette mini-turrets that hang from
//    soul-threads and snipe nearby enemies. Update-driven — fmHaste applies
//    to the puppets' fire interval.
//    → 千絲傀儡王: a court of puppets with piercing needle volleys.
// ===========================================================================
function puppetUpdate(world, p, inst, dt, { interval, base, range, pierce, color }) {
  const ps = inst.st.puppets; if (!ps || !ps.length) return;
  for (let i = ps.length - 1; i >= 0; i--) {
    const t = ps[i];
    t.life -= dt; t.shoot -= dt; t.bob = (t.bob || 0) + dt * 3;
    if (t.life <= 0) { ps.splice(i, 1); continue; }
    if (t.shoot > 0) continue;
    // acquire: nearest live enemy in range with LOS from the puppet
    let best = null, bd = range * range;
    for (const e of world.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist2(t.x, t.y, e.x, e.y);
      if (d < bd && world.lineClear(t.x, t.y, e.x, e.y)) { bd = d; best = e; }
    }
    if (!best) { t.shoot = 0.15; continue; }                  // idle re-scan (cheap, fixed)
    t.shoot = interval / (inst.fmHaste || 1);                 // re-arm timer — forge 疾速 applies
    const a = Math.atan2(best.y - t.y, best.x - t.x);
    const { dmg, crit } = r20Roll(p, base);
    const sp = 240 * (p.stats.projSpeedMult || 1);
    world.addProjectile(new Projectile({ x: t.x, y: t.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, damage: dmg, crit, faction: 'player', sprite: 'bolt_void', color, pierce, knockback: 12, life: 0.9 }));
    Sfx.play('shoot');
  }
}
function puppetDraw(world, p, inst) {
  const ps = inst.st.puppets; if (!ps) return;
  const sp = getSprite('r20_fx_puppet');
  for (const t of ps) {
    const oy = Math.sin(t.bob || 0) * 1.5;
    glowWorld(t.x, t.y - 10 + oy, 4, P.sakura, 0.3, { deco: true });
    world.particles && Math.random() < 0.08 && world.particles.spawn({ x: t.x, y: t.y - 16 + oy, life: 0.3, size: 1.5, color: P.sakuraL, glow: true });
    drawSprite(sp.frames[0], t.x, t.y + oy, { ax: sp.ax, ay: sp.ay });
  }
}
W({
  id: 'w_h4_marionette', name: '提線傀儡', icon: 'weapon_w_h4_marionette', tier: 2, weight: 6, maxLevel: 7,
  cooldown: (l) => Math.max(1.4, 2.3 - l * 0.12),
  fire(world, p, inst) {
    const l = inst.level;
    inst.st.puppets = inst.st.puppets || [];
    const cap = 1 + Math.floor(l / 3);
    inst.st.puppets.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 30, life: 7, shoot: 0.2, bob: Math.random() * TAU });
    while (inst.st.puppets.length > cap) inst.st.puppets.shift();
    world.particles.ring(p.x, p.y, P.sakura, 8, 50);
  },
  update(world, p, inst, dt) { const l = inst.level; puppetUpdate(world, p, inst, dt, { interval: 0.55, base: 8 + l * 3, range: 180, pierce: 0, color: P.sakuraL }); },
  draw: puppetDraw,
  levelDesc: (l) => `傀儡 ${1 + Math.floor(l / 3)}・單發 ${(8 + l * 3) | 0}・射程 180`,
  desc: '以魂絲垂降提線傀儡砲台，自動狙擊靠近的敵人。',
  evolveInto: 'w_h4_marionette_evo', evolveReq: 'overload',
});

// ===========================================================================
// 4) 掘魂鐮 — h4_gravekeeper. A wide spectral scythe sweep across the facing
//    arc; the reaping edge tears wounds open (bleed).
//    → 萬魂收割: a full-circle harvest that always draws blood.
// ===========================================================================
function scytheFire(world, p, inst, { base, range, half, bleedChance, color }) {
  const dir = r20FaceA(p);
  const { dmg, crit } = r20Roll(p, base);
  let hits = 0;
  world.forEachNear(p.x, p.y, range, (e) => {
    if (e.dead || e.spawnT > 0) return;
    const rr = range + e.radius;
    if (dist2(p.x, p.y, e.x, e.y) >= rr * rr) return;
    const ea = Math.atan2(e.y - p.y, e.x - p.x);
    if (r20AngDiff(ea, dir) > half) return;
    e.hurt(dmg, Math.cos(ea) * 60, Math.sin(ea) * 60, world, crit);
    if (Math.random() < bleedChance) applyStatus(e, 'bleed', world, {});
    hits++;
  });
  // sweep visual: sparks along the arc edge
  const steps = half >= Math.PI ? 10 : 6;
  for (let i = 0; i <= steps; i++) {
    const a = dir - half + (i / steps) * half * 2;
    world.particles.spawn({ x: p.x + Math.cos(a) * range * 0.85, y: p.y + Math.sin(a) * range * 0.85, life: 0.2, size: 2.2, color: i % 2 ? color : P.white, glow: true });
  }
  if (hits) Sfx.play('crit'); else Sfx.play('shoot');
}
W({
  id: 'w_h4_gravescythe', name: '掘魂鐮', icon: 'weapon_w_h4_gravescythe', tier: 2, weight: 7, maxLevel: 7,
  cooldown: (l) => Math.max(0.55, 1.0 - l * 0.06),
  fire(world, p, inst) {
    const l = inst.level;
    scytheFire(world, p, inst, { base: 13 + l * 5, range: (46 + l * 5) * (p.stats.area || 1), half: l >= 4 ? 1.55 : 1.2, bleedChance: 0.35, color: P.aurora });
  },
  levelDesc: (l) => `傷害 ${(13 + l * 5) | 0}・距離 ${(46 + l * 5) | 0}・${l >= 4 ? '廣' : ''}弧 35% 流血`,
  desc: '朝行進方向揮出掘魂鐮的大弧斬，撕裂傷口使敵人流血。',
  evolveInto: 'w_h4_gravescythe_evo', evolveReq: 'lifesteal',
});

// ===========================================================================
// 5) 星隕呼喚 — h4_starcaller. Marks the ground beneath random nearby foes
//    with falling-star sigils; after a short telegraph, meteors strike.
//    → 隕星審判: a wider, hotter barrage that sets the impact zone ablaze.
// ===========================================================================
function starFire(world, p, inst, { strikes, R, base, fuse }) {
  // candidates: any live enemy within calling range (sky strikes ignore LOS)
  const cand = [];
  for (const e of world.enemies) { if (!e.dead && e.spawnT <= 0 && dist2(p.x, p.y, e.x, e.y) < 320 * 320) cand.push(e); }
  if (!cand.length) return;
  inst.st.strikes = inst.st.strikes || [];
  for (let i = 0; i < strikes; i++) {
    const e = cand[(Math.random() * cand.length) | 0];
    const { dmg, crit } = r20Roll(p, base);
    inst.st.strikes.push({ x: e.x + (Math.random() - 0.5) * 24, y: e.y + (Math.random() - 0.5) * 24, t: fuse, max: fuse, R, dmg, crit });
  }
  Sfx.play('shoot');
}
function starUpdate(world, p, inst, dt, { burn }) {
  const ss = inst.st.strikes; if (!ss || !ss.length) return;
  for (let i = ss.length - 1; i >= 0; i--) {
    const s = ss[i];
    s.t -= dt;                                                 // fixed fuse (telegraph), not a re-arm timer
    if (s.t > 0) continue;
    world.spawnExplosion(s.x, s.y, s.R, P.gold, s.dmg, { knockback: 90, crit: s.crit, status: burn ? { type: 'burn' } : undefined });
    ss.splice(i, 1);
  }
}
function starDraw(world, p, inst) {
  const ss = inst.st.strikes; if (!ss) return;
  for (const s of ss) {
    const k = 1 - s.t / s.max;                                 // telegraph fills toward impact
    fillCircleWorld(s.x, s.y, s.R, withAlpha(P.gold, 0.08));
    fillCircleWorld(s.x, s.y, s.R * k, withAlpha(P.emberL, 0.14));
    glowWorld(s.x, s.y, 4 + k * 5, P.goldL, 0.35 + k * 0.3, { deco: true });
    if (Math.random() < 0.3) world.particles.spawn({ x: s.x + (Math.random() - 0.5) * s.R, y: s.y - 20 - Math.random() * 16, life: 0.25, size: 2, color: P.goldL, glow: true, grav: 220 });
  }
}
W({
  id: 'w_h4_starfall', name: '星隕呼喚', icon: 'weapon_w_h4_starfall', tier: 2, weight: 6, maxLevel: 7,
  cooldown: (l) => Math.max(1.3, 2.4 - l * 0.15),
  fire(world, p, inst) { const l = inst.level; starFire(world, p, inst, { strikes: 1 + Math.floor(l / 2), R: (30 + l * 4) * (p.stats.area || 1), base: 16 + l * 6, fuse: 0.75 }); },
  update(world, p, inst, dt) { starUpdate(world, p, inst, dt, { burn: false }); },
  draw: starDraw,
  levelDesc: (l) => `隕星 ${1 + Math.floor(l / 2)}・傷害 ${(16 + l * 6) | 0}・半徑 ${(30 + l * 4) | 0}`,
  desc: '在敵群腳下刻畫星隕法陣，片刻後流星貫落轟擊。',
  evolveInto: 'w_h4_starfall_evo', evolveReq: 'bigshot',
});

// ===========================================================================
// 6) 劍刃圓舞 — h4_bladedancer. Spirit swords waltz around the dancer on a
//    breathing (pulsing) ring, slicing whatever steps into the dance.
//    Update-driven — per-enemy hit cooldowns divide by fmHaste.
//    → 千刃輪舞: twin counter-rotating rings of blades.
// ===========================================================================
function waltzRing(world, p, inst, { n, R, dmg, dir, phase }) {
  for (let i = 0; i < n; i++) {
    const a = (inst.st.a || 0) * dir + i / n * TAU + (phase || 0);
    const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
    for (const e of world.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      if (dist2(ox, oy, e.x, e.y) < (e.radius + 6) ** 2) {
        const last = inst.st.cd.get(e) || 0;
        if (world.time > last) {
          inst.st.cd.set(e, world.time + 0.24 / (inst.fmHaste || 1));   // per-enemy gate — forge 疾速 applies
          const crit = Math.random() < Math.min(BALANCE.CRIT_CAP, p.stats.critChance || 0);
          e.hurt(dmg * (crit ? (p.stats.critMult || 2) : 1), Math.cos(a) * 28, Math.sin(a) * 28, world, crit);
        }
      }
    }
  }
}
function waltzDrawRing(p, inst, { n, R, dir, phase }) {
  const sp = getSprite('r20_fx_waltz');
  for (let i = 0; i < n; i++) {
    const a = (inst.st.a || 0) * dir + i / n * TAU + (phase || 0);
    const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
    glowWorld(ox, oy, 6, P.sakuraL, 0.35, { deco: true });
    drawSprite(sp.frames[0], ox, oy, { ax: sp.ax, ay: sp.ay, rot: a * dir + Math.PI / 2 });
  }
}
function waltzR(inst, baseR) { return baseR + Math.sin((inst.st.a || 0) * 0.7) * 9; }   // the "waltz" breath
W({
  id: 'w_h4_bladewaltz', name: '劍刃圓舞', icon: 'weapon_w_h4_bladewaltz', tier: 2, weight: 7, maxLevel: 7,
  update(world, p, inst, dt) {
    const l = inst.level;
    inst.st.a = (inst.st.a || 0) + dt * 2.9;
    inst.st.cd = inst.st.cd || new WeakMap();                 // dead enemies GC out
    const base = (28 + l * 3) * (p.stats.area || 1);
    const dmg = (6 + l * 3.5) * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1);
    waltzRing(world, p, inst, { n: 2 + Math.floor(l * 0.6), R: waltzR(inst, base), dmg, dir: 1 });
  },
  draw(world, p, inst) {
    const l = inst.level, base = (28 + l * 3) * (p.stats.area || 1);
    waltzDrawRing(p, inst, { n: 2 + Math.floor(l * 0.6), R: waltzR(inst, base), dir: 1 });
  },
  levelDesc: (l) => `舞刃 ${2 + Math.floor(l * 0.6)}・傷害 ${(6 + l * 3.5) | 0}`,
  desc: '靈劍隨圓舞曲環身迴旋，舞步進退間切碎來敵。',
  evolveInto: 'w_h4_bladewaltz_evo', evolveReq: 'haste',
});

// ===========================================================================
// Evolutions (weight 0 + evolved → hidden from the random level-up pool)
// ===========================================================================
W({
  id: 'w_h4_judgment_evo', name: '黎明聖印', icon: 'weapon_w_h4_judgment_evo', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 1.1,
  fire(world, p, inst) {
    inst.st.a = (inst.st.a || 0) + 2.1;
    const R = 48 * (p.stats.area || 1);
    for (let i = 0; i < 3; i++) {                              // triple dawn-seal slams in a rotating triangle
      const a = inst.st.a + i / 3 * TAU;
      const hx = p.x + Math.cos(a) * 52, hy = p.y + Math.sin(a) * 52;
      const { dmg, crit } = r20Roll(p, 30);
      world.spawnExplosion(hx, hy, R, P.holy, dmg, { knockback: 140, crit, status: { type: 'knockup', chance: 0.5 } });
    }
  },
  desc: '【進化】三道黎明聖印環身輪轉砸落，聖光重錘將敵群擊上天際。',
});
W({
  id: 'w_h4_chronoblade_evo', name: '永劫迴環', icon: 'weapon_w_h4_chronoblade_evo', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 0.8,
  fire(world, p, inst) { chronoFire(world, p, inst, { count: 4, reach: 130 * (p.stats.area || 1), base: 26, dur: 1.15 }); },
  update(world, p, inst, dt) { chronoUpdate(world, p, inst, dt, { slowOnHit: true }); },
  draw: chronoDraw,
  desc: '【進化】無盡迴環的時之刃漫天往返，受創者被拖出時序而遲滯。',
});
W({
  id: 'w_h4_marionette_evo', name: '千絲傀儡王', icon: 'weapon_w_h4_marionette_evo', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 1.3,
  fire(world, p, inst) {
    inst.st.puppets = inst.st.puppets || [];
    inst.st.puppets.push({ x: p.x + (Math.random() - 0.5) * 40, y: p.y + (Math.random() - 0.5) * 40, life: 8, shoot: 0.15, bob: Math.random() * TAU });
    while (inst.st.puppets.length > 4) inst.st.puppets.shift();
    world.particles.ring(p.x, p.y, P.magenta, 10, 60);
  },
  update(world, p, inst, dt) { puppetUpdate(world, p, inst, dt, { interval: 0.32, base: 17, range: 220, pierce: 2, color: P.magentaL }); },
  draw: puppetDraw,
  desc: '【進化】傀儡王的宮廷垂絲而降，貫穿魂針的彈幕無人能近。',
});
W({
  id: 'w_h4_gravescythe_evo', name: '萬魂收割', icon: 'weapon_w_h4_gravescythe_evo', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 0.7,
  fire(world, p, inst) {
    scytheFire(world, p, inst, { base: 30, range: 78 * (p.stats.area || 1), half: Math.PI, bleedChance: 1, color: P.purpleL });
  },
  desc: '【進化】鐮光迴旋三百六十度的亡魂收割，每一刀都必定撕裂血創。',
});
W({
  id: 'w_h4_starfall_evo', name: '隕星審判', icon: 'weapon_w_h4_starfall_evo', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  cooldown: () => 1.0,
  fire(world, p, inst) { starFire(world, p, inst, { strikes: 4, R: 44 * (p.stats.area || 1), base: 32, fuse: 0.65 }); },
  update(world, p, inst, dt) { starUpdate(world, p, inst, dt, { burn: true }); },
  draw: starDraw,
  desc: '【進化】星空傾瀉審判隕雨，落點化作灼燒一切的燃星之海。',
});
W({
  id: 'w_h4_bladewaltz_evo', name: '千刃輪舞', icon: 'weapon_w_h4_bladewaltz_evo', tier: 3, weight: 0, maxLevel: 1, evolved: true,
  update(world, p, inst, dt) {
    inst.st.a = (inst.st.a || 0) + dt * 3.4;
    inst.st.cd = inst.st.cd || new WeakMap();
    const dmg = 17 * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1);
    const A = (p.stats.area || 1);
    waltzRing(world, p, inst, { n: 5, R: waltzR(inst, 52 * A), dmg, dir: 1 });               // outer ring
    waltzRing(world, p, inst, { n: 4, R: waltzR(inst, 28 * A), dmg, dir: -1, phase: 0.6 }); // inner counter-rotation
  },
  draw(world, p, inst) {
    const A = (p.stats.area || 1);
    waltzDrawRing(p, inst, { n: 5, R: waltzR(inst, 52 * A), dir: 1 });
    waltzDrawRing(p, inst, { n: 4, R: waltzR(inst, 28 * A), dir: -1, phase: 0.6 });
  },
  desc: '【進化】內外雙環千刃逆旋共舞，刀光織成無隙的圓舞死陣。',
});

// ===========================================================================
// FX sprites (eager bake — only depend on P, safe at import time)
// ===========================================================================
// chrono crescent — a clock-faced time chakram
defineSprite('r20_fx_chrono', 10, 10, (p) => {
  p.glow(5, 5, 3.5, P.neonL, 0.4, 3);
  p.ring(5, 5, 4, P.neonD);
  p.ring(5, 5, 3, P.neon);
  p.line(5, 5, 5, 2, P.white);     // clock hands
  p.line(5, 5, 7, 5, P.neonL);
  p.px(5, 5, P.white);
  p.outline(P.ink);
}, { anchor: [5, 5] });

// marionette puppet — a tiny doll hanging from a soul thread
defineSprite('r20_fx_puppet', 12, 16, (p) => {
  p.vline(0, 4, 6, withAlpha(P.sakuraL, 0.7));   // hanging thread
  p.hline(4, 8, 1, P.wood);                       // control bar
  p.ellipse(6, 7, 2, 2, P.bone);                  // head
  p.px(5, 7, P.ink); p.px(7, 7, P.ink);           // button eyes
  p.rect(4, 9, 5, 4, P.sakuraD);                  // dress body
  p.rect(4, 9, 5, 1, P.sakura);
  p.hline(3, 9, 13, P.sakura);                    // skirt hem
  p.px(2, 10, P.bone); p.px(10, 10, P.bone);      // arms
  p.glow(6, 7, 2.5, P.sakuraL, 0.3, 2);
  p.outline(P.ink);
}, { anchor: [6, 13] });

// waltz blade — a slender rose-tinted dancing sword
defineSprite('r20_fx_waltz', 8, 10, (p) => {
  p.glow(4, 5, 3, P.sakuraL, 0.35, 3);
  for (let y = 0; y < 8; y++) { const w = 0.5 + Math.min(y, 7 - y) * 0.4; p.hline(4 - w, 3 + w, y, y < 4 ? P.sakuraL : P.sakura); }
  p.vline(0, 7, 4, P.white);
  p.hline(2, 5, 8, P.gold);        // guard
  p.px(4, 9, P.goldD);             // pommel
  p.star4(4, 0, 2, P.sakuraL, P.white);
  p.outline(P.ink);
}, { anchor: [4, 5] });

// ===========================================================================
// Weapon icons — 16×16, defineIcon('weapon_<id>', bgHex, draw)
// ===========================================================================
// R28 W3-B-rework — ART_SPEC 第 5 節鐵律：類別文法只活在「框」上；glyph 必須畫出
// 「那一把武器本身」，同類別內任兩張輪廓不得雷同。base/evo 一律以第二層形狀分辨
// （加翼／加冠／加交叉刃／加外環），不是換色。已通過 FIX-2 驗收的
// w_h4_gravescythe_evo 的 draw body 保持原樣。

// 審判戰錘 — 一把長柄戰錘：斜置長木柄（纏皮＋柄尾配重）＋方塊錘頭，錘面鑄十字聖印。
defineIcon('weapon_w_h4_judgment', '#5a4a1a', (p) => {   // R28 B-rework
  p.glow(11, 5, 4, P.holy, 0.26, 3);
  p.line(3, 14, 9, 8, P.woodD); p.line(4, 14, 10, 8, P.wood);      // 長木柄
  p.line(3, 13, 9, 7, P.woodL);
  p.px(3, 14, P.goldD); p.px(4, 13, P.leather); p.px(6, 11, P.leather);
  p.rect(7, 7, 2, 2, P.iron); p.px(7, 7, P.gray4);                 // 柄頭接環
  p.rect(8, 2, 6, 6, P.goldD);                                     // 方塊錘頭
  p.rect(9, 3, 4, 4, P.gold);
  p.hline(8, 13, 2, P.goldL); p.vline(2, 7, 8, P.goldL);
  p.hline(8, 13, 7, darken(P.goldD, 0.4)); p.vline(3, 7, 13, darken(P.goldD, 0.25));
  p.rect(10, 3, 2, 5, P.holyL); p.rect(9, 4, 4, 2, P.holyL);       // 十字聖印
  p.px(9, 3, P.white);
});
// 黎明聖印（w_h4_judgment 的進化） — 第二層形狀：同一顆方錘頭，但兩側張開三層
// 羽翼、頂上加三尖光冕，柄縮短為懸浮姿態。base 沒有翼、沒有冠——形差不是色差。
defineIcon('weapon_w_h4_judgment_evo', '#6a4a10', (p) => {   // R28 B-rework
  p.glow(8, 6, 6, P.holy, 0.4, 4);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {           // 第二層①：雙翼
    const len = 4.6 - i * 1.2, y0 = 5 + i;
    p.line(8 + s * 2.4, y0, 8 + s * (2.4 + len), y0 + 2 + i, i ? P.goldD : P.gold);
    p.px(Math.round(8 + s * (2.4 + len)), Math.round(y0 + 2 + i), P.holyL);
  }
  p.line(4, 6, 8, 5, P.goldL); p.line(12, 6, 8, 5, P.goldL);       // 翼前緣受光
  p.line(6, 3, 6, 1, P.gold); p.line(8, 2, 8, 0, P.goldL); p.line(10, 3, 10, 1, P.gold);   // 第二層②：三尖光冕
  p.px(6, 1, P.white); p.px(8, 0, P.white); p.px(10, 1, P.white);
  p.rect(6, 4, 5, 5, P.goldD);                                     // 錘頭（與 base 同語彙）
  p.rect(7, 5, 3, 3, P.gold);
  p.hline(6, 10, 4, P.goldL); p.hline(6, 10, 8, darken(P.goldD, 0.4));
  p.rect(8, 5, 1, 4, P.holyL); p.rect(7, 6, 3, 1, P.holyL);        // 聖印
  p.vline(9, 13, 8, P.woodD); p.vline(9, 13, 7, P.wood);           // 短柄
  p.px(7, 5, P.white);
}, { kira: true });
// 迴時刃 — 一柄鐘錶指針做成的擲刃：柄尾是帶齒的樞紐齒輪，刃身是細長的鏟尖指針。
// （回力鏢家族的 g_boomer=∧、wc_boomerang=C，這裡是「樞紐＋鏟尖」，三者不撞形。）
defineIcon('weapon_w_h4_chronoblade', P.blueD, (p) => {   // R28 B-rework
  p.glow(9, 6, 4.5, P.neon, 0.28, 3);
  const t = -45 * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t);
  for (let k = 0; k <= 26; k++) {                                  // 鏟尖形指針刃
    const f = k / 26, r = 1.8 + f * 8.2;
    const cx = 4 + ct * r, cy = 12 + st * r;
    const hw = f < 0.5 ? 0.7 : Math.sin((f - 0.5) / 0.5 * Math.PI) * 2.2 + 0.45;
    for (let s = -hw; s <= hw; s += 0.4) p.px(Math.round(cx - st * s), Math.round(cy + ct * s), s < 0 ? P.neonL : P.neonD);
    p.px(Math.round(cx - st * hw), Math.round(cy + ct * hw), f > 0.6 ? P.white : P.neon);
  }
  for (let i = 0; i < 8; i++) {                                    // 樞紐齒輪的齒
    const a = i * Math.PI / 4;
    p.px(Math.round(4 + Math.cos(a) * 3.1), Math.round(12 + Math.sin(a) * 3.1), P.gray3);
  }
  p.ellipse(4, 12, 2.3, 2.3, P.iron); p.ellipse(4, 12, 1.3, 1.3, P.gray1);   // 樞紐環
  p.px(3, 11, P.gray4); p.px(4, 12, P.neonL);
  p.px(11, 5, P.white);
});
// 永劫迴環（w_h4_chronoblade 的進化） — 第二層形狀：base 是「單刃＋小樞紐」，
// evo 把兩柄指針刃交叉插在一枚大齒輪盤上，再加一圈刻度環。形差在「刃數＋外環」。
defineIcon('weapon_w_h4_chronoblade_evo', P.void, (p) => {   // R28 B-rework
  p.glow(8, 8, 6.5, P.astral, 0.34, 4);
  for (let i = 0; i < 12; i++) {                                   // 第二層②：外圈刻度環
    const a = i * Math.PI / 6;
    p.px(Math.round(8 + Math.cos(a) * 6.6), Math.round(8 + Math.sin(a) * 6.6), i % 3 ? withAlpha(P.neon, 0.7) : P.neonL);
    p.px(Math.round(8 + Math.cos(a) * 5.8), Math.round(8 + Math.sin(a) * 5.8), withAlpha(P.astral, 0.5));
  }
  for (const deg of [-38, 142, 38, -142]) {                        // 第二層①：四向交叉的指針刃
    const t = deg * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t);
    for (let k = 0; k <= 16; k++) {
      const f = k / 16, r = 2.2 + f * 4.4;
      const cx = 8 + ct * r, cy = 8 + st * r;
      const hw = f < 0.5 ? 0.6 : Math.sin((f - 0.5) / 0.5 * Math.PI) * 1.7 + 0.35;
      for (let s = -hw; s <= hw; s += 0.4) p.px(Math.round(cx - st * s), Math.round(cy + ct * s), s < 0 ? P.astralL : P.astral);
      p.px(Math.round(cx - st * hw), Math.round(cy + ct * hw), f > 0.7 ? P.white : P.neonL);
    }
  }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4; p.px(Math.round(8 + Math.cos(a) * 3.4), Math.round(8 + Math.sin(a) * 3.4), P.gray3); }
  p.ellipse(8, 8, 2.6, 2.6, P.iron); p.ellipse(8, 8, 1.5, 1.5, P.gray1);     // 大齒輪盤
  p.px(7, 7, P.gray4); p.px(8, 8, P.neonL);
}, { kira: true });
// 提線傀儡 — 一具吊線木偶：十字操縱桿＋四條魂絲＋窄身木偶（頭/軀/雙臂/雙腿）。
defineIcon('weapon_w_h4_marionette', '#4a2a3a', (p) => {   // R28 B-rework
  p.glow(8, 9, 4.5, P.sakura, 0.24, 3);
  p.hline(3, 12, 2, P.wood); p.hline(3, 12, 3, P.woodD);           // 十字操縱桿
  p.vline(1, 4, 8, P.woodL); p.px(3, 2, P.woodL);
  for (const x of [4, 6, 10, 12]) p.vline(4, 8, x, withAlpha(P.sakuraL, 0.75));   // 四條魂絲
  p.ellipse(8, 7, 1.9, 1.9, P.bone); p.px(7, 7, P.ink); p.px(9, 7, P.ink);   // 頭
  p.px(7, 6, P.white);
  p.rect(7, 9, 3, 3, P.sakuraD); p.hline(7, 9, 9, P.sakura);       // 窄軀幹
  p.line(6, 8, 4, 10, P.bone); p.line(10, 8, 12, 10, P.bone);      // 雙臂
  p.px(4, 10, P.woodL); p.px(12, 10, P.woodL);
  p.line(7, 12, 6, 14, P.bone); p.line(9, 12, 10, 14, P.bone);     // 雙腿
});
// 千絲傀儡王（w_h4_marionette 的進化） — 第二層形狀：base 是「窄身、無冠、四線」，
// evo 加上尖冠、梯形展開的披風下擺，兩側各吊一具小傀儡，絲線變成八條。形差在輪廓寬度。
defineIcon('weapon_w_h4_marionette_evo', '#3a1a3a', (p) => {   // R28 B-rework
  p.glow(8, 9, 6, P.magenta, 0.3, 4);
  for (let i = 0; i < 8; i++) p.vline(1, 5, 2 + i * 1.7, withAlpha(P.magentaL, 0.5));   // 千絲
  for (const s of [-1, 1]) {                                       // 第二層②：兩具側掛小傀儡
    p.vline(2, 6, 8 + s * 5, withAlpha(P.sakuraL, 0.7));
    p.ellipse(8 + s * 5, 7, 1.2, 1.2, P.bone); p.px(8 + s * 5, 7, P.ink2);
    p.rect(8 + s * 5 - 1, 8, 3, 2, P.purpleD); p.px(8 + s * 5, 8, P.magentaD);
  }
  p.line(6, 4, 6, 2, P.gold); p.line(8, 3, 8, 1, P.goldL); p.line(10, 4, 10, 2, P.gold);   // 第二層①：尖冠
  p.rect(6, 4, 5, 1, P.gold); p.px(8, 1, P.white);
  p.ellipse(8, 7, 2.2, 2.2, P.bone);                               // 王的頭
  p.px(7, 7, P.magenta); p.px(9, 7, P.magenta); p.px(7, 6, P.white);
  for (let y = 9; y <= 14; y++) {                                  // 第二層③：梯形展開的披風
    const w = 1.6 + (y - 9) * 0.9;
    p.hline(8 - w, 7 + w, y, P.purpleD);
    p.hline(8 - w, 8 - w + 1, y, P.purple);
  }
  p.hline(6, 9, 9, P.magenta); p.px(6, 10, P.magentaL);
}, { kira: true });
// 掘魂鐮 — 一柄單刃鐮刀：帶握把凸起的長彎柄＋一片寬大的魂綠彎刃。
// 進化版（下方，FIX-2 已驗收）以「交叉的第二把鐮＋亡魂光環」與它區分。
defineIcon('weapon_w_h4_gravescythe', '#1a3a2a', (p) => {   // R28 B-rework
  p.glow(10, 4, 4, P.aurora, 0.3, 3);
  p.line(3, 14, 8, 5, P.woodD); p.line(4, 14, 9, 5, P.wood);       // 長彎柄
  p.line(4, 13, 9, 4, P.woodL);
  p.rect(5, 10, 2, 2, P.leather); p.px(5, 10, P.woodL);            // 握把凸起
  for (let x = 5; x <= 13; x++) {                                  // 寬彎鐮刃
    const y = 3 + Math.round(Math.pow((x - 5) / 8, 2) * 4.5);
    p.px(x, y - 1, P.auroraL); p.px(x, y, P.aurora); p.px(x, y + 1, darken(P.aurora, 0.45));
  }
  p.px(13, 6, P.white); p.px(5, 2, P.white);                       // 刃尖與刃背高光
  p.px(6, 2, P.auroraL); p.px(9, 3, P.auroraL);
});
// 萬魂收割: paired reaper blades crossed in an X, wreathed by a soul halo
// R28 FIX-2: base+evo shared one blade silhouette, only recoloured (gate flagged
// as recolor-only, see docs/reviews/art-improve-2026-08/gate/GATE_REPORT.md) —
// evo now adds a second crossing blade + a soul-halo ring, per ART_SPEC 第 5 節.
defineIcon('weapon_w_h4_gravescythe_evo', '#241a3a', (p) => {
  p.glow(8, 8, 6, P.purple, 0.4, 4);
  p.line(5, 13, 9, 4, P.woodD);                  // primary snath
  for (let x = 5; x <= 12; x++) { const y = 3 + Math.round(Math.pow((x - 5) / 7, 2) * 4); p.px(x, y, P.purpleL); p.px(x, y + 1, P.purple); }   // primary soul blade
  // 第二層：交叉的副鐮，反向弧線在下方展開，與主鐮形成 X 形輪廓
  p.line(11, 13, 7, 4, P.woodD);                 // secondary snath, opposite diagonal
  for (let x = 4; x <= 11; x++) { const y = 13 - Math.round(Math.pow((x - 4) / 7, 2) * 4); p.px(x, y, withAlpha(P.manaL, 0.9)); p.px(x, y - 1, withAlpha(P.mana, 0.75)); }   // secondary soul blade
  p.ring(8, 8, 5.5, withAlpha(P.purpleL, 0.4)); // 亡魂環繞行光環
  p.ellipse(2, 8, 1.3, 1.3, P.mana);             // orbiting souls riding the halo
  p.ellipse(13, 8, 1.3, 1.3, P.mana);
  p.px(2, 7, P.white); p.px(13, 7, P.white);
  p.px(12, 7, P.white);
  p.star4(8, 3, 2, P.purpleL, P.white);
}, { kira: true });   // R28 B-rework: draw body 保持 FIX-2 原樣，僅依 tier 3 補上 kira
// 星隕呼喚 — 一顆帶尾焰的隕石正砸向地面刻好的「單環」符文法陣（斜視角橢圓）。
defineIcon('weapon_w_h4_starfall', '#2a2a5a', (p) => {   // R28 B-rework
  p.glow(9, 5, 4.5, P.gold, 0.28, 3);
  p.ellipse(8, 11, 5, 1.9, '#141030');                             // 先挖暗盤，法陣才是「環」不是「餅」
  for (let a = 0; a < TAU; a += 0.05) {                            // 地面符文法陣（單環＋內圈）
    p.px(Math.round(8 + Math.cos(a) * 5.6), Math.round(11 + Math.sin(a) * 2.3), Math.sin(a) < 0 ? P.astralL : P.astral);
    p.px(Math.round(8 + Math.cos(a) * 3.4), Math.round(11 + Math.sin(a) * 1.3), withAlpha(P.mana, 0.85));
  }
  for (let i = 0; i < 6; i++) {                                    // 連接內外圈的符文刻痕
    const a = i * TAU / 6 + 0.3;
    p.line(8 + Math.cos(a) * 3.5, 11 + Math.sin(a) * 1.4, 8 + Math.cos(a) * 5.3, 11 + Math.sin(a) * 2.2, withAlpha(P.manaL, 0.8));
  }
  p.line(13, 1, 10, 4, withAlpha(P.goldL, 0.45));                  // 尾焰
  p.line(12, 1, 9, 4, P.emberL); p.line(12, 2, 9, 5, P.ember);
  p.ellipse(8, 6.4, 2, 2, P.ember);                                // 隕石本體
  p.ellipse(7.6, 6, 1.2, 1.2, P.goldL); p.px(7, 6, P.white);
  p.px(8, 8, withAlpha(P.emberL, 0.6));
});
// 隕星審判（w_h4_starfall 的進化） — 第二層形狀：base 是「單顆隕石＋單環法陣」，
// evo 改成三顆齊落＋法陣長出五根尖角變成星形雙環＋地面燃燒帶。形差不是換色。
defineIcon('weapon_w_h4_starfall_evo', '#4a1a1a', (p) => {   // R28 B-rework
  p.glow(8, 11, 6, P.ember, 0.3, 4);
  p.ellipse(8, 11.5, 5, 1.9, '#20090c');                           // 陣內暗盤
  for (let i = 0; i < 5; i++) {                                    // 第二層①：五根外突尖角（base 是單純圓環）
    const a = -TAU / 4 + i * TAU / 5;
    p.line(8 + Math.cos(a) * 5.6, 11.5 + Math.sin(a) * 2.3, 8 + Math.cos(a) * 7.4, 11.5 + Math.sin(a) * 3.1, P.emberL);
  }
  for (let a = 0; a < TAU; a += 0.05) {                            // 第二層②：雙環（base 只有單環）
    p.px(Math.round(8 + Math.cos(a) * 5.6), Math.round(11.5 + Math.sin(a) * 2.3), Math.sin(a) > 0 ? P.laser : darken(P.redD, 0.2));
    p.px(Math.round(8 + Math.cos(a) * 3.6), Math.round(11.5 + Math.sin(a) * 1.4), withAlpha(P.ember, 0.8));
  }
  const meteor = (cx, cy, r) => {                                  // 第二層③：三顆齊落（base 只有一顆）
    p.ellipse(cx, cy, r + 0.9, r + 0.9, '#2a0c08');                // 暗底把隕石從火光背景分開
    p.line(cx + 2.4, cy - 3, cx + 0.6, cy - 1, withAlpha(P.emberL, 0.6));
    p.ellipse(cx, cy, r, r, P.ember); p.ellipse(cx - 0.3, cy - 0.3, r - 0.8, r - 0.8, P.goldL);
    p.px(Math.round(cx), Math.round(cy), P.white);
  };
  meteor(4, 6, 1.8); meteor(9, 3.5, 2); meteor(12.5, 7, 1.6);
}, { kira: true });
// 劍刃圓舞 — 一柄細身直劍：斜置劍身＋蝶形護手＋圓頭柄，一條舞帶螺旋纏繞劍身。
// 這是全套裡唯一的「單柄直劍」；進化版才變成環繞的刃陣。
defineIcon('weapon_w_h4_bladewaltz', '#4a2438', (p) => {   // R28 B-rework
  p.glow(11, 5, 4, P.sakura, 0.28, 3);
  p.line(5, 12, 13, 3, P.steel);                                   // 劍身（三線寬）
  p.line(4, 11, 12, 2, P.steelL);
  p.line(6, 13, 13, 4, P.steelD);
  p.px(13, 3, P.white); p.px(12, 2, P.glint);                      // 劍尖
  p.line(2, 11, 6, 14, P.goldD); p.line(2, 10, 6, 13, P.gold);     // 蝶形護手
  p.px(2, 10, P.goldL); p.px(6, 13, P.goldL);
  p.line(4, 12, 2, 14, P.leather);                                 // 握柄
  p.ellipse(2, 14, 1.2, 1.2, P.goldD); p.px(2, 14, P.gold);        // 圓頭柄
  for (let i = 0; i < 3; i++) {                                    // 螺旋舞帶
    const t = 0.28 + i * 0.24;
    const bx = 5 + (13 - 5) * t, by = 12 - (12 - 3) * t;
    p.px(Math.round(bx - 2), Math.round(by - 1), P.sakura);
    p.px(Math.round(bx + 2), Math.round(by + 1), P.sakuraL);
    p.px(Math.round(bx - 1), Math.round(by - 2), P.sakuraD);
  }
});
// 千刃輪舞（w_h4_bladewaltz 的進化） — 第二層形狀：base 是「一柄直劍」，
// evo 是內外雙環共十二柄劍逆旋（外環八柄朝外、內環四柄朝內）＋中央玫瑰核。
defineIcon('weapon_w_h4_bladewaltz_evo', '#3a1430', (p) => {   // R28 B-rework
  p.glow(8, 8, 6.5, P.magenta, 0.34, 4);
  for (let i = 0; i < 8; i++) {                                    // 外環：八柄朝外的劍
    const a = i / 8 * TAU + 0.2;
    const c = Math.cos(a), s = Math.sin(a);
    p.line(8 + c * 3.6, 8 + s * 3.6, 8 + c * 6.6, 8 + s * 6.6, i % 2 ? P.steelL : P.sakuraL);
    p.line(8 + c * 3.6 - s * 0.8, 8 + s * 3.6 + c * 0.8, 8 + c * 5.6 - s * 0.8, 8 + s * 5.6 + c * 0.8, P.steelD);
    p.px(Math.round(8 + c * 4), Math.round(8 + s * 4), P.gold);    // 護手
    p.px(Math.round(8 + c * 6.6), Math.round(8 + s * 6.6), P.white);
  }
  for (let i = 0; i < 4; i++) {                                    // 內環：四柄朝內的劍（逆旋）
    const a = i / 4 * TAU - 0.5;
    const c = Math.cos(a), s = Math.sin(a);
    p.line(8 + c * 3.4, 8 + s * 3.4, 8 + c * 1.4, 8 + s * 1.4, P.sakuraD);
    p.px(Math.round(8 + c * 1.4), Math.round(8 + s * 1.4), P.sakuraL);
  }
  p.ellipse(8, 8, 1.7, 1.7, P.magentaD);                           // 中央玫瑰核
  p.ellipse(8, 8, 1, 1, P.magenta); p.px(8, 8, P.white);
}, { kira: true });

export const WEAPONS_R20_READY = true;
