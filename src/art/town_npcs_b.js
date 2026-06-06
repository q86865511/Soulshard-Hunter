import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// Town NPCs (set B) — ANIME POLISH EDITION (art_v2).
// Each is a hand-built standing figure in a 16x18 box, feet near the bottom,
// with a distinct silhouette/prop so it reads at a glance.
// f===1 gives a subtle 1px breathe on the upper body.
//
// Upgrade pass (drop-in: same names / dims / anchors / fps):
//   • committed top-left light source; 3–4 tonal steps per material
//   • big glowing anime eyes with white catch-lights + soft blush
//   • p.softShadow() contact shadow, p.rimLight() before outline()
//   • p.star4 / p.sparkle "kira" accents, gentle gradient cloth & sheen
//   • each NPC keeps a unique colour story so the set stays distinct.

// ── small shared helper: a glowing anime eye (pupil + glow + catch-light) ──────
function animEye(p, x, y, iris, glowCol) {
  if (glowCol) p.glow(x, y, 1.6, glowCol, 0.5, 3);
  p.px(x, y, iris);
  p.px(x, y - 1, lighten(iris, 0.35));   // upper iris sheen
  p.px(x - 1, y, P.ink);                 // dark inner corner for depth
  p.px(x, y, P.glint);                   // crisp catch-light
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. CURATOR — old scholar/keeper: long purple coat, silver hair+beard, a glowing
//    monocle, cradling a gleaming gold trophy. Dignified, slightly hunched.
//    Colour story: royal purple + silver + warm gold.
// ═════════════════════════════════════════════════════════════════════════════
defineAnim('npc_curator', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;        // breathe lifts the upper body
  p.softShadow(8, 17, 5, 1.4, 0.4);   // grounding contact shadow

  // shoes
  p.rect(5, 16, 3, 2, P.ink2);
  p.rect(9, 16, 3, 2, P.ink2);
  p.px(5, 16, lighten(P.ink2, 0.18)); p.px(9, 16, lighten(P.ink2, 0.18));

  // long coat (trapezoid, hunched: leans slightly right) — graded purple
  for (let y = 8 + oy; y <= 16; y++) {
    const t = (y - (8 + oy)) / (16 - (8 + oy));
    const hw = Math.round(2.4 + t * 3);
    p.hline(8 - hw, 7 + hw + (y > 11 ? 1 : 0), y, mix(P.purpleD, P.void, t * 0.5));
  }
  // lit coat front panel (vertical sheen)
  for (let y = 9 + oy; y <= 15; y++) {
    const t = (y - (9 + oy)) / (15 - (9 + oy));
    const hw = Math.round(1 + t * 1.6);
    p.hline(8 - hw, 7 + hw, y, mix(P.purple, P.purpleL, 0.3 - t * 0.3));
  }
  p.vline(9 + oy, 15, 8, lighten(P.purpleL, 0.05));   // centre seam glow
  // brass buttons with glints
  p.px(7, 11 + oy, P.gold); p.px(7, 11 + oy, P.goldL);
  p.px(8, 12 + oy, P.gold); p.px(8, 12 + oy, P.goldL);
  // hunched shoulders + a touch of astral trim on the collar
  p.hline(3, 12, 8 + oy, darken(P.purpleD, 0.12));
  p.px(4, 8 + oy, P.astral); p.px(12, 8 + oy, P.astral);

  // silver beard under the chin
  p.ellipse(8, 7 + oy, 2.6, 2, P.gray3);
  p.ellipse(8, 7 + oy, 2.2, 1.4, P.gray4);
  p.px(8, 8 + oy, P.gray2);
  // head + skin shading
  p.ellipse(8, 4 + oy, 3, 3, P.skinD);
  p.ellipse(8, 4 + oy, 2.4, 2.4, P.skin);
  p.px(6, 3 + oy, P.skin2);
  // swept silver hair with sheen
  p.ellipse(8, 2 + oy, 3, 1.8, P.gray3);
  p.ellipse(8, 2 + oy, 2.6, 1.3, P.gray4);
  p.hline(5, 11, 2 + oy, P.gray4);
  p.px(6, 1 + oy, P.white); p.px(8, 1 + oy, P.white);  // hair highlight
  p.px(5, 3 + oy, P.gray3); p.px(11, 3 + oy, P.gray3);
  // big calm eyes + a GLOWING monocle on the right eye
  animEye(p, 6, 4 + oy, P.ink, null);
  p.px(7, 4 + oy, P.white);                            // tiny catch-light
  p.glow(10, 4 + oy, 1.8, P.holyL, 0.5, 3);            // monocle lens glow
  p.px(10, 4 + oy, P.ink);
  p.ring(10, 4 + oy, 1.4, P.gold);
  p.px(11, 3 + oy, P.glint);                           // glass glint
  p.px(8, 6 + oy, withAlpha(P.red, 0.18));             // faint dignified blush

  // left arm cradling a gleaming gold trophy down low
  p.rect(2, 11 + oy, 2, 3, P.purpleD);
  p.px(2, 11 + oy, P.purple);
  p.rect(1, 13 + oy, 3, 1, P.skinD);                  // hand
  p.rect(1, 14 + oy, 4, 2, P.goldD);                  // trophy cup
  p.hline(1, 4, 14 + oy, P.goldL);
  p.px(2, 14 + oy, P.glint);                          // cup specular
  p.px(2, 16 + oy, P.gold); p.px(3, 16 + oy, P.gold); // trophy stem/base
  p.star4(2, 13 + oy, 1, P.holyL, P.glint);          // trophy gleam kira

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// ═════════════════════════════════════════════════════════════════════════════
// 2. GUIDE — herald/town-crier: emerald tabard over a tunic, a feathered cap,
//    holding a glowing unfurled scroll. Upright and welcoming.
//    Colour story: lively green + cream + ember feather.
// ═════════════════════════════════════════════════════════════════════════════
defineAnim('npc_guide', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;
  p.softShadow(8, 17, 5, 1.4, 0.4);

  // boots
  p.rect(5, 16, 3, 2, P.woodD);
  p.rect(8, 16, 3, 2, P.woodD);
  p.px(5, 16, P.wood); p.px(8, 16, P.wood);

  // tunic body
  p.rect(5, 9 + oy, 6, 7, P.greenD);
  // green tabard panel over the front (graded, with V-neck)
  p.gradV(6, 8 + oy, 4, 8, P.greenL, P.green);
  p.px(7, 8 + oy, P.greenD); p.px(8, 8 + oy, P.greenD);     // collar notch
  p.vline(9 + oy, 15, 8, lighten(P.greenL, 0.18));          // bright centre stripe
  p.hline(6, 9, 15, P.goldD);                               // hem trim
  p.px(6, 15, P.goldL); p.px(9, 15, P.goldL);
  // arms — left lifted forward holding a scroll
  p.rect(3, 10 + oy, 2, 3, P.greenD);
  p.rect(11, 10 + oy, 2, 3, P.greenD);
  p.px(11, 10 + oy, P.green);
  p.rect(2, 12 + oy, 2, 1, P.skin);                         // hand

  // unfurled scroll across the front — faint holy glow on the parchment
  p.glow(5, 13 + oy, 2.4, P.holyL, 0.28, 2);
  p.rect(2, 12 + oy, 6, 3, P.bone);
  p.hline(2, 7, 12 + oy, lighten(P.bone, 0.18));
  p.px(1, 12 + oy, P.woodL); p.px(1, 14 + oy, P.woodL);     // rolled left end
  p.px(8, 12 + oy, P.woodL); p.px(8, 14 + oy, P.woodL);     // rolled right end
  p.hline(3, 6, 13 + oy, P.gray2);                          // line of text
  p.hline(3, 5, 14 + oy, P.gray3);

  // head
  p.ellipse(8, 5 + oy, 3, 3, P.skinD);
  p.ellipse(8, 5 + oy, 2.4, 2.4, P.skin);
  p.px(6, 4 + oy, P.skin2);
  animEye(p, 6, 5 + oy, P.ink, null);
  animEye(p, 10, 5 + oy, P.ink, null);
  p.hline(7, 9, 7 + oy, P.skinD);                           // friendly smile
  p.px(8, 7 + oy, lighten(P.red, 0.1));
  p.px(6, 6 + oy, withAlpha(P.red, 0.2)); p.px(10, 6 + oy, withAlpha(P.red, 0.2)); // blush

  // feathered cap
  p.rect(5, 2 + oy, 6, 2, P.greenD);
  p.hline(5, 10, 2 + oy, P.green);
  p.px(6, 2 + oy, P.greenL);                                // cap sheen
  p.hline(4, 11, 4 + oy, P.greenD);                         // brim
  // ember feather sweeping up with a tip spark
  p.line(11, 2 + oy, 13, 0 + oy, P.ember);
  p.px(12, 1 + oy, P.emberL);
  p.px(13, 0 + oy, lighten(P.emberL, 0.3));
  p.star4(13, 0 + oy, 1, P.holyL, P.glint);

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// ═════════════════════════════════════════════════════════════════════════════
// 3. MERCHANT — travelling peddler: a big bulging backpack of wares, a wide
//    floppy hat, a coin pouch at the belt. Stooped under the load.
//    Colour story: earthy leather + a clutter of bright tradeable trinkets.
// ═════════════════════════════════════════════════════════════════════════════
defineAnim('npc_merchant', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;
  p.softShadow(8, 17, 5.5, 1.4, 0.42);

  // boots
  p.rect(5, 16, 3, 2, P.woodD);
  p.rect(9, 16, 3, 2, P.woodD);

  // big backpack rising behind the shoulders (drawn first = behind body)
  p.rect(10, 4 + oy, 5, 9, P.woodD);
  p.gradV(11, 5 + oy, 4, 7, P.woodL, P.wood);
  p.hline(11, 14, 5 + oy, lighten(P.woodL, 0.2));
  p.vline(5 + oy, 11, 12, darken(P.woodD, 0.12));           // pack centre seam
  // wares poking out of the pack
  p.rect(11, 3 + oy, 1, 2, P.green);                        // bottle neck
  p.px(11, 2 + oy, P.greenL); p.px(11, 2 + oy, P.shardL);
  p.rect(13, 3 + oy, 2, 2, P.red);                          // box
  p.px(13, 3 + oy, P.redL);
  p.px(12, 6 + oy, P.gold); p.px(12, 6 + oy, P.goldL);      // shiny coin
  p.px(14, 9 + oy, P.steelL);                               // metal glint
  p.px(13, 11 + oy, P.blueL);
  p.star4(11, 2 + oy, 1, P.shardL, P.glint);               // wares twinkle
  p.vline(5 + oy, 12, 10, P.leather);                       // pack strap to front

  // stooped body, leaning forward-left under the weight
  for (let y = 8 + oy; y <= 16; y++) {
    const t = (y - (8 + oy)) / (16 - (8 + oy));
    const hw = Math.round(2.2 + t * 2.4);
    p.hline(6 - hw + (y > 11 ? -1 : 0), 7 + hw, y, mix(P.leather, P.woodD, t * 0.4));
  }
  p.rect(4, 9 + oy, 5, 5, lighten(P.leather, 0.14));        // lit tunic front
  p.px(4, 9 + oy, lighten(P.leather, 0.28));
  p.hline(3, 8, 15, P.woodD);                               // belt
  p.px(6, 15, P.bronze);                                    // belt buckle
  // coin pouch at the belt
  p.ellipse(4, 14 + oy, 1.8, 1.8, P.goldD);
  p.ellipse(4, 14 + oy, 1, 1, P.gold);
  p.px(4, 13 + oy, P.goldL); p.px(3, 13 + oy, P.glint);
  // arms
  p.rect(2, 11 + oy, 2, 3, P.leather);
  p.px(2, 11 + oy, lighten(P.leather, 0.18));

  // head (pushed forward/down by the stoop)
  p.ellipse(6, 5 + oy, 2.6, 2.6, P.skinD);
  p.ellipse(6, 5 + oy, 2, 2, P.skin);
  p.px(5, 4 + oy, P.skin2);
  animEye(p, 5, 5 + oy, P.ink, null);
  animEye(p, 7, 5 + oy, P.ink, null);
  p.px(6, 6 + oy, withAlpha(P.red, 0.18));                  // cheery blush
  p.ellipse(6, 7 + oy, 1.6, 1, P.skinD);                    // little stubbly chin

  // wide floppy hat
  p.ellipse(6, 2 + oy, 5, 1.8, P.woodD);                    // broad brim
  p.hline(1, 11, 2 + oy, P.woodD);
  p.hline(2, 10, 2 + oy, darken(P.woodD, 0.06));
  p.ellipse(6, 1 + oy, 2.4, 1.6, P.wood);                   // crown
  p.px(6, 0 + oy, P.woodL); p.px(5, 0 + oy, lighten(P.woodL, 0.2));
  p.hline(2, 10, 3 + oy, lighten(P.woodD, 0.16));           // brim sheen

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// ═════════════════════════════════════════════════════════════════════════════
// 4. OLDVET — retired soldier: worn steel chest piece, an eyepatch over one eye,
//    grey stubble, leaning on a wooden cane. Battle-worn, asymmetric stance.
//    Colour story: cold weathered steel + a single fierce glowing eye.
// ═════════════════════════════════════════════════════════════════════════════
defineAnim('npc_oldvet', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;
  p.softShadow(8, 17, 5.5, 1.4, 0.42);

  // asymmetric legs: weight on the left, right leg braced out
  p.rect(4, 15, 3, 3, P.woodD);                             // planted left boot
  p.px(4, 15, P.wood);
  p.rect(9, 16, 3, 2, P.gray1);                             // braced right
  p.px(9, 16, P.gray2);
  // worn padded tunic under the armour
  p.rect(4, 9 + oy, 8, 7, P.woodD);
  p.rect(4, 9 + oy, 8, 1, P.wood);

  // steel chest piece (dented, asymmetric highlight) — graded steel
  p.gradV(5, 8 + oy, 6, 5, P.steel, P.steelD);
  p.px(6, 9 + oy, P.steelL); p.px(7, 9 + oy, P.steelL);     // shoulder shine
  p.px(5, 8 + oy, P.glint);                                 // top-left specular
  p.px(9, 11 + oy, darken(P.steelD, 0.25));                 // dent
  p.px(10, 11 + oy, darken(P.steelD, 0.12));
  p.hline(5, 10, 12 + oy, P.gray1);                         // bottom rim
  p.px(8, 10 + oy, P.bronze);                               // medal stud
  p.px(8, 10 + oy, P.goldL);

  // left arm gripping a tall cane on the figure's right side (screen left)
  p.rect(2, 10 + oy, 2, 3, P.steelD);
  p.px(2, 10 + oy, P.steel);
  p.rect(1, 12 + oy, 2, 1, P.skinD);                        // hand
  p.vline(8 + oy, 17, 1, P.wood);                           // cane shaft
  p.vline(10 + oy, 17, 0, P.woodD);                         // shaft side shade
  p.px(1, 8 + oy, P.woodL);                                 // cane top knob
  p.px(1, 8 + oy, lighten(P.woodL, 0.25));
  // other arm hanging
  p.rect(12, 10 + oy, 2, 4, P.woodD);
  p.px(12, 10 + oy, P.wood);

  // head, grey stubble
  p.ellipse(8, 4 + oy, 3, 3, P.skinD);
  p.ellipse(8, 4 + oy, 2.4, 2.4, P.skin);
  p.px(6, 3 + oy, P.skin2);
  p.hline(6, 10, 6 + oy, P.gray3);                          // stubble jaw
  p.px(7, 6 + oy, P.gray4); p.px(9, 6 + oy, P.gray4);
  p.ellipse(8, 1 + oy, 3, 1.6, P.gray3);                    // close grey hair
  p.hline(6, 10, 1 + oy, P.gray4);                          // hair sheen

  // good eye (left) — fierce cool glow; eyepatch over the right
  p.glow(6, 4 + oy, 1.5, P.neonL, 0.42, 3);
  p.px(6, 4 + oy, P.neon);
  p.px(6, 4 + oy, P.glint);
  p.rect(9, 3 + oy, 3, 2, P.ink2);                          // eyepatch
  p.px(9, 3 + oy, P.gray1);
  p.line(9, 3 + oy, 12, 2 + oy, P.gray2);                   // patch strap
  p.px(7, 2 + oy, withAlpha(P.red, 0.15));                  // weathered cheek

  p.rimLight(P.rimCool, 0.5);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// ═════════════════════════════════════════════════════════════════════════════
// 5. CHILD — a small kid: large head over a short body, a bright tunic, tousled
//    hair, holding a glowing tiny wooden toy. Feet around y15-17. Playful.
//    Colour story: cheerful sky-blue + warm wood toy + sparkly delight.
// ═════════════════════════════════════════════════════════════════════════════
defineAnim('npc_child', 16, 18, 2, (p, f) => {
  const oy = f === 1 ? -1 : 0;          // little hop/breathe
  const tunic = P.blueL, tunicD = P.blueD;
  p.softShadow(8, 17, 4, 1.2, 0.38);

  // little shoes
  p.rect(6, 16, 2, 2, P.woodD);
  p.rect(9, 16, 2, 2, P.woodD);
  p.px(6, 16, P.wood); p.px(9, 16, P.wood);
  // bare legs
  p.rect(6, 14 + oy, 2, 2, P.skinD);
  p.rect(9, 14 + oy, 2, 2, P.skinD);
  p.px(6, 14 + oy, P.skin); p.px(9, 14 + oy, P.skin);

  // short bright tunic — graded
  p.rect(5, 10 + oy, 7, 5, tunicD);
  p.gradV(6, 10 + oy, 5, 4, lighten(tunic, 0.1), tunic);
  p.hline(6, 10, 10 + oy, lighten(tunic, 0.3));
  p.px(8, 12 + oy, P.white);                                // little button
  p.px(7, 11 + oy, lighten(tunic, 0.35));                  // chest sheen
  // arms — right hand holds a toy up
  p.rect(4, 11 + oy, 1, 2, tunicD);
  p.rect(11, 10 + oy, 1, 2, tunicD);
  p.rect(11, 9 + oy, 1, 1, P.skin);                         // raised hand

  // tiny wooden toy (a little horse/block on a stick) — glowing & happy
  p.glow(12, 7 + oy, 1.8, P.emberL, 0.32, 2);
  p.rect(11, 7 + oy, 2, 2, P.wood);
  p.px(11, 7 + oy, P.woodL);
  p.px(13, 7 + oy, P.woodD);                                // ear/nub
  p.px(12, 7 + oy, P.glint);                                // toy gleam
  p.vline(9 + oy, 10 + oy, 11, P.woodD);                    // stick
  p.star4(13, 6 + oy, 1, P.holyL, P.glint);                // delight kira

  // big round head
  p.ellipse(8, 6 + oy, 3.2, 3.2, P.skinD);
  p.ellipse(8, 6 + oy, 2.6, 2.6, P.skin);
  p.px(6, 4 + oy, P.skin2);
  // tousled hair with sheen
  p.ellipse(8, 4 + oy, 3.2, 2, P.wood);
  p.px(5, 4 + oy, P.woodL); p.px(8, 3 + oy, lighten(P.woodL, 0.2)); p.px(11, 4 + oy, P.woodD);
  p.px(6, 3 + oy, P.wood); p.px(10, 3 + oy, P.wood);        // stray tufts
  p.px(7, 3 + oy, lighten(P.woodL, 0.15));                  // hair highlight
  // big glowing eyes + bright smile + blush
  animEye(p, 6, 6 + oy, P.blueD, P.blueL);
  animEye(p, 10, 6 + oy, P.blueD, P.blueL);
  p.hline(7, 9, 8 + oy, P.skinD);                           // smile
  p.px(8, 7 + oy, P.skin);
  p.px(5, 7 + oy, withAlpha(P.red, 0.28)); p.px(11, 7 + oy, withAlpha(P.red, 0.28)); // big blush

  p.rimLight(P.rim, 0.55);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });
