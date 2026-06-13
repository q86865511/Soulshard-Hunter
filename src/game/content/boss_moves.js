// R20/B6 — data-driven boss moves: named attack patterns beyond the bullet spray.
// enemy.js calls bossMoveTick(e, world, dt) once per frame for bosses; while a move is
// active it OWNS the body (movement + its own hit checks) and normal AI is skipped.
//
// Co-op stays byte-compatible: every telegraph goes through world.addBeam (the `bm`
// snapshot channel) and the wall_cage pillars are ordinary enemy entities (`en` channel).
// No tile is ever mutated (guests render the map from the one-shot runstart snapshot).
//
// Wiring lives HERE (WIRE map, looked up lazily by boss id) instead of on the defs —
// gen-file boss defs survive a re-run of tools/integrate.mjs untouched.
import { Enemies } from './registry.js';
import { BALANCE } from '../balance.js';
import { applyStatus } from '../status.js';
import { addShake } from '../../engine/renderer.js';
import { dist, clamp, TAU } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx } from '../../engine/audio.js';

// which bosses know which moves (finals get 2 thematic moves; the 3 dedicated
// miniboss-pool bosses get 1). A final-boss def drawn as another biome's miniboss
// keeps its kit — that's a feature, minibosses got scarier too.
const WIRE = {
  g_plagueheart: ['wall_cage', 'shock_lines'],
  g_stormtyrant: ['leap_slam', 'charge_combo'],
  b2_glacierseer: ['wall_cage', 'shock_lines'],
  b2_emberlord: ['leap_slam', 'shock_lines'],
  b2_voidweaver: ['wall_cage', 'charge_combo'],
  b3_thornking: ['wall_cage', 'leap_slam'],
  b3_sandpharaoh: ['shock_lines', 'wall_cage'],
  b3_bogmaw: ['leap_slam', 'shock_lines'],
  b3_leviathan: ['charge_combo', 'leap_slam'],
  b3_seraphjudge: ['shock_lines', 'charge_combo'],
  g_voidsovereign: ['shock_lines'],
  g_magmacolossus: ['leap_slam'],
  g_frostmonarch: ['wall_cage'],
};

const nearest = (world, x, y) => (world.nearestPlayer ? world.nearestPlayer(x, y) : world.player);
const eachPlayer = (world) => world.players || [world.player];

// circle telegraph as beam segments → renders host-side AND syncs to co-op guests
function beamRing(world, x, y, r, color) {
  const N = 10;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
    world.addBeam(x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r, color);
  }
}

