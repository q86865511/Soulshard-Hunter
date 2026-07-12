// R19/A1 — 末日遺跡 town tilesets: exterior ruin ground (dead grass / ash / cracked
// paths / weathered plaza / collapsed-rampart border) + building INTERIOR floors &
// walls (worn plank / cracked stone / faded carpet / torch-lit brick).
// Style: desaturated stone-ash base + ember-orange (P.ember*) and soul-teal
// (P.shard*) accent glints. Floor tiles have NO outline (they must tile seamlessly);
// per-tile noise mimics town_grass/town_plaza in town_outdoor.js. All 16×16 except
// the two 16×8 wall caps. Anchors [0,0] (tile convention).
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ── shared ruin tones ────────────────────────────────────────────────────────
const TURF  = darken(mix(P.bogL, P.gray2, 0.50), 0.16);  // dead olive-grey turf
const DIRT  = mix(P.woodD, P.gray1, 0.48);                // ashen cracked dirt
const SLAB  = darken(mix(P.gray2, P.bone, 0.16), 0.10);   // weathered flagstone
const IWALL = mix(P.gray1, P.ink2, 0.38);                 // interior brick base
const PLANK = mix(P.woodD, P.gray1, 0.34);                // worn interior plank
const ISTONE= darken(mix(P.gray1, P.gray2, 0.42), 0.06);  // interior stone floor
const CARPET= mix(P.blood, P.gray1, 0.32);                // faded red carpet

// ════════════════════════════════════════════════════════════════════════════
//  EXTERIOR FLOORS
// ════════════════════════════════════════════════════════════════════════════

// ruin_grass — dead/ashen grass, dark olive-grey base.
// R26/B2: the dry blades used to be 2px vlines at FIXED columns (x=2,6,11,14) which bake
// into periodic dark vertical stripes once the tile is repeated across the floor. They are
// now low-contrast 1px flecks scattered by seed (no aligned column), and the grit/ash
// contrast is trimmed, so a field of grass reads as smooth turf instead of striped noise.
defineSprite('ruin_grass', 16, 16, (p) => {
  const base = TURF;
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.05), darken(base, 0.06));
  p.speckle(0, 0, 16, 16, darken(base, 0.11), 12, 7);           // fine dark grit (contrast trimmed)
  p.speckle(0, 0, 16, 16, mix(base, P.gray3, 0.26), 7, 23);     // ash dust
  const blade = mix(base, P.sandD, 0.20);                       // limp dry blades — soft, close to base
  const bladeL = lighten(base, 0.09);
  p.speckle(0, 0, 16, 16, blade, 5, 53);                        // scattered blade flecks (no column)
  p.speckle(0, 0, 16, 16, bladeL, 4, 131);
  p.px(6, 9, lighten(base, 0.08));
}, { anchor: [0, 0] });

// ruin_grass2 — variant: sparse dry blades + tiny rubble specks.
defineSprite('ruin_grass2', 16, 16, (p) => {
  const base = darken(TURF, 0.04);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.04), darken(base, 0.06));
  p.speckle(0, 0, 16, 16, darken(base, 0.13), 11, 5);
  p.speckle(0, 0, 16, 16, mix(base, P.gray3, 0.26), 6, 31);
  const bare = mix(base, DIRT, 0.40);                           // worn bare patch
  p.ellipse(11, 11, 3, 2, bare);
  p.speckle(8, 9, 7, 5, mix(bare, P.gray3, 0.20), 4, 9);
  const blade = mix(base, P.sandD, 0.18);                       // sparse blades — 散點 (no fixed column)
  p.px(4, 4, blade); p.px(4, 3, mix(base, P.sandD, 0.10));
  p.px(13, 9, mix(base, P.sandD, 0.14)); p.px(11, 6, blade);
  const peb = mix(base, P.gray3, 0.55);                         // rubble specks
  p.px(5, 7, peb); p.px(6, 7, lighten(peb, 0.14));
  p.px(13, 4, peb); p.px(2, 13, darken(peb, 0.10));
  p.px(14, 14, peb);
}, { anchor: [0, 0] });

