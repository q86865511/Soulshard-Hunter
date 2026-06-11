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
    const floorSprites = ts.floor.map((n) => getSprite(n));
    const wallSp = getSprite(ts.wall);
    const topSp = getSprite(ts.wallTop);
    // R17 B14: the void beyond the map edge used to render pure black — fill the visible
    // out-of-bounds band with dimmed biome wall tiles (cheap per-tile hash varies the alpha
    // slightly so it reads as receding rock/masonry, not a flat slab). Town + runs alike.
    if (rx0 < 0 || ry0 < 0 || rx1 >= this.tw || ry1 >= this.th) {
      for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
        if (tx >= 0 && tx < this.tw && ty >= 0 && ty < this.th) continue;
        const hsh = (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 5;
        drawSprite(wallSp.frames[0], tx * TS, ty * TS, { ax: 0, ay: 0, alpha: 0.30 + hsh * 0.025 });
      }
    }
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

// R18/B1: an OPEN-AIR village for the hub (replaces the 3x3 walled-box layout). A grassy
// 60x46 field ringed by a forest treeline, a central flagstone plaza, dirt paths radiating to
// six building FACADES (church / guild / hall / smith / wardrobe / house) whose footprints are
// solid VOID (so you can't walk through the building) with the porch left as open floor. Returns
// the SAME contract `{tw,th,tiles,floorVar,decor,rooms,tileset}` + all 9 room ids — hub.js places
// its stations/NPCs off `rooms[id].cx/cy`, so those follow automatically.
const CAMP = { tw: 60, th: 46 };
// id -> tile-centre of the building's PORCH (= room anchor). facade base sits 3 tiles north.
const TOWN_BUILDINGS = [
  { id: 'church', cx: 13, cy: 12, fc: 'town_fc_church' },
  { id: 'guild', cx: 30, cy: 11, fc: 'town_fc_guild' },
  { id: 'achievements', cx: 47, cy: 12, fc: 'town_fc_hall' },
  { id: 'blacksmith', cx: 12, cy: 25, fc: 'town_fc_smith' },
  { id: 'clothing', cx: 48, cy: 25, fc: 'town_fc_wardrobe' },
  { id: 'personal', cx: 13, cy: 37, fc: 'town_fc_house' },
];
const TOWN_AREAS = [   // open-air anchors (no building facade): plaza + two flavour squares
  { id: 'plaza', cx: 30, cy: 24 },
  { id: 'garden', cx: 30, cy: 38 },
  { id: 'market', cx: 47, cy: 37 },
];
export function makeCamp() {
  const { tw, th } = CAMP;
  const tiles = new Uint8Array(tw * th);          // FLOOR=0 everywhere by default
  const floorVar = new Uint8Array(tw * th);
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < tw && y < th) tiles[y * tw + x] = v; };
  const setVar = (x, y, v) => { if (x >= 0 && y >= 0 && x < tw && y < th && tiles[y * tw + x] === FLOOR) floorVar[y * tw + x] = v; };
  // grassy base: mostly plain grass, ~10% grass-alt, ~7% flowery
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const r = rng.next(); floorVar[y * tw + x] = r < 0.07 ? 2 : (r < 0.17 ? 1 : 0);
  }
  // forest treeline border ring (2 tiles thick)
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { if (x < 2 || y < 2 || x >= tw - 2 || y >= th - 2) set(x, y, WALL); }
  // central plaza — a warm flagstone disc (floorVar 5/6) around the plaza anchor
  const pc = TOWN_AREAS[0];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const dx = (x - pc.cx) / 9, dy = (y - pc.cy) / 7;
    if (dx * dx + dy * dy <= 1) setVar(x, y, rng.next() < 0.18 ? 6 : 5);
  }
  // dirt paths from the plaza out to every porch + the two squares (L-routes, 2 tiles wide)
  const path = (x0, y0, x1, y1) => {
    let x = x0, y = y0;
    const stamp = () => { for (const ox of [0, 1]) for (const oy of [0, 1]) setVar(x + ox, y + oy, rng.next() < 0.4 ? 4 : 3); };
    while (x !== x1) { stamp(); x += x < x1 ? 1 : -1; }
    while (y !== y1) { stamp(); y += y < y1 ? 1 : -1; }
    stamp();
  };
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS.slice(1)]) path(pc.cx, pc.cy, b.cx, b.cy);

  // R18/B2: a creek between the plaza and the garden — VOID water (a real barrier) spanned by a
  // wooden bridge on the garden path. cols 23-37 x rows 31-32; the bridge (cols 29-31) is carved
  // back to walkable dirt. Players can also detour around the creek's ends, so it never hard-gates.
  const creek = [];   // collected VOID water tiles → water decor
  const bridge = [];  // bridge tiles → bridge decor
  for (let yy = 31; yy <= 32; yy++) for (let xx = 23; xx <= 37; xx++) {
    if (xx >= 29 && xx <= 31) { set(xx, yy, FLOOR); setVar(xx, yy, 3); bridge.push([xx, yy]); }   // bridge deck (dirt-matched)
    else { set(xx, yy, VOID); creek.push([xx, yy]); }
  }

  const D = [];   // background decor (non-interactive); interactive stations live in the hub
  for (const [xx, yy] of creek) D.push({ sprite: 'town_water', x: xx * TS, y: yy * TS, phase: (xx + yy) % 2 });   // tile-aligned animated water
  for (const [xx, yy] of bridge) D.push({ sprite: 'town_bridge', x: xx * TS, y: yy * TS, phase: 0 });
  // building footprints: a solid VOID block (4 tiles tall x 5 wide) behind each facade base,
  // with the facade decor anchored at the base (front) so the porch row stays walkable floor.
  for (const b of TOWN_BUILDINGS) {
    // VOID kept 3-wide x 3-tall so it stays fully hidden behind the 64px facade (no black slivers);
    // the facade's eaves overhang onto grass, which reads as the building sitting on the field.
    for (let yy = b.cy - 6; yy <= b.cy - 4; yy++) for (let xx = b.cx - 1; xx <= b.cx + 1; xx++) set(xx, yy, VOID);
    D.push({ sprite: b.fc, x: (b.cx + 0.5) * TS, y: (b.cy - 3) * TS, phase: 0 });
  }
  // room anchors — SAME shape as before (hub.js reads cx/cy; x0..y1 kept for safety)
  const rooms = {};
  for (const b of [...TOWN_BUILDINGS, ...TOWN_AREAS]) {
    rooms[b.id] = { col: 0, row: 0, cx: (b.cx + 0.5) * TS, cy: (b.cy + 0.5) * TS,
      x0: (b.cx - 6) * TS, y0: (b.cy - 6) * TS, x1: (b.cx + 7) * TS, y1: (b.cy + 7) * TS };
  }
  const R = rooms;
  const put = (sprite, rm, dx, dy, phase = 0) => D.push({ sprite, x: rm.cx + dx * TS, y: rm.cy + dy * TS, phase });
  // plaza dressing — lamps at the corners + a campfire glow
  put('hub_lamp', R.plaza, -6, 4, 0); put('hub_lamp', R.plaza, 6, 4, 1); put('hub_lamp', R.plaza, -6, -4, 1); put('hub_lamp', R.plaza, 6, -4, 0);
  put('campfire', R.plaza, 0, 6);
  // garden — a well + flowerbeds + a bench
  put('hub_well', R.garden, 0, 1); put('town_flowerbed', R.garden, -4, 2); put('town_flowerbed', R.garden, 4, 2); put('town_bench', R.garden, -5, -1);
  // market — two stalls + barrels
  put('town_fc_stall', R.market, -3, -1); put('town_fc_stall', R.market, 3, 0); put('town_barrel', R.market, 5, 2); put('town_barrel', R.market, 6, 2.5);
  // scatter trees + bushes around the field edges (kept well clear of porches; decor < 250)
  const treeSpots = [
    [6, 6], [9, 20], [7, 31], [6, 41], [20, 5], [40, 5], [53, 7], [54, 20], [53, 32], [54, 41], [22, 42], [38, 42], [18, 30], [42, 30], [21, 33], [39, 33],
  ];
  for (const [tx, ty] of treeSpots) { if (tiles[ty * tw + tx] === FLOOR) D.push({ sprite: rng.next() < 0.4 ? 'town_tree2' : 'town_tree', x: (tx + 0.5) * TS, y: (ty + 0.9) * TS, phase: 0 }); }
  for (const [tx, ty] of [[10, 14], [50, 14], [10, 33], [50, 33], [26, 6], [34, 40], [24, 18]]) { if (tiles[ty * tw + tx] === FLOOR) D.push({ sprite: 'town_bush', x: (tx + 0.5) * TS, y: (ty + 0.9) * TS, phase: 0 }); }
  // fences framing the garden + market squares
  for (let i = -4; i <= 4; i++) { put('town_fence_h', R.garden, i, 5); }
  const tileset = { floor: ['town_grass', 'town_grass2', 'town_flowergrass', 'town_dirt', 'town_dirt2', 'town_plaza', 'town_plaza2'], wall: 'town_treeline', wallTop: 'town_treeline_top' };
  return { tw, th, tiles, floorVar, decor: D, rooms, tileset };
}