// move = { cd, minPhase, start(e,world)->state|null, tick(e,world,dt,st)->done? }
export const BOSS_MOVES = {
  // 跳躍重砸: crouch telegraph → airborne arc onto the player → AoE slam + knockup.
  leap_slam: {
    cd: 9, minPhase: 0,
    start(e, world) {
      const p = nearest(world, e.x, e.y);
      if (!p || p.dead) return null;
      world.particles.text(e.x, e.y - e.radius * e.scale - 10, '蓄力跳躍！', { color: P.emberL, size: 12, weight: '800' });
      return { ph: 'crouch', t: 0.5, tel: 0 };
    },
    tick(e, world, dt, st) {
      st.t -= dt;
      if (st.ph === 'crouch') {
        e.vx = e.vy = 0;
        if ((st.tel -= dt) <= 0) { st.tel = 0.07; world.particles.ring(e.x, e.y, e.tint || P.emberL, 6, 40); }
        if (st.t <= 0) {
          const p = nearest(world, e.x, e.y);
          if (!p || p.dead) return true;
          st.ph = 'air'; st.t = BALANCE.BOSSMOVE_SLAM_AIR;
          st.sx = e.x; st.sy = e.y; st.tx = p.x; st.ty = p.y;   // landing spot locks at takeoff — dodge during the air time
          e.iframe = BALANCE.BOSSMOVE_SLAM_AIR + 0.05;
          Sfx.play('boss');
        }
        return false;
      }
      // airborne: ground position lerps to the target, hop lifts the sprite (shadow stays grounded)
      const k = clamp(1 - st.t / BALANCE.BOSSMOVE_SLAM_AIR, 0, 1);
      e.x = st.sx + (st.tx - st.sx) * k; e.y = st.sy + (st.ty - st.sy) * k;
      e.mvLift = Math.sin(Math.PI * k) * 46;
      e.vx = e.vy = 0;
      if ((st.tel -= dt) <= 0) { st.tel = 0.09; beamRing(world, st.tx, st.ty, BALANCE.BOSSMOVE_SLAM_RADIUS, withAlpha(P.redL, 0.5)); }
      if (st.t <= 0) {
        e.mvLift = 0;
        const R = BALANCE.BOSSMOVE_SLAM_RADIUS, dmg = e.damage * BALANCE.BOSSMOVE_SLAM_DMG_MULT;
        world.spawnExplosion(st.tx, st.ty, R, e.tint || P.emberL, 0);   // visual only — the slam must not friendly-fire the swarm
        for (const p of eachPlayer(world)) {
          if (!p || p.dead) continue;
          if (dist(p.x, p.y, st.tx, st.ty) < R + p.radius) { p.takeDamage(dmg, Math.atan2(p.y - st.ty, p.x - st.tx), world); applyStatus(p, 'knockup', world); }
        }
        addShake(8); Sfx.play('boss');
        return true;
      }
      return false;
    },
  },

  // 魂柱囚籠: cast → ring of destructible boss_pillar entities around the player
  // (one random gap). Pillars block ONLY players (enemies phase walls by design).
  wall_cage: {
    cd: 13, minPhase: 1,
    start(e, world) {
      const p = nearest(world, e.x, e.y);
      if (!p || p.dead) return null;
      world.particles.text(e.x, e.y - e.radius * e.scale - 10, '魂柱囚籠！', { color: P.purpleL, size: 12, weight: '800' });
      return { ph: 'cast', t: 0.8, tel: 0, px: p.x, py: p.y };
    },
    tick(e, world, dt, st) {
      st.t -= dt; e.vx = e.vy = 0;
      const p = nearest(world, e.x, e.y);
      if (p && !p.dead) { st.px = p.x; st.py = p.y; }       // track until the slam-down
      if ((st.tel -= dt) <= 0) { st.tel = 0.09; beamRing(world, st.px, st.py, BALANCE.BOSSMOVE_PILLAR_RING, withAlpha(P.purpleL, 0.45)); }
      if (st.t > 0) return false;
      const N = BALANCE.BOSSMOVE_PILLAR_COUNT, R = BALANCE.BOSSMOVE_PILLAR_RING;
      const gap = (Math.random() * N) | 0;                   // one slot stays open — find it or break one
      const th = (world.run && world.run.stage) || 1;
      for (let i = 0; i < N; i++) {
        if (i === gap) continue;
        const a = (i / N) * TAU;
        const x = st.px + Math.cos(a) * R, y = st.py + Math.sin(a) * R;
        if (x < 12 || y < 12 || x > world.pxW - 12 || y > world.pxH - 12 || world.solidAt(x, y)) continue;
        world.spawnEnemy('boss_pillar', x, y, { hpScale: 1 + th * 0.12, quiet: true });
      }
      addShake(6); Sfx.play('boss');
      return true;
    },
  },

  // 三連衝撞: telegraphed dash ×3 (beam line each), brief vulnerable recovery after.
  charge_combo: {
    cd: 11, minPhase: 0,
    start(e, world) {
      const p = nearest(world, e.x, e.y);
      if (!p || p.dead) return null;
      world.particles.text(e.x, e.y - e.radius * e.scale - 10, '連續衝撞！', { color: P.redL, size: 12, weight: '800' });
      return { ph: 'tel', t: 0.35, n: 3, tel: 0 };
    },
    tick(e, world, dt, st) {
      if (st.ph === 'tel') {
        e.vx = e.vy = 0; st.t -= dt;
        const pl = nearest(world, e.x, e.y);
        if (pl && !pl.dead) st.a = Math.atan2(pl.y - e.y, pl.x - e.x);   // aim tracks during the telegraph
        if (st.a !== undefined && (st.tel -= dt) <= 0) {
          st.tel = 0.08;
          const L = BALANCE.BOSSMOVE_CHARGE_SPEED * BALANCE.BOSSMOVE_CHARGE_TIME;
          world.addBeam(e.x, e.y, e.x + Math.cos(st.a) * L, e.y + Math.sin(st.a) * L, withAlpha(P.redL, 0.5));
        }
        if (st.t <= 0) {
          if (st.a === undefined) return true;
          st.ph = 'dash'; st.t = BALANCE.BOSSMOVE_CHARGE_TIME; st.hitSet = new Set(); Sfx.play('boss');
        }
        return false;
      }
      if (st.ph === 'dash') {
        st.t -= dt;
        const sp = BALANCE.BOSSMOVE_CHARGE_SPEED;
        world.moveActor(e, Math.cos(st.a) * sp * dt, Math.sin(st.a) * sp * dt);
        e.facing = Math.cos(st.a) < 0 ? -1 : 1;
        world.particles.burst(e.x, e.y, 2, { color: [e.tint || P.redL], speed: 20, size: 2, life: 0.2 });
        const dmg = e.damage * BALANCE.BOSSMOVE_CHARGE_DMG_MULT;
        for (const p of eachPlayer(world)) {
          if (!p || p.dead || st.hitSet.has(p)) continue;   // once per dash per player
          if (dist(p.x, p.y, e.x, e.y) < e.radius * e.scale * 0.8 + p.radius) { p.takeDamage(dmg, st.a, world); st.hitSet.add(p); }
        }
        if (st.t <= 0) {
          st.n--;
          if (st.n > 0) { st.ph = 'tel'; st.t = 0.32; }
          else { st.ph = 'rec'; st.t = 0.7; }               // punish window
        }
        return false;
      }
      e.vx = e.vy = 0; st.t -= dt;                           // recovery: stand vulnerable
      return st.t <= 0;
    },
  },

  // 地裂衝擊波: cast → 4+phase radial damage fronts march outward along beams. Sidestep.
  shock_lines: {
    cd: 10, minPhase: 0,
    start(e, world) {
      const p = nearest(world, e.x, e.y);
      if (!p || p.dead) return null;
      const n = BALANCE.BOSSMOVE_SHOCK_RAYS + e.phase, off = Math.random() * TAU;
      const rays = [];
      for (let i = 0; i < n; i++) rays.push({ a: off + (i / n) * TAU, hitSet: new Set() });
      world.particles.text(e.x, e.y - e.radius * e.scale - 10, '地裂衝擊！', { color: P.emberL, size: 12, weight: '800' });
      return { ph: 'cast', t: 0.6, rays, d: 14, tel: 0 };
    },
    tick(e, world, dt, st) {
      e.vx = e.vy = 0;
      if (st.ph === 'cast') {
        st.t -= dt;
        if ((st.tel -= dt) <= 0) {
          st.tel = 0.08;
          for (const r of st.rays) world.addBeam(e.x + Math.cos(r.a) * 14, e.y + Math.sin(r.a) * 14, e.x + Math.cos(r.a) * 60, e.y + Math.sin(r.a) * 60, withAlpha(P.emberL, 0.4));
        }
        if (st.t <= 0) { st.ph = 'wave'; Sfx.play('boss'); addShake(5); }
        return false;
      }
      const d0 = st.d; st.d += BALANCE.BOSSMOVE_SHOCK_SPEED * dt;
      const dmg = e.damage * BALANCE.BOSSMOVE_SHOCK_DMG_MULT;
      for (const r of st.rays) {
        const x = e.x + Math.cos(r.a) * st.d, y = e.y + Math.sin(r.a) * st.d;
        world.addBeam(e.x + Math.cos(r.a) * d0, e.y + Math.sin(r.a) * d0, x, y, withAlpha(P.emberL, 0.6));
        world.particles.burst(x, y, 2, { color: [P.emberL, P.ember], speed: 30, size: 2, life: 0.25, glow: true });
        for (const p of eachPlayer(world)) {
          if (!p || p.dead || r.hitSet.has(p)) continue;     // once per ray per player
          if (dist(p.x, p.y, x, y) < 15 + p.radius) { p.takeDamage(dmg, r.a, world); r.hitSet.add(p); }
        }
      }
      return st.d >= BALANCE.BOSSMOVE_SHOCK_REACH;
    },
  },
};

