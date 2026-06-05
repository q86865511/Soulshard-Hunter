// Biome tilesets — procedurally generated floor/wall sprites per biome palette,
// plus per-biome decorations. Gives each big map a distinct look.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix } from '../engine/palette.js';

export const BIOMES = [
  { id: 'crypt', name: '幽影地穴', floor: P.floor, floor2: P.floor2, line: P.floorLine, wall: P.wall, wallD: P.wallD, wallL: P.wallL, decor: 'torch', accent: P.shardL, fog: 'rgba(10,12,26,0.0)' },
  { id: 'cavern', name: '水晶洞窟', floor: '#1c2a2e', floor2: '#243638', line: '#121e20', wall: '#2e4a4e', wallD: '#1f3236', wallL: '#4a7076', decor: 'crystal', accent: P.shard, fog: 'rgba(20,40,44,0.05)' },
  { id: 'frost', name: '霜寒冰原', floor: '#1e2a3a', floor2: '#26344a', line: '#16202e', wall: '#37506e', wallD: '#243a52', wallL: '#5f86b0', decor: 'ice', accent: P.ice, fog: 'rgba(160,220,255,0.05)' },
  { id: 'inferno', name: '熔岩深淵', floor: '#2a1816', floor2: '#36201c', line: '#1c0e0c', wall: '#4a2a22', wallD: '#321c16', wallL: '#7a4030', decor: 'lava', accent: P.ember, fog: 'rgba(60,20,10,0.06)' },
  { id: 'void', name: '虛空裂界', floor: '#1c1430', floor2: '#241a40', line: '#120c20', wall: '#3a2a5a', wallD: '#261a40', wallL: '#5a4482', decor: 'voidcrystal', accent: P.purpleL, fog: 'rgba(40,20,70,0.06)' },
];

// Per-biome FLOOR painters. v0 = CLEAN base, v1 = subtle alt shade (both calm/flat to
// avoid eye-straining per-tile noise), v2 = a distinct FEATURE floor (lava/snow/crystal/
// rift) — a strong COLOUR BLOCK that maps.js paints in contiguous regions for clear
// visual separation (some cells are lava, some are rock, …), not uniform texture.
const FLOORS = {
  crypt: (p, b, v) => {
    if (v === 2) { p.rect(0, 0, 16, 16, lighten(b.floor, 0.16)); p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line); p.px(5, 5, b.floor2); p.px(10, 10, b.floor2); return; } // worn pale flagstone
    p.rect(0, 0, 16, 16, v === 1 ? b.floor2 : b.floor); p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
  },
  cavern: (p, b, v) => {
    if (v === 2) { p.rect(0, 0, 16, 16, mix(b.floor, b.accent, 0.42)); p.px(6, 6, lighten(b.accent, 0.2)); p.px(11, 10, b.accent); p.px(4, 11, darken(b.accent, 0.25)); return; } // crystal-vein ground
    p.rect(0, 0, 16, 16, v === 1 ? b.floor2 : b.floor); p.px(12, 12, darken(b.floor, 0.08));
  },
  frost: (p, b, v) => {
    if (v === 2) { p.rect(0, 0, 16, 16, mix(P.white, P.ice, 0.35)); p.hline(0, 15, 15, P.iceD); p.vline(0, 15, 15, P.iceD); return; } // snow field
    p.rect(0, 0, 16, 16, v === 1 ? b.floor2 : b.floor); p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
  },
  inferno: (p, b, v) => {
    if (v === 2) { p.rect(0, 0, 16, 16, P.ember); p.shadeBottom(0.18); p.px(5, 4, P.emberL); p.px(11, 7, P.emberL); return; } // lava / magma
    p.rect(0, 0, 16, 16, v === 1 ? b.floor2 : b.floor); p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
  },
  void: (p, b, v) => {
    if (v === 2) { p.rect(0, 0, 16, 16, mix(b.floor, P.purple, 0.55)); p.px(6, 6, P.manaL); p.px(10, 10, P.purpleL); p.px(4, 12, P.manaL); return; } // void rift
    p.rect(0, 0, 16, 16, v === 1 ? b.floor2 : b.floor); p.px(11, 8, lighten(b.floor, 0.06));
  },
};

