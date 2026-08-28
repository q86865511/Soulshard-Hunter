// 死神 Reaper — the hidden, killable superboss (E2 / 原#13). A floating hooded
// skeleton trailing a tattered black shroud, burning eyes, scythe in one hand.
//
// R28/ART-01: re-cut onto the ART_SPEC Mini-boss canvas (32×32, visible 30 px)
// with a ~2-step brighter value ramp and the scythe inside the silhouette.
//
// BUG FIXED IN R28 — this is why the reaper read as a black blob: glow()/aura()/
// star4() apply withAlpha() to the colour they are GIVEN, and every call here
// passed an already-rgba() string. hex() then parsed NaN, the resulting
// "rgba(NaN,…)" was an invalid fillStyle, canvas silently kept the PREVIOUS
// fillStyle — P.ink — and the eye "glow" painted two opaque ink discs straight
// over the skull. Pass bare hex colours to those helpers; they own the alpha.
//
// v2 anime upgrade: deep VOID shroud with a flowing, tattered, sheen-lit hem;
// burning crimson eye-glow (p.glow) with white catch-lights; a spectral aura
// pulsing per-frame; a gleaming steel scythe wreathed in a hot energy edge;
// kira sparkles drifting off the blade; rim-lit silhouette + a translucent
// p.softShadow contact pool. Top-left light source, 3-4 tonal steps / material.
import { defineAnim } from '../engine/sprites.js';
import { P, withAlpha, lighten, darken, mix } from '../engine/palette.js';
import { defineIcon } from './icons.js';

// ── shroud / void tones (cool blue-black, top-left lit) ──
// R28/ART-01: the whole family was lifted ~2 value steps — the old #161a2e robe
// sank into every dark biome floor. The deepest step is now a gutter colour only.
const CLOAK_D = '#131629';            // deepest fold / gutter
const CLOAK   = '#2b3054';            // core robe
const CLOAK_L = '#4a5285';            // lit folds
const CLOAK_H = '#6f79b4';            // top-left highlight (4th step)
const CLOAK_R = mix('#4a5285', P.rimCool || '#9fd0ff', 0.55); // rim sheen
const VOID    = '#080a16';            // hood interior
// ── bone / steel ──
// NOTE (R28): lighten()/darken() take a 0..1 amount — these were called with
// 22 / 26 / 30, which clamped every "shade" to pure black and every "highlight"
// to pure white. That is why the skull had no modelling at all.
const BONE    = '#d9d3bd', BONE_L = lighten('#d9d3bd', 0.22), BONE_D = darken('#d9d3bd', 0.26);
const BONE_S  = darken('#d9d3bd', 0.45);   // deepest bone step (sockets / jaw gap)
const STEEL   = '#c6cedb', STEEL_L = lighten('#c6cedb', 0.26), STEEL_D = '#5a6273';
const SHAFT   = '#3a2a18', SHAFT_L = lighten('#3a2a18', 0.30);
// ── energy / glow accents ──
const EYE     = '#ff3b2e';            // burning eye core
const EYE_L   = mix('#ff3b2e', '#ffd0a0', 0.6);
const EDGE    = mix(P.laser || '#ff4d6d', '#ffffff', 0.15); // scythe energy edge
const SPEC    = P.astralL || '#cfe6ff';

