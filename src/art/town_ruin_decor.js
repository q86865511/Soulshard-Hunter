import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════════
//  ROUND 19 — 末日遺跡 town environment props (spec §A3).
//  Style: anime-flavoured pixel ruin — desaturated stone/ash base with
//  ember-orange (P.ember/emberL) and soul-teal (P.shard/shardL/neon) accents.
//  Tall props (pillar/statue/deadtree/banner) → rimLight + outline(P.ink).
//  Ground props (rubble/boulder) → softShadow. `ruin_rift` is a seamless
//  16×16 TILE (no outline). Anim props use fps 3-5. Names/sizes FROZEN.
//  All draws are deterministic (seeded speckle, no Math.random) so bakes
//  are stable across reloads.
// ════════════════════════════════════════════════════════════════════════════

// ── shared ruin palette (locals only — derived from existing P keys) ────────
const STONE  = P.gray2;                       // mid desaturated stone
const STONED = P.gray1;                       // dark stone
const STONEL = P.gray3;                       // lit stone face
const STONEH = mix(P.gray3, P.bone, 0.30);    // sun-bleached top edge
const STONEX = mix(P.gray1, P.ink, 0.45);     // deepest crack shade
const ASH    = mix(P.gray3, P.bone, 0.40);    // pale ash dust
const ASHD   = mix(P.gray2, P.bone, 0.20);    // dirty ash
const MOSSA  = mix(P.moss, P.gray2, 0.45);    // ashen moss
const MOSSL  = mix(P.moss, P.gray3, 0.30);
const CHARW  = mix(P.woodD, P.ink, 0.45);     // charred wood
const WOODW  = mix(P.wood, P.gray2, 0.40);    // weathered grey wood
const WOODWD = mix(P.woodD, P.gray1, 0.35);
const CLOTH  = mix(P.redD, P.gray2, 0.40);    // faded banner red
const CLOTHD = mix(P.blood, P.gray1, 0.40);
const RIFTBG = mix(P.void, P.ink, 0.55);      // chasm darkness

// crack zig-zag: a thin stepped fissure between two points
function crack(p, x0, y0, x1, y1, col, seed = 1) {
  let s = seed | 0 || 1;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  let x = x0, y = y0;
  for (let i = 0; i <= steps; i++) {
    p.px(Math.round(x), Math.round(y), col);
    x += (x1 - x0) / steps + (rnd() - 0.5) * 0.9;
    y += (y1 - y0) / steps;
  }
}

// ── 1. ruin_pillar — 12×30 standing cracked column ──────────────────────────
defineSprite('ruin_pillar', 12, 30, (p) => {
  // plinth
  p.rect(1, 26, 10, 4, STONED);
  p.hline(1, 10, 26, STONE);
  p.hline(2, 9, 25, STONED);
  // shaft (cylinder shading: light left → dark right) with fluting
  p.gradH(3, 6, 6, 19, STONEL, STONED);
  p.vline(6, 24, 4, STONE);              // flute grooves
  p.vline(6, 24, 6, mix(STONE, STONED, 0.5));
  p.vline(6, 24, 8, STONEX);
  // capital — chipped on the right
  p.rect(1, 3, 10, 3, STONE);
  p.hline(1, 10, 3, STONEH);
  p.rect(2, 1, 8, 2, STONEL);
  p.hline(2, 8, 1, STONEH);
  p.px(9, 1, null); p.px(10, 3, STONED);  // knocked-off corner
  p.px(9, 2, STONED);
  // cracks + wear
  crack(p, 5, 8, 7, 16, STONEX, 3);
  crack(p, 8, 18, 6, 24, STONEX, 7);
  p.px(3, 12, ASHD); p.px(4, 20, ASHD);
  // ashen moss at the foot + ash dusting on the capital
  p.hline(2, 5, 25, MOSSA); p.px(3, 24, MOSSL);
  p.hline(3, 7, 0, withAlpha(ASH, 0.8));
  // faint ember speck caught in the base crack
  p.px(8, 25, P.ember); p.px(8, 24, withAlpha(P.emberL, 0.6));
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [6, 29] });