// ruin_ashgrass — ash-dusted patch with faint ember speckle.
defineSprite('ruin_ashgrass', 16, 16, (p) => {
  const base = mix(TURF, P.gray2, 0.30);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.05), darken(base, 0.05));
  const ash = mix(base, P.gray3, 0.45);                         // ash drift
  p.ellipse(6, 6, 4, 3, ash);
  p.ellipse(12, 12, 3, 2, mix(base, P.gray3, 0.34));
  p.speckle(0, 0, 16, 16, mix(base, P.gray4, 0.30), 9, 17);
  p.speckle(0, 0, 16, 16, darken(base, 0.14), 8, 41);
  p.px(5, 6, mix(ash, P.gray4, 0.40));
  // faint dying embers in the ash
  p.px(8, 5, mix(base, P.ember, 0.55));
  p.px(13, 10, mix(base, P.ember, 0.40));
  p.px(3, 12, mix(base, P.emberL, 0.50));
  p.px(8, 4, withAlpha(P.emberL, 0.35));
}, { anchor: [0, 0] });

// ruin_path — cracked dirt path.
defineSprite('ruin_path', 16, 16, (p) => {
  const base = DIRT;
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.06), darken(base, 0.06));
  p.speckle(0, 0, 16, 16, darken(base, 0.15), 11, 13);
  p.speckle(0, 0, 16, 16, lighten(base, 0.09), 8, 29);
  const crack = darken(base, 0.30);                             // dry crack web
  p.line(2, 3, 6, 7, crack);
  p.line(6, 7, 12, 5, crack);
  p.line(7, 8, 9, 13, withAlpha(crack, 0.8));
  p.px(12, 4, lighten(base, 0.10));                             // crack lip catch
  p.px(3, 3, lighten(base, 0.10));
  const peb = mix(base, P.gray3, 0.42);
  p.px(13, 11, peb); p.px(14, 11, lighten(peb, 0.14));
  p.px(2, 12, peb);
}, { anchor: [0, 0] });

// ruin_path2 — variant with embedded broken cobbles.
defineSprite('ruin_path2', 16, 16, (p) => {
  const base = darken(DIRT, 0.03);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.05), darken(base, 0.06));
  p.speckle(0, 0, 16, 16, darken(base, 0.14), 10, 3);
  const cob = mix(base, P.gray3, 0.50);                         // half-buried cobbles
  const cobD = darken(cob, 0.22);
  p.rect(3, 4, 4, 3, cob);  p.hline(3, 6, 4, lighten(cob, 0.14)); p.hline(3, 6, 6, cobD);
  p.rect(9, 9, 3, 3, cob);  p.hline(9, 11, 9, lighten(cob, 0.12)); p.hline(9, 11, 11, cobD);
  p.rect(12, 2, 3, 2, mix(base, P.gray3, 0.38));
  p.px(12, 2, lighten(cob, 0.10));
  p.px(5, 12, cob); p.px(6, 12, cobD);                          // shattered chip
  const crack = darken(base, 0.28);
  p.line(1, 10, 5, 14, crack);
  p.line(11, 5, 14, 8, withAlpha(crack, 0.8));
}, { anchor: [0, 0] });

// ruin_plaza — cracked flagstone, weathered.
defineSprite('ruin_plaza', 16, 16, (p) => {
  const base = SLAB;
  p.rect(0, 0, 16, 16, base);
  p.gradV(1, 1, 14, 14, lighten(base, 0.07), darken(base, 0.04));
  p.speckle(2, 2, 12, 12, darken(base, 0.09), 7, 19);
  p.speckle(2, 2, 12, 12, lighten(base, 0.07), 5, 31);
  const seam = darken(base, 0.26);                              // grout (tiles to a grid)
  p.vline(1, 14, 14, darken(base, 0.10));
  p.hline(1, 14, 14, darken(base, 0.10));
  p.vline(0, 15, 15, seam);
  p.hline(0, 15, 15, seam);
  const hi = lighten(base, 0.13);
  p.hline(0, 14, 0, hi);
  p.vline(0, 14, 0, hi);
  const crack = darken(base, 0.32);                             // weather crack + chip
  p.line(4, 2, 8, 7, crack);
  p.line(8, 7, 7, 11, withAlpha(crack, 0.85));
  p.px(9, 7, lighten(base, 0.12));
  p.rect(12, 1, 3, 2, darken(base, 0.16));                      // chipped corner
  p.px(12, 1, darken(base, 0.28));
}, { anchor: [0, 0] });

