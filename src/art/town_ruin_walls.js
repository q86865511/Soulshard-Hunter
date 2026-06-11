// R20/B1 — 2.5D ruin walls: south-facing wall faces + caps, depth-band fillers
// (dead forest / far skyline), void abyss tile, door-glow trigger decal.
// Style: desaturated stone-ash base + ember-orange (P.ember*) and soul-teal
// (P.shard*) accent glints, matching town_ruin_tiles.js. All faces/fillers are
// TILE sprites — anchor [0,0], NO outline, seamless left-right (fillers also
// wrap vertically). The door glow is a 3-frame animated ground decal.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ── shared ruin wall tones ───────────────────────────────────────────────────
const RWALL = mix(P.gray1, P.ink2, 0.30);                 // exterior rampart stone
const IWALL = mix(P.gray1, P.ink2, 0.38);                 // interior brick base (= tiles file)
// R20/B2 retune: the original band tones were so dark the whole off-field read as a flat
// BLACK hole at game zoom (the very thing player problem #2/#4 complained about). Bands now
// sit on a readable dusk-violet with silhouettes a step darker, clearly textured.
const GLOOM = lighten(mix(P.ink2, P.void, 0.52), 0.12);   // dusk-violet forest gloom (band 1 bg)
const DUSK  = lighten(mix(P.ink2, P.void, 0.42), 0.18);   // band-2 sky behind the far silhouettes
const FARSKY= mix(P.ink2, P.blueD, 0.34);                 // far silhouette tone (darker than DUSK)
const ABYSS = darken(mix(P.ink2, P.void, 0.50), 0.42);    // chasm base (rift only; never pure #000)

// ════════════════════════════════════════════════════════════════════════════
//  EXTERIOR WALL FACES (south-facing fronts, 16×24) + CAP
// ════════════════════════════════════════════════════════════════════════════

// ruin_wall_face — weathered stone-brick rampart front: lit top edge, broken
// bricks, contact-shadow base, ember seep + soul-teal moss veins.
defineSprite('ruin_wall_face', 16, 24, (p) => {
  const base = RWALL;
  const bD = darken(base, 0.26);
  const bL = lighten(base, 0.15);
  p.rect(0, 0, 16, 24, base);
  p.gradV(0, 0, 16, 24, lighten(base, 0.07), darken(base, 0.20)); // darker toward contact
  // lit upper edge (top 4px reads as the sun-catching brink)
  p.gradV(0, 0, 16, 4, mix(lighten(bL, 0.12), P.rim, 0.18), lighten(base, 0.06));
  p.hline(0, 15, 0, mix(lighten(bL, 0.18), P.rim, 0.25));
  // brick course joints (full-width hlines — tile cleanly left-right)
  p.hline(0, 15, 4, bD);
  p.hline(0, 15, 9, bD);
  p.hline(0, 15, 14, bD);
  p.hline(0, 15, 19, bD);
  // staggered vertical joints (interior columns only, so edges stay plain)
  p.vline(5, 8, 4, bD);   p.vline(5, 8, 12, bD);
  p.vline(10, 13, 8, bD);
  p.vline(15, 18, 3, bD); p.vline(15, 18, 11, bD);
  p.vline(20, 23, 7, bD);
  // each course's top row catches a little light
  p.hline(0, 15, 5, withAlpha(bL, 0.45));
  p.hline(0, 15, 10, withAlpha(bL, 0.40));
  p.hline(0, 15, 15, withAlpha(bL, 0.30));
  // missing brick — dark recess with a chipped lip
  const recess = darken(base, 0.44);
  p.rect(9, 10, 4, 4, recess);
  p.hline(9, 12, 10, darken(recess, 0.20));                      // recess ceiling deepest
  p.px(8, 11, mix(recess, base, 0.5));                            // crumbled edge
  p.hline(9, 12, 13, withAlpha(bL, 0.40));                        // lip catches light below
  // half-broken brick chip
  p.rect(2, 16, 2, 2, darken(base, 0.30));
  p.px(2, 16, darken(base, 0.40));
  // weathering texture
  p.speckle(1, 5, 14, 16, withAlpha(bD, 0.6), 9, 13);
  p.speckle(1, 5, 14, 14, withAlpha(bL, 0.5), 6, 37);
  // soul-teal moss veins crawling up from the base
  const moss = mix(base, P.shard, 0.45);
  p.vline(18, 21, 2, moss);
  p.px(2, 17, mix(base, P.shard, 0.28)); p.px(3, 20, mix(base, P.shard, 0.30));
  p.vline(20, 22, 13, mix(base, P.shard, 0.34));
  // contact shadow + faint ember seep glints near the base
  p.shadeBottom(0.30, 18);
  p.hline(0, 15, 23, darken(bD, 0.30));
  p.px(6, 21, mix(base, P.ember, 0.55));
  p.px(7, 22, mix(base, P.emberL, 0.40));
  p.px(11, 22, mix(base, P.ember, 0.40));
}, { anchor: [0, 0] });