// ── 2. ruin_pillar_broken — 12×18 snapped stump ─────────────────────────────
defineSprite('ruin_pillar_broken', 12, 18, (p) => {
  // plinth
  p.rect(1, 14, 10, 4, STONED);
  p.hline(1, 10, 14, STONE);
  // shaft stump
  p.gradH(3, 4, 6, 10, STONEL, STONED);
  p.vline(5, 13, 4, STONE);
  p.vline(5, 13, 7, STONEX);
  // jagged snapped top edge
  p.px(3, 3, STONEL); p.px(4, 2, STONEL); p.px(5, 3, STONE);
  p.px(6, 1, STONEL); p.px(7, 2, STONE); p.px(8, 4, STONED);
  p.hline(4, 7, 4, STONEH);              // raw bright break face
  p.px(6, 2, STONEH);
  crack(p, 6, 6, 4, 12, STONEX, 5);
  // fallen chip + moss
  p.px(10, 13, STONE); p.px(11, 13, STONED);
  p.hline(2, 4, 13, MOSSA);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [6, 17] });

// ── 3. ruin_arch — 40×36 free-standing broken archway ───────────────────────
defineSprite('ruin_arch', 40, 36, (p) => {
  // left pillar (intact)
  p.rect(2, 30, 10, 6, STONED);
  p.hline(2, 11, 30, STONE);
  p.gradH(4, 10, 6, 20, STONEL, STONED);
  p.vline(11, 28, 6, mix(STONE, STONED, 0.5));
  p.rect(2, 7, 10, 3, STONE);
  p.hline(2, 11, 7, STONEH);
  // right pillar (cracked, slightly shorter capital)
  p.rect(28, 30, 10, 6, STONED);
  p.hline(28, 37, 30, STONE);
  p.gradH(30, 11, 6, 19, STONEL, STONED);
  p.vline(12, 28, 33, STONEX);
  p.rect(28, 8, 10, 3, STONE);
  p.hline(28, 37, 8, STONEH);
  crack(p, 32, 13, 34, 24, STONEX, 11);
  // arch span — voussoir blocks curving up from the left, BROKEN before the right
  const span = [[11, 6], [14, 4], [17, 2], [20, 1], [23, 2]]; // left run to past apex
  for (const [bx, by] of span) {
    p.rect(bx, by, 4, 4, STONE);
    p.hline(bx, bx + 3, by, STONEH);
    p.vline(by, by + 3, bx + 3, STONED);
  }
  // right stub then the gap (collapsed section between x≈27..30)
  p.rect(31, 5, 4, 3, STONE);
  p.hline(31, 34, 5, STONEH);
  p.px(30, 7, STONED); p.px(28, 6, STONE);     // crumbling stub teeth
  p.px(27, 4, STONED);                          // a stone caught mid-fall
  // rubble heaped where the span fell
  p.ellipse(24, 33, 6, 2.4, STONED);
  p.rect(20, 31, 4, 3, STONE); p.rect(25, 30, 3, 3, STONEL);
  p.px(23, 29, STONE); p.px(27, 31, STONED);
  p.speckle(18, 30, 12, 4, ASHD, 6, 9);
  // moss + ash wear
  p.hline(3, 6, 29, MOSSA); p.px(36, 29, MOSSA);
  p.speckle(4, 8, 8, 16, ASHD, 5, 4);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
  // a soul-wisp drifting in the broken gap (after outline: clean halo)
  p.glow(28, 3, 2.5, P.shard, 0.4, 3);
  p.px(28, 3, P.shardL);
}, { anchor: [20, 35] });

// ── 4. ruin_rubble — 16×10 small rubble pile ────────────────────────────────
defineSprite('ruin_rubble', 16, 10, (p) => {
  p.softShadow(8, 9, 7, 1.4, 0.32);
  p.ellipse(8, 7, 6, 2.4, STONED);
  // chunky stones
  p.rect(4, 4, 4, 4, STONE); p.hline(4, 7, 4, STONEL);
  p.rect(8, 3, 3, 4, STONEL); p.px(8, 3, STONEH);
  p.rect(11, 5, 3, 3, STONE);
  p.px(2, 7, STONE); p.px(13, 8, STONED);
  crack(p, 6, 5, 7, 8, STONEX, 2);
  p.speckle(2, 5, 12, 4, ASHD, 6, 3);
  p.px(10, 7, MOSSA);
  p.outline(P.ink);
}, { anchor: [8, 9] });