// ── scheduler — called from enemy.update for every boss, every frame ─────────
// Returns true while a move owns the body this frame (enemy.update then returns).
export function bossMoveTick(e, world, dt) {
  const moves = WIRE[e.id] || e.def.bossMoves;   // central WIRE first; def.bossMoves works for future hand-written defs
  if (!moves || !moves.length) return false;
  if (e.mv) {
    const def = BOSS_MOVES[e.mv.id];
    if (!def || def.tick(e, world, dt, e.mv)) e.mv = null;
    return true;                                  // the ending frame still counts as owned
  }
  e.mvCd = (e.mvCd === undefined ? BALANCE.BOSSMOVE_FIRST_CD : e.mvCd) - dt;
  if (e.mvCd > 0) return false;
  const pool = moves.filter((id) => BOSS_MOVES[id] && e.phase >= (BOSS_MOVES[id].minPhase || 0));
  if (!pool.length) { e.mvCd = 3; return false; }
  const id = pool[(Math.random() * pool.length) | 0];
  const st = BOSS_MOVES[id].start(e, world);
  if (!st) { e.mvCd = 2; return false; }
  e.mv = { id, ...st };
  e.mvCd = (BOSS_MOVES[id].cd || 8) * BALANCE.BOSSMOVE_CD_MULT;
  return true;
}

