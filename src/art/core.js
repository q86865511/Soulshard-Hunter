// Core hand-authored procedural sprites: hero, starter enemies, projectiles,
// pickups and dungeon tiles. Establishes the visual language (palette + outline +
// soft shading) that all content art follows.
//
// ENHANCED EDITION (art_v2) — "魂晶獵手 / Soulshard Hunter" glow-up.
// Same exports + same defineSprite/defineAnim contracts (names, sizes, anchors,
// fps) as the original, but the draw bodies are rebuilt around a committed
// top-left light source, 3–4 tonal steps per material, anime-style glowing eyes,
// cloth/hair sheen, energy VFX, soft ground shadows and "kira" sparkles. Every
// drawn helper keeps its original signature + defaults so downstream gen packs
// that import drawHunter/drawSlime/drawBat/drawWisp/drawBrute keep working.

import { defineSprite, defineAnim, Painter } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ---------------------------------------------------------------------------
// HERO — an anime hooded shard-hunter. 16x18, feet anchored.
//   • glowing eyes w/ white catch-light  • cloak sheen + neon hem trim
//   • spiky hair tuft  • rim light + grounded soft shadow.
// ---------------------------------------------------------------------------
export function drawHunter(p, frame, opt = {}) {
  const cloak = opt.cloak ?? P.shard;
  const cloakD = opt.cloakD ?? P.shardD;
  const cloakL = opt.cloakL ?? P.shardL;
  const trim = opt.trim ?? P.gold;
  const eye = opt.eye ?? P.emberL;
  const skin = opt.skin ?? P.skin;

  const bob = (frame === 1 || frame === 3) ? 1 : 0;     // 1px breathing/run bob
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;  // leg swing
  const oy = -bob;

  // grounded contact shadow (kept clear of feet so silhouette stays crisp)
  p.softShadow(8, 17, 4.5, 1.4, 0.34);

  // boots / legs — 3 tonal steps + a swing accent on the lead foot
  p.rect(4, 16 + oy, 3, 2, P.woodD);
  p.rect(9, 16 + oy, 3, 2, P.woodD);
  p.hline(4, 6, 16 + oy, P.woodL);
  p.hline(9, 11, 16 + oy, P.woodL);
  if (step > 0) { p.rect(4, 17 + oy, 3, 1, darken(P.woodD, 0.25)); p.px(6, 16 + oy, trim); }
  if (step < 0) { p.rect(9, 17 + oy, 3, 1, darken(P.woodD, 0.25)); p.px(9, 16 + oy, trim); }

  // cloak body (trapezoid) with a vertical sheen gradient on the front panel
  const top = 9 + oy, bot = 16 + oy;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(3 + t * 3);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  // lit front panel — graded so it reads as flowing cloth (top brighter)
  for (let y = top + 1; y <= bot - 1; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(1 + t * 2.2);
    const col = mix(cloakL, cloak, t);
    p.hline(8 - hw, 7 + hw, y, col);
  }
  // left-edge shadow fold + right specular sheen ribbon
  p.vline(top + 1, bot - 1, 8 - Math.round(1 + 0.6 * 2.2) - 1, darken(cloakD, 0.18));
  p.px(9, top + 2, cloakL); p.px(9, top + 3, lighten(cloakL, 0.2));
  // neon hem trim + a couple of glints
  p.hline(3, 12, bot - 1, trim);
  p.px(3, bot - 1, lighten(trim, 0.3)); p.px(12, bot - 1, darken(trim, 0.2));
  p.px(7, top + 2, cloakL); p.px(8, top + 2, cloakL);

  // hood / head — domed with a crown light
  p.ellipse(7.5, 6 + oy, 5, 5, cloakD);
  p.ellipse(7.5, 5 + oy, 4, 4, cloak);
  p.ellipse(7.5, 3 + oy, 3, 2, cloakL);     // top light
  p.px(6, 2 + oy, lighten(cloakL, 0.25)); p.px(9, 2 + oy, cloakL);
  // spiky hair tuft peeking from the hood
  p.px(8, 1 + oy, mix(P.ink2, cloakD, 0.4));
  p.px(9, 2 + oy, mix(skin, P.woodD, 0.5));

  // face shadow (deep hood interior)
  p.rect(5, 6 + oy, 6, 4, P.ink2);
  p.ellipse(7.5, 8 + oy, 3, 2, P.ink2);
  // a hint of cheek skin + tiny anime blush
  p.px(6, 9 + oy, mix(skin, P.ink2, 0.5));
  p.px(10, 9 + oy, mix(skin, P.ink2, 0.5));

  // BIG glowing eyes — soft halo + bright body + white catch-light
  p.glow(5.5, 8 + oy, 2, eye, 0.5, 3);
  p.glow(10.5, 8 + oy, 2, eye, 0.5, 3);
  p.rect(5, 8 + oy, 2, 1, eye);
  p.rect(9, 8 + oy, 2, 1, eye);
  p.px(5, 8 + oy, lighten(eye, 0.45)); p.px(10, 8 + oy, lighten(eye, 0.45));
  p.px(6, 8 + oy, P.white); p.px(9, 8 + oy, P.white);   // catch-lights

  // arms (subtle) with a lit outer edge
  p.rect(2, 11 + oy, 2, 3, cloakD);
  p.rect(12, 11 + oy, 2, 3, cloakD);
  p.vline(11 + oy, 13 + oy, 2, mix(cloak, cloakL, 0.4));
  p.vline(11 + oy, 13 + oy, 13, mix(cloak, cloakL, 0.4));

  // belt, chest stud, and a few palette-derived accents
  p.hline(4, 11, 14 + oy, darken(P.wood, 0.15));
  p.px(7, 12 + oy, trim); p.px(8, 12 + oy, trim);
  p.px(10, 4 + oy, cloakL); p.px(11, 5 + oy, cloakL);
  p.px(4, 6 + oy, mix(cloak, P.ink2, 0.4));
  // tiny shard talisman glint on the chest
  p.px(8, 11 + oy, lighten(trim, 0.35));
}

