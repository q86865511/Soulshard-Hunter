// R19/A2 — RUINED building facades for the apocalyptic town exterior (末日遺跡).
// Six 72x72 facades, anchor [36,71] (base-centre, same pixel convention as the
// R18 town_fc_* facades — see town_outdoor.js). Each building is ruined but still
// STANDING: collapsed roof sections, cracks, exposed charred beams, ash dust —
// and every one keeps a clearly readable, centred DOOR at the bottom edge with
// warm light spilling out, so the player reads "enterable".
// Style: desaturated stone/ash base + ember-orange (P.ember/emberL) and
// soul-teal (P.shard/shardL/neon) accent glows, rim light on the silhouette.
import { defineSprite } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ---- shared ruin tones ------------------------------------------------------
const STONE   = mix(P.gray2, P.bone, 0.22);          // weathered stone
const STONE_L = lighten(STONE, 0.18);
const STONE_D = darken(STONE, 0.22);
const PLAS    = mix(P.bone, P.gray2, 0.45);          // ash-dulled plaster
const PLAS_L  = lighten(PLAS, 0.12);
const PLAS_D  = darken(PLAS, 0.14);
const BEAM    = mix(P.woodD, P.gray1, 0.35);         // charred timber
const BEAM_L  = lighten(BEAM, 0.22);
const BEAM_D  = darken(BEAM, 0.2);
const CRACK_C = darken(P.gray1, 0.38);
const ASH     = mix(P.gray3, P.bone, 0.25);

// jagged crack wandering downward from (x,y)
function crack(p, x, y, len, seed = 1, col = CRACK_C) {
  let s = (seed | 0) || 1;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < len; i++) {
    p.px(x, y, col);
    if (rnd() < 0.3) p.px(x + 1, y, withAlpha(col, 0.55));
    y++;
    const r = rnd();
    if (r < 0.34) x--; else if (r < 0.68) x++;
  }
}

// warm light spilling out of a doorway onto the threshold
function doorSpill(p, cx, baseY, r) {
  p.glow(cx, baseY, r, P.ember, 0.4, 4);
  p.glow(cx, baseY - 2, Math.max(3, Math.round(r * 0.55)), P.emberL, 0.32, 3);
}