// ruin_plaza2 — variant: shattered slab + moss/ash in the cracks.
defineSprite('ruin_plaza2', 16, 16, (p) => {
  const base = darken(SLAB, 0.04);
  p.rect(0, 0, 16, 16, base);
  p.gradV(1, 1, 14, 14, lighten(base, 0.06), darken(base, 0.05));
  p.speckle(2, 2, 12, 12, darken(base, 0.10), 7, 23);
  p.speckle(2, 2, 12, 12, lighten(base, 0.06), 5, 41);
  const seam = darken(base, 0.26);
  p.vline(1, 14, 14, darken(base, 0.10));
  p.hline(1, 14, 14, darken(base, 0.10));
  p.vline(0, 15, 15, seam);
  p.hline(0, 15, 15, seam);
  p.hline(0, 14, 0, lighten(base, 0.12));
  p.vline(0, 14, 0, lighten(base, 0.12));
  const split = darken(base, 0.36);                             // the shatter line
  p.line(1, 6, 6, 9, split);
  p.line(6, 9, 13, 7, split);
  p.line(6, 9, 8, 14, withAlpha(split, 0.85));
  p.hline(2, 5, 7, withAlpha(lighten(base, 0.14), 0.6));        // lifted slab lip
  const moss = mix(base, P.moss, 0.55);                         // moss + ash in cracks
  p.px(4, 8, moss); p.px(5, 8, moss); p.px(7, 10, mix(base, P.moss, 0.40));
  p.px(11, 7, moss); p.px(7, 13, mix(base, P.moss, 0.35));
  p.px(9, 8, mix(base, P.gray4, 0.35));                         // ash pocket
  p.px(2, 6, mix(base, P.gray4, 0.30));
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  EXTERIOR BORDER (impassable ring)
// ════════════════════════════════════════════════════════════════════════════

// ruin_wallline — collapsed rampart rubble + dead-tree silhouettes (tiles horizontally).
defineSprite('ruin_wallline', 16, 16, (p) => {
  const W = 16, H = 16;
  const skyA = mix(P.ink2, P.gray1, 0.28);                      // ashen gloom backdrop
  const back = mix(P.gray1, P.ink2, 0.55);                      // far rubble
  const midC = mix(P.gray1, P.gray2, 0.30);                     // mid rubble
  const front = mix(P.gray2, P.gray1, 0.42);                    // near rubble
  const put = (x, y, c) => { if (y < 0 || y >= H) return; p.px(((x % W) + W) % W, y, c); };
  // mound = a flat-ish rubble heap, drawn with wrap so the strip tiles seamlessly
  const mound = (cx, ty, h, c) => {
    for (let r = 0; r < h; r++) {
      const hw = Math.floor(r * 0.95) + 1;
      for (let x = cx - hw; x <= cx + hw; x++) put(x, ty + r, c);
    }
  };
  p.gradV(0, 0, W, H, skyA, P.ink2);
  mound(3, 4, 9, back); mound(11, 3, 10, back);
  mound(7, 6, 9, midC); mound(14, 7, 8, midC); mound(0, 7, 8, midC);
  mound(4, 9, 7, front); mound(12, 10, 6, front);
  // tumbled block edges catch light
  put(3, 9, lighten(front, 0.16)); put(4, 9, lighten(front, 0.12));
  put(11, 10, lighten(front, 0.15)); put(13, 11, lighten(front, 0.10));
  put(7, 6, lighten(midC, 0.14)); put(14, 7, lighten(midC, 0.12));
  // dead-tree silhouette rising from the heap
  const tree = mix(P.ink2, P.gray1, 0.18);
  p.vline(1, 7, 9, tree);
  put(8, 2, tree); put(7, 1, tree); put(10, 3, tree); put(11, 2, tree); put(10, 1, tree);
  // a second snag, wrap-safe at the seam
  p.vline(3, 6, 15, tree); put(14, 3, tree); put(0, 4, tree);
  // faint soul-teal seep + one dying ember in the rubble
  put(6, 12, mix(front, P.shard, 0.35));
  put(10, 13, mix(front, P.shard, 0.25));
  put(2, 12, mix(front, P.ember, 0.45));
  p.speckle(0, 9, 16, 6, darken(front, 0.18), 6, 11);
  p.rect(0, 14, W, 2, mix(P.ink2, P.gray1, 0.16));              // grounding band
  p.shadeBottom(0.38, 11);
}, { anchor: [0, 0] });

// ruin_wallline_top — 16×8 cap strip for the rampart ring.
defineSprite('ruin_wallline_top', 16, 8, (p) => {
  const base = mix(P.gray1, P.ink2, 0.40);
  p.gradV(0, 0, 16, 8, mix(base, P.gray2, 0.18), darken(base, 0.18));
  const ridge = lighten(base, 0.22);
  // jagged broken-crenel ridge (heights vary, wraps cleanly)
  p.hline(0, 2, 1, ridge);   p.hline(0, 2, 0, lighten(ridge, 0.10));
  p.hline(3, 5, 2, ridge);
  p.hline(6, 8, 0, lighten(ridge, 0.12)); p.hline(6, 8, 1, ridge);
  p.hline(9, 11, 3, mix(base, P.gray3, 0.30));
  p.hline(12, 15, 1, ridge); p.hline(12, 15, 0, lighten(ridge, 0.10));
  p.px(5, 1, darken(base, 0.22)); p.px(9, 2, darken(base, 0.22)); // missing teeth
  p.speckle(1, 3, 14, 3, withAlpha(darken(base, 0.3), 0.6), 4, 19);
  p.px(7, 4, mix(base, P.shard, 0.30));                          // soul-teal seep
  p.hline(0, 15, 7, darken(base, 0.45));                         // drop shadow into floor
  p.hline(0, 15, 6, withAlpha(darken(base, 0.45), 0.6));
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  INTERIOR FLOORS
// ════════════════════════════════════════════════════════════════════════════

// int_wood — worn interior plank floor (horizontal boards).
defineSprite('int_wood', 16, 16, (p) => {
  const base = PLANK;
  p.rect(0, 0, 16, 16, base);
  // four 4px boards, each with a soft top-light
  for (let b = 0; b < 4; b++) {
    const y = b * 4;
    p.gradV(0, y, 16, 3, lighten(base, 0.07), darken(base, 0.03));
    p.hline(0, 15, y + 3, darken(base, 0.22));                  // board seam
  }
  // staggered plank end-joints
  p.vline(0, 2, 5, darken(base, 0.20));
  p.vline(4, 6, 11, darken(base, 0.20));
  p.vline(8, 10, 3, darken(base, 0.20));
  p.vline(12, 14, 9, darken(base, 0.20));
  p.speckle(0, 0, 16, 16, darken(base, 0.12), 9, 13);
  p.speckle(0, 0, 16, 16, lighten(base, 0.08), 6, 29);
  const nail = mix(base, P.iron, 0.55);                         // nail heads
  p.px(2, 1, nail); p.px(13, 5, nail); p.px(6, 9, nail); p.px(10, 13, nail);
  p.hline(7, 11, 6, withAlpha(lighten(base, 0.12), 0.6));       // long scuff
}, { anchor: [0, 0] });

// int_wood2 — variant: a broken/missing board + ash dust.
defineSprite('int_wood2', 16, 16, (p) => {
  const base = darken(PLANK, 0.03);
  p.rect(0, 0, 16, 16, base);
  for (let b = 0; b < 4; b++) {
    const y = b * 4;
    p.gradV(0, y, 16, 3, lighten(base, 0.06), darken(base, 0.03));
    p.hline(0, 15, y + 3, darken(base, 0.22));
  }
  p.vline(0, 2, 9, darken(base, 0.20));
  p.vline(12, 14, 4, darken(base, 0.20));
  // snapped board: a dark gap with splintered ends
  const gap = darken(base, 0.42);
  p.rect(4, 8, 7, 3, gap);
  p.px(3, 9, mix(gap, base, 0.5)); p.px(11, 8, mix(gap, base, 0.5));
  p.px(4, 8, lighten(base, 0.14)); p.px(10, 10, lighten(base, 0.10)); // splinter lips
  p.px(6, 9, darken(gap, 0.25)); p.px(8, 10, darken(gap, 0.25));
  p.speckle(0, 0, 16, 16, darken(base, 0.12), 8, 7);
  p.speckle(0, 0, 16, 8, mix(base, P.gray3, 0.30), 5, 37);      // ash dusting
  const nail = mix(base, P.iron, 0.5);
  p.px(14, 1, nail); p.px(1, 13, nail);
}, { anchor: [0, 0] });

// int_stone — interior cracked stone floor (2×2 slab grid).
defineSprite('int_stone', 16, 16, (p) => {
  const base = ISTONE;
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.06), darken(base, 0.04));
  const seam = darken(base, 0.24);                              // 8px slab grid
  p.hline(0, 15, 7, seam);  p.hline(0, 15, 15, seam);
  p.vline(0, 15, 7, seam);  p.vline(0, 15, 15, seam);
  p.hline(0, 6, 0, lighten(base, 0.04));                        // slab top catches (kept faint — at full-floor
  p.hline(8, 14, 0, lighten(base, 0.03));                       // scale brighter 8px rows read as banding)
  p.hline(0, 6, 8, lighten(base, 0.04));
  p.hline(8, 14, 8, lighten(base, 0.03));
  p.speckle(1, 1, 14, 14, darken(base, 0.10), 8, 19);
  p.speckle(1, 1, 14, 14, lighten(base, 0.07), 5, 43);
  p.line(10, 2, 13, 5, darken(base, 0.30));                     // hairline crack
  p.px(3, 11, darken(base, 0.18)); p.px(4, 12, darken(base, 0.18)); // pock marks
}, { anchor: [0, 0] });

// int_stone2 — variant: split slab, chipped corner, moss/ash pockets.
defineSprite('int_stone2', 16, 16, (p) => {
  const base = darken(ISTONE, 0.03);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.05), darken(base, 0.05));
  const seam = darken(base, 0.24);
  p.hline(0, 15, 7, seam);  p.hline(0, 15, 15, seam);
  p.vline(0, 15, 7, seam);  p.vline(0, 15, 15, seam);
  p.hline(0, 6, 0, lighten(base, 0.04));
  p.hline(8, 14, 8, lighten(base, 0.03));
  const split = darken(base, 0.34);                             // slab split clean through
  p.line(1, 2, 5, 6, split);
  p.line(9, 9, 13, 14, split);
  p.px(5, 5, lighten(base, 0.12));                              // lifted lip
  p.rect(13, 0, 3, 2, darken(base, 0.16));                      // chipped corner
  p.px(14, 0, darken(base, 0.28));
  p.px(2, 4, mix(base, P.moss, 0.45));                          // moss in the split
  p.px(11, 11, mix(base, P.moss, 0.38));
  p.px(10, 10, mix(base, P.gray4, 0.30));                       // ash pocket
  p.speckle(1, 1, 14, 14, darken(base, 0.11), 8, 11);
}, { anchor: [0, 0] });

