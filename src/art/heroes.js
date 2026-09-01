// 原#17 — UNIQUE hero silhouettes. Each archetype is a 16x18 (feet-anchored) body
// with its own distinct shape — helmet vs hat vs hood vs mask, sword vs staff vs bow
// vs gun vs scythe — so heroes read as genuinely different characters, not palette
// swaps. The character's art palette { cloak, cloakD, cloakL, trim, eye, skin } still
// tints everything, so two heroes sharing an archetype still differ in colour.
//
// Registered against character ids via registerHeroBody; characters.js / gen hero
// files call drawHeroBody(p, frame, id, art) and fall back to the hooded hunter.
//
// ── ENHANCED EDITION (art_v2) ───────────────────────────────────────────────
// Every archetype is re-cut as a COOL anime hero while staying a strict drop-in:
// the ids, the exported HERO_MAP, and the trailing registration loop are byte
// identical. Each body now commits to a top-left light source (core + shadow +
// light + a specular glint per material), GLOWING eyes with a white catch-light,
// hair / plume / blade sheen, energy auras on weapons, a soft ground contact
// shadow, and a post-process rim light before the caller's outline. The original
// 'withAlphaSafe' stub is kept for back-compat but now simply forwards to the real
// withAlpha, so the soft auras actually glow.
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';
import { registerHeroBody, HERO_ART } from './core.js';

const bob = (f) => (f === 1 || f === 3) ? -1 : 0;
const step = (f) => f === 1 ? 1 : f === 3 ? -1 : 0;
// shared legs + boots with a walk step (now with a top-edge sheen + step shade)
function legs(p, f, oy, boot) {
  const s = step(f);
  const bL = lighten(boot, 0.22), bD = darken(boot, 0.25);
  p.rect(4, 16 + oy, 3, 2, boot); p.rect(9, 16 + oy, 3, 2, boot);
  p.px(4, 16 + oy, bL); p.px(9, 16 + oy, bL);               // boot top-light
  if (s > 0) p.rect(4, 17 + oy, 3, 1, bD);
  if (s < 0) p.rect(9, 17 + oy, 3, 1, bD);
}
const pal = (a) => ({
  cloak: a.cloak ?? P.shard, cD: a.cloakD ?? P.shardD, cL: a.cloakL ?? P.shardL,
  trim: a.trim ?? P.gold, eye: a.eye ?? P.emberL, skin: a.skin ?? P.skin,
});

// soft contact shadow so every hero sits on the ground (call first, behind body)
function groundShadow(p, oy) { p.softShadow(8, 17 + oy, 5, 1.4, 0.34); }
// glowing anime eye: a coloured glow halo + bright core + a tiny white catch-light
function glowEye(p, x, y, eye) {
  p.glow(x, y, 1.6, eye, 0.5, 3);
  p.px(x, y, lighten(eye, 0.45));
  p.px(x, y - 0.001, P.glint); // catch-light dot
}
// finish pass shared by every hero: rim light the lit edges, then the caller adds outline
function rimFinish(p) { p.rimLight(P.rim, 0.5, -1, -1); }

// ── KNIGHT — full plate, bucket helm with a glowing visor slit, sword + shield ──
registerHeroBody('knight', (p, f, a) => {
  // R29 A1: silhouette recut - a TALL narrow great-helm topped by a 2 px crest block
  // rides a wide armoured body, with a round shield boss punching out to the left.
  // Portrait: crested visor helm, point-down sword, shield. The profile is a tower
  // on a slab; no other hero has a head that narrow over shoulders that wide.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.2));
  // plate torso with a vertical sheen
  p.rect(3, 9 + oy, 10, 7, c.cD);
  p.gradV(4, 9 + oy, 8, 6, c.cL, c.cloak);
  p.rect(4, 10 + oy, 8, 4, c.cloak);
  p.rect(5, 11 + oy, 6, 3, mix(c.cL, c.cloak, 0.55));               // lit breastplate
  p.hline(4, 11, 10 + oy, c.cL); p.rect(6, 12 + oy, 4, 4, c.trim);   // tabard
  p.hline(3, 12, 14 + oy, darken(c.cD, 0.35)); p.hline(4, 11, 15 + oy, darken(c.cD, 0.5)); // faulds
  p.px(6, 12 + oy, lighten(c.trim, 0.3));
  p.ellipse(3.5, 9.8 + oy, 2, 1.8, c.cloak); p.ellipse(12.5, 9.8 + oy, 2, 1.8, c.cloak); // pauldrons
  p.px(3, 9 + oy, c.cL); p.px(12, 9 + oy, mix(c.cL, c.cloak, 0.5));
  p.hline(2, 5, 11 + oy, darken(c.cD, 0.35)); p.hline(11, 14, 11 + oy, darken(c.cD, 0.35));
  // TALL bucket helm - runs from the crest block down onto the gorget, no floating gap
  p.rect(6, 3 + oy, 5, 6, c.cD); p.hline(7, 9, 2 + oy, c.cD);       // tapered crown
  p.rect(6, 3 + oy, 5, 6, c.cloak); p.hline(6, 10, 3 + oy, c.cL);
  p.hline(7, 9, 2 + oy, mix(c.cL, c.cloak, 0.5)); p.px(6, 3 + oy, P.steelL);
  p.vline(3 + oy, 8 + oy, 10, darken(c.cD, 0.25));                  // helm shadow side
  p.rect(6, 5 + oy, 5, 2, P.ink2);
  p.glow(8, 5 + oy, 1.8, c.eye, 0.45, 3); p.rect(7, 5 + oy, 3, 1, c.eye); p.px(7, 5 + oy, P.glint);
  p.rect(6, 7 + oy, 5, 2, c.cloak); p.px(8, 8 + oy, P.ink2); p.px(9, 8 + oy, P.ink2); // breath slots
  p.hline(5, 11, 9 + oy, darken(c.cD, 0.45));                       // gorget shadow under the helm
  p.rect(7, 0 + oy, 2, 2, c.trim); p.px(7, 0 + oy, P.glint);        // 2 px crest block
  // ROUND shield boss on the left arm
  p.ellipse(1.6, 12 + oy, 2.2, 2.8, darken(c.cD, 0.35));
  p.ellipse(1.6, 12 + oy, 1.5, 2, P.steel);
  p.ring(1.6, 12 + oy, 1.8, P.steelL);
  p.px(2, 12 + oy, c.trim); p.px(1, 10 + oy, P.glint);
  // point-down sword resting on the belt line
  p.vline(13 + oy, 15 + oy, 8, P.steelL); p.px(8, 15 + oy, P.steel);
  p.hline(6, 10, 12 + oy, c.trim);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── PALADIN — crowned great-helm, cape, warhammer, holy sheen ──
registerHeroBody('paladin', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.2));
  p.glow(8, 9 + oy, 6, P.holy, 0.18, 2);                             // soft divine halo
  p.rect(2, 10 + oy, 4, 6, c.cD); p.vline(10 + oy, 15 + oy, 2, darken(c.cD, 0.2)); // cape behind
  p.rect(4, 9 + oy, 8, 7, c.cD);
  p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak);
  p.hline(5, 10, 11 + oy, c.trim); p.px(8, 11 + oy, P.holyL);
  p.rect(5, 3 + oy, 6, 6, c.cloak); p.rect(5, 3 + oy, 6, 1, c.cL);   // great helm
  p.px(5, 3 + oy, P.steelL);
  p.rect(7, 5 + oy, 2, 2, P.ink2); glowEye(p, 7, 5 + oy, c.eye); glowEye(p, 8, 5 + oy, c.eye);
  p.hline(5, 10, 2 + oy, c.trim); p.px(6, 1 + oy, c.trim); p.px(8, 0 + oy, P.holyL); p.px(10, 1 + oy, c.trim); // crown
  p.star4(8, 0 + oy, 2, P.holy, P.glint);                           // divine crown sparkle
  p.vline(8 + oy, 14 + oy, 13, P.wood); p.rect(11, 8 + oy, 4, 3, P.steelL); // hammer
  p.px(11, 8 + oy, P.glint); p.glow(13, 9 + oy, 2.4, P.holy, 0.3, 3); // holy hammer glow
  rimFinish(p);
});

