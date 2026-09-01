// The in-run world: tilemap collision + all entities + combat resolution.
import { Particles } from '../engine/particles.js';
import { Enemies, Equipment, Items } from './content/registry.js';
import { equipItem } from './content/equipment.js';
import { Enemy } from './enemy.js';
import { Pickup } from './pickup.js';
import { drawSprite, fillRectWorld, fillCircleWorld, glowWorld, glowWorldCached, drawSpriteTint, strokeCircleWorld, uiText, uiRect, textWidth, UI, ctxRaw, camera, view, worldToScreen, addShake } from '../engine/renderer.js';
import { getSprite, frameAt, hasSprite, defineSprite } from '../engine/sprites.js';
import { circleHit, dist, dist2, clamp, rng, TAU } from '../engine/math.js';
import { P, withAlpha } from '../engine/palette.js';
import { Sfx } from '../engine/audio.js';
import { BALANCE } from './balance.js';
import { LIGHT_BY_SPRITE } from './lights.js';
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

// R26/B1 — local-player cold-white ground pool (identity, distinct from warm/enemy tones).
const PLAYER_RING_COLOR = '#cfeaff';

// R28/W1-B — beam OWNERSHIP colour families (ART_SPEC 3). The co-op `bm` snapshot channel
// carries a beam's colour string and nothing else, so ownership is signed BY COLOUR: callers
// pass a family hex, the render side looks the family up to pick line weight + cue size.
// Zero protocol change (no new tuple field). Anything outside the two warning families —
// every player weapon — falls through to 'player' and keeps the 3 px cold-colour treatment.
const BEAM_FAM = new Map();
for (const c of (BALANCE.ARTV && BALANCE.ARTV.BEAM_FAM_BOSS) || []) BEAM_FAM.set(c.toLowerCase(), 'boss');
for (const c of (BALANCE.ARTV && BALANCE.ARTV.BEAM_FAM_EVENT) || []) BEAM_FAM.set(c.toLowerCase(), 'event');
export function beamFamily(color) {
  return (typeof color === 'string' && BEAM_FAM.get(color.toLowerCase())) || 'player';
}
// family -> { lw: base line width, core: white-hot core width, ah/aw: arrowhead size }
// Exported (R28/W1-B2) so the co-op guest scene's own beam draw can share this ONE style
// table rather than keeping a second copy — see scenes/coop.js drawField().
//
// R29/D-1 (ART_SPEC 9) — ownership must survive TOTAL loss of hue. The R28 table signed
// ownership with colour + line weight only; the batch-C CVD measurement found boss #ff5a3c
// and event #ffc23c collapse onto the same yellow under protanopia/deuteranopia (rendered
// ΔE 18.3, hue delta 0.1°), leaving a 33% width difference as the sole cue, and the arrowhead
// ladder (8.5 vs 7) was erased by antialiasing to the same 8 device px. So each family now
// also owns a LINE STRUCTURE and an ARROW FORM that read in pure greyscale:
//   boss   solid + perpendicular rungs every `rung` px (ladder/hazard rhythm) + big solid head
//   event  dashed body (`dash`) — an interrupted rhythm nothing else has + hollow head
//   player thin, plain, unbroken + small solid barb
// `dash`/`rung`/`arrow`/`dot` are RENDER-ONLY style fields: the co-op `bm` tuple is untouched,
// ownership is still signed by the raw colour hex through beamFamily().
export const BEAM_STYLE = {
  boss:   { lw: 5, core: 2,   ah: 11.5, aw: 7.5, dot: 4,   rung: 18, dash: null,    arrow: 'solid' },
  event:  { lw: 4, core: 1.4, ah: 9.5,  aw: 5.5, dot: 3,   rung: 0,  dash: [10, 9], arrow: 'hollow' },
  player: { lw: 3, core: 1.0, ah: 5.5,  aw: 3.0, dot: 2.2, rung: 0,  dash: null,    arrow: 'solid' },
};

// R28/W1-B — boss ground ring (ART_SPEC 2.3): a dark red-orange contact ring that never
// leaves the boss's feet, so the fight's centre of gravity survives a 200-enemy swarm.
// Lives in the LAYER-2 ground-pool pass (ART_SPEC 2.1) rather than in Enemy.draw, so it
// can never be occluded by an enemy that happens to sort earlier — and so it stays visible
// with particles switched off (it is not a particle).
const BOSS_RING_COLOR = '#c8341c';

// R29/D-2 — a cached 1 px ink RING for the surrounded beacon. Built by stamping the frame's
// alpha at 8 one-pixel offsets, flood-filling that union with ink (`source-in`), then erasing
// the frame itself (`destination-out`) so the body is a hole. Cached per frame canvas, so a
// 4-frame walk cycle bakes 4 small canvases once and the beacon costs one drawImage a frame.
const RIM_PAD = 1;
const _rimCache = new WeakMap();
function beaconRim(frame) {
  if (!frame) return null;
  let c = _rimCache.get(frame);
  if (c !== undefined) return c;
  try {
    const w = frame.width + RIM_PAD * 2, h = frame.height + RIM_PAD * 2;
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      g.drawImage(frame, RIM_PAD + dx, RIM_PAD + dy);
    }
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = P.ink; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(frame, RIM_PAD, RIM_PAD);
  } catch (e) { c = null; }
  _rimCache.set(frame, c);
  return c;
}
// R26/B1 — south-edge wall-foot ambient occlusion: a 16×6 top-dark→transparent strip
// baked ONCE, blitted on the FLOOR tile below a wall so the wall/floor seam grounds
// (run + town share this path). Alpha driven by BALANCE so it stays tunable.
defineSprite('fx_wallao', 16, 6, (p) => {
  const A = (BALANCE.SCENE_FX && BALANCE.SCENE_FX.WALL_AO_ALPHA) || 0.35;
  for (let i = 0; i < 6; i++) p.rect(0, i, 16, 1, withAlpha('#000000', A * (1 - i / 6)));
}, { anchor: [0, 0] });