// int_carpet — faded red carpet, diamond weave motif.
defineSprite('int_carpet', 16, 16, (p) => {
  const base = CARPET;
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.05), darken(base, 0.05));
  p.speckle(0, 0, 16, 16, darken(base, 0.10), 9, 13);
  p.speckle(0, 0, 16, 16, lighten(base, 0.07), 6, 27);
  const motif = mix(base, P.redL, 0.22);                        // diamond weave (tiles on 8px)
  const dia = (cx, cy) => {
    p.px(cx, cy - 1, motif); p.px(cx - 1, cy, motif); p.px(cx + 1, cy, motif);
    p.px(cx, cy + 1, motif); p.px(cx, cy, mix(base, P.goldD, 0.30));
  };
  dia(4, 4); dia(12, 4); dia(4, 12); dia(12, 12);
  p.px(8, 8, mix(base, P.goldD, 0.22));                         // centre dot ties the grid
  p.hline(6, 9, 2, withAlpha(darken(base, 0.16), 0.6));         // tread wear lines
  p.hline(5, 10, 13, withAlpha(darken(base, 0.16), 0.5));
}, { anchor: [0, 0] });

// int_carpet2 — worn-edge variant: threadbare patches + frayed weft.
defineSprite('int_carpet2', 16, 16, (p) => {
  const base = darken(CARPET, 0.04);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.04), darken(base, 0.06));
  p.speckle(0, 0, 16, 16, darken(base, 0.11), 9, 5);
  const bare = mix(base, P.gray2, 0.42);                        // threadbare to the backing
  p.ellipse(5, 6, 3, 2, bare);
  p.speckle(3, 5, 6, 4, mix(bare, P.gray3, 0.25), 5, 17);
  p.ellipse(12, 12, 2, 2, mix(base, P.gray2, 0.32));
  const motif = mix(base, P.redL, 0.18);                        // motif half worn away
  p.px(12, 4, motif); p.px(11, 5, motif); p.px(13, 5, motif);
  p.px(12, 5, mix(base, P.goldD, 0.22));
  // frayed weft rows near the bottom edge
  const fray = mix(base, P.gray3, 0.36);
  p.px(1, 14, fray); p.px(3, 15, fray); p.px(6, 14, fray);
  p.px(9, 15, fray); p.px(12, 14, fray); p.px(14, 15, fray);
  p.hline(0, 15, 15, withAlpha(darken(base, 0.22), 0.7));
  p.px(7, 7, lighten(base, 0.10));                              // loose thread catch
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  INTERIOR WALLS
// ════════════════════════════════════════════════════════════════════════════