// ── 5. ruin_rubble2 — 20×12 larger rubble + beam ─────────────────────────────
defineSprite('ruin_rubble2', 20, 12, (p) => {
  p.softShadow(10, 11, 9, 1.6, 0.32);
  p.ellipse(10, 9, 8, 2.6, STONED);
  // stone heap
  p.rect(3, 6, 5, 4, STONE); p.hline(3, 7, 6, STONEL);
  p.rect(8, 4, 4, 5, STONEL); p.hline(8, 11, 4, STONEH);
  p.rect(12, 6, 4, 4, STONE);
  p.px(16, 8, STONED); p.px(2, 9, STONE);
  crack(p, 9, 6, 10, 9, STONEX, 6);
  // charred fallen beam across the pile
  p.line(4, 9, 16, 2, CHARW);
  p.line(4, 10, 16, 3, mix(CHARW, P.ink, 0.3));
  p.px(15, 2, P.ember); p.px(16, 2, withAlpha(P.emberL, 0.7)); // smouldering tip
  p.speckle(3, 6, 14, 5, ASHD, 7, 8);
  p.px(6, 8, MOSSA);
  p.outline(P.ink);
}, { anchor: [10, 11] });

// ── 6. ruin_boulder — 16×14 mossy boulder ───────────────────────────────────
defineSprite('ruin_boulder', 16, 14, (p) => {
  p.softShadow(8, 13, 7, 1.6, 0.34);
  p.ellipse(8, 8, 6.5, 5, STONE);
  p.ellipse(7, 7, 5, 3.6, STONEL);           // lit upper-left mass
  p.ellipse(6, 6, 2.6, 1.8, STONEH);
  p.ellipse(10, 10, 4, 2.6, STONED);         // shaded lower-right
  // moss cap creeping down the left
  p.ellipse(6, 4, 3.4, 1.6, MOSSA);
  p.px(3, 6, MOSSA); p.px(4, 7, MOSSL); p.px(8, 3, MOSSL);
  crack(p, 10, 5, 12, 10, STONEX, 4);
  p.px(5, 10, STONEX);
  p.speckle(4, 8, 9, 4, ASHD, 4, 5);
  p.px(7, 5, P.glint);
  p.outline(P.ink);
}, { anchor: [8, 13] });

// ── 7. ruin_boulder2 — 22×16 big split boulder ──────────────────────────────
defineSprite('ruin_boulder2', 22, 16, (p) => {
  p.softShadow(11, 15, 10, 1.8, 0.34);
  // left half
  p.ellipse(7, 9, 6, 5.4, STONE);
  p.ellipse(6, 8, 4.4, 3.6, STONEL);
  p.ellipse(5, 6, 2.2, 1.4, STONEH);
  // right half (tipped slightly away)
  p.ellipse(16, 10, 5, 4.6, STONE);
  p.ellipse(15, 9, 3.4, 3, STONEL);
  p.ellipse(17, 12, 3.4, 2, STONED);
  // the split: a dark gap between halves with a faint soul-seam
  p.vline(5, 14, 11, STONEX);
  p.vline(6, 13, 12, mix(STONEX, P.ink, 0.4));
  p.px(11, 8, mix(P.shardD, STONEX, 0.45));   // teal光滲出
  p.px(12, 10, mix(P.shardD, STONEX, 0.55));
  // raw bright break faces along the split
  p.vline(6, 12, 10, STONEH);
  p.vline(7, 13, 13, mix(STONEL, STONEH, 0.5));
  crack(p, 4, 10, 7, 13, STONEX, 9);
  p.ellipse(8, 4, 2.6, 1.2, MOSSA); p.px(15, 6, MOSSA);
  p.speckle(3, 10, 16, 4, ASHD, 6, 6);
  p.outline(P.ink);
}, { anchor: [11, 15] });

