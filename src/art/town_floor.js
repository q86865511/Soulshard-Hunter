// Town-hub flooring + walls — a polished flagstone look for the indoor town,
// replacing the harsh dark-grout dungeon grid (#191b2e seams over a dull #23263f
// base). Town-only: makeCamp() points its tileset here; the five biome dungeons
// keep their own tiles untouched.
import { defineSprite } from '../engine/sprites.js';
import { P, lighten, darken, mix } from '../engine/palette.js';

// Cohesive stone tones — blue family (matches the walls) but lighter + warmer than
// the dungeon floor, with SOFT seams that read as elegant tile joints, not gaps.
const STONE   = '#39406a';   // base flagstone
const STONE_L = '#434b7b';   // top/left bevel highlight (catches the light, gently)
const STONE_S = '#313761';   // bottom/right seam — only a hair darker than base
const STONE2  = '#343b62';   // alternate slab tint
const FLECK   = '#262b4d';   // faint mortar fleck

// A polished flagstone: subtle 1px bevel so seams look like raised tile joints.
function slab(p, base, light, seam) {
  p.rect(0, 0, 16, 16, base);
  p.shadeBottom(0.07);                 // faint vertical depth
  p.hline(0, 15, 0, light);            // top edge catches the light
  p.vline(0, 14, 0, light);            // left edge too
  p.hline(0, 15, 15, seam);            // bottom falls into a soft joint
  p.vline(1, 15, 15, seam);            // right joint
  p.px(4, 6, lighten(base, 0.05));     // two polish specks for life (not noise)
  p.px(11, 10, darken(base, 0.06));
}

defineSprite('town_floor', 16, 16, (p) => {
  slab(p, STONE, STONE_L, STONE_S);
}, { anchor: [0, 0] });

defineSprite('town_floor2', 16, 16, (p) => {
  slab(p, STONE2, lighten(STONE2, 0.10), STONE_S);
  p.px(7, 4, FLECK); p.px(12, 12, FLECK);   // a faint hairline fleck for variation
}, { anchor: [0, 0] });

// Rare accent slab — a small soulshard rune inlaid like a town crest tile (~5%).
defineSprite('town_floor3', 16, 16, (p) => {
  slab(p, STONE, STONE_L, STONE_S);
  p.line(8, 4, 12, 8, P.shardD); p.line(12, 8, 8, 12, P.shardD);   // diamond rune
  p.line(8, 12, 4, 8, P.shardD); p.line(4, 8, 8, 4, P.shardD);
  p.px(8, 7, P.shard); p.px(8, 8, P.shardL); p.px(8, 9, P.shard);  // glowing core
}, { anchor: [0, 0] });

// Interior town wall — clean cut-stone (ashlar) blocks with a lamp-lit top edge.
defineSprite('town_wall', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, mix(P.wall, P.gray1, 0.25));
  p.rect(0, 0, 16, 7, mix(P.wall, P.gray2, 0.15));   // upper course (lighter)
  p.rect(0, 8, 16, 7, P.wall);                        // lower course
  p.hline(0, 15, 7, P.wallD);                         // course joint
  p.vline(0, 6, 8, P.wallD);                          // staggered vertical joints
  p.vline(8, 15, 4, P.wallD); p.vline(8, 15, 12, P.wallD);
  p.hline(0, 15, 0, lighten(P.wallL, 0.10));          // top light catch
  p.hline(0, 15, 1, P.wallL);
}, { anchor: [0, 0] });

// Front-facing top edge (one tile high above the floor, for depth).
defineSprite('town_wall_top', 16, 8, (p) => {
  p.rect(0, 0, 16, 8, darken(P.wallD, 0.15));
  p.rect(0, 0, 16, 3, P.wallL);                       // bright cap
  p.rect(0, 3, 16, 1, mix(P.wall, P.gray2, 0.2));
  p.hline(0, 15, 2, lighten(P.wallL, 0.15));          // warm trim line
  p.hline(0, 15, 7, darken(P.wallD, 0.4));            // soft drop shadow into floor
}, { anchor: [0, 0] });