// int_wall — interior stone-brick wall: dark body, torch-warm lit top edge.
defineSprite('int_wall', 16, 16, (p) => {
  const base = IWALL;
  const bD = darken(base, 0.24);
  const bL = lighten(base, 0.16);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 7, lighten(base, 0.06), base);              // upper course
  p.gradV(0, 8, 16, 7, base, darken(base, 0.12));               // lower course
  p.shadeBottom(0.16, 12);
  p.hline(0, 15, 7, bD);                                        // course joint
  p.vline(0, 6, 8, bD);                                         // staggered verticals
  p.vline(8, 15, 4, bD); p.vline(8, 15, 12, bD);
  p.hline(0, 15, 8, lighten(bL, 0.03));                         // lower blocks catch light
  p.hline(0, 7, 6, withAlpha(bD, 0.5));
  // torch-warm lit top edge (2px ember bevel)
  const warm = mix(bL, P.ember, 0.42);
  p.hline(0, 15, 0, mix(lighten(bL, 0.10), P.emberL, 0.45));
  p.hline(0, 15, 1, warm);
  p.hline(0, 15, 2, withAlpha(mix(base, P.ember, 0.30), 0.7));  // warm spill fade
  p.px(3, 0, mix(P.emberL, P.rim, 0.4)); p.px(11, 0, mix(P.emberL, P.rim, 0.3)); // flicker glints
  p.hline(0, 15, 15, darken(bD, 0.30));                         // grounding base line
  p.line(10, 9, 13, 13, darken(base, 0.30));                    // a crack in one block
  p.speckle(1, 3, 14, 11, withAlpha(bD, 0.6), 4, 13);
  p.speckle(1, 3, 14, 11, withAlpha(bL, 0.5), 3, 41);
}, { anchor: [0, 0] });

