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
  // R29 A1: silhouette recut - the warhammer HEAD now sits as a solid block above
  // the great helm (portrait: hammer gripped upright, both hands) and the tower
  // shield keeps a rounded top / tapered foot so it never reads like the knight's
  // square slab. The canvas-wide halo ring is gone - outline() traced it into a disc.
  const oy = bob(f), s = stp(f);
  const cloak = a.cloak ?? P.gold, cloakD = a.cloakD ?? P.bronze, cloakL = a.cloakL ?? P.goldL;
  const trim = a.trim ?? P.holy, eye = a.eye ?? P.holyL;
  groundShadow(p, oy);

  p.rect(6, 16 + oy, 2, 2, darken(cloakD, 0.3));
  p.rect(10, 16 + oy, 2, 2, darken(cloakD, 0.3));
  if (s > 0) p.px(7, 17 + oy, P.ink2);
  if (s < 0) p.px(10, 17 + oy, P.ink2);

  // plate skirt + cuirass (shifted right; the shield owns the left)
  p.rect(6, 12 + oy, 6, 4, cloakD);
  p.rect(7, 12 + oy, 4, 3, cloak);
  p.rect(6, 8 + oy, 6, 4, cloakD);
  p.gradV(7, 8 + oy, 4, 3, cloakL, cloak);
  p.vline(8 + oy, 12 + oy, 9, trim);
  p.hline(7, 11, 10 + oy, trim);
  p.px(9, 9 + oy, P.holyL);

  // ROUNDED pauldrons - the widest soft shoulder line of the roster
  p.ellipse(12.5, 8.5 + oy, 2.4, 2, cloakL); p.px(13, 8 + oy, P.steelL);
  p.rect(12, 10 + oy, 2, 3, cloak);

  // great helm, flat topped - the hammer block does the talking above it
  p.rect(6, 4 + oy, 5, 4, cloakD);
  p.rect(6, 4 + oy, 5, 1, cloakL);
  p.px(6, 5 + oy, P.steelL);
  p.rect(7, 6 + oy, 3, 1, P.ink2);
  glowEye(p, 7, 6 + oy, eye); glowEye(p, 9, 6 + oy, eye);

  // WARHAMMER - a solid head block standing above the helm on a centred haft
  p.rect(4, 0 + oy, 9, 3, P.steel);
  p.rect(4, 0 + oy, 9, 1, P.steelL); p.px(4, 0 + oy, P.glint);
  p.hline(4, 12, 2 + oy, darken(P.steel, 0.35));
  p.glow(8, 1 + oy, 2.2, P.holy, 0.3, 3);

  // TOWER SHIELD - rounded crown, tapered foot (vs. the knight's hard square)
  p.hline(2, 4, 5 + oy, P.steelD);
  p.rect(1, 6 + oy, 4, 9, P.steelD);
  p.rect(1, 6 + oy, 3, 8, P.steel);
  p.gradV(1, 6 + oy, 3, 4, P.steelL, P.steel);
  p.vline(7 + oy, 13 + oy, 2, trim);
  p.hline(1, 4, 9 + oy, trim);
  p.px(2, 6 + oy, P.glint);
  p.hline(2, 4, 15 + oy, P.steelD); p.px(3, 16 + oy, P.steelD);      // tapered point
  rimFinish(p);
}