// ── 8. ruin_statue — 20×32 cracked goddess statue, faint holy glow ──────────
defineSprite('ruin_statue', 20, 32, (p) => {
  // pedestal
  p.rect(3, 27, 14, 5, STONED);
  p.hline(3, 16, 27, STONE);
  p.hline(4, 15, 26, STONEL);
  p.px(16, 27, null); p.px(15, 26, STONED);     // chipped pedestal corner
  // robed body — tapering rows, gentle gradient
  for (let y = 12; y <= 26; y++) {
    const t = (y - 12) / 14;
    const w2 = Math.round(2 + t * 3.2);
    p.hline(10 - w2, 10 + w2, y, mix(STONEL, STONED, t * 0.8));
  }
  p.vline(13, 25, 7, STONE);                    // robe fold lines
  p.vline(14, 26, 12, STONED);
  // folded arms holding a (lost) offering
  p.hline(7, 12, 15, STONEL);
  p.hline(8, 11, 16, STONE);
  // head + veil — serene, weather-worn
  p.circle(10, 8, 3, STONE);
  p.ellipse(10, 7, 2.6, 2, STONEL);
  p.px(9, 8, STONED); p.px(11, 8, STONED);      // shadowed closed eyes
  p.rect(6, 9, 2, 4, STONE);                    // veil drape L
  p.rect(12, 9, 2, 4, STONE);                   // veil drape R
  p.px(13, 9, null); p.px(13, 10, STONED);      // broken veil edge
  // the great crack — across face down through the torso
  crack(p, 8, 6, 12, 14, STONEX, 13);
  crack(p, 11, 18, 9, 25, STONEX, 17);
  // wear: moss at the hem, ash on the shoulders
  p.hline(5, 8, 26, MOSSA); p.px(14, 25, MOSSA);
  p.px(7, 12, ASHD); p.px(13, 13, ASHD);
  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  // faint holy glow lingering about the head (after outline: clean halo)
  p.glow(10, 6, 4.5, P.holy, 0.26, 4);
  p.star4(15, 4, 2, P.holyL);
  p.px(5, 7, withAlpha(P.holyL, 0.6));
}, { anchor: [10, 31] });

// ── 9. ruin_deadtree — 24×34 bare dead tree ─────────────────────────────────
defineSprite('ruin_deadtree', 24, 34, (p) => {
  const BARK  = mix(P.barkD, P.gray1, 0.35);
  const BARKL = mix(P.bark, P.gray2, 0.40);
  // trunk
  p.rect(10, 14, 4, 19, BARK);
  p.vline(14, 32, 10, BARKL);                  // lit left edge
  p.vline(16, 33, 13, mix(BARK, P.ink, 0.35));
  // root flare
  p.px(8, 32, BARK); p.px(9, 31, BARK); p.px(14, 31, BARK); p.px(15, 32, BARK);
  // main boughs — gnarled, bare
  p.line(11, 14, 5, 6, BARK);  p.line(12, 14, 6, 6, BARK);
  p.line(5, 6, 2, 2, BARK);
  p.line(5, 6, 9, 3, BARKL);
  p.line(12, 13, 18, 5, BARK); p.line(13, 14, 19, 6, BARK);
  p.line(18, 5, 22, 1, BARKL);
  p.line(18, 5, 15, 1, BARK);
  p.line(12, 9, 16, 9, BARK);                  // broken side stub
  p.px(17, 9, mix(BARKL, STONEH, 0.5));        // raw snapped end
  // bark cracks + a hollow knot
  crack(p, 11, 18, 12, 28, mix(BARK, P.ink, 0.5), 21);
  p.px(11, 22, P.ink2); p.px(12, 22, P.ink2); p.px(11, 23, P.ink2);
  // ash drift at the base
  p.speckle(7, 29, 10, 4, ASHD, 5, 12);
  p.hline(9, 12, 33, ASHD);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // one last soul-leaf refusing to fall
  p.px(21, 3, P.shard); p.px(21, 2, withAlpha(P.shardL, 0.7));
}, { anchor: [12, 33] });