// Hero body registry (原#17): a character can register a UNIQUE body silhouette
// (helmet / hat / mask, build, weapon) instead of a recoloured hunter. The palette
// art = { cloak, cloakD, cloakL, trim, eye, skin } still drives colours, so each hero
// reads distinctly even within a shared archetype. Falls back to drawHunter.
export const HERO_ART = {};
export function registerHeroBody(id, fn) { HERO_ART[id] = fn; }
export function drawHeroBody(p, frame, id, art = {}) { (HERO_ART[id] || drawHunter)(p, frame, art); }

function weaponWand(p, frame, oy) {
  // a short staff with a glowing shard, on the right hand + a swirling spark VFX
  const ph = frame / 4;
  p.line(12, 13 + oy, 15, 9 + oy, P.wood);
  p.px(12, 13 + oy, P.woodL);
  // shard head with soft glow
  p.glow(15, 8 + oy, 3, P.shardL, 0.5, 3);
  p.rect(14, 8 + oy, 2, 2, P.shard);
  p.px(14, 8 + oy, P.shardL);
  p.px(15, 7 + oy, P.white);
  // orbiting energy mote (per-frame)
  const ax = 15 + Math.round(Math.cos(ph * Math.PI * 2) * 2);
  const ay = 8 + oy + Math.round(Math.sin(ph * Math.PI * 2) * 2);
  p.px(ax, ay, withAlpha(P.shardL, 0.85));
}

defineAnim('player', 16, 18, 4, (p, f) => {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  drawHunter(p, f);
  weaponWand(p, f, oy);
  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  // a kira sparkle near the weapon shard on the "up" frames for flair
  if (f === 0 || f === 2) p.star4(15, 6 + oy, 2, P.shardL, P.white);
}, { anchor: [8, 17], fps: 9 });