// ===========================================================================
// 2) CHRONOMANCER — a great CLOCK-FACE halo ring floats behind the whole body
//    (tick marks at 12/3/9), silver side-swept hair, high-collar long coat,
//    an HOURGLASS staff. Nothing like mage's pointed hat or voidmage's orb.
// ===========================================================================
function drawH4_chronomancer(p, f, a) {
  // R29 A1: silhouette recut - the great clock ring is gone (outline() traced it
  // into a full-canvas disc); the HOURGLASS is now a hard bow-tie held clear of the
  // body on the right edge, and the coat is shifted left to keep a gap column open.
  // Portrait: hooded time-sage cradling a large hourglass.
  const oy = bob(f), s = stp(f);
  const cloak = a.cloak ?? P.iceD, cloakD = a.cloakD ?? P.blueD, cloakL = a.cloakL ?? P.ice;
  const trim = a.trim ?? P.gold, eye = a.eye ?? P.shardL, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  p.rect(4, 16 + oy, 2, 2, P.ink2);
  p.rect(8, 16 + oy, 2, 2, P.ink2);
  if (s > 0) p.px(5, 17 + oy, P.shadow);
  if (s < 0) p.px(8, 17 + oy, P.shadow);

  // long high-collar coat, body centred one column LEFT of the canvas midline
  const cTop = 9 + oy, cBot = 16 + oy;
  for (let y = cTop; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(2.6 + t * 1.2);
    p.hline(7 - hw, 6 + hw, y, cloakD);
  }
  for (let y = cTop + 1; y <= cBot - 1; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(1.8 + t * 0.8);
    p.hline(7 - hw, 6 + hw, y, mix(cloakL, cloak, t));
  }
  p.hline(4, 10, cBot, trim);
  p.vline(cTop + 1, cBot - 1, 7, cloakD);
  p.px(7, 11 + oy, trim); p.px(7, 13 + oy, trim);
  p.hline(5, 9, 8 + oy, cloakL);
  p.px(4, 8 + oy, cloakL); p.px(9, 8 + oy, cloakL);

  // deep peaked hood (no bare hair) - a single point above the face
  p.ellipse(7, 5 + oy, 2.6, 2.6, cloakD);
  p.line(4, 7 + oy, 7, 1 + oy, cloak); p.line(10, 7 + oy, 7, 1 + oy, cloak);
  p.px(7, 1 + oy, cloakL);
  p.rect(5, 5 + oy, 4, 2, P.ink2);
  p.px(6, 4 + oy, lighten(skin, 0.18));
  glowEye(p, 6, 5 + oy, eye); glowEye(p, 8, 5 + oy, eye);

  // HOURGLASS held out on the right edge - wide, pinched, wide again
  p.hline(13, 15, 5 + oy, trim);
  p.hline(13, 15, 6 + oy, P.steelL);
  p.px(14, 7 + oy, P.gold); p.px(14, 8 + oy, P.gold);                // sand pinch
  p.hline(13, 15, 9 + oy, P.steelL);
  p.hline(13, 15, 10 + oy, trim);
  p.px(13, 5 + oy, P.glint); p.px(13, 10 + oy, darken(trim, 0.3));
  p.px(12, 8 + oy, P.steel);                                        // wrist / grip
  p.glow(14, 8 + oy, 1.8, eye, 0.4, 3);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
}

