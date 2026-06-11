// heroes_r20 — R20: THE SIX FINAL HEROES (roster 21 → 27). Hand-written content
// file (like bosses_biome.js), NOT workflow gen/. Each hero gets a UNIQUE 16x18
// feet-anchored pixel body drawn inline (anime ruin-hunter style: glowing eyes,
// rim light, kira accents, walk-bob frames) — none silhouette-clones the 18
// archetypes in art/heroes.js or the 4 h3_* bodies.
//
//   h4_paladin      聖盾騎士 — tower-shield holy tank        (w_h4_judgment 審判戰錘)
//   h4_chronomancer 時詠術士 — clock-halo tempo sage         (w_h4_chronoblade 迴時刃)
//   h4_puppeteer    傀儡師   — string-cross marionette master (w_h4_marionette 提線傀儡)
//   h4_gravekeeper  守墓人   — lantern-scythe mourner         (w_h4_gravescythe 掘魂鐮)
//   h4_starcaller   星喚少女 — twin-tail meteor girl          (w_h4_starfall 星隕呼喚)
//   h4_bladedancer  劍舞者   — ribbon blade dancer            (w_h4_bladewaltz 劍刃圓舞)
//
// Passives only touch fields that exist in state.js makeBaseStats(); magnitudes
// sit at-or-under the g_*/h2_*/h3_* heroes (post-R16-nerf economy). Achievement
// unlocks use ONLY meetsCondition() patterns (reach_stage_N / kills_N / survive_N /
// bosses_N / endless_N) with stiff end-game numbers — these are the last unlocks.
import { Characters } from './registry.js';
import { registerHeroBody } from '../../art/core.js';
import { P, lighten, darken, mix, withAlpha } from '../../engine/palette.js';
import { defineAnim } from '../../engine/sprites.js';

// ---------- shared frame helpers (match art/heroes.js conventions) ----------
const bob = (f) => (f === 1 || f === 3) ? -1 : 0;
const stp = (f) => f === 1 ? 1 : f === 3 ? -1 : 0;
const flap = (f) => (f === 1 || f === 3) ? 1 : 0;
function groundShadow(p, oy) { p.softShadow(8, 17 + oy, 5, 1.4, 0.34); }
function glowEye(p, x, y, eye) {
  p.glow(x, y, 1.5, eye, 0.5, 3);
  p.px(x, y, lighten(eye, 0.4));
}
function rimFinish(p) { p.rimLight(P.rim, 0.5, -1, -1); }

// ---------- Art palettes (cloak, cloakD, cloakL, trim, eye, skin) ----------
const ART_paladin      = { cloak: P.gold,   cloakD: P.bronze,  cloakL: P.goldL,   trim: P.holy,    eye: P.holyL,  skin: P.skin };
const ART_chronomancer = { cloak: P.iceD,   cloakD: P.blueD,   cloakL: P.ice,     trim: P.gold,    eye: P.shardL, skin: P.skin };
const ART_puppeteer    = { cloak: P.purple, cloakD: P.purpleD, cloakL: P.purpleL, trim: P.magenta, eye: P.sakura, skin: P.skin };
const ART_gravekeeper  = { cloak: P.gray1,  cloakD: P.shadow,  cloakL: P.gray3,   trim: P.bone,    eye: P.emberL, skin: P.bone };
const ART_starcaller   = { cloak: P.astral, cloakD: P.purpleD, cloakL: P.astralL, trim: P.gold,    eye: P.shardL, skin: P.skin };
const ART_bladedancer  = { cloak: P.sakura, cloakD: P.redD,    cloakL: P.sakuraL, trim: P.steelL,  eye: P.magenta, skin: P.skin };

