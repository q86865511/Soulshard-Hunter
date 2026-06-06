import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════
//  TOWN — PERSONAL / HOME PROPS  ·  魂晶獵手 cozy interior set
//  Upgraded: warm top-left light, 3–4 tonal steps per material, soft contact
//  shadows, gentle rim-light, sakura/holy accent trims, kira sparkle glints.
//  Drop-in replacement — every name / size / anchor / fps preserved.
// ════════════════════════════════════════════════════════════════════════

// cozy BED — carved wooden frame + headboard, plush blanket, pillow, sakura trim
defineSprite('town_bed', 22, 16, (p) => {
  // soft ground contact shadow
  p.softShadow(11, 15, 10, 1.6, 0.34);
  // legs (turned wood, two tones)
  p.rect(2, 12, 2, 3, P.woodD);
  p.px(2, 12, P.wood);
  p.rect(18, 12, 2, 3, P.woodD);
  p.px(18, 12, P.wood);
  // headboard (left) — panelled with warm grain
  p.rect(1, 2, 3, 11, P.woodD);
  p.gradV(1, 2, 3, 4, P.woodL, P.wood);
  p.px(2, 3, lighten(P.woodL, 0.2));
  p.vline(3, 2, 12, darken(P.woodD, 0.18));
  // sakura accent finial on the post
  p.px(2, 1, P.sakuraL);
  p.px(1, 2, P.sakura); p.px(3, 2, P.sakura);
  // foot board (right)
  p.rect(18, 6, 3, 7, P.woodD);
  p.gradV(18, 6, 3, 3, P.woodL, P.wood);
  p.vline(20, 6, 6, darken(P.woodD, 0.18));
  // mattress base / frame rail
  p.rect(3, 11, 16, 2, P.wood);
  p.hline(3, 18, 11, P.woodL);
  p.hline(3, 18, 12, darken(P.woodD, 0.15));
  // mattress (sheet) — soft gradient + bottom shade
  p.gradV(4, 6, 14, 5, lighten(P.bone, 0.22), P.bone);
  p.shadeBottom(0.12);
  // pillow (near headboard) — plump, with crease + glint
  p.rect(4, 4, 6, 4, P.white);
  p.gradV(4, 4, 6, 2, lighten(P.white, 0.1), P.white);
  p.ellipse(7, 6, 3, 1.8, lighten(P.white, 0.06));
  p.px(9, 5, P.gray4);
  p.px(5, 4, P.glint);
  // folded blanket over the lower half — quilted, with sheen + stitches
  p.gradV(11, 6, 7, 5, P.blue, P.blueD);
  p.hline(11, 17, 6, lighten(P.blue, 0.3));   // top fold sheen
  p.hline(11, 17, 8, mix(P.blue, P.blueD, 0.4));
  // quilt diamond stitches
  p.px(13, 7, lighten(P.blue, 0.35));
  p.px(15, 9, lighten(P.blue, 0.35));
  p.px(13, 9, P.blueD);
  p.px(16, 7, P.blueD);
  p.shadeBottom(0.1, 10);
  // rim light on the upward-facing edges, then crisp outline
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // tiny kira twinkle on the pillow
  p.sparkle(6, 4, P.glint, 1);
}, { anchor: [11, 15] });

