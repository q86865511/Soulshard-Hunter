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
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.2));
  // plate torso w/ vertical sheen
  p.rect(3, 9 + oy, 10, 7, c.cD);
  p.gradV(4, 9 + oy, 8, 6, c.cL, c.cloak);
  p.rect(4, 10 + oy, 8, 4, c.cloak);
  p.hline(4, 11, 10 + oy, c.cL); p.rect(6, 12 + oy, 4, 4, c.trim);   // tabard
  p.px(6, 12 + oy, lighten(c.trim, 0.3));
  p.ellipse(3.5, 9.5 + oy, 2.2, 2, c.cL); p.ellipse(12.5, 9.5 + oy, 2.2, 2, c.cL); // pauldrons
  p.px(2, 9 + oy, P.steelL); p.px(13, 9 + oy, lighten(c.cL, 0.2));   // shoulder glints
  // bucket helm + crest
  p.rect(5, 2 + oy, 6, 7, c.cD); p.rect(5, 2 + oy, 6, 1, c.cL);
  p.px(5, 3 + oy, P.steelL);
  p.rect(5, 6 + oy, 6, 1, P.ink2);                                   // visor band
  p.glow(8, 6 + oy, 2.2, c.eye, 0.5, 3); p.rect(6, 6 + oy, 4, 1, c.eye); p.px(7, 6 + oy, P.glint); // glowing slit
  p.vline(0 + oy, 2 + oy, 8, c.trim); p.px(8, 0 + oy, P.glint);      // plume crest
  p.px(8, 1 + oy, c.cL);
  // sword with an energy edge + glint
  p.vline(2 + oy, 11 + oy, 14, P.steelL); p.vline(1 + oy, 10 + oy, 13, withAlpha(c.eye, 0.5)); // blade aura
  p.hline(13, 15, 9 + oy, c.trim); p.star4(14, 1 + oy, 2, c.eye, P.glint); // pommel kira
  p.ellipse(2, 12 + oy, 2, 2.6, c.cL); p.px(2, 12 + oy, c.trim); p.px(1, 11 + oy, P.steelL); // shield
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
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  // flared robe (triangle) with a vertical sheen
  for (let y = 8 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (8 + oy)) * 0.6; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 1 + (y - (9 + oy)) * 0.5; p.hline(8 - hw, 8 + hw, y, mix(c.cL, c.cloak, (y - (9 + oy)) / 7)); }
  p.hline(3, 12, 16 + oy, c.trim);
  // face + glowing eyes
  p.ellipse(8, 7 + oy, 2.4, 2.4, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2)); // cheek light
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  p.px(7, 9 + oy, mix(c.skin, P.red, 0.35)); p.px(9, 9 + oy, mix(c.skin, P.red, 0.35)); // blush
  // tall pointed wide-brim hat
  p.hline(3, 13, 5 + oy, c.cD); p.hline(4, 12, 4 + oy, c.cloak);
  for (let y = 4 + oy; y >= -1 + oy; y--) { const t = (4 + oy - y); const hw = Math.max(0, 3 - t * 0.7); p.hline(8 - hw, 8 + hw, y, mix(c.cloak, c.cD, t * 0.18)); }
  p.vline(0 + oy, 4 + oy, 8, c.cL);                                  // hat-front sheen
  p.star4(8, -1 + oy, 2, c.eye, P.glint); p.hline(6, 10, 4 + oy, c.trim); // hat tip kira + band
  // orb staff with a glowing gem
  p.vline(7 + oy, 15 + oy, 13, P.wood); p.glow(13, 6 + oy, 3, c.eye, 0.5, 4);
  p.ellipse(13, 6 + oy, 2, 2, c.eye); p.px(12, 5 + oy, P.glint); p.px(13, 6 + oy, P.white);
  rimFinish(p);
});

