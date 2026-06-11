// R18/B10 — 個人小屋裝飾 (personal-room decorations). A late-game gold sink: 10 cosmetic
// pieces, bought once, placed at fixed slots around the personal-room anchor (injected into
// world.decor on hub enter + immediately on purchase). Pure cosmetic — zero combat effect.
// Four pieces are also gift-able by B11 NPC affinity Lv4.
const TS = 16;

export const ROOM_DECOR = [
  { id: 'rd_planter', name: '盆栽花架', price: 600, sprite: 'rd_planter', dx: -4, dy: -2 },
  { id: 'rd_rug', name: '絨毛地毯', price: 800, sprite: 'rd_rug', dx: 0, dy: 3 },
  { id: 'rd_painting', name: '風景掛畫', price: 1000, sprite: 'rd_painting', dx: -5, dy: -1 },
  { id: 'rd_fireplace', name: '暖爐', price: 1200, sprite: 'rd_fireplace', dx: 5, dy: -2 },
  { id: 'rd_bookwall', name: '書牆', price: 1500, sprite: 'rd_bookwall', dx: -6, dy: 1 },
  { id: 'rd_trophycase', name: '獎盃櫃', price: 2000, sprite: 'rd_trophycase', dx: 6, dy: 1 },
  { id: 'rd_chandelier', name: '水晶吊燈', price: 2800, sprite: 'rd_chandelier', dx: 0, dy: -2 },
  { id: 'rd_aquarium', name: '魂晶魚缸', price: 3500, sprite: 'rd_aquarium', dx: 4, dy: 4 },
  { id: 'rd_impdoll', name: '小妖玩偶', price: 1888, sprite: 'rd_impdoll', dx: -3, dy: 4, req: 'devEgg' },
  { id: 'rd_throne', name: '黃金王座', price: 8888, sprite: 'rd_throne', dx: 2, dy: 0 },
];

export function decorById(id) { return ROOM_DECOR.find((d) => d.id === id) || null; }
export function decorOwned(meta, id) { return !!(meta.room && meta.room.decor && meta.room.decor[id]); }
export function decorLocked(meta, d) { return !!(d.req && !(meta.flags && meta.flags[d.req])); }
export function decorCount(meta) { return ROOM_DECOR.filter((d) => decorOwned(meta, d.id)).length; }

// grant a decoration (no gold check — used by both the shop and the B11 affinity gift)
export function grantDecor(meta, id) {
  if (!decorById(id) || decorOwned(meta, id)) return false;
  meta.room = meta.room || { decor: {} }; meta.room.decor = meta.room.decor || {};
  meta.room.decor[id] = true; return true;
}
// buy with gold (the personal-panel 裝飾 tab routes through here)
export function buyDecor(meta, id) {
  const d = decorById(id);
  if (!d || decorOwned(meta, id) || decorLocked(meta, d) || meta.gold < d.price) return false;
  meta.gold -= d.price; return grantDecor(meta, id);
}

// owned decoration sprites to inject into world.decor, placed around the personal-room anchor.
export function placedDecor(meta, room) {
  if (!room) return [];
  const out = [];
  for (const d of ROOM_DECOR) if (decorOwned(meta, d.id)) out.push({ sprite: d.sprite, x: room.cx + d.dx * TS, y: room.cy + d.dy * TS, phase: 0 });
  return out;
}