// a generic NPC/townsfolk reusing the hunter base in warm colours (for the hub)
defineAnim('npc_smith', 16, 18, 2, (p, f) => {
  drawHunter(p, f, { cloak: P.leather, cloakD: P.woodD, cloakL: P.woodL, trim: P.bronze, eye: P.emberL });
  // hammer with a steel highlight
  p.line(12, 13, 14, 10, P.wood); p.rect(13, 8, 3, 3, P.steel);
  p.rect(13, 8, 3, 1, P.steelL);
  // a few forge sparks
  if (f === 1) { p.px(15, 7, P.emberL); p.px(14, 6, P.ember); }
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// ---------------------------------------------------------------------------
// ENEMY: SLIME — juicy gradient blob, 16x14, 4 frames squash/stretch.
//   • vertical body gradient + glossy shine  • cute big glowing eyes.
// ---------------------------------------------------------------------------
export function drawSlime(p, frame, body = P.green, bodyD = P.greenD, bodyL = P.greenL, eye = P.white) {
  const squashTable = [0, 1, 2, 1];
  const s = squashTable[frame % 4];
  const cy = 9 + s * 0.5;
  const rx = 6 + s * 0.6;
  const ry = 5 - s * 0.6;

  // grounded shadow that squashes with the body
  p.softShadow(8, Math.round(cy + ry - 0.5), rx, 1.3, 0.32);

  // body: dark base -> gradient core -> bright crown highlight
  p.ellipse(8, cy, rx, ry, bodyD);
  // graded core (top brighter than bottom for a gel look)
  const iy = Math.ceil(ry - 1);
  for (let y = -iy; y <= iy; y++) {
    const w = Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) * (rx - 1);
    const t = (y + iy) / (2 * iy || 1);
    p.hline(Math.round(8 - w), Math.round(8 + w), Math.round(cy - 0.5 + y), mix(bodyL, body, t * 0.9 + 0.1));
  }
  p.ellipse(7, cy - 1.5, rx - 3, ry - 2.5, bodyL);   // crown highlight
  // glossy specular shine spot (anime gel)
  p.px(6, Math.round(cy - 2.5), P.white);
  p.px(7, Math.round(cy - 2.5), withAlpha(P.white, 0.7));
  // bottom inner shade for volume
  p.hline(8 - rx + 1, 7 + rx - 1, Math.round(cy + ry - 1), darken(bodyD, 0.15));

  // cute eyes — soft glow halo + white sclera + dark glossy pupil + catch-light
  p.glow(6, Math.round(cy - 0.5), 2, lighten(body, 0.3), 0.35, 3);
  p.glow(11, Math.round(cy - 0.5), 2, lighten(body, 0.3), 0.35, 3);
  p.rect(5, Math.round(cy - 1), 2, 2, eye);
  p.rect(10, Math.round(cy - 1), 2, 2, eye);
  p.px(6, Math.round(cy), P.ink); p.px(11, Math.round(cy), P.ink);
  p.px(5, Math.round(cy - 1), P.white); p.px(10, Math.round(cy - 1), P.white);
  // little smile
  p.px(8, Math.round(cy + 1), P.ink);
  p.px(7, Math.round(cy + 1.5), P.ink); p.px(9, Math.round(cy + 1.5), P.ink);
}
defineAnim('slime', 16, 14, 4, (p, f) => {
  drawSlime(p, f);
  p.rimLight(P.rimCool, 0.45);
  p.outline(P.ink);
}, { anchor: [8, 13], fps: 6 });

// ---------------------------------------------------------------------------
// ENEMY: BAT — flapping, 16x12, 2 frames. Glowing eyes + membrane sheen.
// ---------------------------------------------------------------------------
export function drawBat(p, frame, body = P.purple, bodyD = P.purpleD, eye = P.emberL) {
  const up = frame % 2 === 0;
  // faint contact shadow
  p.softShadow(8, 11, 4, 1, 0.22);
  // body — domed with a top light
  p.ellipse(8, 7, 2.5, 3, bodyD);
  p.ellipse(8, 6, 2, 2, body);
  p.px(7, 5, lighten(body, 0.35));    // crown light
  // ears
  p.px(6, 3, bodyD); p.px(10, 3, bodyD);
  p.px(6, 4, body); p.px(10, 4, body);
  p.px(6, 3, mix(body, P.ink2, 0.4));
  // BIG glowing eyes + white catch-light
  p.glow(7, 6, 1.6, eye, 0.5, 3);
  p.glow(9, 6, 1.6, eye, 0.5, 3);
  p.px(7, 6, eye); p.px(9, 6, eye);
  p.px(7, 5, lighten(eye, 0.4)); p.px(9, 5, lighten(eye, 0.4));
  // tiny fang
  p.px(8, 8, withAlpha(P.white, 0.8));
  // wings — dark membrane with a brighter inner panel + a leading-edge sheen
  if (up) {
    p.line(6, 6, 1, 3, bodyD); p.line(1, 3, 5, 7, bodyD);
    p.line(10, 6, 15, 3, bodyD); p.line(15, 3, 11, 7, bodyD);
    p.ellipse(3, 5, 2, 1.5, body); p.ellipse(13, 5, 2, 1.5, body);
    p.px(2, 4, lighten(body, 0.3)); p.px(13, 4, lighten(body, 0.3));
  } else {
    p.line(6, 7, 1, 9, bodyD); p.line(1, 9, 5, 8, bodyD);
    p.line(10, 7, 15, 9, bodyD); p.line(15, 9, 11, 8, bodyD);
    p.ellipse(3, 8, 2, 1.5, body); p.ellipse(13, 8, 2, 1.5, body);
    p.px(2, 8, lighten(body, 0.3)); p.px(13, 8, lighten(body, 0.3));
  }
}
defineAnim('bat', 16, 12, 2, (p, f) => {
  drawBat(p, f);
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
}, { anchor: [8, 8], fps: 8 });

// ---------------------------------------------------------------------------
// PROJECTILES — glowing energy motes with white-hot cores + sparks.
// ---------------------------------------------------------------------------
defineSprite('bolt', 8, 8, (p) => {
  p.glow(4, 4, 4, P.shardL, 0.5, 4);
  p.ellipse(4, 4, 2.5, 2.5, P.shard);
  p.ellipse(4, 4, 1.5, 1.5, P.shardL);
  p.px(4, 4, P.white);
  // trailing spark glints
  p.px(1, 3, withAlpha(P.shardL, 0.8)); p.px(6, 5, withAlpha(P.white, 0.7));
}, { anchor: [4, 4] });

defineSprite('bolt_enemy', 8, 8, (p) => {
  p.glow(4, 4, 4, P.red, 0.5, 4);
  p.ellipse(4, 4, 2.5, 2.5, P.redD);
  p.ellipse(4, 4, 1.5, 1.5, P.red);
  p.px(4, 4, P.redL);
  p.px(3, 3, P.emberL);
  p.px(1, 4, withAlpha(P.redL, 0.75)); p.px(6, 3, withAlpha(P.redL, 0.6));
}, { anchor: [4, 4] });

defineSprite('spark', 6, 6, (p) => {
  p.glow(3, 3, 3, P.emberL, 0.5, 3);
  p.star4(3, 3, 2, P.emberL, P.white);
  p.rect(2, 2, 2, 2, P.white);
}, { anchor: [3, 3] });

// ---------------------------------------------------------------------------
// PICKUPS — all get a soft glow + a kira sparkle so loot reads as desirable.
// ---------------------------------------------------------------------------
defineAnim('coin', 8, 9, 4, (p, f) => {
  const w = [3, 2, 1, 2][f];
  p.glow(4, 4.5, 4, P.goldL, 0.4, 3);
  p.ellipse(4, 4.5, w, 3.5, P.goldD);
  p.ellipse(4, 4.5, Math.max(0.5, w - 1), 2.8, P.gold);
  if (w >= 2) {
    p.px(4 - Math.floor(w / 2), 3, P.goldL);
    p.px(4 - Math.floor(w / 2) + 1, 2, lighten(P.goldL, 0.2));
  }
  // engraved shine band when face-on
  if (w >= 3) p.vline(3, 6, 4, lighten(P.gold, 0.2));
  p.outline(P.ink);
  // rotating glint
  if (f === 0) p.star4(6, 2, 2, P.goldL, P.white);
}, { anchor: [4, 8], fps: 8 });

defineAnim('shard', 8, 11, 2, (p, f) => {
  // ambient soul glow behind the crystal
  p.glow(4, 5, 4, P.shardL, 0.45, 4);
  p.line(4, 0, 4, 10, P.shardD);
  // crystal body (faceted diamond) — dark edge, body, bright spine
  p.ellipse(4, 5, 2.6, 4.5, P.shardD);
  p.ellipse(4, 5, 1.6, 3.5, P.shard);
  p.line(4, 1, 4, 9, P.shardL);                  // bright central spine
  p.px(3, 4, mix(P.shard, P.shardL, 0.6));        // left facet light
  p.px(5, 6, darken(P.shardD, 0.1));              // right facet shade
  p.px(4, 2, P.white);                            // top glint
  p.px(3, 3 + f, P.white);                        // animated sparkle
  p.outline(P.ink);
  if (f === 0) p.star4(6, 3, 2, P.shardL, P.white);
}, { anchor: [4, 10], fps: 3 });

defineAnim('heart', 9, 9, 2, (p, f) => {
  const c = f === 0 ? P.red : P.redL;
  const cl = lighten(c, 0.25);
  p.glow(4, 4, 4, P.redL, 0.4, 3);
  p.ellipse(3, 3, 2, 2, c); p.ellipse(6, 3, 2, 2, c);
  for (let y = 3; y <= 7; y++) { const w = 4 - (y - 3); p.hline(4.5 - w, 3.5 + w, y, c); }
  // glossy top-left highlight (anime candy heart)
  p.px(2, 2, cl); p.px(5, 2, cl);
  p.px(2, 3, P.white); p.px(3, 2, withAlpha(P.white, 0.8));
  p.outline(P.ink);
  if (f === 1) p.star4(7, 2, 1, P.redL, P.white);
}, { anchor: [4, 8], fps: 3 });

defineAnim('xp', 6, 6, 3, (p, f) => {
  const c = [P.manaL, P.mana, P.blueL][f];
  p.glow(3, 3, 3, c, 0.5, 3);
  p.ellipse(3, 3, 2, 2, P.manaL);
  p.ellipse(3, 3, 1.2, 1.2, c);
  p.px(3, 3, P.white);
  p.px(2, 2, lighten(c, 0.3));
}, { anchor: [3, 3], fps: 8 });

defineSprite('chest', 16, 14, (p) => {
  p.softShadow(8, 13, 6.5, 1.2, 0.3);
  // body — graded wood with grain
  p.rect(2, 6, 12, 7, P.woodD);
  p.gradV(3, 7, 10, 5, P.woodL, P.wood);
  p.hline(3, 12, 9, darken(P.wood, 0.12));       // plank seam
  // domed lid with a top light edge
  p.rect(2, 4, 12, 3, P.woodL);
  p.rect(2, 4, 12, 1, lighten(P.woodL, 0.25));
  // gold lockplate with a glint + soft glow
  p.glow(8, 6, 2.5, P.goldL, 0.35, 3);
  p.rect(7, 5, 2, 4, P.gold);
  p.px(7, 7, P.goldD); p.px(8, 7, P.goldL);
  p.px(8, 5, lighten(P.goldL, 0.2));
  // metal corner bands w/ studs
  p.vline(4, 12, 4, P.bronze); p.vline(4, 12, 11, P.bronze);
  p.px(4, 5, lighten(P.bronze, 0.3)); p.px(11, 5, lighten(P.bronze, 0.3));
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  p.star4(12, 4, 2, P.goldL, P.white);
}, { anchor: [8, 13] });

defineSprite('stairs', 20, 18, (p) => {
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 3;
    p.rect(2 + i * 2, y, 16 - i * 4, 3, i % 2 ? P.wallD : P.wall);
    p.hline(2 + i * 2, 17 - i * 2, y, P.wallL);          // lit step nose
    p.hline(2 + i * 2, 17 - i * 2, y + 2, darken(P.wallD, 0.15)); // riser shade
  }
  // a hint of glow rising from the depths
  p.glow(10, 14, 5, P.mana, 0.2, 3);
  p.outline(P.ink);
}, { anchor: [10, 17] });

