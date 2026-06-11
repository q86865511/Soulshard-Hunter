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
import { applyStatus } from './status.js';
import { META } from './state.js';
import { isUnlocked } from './content/unlocks.js';

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
    this.keys = 0;   // #8: keys dropped by room guardians, spent to open locked vault chests
    this.beams = [];        // transient lightning/laser visuals
    this.hazards = [];      // trap-terrain zones (lava/spikes/poison/thorns)
    this.particles = new Particles();
    this.player = null;          // the LOCAL keyboard-controlled player (single-player + co-op host's own avatar)
    this.players = [];           // co-op: [localPlayer, ...remoteAvatars]; single-player: [player]
    this.inputFor = null;        // co-op host sets this: (player) => netInputFrame | undefined (undefined = read keyboard)
    this.time = 0;
    this._grid = new Map();         // uniform spatial grid of alive enemies (broadphase; rebuilt per update)
    this._gridCell = TS * 4;        // 64px cells
    this._curSrc = null;    // 原#16: damage-attribution scope (set around weapon/ability calls)
    // scene hooks
    this.onLevelUp = null; this.onEnemyKilled = null; this.onCollectGold = null; this.onEquipPickup = null;
  }

  // ---- player set (single-player + co-op share these helpers) --------------
  // The effective player list. Single-player code that only ever set `this.player`
  // still works: we fall back to [player] so nearest/each/spawn all behave identically.
  _playerSet() { return this.players.length ? this.players : (this.player ? [this.player] : []); }
  eachPlayer(cb) { for (const p of this._playerSet()) if (p) cb(p); }
  alivePlayers() { return this._playerSet().filter((p) => p && !p.dead); }
  anyPlayerAlive() { return this._playerSet().some((p) => p && !p.dead); }
  // closest LIVING player to (x,y); falls back to the local player so AI always has a ref.
  nearestPlayer(x, y) {
    let best = null, bd = Infinity;
    for (const p of this._playerSet()) { if (!p || p.dead) continue; const d = dist2(x, y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
    return best || (this.player && !this.player.dead ? this.player : (this.alivePlayers()[0] || null));
  }
  randomPlayer() { const a = this.alivePlayers(); return a.length ? a[(Math.random() * a.length) | 0] : (this.player || null); }

  // 原#16: accumulate damage dealt by a named source (weapon/ability/etc.) for the
  // end-of-run damage ranking. Called from enemy.hurt + status DoT.
  attributeDamage(src, dmg) {
    if (!src || !this.run || !(dmg > 0)) return;
    const m = this.run.dmgBySource || (this.run.dmgBySource = {});
    m[src] = (m[src] || 0) + dmg;
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
    // R20/B2: opt-in town extras — all null on the 10 run biomes (no behavioral change there).
    this.triggers = map.triggers || [];            // [{tx,ty,target}] — consumed by hub.js (B3)
    this.block = null;                             // Uint8Array of player-only decor collision (solid props)
    this.wallDepth = null;                         // Uint8Array depth 0..2 for the banded-wall fill
    this._buildWallDepth();
    this._buildBlockGrid();
  }

  // R20/B2: multi-source BFS — depth = min #WALL-steps from any FLOOR tile, clamped 0..2.
  // FLOOR/VOID stay 0. Only built when the tileset opts in via `wallBands` (town); skipped on runs.
  _buildWallDepth() {
    const ts = this.tileset;
    if (!ts || !ts.wallBands) return;
    const tw = this.tw, th = this.th, n = tw * th;
    const depth = new Uint8Array(n);   // default 0 (FLOOR/VOID and band-0 walls)
    const seen = new Uint8Array(n);
    let frontier = [];
    for (let i = 0; i < n; i++) if (this.tiles[i] === FLOOR) { seen[i] = 1; frontier.push(i); }   // sources
    let d = 0;
    while (frontier.length && d < 2) {
      d++;
      const next = [];
      for (const i of frontier) {
        const x = i % tw, y = (i / tw) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue;
          const ni = ny * tw + nx;
          if (seen[ni] || this.tiles[ni] !== WALL) continue;   // only spread across WALL tiles
          seen[ni] = 1; depth[ni] = d; next.push(ni);
        }
      }
      frontier = next;
    }
    // remaining unseen WALL tiles are deep interior → clamp to band 2
    for (let i = 0; i < n; i++) if (this.tiles[i] === WALL && !seen[i]) depth[i] = 2;
    this.wallDepth = depth;
  }

  // R20/B2: player-only solid grid from decor entries flagged `solid` (1 = anchor tile,
  // 2 = anchor + one tile left & right). Anchor tile = floor(x/TS),floor(y/TS) (feet pixel).
  // No solid decor → this.block stays null → zero change for runs/co-op (enemies phase walls anyway).
  _buildBlockGrid() {
    const tw = this.tw, th = this.th;
    let block = null;
    for (const d of this.decor) {
      if (!d.solid) continue;
      const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS);
      if (tx < 0 || ty < 0 || tx >= tw || ty >= th) continue;
      if (!block) block = new Uint8Array(tw * th);
      block[ty * tw + tx] = 1;
      if (d.solid === 2) {
        if (tx - 1 >= 0) block[ty * tw + (tx - 1)] = 1;
        if (tx + 1 < tw) block[ty * tw + (tx + 1)] = 1;
      }
    }
    this.block = block;
  }

  // ---- tile helpers --------------------------------------------------------
  inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.tw && ty < this.th; }
  tileAt(tx, ty) { return this.inBounds(tx, ty) ? this.tiles[ty * this.tw + tx] : WALL; }
  // R20/B2: solid if the tile isn't FLOOR, OR a solid decor prop blocks it (player-only — enemies
  // use phaseWalls in moveActor so they're unaffected). this.block is null off-town → unchanged.
  solidTile(tx, ty) { return this.tileAt(tx, ty) !== FLOOR || !!(this.block && this.inBounds(tx, ty) && this.block[ty * this.tw + tx]); }
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
    // 10.8: wall-phasing actors (enemies/bosses) ignore solid tiles entirely — they beeline to
    // the player and never get stuck on walls. Still clamped inside the map so they can't fly off.
    if (e.phaseWalls) {
      e.x = Math.max(r, Math.min(this.pxW - r, e.x + dx));
      e.y = Math.max(r, Math.min(this.pxH - r, e.y + dy));
      return;
    }
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
    if (opts.volatile && Math.random() < opts.volatile) e.deathBlast = { r: 34, dmg: Math.round((e.damage || 10) * 1.2), color: P.laser };   // R18/B9 m_volatile: per-instance death explosion
    this.enemies.push(e);
    if (!opts.quiet) this.particles.ring(x, y, def.tint || P.purpleL, 8, 50);
    return e;
  }
  // spawn just outside the camera view around the player (continuous spawning)
  spawnRing(defOrId, opts = {}) {
    const p = this.randomPlayer(); if (!p) return null;   // co-op: spawn around a random living player so the swarm reaches everyone
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
  addProjectile(p) { if (!p.src) p.src = this._curSrc; this.projectiles.push(p); }   // 原#16: stamp damage source
  addPickup(type, x, y, value = 1, opts = {}) { this.pickups.push(new Pickup({ type, x, y, value, ...opts })); }
  addBeam(x0, y0, x1, y1, color = P.emberL) { this.beams.push({ x0, y0, x1, y1, color, life: 0.14, max: 0.14 }); }

  dropLoot(e) {
    if (e.guardian) { this.addPickup('key', e.x, e.y, 1); this.addPickup('chest', e.x, e.y, 2); }   // #8: room guardian → key + chest
    const floor = this.run.floor || 1;
    const lp = this.nearestPlayer(e.x, e.y) || this.player;   // co-op: scale loot off whoever's nearest the kill
    const gMul = Math.min(lp?.stats?.goldMult ?? 1, BALANCE.GOLD_MULT_CAP);   // 9.1: cap stacked gold builds
    let gold = Math.round((e.gold || 0) * (1 + floor * 0.08) * gMul * BALANCE.GOLD_DROP_MULT);
    // scatter into a few coins
    let coins = clamp(Math.round(gold / 3), 1, 5);
    for (let i = 0; i < coins; i++) this.addPickup('gold', e.x, e.y, Math.ceil(gold / coins));
    if (e.xp > 0) this.addPickup('xp', e.x, e.y, Math.round(e.xp * (lp?.stats?.xpMult ?? 1)));
    const luck = lp?.stats?.luck ?? 0;
    const dropM = BALANCE.DROP_CHANCE_MULT;
    const sMul = lp?.stats?.shardMult ?? 1;   // wire the (previously inert) shard-income stat into the payload
    if (e.shard && Math.random() < e.shard * (1 + luck) * BALANCE.SHARD_DROP_MULT) this.addPickup('shard', e.x, e.y, Math.max(1, Math.floor((e.boss ? 5 : 1) * sMul + Math.random())));   // stochastic round so fractional shardMult carries instead of rounding away
    else if (!e.boss && Math.random() < BALANCE.MOB_SHARD_BASE * (1 + luck * 0.5)) this.addPickup('shard', e.x, e.y, Math.max(1, Math.floor(sMul + Math.random())));   // 原#4: small mobs also drop shards
    if (Math.random() < (e.boss ? 1 : (0.03 + luck * 0.03) * dropM)) this.addPickup('heart', e.x, e.y, e.boss ? 30 : 15);
    // 原#11: a slain thief coughs up everything it stole from you
    if (e.stolenGold > 0) this.addPickup('gold', e.x, e.y, e.stolenGold);
    if (e.stolenXp > 0) this.addPickup('xp', e.x, e.y, e.stolenXp);

    const dq = this.run.dropQuality || 0;
    if (e.boss) {
      const d = this.rollEquipment(2 + dq); if (d) this.addPickup('equip', e.x, e.y, 1, { def: d });
      for (let i = 0; i < 5; i++) this.addPickup('shard', e.x, e.y, 3);
    } else if (Math.random() < (0.02 + luck * 0.03 + dq * 0.012) * dropM * BALANCE.GEAR_DROP_MULT) {   // 10.5: lower mob gear drop (boss gear above is untouched)
      const d = this.rollEquipment(1 + dq); if (d) this.addPickup('equip', e.x, e.y, 1, { def: d });
    } else if (Math.random() < (0.05 + luck * 0.03) * dropM) {
      const d = this.rollItem(1 + dq); if (d) this.addPickup('item', e.x, e.y, 1, { def: d });
    }
  }

  collect(type, payload, x, y, collector = null) {
    const run = this.run;
    const who = collector || this.player;   // co-op: the player who grabbed it (hearts heal them)
    // 4.2 + R16 #6: persistent recent-pickup log (meaningful grabs only — currency/xp are too noisy).
    // Each entry carries an icon + effect text (for hover) and, for timed potions, a ref to the live
    // buff so the HUD can show the remaining seconds. e = { name, desc, color, icon?, emoji?, buff? }.
    const logPick = (e) => { (run.pickupLog = run.pickupLog || []).push({ t: run.time || 0, ...e }); if (run.pickupLog.length > 12) run.pickupLog.shift(); };
    switch (type) {
      case 'gold': run.gold += payload; run.goldEarned += payload; this.particles.text(x, y - 8, '+' + payload, { color: P.goldL, size: 11, weight: '800' }); Sfx.play('coin'); if (this.onCollectGold) this.onCollectGold(payload); break;
      case 'shard': run.shards += payload; this.particles.text(x, y - 8, '魂晶+' + payload, { color: P.shardL, size: 12 }); Sfx.play('shard'); break;
      case 'heart': if (who) who.heal(payload); this.particles.text(x, y - 10, '+' + payload, { color: P.redL, size: 12 }); Sfx.play('heart'); break;
      case 'xp': this.gainXp(payload); break;
      case 'key': this.keys = (this.keys || 0) + (payload || 1); this.particles.text(x, y - 10, '🔑 鑰匙 +' + (payload || 1), { color: P.goldL, size: 12, weight: '800' }); logPick({ name: '鑰匙', desc: '用於開啟封鎖的寶庫寶箱。', color: P.goldL, emoji: '🔑' }); Sfx.play('shard'); break;
      case 'item': {   // B2: ground items are used the instant they're picked up (no storage)
        const def = payload;
        const tgt = who || this.player;
        this.particles.text(x, y - 12, def.name, { color: P.shardL, size: 12, weight: '800' });
        if (def.desc) this.particles.text(x, y - 24, def.desc, { color: P.gray4, size: 10 });
        const beforeBuffs = (tgt.timedBuffs || []).length;
        try { def.use && def.use(this, tgt, run); } catch (e) { /* */ }
        // if the item started a timed buff, link it so the log can show the live countdown (#6)
        const buff = (tgt.timedBuffs && tgt.timedBuffs.length > beforeBuffs) ? tgt.timedBuffs[tgt.timedBuffs.length - 1] : null;
        logPick({ name: def.name, desc: def.desc || '', color: P.shardL, icon: def.icon, buff });
        Sfx.play('pickup');
        break;
      }
      case 'equip':    // B1: open a paused choose-to-equip menu (falls back to auto-equip; co-op auto-equips the grabber)
        if (payload && payload.name) logPick({ name: payload.name, desc: payload.desc || '', color: P.goldL, icon: payload.icon });
        if (this.onEquipPickup) this.onEquipPickup(payload);
        else equipItem(who || this.player, run, payload, !who || who === this.player);   // a remote grabber gets the gear but doesn't clobber the host's run record
        this.particles.ring(x, y, P.goldL, 14, 80);
        Sfx.play('equip');
        break;
    }
  }

  // ---- loot rolls & chests -------------------------------------------------
  rollEquipment(quality = 1) {
    const tierCap = Math.min(3, 1 + quality + (Math.random() < 0.3 ? 1 : 0));
    const pool = Equipment.upTo(tierCap).filter((d) => d.slot !== 'weapon' && isUnlocked(META, 'equipment', d.id)); // weapons come from level-ups now
    return pool.length ? rng.weighted(pool, (d) => (d.weight ?? 1)) : null;
  }
  rollItem(quality = 1) {
    const tierCap = Math.min(3, 1 + quality);
    const pool = Items.upTo(tierCap).filter((d) => isUnlocked(META, 'items', d.id));   // round-5: gate fancy items behind unlocks
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
    this.vaultNear = null;   // R17/7.3: re-asserted each frame by a touched locked chest (pickup.js)
    // Attack tempo ramps slow -> fast over the run (both sides start sluggish and
    // speed up). Player + enemy fire intervals are divided by these.
    const rt = (this.run && this.run.time) || this.time;
    this.playerTempo = clamp(0.72 + rt / 240 * 0.55, 0.72, 1.28);
    this.enemyTempo = clamp(0.60 + rt / 210 * 0.68, 0.60, 1.30);
    this.rebuildGrid();   // broadphase for this frame (separation / targeting / combat / AoE)
    // update every player. inputFor(p) is undefined for keyboard-driven locals (player
    // reads input itself) and a net InputFrame for co-op remotes. Single-player → [player].
    for (const p of this._playerSet()) {
      if (p && !p.dead) p.update(dt, this, this.inputFor ? this.inputFor(p) : undefined);
    }

    for (const e of this.enemies) e.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);
    for (const pk of this.pickups) pk.update(dt, this);

    this.resolveCombat();
    if (this.hazards.length) this.updateHazards(dt);

    // process enemy deaths — drain to a fixed point so chain kills (deathBlast /
    // on-kill hooks) that landed at an already-iterated index still get fully
    // processed (loot + XP/gold + kill count + hooks) before the dead are filtered.
    let again = true;
    while (again) {
      again = false;
      for (const e of this.enemies) {
        if (e.dead && !e.processed) {
          e.processed = true;
          this.particles.death(e.x, e.y, e.def.bloodColor || P.green);
          Sfx.play('kill');
          if (e.deathBlast || e.def.deathBlast) this.bombBlast(e);
          this.dropLoot(e);
          this.run.kills = (this.run.kills || 0) + 1;
          if (this.run.curseGoldPerKill) this.run.gold += this.run.curseGoldPerKill;   // R18/B7 c_soultax
          if (this.player) { this._curSrc = '被動技能'; for (const h of this.player.hooks.kill) h(e, this); this._curSrc = null; }   // 原#16
          if (this.onEnemyKilled) this.onEnemyKilled(e);
          again = true;
        }
      }
    }

    this.enemies = this.enemies.filter((e) => !e.dead);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);
    for (let i = this.beams.length - 1; i >= 0; i--) { this.beams[i].life -= dt; if (this.beams[i].life <= 0) this.beams.splice(i, 1); }
    this.particles.update(dt);
  }

  resolveCombat() {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      if (p.faction === 'player') {
        this.forEachNear(p.x, p.y, p.radius + 32, (e) => {   // grid broadphase instead of scanning every enemy
          if (p.dead || e.dead || e.spawnT > 0 || p.hitSet.has(e)) return;
          if (circleHit(p.x, p.y, p.radius, e.x, e.y, e.radius * (e.scale * 0.7 + 0.3))) {
            const ang = Math.atan2(p.vy, p.vx);
            e.hurt(p.damage, Math.cos(ang) * p.knockback, Math.sin(ang) * p.knockback, this, p.crit, p.src);
            p.hitSet.add(e);
            this.particles.hit(p.x, p.y, ang + Math.PI, p.color);
            const owner = this.nearestPlayer(p.x, p.y);   // co-op: lifesteal/on-hit hooks credit whoever is closest to the shot
            const ls = Math.min(BALANCE.LIFESTEAL_CAP, (owner?.stats.lifesteal ?? 0) * BALANCE.LIFESTEAL_MULT);
            if (owner && ls > 0) owner.heal(p.damage * ls);
            if (p.statusOnHit && Math.random() < (p.statusOnHit.chance ?? 1)) applyStatus(e, p.statusOnHit.type, this, p.statusOnHit);   // D6
            if (p.onHit) p.onHit(e, this);
            if (owner) for (const h of owner.hooks.hit) h(e, p.damage, this);
            if (p.pierce > 0) p.pierce--; else { p.dead = true; }   // dead → cb early-returns for the rest
          }
        });
      } else {   // enemy projectile — can strike ANY living player
        for (const player of this._playerSet()) {
          if (!player || player.dead) continue;
          if (circleHit(p.x, p.y, p.radius, player.x, player.y, player.radius)) {
            const landed = player.takeDamage(p.damage, Math.atan2(p.vy, p.vx), this);
            if (landed && p.statusOnHit && Math.random() < (p.statusOnHit.chance ?? 1)) applyStatus(player, p.statusOnHit.type, this, p.statusOnHit);   // D6 (enemy ranged status — only on a real hit)
            if (p.pierce > 0) p.pierce--; else p.dead = true;
            break;
          }
        }
      }
    }
  }

  enemiesAlive() { return this.enemies.length; }

  // area damage to enemies (used by abilities, explosions, bosses)
  dealAreaDamage(x, y, radius, damage, opts = {}) {
    let hits = 0;
    // NOTE: BALANCE.ABILITY_DAMAGE_MULT is a RESERVED knob — left un-applied on purpose.
    // The prior balance was sim-tuned with it inactive; activating it on top of the
    // round-6 weapon-parity fix over-nerfed player DPS (swarm overwhelmed D1). Keep raw.
    this.forEachNear(x, y, radius, (e) => {
      if (e.dead || e.spawnT > 0) return;
      const rr = radius + e.radius;
      if (dist2(x, y, e.x, e.y) < rr * rr) {
        const ang = Math.atan2(e.y - y, e.x - x);
        const kb = opts.knockback ?? 40;
        e.hurt(damage, Math.cos(ang) * kb, Math.sin(ang) * kb, this, opts.crit, opts.src || this._curSrc);
        if (opts.status && Math.random() < (opts.status.chance ?? 1)) applyStatus(e, opts.status.type, this, opts.status);   // D6
        hits++;
      }
    });
    return hits;
  }

  // an enemy with def.deathBlast detonates when it dies, hurting the PLAYER too
  bombBlast(e) {
    const b = e.deathBlast || e.def.deathBlast || {};
    const r = b.r || 42, dmg = b.dmg || Math.round((e.damage || 10) * 1.6), color = b.color || P.ember;
    this.spawnExplosion(e.x, e.y, r, color, dmg * 0.7, { knockback: 90 });   // visual + hurt other enemies
    this.eachPlayer((p) => { if (!p.dead && dist(p.x, p.y, e.x, e.y) < r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - e.y, p.x - e.x), this); });
  }

  spawnExplosion(x, y, radius, color = P.ember, damage = 0, opts = {}) {
    this.particles.ring(x, y, color, 18, radius * 7);
    this.particles.burst(x, y, 14, { speed: radius * 6, color: [color, '#ffffff'], size: 2.6, life: 0.4, glow: true });
    addShake(Math.min(6, radius * 0.2));
    Sfx.play('explosion');
    if (damage > 0) this.dealAreaDamage(x, y, radius, damage, opts);
  }

  // ---- spatial broadphase (uniform grid of alive enemies) ------------------
  _cellKey(cx, cy) { return (cx + 4000) * 1e6 + (cy + 4000); }
  rebuildGrid() {
    const g = this._grid; g.clear(); const cs = this._gridCell;
    for (const e of this.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const k = this._cellKey(Math.floor(e.x / cs), Math.floor(e.y / cs));
      let a = g.get(k); if (!a) { a = []; g.set(k, a); } a.push(e);
    }
  }
  // visit alive enemies whose cell overlaps [x±r] (+1-cell margin for within-frame
  // movement / large bodies). The callback does the exact distance test.
  forEachNear(x, y, r, cb) {
    const cs = this._gridCell, g = this._grid;
    const x0 = Math.floor((x - r) / cs) - 1, x1 = Math.floor((x + r) / cs) + 1;
    const y0 = Math.floor((y - r) / cs) - 1, y1 = Math.floor((y + r) / cs) + 1;
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = g.get(this._cellKey(cx, cy)); if (!a) continue;
      for (let i = 0; i < a.length; i++) cb(a[i]);
    }
  }

  nearestEnemy(x, y, maxDist = Infinity, opts = {}) {
    let best = null, bd = maxDist * maxDist;
    if (maxDist !== Infinity) {   // bounded query → use the grid (O(k), not O(n))
      this.forEachNear(x, y, maxDist, (e) => {
        if (e.dead || e.spawnT > 0) return;
        const d = dist2(x, y, e.x, e.y);
        if (d < bd && (!opts.los || this.lineClear(x, y, e.x, e.y))) { bd = d; best = e; }
      });
      return best;
    }
    for (const e of this.enemies) {   // unbounded fallback (rare)
      if (e.dead || e.spawnT > 0) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd && (!opts.los || this.lineClear(x, y, e.x, e.y))) { bd = d; best = e; }
    }
    return best;
  }
  // 原#5: weapon auto-target — closest foe within AIM_RANGE, skipping any behind a wall.
  aimTarget(x, y) { return this.nearestEnemy(x, y, BALANCE.AIM_RANGE * (this.aimMul || 1), { los: BALANCE.AIM_LOS }); }   // R18/B9 m_fog shrinks aim range

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
    const dmg = def.dmg * BALANCE.TRAP_DMG_MULT * Math.min(2.2, 1 + (this.threat || 0) * 0.08);   // scales with threat, capped
    this.eachPlayer((p) => { if (!p.dead && dist(p.x, p.y, h.x, h.y) < h.r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - h.y, p.x - h.x), this); });
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
    const rx0 = Math.floor((camera.x - halfW) / TS) - 1;   // raw visible range (may poke past the map)
    const rx1 = Math.ceil((camera.x + halfW) / TS) + 1;
    const ry0 = Math.floor((camera.y - halfH) / TS) - 1;
    const ry1 = Math.ceil((camera.y + halfH) / TS) + 1;
    const x0 = clamp(rx0, 0, this.tw - 1);
    const x1 = clamp(rx1, 0, this.tw - 1);
    const y0 = clamp(ry0, 0, this.th - 1);
    const y1 = clamp(ry1, 0, this.th - 1);
    const ts = this.tileset;
    const tw = this.tw;
    const floorSprites = ts.floor.map((n) => getSprite(n));
    const wallSp = getSprite(ts.wall);
    const topSp = getSprite(ts.wallTop);
    // R20/B2 opt-in town extras (all undefined on the 10 run biomes → original path below).
    const bands = ts.wallBands ? ts.wallBands.map((band) => band.map((n) => getSprite(n))) : null;
    const faceSp = ts.wallFace ? getSprite(ts.wallFace) : null;
    const face2Sp = ts.wallFace2 ? getSprite(ts.wallFace2) : faceSp;
    const capSp = ts.wallCap ? getSprite(ts.wallCap) : null;
    const voidSp = ts.voidTile ? getSprite(ts.voidTile) : null;
    const hash5 = (tx, ty) => (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 5;
    // pick the band/variant sprite for a WALL tile (banded fill or plain ts.wall)
    const wallSprite = (tx, ty) => {
      if (!bands) return wallSp.frames[0];
      const d = (this.wallDepth ? this.wallDepth[ty * tw + tx] : 0) | 0;
      const arr = bands[Math.min(d, bands.length - 1)];
      return arr[hash5(tx, ty) % arr.length].frames[0];
    };
    // R17 B14 / R20 B2: the void beyond the map edge used to render pure black. Fill the visible
    // out-of-bounds band with dimmed wall tiles (when banded, use band-2 receding cliff/skyline so it
    // reads as far rock fading with distance past the edge). Town + runs alike.
    if (rx0 < 0 || ry0 < 0 || rx1 >= this.tw || ry1 >= this.th) {
      const oobBand = bands ? bands[Math.min(2, bands.length - 1)] : null;
      for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
        if (tx >= 0 && tx < this.tw && ty >= 0 && ty < this.th) continue;
        const hsh = hash5(tx, ty);
        let alpha = 0.30 + hsh * 0.025;
        let fr = wallSp.frames[0];
        if (oobBand) {
          fr = oobBand[hsh % oobBand.length].frames[0];
          // additional fade with distance past the nearest edge
          const dpx = Math.max(0, -tx, tx - (this.tw - 1)), dpy = Math.max(0, -ty, ty - (this.th - 1));
          const distPast = Math.max(dpx, dpy);
          alpha = (0.55 + (hsh % 3) * 0.06) * Math.max(0.4, 1 - distPast * 0.12);
        }
        drawSprite(fr, tx * TS, ty * TS, { ax: 0, ay: 0, alpha });
      }
    }
    // floors (+ void base when opted-in: VOID used to draw NOTHING → black leak; now a near-black abyss tile)
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = this.tileAt(tx, ty);
      if (t === FLOOR) {
        const v = this.floorVar[ty * this.tw + tx] || 0;
        drawSprite(floorSprites[v].frames[0], tx * TS, ty * TS, { ax: 0, ay: 0 });
      } else if (t === VOID && voidSp) {
        drawSprite(voidSp.frames[0], tx * TS, ty * TS, { ax: 0, ay: 0 });
      }
    }
    // walls + front faces
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (this.tileAt(tx, ty) !== WALL) continue;
      drawSprite(wallSprite(tx, ty), tx * TS, ty * TS, { ax: 0, ay: 0 });
      const southFloor = this.tileAt(tx, ty + 1) === FLOOR;
      // R20/B2: a 16x24 2.5D front FACE on south-edge walls (band-0 only — bands 1/2 are pure fill).
      // Face bottom aligns with the wall tile's bottom edge: y = (ty+1)*TS - 24. Cap (16x8) above it.
      const isBand0 = !this.wallDepth || (this.wallDepth[ty * tw + tx] | 0) === 0;
      if (faceSp && southFloor && isBand0) {
        const fr = (hash5(tx, ty) & 1) ? face2Sp : faceSp;
        drawSprite(fr.frames[0], tx * TS, (ty + 1) * TS - 24, { ax: 0, ay: 0 });
        if (capSp) drawSprite(capSp.frames[0], tx * TS, (ty + 1) * TS - 32, { ax: 0, ay: 0 });
      } else if (!faceSp && southFloor) {
        // original path: redundant skirt drawn on the floor tile below
        drawSprite(topSp.frames[0], tx * TS, (ty + 1) * TS, { ax: 0, ay: 0 });
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
    for (const p of this._playerSet()) if (p && !p.dead) drawables.push(p);   // co-op: all living avatars depth-sorted
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

// R19/B1: an APOCALYPTIC RUIN town for the hub (replaces the R18 open-air village). A 64x48 ashen
// field whose walkable space is BLOB-CARVED out of solid rubble-wall (so the boundary reads
// organic/irregular, never a rectangle); scattered, ungridded districts joined by winding jittered
// dirt paths; an irregular cracked-flagstone plaza disc; a jagged soul-RIFT (VOID) between plaza and
// garden spanned by a broken-stone bridge; six building FACADES (`ruin_fc_*`) over solid VOID
// footprints (porch left as open floor) which hub.js turns into door-stations to the 6 INTERIOR maps.
// Return contract UNCHANGED: `{tw,th,tiles,floorVar,decor,rooms,tileset}` with all 9 room ids — hub.js
// reads `rooms[id].cx/cy` so stations/NPCs follow automatically.
// R20/B2: grown 64x48 -> 72x54 so the bigger ruin_fc2_* facades + wider streets breathe.
// Anchors re-spread ~proportionally (x*72/64, y*54/48) then nudged off the edges.
const CAMP = { tw: 72, th: 54 };
// id -> tile-centre PORCH anchor (= room anchor). facade base sits ~3 tiles north of the porch.
const TOWN_BUILDINGS = [
  { id: 'church', cx: 16, cy: 13, fc: 'ruin_fc2_church' },        // NW hill
  { id: 'guild', cx: 52, cy: 15, fc: 'ruin_fc2_guild' },          // NE
  { id: 'achievements', cx: 58, cy: 33, fc: 'ruin_fc2_hall' },    // E
  { id: 'blacksmith', cx: 14, cy: 35, fc: 'ruin_fc2_smith' },     // W
  { id: 'clothing', cx: 50, cy: 46, fc: 'ruin_fc2_wardrobe' },    // SE
  { id: 'personal', cx: 23, cy: 46, fc: 'ruin_fc2_house' },       // S
];
const TOWN_AREAS = [   // open-air anchors (no building facade): plaza + garden + market
  { id: 'plaza', cx: 36, cy: 29 },     // centre — grand portal lives here
  { id: 'garden', cx: 35, cy: 45 },    // S of plaza (across the rift)
  { id: 'market', cx: 57, cy: 24 },    // NE-of-centre stalls
];
export function makeCamp() {
  const { tw, th } = CAMP;
  const tiles = new Uint8Array(tw * th).fill(WALL);   // start solid; carve open space below
  const floorVar = new Uint8Array(tw * th);
  const inB = (x, y) => x >= 2 && y >= 2 && x < tw - 2 && y < th - 2;   // keep a 2-tile solid border
  const carve = (x, y) => { if (inB(x, y)) tiles[y * tw + x] = FLOOR; };
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < tw && y < th) tiles[y * tw + x] = v; };
  const setVar = (x, y, v) => { if (x >= 0 && y >= 0 && x < tw && y < th && tiles[y * tw + x] === FLOOR) floorVar[y * tw + x] = v; };
  // overlapping-ellipse "blob" carve: stamps an organic open patch around (cx,cy)
  const blob = (cx, cy, rx, ry, jit = 0.18) => {
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) for (let x = cx - rx - 1; x <= cx + rx + 1; x++) {
      const dx = (x - cx) / (rx + rng.range(-jit, jit) * rx), dy = (y - cy) / (ry + rng.range(-jit, jit) * ry);
      if (dx * dx + dy * dy <= 1) carve(x, y);
    }
  };
  // 1) carve each district as 2-3 jittered overlapping blobs (irregular outlines, not circles)
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS]) {
    blob(b.cx, b.cy, 5, 4);
    blob(b.cx + rng.int(-2, 2), b.cy + rng.int(-2, 2), 4, 3);
    blob(b.cx + rng.int(-3, 3), b.cy + rng.int(-3, 3), 3, 3);
  }
  // 2) wind a jittered corridor between two points, blob-carving along it (paths feel organic)
  // R20/B2: carve width 2 -> 3 so streets are visibly wider.
  const corridor = (x0, y0, x1, y1, w = 3) => {
    let x = x0, y = y0; let guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 400) {
      blob(x, y, w, w, 0.1);
      const sx = x1 - x, sy = y1 - y;
      // bias toward the target but jitter the step so the route snakes rather than L-routes
      const r = rng.next();
      if (Math.abs(sx) > Math.abs(sy)) { if (r < 0.78 || sy === 0) x += sx > 0 ? 1 : -1; else y += sy > 0 ? 1 : -1; }
      else { if (r < 0.78 || sx === 0) y += sy > 0 ? 1 : -1; else x += sx > 0 ? 1 : -1; }
    }
  };
  const pc = TOWN_AREAS[0];
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS.slice(1)]) corridor(pc.cx, pc.cy, b.cx, b.cy, 3);
  // guarantee a couple cross-links so the layout never reads as a pure hub-and-spoke
  corridor(TOWN_BUILDINGS[0].cx, TOWN_BUILDINGS[0].cy, TOWN_BUILDINGS[3].cx, TOWN_BUILDINGS[3].cy, 3); // church<->smith (W spine)
  corridor(TOWN_BUILDINGS[1].cx, TOWN_BUILDINGS[1].cy, TOWN_AREAS[2].cx, TOWN_AREAS[2].cy, 3);          // guild<->market (NE)

  // 3) ground texturing — ashen grass base over all FLOOR (variants 0/1/2)
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    if (tiles[y * tw + x] === FLOOR) { const r = rng.next(); floorVar[y * tw + x] = r < 0.10 ? 2 : (r < 0.24 ? 1 : 0); }
  }
  // irregular cracked-flagstone plaza disc (variants 5/6) around the plaza anchor, r≈8 w/ jitter
  for (let y = pc.cy - 9; y <= pc.cy + 9; y++) for (let x = pc.cx - 10; x <= pc.cx + 10; x++) {
    const dx = (x - pc.cx) / (8 + Math.sin((x + y) * 0.7) * 1.3), dy = (y - pc.cy) / (7 + Math.cos(x * 0.6) * 1.1);
    if (dx * dx + dy * dy <= 1) setVar(x, y, rng.next() < 0.22 ? 6 : 5);
  }
  // re-lay cracked path variants (3/4) along the carved corridors (overwrites grass only on FLOOR)
  // R20/B2: widened to a 5-tile cross-stamp (centre ±2; the outermost ±2 ring at reduced probability)
  // so streets read as wide cracked avenues matching the 3-wide carve.
  const repath = (x0, y0, x1, y1) => {
    let x = x0, y = y0, guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 400) {
      for (const ox of [-2, -1, 0, 1, 2]) for (const oy of [-2, -1, 0, 1, 2]) {
        const outer = Math.abs(ox) === 2 || Math.abs(oy) === 2;
        if (outer && rng.next() > 0.45) continue;   // ragged path edges
        setVar(x + ox, y + oy, rng.next() < 0.4 ? 4 : 3);
      }
      const sx = x1 - x, sy = y1 - y, r = rng.next();
      if (Math.abs(sx) > Math.abs(sy)) { if (r < 0.78 || sy === 0) x += sx > 0 ? 1 : -1; else y += sy > 0 ? 1 : -1; }
      else { if (r < 0.78 || sx === 0) y += sy > 0 ? 1 : -1; else x += sx > 0 ? 1 : -1; }
    }
  };
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS.slice(1)]) repath(pc.cx, pc.cy, b.cx, b.cy);

  // 4) the soul-RIFT: a jagged VOID crack between plaza and garden (~12 tiles wide), spanned by a
  // 3-tile broken-stone bridge on the plaza->garden line. The rift sits BELOW the plaza disc; the
  // path corridor already carved open ground on both sides, and detours around the ends keep it
  // from hard-gating. We only convert FLOOR->VOID so we never punch a hole through solid border.
  const rift = [];   // VOID rift tiles -> ruin_rift anim decor
  const bridge = []; // walkable bridge deck tiles -> ruin_bridge decor
  const riftRow0 = 33, riftRow1 = 34;                 // two-row jagged chasm
  const bridgeCol0 = pc.cx - 1, bridgeCol1 = pc.cx + 1; // 3-tile deck on the garden path
  for (let yy = riftRow0; yy <= riftRow1; yy++) for (let xx = pc.cx - 7; xx <= pc.cx + 7; xx++) {
    if (xx >= bridgeCol0 && xx <= bridgeCol1) { set(xx, yy, FLOOR); setVar(xx, yy, 3); bridge.push([xx, yy]); continue; }
    // jitter the chasm edges so it reads as a jagged crack, not a straight ditch
    const edge = yy === riftRow0 ? rng.chance(0.22) : rng.chance(0.22);
    if (edge) continue;
    if (tiles[yy * tw + xx] === FLOOR) { set(xx, yy, VOID); rift.push([xx, yy]); }
  }

  const D = [];   // background decor (non-interactive); interactive stations live in the hub
  for (const [xx, yy] of rift) D.push({ sprite: 'ruin_rift', x: xx * TS, y: yy * TS, phase: (xx + yy) % 2 });
  for (const [xx, yy] of bridge) D.push({ sprite: 'ruin_bridge', x: xx * TS, y: yy * TS, phase: 0 });

  // 5) building footprints: a solid VOID block behind each facade base (porch row stays FLOOR),
  // with the ruined facade decor anchored 3 tiles N of the porch (base-centre anchor [0.5,1]).
  // R20/B2: ruin_fc2_* facades are 96px (6 tiles) — footprint widened 3x3 -> 5x4 (cols cx±2,
  // rows cy-7..cy-4) and the whole door approach (cx±1 × cy-3..cy) is force-carved so the art's
  // centred doorway always lines up with walkable ground + the B3 step-in trigger tile.
  const triggers = [];
  for (const b of TOWN_BUILDINGS) {
    for (let yy = b.cy - 7; yy <= b.cy - 4; yy++) for (let xx = b.cx - 2; xx <= b.cx + 2; xx++) set(xx, yy, VOID);
    for (let yy = b.cy - 3; yy <= b.cy; yy++) for (let xx = b.cx - 1; xx <= b.cx + 1; xx++) { carve(xx, yy); setVar(xx, yy, 3); }
    D.push({ sprite: b.fc, x: (b.cx + 0.5) * TS, y: (b.cy - 3) * TS, phase: 0 });
    // B3 walk-in door trigger: a glowing circle decal one tile in front of the facade door
    triggers.push({ tx: b.cx, ty: b.cy - 1, target: b.id });
    D.push({ sprite: 'ruin_doorglow', x: b.cx * TS, y: (b.cy - 1) * TS, phase: (b.cx + b.cy) % 3 });
  }

  // 6) CONNECTIVITY GUARANTEE — the blob/corridor carve + rift + VOID footprints can occasionally
  // sever a district. Flood FLOOR from the plaza; for any unreached anchor, re-carve a 2-wide direct
  // corridor to it. To never re-open the rift wall, a re-carve that crosses the rift rows is routed
  // through the bridge column first (down to a safe row, across to the anchor's column, then down).
  const floodFrom = (sx, sy) => {
    const seen = new Uint8Array(tw * th); const q = [sx + sy * tw]; seen[sx + sy * tw] = 1;
    while (q.length) { const i = q.pop(); const x = i % tw, y = (i / tw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue; const ni = ny * tw + nx;
        if (seen[ni] || tiles[ni] !== FLOOR) continue; seen[ni] = 1; q.push(ni); } }
    return seen;
  };
  const recarveSeg = (x0, y0, x1, y1) => {   // 2-wide straight carve, FLOOR (skips VOID-footprint? no: re-open) — but never crosses rift rows except via bridge cols
    let x = x0, y = y0, guard = 0;
    const step = () => { for (const ox of [0, 1]) for (const oy of [0, 1]) { carve(x + ox, y + oy); setVar(x + ox, y + oy, rng.next() < 0.4 ? 4 : 3); } };
    while ((x !== x1 || y !== y1) && guard++ < 300) { step(); if (x !== x1) x += x < x1 ? 1 : -1; else if (y !== y1) y += y < y1 ? 1 : -1; }
    step();
  };
  const inRiftSpan = (yy) => yy >= riftRow0 - 1 && yy <= riftRow1 + 1;
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS.slice(1)]) {
    const seen = floodFrom(pc.cx, pc.cy);
    if (seen[b.cy * tw + b.cx]) continue;
    // route: if the target is across the rift from the plaza, go via the bridge column.
    const acrossRift = (pc.cy <= riftRow0) !== (b.cy <= riftRow0);
    if (acrossRift) {
      recarveSeg(pc.cx, pc.cy, pc.cx, riftRow1 + 2);   // down the bridge column past the rift
      recarveSeg(pc.cx, riftRow1 + 2, b.cx, riftRow1 + 2);
      recarveSeg(b.cx, riftRow1 + 2, b.cx, b.cy);
    } else {
      // L-route that avoids stepping onto rift rows away from the bridge
      const midY = inRiftSpan(b.cy) ? b.cy : (inRiftSpan(pc.cy) ? pc.cy : pc.cy);
      recarveSeg(pc.cx, pc.cy, b.cx, pc.cy);
      recarveSeg(b.cx, pc.cy, b.cx, b.cy);
    }
    // keep the porch/footprint VOID intact (recarve may have opened a footprint tile)
    for (const bb of TOWN_BUILDINGS) for (let yy = bb.cy - 7; yy <= bb.cy - 4; yy++) for (let xx = bb.cx - 2; xx <= bb.cx + 2; xx++) set(xx, yy, VOID);
    // re-cut any rift tile the detour may have re-floored, EXCEPT the bridge columns (which the
    // across-rift route runs straight down — that column stays walkable as the intended crossing).
    for (const [rx, ry] of rift) if (tiles[ry * tw + rx] === FLOOR && (rx < bridgeCol0 || rx > bridgeCol1)) set(rx, ry, VOID);
  }

  // room anchors — SAME shape as before (hub.js reads cx/cy; x0..y1 kept for safety)
  const rooms = {};
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS]) {
    rooms[b.id] = { col: 0, row: 0, cx: (b.cx + 0.5) * TS, cy: (b.cy + 0.5) * TS,
      x0: (b.cx - 6) * TS, y0: (b.cy - 6) * TS, x1: (b.cx + 7) * TS, y1: (b.cy + 7) * TS };
  }
  const R = rooms;
  // decor helper: place at a tile offset from a room anchor, ONLY if the tile under it is FLOOR
  const put = (sprite, rm, dx, dy, phase = 0) => {
    const tx = Math.floor((rm.cx + dx * TS) / TS), ty = Math.floor((rm.cy + dy * TS) / TS);
    if (tiles[ty * tw + tx] === FLOOR) D.push({ sprite, x: rm.cx + dx * TS, y: rm.cy + dy * TS, phase });
  };
  // raw tile-coord decor with FLOOR guard
  const putT = (sprite, tx, ty, ox = 0.5, oy = 0.9, phase = 0) => {
    if (tx >= 0 && ty >= 0 && tx < tw && ty < th && tiles[ty * tw + tx] === FLOOR) D.push({ sprite, x: (tx + ox) * TS, y: (ty + oy) * TS, phase });
  };

  // --- plaza dressing: SYMMETRIC around the portal spot (= plaza centre). hub.js drops the grand
  // portal at plaza centre, so keep ~3 tiles around it decor-free. A pillar ring + flanking bonfire
  // & lamp pairs frame it, all mirror-symmetric in x. ---
  put('ruin_pillar', R.plaza, -6, -5); put('ruin_pillar', R.plaza, 6, -5);
  put('ruin_pillar_broken', R.plaza, -7, 0); put('ruin_pillar_broken', R.plaza, 7, 0);
  put('ruin_pillar', R.plaza, -6, 5); put('ruin_pillar', R.plaza, 6, 5);
  put('ruin_bonfire', R.plaza, -4, 6, 0); put('ruin_bonfire', R.plaza, 4, 6, 1);   // flanking the portal foot
  put('ruin_lamp', R.plaza, -8, -3, 0); put('ruin_lamp', R.plaza, 8, -3, 1);
  put('ruin_crystal', R.plaza, -5, -6, 0); put('ruin_crystal', R.plaza, 5, -6, 1);

  // --- garden: cracked goddess statue centred + symmetric crystals/graves + a crumbled fountain ---
  put('ruin_statue', R.garden, 0, -1);
  put('ruin_fountain', R.garden, 0, 4, 0);
  put('ruin_crystal', R.garden, -4, 1, 0); put('ruin_crystal', R.garden, 4, 1, 1);
  put('ruin_deadtree', R.garden, -6, -2); put('ruin_deadtree', R.garden, 6, -2);
  for (let i = -4; i <= 4; i += 2) put('ruin_fence', R.garden, i, 5);

  // --- market: broken stalls + carts + barrels, soul-lit well ---
  put('town_fc_stall', R.market, -3, -1); put('town_fc_stall', R.market, 3, -1);
  put('ruin_cart', R.market, 0, 3); put('ruin_well', R.market, -5, 2);
  put('town_barrel', R.market, 5, 1); put('town_barrel', R.market, 6, 2); put('town_barrel', R.market, 5, 3);
  put('ruin_lamp', R.market, -5, -3, 0); put('ruin_lamp', R.market, 5, -3, 1);

  // --- church surrounds: a leaning-gravestone cluster + a free-standing broken arch over the path ---
  put('ruin_grave', R.church, -3, 4); put('ruin_grave', R.church, -2, 5); put('ruin_grave', R.church, -4, 5);
  put('ruin_grave', R.church, 3, 4); put('ruin_grave', R.church, 4, 5);
  put('ruin_arch', R.church, 0, 6);
  put('ruin_torchpost', R.church, -2, 1, 0); put('ruin_torchpost', R.church, 2, 1, 1);

  // --- smith / clothing / personal porch torches (symmetric flanking the doors) ---
  for (const bid of ['blacksmith', 'clothing', 'personal', 'guild', 'achievements']) {
    put('ruin_torchpost', R[bid], -2, 1, 0); put('ruin_torchpost', R[bid], 2, 1, 1);
  }
  // a broken arch framing the path mouth into the achievements hall (east) and guild (north)
  put('ruin_arch', R.achievements, -6, 0); put('ruin_arch', R.guild, 0, 5);

  // --- scatter ruin props across the open field (seeded by tile coords; FLOOR-guarded by putT) ---
  const scatterTrees = [[6, 6], [8, 20], [7, 24], [6, 38], [9, 44], [24, 5], [40, 6], [58, 8], [59, 22], [58, 35], [57, 44], [26, 44], [38, 44], [16, 28], [40, 30], [24, 22], [44, 24]];
  for (const [tx, ty] of scatterTrees) putT(rng.chance(0.45) ? 'ruin_deadtree2' : 'ruin_deadtree', tx, ty);
  const scatterBoulders = [[10, 16], [54, 16], [11, 36], [54, 38], [28, 8], [36, 44], [22, 18], [42, 18], [18, 24], [46, 32]];
  for (const [tx, ty] of scatterBoulders) putT(rng.chance(0.5) ? 'ruin_boulder2' : 'ruin_boulder', tx, ty, 0.5, 0.8);
  const scatterRubble = [[20, 8], [44, 10], [10, 22], [52, 24], [16, 38], [40, 38], [30, 12], [34, 18], [22, 30], [48, 18], [14, 18], [50, 12], [26, 36], [42, 34]];
  for (const [tx, ty] of scatterRubble) putT(rng.chance(0.5) ? 'ruin_rubble2' : 'ruin_rubble', tx, ty, 0.5, 0.7);
  const scatterCrystals = [[18, 14], [48, 30], [12, 26], [38, 12], [28, 44], [54, 28], [22, 36]];
  for (const [tx, ty] of scatterCrystals) putT('ruin_crystal', tx, ty, 0.5, 0.85, (tx + ty) % 2);
  const scatterFence = [[14, 16], [15, 16], [16, 16], [48, 16], [49, 16], [50, 16], [10, 38], [11, 38], [50, 36], [51, 36]];
  for (const [tx, ty] of scatterFence) putT('ruin_fence', tx, ty, 0.5, 0.8);
  const scatterPillar = [[26, 14], [38, 30], [16, 34], [46, 28], [30, 8]];
  for (const [tx, ty] of scatterPillar) putT(rng.chance(0.5) ? 'ruin_pillar' : 'ruin_pillar_broken', tx, ty, 0.5, 0.85);
  // a few banners + a survivor bonfire on the field for life signs
  putT('ruin_banner', 24, 10, 0.5, 0.85, 0); putT('ruin_banner', 40, 22, 0.5, 0.85, 1);
  putT('ruin_bonfire', 18, 22, 0.5, 0.85, 0); putT('ruin_bonfire', 46, 36, 0.5, 0.85, 2);

  // R19/B1 fix: top up the field to the spec density (~180-240 props). The fixed scatter coords above
  // realistically land only ~120-140 props (many sit on uncarved field/border and get FLOOR-skipped),
  // so seeded-fill the remaining FLOOR tiles with small ruin props, FLOOR-guarded + min-spaced, while
  // keeping porches / plaza-centre / the spawn / the rift clear.
  const SMALL_PROPS = ['ruin_rubble', 'ruin_rubble2', 'ruin_crystal', 'ruin_fence', 'ruin_deadtree', 'ruin_boulder', 'ruin_boulder2'];
  const reservedFill = (tx, ty) => {
    if (Math.abs(tx - pc.cx) <= 3 && Math.abs(ty - pc.cy) <= 3) return true;   // plaza-centre portal + spawn ring
    if (ty >= riftRow0 - 1 && ty <= riftRow1 + 1) return true;                 // along the rift
    for (const b of TOWN_BUILDINGS) if (Math.abs(tx - b.cx) <= 3 && ty >= b.cy - 7 && ty <= b.cy + 1) return true;  // porches/footprints/door approaches (R20: wider fc2)
    return false;
  };
  const occupied = new Set(D.map((d) => (Math.floor(d.y / TS)) * tw + Math.floor(d.x / TS)));
  const nearDecor = (tx, ty) => {   // min-spacing: reject if any existing decor is within 1 tile (8-neighbourhood)
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (occupied.has((ty + oy) * tw + (tx + ox))) return true;
    return false;
  };
  const FILL_TARGET = 200;
  // deterministic FLOOR-tile order (seeded jitter so it doesn't read as a raster sweep), gated by chance
  const cells = [];
  for (let y = 2; y < th - 2; y++) for (let x = 2; x < tw - 2; x++) if (tiles[y * tw + x] === FLOOR) cells.push(y * tw + x);
  for (let i = cells.length - 1; i > 0; i--) { const j = rng.int(0, i); const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
  for (const ci of cells) {
    if (D.length >= FILL_TARGET) break;
    const tx = ci % tw, ty = (ci / tw) | 0;
    if (reservedFill(tx, ty) || nearDecor(tx, ty)) continue;
    if (!rng.chance(0.7)) continue;   // leave breathing room (not every eligible tile)
    const sp = SMALL_PROPS[rng.int(0, SMALL_PROPS.length - 1)];
    D.push({ sprite: sp, x: (tx + 0.5) * TS, y: (ty + 0.85) * TS, phase: (tx + ty) % 3 });
    occupied.add(ci);
  }

  // R20/B2 (player problem 7): big props get player-only collision. solid:1 = anchor tile,
  // solid:2 = anchor + one tile each side. Small clutter (rubble/crystal/banners/lamps/torchposts)
  // stays walkable; thin door-flanking torchposts MUST stay clear so they never gate a porch.
  const SOLID_PROPS = {
    ruin_deadtree: 1, ruin_deadtree2: 1, ruin_boulder: 1, ruin_boulder2: 2,
    ruin_pillar: 1, ruin_pillar_broken: 1, ruin_statue: 2, ruin_fountain: 2,
    ruin_well: 2, ruin_cart: 2, town_fc_stall: 2, ruin_bonfire: 1, ruin_fence: 1,
  };
  for (const d of D) if (SOLID_PROPS[d.sprite]) d.solid = SOLID_PROPS[d.sprite];
  // never let a solid prop sit on (or beside, for solid:2) the portal ring, the spawn,
  // a porch / door approach, or a trigger tile
  const protect = new Set();
  const prot = (tx, ty, r) => { for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) protect.add((ty + oy) * tw + (tx + ox)); };
  prot(pc.cx, pc.cy, 3);                                  // grand portal + spawn ring
  for (const b of TOWN_BUILDINGS) { prot(b.cx, b.cy, 1); prot(b.cx, b.cy - 1, 1); prot(b.cx, b.cy - 2, 1); prot(b.cx, b.cy - 3, 1); }
  for (const g of triggers) prot(g.tx, g.ty, 1);
  for (const d of D) {
    if (!d.solid) continue;
    const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS);
    if (protect.has(ty * tw + tx) || (d.solid === 2 && (protect.has(ty * tw + tx - 1) || protect.has(ty * tw + tx + 1)))) d.solid = 0;
  }
  // connectivity self-check WITH the block grid: if a solid prop seals any anchor away from
  // the plaza, demote (un-solid) the blocking prop nearest the unreached anchor and retry.
  // The prop keeps drawing — only its collision is dropped.
  const anchorPts = [...TOWN_BUILDINGS, ...TOWN_AREAS].map((b) => [b.cx, b.cy]);
  for (let guard = 0; guard < 24; guard++) {
    const blk = new Uint8Array(tw * th);
    for (const d of D) if (d.solid) {
      const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS);
      blk[ty * tw + tx] = 1;
      if (d.solid === 2) { if (tx > 0) blk[ty * tw + tx - 1] = 1; if (tx < tw - 1) blk[ty * tw + tx + 1] = 1; }
    }
    const seen = new Uint8Array(tw * th); const q = [pc.cy * tw + pc.cx]; seen[q[0]] = 1;
    while (q.length) { const i = q.pop(); const x = i % tw, y = (i / tw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue; const ni = ny * tw + nx;
        if (seen[ni] || tiles[ni] !== FLOOR || blk[ni]) continue; seen[ni] = 1; q.push(ni); } }
    const missing = anchorPts.find(([ax, ay]) => !seen[ay * tw + ax]);
    if (!missing) break;
    let best = null, bd = Infinity;
    for (const d of D) if (d.solid) { const dd = (d.x / TS - missing[0]) ** 2 + (d.y / TS - missing[1]) ** 2; if (dd < bd) { bd = dd; best = d; } }
    if (!best) break;
    best.solid = 0;
  }

  // R20/B2: opt-in 2.5D + banded-fill + void tileset extras (drawTiles only uses them when present)
  const tileset = {
    floor: ['ruin_grass', 'ruin_grass2', 'ruin_ashgrass', 'ruin_path', 'ruin_path2', 'ruin_plaza', 'ruin_plaza2'],
    wall: 'ruin_wallline', wallTop: 'ruin_wallline_top',
    wallFace: 'ruin_wall_face', wallFace2: 'ruin_wall_face2', wallCap: 'ruin_wall_cap',
    voidTile: 'ruin_void',
    wallBands: [['ruin_wallline'], ['ruin_wall_trees', 'ruin_wall_trees2'], ['ruin_wall_skyline', 'ruin_wall_cliff']],
  };
  return { tw, th, tiles, floorVar, decor: D, rooms, tileset, triggers };
}