// int_wall_top — 16×8 wall cap, torch-warm bright cap over a dark face.
defineSprite('int_wall_top', 16, 8, (p) => {
  const base = IWALL;
  const bD = darken(base, 0.24);
  const bL = lighten(base, 0.16);
  p.gradV(0, 0, 16, 8, mix(base, P.gray2, 0.10), darken(bD, 0.12));
  p.rect(0, 0, 16, 3, mix(bL, P.ember, 0.30));                  // warm bright cap
  p.gradV(0, 0, 16, 3, mix(lighten(bL, 0.10), P.emberL, 0.40), mix(bL, P.ember, 0.25));
  p.rect(0, 3, 16, 1, mix(base, P.gray2, 0.18));
  p.hline(0, 15, 0, mix(lighten(bL, 0.16), P.emberL, 0.5));     // top glint edge
  p.hline(0, 15, 2, mix(bL, P.emberL, 0.30));                   // warm trim line
  p.px(6, 0, lighten(P.emberL, 0.2));                           // flicker glint
  p.px(2, 1, darken(bD, 0.15)); p.px(12, 1, darken(bD, 0.15));  // chipped cap notches
  p.hline(0, 15, 7, darken(bD, 0.40));                          // drop shadow into floor
  p.hline(0, 15, 6, withAlpha(darken(bD, 0.40), 0.6));
  p.speckle(1, 4, 14, 3, withAlpha(bD, 0.5), 3, 19);
}, { anchor: [0, 0] });