// ===========================================================================
// 1) PALADIN — a TALL TOWER SHIELD dominates the left side (no archetype has
//    one — knight carries a small round shield), great helm under a floating
//    holy halo ring, sun-cross tabard, warhammer on the right.
// ===========================================================================
function drawH4_paladin(p, f, a) {
  const oy = bob(f), s = stp(f);
  const cloak = a.cloak ?? P.gold, cloakD = a.cloakD ?? P.bronze, cloakL = a.cloakL ?? P.goldL;
  const trim = a.trim ?? P.holy, eye = a.eye ?? P.holyL;
  groundShadow(p, oy);

  // floating halo behind the helm
  p.glow(8, 3 + oy, 4, P.holy, 0.25, 3);
  p.ring(8, 3 + oy, 4, withAlpha(P.holy, 0.55));

  // boots
  p.rect(6, 16 + oy, 2, 2, darken(cloakD, 0.3));
  p.rect(10, 16 + oy, 2, 2, darken(cloakD, 0.3));
  if (s > 0) p.px(7, 17 + oy, P.ink2);
  if (s < 0) p.px(10, 17 + oy, P.ink2);

  // plate skirt + cuirass (shifted right; the shield owns the left)
  p.rect(6, 12 + oy, 6, 4, cloakD);
  p.rect(7, 12 + oy, 4, 3, cloak);
  p.rect(6, 8 + oy, 6, 4, cloakD);
  p.gradV(7, 8 + oy, 4, 3, cloakL, cloak);
  p.vline(8 + oy, 12 + oy, 9, trim);            // sun-cross tabard (vertical)
  p.hline(7, 11, 10 + oy, trim);                // sun-cross tabard (horizontal)
  p.px(9, 9 + oy, P.holyL);

  // right pauldron + hammer arm
  p.ellipse(12.5, 8.5 + oy, 2, 1.8, cloakL);
  p.px(13, 8 + oy, P.steelL);
  p.rect(12, 10 + oy, 2, 3, cloak);

  // great helm with a glowing visor band
  p.rect(6, 3 + oy, 5, 5, cloakD);
  p.rect(6, 3 + oy, 5, 1, cloakL);
  p.px(6, 4 + oy, P.steelL);
  p.rect(7, 5 + oy, 3, 1, P.ink2);
  glowEye(p, 7, 5 + oy, eye); glowEye(p, 9, 5 + oy, eye);
  p.px(8, 2 + oy, cloakL); p.px(8, 1 + oy, trim);   // crest stub reaching the halo

  // TOWER SHIELD — the signature silhouette (left flank, near full height)
  p.rect(1, 5 + oy, 4, 11, P.steelD);
  p.rect(1, 5 + oy, 4, 10, P.steel);
  p.gradV(1, 5 + oy, 4, 4, P.steelL, P.steel);
  p.vline(6 + oy, 13 + oy, 2, trim);            // shield cross (vertical)
  p.hline(1, 4, 9 + oy, trim);                  // shield cross (horizontal)
  p.px(2, 6 + oy, P.glint);
  p.glow(2, 9 + oy, 2, P.holy, 0.3, 3);
  p.px(1, 15 + oy, P.steelD); p.px(4, 15 + oy, P.steelD);   // bottom taper

  // warhammer raised on the right
  p.vline(6 + oy, 14 + oy, 14, P.wood);
  p.rect(12, 4 + oy, 3, 3, P.steel);
  p.rect(12, 4 + oy, 3, 1, P.steelL);
  p.px(12, 4 + oy, P.glint);
  p.glow(13, 5 + oy, 2.4, P.holy, 0.35, 3);
  rimFinish(p);
}