// ruin_wall_face2 — variant: cracked diagonal split + scorch mark, same tones.
defineSprite('ruin_wall_face2', 16, 24, (p) => {
  const base = RWALL;
  const bD = darken(base, 0.26);
  const bL = lighten(base, 0.15);
  p.rect(0, 0, 16, 24, base);
  p.gradV(0, 0, 16, 24, lighten(base, 0.07), darken(base, 0.20));
  p.gradV(0, 0, 16, 4, mix(lighten(bL, 0.12), P.rim, 0.18), lighten(base, 0.06));
  p.hline(0, 15, 0, mix(lighten(bL, 0.18), P.rim, 0.25));
  // same course rhythm as face1 (so the two tile side-by-side seamlessly)
  p.hline(0, 15, 4, bD);
  p.hline(0, 15, 9, bD);
  p.hline(0, 15, 14, bD);
  p.hline(0, 15, 19, bD);
  p.vline(5, 8, 6, bD);   p.vline(5, 8, 13, bD);
  p.vline(10, 13, 3, bD); p.vline(10, 13, 10, bD);
  p.vline(15, 18, 7, bD);
  p.vline(20, 23, 4, bD); p.vline(20, 23, 12, bD);
  p.hline(0, 15, 5, withAlpha(bL, 0.45));
  p.hline(0, 15, 10, withAlpha(bL, 0.40));
  p.hline(0, 15, 15, withAlpha(bL, 0.30));
  // cracked diagonal split (kept interior so edges still wrap cleanly)
  const crack = darken(base, 0.42);
  p.line(3, 6, 8, 12, crack);
  p.line(8, 12, 7, 17, crack);
  p.line(8, 12, 12, 15, withAlpha(crack, 0.8));                   // branch fork
  p.px(4, 6, withAlpha(bL, 0.6)); p.px(9, 12, withAlpha(bL, 0.5)); // crack lips catch light
  // scorch mark — soot bloom with one dying ember at its heart
  const soot = darken(mix(base, P.ink2, 0.45), 0.18);
  p.ellipse(12, 7, 3, 2, withAlpha(soot, 0.85));
  p.speckle(9, 5, 6, 5, withAlpha(soot, 0.7), 6, 23);
  p.px(12, 7, mix(soot, P.ember, 0.50));
  p.px(13, 6, withAlpha(P.emberL, 0.30));
  // weathering + a teal vein on the other flank
  p.speckle(1, 5, 14, 16, withAlpha(bD, 0.6), 8, 7);
  p.speckle(1, 5, 14, 14, withAlpha(bL, 0.5), 5, 41);
  p.vline(19, 22, 14, mix(base, P.shard, 0.38));
  p.px(13, 21, mix(base, P.shard, 0.26));
  // contact shadow + ember seep
  p.shadeBottom(0.30, 18);
  p.hline(0, 15, 23, darken(bD, 0.30));
  p.px(3, 22, mix(base, P.ember, 0.50));
  p.px(9, 21, mix(base, P.emberL, 0.35));
}, { anchor: [0, 0] });

