import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// Town NPCs (set B). Each is a hand-built standing figure in a 16x18 box,
// feet near the bottom, with a distinct silhouette/prop so it reads at a glance.
// f===1 gives a subtle 1px breathe on the upper body.

// 1. CURATOR — old scholar/keeper: long purple coat, grey hair+beard,
//    a monocle glint, holding a small gold trophy. Dignified, slightly hunched.
defineAnim('npc_curator', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;        // breathe lifts the upper body
  // shoes
  p.rect(5, 16, 3, 2, P.ink2);
  p.rect(9, 16, 3, 2, P.ink2);
  // long coat (trapezoid, hunched: leans slightly right)
  for (let y = 8 + oy; y <= 16; y++) {
    const t = (y - (8 + oy)) / (16 - (8 + oy));
    const hw = Math.round(2.4 + t * 3);
    p.hline(8 - hw, 7 + hw + (y > 11 ? 1 : 0), y, P.purpleD);
  }
  // lit coat front panel
  for (let y = 9 + oy; y <= 15; y++) {
    const t = (y - (9 + oy)) / (15 - (9 + oy));
    const hw = Math.round(1 + t * 1.6);
    p.hline(8 - hw, 7 + hw, y, P.purple);
  }
  p.vline(9 + oy, 15, 8, lighten(P.purple, 0.18));   // centre seam
  p.px(7, 11 + oy, P.gold); p.px(8, 12 + oy, P.gold); // brass buttons
  // hunched shoulders
  p.hline(3, 12, 8 + oy, darken(P.purpleD, 0.12));
  // grey beard under the chin
  p.ellipse(8, 7 + oy, 2.6, 2, P.gray3);
  p.px(8, 8 + oy, P.gray2);
  // head + grey hair
  p.ellipse(8, 4 + oy, 3, 3, P.skinD);
  p.ellipse(8, 4 + oy, 2.4, 2.4, P.skin);
  p.ellipse(8, 2 + oy, 3, 1.8, P.gray4);             // swept hair
  p.hline(5, 11, 2 + oy, P.gray3);
  p.px(5, 3 + oy, P.gray3); p.px(11, 3 + oy, P.gray3);
  // eyes + monocle glint on the right eye
  p.px(6, 4 + oy, P.ink);
  p.px(10, 4 + oy, P.ink);
  p.ring(10, 4 + oy, 1.4, P.gold);
  p.px(11, 3 + oy, P.white);                          // glass glint
  // left arm cradling a gold trophy down low
  p.rect(2, 11 + oy, 2, 3, P.purpleD);
  p.rect(1, 13 + oy, 3, 1, P.skinD);                 // hand
  p.rect(1, 14 + oy, 4, 2, P.goldD);                 // trophy cup
  p.hline(1, 4, 14 + oy, P.goldL);
  p.px(2, 16 + oy, P.gold); p.px(3, 16 + oy, P.gold); // trophy stem/base
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// 2. GUIDE — herald/town-crier: green tabard over a tunic, a feathered cap,
//    holding an unfurled scroll. Upright and welcoming.
defineAnim('npc_guide', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;
  // boots
  p.rect(5, 16, 3, 2, P.woodD);
  p.rect(8, 16, 3, 2, P.woodD);
  // tunic body
  p.rect(5, 9 + oy, 6, 7, P.greenD);
  // green tabard panel over the front (with V-neck)
  p.rect(6, 8 + oy, 4, 8, P.green);
  p.px(7, 8 + oy, P.greenD); p.px(8, 8 + oy, P.greenD);     // collar notch
  p.vline(9 + oy, 15, 8, P.greenL);                          // bright centre stripe
  p.hline(6, 9, 15, P.goldD);                                // hem trim
  // arms — left lifted forward holding a scroll
  p.rect(3, 10 + oy, 2, 3, P.greenD);
  p.rect(11, 10 + oy, 2, 3, P.greenD);
  p.rect(2, 12 + oy, 2, 1, P.skin);                          // hand
  // unfurled scroll across the front
  p.rect(2, 12 + oy, 6, 3, P.bone);
  p.hline(2, 7, 12 + oy, lighten(P.bone, 0.15));
  p.px(1, 12 + oy, P.woodL); p.px(1, 14 + oy, P.woodL);      // rolled left end
  p.px(8, 12 + oy, P.woodL); p.px(8, 14 + oy, P.woodL);      // rolled right end
  p.hline(3, 6, 13 + oy, P.gray2);                           // line of text
  // head
  p.ellipse(8, 5 + oy, 3, 3, P.skinD);
  p.ellipse(8, 5 + oy, 2.4, 2.4, P.skin);
  p.px(6, 5 + oy, P.ink); p.px(10, 5 + oy, P.ink);
  p.px(8, 7 + oy, P.skinD);                                  // friendly smile shadow
  // feathered cap
  p.rect(5, 2 + oy, 6, 2, P.greenD);
  p.hline(5, 10, 2 + oy, P.green);
  p.hline(4, 11, 4 + oy, P.greenD);                          // brim
  p.line(11, 2 + oy, 13, 0 + oy, P.emberL);                  // feather sweeping up
  p.px(13, 0 + oy, lighten(P.emberL, 0.3));
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// 3. MERCHANT — travelling peddler: a big bulging backpack of wares behind the
//    shoulders, a wide floppy hat, a coin pouch at the belt. Stooped under the load.
defineAnim('npc_merchant', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;
  // boots
  p.rect(5, 16, 3, 2, P.woodD);
  p.rect(9, 16, 3, 2, P.woodD);
  // big backpack rising behind the shoulders (drawn first = behind body)
  p.rect(10, 4 + oy, 5, 9, P.woodD);
  p.rect(11, 5 + oy, 4, 7, P.woodL);
  p.hline(11, 14, 5 + oy, lighten(P.woodL, 0.18));
  // wares poking out of the pack
  p.rect(11, 3 + oy, 1, 2, P.green);                         // bottle neck
  p.px(11, 2 + oy, P.greenL);
  p.rect(13, 3 + oy, 2, 2, P.red);                           // box
  p.px(13, 3 + oy, P.redL);
  p.px(12, 6 + oy, P.gold); p.px(14, 9 + oy, P.steelL);      // shiny specks
  p.px(13, 11 + oy, P.blueL);
  p.vline(5 + oy, 12, 10, P.leather);                        // pack strap to front
  // stooped body, leaning forward-left under the weight
  for (let y = 8 + oy; y <= 16; y++) {
    const t = (y - (8 + oy)) / (16 - (8 + oy));
    const hw = Math.round(2.2 + t * 2.4);
    p.hline(6 - hw + (y > 11 ? -1 : 0), 7 + hw, y, P.leather);
  }
  p.rect(4, 9 + oy, 5, 5, lighten(P.leather, 0.12));         // lit tunic front
  p.hline(3, 8, 15, P.woodD);                                // belt
  // coin pouch at the belt
  p.ellipse(4, 14 + oy, 1.8, 1.8, P.goldD);
  p.ellipse(4, 14 + oy, 1, 1, P.gold);
  p.px(4, 13 + oy, P.goldL);
  // arms
  p.rect(2, 11 + oy, 2, 3, P.leather);
  // head (pushed forward/down by the stoop)
  p.ellipse(6, 5 + oy, 2.6, 2.6, P.skinD);
  p.ellipse(6, 5 + oy, 2, 2, P.skin);
  p.px(5, 5 + oy, P.ink); p.px(7, 5 + oy, P.ink);
  p.ellipse(6, 7 + oy, 1.6, 1, P.skinD);                     // little stubbly chin
  // wide floppy hat
  p.ellipse(6, 2 + oy, 5, 1.8, P.woodD);                     // broad brim
  p.hline(1, 11, 2 + oy, P.woodD);
  p.ellipse(6, 1 + oy, 2.4, 1.6, darken(P.woodD, 0.1));      // crown
  p.px(6, 0 + oy, P.woodL);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// 4. OLDVET — retired soldier: worn steel chest piece, an eyepatch over one eye,
//    grey stubble, leaning on a wooden cane. Battle-worn, asymmetric stance.
defineAnim('npc_oldvet', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;
  // asymmetric legs: weight on the left, right leg braced out
  p.rect(4, 15, 3, 3, P.woodD);                              // planted left boot
  p.rect(9, 16, 3, 2, P.gray1);                              // braced right
  // worn padded tunic under the armour
  p.rect(4, 9 + oy, 8, 7, P.woodD);
  p.rect(4, 9 + oy, 8, 1, P.wood);
  // steel chest piece (dented, asymmetric highlight)
  p.rect(5, 8 + oy, 6, 5, P.steelD);
  p.rect(5, 8 + oy, 6, 1, P.steel);
  p.px(6, 9 + oy, P.steelL); p.px(7, 9 + oy, P.steelL);      // shoulder shine
  p.px(9, 11 + oy, darken(P.steelD, 0.2));                   // dent
  p.hline(5, 10, 12 + oy, P.gray1);                          // bottom rim
  // left arm gripping a tall cane on the figure's right side (screen left)
  p.rect(2, 10 + oy, 2, 3, P.steelD);
  p.rect(1, 12 + oy, 2, 1, P.skinD);                         // hand
  p.vline(8 + oy, 17, 1, P.wood);                            // cane shaft
  p.px(1, 8 + oy, P.woodL);                                  // cane top knob
  p.px(0, 9 + oy, P.woodD);                                  // shaft side shade
  // other arm hanging
  p.rect(12, 10 + oy, 2, 4, P.woodD);
  // head, grey stubble
  p.ellipse(8, 4 + oy, 3, 3, P.skinD);
  p.ellipse(8, 4 + oy, 2.4, 2.4, P.skin);
  p.hline(6, 10, 6 + oy, P.gray3);                           // stubble jaw
  p.px(7, 6 + oy, P.gray4); p.px(9, 6 + oy, P.gray4);
  p.ellipse(8, 1 + oy, 3, 1.6, P.gray3);                     // close grey hair
  // good eye (left) + eyepatch over the right
  p.px(6, 4 + oy, P.ink);
  p.rect(9, 3 + oy, 3, 2, P.ink2);                           // eyepatch
  p.line(9, 3 + oy, 12, 2 + oy, P.gray1);                    // patch strap
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// 5. CHILD — a small kid: large head over a short body, a bright tunic,
//    tousled hair, holding a tiny wooden toy. Feet around y15-17. Playful.
defineAnim('npc_child', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;          // little hop/breathe
  const tunic = P.blueL, tunicD = P.blueD;
  // little shoes
  p.rect(6, 16, 2, 2, P.woodD);
  p.rect(9, 16, 2, 2, P.woodD);
  // bare legs
  p.rect(6, 14 + oy, 2, 2, P.skinD);
  p.rect(9, 14 + oy, 2, 2, P.skinD);
  // short bright tunic
  p.rect(5, 10 + oy, 7, 5, tunicD);
  p.rect(6, 10 + oy, 5, 4, tunic);
  p.hline(6, 10, 10 + oy, lighten(tunic, 0.2));
  p.px(8, 12 + oy, P.white);                                 // little button
  // arms — right hand holds a toy up
  p.rect(4, 11 + oy, 1, 2, tunicD);
  p.rect(11, 10 + oy, 1, 2, tunicD);
  p.rect(11, 9 + oy, 1, 1, P.skin);                          // raised hand
  // tiny wooden toy (a little horse/block on a stick)
  p.rect(11, 7 + oy, 2, 2, P.wood);
  p.px(11, 7 + oy, P.woodL);
  p.px(13, 7 + oy, P.woodD);                                 // ear/nub
  p.vline(9 + oy, 10 + oy, 11, P.woodD);                     // stick
  // big round head
  p.ellipse(8, 6 + oy, 3.2, 3.2, P.skinD);
  p.ellipse(8, 6 + oy, 2.6, 2.6, P.skin);
  // tousled hair
  p.ellipse(8, 4 + oy, 3.2, 2, P.wood);
  p.px(5, 4 + oy, P.woodL); p.px(8, 3 + oy, P.woodL); p.px(11, 4 + oy, P.woodD);
  p.px(6, 3 + oy, P.wood); p.px(10, 3 + oy, P.wood);         // stray tufts
  // big eyes + smile
  p.px(6, 6 + oy, P.ink); p.px(10, 6 + oy, P.ink);
  p.px(6, 6 + oy, P.ink); p.px(7, 6 + oy, P.white);
  p.hline(7, 9, 8 + oy, P.skinD);                            // smile
  p.px(8, 7 + oy, P.skin);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });
