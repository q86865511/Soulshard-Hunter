// Large open biome maps for the continuous-survival run structure.
import { rng, dist } from '../engine/math.js';
import { WALL, FLOOR, TS } from './world.js';
import { BIOMES } from '../art/biomes.js';

export function biomeForStage(stage) { return BIOMES[(stage - 1) % BIOMES.length]; }
export function isBossStage(stage) { return stage % 5 === 0; }

function randFloor(tiles, tw, th) {
  for (let i = 0; i < 80; i++) { const tx = rng.int(2, tw - 3), ty = rng.int(2, th - 3); if (tiles[ty * tw + tx] === FLOOR) return { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }; }
  return null;
}

// One big persistent battleground for the single-stage continuous-survival mode.
// Bigger than any old stage, with more obstacle/event terrain + scattered hazards.
export function generateWorld(seedBiome) {
  const biome = seedBiome || BIOMES[rng.int(0, BIOMES.length - 1)];
  const tw = 104, th = 76;
  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    floorVar[y * tw + x] = rng.next() < 0.12 ? (rng.next() < 0.4 ? 1 : 2) : 0;
  }
  const start = { x: (tw / 2) * TS, y: (th / 2) * TS };
  const far = (px, py, d) => dist(px, py, start.x, start.y) > d;
  const carve = (tx, ty) => { if (tx > 1 && ty > 1 && tx < tw - 2 && ty < th - 2 && far(tx * TS, ty * TS, 96)) tiles[ty * tw + tx] = WALL; };

  // scattered obstacle blobs (open arena feel; kept clear of the spawn)
  for (let i = 0; i < 36; i++) {
    const cx = rng.int(4, tw - 5), cy = rng.int(4, th - 5);
    if (dist(cx * TS, cy * TS, start.x, start.y) < 120) continue;
    const r = rng.int(1, 3);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) carve(cx + dx, cy + dy);
  }
  // event terrain: pillar halls (rows of single pillars) give cover + kiting lanes
  for (let k = 0; k < 5; k++) {
    const ox = rng.int(8, tw - 14), oy = rng.int(8, th - 14), len = rng.int(4, 8), horiz = rng.chance(0.5);
    for (let i = 0; i < len; i++) carve(ox + (horiz ? i * 2 : 0), oy + (horiz ? 0 : i * 2));
  }

  // trap terrain: scattered hazard zones (lava / spikes / poison / thorns)
  const HKINDS = ['lava', 'spikes', 'poison', 'thorns'];
  const hazards = [];
  for (let i = 0; i < 14; i++) {
    const t = randFloor(tiles, tw, th);
    if (t && far(t.x, t.y, 92)) hazards.push({ kind: HKINDS[rng.int(0, HKINDS.length - 1)], x: t.x, y: t.y, r: 13 + rng.int(0, 11) });
  }

  // chests, hidden chest, shrine (in-run shop)
  const chests = [];
  for (let i = 0; i < 7; i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 80)) chests.push(t); }
  const secret = randFloor(tiles, tw, th);
  const shrine = randFloor(tiles, tw, th);

  // biome decorations
  const decor = [];
  const decSprite = biome.decor === 'torch' ? 'torch' : 'dec_' + biome.decor;
  for (let i = 0; i < 30; i++) { const t = randFloor(tiles, tw, th); if (t && far(t.x, t.y, 40)) decor.push({ sprite: decSprite, x: t.x, y: t.y, phase: rng.int(0, 2) }); }

  return {
    tw, th, tiles, floorVar, decor, biome, boss: false,
    tileset: { floor: ['floor_' + biome.id, 'floor2_' + biome.id, 'floorx_' + biome.id], wall: 'wall_' + biome.id, wallTop: 'walltop_' + biome.id },
    entrance: start, center: start, chests, secret, shrine, hazards,
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
    floorVar[y * tw + x] = rng.next() < 0.12 ? (rng.next() < 0.4 ? 1 : 2) : 0;
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

  // biome decorations scattered on floor
  const decor = [];
  const decSprite = biome.decor === 'torch' ? 'torch' : 'dec_' + biome.decor;
  const nDec = 10 + stage;
  for (let i = 0; i < nDec; i++) { const t = randFloor(tiles, tw, th); if (t) decor.push({ sprite: decSprite, x: t.x, y: t.y, phase: rng.int(0, 2) }); }

  return {
    tw, th, tiles, floorVar, decor, biome, boss,
    tileset: { floor: ['floor_' + biome.id, 'floor2_' + biome.id, 'floorx_' + biome.id], wall: 'wall_' + biome.id, wallTop: 'walltop_' + biome.id },
    entrance: start, exit, center: start, chests, secret, shrine,
  };
}