// ── PYROMANCER — robe, horned flame-crown, fiery wand ──
registerHeroBody('pyromancer', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (9 + oy)) * 0.5; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let y = 10 + oy; y <= 16 + oy; y++) { const hw = 1.5 + (y - (10 + oy)) * 0.4; p.hline(8 - hw, 8 + hw, y, mix(c.cL, c.cloak, (y - (10 + oy)) / 6)); }
  p.ellipse(8, 7 + oy, 2.6, 2.6, c.cD); p.ellipse(8, 7 + oy, 2, 2, P.ink2);
  p.glow(8, 7 + oy, 2.4, P.ember, 0.22, 2);                         // hooded ember glow
  glowEye(p, 6, 7 + oy, c.eye); glowEye(p, 10, 7 + oy, c.eye);      // hooded shadow face + eyes
  // flame crown with hot core + white tips
  p.glow(8, 2 + oy, 4, P.ember, 0.3, 3);
  p.line(5, 5 + oy, 4, 1 + oy, P.ember); p.line(8, 4 + oy, 8, 0 + oy, P.emberL); p.line(11, 5 + oy, 12, 1 + oy, P.ember);
  p.px(4, 2 + oy, P.emberL); p.px(12, 2 + oy, P.emberL);
  p.px(4, 1 + oy, P.white); p.px(8, 0 + oy, P.white); p.px(12, 1 + oy, P.white);
  // wand with a roaring flame tip
  p.vline(8 + oy, 14 + oy, 13, P.woodD); p.glow(13, 6 + oy, 3, P.ember, 0.5, 4);
  p.ellipse(13, 7 + oy, 1.6, 2, P.ember); p.px(13, 6 + oy, P.emberL); p.px(13, 5 + oy, P.white);
  p.sparkle(14, 4 + oy, P.emberL, 1);
  rimFinish(p);
});

// ── WARLOCK — tattered robe, twin horns, sickly aura ──
registerHeroBody('warlock', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, c.cD);
  p.glow(8, 9 + oy, 6, mix(c.eye, P.purple, 0.4), 0.16, 2);          // sickly aura
  for (let y = 8 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (8 + oy)) * 0.45; p.hline(8 - hw, 8 + hw, y, c.cD); }
  // jagged hem
  for (let x = 4; x <= 12; x += 2) p.px(x, 16 + oy, c.cloak);
  p.gradV(5, 9 + oy, 6, 4, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 3, c.cloak); p.px(8, 11 + oy, c.trim);
  p.ellipse(8, 6 + oy, 2.6, 2.6, c.cD); p.ellipse(8, 6 + oy, 2, 2, P.ink2);
  glowEye(p, 6, 6 + oy, c.eye); glowEye(p, 10, 6 + oy, c.eye);
  p.line(5, 4 + oy, 3, 1 + oy, c.trim); p.line(11, 4 + oy, 13, 1 + oy, c.trim); // horns
  p.px(3, 1 + oy, c.cL); p.px(13, 1 + oy, c.cL); p.px(4, 2 + oy, P.glint);
  // hex orb with a pulsing alpha ring
  p.glow(13, 10 + oy, 3, c.eye, 0.45, 4);
  p.ellipse(13, 10 + oy, 1.6, 1.6, c.eye); p.px(13, 10 + oy, P.white);
  p.ring(13, 10 + oy, 2.6, withAlphaSafe(c.eye, 0.6)); p.aura(13, 10 + oy, 3, c.eye, f / 4, 2);
  rimFinish(p);
});
function withAlphaSafe(col, a = 0.55) { return withAlpha(col, a); }

// ── NECROMANCER — bone skull mask, hooded shroud, scythe ──
registerHeroBody('necromancer', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (9 + oy)) * 0.5; p.hline(8 - hw, 8 + hw, y, c.cD); }
  p.gradV(5, 9 + oy, 6, 5, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 4, c.cloak); p.hline(4, 11, 16 + oy, P.bone);
  // hood
  p.ellipse(8, 6 + oy, 3.4, 3.4, c.cD); p.ellipse(8, 5 + oy, 2.6, 2, c.cloak); p.px(6, 4 + oy, c.cL);
  // skull face with glowing sockets
  p.ellipse(8, 7 + oy, 2.2, 2.2, P.bone); p.px(7, 9 + oy, darken(P.bone, 0.2));
  p.glow(7, 7 + oy, 1.4, c.eye, 0.55, 3); p.glow(9, 7 + oy, 1.4, c.eye, 0.55, 3);
  p.px(7, 7 + oy, c.eye); p.px(9, 7 + oy, c.eye); p.px(8, 9 + oy, P.ink2);
  // scythe: pole + curved energy blade
  p.vline(1 + oy, 15 + oy, 13, P.woodD);
  p.line(13, 1 + oy, 10, 2 + oy, P.steelL); p.line(10, 2 + oy, 9, 4 + oy, P.steelL);
  p.line(13, 0 + oy, 10, 1 + oy, withAlpha(c.eye, 0.55)); p.px(13, 0 + oy, P.glint); // blade aura + glint
  p.sparkle(12, 4 + oy, mix(c.eye, P.white, 0.4), 1);
  rimFinish(p);
});