// ── 10. ruin_deadtree2 — 28×38 bigger twisted dead tree ─────────────────────
defineSprite('ruin_deadtree2', 28, 38, (p) => {
  const BARK  = mix(P.barkD, P.gray1, 0.35);
  const BARKL = mix(P.bark, P.gray2, 0.40);
  const BARKX = mix(BARK, P.ink, 0.4);
  // twisted trunk — S-curve built from offset segments
  for (let y = 16; y <= 37; y++) {
    const t = (y - 16) / 21;
    const cx = 13 + Math.round(Math.sin(t * 3.1) * 2.2);
    const w2 = 2 + Math.round(t * 1.2);
    p.hline(cx - w2, cx + w2, y, BARK);
    p.px(cx - w2, y, BARKL);
    p.px(cx + w2, y, BARKX);
  }
  // root claws
  p.px(8, 36, BARK); p.px(9, 35, BARK); p.px(19, 35, BARK); p.px(20, 36, BARK);
  p.px(7, 37, BARKX); p.px(21, 37, BARKX);
  // twisted crown — many crooked boughs
  p.line(13, 17, 6, 9, BARK);  p.line(14, 17, 7, 9, BARK);
  p.line(6, 9, 2, 6, BARK);    p.line(6, 9, 9, 4, BARKL);
  p.line(9, 4, 7, 1, BARK);    p.line(9, 4, 12, 2, BARKL);
  p.line(14, 16, 21, 8, BARK); p.line(15, 17, 22, 9, BARK);
  p.line(21, 8, 26, 4, BARKL); p.line(26, 4, 27, 1, BARK);
  p.line(21, 8, 18, 3, BARK);
  p.line(14, 12, 19, 13, BARK);                 // low snapped stub
  p.px(20, 13, mix(BARKL, STONEH, 0.5));
  // bark texture + hollow
  crack(p, 13, 20, 14, 32, BARKX, 23);
  p.px(14, 26, P.ink2); p.px(15, 26, P.ink2); p.px(14, 27, P.ink2); p.px(15, 27, P.ink2);
  // a faint ember nest smoulders in the hollow
  p.px(15, 27, mix(P.ember, P.ink2, 0.45));
  p.speckle(8, 33, 12, 4, ASHD, 6, 14);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // soul-wisps caught in the crown
  p.px(8, 2, P.shard); p.px(25, 3, withAlpha(P.shardL, 0.8));
  p.glow(25, 3, 1.8, P.shard, 0.3, 2);
}, { anchor: [14, 37] });

// ── 11. ruin_cart — 26×18 broken cart ───────────────────────────────────────
defineSprite('ruin_cart', 26, 18, (p) => {
  p.softShadow(13, 17, 11, 1.8, 0.32);
  // tilted cart bed (right side propped on its good wheel, left collapsed)
  for (let x = 3; x <= 21; x++) {
    const y = 11 - Math.round((x - 3) * 0.22);          // gentle tilt up to the right
    p.vline(y, y + 3, x, WOODW);
    p.px(x, y, mix(WOODW, P.gray3, 0.4));               // lit plank top
    if ((x - 3) % 4 === 3) p.vline(y, y + 3, x, WOODWD); // plank seams
  }
  // side rail
  p.line(3, 9, 21, 5, WOODWD);
  // snapped plank jutting upward + splinters
  p.line(7, 9, 5, 2, WOODW);
  p.line(8, 9, 6, 2, WOODWD);
  p.px(5, 1, mix(WOODW, STONEH, 0.5));                  // raw splinter tip
  p.px(7, 4, WOODWD);
  // pull-shafts sticking up at the right
  p.line(21, 7, 25, 3, WOODWD);
  // intact rear wheel
  p.circle(19, 13, 4, WOODWD);
  p.circle(19, 13, 2.4, CHARW);
  p.px(19, 13, P.gray3);                                // hub
  p.line(19, 10, 19, 16, WOODW); p.line(16, 13, 22, 13, WOODW); // spokes
  // shattered front wheel — half-buried arc + scattered fellies
  p.line(3, 16, 7, 14, WOODWD);
  p.px(4, 15, WOODW); p.px(6, 14, WOODW);
  p.px(1, 16, WOODWD); p.px(9, 16, WOODWD);
  // spilt cargo: a cracked sack + ash
  p.ellipse(12, 15, 2.4, 1.4, ASHD);
  p.px(12, 14, ASH);
  p.speckle(4, 12, 18, 4, ASHD, 6, 16);
  p.px(15, 8, MOSSA);
  p.outline(P.ink);
}, { anchor: [13, 17] });

