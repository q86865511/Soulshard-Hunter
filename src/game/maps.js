// Large open biome maps for the continuous-survival run structure.
import { rng, makeRng, dist } from '../engine/math.js';
import { WALL, FLOOR, TS } from './world.js';
import { BIOMES, BIOME_MACRO } from '../art/biomes.js';
import { DECOR_SETS, DECOR_CLUSTERS } from '../art/biome_decor.js';
import { DECAL_SETS, LANDMARK_SETS, AMBIENT_SETS } from '../art/biome_decals.js';
import { BALANCE } from './balance.js';

export function biomeForStage(stage) { return BIOMES[(stage - 1) % BIOMES.length]; }
export function isBossStage(stage) { return stage % 5 === 0; }

// `R` (R28/FIX-1) selects the stream: the layout stream by default, the forked ART stream
// for placements that exist only to be looked at. See `artRng` in generateWorld().
function randFloor(tiles, tw, th, R = rng) {
  for (let i = 0; i < 80; i++) { const tx = R.int(2, tw - 3), ty = R.int(2, th - 3); if (tiles[ty * tw + tx] === FLOOR) return { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }; }
  return null;
}
// a floor tile adjacent to a wall (for props that line up against walls — built-up feel)
function nearWallFloor(tiles, tw, th) {
  for (let i = 0; i < 60; i++) {
    const tx = rng.int(2, tw - 3), ty = rng.int(2, th - 3);
    if (tiles[ty * tw + tx] !== FLOOR) continue;
    if (tiles[ty * tw + tx - 1] === WALL || tiles[ty * tw + tx + 1] === WALL || tiles[(ty - 1) * tw + tx] === WALL || tiles[(ty + 1) * tw + tx] === WALL)
      return { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS };
  }
  return null;
}
// flood-fill FLOOR reachability from the spawn; seal any pocket the player can't reach
// back to WALL (so chests/shrine/NPCs/enemies never land in an isolated room).
function sealUnreachable(tiles, tw, th, sx, sy) {
  const N = tw * th, reach = new Uint8Array(N), q = [sy * tw + sx];
  if (tiles[q[0]] !== FLOOR) return; reach[q[0]] = 1;
  let head = 0;
  while (head < q.length) {
    const i = q[head++], x = i % tw, y = (i / tw) | 0;
    const push = (nx, ny) => { if (nx >= 0 && ny >= 0 && nx < tw && ny < th) { const j = ny * tw + nx; if (!reach[j] && tiles[j] === FLOOR) { reach[j] = 1; q.push(j); } } };
    push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
  }
  for (let i = 0; i < N; i++) if (tiles[i] === FLOOR && !reach[i]) tiles[i] = WALL;
}
// place a tight cluster of one feature sprite around an anchor (crystal patches, graveyards, ice fields…)
function placeCluster(decor, tiles, tw, th, anchor, sprite, n) {
  for (let j = 0; j < n; j++) {
    const ox = anchor.x + (rng.next() - 0.5) * 72, oy = anchor.y + (rng.next() - 0.5) * 60;
    const tx = Math.floor(ox / TS), ty = Math.floor(oy / TS);
    if (tx > 1 && ty > 1 && tx < tw - 2 && ty < th - 2 && tiles[ty * tw + tx] === FLOOR) decor.push({ sprite, x: ox, y: oy, phase: rng.int(0, 2) });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// R28/W2-D — macro variation (ART_SPEC §6). Same value-noise as the ruin-town
// ground pass in world.js: a hashed lattice with smoothstep interpolation, so
// nearby tiles agree and the result is contiguous PATCHES instead of per-tile
// salt-and-pepper. Deterministic on (x,y) — it consumes NO rng, which is what
// lets the macro path keep the layout rng stream byte-identical.
// ───────────────────────────────────────────────────────────────────────────
function vh(x, y, s) {
  let n = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  n = ((n ^ (n >>> 13)) * 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, sc, s) {
  const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = vh(ix, iy, s), b = vh(ix + 1, iy, s), c = vh(ix, iy + 1, s), d = vh(ix + 1, iy + 1, s);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}
// large low-frequency "rest" zones: no alt-shade, no decals — the eye needs somewhere
// to stop, and unbroken texture everywhere is what made every biome read the same.
function inCalmZone(tx, ty, M) { return vnoise(tx + 70, ty - 40, M.CALM_SC, 7717) > M.CALM_T; }
function macroFloorVar(tx, ty, M) {
  if (inCalmZone(tx, ty, M)) return 0;
  return vnoise(tx, ty, M.FLOOR_SC, 3313) > M.FLOOR_T ? 1 : 0;
}
// A spot whose whole (2*halfW+1)×(2*halfH+1) tile neighbourhood is open FLOOR, found in a
// ring `rmin..rmax` TILES from the spawn. `maxDX/maxDY` additionally clamp the offset so a
// landmark can be forced inside the opening viewport (26×15 tiles at zoom 3).
function openSpot(tiles, tw, th, sx, sy, rmin, rmax, halfW, halfH, maxDX, maxDY, R = rng) {
  for (let i = 0; i < 500; i++) {
    const a = R.next() * Math.PI * 2, r = rmin + R.next() * (rmax - rmin);
    const dx = Math.round(Math.cos(a) * r), dy = Math.round(Math.sin(a) * r);
    if (maxDX && (Math.abs(dx) > maxDX || Math.abs(dy) > maxDY)) continue;
    const tx = sx + dx, ty = sy + dy;
    if (tx < halfW + 2 || ty < halfH + 2 || tx >= tw - halfW - 2 || ty >= th - halfH - 2) continue;
    let ok = true;
    for (let j = -halfH; j <= halfH && ok; j++) {
      for (let k = -halfW; k <= halfW; k++) if (tiles[(ty + j) * tw + (tx + k)] !== FLOOR) { ok = false; break; }
    }
    if (ok) return { x: (tx + 0.5) * TS, y: (ty + 1) * TS };   // feet on the tile's bottom edge
  }
  return null;
}

// One big persistent battleground for the single-stage continuous-survival mode.
// Bigger than any old stage, with more obstacle/event terrain + scattered hazards.
export function generateWorld(seedBiome) {
  const biome = seedBiome || BIOMES[rng.int(0, BIOMES.length - 1)];
  const tw = BALANCE.MAP_W, th = BALANCE.MAP_H;
  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  // R28/W2-D: biomes listed in BIOME_MACRO get the identity treatment (clustered floor
  // variants, rest zones, wall variants, clustered decals, landmarks, ambient motion).
  // Everything else falls through the original path. Note the rng.next() below is drawn
  // in BOTH branches: the macro path picks its variant from position-hashed noise, so the
  // layout rng stream (obstacle blobs, POIs, decor scatter) stays byte-identical either way.
  const mac = BIOME_MACRO[biome.id] || null;
  const M = BALANCE.ARTV.MACRO;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    const r = rng.next();
    floorVar[y * tw + x] = mac ? macroFloorVar(x, y, M) : (r < 0.07 ? 1 : 0);   // calm: only a subtle alt shade; feature regions (v2) are painted in blobs below
  }
  const start = { x: (tw / 2) * TS, y: (th / 2) * TS };
  const far = (px, py, d) => dist(px, py, start.x, start.y) > d;
  const carve = (tx, ty) => { if (tx > 1 && ty > 1 && tx < tw - 2 && ty < th - 2 && far(tx * TS, ty * TS, 96)) tiles[ty * tw + tx] = WALL; };
  // counts scale with the (now larger) map area
  const area = tw * th, k = area / 7904;

  // scattered obstacle blobs (open arena feel; kept clear of the spawn)
  for (let i = 0; i < Math.round(48 * k); i++) {
    const cx = rng.int(4, tw - 5), cy = rng.int(4, th - 5);
    if (dist(cx * TS, cy * TS, start.x, start.y) < 120) continue;
    const r = rng.int(1, 3);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) carve(cx + dx, cy + dy);
  }
  // event terrain: pillar halls (rows of single pillars) give cover + kiting lanes
  for (let n = 0; n < Math.round(5 * k); n++) {
    const ox = rng.int(8, tw - 14), oy = rng.int(8, th - 14), len = rng.int(4, 9), horiz = rng.chance(0.5);
    for (let i = 0; i < len; i++) carve(ox + (horiz ? i * 2 : 0), oy + (horiz ? 0 : i * 2));
  }
  // enclosure "rooms" with doorways — #8: many more + varied sizes so the map reads as a
  // warren of large/small chambers (still fully connected: each keeps doorway gaps + sealUnreachable below)
  for (let r = 0, R = 10 + Math.round(6 * k); r < R; r++) {
    const rw = rng.int(3, 12), rh = rng.int(3, 9);
    const ox = rng.int(3, tw - rw - 3), oy = rng.int(3, th - rh - 3);
    if (dist((ox + rw / 2) * TS, (oy + rh / 2) * TS, start.x, start.y) < 150) continue;
    const gap = rng.int(1, rw - 1), gy = rng.int(1, rh - 1);
    for (let x = 0; x <= rw; x++) { if (x !== gap) { carve(ox + x, oy); carve(ox + x, oy + rh); } }
    for (let y = 0; y <= rh; y++) { if (y !== gy) { carve(ox, oy + y); carve(ox + rw, oy + y); } }
  }
  // solid rock outcrops — chunky formations for cover/structure (kept off the spawn)
  for (let n = 0; n < Math.round(8 * k); n++) {
    const cx = rng.int(4, tw - 5), cy = rng.int(4, th - 5);
    if (dist(cx * TS, cy * TS, start.x, start.y) < 150) continue;
    const r = rng.int(2, 4);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + rng.int(0, 2)) carve(cx + dx, cy + dy);
  }
  // after ALL wall passes: seal any unreachable pocket so POIs/enemies can't spawn isolated
  sealUnreachable(tiles, tw, th, Math.floor(tw / 2), Math.floor(th / 2));
  // distinct FEATURE-floor REGIONS (lava lakes / snow fields / crystal patches…): big flat
  // colour blocks (floorVar = 2) giving the map clear ZONES instead of uniform texture.
  for (let n = 0; n < Math.round(12 * k); n++) {
    const cx = rng.int(3, tw - 4), cy = rng.int(3, th - 4);
    if (dist(cx * TS, cy * TS, start.x, start.y) < 120) continue;
    const r = rng.int(2, 5);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const tx = cx + dx, ty = cy + dy;
      if (dx * dx + dy * dy <= r * r + rng.int(0, r) && tx > 0 && ty > 0 && tx < tw - 1 && ty < th - 1 && tiles[ty * tw + tx] === FLOOR) floorVar[ty * tw + tx] = 2;
    }
  }

  // trap terrain: scattered hazard zones (lava / spikes / poison / thorns)
  const HKINDS = ['lava', 'spikes', 'poison', 'thorns'];
  const hazards = [];
  for (let i = 0; i < Math.round(14 * k); i++) {
    const t = randFloor(tiles, tw, th);
    if (t && far(t.x, t.y, 92)) hazards.push({ kind: HKINDS[rng.int(0, HKINDS.length - 1)], x: t.x, y: t.y, r: 13 + rng.int(0, 12) });
  }

  // chests, hidden chest, shrine (in-run shop)
  const chests = [];
  for (let i = 0; i < Math.round(7 * k); i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 80)) chests.push(t); }
  const secret = randFloor(tiles, tw, th);
  const shrine = randFloor(tiles, tw, th);

  // wandering NPCs (E1 / 原#2): a wishing well, lost souls, a shard vein and a
  // travelling smith — more variety, and the run scene refreshes them over time.
  const npcs = [];
  for (const kind of ['well', 'soul', 'soul', 'shard', 'forge']) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 90)) npcs.push({ kind, x: t.x, y: t.y, used: false }); }

  // hidden room (隱藏房間, #6): at most ONE, ~55% of maps; run.js makes it a discoverable secret
  // with a SAVE-PERMANENT, once-per-save reward (achievement/unlock/egg) — not a per-run buff.
  const hiddenRooms = [];
  if (rng.chance(0.55)) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 150)) hiddenRooms.push({ x: t.x, y: t.y }); }

  // #8: room guardians (mini-elites weaker than a mini-boss; drop a key + chest) + a locked vault chest
  const featureRooms = [];
  for (let i = 0; i < 2; i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 160)) featureRooms.push({ x: t.x, y: t.y }); }
  let vault = null; { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 180)) vault = { x: t.x, y: t.y }; }

  // biome decorations — a rich mix of natural + man-made props: scattered singles,
  // tight feature clusters, and a few lined up against walls (built-up feel).
  const decor = [];
  const pool = DECOR_SETS[biome.id] || ['torch'];
  const clusterPool = DECOR_CLUSTERS[biome.id] || pool;
  const pick = (a) => a[rng.int(0, a.length - 1)];
  const D = BALANCE.DECOR;

  // R28/W2-D LANDMARKS — two per macro biome, pushed FIRST so they sit at the bottom
  // of the decor draw order. #1 lands inside the opening viewport (26×15 tiles at
  // zoom 3) so a run OPENS on a silhouette; #2 is a 15-26 tile walk (< 6 s at the
  // base 82 px/s). Both need a fully open 7×5 tile pad, so they never plug a corridor.
  // They carry NO `solid` flag on purpose: the co-op map wire format (protocol.js
  // serializeMap) keeps only sprite/x/y/phase, so a host-side collider would be
  // invisible to a guest's local prediction and desync it. They are pure silhouette.
  // R28/FIX-1 (Codex #1) — the macro ART channel (landmarks · ambient props · clustered ground
  // decals) draws from its OWN stream. It is forked from the layout stream with exactly ONE
  // draw, so re-tuning or switching off any pure-art knob shifts nothing downstream: the art
  // placements used to be rejection-sampled (openSpot burns up to 1000 draws, the decal
  // clusterer up to 4000), which meant a decal-density tweak silently re-rolled every later
  // roll off the shared Math.random stream (hidden room, guardians, vault, enemy pools).
  // Non-macro biomes fork nothing and consume nothing → their maps stay byte-identical.
  const artRng = mac ? makeRng((rng.next() * 4294967296) >>> 0) : null;
  const landmarks = [];
  if (mac) {
    const lm = LANDMARK_SETS[biome.id] || [];
    const sx = Math.floor(tw / 2), sy = Math.floor(th / 2);
    const near = lm[0] && openSpot(tiles, tw, th, sx, sy, M.LMK_NEAR[0], M.LMK_NEAR[1], 3, 2, 9, 5, artRng);
    if (near) landmarks.push({ sprite: lm[0], x: near.x, y: near.y, phase: 0 });
    const away = lm[1] && openSpot(tiles, tw, th, sx, sy, M.LMK_FAR[0], M.LMK_FAR[1], 3, 2, 0, 0, artRng);
    if (away) landmarks.push({ sprite: lm[1], x: away.x, y: away.y, phase: 1 });
    for (const l of landmarks) decor.push(l);
  }
  // keep the ordinary scatter off a landmark so nothing pokes through its silhouette
  const clearOfLmk = (x, y) => {
    for (const l of landmarks) if (Math.abs(x - l.x) < M.LMK_CLEAR && Math.abs(y - l.y) < M.LMK_CLEAR) return false;
    return true;
  };

  for (let i = 0; i < Math.round(D.SINGLES * k); i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 40) && clearOfLmk(t.x, t.y)) decor.push({ sprite: pick(pool), x: t.x, y: t.y, phase: rng.int(0, 2) }); }
  for (let c = 0; c < Math.round(D.CLUSTERS * k); c++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 70) && clearOfLmk(t.x, t.y)) placeCluster(decor, tiles, tw, th, t, pick(clusterPool), rng.int(3, 6)); }
  for (let i = 0; i < Math.round(D.WALL * k); i++) { const t = nearWallFloor(tiles, tw, th); if (t && far(t.x, t.y, 50) && clearOfLmk(t.x, t.y)) decor.push({ sprite: pick(pool), x: t.x, y: t.y, phase: rng.int(0, 2) }); }

  // R28/W2-D ambient motion — the biome's signature animated prop, scattered thinly.
  if (mac) {
    const amb = AMBIENT_SETS[biome.id] || [];
    for (let i = 0; amb.length && i < Math.round(M.AMBIENT * k); i++) {
      const t = randFloor(tiles, tw, th, artRng);
      if (t && far(t.x, t.y, 60) && clearOfLmk(t.x, t.y)) decor.push({ sprite: amb[artRng.int(0, amb.length - 1)], x: t.x, y: t.y, phase: artRng.int(0, 3) });
    }
  }

  // R26/B1 ground-DECAL channel — render-only flat marks on FLOOR tiles. Sampled
  // LAST (after every gameplay-affecting placement) and ONLY when the biome has a
  // decal pool, so an empty pool consumes no rng → identical layout / zero change.
  const decals = [];
  const decalPool = DECAL_SETS[biome.id];
  if (decalPool && decalPool.length) {
    const budget = Math.round(D.DECALS * k);
    const decal = (x, y, R = rng) => decals.push({ sprite: decalPool[R.int(0, decalPool.length - 1)], x, y });
    if (mac) {
      // R28/W2-D: cluster the ground marks instead of dusting them evenly. Centres are
      // rejection-sampled onto value-noise PEAKS, so weathered patches gather into
      // districts; rest zones get nothing. The TOTAL stays the BALANCE.DECOR budget —
      // this redistributes density, it doesn't add any.
      const clusterBudget = Math.round(budget * M.DECAL_CLUSTER_FRAC);
      let placed = 0;
      for (let guard = 0; placed < clusterBudget && guard < 4000; guard++) {
        const t = randFloor(tiles, tw, th, artRng);
        if (!t) break;
        const ctx = t.x / TS, cty = t.y / TS;
        if (inCalmZone(ctx, cty, M) || vnoise(ctx, cty, M.DECAL_SC, 5107) < M.DECAL_PEAK_T) continue;
        const n = Math.min(M.DECAL_PER_CLUSTER, clusterBudget - placed);
        for (let j = 0; j < n; j++) {
          const a = artRng.next() * Math.PI * 2, rr = Math.sqrt(artRng.next()) * M.DECAL_CLUSTER_R;
          const dx = t.x + Math.cos(a) * rr, dy = t.y + Math.sin(a) * rr;
          const gx = Math.floor(dx / TS), gy = Math.floor(dy / TS);
          if (gx < 1 || gy < 1 || gx >= tw - 1 || gy >= th - 1) continue;
          if (tiles[gy * tw + gx] !== FLOOR) continue;
          decal(dx, dy, artRng); placed++;
        }
      }
      for (let i = placed; i < budget; i++) {   // the rest: sparse singles, still skipping rest zones
        const t = randFloor(tiles, tw, th, artRng);
        if (t && !inCalmZone(t.x / TS, t.y / TS, M)) decal(t.x, t.y, artRng);
      }
    } else {
      for (let i = 0; i < budget; i++) {
        const t = randFloor(tiles, tw, th);
        if (t) decal(t.x, t.y);
      }
    }
  }

  return {
    tw, th, tiles, floorVar, decor, decals, biome, boss: false,
    // R28/W2-D: `wallBands` + `oobBand` are present ONLY for macro biomes — the other
    // seven leave them undefined and take world.js's original single-sprite wall path
    // (and skip the wall-depth BFS entirely), so their tiles render byte-identically.
    tileset: {
      floor: ['floor_' + biome.id, 'floor2_' + biome.id, 'floorx_' + biome.id],
      wall: 'wall_' + biome.id, wallTop: 'walltop_' + biome.id,
      ...(mac ? { wallBands: mac.bands, oobBand: mac.oob } : null),
    },
    entrance: start, center: start, chests, secret, shrine, hazards, npcs, hiddenRooms, featureRooms, vault,
  };
}