// ── RANGER — peaked hood, longbow, quiver ──
registerHeroBody('ranger', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.1));
  p.rect(4, 9 + oy, 8, 7, c.cD); p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak);
  p.hline(5, 10, 11 + oy, c.cL);
  // quiver on back w/ fletch
  p.rect(11, 8 + oy, 2, 5, c.cD); p.px(11, 7 + oy, c.trim); p.px(12, 7 + oy, c.eye); p.px(11, 6 + oy, P.glint);
  // peaked hood
  p.ellipse(8, 6 + oy, 3, 3, c.cD); p.line(5, 8 + oy, 8, 2 + oy, c.cloak); p.line(11, 8 + oy, 8, 2 + oy, c.cloak);
  p.px(7, 3 + oy, c.cL);                                            // hood peak sheen
  p.rect(6, 6 + oy, 4, 3, P.ink2); glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  // longbow (curved, drawn) on the left + a taut energy string
  p.line(2, 3 + oy, 1, 8 + oy, c.trim); p.line(1, 8 + oy, 2, 13 + oy, c.trim);
  p.line(2, 3 + oy, 2, 13 + oy, withAlphaSafe(c.cL, 0.7));
  p.line(2, 3 + oy, 2, 13 + oy, withAlpha(c.eye, 0.3)); p.px(1, 8 + oy, P.glint);
  rimFinish(p);
});

// ── HUNTER — low hood, scarf, a crossbow held across the chest ──
registerHeroBody('hunter', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  p.rect(4, 9 + oy, 8, 7, c.cD); p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak);
  p.hline(4, 11, 12 + oy, c.trim);                                  // belt
  p.ellipse(8, 6 + oy, 3.2, 3, c.cD); p.ellipse(8, 5 + oy, 2.6, 2, c.cloak); p.px(6, 4 + oy, c.cL); // hood
  p.rect(5, 6 + oy, 6, 3, P.ink2);
  p.glow(6, 7 + oy, 1.5, c.eye, 0.5, 3); p.glow(9, 7 + oy, 1.5, c.eye, 0.5, 3);
  p.rect(5, 7 + oy, 2, 1, c.eye); p.rect(9, 7 + oy, 2, 1, c.eye); p.px(5, 7 + oy, P.glint); p.px(9, 7 + oy, P.glint);
  p.px(6, 9 + oy, c.cL); p.px(9, 9 + oy, c.cL);                     // scarf tips
  // crossbow across the body w/ a charged bolt tip
  p.hline(2, 12, 12 + oy, P.wood); p.line(3, 10 + oy, 3, 14 + oy, c.trim);
  p.glow(12, 12 + oy, 1.8, c.eye, 0.5, 3); p.px(12, 12 + oy, c.eye); p.px(12, 12 + oy, P.glint);
  rimFinish(p);
});

