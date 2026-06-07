// Town-hub flooring + walls — a polished flagstone look for the indoor town,
// replacing the harsh dark-grout dungeon grid (#191b2e seams over a dull #23263f
// base). Town-only: makeCamp() points its tileset here; the five biome dungeons
// keep their own tiles untouched.
//
// ENHANCED EDITION (art_v2): same names / dims / anchors, but the stone now reads
// as elegant cut flagstone — committed top-left light source, a crisp 1px bevel,
// soft hairline seams (never gaps), and a faint polish sheen. The gatepost shard
// lantern truly GLOWS (soft radial halo + kira glint), and the town_floor3 crest
// rune shimmers with a layered shard aura. Low-noise on purpose: silhouette and
// readable tiling first, sparkle second. Everything stays crisp at 16px.
import { defineSprite } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// Cohesive stone tones — blue family (matches the walls) but lighter + warmer than
// the dungeon floor, with SOFT seams that read as elegant tile joints, not gaps.
const STONE   = '#39406a';   // base flagstone
const STONE_L = '#434b7b';   // top/left bevel highlight (catches the light, gently)
const STONE_S = '#313761';   // bottom/right seam — only a hair darker than base
const STONE2  = '#343b62';   // alternate slab tint
const FLECK   = '#262b4d';   // faint mortar fleck

// A polished flagstone: subtle 1px bevel so seams look like raised tile joints.
// Light source is top-left, so the top + left edges catch a gentle highlight and
// the bottom + right fall into a soft joint. A faint vertical gradient + a single
// specular glint near the top-left give the slab quiet volume without noise.
function slab(p, base, light, seam) {
  // Quiet top->bottom gradient: subtly lighter at the top, settling to base.
  p.gradV(0, 0, 16, 16, lighten(base, 0.06), base);
  p.shadeBottom(0.06);                          // faint vertical depth at the foot

  // Soft inner sheen toward the light corner (very low alpha — no banding).
  p.rect(1, 1, 7, 5, withAlpha(P.rim, 0.05));
  p.px(2, 2, withAlpha(P.rim, 0.10));           // single quiet specular glint

  // Bevel: top/left edges catch light, bottom/right settle into a soft seam.
  p.hline(0, 15, 0, light);                      // top edge catches the light
  p.vline(0, 14, 0, light);                      // left edge too
  p.px(0, 0, lighten(light, 0.12));              // bright bevel corner
  p.hline(0, 15, 15, seam);                      // bottom falls into a soft joint
  p.vline(1, 15, 15, seam);                      // right joint
  p.px(15, 15, darken(seam, 0.10));              // deepest joint corner

  // Two polish specks for life (not noise) + a seeded faint grain on the body.
  p.px(4, 6, lighten(base, 0.05));
  p.px(11, 10, darken(base, 0.06));
  p.speckle(2, 3, 12, 11, lighten(base, 0.04), 3, 7);
  p.speckle(3, 4, 11, 10, darken(base, 0.05), 3, 23);
}

defineSprite('town_floor', 16, 16, (p) => {
  slab(p, STONE, STONE_L, STONE_S);
}, { anchor: [0, 0] });

defineSprite('town_floor2', 16, 16, (p) => {
  slab(p, STONE2, lighten(STONE2, 0.10), STONE_S);
  p.px(7, 4, FLECK); p.px(12, 12, FLECK);       // a faint hairline fleck for variation
  // a barely-there diagonal hair-crack, the kind that reads as worn-in stone
  p.px(9, 6, darken(STONE2, 0.07)); p.px(10, 7, darken(STONE2, 0.05));
}, { anchor: [0, 0] });