// ===========================================================================
// 3) PUPPETEER — right arm thrust HIGH holding a wooden control cross, faint
//    strings dropping to a tiny marionette doll walking at their side. Slick
//    tailcoat, no hat. The side-doll makes the silhouette one-of-a-kind.
// ===========================================================================
function drawH4_puppeteer(p, f, a) {
  // R29 A1: silhouette recut - a two-lobed JESTER cap drooping to both top corners,
  // and the marionette pushed far enough right that outline() cannot fuse it to the
  // master. Portrait: masked harlequin in a horned cap with a doll on strings.
  const oy = bob(f), s = stp(f), fl = flap(f);
  const cloak = a.cloak ?? P.purple, cloakD = a.cloakD ?? P.purpleD, cloakL = a.cloakL ?? P.purpleL;
  const trim = a.trim ?? P.magenta, eye = a.eye ?? P.sakura, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  p.rect(3, 16 + oy, 2, 2, P.ink2);
  p.rect(7, 16 + oy, 2, 2, P.ink2);
  if (s > 0) p.px(4, 17 + oy, P.shadow);
  if (s < 0) p.px(7, 17 + oy, P.shadow);

  // slim tailcoat, pushed LEFT so the doll gets clear canvas
  p.rect(3, 9 + oy, 6, 7, cloakD);
  p.gradV(4, 9 + oy, 4, 6, cloakL, cloak);
  p.rect(4, 10 + oy, 4, 5, cloak);
  p.px(3, 15 + oy, cloakD); p.px(8, 15 + oy, cloakD);
  p.px(2, 16 + oy, cloakD); p.px(9, 16 + oy, cloakD);
  p.vline(10 + oy, 14 + oy, 6, trim);
  p.px(6, 10 + oy, lighten(trim, 0.3));

  // masked face
  p.ellipse(6, 6 + oy, 2.2, 2.2, P.bone);
  p.px(5, 5 + oy, P.white);
  glowEye(p, 5, 6 + oy, eye); glowEye(p, 7, 6 + oy, eye);
  p.px(6, 8 + oy, mix(P.bone, trim, 0.5));                          // painted smile
  p.hline(4, 8, 9 + oy, P.bone);                                    // ruff collar

  // JESTER CAP - two lobes drooping out to the top corners, bells on the tips
  p.hline(4, 8, 4 + oy, cloakD); p.hline(4, 8, 3 + oy, cloak);
  p.line(4, 3 + oy, 1, 1 + oy, cloakD); p.line(8, 3 + oy, 11, 1 + oy, cloak);
  p.px(0, 2 + oy, trim); p.px(1, 1 + oy, cloakL);
  p.px(12, 2 + oy, trim); p.px(11, 1 + oy, cloakL);
  p.px(0, 1 + oy, P.glint);

  // control cross + strings running to the doll
  p.rect(10, 6 + oy, 2, 1, P.wood); p.px(11, 5 + oy, skin);
  p.vline(7 + oy, 11 + oy + fl, 13, withAlpha(P.white, 0.55));
  p.vline(7 + oy, 12 + oy + fl, 15, withAlpha(P.white, 0.45));

  // MARIONETTE doll - its own little silhouette on the right edge
  const dy = fl;
  p.px(14, 11 + dy, trim);
  p.rect(13, 12 + dy, 3, 2, P.bone); p.px(13, 12 + dy, P.white);
  p.rect(13, 14 + dy, 3, 2, P.wood);
  p.px(13, 16 + dy, P.woodD); p.px(15, 16 + dy, P.woodD);
  p.px(12, 14 + dy, P.woodD);
  p.px(14, 12 + dy, mix(P.bone, eye, 0.5));
  p.shadeBottom(0.2, 12);
  rimFinish(p);
}

