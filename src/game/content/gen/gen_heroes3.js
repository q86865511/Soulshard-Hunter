import { Enemies, Items, Equipment, Abilities, Talents, Facilities, Weapons, Characters } from '../registry.js';
import { registerHeroBody } from '../../../art/core.js';
import { P, lighten, darken, mix, withAlpha } from '../../../engine/palette.js';
import { dist, dist2, rng, clamp, TAU } from '../../../engine/math.js';
import { Projectile } from '../../projectile.js';
import { glowWorld, fillCircleWorld, drawSprite, lineWorld } from '../../../engine/renderer.js';
import { getSprite, defineSprite, defineAnim, Painter } from '../../../engine/sprites.js';
import { defineIcon, panel, sym } from '../../../art/icons.js';
import { drawSlime, drawBat, drawWisp, drawBrute, drawHunter } from '../../../art/core.js';
import { Sfx } from '../../../engine/audio.js';
import { BALANCE } from '../../balance.js';

// gen_heroes3 — 4 NEW playable heroes, each with a UNIQUE 16x18 feet-anchored
// pixel body drawn inline (NOT a recoloured hunter). All ids/sprites use the
// h3_ prefix. Passives are modest, trade-off driven (post-nerf balance).
//
// Archetypes:
//   spearmaiden  — tall spear + flowing skirt + circlet (reach/poise)
//   plague       — plague-doctor beak mask, wide-brim hat, satchel, cane
//   beastfang    — fur-pelt shoulders + hood + claw, hunched stance
//   dragoon      — winged/horned dragoon helm + pauldrons + lance

// ---------- Art palettes (cloak, cloakD, cloakL, trim, eye) ----------
const H3ART_spearmaiden = { cloak: P.blue,   cloakD: P.blueD,   cloakL: P.blueL,   trim: P.gold,    eye: P.iceD,   skin: P.skin };
const H3ART_plague      = { cloak: P.gray1,  cloakD: P.shadow,  cloakL: P.gray3,   trim: P.bone,    eye: P.toxic,  skin: P.bone };
const H3ART_beastfang   = { cloak: P.leather,cloakD: P.woodD,   cloakL: P.woodL,   trim: P.bone,    eye: P.emberL, skin: P.skin2 };
const H3ART_dragoon     = { cloak: P.steel,  cloakD: P.steelD,  cloakL: P.steelL,  trim: P.red,     eye: P.emberL, skin: P.skin };

