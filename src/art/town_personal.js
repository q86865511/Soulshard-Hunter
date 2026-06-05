import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// cozy BED — wooden frame + headboard, blanket, pillow
defineSprite('town_bed', 22, 16, (p) => {
  // shadow / floor contact (kept within the bottom row)
  p.ellipse(11, 14, 10, 1.4, darken(P.woodD, 0.3));
  // legs
  p.rect(2, 12, 2, 3, P.woodD);
  p.rect(18, 12, 2, 3, P.woodD);
  // headboard (left)
  p.rect(1, 2, 3, 11, P.woodD);
  p.rect(1, 2, 3, 1, P.woodL);
  p.px(2, 3, P.wood);
  // foot board (right)
  p.rect(18, 6, 3, 7, P.woodD);
  p.rect(18, 6, 3, 1, P.woodL);
  // mattress base / frame rail
  p.rect(3, 11, 16, 2, P.wood);
  p.rect(3, 11, 16, 1, P.woodL);
  // mattress (sheet)
  p.rect(4, 6, 14, 5, P.bone);
  p.rect(4, 6, 14, 1, lighten(P.bone, 0.25));
  p.shadeBottom(0.12);
  // pillow (near headboard)
  p.rect(4, 4, 6, 4, P.white);
  p.rect(4, 4, 6, 1, lighten(P.white, 0.1));
  p.px(9, 5, P.gray4);
  // folded blanket over the lower half
  p.rect(11, 6, 7, 5, P.blueD);
  p.rect(11, 6, 7, 1, P.blue);
  p.hline(11, 17, 8, lighten(P.blue, 0.2));
  p.px(13, 9, P.blueD);
  p.px(16, 9, P.blueD);
  p.outline(P.ink);
}, { anchor: [11, 15] });

// tall BOOKSHELF — wooden case, 3 shelves of colourful spines
defineSprite('town_bookshelf', 18, 24, (p) => {
  // outer case
  p.rect(0, 0, 18, 24, P.woodD);
  p.rect(2, 1, 14, 22, darken(P.wood, 0.15));
  // top trim + side highlights
  p.hline(0, 17, 0, P.woodL);
  p.vline(1, 22, 1, P.wood);
  // shelf boards
  p.hline(1, 16, 7, P.wood);
  p.hline(1, 16, 14, P.wood);
  p.hline(1, 16, 21, P.wood);
  p.hline(1, 16, 22, P.woodL);
  // helper to place a book spine
  const book = (x, y, h, col, tilt) => {
    if (tilt) {
      // a leaning book
      p.line(x, y + h - 1, x + 1, y, col);
      p.line(x + 1, y + h - 1, x + 2, y, col);
      p.px(x + 1, y, lighten(col, 0.3));
    } else {
      p.rect(x, y, 2, h, col);
      p.px(x, y, lighten(col, 0.3));
      p.px(x, y + 2, darken(col, 0.2));
    }
  };
  // shelf 1 (top): rows sit on board y=7, spines above
  book(3, 1, 6, P.red, false);
  book(5, 1, 6, P.gold, false);
  book(7, 2, 5, P.blue, true);
  book(10, 1, 6, P.green, false);
  book(12, 1, 6, P.purple, false);
  book(14, 2, 5, P.red, false);
  // shelf 2 (middle): board y=14
  book(3, 8, 6, P.blue, false);
  book(5, 8, 6, P.purple, false);
  book(7, 8, 6, P.gold, false);
  book(9, 9, 5, P.green, true);
  book(12, 8, 6, P.red, false);
  book(14, 8, 6, P.blue, false);
  // shelf 3 (bottom): board y=21
  book(3, 15, 6, P.green, false);
  book(5, 15, 6, P.red, false);
  book(7, 16, 5, P.gold, true);
  book(10, 15, 6, P.purple, false);
  book(12, 15, 6, P.blue, false);
  book(14, 15, 6, P.gold, false);
  p.outline(P.ink);
}, { anchor: [9, 23] });

// flat oval floor RUG (top-down) — concentric bands + woven dots
defineSprite('town_rug', 24, 14, (p) => {
  // outer band
  p.ellipse(12, 7, 11.5, 6.5, P.redD);
  // fringe ticks on long edges
  for (let i = 2; i < 22; i += 3) { p.px(i, 0, P.redD); p.px(i, 13, P.redD); }
  // mid band
  p.ellipse(12, 7, 9.5, 5.2, P.red);
  // gold trim ring
  p.ellipse(12, 7, 7.6, 4.1, P.gold);
  p.ellipse(12, 7, 6.4, 3.3, P.redD);
  // inner field
  p.ellipse(12, 7, 5, 2.6, P.red);
  // bone centre medallion
  p.ellipse(12, 7, 2.6, 1.5, P.bone);
  p.ellipse(12, 7, 1.2, 0.8, P.gold);
  // simple woven diamond pattern around centre
  p.px(7, 7, P.gold); p.px(17, 7, P.gold);
  p.px(12, 4, P.gold); p.px(12, 10, P.gold);
  p.px(9, 5, P.goldL); p.px(15, 5, P.goldL);
  p.px(9, 9, P.goldL); p.px(15, 9, P.goldL);
  p.outline(darken(P.redD, 0.25));
}, { anchor: [12, 13] });

