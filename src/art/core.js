// Core hand-authored procedural sprites: hero, two starter enemies, projectiles,
// pickups and dungeon tiles. Establishes the visual language (palette + outline +
// soft shading) that all content art follows.

import { defineSprite, defineAnim, Painter } from '../engine/sprites.js';
import { P, lighten, darken, mix } from '../engine/palette.js';

// ---------------------------------------------------------------------------
// HERO — a hooded shard-hunter. 16x18, feet anchored.
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

  // boots / legs
  p.rect(4, 16 + oy, 3, 2, P.woodD);
  p.rect(9, 16 + oy, 3, 2, P.woodD);
  if (step > 0) { p.rect(4, 17 + oy, 3, 1, darken(P.woodD, 0.2)); }
  if (step < 0) { p.rect(9, 17 + oy, 3, 1, darken(P.woodD, 0.2)); }

  // cloak body (trapezoid)
  const top = 9 + oy, bot = 16 + oy;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(3 + t * 3);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  // lit front panel
  for (let y = top + 1; y <= bot - 1; y++) {
    const t = (y - top) / (bot - top);
    const hw = Math.round(1 + t * 2.2);
    p.hline(8 - hw, 7 + hw, y, cloak);
  }
  p.hline(3, 12, bot - 1, trim);            // hem trim
  p.px(7, top + 2, cloakL); p.px(8, top + 2, cloakL);

  // hood / head
  p.ellipse(7.5, 6 + oy, 5, 5, cloakD);
  p.ellipse(7.5, 5 + oy, 4, 4, cloak);
  p.ellipse(7.5, 3 + oy, 3, 2, cloakL);     // top light
  // face shadow
  p.rect(5, 6 + oy, 6, 4, P.ink2);
  p.ellipse(7.5, 8 + oy, 3, 2, P.ink2);
  // glowing eyes
  p.rect(5, 8 + oy, 2, 1, eye);
  p.rect(9, 8 + oy, 2, 1, eye);
  p.px(5, 8 + oy, lighten(eye, 0.4)); p.px(10, 8 + oy, lighten(eye, 0.4));

  // arms (subtle)
  p.rect(2, 11 + oy, 2, 3, cloakD);
  p.rect(12, 11 + oy, 2, 3, cloakD);
}

function weaponWand(p, frame, oy) {
  // a short staff with a glowing shard, on the right hand
  p.line(12, 13 + oy, 15, 9 + oy, P.wood);
  p.px(15, 8 + oy, P.shardL);
  p.rect(14, 8 + oy, 2, 2, P.shard);
  p.px(14, 8 + oy, P.shardL);
}

defineAnim('player', 16, 18, 4, (p, f) => {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  drawHunter(p, f);
  weaponWand(p, f, oy);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 9 });

// a generic NPC/townsfolk reusing the hunter base in warm colours (for the hub)
defineAnim('npc_smith', 16, 18, 2, (p, f) => {
  drawHunter(p, f, { cloak: P.leather, cloakD: P.woodD, cloakL: P.woodL, trim: P.bronze, eye: P.emberL });
  // hammer
  p.line(12, 13, 14, 10, P.wood); p.rect(13, 8, 3, 3, P.steel);
  p.outline(P.ink);
}, { anchor: [8, 17], fps: 2 });

// ---------------------------------------------------------------------------
// ENEMY: SLIME — squishy blob, 16x14, 4 frames squash/stretch.
// ---------------------------------------------------------------------------
export function drawSlime(p, frame, body = P.green, bodyD = P.greenD, bodyL = P.greenL, eye = P.white) {
  const squashTable = [0, 1, 2, 1];
  const s = squashTable[frame % 4];
  const cy = 9 + s * 0.5;
  const rx = 6 + s * 0.6;
  const ry = 5 - s * 0.6;
  p.ellipse(8, cy, rx, ry, bodyD);
  p.ellipse(8, cy - 0.5, rx - 1, ry - 1, body);
  p.ellipse(7, cy - 1.5, rx - 3, ry - 2.5, bodyL);   // highlight
  // jiggly base shadow line
  p.hline(8 - rx + 1, 7 + rx - 1, Math.round(cy + ry - 1), bodyD);
  // eyes
  p.rect(5, Math.round(cy - 1), 2, 2, P.white);
  p.rect(10, Math.round(cy - 1), 2, 2, P.white);
  p.px(6, Math.round(cy), P.ink); p.px(11, Math.round(cy), P.ink);
  // little mouth
  p.px(8, Math.round(cy + 1), P.ink);
}
defineAnim('slime', 16, 14, 4, (p, f) => { drawSlime(p, f); p.outline(P.ink); }, { anchor: [8, 13], fps: 6 });

