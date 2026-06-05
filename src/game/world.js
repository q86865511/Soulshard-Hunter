// The in-run world: tilemap collision + all entities + combat resolution.
import { Particles } from '../engine/particles.js';
import { Enemies, Equipment, Items } from './content/registry.js';
import { equipItem } from './content/equipment.js';
import { Enemy } from './enemy.js';
import { Pickup } from './pickup.js';
import { drawSprite, fillRectWorld, fillCircleWorld, glowWorld, lineWorld, camera, view, worldToScreen, addShake } from '../engine/renderer.js';
import { getSprite, frameAt, hasSprite } from '../engine/sprites.js';
import { circleHit, dist, dist2, clamp, rng, TAU } from '../engine/math.js';
import { P, withAlpha } from '../engine/palette.js';
import { Sfx } from '../engine/audio.js';
import { BALANCE } from './balance.js';

export const TS = 16; // tile size (world units)
export const FLOOR = 0, WALL = 1, VOID = 2;

// Trap terrain definitions. Hazards damage BOTH player and enemies (neutral).
// Continuous kinds tick on `interval`; periodic kinds telegraph then strike.
const HAZ = {
  lava:   { dmg: 9,  interval: 0.5, color: P.ember,  grav: -22 },
  poison: { dmg: 5,  interval: 0.6, color: P.poison, grav: -6 },
  thorns: { dmg: 7,  interval: 0.7, color: P.greenL, grav: 0 },
  spikes: { dmg: 15, cycle: 1.5, activeTime: 0.5, color: P.steelL, periodic: true, grav: 0 },
};

export class World {
  constructor(run) {
    this.run = run;
    this.tw = 0; this.th = 0;
    this.tiles = new Uint8Array(0);
    this.floorVar = new Uint8Array(0);
    this.decor = [];          // {sprite,x,y,anim}
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.beams = [];        // transient lightning/laser visuals
    this.hazards = [];      // trap-terrain zones (lava/spikes/poison/thorns)
    this.particles = new Particles();
    this.player = null;
    this.time = 0;
    // scene hooks
    this.onLevelUp = null; this.onEnemyKilled = null; this.onCollectGold = null;
  }

  loadMap(map) {
    this.tw = map.tw; this.th = map.th;
    this.tiles = map.tiles;
    this.floorVar = map.floorVar || new Uint8Array(this.tw * this.th);
    this.decor = map.decor || [];
    this.tileset = map.tileset || { floor: ['floor', 'floor2', 'floor_crack'], wall: 'wall', wallTop: 'wall_top' };
    this.biome = map.biome || null;
    this.pxW = this.tw * TS; this.pxH = this.th * TS;
    this.hazards = (map.hazards || []).map((h) => ({ ...h, tick: Math.random() * 1.0, on: !(HAZ[h.kind] && HAZ[h.kind].periodic) }));
  }