export function generateStage(stage) {
  const biome = biomeForStage(stage);
  const boss = isBossStage(stage);
  const tw = boss ? 46 : Math.min(74, 50 + stage * 2);
  const th = boss ? 34 : Math.min(50, 34 + stage);
  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    floorVar[y * tw + x] = rng.next() < 0.07 ? 1 : 0;   // calm: only a subtle alt shade; feature regions (v2) are painted in blobs below
  }
  const start = { x: (tw / 2) * TS, y: (th / 2) * TS };

  // scattered obstacle blobs (open arena feel; kept away from the spawn point)
  if (!boss) {
    const blobs = 6 + stage;
    for (let i = 0; i < blobs; i++) {
      const cx = rng.int(4, tw - 5), cy = rng.int(4, th - 5);
      if (dist(cx * TS, cy * TS, start.x, start.y) < 90) continue;
      const r = rng.int(1, 3);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) { const tx = cx + dx, ty = cy + dy; if (tx > 1 && ty > 1 && tx < tw - 2 && ty < th - 2) tiles[ty * tw + tx] = WALL; }
      }
    }
  }
  sealUnreachable(tiles, tw, th, Math.floor(tw / 2), Math.floor(th / 2));   // keep the arena fully connected

  // exit portal far from the start
  let exit = { x: (tw - 3) * TS, y: (th - 3) * TS };
  for (let t = 0; t < 250; t++) {
    const tx = rng.int(2, tw - 3), ty = rng.int(2, th - 3);
    if (tiles[ty * tw + tx] !== FLOOR) continue;
    if (dist((tx + 0.5) * TS, (ty + 0.5) * TS, start.x, start.y) > Math.min(tw, th) * TS * 0.38) { exit = { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }; break; }
  }

  // chests, optional hidden chest, optional shrine (shop)
  const chests = [];
  const nChest = boss ? 1 : 3 + Math.floor(stage / 2);
  for (let i = 0; i < nChest; i++) { const t = randFloor(tiles, tw, th); if (t && dist(t.x, t.y, start.x, start.y) > 70) chests.push(t); }
  const secret = (!boss && rng.chance(0.5)) ? randFloor(tiles, tw, th) : null;
  const shrine = (!boss && stage > 1 && rng.chance(0.6)) ? randFloor(tiles, tw, th) : null;

  // biome decorations — a mix of the biome's props (scattered + a couple clusters + wall-lined)
  const decor = [];
  const pool = DECOR_SETS[biome.id] || ['torch'];
  const clusterPool = DECOR_CLUSTERS[biome.id] || pool;
  const pick = (a) => a[rng.int(0, a.length - 1)];
  const nDec = 12 + stage;
  for (let i = 0; i < nDec; i++) { const t = randFloor(tiles, tw, th); if (t) decor.push({ sprite: pick(pool), x: t.x, y: t.y, phase: rng.int(0, 2) }); }
  for (let c = 0; c < 4; c++) { const t = randFloor(tiles, tw, th); if (t) placeCluster(decor, tiles, tw, th, t, pick(clusterPool), rng.int(3, 5)); }
  for (let i = 0; i < 6; i++) { const t = nearWallFloor(tiles, tw, th); if (t) decor.push({ sprite: pick(pool), x: t.x, y: t.y, phase: rng.int(0, 2) }); }

  return {
    tw, th, tiles, floorVar, decor, biome, boss,
    tileset: { floor: ['floor_' + biome.id, 'floor2_' + biome.id, 'floorx_' + biome.id], wall: 'wall_' + biome.id, wallTop: 'walltop_' + biome.id },
    entrance: start, exit, center: start, chests, secret, shrine,
  };
}