// ── 魂晶巨柱 — the wall_cage pillar ──────────────────────────────────────────
// Ordinary enemy entity (syncs to guests via the `en` channel; destructible for
// counterplay). tier 9 + weight 0 keeps it out of every normal spawn pool.
// def.tick (generic enemy.js hook) drives lifetime + the players-only body block.
Enemies.register({
  id: 'boss_pillar', name: '魂晶巨柱', sprite: 'boss_pillar', ai: 'chase', tier: 9, weight: 0,
  hp: BALANCE.BOSSMOVE_PILLAR_HP, speed: 0, damage: 0, radius: 7, xp: 2, gold: 2, shard: 0,
  bloodColor: P.purpleL, tint: null, knockbackResist: 0.95,
  desc: 'Boss 召出的魂晶囚柱——敵人穿行無阻，你過不去。找缺口，或者砸開一根。',
  tick(e, world, dt) {
    e.pillarLife = (e.pillarLife === undefined ? BALANCE.BOSSMOVE_PILLAR_LIFE : e.pillarLife) - dt;
    if (e.pillarLife <= 0) {
      e.dead = true; e.processed = true;          // silent crumble — no loot, no kill count
      world.particles.burst(e.x, e.y, 10, { color: [P.purpleL, P.purple], speed: 70, size: 2.2, life: 0.4, glow: true });
      return;
    }
    e.vx = e.vy = 0;
    // circle push-out: blocks PLAYERS only (via moveActor so they can't be shoved into walls)
    for (const p of eachPlayer(world)) {
      if (!p || p.dead) continue;
      const dx = p.x - e.x, dy = p.y - e.y, rr = e.radius + p.radius + 1;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2);
        world.moveActor(p, (dx / d) * (rr - d), (dy / d) * (rr - d));
      }
    }
  },
});