  // ---- tile helpers --------------------------------------------------------
  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.tw && ty < this.th; }
  tileAt(tx, ty) { return this.inBounds(tx, ty) ? this.tiles[ty * this.tw + tx] : WALL; }
  solidTile(tx, ty) { return this.tileAt(tx, ty) !== FLOOR; }
  solidAt(wx, wy) { return this.solidTile(Math.floor(wx / TS), Math.floor(wy / TS)); }

  lineClear(x0, y0, x1, y1) {
    const steps = Math.ceil(dist(x0, y0, x1, y1) / 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
    }
    return true;
  }

  // axis-separated AABB vs solid tiles. e treated as a box of half-size = radius.
  moveActor(e, dx, dy) {
    const r = e.radius;
    // X
    e.x += dx;
    if (dx !== 0) {
      const y0 = Math.floor((e.y - r) / TS), y1 = Math.floor((e.y + r) / TS);
      if (dx > 0) {
        const tx = Math.floor((e.x + r) / TS);
        for (let ty = y0; ty <= y1; ty++) if (this.solidTile(tx, ty)) { e.x = tx * TS - r - 0.01; e.vx = 0; break; }
      } else {
        const tx = Math.floor((e.x - r) / TS);
        for (let ty = y0; ty <= y1; ty++) if (this.solidTile(tx, ty)) { e.x = (tx + 1) * TS + r + 0.01; e.vx = 0; break; }
      }
    }
    // Y
    e.y += dy;
    if (dy !== 0) {
      const x0 = Math.floor((e.x - r) / TS), x1 = Math.floor((e.x + r) / TS);
      if (dy > 0) {
        const ty = Math.floor((e.y + r) / TS);
        for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) { e.y = ty * TS - r - 0.01; e.vy = 0; break; }
      } else {
        const ty = Math.floor((e.y - r) / TS);
        for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) { e.y = (ty + 1) * TS + r + 0.01; e.vy = 0; break; }
      }
    }
  }

  randomFloorTile(rngSrc = rng) {
    for (let tries = 0; tries < 200; tries++) {
      const tx = rngSrc.int(1, this.tw - 2), ty = rngSrc.int(1, this.th - 2);
      if (!this.solidTile(tx, ty)) return { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS };
    }
    return { x: this.pxW / 2, y: this.pxH / 2 };
  }

  // ---- spawning ------------------------------------------------------------
  spawnEnemy(defOrId, x, y, opts = {}) {
    const def = typeof defOrId === 'string' ? Enemies.get(defOrId) : defOrId;
    if (!def) { console.warn('unknown enemy', defOrId); return null; }
    const e = new Enemy(def, x, y, this, opts);
    this.enemies.push(e);
    if (!opts.quiet) this.particles.ring(x, y, def.tint || P.purpleL, 8, 50);
    return e;
  }
  // spawn just outside the camera view around the player (continuous spawning)
  spawnRing(defOrId, opts = {}) {
    const p = this.player; if (!p) return null;
    const viewR = Math.max(view.W, view.H) / 2 / camera.zoom + 24;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU, r = viewR + Math.random() * 50;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (x < TS * 1.2 || y < TS * 1.2 || x > this.pxW - TS * 1.2 || y > this.pxH - TS * 1.2) continue;
      if (!this.solidAt(x, y)) return this.spawnEnemy(defOrId, x, y, { ...opts, quiet: true });
    }
    const t = this.randomFloorTile(rng);
    return this.spawnEnemy(defOrId, t.x, t.y, { ...opts, quiet: true });
  }
  addProjectile(p) { this.projectiles.push(p); }
  addPickup(type, x, y, value = 1, opts = {}) { this.pickups.push(new Pickup({ type, x, y, value, ...opts })); }
  addBeam(x0, y0, x1, y1, color = P.emberL) { this.beams.push({ x0, y0, x1, y1, color, life: 0.14, max: 0.14 }); }

  dropLoot(e) {
    const floor = this.run.floor || 1;
    const gMul = this.player?.stats?.goldMult ?? 1;
    let gold = Math.round((e.gold || 0) * (1 + floor * 0.08) * gMul * BALANCE.GOLD_DROP_MULT);
    // scatter into a few coins
    let coins = clamp(Math.round(gold / 3), 1, 5);
    for (let i = 0; i < coins; i++) this.addPickup('gold', e.x, e.y, Math.ceil(gold / coins));
    if (e.xp > 0) this.addPickup('xp', e.x, e.y, Math.round(e.xp * (this.player?.stats?.xpMult ?? 1)));
    const luck = this.player?.stats?.luck ?? 0;
    const dropM = BALANCE.DROP_CHANCE_MULT;
    if (e.shard && Math.random() < e.shard * (1 + luck) * BALANCE.SHARD_DROP_MULT) this.addPickup('shard', e.x, e.y, e.boss ? 5 : 1);
    if (Math.random() < (e.boss ? 1 : (0.03 + luck * 0.03) * dropM)) this.addPickup('heart', e.x, e.y, e.boss ? 30 : 15);

    const dq = this.run.dropQuality || 0;
    if (e.boss) {
      const d = this.rollEquipment(2 + dq); if (d) this.addPickup('equip', e.x, e.y, 1, { def: d });
      for (let i = 0; i < 5; i++) this.addPickup('shard', e.x, e.y, 3);
    } else if (Math.random() < (0.02 + luck * 0.03 + dq * 0.012) * dropM) {
      const d = this.rollEquipment(1 + dq); if (d) this.addPickup('equip', e.x, e.y, 1, { def: d });
    } else if (Math.random() < (0.05 + luck * 0.03) * dropM) {
      const d = this.rollItem(1 + dq); if (d) this.addPickup('item', e.x, e.y, 1, { def: d });
    }
  }

  collect(type, payload, x, y) {
    const run = this.run;
    switch (type) {
      case 'gold': run.gold += payload; run.goldEarned += payload; this.particles.text(x, y - 8, '+' + payload, { color: P.goldL, size: 11, weight: '800' }); Sfx.play('coin'); if (this.onCollectGold) this.onCollectGold(payload); break;
      case 'shard': run.shards += payload; this.particles.text(x, y - 8, '魂晶+' + payload, { color: P.shardL, size: 12 }); Sfx.play('shard'); break;
      case 'heart': this.player.heal(payload); this.particles.text(x, y - 10, '+' + payload, { color: P.redL, size: 12 }); Sfx.play('heart'); break;
      case 'xp': this.gainXp(payload); break;
      case 'item':
        if ((run.inventory.length) < 6) { run.inventory.push(payload.id); this.particles.text(x, y - 12, '獲得 ' + payload.name, { color: P.shardL, size: 12 }); Sfx.play('pickup'); }
        else this.particles.text(x, y - 12, '背包已滿', { color: P.redL, size: 12 });
        break;
      case 'equip':
        equipItem(this.player, run, payload);
        this.particles.text(x, y - 12, '裝備 ' + payload.name, { color: P.goldL, size: 13, weight: '800' });
        this.particles.ring(x, y, P.goldL, 14, 80);
        Sfx.play('equip');
        break;
    }
  }

  // ---- loot rolls & chests -------------------------------------------------
  rollEquipment(quality = 1) {
    const tierCap = Math.min(3, 1 + quality + (Math.random() < 0.3 ? 1 : 0));
    const pool = Equipment.upTo(tierCap).filter((d) => d.slot !== 'weapon'); // weapons come from level-ups now
    return pool.length ? rng.weighted(pool, (d) => (d.weight ?? 1)) : null;
  }
  rollItem(quality = 1) {
    const tierCap = Math.min(3, 1 + quality);
    const pool = Items.upTo(tierCap);
    return pool.length ? rng.weighted(pool, (d) => (d.weight ?? 1)) : null;
  }
  openChest(x, y, quality = 1) {
    this.particles.burst(x, y, 16, { color: [P.goldL, P.gold, '#fff'], speed: 70, size: 2.2, life: 0.5, glow: true });
    const roll = Math.random();
    if (roll < 0.55) { const d = this.rollEquipment(quality); if (d) { this.addPickup('equip', x, y, 1, { def: d, pop: 0 }); return; } }
    if (roll < 0.85) { const d = this.rollItem(quality); if (d) { this.addPickup('item', x, y, 1, { def: d, pop: 0 }); return; } }
    for (let i = 0; i < 3; i++) this.addPickup('shard', x, y, 2);
  }

  useItem(index) {
    const run = this.run;
    const id = run.inventory[index];
    if (!id) return;
    const def = Items.get(id);
    if (!def) { run.inventory.splice(index, 1); return; }
    try { if (def.use(this, this.player, run)) run.inventory.splice(index, 1); }
    catch (e) { console.warn('item use failed', id, e); }
  }

  gainXp(v) {
    const run = this.run;
    run.xp += v;
    while (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = Math.round(run.xpNext * 1.18 + 5);
      this.particles.ring(this.player.x, this.player.y, P.manaL, 16, 90);
      this.particles.text(this.player.x, this.player.y - 18, 'LEVEL UP!', { color: P.manaL, size: 15, life: 1 });
      Sfx.play('levelup');
      if (this.onLevelUp) this.onLevelUp();
    }
  }

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.time += dt;
    // Attack tempo ramps slow -> fast over the run (both sides start sluggish and
    // speed up). Player + enemy fire intervals are divided by these.
    const rt = (this.run && this.run.time) || this.time;
    this.playerTempo = clamp(0.72 + rt / 240 * 0.55, 0.72, 1.28);
    this.enemyTempo = clamp(0.60 + rt / 210 * 0.68, 0.60, 1.30);
    if (this.player && !this.player.dead) this.player.update(dt, this);

    for (const e of this.enemies) e.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const pk of this.pickups) pk.update(dt, this);

    this.resolveCombat();
    if (this.hazards.length) this.updateHazards(dt);

    // process enemy deaths
    for (const e of this.enemies) {
      if (e.dead && !e.processed) {
        e.processed = true;
        this.particles.death(e.x, e.y, e.def.bloodColor || P.green);
        Sfx.play('kill');
        if (e.def.deathBlast) this.bombBlast(e);
        this.dropLoot(e);
        this.run.kills = (this.run.kills || 0) + 1;
        if (this.player) for (const h of this.player.hooks.kill) h(e, this);
        if (this.onEnemyKilled) this.onEnemyKilled(e);
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);
    for (let i = this.beams.length - 1; i >= 0; i--) { this.beams[i].life -= dt; if (this.beams[i].life <= 0) this.beams.splice(i, 1); }
    this.particles.update(dt);
  }

  resolveCombat() {
    const player = this.player;
    for (const p of this.projectiles) {
      if (p.dead) continue;
      if (p.faction === 'player') {
        for (const e of this.enemies) {
          if (e.dead || e.spawnT > 0 || p.hitSet.has(e)) continue;
          if (circleHit(p.x, p.y, p.radius, e.x, e.y, e.radius * (e.scale * 0.7 + 0.3))) {
            const ang = Math.atan2(p.vy, p.vx);
            e.hurt(p.damage, Math.cos(ang) * p.knockback, Math.sin(ang) * p.knockback, this, p.crit);
            p.hitSet.add(e);
            this.particles.hit(p.x, p.y, ang + Math.PI, p.color);
            const ls = Math.min(BALANCE.LIFESTEAL_CAP, (player?.stats.lifesteal ?? 0) * BALANCE.LIFESTEAL_MULT);
            if (player && ls > 0) player.heal(p.damage * ls);
            if (p.onHit) p.onHit(e, this);
            if (player) for (const h of player.hooks.hit) h(e, p.damage, this);
            if (p.pierce > 0) p.pierce--; else { p.dead = true; break; }
          }
        }
      } else if (player && !player.dead) {
        if (circleHit(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
          player.takeDamage(p.damage, Math.atan2(p.vy, p.vx), this);
          if (p.pierce > 0) p.pierce--; else p.dead = true;
        }
      }
    }
  }

  enemiesAlive() { return this.enemies.length; }

  // area damage to enemies (used by abilities, explosions, bosses)
  dealAreaDamage(x, y, radius, damage, opts = {}) {
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const rr = radius + e.radius;
      if (dist2(x, y, e.x, e.y) < rr * rr) {
        const ang = Math.atan2(e.y - y, e.x - x);
        const kb = opts.knockback ?? 40;
        e.hurt(damage, Math.cos(ang) * kb, Math.sin(ang) * kb, this, opts.crit);
        hits++;
      }
    }
    return hits;
  }

  // an enemy with def.deathBlast detonates when it dies, hurting the PLAYER too
  bombBlast(e) {
    const b = e.def.deathBlast || {};
    const r = b.r || 42, dmg = b.dmg || Math.round((e.damage || 10) * 1.6), color = b.color || P.ember;
    this.spawnExplosion(e.x, e.y, r, color, dmg * 0.7, { knockback: 90 });   // visual + hurt other enemies
    const p = this.player;
    if (p && !p.dead && dist(p.x, p.y, e.x, e.y) < r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - e.y, p.x - e.x), this);
  }

  spawnExplosion(x, y, radius, color = P.ember, damage = 0, opts = {}) {
    this.particles.ring(x, y, color, 18, radius * 7);
    this.particles.burst(x, y, 14, { speed: radius * 6, color: [color, '#ffffff'], size: 2.6, life: 0.4, glow: true });
    addShake(Math.min(6, radius * 0.2));
    Sfx.play('explosion');
    if (damage > 0) this.dealAreaDamage(x, y, radius, damage, opts);
  }

  nearestEnemy(x, y, maxDist = Infinity) {
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---- trap terrain --------------------------------------------------------
  updateHazards(dt) {
    for (const h of this.hazards) {
      const def = HAZ[h.kind] || HAZ.lava;
      h.tick -= dt;
      if (def.periodic) {
        if (h.tick <= 0) { h.on = !h.on; h.tick = h.on ? def.activeTime : def.cycle; if (h.on) this.hazardStrike(h, def); }
      } else if (h.tick <= 0) { h.tick = def.interval; this.hazardStrike(h, def); }
    }
  }
  hazardStrike(h, def) {
    const p = this.player;
    const dmg = def.dmg * BALANCE.TRAP_DMG_MULT * Math.min(2.2, 1 + (this.threat || 0) * 0.08);   // scales with threat, capped
    if (p && !p.dead && dist(p.x, p.y, h.x, h.y) < h.r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - h.y, p.x - h.x), this);
    for (const e of this.enemies) { if (e.dead || e.spawnT > 0) continue; if (dist(e.x, e.y, h.x, h.y) < h.r + e.radius) e.hurt(dmg * 0.8, 0, 0, this, false); }
    this.particles.ring(h.x, h.y, def.color, 7, h.r * 3.5);
  }
  drawHazards() {
    for (const h of this.hazards) {
      const def = HAZ[h.kind] || HAZ.lava;
      const active = def.periodic ? h.on : true;
      const spr = 'hz_' + (h.kind === 'poison' ? 'poisonpool' : h.kind);
      if (hasSprite(spr)) {
        const sp = getSprite(spr);
        for (let yy = h.y - h.r; yy <= h.y + h.r; yy += TS) for (let xx = h.x - h.r; xx <= h.x + h.r; xx += TS)
          if (dist(xx, yy, h.x, h.y) <= h.r) drawSprite(frameAt(sp, this.time, (xx + yy) | 0), Math.floor(xx / TS) * TS, Math.floor(yy / TS) * TS, { ax: 0, ay: 0, alpha: active ? 1 : 0.5 });
      } else {
        fillCircleWorld(h.x, h.y, h.r, withAlpha(def.color, active ? 0.16 : 0.05));
      }
      glowWorld(h.x, h.y, h.r * 0.9, def.color, active ? 0.2 : 0.07);
      if (active && Math.random() < 0.3) { const a = Math.random() * TAU, rr = Math.random() * h.r; this.particles.spawn({ x: h.x + Math.cos(a) * rr, y: h.y + Math.sin(a) * rr, life: 0.4, size: 2, color: def.color, glow: true, grav: def.grav }); }
    }
  }

  // ---- draw ----------------------------------------------------------------
  drawTiles() {
    const z = camera.zoom;
    const halfW = view.W / 2 / z, halfH = view.H / 2 / z;
    const x0 = clamp(Math.floor((camera.x - halfW) / TS) - 1, 0, this.tw - 1);
    const x1 = clamp(Math.ceil((camera.x + halfW) / TS) + 1, 0, this.tw - 1);
    const y0 = clamp(Math.floor((camera.y - halfH) / TS) - 1, 0, this.th - 1);
    const y1 = clamp(Math.ceil((camera.y + halfH) / TS) + 1, 0, this.th - 1);
    const ts = this.tileset;
    const floorSprites = ts.floor.map((n) => getSprite(n));
    const wallSp = getSprite(ts.wall);
    const topSp = getSprite(ts.wallTop);
    // floors
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.tileAt(tx, ty) === FLOOR) {
        const v = this.floorVar[ty * this.tw + tx] || 0;
        drawSprite(floorSprites[v].frames[0], tx * TS, ty * TS, { ax: 0, ay: 0 });
      }
    }
    // walls + front faces
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.tileAt(tx, ty) === WALL) {
        drawSprite(wallSp.frames[0], tx * TS, ty * TS, { ax: 0, ay: 0 });
        if (this.tileAt(tx, ty + 1) === FLOOR) drawSprite(topSp.frames[0], tx * TS, (ty + 1) * TS, { ax: 0, ay: 0 });
      }
    }
  }

  draw() {
    this.drawTiles();
    this.drawHazards();
    // decor (torches etc.)
    for (const d of this.decor) {
      const sp = getSprite(d.sprite);
      drawSprite(frameAt(sp, this.time, d.phase || 0), d.x, d.y, { ax: sp.ax, ay: sp.ay });
    }
    // depth-sorted actors
    const drawables = [];
    for (const pk of this.pickups) drawables.push(pk);
    for (const e of this.enemies) drawables.push(e);
    if (this.player && !this.player.dead) drawables.push(this.player);
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(this);
    // projectiles above actors
    for (const p of this.projectiles) p.draw();
    // beams (lightning / lasers)
    for (const b of this.beams) {
      const a = Math.max(0, b.life / b.max);
      lineWorld(b.x0, b.y0, b.x1, b.y1, withAlpha('#ffffff', a), 3);
      lineWorld(b.x0, b.y0, b.x1, b.y1, withAlpha(b.color, a * 0.8), 1.5);
    }
    // particles
    this.particles.draw();
  }
}

