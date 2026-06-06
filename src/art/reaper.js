// 死神 Reaper — the hidden, killable superboss (E2 / 原#13). A floating hooded
// skeleton trailing a tattered black shroud, burning eyes, scythe in one hand.
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
const CLOAK_D = '#090a12';            // deepest void / shadow
const CLOAK   = '#161a2e';            // core robe
const CLOAK_L = '#2a2f4c';            // lit folds
const CLOAK_R = mix('#2a2f4c', P.rimCool || '#9fd0ff', 0.5); // rim sheen
const VOID    = '#000008';            // absolute black hood interior
// ── bone / steel ──
const BONE    = '#d9d3bd', BONE_L = lighten('#d9d3bd', 22), BONE_D = darken('#d9d3bd', 26);
const STEEL   = '#c6cedb', STEEL_L = lighten('#c6cedb', 26), STEEL_D = '#5a6273';
const SHAFT   = '#3a2a18', SHAFT_L = lighten('#3a2a18', 30);
// ── energy / glow accents ──
const EYE     = '#ff3b2e';            // burning eye core
const EYE_L   = mix('#ff3b2e', '#ffd0a0', 0.6);
const EDGE    = mix(P.laser || '#ff4d6d', '#ffffff', 0.15); // scythe energy edge
const SPEC    = P.astralL || '#cfe6ff';