defineSprite('portal', 18, 20, (p) => {
  // swirling void gateway with a luminous astral core
  p.glow(9, 11, 9, P.astral, 0.3, 4);
  p.ellipse(9, 11, 6, 9, P.purpleD);
  p.ellipse(9, 11, 4.5, 7.5, P.purple);
  p.ellipse(9, 11, 3, 6, P.manaL);
  p.ellipse(9, 11, 1.6, 4, P.white);
  // spiral energy filaments
  p.px(9, 3, P.astralL); p.px(13, 7, P.manaL); p.px(14, 13, P.astralL);
  p.px(9, 19, P.astralL); p.px(5, 14, P.manaL); p.px(4, 8, P.astralL);
  p.outline(P.ink);
  // kira sparkles around the rim
  p.star4(13, 5, 2, P.astralL, P.white);
  p.star4(5, 16, 1, P.manaL, P.white);
}, { anchor: [9, 19] });

// ---------------------------------------------------------------------------
// DUNGEON TILES (16x16). Floor variants for texture + wall pieces. Kept SUBTLE
// so they tile cleanly and never fight the characters — just a touch more depth.
// ---------------------------------------------------------------------------
function floorBase(p, tintCol, tintLine) {
  // gentle vertical gradient (top a hair lighter) for ambient depth
  p.gradV(0, 0, 16, 16, lighten(tintCol, 0.05), darken(tintCol, 0.04));
  // subtle inner bevel + grout lines
  p.hline(0, 15, 0, lighten(tintCol, 0.1));
  p.hline(0, 15, 15, tintLine);
  p.vline(0, 15, 15, tintLine);
  p.vline(0, 15, 0, lighten(tintCol, 0.06));
}
defineSprite('floor', 16, 16, (p) => {
  floorBase(p, P.floor, P.floorLine);
  // scattered specks (seeded so the bake is deterministic)
  p.px(4, 5, P.floor2); p.px(11, 9, P.floor2); p.px(7, 12, darken(P.floor, 0.2));
  p.speckle(1, 1, 14, 14, lighten(P.floor, 0.06), 5, 7);
}, { anchor: [0, 0] });
defineSprite('floor2', 16, 16, (p) => {
  floorBase(p, P.floor2, P.floorLine);
  p.px(3, 3, P.floor); p.px(9, 6, darken(P.floor2, 0.15)); p.px(12, 12, P.floor);
  // a worn flagstone with a lit top edge
  p.rect(6, 8, 3, 2, darken(P.floor2, 0.1));
  p.hline(6, 8, 8, lighten(P.floor2, 0.08));
  p.speckle(1, 1, 14, 14, lighten(P.floor2, 0.05), 4, 13);
}, { anchor: [0, 0] });
defineSprite('floor_crack', 16, 16, (p) => {
  floorBase(p, P.floor, P.floorLine);
  // crack with a thin lit lip so it reads as recessed
  p.line(3, 2, 6, 8, P.floorLine); p.line(6, 8, 5, 13, P.floorLine); p.line(6, 8, 11, 10, P.floorLine);
  p.px(4, 3, lighten(P.floor, 0.1)); p.px(7, 9, lighten(P.floor, 0.1));
}, { anchor: [0, 0] });