// tall BOOKSHELF — warm wooden case, 3 shelves of colourful spines + trinkets
defineSprite('town_bookshelf', 18, 24, (p) => {
  // outer case + inner back panel with vertical grain gradient
  p.rect(0, 0, 18, 24, P.woodD);
  p.gradV(2, 1, 14, 22, darken(P.wood, 0.08), darken(P.wood, 0.22));
  // top trim + side highlights (top-left light)
  p.hline(0, 17, 0, P.woodL);
  p.vline(1, 22, 1, lighten(P.wood, 0.1));
  p.vline(16, 1, 22, darken(P.woodD, 0.15));
  // shelf boards (board + bright lip)
  for (const sy of [7, 14, 21]) {
    p.hline(1, 16, sy, P.wood);
    p.hline(1, 16, sy - 1, P.woodL);
  }
  p.hline(1, 16, 22, P.woodL);
  // helper to place a book spine with 3 tones + a glint
  const book = (x, y, h, col, tilt) => {
    if (tilt) {
      // a leaning book
      p.line(x, y + h - 1, x + 1, y, col);
      p.line(x + 1, y + h - 1, x + 2, y, darken(col, 0.18));
      p.px(x + 1, y, lighten(col, 0.35));
    } else {
      p.rect(x, y, 2, h, col);
      p.vline(x, y, h, lighten(col, 0.22));      // lit left edge
      p.vline(x + 1, y, h, darken(col, 0.2));    // shaded right edge
      p.px(x, y, lighten(col, 0.4));             // top glint
      p.px(x, y + 2, darken(col, 0.25));         // band detail
    }
  };
  // shelf 1 (top): spines sit on board y=7
  book(3, 1, 6, P.red, false);
  book(5, 1, 6, P.gold, false);
  book(7, 2, 5, P.blue, true);
  book(10, 1, 6, P.green, false);
  book(12, 1, 6, P.purple, false);
  book(14, 2, 5, P.laser, false);
  // shelf 2 (middle): board y=14
  book(3, 8, 6, P.blue, false);
  book(5, 8, 6, P.purple, false);
  book(7, 8, 6, P.gold, false);
  book(9, 9, 5, P.green, true);
  book(12, 8, 6, P.red, false);
  book(14, 8, 6, P.neon, false);
  // shelf 3 (bottom): board y=21
  book(3, 15, 6, P.green, false);
  book(5, 15, 6, P.red, false);
  book(7, 16, 5, P.gold, true);
  book(10, 15, 6, P.purple, false);
  book(12, 15, 6, P.blue, false);
  book(14, 15, 6, P.gold, false);
  // a little potted trinket on the middle shelf (right gap)
  p.px(11, 13, P.bronze);
  p.px(11, 12, P.leaf); p.px(11, 11, P.leafL);
  // a glowing soul-shard keepsake on the top shelf
  p.glow(9, 4, 2, P.astral, 0.4, 2);
  p.px(9, 4, P.astralL);
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  // kira on a couple of spines
  p.sparkle(5, 1, P.glint, 1);
  p.sparkle(13, 8, P.glint, 1);
}, { anchor: [9, 23] });

// flat oval floor RUG (top-down) — concentric bands + woven gold motif
defineSprite('town_rug', 24, 14, (p) => {
  // outer band
  p.ellipse(12, 7, 11.5, 6.5, P.redD);
  // fringe ticks on long edges (alternating tones for woven look)
  for (let i = 2; i < 22; i += 3) {
    p.px(i, 0, P.redD); p.px(i, 13, P.redD);
    p.px(i + 1, 0, darken(P.redD, 0.2)); p.px(i + 1, 13, darken(P.redD, 0.2));
  }
  // mid band with a subtle radial lift toward the lit top-left
  p.ellipse(12, 7, 9.5, 5.2, P.red);
  p.ellipse(10, 5, 6, 3.2, lighten(P.red, 0.08));
  // gold trim ring
  p.ellipse(12, 7, 7.6, 4.1, P.gold);
  p.ellipse(12, 7, 6.4, 3.3, P.redD);
  // inner field
  p.ellipse(12, 7, 5, 2.6, P.red);
  // bone centre medallion with a glowing gold core
  p.ellipse(12, 7, 2.6, 1.5, P.bone);
  p.ellipse(12, 7, 1.2, 0.8, P.gold);
  p.px(12, 7, P.goldL);
  // woven diamond pattern around centre (cardinal + diagonal)
  p.px(7, 7, P.gold); p.px(17, 7, P.gold);
  p.px(12, 4, P.gold); p.px(12, 10, P.gold);
  p.px(9, 5, P.goldL); p.px(15, 5, P.goldL);
  p.px(9, 9, P.goldL); p.px(15, 9, P.goldL);
  // tiny sakura corner accents on the gold ring
  p.px(5, 3, P.sakura); p.px(19, 3, P.sakura);
  p.px(5, 11, P.sakura); p.px(19, 11, P.sakura);
  p.outline(darken(P.redD, 0.25));
  // soft top-left sheen as if catching window light
  p.ellipse(9, 4, 3, 1.4, withAlpha(P.rim, 0.16));
}, { anchor: [12, 13] });