// ── 12. ruin_grave — 12×16 leaning gravestone ───────────────────────────────
defineSprite('ruin_grave', 12, 16, (p) => {
  p.softShadow(6, 15, 4.5, 1.3, 0.32);
  // slab leans right: rows shift as they rise
  for (let i = 0; i < 11; i++) {
    const y = 13 - i;
    const off = Math.round(i * 0.28);
    const x0 = 2 + off, x1 = 8 + off;
    if (i === 10) { p.hline(x0 + 1, x1 - 1, y, STONE); continue; }  // rounded top
    p.hline(x0, x1, y, i >= 8 ? STONE : mix(STONE, STONED, (10 - i) / 14));
    p.px(x0, y, STONEL);                                 // lit left edge
    p.px(x1, y, STONEX);
  }
  p.hline(4, 8, 3, STONEH);                              // bleached crown
  // engraved soul-mark (a fading cross)
  p.vline(6, 9, 6, STONEX); p.hline(5, 7, 7, STONEX);
  crack(p, 8, 5, 9, 11, STONEX, 19);
  // earth mound + moss climbing the base
  p.ellipse(6, 14, 5, 1.4, mix(P.barkD, P.gray1, 0.5));
  p.hline(2, 4, 13, MOSSA); p.px(3, 12, MOSSL);
  p.px(9, 13, ASHD);
  p.outline(P.ink);
  // a tiny memorial soul-mote
  p.px(10, 4, withAlpha(P.shardL, 0.7));
}, { anchor: [6, 15] });

// ── 13. ruin_banner — 14×26, anim 2f, tattered flutter ──────────────────────
defineAnim('ruin_banner', 14, 26, 2, (p, f) => {
  // pole + cross-arm
  p.vline(1, 25, 2, WOODWD);
  p.vline(1, 24, 3, WOODW);
  p.px(2, 0, mix(P.iron, P.gray1, 0.3));                 // iron finial
  p.hline(2, 12, 2, WOODWD);
  p.px(12, 3, WOODWD);                                    // arm tip droop
  // hanging cloth — torn, swaying at the bottom
  const sway = f === 0 ? 0 : 1;
  for (let y = 3; y <= 20; y++) {
    const t = (y - 3) / 17;
    const drift = Math.round(Math.sin(t * 2.6 + sway * 1.4) * (t * 1.8));
    let x0 = 5 + drift, x1 = 11 + drift;
    p.hline(x0, x1, y, mix(CLOTH, CLOTHD, t * 0.7));
    p.px(x0, y, mix(CLOTH, P.gray3, 0.25));              // lit edge
  }
  // tattered hem — ragged teeth of differing lengths
  const hem = f === 0 ? [21, 23, 20, 22, 21, 19, 22] : [22, 21, 21, 23, 20, 21, 19];
  for (let i = 0; i < 7; i++) {
    const x = 5 + i + (f === 0 ? 0 : 1);
    p.vline(20, hem[i], x, CLOTHD);
  }
  // moth-holes + scorch
  p.px(7, 9, null); p.px(9, 14, null); p.px(8 + sway, 17, null);
  p.px(10, 18, mix(CLOTHD, P.ink, 0.4));
  // faded ember sigil
  p.px(8, 7, P.ember); p.px(7, 8, P.ember); p.px(9, 8, P.ember); p.px(8, 9, mix(P.ember, CLOTH, 0.4));
  p.px(8, 8, P.emberL);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
}, { anchor: [7, 25], fps: 3 });

// ── 14. ruin_bonfire — 18×20, anim 3f, survivor bonfire ─────────────────────
defineAnim('ruin_bonfire', 18, 20, 3, (p, f) => {
  p.softShadow(9, 19, 7, 1.6, 0.3);
  // stone fire-ring
  p.ellipse(9, 17, 7, 2.2, STONED);
  p.px(2, 16, STONE); p.px(5, 18, STONE); p.px(9, 18, STONEL);
  p.px(13, 18, STONE); p.px(16, 16, STONE); p.px(4, 16, STONEL); p.px(14, 17, STONED);
  // charred crossed logs
  p.line(4, 16, 13, 13, CHARW);
  p.line(5, 13, 14, 16, CHARW);
  p.line(4, 15, 13, 12, mix(CHARW, P.ink, 0.3));
  p.px(6, 14, P.ember); p.px(11, 14, P.ember);            // glowing log cores
  // flame — height/lean flickers per frame
  const tip = [5, 3, 4][f];
  const lean = [0, 1, -1][f];
  for (let y = 13; y >= tip; y--) {
    const t = (13 - y) / (13 - tip);
    const w2 = Math.max(0, Math.round(3.4 * (1 - t * t)));
    const cx = 9 + Math.round(lean * t);
    p.hline(cx - w2, cx + w2, y, mix(P.ember, P.redD, t * 0.45));
  }
  for (let y = 13; y >= tip + 3; y--) {                   // hot inner core
    const t = (13 - y) / (13 - tip - 2);
    const w2 = Math.max(0, Math.round(1.8 * (1 - t * t)));
    const cx = 9 + Math.round(lean * t * 0.6);
    p.hline(cx - w2, cx + w2, y, mix(P.emberL, P.ember, t * 0.5));
  }
  p.px(9, 12, P.holyL);                                   // white-hot heart
  p.outline(P.ink);
  // glow + rising sparks AFTER outline (no halo ring)
  p.glow(9, 11, 5, P.ember, 0.30, 4);
  const sp = [[4, 6, 14, 9], [13, 4, 5, 8], [9, 2, 15, 6]][f];
  p.px(sp[0], sp[1], P.emberL);
  p.px(sp[2], sp[3], withAlpha(P.emberL, 0.7));
}, { anchor: [9, 19], fps: 5 });

