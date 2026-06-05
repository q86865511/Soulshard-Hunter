import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// 1. 裁縫人台 — dress-form mannequin: faceless torso on a wooden pole + round base
defineSprite('town_mannequin', 12, 22, (p) => {
  // round wooden base + pole
  p.ellipse(6, 20, 4, 1.6, P.woodD);
  p.ellipse(6, 19, 3, 1.2, P.wood);
  p.vline(13, 19, 6, P.woodD);
  p.vline(13, 19, 5, darken(P.wood, 0.15));
  // torso form (bone / gray3), tapered waist -> shoulders
  p.rect(4, 11, 5, 3, P.gray3);              // waist
  p.rect(3, 6, 7, 6, P.bone);                // chest
  p.rect(3, 6, 7, 1, lighten(P.bone, 0.2));  // top highlight
  p.vline(6, 13, 4, darken(P.bone, 0.18));   // left shade edge
  p.px(8, 8, lighten(P.bone, 0.25));         // sheen
  // small neck knob (faceless)
  p.rect(5, 3, 3, 3, P.gray3);
  p.px(6, 3, P.gray4);
  // draped cloak over one shoulder
  p.rect(8, 6, 3, 7, P.purpleL);
  p.vline(6, 12, 10, P.purple);
  p.px(8, 6, lighten(P.purpleL, 0.2));
  p.line(8, 13, 10, 11, P.purple);
  p.outline(P.ink);
}, { anchor: [6, 21] });

// 2. 衣架 — clothing rack: bar on two legs with hanging garments
defineSprite('town_rack', 22, 20, (p) => {
  // two legs + feet
  p.vline(4, 18, 3, P.woodD);
  p.vline(4, 18, 18, P.woodD);
  p.hline(1, 5, 18, P.woodD);
  p.hline(16, 20, 18, P.woodD);
  // top bar (highlight on top)
  p.hline(2, 19, 4, P.wood);
  p.hline(2, 19, 3, P.woodL);
  // hooked top posts
  p.px(3, 3, P.woodD); p.px(18, 3, P.woodD);
  // hanger + garment helper
  const hang = (hx, col) => {
    p.px(hx, 5, P.steelD);                  // hook
    p.line(hx - 2, 7, hx + 2, 7, P.steelD); // hanger bar
    p.rect(hx - 2, 8, 5, 7, col);           // garment body
    p.rect(hx - 2, 8, 5, 1, lighten(col, 0.25));
    p.vline(8, 14, hx + 2, darken(col, 0.2));
    p.px(hx - 1, 9, lighten(col, 0.3));
  };
  hang(4, P.red);
  hang(9, P.blue);
  hang(14, P.green);
  hang(18, P.gold);
  p.outline(P.ink);
}, { anchor: [11, 19] });

// 3. 全身鏡 — standing full-length mirror in an ornate gold frame
defineSprite('town_mirror', 12, 22, (p) => {
  // little feet
  p.rect(2, 20, 3, 2, P.goldD);
  p.rect(7, 20, 3, 2, P.goldD);
  // outer ornate gold frame
  p.rect(1, 1, 10, 20, P.goldD);
  p.rect(1, 1, 10, 1, P.goldL);
  p.rect(1, 1, 1, 20, P.gold);
  p.vline(1, 20, 10, P.goldD);
  // little crown finial top
  p.px(5, 0, P.goldL); p.px(6, 0, P.goldL);
  // pale reflective glass
  p.rect(3, 3, 6, 16, P.gray4);
  p.rect(3, 3, 6, 7, lighten(P.gray4, 0.15));
  // diagonal white reflection streak
  p.line(4, 16, 7, 4, P.white);
  p.line(5, 17, 8, 6, lighten(P.gray4, 0.3));
  p.px(7, 5, P.white);
  p.outline(P.ink);
}, { anchor: [6, 21] });