export class World {
  constructor(run) {
    this.run = run;
    this.tw = 0; this.th = 0;
    this.tiles = new Uint8Array(0);
    this.floorVar = new Uint8Array(0);
    this.decor = [];          // {sprite,x,y,anim}
    this.decals = [];         // R26/B1 render-only flat ground marks {sprite,x,y}
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.keys = 0;   // #8: keys dropped by room guardians, spent to open locked vault chests
    this.beams = [];        // transient lightning/laser visuals
    // R28/W5-fix (ART_SPEC 9, defect 8a-1) — boss move call-out captions. A dedicated list
    // (not routed through Particles.text()) so the offset can be derived from the boss
    // sprite's OWN anchor and a dark pill can be painted behind the text; see addMoveLabel().
    this.moveLabels = [];
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
    this.decals = map.decals || [];   // R26/B1 render-only (empty on maps without a decal pool)
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
  // R28/FIX-1 (Codex #8): the default was the warm P.emberL, which beamFamily() resolves into
  // the EVENT warning family — a weapon that forgot its colour would have silently borrowed
  // the 4 px amber "field hazard" styling. The default is now a cold player-family hex, so a
  // missing colour degrades into the harmless 3 px player look. Verified render-only: all 12
  // call sites (boss_moves ×4, events ×4, weapons ×4) pass an explicit family colour today.
  addBeam(x0, y0, x1, y1, color = '#9adcff') { this.beams.push({ x0, y0, x1, y1, color, life: 0.14, max: 0.14 }); }

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
    for (let i = this.moveLabels.length - 1; i >= 0; i--) {
      const t = this.moveLabels[i];
      t.life -= dt;
      if (t.life <= 0) { this.moveLabels.splice(i, 1); continue; }
      t.y += t.vy * dt;
    }
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
            const landed = player.takeDamage(p.damage, Math.atan2(p.vy, p.vx), this, 'proj:enemy');
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
    this.eachPlayer((p) => { if (!p.dead && dist(p.x, p.y, e.x, e.y) < r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - e.y, p.x - e.x), this, 'blast:' + ((e.def && e.def.id) || 'bomb')); });
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
    this.eachPlayer((p) => { if (!p.dead && dist(p.x, p.y, h.x, h.y) < h.r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - h.y, p.x - h.x), this, 'hazard:' + (h.kind || 'trap')); });
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
      // P1-2: periodic traps (e.g. spikes) telegraph the off→on flip with a SHAPE (shrinking ring
      // + "!" mark), not just an alpha fade — stays readable with particles/screen-flash off.
      if (def.periodic && !h.on) {
        const warnDur = Math.min(0.5, def.cycle * 0.35);
        if (h.tick <= warnDur) {
          const k = 1 - clamp(h.tick / warnDur, 0, 1);   // 0 at warn-start -> 1 at the moment it triggers
          strokeCircleWorld(h.x, h.y, h.r * (1.6 - 0.6 * k), withAlpha('#ffffff', 0.5 + 0.35 * k), 1.5);
          const sp = worldToScreen(h.x, h.y);
          uiText('!', sp.x, sp.y + 4, { size: 12, align: 'center', color: '#ffffff', weight: '900', alpha: 0.6 + 0.35 * k, shadow: false });
        }
      }
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
    const aoSp = getSprite('fx_wallao');   // R26/B1 wall-foot ambient occlusion
    const hash5 = (tx, ty) => (((tx * 73856093) ^ (ty * 19349663)) >>> 0) % 5;
    // R28/W2-D — the biome's own horizon band. The run camera is clamped to the map
    // (aimCamera), so the true out-of-bounds ring is never more than a 1-tile sliver;
    // the map's OUTER WALL RING is what a player actually reads as "the edge of the
    // world". When a biome supplies `oobBand`, that ring is painted with the horizon
    // sprites too, so the map dissolves into fog / cloud sea / dune haze over two tiles
    // instead of ending in a hard wall. Biomes (and the town) without it are untouched.
    const horizon = ts.oobBand ? ts.oobBand.map((n) => getSprite(n)) : null;
    const lastX = this.tw - 1, lastY = this.th - 1;
    // pick the band/variant sprite for a WALL tile (banded fill or plain ts.wall)
    const wallSprite = (tx, ty) => {
      if (horizon && (tx === 0 || ty === 0 || tx === lastX || ty === lastY)) return horizon[hash5(tx, ty) % horizon.length].frames[0];
      if (!bands) return wallSp.frames[0];
      const d = (this.wallDepth ? this.wallDepth[ty * tw + tx] : 0) | 0;
      const arr = bands[Math.min(d, bands.length - 1)];
      return arr[hash5(tx, ty) % arr.length].frames[0];
    };
    // R17 B14 / R20 B2: the void beyond the map edge used to render pure black. Fill the visible
    // out-of-bounds band with dimmed wall tiles (when banded, use band-2 receding cliff/skyline so it
    // reads as far rock fading with distance past the edge). Town + runs alike.
    // R28/W2-D: a biome may claim its OWN horizon language for the out-of-bounds ring
    // (`ts.oobBand`) instead of reusing the deep-wall band — crypt fades into a fog-drowned
    // tomb field, celestial into the cloud sea it floats on, desert into dune haze. Biomes
    // (and the town) without `oobBand` keep the exact previous band + alpha curve.
    // R28/W4-G (ART_SPEC 7): a map may instead supply `oobTiles` — an explicit
    // near→far STACK whose sprites already carry the darkness steps and the ruin
    // silhouettes, so the band never reads as one flat dimmed colour. Used by the
    // hub interiors; every other map keeps the band/alpha path below untouched.
    const oobStack = ts.oobTiles ? ts.oobTiles.map((n) => getSprite(n)) : null;
    if (rx0 < 0 || ry0 < 0 || rx1 >= this.tw || ry1 >= this.th) {
      const oobBand = horizon || (bands ? bands[Math.min(2, bands.length - 1)] : null);
      for (let ty = ry0; ty <= ry1; ty++) for (let tx = rx0; tx <= rx1; tx++) {
        if (tx >= 0 && tx < this.tw && ty >= 0 && ty < this.th) continue;
        const hsh = hash5(tx, ty);
        let alpha = 0.30 + hsh * 0.025;
        let fr = wallSp.frames[0];
        if (oobStack) {
          const dpx = Math.max(0, -tx, tx - (this.tw - 1)), dpy = Math.max(0, -ty, ty - (this.th - 1));
          const past = Math.max(dpx, dpy);
          // step 0-1 = the two near variants (hash-picked so no shape lands on a grid),
          // step 2+ = the deep variant, fading a little further out again.
          const idx = past <= 1 ? (hsh & 1) : 2;
          drawSprite(oobStack[Math.min(idx, oobStack.length - 1)].frames[0], tx * TS, ty * TS,
            { ax: 0, ay: 0, alpha: past <= 1 ? 0.95 : Math.max(0.45, 0.85 - (past - 2) * 0.12) });
          continue;
        }
        if (oobBand) {
          fr = oobBand[hsh % oobBand.length].frames[0];
          // additional fade with distance past the nearest edge
          const dpx = Math.max(0, -tx, tx - (this.tw - 1)), dpy = Math.max(0, -ty, ty - (this.th - 1));
          const distPast = Math.max(dpx, dpy);
          alpha = horizon
            ? (0.72 + (hsh % 3) * 0.06) * Math.max(0.22, 1 - distPast * 0.10)   // reads as receding distance, not a dim wall
            : (0.55 + (hsh % 3) * 0.06) * Math.max(0.4, 1 - distPast * 0.12);
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
      // R26/B1: soft contact shadow on the floor tile below any south-edge wall
      // (grounds the wall/floor seam; run + town alike).
      if (southFloor) drawSprite(aoSp.frames[0], tx * TS, (ty + 1) * TS, { ax: 0, ay: 0 });
    }
  }

  // P1-2: beam telegraph shape/motion cues — animated flow-dashes + a start dot / end
  // arrowhead. Pure canvas line/polygon work (no particle allocation) so it stays cheap
  // even with a dozen-plus simultaneous beams.
  // R28/W5-fix (ART_SPEC 9, defect 8a-1) — boss move call-out caption. Replaces the old
  // `world.particles.text(e.x, e.y - e.radius*e.scale - 10, ...)` call sites in boss_moves.js:
  // that offset used the enemy's hit-radius, which is unrelated to the SPRITE's drawn height,
  // so on big boss canvases (28-40 px, ART_SPEC ART-01) the caption landed on the body
  // (measured 2.69:1 in the final regression). Here the offset comes from the sprite's own
  // anchor (`sp.ay` = local-space distance from the drawn top to the feet anchor, scaled by
  // the entity's own `scale`) so it always clears the actual head, regardless of tier.
  addMoveLabel(e, str, color = P.emberL) {
    const sp = getSprite(e.sprite);
    const y = e.y - (sp ? sp.ay * e.scale : e.radius * e.scale * 1.6) - 10;
    this.moveLabels.push({ x: e.x, y, str, color, vy: -34, life: 0.8, max: 0.8 });
  }

  // R29/D-1 — the beam BODY, shared by the host draw loop and the co-op guest scene (both
  // used to inline the same three lineWorld() calls, which meant the new per-family line
  // structure would have had to be written twice). Draw order per family:
  //   1. near-black outline (R28/W5, kept — it is what holds contrast on bright sand)
  //   2. family colour at the family's weight, dashed if the family owns a dash rhythm
  //   3. white-hot core
  //   4. boss only: perpendicular rungs, so the boss line is the one with a periodic
  //      cross-section spike even when every hue is gone
  drawBeamBody(b, a, st = BEAM_STYLE.player) {
    const p0 = worldToScreen(b.x0, b.y0), p1 = worldToScreen(b.x1, b.y1);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ctx = ctxRaw();
    ctx.save();
    if (st.dash) ctx.setLineDash(st.dash);
    const stroke = (color, lw) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    };
    stroke(withAlpha(P.ink, a), st.lw + 2);
    stroke(withAlpha(b.color, a), st.lw);
    stroke(withAlpha('#ffffff', a * 0.85), st.core);
    if (st.rung) {
      ctx.setLineDash([]);
      const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const rl = st.lw / 2 + 4;                    // half-length of a rung, perpendicular
      // `wall_cage` can put ~8 long beams on screen at once, so cap the rung count per beam:
      // past ~48 the rhythm is already unmistakable and the extra strokes are pure cost.
      const step = Math.max(st.rung, len / 48);
      for (let d = step * 0.5; d < len - 1; d += step) {
        const cx = p0.x + ux * d, cy = p0.y + uy * d;
        const ax = cx - nx * rl, ay = cy - ny * rl, bx = cx + nx * rl, by = cy + ny * rl;
        ctx.strokeStyle = withAlpha(P.ink, a); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.strokeStyle = withAlpha(b.color, a); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // R28/W1-B: `st` = the ownership family's style row (see BEAM_STYLE) — the arrowhead grows
  // with the family so weight is a second, colour-independent ownership cue.
  drawBeamCues(b, a, st = BEAM_STYLE.player) {
    const p0 = worldToScreen(b.x0, b.y0), p1 = worldToScreen(b.x1, b.y1);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, len = Math.hypot(dx, dy);
    if (len < 2) return;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const ctx = ctxRaw();
    ctx.save();
    // R28/W5-fix (ART_SPEC 9, defect 3-a): dark outline UNDER the flow-dashes — same bright-
    // background problem as the beam body (see the beam loop in draw()), applied to the cue
    // layer per spec ("`drawBeamCues` 的虛線與箭頭同樣加深色描邊").
    ctx.strokeStyle = withAlpha(P.ink, a * 0.9);
    ctx.lineWidth = 3.5;
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -((this.time * 90) % 16);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    // directional flow dashes (animated offset -> reads as motion toward the impact end)
    ctx.strokeStyle = withAlpha('#ffffff', a * 0.9);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    ctx.setLineDash([]);
    // start marker: small dot, sized per family (a third colour-free ownership cue)
    ctx.fillStyle = withAlpha(P.ink, a);
    ctx.beginPath(); ctx.arc(p0.x, p0.y, (st.dot || 3) + 1.5, 0, TAU); ctx.fill();
    ctx.fillStyle = withAlpha(b.color, a);
    ctx.beginPath(); ctx.arc(p0.x, p0.y, st.dot || 3, 0, TAU); ctx.fill();
    // end marker: arrowhead pointing along the beam (shape info independent of colour)
    const ah = st.ah, aw = st.aw;
    const bx = p1.x - ux * ah, by = p1.y - uy * ah;
    // dark outline behind the arrowhead: same triangle, enlarged by a constant outward
    // margin, dark-filled, painted BEFORE the white arrowhead on top.
    const om = 2;
    const bx2 = p1.x - ux * (ah + om), by2 = p1.y - uy * (ah + om);
    ctx.beginPath();
    ctx.moveTo(p1.x + ux * om, p1.y + uy * om);
    ctx.lineTo(bx2 + nx * (aw + om), by2 + ny * (aw + om));
    ctx.lineTo(bx2 - nx * (aw + om), by2 - ny * (aw + om));
    ctx.closePath();
    ctx.fillStyle = withAlpha(P.ink, a);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(bx + nx * aw, by + ny * aw);
    ctx.lineTo(bx - nx * aw, by - ny * aw);
    ctx.closePath();
    // R29/D-1: FORM, not just size. `solid` = filled head (boss's big one, the player's small
    // barb); `hollow` = the ink triangle stays visible and only the rim is white, so the event
    // head reads as an outline even in greyscale, where the size ladder alone was worth
    // 2 device px between event and player.
    if (st.arrow === 'hollow') {
      ctx.strokeStyle = withAlpha('#ffffff', a);
      ctx.lineWidth = 2;
      ctx.lineJoin = 'miter';
      ctx.stroke();
    } else {
      ctx.fillStyle = withAlpha('#ffffff', a);
      ctx.fill();
    }
    ctx.restore();
  }

  // R26/B1 — visible world-rect (+margins) for viewport culling of decor/decals.
  // x margin ≈ half a wide prop; bottom margin holds tall bottom-anchored props
  // whose base sits just below the screen but whose body still poked in.
  _cullBounds() {
    const z = camera.zoom;
    const halfW = view.W / 2 / z, halfH = view.H / 2 / z;
    return {
      x0: camera.x - halfW - 16, x1: camera.x + halfW + 16,
      y0: camera.y - halfH - 8, y1: camera.y + halfH + 40,
    };
  }

  // R28/W4-G (ART_SPEC 7) — the FOREGROUND pass. Ceiling-hung props (`rfg_*`: chandeliers,
  // a fallen roof beam, the forge's smoke hood, drying lines, honour banners) paint AFTER
  // every actor, so the avatar walks visibly UNDER them and the room gains a near plane.
  // Callers that draw their own avatars after world.draw() — the hub scene — invoke this
  // themselves once the hero is down. A map with no `rfg_` decor does nothing here.
  drawForeground(cb = this._cullBounds()) {
    for (const d of this.decor) {
      if (!d.sprite.startsWith('rfg_')) continue;
      if (d.x < cb.x0 - 40 || d.x > cb.x1 + 40 || d.y < cb.y0 - 48 || d.y > cb.y1 + 48) continue;
      const sp = getSprite(d.sprite);
      drawSprite(frameAt(sp, this.time, d.phase || 0), d.x, d.y, { ax: sp.ax, ay: sp.ay });
    }
  }

  // R26/B1 — flat ground decals (render-only; empty unless a biome has a decal pool).
  drawDecals(cb) {
    if (!this.decals.length) return;
    for (const d of this.decals) {
      if (d.x < cb.x0 || d.x > cb.x1 || d.y < cb.y0 || d.y > cb.y1) continue;
      const sp = getSprite(d.sprite);
      drawSprite(sp.frames[0], d.x, d.y, { ax: sp.ax, ay: sp.ay });
    }
  }

  // R26/B1 — additive light channel: a pool under each emissive decor (culled +
  // flickered) then the local player's cold-white identity pool. After decor,
  // before actors, so pools sit on the ground beneath everything that moves.
  // R28/FIX-1 (Codex #3): `player`/`bossList` are parameters so the co-op GUEST can render
  // this exact layer for its own avatar + snapshot-puppet bosses instead of skipping it —
  // the guest's avatar is `coopScene.self`, never `world.player`.
  drawSceneLights(cb, player = this.player, bossList = this.enemies) {
    for (const d of this.decor) {
      const li = LIGHT_BY_SPRITE[d.sprite];
      if (!li) continue;
      if (d.x < cb.x0 || d.x > cb.x1 || d.y < cb.y0 || d.y > cb.y1) continue;
      const flick = li.flicker
        ? 1 - li.flicker * 0.5 + li.flicker * 0.5 * Math.sin(this.time * (li.speed || 4) + (d.phase || 0) * 2.1)
        : 1;
      glowWorldCached(d.x, d.y - (li.oy || 0), li.r, li.color, li.a * flick, { deco: true });
    }
    const p = player, fx = BALANCE.SCENE_FX;
    if (p && !p.dead && fx) glowWorldCached(p.x, p.y - 4, fx.PLAYER_RING_R, PLAYER_RING_COLOR, fx.PLAYER_RING_A);
    this.drawBossRings(cb, bossList);   // R28/W1-B boss contact rings share the ground-pool layer
  }

  // R28/FIX-1 (gate 高項「玩家淹沒」) — the TOP-layer half of the player identity mark. The
  // ground pool at layer 2 is painted over by every body that y-sorts after the avatar, so at
  // 60 enemies the player disappeared entirely. This thin cold-white foot ellipse is drawn
  // ABOVE the actors (see draw(), after the beams): a thin stroke, so it never covers the
  // sprite — it only says "your feet are HERE" when the sprite itself is buried.
  // Local avatar only (never remote co-op players), same as the ground pool and the beacon.
  // R29/D-2 — dual-channel version. The cold stroke keeps its role; a near-black outline is
  // stroked UNDER it (so the mark reads as a dark ellipse on 流沙荒漠's bright sand and
  // 天界雲海's bright cloud, where the cold-white channel is what the FLOOR is made of), and
  // four diagonal ticks give it a shape no ambient glow shares. Everything here is gated on
  // PLAYER_RING_TOP_A > 0, so the existing on/off instrumentation still switches the whole
  // mark off in one write.
  drawPlayerTopRing(player = this.player) {
    const p = player, fx = BALANCE.SCENE_FX;
    if (!p || p.dead || !fx) return;
    const A = fx.PLAYER_RING_TOP_A ?? 0.5;
    if (!(A > 0)) return;
    const r = fx.PLAYER_RING_TOP_R || 10;
    const s = worldToScreen(p.x, p.y), z = camera.zoom, ctx = ctxRaw();
    const rx = r * z, ry = r * 0.5 * z;
    const tick = (fx.PLAYER_RING_TICK || 0) * z;
    const ring = () => { ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, ry, 0, 0, TAU); ctx.stroke(); };
    const ticks = () => {
      if (!tick) return;
      ctx.beginPath();
      for (const [cx, cy] of [[0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]]) {
        const x0 = s.x + cx * rx, y0 = s.y + cy * ry;
        ctx.moveTo(x0, y0); ctx.lineTo(x0 + cx * tick, y0 + cy * tick * 0.5);
      }
      ctx.stroke();
    };
    ctx.save();
    ctx.lineCap = 'round';
    // The ink is at its OWN alpha, not A × ink (gated on A so the batch-C on/off control
    // still switches the whole mark off in one write). A ×A ink tops out near 0.35 effective,
    // which blends to only ~2:1 against 流沙荒漠's sand — below the ART_SPEC 9 floor. At 0.85
    // the ring's dark edge clears 3:1 on every floor in the game, which is the entire point
    // of adding a dark channel to a mark that was previously light-and-cold only.
    ctx.strokeStyle = withAlpha(P.ink, fx.PLAYER_RING_TOP_INK_A ?? 0.85);
    ctx.lineWidth = fx.PLAYER_RING_TOP_INK_W ?? 3.2;
    // stroked TWICE: a 3 px antialiased ellipse spreads over ~4 pixel columns, so most of the
    // ink lands at partial coverage and the measured edge contrast is diluted well below the
    // nominal alpha. A second pass compounds the partial pixels toward opaque without making
    // the ring any thicker (the whole point is a hard thin edge, not a dark band).
    ring(); ticks(); ring(); ticks();
    ctx.strokeStyle = withAlpha(PLAYER_RING_COLOR, A);
    ctx.lineWidth = fx.PLAYER_RING_TOP_W ?? 1.6;
    ring(); ticks();
    ctx.restore();
  }

  // R28/W1-B — persistent ground ring under every `boss:true` enemy (ART_SPEC 2.3).
  // Radius ≈ radius×scale×1.4; alpha pulses around BALANCE.ARTV.BOSS_RING_A. Render-only:
  // reads e.radius/e.scale, writes nothing. A soft cached pool grounds it, a stroked ellipse
  // gives the SHAPE cue (colour-blind redundancy — the ring reads without its hue).
  // `list` defaults to this.enemies (the host's own array) but accepts any enemy iterable —
  // R28/W1-B2 lets the co-op guest scene pass its `guest.enemies.values()` snapshot puppets
  // through the SAME method instead of re-deriving the ring math.
  drawBossRings(cb, list = this.enemies) {
    const A = (BALANCE.ARTV && BALANCE.ARTV.BOSS_RING_A) || 0.18;
    for (const e of list) {
      if (!e.boss || e.dead || e.spawnT > 0) continue;
      if (e.x < cb.x0 || e.x > cb.x1 || e.y < cb.y0 || e.y > cb.y1) continue;
      const r = e.radius * (e.scale || 1) * 1.4;
      const pulse = A + A * 0.55 * Math.sin(this.time * 3.2 + (e.t || 0));
      glowWorldCached(e.x, e.y, r, BOSS_RING_COLOR, pulse * 0.8);
      const s = worldToScreen(e.x, e.y), z = camera.zoom, ctx = ctxRaw();
      ctx.save();
      ctx.strokeStyle = withAlpha(BOSS_RING_COLOR, Math.min(1, pulse + 0.22));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, r * z, r * 0.5 * z, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  // R26/B1 — "surrounded" beacon: when ≥N enemies crowd the LOCAL player, redraw
  // its current frame as a pulsing silhouette so it never gets lost in a mob.
  // R28/FIX-1: pure white lost against pale/bleached mobs (crypt bone, celestial), so the
  // silhouette moved to the cold 青白 shard hue — the same identity family as the ground
  // ring — and the pulse ceiling went up. `player`/`list` are parameters so the co-op guest
  // can run the same beacon off its snapshot enemies (it has no host spatial grid).
  drawSurroundBeacon(player = this.player, list = null) {
    const p = player, fx = BALANCE.SCENE_FX;
    if (!p || p.dead || !fx) return;
    let near = 0;
    const R2 = fx.SURROUND_R * fx.SURROUND_R;
    const count = (e) => { if (!e.dead && e.spawnT <= 0 && dist2(p.x, p.y, e.x, e.y) < R2) near++; };
    if (list) { for (const e of list) count(e); }
    else this.forEachNear(p.x, p.y, fx.SURROUND_R, count);
    // R29/D-2: ramp instead of a cliff. Batch C measured the "dense but under N" window as
    // the weakest moment in the whole game (identity worth only ~11% over having no marks at
    // all), because the beacon fires on nothing until the ring closes. It now fades in from
    // SURROUND_N_SOFT neighbours and reaches full strength at SURROUND_N — same peak, no gap.
    const soft = Math.min(fx.SURROUND_N_SOFT || fx.SURROUND_N, fx.SURROUND_N);
    if (near < soft) return;
    const ramp = clamp((near - soft + 1) / (fx.SURROUND_N - soft + 1), 0, 1);
    const sp = getSprite(p.spriteName || 'player');
    const frame = p.moving ? frameAt(sp, p.walkT, 0) : frameAt(sp, p.t * 0.4);
    const hopY = p.hop > 0 ? -Math.sin(Math.min(1, p.hop / 0.6) * Math.PI) * 6 : 0;
    const a = (fx.SURROUND_A_MIN + (fx.SURROUND_A_MAX - fx.SURROUND_A_MIN) * (0.5 + 0.5 * Math.sin(this.time * 9))) * ramp;
    if (!(a > 0)) return;
    // R29/D-2: a near-black RIM around the silhouette (ART_SPEC 9's dark channel — the cold
    // beacon alone disappears into pale mobs and bright floors). It has to be a true ring:
    // the first attempt stacked offset ink tints and the overlap turned the beacon into a
    // dark blob (measured: patch Weber went from +0.46 to −0.15 and the window's internal
    // contrast rank FELL, i.e. it read as a flat mass). beaconRim() punches the body back
    // out, so only the 1 px edge is ink and the cold silhouette keeps its brightness.
    const rim = beaconRim(frame);
    if (rim) {
      const s = worldToScreen(p.x, p.y + hopY), z = camera.zoom, ctx = ctxRaw();
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * (fx.SURROUND_INK_A ?? 0.85));
      ctx.translate(s.x, s.y);
      if (p.faceX < 0) ctx.scale(-1, 1);
      ctx.scale(0.9 * z, 0.9 * z);
      ctx.drawImage(rim, -(sp.ax + RIM_PAD), -(sp.ay + RIM_PAD));
      ctx.restore();
    }
    drawSpriteTint(frame, p.x, p.y + hopY, P.shardL, a, { ax: sp.ax, ay: sp.ay, flipX: p.faceX < 0, scale: 0.9 });
  }

  draw() {
    const cb = this._cullBounds();
    this.drawTiles();
    this.drawDecals(cb);           // R26/B1 flat ground marks (after tiles, before hazards)
    this.drawHazards();
    // decor (torches etc.) — viewport-culled (R26/B1)
    // R28/W2-D: `lmk_*` landmarks are up to 5 tiles wide/tall, so the standard prop
    // margins in _cullBounds would pop them in at the screen edge; they get a wider
    // box. The prefix (not a flag) is the test on purpose — it survives the co-op map
    // wire format, which carries decor sprite NAMES but drops every other field.
    for (const d of this.decor) {
      // R28/W4-G: `rfg_` props are FOREGROUND occluders — they hang from the ceiling and
      // must paint over the actors, so drawForeground() owns them (same prefix-not-flag
      // test as `lmk_`, for the same co-op wire-format reason).
      if (d.sprite.startsWith('rfg_')) continue;
      const m = d.sprite.startsWith('lmk_') ? 48 : 0;
      if (d.x < cb.x0 - m || d.x > cb.x1 + m || d.y < cb.y0 - m || d.y > cb.y1 + m) continue;
      const sp = getSprite(d.sprite);
      drawSprite(frameAt(sp, this.time, d.phase || 0), d.x, d.y, { ax: sp.ax, ay: sp.ay });
    }
    this.drawSceneLights(cb);      // R26/B1 light pools + local-player ground ring + R28 boss rings
    // R28/W1-B (ART_SPEC 2.1 layer 3) — pickups leave the actor y-sort and go UNDER every
    // actor. In a dense swarm a loot shard that sorted after an enemy used to punch a hole
    // through it; loot is never the thing you must read first, so it yields to bodies.
    for (const pk of this.pickups) pk.draw(this);
    // layer 4 — depth-sorted actors (enemies + all avatars)
    const drawables = [];
    for (const e of this.enemies) drawables.push(e);
    for (const p of this._playerSet()) if (p && !p.dead) drawables.push(p);   // co-op: all living avatars depth-sorted
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw(this);
    // layer 5 — projectiles, then the continuous weapon VFX (beams/auras/turrets). R28/W1-B
    // moved the weapon draw pass out of Player.draw's tail: hung off the player it inherited
    // the player's y and got painted over by any enemy standing further down the screen.
    for (const p of this.projectiles) p.draw();
    for (const p of this._playerSet()) if (p && !p.dead && p.drawWeapons) p.drawWeapons(this);
    // beams (lightning / lasers) — boss-move/trap telegraphs. P1-2: colour alone doesn't
    // read for every player, so every beam also carries SHAPE (start dot + end arrowhead,
    // pointing at the actual danger) and MOTION (dashes flowing start->end).
    // R28/W1-B (ART_SPEC 3): the base line now carries the OWNERSHIP colour at the family's
    // weight and the white-hot core sits on top (was the reverse — a white 3 px line under a
    // 1.5 px tint, which washed every family into the same near-white streak). Boss telegraphs
    // are the heaviest, event/field next, player weapons keep 3 px.
    for (const b of this.beams) {
      const a = Math.max(0, b.life / b.max);
      const st = BEAM_STYLE[beamFamily(b.color)];
      // R28/W5-fix (ART_SPEC 9, defect 3-a) keeps the near-black outline under the family
      // colour line; R29/D-1 moved the three strokes (plus the new per-family dash/rung
      // structure) into drawBeamBody so the co-op guest renders the identical body.
      this.drawBeamBody(b, a, st);
      this.drawBeamCues(b, a, st);
    }
    // R28/FIX-1 — player identity, top half: shares the beam/telegraph layer so it sits above
    // every body. Cheap (one stroked ellipse) and always on, unlike the surround beacon.
    this.drawPlayerTopRing();
    // R28/W5-fix (ART_SPEC 9, defect 8a-1) — boss move captions: dark pill behind the text so
    // it holds ≥4.5:1 against ANY background, then the text on top. Sits in the same
    // always-above-actors layer as the beam cues (drawn just before, same reasoning).
    for (const t of this.moveLabels) {
      const a = Math.max(0, Math.min(1, t.life / t.max));
      const s = worldToScreen(t.x, t.y);
      const size = UI.FONT_BODY;
      const padX = 8, padY = 5;
      const w = textWidth(t.str, size, UI.WEIGHT_HEADING) + padX * 2;
      const h = size + padY * 2;
      uiRect(s.x - w / 2, s.y - h / 2, w, h, withAlpha(P.ink, a * 0.72), { radius: h / 2 });
      uiText(t.str, s.x, s.y, { size, color: withAlpha(t.color, a), align: 'center', baseline: 'middle', weight: UI.WEIGHT_HEADING, shadow: false });
    }
    // particles
    this.particles.draw();
    // R26/B1 "surrounded" beacon — local player only, on top of the in-world layer
    this.drawSurroundBeacon();
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

  // 3) ground texturing — ashen grass base over all FLOOR (variants 0/1/2).
  // R26/B2: the variant is chosen by low-frequency value-noise (座標 hash), NOT a per-tile
  // coin-flip, so grass2 / ashgrass form contiguous 2-5 tile patches — burn scars read as
  // scarred DISTRICTS rather than salt-and-pepper noise. We STILL consume exactly one
  // rng.next() per FLOOR tile so the layout rng stream (rift edges / recarve / decor scatter
  // further down) stays byte-identical; floorVar is purely visual so its value can be hashed.
  const vh = (x, y, s) => { let n = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; n = ((n ^ (n >>> 13)) * 1274126177) >>> 0; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const vnoise = (x, y, sc, s) => {
    const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = vh(ix, iy, s), b = vh(ix + 1, iy, s), c = vh(ix, iy + 1, s), d = vh(ix + 1, iy + 1, s);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
  };
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    if (tiles[y * tw + x] !== FLOOR) continue;
    rng.next();   // preserve the layout rng stream (variant chosen by hash below, NOT this draw)
    const ash = vnoise(x, y, 2.6, 1301), worn = vnoise(x + 40, y - 25, 3.0, 4703);
    floorVar[y * tw + x] = ash > 0.80 ? 2 : (worn > 0.74 ? 1 : 0);   // ~12% ash / ~13% worn, clustered
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
        if (outer && rng.next() > 0.45) continue;   // (rng UNCHANGED — keeps route + downstream stream)
        rng.next();                                  // (rng UNCHANGED — variant now chosen by座標 hash)
        const gx = x + ox, gy = y + oy;
        // R26/B2: centre + ±1 lay a SOLID width-3 cracked avenue (reads as one continuous street);
        // the outer ±2 ring is thinned to ~25% via a hash gate (no rng) for a little ragged edge;
        // ruin_path2 cobbles are a ~15% hash accent, not a 40% per-tile coin-flip against grass.
        if (outer && vh(gx, gy, 8087) > 0.55) continue;
        setVar(gx, gy, vh(gx, gy, 5501) < 0.15 ? 4 : 3);
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

// R19/B2 → R28/W4-G: the 6 building INTERIOR maps. Same return contract as makeCamp.
//
// R28/W4-G (ART_SPEC 7) rebuild. The R19/R20 rooms were 17-25 tiles wide and 13-18 tall —
// NARROWER and SHORTER than the 1280×720@zoom3 viewport (26.7×15 tiles) — and the hub camera
// did not clamp to the map, so the bottom third of every interior screenshot was the dimmed
// out-of-bounds band and the sides leaked too. Every room is now at least 31×19 (spec floor is
// 29×17; the extra margin covers zoom 5 on a 2560-wide display), widths stay ODD so `cx` is the
// true centre column, and hub/lifecycle.js clamps the camera the way run.js always has.
//
// Each room now owns, per ART_SPEC 7:
//   · ONE animated "working" focal installation (rfoc_*, with a light-pool entry in lights.js)
//   · THREE narrative objects nobody else has (rnar_*)
//   · ONE ceiling-hung foreground occluder (rfg_*, drawn after the actors — see drawForeground)
//   · ONE dedicated floor material (intf_*, floorVar slot 6) laid in ragged blobs, plus flat
//     ground decals (intd_*) so bare floor never dominates
// and the layouts are deliberately OFF-AXIS: mirror pairs are now a minority of the dressing
// instead of the whole of it.
//
// `rooms = { [id]: <station-anchor centre>, exit: <just inside the doorway> }` (both in PIXELS,
// same fields as makeCamp's anchors) — unchanged, as are `triggers[]`, the 3-wide walk-in
// doorway, the reserved station/exit tiles and the decor `solid` collision semantics.
export function makeInterior(id) {
  const SPEC = {
    church:       { tw: 33, th: 21 },   // cruciform: long nave + full transept + two side chapels
    guild:        { tw: 35, th: 19 },   // hall over a south-west taproom and a south-east store
    blacksmith:   { tw: 33, th: 19 },   // work floor + an east forge bay + a north stock nook
    clothing:     { tw: 33, th: 19 },   // shop floor + north display bay + west fitting alcove
    achievements: { tw: 37, th: 19 },   // long gallery, three uneven north niches, south alcove
    personal:     { tw: 31, th: 19 },   // one room, partitioned into a study nook and a pantry
  }[id] || { tw: 33, th: 19 };
  const { tw, th } = SPEC;
  const tiles = new Uint8Array(tw * th).fill(WALL);
  const floorVar = new Uint8Array(tw * th);
  const carve = (x, y) => { if (x >= 1 && y >= 1 && x < tw - 1 && y < th - 1) tiles[y * tw + x] = FLOOR; };
  const setVar = (x, y, v) => { if (x >= 0 && y >= 0 && x < tw && y < th && tiles[y * tw + x] === FLOOR) floorVar[y * tw + x] = v; };
  const fillRect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) carve(x, y); };
  // put a WALL mass back INSIDE the carve — partitions/piers break the "one big box" read
  const wallRect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && y > 0 && x < tw - 1 && y < th - 1) tiles[y * tw + x] = WALL; };
  const cx = tw >> 1;   // doorway / station axis column
  const hash2 = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);

  // --- carve the NON-rectangular shape per building ---
  if (id === 'church') {
    fillRect(cx - 4, 1, cx + 4, th - 2);          // the nave, running the full height
    fillRect(10, 3, 22, 5);                        // sanctuary widening behind the altar
    fillRect(2, 7, tw - 3, 12);                    // transept arms, wall to wall
    fillRect(3, 13, 9, 18);                        // west chapel (bell + reliquary)
    fillRect(9, 15, 12, 16);                       // …and its short connecting passage
    fillRect(23, 13, 29, 17);                      // east scriptorium
    fillRect(20, 14, 24, 15);                      // …its passage
    wallRect(8, 8, 8, 9); wallRect(25, 10, 25, 11);     // crossing piers (asymmetric)
    wallRect(5, 10, 5, 11); wallRect(12, 8, 12, 8); wallRect(20, 11, 20, 12); wallRect(28, 8, 28, 9);
    wallRect(11, 17, 11, 18); wallRect(22, 17, 22, 18);   // chapel/scriptorium buttresses
  } else if (id === 'guild') {
    fillRect(1, 1, tw - 2, 11);                    // the great hall
    fillRect(1, 11, 20, 17);                       // taproom, jutting south-west
    fillRect(24, 12, tw - 2, 17);                  // store room, south-east
    fillRect(20, 14, 24, 15);                      // passage between them
    wallRect(9, 4, 10, 6);                         // the chimney block, off-axis
    wallRect(28, 6, 29, 7);                        // a collapsed corner pier
    wallRect(4, 8, 4, 9); wallRect(16, 3, 16, 4); wallRect(22, 8, 23, 9);
    wallRect(3, 14, 4, 15); wallRect(15, 16, 16, 17); wallRect(29, 14, 30, 15);
  } else if (id === 'blacksmith') {
    fillRect(1, 2, 24, th - 2);                    // main work floor
    fillRect(24, 4, tw - 2, 13);                   // east forge bay
    fillRect(4, 1, 10, 2);                         // north stock nook
    wallRect(13, 6, 14, 8);                        // quench-corner pier
    wallRect(6, 12, 6, 14);                        // a stub of collapsed wall
    wallRect(3, 6, 3, 7); wallRect(9, 9, 10, 10); wallRect(19, 13, 20, 14);
    wallRect(23, 16, 24, 17); wallRect(29, 5, 30, 5);
  } else if (id === 'clothing') {
    fillRect(2, 3, 30, th - 2);                    // shop floor
    fillRect(cx - 4, 1, cx + 4, 3);                // north display bay
    fillRect(1, 8, 5, 13);                         // west fitting alcove
    wallRect(6, 9, 6, 12);                         // …its screen wall (gap at row 13)
    wallRect(19, 5, 20, 6);                        // a pier by the loom
    wallRect(9, 6, 9, 7); wallRect(13, 10, 14, 11); wallRect(22, 13, 23, 14);
    wallRect(28, 8, 29, 8); wallRect(4, 16, 5, 17);
  } else if (id === 'achievements') {
    fillRect(2, 3, tw - 3, 16);                    // the long gallery
    fillRect(5, 1, 9, 3); fillRect(14, 1, 22, 2); fillRect(27, 1, 31, 3);   // three UNEVEN niches
    fillRect(10, 16, 26, 17);                      // south alcove in front of the doors
    wallRect(11, 6, 11, 8); wallRect(26, 10, 26, 12);   // two piers, different rows
    wallRect(6, 10, 6, 11); wallRect(15, 13, 16, 14); wallRect(22, 5, 23, 6);
    wallRect(31, 7, 32, 8); wallRect(8, 15, 9, 15); wallRect(29, 15, 30, 16);
  } else { // personal
    fillRect(2, 2, 28, th - 2);
    fillRect(11, 1, 19, 2);                        // sleeping alcove bumping north
    tiles[2 * tw + 2] = WALL; tiles[2 * tw + 28] = WALL;                 // clipped corners
    tiles[(th - 2) * tw + 2] = WALL; tiles[(th - 2) * tw + 28] = WALL;
    wallRect(23, 4, 23, 8);                        // study-nook partition (gap at row 9)
    wallRect(5, 10, 5, 13);                        // pantry partition (gap at row 14)
    wallRect(9, 8, 10, 8); wallRect(19, 11, 20, 12); wallRect(26, 13, 27, 14);
    wallRect(3, 5, 3, 6); wallRect(12, 16, 13, 17);
  }

  // --- south doorway = the EXIT, a 3-tile gap centred on cx ---
  const doorY = th - 1;
  for (const dx of [-1, 0, 1]) {
    carve(cx + dx, th - 2);
    tiles[doorY * tw + (cx + dx)] = FLOOR;
    setVar(cx + dx, doorY, 0);
  }

  // --- anchors (station top-centre, exit just inside the doorway) ---
  const stationRow = 3;
  const rooms = {
    [id]: { col: 0, row: 0, cx: (cx + 0.5) * TS, cy: (stationRow + 0.5) * TS,
      x0: (cx - 6) * TS, y0: 0, x1: (cx + 7) * TS, y1: (stationRow + 7) * TS },
    exit: { col: 0, row: 0, cx: (cx + 0.5) * TS, cy: (th - 2 + 0.5) * TS,
      x0: (cx - 6) * TS, y0: (th - 8) * TS, x1: (cx + 6) * TS, y1: th * TS },
  };
  // The station triplet, the KEEPER ATRIUM around it, and a walkable spine from it down to
  // the door are carved LAST, so no partition/pier added above can ever wall in the station,
  // a keeper NPC (NPC_POS_INT reaches dx ±3 / dy +4) or the way out. This is the structural
  // guarantee behind hub/lifecycle.js's NPC placement — W4-G's first pass put a blacksmith
  // pier on the keeper's tile and stood him inside a wall.
  for (let y = stationRow; y <= stationRow + 4; y++) for (let x = cx - 3; x <= cx + 3; x++) carve(x, y);
  for (let y = stationRow; y <= th - 2; y++) { carve(cx - 1, y); carve(cx, y); carve(cx + 1, y); }

  // --- floor texturing --------------------------------------------------------
  // 0/1 wood · 2/3 stone · 4/5 carpet runner · 6 = THIS room's dedicated material.
  const usesWood = id === 'guild' || id === 'clothing' || id === 'personal';
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    if (tiles[y * tw + x] !== FLOOR) continue;
    floorVar[y * tw + x] = usesWood ? (rng.chance(0.18) ? 1 : 0) : (rng.chance(0.18) ? 3 : 2);
  }
  // R28/W4-G: the dedicated material is laid in RAGGED blobs (never a rect, never a per-tile
  // roll) around the places the room is actually used — the wax field, the drinking end, the
  // fire's working floor, the cutting floor, the hall's centre, the bed-and-hearth corner.
  const matBlob = (bx, by, r) => {
    for (let y = by - r - 1; y <= by + r + 1; y++) for (let x = bx - r - 2; x <= bx + r + 2; x++) {
      if (x < 0 || y < 0 || x >= tw || y >= th) continue;
      const wob = ((hash2(x, y) % 128) / 128 - 0.5) * 1.9;           // ragged, uneven edge
      if (Math.hypot(x - bx, (y - by) * 1.3) + wob > r) continue;
      setVar(x, y, 6);
    }
  };
  const MAT_BLOBS = {
    church: [[cx, 6, 5], [cx - 6, 10, 4.5], [cx + 6, 10, 4], [6, 16, 3], [26, 15, 3], [cx, 16, 3.5]],
    guild: [[8, 14, 5.5], [15, 13, 4.5], [29, 15, 4], [6, 5, 4.5], [24, 4, 5], [18, 9, 4.5], [12, 3, 3.5], [31, 9, 3.5]],
    blacksmith: [[27, 8, 5.5], [21, 11, 4.5], [7, 4, 4], [10, 12, 4.5], [17, 6, 4], [5, 16, 3.5], [14, 16, 3.5], [30, 12, 3]],
    clothing: [[11, 12, 4.5], [24, 8, 4.5], [3, 11, 2.5], [7, 5, 3.5], [27, 15, 3], [18, 16, 3]],
    achievements: [[cx, 9, 6], [8, 13, 4], [30, 6, 4], [7, 5, 3.5], [28, 14, 3.5], [20, 4, 3]],
    personal: [[8, 6, 4.5], [cx, 11, 4], [25, 7, 3.5], [9, 14, 3.5], [21, 15, 3], [18, 4, 3]],
  }[id] || [];
  for (const [bx, by, r] of MAT_BLOBS) matBlob(bx, by, r);
  // carpet runner up the true central axis (church gets the grander 3-wide nave runner)
  if (id === 'church' || id === 'clothing' || id === 'achievements' || id === 'personal') {
    const span = id === 'church' ? [-1, 0, 1] : [0];
    for (let y = 2; y <= th - 2; y++) for (const dx of span) setVar(cx + dx, y, rng.chance(0.3) ? 5 : 4);
  }

  const D = [];
  const decals = [];
  // reserved tiles: the station triplet, the doorway columns, and the ATRIUM the keeper NPCs
  // stand in (NPC_POS_INT offsets reach dx ±3 / dy +4 from the station anchor) — nothing may
  // be dropped there or a keeper ends up inside a prop.
  const reserved = new Set();
  const reserveRect = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < tw && y < th) reserved.add(y * tw + x); };
  reserveRect(cx - 3, stationRow, cx + 3, stationRow + 4);   // station + keeper atrium (NPC_POS_INT reaches dx ±3 / dy +4)
  // R29/D-3 (RE-06「道具不與動線競爭」): the reserve used to stop 4 rows above the door, so
  // filler props landed in the middle of the ONE corridor every visit walks (measured: guild 4,
  // blacksmith 2, personal 2). The whole carved spine is now off limits to dressing — it is
  // the room's movement line and its sightline to the station, and nothing decorative earns
  // a place in it. Props are unaffected elsewhere; interior decor carries no collision, so
  // this is purely what the player looks at on the way in.
  reserveRect(cx - 1, stationRow, cx + 1, th - 1);           // the walk-out corridor / station sightline
  // B3 walk-out trigger: glowing circle on the inside-door tile (spawn point is one row above)
  const triggers = [{ tx: cx, ty: th - 2, target: 'town' }];
  D.push({ sprite: 'ruin_doorglow', x: cx * TS, y: (th - 2) * TS, phase: 1 });
  const putXY = (sprite, tx, ty, ox = 0.5, oy = 0.85, phase = 0) => {
    if (tx >= 0 && ty >= 0 && tx < tw && ty < th && tiles[ty * tw + tx] === FLOOR && !reserved.has(ty * tw + tx)) D.push({ sprite, x: (tx + ox) * TS, y: (ty + oy) * TS, phase });
  };
  // ceiling-hung FOREGROUND props: no FLOOR test (they hang over whatever is below) and no
  // collision — world.drawForeground() paints every `rfg_` sprite after the actors.
  const putFg = (sprite, tx, ty) => D.push({ sprite, x: (tx + 0.5) * TS, y: ty * TS });
  const putDecal = (sprite, tx, ty, ox = 0.5, oy = 0.5) => {
    if (tx >= 0 && ty >= 0 && tx < tw && ty < th && tiles[ty * tw + tx] === FLOOR) decals.push({ sprite, x: (tx + ox) * TS, y: (ty + oy) * TS });
  };
  // scatter a decal kind through the room's used areas without ever landing on a fixed offset
  const scatterDecals = (sprite, spots, n) => {
    for (const [sx, sy, r] of spots) for (let i = 0; i < n; i++) {
      const h = hash2(sx * 31 + i * 7, sy * 17 + i * 13);
      const ax = sx + ((h % 200) / 100 - 1) * r, ay = sy + (((h >> 8) % 200) / 100 - 1) * r;
      putDecal(sprite, Math.round(ax), Math.round(ay), 0.3 + ((h >> 16) % 5) * 0.1, 0.3 + ((h >> 20) % 5) * 0.1);
    }
  };

  // R28/W4-G: two SHARED, world-positioned ground breaks laid over the whole room — ash
  // drift and floor cracks. World coords (not tile art) so they never fall on a grid, and
  // they are what actually keeps a big room from reading as a bare sheet.
  const spread = (sprite, every, seed) => {
    for (let y = 1; y < th - 1; y++) for (let x = 1; x < tw - 1; x++) {
      if (tiles[y * tw + x] !== FLOOR) continue;
      const h = hash2(x * 7 + seed, y * 13 + seed);
      if (h % every) continue;
      putDecal(sprite, x, y, 0.15 + ((h >> 9) % 7) * 0.11, 0.15 + ((h >> 15) % 7) * 0.11);
    }
  };
  spread('intd_dust', 5, 11);
  spread('intd_crack', 9, 29);

  // torchposts: still a pair at the door (it reads as a threshold), but the upper pair is gone —
  // each room's own lighting (focal installation, lanterns, chandelier) carries the top half now.
  putXY('ruin_torchpost', cx - 3, th - 3, 0.5, 0.85, 1); putXY('ruin_torchpost', cx + 3, th - 3, 0.5, 0.85, 0);

  // --- per-building dressing: focal installation, three narrative objects, foreground
  //     occluder, reused rint_* filler. Placements are deliberately OFF the mirror axis.
  if (id === 'church') {
    putXY('rfoc_censer', cx + 4, 9, 0.5, 0.9);                                  // FOCAL: swinging thurible
    putXY('rnar_ch_offering', cx - 4, 10, 0.5, 0.9);                            // narrative 1
    putXY('rnar_ch_bell', 6, 17, 0.5, 0.9);                                     // narrative 2 (west chapel)
    putXY('rnar_ch_scribe', 26, 16, 0.5, 0.9);                                  // narrative 3 (scriptorium)
    putFg('rfg_ch_chandelier', cx, 5);                                          // FOREGROUND over the crossing
    putFg('rfg_ch_chandelier', cx + 1, 13);
    putXY('rint_arch', 11, 7); putXY('rint_arch', 21, 11); putXY('rint_arch', 4, 12);
    putXY('rint_stained', 2, 8); putXY('rint_stained', 2, 11); putXY('rint_stained', 30, 9);
    putXY('rint_stained', 30, 12); putXY('rint_stained', 13, 1);
    for (const [ry, side] of [[13, -1], [15, 1], [16, -1], [18, 1], [19, -1]]) putXY('rint_pew', cx + side * 3, ry);
    for (const [ry, side] of [[8, -1], [9, 1], [11, -1]]) putXY('rint_pew', cx + side * 6, ry);
    putXY('rint_candles', cx - 4, 6, 0.5, 0.85, 0); putXY('rint_candles', cx + 2, 10, 0.5, 0.85, 1);
    putXY('rint_candles', 5, 14, 0.5, 0.85, 1); putXY('rint_candles', 27, 14, 0.5, 0.85, 0);
    putXY('rint_pillar', 9, 12); putXY('rint_pillar', 24, 8); putXY('rint_pillar', 28, 12);
    putXY('rint_bookshelf', 28, 16); putXY('rint_crate', 8, 17);
    putXY('rint_pillar', 6, 8); putXY('rint_pillar', 13, 17); putXY('rint_pillar', 19, 17); putXY('rint_pillar', 30, 15);
    putXY('rint_candles', 9, 16, 0.5, 0.85, 1); putXY('rint_candles', 24, 16, 0.5, 0.85, 0);
    putXY('rint_candles', 3, 8, 0.5, 0.85, 0); putXY('rint_candles', 29, 11, 0.5, 0.85, 1);
    for (const [ry, side] of [[10, -1], [12, 1], [17, 1]]) putXY('rint_pew', cx + side * 3, ry);
    putXY('rint_arch', 28, 7); putXY('rint_bench', 5, 17); putXY('rint_bench', 27, 13);
    putXY('rint_crate', 24, 17); putXY('rint_barrel', 29, 16); putXY('rint_barrel', 4, 14);
    putXY('rint_desk', 25, 14, 0.5, 0.9);
    scatterDecals('intd_wax', [[cx, 6, 3], [cx - 4, 11, 3], [6, 15, 2], [26, 15, 2]], 3);
  } else if (id === 'guild') {
    putXY('rfoc_stewpot', 7, 15, 0.5, 0.9);                                     // FOCAL: the hall cauldron
    putXY('rnar_gu_table', 13, 14, 0.5, 0.9);                                   // narrative 1
    putXY('rnar_gu_maptable', 28, 5, 0.5, 0.9);                                 // narrative 2
    putXY('rnar_gu_trophy', 31, 3, 0.5, 0.95);                                  // narrative 3
    putFg('rfg_gu_beam', cx - 3, 7);                                            // FOREGROUND: fallen roof beam
    putXY('rint_desk', cx - 5, 5, 0.5, 0.9); putXY('rint_desk', cx + 6, 6, 0.5, 0.9);
    putXY('rint_bench', 4, 8); putXY('rint_bench', 5, 10); putXY('rint_bench', 17, 9);
    putXY('rint_bench', 11, 17); putXY('rint_bench', 3, 13);
    putXY('rint_lantern', 3, 2, 0.5, 0.85, 0); putXY('rint_lantern', 30, 2, 0.5, 0.85, 1);
    putXY('rint_lantern', 21, 8, 0.5, 0.85, 1);
    putXY('ruin_banner', 6, 1, 0.5, 0.9, 0); putXY('ruin_banner', 24, 1, 0.5, 0.9, 1);
    putXY('ruin_banner', 31, 1, 0.5, 0.9, 0);
    putXY('rint_crate', 26, 13); putXY('rint_crate', 27, 15); putXY('rint_barrel', 30, 13);
    putXY('rint_barrel', 32, 16); putXY('rint_crate', 31, 17); putXY('rint_barrel', 2, 16);
    putXY('rint_bookshelf', 33, 3); putXY('rint_trophyshelf', 2, 3, 0.5, 0.9);
    putXY('rint_pillar', 12, 9); putXY('rint_pillar', 23, 4);
    putXY('rint_bench', 8, 7); putXY('rint_barrel', 14, 10); putXY('rint_crate', 19, 12); putXY('rint_bench', 6, 16);
    putXY('rint_crate', 2, 12); putXY('rint_crate', 4, 15); putXY('rint_crate', 18, 16); putXY('rint_crate', 25, 16);
    putXY('rint_barrel', 3, 17); putXY('rint_barrel', 16, 12); putXY('rint_barrel', 31, 14);
    putXY('rint_desk', 26, 9, 0.5, 0.9); putXY('rint_bookshelf', 2, 6);
    putXY('rint_lantern', 12, 3, 0.5, 0.85, 1); putXY('rint_lantern', 27, 11, 0.5, 0.85, 0);
    putXY('rint_pillar', 5, 3); putXY('rint_pillar', 19, 2); putXY('rint_pillar', 32, 9);
    putXY('ruin_banner', 11, 1, 0.5, 0.9, 1);
    putXY('rint_bench', 15, 9); putXY('rint_trophyshelf', 12, 12, 0.5, 0.9); putXY('rint_desk', 18, 11, 0.5, 0.9);
    putXY('rint_pillar', 14, 8); putXY('rint_pillar', 21, 6); putXY('rint_crate', 12, 8);
    putXY('rint_barrel', 20, 10); putXY('rint_crate', 22, 12); putXY('rint_bookshelf', 24, 8);
    putXY('rint_barrel', 9, 12); putXY('rint_crate', 5, 12); putXY('rint_lantern', 17, 14, 0.5, 0.85, 0);
    putXY('rint_weaponrack', 33, 8); putXY('rint_plant', 2, 2); putXY('rint_plant', 19, 16);
    scatterDecals('intd_ale', [[10, 14, 3], [7, 16, 2], [16, 12, 3], [24, 5, 3]], 3);
  } else if (id === 'blacksmith') {
    putXY('rfoc_forgefire', 28, 8, 0.5, 0.95);                                  // FOCAL: the fire is in
    putXY('rnar_bs_anvil', 22, 11, 0.5, 0.9);                                   // narrative 1
    putXY('rnar_bs_quench', 30, 12, 0.5, 0.9);                                  // narrative 2
    putXY('rnar_bs_stock', 5, 5, 0.5, 0.9);                                     // narrative 3
    putFg('rfg_bs_hood', 28, 3);                                                // FOREGROUND: smoke hood
    putXY('rint_weaponrack', 2, 6); putXY('rint_weaponrack', 2, 10); putXY('rint_weaponrack', 2, 14);
    putXY('rint_weaponrack', 10, 3); putXY('rint_weaponrack', 25, 5);
    putXY('rint_grindstone', 19, 15); putXY('rint_grindstone', 26, 12);
    putXY('rint_crate', 8, 16); putXY('rint_crate', 9, 14); putXY('rint_crate', 15, 16);
    putXY('rint_barrel', 7, 17); putXY('rint_barrel', 12, 14); putXY('rint_barrel', 22, 16);
    putXY('rint_lantern', 21, 4, 0.5, 0.85, 0); putXY('rint_lantern', 4, 9, 0.5, 0.85, 1);
    putXY('rint_pillar', 12, 10); putXY('rint_pillar', 20, 6);
    putXY('rint_bench', 6, 8); putXY('rint_desk', 15, 12, 0.5, 0.9);
    putXY('rint_crate', 3, 4); putXY('rint_crate', 11, 6); putXY('rint_crate', 18, 3); putXY('rint_crate', 21, 14);
    putXY('rint_crate', 30, 16); putXY('rint_barrel', 5, 10); putXY('rint_barrel', 16, 9);
    putXY('rint_barrel', 24, 15); putXY('rint_barrel', 31, 10);
    putXY('rint_weaponrack', 8, 12); putXY('rint_weaponrack', 15, 4);
    putXY('rint_grindstone', 11, 16); putXY('rint_bench', 13, 12); putXY('rint_bench', 3, 16);
    putXY('rint_pillar', 18, 9); putXY('rint_pillar', 8, 6); putXY('rint_bookshelf', 23, 2);
    putXY('rint_lantern', 12, 17, 0.5, 0.85, 1); putXY('rint_lantern', 29, 4, 0.5, 0.85, 0);
    putXY('rint_crate', 14, 13); putXY('rint_barrel', 10, 15); putXY('rint_bench', 20, 12);
    putXY('rint_pillar', 5, 13); putXY('rint_weaponrack', 22, 4); putXY('rint_crate', 17, 17);
    scatterDecals('intd_soot', [[27, 10, 3], [22, 12, 3], [18, 15, 2], [9, 5, 3]], 3);
  } else if (id === 'clothing') {
    putXY('rfoc_loom', 25, 8, 0.5, 0.95);                                       // FOCAL: the loom is threaded
    putXY('rnar_cl_bolts', 5, 6, 0.5, 0.9);                                     // narrative 1
    putXY('rnar_cl_sewing', 11, 13, 0.5, 0.9);                                  // narrative 2
    putXY('rnar_cl_dye', 29, 14, 0.5, 0.9);                                     // narrative 3
    putFg('rfg_cl_line', cx - 2, 6);                                            // FOREGROUND: drying line
    putFg('rfg_cl_line', cx + 5, 12);
    putXY('rint_rack', 8, 8); putXY('rint_rack', 8, 11); putXY('rint_rack', 21, 12);
    putXY('rint_rack', 15, 16); putXY('rint_rack', 27, 4);
    putXY('rint_mannequin', cx - 5, 4, 0.5, 0.9); putXY('rint_mannequin', cx + 6, 3, 0.5, 0.9);
    putXY('rint_mannequin', 19, 15, 0.5, 0.9);
    putXY('rint_mirror', 2, 10); putXY('rint_mirror', 4, 13); putXY('rint_mirror', 24, 16);
    putXY('rint_lantern', 3, 4, 0.5, 0.85, 0); putXY('rint_lantern', 30, 6, 0.5, 0.85, 1);
    putXY('rint_crate', 30, 9); putXY('rint_barrel', 29, 11); putXY('rint_bookshelf', 2, 16);
    putXY('rint_plant', 22, 4); putXY('rint_chest2', 7, 16);
    putXY('rint_rack', 12, 5); putXY('rint_rack', 18, 9); putXY('rint_rack', 25, 12); putXY('rint_rack', 5, 15);
    putXY('rint_mannequin', 9, 16, 0.5, 0.9); putXY('rint_mannequin', 28, 6, 0.5, 0.9);
    putXY('rint_mirror', 12, 17); putXY('rint_mirror', 30, 12);
    putXY('rint_crate', 2, 5); putXY('rint_crate', 16, 4); putXY('rint_crate', 26, 17);
    putXY('rint_barrel', 3, 15); putXY('rint_barrel', 20, 17);
    putXY('rint_bookshelf', 30, 3); putXY('rint_plant', 7, 13); putXY('rint_plant', 31, 16);
    putXY('rint_lantern', 11, 9, 0.5, 0.85, 1); putXY('rint_lantern', 26, 10, 0.5, 0.85, 0);
    putXY('rint_chest2', 22, 7);
    scatterDecals('intd_thread', [[11, 12, 3], [24, 9, 3], [16, 14, 2], [6, 6, 2]], 3);
  } else if (id === 'achievements') {
    putXY('rfoc_restore', 8, 13, 0.5, 0.9);                                     // FOCAL: the curator's bench
    putXY('rnar_ac_plinth', 25, 7, 0.5, 0.95);                                  // narrative 1
    putXY('rnar_ac_roll', 31, 11, 0.5, 0.95);                                   // narrative 2
    putXY('rnar_ac_relic', 12, 8, 0.5, 0.9);                                    // narrative 3
    putFg('rfg_ac_banner', cx - 7, 3);                                          // FOREGROUND: honour banners
    putFg('rfg_ac_banner', cx + 5, 9);
    putXY('rint_trophyshelf', 6, 3, 0.5, 0.9); putXY('rint_trophyshelf', 29, 3, 0.5, 0.9);
    putXY('rint_trophyshelf', 20, 2, 0.5, 0.9); putXY('rint_trophyshelf', 34, 8, 0.5, 0.9);
    for (const [px2, py2] of [[6, 7], [11, 12], [16, 6], [24, 12], [30, 7], [33, 13]]) putXY('rint_pillar', px2, py2);
    putXY('rint_banner_gold', 3, 6); putXY('rint_banner_gold', 3, 12); putXY('rint_banner_gold', 34, 5);
    putXY('rint_banner_gold', 22, 16);
    putXY('rint_bookshelf', 4, 16); putXY('rint_crate', 9, 16); putXY('rint_pew', 28, 15);
    putXY('rint_candles', 26, 4, 0.5, 0.85, 1); putXY('rint_candles', 10, 5, 0.5, 0.85, 0);
    for (const [px3, py3] of [[9, 9], [14, 14], [20, 9], [28, 5], [35, 11]]) putXY('rint_pillar', px3, py3);
    putXY('rint_trophyshelf', 14, 16, 0.5, 0.9); putXY('rint_trophyshelf', 3, 9, 0.5, 0.9);
    putXY('rint_banner_gold', 10, 4); putXY('rint_banner_gold', 27, 13); putXY('rint_banner_gold', 17, 4);
    putXY('rint_pew', 7, 15); putXY('rint_pew', 20, 14); putXY('rint_pew', 31, 15);
    putXY('rint_candles', 14, 8, 0.5, 0.85, 1); putXY('rint_candles', 31, 4, 0.5, 0.85, 0);
    putXY('rint_candles', 5, 15, 0.5, 0.85, 1);
    putXY('rint_crate', 33, 16); putXY('rint_crate', 3, 4); putXY('rint_bookshelf', 24, 16);
    putXY('rint_bench', 12, 4); putXY('rint_bench', 29, 9);
    scatterDecals('intd_plaque', [[cx, 9, 4], [10, 12, 3], [28, 8, 3], [18, 5, 3]], 3);
  } else { // personal
    putXY('rfoc_hearth', 8, 6, 0.5, 0.95);                                      // FOCAL: your own fire, lit
    putXY('rnar_pe_table', 11, 12, 0.5, 0.9);                                   // narrative 1
    putXY('rnar_pe_wash', 26, 7, 0.5, 0.9);                                     // narrative 2
    putXY('rnar_pe_kit', 21, 16, 0.5, 0.9);                                     // narrative 3
    putFg('rfg_pe_laundry', cx + 4, 9);                                         // FOREGROUND: the washing line
    putXY('rint_rug', cx, 9, 0.5, 0.6);
    putXY('rint_bookshelf', 27, 5); putXY('rint_bookshelf', 3, 4);
    putXY('rint_plant', 3, 8); putXY('rint_plant', 28, 16); putXY('rint_plant', 20, 3);
    putXY('rint_chest2', 19, 4); putXY('rint_chest2', 4, 16);
    putXY('rint_lamp2', 12, 16, 0.5, 0.85, 0); putXY('rint_lamp2', 24, 11, 0.5, 0.85, 1);
    putXY('rint_barrel', 3, 12); putXY('rint_crate', 2, 14); putXY('rint_barrel', 4, 11);
    putXY('rint_bench', 16, 14); putXY('rint_mirror', 27, 9);
    putXY('rint_candles', 7, 15, 0.5, 0.85, 0);
    putXY('rint_crate', 7, 16); putXY('rint_crate', 26, 17); putXY('rint_barrel', 2, 7); putXY('rint_barrel', 24, 16);
    putXY('rint_plant', 14, 3); putXY('rint_plant', 9, 4); putXY('rint_bookshelf', 26, 2);
    putXY('rint_chest2', 13, 15); putXY('rint_chest2', 28, 4);
    putXY('rint_bench', 6, 12); putXY('rint_bench', 20, 8);
    putXY('rint_lamp2', 17, 6, 0.5, 0.85, 1); putXY('rint_lamp2', 4, 15, 0.5, 0.85, 0);
    putXY('rint_mirror', 10, 16); putXY('rint_rug', 21, 13, 0.5, 0.6);
    putXY('rint_candles', 25, 12, 0.5, 0.85, 1); putXY('rint_candles', 3, 10, 0.5, 0.85, 0);
    putXY('rint_desk', 26, 11, 0.5, 0.9);
    scatterDecals('intd_crumbs', [[11, 13, 3], [cx, 10, 3], [22, 15, 3], [7, 7, 2]], 3);
    // NOTE: hub.injectRoomDecor() adds the gold-sink decor on top (anchored mid-room, FLOOR-guarded).
  }

  // R20/B2 (player problem 7): furniture you shouldn't walk through gets player-only collision
  // (same demote-on-disconnect safety as makeCamp: station↔exit must stay reachable).
  // R28/W4-G: the focal installations and the narrative objects join the table; the ceiling-hung
  // `rfg_*` occluders deliberately do NOT (you walk under them).
  const SOLID_INT = {
    rint_pew: 1, rint_desk: 2, rint_bench: 1, rint_rack: 2, rint_mirror: 1, rint_weaponrack: 1,
    rint_grindstone: 1, rint_trophyshelf: 2, rint_bookshelf: 1, rint_crate: 1, rint_barrel: 1,
    rint_mannequin: 1, rint_pillar: 1, rint_plant: 1, rint_chest2: 1,
    rfoc_censer: 1, rfoc_stewpot: 2, rfoc_forgefire: 2, rfoc_loom: 2, rfoc_restore: 2, rfoc_hearth: 1,
    rnar_ch_scribe: 2, rnar_ch_offering: 1, rnar_ch_bell: 2,
    rnar_gu_table: 2, rnar_gu_maptable: 2, rnar_gu_trophy: 1,
    rnar_bs_anvil: 1, rnar_bs_quench: 1, rnar_bs_stock: 2,
    rnar_cl_bolts: 1, rnar_cl_sewing: 2, rnar_cl_dye: 1,
    rnar_ac_plinth: 1, rnar_ac_roll: 1, rnar_ac_relic: 1,
    rnar_pe_table: 2, rnar_pe_wash: 1, rnar_pe_kit: 1,
  };
  for (const d of D) {
    if (!SOLID_INT[d.sprite]) continue;
    const tx = Math.floor(d.x / TS), ty = Math.floor(d.y / TS);
    if (reserved.has(ty * tw + tx)) continue;
    d.solid = SOLID_INT[d.sprite];
  }
  for (let guard = 0; guard < 24; guard++) {
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

  // floor slot 6 = this room's DEDICATED material (ART_SPEC 7); slots 0-5 unchanged.
  const MAT_TILE = {
    church: 'intf_church', guild: 'intf_guild', blacksmith: 'intf_forge',
    clothing: 'intf_cloth', achievements: 'intf_hall', personal: 'intf_home',
  }[id] || 'intf_hall';
  const tileset = {
    floor: ['int_wood', 'int_wood2', 'int_stone', 'int_stone2', 'int_carpet', 'int_carpet2', MAT_TILE],
    wall: 'int_wall', wallTop: 'int_wall_top',
    wallFace: 'int_wall_face', wallCap: 'int_wall_cap',   // R20/B2: 2.5D faces indoors too
    voidTile: 'ruin_void',
    // R28/W4-G (ART_SPEC 7): the out-of-bounds band gets two darkness steps and ruin
    // silhouettes instead of one flat dimmed wall tile. Only reachable at zoom levels where
    // the viewport out-runs the room (the hub camera clamps otherwise).
    oobTiles: ['int_oob_a', 'int_oob_b', 'int_oob_c'],
  };
  return { tw, th, tiles, floorVar, decor: D, decals, rooms, tileset, triggers };
}