// ── ROGUE — low cowl + face wrap, hunched, twin daggers ──
registerHeroBody('rogue', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.ink2);
  p.rect(4, 10 + oy, 8, 6, c.cD); p.gradV(5, 10 + oy, 6, 5, c.cL, c.cloak); p.rect(5, 11 + oy, 6, 4, c.cloak); // hunched lower body
  p.ellipse(8, 7 + oy, 2.8, 2.6, c.cD); p.px(6, 5 + oy, c.cL);      // cowl + sheen
  p.rect(6, 7 + oy, 4, 2, P.ink2);
  p.glow(6.5, 7 + oy, 1.4, c.eye, 0.5, 3); p.glow(9.5, 7 + oy, 1.4, c.eye, 0.5, 3);
  p.rect(6, 7 + oy, 1.5, 1, c.eye); p.rect(9, 7 + oy, 1.5, 1, c.eye); p.px(6, 7 + oy, P.glint);
  p.hline(5, 11, 9 + oy, c.cD);                                     // face wrap line
  // twin daggers with cool neon edges + flash
  p.line(2, 14 + oy, 4, 10 + oy, P.steelL); p.line(14, 14 + oy, 12, 10 + oy, P.steelL);
  p.line(2, 14 + oy, 4, 10 + oy, withAlpha(P.neon, 0.4)); p.line(14, 14 + oy, 12, 10 + oy, withAlpha(P.neon, 0.4));
  p.px(4, 10 + oy, P.glint); p.px(12, 10 + oy, P.glint); p.star4(4, 9 + oy, 1, P.neonL, P.glint);
  rimFinish(p);
});

// ── SAMURAI — conical kasa hat, side topknot, katana ──
registerHeroBody('samurai', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.ink2);
  p.rect(4, 9 + oy, 8, 7, c.cD); p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak); // kimono
  p.line(8, 9 + oy, 6, 16 + oy, c.cL); p.line(8, 9 + oy, 10, 16 + oy, c.trim); // crossed lapels
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  p.px(7, 9 + oy, mix(c.skin, P.red, 0.3)); p.px(9, 9 + oy, mix(c.skin, P.red, 0.3)); // blush
  // conical kasa hat (wide, low) with a sheen line
  for (let y = 4 + oy; y <= 5 + oy; y++) { const hw = 6 - (y - (4 + oy)) * 1; p.hline(8 - hw, 8 + hw, y, c.cD); }
  p.line(2, 5 + oy, 8, 2 + oy, c.cloak); p.line(14, 5 + oy, 8, 2 + oy, c.cloak); p.px(8, 1 + oy, c.trim);
  p.line(5, 4 + oy, 8, 2 + oy, c.cL);                               // kasa highlight
  // katana on the hip w/ a flashing edge + sakura kira
  p.line(11, 13 + oy, 15, 9 + oy, P.steelL); p.line(11, 13 + oy, 15, 9 + oy, withAlpha(P.sakuraL, 0.0));
  p.line(11, 12 + oy, 15, 8 + oy, withAlpha(c.eye, 0.4)); p.px(15, 8 + oy, P.glint);
  p.rect(10, 13 + oy, 2, 1, c.trim); p.star4(15, 8 + oy, 1, P.sakuraL, P.glint);
  rimFinish(p);
});

// ── BERSERKER — bare horned-helm bruiser, broad shoulders, big axe ──
registerHeroBody('berserker', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  p.glow(8, 8 + oy, 7, P.laser, 0.12, 2);                           // battle-rage aura
  p.rect(3, 9 + oy, 10, 6, mix(c.skin, c.cloak, 0.3));              // broad bare torso
  p.rect(4, 9 + oy, 8, 5, c.skin); p.rect(4, 9 + oy, 8, 1, lighten(c.skin, 0.15)); p.hline(4, 11, 12 + oy, P.woodD); // belt
  p.ellipse(3.5, 9.5 + oy, 2, 1.8, c.skin); p.ellipse(12.5, 9.5 + oy, 2, 1.8, c.skin); // shoulders
  p.px(3, 9 + oy, lighten(c.skin, 0.2));
  p.ellipse(8, 6 + oy, 2.4, 2.2, c.skin); p.px(6, 5 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 6 + oy, c.eye); glowEye(p, 9, 6 + oy, c.eye);
  p.rect(6, 4 + oy, 4, 2, c.cD); p.rect(6, 4 + oy, 4, 1, c.cL);     // horned helm band
  p.line(6, 4 + oy, 4, 1 + oy, c.trim); p.line(10, 4 + oy, 12, 1 + oy, c.trim);
  p.px(4, 1 + oy, P.glint); p.px(12, 1 + oy, P.glint);
  // big two-handed axe over the shoulder w/ a glinting edge
  p.vline(4 + oy, 15 + oy, 13, P.woodD); p.ellipse(13, 5 + oy, 3, 2.4, P.iron); p.rect(11, 4 + oy, 4, 3, P.steelL);
  p.px(11, 4 + oy, P.glint); p.line(15, 3 + oy, 15, 7 + oy, withAlpha(P.laser, 0.5)); // axe-edge energy
  rimFinish(p);
});