// small drifted ash pile sitting on the ground line
function ashPile(p, cx, y, rx) {
  p.ellipse(cx, y, rx, 1, ASH);
  p.hline(cx - Math.max(1, rx - 2), cx + Math.max(1, rx - 2), y - 1, lighten(ASH, 0.12));
}

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc_church — broken spire + shattered stained-glass rose, soul-teal glow
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc_church', 72, 72, (p) => {
  const wall = mix(P.bone, P.gray2, 0.5), wallL = lighten(wall, 0.16), wallD = darken(wall, 0.18);
  const roofC = mix(P.blueD, P.gray1, 0.5), roofL = lighten(roofC, 0.22), roofD = darken(roofC, 0.25);
  const trim = mix(P.holy, P.gray3, 0.35), trimD = darken(trim, 0.25);
  p.softShadow(36, 70, 30, 3, 0.35, P.ink);
  // ---- main hall wings ----
  p.rect(8, 52, 56, 20, wall);
  p.rect(8, 52, 2, 20, wallL);
  p.rect(62, 52, 2, 20, wallD);
  p.speckle(10, 55, 18, 14, wallD, 12, 3);
  p.speckle(44, 55, 18, 14, wallD, 12, 7);
  p.speckle(10, 54, 52, 6, ASH, 10, 19);
  // left wing roof — intact slope up to the tower
  for (let i = 0; i <= 13; i++) {
    const y = 38 + i;
    const lx = 27 - Math.round(i * 21 / 13);
    p.hline(lx, 28, y, i < 6 ? roofL : roofC);
  }
  p.hline(5, 28, 51, roofD);
  // right wing roof — COLLAPSED: only the lower fragment + exposed rafters
  for (let i = 9; i <= 13; i++) {
    const y = 38 + i;
    const rx = 44 + Math.round(i * 21 / 13);
    p.hline(47 + (13 - i), rx, y, roofD);
    p.px(47 + (13 - i), y, darken(roofD, 0.15));
  }
  p.hline(44, 65, 51, darken(roofD, 0.12));
  // charred rafters poking over the gap
  p.line(45, 39, 58, 46, BEAM);
  p.line(45, 42, 54, 47, BEAM_L);
  p.px(59, 47, BEAM_D); p.px(60, 48, BEAM_D);
  // wing windows: left lancet intact (soul-teal), right one shattered dark
  p.glow(15, 59, 5, P.shard, 0.35);
  p.rect(13, 55, 6, 10, trimD);
  p.rect(14, 56, 4, 8, P.shardD);
  p.rect(14, 56, 4, 2, P.shard);
  p.px(15, 59, P.shardL);
  p.rect(53, 55, 6, 10, trimD);
  p.rect(54, 56, 4, 8, P.ink2);
  p.px(54, 56, P.shardD); p.px(57, 57, P.shardD); p.px(55, 62, P.shardD); // glass remnants
  p.px(52, 66, P.shard); p.px(58, 67, mix(P.shard, P.ink2, 0.4));         // fallen shards
  // ---- central tower ----
  p.rect(27, 20, 18, 52, wall);
  p.gradV(27, 20, 18, 6, lighten(wall, 0.1), wall);
  p.rect(27, 20, 2, 52, wallL);
  p.rect(43, 20, 2, 52, wallD);
  crack(p, 31, 26, 16, 5);
  crack(p, 41, 44, 12, 9);
  // cornice under the belfry
  p.rect(26, 18, 20, 2, trim);
  p.hline(26, 45, 19, trimD);
  p.px(26, 18, darken(trim, 0.35)); p.px(45, 19, darken(trim, 0.35)); // chipped ends
  // belfry — bell gone, only a broken chain + a faint soul glow inside
  p.rect(28, 9, 16, 9, wall);
  p.rect(28, 9, 1, 9, wallL);
  p.rect(43, 9, 1, 9, wallD);
  p.rect(31, 11, 10, 7, P.ink2);
  p.hline(32, 39, 10, P.ink2);
  p.glow(36, 14, 3, P.shard, 0.4, 3);
  p.vline(11, 13, 36, P.gray3); p.px(36, 14, P.gray2); // snapped bell chain
  p.hline(31, 41, 17, trimD);
  // ---- BROKEN spire: jagged stump + a leaning tip fragment on the left roof
  p.hline(33, 39, 8, roofC);
  p.hline(32, 36, 7, roofC); p.px(38, 7, roofC);
  p.px(33, 6, roofL); p.px(34, 6, roofC); p.px(37, 6, roofD);
  p.px(34, 5, roofL); p.px(36, 5, roofD);
  p.px(35, 4, lighten(roofL, 0.1));
  // fallen spire tip lying on the left wing roof
  p.line(14, 42, 20, 46, roofD);
  p.line(14, 43, 19, 46, roofC);
  p.px(13, 41, P.goldD); p.px(12, 40, P.gold); // its broken cross finial
  // snapped gold cross on the stump (tilted)
  p.line(35, 1, 37, 3, P.gold);
  p.px(34, 2, P.goldD); p.px(37, 1, P.goldL);
  // ---- shattered soulshard rose window ----
  p.glow(36, 33, 8, P.shard, 0.45);
  p.circle(36, 33, 6, trim);
  p.circle(36, 33, 5, P.shardD);
  p.star4(36, 33, 4, P.shardL, P.white);
  p.px(36, 33, P.white);
  // missing wedge + crack through the glass
  p.px(39, 36, P.ink2); p.px(40, 36, P.ink2); p.px(39, 37, P.ink2); p.px(40, 37, P.ink2); p.px(38, 37, P.ink2);
  p.line(33, 30, 40, 37, withAlpha(CRACK_C, 0.8));
  p.px(34, 41, P.shard); p.px(39, 42, P.shardL); p.px(36, 43, mix(P.shard, wall, 0.4)); // glass on the sill
  p.sparkle(32, 29, P.white);
  // small shard diamond over the door
  p.star4(36, 48, 2, P.shard, P.shardL);
  // ---- arched doorway (centred at base, warm light) ----
  p.rect(29, 54, 14, 18, trim);
  p.hline(30, 42, 53, trim);
  p.rect(30, 55, 12, 17, P.ink2);
  p.gradV(30, 55, 12, 17, P.ink2, mix(P.ember, P.ink, 0.4));
  p.rect(31, 66, 10, 5, mix(P.ember, P.ink, 0.25));
  p.hline(32, 39, 70, mix(P.emberL, P.ember, 0.5));
  p.px(29, 54, darken(trim, 0.3)); p.px(42, 55, darken(trim, 0.3)); // chipped jamb
  // stone step + spilling light
  p.rect(27, 70, 18, 2, P.gray3);
  p.hline(27, 44, 70, P.gray2);
  doorSpill(p, 36, 70, 8);
  ashPile(p, 13, 70, 4);
  ashPile(p, 58, 70, 3);
  // light + finish
  p.shadeBottom(0.1, 64);
  p.rimLight(P.rimCool, 0.3);
  p.outline(P.ink);
}, { anchor: [36, 71] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc_guild — timber-frame hall, cracked crest, notice lanterns still lit
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc_guild', 72, 72, (p) => {
  const tim = BEAM, timL = BEAM_L, timD = BEAM_D;
  p.softShadow(36, 70, 30, 3, 0.35, P.ink);
  // ---- plaster wall body ----
  p.gradV(8, 30, 56, 42, PLAS_L, PLAS_D);
  p.speckle(10, 33, 52, 26, darken(PLAS, 0.1), 26, 7);
  p.speckle(10, 31, 52, 10, ASH, 12, 23);
  crack(p, 17, 34, 14, 11);
  crack(p, 55, 50, 12, 4);
  // ---- timber frame ----
  p.rect(8, 30, 56, 2, tim);
  p.hline(8, 63, 30, timL);
  p.rect(8, 47, 56, 2, tim);
  p.rect(8, 30, 2, 32, tim);
  p.rect(62, 30, 2, 32, tim);
  p.rect(23, 30, 2, 32, tim);
  p.rect(47, 30, 2, 32, tim);
  p.vline(30, 61, 8, timL);
  p.vline(30, 61, 23, timL);
  p.vline(30, 61, 47, timL);
  // X-brace, lower-left panel (lower-right one has fallen off — ghost marks)
  p.line(10, 61, 22, 50, tim); p.line(10, 50, 22, 61, tim);
  p.line(50, 60, 61, 51, withAlpha(timD, 0.35));
  // ---- stone base course ----
  p.rect(8, 62, 56, 10, P.gray2);
  p.hline(8, 63, 62, lighten(P.gray2, 0.2));
  p.hline(8, 63, 66, darken(P.gray2, 0.25));
  for (let x = 11; x < 62; x += 8) { p.vline(63, 65, x, darken(P.gray2, 0.22)); p.vline(67, 70, x + 4, darken(P.gray2, 0.22)); }
  p.speckle(9, 63, 54, 8, lighten(P.gray2, 0.15), 14, 3);
  p.px(10, 61, P.gray1); p.px(60, 62, P.gray1); // dislodged base stones
  // ---- gabled roof — right corner collapsed ----
  const rB = mix(P.redD, P.gray1, 0.45), rH = lighten(rB, 0.18), rS = darken(rB, 0.2);
  for (let y = 4; y <= 28; y++) {
    const w = 1 + Math.floor((y - 4) * 32 / 24);
    const L = Math.max(2, 36 - w);
    let R = Math.min(69, 36 + w);
    const cut = 50 + Math.floor((28 - y) * 0.9); // break line eating the right corner
    if (R > cut) R = cut;
    if (R >= L) {
      p.hline(L, R, y, rB);
      p.hline(L, L + Math.floor(w * 0.45), y, rH);
      if (y === 9 || y === 14 || y === 19 || y === 24) p.hline(L + 1, R - 1, y, rS);
      p.px(R, y, darken(rS, 0.12)); // jagged broken edge
    }
  }
  // exposed rafters in the collapsed corner
  p.line(52, 22, 64, 28, BEAM);
  p.line(54, 18, 66, 27, BEAM_L);
  p.px(67, 28, BEAM_D); p.px(65, 29, BEAM_D);
  p.rect(35, 3, 3, 1, rB);
  p.px(36, 2, P.goldD);
  // eaves + under-eave shadow
  p.hline(4, 58, 28, tim);
  p.hline(6, 56, 29, timD);
  // attic vent
  p.rect(34, 14, 5, 6, timD);
  p.rect(35, 15, 3, 4, P.ink2);
  p.glow(36, 17, 2, P.shard, 0.3, 2); // faint soul light inside
  // ---- cracked guild crest over the door ----
  p.rect(31, 36, 11, 8, P.steelD);
  p.hline(32, 40, 44, P.steelD); p.hline(33, 39, 45, P.steelD); p.px(36, 46, P.steelD);
  p.rect(32, 37, 9, 6, mix(P.steel, P.gray2, 0.35));
  p.hline(31, 41, 36, mix(P.goldD, P.gray2, 0.3));
  p.line(33, 44, 40, 37, P.steelL); p.line(40, 44, 33, 37, P.steelL);
  p.line(35, 36, 38, 46, withAlpha(CRACK_C, 0.85)); // the crack
  p.px(41, 44, P.ink2); p.px(40, 45, P.ink2);       // chipped corner
  p.px(36, 40, P.white);
  // ---- notice lanterns flanking the door (still lit — warm) ----
  p.hline(24, 27, 49, timD); p.hline(45, 48, 49, timD);   // brackets
  p.vline(50, 51, 25, P.gray3); p.vline(50, 51, 47, P.gray3);
  p.rect(24, 52, 4, 5, P.goldD);
  p.rect(25, 53, 2, 3, P.emberL);
  p.rect(45, 52, 4, 5, P.goldD);
  p.rect(46, 53, 2, 3, P.emberL);
  p.glow(26, 54, 4, P.ember, 0.4, 3);
  p.glow(47, 54, 4, P.ember, 0.4, 3);
  // ---- notice board, torn papers (left panel) ----
  p.rect(11, 36, 11, 9, P.woodD);
  p.rect(12, 37, 9, 7, mix(P.wood, P.gray2, 0.3));
  p.rect(13, 38, 3, 4, mix(P.bone, P.gray3, 0.2));
  p.px(14, 42, mix(P.bone, P.gray3, 0.2)); // dangling torn strip
  p.rect(17, 39, 3, 3, mix(P.bone, P.gray3, 0.35));
  p.px(13, 39, P.redD); p.px(18, 40, P.ink2); // faded marks
  // ---- arched timber door (centred, warm light) ----
  p.rect(29, 51, 15, 21, timD);
  p.ellipse(36, 53, 7, 4, timD);
  p.rect(31, 54, 11, 18, P.ink2);
  p.ellipse(36, 55, 5, 3, P.ink2);
  p.gradV(31, 54, 11, 18, P.ink2, mix(P.ember, P.ink, 0.42));
  p.rect(32, 66, 9, 5, mix(P.ember, P.ink, 0.25));
  p.hline(33, 39, 70, mix(P.emberL, P.ember, 0.5));
  p.px(29, 51, darken(timD, 0.25)); p.px(43, 52, darken(timD, 0.25));
  // threshold + spill
  p.rect(27, 70, 18, 2, P.gray3);
  p.hline(27, 44, 70, lighten(P.gray3, 0.2));
  doorSpill(p, 36, 70, 8);
  ashPile(p, 12, 70, 4);
  p.sparkle(58, 35, P.emberL, 1);
  // light + finish
  p.shadeBottom(0.1, 64);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [36, 71] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc_hall — achievement hall: toppled trophy column + tarnished gold trim
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc_hall', 72, 72, (p) => {
  const goldT = mix(P.gold, P.gray3, 0.35);          // tarnished gold trim
  const goldTD = darken(goldT, 0.25);
  p.softShadow(36, 70, 32, 3, 0.35, P.ink);
  // ---- back wall (behind the colonnade) ----
  p.gradV(10, 26, 52, 40, STONE_D, darken(STONE_D, 0.12));
  p.speckle(12, 30, 48, 30, darken(STONE_D, 0.15), 20, 5);
  crack(p, 50, 30, 16, 7);
  // ---- stepped base platform ----
  p.gradV(6, 64, 60, 3, P.gray3, P.gray2);
  p.gradV(4, 67, 64, 3, lighten(P.gray3, 0.08), P.gray2);
  p.gradV(2, 70, 68, 2, P.gray3, darken(P.gray2, 0.1));
  p.hline(6, 65, 64, lighten(P.gray3, 0.22));
  p.hline(4, 67, 67, lighten(P.gray3, 0.18));
  p.hline(2, 69, 70, lighten(P.gray3, 0.14));
  p.px(9, 64, P.gray1); p.px(58, 67, P.gray1); // chipped step edges
  // ---- entablature + pediment ----
  p.rect(6, 20, 60, 5, STONE);
  p.hline(6, 65, 20, STONE_L);
  p.hline(6, 65, 24, STONE_D);
  p.hline(8, 63, 22, goldT);                       // gold band
  p.px(14, 22, P.goldL); p.px(40, 22, P.goldL);    // remaining glints
  // pediment triangle — right corner sheared off
  for (let y = 6; y <= 19; y++) {
    const w = Math.floor((y - 5) * 30 / 14);
    const L = 36 - w;
    let R = 36 + w;
    const cut = 52 + Math.floor((19 - y) * 0.8);
    if (R > cut) R = cut;
    if (R >= L) {
      p.hline(L, R, y, STONE);
      p.hline(L, L + Math.max(1, Math.floor(w * 0.4)), y, STONE_L);
      p.px(R, y, STONE_D);
    }
  }
  p.line(56, 14, 64, 19, STONE_D);                 // shear face
  p.line(57, 12, 63, 16, withAlpha(CRACK_C, 0.7));
  crack(p, 30, 8, 9, 13);
  // trophy-cup relief in the pediment (tarnished, one handle broken)
  p.glow(36, 13, 5, P.gold, 0.25, 3);
  p.rect(33, 10, 7, 4, goldT);
  p.hline(33, 39, 10, lighten(goldT, 0.25));
  p.rect(35, 14, 3, 2, goldTD);
  p.hline(33, 39, 16, goldT);
  p.px(31, 11, goldT); p.px(31, 12, goldTD);       // left handle
  p.px(41, 11, withAlpha(goldTD, 0.4));            // right handle broken off
  p.sparkle(34, 10, P.goldL, 1);
  // ---- columns: outer pair + right inner standing, LEFT INNER TOPPLED ----
  const colBody = (x) => {
    p.gradH(x, 25, 6, 39, STONE_L, STONE_D);
    p.rect(x - 1, 25, 8, 2, STONE_L);
    p.rect(x - 1, 62, 8, 2, STONE);
    p.hline(x - 1, x + 6, 63, STONE_D);
    p.vline(27, 61, x + 1, lighten(STONE_L, 0.12));
    for (let y = 30; y < 60; y += 7) p.hline(x, x + 5, y, withAlpha(STONE_D, 0.5)); // drum seams
  };
  colBody(11);
  colBody(55);
  colBody(45);
  crack(p, 57, 32, 12, 17);
  // toppled inner-left column: stump + shaft lying across the steps
  p.gradH(21, 52, 6, 12, STONE_L, STONE_D);        // stump
  p.rect(20, 62, 8, 2, STONE);
  p.hline(21, 26, 52, STONE_D);
  p.px(22, 51, STONE); p.px(25, 50, STONE_D); p.px(24, 51, STONE); // jagged break
  // fallen shaft (diagonal, drum seams)
  for (let i = 0; i < 18; i++) {
    const x = 6 + i, y = 67 - Math.floor(i * 0.22);
    p.vline(y - 2, y, x, i % 6 === 5 ? STONE_D : STONE);
    if ((i % 6) === 0) p.px(x, y - 2, STONE_L);
  }
  p.hline(6, 23, 68, withAlpha(P.ink, 0.25));      // contact shadow
  p.ellipse(7, 66, 2, 2, STONE_D);                 // broken end face
  p.px(7, 66, darken(STONE_D, 0.2));
  // rubble bits by the stump
  p.px(27, 66, STONE_D); p.px(29, 67, STONE); p.px(26, 68, P.gray1);
  // ---- grand doorway (centred, tall, warm) ----
  p.rect(28, 32, 16, 33, goldTD);
  p.rect(29, 33, 14, 32, STONE_D);
  p.rect(30, 34, 12, 31, P.ink2);
  p.gradV(30, 34, 12, 31, P.ink2, mix(P.ember, P.ink, 0.42));
  p.rect(31, 58, 10, 7, mix(P.ember, P.ink, 0.25));
  p.hline(32, 39, 64, mix(P.emberL, P.ember, 0.55));
  p.hline(29, 42, 32, goldT);                      // gold lintel
  p.px(30, 33, P.goldL);
  // door columns of light hint
  p.vline(38, 60, 33, withAlpha(P.ember, 0.18));
  p.vline(38, 60, 38, withAlpha(P.ember, 0.18));
  doorSpill(p, 36, 65, 9);
  // soul-flame brazier on the right step end (teal accent)
  p.rect(62, 60, 4, 3, P.gray2);
  p.vline(63, 64, 63, P.gray1);
  p.glow(63, 58, 4, P.shard, 0.5, 3);
  p.px(63, 58, P.shardL); p.px(63, 57, P.shard); p.px(64, 59, P.shard);
  p.sparkle(65, 55, P.shardL, 1);
  ashPile(p, 50, 70, 4);
  // light + finish
  p.shadeBottom(0.1, 64);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [36, 71] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc_smith — cracked stone forge, chimney w/ LIVE ember plume, glowing door
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc_smith', 72, 72, (p) => {
  const roofC = mix(P.gray2, P.blueD, 0.4), roofL = lighten(roofC, 0.2), roofD = darken(roofC, 0.22);
  p.softShadow(36, 70, 30, 3, 0.35, P.ink);
  // ---- LIVE ember plume above the chimney (drawn first, behind nothing) ----
  p.circle(56, 6, 3, mix(P.gray4, P.gray2, 0.4));
  p.circle(60, 3, 2, mix(P.gray4, P.gray2, 0.25));
  p.circle(52, 4, 2, mix(P.gray4, P.gray2, 0.5));
  p.px(54, 8, P.ember); p.px(57, 5, P.emberL); p.px(59, 7, P.ember);
  p.glow(56, 8, 4, P.ember, 0.4, 3);
  p.sparkle(62, 2, P.emberL, 1);
  p.sparkle(50, 1, P.ember, 1);
  // ---- wall body: ash-dulled plaster ----
  p.gradV(8, 33, 56, 39, PLAS, PLAS_D);
  p.speckle(10, 35, 52, 20, darken(PLAS, 0.1), 22, 9);
  crack(p, 14, 36, 16, 3);
  crack(p, 58, 44, 14, 21);
  // ---- stone base course ----
  p.gradV(8, 56, 56, 16, P.gray3, P.gray2);
  p.hline(8, 63, 56, P.gray4);
  p.hline(8, 63, 60, darken(P.gray3, 0.2));
  p.hline(8, 63, 65, darken(P.gray3, 0.2));
  for (let x = 11; x < 62; x += 8) { p.vline(57, 59, x, darken(P.gray3, 0.18)); p.vline(61, 64, x + 4, darken(P.gray3, 0.18)); p.vline(66, 70, x, darken(P.gray3, 0.18)); }
  p.speckle(9, 57, 54, 13, P.gray2, 18, 9);
  // ---- timber frame ----
  p.rect(8, 33, 56, 2, BEAM);
  p.hline(8, 63, 33, BEAM_L);
  p.rect(8, 35, 2, 21, BEAM); p.vline(35, 55, 8, BEAM_L);
  p.rect(62, 35, 2, 21, BEAM); p.vline(35, 55, 63, BEAM_D);
  p.rect(24, 35, 2, 21, BEAM); p.vline(35, 55, 24, BEAM_L);
  p.rect(46, 35, 2, 21, BEAM); p.vline(35, 55, 46, BEAM_L);
  // ---- gabled slate roof — LEFT slope partially caved in ----
  for (let y = 10; y <= 32; y++) {
    const half = 2 + Math.round((y - 10) * 1.35);
    const L = 35 - half;
    const R = Math.min(69, 35 + half);
    let holeL = 0, holeR = -1;                      // caved patch on the lower-left slope
    if (y >= 22 && y <= 30) { holeL = Math.max(L, 14); holeR = Math.min(26, R); }
    p.hline(L, R, y, roofC);
    p.hline(L, Math.min(34, L + Math.floor(half * 0.5)), y, roofL);
    if (y % 4 === 1) p.hline(L + 2, R - 2, y, roofD);
    p.px(R, y, roofD);
    if (holeR >= holeL) {
      p.hline(holeL, holeR, y, P.ink2);            // caved hole — dark interior
      p.px(holeL, y, darken(roofD, 0.2));
      p.px(holeR, y, darken(roofD, 0.2));
    }
  }
  // rafters across the roof hole
  p.line(15, 23, 25, 29, BEAM);
  p.line(18, 22, 24, 26, BEAM_L);
  p.hline(4, 66, 32, roofD);
  p.rect(33, 9, 5, 2, roofD);
  p.hline(33, 37, 9, roofL);
  p.px(35, 8, P.goldD);
  // ---- big stone chimney (right slope) — alive ----
  p.gradV(51, 11, 10, 20, P.gray4, P.gray3);
  p.rect(50, 8, 12, 3, P.gray4);
  p.hline(50, 61, 8, lighten(P.gray4, 0.25));
  p.vline(11, 30, 51, lighten(P.gray4, 0.18));
  p.vline(11, 30, 60, P.gray2);
  p.hline(52, 59, 16, P.gray2);
  p.hline(52, 59, 21, P.gray2);
  p.hline(52, 59, 26, P.gray2);
  p.speckle(52, 12, 8, 17, P.gray2, 12, 5);
  crack(p, 54, 13, 10, 15, darken(P.gray2, 0.3));
  p.rect(52, 7, 8, 1, darken(P.ember, 0.2));
  p.glow(56, 7, 3, P.ember, 0.5, 3);
  // ---- horseshoe sign hanging by ONE chain (tilted) ----
  p.vline(36, 39, 15, P.gray4);                    // surviving chain
  p.px(19, 37, withAlpha(P.gray4, 0.4));           // snapped stub
  // tilted plank
  p.line(10, 40, 21, 44, mix(P.wood, P.gray2, 0.3));
  p.line(10, 41, 21, 45, mix(P.wood, P.gray2, 0.3));
  p.line(10, 42, 21, 46, mix(P.woodD, P.gray2, 0.3));
  p.line(11, 43, 20, 47, darken(mix(P.woodD, P.gray2, 0.3), 0.15));
  p.ring(15, 43, 2, P.steelL);
  p.px(15, 41, P.white);
  // ---- furnace window (right panel, fierce warm glow) ----
  p.rect(49, 37, 11, 11, BEAM_D);
  p.gradV(50, 38, 9, 9, P.goldL, P.ember);
  p.vline(38, 46, 54, BEAM_D);
  p.hline(50, 58, 42, BEAM_D);
  p.glow(54, 42, 6, P.gold, 0.4, 3);
  p.px(51, 39, P.white);
  // ---- arched stone doorway: dark forge, ember glow rising ----
  p.rect(28, 46, 16, 26, P.gray4);
  p.hline(30, 41, 44, P.gray4);
  p.hline(29, 42, 45, P.gray4);
  p.px(28, 46, P.gray3); p.px(43, 46, P.gray3);
  p.vline(47, 70, 28, lighten(P.gray4, 0.15));
  p.vline(47, 70, 43, P.gray3);
  crack(p, 30, 47, 8, 27, darken(P.gray2, 0.35));
  p.hline(33, 38, 46, P.ink);
  p.hline(31, 40, 47, P.ink);
  p.gradV(30, 48, 12, 24, P.ink, mix(P.ember, P.ink, 0.5));
  p.rect(31, 66, 10, 5, mix(P.ember, P.ink, 0.3));
  p.glow(36, 69, 6, P.ember, 0.5, 4);
  // anvil silhouette against the glow
  p.rect(32, 60, 8, 2, P.ink);
  p.px(40, 60, P.ink);
  p.rect(34, 62, 4, 3, P.ink);
  p.rect(33, 65, 6, 2, P.ink);
  // threshold step + spilling light
  p.rect(27, 70, 18, 2, P.gray4);
  p.hline(27, 44, 70, lighten(P.gray4, 0.15));
  doorSpill(p, 36, 70, 8);
  // drifting forge sparks
  p.sparkle(39, 52, P.emberL, 1);
  p.px(34, 50, P.ember);
  p.sparkle(33, 56, P.ember, 1);
  ashPile(p, 12, 70, 4);
  ashPile(p, 60, 70, 3);
  // light + finish
  p.shadeBottom(0.1, 64);
  p.rimLight(P.rim, 0.35, -1, -1);
  p.outline(P.ink);
}, { anchor: [36, 71] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc_wardrobe — torn awning, mannequin silhouette in a dim warm window
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc_wardrobe', 72, 72, (p) => {
  const wall = PLAS, wallL = PLAS_L, wallD = mix(PLAS, P.gray2, 0.4);
  const rfA = mix(P.sakura, P.gray2, 0.5);          // dust-faded rose roof
  const rfD = darken(rfA, 0.22), rfL = lighten(rfA, 0.18);
  const awnA = mix(P.sakura, P.gray2, 0.4), awnB = mix(P.purpleL, P.gray2, 0.45);
  p.softShadow(36, 70, 29, 3, 0.35, P.ink);
  // ---- wall body ----
  p.gradV(9, 26, 54, 46, wallL, wall);
  p.rect(59, 26, 4, 46, wallD);
  p.rect(9, 26, 2, 46, mix(P.white, P.gray3, 0.3));
  p.rect(61, 26, 2, 46, mix(P.white, P.gray2, 0.55));
  p.speckle(11, 30, 50, 20, wallD, 18, 13);
  crack(p, 13, 30, 13, 19);
  crack(p, 57, 48, 11, 8);
  // ---- foundation ----
  p.rect(8, 66, 56, 6, P.gray2);
  p.hline(8, 63, 66, P.gray3);
  p.speckle(9, 67, 54, 4, P.gray1, 14, 9);
  // ---- gabled roof — faded rose, hole on the right slope ----
  for (let i = 0; i <= 19; i++) {
    const y = 3 + i;
    const half = 2 + Math.round(i * 29 / 19);
    const x0 = 36 - half, x1 = 36 + half;
    p.hline(x0, x1, y, rfA);
    if (i % 3 === 2) p.hline(x0 + 1, x1 - 1, y, mix(rfA, rfD, 0.45));
    p.hline(x1 - Math.max(2, half >> 2), x1, y, rfD);
    p.hline(x0, x0 + 1, y, rfL);
  }
  // roof hole (missing shingles) + rafters
  p.rect(46, 12, 8, 6, P.ink2);
  p.px(45, 13, rfD); p.px(54, 12, rfD); p.px(46, 18, rfD); p.px(53, 17, rfD);
  p.line(46, 13, 53, 17, BEAM);
  p.line(47, 12, 52, 14, BEAM_L);
  // eaves + under-eave shadow
  p.hline(4, 67, 23, rfD);
  p.hline(5, 66, 24, darken(rfD, 0.18));
  p.hline(9, 61, 25, mix(wall, P.ink, 0.25));
  // finial (bent)
  p.px(36, 2, P.goldD); p.px(37, 1, mix(P.gold, P.gray3, 0.3));
  // gable medallion: faded heart, cracked
  p.circle(36, 12, 4, mix(P.white, P.gray3, 0.25));
  p.ring(36, 12, 4, darken(awnA, 0.2));
  p.px(35, 10, awnA); p.px(37, 10, awnA);
  p.hline(34, 38, 11, awnA);
  p.hline(35, 37, 12, awnA);
  p.px(36, 13, awnA);
  p.line(34, 9, 38, 15, withAlpha(CRACK_C, 0.7));
  // ---- shop sign: thread spool, weathered ----
  p.rect(18, 28, 36, 7, mix(P.woodL, P.gray2, 0.35));
  p.hline(18, 53, 28, mix(P.woodD, P.gray2, 0.3)); p.hline(18, 53, 34, mix(P.woodD, P.gray2, 0.3));
  p.rect(32, 29, 2, 5, BEAM_D); p.rect(38, 29, 2, 5, BEAM_D);
  p.rect(34, 30, 4, 3, awnA);
  p.hline(34, 37, 30, lighten(awnA, 0.2));
  p.line(40, 31, 45, 33, awnA);
  p.hline(21, 28, 31, BEAM_D); p.hline(21, 25, 33, BEAM_D);
  p.px(19, 29, P.ink2); p.px(53, 34, P.ink2); // chipped sign corners
  // ---- TORN awning ----
  p.hline(10, 61, 37, darken(awnA, 0.25));          // rail
  for (let x = 11; x <= 60; x++) {
    const grp = Math.floor((x - 11) / 4);
    // two ripped-out sections: stripes missing entirely
    if (grp === 4 || grp === 5 || grp === 10) continue;
    const s = grp % 2;
    // ragged hem: stripe lengths vary
    const hem = 43 + ((x * 7) % 3) - (grp === 3 ? 2 : 0);
    p.vline(38, hem, x, s ? awnB : awnA);
  }
  // dangling tatters under the torn gap
  p.vline(38, 47, 28, awnA); p.px(28, 48, darken(awnA, 0.2));
  p.vline(38, 44, 33, awnB);
  p.vline(38, 46, 52, awnA); p.px(52, 47, darken(awnA, 0.2));
  // bare awning ribs showing in the gaps
  p.line(27, 38, 30, 42, P.gray3);
  p.line(51, 38, 54, 42, P.gray3);
  p.hline(11, 60, 38, withAlpha(P.white, 0.18));    // dusty sheen
  // ---- left window: boarded up ----
  p.rect(12, 46, 13, 14, BEAM_D);
  p.rect(13, 47, 11, 12, P.ink2);
  p.line(13, 48, 23, 57, BEAM); p.line(13, 49, 23, 58, BEAM_L);
  p.line(13, 57, 23, 48, BEAM);
  p.hline(13, 23, 52, BEAM);
  // ---- right display window: mannequin silhouette in dim warm light ----
  p.rect(47, 44, 15, 17, mix(P.white, P.gray3, 0.4));
  p.gradV(48, 45, 13, 15, mix(P.ember, P.ink2, 0.62), mix(P.ember, P.ink2, 0.78));
  p.glow(54, 51, 6, P.ember, 0.22, 3);
  // the mannequin (dark silhouette)
  p.px(54, 46, P.ink); p.px(54, 47, P.ink);                 // head knob + neck
  p.hline(53, 55, 48, P.ink);
  p.hline(52, 56, 49, P.ink);
  p.hline(52, 56, 50, P.ink);
  p.hline(53, 55, 51, P.ink);
  p.hline(53, 55, 52, P.ink);
  p.hline(52, 56, 53, P.ink);
  p.hline(51, 57, 54, P.ink);                               // skirt flare
  p.hline(51, 57, 55, P.ink);
  p.vline(56, 58, 54, P.ink);                               // stand pole
  p.hline(52, 56, 59, P.ink);                               // stand base
  // cracked glass pane
  p.line(48, 45, 52, 50, withAlpha(P.white, 0.35));
  p.px(49, 46, withAlpha(P.white, 0.5));
  // ---- centred door (warm light) ----
  p.rect(29, 50, 14, 22, BEAM_D);
  p.hline(30, 42, 49, BEAM_D);
  p.rect(31, 51, 10, 21, P.ink2);
  p.gradV(31, 51, 10, 21, P.ink2, mix(P.ember, P.ink, 0.42));
  p.rect(32, 65, 8, 6, mix(P.ember, P.ink, 0.25));
  p.hline(33, 39, 70, mix(P.emberL, P.ember, 0.5));
  p.px(40, 60, P.goldD); // handle
  // ribbon scrap snagged on the door frame (identity accent)
  p.line(43, 52, 46, 56, awnA);
  p.px(46, 57, darken(awnA, 0.2));
  // threshold + spill
  p.rect(28, 70, 16, 2, P.gray3);
  p.hline(28, 43, 70, lighten(P.gray3, 0.25));
  doorSpill(p, 36, 70, 7);
  ashPile(p, 15, 70, 3);
  // light + finish
  p.shadeBottom(0.1, 64);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [36, 71] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc_house — cosy small cottage, least ruined, warm windows + soft smoke
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc_house', 72, 72, (p) => {
  const wall = mix(P.bone, P.gray2, 0.3), wallL = lighten(wall, 0.14), wallD = darken(wall, 0.15);
  const rfB = mix(P.wood, P.gray2, 0.35), rfL = lighten(rfB, 0.2), rfD = darken(rfB, 0.22);
  p.softShadow(36, 70, 24, 3, 0.35, P.ink);
  // ---- gentle chimney smoke ----
  p.circle(50, 9, 2, mix(P.gray4, P.gray3, 0.4));
  p.circle(53, 6, 2, mix(P.gray4, P.gray3, 0.2));
  p.px(55, 3, mix(P.gray4, P.gray3, 0.3));
  p.px(51, 11, P.emberL);
  // ---- cottage wall body (smaller footprint) ----
  p.gradV(15, 36, 42, 36, wallL, wall);
  p.rect(15, 36, 2, 36, lighten(wall, 0.22));
  p.rect(55, 36, 2, 36, wallD);
  p.speckle(17, 40, 38, 20, wallD, 14, 7);
  crack(p, 20, 42, 9, 9); // only a light crack — least ruined
  // half-timber accents
  p.rect(15, 36, 42, 2, BEAM);
  p.hline(15, 56, 36, BEAM_L);
  p.rect(15, 54, 42, 1, withAlpha(BEAM, 0.6));
  // ---- stone footing ----
  p.rect(14, 66, 44, 6, P.gray2);
  p.hline(14, 57, 66, P.gray3);
  p.speckle(15, 67, 42, 4, darken(P.gray2, 0.2), 10, 11);
  // ---- gabled roof — intact but for a few missing shingles ----
  for (let y = 14; y <= 35; y++) {
    const half = 2 + Math.round((y - 14) * 1.24);
    const L = Math.max(11, 36 - half), R = Math.min(61, 36 + half);
    p.hline(L, R, y, rfB);
    p.hline(L, L + Math.floor(half * 0.45), y, rfL);
    if (y % 4 === 1) p.hline(L + 1, R - 1, y, rfD);
    p.px(R, y, rfD);
  }
  // missing shingle patches (small, charming not catastrophic)
  p.rect(26, 22, 3, 2, P.ink2); p.px(26, 22, rfD);
  p.rect(45, 28, 4, 2, P.ink2); p.px(48, 29, rfD);
  p.px(27, 24, BEAM_L); p.px(46, 29, BEAM);
  p.hline(10, 62, 35, rfD);
  p.hline(12, 60, 34, darken(rfD, 0.12));
  p.rect(34, 13, 5, 2, rfD);
  p.hline(34, 38, 13, rfL);
  // ---- small chimney ----
  p.rect(47, 12, 6, 12, P.gray3);
  p.rect(46, 11, 8, 2, P.gray4);
  p.vline(13, 23, 47, lighten(P.gray3, 0.18));
  p.vline(13, 23, 52, P.gray2);
  p.glow(50, 12, 2, P.ember, 0.35, 2);
  // gable window — warm
  p.rect(33, 22, 7, 7, BEAM_D);
  p.rect(34, 23, 5, 5, mix(P.ember, P.ink2, 0.45));
  p.px(36, 25, P.emberL);
  p.glow(36, 25, 3, P.ember, 0.3, 2);
  // ---- two warm windows flanking the door ----
  const win = (x) => {
    p.rect(x, 44, 9, 10, BEAM_D);
    p.gradV(x + 1, 45, 7, 8, P.emberL, P.ember);
    p.vline(45, 52, x + 4, BEAM_D);
    p.hline(x + 1, x + 7, 48, BEAM_D);
    p.glow(x + 4, 49, 5, P.ember, 0.35, 3);
    p.hline(x - 1, x + 9, 54, BEAM);              // sill
  };
  win(18);
  win(45);
  // window box w/ a single soul-bloom (teal) on the left sill
  p.rect(18, 55, 9, 2, BEAM);
  p.px(20, 54, P.shardD); p.px(21, 53, P.shard); p.px(21, 52, P.shardL);
  p.glow(21, 53, 2, P.shard, 0.35, 2);
  // shutter hanging askew beside the right window (the one ruin note)
  p.line(55, 44, 57, 52, BEAM);
  p.line(56, 44, 58, 52, BEAM_L);
  p.px(55, 44, P.gray3);
  // ---- centred cottage door (warm, welcoming) ----
  p.rect(30, 52, 12, 20, BEAM_D);
  p.hline(31, 40, 51, BEAM_D);
  p.rect(31, 53, 10, 19, mix(P.wood, P.gray2, 0.25));
  p.gradV(31, 53, 10, 4, lighten(mix(P.wood, P.gray2, 0.25), 0.15), mix(P.wood, P.gray2, 0.25));
  p.vline(55, 70, 34, darken(P.wood, 0.3));
  p.vline(55, 70, 38, darken(P.wood, 0.3));
  // door ajar: warm light slicing through the opening edge
  p.vline(54, 71, 40, mix(P.emberL, P.ember, 0.5));
  p.vline(56, 70, 41, mix(P.ember, P.ink, 0.3));
  p.px(33, 62, P.goldD); p.px(33, 61, P.gold);   // handle
  // little heart carved on the door
  p.px(35, 57, BEAM_D); p.px(37, 57, BEAM_D); p.px(36, 58, BEAM_D);
  // lantern by the door
  p.hline(26, 28, 50, BEAM_D);
  p.vline(51, 52, 27, P.gray3);
  p.rect(26, 53, 3, 4, P.goldD);
  p.px(27, 54, P.emberL); p.px(27, 55, P.emberL);
  p.glow(27, 55, 4, P.ember, 0.4, 3);
  // threshold + spill
  p.rect(28, 70, 16, 2, P.gray3);
  p.hline(28, 43, 70, lighten(P.gray3, 0.25));
  doorSpill(p, 36, 70, 7);
  // tiny fence remnant + ash by the corner
  p.vline(64, 70, 61, mix(P.wood, P.gray2, 0.4));
  p.vline(66, 70, 64, mix(P.woodD, P.gray2, 0.4));
  p.hline(60, 65, 67, mix(P.wood, P.gray2, 0.45));
  ashPile(p, 11, 70, 3);
  // light + finish
  p.shadeBottom(0.08, 64);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [36, 71] });