// POTTED PLANT — terracotta pot + broad fanning leaves, dewy highlights
defineSprite('town_plant', 12, 18, (p) => {
  // ground contact shadow
  p.softShadow(6, 17, 5, 1.2, 0.3);
  // pot — gradient terracotta with a bright rim
  p.gradV(2, 12, 8, 5, lighten(P.bronze, 0.12), darken(P.bronze, 0.12));
  p.rect(1, 11, 10, 2, lighten(P.bronze, 0.22));   // lip
  p.hline(1, 10, 11, P.woodL);                      // lip highlight
  p.vline(2, 12, 4, lighten(P.bronze, 0.18));       // lit left edge
  p.px(3, 14, darken(P.bronze, 0.25));
  p.px(8, 15, darken(P.bronze, 0.25));
  p.shadeBottom(0.15);
  // soil
  p.hline(3, 8, 11, darken(P.wood, 0.25));
  p.speckle(3, 11, 6, 1, darken(P.wood, 0.4), 3, 7);
  // leaves — fanning up, drawn back-to-front with 3 green tones
  // back centre tall leaf
  p.ellipse(6, 5, 1.6, 5, P.leafD);
  // left leaf
  p.ellipse(3, 8, 2, 4, P.leaf);
  p.line(3, 11, 4, 6, P.leafD);
  // right leaf
  p.ellipse(9, 8, 2, 4, P.leaf);
  p.line(9, 11, 8, 6, P.leafD);
  // front mid leaves (brightest, catching light)
  p.ellipse(5, 7, 1.6, 4, P.leafL);
  p.ellipse(7, 6, 1.4, 3.6, P.leaf);
  // central vein highlights + dewy specular dots
  p.vline(2, 9, 6, lighten(P.leafL, 0.2));
  p.px(6, 1, P.leafL);
  p.px(4, 5, lighten(P.leafL, 0.25));
  p.px(5, 4, P.glint);
  p.px(8, 7, withAlpha(P.glint, 0.7));
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // a tiny floating sakura petal drifting by
  p.px(10, 3, P.sakuraL);
}, { anchor: [6, 17] });

// personal KEEPSAKE CHEST — rounded lid, gold fittings, glowing heart emblem
defineSprite('town_chest2', 14, 12, (p) => {
  // contact shadow
  p.softShadow(7, 11, 6, 1.1, 0.32);
  // body — gradient planks
  p.rect(1, 6, 12, 5, P.woodD);
  p.gradV(2, 7, 10, 3, P.wood, darken(P.wood, 0.15));
  p.hline(2, 11, 7, P.woodL);
  p.vline(2, 7, 4, lighten(P.wood, 0.1));
  // rounded lid — layered for a domed read
  p.ellipse(7, 6, 6, 3, P.woodD);
  p.ellipse(7, 6, 5, 2.4, P.wood);
  p.ellipse(7, 5, 4, 1.6, P.woodL);
  p.ellipse(6, 4, 2.4, 0.9, lighten(P.woodL, 0.2));   // top sheen
  // lid band
  p.hline(1, 12, 6, darken(P.woodD, 0.2));
  // gold corner fittings (3-tone)
  p.rect(1, 5, 2, 2, P.gold); p.px(1, 5, P.goldL); p.px(2, 6, P.goldD);
  p.rect(11, 5, 2, 2, P.gold); p.px(12, 5, P.goldL); p.px(11, 6, P.goldD);
  p.rect(1, 9, 2, 2, P.goldD); p.px(1, 9, P.gold);
  p.rect(11, 9, 2, 2, P.goldD); p.px(12, 9, P.gold);
  // gold lock plate
  p.rect(6, 6, 2, 3, P.goldD);
  p.px(6, 6, P.goldL);
  p.px(7, 7, P.gold);
  // glowing heart emblem on front
  p.glow(7, 9, 2, P.sakura, 0.4, 2);
  p.px(6, 8, P.laser); p.px(8, 8, P.laser);
  p.hline(5, 9, 9, P.laser);
  p.hline(6, 8, 10, P.sakuraL);
  p.px(7, 11, P.laser);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // kira on a gold corner
  p.sparkle(2, 5, P.glint, 1);
}, { anchor: [7, 11] });