// ── GUNNER — wide flat-brim hat, long split coat, rifle ──
registerHeroBody('gunner', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  p.rect(4, 9 + oy, 8, 7, c.cD); p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak);
  p.vline(9 + oy, 16 + oy, 8, c.cD);                                // coat split
  p.rect(6, 10 + oy, 4, 2, c.trim); p.px(6, 10 + oy, lighten(c.trim, 0.3)); // bandolier
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  // wide flat-brim hat
  p.hline(2, 14, 4 + oy, c.cD); p.hline(3, 13, 3 + oy, c.cloak); p.rect(5, 1 + oy, 6, 3, c.cD); p.hline(5, 10, 2 + oy, c.trim);
  p.px(5, 1 + oy, c.cL);                                            // hat crown sheen
  // rifle held diagonally w/ a hot muzzle glow
  p.line(2, 13 + oy, 13, 8 + oy, P.iron); p.line(2, 13 + oy, 13, 9 + oy, P.steelL);
  p.glow(13, 8 + oy, 2.6, P.emberL, 0.5, 3); p.px(13, 8 + oy, P.white); p.rect(3, 12 + oy, 2, 2, P.woodD);
  p.sparkle(14, 7 + oy, P.emberL, 1);
  rimFinish(p);
});

// ── MONK — bald head, simple wrap robe + sash, raised fists, aura ──
registerHeroBody('monk', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.skin);
  p.rect(4, 9 + oy, 8, 7, c.cD); p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak);
  p.line(4, 10 + oy, 11, 13 + oy, c.trim);                          // diagonal sash
  p.ellipse(8, 6 + oy, 2.6, 2.6, c.skin); p.ellipse(8, 5 + oy, 2.2, 1.6, lighten(c.skin, 0.12)); // bald dome
  p.px(7, 4 + oy, lighten(c.skin, 0.25));                           // dome glint
  glowEye(p, 7, 6 + oy, c.eye); glowEye(p, 9, 6 + oy, c.eye);
  p.ellipse(3, 11 + oy, 1.6, 1.6, c.skin); p.ellipse(13, 11 + oy, 1.6, 1.6, c.skin); // fists
  p.glow(3, 11 + oy, 2, c.eye, 0.3, 3); p.glow(13, 11 + oy, 2, c.eye, 0.3, 3);       // chi on fists
  // chi aura + forehead mark
  p.aura(8, 8 + oy, 6, c.eye, f / 4, 2); p.ring(8, 8 + oy, 6, withAlphaSafe(c.eye, 0.5));
  p.px(8, 4 + oy, c.eye); p.px(8, 4 + oy, P.glint);
  rimFinish(p);
});

// ── SHAMAN / STORMCALLER — tall feathered headdress, totem staff, fringe ──
registerHeroBody('shaman', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, P.woodD);
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 2.5 + (y - (9 + oy)) * 0.35; p.hline(8 - hw, 8 + hw, y, c.cD); }
  p.gradV(5, 9 + oy, 6, 5, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 4, c.cloak);
  for (let x = 4; x <= 12; x += 2) p.px(x, 16 + oy, c.trim);        // fringe
  p.ellipse(8, 7 + oy, 2.2, 2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  // feathered headdress
  p.line(5, 5 + oy, 4, 0 + oy, c.trim); p.line(8, 4 + oy, 8, -1 + oy, c.eye); p.line(11, 5 + oy, 12, 0 + oy, c.trim);
  p.px(4, 0 + oy, c.cL); p.px(8, -1 + oy, P.glint); p.px(12, 0 + oy, c.cL); p.hline(5, 11, 5 + oy, c.cD);
  p.star4(8, -1 + oy, 2, c.eye, P.glint);                          // headdress crest kira
  // totem staff with a charged tip
  p.vline(4 + oy, 15 + oy, 13, P.wood); p.glow(13, 4 + oy, 3, c.eye, 0.5, 4);
  p.ellipse(13, 4 + oy, 1.8, 1.8, c.eye); p.px(13, 4 + oy, P.white); p.sparkle(14, 2 + oy, lighten(c.eye, 0.3), 1);
  rimFinish(p);
});