// ===========================================================================
// 4) GRAVEKEEPER — broad mourner's cloak, deep veiled hood with ember eyes, a
//    tall pole topped by a HANGING LANTERN whose blade sweeps LOW at the feet
//    (necromancer's scythe blade is at the TOP — this one reads inverted).
// ===========================================================================
function drawH4_gravekeeper(p, f, a) {
  // R29 A1: silhouette recut - a SHOVEL blade planted in the top-left corner on a
  // diagonal shaft, with the lantern hung small at the right hip. Portrait: hooded
  // mourner, shovel over one shoulder, green lantern in the other hand. The low
  // scythe sweep is gone (it fused with the ground shadow bar and read as nothing).
  const oy = bob(f), fl = flap(f);
  const cloak = a.cloak ?? P.gray1, cloakD = a.cloakD ?? P.shadow, cloakL = a.cloakL ?? P.gray3;
  const trim = a.trim ?? P.bone, eye = a.eye ?? P.emberL;
  groundShadow(p, oy);

  // broad mourner cloak
  const cTop = 8 + oy, cBot = 16 + oy;
  for (let y = cTop; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(2 + t * 3);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  for (let y = cTop + 1; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(1.2 + t * 2.2);
    p.hline(8 - hw, 7 + hw, y, mix(cloak, cloakD, t * 0.5));
  }
  for (let x = 3; x <= 12; x += 3) p.px(x, 16 + oy, cloakD);
  p.px(5, 10 + oy, cloakL);
  p.hline(6, 9, 10 + oy, trim);
  p.px(7, 11 + oy, trim); p.px(7, 12 + oy, darken(trim, 0.25));

  // deep veiled hood
  p.ellipse(8, 5 + oy, 3, 3, cloakD);
  p.ellipse(8, 5 + oy, 2.4, 2.4, cloak);
  p.px(6, 3 + oy, cloakL);
  p.rect(6, 5 + oy, 4, 2, P.ink2);
  glowEye(p, 7, 5 + oy, eye); glowEye(p, 9, 5 + oy, eye);

  // SHOVEL - blade block in the top-left corner, shaft raking down across the body
  p.line(3, 3 + oy, 9, 12 + oy, P.woodD);
  p.line(4, 3 + oy, 10, 12 + oy, P.wood);
  p.rect(0, 0 + oy, 4, 4, P.iron);
  p.rect(0, 0 + oy, 3, 3, P.steel); p.px(0, 0 + oy, P.steelL);
  p.hline(0, 3, 3 + oy, darken(P.iron, 0.3));
  p.px(3, 4 + oy, P.wood);

  // LANTERN hung small off the right hip (swings with the walk)
  const lx = 13 - fl;
  p.px(lx, 8 + oy, P.iron);
  p.rect(lx - 1, 9 + oy, 3, 3, P.iron);
  p.px(lx, 10 + oy, eye); p.px(lx, 9 + oy, lighten(eye, 0.3));
  p.glow(lx, 10 + oy, 2.2, P.ember, 0.4, 3);
  p.px(lx, 12 + oy, P.iron);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
}

// ===========================================================================
// 5) STARCALLER — a small girl: TWIN-TAILS that bounce on the walk, an ahoge
//    with a star kira, a short cape over a flared skirt, and a star-topped
//    wand. Petite proportions — head sits lower, body shorter than the rest.
// ===========================================================================
function drawH4_starcaller(p, f, a) {
  // R29 A1: silhouette recut - a solid four-point STAR BURST occupying the top-right
  // corner on a full-height wand, over a petite body. Portrait: star-mage with an
  // armillary-topped staff. (The warden owns the top-LEFT diamond, so this goes right.)
  const oy = bob(f), s = stp(f), fl = flap(f);
  const cloak = a.cloak ?? P.astral, cloakD = a.cloakD ?? P.purpleD, cloakL = a.cloakL ?? P.astralL;
  const trim = a.trim ?? P.gold, eye = a.eye ?? P.shardL, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  p.rect(5, 16 + oy, 2, 2, cloakD);
  p.rect(8, 16 + oy, 2, 2, cloakD);
  if (s > 0) p.px(6, 17 + oy, P.ink2);
  if (s < 0) p.px(8, 17 + oy, P.ink2);
  p.px(6, 15 + oy, skin); p.px(8, 15 + oy, skin);

  // short flared skirt - petite, so the body reads small under the star
  const sTop = 11 + oy, sBot = 14 + oy;
  for (let y = sTop; y <= sBot; y++) {
    const t = (y - sTop) / (sBot - sTop);
    const hw = Math.round(1.6 + t * 2.2);
    p.hline(7 - hw, 7 + hw, y, cloakD);
  }
  p.rect(6, sTop, 3, 2, cloak);
  p.px(5, sBot, trim); p.px(7, sBot, trim); p.px(9, sBot, trim);

  p.rect(5, 8 + oy, 5, 3, cloak);
  p.rect(5, 8 + oy, 5, 1, cloakL);
  p.px(7, 9 + oy, trim);
  p.px(4, 9 + oy, cloakL); p.px(10, 9 + oy, cloakL);

  p.ellipse(7, 5 + oy, 2.6, 2.6, skin);
  glowEye(p, 6, 5 + oy, eye); glowEye(p, 8, 5 + oy, eye);
  p.px(5, 6 + oy, mix(skin, P.red, 0.35)); p.px(9, 6 + oy, mix(skin, P.red, 0.35));
  p.rect(4, 2 + oy, 5, 2, cloakD);
  p.px(4, 4 + oy, cloakD); p.px(9, 4 + oy, cloakD);
  p.px(5, 2 + oy, cloakL);
  // twin-tails bounce opposite the body bob
  p.vline(4 + oy, 9 + oy + fl, 2, cloakD); p.px(2, 10 + oy + fl, cloakL);
  p.vline(4 + oy, 9 + oy - fl, 10, cloakD); p.px(10, 10 + oy - fl, cloakL);

  // WAND + solid STAR BURST filling the top-right corner
  p.vline(4 + oy, 14 + oy, 13, trim);
  p.hline(12, 15, 2 + oy, trim);
  p.vline(0 + oy, 4 + oy, 14, trim);
  p.px(13, 1 + oy, trim); p.px(15, 1 + oy, trim);
  p.px(13, 3 + oy, trim); p.px(15, 3 + oy, trim);
  p.px(14, 2 + oy, P.white); p.px(14, 0 + oy, P.white); p.px(15, 2 + oy, P.white);
  p.glow(14, 2 + oy, 1.8, eye, 0.4, 3);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
}

// ===========================================================================
// 6) BLADEDANCER — a dancer mid-spin: a curved blade ARCS OVER THE HEAD like a
//    crescent (rogue's daggers point down-out; nothing arcs overhead), a long
//    ponytail + ribbon sash streaming left, bare midriff, anklet shoes.
// ===========================================================================
function drawH4_bladedancer(p, f, a) {
  // R29 A1: silhouette recut - twin sabres CROSSED into an X above the head, tips
  // breaking all four upper corners, over a pinched dancer's waist. Portrait: veiled
  // dancer with two crossed curved blades. (The warlock's horns leave the centre
  // empty; this X fills it - that is what separates the two.)
  const oy = bob(f), s = stp(f), fl = flap(f);
  const cloak = a.cloak ?? P.sakura, cloakD = a.cloakD ?? P.redD, cloakL = a.cloakL ?? P.sakuraL;
  const trim = a.trim ?? P.steelL, eye = a.eye ?? P.magenta, skin = a.skin ?? P.skin;
  groundShadow(p, oy);

  p.px(6, 17 + oy, cloakD); p.px(10, 17 + oy, cloakD);
  p.vline(15 + oy, 16 + oy, 6, skin);
  p.vline(15 + oy, 16 + oy, 10, skin);
  if (s > 0) p.px(6, 16 + oy, darken(skin, 0.2));
  if (s < 0) p.px(10, 16 + oy, darken(skin, 0.2));
  p.px(6, 16 + oy, trim);

  // flared dance skirt over a pinched waist - the widest hem in the roster
  p.hline(3, 12, 12 + oy, cloakD); p.hline(2, 13, 13 + oy, cloakD); p.hline(1, 14, 14 + oy, cloakD);
  p.hline(4, 11, 12 + oy, cloak); p.hline(3, 12, 13 + oy, cloak);
  p.hline(2, 13, 14 + oy, mix(cloak, cloakL, 0.4));
  p.px(1, 14 + oy, cloakL); p.px(14, 14 + oy, cloakD);
  p.rect(6, 10 + oy, 5, 2, skin);
  p.rect(6, 8 + oy, 5, 2, cloak);
  p.hline(6, 10, 8 + oy, cloakL);
  p.px(8, 11 + oy, darken(skin, 0.15));

  p.rect(4, 9 + oy, 2, 3, skin);
  p.rect(11, 9 + oy, 2, 3, skin);

  p.ellipse(8, 6 + oy, 2.2, 2.2, skin);
  glowEye(p, 7, 6 + oy, eye); glowEye(p, 9, 6 + oy, eye);
  p.rect(6, 4 + oy, 5, 2, cloakD);
  p.px(6, 4 + oy, cloakL);
  p.px(9, 3 + oy, trim);

  // ribbon sash trailing from the waist
  p.line(4, 13 + oy, 1, 11 + oy - fl, withAlpha(eye, 0.6));
  p.line(12, 13 + oy, 15, 15 + oy + fl, withAlpha(eye, 0.6));

  // TWIN SABRES crossed into an X above the head - tips at all four upper corners
  p.line(12, 9 + oy, 15, 4 + oy, P.steelL); p.line(13, 10 + oy, 15, 6 + oy, darken(trim, 0.4));
  p.px(15, 4 + oy, P.glint);                                         // sabre swept off the right hip
  p.rect(11, 9 + oy, 2, 2, cloakD);                                  // hilt in the hand
  p.line(5, 4 + oy, 1, 1 + oy, cloakD); p.line(5, 5 + oy, 2, 2 + oy, cloakD);
  p.px(0, 1 + oy, cloakL); p.px(1, 2 + oy, cloakL);                  // scarf streaming top-left
  p.shadeBottom(0.2, 12);
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