// Rare accent slab — a small soulshard rune inlaid like a town crest tile (~5%).
// The rune SHIMMERS: a soft shard halo under the diamond, a bright glowing core,
// and a faint kira glint baked in so it twinkles even as a static tile.
defineSprite('town_floor3', 16, 16, (p) => {
  slab(p, STONE, STONE_L, STONE_S);

  // Inlaid groove the rune sits in — a hair darker, so the rune feels recessed.
  p.line(8, 3, 13, 8, darken(STONE, 0.08)); p.line(13, 8, 8, 13, darken(STONE, 0.08));
  p.line(8, 13, 3, 8, darken(STONE, 0.08)); p.line(3, 8, 8, 3, darken(STONE, 0.08));

  // Soft shard halo washing up out of the groove (the "shimmer" base).
  p.glow(8, 8, 5, P.shard, 0.30, 4);

  // The diamond rune itself — shard-teal with a lit top-left facet.
  p.line(8, 4, 12, 8, P.shardD); p.line(12, 8, 8, 12, P.shardD);   // diamond rune
  p.line(8, 12, 4, 8, P.shardD); p.line(4, 8, 8, 4, P.shardD);
  p.line(8, 4, 11, 7, P.shard);                                    // top-left lit edge
  p.line(8, 4, 5, 7, P.shardL);

  // Glowing core + crisp white catch-light (the gem highlight).
  p.px(8, 7, P.shard); p.px(8, 8, P.shardL); p.px(8, 9, P.shard);  // glowing core
  p.px(7, 8, P.shard);  p.px(9, 8, P.shard);
  p.px(8, 8, P.shardL);
  p.star4(8, 8, 3, withAlpha(P.shardL, 0.85), P.white);            // baked-in kira shimmer
  p.sparkle(11, 5, withAlpha(P.shardL, 0.7), 1);                   // a second tiny twinkle
}, { anchor: [0, 0] });

// Town masonry tones — kept in the cool family but brighter + more saturated than the
// polished floor (STONE #39406a) so the wall clearly reads as raised stone, not more floor.
const TWALL   = '#505b95';   // raised masonry body
const TWALL_D = '#2d3563';   // joint + grounding base shadow
const TWALL_L = '#828fd6';   // lamp-lit top edge

// Interior town wall — clean cut-stone (ashlar) blocks with a lamp-lit top edge.
// Each course gets a top-left bevel highlight + a soft bottom-right seam so the
// blocks read as raised masonry rather than a flat painted grid. A dark grounding
// base line seats the block above the floor (matches the biome wall depth pass).
defineSprite('town_wall', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, mix(TWALL, P.gray1, 0.2));
  p.gradV(0, 0, 16, 7, lighten(TWALL, 0.07), TWALL);          // upper course
  p.gradV(0, 8, 16, 7, TWALL, darken(TWALL, 0.09));           // lower course
  p.shadeBottom(0.14, 12);

  // Course + staggered vertical joints (soft, not black gaps).
  p.hline(0, 15, 7, TWALL_D);                         // course joint
  p.vline(0, 6, 8, TWALL_D);                          // staggered vertical joints
  p.vline(8, 15, 4, TWALL_D); p.vline(8, 15, 12, TWALL_D);

  // Per-block bevel: highlight the top edge below each joint, shade above the next.
  p.hline(0, 15, 8, lighten(TWALL_L, 0.04));          // lower-course block tops catch light
  p.hline(0, 7, 6, withAlpha(TWALL_D, 0.5));          // soft seam shadow above the joint

  // Lamp-lit top edge (2px bright bevel).
  p.hline(0, 15, 0, lighten(TWALL_L, 0.12));          // top light catch
  p.hline(0, 15, 1, TWALL_L);
  p.hline(0, 15, 15, darken(TWALL_D, 0.3));           // dark grounding base line → reads as a raised block

  // A couple of seeded weathering flecks (subtle, deterministic).
  p.speckle(1, 2, 14, 12, withAlpha(TWALL_D, 0.6), 4, 13);
  p.speckle(1, 2, 14, 12, withAlpha(TWALL_L, 0.5), 3, 41);
}, { anchor: [0, 0] });

