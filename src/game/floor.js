// Procedural floor layout: a sequence of generated rooms ending in a boss.
import { rng } from '../engine/math.js';
import { WALL, FLOOR, TS } from './world.js';

// A floor is a left-to-right sequence of typed rooms.
export function generateFloor(floorNum) {
  const rooms = [{ type: 'start' }];
  const combatCount = 4 + Math.floor(floorNum * 0.6);
  const seq = [];
  for (let i = 0; i < combatCount; i++) seq.push(rng.chance(0.18 + floorNum * 0.02) ? 'elite' : 'combat');
  // weave in one treasure and one shop at interior positions
  if (seq.length >= 2) seq.splice(rng.int(1, seq.length - 1), 0, 'treasure');
  if (seq.length >= 3) seq.splice(rng.int(2, seq.length - 1), 0, 'shop');
  for (const t of seq) rooms.push({ type: t });
  rooms.push({ type: 'boss' });
  return rooms;
}

// Build a single room's tilemap + entrance/exit metadata.
export function makeRoom(type, floorNum) {
  let tw, th;
  if (type === 'boss') { tw = 38; th = 24; }
  else if (type === 'shop' || type === 'treasure') { tw = 26; th = 16; }
  else if (type === 'start') { tw = 24; th = 15; }
  else { tw = 28 + rng.int(0, 8); th = 17 + rng.int(0, 4); }

  const tiles = new Uint8Array(tw * th);
  const floorVar = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const border = x === 0 || y === 0 || x === tw - 1 || y === th - 1;
    tiles[y * tw + x] = border ? WALL : FLOOR;
    floorVar[y * tw + x] = rng.next() < 0.11 ? (rng.next() < 0.5 ? 1 : 2) : 0;
  }

  const midY = Math.floor(th / 2);
  // obstacle pillars for combat rooms (kept clear of the central lane + doorways)
  if (type === 'combat' || type === 'elite') {
    const n = rng.int(1, 4);
    for (let i = 0; i < n; i++) {
      const px = rng.int(5, tw - 6);
      const py = rng.int(2, th - 4);
      if (Math.abs(py - midY) < 2) continue;          // keep central lane open
      if (px < 5 || px > tw - 6) continue;             // keep doorways open
      tiles[py * tw + px] = WALL; tiles[py * tw + px + 1] = WALL;
      tiles[(py + 1) * tw + px] = WALL; tiles[(py + 1) * tw + px + 1] = WALL;
    }
  }

  const decor = [
    { sprite: 'torch', x: 2.4 * TS, y: 1.9 * TS, phase: 0 },
    { sprite: 'torch', x: (tw - 2.4) * TS, y: 1.9 * TS, phase: 1 },
  ];

  return {
    tw, th, tiles, floorVar, decor, type,
    entrance: { x: 2.6 * TS, y: (midY + 0.5) * TS },
    exit: { x: (tw - 2.4) * TS, y: (midY + 0.5) * TS },
    center: { x: (tw / 2) * TS, y: (midY + 0.5) * TS },
  };
}