// ruin_wall_cap — 16×8 flat top cap above the faces: jagged broken-crenel
// ridge, top-lit stone (tone-matches ruin_wallline_top for the taller faces).
defineSprite('ruin_wall_cap', 16, 8, (p) => {
  const base = mix(P.gray1, P.ink2, 0.34);
  p.gradV(0, 0, 16, 8, mix(base, P.gray2, 0.20), darken(base, 0.18));
  const ridge = lighten(base, 0.24);
  // jagged broken-crenel ridge (heights vary, wraps cleanly at the seam)
  p.hline(0, 1, 2, ridge);   p.hline(0, 1, 1, lighten(ridge, 0.10));
  p.hline(2, 4, 3, mix(base, P.gray3, 0.28));
  p.hline(5, 7, 0, lighten(ridge, 0.12)); p.hline(5, 7, 1, ridge);
  p.hline(8, 10, 2, ridge);
  p.hline(11, 12, 3, mix(base, P.gray3, 0.24));
  p.hline(13, 15, 1, ridge); p.hline(13, 15, 0, lighten(ridge, 0.10));
  p.px(4, 2, darken(base, 0.24)); p.px(10, 3, darken(base, 0.24)); // missing teeth
  p.speckle(1, 4, 14, 3, withAlpha(darken(base, 0.3), 0.6), 4, 29);
  p.px(6, 4, mix(base, P.shard, 0.30));                            // soul-teal seep
  p.px(12, 5, mix(base, P.ember, 0.35));                           // one warm fleck
  p.hline(0, 15, 7, darken(base, 0.45));                           // drop shadow into the face
  p.hline(0, 15, 6, withAlpha(darken(base, 0.45), 0.6));
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  DEPTH-BAND FILLERS (parallax darkness behind the rampart)
// ════════════════════════════════════════════════════════════════════════════

// ruin_wall_trees — BAND 1: dense dead forest — near-black twisted trunks +
// claw branches in dusk-violet gloom. Darker / lower-contrast than the faces.
// Seamless both axes (trunks run full height; flat base, no vertical gradient).
defineSprite('ruin_wall_trees', 16, 16, (p) => {
  const base = GLOOM;
  const trunk = darken(mix(P.ink2, P.void, 0.30), 0.34);          // near-black wood
  const trunk2 = mix(trunk, base, 0.35);                          // farther trunk
  p.rect(0, 0, 16, 16, base);
  p.dither(0, 0, 16, 16, base, darken(base, 0.06));               // flat murk (wraps both axes)
  p.speckle(0, 0, 16, 16, darken(base, 0.12), 8, 17);
  // back-rank trunks (fainter)
  p.vline(0, 15, 2, trunk2);
  p.vline(0, 15, 10, trunk2);
  p.px(1, 4, trunk2); p.px(11, 7, trunk2);                        // stub branches
  // front-rank twisted trunks — full height so vertical tiling wraps
  p.vline(0, 15, 6, trunk); p.vline(0, 15, 7, trunk);
  p.vline(0, 15, 13, trunk);
  // claw branches reaching sideways (kept off the seam columns)
  p.px(5, 3, trunk); p.px(4, 2, trunk); p.px(3, 2, trunk);        // left claw
  p.px(8, 5, trunk); p.px(9, 4, trunk); p.px(10, 3, trunk);       // right claw
  p.px(12, 9, trunk); p.px(11, 8, trunk);
  p.px(14, 6, trunk); p.px(14, 5, mix(trunk, base, 0.3));
  p.px(5, 11, trunk); p.px(4, 12, mix(trunk, base, 0.3));
  // one faint will-o-wisp deep in the wood
  p.px(4, 7, mix(base, P.shard, 0.45));
  p.px(4, 6, withAlpha(P.shardL, 0.18));
}, { anchor: [0, 0] });

// ruin_wall_trees2 — variant: different trunk arrangement + a leaning snapped
// tree. Same gloom level; seamless both axes.
defineSprite('ruin_wall_trees2', 16, 16, (p) => {
  const base = GLOOM;
  const trunk = darken(mix(P.ink2, P.void, 0.30), 0.34);
  const trunk2 = mix(trunk, base, 0.35);
  p.rect(0, 0, 16, 16, base);
  p.dither(0, 0, 16, 16, base, darken(base, 0.06));
  p.speckle(0, 0, 16, 16, darken(base, 0.12), 8, 31);
  // back rank
  p.vline(0, 15, 5, trunk2);
  p.vline(0, 15, 14, trunk2);
  p.px(6, 9, trunk2); p.px(13, 3, trunk2);
  // front trunks
  p.vline(0, 15, 1, trunk);
  p.vline(0, 15, 9, trunk); p.vline(0, 15, 10, trunk);
  // leaning snapped tree — stump + the broken upper half toppled diagonally
  p.vline(8, 15, 3, trunk);                                       // stump (rooted, runs off bottom)
  p.px(3, 8, mix(trunk, base, 0.25)); p.px(4, 8, mix(trunk, base, 0.25)); // splintered break
  p.line(4, 7, 8, 3, trunk);                                      // toppled trunk leaning away
  p.px(9, 2, trunk); p.px(10, 2, mix(trunk, base, 0.3));          // its dead crown twigs
  // claw branches
  p.px(2, 4, trunk); p.px(3, 3, trunk);
  p.px(11, 6, trunk); p.px(12, 5, trunk);
  p.px(8, 12, trunk); p.px(7, 13, mix(trunk, base, 0.3));
  // wisp drifting at a different height than trees1
  p.px(13, 11, mix(base, P.shard, 0.42));
  p.px(13, 10, withAlpha(P.shardL, 0.16));
}, { anchor: [0, 0] });

// ruin_wall_skyline — BAND 2: distant ruined city silhouette — broken towers
// + a collapsed arch in very dark blue-grey on near-black. Darkest band.
// Seamless left-right (towers rise from the bottom edge; flat sky).
defineSprite('ruin_wall_skyline', 16, 16, (p) => {
  const skyC = DUSK;                                              // R20: sky LIGHTER than the city, not darker
  const cityF = FARSKY;                                           // far silhouette
  const cityN = darken(FARSKY, 0.10);                             // nearer silhouette (darkest rank)
  p.rect(0, 0, 16, 16, skyC);
  p.gradV(0, 0, 16, 16, lighten(skyC, 0.06), darken(skyC, 0.06)); // dusk glow fading down
  p.dither(0, 0, 16, 4, skyC, lighten(skyC, 0.05));               // faint high haze
  // far rank: broken towers (rooted at the bottom so vertical stacking grounds)
  p.rect(1, 6, 3, 10, cityF);
  p.px(1, 5, cityF); p.px(3, 5, cityF);                           // snapped parapet teeth
  p.rect(10, 4, 2, 12, cityF);
  p.px(11, 3, cityF);                                             // shard of the spire
  p.rect(14, 8, 2, 8, cityF);
  // near rank: a tilted tower + collapsed arch
  p.rect(5, 8, 3, 8, cityN);
  p.px(5, 7, cityN); p.px(6, 6, cityN);                           // leaning broken crown
  p.px(8, 12, cityN); p.px(9, 11, cityN); p.px(10, 11, cityN);    // arch springing left
  p.px(12, 12, cityN);                                            // arch stub right (gap = collapse)
  p.rect(8, 13, 5, 3, cityN);                                     // rubble line under the arch
  p.rect(0, 14, 16, 2, cityN);                                    // grounding rubble band (wraps)
  // 1-2 faint ember window dots in the dead city
  p.px(2, 9, mix(cityF, P.ember, 0.40));
  p.px(6, 11, mix(cityN, P.ember, 0.32));
}, { anchor: [0, 0] });

// ruin_wall_cliff — BAND 2 variant: dark cliff/rock mass with faint strata
// lines. Same darkness level as the skyline; seamless left-right.
defineSprite('ruin_wall_cliff', 16, 16, (p) => {
  const skyC = DUSK;                                              // R20: match the skyline's readable dusk sky
  const rock = FARSKY;
  const rockL = lighten(FARSKY, 0.10);
  p.rect(0, 0, 16, 16, skyC);
  p.gradV(0, 0, 16, 6, lighten(skyC, 0.06), skyC);                // dusk glow above the crest
  // cliff mass rises from the bottom; the crest height varies but the body
  // below y=6 is full-width, so left-right tiling stays continuous
  p.rect(0, 6, 16, 10, rock);
  p.hline(0, 3, 5, rock); p.hline(0, 1, 4, rock);                 // crest steps (wrap with…
  p.hline(6, 9, 5, rock); p.px(7, 4, rock);                       // …the matching right edge)
  p.hline(12, 15, 5, rock); p.hline(14, 15, 4, rock);
  // faint strata lines (full-width hlines tile cleanly)
  p.hline(0, 15, 8, withAlpha(rockL, 0.5));
  p.hline(0, 15, 11, withAlpha(darken(rock, 0.18), 0.7));
  p.hline(0, 15, 13, withAlpha(rockL, 0.4));
  // fracture seams + a fallen boulder notch
  p.vline(6, 9, 4, darken(rock, 0.16));
  p.vline(9, 12, 11, darken(rock, 0.16));
  p.px(8, 10, rockL); p.px(13, 7, rockL);                         // worn ledge catches
  p.speckle(0, 7, 16, 8, withAlpha(darken(rock, 0.20), 0.6), 6, 19);
  p.px(3, 12, mix(rock, P.shard, 0.22));                          // buried shard glint, very faint
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  INTERIOR WALL FACE (16×24) + CAP — same material family as int_wall/_top
// ════════════════════════════════════════════════════════════════════════════

// int_wall_face — interior stone-brick south face, 24 tall: torch-warm ember
// bevel on the top 4px, cool dark base, occasional cracked brick.
defineSprite('int_wall_face', 16, 24, (p) => {
  const base = IWALL;
  const bD = darken(base, 0.24);
  const bL = lighten(base, 0.16);
  p.rect(0, 0, 16, 24, base);
  p.gradV(0, 0, 16, 24, lighten(base, 0.06), darken(base, 0.16)); // cool dark toward the floor
  // brick course joints (full width — seamless left-right)
  p.hline(0, 15, 9, bD);
  p.hline(0, 15, 16, bD);
  // staggered verticals (interior columns, edges stay plain brick)
  p.vline(4, 8, 8, bD);
  p.vline(10, 15, 4, bD); p.vline(10, 15, 12, bD);
  p.vline(17, 23, 8, bD);
  p.hline(0, 15, 10, withAlpha(bL, 0.40));                        // course tops catch torchlight
  p.hline(0, 15, 17, withAlpha(bL, 0.28));
  // torch-warm lit top edge (4px ember bevel, matches int_wall's treatment)
  const warm = mix(bL, P.ember, 0.42);
  p.hline(0, 15, 0, mix(lighten(bL, 0.10), P.emberL, 0.45));
  p.hline(0, 15, 1, warm);
  p.hline(0, 15, 2, mix(base, P.ember, 0.26));
  p.hline(0, 15, 3, withAlpha(mix(base, P.ember, 0.18), 0.7));    // warm spill fade
  p.px(4, 0, mix(P.emberL, P.rim, 0.4)); p.px(12, 0, mix(P.emberL, P.rim, 0.3)); // flicker glints
  // cracked brick + pock marks
  p.line(11, 11, 14, 15, darken(base, 0.32));
  p.px(14, 11, withAlpha(bL, 0.5));                               // crack lip
  p.px(3, 19, darken(base, 0.20)); p.px(4, 20, darken(base, 0.20));
  p.speckle(1, 5, 14, 17, withAlpha(bD, 0.6), 8, 13);
  p.speckle(1, 5, 14, 15, withAlpha(bL, 0.5), 5, 43);
  // cool grounded base
  p.shadeBottom(0.22, 19);
  p.hline(0, 15, 23, darken(bD, 0.30));
}, { anchor: [0, 0] });

// int_wall_cap — 16×8 interior wall top cap: warm bright cap over the dark
// face (tone-matches int_wall_top in town_ruin_tiles.js).
defineSprite('int_wall_cap', 16, 8, (p) => {
  const base = IWALL;
  const bD = darken(base, 0.24);
  const bL = lighten(base, 0.16);
  p.gradV(0, 0, 16, 8, mix(base, P.gray2, 0.10), darken(bD, 0.12));
  p.rect(0, 0, 16, 3, mix(bL, P.ember, 0.30));                    // warm bright cap
  p.gradV(0, 0, 16, 3, mix(lighten(bL, 0.10), P.emberL, 0.40), mix(bL, P.ember, 0.25));
  p.rect(0, 3, 16, 1, mix(base, P.gray2, 0.18));
  p.hline(0, 15, 0, mix(lighten(bL, 0.16), P.emberL, 0.5));       // top glint edge
  p.hline(0, 15, 2, mix(bL, P.emberL, 0.30));                     // warm trim line
  p.px(9, 0, lighten(P.emberL, 0.2));                             // flicker glint
  p.px(3, 1, darken(bD, 0.15)); p.px(13, 1, darken(bD, 0.15));    // chipped cap notches
  p.hline(0, 15, 7, darken(bD, 0.40));                            // drop shadow into the face
  p.hline(0, 15, 6, withAlpha(darken(bD, 0.40), 0.6));
  p.speckle(1, 4, 14, 3, withAlpha(bD, 0.5), 3, 23);
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  VOID + DOOR GLOW
// ════════════════════════════════════════════════════════════════════════════

// ruin_void — abyss/chasm base tile: near-black violet (NOT pure #000), faint
// cracked-rock texture, dim soul-teal hairline veins + one falling mote.
// Subtle — underlays the rift; seamless both axes (flat base, interior detail).
defineSprite('ruin_void', 16, 16, (p) => {
  const base = ABYSS;
  p.rect(0, 0, 16, 16, base);
  p.dither(0, 0, 16, 16, base, darken(base, 0.10));               // depth murk (wraps both axes)
  p.speckle(0, 0, 16, 16, darken(base, 0.18), 9, 11);
  p.speckle(0, 0, 16, 16, lighten(base, 0.05), 6, 37);            // faint rock grain
  // cracked-rock seams (kept off the edges so the tile wraps cleanly)
  const crack = lighten(base, 0.08);
  p.line(3, 4, 7, 8, crack);
  p.line(7, 8, 12, 6, withAlpha(crack, 0.8));
  p.line(5, 11, 9, 13, withAlpha(crack, 0.7));
  // dim soul-teal hairline veins glowing in the deep
  const vein = mix(base, P.shard, 0.26);
  p.px(6, 7, vein); p.px(7, 8, vein); p.px(8, 8, mix(base, P.shard, 0.18));
  p.px(11, 12, mix(base, P.shard, 0.20)); p.px(12, 13, mix(base, P.shard, 0.14));
  // a single faint falling mote
  p.px(13, 3, withAlpha(P.shardL, 0.22));
}, { anchor: [0, 0] });

// ruin_doorglow — animated soul-teal "stand here" circle decal: bright ring +
// additive glow + inner soft fill + orbiting kira sparkles. 3 frames breathe
// the ring in-out while the sparkles orbit.
defineAnim('ruin_doorglow', 16, 16, 3, (p, f) => {
  const r = [5.4, 6.2, 5.8][f];                                   // ring breathes in-out
  const hot = [0.55, 0.80, 0.65][f];                              // brightness pulse
  // additive glow bed (brightest centre, falls off past the ring)
  p.glow(8, 8, r + 2, P.shard, 0.22 + hot * 0.18, 4);
  // inner soft fill
  p.ellipse(8, 8, r - 2, r - 2, withAlpha(P.shard, 0.16 + hot * 0.10));
  p.ellipse(8, 8, 2, 2, withAlpha(P.shardL, 0.20 + hot * 0.12));
  // the bright ring itself — double-pass for a thick, readable rim
  p.ring(8, 8, r, mix(P.shard, P.shardL, hot));
  p.ring(8, 8, r - 0.8, withAlpha(P.shardL, 0.35 + hot * 0.25));
  // centre core spark
  p.px(8, 8, mix(P.shardL, P.white, hot * 0.5));
  // 3 orbiting kira sparkles, rotating with the frame
  for (let k = 0; k < 3; k++) {
    const ang = k * (Math.PI * 2 / 3) + f * 0.7;
    const sx = Math.round(8 + Math.cos(ang) * (r + 0.5));
    const sy = Math.round(8 + Math.sin(ang) * (r + 0.5));
    p.sparkle(sx, sy, withAlpha(P.shardL, 0.75 + hot * 0.25), 1);
  }
  // one long-armed kira on the bright frame
  if (f === 1) p.star4(8, 8 - Math.round(r), 2, P.shardL, P.white);
}, { anchor: [0, 0], fps: 4 });