defineAnim('reaper', 34, 46, 4, (p, f) => {
  // per-frame motion: gentle vertical bob + a phase for auras / flames
  const bob = (f === 1 || f === 3) ? 1 : 0;
  const oy = -bob;
  const phase = f / 4;                          // 0..1 around the loop
  const flick = (f === 1 || f === 2) ? 1 : 0;   // shroud wind sway

  // ── ground contact: translucent spectral pool ──
  p.softShadow(17, 42 + oy, 13, 3, 0.5);
  p.softShadow(17, 42 + oy, 8, 2, 0.35);

  // ── spectral aura behind the figure (pulsing) ──
  p.aura(17, 22 + oy, 16, withAlpha(P.astral || '#5e7bff', 0.4), phase, 2);
  p.glow(17, 20 + oy, 14, withAlpha('#1b2348', 0.5), 0.7, 4);

  // ── tattered, flowing shroud hem (floats — no legs) ──
  for (let i = 0; i < 9; i++) {
    const tx = 4 + i * 3;
    const sway = Math.round(Math.sin((i * 0.9) + phase * 6.28) * flick);
    const base = 33 + oy;
    const tlen = 39 + ((i + f) % 3) + oy + (i % 2);
    // wisp shadow then lit core for a sense of depth in each tatter
    p.vline(base, tlen, tx + sway, CLOAK_D);
    if (i % 2 === 0) p.px(tx + sway, base + 1, CLOAK_L);
    // ghostly trailing tip
    p.px(tx + sway, tlen, withAlpha(CLOAK_R, 0.6));
  }

  // ── robe body (broad trapezoid, gradient core) ──
  const top = 16 + oy, bot = 38 + oy;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(4 + t * 10);
    p.hline(17 - hw, 17 + hw, y, CLOAK_D);
  }
  for (let y = top + 1; y <= bot - 2; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(2 + t * 6);
    // vertical gradient: lighter up top, sinking to void at the hem
    const col = mix(CLOAK_L, CLOAK, t);
    p.hline(17 - hw, 17 + hw, y, col);
  }
  // inner shadow gutters to read the cloth folds
  for (let y = top + 3; y <= bot - 3; y += 2) {
    p.px(14, y, CLOAK_D); p.px(20, y, CLOAK_D);
  }
  // lit left edge (top-left light)
  for (let y = top + 1; y <= bot - 3; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(2 + t * 6);
    p.px(17 - hw, y, mix(CLOAK_L, CLOAK_R, 0.4));
  }
  p.hline(7, 27, bot - 1, CLOAK_L);             // hem trim
  p.hline(8, 26, bot, CLOAK_D);                 // hem under-shadow
  // subtle cloth texture specks (seeded — deterministic bake)
  p.speckle(11, top + 4, 12, 16, withAlpha(CLOAK_L, 0.5), 6, 7 + f);

  // ── sleeves / bony hands ──
  p.rect(4, 20 + oy, 3, 9, CLOAK_D);
  p.rect(27, 20 + oy, 3, 9, CLOAK_D);
  p.px(4, 21 + oy, CLOAK_L);                     // sleeve sheen
  p.px(27, 21 + oy, CLOAK);
  // skeletal hands
  p.ellipse(5, 29 + oy, 1.8, 1.8, BONE);
  p.px(4, 28 + oy, BONE_L); p.px(5, 30 + oy, BONE_D);
  p.ellipse(29, 29 + oy, 1.8, 1.8, BONE);
  p.px(28, 28 + oy, BONE_L); p.px(29, 30 + oy, BONE_D);

  // ── hooded skull ──
  p.ellipse(17, 11 + oy, 7, 8, CLOAK_D);        // hood outer
  p.ellipse(17, 10 + oy, 5.4, 6.2, CLOAK);      // hood inner
  p.px(12, 8 + oy, CLOAK_L); p.px(13, 6 + oy, CLOAK_R);  // hood crest sheen
  p.rect(13, 9 + oy, 9, 7, VOID);               // hood void
  p.ellipse(13.5, 8 + oy, 1.2, 2.4, withAlpha(VOID, 0.9)); // deepen left interior
  // skull
  p.ellipse(17, 12 + oy, 3.4, 3.7, BONE);
  p.ellipse(17, 11 + oy, 2.6, 2.4, BONE_L);     // forehead highlight
  p.px(14, 13 + oy, BONE_D); p.px(20, 13 + oy, BONE_D); // cheek shade
  // burning eyes — glow then core then white catch-light
  p.glow(15.5, 11.5 + oy, 3.2, withAlpha(EYE, 0.9), 0.95, 4);
  p.glow(19.5, 11.5 + oy, 3.2, withAlpha(EYE, 0.9), 0.95, 4);
  p.rect(15, 11 + oy, 2, 2, EYE_L);
  p.rect(19, 11 + oy, 2, 2, EYE_L);
  p.px(15, 11 + oy, '#fff');
  p.px(20, 11 + oy, '#fff');
  p.px(17, 14 + oy, P.ink);                      // nasal void
  // skull seam / teeth hint
  p.px(16, 15 + oy, BONE_D); p.px(18, 15 + oy, BONE_D);

  // ── scythe: shaft up the left, blade arcing across the top ──
  // shaft with a lit edge
  p.line(5, 7 + oy, 7, 40 + oy, SHAFT);
  p.line(4, 8 + oy, 6, 39 + oy, SHAFT_L);       // shaft highlight
  // steel blade — under-tone then bright steel
  p.line(5, 7 + oy, 14, 4 + oy, STEEL_D);
  p.line(14, 4 + oy, 19, 9 + oy, STEEL_D);
  p.line(5, 6 + oy, 14, 3 + oy, STEEL);
  p.line(14, 3 + oy, 19, 8 + oy, STEEL);
  // hot energy edge along the cutting curve
  p.line(5, 5 + oy, 14, 2 + oy, withAlpha(EDGE, 0.85));
  p.line(14, 2 + oy, 19, 7 + oy, withAlpha(EDGE, 0.85));
  // blade socket + specular glints
  p.px(5, 7 + oy, P.shardL);
  p.px(14, 3 + oy, STEEL_L);
  p.px(8, 4 + oy, '#fff');
  // energy sparks drifting off the tip (alternating frames)
  if (f % 2 === 0) p.sparkle(15, 2 + oy, EDGE, 1);
  else p.star4(13, 3 + oy, 2, SPEC, '#fff');

  // ── post-process: rim light then crisp read ──
  p.rimLight(CLOAK_R, 0.5, -1, -1);
  p.outline(P.ink);

  // floating soul-embers around the boss (drawn over outline so they pop)
  const e1 = 6 + (f % 4);
  p.sparkle(27, 16 - e1 % 3 + oy, withAlpha(EYE_L, 0.9), 1);
  p.star4(8, 22 + (f % 2) + oy, 1.6, withAlpha(SPEC, 0.85), '#fff');
  if (f === 0 || f === 2) p.px(24, 24 + oy, withAlpha(EYE, 0.7));
}, { anchor: [17, 40], fps: 3 });

defineIcon('reaper_icon', '#090a12', (p) => {
  // hooded skull glaring out of the void with a scythe sweep
  p.glow(9, 8, 7, withAlpha('#1b2348', 0.6), 0.7, 3);
  p.ellipse(9, 8, 4.8, 5.2, '#090a12');
  p.ellipse(9, 8, 4.5, 5, '#161a2e');
  p.px(5, 5, '#2a2f4c');                         // hood sheen
  p.rect(6, 7, 6, 4, '#000008');                 // hood void
  // burning eyes with glow + catch-light
  p.glow(7.5, 8.5, 2.4, withAlpha(EYE, 0.9), 0.9, 3);
  p.glow(10.5, 8.5, 2.4, withAlpha(EYE, 0.9), 0.9, 3);
  p.px(7, 8, EYE_L); p.px(10, 8, EYE_L);
  p.px(7, 8, '#fff'); p.px(10, 8, '#fff');
  // scythe: shaft + steel blade with an energy edge
  p.line(2, 2, 3, 14, '#3a2a18');
  p.line(2, 2, 8, 1, STEEL_D);
  p.line(2, 1, 8, 0, '#c6cedb');
  p.px(2, 1, withAlpha(EDGE, 0.9));
  p.sparkle(5, 1, SPEC, 1);
});
