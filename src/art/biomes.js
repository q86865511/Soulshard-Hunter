// Biome tilesets — procedurally generated floor/wall sprites per biome palette,
// plus per-biome decorations. Gives each big map a distinct look.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken } from '../engine/palette.js';

export const BIOMES = [
  { id: 'crypt', name: '幽影地穴', floor: P.floor, floor2: P.floor2, line: P.floorLine, wall: P.wall, wallD: P.wallD, wallL: P.wallL, decor: 'torch', accent: P.shardL, fog: 'rgba(10,12,26,0.0)' },
  { id: 'cavern', name: '水晶洞窟', floor: '#1c2a2e', floor2: '#243638', line: '#121e20', wall: '#2e4a4e', wallD: '#1f3236', wallL: '#4a7076', decor: 'crystal', accent: P.shard, fog: 'rgba(20,40,44,0.05)' },
  { id: 'frost', name: '霜寒冰原', floor: '#1e2a3a', floor2: '#26344a', line: '#16202e', wall: '#37506e', wallD: '#243a52', wallL: '#5f86b0', decor: 'ice', accent: P.ice, fog: 'rgba(160,220,255,0.05)' },
  { id: 'inferno', name: '熔岩深淵', floor: '#2a1816', floor2: '#36201c', line: '#1c0e0c', wall: '#4a2a22', wallD: '#321c16', wallL: '#7a4030', decor: 'lava', accent: P.ember, fog: 'rgba(60,20,10,0.06)' },
  { id: 'void', name: '虛空裂界', floor: '#1c1430', floor2: '#241a40', line: '#120c20', wall: '#3a2a5a', wallD: '#261a40', wallL: '#5a4482', decor: 'voidcrystal', accent: P.purpleL, fog: 'rgba(40,20,70,0.06)' },
];

function tileset(b) {
  const id = b.id;
  defineSprite('floor_' + id, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, b.floor);
    p.hline(0, 15, 0, lighten(b.floor, 0.08)); p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
    p.px(4, 5, b.floor2); p.px(11, 9, b.floor2); p.px(7, 12, darken(b.floor, 0.15));
  }, { anchor: [0, 0] });
  defineSprite('floor2_' + id, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, b.floor2);
    p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
    p.px(3, 3, b.floor); p.rect(6, 8, 3, 2, darken(b.floor2, 0.1)); p.px(12, 12, b.floor);
  }, { anchor: [0, 0] });
  defineSprite('floorx_' + id, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, b.floor);
    p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
    p.line(3, 2, 6, 8, b.line); p.line(6, 8, 5, 13, b.line); p.line(6, 8, 11, 10, b.line);
  }, { anchor: [0, 0] });
  defineSprite('wall_' + id, 16, 16, (p) => {
    p.rect(0, 0, 16, 16, b.wall);
    p.rect(0, 6, 16, 5, darken(b.wall, 0.08));
    p.hline(0, 15, 5, b.wallD); p.hline(0, 15, 11, b.wallD);
    p.vline(0, 5, 8, b.wallD); p.vline(6, 11, 4, b.wallD); p.vline(6, 11, 12, b.wallD); p.vline(12, 15, 8, b.wallD);
    p.hline(0, 15, 0, b.wallL);
  }, { anchor: [0, 0] });
  defineSprite('walltop_' + id, 16, 8, (p) => {
    p.rect(0, 0, 16, 8, darken(b.wallD, 0.2));
    p.rect(0, 0, 16, 2, b.wallL); p.rect(0, 2, 16, 1, b.wall);
    for (let x = 2; x < 16; x += 5) p.vline(3, 7, x, darken(b.wallD, 0.3));
  }, { anchor: [0, 0] });
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