// R28/ART-01 — re-cut from the old 34×46 tall-and-thin canvas onto the spec's
// FINAL-BOSS canvas (38×40, visible ~37 px). ART_SPEC was corrected mid-round:
// the reaper is the signature enemy that descends AFTER the biome final boss, so
// it belongs on the final-boss rung, not the mini-boss one (and the 28–32 rung
// has no implementation — every mini-boss in the pool is a 38–40 canvas b3_*).
// The old sprite was mostly empty air and 1 px tatters at a very low value; this
// one commits the whole canvas to mass: a broad shroud bell, a lifted 4-step
// value ramp, and the SCYTHE arcing across the top so the blade is part of the
// silhouette rather than a thin overlay.
// gameplay def (radius 11 / scale 2.2) is untouched — on-screen ≈ 84×88 px.
//
// Silhouette budget (canvas rows, before the bob):
//   2–12   scythe blade arcing across the top      15–34  shroud bell
//   3–18   peaked hood (apex x18/19)               20–31  sleeves + bone hands
//   10–17  skull, deep in the hood cavity          35–37  ragged hem tongues
//   x32–33  scythe shaft, full height on the right flank
defineAnim('reaper', 38, 40, 4, (p, f) => {
  const bob = (f === 1 || f === 3) ? 1 : 0;
  const oy = -bob;
  const phase = f / 4;                          // 0..1 around the loop
  const flick = (f === 1 || f === 2) ? 1 : 0;   // shroud wind sway
  const FOLD = mix(CLOAK, CLOAK_D, 0.55);

  // ── ground contact + spectral aura ──
  p.softShadow(19, 35.5 + oy, 13, 1.8, 0.5);
  p.softShadow(19, 35.5 + oy, 8, 1.2, 0.35);
  p.aura(19, 22 + oy, 14, mix(P.astral || '#5e7bff', CLOAK_D, 0.45), phase, 1);
  p.glow(19, 21 + oy, 15, '#26305e', 0.35, 4);

  // ── shroud bell: shoulders y15 → full-width hem y34 ──
  const top = 15 + oy, bot = 34 + oy;
  for (let y = top; y <= bot; y++) {
    const hw = Math.round(8 + (y - top) * 0.42);
    p.hline(19 - hw, 18 + hw, y, CLOAK_D);                    // silhouette edge
    const iw = hw - 1;
    p.hline(19 - iw, 18 + iw, y, mix(CLOAK_L, CLOAK, (y - top) / (bot - top)));
  }
  // fold ribs — continuous lines, so the bell is not a flat slab
  p.line(17, top + 1, 12, bot, FOLD);
  p.line(21, top + 1, 26, bot, FOLD);
  p.line(19, top + 4, 19, bot, FOLD);
  p.line(15, top + 1, 9, bot, CLOAK_D);
  p.line(23, top + 1, 29, bot, CLOAK_D);
  for (let y = top + 1; y <= bot - 1; y++) {                  // top-left lit edge
    const hw = Math.round(8 + (y - top) * 0.42) - 1;
    p.px(19 - hw, y, CLOAK_H);
  }
  p.hline(4, 33, bot, CLOAK_D);                               // hem under-shade
  p.hline(5, 32, bot - 1, CLOAK_L);                           // hem trim

  // ── ragged hem tongues (2 px wide — no 1 px noodles) ──
  for (let i = 0; i < 8; i++) {
    const tx = 4 + i * 4;
    const sway = Math.round(Math.sin((i * 0.9) + phase * 6.28) * flick);
    const tlen = 2 + ((i + f) % 2);
    p.rect(tx + sway, bot + 1, 2, tlen, CLOAK_D);
    p.px(tx + sway, bot + 1, CLOAK);
    p.px(tx + sway, bot + tlen, withAlpha(CLOAK_R, 0.6));
  }

  // ── sleeves + skeletal hands ──
  // x6/x27 so the shoulder of each sleeve TOUCHES the bell (which is x11..x26 at
  // y20) — set further out they read as two floating boxes beside the robe.
  const gut = mix(CLOAK_D, VOID, 0.5);
  for (const s of [0, 1]) {
    const x0 = s ? 27 : 6, out = s ? x0 + 4 : x0, inn = s ? x0 : x0 + 4;
    p.ellipse(x0 + 2, 21.5 + oy, 3, 2.4, CLOAK_D);            // rounded shoulder cap
    p.rect(x0, 21 + oy, 5, 6, CLOAK_D);                       // upper sleeve
    p.rect(x0 + 1, 27 + oy, 3, 3, CLOAK_D);                   // cuff taper
    p.hline(x0, x0 + 4, 20 + oy, s ? CLOAK : CLOAK_L);        // top light
    p.vline(21 + oy, 26 + oy, out, s ? CLOAK : CLOAK_L);      // lit outer edge
    p.vline(21 + oy, 28 + oy, inn, gut);                      // gutter — arm in FRONT
    p.hline(x0 + 1, x0 + 3, 29 + oy, FOLD);
  }
  p.ellipse(8, 31 + oy, 2.6, 2.6, BONE);
  p.px(7, 30 + oy, BONE_L); p.px(9, 32 + oy, BONE_D);
  p.ellipse(30, 31 + oy, 2.6, 2.6, BONE);
  p.px(29, 30 + oy, BONE_L); p.px(31, 32 + oy, BONE_D);

  // ── PEAKED hood: apex at x18/19, opening out to the shoulders ──
  for (let y = 3 + oy; y <= 18 + oy; y++) {
    const hw = Math.round(1 + (y - (3 + oy)) * 0.6);
    p.hline(19 - hw, 18 + hw, y, CLOAK_D);
    if (hw > 1) p.hline(19 - hw + 1, 18 + hw - 1, y, CLOAK_L);
  }
  p.line(18, 3 + oy, 12, 18 + oy, CLOAK_H);                   // lit left slope
  p.line(19, 3 + oy, 25, 18 + oy, FOLD);                      // shaded right slope
  p.hline(13, 24, 18 + oy, CLOAK_D);                          // hood lip shadow

  // ── skull: small, deep in a VOID cavity so the void frames the bone ──
  p.ellipse(18.5, 13 + oy, 6, 5.4, VOID);       // oval cavity, not a hard box
  // socket halos go BEHIND the bone — otherwise the glow swallows the skull
  p.glow(17, 13.5 + oy, 3.4, EYE, 0.4, 3);
  p.glow(22, 13.5 + oy, 3.4, EYE, 0.4, 3);
  p.hline(16, 22, 10 + oy, BONE_L);                           // cranium top-light
  p.hline(16, 22, 11 + oy, BONE);
  p.hline(16, 22, 12 + oy, BONE);
  p.hline(16, 22, 13 + oy, BONE);
  p.hline(16, 22, 14 + oy, BONE);
  p.hline(17, 21, 15 + oy, BONE_D);                           // brow / cheek shade
  p.hline(17, 21, 16 + oy, BONE);                             // jaw
  p.px(18, 16 + oy, BONE_S); p.px(20, 16 + oy, BONE_S);       // tooth gaps
  p.px(19, 15 + oy, BONE_S); p.px(19, 14 + oy, BONE_S);       // nasal void
  p.rect(16, 13 + oy, 2, 2, P.ink); p.rect(21, 13 + oy, 2, 2, P.ink);   // sockets
  p.rect(16, 13 + oy, 2, 2, EYE);   p.rect(21, 13 + oy, 2, 2, EYE);
  p.px(17, 13 + oy, EYE_L); p.px(21, 13 + oy, EYE_L);
  p.px(16, 13 + oy, '#fff'); p.px(22, 13 + oy, '#fff');

  // ── scythe: 2 px shaft up the right flank, blade arcing over the hood ──
  p.rect(32, 6 + oy, 2, 32, SHAFT);
  p.vline(6 + oy, 37 + oy, 32, SHAFT_L);                      // lit shaft edge
  p.px(31, 17 + oy, SHAFT_L); p.px(31, 27 + oy, SHAFT);       // grip bindings
  // crescent blade: thick at the heel, tapering to a point on the far left.
  // ASYMMETRIC on purpose: a thick heel bolted to the shaft on the right, a long
  // sweep to a point on the left. A symmetric arc reads as a halo, not a scythe.
  for (let x = 6; x <= 34; x++) {
    const d = x - 25;
    const yt = 2 + Math.round(d < 0 ? (d * d) / 40 : (d * d) / 20) + oy;   // apex y2: leaves row 0 for the outline on bob frames
    const th = x >= 19 ? 4 : x >= 13 ? 3 : x >= 9 ? 2 : 1;
    p.vline(yt, yt + th - 1, x, STEEL);
    p.px(x, yt, STEEL_L);                                     // lit spine (top-left light)
    p.px(x, yt + th - 1, STEEL_D);                            // shaded back
    p.px(x, yt + th, withAlpha(EDGE, 0.4));                   // hot cutting edge
  }
  p.px(5, 12 + oy, STEEL); p.px(4, 13 + oy, STEEL_D);         // blade point sweeps down
  p.px(34, 6 + oy, P.shardL);                                 // socket gem
  if (f % 2 === 0) p.sparkle(12, 5 + oy, EDGE, 1);
  else p.star4(14, 4 + oy, 2, SPEC, '#fff');

  // ── post-process ──
  p.shadeBottom(0.22, 27);
  p.rimLight(CLOAK_R, 0.45, -1, -1);
  p.outline(P.ink);

  // floating soul-embers (over the outline so they pop)
  p.sparkle(2, 16 - (f % 3) + oy, withAlpha(EYE_L, 0.9), 1);
  p.star4(36, 22 + (f % 2) + oy, 1.6, SPEC, '#fff');
  if (f === 0 || f === 2) p.px(1, 24 + oy, withAlpha(EYE, 0.7));
}, { anchor: [19, 36], fps: 3 });

defineIcon('reaper_icon', '#090a12', (p) => {
  // hooded skull glaring out of the void with a scythe sweep
  p.glow(9, 8, 7, '#1b2348', 0.5, 3);
  p.ellipse(9, 8, 4.8, 5.2, CLOAK_D);
  p.ellipse(9, 8, 4.5, 5, CLOAK);
  p.px(5, 5, CLOAK_H);                           // hood sheen
  p.rect(6, 7, 6, 4, VOID);                      // hood void
  // burning eyes with glow + catch-light
  p.glow(7.5, 8.5, 2.4, EYE, 0.8, 3);
  p.glow(10.5, 8.5, 2.4, EYE, 0.8, 3);
  p.px(7, 8, EYE_L); p.px(10, 8, EYE_L);
  p.px(7, 8, '#fff'); p.px(10, 8, '#fff');
  // scythe: shaft + steel blade with an energy edge
  p.line(2, 2, 3, 14, '#3a2a18');
  p.line(2, 2, 8, 1, STEEL_D);
  p.line(2, 1, 8, 0, '#c6cedb');
  p.px(2, 1, withAlpha(EDGE, 0.9));
  p.sparkle(5, 1, SPEC, 1);
});
