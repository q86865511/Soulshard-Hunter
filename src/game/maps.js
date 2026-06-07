// Large open biome maps for the continuous-survival run structure.
import { rng, dist } from '../engine/math.js';
import { WALL, FLOOR, TS } from './world.js';
import { BIOMES } from '../art/biomes.js';
import { DECOR_SETS, DECOR_CLUSTERS } from '../art/biome_decor.js';
import { BALANCE } from './balance.js';

export function biomeForStage(stage) { return BIOMES[(stage - 1) % BIOMES.length]; }
export function isBossStage(stage) { return stage % 5 === 0; }

function randFloor(tiles, tw, th) {
  for (let i = 0; i < 80; i++) { const tx = rng.int(2, tw - 3), ty = rng.int(2, th - 3); if (tiles[ty * tw + tx] === FLOOR) return { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }; }
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

// One big persistent battleground for the single-stage continuous-survival mode.
// Bigger than any old stage, with more obstacle/event terrain + scattered hazards.
export function generateWorld(seedBiome) {
  const biome = seedBiome || BIOMES[rng.int(0, BIOMES.length - 1)];
  const tw = BALANCE.MAP_W, th = BALANCE.MAP_H;
  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    floorVar[y * tw + x] = rng.next() < 0.07 ? 1 : 0;   // calm: only a subtle alt shade; feature regions (v2) are painted in blobs below
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
  // enclosure "rooms" with a doorway — extra terrain variety + cover (E1)
  for (let r = 0; r < 5; r++) {
    const rw = rng.int(5, 10), rh = rng.int(4, 8);
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

  // hidden rooms (隱藏房間): a couple of far, mysterious structures (run.js assigns each a type + handles entry)
  const hiddenRooms = [];
  for (let i = 0; i < 2; i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 120)) hiddenRooms.push({ x: t.x, y: t.y }); }

  // biome decorations — a rich mix of natural + man-made props: scattered singles,
  // tight feature clusters, and a few lined up against walls (built-up feel).
  const decor = [];
  const pool = DECOR_SETS[biome.id] || ['torch'];
  const clusterPool = DECOR_CLUSTERS[biome.id] || pool;
  const pick = (a) => a[rng.int(0, a.length - 1)];
  for (let i = 0; i < Math.round(34 * k); i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 40)) decor.push({ sprite: pick(pool), x: t.x, y: t.y, phase: rng.int(0, 2) }); }
  for (let c = 0; c < Math.round(9 * k); c++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 70)) placeCluster(decor, tiles, tw, th, t, pick(clusterPool), rng.int(3, 6)); }
  for (let i = 0; i < Math.round(14 * k); i++) { const t = nearWallFloor(tiles, tw, th); if (t && far(t.x, t.y, 50)) decor.push({ sprite: pick(pool), x: t.x, y: t.y, phase: rng.int(0, 2) }); }

  return {
    tw, th, tiles, floorVar, decor, biome, boss: false,
    tileset: { floor: ['floor_' + biome.id, 'floor2_' + biome.id, 'floorx_' + biome.id], wall: 'wall_' + biome.id, wallTop: 'walltop_' + biome.id },
    entrance: start, center: start, chests, secret, shrine, hazards, npcs, hiddenRooms,
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