// ── 15. ruin_crystal — 14×22, anim 2f, soul-crystal shard ───────────────────
defineAnim('ruin_crystal', 14, 22, 2, (p, f) => {
  p.softShadow(7, 21, 5.5, 1.4, 0.3);
  // broken ground it erupts from
  p.ellipse(7, 19, 5.5, 1.8, STONED);
  p.px(2, 19, STONE); p.px(11, 20, STONE); p.px(4, 20, STONEX);
  // main shard — tilted, faceted
  for (let y = 4; y <= 19; y++) {
    const t = (y - 4) / 15;
    const cx = 7 + Math.round(t * 1.4);
    const w2 = Math.round(0.6 + t * 2.4);
    p.hline(cx - w2, cx + w2, y, P.shardD);
  }
  for (let y = 6; y <= 18; y++) {                         // lit left facet
    const t = (y - 4) / 15;
    const cx = 7 + Math.round(t * 1.4);
    const w2 = Math.round(0.6 + t * 2.4);
    p.px(cx - w2 + 1, y, P.shard);
    if (y % 2 === 0) p.px(cx - w2 + 2, y, mix(P.shard, P.shardL, 0.4));
  }
  p.line(7, 5, 9, 12, P.shardL);                          // edge highlight
  p.px(7, 4, P.shardL);
  // two small side shards
  p.line(3, 19, 2, 14, P.shardD); p.line(3, 18, 3, 15, P.shard); p.px(2, 13, P.shardL);
  p.line(11, 19, 12, 16, P.shardD); p.px(12, 15, P.shard);
  // inner soul-flicker
  p.px(8, 10 + f, mix(P.shardL, P.white, 0.5));
  p.outline(P.ink);
  // pulse — frame 1 breathes brighter (after outline: clean halo)
  p.glow(8, 8, f === 0 ? 3 : 4.5, P.shard, f === 0 ? 0.28 : 0.42, 3);
  if (f === 1) p.star4(4, 5, 2, P.shardL, P.white);
  p.px(11, 8, withAlpha(P.shardL, f === 0 ? 0.4 : 0.8));
}, { anchor: [7, 21], fps: 3 });

// ── 16. ruin_rift — 16×16 TILE, anim 2f — dark chasm w/ soul-glow seams ─────
//  Seamless: 1px uniform border, seams enter/exit at fixed coords (x=4/x=11
//  vertically, y=9 horizontally) so adjacent rift tiles join. NO outline.
defineAnim('ruin_rift', 16, 16, 2, (p, f) => {
  p.rect(0, 0, 16, 16, RIFTBG);
  p.dither(0, 0, 16, 16, RIFTBG, mix(RIFTBG, P.void, 0.4));
  p.speckle(1, 1, 14, 14, mix(RIFTBG, P.shardD, 0.22), 9, 31 + f);
  const seamD = mix(P.shardD, RIFTBG, 0.35);
  // vertical seam A — enters at (4,0), exits at (4,15)
  const wA = [0, 1, 1, 0, -1, -1, 0, 1, 1, 0, 0, -1, -1, 0, 1, 0];
  for (let y = 0; y < 16; y++) p.px(4 + (y === 0 || y === 15 ? 0 : wA[y]), y, seamD);
  // vertical seam B — enters/exits at x=11
  const wB = [0, -1, 0, 1, 1, 0, 0, -1, 0, 0, 1, 0, -1, -1, 0, 0];
  for (let y = 0; y < 16; y++) p.px(11 + (y === 0 || y === 15 ? 0 : wB[y]), y, seamD);
  // horizontal seam — enters at (0,9), exits at (15,9)
  const wH = [0, 0, 1, 1, 0, -1, 0, 0, 1, 0, 0, -1, -1, 0, 0, 0];
  for (let x = 0; x < 16; x++) p.px(x, 9 + (x === 0 || x === 15 ? 0 : wH[x]), seamD);
  // bright soul-light leaking where seams cross — alternates per frame
  const hot = f === 0 ? [[4, 9], [12, 4], [10, 9]] : [[3, 5], [11, 9], [4, 13]];
  for (const [hx, hy] of hot) {
    p.px(hx, hy, P.shard);
    p.px(hx, hy - 1, withAlpha(P.shardL, 0.55));
  }
  p.px(f === 0 ? 7 : 8, 9, withAlpha(P.shardL, 0.75));
  // faint depth glow at the brightest crossing (no outline anywhere — tile)
  p.glow(f === 0 ? 4 : 11, 9, 2.5, P.shard, 0.18, 2);
}, { fps: 3 });