// 4. 戰利品架 — trophy shelf: cabinet with cups + medals, hall-of-fame look
defineSprite('town_trophyshelf', 24, 22, (p) => {
  // cabinet body
  p.rect(2, 2, 20, 19, P.woodD);
  p.rect(2, 2, 20, 1, P.woodL);
  p.vline(2, 20, 2, P.wood);
  // two shelf ledges
  p.hline(3, 20, 11, P.wood);
  p.hline(3, 20, 12, darken(P.woodD, 0.2));
  p.hline(3, 20, 20, P.wood);
  // back panel (recessed dark)
  p.rect(4, 4, 16, 6, darken(P.woodD, 0.25));
  p.rect(4, 13, 16, 6, darken(P.woodD, 0.25));
  // -- top shelf: a big gold cup centred + medals
  const cup = (cx, cy) => {
    p.rect(cx - 2, cy, 5, 3, P.gold);
    p.rect(cx - 2, cy, 5, 1, P.goldL);
    p.px(cx - 3, cy, P.goldD); p.px(cx + 3, cy, P.goldD); // handles
    p.rect(cx - 1, cy + 3, 3, 1, P.goldD);                // stem
    p.rect(cx - 2, cy + 4, 5, 1, P.goldD);                // foot
  };
  cup(7, 5);
  cup(16, 5);
  // medals (bronze rounds) on top shelf
  p.circle(12, 7, 1, P.bronze); p.px(12, 6, lighten(P.bronze, 0.3));
  // -- bottom shelf: trophies + a row of medals
  cup(6, 14);
  p.circle(12, 16, 1, P.bronze); p.px(12, 15, lighten(P.bronze, 0.3));
  p.circle(15, 16, 1, P.bronze);
  p.circle(18, 16, 1, P.bronze); p.px(18, 15, lighten(P.bronze, 0.3));
  p.outline(P.ink);
}, { anchor: [12, 21] });

// 5. 成就金旗 — hanging golden achievement banner with white star + forked bottom
defineSprite('town_banner_gold', 12, 24, (p) => {
  // top rod
  p.hline(1, 10, 1, P.woodD);
  p.hline(1, 10, 0, P.woodL);
  p.px(0, 1, P.woodD); p.px(11, 1, P.woodD);
  // banner cloth body
  p.rect(2, 2, 8, 17, P.goldD);
  p.rect(2, 2, 8, 1, P.gold);            // top seam highlight
  p.vline(2, 18, 2, P.gold);             // left border
  p.vline(2, 18, 9, darken(P.goldD, 0.2));
  p.vline(2, 18, 3, lighten(P.goldD, 0.15)); // inner sheen
  // white star emblem
  p.px(6, 6, P.white);
  p.hline(4, 8, 7, P.white);
  p.px(5, 8, P.white); p.px(7, 8, P.white);
  p.px(4, 9, P.white); p.px(8, 9, P.white);
  // pointed / forked bottom (V notch)
  p.hline(2, 9, 19, P.goldD);
  p.line(2, 19, 4, 22, P.goldD);
  p.line(9, 19, 7, 22, P.goldD);
  p.px(3, 21, darken(P.goldD, 0.2));
  p.px(8, 21, darken(P.goldD, 0.2));
  p.outline(P.ink);
}, { anchor: [6, 23] });

// 6. 大理石柱 — fluted marble pillar with capital + square base, pale + stately
defineSprite('town_pillar', 12, 28, (p) => {
  // square base
  p.rect(1, 24, 10, 4, P.gray2);
  p.rect(1, 24, 10, 1, P.gray3);
  p.rect(2, 23, 8, 1, P.gray3);
  // shaft
  p.rect(2, 4, 8, 20, P.gray3);
  // vertical fluting: light highlights + shadow grooves
  p.vline(4, 23, 3, P.gray4);
  p.vline(4, 23, 6, P.gray4);
  p.vline(4, 23, 8, P.gray4);
  p.vline(4, 23, 4, P.gray2);
  p.vline(4, 23, 7, P.gray2);
  p.vline(4, 23, 9, P.gray2);
  // capital (top spreads wider)
  p.rect(1, 1, 10, 3, P.gray3);
  p.rect(1, 1, 10, 1, P.gray4);
  p.rect(2, 0, 8, 1, P.gray4);
  p.hline(2, 9, 4, P.gray2);
  p.outline(P.ink);
}, { anchor: [6, 27] });