// R19/B2: the 6 building INTERIOR maps. Same return contract as makeCamp. Each is a NON-rectangular
// stone/wood room carved from solid WALL, with a 2-tile south doorway = the EXIT back to town.
// `rooms = { [id]: <station-anchor centre>, exit: <just inside the doorway> }` (both in PIXELS, same
// fields as makeCamp's anchors). Station spot (top-centre) is kept decor-clear — hub.js drops the
// building's interactive station there; SYMMETRIC reuse-sprite decor + torchpost pairs flank it.
export function makeInterior(id) {
  // per-building footprint + non-rect carve mask (returns true where FLOOR)
  // R20/B2 (player problem 1): widths are now ODD so `cx = tw>>1` is the TRUE centre column —
  // the station, carpet runner, doorway and every mirrored decor pair centre perfectly
  // (even widths made centred props sit half a tile off the axis).
  const SPEC = {
    church:       { tw: 21, th: 18 },
    guild:        { tw: 23, th: 16 },
    blacksmith:   { tw: 19, th: 14 },
    clothing:     { tw: 19, th: 14 },
    achievements: { tw: 25, th: 14 },
    personal:     { tw: 17, th: 13 },   // wide enough that the gold-sink decor offsets (dx -6..+6) fit inside
  }[id] || { tw: 19, th: 14 };
  const { tw, th } = SPEC;
  const tiles = new Uint8Array(tw * th).fill(WALL);
  const floorVar = new Uint8Array(tw * th);
  const carve = (x, y) => { if (x >= 1 && y >= 1 && x < tw - 1 && y < th - 1) tiles[y * tw + x] = FLOOR; };
  const setVar = (x, y, v) => { if (x >= 0 && y >= 0 && x < tw && y < th && tiles[y * tw + x] === FLOOR) floorVar[y * tw + x] = v; };
  const fillRect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) carve(x, y); };
  const cx = tw >> 1;   // doorway / symmetry axis column

  // --- carve the NON-rectangular shape per building ---
  if (id === 'church') {
    // cross-shaped nave: a long central nave + transept arms
    fillRect(cx - 3, 1, cx + 3, th - 2);            // nave (vertical)
    fillRect(2, 6, tw - 3, 10);                      // transept (horizontal arms)
  } else if (id === 'guild') {
    // L-shaped hall
    fillRect(1, 1, tw - 2, th - 6);                  // main hall (top, full width)
    fillRect(1, th - 6, cx + 3, th - 2);             // leg jutting south-west
  } else if (id === 'blacksmith') {
    // main room + a forge alcove jutting off the right wall
    fillRect(1, 2, tw - 4, th - 2);                  // main room
    fillRect(tw - 5, 4, tw - 2, th - 5);             // forge alcove (east bay)
  } else if (id === 'clothing') {
    // main room + a fitting bay jutting north
    fillRect(2, 3, tw - 3, th - 2);                  // main room
    fillRect(cx - 2, 1, cx + 2, 3);                  // display bay (north)
  } else if (id === 'achievements') {
    // long gallery (full-height) + two symmetric side niches bumping out the north wall
    fillRect(3, 2, tw - 4, th - 2);                  // central gallery (connects station row 2 -> exit)
    fillRect(2, 4, tw - 3, th - 4);                  // widen the mid-section to the side walls
    fillRect(4, 1, 7, 3); fillRect(tw - 8, 1, tw - 5, 3);   // two north niches (non-rect bumps)
  } else { // personal — cosy small room, clipped corners
    fillRect(1, 1, tw - 2, th - 2);
    // clip the four corners so it isn't a plain box
    tiles[1 * tw + 1] = WALL; tiles[1 * tw + (tw - 2)] = WALL;
    tiles[(th - 2) * tw + 1] = WALL; tiles[(th - 2) * tw + (tw - 2)] = WALL;
  }

  // --- south doorway = the EXIT, now a 3-tile gap PERFECTLY centred on cx (R20/B2) ---
  const doorY = th - 1;             // bottom border row
  for (const dx of [-1, 0, 1]) {
    carve(cx + dx, th - 2);                      // floor just inside the gap
    tiles[doorY * tw + (cx + dx)] = FLOOR;       // the doorway gap itself
    setVar(cx + dx, doorY, 0);
  }

  // --- floor texturing: wood/stone base + a carpet runner up the centre (per building) ---
  const usesWood = id === 'guild' || id === 'clothing' || id === 'personal';
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    if (tiles[y * tw + x] !== FLOOR) continue;
    const base = usesWood ? (rng.chance(0.18) ? 1 : 0) : (rng.chance(0.18) ? 3 : 2);   // 0/1 wood, 2/3 stone
    floorVar[y * tw + x] = base;
  }
  // carpet runner (variants 4/5) up the TRUE central axis (R20/B2: single centred column;
  // the church gets a grander 3-wide runner befitting the nave)
  if (id === 'church' || id === 'clothing' || id === 'achievements' || id === 'personal') {
    const span = id === 'church' ? [-1, 0, 1] : [0];
    for (let y = 2; y <= th - 2; y++) for (const dx of span) setVar(cx + dx, y, rng.chance(0.3) ? 5 : 4);
  }

  // --- anchors ---
  // R20/B2: stationRow 2 -> 3 — the new ruin_st_* centrepieces are 44-56px tall and need the
  // extra headroom (they rise over the back wall like an altar). Both anchors sit on the TRUE
  // centre (cx + 0.5)*TS now that widths are odd.
  const stationRow = 3;
  const rooms = {
    [id]: { col: 0, row: 0, cx: (cx + 0.5) * TS, cy: (stationRow + 0.5) * TS,
      x0: (cx - 6) * TS, y0: 0, x1: (cx + 7) * TS, y1: (stationRow + 7) * TS },
    exit: { col: 0, row: 0, cx: (cx + 0.5) * TS, cy: (th - 2 + 0.5) * TS,
      x0: (cx - 6) * TS, y0: (th - 8) * TS, x1: (cx + 6) * TS, y1: th * TS },
  };
  // make sure station + exit tiles are FLOOR (carve mask might have clipped the very top-centre)
  carve(cx, stationRow); carve(cx - 1, stationRow); carve(cx + 1, stationRow);

  const D = [];
  // reserved tiles hub.js needs clear: the station triplet + the 3-wide exit/doorway columns.
  const reserved = new Set([
    (stationRow) * tw + cx, (stationRow) * tw + (cx - 1), (stationRow) * tw + (cx + 1),
    (th - 2) * tw + cx, (th - 2) * tw + (cx - 1), (th - 2) * tw + (cx + 1),
    (th - 1) * tw + cx, (th - 1) * tw + (cx - 1), (th - 1) * tw + (cx + 1),
  ]);
  // B3 walk-out trigger: glowing circle on the inside-door tile (spawn point is one row above it)
  const triggers = [{ tx: cx, ty: th - 2, target: 'town' }];
  D.push({ sprite: 'ruin_doorglow', x: cx * TS, y: (th - 2) * TS, phase: 1 });
  // FLOOR-guarded tile-offset decor relative to a column/row pair (never on a reserved tile)
  const putXY = (sprite, tx, ty, ox = 0.5, oy = 0.85, phase = 0) => {
    if (tx >= 0 && ty >= 0 && tx < tw && ty < th && tiles[ty * tw + tx] === FLOOR && !reserved.has(ty * tw + tx)) D.push({ sprite, x: (tx + ox) * TS, y: (ty + oy) * TS, phase });
  };
  // torchpost pairs flank the station (top) and the exit (bottom) — R20/B2: with the odd width
  // both pairs are now TRUE mirror pairs about the centre column (was cx-3/cx+2 at the door)
  putXY('ruin_torchpost', cx - 3, stationRow + 1, 0.5, 0.85, 0); putXY('ruin_torchpost', cx + 3, stationRow + 1, 0.5, 0.85, 1);
  putXY('ruin_torchpost', cx - 3, th - 3, 0.5, 0.85, 1); putXY('ruin_torchpost', cx + 3, th - 3, 0.5, 0.85, 0);

  // --- per-building SYMMETRIC reuse-sprite dressing (anchored to columns, mirrored in x).
  // R19 polish: the building's identity prop (goddess/board/furnace/mannequin/shelf/bed) is the
  // INTERACTIVE station hub.js places at rooms[id] — never duplicated here as background decor.
  // R20/B2: dressing swapped to the ruin-flavoured rint_* set (same sizes/anchors as the old
  // clean town_* props, so positions carry 1:1) and every pair re-audited to mirror about cx.
  const midRow = Math.floor(th / 2);
  if (id === 'church') {
    putXY('rint_candles', cx - 2, stationRow + 1, 0.5, 0.85, 0); putXY('rint_candles', cx + 2, stationRow + 1, 0.5, 0.85, 1);
    putXY('rint_stained', 3, 6); putXY('rint_stained', tw - 4, 6);
    putXY('rint_stained', 3, 9); putXY('rint_stained', tw - 4, 9);
    putXY('rint_arch', 2, midRow); putXY('rint_arch', tw - 3, midRow);
    putXY('rint_pew', 4, 8); putXY('rint_pew', tw - 5, 8);                                  // transept benches
    for (const ry of [11, 13]) { putXY('rint_pew', cx - 3, ry); putXY('rint_pew', cx + 3, ry); }   // nave rows flanking the runner
    putXY('rint_candles', cx - 3, th - 4, 0.5, 0.85, 1); putXY('rint_candles', cx + 3, th - 4, 0.5, 0.85, 0);
  } else if (id === 'guild') {
    putXY('rint_desk', cx - 3, stationRow + 2, 0.5, 0.9); putXY('rint_desk', cx + 3, stationRow + 2, 0.5, 0.9);   // twin reception desks
    putXY('rint_lantern', 3, 2, 0.5, 0.85, 0); putXY('rint_lantern', tw - 4, 2, 0.5, 0.85, 1);
    putXY('rint_lantern', 3, midRow, 0.5, 0.85, 1); putXY('rint_lantern', tw - 4, midRow, 0.5, 0.85, 0);
    putXY('rint_bench', cx - 5, 6); putXY('rint_bench', cx + 5, 6);                          // waiting benches
    putXY('ruin_banner', 5, 1, 0.5, 0.9, 0); putXY('ruin_banner', tw - 6, 1, 0.5, 0.9, 1);   // tattered guild colours
    putXY('rint_crate', 3, th - 3); putXY('rint_crate', 4, th - 4); putXY('rint_barrel', 3, th - 5);
    putXY('rint_crate', tw - 3, 8); putXY('rint_barrel', tw - 3, 9);                          // stores by the east wall
  } else if (id === 'blacksmith') {
    putXY('rint_weaponrack', tw - 3, 5); putXY('rint_grindstone', tw - 3, 8);                // forge-alcove kit
    putXY('rint_weaponrack', 2, 5); putXY('rint_weaponrack', 2, 8);
    putXY('rint_crate', 5, th - 3); putXY('rint_crate', tw - 6, th - 3);
    putXY('rint_barrel', 2, th - 3); putXY('rint_barrel', 3, th - 4);
  } else if (id === 'clothing') {
    putXY('rint_mannequin', cx - 3, stationRow, 0.5, 0.9); putXY('rint_mannequin', cx + 3, stationRow, 0.5, 0.9);   // display trio with the big station
    putXY('rint_rack', 4, 6); putXY('rint_rack', tw - 5, 6);
    putXY('rint_rack', 4, 9); putXY('rint_rack', tw - 5, 9);
    putXY('rint_mirror', 3, th - 4); putXY('rint_mirror', tw - 4, th - 4);
    putXY('rint_lantern', 5, 4, 0.5, 0.85, 0); putXY('rint_lantern', tw - 6, 4, 0.5, 0.85, 1);
  } else if (id === 'achievements') {
    putXY('rint_trophyshelf', 5, 2, 0.5, 0.9); putXY('rint_trophyshelf', tw - 6, 2, 0.5, 0.9);    // niche shelves
    for (const rx of [5, 9, tw - 10, tw - 6]) { putXY('rint_pillar', rx, 4); putXY('rint_pillar', rx, 10); }   // colonnade (mirror pairs 5↔tw-6, 9↔tw-10)
    putXY('rint_banner_gold', 3, 5); putXY('rint_banner_gold', tw - 4, 5);
    putXY('rint_banner_gold', 3, 9); putXY('rint_banner_gold', tw - 4, 9);
  } else { // personal — the bed IS the interactive station; dress a cosy room around it
    putXY('rint_rug', cx, 6, 0.5, 0.6);
    putXY('rint_bookshelf', 2, 3); putXY('rint_plant', tw - 3, 3);
    putXY('rint_chest2', tw - 3, th - 3); putXY('rint_lamp2', 2, th - 4, 0.5, 0.85, 0);
    putXY('rint_barrel', 2, th - 3); putXY('rint_plant', 2, 6);
    // NOTE: hub.injectRoomDecor() adds the gold-sink decor on top (anchored mid-room, FLOOR-guarded).
  }

  // R20/B2 (player problem 7): furniture you shouldn't walk through gets player-only collision
  // (same demote-on-disconnect safety as makeCamp: station↔exit must stay reachable).
  const SOLID_INT = {
    rint_pew: 1, rint_desk: 2, rint_bench: 1, rint_rack: 2, rint_mirror: 1, rint_weaponrack: 1,
    rint_grindstone: 1, rint_trophyshelf: 2, rint_bookshelf: 1, rint_crate: 1, rint_barrel: 1,
    rint_mannequin: 1, rint_pillar: 1, rint_plant: 1, rint_chest2: 1,
  };
  for (const d of D) {
    if (!SOLID_INT[d.sprite]) continue;
    const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS);
    if (reserved.has(ty * tw + tx)) continue;
    d.solid = SOLID_INT[d.sprite];
  }
  for (let guard = 0; guard < 16; guard++) {
    const blk = new Uint8Array(tw * th);
    for (const d of D) if (d.solid) {
      const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS);
      blk[ty * tw + tx] = 1;
      if (d.solid === 2) { if (tx > 0) blk[ty * tw + tx - 1] = 1; if (tx < tw - 1) blk[ty * tw + tx + 1] = 1; }
    }
    const seen = new Uint8Array(tw * th); const q = [(th - 2) * tw + cx]; seen[q[0]] = 1;
    while (q.length) { const i = q.pop(); const x = i % tw, y = (i / tw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue; const ni = ny * tw + nx;
        if (seen[ni] || tiles[ni] !== FLOOR || blk[ni]) continue; seen[ni] = 1; q.push(ni); } }
    if (seen[stationRow * tw + cx]) break;       // exit reaches the station — done
    let best = null, bd = Infinity;
    for (const d of D) if (d.solid) { const dd = (d.x / TS - cx) ** 2 + (d.y / TS - stationRow) ** 2; if (dd < bd) { bd = dd; best = d; } }
    if (!best) break;
    best.solid = 0;
  }

  const tileset = {
    floor: ['int_wood', 'int_wood2', 'int_stone', 'int_stone2', 'int_carpet', 'int_carpet2'],
    wall: 'int_wall', wallTop: 'int_wall_top',
    wallFace: 'int_wall_face', wallCap: 'int_wall_cap',   // R20/B2: 2.5D faces indoors too
    voidTile: 'ruin_void',
  };
  return { tw, th, tiles, floorVar, decor: D, rooms, tileset, triggers };
}