// ---------------------------------------------------------------------------
// ENEMY: BAT — flapping, 16x12, 2 frames.
// ---------------------------------------------------------------------------
export function drawBat(p, frame, body = P.purple, bodyD = P.purpleD, eye = P.emberL) {
  const up = frame % 2 === 0;
  // body
  p.ellipse(8, 7, 2.5, 3, bodyD);
  p.ellipse(8, 6, 2, 2, body);
  // ears
  p.px(6, 3, bodyD); p.px(10, 3, bodyD);
  p.px(6, 4, body); p.px(10, 4, body);
  // eyes
  p.px(7, 6, eye); p.px(9, 6, eye);
  // wings
  if (up) {
    p.line(6, 6, 1, 3, bodyD); p.line(1, 3, 5, 7, bodyD);
    p.line(10, 6, 15, 3, bodyD); p.line(15, 3, 11, 7, bodyD);
    p.ellipse(3, 5, 2, 1.5, body); p.ellipse(13, 5, 2, 1.5, body);
  } else {
    p.line(6, 7, 1, 9, bodyD); p.line(1, 9, 5, 8, bodyD);
    p.line(10, 7, 15, 9, bodyD); p.line(15, 9, 11, 8, bodyD);
    p.ellipse(3, 8, 2, 1.5, body); p.ellipse(13, 8, 2, 1.5, body);
  }
}
defineAnim('bat', 16, 12, 2, (p, f) => { drawBat(p, f); p.outline(P.ink); }, { anchor: [8, 8], fps: 8 });

// ---------------------------------------------------------------------------
// PROJECTILES
// ---------------------------------------------------------------------------
defineSprite('bolt', 8, 8, (p) => {
  p.ellipse(4, 4, 2.5, 2.5, P.shard);
  p.ellipse(4, 4, 1.5, 1.5, P.shardL);
  p.px(4, 4, P.white);
}, { anchor: [4, 4] });

defineSprite('bolt_enemy', 8, 8, (p) => {
  p.ellipse(4, 4, 2.5, 2.5, P.redD);
  p.ellipse(4, 4, 1.5, 1.5, P.red);
  p.px(4, 4, P.redL);
}, { anchor: [4, 4] });

defineSprite('spark', 6, 6, (p) => {
  p.rect(2, 0, 2, 6, P.emberL); p.rect(0, 2, 6, 2, P.emberL); p.rect(2, 2, 2, 2, P.white);
}, { anchor: [3, 3] });

// ---------------------------------------------------------------------------
// PICKUPS
// ---------------------------------------------------------------------------
defineAnim('coin', 8, 9, 4, (p, f) => {
  const w = [3, 2, 1, 2][f];
  p.ellipse(4, 4.5, w, 3.5, P.goldD);
  p.ellipse(4, 4.5, Math.max(0.5, w - 1), 2.8, P.gold);
  if (w >= 2) p.px(4 - Math.floor(w / 2), 3, P.goldL);
  p.outline(P.ink);
}, { anchor: [4, 8], fps: 8 });

defineAnim('shard', 8, 11, 2, (p, f) => {
  const o = f;
  p.line(4, 0 + o * 0, 4, 10, P.shardD);
  // crystal body (diamond)
  p.ellipse(4, 5, 2.6, 4.5, P.shardD);
  p.ellipse(4, 5, 1.6, 3.5, P.shard);
  p.line(4, 1, 4, 9, P.shardL);
  p.px(3, 3 + f, P.white);
  p.outline(P.ink);
}, { anchor: [4, 10], fps: 3 });