// Per-biome WALL painters — CLEAN cut-stone (clear low-frequency block + light top edge,
// at most one small thematic accent) so walls read as solid structure, not busy texture.
const WALLS = {
  crypt: (p, b) => { p.rect(0, 0, 16, 16, b.wall); p.hline(0, 15, 7, b.wallD); p.vline(0, 6, 8, b.wallD); p.vline(8, 15, 12, b.wallD); p.hline(0, 15, 0, b.wallL); },
  cavern: (p, b) => { p.rect(0, 0, 16, 16, b.wall); p.rect(2, 3, 5, 4, darken(b.wall, 0.12)); p.rect(9, 8, 4, 4, darken(b.wall, 0.1)); p.hline(0, 15, 0, b.wallL); },
  frost: (p, b) => { p.rect(0, 0, 16, 16, b.wall); p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, lighten(b.wallL, 0.1)); p.hline(0, 15, 1, b.wallL); },
  inferno: (p, b) => { p.rect(0, 0, 16, 16, b.wall); p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL); p.px(4, 11, P.ember); },
  void: (p, b) => { p.rect(0, 0, 16, 16, b.wall); p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL); p.px(11, 4, P.manaL); },
};
const WALLTOPS = {
  crypt: (p, b) => { p.rect(0, 0, 16, 8, darken(b.wallD, 0.2)); p.rect(0, 0, 16, 2, b.wallL); p.rect(0, 2, 16, 1, b.wall); },
  cavern: (p, b) => { p.rect(0, 0, 16, 8, darken(b.wallD, 0.2)); p.rect(0, 0, 16, 2, b.wallL); p.px(5, 4, b.accent); },
  frost: (p, b) => { p.rect(0, 0, 16, 8, darken(b.wallD, 0.2)); p.rect(0, 0, 16, 3, lighten(b.wallL, 0.12)); },
  inferno: (p, b) => { p.rect(0, 0, 16, 8, darken(b.wallD, 0.25)); p.rect(0, 0, 16, 2, P.ember); p.rect(0, 2, 16, 1, darken(P.ember, 0.4)); },
  void: (p, b) => { p.rect(0, 0, 16, 8, darken(b.wallD, 0.2)); p.rect(0, 0, 16, 2, P.purpleL); },
};

function tileset(b) {
  const id = b.id;
  const F = FLOORS[id] || FLOORS.crypt, Wd = WALLS[id] || WALLS.crypt, Wt = WALLTOPS[id] || WALLTOPS.crypt;
  defineSprite('floor_' + id, 16, 16, (p) => F(p, b, 0), { anchor: [0, 0] });
  defineSprite('floor2_' + id, 16, 16, (p) => F(p, b, 1), { anchor: [0, 0] });
  defineSprite('floorx_' + id, 16, 16, (p) => F(p, b, 2), { anchor: [0, 0] });
  defineSprite('wall_' + id, 16, 16, (p) => Wd(p, b), { anchor: [0, 0] });
  defineSprite('walltop_' + id, 16, 8, (p) => Wt(p, b), { anchor: [0, 0] });
}
BIOMES.forEach(tileset);

// per-biome decorations
defineAnim('dec_crystal', 12, 16, 2, (p, f) => {
  p.ellipse(6, 13, 4, 2, '#1a2a2c');
  p.line(6, 14, 4, 6, P.shardD); p.line(6, 14, 6, 3, P.shard); p.line(6, 14, 8, 7, P.shardD);
  p.px(6, 3 + f, P.shardL); p.px(4, 7, P.shardL);
  p.outline(P.ink);
}, { anchor: [6, 14], fps: 2 });
defineAnim('dec_ice', 12, 14, 2, (p, f) => {
  p.ellipse(6, 12, 4, 2, '#1a2436');
  p.ellipse(6, 8, 3, 5, P.iceD); p.ellipse(6, 8, 2, 4, P.ice); p.vline(3, 11, 6, P.white);
  p.px(5, 5 + f, P.white);
  p.outline(P.ink);
}, { anchor: [6, 12], fps: 2 });
defineAnim('dec_lava', 14, 10, 3, (p, f) => {
  p.ellipse(7, 7, 6, 3, darken(P.ember, 0.5));
  p.ellipse(7, 7, 5, 2.4, '#3a1410');
  const b = [0, 1, 0][f];
  p.ellipse(4, 6 - b, 1.5, 1, P.ember); p.ellipse(9, 7 + b, 1.5, 1, P.emberL); p.px(6, 6, P.white);
}, { anchor: [7, 8], fps: 5 });
defineAnim('dec_voidcrystal', 12, 16, 2, (p, f) => {
  p.ellipse(6, 14, 4, 2, '#160e26');
  p.ellipse(6, 8, 3, 6, P.purpleD); p.ellipse(6, 8, 1.8, 4.5, P.purple); p.vline(3, 12, 6, P.purpleL);
  p.px(6, 4 + f, P.manaL);
  p.outline(P.ink);
}, { anchor: [6, 14], fps: 2 });

export const BIOME_ART_READY = true;