// ===========================================================================
// 1) SPEAR-MAIDEN — slender, long spear held vertical on her right, a flared
//    skirt, a thin circlet with a gem. Distinct from the hunter's hood blob.
// ===========================================================================
function drawH3_spearmaiden(p, f, a) {
  // R29 A1 HAND-EDIT: silhouette recut - a high PONYTAIL streaming up-left and the
  // spear re-laid as a corner-to-corner DIAGONAL with the leaf blade breaking the
  // top-right corner (portrait: ponytailed lancer, spear shouldered diagonally).
  // Re-integrating gen_heroes3 from the workflow source WILL revert this.
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.blue, cloakD = a.cloakD ?? P.blueD, cloakL = a.cloakL ?? P.blueL;
  const trim = a.trim ?? P.gold, eye = a.eye ?? P.iceD, skin = a.skin ?? P.skin;
  p.softShadow(8, 17 + oy, 5, 1.4, 0.34);

  p.rect(5, 16 + oy, 2, 2, darken(cloakD, 0.25));
  p.rect(9, 16 + oy, 2, 2, darken(cloakD, 0.25));
  if (step > 0) p.px(6, 17 + oy, P.ink2);
  if (step < 0) p.px(9, 17 + oy, P.ink2);

  // flared skirt (wide at hem, narrow at waist)
  const sTop = 11 + oy, sBot = 16 + oy;
  for (let y = sTop; y <= sBot; y++) {
    const t = (y - sTop) / (sBot - sTop);
    const hw = Math.round(2 + t * 3);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  for (let y = sTop + 1; y <= sBot - 1; y++) {
    const t = (y - sTop) / (sBot - sTop);
    const hw = Math.round(1 + t * 2);
    p.hline(8 - hw, 7 + hw, y, cloak);
  }
  p.hline(3, 12, sBot, trim);
  p.px(7, sTop + 1, cloakL); p.px(8, sTop + 1, cloakL);

  // torso / bodice
  p.rect(6, 8 + oy, 5, 4, cloakD);
  p.rect(6, 8 + oy, 5, 3, cloak);
  p.vline(8 + oy, 11 + oy, 8, trim);
  p.px(6, 9 + oy, cloakL);

  // arms - left low on the butt of the shaft, right high on the grip
  p.rect(4, 11 + oy, 2, 3, skin);
  p.rect(11, 7 + oy, 2, 3, skin);
  p.px(11, 7 + oy, lighten(skin, 0.2));

  // head + circlet, set low so the ponytail owns the upper-left
  p.ellipse(8, 6 + oy, 2.6, 2.6, skin);
  p.px(7, 5 + oy, lighten(skin, 0.18));
  p.rect(6, 4 + oy, 5, 2, cloakD);
  p.hline(6, 10, 4 + oy, trim);
  p.px(7, 6 + oy, eye); p.px(9, 6 + oy, eye);

  // PONYTAIL - a thick tail whipping up and out to the top-left corner
  p.line(6, 5 + oy, 3, 2 + oy, cloakD); p.line(6, 6 + oy, 3, 3 + oy, cloakD);
  p.rect(1, 1 + oy, 3, 2, cloakD); p.px(1, 1 + oy, cloakL); p.px(2, 2 + oy, cloak);
  p.px(4, 4 + oy, cloakD);

  // SPEAR - a single corner-to-corner diagonal, leaf blade off the top-right
  p.line(3, 16 + oy, 12, 4 + oy, P.wood);
  p.line(4, 16 + oy, 13, 4 + oy, P.woodD);
  p.rect(12, 1 + oy, 3, 3, P.steel); p.px(14, 0 + oy, P.steelL);
  p.px(13, 1 + oy, P.steelL); p.px(12, 4 + oy, trim);
  p.px(2, 16 + oy, P.woodD);

  p.shadeBottom(0.2, 12);
  p.rimLight(P.rim, 0.4);
}

// ===========================================================================
// 2) PLAGUE-DOCTOR — wide-brim hat, long beaked mask, buttoned long coat,
//    a satchel on the hip and a short cane. Unmistakable silhouette.
// ===========================================================================
// R28 HAND-EDIT (W2-E, ART-01): body rebuilt to the ART_SPEC scale ladder —
// re-integrating gen_heroes3 from the workflow source WILL revert this. Changes:
// full-canvas-width brim, heavier coat + shoulder mass, a longer 2 px beak with a
// 2-step bone read, 2 px goggle lenses with dark rims, and a glowing plague VIAL
// held in the right hand so the class symbol lives in the silhouette.
function drawH3_plague(p, f, a) {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.gray1, cloakD = a.cloakD ?? P.shadow, cloakL = a.cloakL ?? P.gray3;
  const trim = a.trim ?? P.bone, eye = a.eye ?? P.toxic, beak = P.bone;
  const deep = mix(cloakD, P.ink, 0.35);
  const beakD = darken(beak, 0.26), beakM = darken(beak, 0.12);
  // the plague palette is monochrome grey — pull the CLOTH down a step so the bone
  // beak, the brass goggles and the green vial are the only bright notes.
  const coatD = mix(cloakD, cloak, 0.4), coat = cloak, coatL = mix(cloak, cloakL, 0.5);
  p.softShadow(8, 17 + oy, 5, 1.4, 0.34);      // ground contact (ART_SPEC §1)

  // boots — wide stance
  p.rect(3, 16 + oy, 4, 2, P.ink2);
  p.rect(9, 16 + oy, 4, 2, P.ink2);
  p.hline(3, 6, 16 + oy, mix(P.ink2, cloakL, 0.35));
  p.hline(9, 12, 16 + oy, mix(P.ink2, cloakL, 0.35));
  if (step > 0) p.hline(3, 6, 17 + oy, P.shadow);
  if (step < 0) p.hline(9, 12, 17 + oy, P.shadow);

  // long coat — straight, ankle length, flaring to the full canvas width
  const cTop = 8 + oy, cBot = 16 + oy;
  for (let y = cTop; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(4 + t * 2.5);
    p.hline(8 - hw, 7 + hw, y, coatD);
  }
  for (let y = cTop + 1; y <= cBot - 1; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(3 + t * 1.6);
    p.hline(8 - hw, 7 + hw, y, mix(coatL, coat, t));
  }
  p.hline(1, 14, 16 + oy, deep);              // hem under-shade
  p.vline(cTop + 1, cBot, 8, coatD);          // coat seam
  p.vline(cTop + 1, cBot - 2, 5, coatL);      // top-left lit lapel
  p.px(8, 10 + oy, trim); p.px(8, 12 + oy, trim); p.px(8, 14 + oy, trim); // buttons

  // shoulders / arms — the coat's mass, not sticks
  p.rect(1, 8 + oy, 4, 5, coatD); p.rect(11, 8 + oy, 4, 5, coatD);
  p.hline(1, 4, 8 + oy, coatL); p.hline(11, 14, 8 + oy, mix(coatL, coat, 0.5));
  p.hline(1, 4, 12 + oy, deep); p.hline(11, 14, 12 + oy, deep);

  // satchel on the left hip
  p.rect(0, 11 + oy, 4, 4, P.leather);
  p.hline(0, 3, 11 + oy, darken(P.leather, 0.25));
  p.hline(0, 3, 14 + oy, darken(P.leather, 0.35));
  p.px(1, 13 + oy, trim);                      // buckle

  // plague VIAL raised in the right hand — the class symbol, in silhouette
  p.rect(12, 12 + oy, 3, 4, mix(P.steelD, cloakD, 0.4));   // gloved hand + flask base
  p.glow(13, 13 + oy, 3, eye, 0.55, 4);
  p.rect(13, 13 + oy, 2, 3, eye);
  p.px(13, 13 + oy, mix(eye, P.white, 0.6)); p.px(14, 15 + oy, darken(eye, 0.35));
  p.rect(13, 11 + oy, 2, 1, P.bone);           // cork stopper
  p.px(12, 10 + oy, withAlpha(eye, 0.7));      // escaping vapour

  // neck / collar (dark, so the mask never fuses with the coat)
  p.rect(5, 8 + oy, 6, 2, deep);

  // head: mask shell kept a value step DOWN from the beak so the beak reads
  const shell = mix(cloak, cloakL, 0.35), shellL = mix(cloakL, P.white, 0.1);
  p.ellipse(8, 6 + oy, 3.4, 2.8, shell);
  p.hline(5, 10, 4 + oy, shellL);                              // lit crown (top-left light)
  p.hline(5, 10, 8 + oy, mix(shell, cloakD, 0.5));             // 2nd step: shaded jaw line

  // round goggle lenses — 2 px glass in a dark rim
  p.rect(4, 5 + oy, 3, 3, P.steelD); p.rect(9, 5 + oy, 3, 3, P.steelD);
  p.rect(5, 6 + oy, 2, 2, darken(eye, 0.35)); p.rect(9, 6 + oy, 2, 2, darken(eye, 0.35));
  p.glow(5, 6 + oy, 1.8, eye, 0.5, 3); p.glow(10, 6 + oy, 1.8, eye, 0.5, 3);
  p.px(5, 6 + oy, eye); p.px(10, 6 + oy, eye);                 // 1 px eye position
  p.px(5, 6 + oy, P.glint);                                    // catch-light (top-left)

  // the BEAK — a bright bone wedge driven down across the dark collar; 2 px wide
  // with a 2-step bone read and a hooked tip, unmistakable at game zoom
  p.rect(7, 7 + oy, 2, 5, beak);
  p.px(7, 7 + oy, lighten(beak, 0.24));                        // top-left highlight
  p.px(8, 8 + oy, beakM); p.px(8, 9 + oy, beakM); p.px(8, 10 + oy, beakM); // right shade step
  p.px(8, 11 + oy, beakD);
  p.px(7, 12 + oy, beakD);                                     // hooked tip

  // wide-brim hat — near-full canvas width, drooping at the tips
  p.hline(1, 14, 3 + oy, coatD);
  p.hline(2, 13, 2 + oy, mix(coatD, coat, 0.5));
  p.hline(4, 11, 4 + oy, deep);                                // brim under-shade
  p.px(0, 4 + oy, coatD); p.px(15, 4 + oy, coatD);             // drooping tips
  p.px(1, 4 + oy, deep); p.px(14, 4 + oy, deep);
  p.rect(5, 0 + oy, 6, 3, coatD);                              // tall crown
  p.hline(5, 10, 0 + oy, mix(coatD, coatL, 0.6));
  p.vline(0 + oy, 2 + oy, 5, coat);                            // crown lit edge (top-left)
  p.hline(4, 11, 3 + oy, mix(trim, coatD, 0.35));              // hat band

  // cane in the left hand
  p.rect(0, 6 + oy, 2, 6, P.woodD);
  p.vline(6 + oy, 11 + oy, 0, mix(P.woodD, P.woodL, 0.5));
  p.rect(0, 5 + oy, 2, 1, trim);                               // cane knob

  p.shadeBottom(0.2, 12);
  p.rimLight(P.rim, 0.34, -1, -1);   // gentler than the archetype default: flat brims
                                     // otherwise read as a lit shelf across the head

}

// ===========================================================================
// 3) BEAST-FANG — a hunched beastmaster: shaggy fur pelt over the shoulders,
//    a fanged hood, one clawed hand raised. Broad, low silhouette.
// ===========================================================================
function drawH3_beastfang(p, f, a) {
  // R29 A1 HAND-EDIT: silhouette recut - a beast-MAN: two short triangular ears with
  // a 4-column notch between them and a short snout past the right cheek, over a
  // hunched fur-mantled torso (portrait: wolf-headed warrior in plate).
  // Re-integrating gen_heroes3 from the workflow source WILL revert this.
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.leather, cloakD = a.cloakD ?? P.woodD, cloakL = a.cloakL ?? P.woodL;
  const trim = a.trim ?? P.bone, eye = a.eye ?? P.emberL, skin = a.skin ?? P.skin2;
  const fur = mix(cloak, P.bone, 0.25), furD = darken(cloakD, 0.1);
  p.softShadow(8, 17 + oy, 5, 1.4, 0.34);

  p.rect(3, 16 + oy, 3, 2, furD);
  p.rect(10, 16 + oy, 3, 2, furD);
  if (step > 0) p.px(4, 17 + oy, P.ink2);
  if (step < 0) p.px(11, 17 + oy, P.ink2);

  p.rect(4, 13 + oy, 8, 3, cloakD);
  p.rect(6, 13 + oy, 4, 3, cloak);
  p.hline(5, 10, 15 + oy, trim);
  p.px(6, 15 + oy, P.bone); p.px(9, 15 + oy, P.bone);

  // hunched bare chest under a shaggy fur mantle
  p.rect(5, 9 + oy, 6, 4, skin);
  p.rect(5, 9 + oy, 6, 1, lighten(skin, 0.15));
  p.px(6, 11 + oy, darken(skin, 0.2)); p.px(9, 11 + oy, darken(skin, 0.2));
  p.rect(4, 9 + oy, 1, 4, furD); p.rect(11, 9 + oy, 1, 4, furD);    // fur falls over the flanks
  p.hline(2, 13, 8 + oy, furD); p.hline(3, 12, 7 + oy, fur);
  p.px(3, 9 + oy, furD); p.px(12, 9 + oy, furD);
  p.px(4, 7 + oy, fur); p.px(11, 7 + oy, fur);
  p.rect(2, 10 + oy, 2, 4, skin); p.px(2, 10 + oy, lighten(skin, 0.2));   // left arm
  p.rect(12, 10 + oy, 2, 3, skin);                                       // right arm
  p.px(14, 12 + oy, P.bone); p.px(14, 13 + oy, P.bone);                  // claws

  // WOLF head - small skull, short snout to the right, ears breaking the top edge
  p.ellipse(7, 4 + oy, 2.2, 2, cloakD);
  p.ellipse(7, 4 + oy, 1.7, 1.5, cloak);
  p.rect(9, 4 + oy, 3, 2, cloakD); p.rect(9, 4 + oy, 2, 1, cloak);   // snout
  p.px(11, 5 + oy, P.ink2); p.px(10, 4 + oy, cloakL);                // nose + bridge light
  p.px(10, 6 + oy, P.bone); p.px(9, 6 + oy, P.bone);                 // fangs
  p.px(6, 4 + oy, eye); p.px(8, 4 + oy, eye);
  p.glow(6, 4 + oy, 1.4, eye, 0.45, 3); p.glow(8, 4 + oy, 1.4, eye, 0.45, 3);
  p.hline(6, 9, 6 + oy, darken(cloakD, 0.4));                        // neck shadow
  // EARS - short solid triangles, 4 empty columns between them
  p.vline(1 + oy, 3 + oy, 4, cloakD); p.vline(2 + oy, 3 + oy, 5, cloakD); p.px(4, 1 + oy, cloakL);
  p.vline(1 + oy, 3 + oy, 11, cloakD); p.vline(2 + oy, 3 + oy, 10, cloakD); p.px(11, 1 + oy, cloak);
  p.px(5, 3 + oy, mix(cloak, P.red, 0.35)); p.px(10, 3 + oy, mix(cloak, P.red, 0.35));

  p.shadeBottom(0.2, 12);
  p.rimLight(P.rim, 0.4);
}

// ===========================================================================
// 4) DRAGOON — heavy plate: a horned/winged dragoon helm with a crest, big
//    angular pauldrons, and a couched lance. Knightly, top-heavy silhouette.
// ===========================================================================
function drawH3_dragoon(p, f, a) {
  // R29 A1 HAND-EDIT: silhouette recut - the WIDEST shoulders in the roster (both
  // pauldrons run out to the canvas edge) under swept dragon horns plus a centre
  // crest, giving a three-point top (portrait: horned dragoon helm, spiked plate,
  // couched lance). Also adds the ART_SPEC softShadow/shadeBottom/rimLight it
  // never had. Re-integrating gen_heroes3 from the workflow source reverts this.
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.steel, cloakD = a.cloakD ?? P.steelD, cloakL = a.cloakL ?? P.steelL;
  const trim = a.trim ?? P.red, eye = a.eye ?? P.emberL;
  p.softShadow(8, 17 + oy, 5, 1.4, 0.34);

  p.rect(5, 16 + oy, 2, 2, cloakD);
  p.rect(9, 16 + oy, 2, 2, cloakD);
  if (step > 0) p.px(6, 17 + oy, P.ink2);
  if (step < 0) p.px(9, 17 + oy, P.ink2);

  // tasset skirt of plate
  const tTop = 12 + oy, tBot = 16 + oy;
  for (let y = tTop; y <= tBot; y++) p.hline(5, 10, y, cloakD);
  p.rect(6, tTop, 4, tBot - tTop + 1, cloak);
  p.hline(4, 11, tBot, mix(cloakD, P.white, 0.1));

  // narrow cuirass - the waist is pinched so the pauldrons read as overhangs
  p.rect(6, 8 + oy, 4, 5, cloakD);
  p.rect(6, 8 + oy, 4, 4, cloak);
  p.rect(7, 8 + oy, 2, 1, cloakL);
  p.vline(9 + oy, 12 + oy, 8, mix(cloak, P.white, 0.15));
  p.px(8, 10 + oy, trim);

  // HUGE angular pauldrons running out to both canvas edges
  p.rect(0, 7 + oy, 5, 4, cloakD); p.rect(11, 7 + oy, 5, 4, cloakD);
  p.rect(1, 7 + oy, 3, 2, cloak);  p.rect(12, 7 + oy, 3, 2, cloak);
  p.px(0, 7 + oy, cloakL); p.px(15, 7 + oy, mix(cloak, P.white, 0.2));
  p.hline(0, 4, 10 + oy, darken(cloakD, 0.3)); p.hline(11, 15, 10 + oy, darken(cloakD, 0.3));
  p.px(2, 11 + oy, trim); p.px(13, 11 + oy, trim);                   // spike studs

  // dragoon HELM sunk between the pauldrons + tall centre crest
  p.rect(6, 3 + oy, 4, 4, cloakD);
  p.rect(6, 4 + oy, 4, 2, cloak);
  p.rect(6, 5 + oy, 4, 1, P.ink2);
  p.px(7, 5 + oy, eye); p.px(8, 5 + oy, eye);
  p.vline(0 + oy, 3 + oy, 8, trim); p.px(8, 0 + oy, lighten(trim, 0.35));
  // swept dragon horns - out to x1 / x14 at the second row
  p.line(6, 4 + oy, 1, 2 + oy, cloakL); p.line(10, 4 + oy, 14, 2 + oy, cloakL);
  p.px(1, 2 + oy, P.white); p.px(14, 2 + oy, P.white);

  // couched LANCE along the right flank
  p.line(11, 15 + oy, 14, 8 + oy, P.woodL);
  p.rect(13, 5 + oy, 2, 3, P.steel); p.px(14, 4 + oy, P.steelL);
  p.px(12, 12 + oy, trim);

  p.shadeBottom(0.2, 12);
  p.rimLight(P.rim, 0.4);
}

// ---------- Sprites (16x18, feet anchored at [8,17]) ----------
defineAnim('char_h3_spearmaiden', 16, 18, 4, (p, f) => { drawH3_spearmaiden(p, f, H3ART_spearmaiden); p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h3_plague',      16, 18, 4, (p, f) => { drawH3_plague(p, f, H3ART_plague);           p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h3_beastfang',   16, 18, 4, (p, f) => { drawH3_beastfang(p, f, H3ART_beastfang);     p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h3_dragoon',     16, 18, 4, (p, f) => { drawH3_dragoon(p, f, H3ART_dragoon);         p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });

// ---------- Hero body registry (so skins recolour the unique body) ----------
registerHeroBody('h3_spearmaiden', (p, f, a) => drawH3_spearmaiden(p, f, a));
registerHeroBody('h3_plague',      (p, f, a) => drawH3_plague(p, f, a));
registerHeroBody('h3_beastfang',   (p, f, a) => drawH3_beastfang(p, f, a));
registerHeroBody('h3_dragoon',     (p, f, a) => drawH3_dragoon(p, f, a));

// ---------- Characters ----------
const C = (o) => Characters.register(o);

// 1) Spear-Maiden — poised zoner: extra pierce + reach (area) and a touch of
//    crit, paid for with a slightly slower cadence. Pairs with the soul-whip.
C({
  id: 'h3_spearmaiden', name: '魂矛巫女',
  desc: '穿透 +1、範圍 +8%、暴擊 +4%，但射速 -6%。起始武器：魂鞭。',
  sprite: 'char_h3_spearmaiden', startWeapon: 'w_whip',
  art: H3ART_spearmaiden,
  passive: (s) => {
    s.pierceAdd += 1;
    s.area *= 1.08;
    s.critChance += 0.04;
    s.fireRateMult *= 0.94;
  },
  unlock: { type: 'gold', cost: 320 },
});

// 2) Plague-Doctor — attrition caster: stronger, wider lingering damage and
//    extra pickup pull, but frailer. Pairs with the searing aura domain.
C({
  id: 'h3_plague', name: '瘟疫醫師',
  desc: '傷害 +10%、範圍 +10%、拾取 +20%，但生命上限 -14。起始武器：灼蝕光環。',
  sprite: 'char_h3_plague', startWeapon: 'w_aura',
  art: H3ART_plague,
  passive: (s) => {
    s.damageMult *= 1.10;
    s.area *= 1.10;
    s.pickupRange += 5;
    s.maxHp -= 14;
  },
  unlock: { type: 'gold', cost: 360 },
});

// 3) Beast-Fang — savage bruiser: harder hits + bite-back lifesteal and stronger
//    knockback, traded for thinner skin and slower shots. Orbiting claws fit the
//    melee feel. Unlocked by lifetime kills.
C({
  id: 'h3_beastfang', name: '獸牙馴者',
  desc: '傷害 +14%、吸血 +3%、擊退 +20%，但減傷 -1、射速 -6%。起始武器：環衛刃。',
  sprite: 'char_h3_beastfang', startWeapon: 'w_orbit',
  art: H3ART_beastfang,
  passive: (s) => {
    s.damageMult *= 1.14;
    s.lifesteal += 0.03;
    s.knockbackMult *= 1.20;
    s.defense -= 1;
    s.fireRateMult *= 0.94;
  },
  unlock: { type: 'achievement', condition: 'kills_3000', hint: '累計擊殺 3000 解鎖。' },
});

// 4) Dragoon — armored vanguard: tanky (HP + armor) with a couched charge, but
//    heavy and slow on foot. Pairs with the shockwave nova. Unlocked by surviving
//    a long single run.
C({
  id: 'h3_dragoon', name: '龍騎先鋒',
  desc: '生命 +26、減傷 +2，但移速 -10%、射速 -6%。起始武器：震爆波。',
  sprite: 'char_h3_dragoon', startWeapon: 'w_nova',
  art: H3ART_dragoon,
  passive: (s) => {
    s.maxHp += 26;
    s.defense += 2;
    s.speed *= 0.90;
    s.fireRateMult *= 0.94;
  },
  unlock: { type: 'achievement', condition: 'survive_480', hint: '單局存活 480 秒解鎖。' },
});