// interior standing LAMP — pole + base + warm glowing shade (brighter on f===1)
defineAnim('town_lamp2', 8, 20, 2, (p, f) => {
  // soft pool of warm light on the floor (stronger when lit)
  p.softShadow(4, 19, 4, 1.4, 0.28);
  p.ellipse(4, 18, f ? 4 : 3.2, f ? 1.6 : 1.3, withAlpha(P.emberL, f ? 0.22 : 0.12));
  // base (kept off the very bottom row so the ellipse stays in-bounds)
  p.ellipse(4, 18, 3, 1.2, P.gray2);
  p.ellipse(4, 17, 2.4, 0.9, lighten(P.gray2, 0.18));
  p.rect(3, 17, 2, 2, P.gray2);
  p.px(2, 18, lighten(P.gray2, 0.2));
  // thin pole with a lit edge
  p.vline(7, 18, 4, P.gray2);
  p.vline(7, 18, 3, lighten(P.gray2, 0.25));
  // shade — warm gradient, brighter when lit
  p.gradV(2, 1, 5, 5, f ? lighten(P.emberL, 0.25) : P.emberL, P.ember);
  p.rect(3, 5, 3, 1, P.gold);
  p.px(2, 1, f ? P.rim : lighten(P.emberL, 0.1));
  // bright core
  p.px(4, 3, f ? P.glint : P.emberL);
  p.px(4, 2, f ? lighten(P.emberL, 0.2) : P.ember);
  // outline the solid lamp BEFORE the soft glow so the halo stays haloed
  p.outline(P.ink);
  // soft glow halo on top — no outline (varies by frame)
  p.glow(4, 3, f ? 4 : 3.2, P.emberL, f ? 0.34 : 0.2, 3);
  p.ellipse(4, 4, f ? 2 : 1.6, f ? 2.4 : 2, withAlpha(P.white, f ? 0.28 : 0.16));
  // a little kira spark when fully lit
  if (f) p.star4(4, 3, 3, withAlpha(P.glint, 0.6), P.glint);
}, { anchor: [4, 19], fps: 2 });

// wooden BARREL — staves bound by two iron hoops, lighter top rim
defineSprite('town_barrel', 12, 14, (p) => {
  // ground contact shadow
  p.softShadow(6, 13, 5, 1.3, 0.32);
  // barrel body (bulged) — base then gradient front
  p.rect(2, 2, 8, 11, P.woodD);
  p.rect(1, 4, 10, 7, P.woodD);
  p.gradV(2, 3, 8, 9, lighten(P.wood, 0.08), darken(P.wood, 0.12));
  p.gradV(1, 5, 10, 5, lighten(P.wood, 0.06), darken(P.wood, 0.1));
  // stave seams
  p.vline(3, 12, 4, darken(P.woodD, 0.1));
  p.vline(3, 12, 7, darken(P.woodD, 0.1));
  p.vline(3, 12, 9, darken(P.woodD, 0.1));
  // lit left stave edge
  p.vline(2, 4, 8, lighten(P.wood, 0.16));
  // edge shading (curved sides darker)
  p.vline(4, 11, 1, darken(P.woodD, 0.18));
  p.vline(4, 11, 10, darken(P.woodD, 0.18));
  // iron hoops (metallic two-tone with a glint)
  p.hline(1, 10, 4, P.iron);
  p.hline(1, 10, 5, darken(P.iron, 0.2));
  p.px(2, 4, lighten(P.iron, 0.3));
  p.hline(1, 10, 10, P.iron);
  p.hline(1, 10, 11, darken(P.iron, 0.2));
  p.px(2, 10, lighten(P.iron, 0.3));
  // top rim + lid
  p.ellipse(6, 2, 5, 1.6, P.woodL);
  p.ellipse(6, 2, 3.6, 1, P.wood);
  p.ellipse(5, 1.6, 1.8, 0.6, lighten(P.woodL, 0.2));   // lid sheen
  p.px(4, 1, lighten(P.woodL, 0.25));
  p.rimLight(P.rim, 0.38);
  p.outline(P.ink);
}, { anchor: [6, 13] });