// ===========================================================================
// 2) CHRONOMANCER — a great CLOCK-FACE halo ring floats behind the whole body
//    (tick marks at 12/3/9), silver side-swept hair, high-collar long coat,
//    an HOURGLASS staff. Nothing like mage's pointed hat or voidmage's orb.
// ===========================================================================
function drawH4_chronomancer(p, f, a) {
  const oy = bob(f), s = stp(f);
  const cloak = a.cloak ?? P.iceD, cloakD = a.cloakD ?? P.blueD, cloakL = a.cloakL ?? P.ice;
  const trim = a.trim ?? P.gold, eye = a.eye ?? P.shardL, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  // clock-face halo behind the body (rotating tick follows the frame)
  p.ring(8, 8 + oy, 6, withAlpha(eye, 0.32));
  p.px(8, 2 + oy, withAlpha(trim, 0.85));       // 12 o'clock tick
  p.px(2, 8 + oy, withAlpha(trim, 0.7));        // 9 o'clock tick
  p.px(14, 8 + oy, withAlpha(trim, 0.7));       // 3 o'clock tick
  if (flap(f)) p.px(11, 4 + oy, withAlpha(eye, 0.8));   // sweeping second-hand spark

  // boots
  p.rect(5, 16 + oy, 2, 2, P.ink2);
  p.rect(9, 16 + oy, 2, 2, P.ink2);
  if (s > 0) p.px(6, 17 + oy, P.shadow);
  if (s < 0) p.px(9, 17 + oy, P.shadow);

  // long high-collar coat, gently flared
  const cTop = 9 + oy, cBot = 16 + oy;
  for (let y = cTop; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(2.6 + t * 1.2);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  for (let y = cTop + 1; y <= cBot - 1; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(1.8 + t * 0.8);
    p.hline(8 - hw, 7 + hw, y, mix(cloakL, cloak, t));
  }
  p.hline(5, 11, cBot, trim);                   // gilded hem
  p.vline(cTop + 1, cBot - 1, 8, cloakD);       // coat seam
  p.px(8, 11 + oy, trim); p.px(8, 13 + oy, trim);   // clasps
  p.hline(6, 10, 8 + oy, cloakL);               // high collar
  p.px(5, 8 + oy, cloakL); p.px(10, 8 + oy, cloakL);   // collar wings

  // face: silver side-swept hair + a gold monocle chain
  p.ellipse(8, 5 + oy, 2.4, 2.4, skin);
  glowEye(p, 7, 5 + oy, eye); glowEye(p, 9, 5 + oy, eye);
  p.px(10, 5 + oy, trim);                       // monocle rim
  p.px(10, 6 + oy, withAlpha(trim, 0.6));       // monocle chain
  p.rect(5, 2 + oy, 6, 2, P.steelL);            // silver hair top
  p.px(4, 3 + oy, P.steelL); p.px(5, 4 + oy, P.steelL);  // side sweep (left)
  p.px(11, 3 + oy, P.steel);
  p.px(5, 2 + oy, P.white);                     // hair sheen

  // hourglass staff on the right
  p.vline(6 + oy, 15 + oy, 13, P.steel);
  p.hline(12, 14, 1 + oy, trim);                // hourglass top bar
  p.hline(12, 14, 5 + oy, trim);                // hourglass bottom bar
  p.px(12, 2 + oy, trim); p.px(14, 2 + oy, trim);
  p.px(13, 3 + oy, P.gold);                     // sand pinch
  p.px(12, 4 + oy, trim); p.px(14, 4 + oy, trim);
  p.glow(13, 3 + oy, 2.4, eye, 0.45, 3);
  p.sparkle(14, 0 + oy, eye, 1);
  rimFinish(p);
}

// ===========================================================================
// 3) PUPPETEER — right arm thrust HIGH holding a wooden control cross, faint
//    strings dropping to a tiny marionette doll walking at their side. Slick
//    tailcoat, no hat. The side-doll makes the silhouette one-of-a-kind.
// ===========================================================================
function drawH4_puppeteer(p, f, a) {
  const oy = bob(f), s = stp(f), fl = flap(f);
  const cloak = a.cloak ?? P.purple, cloakD = a.cloakD ?? P.purpleD, cloakL = a.cloakL ?? P.purpleL;
  const trim = a.trim ?? P.magenta, eye = a.eye ?? P.sakura, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  // boots
  p.rect(4, 16 + oy, 2, 2, P.ink2);
  p.rect(8, 16 + oy, 2, 2, P.ink2);
  if (s > 0) p.px(5, 17 + oy, P.shadow);
  if (s < 0) p.px(8, 17 + oy, P.shadow);

  // slim tailcoat (body sits slightly LEFT — the doll walks on the right)
  p.rect(4, 9 + oy, 6, 7, cloakD);
  p.gradV(5, 9 + oy, 4, 6, cloakL, cloak);
  p.rect(5, 10 + oy, 4, 5, cloak);
  p.px(4, 15 + oy, cloakD); p.px(9, 15 + oy, cloakD);    // split coat tails
  p.px(3, 16 + oy, cloakD); p.px(10, 16 + oy, cloakD);
  p.vline(10 + oy, 14 + oy, 7, trim);           // magenta lapel line
  p.px(7, 10 + oy, lighten(trim, 0.3));         // cravat pin

  // head: slick combed-back hair + a glinting monocle
  p.ellipse(7, 6 + oy, 2.2, 2.2, skin);
  glowEye(p, 6, 6 + oy, eye); glowEye(p, 8, 6 + oy, eye);
  p.px(8, 6 + oy, P.glint);                     // monocle flash
  p.rect(5, 3 + oy, 5, 2, cloakD);              // slick hair
  p.px(4, 4 + oy, cloakD); p.px(10, 4 + oy, cloakD);
  p.px(5, 3 + oy, cloakL);                      // hair sheen
  p.px(10, 2 + oy, cloakL);                     // single stray curl

  // raised right arm + wooden CONTROL CROSS overhead
  p.rect(10, 7 + oy, 2, 3, cloak);              // raised arm
  p.px(11, 6 + oy, skin);                       // hand
  p.hline(9, 14, 2 + oy, P.wood);               // cross bar (horizontal)
  p.vline(1 + oy, 4 + oy, 12, P.wood);          // cross bar (vertical)
  p.px(12, 1 + oy, P.woodL);
  p.glow(12, 2 + oy, 2, trim, 0.3, 3);

  // puppet strings (faint) from the cross down to the doll
  p.vline(3 + oy, 11 + oy + fl, 11, withAlpha(P.white, 0.30));
  p.vline(3 + oy, 12 + oy + fl, 13, withAlpha(P.white, 0.30));
  p.vline(3 + oy, 10 + oy + fl, 14, withAlpha(P.white, 0.22));

  // tiny MARIONETTE doll strutting at the right (bobs opposite the master)
  const dy = fl;                                 // doll bob
  p.px(13, 12 + dy, P.bone);                     // doll head
  p.px(13, 11 + dy, trim);                       // tiny hat
  p.rect(12, 13 + dy, 3, 2, P.wood);             // doll body
  p.px(12, 15 + dy, P.woodD); p.px(14, 15 + dy, P.woodD);   // doll legs
  p.px(11, 13 + dy, P.woodD); p.px(15, 13 + dy, P.woodD);   // doll arms (jointed)
  p.px(13, 12 + dy, mix(P.bone, eye, 0.4));      // painted face glint
  p.sparkle(14, 9 + oy, eye, 1);
  rimFinish(p);
}

// ===========================================================================
// 4) GRAVEKEEPER — broad mourner's cloak, deep veiled hood with ember eyes, a
//    tall pole topped by a HANGING LANTERN whose blade sweeps LOW at the feet
//    (necromancer's scythe blade is at the TOP — this one reads inverted).
// ===========================================================================
function drawH4_gravekeeper(p, f, a) {
  const oy = bob(f), fl = flap(f);
  const cloak = a.cloak ?? P.gray1, cloakD = a.cloakD ?? P.shadow, cloakL = a.cloakL ?? P.gray3;
  const trim = a.trim ?? P.bone, eye = a.eye ?? P.emberL;
  groundShadow(p, oy);

  // broad heavy cloak — widest hem of any hero (mourner mass)
  const cTop = 8 + oy, cBot = 16 + oy;
  for (let y = cTop; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(2 + t * 3.4);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  for (let y = cTop + 1; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(1.2 + t * 2.4);
    p.hline(8 - hw, 7 + hw, y, mix(cloak, cloakD, t * 0.5));
  }
  for (let x = 3; x <= 12; x += 3) p.px(x, 16 + oy, cloakD);   // ragged hem bites
  p.px(5, 10 + oy, cloakL);                     // shoulder catch-light

  // grave-bell + bone charm on the chest cord
  p.hline(6, 9, 10 + oy, trim);
  p.px(7, 11 + oy, trim); p.px(7, 12 + oy, darken(trim, 0.25));   // hanging bell
  p.px(9, 11 + oy, withAlpha(trim, 0.7));

  // deep veiled hood — only the ember eyes show
  p.ellipse(8, 5 + oy, 3.2, 3.2, cloakD);
  p.ellipse(8, 5 + oy, 2.5, 2.5, cloak);
  p.px(6, 3 + oy, cloakL);
  p.rect(6, 5 + oy, 4, 2, P.ink2);              // veiled void face
  glowEye(p, 7, 5 + oy, eye); glowEye(p, 9, 5 + oy, eye);
  p.px(8, 7 + oy, withAlpha(trim, 0.5));        // veil stitch

  // pole arm: tall shaft on the right
  p.vline(2 + oy, 15 + oy, 13, P.woodD);
  p.px(13, 2 + oy, P.wood);

  // HANGING LANTERN swinging from the hook (sways with the walk)
  const lx = 11 - fl;
  p.px(12, 3 + oy, P.iron);                     // hook chain
  p.rect(lx - 1, 4 + oy, 3, 3, P.iron);         // lantern frame
  p.px(lx, 5 + oy, eye);                        // flame core
  p.glow(lx, 5 + oy, 3, P.ember, 0.5, 4);
  p.px(lx, 4 + oy, lighten(eye, 0.3));
  p.px(lx, 7 + oy, P.iron);                     // lantern base

  // scythe blade sweeping LOW along the ground
  p.line(13, 13 + oy, 10, 16 + oy, P.steelL);
  p.line(14, 13 + oy, 11, 16 + oy, withAlpha(eye, 0.45));   // soul-heat edge
  p.px(10, 16 + oy, P.glint);
  p.sparkle(4, 8 + oy, withAlpha(eye, 0.8), 1);  // drifting soul mote
  rimFinish(p);
}

// ===========================================================================
// 5) STARCALLER — a small girl: TWIN-TAILS that bounce on the walk, an ahoge
//    with a star kira, a short cape over a flared skirt, and a star-topped
//    wand. Petite proportions — head sits lower, body shorter than the rest.
// ===========================================================================
function drawH4_starcaller(p, f, a) {
  const oy = bob(f), s = stp(f), fl = flap(f);
  const cloak = a.cloak ?? P.astral, cloakD = a.cloakD ?? P.purpleD, cloakL = a.cloakL ?? P.astralL;
  const trim = a.trim ?? P.gold, eye = a.eye ?? P.shardL, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  // little boots
  p.rect(6, 16 + oy, 2, 2, cloakD);
  p.rect(9, 16 + oy, 2, 2, cloakD);
  if (s > 0) p.px(7, 17 + oy, P.ink2);
  if (s < 0) p.px(9, 17 + oy, P.ink2);
  p.px(7, 15 + oy, skin); p.px(9, 15 + oy, skin);   // bare knees

  // flared star-hem skirt (short — petite body)
  const sTop = 11 + oy, sBot = 14 + oy;
  for (let y = sTop; y <= sBot; y++) {
    const t = (y - sTop) / (sBot - sTop);
    const hw = Math.round(1.6 + t * 2.4);
    p.hline(8 - hw, 8 + hw, y, cloakD);
  }
  p.rect(7, sTop, 3, 2, cloak);
  p.px(6, sBot, trim); p.px(8, sBot, trim); p.px(10, sBot, trim);   // star-stud hem

  // short cape + bodice
  p.rect(6, 8 + oy, 5, 3, cloak);
  p.rect(6, 8 + oy, 5, 1, cloakL);              // cape collar
  p.px(8, 9 + oy, trim);                        // star brooch
  p.px(5, 9 + oy, cloakL); p.px(11, 9 + oy, cloakL);   // cape flares

  // head — big for the body (chibi read), bright eyes + blush
  p.ellipse(8, 5 + oy, 2.6, 2.6, skin);
  glowEye(p, 7, 5 + oy, eye); glowEye(p, 9, 5 + oy, eye);
  p.px(6, 6 + oy, mix(skin, P.red, 0.35)); p.px(10, 6 + oy, mix(skin, P.red, 0.35));
  p.rect(5, 2 + oy, 7, 2, cloakD);              // hair fringe
  p.px(5, 4 + oy, cloakD); p.px(11, 4 + oy, cloakD);
  p.px(6, 2 + oy, cloakL);                      // hair sheen

  // TWIN-TAILS — bounce opposite to the body bob
  p.vline(4 + oy, 9 + oy + fl, 3, cloakD);
  p.px(3, 10 + oy + fl, cloakL);                // left tail tip
  p.vline(4 + oy, 9 + oy - fl, 12, cloakD);
  p.px(12, 10 + oy - fl, cloakL);               // right tail tip
  // ahoge + star kira
  p.px(8, 1 + oy, cloakD);
  p.star4(8, 0 + oy, 1, eye, P.glint);

  // star wand (right) + falling-star sparkles
  p.vline(7 + oy, 14 + oy, 14, trim);
  p.star4(14, 5 + oy, 2, trim, P.glint);
  p.glow(14, 5 + oy, 2.6, eye, 0.45, 3);
  p.sparkle(2, 3 + oy, eye, 1);
  p.sparkle(13, 11 + oy, lighten(eye, 0.3), 1);
  rimFinish(p);
}

// ===========================================================================
// 6) BLADEDANCER — a dancer mid-spin: a curved blade ARCS OVER THE HEAD like a
//    crescent (rogue's daggers point down-out; nothing arcs overhead), a long
//    ponytail + ribbon sash streaming left, bare midriff, anklet shoes.
// ===========================================================================
function drawH4_bladedancer(p, f, a) {
  const oy = bob(f), s = stp(f), fl = flap(f);
  const cloak = a.cloak ?? P.sakura, cloakD = a.cloakD ?? P.redD, cloakL = a.cloakL ?? P.sakuraL;
  const trim = a.trim ?? P.steelL, eye = a.eye ?? P.magenta, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  // dancer's light shoes + bare legs
  p.px(6, 17 + oy, cloakD); p.px(10, 17 + oy, cloakD);
  p.vline(15 + oy, 16 + oy, 6, skin);
  p.vline(15 + oy, 16 + oy, 10, skin);
  if (s > 0) p.px(6, 16 + oy, darken(skin, 0.2));
  if (s < 0) p.px(10, 16 + oy, darken(skin, 0.2));
  p.px(6, 16 + oy, trim);                       // anklet glint

  // short slit dance skirt
  p.rect(5, 12 + oy, 7, 3, cloakD);
  p.rect(6, 12 + oy, 5, 2, cloak);
  p.px(11, 14 + oy, cloak);                     // skirt flick
  // bare midriff + chest wrap
  p.rect(6, 10 + oy, 5, 2, skin);
  p.rect(6, 8 + oy, 5, 2, cloak);
  p.hline(6, 10, 8 + oy, cloakL);
  p.px(8, 11 + oy, darken(skin, 0.15));         // navel shadow

  // arms — left trails low, right raised into the overhead arc
  p.rect(4, 9 + oy, 2, 3, skin);
  p.rect(11, 6 + oy, 2, 3, skin);
  p.px(12, 5 + oy, skin);                       // raised hand

  // head: keen eyes + long PONYTAIL streaming left
  p.ellipse(8, 5 + oy, 2.2, 2.2, skin);
  glowEye(p, 7, 5 + oy, eye); glowEye(p, 9, 5 + oy, eye);
  p.rect(6, 2 + oy, 5, 2, cloakD);              // hair
  p.px(5, 3 + oy, cloakD);
  p.px(6, 2 + oy, cloakL);
  p.line(5, 3 + oy, 2, 7 + oy + fl, cloakD);    // ponytail flow
  p.px(1, 8 + oy + fl, cloakL);                 // ponytail tip
  p.px(9, 1 + oy, trim);                        // hair ornament

  // ribbon sash streaming from the waist (both sides, alpha-soft)
  p.line(5, 12 + oy, 1, 10 + oy - fl, withAlpha(eye, 0.6));
  p.line(11, 13 + oy, 14, 15 + oy + fl, withAlpha(eye, 0.6));
  p.px(1, 10 + oy - fl, withAlpha(cloakL, 0.8));

  // crescent blade ARCING OVERHEAD (the signature) + hip blade
  p.line(3, 3 + oy, 8, 1 + oy, P.steelL);
  p.line(8, 1 + oy, 13, 3 + oy, P.steelL);
  p.line(4, 2 + oy, 8, 0 + oy, withAlpha(eye, 0.4));    // blade aura trail
  p.line(8, 0 + oy, 12, 2 + oy, withAlpha(eye, 0.4));
  p.px(8, 1 + oy, P.glint);
  p.star4(13, 3 + oy, 1, P.sakuraL, P.glint);   // petal kira off the edge
  p.line(12, 12 + oy, 14, 9 + oy, P.steelL);    // second blade at the hip
  p.px(14, 9 + oy, P.glint);
  rimFinish(p);
}

// ---------- Sprites (16x18, feet anchored at [8,17]) ----------
// (characters.js's eager bake loop already ran — this file loads later, so each
// char sprite is defined here, exactly like gen_heroes3.js does.)
defineAnim('char_h4_paladin',      16, 18, 4, (p, f) => { drawH4_paladin(p, f, ART_paladin);           p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h4_chronomancer', 16, 18, 4, (p, f) => { drawH4_chronomancer(p, f, ART_chronomancer); p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h4_puppeteer',    16, 18, 4, (p, f) => { drawH4_puppeteer(p, f, ART_puppeteer);       p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h4_gravekeeper',  16, 18, 4, (p, f) => { drawH4_gravekeeper(p, f, ART_gravekeeper);   p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h4_starcaller',   16, 18, 4, (p, f) => { drawH4_starcaller(p, f, ART_starcaller);     p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h4_bladedancer',  16, 18, 4, (p, f) => { drawH4_bladedancer(p, f, ART_bladedancer);   p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });

// ---------- Hero body registry (skins recolour the unique body) ----------
registerHeroBody('h4_paladin',      (p, f, a) => drawH4_paladin(p, f, a));
registerHeroBody('h4_chronomancer', (p, f, a) => drawH4_chronomancer(p, f, a));
registerHeroBody('h4_puppeteer',    (p, f, a) => drawH4_puppeteer(p, f, a));
registerHeroBody('h4_gravekeeper',  (p, f, a) => drawH4_gravekeeper(p, f, a));
registerHeroBody('h4_starcaller',   (p, f, a) => drawH4_starcaller(p, f, a));
registerHeroBody('h4_bladedancer',  (p, f, a) => drawH4_bladedancer(p, f, a));

// ---------- Characters ----------
const C = (o) => Characters.register(o);

// 1) PALADIN — anchor tank: real bulk + regen, paid in speed AND tempo.
//    Sits between guardian (+28HP+2def) and g_vanguard (+50HP+4def+regen).
C({
  id: 'h4_paladin', name: '聖盾騎士',
  desc: '聖壁不退：生命 +45、減傷 +4、回復 +0.3，但移速 -10%、射速 -5%。起始武器：審判戰錘。',
  sprite: 'char_h4_paladin', startWeapon: 'w_h4_judgment',
  art: ART_paladin,
  passive: (s) => {
    s.maxHp += 45;
    s.defense += 4;
    s.hpRegen += 0.3;
    s.speed *= 0.90;
    s.fireRateMult *= 0.95;
  },
  unlock: { type: 'gold', cost: 700 },
});

// 2) CHRONOMANCER — tempo glass cannon: the fastest cadence on the roster,
//    plus quicker dashes, but the thinnest plate. Playstyle shift, not power.
C({
  id: 'h4_chronomancer', name: '時詠術士',
  desc: '時流加速：射速 +18%、彈速 +12%、衝刺冷卻 -15%，但生命上限 -24。起始武器：迴時刃。',
  sprite: 'char_h4_chronomancer', startWeapon: 'w_h4_chronoblade',
  art: ART_chronomancer,
  passive: (s) => {
    s.fireRateMult *= 1.18;
    s.projSpeedMult *= 1.12;
    s.dashCd *= 0.85;
    s.maxHp -= 24;
  },
  unlock: { type: 'achievement', condition: 'reach_stage_12', hint: '抵達威脅 12 級解鎖。' },
});

// 3) PUPPETEER — quantity-over-quality: an extra projectile that seeks on its
//    own strings, but each hit is lighter. Mirrors g_warden's +1proj/-dmg trade.
C({
  id: 'h4_puppeteer', name: '傀儡師',
  desc: '千絲操偶：投射 +1、追蹤 +0.15、範圍 +10%，但傷害 -15%、生命 -10。起始武器：提線傀儡。',
  sprite: 'char_h4_puppeteer', startWeapon: 'w_h4_marionette',
  art: ART_puppeteer,
  passive: (s) => {
    s.projCountAdd += 1;
    s.homing += 0.15;
    s.area *= 1.10;
    s.damageMult *= 0.85;
    s.maxHp -= 10;
  },
  unlock: { type: 'achievement', condition: 'bosses_50', hint: '累計擊殺 50 名首領解鎖。' },
});

// 4) GRAVEKEEPER — attrition sustain: drink back what the grave takes. Stays
//    just under g_revenant's package (it trades speed where g_revenant didn't).
C({
  id: 'h4_gravekeeper', name: '守墓人',
  desc: '亡魂歸土：吸血 +5%、回復 +0.5、生命 +18、範圍 +6%，但移速 -7%。起始武器：掘魂鐮。',
  sprite: 'char_h4_gravekeeper', startWeapon: 'w_h4_gravescythe',
  art: ART_gravekeeper,
  passive: (s) => {
    s.lifesteal += 0.05;
    s.hpRegen += 0.5;
    s.maxHp += 18;
    s.area *= 1.06;
    s.speed *= 0.93;
  },
  unlock: { type: 'achievement', condition: 'kills_20000', hint: '累計擊殺 20000 解鎖。' },
});

// 5) STARCALLER — big slow skies: wide, heavy meteors on a lazy cadence.
//    Damage ceiling near g_arcanist but pays in fire rate instead of XP perks.
C({
  id: 'h4_starcaller', name: '星喚少女',
  desc: '隕星祈願：範圍 +25%、傷害 +15%，但射速 -15%、生命 -12。起始武器：星隕呼喚。',
  sprite: 'char_h4_starcaller', startWeapon: 'w_h4_starfall',
  art: ART_starcaller,
  passive: (s) => {
    s.area *= 1.25;
    s.damageMult *= 1.15;
    s.fireRateMult *= 0.85;
    s.maxHp -= 12;
  },
  unlock: { type: 'achievement', condition: 'endless_1800', hint: '無盡模式存活 30 分鐘解鎖。' },
});

// 6) BLADEDANCER — evasive crit skirmisher: fast feet, slippery, spiky crits,
//    paper HP. The dodge+crit split keeps each axis under ranger/g_ranger.
C({
  id: 'h4_bladedancer', name: '劍舞者',
  desc: '剎那劍華：移速 +12%、閃避 +10%、暴擊 +10%、暴傷 +0.2，但生命上限 -24。起始武器：劍刃圓舞。',
  sprite: 'char_h4_bladedancer', startWeapon: 'w_h4_bladewaltz',
  art: ART_bladedancer,
  passive: (s) => {
    s.speed *= 1.12;
    s.dodge += 0.10;
    s.critChance += 0.10;
    s.critMult += 0.2;
    s.maxHp -= 24;
  },
  unlock: { type: 'gold', cost: 900 },
});