// Plaza gatepost — a stone pillar with a glowing soulshard lantern. Two of these
// flank each 4-tile plaza doorway (replacing the tiny mis-sized arch). Anchored at base.
// The shard lantern now casts a real soft halo (radial glow + kira glint) and a
// faint warm spill down the lit face of the shaft.
defineSprite('town_gatepost', 12, 32, (p) => {
  // Plinth.
  p.rect(1, 27, 10, 5, P.gray1); p.rect(1, 27, 10, 1, P.gray3);
  p.px(1, 27, lighten(P.gray3, 0.15));                              // lit plinth corner
  p.hline(1, 10, 31, darken(P.gray1, 0.2));                         // base shadow line

  // Shaft with committed top-left light: lit left face, core, shaded right face.
  p.gradV(2, 9, 8, 19, lighten(P.gray2, 0.06), P.gray2);            // shaft body
  p.rect(2, 9, 3, 19, P.gray3);                                     // lit (left) face
  p.vline(9, 27, 2, lighten(P.gray3, 0.12));                        // bright left edge
  p.rect(8, 9, 2, 19, darken(P.gray1, 0.12));                       // shade (right) face
  p.vline(9, 26, 6, darken(P.gray1, 0.25));                         // flute groove
  p.vline(9, 26, 7, darken(P.gray1, 0.16));

  // Capital.
  p.rect(0, 7, 12, 3, P.gray3); p.rect(0, 6, 12, 1, P.gray2);
  p.hline(0, 11, 6, lighten(P.gray3, 0.12));                        // capital light line

  // Soulshard lantern — soft halo first, then the bracket, then the glowing shard.
  p.glow(6, 4, 6, P.shard, 0.42, 5);                                // warm-cool halo
  p.glow(6, 4, 3, P.shardL, 0.55, 3);                               // bright inner core glow
  p.rect(4, 3, 4, 4, P.bronze); p.px(4, 3, P.goldL);                // lantern bracket
  p.px(7, 3, P.goldD);
  p.ellipse(6, 4, 2, 2.4, P.shardD);
  p.ellipse(6, 4, 1.3, 1.7, P.shard);
  p.px(6, 3, P.shardL);                                             // shard hot core
  p.px(5, 4, withAlpha(P.white, 0.8));                              // crisp catch-light
  p.star4(6, 4, 4, withAlpha(P.shardL, 0.8), P.white);             // kira glint

  // Faint shard spill down the lit face of the shaft (the lantern "lighting" it).
  p.px(3, 10, withAlpha(P.shardL, 0.22));
  p.px(3, 12, withAlpha(P.shardL, 0.14));

  p.rimLight(P.rimCool, 0.4, -1, -1);                               // cool moonlit rim
  p.outline(P.ink);
}, { anchor: [6, 31] });

// Front-facing top edge (one tile high above the floor, for depth).
// A bright lamp-lit cap that grades down into a soft shadow where it meets the floor.
defineSprite('town_wall_top', 16, 8, (p) => {
  p.gradV(0, 0, 16, 8, mix(TWALL, P.gray2, 0.1), darken(TWALL_D, 0.15));
  p.rect(0, 0, 16, 3, TWALL_L);                       // bright cap
  p.gradV(0, 0, 16, 3, lighten(TWALL_L, 0.10), TWALL_L);
  p.rect(0, 3, 16, 1, mix(TWALL, P.gray2, 0.2));
  p.hline(0, 15, 2, lighten(TWALL_L, 0.15));          // warm trim line
  p.hline(0, 15, 0, lighten(TWALL_L, 0.18));          // top glint edge
  p.hline(0, 15, 7, darken(TWALL_D, 0.4));            // soft drop shadow into floor
  p.hline(0, 15, 6, withAlpha(darken(TWALL_D, 0.4), 0.6));
  p.speckle(1, 4, 14, 3, withAlpha(TWALL_D, 0.5), 3, 19);   // faint lower-face grain
}, { anchor: [0, 0] });