// ---------------------------------------------------------------------------
// Simple arena map (used before full dungeon generation lands).
export function makeArena(tw = 34, th = 22, rngSrc = rng) {
  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    floorVar[y * tw + x] = rngSrc.next() < 0.12 ? (rngSrc.next() < 0.5 ? 1 : 2) : 0;
  }
  // a few pillars
  const pillars = [[8, 6], [tw - 9, 6], [8, th - 7], [tw - 9, th - 7], [Math.floor(tw / 2), Math.floor(th / 2)]];
  for (const [px, py] of pillars) {
    tiles[py * tw + px] = WALL; tiles[py * tw + px + 1] = WALL;
    tiles[(py + 1) * tw + px] = WALL; tiles[(py + 1) * tw + px + 1] = WALL;
  }
  const decor = [
    { sprite: 'torch', x: 2.5 * TS, y: 1.9 * TS, phase: 0 },
    { sprite: 'torch', x: (tw - 2.5) * TS, y: 1.9 * TS, phase: 1 },
  ];
  return { tw, th, tiles, floorVar, decor };
}

// A cozy walkable town for the hub.
export function makeCamp(tw = 34, th = 22, rngSrc = rng) {
  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    floorVar[y * tw + x] = rngSrc.next() < 0.10 ? (rngSrc.next() < 0.5 ? 1 : 2) : 0;
  }
  const cx = (tw / 2) * TS;
  const decor = [
    { sprite: 'campfire', x: cx, y: (th - 4) * TS, phase: 0 },
    { sprite: 'hub_well', x: cx - 5 * TS, y: (th - 3) * TS },
    { sprite: 'hub_house', x: 6 * TS, y: 4 * TS },
    { sprite: 'hub_house', x: (tw - 6) * TS, y: 4 * TS },
    { sprite: 'npc_smith', x: (tw - 9) * TS, y: 12 * TS, phase: 0 },
    { sprite: 'hub_lamp', x: 4 * TS, y: (th - 4) * TS, phase: 0 },
    { sprite: 'hub_lamp', x: (tw - 4) * TS, y: (th - 4) * TS, phase: 1 },
    { sprite: 'torch', x: 2.5 * TS, y: 1.9 * TS, phase: 0 },
    { sprite: 'torch', x: (tw - 2.5) * TS, y: 1.9 * TS, phase: 1 },
    { sprite: 'hub_banner', x: cx - 3 * TS, y: 1.4 * TS },
    { sprite: 'hub_banner', x: cx + 3 * TS, y: 1.4 * TS },
  ];
  return { tw, th, tiles, floorVar, decor };
}