// ── VALKYRIE — winged helm, armor skirt, spear ──
registerHeroBody('valkyrie', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.2));
  p.glow(8, 8 + oy, 6, P.hiSky, 0.14, 2);                           // celestial sheen
  p.rect(4, 9 + oy, 8, 7, c.cD); p.gradV(5, 9 + oy, 6, 6, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 5, c.cloak);
  p.hline(4, 11, 13 + oy, c.trim); p.hline(5, 10, 15 + oy, c.cD);   // armoured skirt
  p.ellipse(3.6, 9.6 + oy, 1.8, 1.6, c.cL); p.ellipse(12.4, 9.6 + oy, 1.8, 1.6, c.cL);
  p.px(3, 9 + oy, P.steelL);
  p.ellipse(8, 6 + oy, 2.2, 2.2, c.cloak); p.rect(6, 6 + oy, 4, 1, P.ink2);
  p.glow(6.5, 6 + oy, 1.3, c.eye, 0.5, 3); p.glow(9.5, 6 + oy, 1.3, c.eye, 0.5, 3);
  p.rect(6, 6 + oy, 1.5, 1, c.eye); p.rect(9, 6 + oy, 1.5, 1, c.eye); p.px(6, 6 + oy, P.glint);
  // winged helm w/ bright feather wings
  p.rect(6, 3 + oy, 4, 3, c.cL); p.px(6, 3 + oy, P.steelL);
  p.line(5, 4 + oy, 2, 2 + oy, P.white); p.line(11, 4 + oy, 14, 2 + oy, P.white);
  p.px(2, 2 + oy, P.hiSky); p.px(14, 2 + oy, P.hiSky);
  // radiant spear
  p.vline(1 + oy, 15 + oy, 13, P.wood); p.line(13, 1 + oy, 13, 3 + oy, P.steelL);
  p.glow(13, 1 + oy, 2.4, P.hiSky, 0.5, 3); p.px(13, 0 + oy, P.white); p.star4(13, 0 + oy, 2, P.rimCool, P.glint);
  rimFinish(p);
});

// ── SCOUT — brimmed cap (not a hood), short recurve bow held FORWARD, side quiver.
//    Distinct from RANGER (peaked hood + drawn longbow on the left). ──
registerHeroBody('scout', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  legs(p, f, oy, darken(c.cD, 0.1));
  p.rect(5, 9 + oy, 6, 7, c.cD); p.gradV(6, 9 + oy, 4, 6, c.cL, c.cloak); p.rect(6, 10 + oy, 4, 5, c.cloak); // light jerkin
  p.hline(5, 10, 12 + oy, c.trim);                                  // belt
  p.rect(11, 9 + oy, 2, 4, c.cD); p.px(12, 8 + oy, c.eye); p.px(12, 7 + oy, P.glint); // side quiver + fletch
  p.ellipse(8, 6 + oy, 2.4, 2.2, c.skin); p.px(6, 5 + oy, lighten(c.skin, 0.2));      // bare face
  glowEye(p, 7, 6 + oy, c.eye); glowEye(p, 9, 6 + oy, c.eye);
  p.px(7, 8 + oy, mix(c.skin, P.red, 0.3)); p.px(9, 8 + oy, mix(c.skin, P.red, 0.3)); // blush
  p.hline(4, 12, 4 + oy, c.cD); p.hline(5, 11, 3 + oy, c.cloak);    // brimmed cap
  p.rect(6, 1 + oy, 4, 2, c.cD); p.px(6, 1 + oy, c.cL); p.px(10, 1 + oy, c.eye); p.px(10, 0 + oy, P.glint); // cap crown + feather
  // short recurve bow held forward on the right + glowing string
  p.line(13, 4 + oy, 14, 8 + oy, c.cL); p.line(14, 8 + oy, 13, 12 + oy, c.cL);
  p.vline(4 + oy, 12 + oy, 12, withAlphaSafe(c.trim, 0.7)); p.vline(4 + oy, 12 + oy, 12, withAlpha(c.eye, 0.3));
  p.px(14, 8 + oy, P.glint);
  rimFinish(p);
});