defineAnim('heart', 9, 9, 2, (p, f) => {
  const c = f === 0 ? P.red : P.redL;
  p.ellipse(3, 3, 2, 2, c); p.ellipse(6, 3, 2, 2, c);
  for (let y = 3; y <= 7; y++) { const w = 4 - (y - 3); p.hline(4.5 - w, 3.5 + w, y, c); }
  p.px(2, 2, P.redL); p.px(5, 2, P.redL);
  p.outline(P.ink);
}, { anchor: [4, 8], fps: 3 });

defineAnim('xp', 6, 6, 3, (p, f) => {
  const c = [P.manaL, P.mana, P.blueL][f];
  p.ellipse(3, 3, 2, 2, P.manaL);
  p.ellipse(3, 3, 1.2, 1.2, c);
  p.px(3, 3, P.white);
}, { anchor: [3, 3], fps: 8 });

defineSprite('chest', 16, 14, (p) => {
  p.rect(2, 6, 12, 7, P.woodD);
  p.rect(3, 7, 10, 5, P.wood);
  p.rect(2, 4, 12, 3, P.woodL);
  p.rect(2, 4, 12, 1, lighten(P.woodL, 0.2));
  p.rect(7, 5, 2, 4, P.gold);
  p.px(7, 7, P.goldD); p.px(8, 7, P.goldL);
  // metal bands
  p.vline(4, 12, 4, P.bronze); p.vline(4, 12, 11, P.bronze);
  p.outline(P.ink);
}, { anchor: [8, 13] });

defineSprite('stairs', 20, 18, (p) => {
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 3;
    p.rect(2 + i * 2, y, 16 - i * 4, 3, i % 2 ? P.wallD : P.wall);
    p.hline(2 + i * 2, 17 - i * 2, y, P.wallL);
  }
  p.outline(P.ink);
}, { anchor: [10, 17] });

defineSprite('portal', 18, 20, (p) => {
  p.ellipse(9, 11, 6, 9, P.purpleD);
  p.ellipse(9, 11, 4.5, 7.5, P.purple);
  p.ellipse(9, 11, 3, 6, P.manaL);
  p.ellipse(9, 11, 1.6, 4, P.white);
  p.outline(P.ink);
}, { anchor: [9, 19] });

// ---------------------------------------------------------------------------
// DUNGEON TILES (16x16). A few floor variants for texture + wall pieces.
// ---------------------------------------------------------------------------
function floorBase(p, tint, tintLine) {
  p.rect(0, 0, 16, 16, tint);
  // subtle inner bevel + grout lines
  p.hline(0, 15, 0, lighten(tint, 0.08));
  p.hline(0, 15, 15, tintLine);
  p.vline(0, 15, 15, tintLine);
}
defineSprite('floor', 16, 16, (p) => {
  floorBase(p, P.floor, P.floorLine);
  // scattered specks
  p.px(4, 5, P.floor2); p.px(11, 9, P.floor2); p.px(7, 12, darken(P.floor, 0.2));
}, { anchor: [0, 0] });
defineSprite('floor2', 16, 16, (p) => {
  floorBase(p, P.floor2, P.floorLine);
  p.px(3, 3, P.floor); p.px(9, 6, darken(P.floor2, 0.15)); p.px(12, 12, P.floor);
  p.rect(6, 8, 3, 2, darken(P.floor2, 0.1));
}, { anchor: [0, 0] });
defineSprite('floor_crack', 16, 16, (p) => {
  floorBase(p, P.floor, P.floorLine);
  p.line(3, 2, 6, 8, P.floorLine); p.line(6, 8, 5, 13, P.floorLine); p.line(6, 8, 11, 10, P.floorLine);
}, { anchor: [0, 0] });