defineSprite('wall', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, P.wallD);
  p.rect(0, 0, 16, 16, P.wall);
  // brick courses (subtle tonal variation)
  p.rect(0, 0, 16, 5, P.wall);
  p.rect(0, 6, 16, 5, darken(P.wall, 0.08));
  p.rect(0, 12, 16, 4, P.wall);
  p.hline(0, 15, 5, P.wallD); p.hline(0, 15, 11, P.wallD);
  p.vline(0, 5, 8, P.wallD); p.vline(6, 11, 4, P.wallD); p.vline(6, 11, 12, P.wallD); p.vline(12, 15, 8, P.wallD);
  // mortar highlight under each course nose + top light edge
  p.hline(0, 15, 6, lighten(P.wall, 0.06));
  p.hline(0, 15, 12, lighten(P.wall, 0.06));
  p.hline(0, 15, 0, P.wallL);
  // a faint speck of grime so big walls don't look flat
  p.speckle(1, 1, 14, 14, darken(P.wall, 0.12), 5, 21);
}, { anchor: [0, 0] });

// the front-facing top edge of a wall, drawn one tile high above floor for depth
defineSprite('wall_top', 16, 8, (p) => {
  p.rect(0, 0, 16, 8, darken(P.wallD, 0.2));
  p.rect(0, 0, 16, 2, P.wallL);
  p.rect(0, 2, 16, 1, P.wall);
  // soft graded face so the cap reads as catching the light
  p.gradV(0, 3, 16, 5, darken(P.wallD, 0.16), darken(P.wallD, 0.28));
  for (let x = 2; x < 16; x += 5) { p.vline(3, 7, x, darken(P.wallD, 0.3)); }
  p.hline(0, 15, 0, lighten(P.wallL, 0.12));
}, { anchor: [0, 0] });