// ── STORM-PRIEST — a horned circlet + a tall lightning rod staff crackling with
//    sparks. Distinct from SHAMAN (feathered headdress + totem). ──
registerHeroBody('stormpriest', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  for (let y = 9 + oy; y <= 16 + oy; y++) { const hw = 2.2 + (y - (9 + oy)) * 0.45; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let y = 10 + oy; y <= 16 + oy; y++) { const hw = 1.4 + (y - (10 + oy)) * 0.4; p.hline(8 - hw, 8 + hw, y, mix(c.cL, c.cloak, (y - (10 + oy)) / 6)); }
  p.hline(4, 12, 16 + oy, c.trim);
  p.ellipse(8, 7 + oy, 2.3, 2.2, c.skin); p.px(6, 6 + oy, lighten(c.skin, 0.2));
  glowEye(p, 7, 7 + oy, c.eye); glowEye(p, 9, 7 + oy, c.eye);
  // horned circlet w/ a charged centre gem
  p.hline(5, 11, 4 + oy, c.cL); p.line(5, 4 + oy, 4, 1 + oy, c.trim); p.line(11, 4 + oy, 12, 1 + oy, c.trim);
  p.glow(8, 3 + oy, 1.6, c.eye, 0.5, 3); p.px(8, 3 + oy, c.eye); p.px(8, 3 + oy, P.glint);
  p.px(4, 1 + oy, P.glint); p.px(12, 1 + oy, P.glint);
  // lightning rod staff (right), jagged crackling spark at the tip
  p.vline(2 + oy, 15 + oy, 13, P.steel); p.glow(13, 2 + oy, 3, P.neon, 0.45, 4);
  p.line(13, 2 + oy, 12, 0 + oy, P.neonL); p.line(13, 2 + oy, 15, 1 + oy, P.neonL); p.line(13, 2 + oy, 14, 4 + oy, P.neon);
  p.px(13, 2 + oy, P.white); p.sparkle(14, 0 + oy, P.neonL, 1);
  rimFinish(p);
});

// ── VOID-MAGE — a low cowl with a glowing third-eye sigil, a tattered robe, and a
//    floating dark orb cradled in one hand. Distinct from MAGE (tall wide-brim hat). ──
registerHeroBody('voidmage', (p, f, a) => {
  const c = pal(a); const oy = bob(f);
  groundShadow(p, oy);
  for (let y = 8 + oy; y <= 16 + oy; y++) { const hw = 2 + (y - (8 + oy)) * 0.5; p.hline(8 - hw, 8 + hw, y, c.cD); }
  for (let x = 4; x <= 12; x += 2) p.px(x, 16 + oy, c.cloak);       // tattered hem
  p.gradV(5, 9 + oy, 6, 4, c.cL, c.cloak); p.rect(5, 10 + oy, 6, 3, c.cloak); p.px(8, 11 + oy, c.trim);
  p.ellipse(8, 6 + oy, 3, 3, c.cD); p.ellipse(8, 6 + oy, 2.3, 2.2, P.ink2); p.px(6, 4 + oy, c.cL); // deep cowl
  // glowing third-eye sigil
  p.glow(8, 6 + oy, 1.8, c.eye, 0.55, 3); p.px(8, 6 + oy, c.eye); p.px(8, 6 + oy, P.glint);
  p.px(8, 5 + oy, withAlphaSafe(c.cL, 0.8));
  // floating void orb cupped in the right hand w/ an astral aura
  p.glow(13, 10 + oy, 3.2, mix(c.eye, P.astral, 0.5), 0.5, 4);
  p.ellipse(13, 10 + oy, 2, 2, c.cD); p.ellipse(13, 10 + oy, 1.3, 1.3, c.eye); p.px(13, 10 + oy, P.white);
  p.rect(11, 11 + oy, 2, 2, c.cloak);                               // hand under the orb
  p.ring(13, 10 + oy, 3, withAlphaSafe(c.eye, 0.6)); p.aura(13, 10 + oy, 3.4, P.astralL, f / 4, 2);
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