defineSprite('wall', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, P.wallD);
  p.rect(0, 0, 16, 16, P.wall);
  // brick pattern
  p.rect(0, 0, 16, 5, P.wall);
  p.rect(0, 6, 16, 5, darken(P.wall, 0.08));
  p.rect(0, 12, 16, 4, P.wall);
  p.hline(0, 15, 5, P.wallD); p.hline(0, 15, 11, P.wallD);
  p.vline(0, 5, 8, P.wallD); p.vline(6, 11, 4, P.wallD); p.vline(6, 11, 12, P.wallD); p.vline(12, 15, 8, P.wallD);
  // top light edge
  p.hline(0, 15, 0, P.wallL);
}, { anchor: [0, 0] });

// the front-facing top edge of a wall, drawn one tile high above floor for depth
defineSprite('wall_top', 16, 8, (p) => {
  p.rect(0, 0, 16, 8, darken(P.wallD, 0.2));
  p.rect(0, 0, 16, 2, P.wallL);
  p.rect(0, 2, 16, 1, P.wall);
  for (let x = 2; x < 16; x += 5) { p.vline(3, 7, x, darken(P.wallD, 0.3)); }
}, { anchor: [0, 0] });

// decorative wall torch (animated)
defineAnim('torch', 12, 18, 3, (p, f) => {
  p.rect(5, 8, 2, 8, P.wood);
  p.rect(4, 14, 4, 2, P.woodD);
  const fl = [0, 1, -1][f];
  p.ellipse(6, 5 + fl * 0.4, 2.5, 3.5, P.ember);
  p.ellipse(6, 4 + fl * 0.4, 1.6, 2.4, P.emberL);
  p.ellipse(6, 3 + fl * 0.4, 0.8, 1.2, P.white);
  p.outline(P.ink);
}, { anchor: [6, 16], fps: 8 });

// ENEMY: WISP — floating spectre, ranged. 16x16.
export function drawWisp(p, frame, body = P.purple, bodyD = P.purpleD, core = P.manaL) {
  const yb = [0, -1, 0][frame % 3];
  // wispy tail tatters
  for (let i = 0; i < 3; i++) {
    const tx = 4 + i * 4;
    p.vline(10 + yb, 13 + (i % 2) + yb, tx, bodyD);
  }
  p.ellipse(8, 7 + yb, 4, 5, bodyD);
  p.ellipse(8, 6 + yb, 3, 4, body);
  p.ellipse(7, 4 + yb, 1.5, 1.5, lighten(body, 0.25));
  // glowing core eye
  p.ellipse(8, 7 + yb, 2, 2, core);
  p.px(8, 7 + yb, P.white);
}
defineAnim('wisp', 16, 16, 3, (p, f) => { drawWisp(p, f); p.outline(P.ink); }, { anchor: [8, 12], fps: 5 });

// ENEMY: BRUTE — stone golem, charger. 18x18.
export function drawBrute(p, frame, stone = P.gray2, stoneD = P.gray1, eye = P.emberL) {
  const yb = frame % 2 ? -1 : 0;
  p.rect(4, 14 + yb, 3, 4, stoneD);
  p.rect(11, 14 + yb, 3, 4, stoneD);
  p.rect(3, 7 + yb, 12, 8, stoneD);
  p.rect(4, 8 + yb, 10, 5, stone);
  p.ellipse(4, 8 + yb, 3, 3, stoneD);
  p.ellipse(13, 8 + yb, 3, 3, stoneD);
  p.ellipse(4, 7 + yb, 2, 2, stone);
  p.ellipse(13, 7 + yb, 2, 2, stone);
  // head
  p.rect(6, 3 + yb, 6, 5, stone);
  p.rect(6, 3 + yb, 6, 1, lighten(stone, 0.2));
  p.rect(6, 5 + yb, 2, 1, eye); p.rect(10, 5 + yb, 2, 1, eye);
  // cracks
  p.line(7, 9 + yb, 9, 12 + yb, stoneD); p.line(11, 8 + yb, 12, 11 + yb, stoneD);
  // fists
  p.ellipse(2, 12 + yb, 2.4, 2.4, stone); p.ellipse(15, 12 + yb, 2.4, 2.4, stone);
}
defineAnim('brute', 18, 18, 2, (p, f) => { drawBrute(p, f); p.outline(P.ink); }, { anchor: [9, 17], fps: 3 });

export const CORE_ART_READY = true;