// decorative wall torch (animated) — layered flame w/ glowing halo + embers
defineAnim('torch', 12, 18, 3, (p, f) => {
  p.rect(5, 8, 2, 8, P.wood);
  p.rect(5, 8, 1, 8, P.woodL);
  p.rect(4, 14, 4, 2, P.woodD);
  const fl = [0, 1, -1][f];
  // warm light pool around the flame
  p.glow(6, 4 + fl * 0.4, 6, P.ember, 0.4, 4);
  // flame: outer ember -> mid -> white-hot core
  p.ellipse(6, 5 + fl * 0.4, 2.5, 3.5, P.ember);
  p.ellipse(6, 4 + fl * 0.4, 1.6, 2.4, P.emberL);
  p.ellipse(6, 3 + fl * 0.4, 0.8, 1.2, P.white);
  p.px(6, 1 + fl * 0.4, withAlpha(P.emberL, 0.8));  // flickering tip
  // drifting embers (per-frame)
  if (f === 1) p.px(8, 2, withAlpha(P.emberL, 0.8));
  if (f === 2) p.px(4, 3, withAlpha(P.ember, 0.8));
  p.outline(P.ink);
}, { anchor: [6, 16], fps: 8 });

// ENEMY: WISP — ethereal floating spectre, ranged. 16x16. Glowing soul core.
export function drawWisp(p, frame, body = P.purple, bodyD = P.purpleD, core = P.manaL) {
  const yb = [0, -1, 0][frame % 3];
  // ethereal outer aura
  p.glow(8, 6 + yb, 6, body, 0.3, 4);
  // wispy tail tatters (graded so they fade downward)
  for (let i = 0; i < 3; i++) {
    const tx = 4 + i * 4;
    p.vline(10 + yb, 13 + (i % 2) + yb, tx, withAlpha(bodyD, 0.85));
    p.px(tx, 13 + (i % 2) + yb, withAlpha(body, 0.5));
  }
  // ghostly body — soft dome with crown light
  p.ellipse(8, 7 + yb, 4, 5, bodyD);
  p.ellipse(8, 6 + yb, 3, 4, body);
  p.ellipse(7, 4 + yb, 1.5, 1.5, lighten(body, 0.3));
  // glowing soul core — radiant halo + bright core + white center
  p.glow(8, 7 + yb, 3, core, 0.55, 4);
  p.ellipse(8, 7 + yb, 2, 2, core);
  p.px(8, 7 + yb, P.white);
  p.px(7, 6 + yb, lighten(core, 0.3));   // core catch-light
}
defineAnim('wisp', 16, 16, 3, (p, f) => {
  drawWisp(p, f);
  const yb = [0, -1, 0][f % 3];
  p.aura(8, 7 + yb, 5, P.manaL, f / 3, 2);   // pulsing soul ring
  p.outline(P.ink);
  if (f === 1) p.star4(12, 4, 1, P.manaL, P.white);
}, { anchor: [8, 12], fps: 5 });