// ── 17. ruin_bridge — 16×16 broken-stone bridge deck tile ───────────────────
defineSprite('ruin_bridge', 16, 16, (p) => {
  // slab base — slight top-to-bottom shade
  p.gradV(0, 0, 16, 16, mix(STONE, STONED, 0.25), mix(STONED, STONEX, 0.3));
  // slab courses (full-width joints → tiles run seamlessly side-to-side)
  p.hline(0, 15, 5, STONEX);
  p.hline(0, 15, 11, STONEX);
  p.hline(0, 15, 6, mix(STONEL, STONE, 0.5));   // lit course tops
  p.hline(0, 15, 12, mix(STONEL, STONE, 0.5));
  p.hline(0, 15, 0, mix(STONEL, STONE, 0.4));
  // staggered vertical joints
  p.vline(0, 4, 9, STONEX);
  p.vline(6, 10, 3, STONEX); p.vline(6, 10, 12, STONEX);
  p.vline(12, 15, 7, STONEX);
  // cracks + a missing corner chunk showing the rift below
  crack(p, 1, 1, 5, 4, STONEX, 27);
  p.rect(12, 13, 4, 3, RIFTBG);
  p.px(13, 14, mix(RIFTBG, P.shardD, 0.5));     // teal hint from the chasm
  p.px(12, 13, STONEX);                          // crumbling lip
  // ash + moss wear
  p.speckle(1, 1, 14, 14, ASHD, 6, 22);
  p.px(2, 8, MOSSA); p.px(10, 2, MOSSA);
});

// ── 18. ruin_fence — 16×14 broken wooden fence (horizontal run) ─────────────
defineSprite('ruin_fence', 16, 14, (p) => {
  p.softShadow(8, 13, 7, 1.2, 0.28);
  // left post — upright
  p.vline(2, 12, 2, WOODWD);
  p.vline(2, 11, 3, WOODW);
  p.px(2, 1, WOODW); p.px(3, 1, mix(WOODW, P.gray3, 0.4)); // weathered cap
  // right post — leaning outward
  p.line(13, 2, 14, 12, WOODWD);
  p.line(12, 3, 13, 12, WOODW);
  // top rail — SNAPPED in the middle
  p.hline(3, 7, 4, WOODW);
  p.hline(3, 7, 5, WOODWD);
  p.hline(10, 13, 5, WOODW);
  p.hline(10, 13, 6, WOODWD);
  p.px(8, 3, WOODW); p.px(7, 3, mix(WOODW, STONEH, 0.5));  // splintered break ends
  p.px(9, 6, WOODWD); p.px(10, 4, mix(WOODW, STONEH, 0.4));
  // bottom rail — sagging but whole
  p.line(3, 9, 13, 10, WOODW);
  p.line(3, 10, 13, 11, WOODWD);
  // wear: moss on the post foot, ash drift, one nail glint
  p.px(2, 11, MOSSA); p.px(3, 12, MOSSA); p.px(13, 11, ASHD);
  p.px(3, 4, P.glint);
  p.speckle(4, 11, 8, 2, ASHD, 4, 18);
  p.outline(P.ink);
}, { anchor: [8, 13] });