// POTTED PLANT — terracotta pot + broad fanning leaves
defineSprite('town_plant', 12, 18, (p) => {
  // pot
  p.rect(2, 12, 8, 5, P.bronze);
  p.rect(2, 12, 8, 1, P.woodL);
  p.rect(1, 11, 10, 2, lighten(P.bronze, 0.2));
  p.shadeBottom(0.15);
  p.px(3, 14, darken(P.bronze, 0.2));
  p.px(8, 15, darken(P.bronze, 0.2));
  // soil
  p.hline(3, 8, 11, darken(P.wood, 0.25));
  // leaves — fanning up, drawn back-to-front
  // back centre tall leaf
  p.ellipse(6, 5, 1.6, 5, P.greenD);
  // left leaf
  p.ellipse(3, 8, 2, 4, P.green);
  p.line(3, 11, 4, 6, P.greenD);
  // right leaf
  p.ellipse(9, 8, 2, 4, P.green);
  p.line(9, 11, 8, 6, P.greenD);
  // front mid leaves
  p.ellipse(5, 7, 1.6, 4, P.greenL);
  p.ellipse(7, 6, 1.4, 3.6, P.green);
  // central vein highlights
  p.vline(2, 9, 6, lighten(P.greenL, 0.15));
  p.px(6, 1, P.greenL);
  p.px(4, 5, lighten(P.greenL, 0.2));
  p.outline(P.ink);
}, { anchor: [6, 17] });

// personal KEEPSAKE CHEST — rounded lid, gold fittings, heart emblem
defineSprite('town_chest2', 14, 12, (p) => {
  // body
  p.rect(1, 6, 12, 5, P.woodD);
  p.rect(2, 7, 10, 3, P.wood);
  p.rect(2, 7, 10, 1, P.woodL);
  // rounded lid
  p.ellipse(7, 6, 6, 3, P.woodD);
  p.ellipse(7, 6, 5, 2.4, P.wood);
  p.ellipse(7, 5, 4, 1.6, P.woodL);
  // lid band
  p.hline(1, 12, 6, darken(P.woodD, 0.2));
  // gold corner fittings
  p.rect(1, 5, 2, 2, P.gold); p.px(1, 5, P.goldL);
  p.rect(11, 5, 2, 2, P.gold); p.px(12, 5, P.goldL);
  p.rect(1, 9, 2, 2, P.goldD);
  p.rect(11, 9, 2, 2, P.goldD);
  // gold lock plate
  p.rect(6, 6, 2, 3, P.goldD);
  p.px(6, 6, P.goldL);
  // heart emblem on front
  p.px(6, 8, P.gold); p.px(8, 8, P.gold);
  p.hline(5, 9, 9, P.gold);
  p.hline(6, 8, 10, P.goldL);
  p.px(7, 11, P.gold);
  p.outline(P.ink);
}, { anchor: [7, 11] });

// interior standing LAMP — pole + base + warm glowing shade (brighter on f===1)
defineAnim('town_lamp2', 8, 20, 2, (p, f) => {
  // base (kept off the very bottom row so the ellipse stays in-bounds)
  p.ellipse(4, 18, 3, 1.2, P.gray2);
  p.rect(3, 17, 2, 2, P.gray2);
  p.px(2, 18, lighten(P.gray2, 0.2));
  // thin pole
  p.vline(7, 18, 4, P.gray2);
  p.vline(7, 18, 3, lighten(P.gray2, 0.2));
  // shade
  p.rect(2, 1, 5, 5, P.ember);
  p.rect(2, 1, 5, 2, f ? lighten(P.emberL, 0.2) : P.emberL);
  p.rect(3, 5, 3, 1, P.gold);
  // bright core
  p.px(4, 3, f ? P.white : P.emberL);
  // outline the solid lamp BEFORE the soft glow so the halo stays haloed
  p.outline(P.ink);
  // soft glow halo on top — no outline (varies by frame)
  p.ellipse(4, 4, f ? 3.4 : 2.8, f ? 4 : 3.4, withAlpha(P.emberL, f ? 0.32 : 0.2));
  p.ellipse(4, 4, f ? 2 : 1.6, f ? 2.4 : 2, withAlpha(P.white, f ? 0.28 : 0.16));
}, { anchor: [4, 19], fps: 2 });

// wooden BARREL — staves bound by two iron hoops, lighter top rim
defineSprite('town_barrel', 12, 14, (p) => {
  // shadow (kept within the bottom row)
  p.ellipse(6, 13, 5, 1.2, darken(P.woodD, 0.3));
  // barrel body (bulged)
  p.rect(2, 2, 8, 11, P.woodD);
  p.rect(1, 4, 10, 7, P.woodD);
  p.rect(2, 3, 8, 9, P.wood);
  p.rect(1, 5, 10, 5, P.wood);
  // stave seams
  p.vline(3, 12, 4, P.woodD);
  p.vline(3, 12, 7, P.woodD);
  p.vline(3, 12, 9, P.woodD);
  // edge shading
  p.vline(4, 11, 1, darken(P.woodD, 0.15));
  p.vline(4, 11, 10, darken(P.woodD, 0.15));
  // iron hoops
  p.hline(1, 10, 4, P.iron);
  p.hline(1, 10, 5, darken(P.iron, 0.2));
  p.hline(1, 10, 10, P.iron);
  p.hline(1, 10, 11, darken(P.iron, 0.2));
  // top rim + lid
  p.ellipse(6, 2, 5, 1.6, P.woodL);
  p.ellipse(6, 2, 3.6, 1, P.wood);
  p.px(4, 1, lighten(P.woodL, 0.2));
  p.outline(P.ink);
}, { anchor: [6, 13] });