// ENEMY: BRUTE — cracked stone golem boss, charger. 18x18. Molten-eye drama.
export function drawBrute(p, frame, stone = P.gray2, stoneD = P.gray1, eye = P.emberL) {
  const yb = frame % 2 ? -1 : 0;
  // legs
  p.rect(4, 14 + yb, 3, 4, stoneD);
  p.rect(11, 14 + yb, 3, 4, stoneD);
  p.hline(4, 6, 14 + yb, stone); p.hline(11, 13, 14 + yb, stone);
  // torso — dark base + lit body + top light band
  p.rect(3, 7 + yb, 12, 8, stoneD);
  p.rect(4, 8 + yb, 10, 5, stone);
  p.hline(4, 13, 8 + yb, lighten(stone, 0.18));
  // shoulders (boulders) with lit crowns
  p.ellipse(4, 8 + yb, 3, 3, stoneD);
  p.ellipse(13, 8 + yb, 3, 3, stoneD);
  p.ellipse(4, 7 + yb, 2, 2, stone);
  p.ellipse(13, 7 + yb, 2, 2, stone);
  p.px(3, 6 + yb, lighten(stone, 0.2)); p.px(12, 6 + yb, lighten(stone, 0.2));
  // head with a lit top edge
  p.rect(6, 3 + yb, 6, 5, stone);
  p.rect(6, 3 + yb, 6, 1, lighten(stone, 0.22));
  // molten glowing eyes — halo + hot core
  p.glow(7, 6 + yb, 2, eye, 0.55, 3);
  p.glow(11, 6 + yb, 2, eye, 0.55, 3);
  p.rect(6, 5 + yb, 2, 1, eye); p.rect(10, 5 + yb, 2, 1, eye);
  p.px(6, 5 + yb, lighten(eye, 0.4)); p.px(10, 5 + yb, lighten(eye, 0.4));
  // glowing molten cracks running through the stone
  p.line(7, 9 + yb, 9, 12 + yb, withAlpha(P.ember, 0.85));
  p.line(11, 8 + yb, 12, 11 + yb, withAlpha(P.ember, 0.85));
  p.px(8, 10 + yb, P.emberL); p.px(11, 9 + yb, P.emberL);
  // dark structural cracks for read
  p.line(5, 10 + yb, 6, 13 + yb, stoneD);
  // fists with lit knuckles
  p.ellipse(2, 12 + yb, 2.4, 2.4, stone); p.ellipse(15, 12 + yb, 2.4, 2.4, stone);
  p.px(1, 11 + yb, lighten(stone, 0.2)); p.px(14, 11 + yb, lighten(stone, 0.2));
}
defineAnim('brute', 18, 18, 2, (p, f) => {
  p.softShadow(9, 17, 7, 1.4, 0.32);
  drawBrute(p, f);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [9, 17], fps: 3 });

export const CORE_ART_READY = true;