// ── MAGE — long flared robe, tall wide-brim pointed hat, orb staff ──
registerHeroBody('mage', (p, f, a) => {
  // R29 A1: silhouette recut - the widest brim in the roster (full canvas width at
  // y5) under a tall narrow cone, plus a jutting beard. Portrait: long-bearded
  // wizard, tall wide-brim hat, raised orb.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  for (let y = 10 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (10 + oy)) * 0.75; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let y = 11 + oy; y <= 16 + oy; y++) { const hw = 1 + (y - (11 + oy)) * 0.65; p.hline(8 - hw, 8 + hw, y, mix(c.cL, c.cloak, (y - (11 + oy)) / 5)); }
  p.hline(3, 12, 16 + oy, c.trim);
  p.ellipse(8, 8 + oy, 2.2, 2, c.skin); p.px(6, 7 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 8 + oy, c.eye); glowEye(p, 9, 8 + oy, c.eye);
  // long BEARD - a narrow wedge hanging below the face into the robe
  p.rect(6, 9 + oy, 5, 2, mix(P.bone, c.cL, 0.35));
  p.rect(7, 11 + oy, 3, 2, P.bone); p.px(8, 13 + oy, P.bone); p.px(7, 9 + oy, P.white);
  // TALL CONE + FULL-WIDTH BRIM (the signature)
  p.hline(0, 15, 5 + oy, c.cD); p.hline(2, 13, 6 + oy, darken(c.cD, 0.25));
  p.hline(1, 14, 4 + oy, c.cloak);
  for (let y = 4 + oy; y >= 0 + oy; y--) { const t = (4 + oy - y); const hw = Math.max(0, 2.6 - t * 0.7); p.hline(8 - hw, 8 + hw, y, mix(c.cloak, c.cD, t * 0.18)); }
  p.vline(0 + oy, 4 + oy, 7, c.cL);
  p.hline(4, 12, 4 + oy, c.trim); p.px(8, 0 + oy, P.glint);
  p.px(0, 5 + oy, c.cL); p.px(15, 5 + oy, darken(c.cD, 0.3));
  p.vline(9 + oy, 15 + oy, 12, P.wood);
  p.ellipse(12, 8 + oy, 1.6, 1.6, c.eye); p.px(11, 7 + oy, P.glint); p.px(12, 8 + oy, P.white);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── PYROMANCER — robe, horned flame-crown, fiery wand ──
registerHeroBody('pyromancer', (p, f, a) => {
  // R29 A1: silhouette recut - three SEPARATE flame tongues (x3 / x8 / x13) with
  // real gaps between them, so the top rows read as a comb, not a dome. Portrait:
  // bare head crowned by spiked fire, flame carried in the off hand.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  for (let y = 10 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (10 + oy)) * 0.6; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let y = 11 + oy; y <= 16 + oy; y++) { const hw = 1.5 + (y - (11 + oy)) * 0.5; p.hline(8 - hw, 8 + hw, y, mix(c.cL, c.cloak, (y - (11 + oy)) / 5)); }
  p.ellipse(8, 8 + oy, 2.4, 2.2, c.skin); p.px(6, 7 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 8 + oy, c.eye); glowEye(p, 9, 8 + oy, c.eye);
  p.hline(6, 10, 6 + oy, darken(c.cD, 0.15));                       // brow band
  // THREE flame tongues - 1 px stems with empty columns between
  p.vline(2 + oy, 6 + oy, 3, P.ember); p.px(3, 1 + oy, P.emberL); p.px(3, 0 + oy, P.white);
  p.vline(0 + oy, 6 + oy, 8, P.emberL); p.px(8, 0 + oy, P.white);
  p.vline(2 + oy, 6 + oy, 13, P.ember); p.px(13, 1 + oy, P.emberL); p.px(13, 0 + oy, P.white);
  p.px(4, 4 + oy, P.ember); p.px(12, 4 + oy, P.ember);
  p.glow(8, 4 + oy, 2.4, P.ember, 0.28, 3);
  // flame carried low in the off hand (a round bump on the robe edge)
  p.ellipse(3, 12 + oy, 1.6, 1.6, P.ember); p.px(3, 11 + oy, P.emberL); p.px(3, 12 + oy, P.white);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── WARLOCK — tattered robe, twin horns, sickly aura ──
registerHeroBody('warlock', (p, f, a) => {
  // R29 A1: silhouette recut - a pointed cowl carrying two THICK stepped horns that
  // sweep to the top corners with a deep empty V between them, plus a ragged hem.
  // (Earlier pass used 1 px diagonals: at 16 px those read as insect antennae.)
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, c.cD);
  for (let y = 8 + oy; y <= 15 + oy; y++) { const hw = 2 + (y - (8 + oy)) * 0.5; p.hline(8 - hw, 8 + hw, y, c.cD); }
  p.hline(4, 12, 15 + oy, darken(c.cD, 0.35));                      // hem under-shade
  for (let x = 3; x <= 13; x += 2) p.px(x, 16 + oy, c.cD);          // ragged hem teeth
  p.gradV(5, 9 + oy, 6, 4, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 3, c.cloak); p.px(8, 11 + oy, c.trim);
  // pointed cowl (not a round skull - that read as a bug head)
  p.ellipse(8, 6 + oy, 2.8, 2.6, c.cD);
  p.line(5, 8 + oy, 8, 3 + oy, c.cloak); p.line(11, 8 + oy, 8, 3 + oy, c.cD);
  p.rect(6, 6 + oy, 5, 2, P.ink2);
  p.rect(6, 6 + oy, 5, 1, c.eye); p.px(6, 6 + oy, P.glint);         // single visor slit
  p.glow(8, 6 + oy, 2.2, c.eye, 0.4, 3);
  // RAM HORNS curling down at ear height - the head reads WIDER than the shoulders
  const hn = mix(P.bone, c.cD, 0.4), hnD = darken(hn, 0.35);
  p.hline(3, 5, 3 + oy, hn); p.hline(1, 5, 4 + oy, hn); p.hline(0, 3, 5 + oy, hn);
  p.hline(0, 2, 6 + oy, hnD); p.hline(1, 2, 7 + oy, hnD);
  p.hline(10, 12, 3 + oy, hnD); p.hline(10, 14, 4 + oy, hnD); p.hline(12, 15, 5 + oy, hnD);
  p.hline(13, 15, 6 + oy, darken(hn, 0.5)); p.hline(13, 14, 7 + oy, darken(hn, 0.5));
  p.px(3, 3 + oy, lighten(hn, 0.35)); p.px(1, 4 + oy, lighten(hn, 0.2));
  p.px(0, 5 + oy, P.glint); p.px(15, 5 + oy, mix(hnD, P.bone, 0.3));
  // sigil DISC held low-right (a hard round bump on the robe edge)
  p.ellipse(13, 11 + oy, 2, 2, darken(c.eye, 0.3)); p.ellipse(13, 11 + oy, 1.2, 1.2, c.eye);
  p.px(13, 11 + oy, P.white); p.px(12, 10 + oy, P.glint);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});
function withAlphaSafe(col, a = 0.55) { return withAlpha(col, a); }

// ── NECROMANCER — R29 A2 silhouette recut (RE-01). R28 gave it a staff + soul
//    lantern, but the shroud, the bone spaulders and the lantern all ran to the
//    canvas edges, so outline() welded them into one dome. The recut shifts the
//    whole body LEFT and hangs the lantern high on the right over a 2-column air
//    gap: the reading is one tall asymmetric spike — skull-bell on the left, a
//    lantern-on-a-pole on the right. Portrait: skull face in a deep hood, a raised
//    teal soul lantern, a bone staff. ──
registerHeroBody('necromancer', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  const deep = mix(c.cD, P.ink2, 0.5);
  const boneD = darken(P.bone, 0.3), boneM = darken(P.bone, 0.14);
  p.softShadow(5, 17 + oy, 4.4, 1.4, 0.34);        // contact shadow follows the
                                                   // LEFT-shifted body, not canvas centre

  // ── grave-shroud: bell centred on x6 (LEFT of canvas centre) so the right
  //    flank stays empty for the staff. Hem stops at x11 — never x14. ──
  for (let y = 8 + oy; y <= 16 + oy; y++) {
    const hw = Math.round(2.3 + (y - (8 + oy)) * 0.13);
    p.hline(5 - hw, 5 + hw, y, c.cD);
  }
  for (let y = 9 + oy; y <= 15 + oy; y++) {
    const hw = Math.round(1.8 + (y - (9 + oy)) * 0.16);
    const t = (y - (9 + oy)) / 6;
    p.hline(5 - hw, 5 + hw, y, mix(c.cL, c.cloak, t));
  }
  p.hline(2, 8, 16 + oy, deep);                                    // hem under-shade
  p.px(2, 16 + oy, null); p.px(3, 17 + oy, c.cD); p.px(7, 17 + oy, c.cD); // ragged hem teeth
  p.hline(2, 8, 15 + oy, mix(P.bone, c.cD, 0.55));                 // bone-braid hem trim
  for (let x = 2; x <= 8; x += 3) p.px(x, 15 + oy, boneM);         // vertebra beads
  p.vline(10 + oy, 15 + oy, 5, deep);                              // centre fold gutter
  p.vline(10 + oy, 14 + oy, 3, mix(c.cL, c.cloak, 0.35));          // lit fold (top-left)

  // ── bone spaulders — the widest row, and still 3 columns clear of the staff ──
  const spa = mix(P.bone, c.cD, 0.45);
  p.rect(1, 8 + oy, 3, 3, spa); p.rect(6, 8 + oy, 3, 3, spa);
  p.hline(1, 3, 8 + oy, boneM); p.hline(6, 8, 8 + oy, mix(spa, boneM, 0.5));
  p.hline(1, 3, 10 + oy, darken(spa, 0.35)); p.hline(6, 8, 10 + oy, darken(spa, 0.35));
  p.px(1, 8 + oy, P.bone);

  // ── deep hood + skull mask, centred on x5 (left of canvas centre) ──
  p.ellipse(5, 5 + oy, 3.2, 3.8, c.cD);
  p.ellipse(5, 4 + oy, 2.3, 2.4, c.cloak);
  p.hline(4, 6, 1 + oy, c.cD);                                     // rounded hood crown
  p.px(3, 2 + oy, c.cL); p.px(4, 1 + oy, mix(c.cL, P.rim, 0.4));   // hood crest sheen
  p.rect(3, 4 + oy, 5, 5, P.ink2);                                 // hood interior void
  p.ellipse(5, 5 + oy, 2.2, 2.2, P.bone);
  p.ellipse(5, 4 + oy, 1.8, 1.2, lighten(P.bone, 0.16));           // cranium highlight
  p.hline(3, 7, 7 + oy, boneM); p.hline(4, 6, 8 + oy, boneD);      // jaw — 2nd bone step
  p.px(4, 8 + oy, boneM); p.px(6, 8 + oy, boneM);                  // teeth
  p.px(4, 5 + oy, lighten(c.eye, 0.5)); p.px(6, 5 + oy, lighten(c.eye, 0.5));
  p.px(4, 5 + oy, P.glint);                                        // burning sockets
  p.px(5, 6 + oy, P.ink2);                                         // nasal void
  p.hline(2, 8, 9 + oy, mix(c.cD, P.ink, 0.5));                    // collar shadow (separator)

  // ── SOUL LANTERN on a pole — the silhouette signature. The cage sits ABOVE the
  //    skull at the top-right corner and the 2 px shaft drops beside the body with
  //    2 empty columns between them, so the sprite reads as one high, off-centre
  //    spike instead of a symmetrical mound. ──
  p.rect(13, 4 + oy, 2, 8, P.woodD);                               // shaft — RAISED, it
  p.vline(4 + oy, 11 + oy, 13, mix(P.woodD, P.woodL, 0.45));       // stops at the grip so
  p.rect(13, 10 + oy, 2, 2, boneM);                                // the lower-right corner
  p.px(14, 11 + oy, darken(boneM, 0.3));                           // stays empty (ranger's
  p.rect(9, 10 + oy, 4, 2, spa);                                   // bow runs floor to sky).
  p.hline(9, 12, 10 + oy, boneM); p.px(12, 11 + oy, darken(spa, 0.35)); // A bone arm reaches
  p.px(9, 10 + oy, P.bone);                                        // across to the grip so
                                                                   // the staff is CARRIED.
  p.rect(13, 0 + oy, 3, 4, mix(P.iron, c.cD, 0.4));                // lantern cage
  p.hline(13, 15, 0 + oy, P.iron); p.hline(13, 15, 3 + oy, darken(P.iron, 0.3));
  p.glow(14, 2 + oy, 1.4, c.eye, 0.6, 3);                          // tight glow — a wide
  p.rect(14, 1 + oy, 2, 2, c.eye); p.px(14, 1 + oy, P.white);      // one would re-weld the gap
  p.px(13, 4 + oy, boneM); p.px(15, 4 + oy, boneM);                // cage feet

  // ── drifting soul wisp on the left flank (per-frame), kept inside the shroud ──
  const wy = 11 + ((f + 1) % 3) + oy;
  p.px(3, wy, lighten(c.eye, 0.2)); p.px(4, wy, mix(c.eye, c.cD, 0.5));
  p.sparkle(3, wy - 1, mix(c.eye, P.white, 0.4), 0);

  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── RANGER — peaked hood, longbow, quiver ──
registerHeroBody('ranger', (p, f, a) => {
  // R29 A1: silhouette recut - a peaked hood NARROWER than the shoulders (so the
  // head no longer merges into one green mound) with the drawn longbow pushed to
  // the far right edge, where a real gap column survives outline().
  // Portrait: green hood, tall recurve bow drawn vertically at the right.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.1));
  // shoulders WIDER than the hood
  p.rect(3, 9 + oy, 8, 7, c.cD); p.gradV(4, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(4, 10 + oy, 6, 5, c.cloak);
  p.hline(3, 10, 9 + oy, darken(c.cD, 0.45));                       // hard shadow under the hood
  p.rect(5, 11 + oy, 4, 3, mix(c.cL, c.cloak, 0.4));                // lit chest panel
  p.hline(4, 9, 13 + oy, c.trim); p.px(4, 13 + oy, lighten(c.trim, 0.3));   // belt
  p.rect(9, 11 + oy, 2, 3, darken(c.cD, 0.25));                     // draw-arm bracer
  p.rect(1, 8 + oy, 2, 5, c.cD); p.px(1, 7 + oy, c.trim); p.px(2, 7 + oy, c.eye); p.px(1, 6 + oy, P.glint); // quiver
  // narrow PEAKED hood - a 1 px point at the very top
  p.ellipse(7, 6 + oy, 2.4, 2.6, c.cD);
  p.line(5, 8 + oy, 7, 1 + oy, c.cloak); p.line(9, 8 + oy, 7, 1 + oy, c.cD);
  p.px(7, 1 + oy, c.cL); p.px(7, 0 + oy, c.cL); p.px(6, 3 + oy, c.cL);
  p.rect(5, 6 + oy, 4, 2, P.ink2);
  p.px(6, 7 + oy, c.eye); p.px(8, 7 + oy, c.eye); p.px(6, 7 + oy, P.glint);
  // LONGBOW - a tall recurve arc hugging the right edge, tips at y1 / y15
  p.line(13, 1 + oy, 15, 5 + oy, c.trim); p.vline(5 + oy, 11 + oy, 15, c.trim); p.line(15, 11 + oy, 13, 15 + oy, c.trim);
  p.px(14, 2 + oy, c.cL); p.px(14, 14 + oy, c.cL); p.px(15, 8 + oy, P.glint);
  p.vline(2 + oy, 14 + oy, 13, mix(c.cL, c.trim, 0.5));             // taut string
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── HUNTER — R29 A2 silhouette recut (RE-01). R28 had rebuilt the body for fill
//    rate, but the mantle, the pauldrons and the crossbow all reached the canvas
//    edges at the SAME rows, so outline() welded them into one dome. The recut
//    keeps every R28 element and only moves mass: a LOW flat-crowned hood (never
//    a peak — that is ranger's), a mantle narrower than the weapon, and the
//    crossbow prod alone spanning tip-to-tip at the waist over a deliberately
//    NARROW coat, so the silhouette's widest point is the belt line. Portrait:
//    deep teal hood pulled down, crossbow carried across the body. ──
registerHeroBody('hunter', (p, f, a) => {
  const c = pal(a); const oy = bob(f); const s = step(f);
  const deep = mix(c.cD, P.ink2, 0.45);            // 4th (deepest) cloth step
  const boot = P.woodD, bootL = lighten(P.woodD, 0.3);
  groundShadow(p, oy);

  // ── boots: tucked INSIDE the coat width so the prod stays the widest line ──
  p.rect(4, 16 + oy, 3, 2, boot); p.rect(9, 16 + oy, 3, 2, boot);
  p.hline(4, 6, 16 + oy, bootL); p.hline(9, 11, 16 + oy, bootL);
  if (s > 0) p.hline(4, 6, 17 + oy, darken(boot, 0.3));
  if (s < 0) p.hline(9, 11, 17 + oy, darken(boot, 0.3));

  // ── coat: a NARROW skirt (8 px) — the whole point of the recut is that the
  //    crossbow above it overhangs empty air on both flanks ──
  p.rect(4, 12 + oy, 8, 4, c.cD);
  p.rect(5, 12 + oy, 6, 3, c.cloak);
  p.gradV(5, 12 + oy, 6, 3, c.cL, c.cloak);
  p.hline(4, 11, 15 + oy, deep);                                   // hem under-shade
  p.vline(12 + oy, 15 + oy, 8, deep);                              // coat split seam
  p.vline(12 + oy, 14 + oy, 4, mix(c.cL, c.cloak, 0.5));           // top-left lit edge

  // ── torso + storm mantle: 10 px — wider than the hood, narrower than the prod ──
  p.rect(3, 7 + oy, 10, 5, c.cD);
  p.rect(4, 8 + oy, 8, 3, c.cloak);
  p.gradV(4, 8 + oy, 8, 2, c.cL, c.cloak);
  p.hline(3, 12, 7 + oy, mix(c.cL, c.cloak, 0.45));                // mantle top-light
  p.px(3, 9 + oy, deep); p.px(12, 9 + oy, deep);                   // pauldron under-shade
  p.hline(4, 11, 9 + oy, c.trim); p.px(8, 9 + oy, lighten(c.trim, 0.35)); // baldric + buckle
  // bolt quiver slung across the back — kept INSIDE the mantle so it cannot
  // sprout a second vertical mass next to ranger's bow column
  p.rect(4, 7 + oy, 2, 3, darken(P.leather, 0.32));
  p.px(4, 7 + oy, P.leather); p.px(5, 8 + oy, P.bone); p.px(4, 9 + oy, c.trim);

  // ── hood: LOW and flat-crowned, 6 px across, sitting on a dark collar ──
  p.rect(5, 2 + oy, 6, 5, c.cD);
  p.hline(6, 9, 1 + oy, c.cD);                                     // flat crown
  p.hline(6, 9, 1 + oy, mix(c.cD, c.cloak, 0.5));
  p.px(6, 1 + oy, c.cL); p.px(5, 2 + oy, mix(c.cL, P.rim, 0.4));   // crown sheen (top-left)
  p.rect(6, 3 + oy, 4, 3, P.ink2);                                 // cavity — dark step
  p.hline(6, 9, 5 + oy, mix(P.ink2, c.cD, 0.55));                  // cavity — lit step
  p.hline(5, 10, 2 + oy, mix(c.cD, P.ink, 0.4));                   // brow shadow
  glowEye(p, 6, 4 + oy, c.eye); glowEye(p, 9, 4 + oy, c.eye);
  p.hline(5, 10, 6 + oy, mix(c.cloak, c.cL, 0.3));                 // scarf across the jaw
  p.hline(4, 11, 7 + oy, mix(c.cD, P.ink, 0.45));                  // collar shadow (separator)

  // ── CROSSBOW — the silhouette signature: a 2 px prod running tip-to-tip at the
  //    waist. Nothing else on the sprite reaches x0 / x15, so the limbs overhang
  //    real empty air below (rogue's blades hang, ranger's bow stands upright). ──
  p.rect(6, 10 + oy, 4, 2, P.wood); p.hline(6, 9, 10 + oy, P.woodL);   // stock
  p.rect(0, 10 + oy, 6, 2, P.iron); p.rect(10, 10 + oy, 6, 2, P.iron); // limbs
  p.hline(0, 5, 10 + oy, P.steel); p.hline(10, 15, 10 + oy, P.steel);
  p.px(0, 11 + oy, P.steelD); p.px(15, 11 + oy, P.steelD);
  p.px(0, 12 + oy, P.iron); p.px(15, 12 + oy, P.iron);              // limb tips hook DOWN
  p.px(0, 13 + oy, P.steelD); p.px(15, 13 + oy, P.steelD);          // past the coat line
  p.px(1, 10 + oy, P.steelL); p.px(14, 10 + oy, mix(P.steel, P.steelD, 0.5));
  p.hline(2, 13, 11 + oy, mix(P.steelD, P.iron, 0.5));              // bowstring
  p.hline(6, 10, 11 + oy, P.steelL);                                // the loaded bolt
  p.px(10, 11 + oy, c.eye); p.px(9, 11 + oy, P.glint);              // enchanted bolt head

  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── ROGUE — R29 A2 silhouette recut (RE-01). R28 already carried twin blades but
//    they were thrown into the TOP corners, where outline() fused them to the cowl
//    and to the shoulder cape into one dome. The recut inverts the read: a slim,
//    tall cowl (4 px — the narrowest head in the roster), a sharp shoulder cape as
//    the only wide row, a pinched waist, and the two reverse-grip blades hanging
//    DOWN at the canvas edges as detached spikes with real empty columns between
//    them and the body. Portrait: purple hood + face wrap, reverse-grip dagger. ──
registerHeroBody('rogue', (p, f, a) => {
  const c = pal(a); const oy = bob(f); const s = step(f);
  const deep = mix(c.cD, P.ink2, 0.5);
  const edge = mix(c.eye, P.neon, 0.35);
  groundShadow(p, oy);

  // ── boots: kept inside the torso width, feet close together (a crouched thief) ──
  p.rect(5, 16 + oy, 2, 2, P.ink2); p.rect(9, 16 + oy, 2, 2, P.ink2);
  p.px(5, 16 + oy, mix(P.ink2, c.cL, 0.35)); p.px(9, 16 + oy, mix(P.ink2, c.cL, 0.35));
  if (s > 0) p.hline(5, 6, 17 + oy, P.shadow);
  if (s < 0) p.hline(9, 10, 17 + oy, P.shadow);

  // ── wrap skirt + torso: a deliberately LEAN column so the flanks stay empty ──
  p.rect(5, 14 + oy, 6, 3, c.cD);
  p.rect(6, 14 + oy, 4, 2, c.cloak);
  p.hline(5, 10, 16 + oy, deep);
  p.line(6, 14 + oy, 9, 16 + oy, mix(c.cloak, c.cD, 0.5));          // wrapped hem fold
  p.rect(6, 10 + oy, 4, 4, c.cD);                                   // pinched waist (4 px)
  p.gradV(6, 10 + oy, 4, 3, c.cL, c.cloak);
  p.hline(6, 9, 12 + oy, c.trim); p.px(7, 12 + oy, lighten(c.trim, 0.4));  // sash

  // ── shoulder cape: the ONLY wide row — sharp-cornered, top-left lit ──
  p.rect(3, 7 + oy, 10, 2, c.cD);
  p.hline(3, 12, 7 + oy, mix(c.cL, c.cloak, 0.45));
  p.hline(3, 12, 8 + oy, deep);                                     // cape under-shade
  p.rect(3, 8 + oy, 2, 1, darken(c.cD, 0.2)); p.rect(11, 8 + oy, 2, 1, darken(c.cD, 0.2)); // fists

  // ── cowl: TALL and narrow (4 px) — no hero else has a head this slim ──
  p.rect(6, 1 + oy, 4, 6, c.cD);
  p.hline(6, 9, 0 + oy, mix(c.cD, c.cloak, 0.6));                   // crown
  p.px(6, 0 + oy, c.cL); p.px(6, 1 + oy, mix(c.cL, P.rim, 0.35));   // cowl sheen (top-left)
  p.rect(6, 3 + oy, 4, 3, P.ink2);                                  // cavity — dark step
  p.hline(6, 9, 5 + oy, mix(P.ink2, c.cD, 0.7));                    // cavity — lit step
  p.hline(6, 9, 2 + oy, mix(c.cD, P.ink, 0.4));                     // brow shadow
  p.px(7, 4 + oy, lighten(c.eye, 0.45)); p.px(9, 4 + oy, lighten(c.eye, 0.45));
  p.px(7, 4 + oy, P.glint);                                         // 1 px eyes + catch-light
  p.hline(6, 9, 6 + oy, mix(c.cD, P.ink2, 0.4));                    // face wrap
  p.hline(5, 10, 7 + oy, mix(c.cD, P.ink, 0.45));                   // collar shadow

  // ── TWIN reverse-grip blades — the silhouette signature. They hang point-DOWN
  //    at x0-1 / x14-15 while the waist is only 4 px, so two empty columns per
  //    flank survive outline() and the blades read as detached spikes. ──
  p.rect(2, 9 + oy, 1, 2, c.cD); p.rect(13, 9 + oy, 1, 2, c.cD);   // forearms: the blades
  p.px(2, 9 + oy, mix(c.cL, c.cloak, 0.4));                         // must READ as held,
  p.rect(0, 11 + oy, 2, 3, P.steelD); p.rect(14, 11 + oy, 2, 3, P.steelD); // not as debris
  p.px(0, 14 + oy, P.steelD); p.px(15, 14 + oy, P.steelD);          // blades taper to a point
  p.px(0, 11 + oy, c.trim); p.px(15, 11 + oy, darken(c.trim, 0.2)); // pommel caps
  p.vline(12 + oy, 13 + oy, 0, P.steel); p.vline(12 + oy, 13 + oy, 15, mix(P.steel, P.steelD, 0.6));
  p.px(1, 12 + oy, edge); p.px(14, 12 + oy, edge);                  // poisoned edge glint
  p.px(0, 12 + oy, P.glint);

  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── SAMURAI — conical kasa hat, side topknot, katana ──
registerHeroBody('samurai', (p, f, a) => {
  // R29 A1: silhouette recut - a low FLAT cavalier brim with a single plume spike
  // stabbing up-left to the canvas top, plus a thin rapier spar on the right.
  // Portrait: plumed wide hat, moustache, rapier held vertically.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.ink2);
  p.rect(5, 9 + oy, 7, 7, c.cD); p.gradV(6, 9 + oy, 5, 6, c.cL, c.cloak); p.rect(6, 10 + oy, 5, 5, c.cloak);
  p.line(8, 9 + oy, 6, 16 + oy, c.cL); p.line(8, 9 + oy, 10, 16 + oy, c.trim);
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  p.hline(7, 9, 8 + oy, darken(c.skin, 0.35));                      // moustache
  // FLAT wide brim (y4..5), low crown, nothing peaked above it
  p.hline(1, 14, 5 + oy, c.cD); p.hline(2, 13, 4 + oy, c.cloak);
  p.rect(6, 2 + oy, 5, 2, c.cD); p.px(6, 2 + oy, c.cL);
  p.px(1, 5 + oy, c.cL); p.px(14, 5 + oy, darken(c.cD, 0.3));
  // PLUME - a single 1 px spike from the brim to the top-left corner
  p.line(5, 4 + oy, 2, 0 + oy, c.trim); p.px(2, 0 + oy, P.glint); p.px(3, 1 + oy, c.cL);
  // rapier - a thin spar down the right edge with a swept guard
  p.vline(6 + oy, 15 + oy, 14, P.steelL); p.px(14, 6 + oy, P.glint);
  p.px(13, 9 + oy, c.trim); p.px(15, 9 + oy, c.trim);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── BERSERKER — bare horned-helm bruiser, broad shoulders, big axe ──
registerHeroBody('berserker', (p, f, a) => {
  // R29 A1: silhouette recut - a SOLID axe head filling the top-right corner over
  // bare sloping shoulders. Portrait: plated bruiser with a double-bit axe
  // shouldered. The canvas-wide rage glow is gone (outline() turned it into a blob).
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  p.rect(3, 9 + oy, 9, 6, mix(c.skin, c.cloak, 0.3));
  p.rect(4, 9 + oy, 7, 5, c.skin); p.rect(4, 9 + oy, 7, 1, lighten(c.skin, 0.15)); p.hline(4, 10, 12 + oy, P.woodD);
  p.ellipse(3, 9.5 + oy, 2.2, 1.8, c.skin); p.px(2, 9 + oy, lighten(c.skin, 0.2));
  p.ellipse(8, 6 + oy, 2.2, 2, c.skin); p.px(6, 5 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 6 + oy, c.eye); glowEye(p, 9, 6 + oy, c.eye);
  p.rect(6, 4 + oy, 4, 2, c.cD); p.rect(6, 4 + oy, 4, 1, c.cL);
  p.px(5, 3 + oy, c.trim); p.px(10, 3 + oy, c.trim);                // stub horns
  // AXE - solid head wedged into the top-right corner, haft raking down-left
  p.line(12, 6 + oy, 9, 14 + oy, P.woodD); p.line(13, 6 + oy, 10, 14 + oy, P.wood);
  p.rect(11, 0 + oy, 5, 5, P.iron); p.rect(12, 1 + oy, 4, 3, P.steel);
  p.hline(11, 15, 0 + oy, P.steelL); p.px(11, 0 + oy, P.glint);
  p.px(11, 5 + oy, P.iron); p.px(15, 5 + oy, P.iron);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── GUNNER — wide flat-brim hat, long split coat, rifle ──
registerHeroBody('gunner', (p, f, a) => {
  // R29 A1: silhouette recut - a perfectly LEVEL bush brim (no plume, unlike the
  // duelist), a rifle raked corner-to-corner and a rope coil bulging left.
  // Portrait: flat wide hat, bandolier, coiled line in both hands.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  p.rect(5, 9 + oy, 7, 7, c.cD); p.gradV(6, 9 + oy, 5, 6, c.cL, c.cloak); p.rect(6, 10 + oy, 5, 5, c.cloak);
  p.vline(13 + oy, 16 + oy, 8, P.ink2);                             // coat split (tails)
  p.px(7, 16 + oy, c.cD); p.px(9, 16 + oy, c.cD);
  p.rect(6, 10 + oy, 5, 2, c.trim); p.px(6, 10 + oy, lighten(c.trim, 0.3));
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  // LEVEL brim - one flat row, low crown, nothing above it
  p.hline(2, 13, 5 + oy, c.cD); p.hline(3, 12, 4 + oy, c.cloak);
  p.rect(6, 2 + oy, 5, 2, c.cD); p.hline(6, 10, 2 + oy, c.trim); p.px(6, 3 + oy, c.cL);
  // ROPE COIL - a round bump off the left hip
  p.ring(2, 12 + oy, 2, P.wood); p.ring(2, 12 + oy, 1, P.woodL); p.px(1, 11 + oy, P.woodL);
  // rifle raked from a low-left stock to a muzzle at the right edge
  p.line(1, 15 + oy, 15, 8 + oy, P.iron); p.line(2, 15 + oy, 15, 9 + oy, P.steelL);
  p.rect(1, 14 + oy, 2, 2, P.woodD); p.px(15, 8 + oy, P.white);
  p.glow(15, 8 + oy, 2, P.emberL, 0.4, 3);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── MONK — bald head, simple wrap robe + sash, raised fists, aura ──
registerHeroBody('monk', (p, f, a) => {
  // R29 A1: silhouette recut - a HEXAGONAL ward plate floating at head height on
  // the left, against a bare round dome. Portrait: warder pressing an open palm
  // into a hex barrier. The old full-body ring aura is gone (it outlined to a disc).
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.skin);
  p.rect(6, 9 + oy, 6, 7, c.cD); p.gradV(7, 9 + oy, 4, 6, c.cL, c.cloak); p.rect(7, 10 + oy, 4, 5, c.cloak);
  p.line(6, 10 + oy, 11, 13 + oy, c.trim);                          // diagonal sash
  p.ellipse(9, 6 + oy, 2.4, 2.4, c.skin); p.ellipse(9, 5 + oy, 2, 1.5, lighten(c.skin, 0.12));
  p.px(8, 4 + oy, lighten(c.skin, 0.25));
  glowEye(p, 8, 6 + oy, c.eye); glowEye(p, 10, 6 + oy, c.eye);
  p.px(9, 4 + oy, c.eye); p.px(9, 4 + oy, P.glint);
  p.rect(12, 10 + oy, 2, 3, c.skin); p.px(13, 10 + oy, lighten(c.skin, 0.2));
  // HEX WARD - a hard-edged hexagon at head height on the left flank
  const hy = 8 + oy;
  const wF = darken(c.eye, 0.55), wR = mix(c.eye, P.white, 0.5);
  p.hline(1, 4, hy - 4, wF); p.hline(0, 5, hy - 3, wF);
  p.rect(0, hy - 2, 6, 4, wF); p.hline(0, 5, hy + 2, wF); p.hline(1, 4, hy + 3, wF);
  p.hline(1, 4, hy - 4, wR); p.hline(1, 4, hy + 3, wR);             // flat top / bottom facet
  p.vline(hy - 2, hy + 1, 0, wR); p.vline(hy - 2, hy + 1, 5, darken(c.eye, 0.15));
  p.px(0, hy - 3, wR); p.px(5, hy - 3, darken(c.eye, 0.2));
  p.px(0, hy + 2, darken(c.eye, 0.3)); p.px(5, hy + 2, darken(c.eye, 0.3));
  p.hline(2, 3, hy - 1, c.eye); p.hline(2, 3, hy + 0, c.eye);       // inner rune bar
  p.px(1, hy - 4, P.white); p.px(2, hy - 3, P.glint);
  p.rect(5, hy + 2, 2, 3, c.skin);                                  // pressing palm
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── SHAMAN / STORMCALLER — tall feathered headdress, totem staff, fringe ──
registerHeroBody('shaman', (p, f, a) => {
  // R29 A1: silhouette recut - a SOLID trapezoidal headdress fanning to the full
  // canvas width (contrast: the pyromancer's separated flame comb), plus a knobbed
  // totem. Portrait: branching antler / lightning crown over a storm caller.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 2.5 + (y - (9 + oy)) * 0.35; p.hline(8 - hw, 8 + hw, y, c.cD); }
  p.gradV(5, 9 + oy, 6, 5, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 4, c.cloak);
  for (let x = 4; x <= 12; x += 2) p.px(x, 16 + oy, c.trim);        // fringe
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  // SOLID headdress wedge: narrow at the top, full width at the brow
  p.hline(6, 10, 0 + oy, c.trim); p.hline(5, 11, 1 + oy, c.cD);
  p.hline(3, 13, 2 + oy, c.cD); p.hline(1, 14, 3 + oy, c.cD); p.hline(0, 15, 4 + oy, c.cD);
  p.hline(2, 13, 3 + oy, c.cloak); p.hline(1, 14, 4 + oy, mix(c.cL, c.cloak, 0.5));
  p.hline(5, 10, 5 + oy, c.cD);
  p.px(6, 0 + oy, c.cL); p.px(10, 0 + oy, c.cL); p.px(0, 4 + oy, c.cL);
  p.px(4, 3 + oy, c.eye); p.px(11, 3 + oy, c.eye);
  // totem staff with a heavy round knob, kept inside the robe line
  p.vline(6 + oy, 15 + oy, 12, P.wood);
  p.ellipse(12, 7 + oy, 1.8, 1.8, c.eye); p.px(12, 7 + oy, P.white); p.px(11, 6 + oy, P.glint);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── VALKYRIE — winged helm, armor skirt, spear ──
registerHeroBody('valkyrie', (p, f, a) => {
  // R29 A1: silhouette recut - a CRYSTAL DIAMOND in the top-LEFT corner on a 2 px
  // full-height halberd spar. Portrait: ice-hooded warden with a crystal-headed
  // polearm. (The ranger owns the right-edge bow arc, so this one goes left.)
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.2));
  p.rect(6, 9 + oy, 7, 7, c.cD); p.gradV(7, 9 + oy, 5, 6, c.cL, c.cloak); p.rect(7, 10 + oy, 5, 5, c.cloak);
  p.hline(6, 12, 13 + oy, c.trim); p.hline(7, 11, 15 + oy, c.cD);
  p.ellipse(12.6, 9.6 + oy, 1.8, 1.6, c.cL); p.px(13, 9 + oy, P.steelL);
  p.ellipse(9, 6 + oy, 2.2, 2.2, c.cloak); p.rect(7, 6 + oy, 4, 1, P.ink2);
  p.glow(7.5, 6 + oy, 1.3, c.eye, 0.5, 3); p.glow(10.5, 6 + oy, 1.3, c.eye, 0.5, 3);
  p.rect(7, 6 + oy, 1.5, 1, c.eye); p.rect(10, 6 + oy, 1.5, 1, c.eye); p.px(7, 6 + oy, P.glint);
  p.rect(7, 3 + oy, 4, 3, c.cL); p.px(7, 3 + oy, P.steelL);         // winged helm
  p.line(11, 4 + oy, 14, 2 + oy, P.white); p.px(14, 2 + oy, P.hiSky);
  // HALBERD - 2 px spar down the left edge, crystal diamond in the top corner
  p.rect(2, 4 + oy, 2, 13, P.wood); p.vline(4 + oy, 16 + oy, 2, P.woodL);
  p.hline(2, 3, 4 + oy, c.trim);
  p.hline(2, 3, 0 + oy, mix(c.cL, P.white, 0.4));
  p.hline(1, 4, 1 + oy, c.cL); p.hline(0, 5, 2 + oy, c.cloak); p.hline(1, 4, 3 + oy, darken(c.cloak, 0.25));
  p.px(1, 1 + oy, P.white); p.px(2, 2 + oy, P.hiSky); p.px(5, 2 + oy, c.cL);
  p.glow(2.5, 2 + oy, 2.2, P.hiSky, 0.35, 3);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── SCOUT — brimmed cap (not a hood), short recurve bow held FORWARD, side quiver.
//    Distinct from RANGER (peaked hood + drawn longbow on the left). ──
registerHeroBody('scout', (p, f, a) => {
  // R29 A1: silhouette recut - a CRUCIFORM read: the crossbow is levelled across
  // the whole canvas width at chest height on outstretched arms. Portrait: hooded
  // scout sighting a horizontal crossbow. Nothing else in the roster is a cross.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.1));
  p.rect(5, 9 + oy, 7, 7, c.cD); p.gradV(6, 9 + oy, 5, 6, c.cL, c.cloak); p.rect(6, 10 + oy, 5, 5, c.cloak);
  p.hline(6, 10, 13 + oy, c.trim);                                  // belt
  p.hline(4, 12, 7 + oy, c.cD); p.hline(5, 11, 8 + oy, c.cD);        // shoulder cape
  p.hline(4, 12, 11 + oy, c.cD); p.hline(5, 11, 12 + oy, c.cD);      // arm line + forestock
  p.ellipse(8, 6 + oy, 2.2, 2, c.skin); p.px(7, 5 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 6 + oy, c.eye); glowEye(p, 9, 6 + oy, c.eye);
  p.ellipse(8, 5 + oy, 2.6, 2.2, c.cD); p.rect(6, 6 + oy, 5, 1, P.ink2);
  p.px(6, 4 + oy, c.cL);
  // CROSSBOW - a full-width bar at y9..10 with swept limbs and a stock
  p.hline(0, 15, 9 + oy, P.wood); p.hline(1, 14, 10 + oy, P.woodD);
  p.px(0, 8 + oy, P.woodL); p.px(15, 8 + oy, P.woodL);
  p.px(1, 8 + oy, c.trim); p.px(14, 8 + oy, c.trim);
  p.hline(2, 13, 8 + oy, mix(c.cL, c.trim, 0.4));                   // taut string
  p.rect(7, 9 + oy, 3, 3, P.woodD); p.px(8, 11 + oy, c.eye); p.px(8, 11 + oy, P.glint);
  p.rect(4, 9 + oy, 2, 2, c.skin); p.rect(11, 9 + oy, 2, 2, c.skin); // hands on the bar
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── STORM-PRIEST — a horned circlet + a tall lightning rod staff crackling with
//    sparks. Distinct from SHAMAN (feathered headdress + totem). ──
registerHeroBody('stormpriest', (p, f, a) => {
  // R29 A1: silhouette recut - BOTH arms thrown up and out with a lightning arc
  // bridging the hands, leaving a real hole between arms, arc and head. Portrait:
  // bare-headed youth channelling a bolt between his palms. No hat, no staff.
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.2));
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 2.2 + (y - (9 + oy)) * 0.4; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let y = 10 + oy; y <= 16 + oy; y++) { const hw = 1.4 + (y - (10 + oy)) * 0.35; p.hline(8 - hw, 8 + hw, y, mix(c.cL, c.cloak, (y - (10 + oy)) / 6)); }
  p.hline(4, 12, 16 + oy, c.trim);
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(7, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  p.hline(6, 10, 5 + oy, darken(c.cD, 0.15)); p.px(6, 4 + oy, c.cD); p.px(10, 4 + oy, c.cD);
  // BOTH ARMS raised outward - a goalpost profile
  p.line(6, 9 + oy, 2, 6 + oy, c.cloak); p.line(10, 9 + oy, 13, 6 + oy, c.cloak);
  p.rect(0, 4 + oy, 3, 3, c.skin); p.rect(13, 4 + oy, 3, 3, c.skin);
  p.px(0, 4 + oy, lighten(c.skin, 0.25)); p.px(13, 4 + oy, lighten(c.skin, 0.2));
  // lightning arc bridging the hands (leaves a hole over the head)
  p.line(2, 3 + oy, 5, 1 + oy, P.neonL); p.line(5, 1 + oy, 8, 2 + oy, P.neon);
  p.line(8, 2 + oy, 11, 0 + oy, P.neonL); p.line(11, 0 + oy, 14, 3 + oy, P.neon);
  p.px(5, 1 + oy, P.white); p.px(11, 0 + oy, P.white);
  p.glow(8, 2 + oy, 2.4, P.neon, 0.3, 3);
  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── VOID-MAGE — a low cowl with a glowing third-eye sigil, a tattered robe, and a
//    floating dark orb cradled in one hand. Distinct from MAGE (tall wide-brim hat). ──
// ── VOID-MAGE — R29 A2 silhouette recut (RE-01). R28 fixed the value range but
//    finished with aura(8,3,5): outline() treats every alpha>0 pixel as solid, so
//    that ring became the outer edge and the hero read as a plain dome. The aura
//    is gone; the tentacles it was standing in for are now REAL geometry — four
//    staggered tendril stubs at the canvas edges, never two at the same height, so
//    they can never fuse into a band. Cowl narrowed to 4 px so 2 empty columns per
//    flank survive. Portrait: hooded caster, radiating tentacles, a spiral core
//    cupped in both hands. ──
registerHeroBody('voidmage', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  // the voidcaller palette bottoms out near ink — lift the mid/light steps so the
  // silhouette separates from a dark biome floor (colour family unchanged).
  const bodyD = mix(c.cD, c.cL, 0.3);
  const body = mix(c.cloak, c.cL, 0.45);
  const bodyL = mix(c.cloak, c.cL, 0.75);
  const core = mix(c.eye, P.astralL, 0.3);
  groundShadow(p, oy);

  // ── robe: a LEAN column (6 px) from the shoulders down, flaring only in the
  //    last two rows — the narrow waist is what lets the tendrils read ──
  for (let y = 8 + oy; y <= 16 + oy; y++) {
    const t = y - (8 + oy);
    const hw = t <= 2 ? 4 : (t >= 7 ? 5 : 3);                      // torso / waist / hem
    p.hline(8 - hw, 7 + hw, y, bodyD);
  }
  for (let y = 9 + oy; y <= 15 + oy; y++) {
    const t = y - (8 + oy);
    const hw = (t <= 2 ? 4 : (t >= 7 ? 5 : 3)) - 1;
    p.hline(8 - hw, 7 + hw, y, mix(bodyL, body, t / 8));
  }
  p.hline(3, 12, 16 + oy, c.cD);                                   // hem sinks into shadow
  for (let x = 3; x <= 12; x += 3) p.px(x, 16 + oy, mix(c.cL, c.cD, 0.45)); // tattered tips
  p.vline(10 + oy, 15 + oy, 6, bodyD); p.vline(10 + oy, 15 + oy, 9, bodyD); // fold gutters
  p.vline(9 + oy, 14 + oy, 5, bodyL);                              // top-left lit fold

  // ── shoulders / sleeves — the only wide row above the hem ──
  p.rect(4, 8 + oy, 3, 3, bodyD); p.rect(9, 8 + oy, 3, 3, bodyD);
  p.hline(4, 6, 8 + oy, bodyL); p.hline(9, 11, 8 + oy, body);
  p.hline(4, 6, 10 + oy, c.cD); p.hline(9, 11, 10 + oy, c.cD);

  // ── void CORE cupped in both hands — the class symbol; a TIGHT glow only, a
  //    wide one would refill the waist notch through outline() ──
  p.rect(5, 11 + oy, 2, 2, bodyD); p.rect(9, 11 + oy, 2, 2, bodyD);   // cupped hands
  p.px(5, 11 + oy, bodyL); p.px(10, 12 + oy, c.cD);
  p.glow(8, 11 + oy, 1.6, core, 0.45, 3);
  p.ellipse(8, 11 + oy, 1.5, 1.5, P.ink2);                            // dark socket ring
  p.rect(7, 11 + oy, 2, 2, c.trim);
  p.px(7, 11 + oy, P.white); p.px(8, 12 + oy, mix(c.trim, P.ink2, 0.4));

  // ── VOID TENDRILS — the silhouette signature. Four stubs at x0-1 / x14-15,
  //    staggered so no two share a row: left high + low, right mid + lower. The
  //    cowl is 4 px and the waist 6 px, so each stub keeps 2 empty columns. ──
  const sw = (f === 1 || f === 3) ? 1 : 0;
  // left tendril — HIGH, curling to the top-left corner
  p.rect(0, 2 + oy, 2, 4, bodyD); p.px(1, 2 + oy, body);
  p.px(2, 5 + oy, bodyD); p.px(3, 6 + oy, bodyD); p.px(4, 6 + oy, body);
  p.px(2, 4 + sw + oy, mix(core, body, 0.5));                      // curls back to the cowl
  p.px(0, 2 + oy, bodyL); p.px(0, 4 + oy, mix(core, bodyD, 0.5)); p.px(1, 5 + oy, core);
  // right tendril — two rows LOWER, so the pair can never fuse into a band
  p.rect(14, 4 + oy, 2, 4, bodyD); p.px(14, 4 + oy, body);
  p.px(13, 7 + oy, bodyD); p.px(12, 8 + oy, body);                 // curls back to the sleeve
  p.px(13, 6 - sw + oy, mix(core, body, 0.5));
  p.px(15, 4 + oy, mix(bodyL, body, 0.5)); p.px(15, 7 + oy, core);

  // ── deep cowl — 4 px wide, third-eye sigil above 1 px eyes ──
  p.rect(6, 2 + oy, 4, 6, bodyD);
  p.hline(6, 9, 1 + oy, mix(bodyD, body, 0.5));
  p.px(6, 1 + oy, bodyL); p.px(6, 2 + oy, mix(bodyL, P.rim, 0.35));   // cowl crest sheen
  p.rect(6, 4 + oy, 4, 3, P.ink2);                                    // cavity — dark step
  p.hline(6, 9, 6 + oy, mix(P.ink2, bodyD, 0.6));                     // cavity — lit step
  p.hline(6, 9, 3 + oy, mix(c.cD, P.ink, 0.4));                       // brow shadow
  p.px(8, 3 + oy, lighten(c.eye, 0.4)); p.px(8, 3 + oy, P.glint);     // third eye
  p.px(7, 5 + oy, lighten(c.eye, 0.5)); p.px(9, 5 + oy, lighten(c.eye, 0.5)); // 1 px eyes
  p.hline(5, 10, 7 + oy, mix(c.cD, P.ink, 0.45));                     // collar shadow

  p.shadeBottom(0.2, 12);
  rimFinish(p);
});

// ── charId -> archetype. Heroes sharing an archetype still differ by palette. ──
// Loaded before characters.js / the gen hero packs, so their sprite generators pick
// up the unique body via drawHeroBody(p, frame, id, art).
const HERO_MAP = {
  // core (characters.js)
  hunter: 'hunter', pyro: 'pyromancer', guardian: 'knight', ranger: 'ranger', stormcaller: 'shaman', shadow: 'rogue',
  // gen_characters (g_*) — task-3: duplicated archetypes split off so no two heroes are palette twins
  g_vanguard: 'berserker', g_arcanist: 'mage', g_ranger: 'scout', g_warden: 'valkyrie', g_revenant: 'necromancer', g_stormcaller: 'stormpriest',
  // gen_heroes2 (h2_*)
  h2_duelist: 'samurai', h2_warlock: 'warlock', h2_trapper: 'gunner', h2_voidcaller: 'voidmage', h2_warder: 'monk',
};
for (const [id, arch] of Object.entries(HERO_MAP)) { const fn = HERO_ART[arch]; if (fn) registerHeroBody(id, fn); }

// re-export so the mapping is importable if needed
export { HERO_MAP };
