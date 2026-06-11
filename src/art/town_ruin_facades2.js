// R20/B1 — 96×96 grand ruin facades (supersede the 72×72 ruin_fc_* set).
// Six buildings for the apocalyptic town exterior (末日遺跡), each keeping its
// R19 identity & motifs but bigger, grander and more detailed. Anchor [48,95]
// (base-centre); every doorway is HORIZONTALLY CENTRED on x=48 (cols ~39-57)
// so a glowing trigger tile due south of the anchor lines up with the door;
// the bottom 2px form a contact shadow band (softShadow drawn first).
// Style: desaturated stone/ash base + ember-orange (P.ember*) and soul-teal
// (P.shard*) accent glows, anime "kira" sparkles, rim light on the silhouette.
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
// ruin_fc2_church — broken spire stump + shattered rose window, soul-teal kira
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc2_church', 96, 96, (p) => {
  const wall = mix(P.bone, P.gray2, 0.5), wallL = lighten(wall, 0.16), wallD = darken(wall, 0.18);
  const roofC = mix(P.blueD, P.gray1, 0.5), roofL = lighten(roofC, 0.22), roofD = darken(roofC, 0.25);
  const trim = mix(P.holy, P.gray3, 0.35), trimD = darken(trim, 0.25);
  p.softShadow(48, 94, 42, 3, 0.35, P.ink);
  // ---- main hall wings ----
  p.rect(6, 68, 84, 28, wall);
  p.rect(6, 68, 2, 28, wallL);
  p.rect(88, 68, 2, 28, wallD);
  p.speckle(8, 72, 24, 20, wallD, 16, 3);
  p.speckle(62, 72, 26, 20, wallD, 16, 7);
  p.speckle(8, 70, 80, 8, ASH, 14, 19);
  crack(p, 12, 72, 14, 23);
  // left wing roof — intact slope rising to the tower
  for (let i = 0; i <= 15; i++) {
    const y = 52 + i;
    const lx = 33 - Math.round(i * 28 / 15);
    p.hline(lx, 34, y, i < 7 ? roofL : roofC);
  }
  p.hline(4, 34, 67, roofD);
  // right wing roof — COLLAPSED: only the lower fragment + exposed rafters
  for (let i = 10; i <= 15; i++) {
    const y = 52 + i;
    const rx = 62 + Math.round(i * 28 / 15);
    p.hline(62 + (15 - i), Math.min(rx, 91), y, roofD);
    p.px(62 + (15 - i), y, darken(roofD, 0.15));
  }
  p.hline(62, 90, 67, darken(roofD, 0.12));
  // charred rafters poking over the gap
  p.line(63, 53, 80, 62, BEAM);
  p.line(63, 57, 75, 63, BEAM_L);
  p.px(82, 63, BEAM_D); p.px(84, 64, BEAM_D);
  // wing windows: left lancet intact (soul-teal), right one shattered dark
  p.glow(19, 79, 6, P.shard, 0.35);
  p.rect(16, 73, 7, 13, trimD);
  p.rect(17, 74, 5, 11, P.shardD);
  p.rect(17, 74, 5, 3, P.shard);
  p.px(19, 78, P.shardL);
  p.sparkle(22, 71, P.shardL, 1);
  p.rect(73, 73, 7, 13, trimD);
  p.rect(74, 74, 5, 11, P.ink2);
  p.px(74, 74, P.shardD); p.px(78, 76, P.shardD); p.px(75, 82, P.shardD); // glass remnants
  p.px(72, 88, P.shard); p.px(79, 89, mix(P.shard, wall, 0.4));           // fallen shards
  // ---- central tower ----
  p.rect(34, 26, 28, 70, wall);
  p.gradV(34, 26, 28, 8, lighten(wall, 0.1), wall);
  p.rect(34, 26, 2, 70, wallL);
  p.rect(60, 26, 2, 70, wallD);
  crack(p, 39, 30, 12, 5);
  crack(p, 57, 56, 16, 9);
  // shallow buttresses hugging the tower base
  p.rect(31, 60, 3, 36, wallD); p.vline(60, 95, 31, lighten(wallD, 0.12));
  p.rect(62, 60, 3, 36, darken(wallD, 0.08)); p.vline(60, 95, 64, darken(wall, 0.3));
  // cornice under the belfry
  p.rect(33, 23, 30, 3, trim);
  p.hline(33, 62, 25, trimD);
  p.px(33, 23, darken(trim, 0.35)); p.px(62, 24, darken(trim, 0.35)); // chipped ends
  // belfry — bell gone, only a snapped chain + a faint soul glow inside
  p.rect(35, 11, 26, 12, wall);
  p.rect(35, 11, 2, 12, wallL);
  p.rect(59, 11, 2, 12, wallD);
  p.rect(40, 13, 16, 10, P.ink2);
  p.hline(42, 53, 12, P.ink2);
  p.glow(48, 17, 4, P.shard, 0.4, 3);
  p.vline(13, 16, 48, P.gray3); p.px(48, 17, P.gray2); // snapped bell chain
  p.hline(39, 57, 22, trimD);
  // ---- BROKEN spire: jagged stump + the fallen tip lying on the left roof ----
  p.hline(42, 54, 10, roofC);
  p.hline(41, 47, 9, roofC); p.px(51, 9, roofC); p.px(52, 9, roofD);
  p.px(42, 8, roofL); p.px(44, 8, roofC); p.px(49, 8, roofD);
  p.px(44, 7, roofL); p.px(47, 7, roofD);
  p.px(45, 6, lighten(roofL, 0.1)); p.px(46, 5, roofL);
  // snapped gold cross on the stump (tilted)
  p.line(46, 2, 49, 4, P.gold);
  p.px(45, 3, P.goldD); p.px(49, 1, P.goldL);
  // fallen spire tip on the left wing roof
  p.line(14, 56, 23, 61, roofD);
  p.line(14, 57, 22, 61, roofC);
  p.px(13, 55, P.goldD); p.px(12, 54, P.gold); // its broken cross finial
  // ---- large shattered soulshard rose window ----
  p.glow(48, 42, 11, P.shard, 0.45);
  p.circle(48, 42, 9, trim);
  p.circle(48, 42, 8, P.shardD);
  p.ring(48, 42, 5, withAlpha(trim, 0.8));               // tracery ring
  p.vline(34, 50, 48, withAlpha(trimD, 0.6));            // tracery spokes
  p.hline(40, 56, 42, withAlpha(trimD, 0.6));
  p.star4(48, 42, 6, P.shardL, P.white);
  p.px(48, 42, P.white);
  // missing wedge of glass (lower-right) + crack across the rose
  p.rect(52, 46, 3, 3, P.ink2); p.px(51, 48, P.ink2); p.px(55, 45, P.ink2);
  p.line(43, 37, 55, 48, withAlpha(CRACK_C, 0.8));
  // glass shards on the ledge below
  p.px(44, 53, P.shard); p.px(51, 54, P.shardL); p.px(48, 55, mix(P.shard, wall, 0.4));
  // kira sparkles drifting out of the rose
  p.sparkle(40, 34, P.white, 1);
  p.star4(58, 37, 2, P.shardL);
  p.sparkle(56, 52, P.shardL, 1);
  p.star4(38, 49, 2, withAlpha(P.shardL, 0.8));
  p.px(60, 31, P.shardL);
  // ---- cracked holy sigil between rose and door ----
  p.ring(48, 58, 3, mix(P.gold, P.gray3, 0.3));
  p.vline(56, 60, 48, mix(P.holy, P.gray3, 0.2));
  p.hline(46, 50, 58, mix(P.holy, P.gray3, 0.2));
  p.px(48, 58, P.holyL);
  p.line(45, 55, 51, 61, withAlpha(CRACK_C, 0.75)); // the sigil is split
  // ---- tall arched doorway (centred, ~18px, warm light, flush with y=95) ----
  p.rect(38, 66, 20, 30, trim);
  p.hline(40, 55, 65, trim); p.hline(42, 53, 64, trim); p.hline(44, 51, 63, trim); // arch
  p.rect(40, 68, 16, 28, P.ink2);
  p.hline(41, 54, 67, P.ink2); p.hline(43, 52, 66, P.ink2);
  p.gradV(40, 68, 16, 28, P.ink2, mix(P.ember, P.ink, 0.45));
  p.rect(41, 88, 14, 7, mix(P.ember, P.ink, 0.25));
  p.px(38, 66, darken(trim, 0.3)); p.px(57, 67, darken(trim, 0.3)); // chipped jamb
  // worship candles silhouetted just inside
  p.px(44, 86, P.ink); p.px(52, 86, P.ink);
  p.px(44, 85, P.emberL); p.px(52, 85, P.emberL);
  // stone step + spilling light
  p.rect(36, 93, 24, 3, P.gray3);
  p.hline(36, 59, 93, P.gray2);
  p.hline(42, 54, 94, mix(P.emberL, P.ember, 0.5));
  doorSpill(p, 48, 94, 10);
  ashPile(p, 14, 94, 5);
  ashPile(p, 80, 94, 4);
  // light + finish
  p.shadeBottom(0.1, 86);
  p.rimLight(P.rimCool, 0.3);
  p.outline(P.ink);
}, { anchor: [48, 95] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc2_guild — big timber-frame hall: cracked crest, lit lanterns, barricade
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc2_guild', 96, 96, (p) => {
  const tim = BEAM, timL = BEAM_L, timD = BEAM_D;
  p.softShadow(48, 94, 42, 3, 0.35, P.ink);
  // ---- plaster wall body ----
  p.gradV(6, 38, 84, 58, PLAS_L, PLAS_D);
  p.speckle(8, 41, 80, 34, darken(PLAS, 0.1), 34, 7);
  p.speckle(8, 39, 80, 12, ASH, 16, 23);
  crack(p, 18, 42, 18, 11);
  crack(p, 76, 64, 16, 4);
  // ---- timber frame: top rail / mid rail / studs ----
  p.rect(6, 38, 84, 3, tim); p.hline(6, 89, 38, timL);
  p.rect(6, 60, 84, 2, tim);
  p.rect(6, 38, 3, 42, tim);  p.vline(38, 79, 6, timL);
  p.rect(87, 38, 3, 42, tim);
  p.rect(27, 38, 2, 42, tim); p.vline(38, 79, 27, timL);
  p.rect(63, 38, 2, 42, tim); p.vline(38, 79, 63, timL);
  // X-brace in the lower-left panel (the right one has fallen — ghost marks)
  p.line(9, 78, 25, 64, tim); p.line(9, 64, 25, 78, tim);
  p.line(67, 77, 85, 65, withAlpha(timD, 0.35));
  // ---- stone base course ----
  p.rect(6, 80, 84, 16, P.gray2);
  p.hline(6, 89, 80, lighten(P.gray2, 0.2));
  p.hline(6, 89, 86, darken(P.gray2, 0.25));
  p.hline(6, 89, 91, darken(P.gray2, 0.25));
  for (let x = 10; x < 88; x += 9) { p.vline(81, 85, x, darken(P.gray2, 0.22)); p.vline(87, 90, x + 4, darken(P.gray2, 0.22)); p.vline(92, 95, x + 1, darken(P.gray2, 0.22)); }
  p.speckle(7, 81, 82, 12, lighten(P.gray2, 0.15), 20, 3);
  p.px(8, 79, P.gray1); p.px(84, 80, P.gray1); // dislodged base stones
  // ---- big gabled roof — right corner collapsed ----
  const rB = mix(P.redD, P.gray1, 0.45), rH = lighten(rB, 0.18), rS = darken(rB, 0.2);
  for (let y = 5; y <= 36; y++) {
    const w = 1 + Math.floor((y - 5) * 44 / 31);
    const L = Math.max(2, 48 - w);
    let R = Math.min(93, 48 + w);
    const cut = 66 + Math.floor((36 - y) * 0.9); // break line eating the right corner
    if (R > cut) R = cut;
    if (R >= L) {
      p.hline(L, R, y, rB);
      p.hline(L, L + Math.floor(w * 0.45), y, rH);
      if (y % 6 === 2) p.hline(L + 1, R - 1, y, rS);
      p.px(R, y, darken(rS, 0.12)); // jagged broken edge
    }
  }
  // exposed rafters in the collapsed corner
  p.line(68, 28, 86, 36, BEAM);
  p.line(70, 23, 90, 35, BEAM_L);
  p.px(91, 36, BEAM_D); p.px(88, 37, BEAM_D);
  // ridge cap + bent gold finial
  p.rect(46, 4, 5, 1, rB);
  p.px(48, 3, P.goldD); p.px(49, 2, mix(P.gold, P.gray3, 0.3));
  // eaves + under-eave shadow (stop where the corner fell)
  p.hline(2, 70, 36, tim);
  p.hline(4, 68, 37, timD);
  // attic vent w/ faint soul light inside
  p.rect(45, 16, 7, 8, timD);
  p.rect(46, 17, 5, 6, P.ink2);
  p.glow(48, 20, 3, P.shard, 0.3, 2);
  // ---- banner remnant hanging off the left eave (torn hem) ----
  const ban = mix(P.redD, P.gray2, 0.35);
  p.rect(14, 37, 6, 12, ban);
  p.vline(49, 52, 15, ban);                          // ragged tails
  p.vline(49, 54, 18, darken(ban, 0.15));
  p.hline(14, 19, 40, mix(P.goldD, P.gray3, 0.35));  // faded gold band
  p.px(16, 44, mix(P.goldD, P.gray3, 0.35)); p.px(17, 45, mix(P.goldD, P.gray3, 0.35));
  // ---- cracked guild crest shield over the door ----
  p.rect(41, 44, 15, 10, P.steelD);
  p.hline(42, 54, 54, P.steelD); p.hline(43, 53, 55, P.steelD); p.hline(45, 51, 56, P.steelD); p.px(48, 57, P.steelD);
  p.rect(42, 45, 13, 8, mix(P.steel, P.gray2, 0.35));
  p.hline(41, 55, 44, mix(P.goldD, P.gray2, 0.3));
  p.line(44, 53, 53, 46, P.steelL); p.line(53, 53, 44, 46, P.steelL); // crossed swords
  p.line(46, 44, 50, 57, withAlpha(CRACK_C, 0.85)); // the crack
  p.px(55, 53, P.ink2); p.px(54, 55, P.ink2);       // chipped corner
  p.px(48, 49, P.white);
  p.sparkle(52, 46, P.glint, 1);
  // ---- notice board beside the doorway (torn postings) ----
  p.rect(12, 46, 14, 12, P.woodD);
  p.rect(13, 47, 12, 10, mix(P.wood, P.gray2, 0.3));
  p.rect(14, 48, 4, 5, mix(P.bone, P.gray3, 0.2));
  p.px(15, 53, mix(P.bone, P.gray3, 0.2));          // dangling torn strip
  p.rect(19, 49, 4, 4, mix(P.bone, P.gray3, 0.35));
  p.rect(15, 54, 3, 2, mix(P.bone, P.gray3, 0.45));
  p.px(14, 49, P.redD); p.px(20, 50, P.ink2);       // faded marks
  // ---- twin notice lanterns flanking the door (still lit — warm) ----
  p.hline(32, 36, 62, timD); p.hline(60, 64, 62, timD);   // brackets off the mid rail
  p.vline(63, 65, 34, P.gray3); p.vline(63, 65, 62, P.gray3);
  p.rect(32, 66, 5, 8, P.goldD);
  p.rect(33, 67, 3, 6, P.emberL);
  p.rect(60, 66, 5, 8, P.goldD);
  p.rect(61, 67, 3, 6, P.emberL);
  p.glow(34, 70, 5, P.ember, 0.4, 3);
  p.glow(62, 70, 5, P.ember, 0.4, 3);
  // ---- arched timber door (centred, warm light) ----
  p.rect(39, 62, 18, 34, timD);
  p.ellipse(48, 64, 9, 5, timD);
  p.rect(41, 65, 14, 31, P.ink2);
  p.ellipse(48, 66, 6, 3, P.ink2);
  p.gradV(41, 65, 14, 31, P.ink2, mix(P.ember, P.ink, 0.42));
  p.rect(42, 88, 12, 7, mix(P.ember, P.ink, 0.25));
  p.px(39, 62, darken(timD, 0.25)); p.px(56, 63, darken(timD, 0.25));
  // ---- sandbag + crate barricade at the right corner ----
  const crate = mix(P.wood, P.gray2, 0.3);
  p.rect(74, 78, 9, 9, crate);                       // upper crate
  p.rectLine(74, 78, 9, 9, darken(crate, 0.25));
  p.line(74, 78, 82, 86, darken(crate, 0.18));
  p.rect(70, 86, 12, 9, darken(crate, 0.08));        // lower crate
  p.rectLine(70, 86, 12, 9, darken(crate, 0.3));
  p.px(75, 80, lighten(crate, 0.2));
  const bag = mix(P.sandD, P.gray2, 0.45);           // sandbags slumped against it
  p.ellipse(86, 91, 5, 3, bag);
  p.ellipse(89, 94, 5, 2, darken(bag, 0.1));
  p.ellipse(84, 94, 4, 2, bag);
  p.hline(83, 88, 89, lighten(bag, 0.15));
  // threshold + spill
  p.rect(37, 93, 22, 3, P.gray3);
  p.hline(37, 58, 93, lighten(P.gray3, 0.2));
  p.hline(43, 53, 94, mix(P.emberL, P.ember, 0.5));
  doorSpill(p, 48, 94, 9);
  ashPile(p, 12, 94, 5);
  p.sparkle(78, 42, P.emberL, 1);
  // light + finish
  p.shadeBottom(0.1, 86);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [48, 95] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc2_hall — grand colonnade, one column mid-fall, trophy column on steps
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc2_hall', 96, 96, (p) => {
  const goldT = mix(P.gold, P.gray3, 0.35);          // tarnished gold trim
  const goldTD = darken(goldT, 0.25);
  p.softShadow(48, 94, 44, 3, 0.35, P.ink);
  // ---- back wall (behind the colonnade) ----
  p.gradV(10, 32, 76, 54, STONE_D, darken(STONE_D, 0.12));
  p.speckle(12, 36, 72, 44, darken(STONE_D, 0.15), 28, 5);
  crack(p, 70, 36, 20, 7);
  crack(p, 16, 50, 14, 31);
  // ---- stepped base platform (3 steps down to the plaza) ----
  p.gradV(8, 84, 80, 4, P.gray3, P.gray2);
  p.gradV(5, 88, 86, 4, lighten(P.gray3, 0.08), P.gray2);
  p.gradV(2, 92, 92, 4, P.gray3, darken(P.gray2, 0.1));
  p.hline(8, 87, 84, lighten(P.gray3, 0.22));
  p.hline(5, 90, 88, lighten(P.gray3, 0.18));
  p.hline(2, 93, 92, lighten(P.gray3, 0.14));
  p.px(12, 84, P.gray1); p.px(76, 88, P.gray1); // chipped step edges
  // ---- entablature + tarnished gold band ----
  p.rect(4, 24, 88, 7, STONE);
  p.hline(4, 91, 24, STONE_L);
  p.hline(4, 91, 30, STONE_D);
  p.hline(6, 89, 27, goldT);
  p.px(16, 27, P.goldL); p.px(54, 27, P.goldL); p.px(78, 27, mix(P.goldL, P.gray3, 0.4)); // surviving glints
  // ---- pediment triangle — right corner sheared off ----
  for (let y = 6; y <= 23; y++) {
    const w = Math.floor((y - 5) * 42 / 18);
    const L = 48 - w;
    let R = 48 + w;
    const cut = 70 + Math.floor((23 - y) * 0.8);
    if (R > cut) R = cut;
    if (R >= L) {
      p.hline(L, R, y, STONE);
      p.hline(L, L + Math.max(1, Math.floor(w * 0.4)), y, STONE_L);
      p.px(R, y, STONE_D);
    }
  }
  p.line(70, 18, 80, 23, STONE_D);                 // shear face
  p.line(71, 15, 79, 20, withAlpha(CRACK_C, 0.7));
  crack(p, 40, 9, 11, 13);
  // trophy-cup relief in the pediment (tarnished, one handle gone)
  p.glow(48, 15, 6, P.gold, 0.25, 3);
  p.rect(44, 11, 9, 5, goldT);
  p.hline(44, 52, 11, lighten(goldT, 0.25));
  p.rect(47, 16, 3, 3, goldTD);                    // stem
  p.hline(44, 52, 19, goldT);                      // foot
  p.px(42, 12, goldT); p.px(42, 13, goldTD);       // left handle
  p.px(54, 12, withAlpha(goldTD, 0.4));            // right handle broken off
  p.sparkle(45, 10, P.goldL, 1);
  // ---- colonnade: outer pair + inner-left standing ----
  const colBody = (x) => {
    p.gradH(x, 32, 7, 52, STONE_L, STONE_D);       // shaft
    p.rect(x - 1, 31, 9, 2, STONE_L);              // capital
    p.rect(x - 1, 82, 9, 2, STONE);                // plinth
    p.hline(x - 1, x + 7, 83, STONE_D);
    p.vline(34, 81, x + 1, lighten(STONE_L, 0.12));
    for (let y = 38; y < 80; y += 8) p.hline(x, x + 6, y, withAlpha(STONE_D, 0.5)); // drum seams
  };
  colBody(11);
  colBody(27);
  colBody(78);
  crack(p, 80, 40, 14, 17);
  // the FOURTH column caught MID-FALL — tilted, slumped against its neighbour
  for (let i = 0; i <= 50; i++) {
    const y = 83 - i;
    const x = 62 + Math.round(i * 10 / 50);
    p.hline(x, x + 6, y, i % 8 === 6 ? STONE_D : STONE);
    if (i % 8 === 0) p.px(x + 1, y, STONE_L);
  }
  p.line(63, 82, 73, 34, withAlpha(lighten(STONE_L, 0.12), 0.7)); // lit tilting edge
  p.rect(61, 82, 9, 2, STONE);                     // its plinth, left behind
  p.hline(60, 70, 83, STONE_D);
  p.px(64, 80, darken(STONE_D, 0.15)); p.px(70, 79, darken(STONE_D, 0.15)); // sheared base
  // dust still rising where it slipped
  p.px(60, 78, mix(P.gray3, P.bone, 0.3)); p.px(59, 75, withAlpha(P.gray4, 0.5)); p.px(72, 76, withAlpha(P.gray4, 0.4));
  // ---- toppled TROPHY column lying across the steps ----
  for (let i = 0; i < 26; i++) {
    const x = 6 + i, y = 91 - Math.floor(i * 0.27);
    p.vline(y - 3, y, x, i % 7 === 6 ? STONE_D : STONE);
    if (i % 7 === 0) p.px(x, y - 3, STONE_L);
  }
  p.hline(6, 31, 93, withAlpha(P.ink, 0.25));      // contact shadow
  p.ellipse(7, 89, 2, 2, STONE_D);                 // broken end face
  p.px(7, 89, darken(STONE_D, 0.2));
  // the tarnished trophy cup still bolted to its head
  p.rect(31, 82, 4, 3, goldT);
  p.px(30, 83, goldTD); p.px(35, 82, lighten(goldT, 0.2));
  p.px(32, 85, goldTD); p.px(33, 85, goldTD);
  p.sparkle(34, 80, P.goldL, 1);
  // rubble bits
  p.px(36, 90, STONE_D); p.px(38, 92, STONE); p.px(34, 93, P.gray1);
  // ---- grand doorway (centred, tall, warm) ----
  p.rect(38, 38, 20, 47, goldTD);
  p.rect(39, 39, 18, 46, STONE_D);
  p.rect(40, 40, 16, 45, P.ink2);
  p.gradV(40, 40, 16, 45, P.ink2, mix(P.ember, P.ink, 0.42));
  p.rect(41, 74, 14, 11, mix(P.ember, P.ink, 0.25));
  p.hline(42, 54, 84, mix(P.emberL, P.ember, 0.55));
  p.hline(39, 56, 38, goldT);                      // gold lintel
  p.px(40, 39, P.goldL);
  // pillars of light hinted inside
  p.vline(48, 80, 43, withAlpha(P.ember, 0.18));
  p.vline(48, 80, 50, withAlpha(P.ember, 0.18));
  // ---- cracked laurel wreath above the lintel ----
  const laur = mix(P.gold, P.gray3, 0.45);
  p.ring(48, 34, 3, laur);
  p.px(44, 33, laur); p.px(52, 33, laur); p.px(43, 35, laur); p.px(53, 35, laur);
  p.px(45, 31, laur); p.px(51, 31, laur);
  p.line(46, 31, 50, 37, withAlpha(CRACK_C, 0.8)); // wreath split in two
  p.px(54, 38, laur);                              // a fallen leaf on the lintel
  // warm light spilling down the three steps
  p.hline(42, 54, 86, mix(P.ember, P.ink, 0.45));
  p.hline(41, 55, 87, withAlpha(P.ember, 0.3));
  p.hline(41, 55, 90, withAlpha(P.ember, 0.28));
  p.hline(40, 56, 93, withAlpha(P.ember, 0.2));
  doorSpill(p, 48, 90, 11);
  // soul-flame brazier at the right end of the steps (teal accent)
  p.rect(88, 78, 6, 3, P.gray2);
  p.hline(88, 93, 78, lighten(P.gray2, 0.2));
  p.vline(81, 87, 90, P.gray1);
  p.glow(90, 75, 5, P.shard, 0.5, 3);
  p.px(90, 75, P.shardL); p.px(90, 74, P.shard); p.px(91, 76, P.shard);
  p.sparkle(93, 71, P.shardL, 1);
  ashPile(p, 70, 94, 4);
  // light + finish
  p.shadeBottom(0.1, 86);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [48, 95] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc2_smith — live chimney plume, fierce furnace window, forge-arch door
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc2_smith', 96, 96, (p) => {
  const roofC = mix(P.gray2, P.blueD, 0.4), roofL = lighten(roofC, 0.2), roofD = darken(roofC, 0.22);
  p.softShadow(48, 94, 42, 3, 0.35, P.ink);
  // ---- LIVE ember plume above the chimney (drawn first, sits behind nothing) ----
  p.circle(74, 7, 4, mix(P.gray4, P.gray2, 0.4));
  p.circle(79, 3, 3, mix(P.gray4, P.gray2, 0.25));
  p.circle(69, 4, 2, mix(P.gray4, P.gray2, 0.5));
  p.circle(83, 1, 2, mix(P.gray4, P.gray2, 0.2));
  p.px(72, 10, P.ember); p.px(76, 6, P.emberL); p.px(80, 8, P.ember); p.px(70, 2, P.ember);
  p.glow(74, 10, 5, P.ember, 0.4, 3);
  p.sparkle(84, 2, P.emberL, 1);
  p.sparkle(66, 1, P.ember, 1);
  // ---- wall body: ash-dulled plaster ----
  p.gradV(6, 44, 84, 52, PLAS, PLAS_D);
  p.speckle(8, 46, 80, 26, darken(PLAS, 0.1), 30, 9);
  crack(p, 14, 47, 20, 3);
  crack(p, 80, 58, 18, 21);
  // ---- stone base course ----
  p.gradV(6, 74, 84, 22, P.gray3, P.gray2);
  p.hline(6, 89, 74, P.gray4);
  p.hline(6, 89, 79, darken(P.gray3, 0.2));
  p.hline(6, 89, 85, darken(P.gray3, 0.2));
  p.hline(6, 89, 91, darken(P.gray3, 0.2));
  for (let x = 10; x < 88; x += 9) { p.vline(75, 78, x, darken(P.gray3, 0.18)); p.vline(80, 84, x + 4, darken(P.gray3, 0.18)); p.vline(86, 90, x, darken(P.gray3, 0.18)); p.vline(92, 95, x + 5, darken(P.gray3, 0.18)); }
  p.speckle(7, 75, 82, 18, P.gray2, 24, 9);
  // ---- timber frame ----
  p.rect(6, 44, 84, 3, BEAM);
  p.hline(6, 89, 44, BEAM_L);
  p.rect(6, 47, 3, 27, BEAM); p.vline(47, 73, 6, BEAM_L);
  p.rect(87, 47, 3, 27, BEAM); p.vline(47, 73, 89, BEAM_D);
  p.rect(30, 47, 2, 27, BEAM); p.vline(47, 73, 30, BEAM_L);
  p.rect(62, 47, 2, 27, BEAM); p.vline(47, 73, 62, BEAM_L);
  // ---- gabled slate roof — LEFT slope partially caved in ----
  for (let y = 14; y <= 43; y++) {
    const half = 2 + Math.round((y - 14) * 1.42);
    const L = Math.max(2, 48 - half);
    const R = Math.min(93, 48 + half);
    let holeL = 0, holeR = -1;                      // caved patch on the lower-left slope
    if (y >= 30 && y <= 40) { holeL = Math.max(L, 16); holeR = Math.min(32, R); }
    p.hline(L, R, y, roofC);
    p.hline(L, Math.min(47, L + Math.floor(half * 0.5)), y, roofL);
    if (y % 5 === 1) p.hline(L + 2, R - 2, y, roofD);
    p.px(R, y, roofD);
    if (holeR >= holeL) {
      p.hline(holeL, holeR, y, P.ink2);            // caved hole — dark interior
      p.px(holeL, y, darken(roofD, 0.2));
      p.px(holeR, y, darken(roofD, 0.2));
    }
  }
  // rafters across the roof hole
  p.line(17, 31, 31, 39, BEAM);
  p.line(21, 30, 30, 35, BEAM_L);
  p.hline(2, 92, 43, roofD);
  p.rect(45, 13, 7, 2, roofD);
  p.hline(45, 51, 13, roofL);
  p.px(48, 12, P.goldD);
  // ---- big stone chimney (right slope) — alive ----
  p.gradV(68, 13, 13, 26, P.gray4, P.gray3);
  p.rect(66, 9, 17, 4, P.gray4);
  p.hline(66, 82, 9, lighten(P.gray4, 0.25));
  p.vline(13, 38, 68, lighten(P.gray4, 0.18));
  p.vline(13, 38, 80, P.gray2);
  p.hline(69, 79, 19, P.gray2);
  p.hline(69, 79, 25, P.gray2);
  p.hline(69, 79, 31, P.gray2);
  p.speckle(69, 14, 11, 23, P.gray2, 16, 5);
  crack(p, 72, 15, 13, 15, darken(P.gray2, 0.3));
  p.rect(68, 8, 13, 1, darken(P.ember, 0.2));      // hot throat
  p.glow(74, 8, 4, P.ember, 0.5, 3);
  // ---- anvil sign on a wall bracket (left of the door) ----
  p.hline(15, 25, 48, BEAM_D);                     // bracket arm
  p.px(24, 49, BEAM_D); p.px(23, 50, BEAM_D);      // strut
  p.vline(49, 51, 17, P.gray4); p.vline(49, 51, 23, P.gray4); // chains
  p.rect(13, 52, 14, 9, mix(P.wood, P.gray2, 0.3));
  p.rectLine(13, 52, 14, 9, mix(P.woodD, P.gray2, 0.3));
  // painted anvil pictogram
  p.rect(16, 54, 8, 2, P.ink2);
  p.px(24, 54, P.ink2);                            // the horn
  p.rect(18, 56, 4, 2, P.ink2);
  p.rect(17, 58, 6, 1, P.ink2);
  p.px(15, 53, lighten(P.wood, 0.2));              // worn paint catch
  // ---- horseshoe nailed over the forge arch (luck holds) ----
  const shoe = P.steelL;
  p.px(46, 53, shoe); p.px(47, 52, shoe); p.px(48, 52, shoe); p.px(49, 52, shoe); p.px(50, 53, shoe);
  p.px(45, 54, shoe); p.px(51, 54, shoe);
  p.px(45, 55, shoe); p.px(51, 55, shoe);
  p.px(45, 56, shoe); p.px(51, 56, shoe);
  p.px(46, 57, shoe); p.px(50, 57, shoe);          // open ends point down
  p.px(47, 52, P.white);
  // ---- furnace window (right panel, fierce glow) ----
  p.rect(66, 50, 15, 14, BEAM_D);
  p.gradV(67, 51, 13, 12, P.goldL, P.ember);
  p.vline(51, 62, 73, BEAM_D);
  p.hline(67, 79, 56, BEAM_D);
  p.glow(73, 56, 8, P.gold, 0.4, 3);
  p.px(68, 52, P.white);
  p.sparkle(77, 53, P.glint, 1);
  // ---- forge-arch doorway: dark smithy, ember glow rising ----
  p.rect(38, 62, 20, 34, P.gray4);                 // stone arch surround
  p.hline(40, 55, 60, P.gray4);
  p.hline(39, 56, 61, P.gray4);
  p.px(38, 62, P.gray3); p.px(57, 62, P.gray3);
  p.vline(63, 95, 38, lighten(P.gray4, 0.15));
  p.vline(63, 95, 57, P.gray3);
  crack(p, 40, 63, 9, 27, darken(P.gray2, 0.35));
  p.hline(43, 52, 62, P.ink);
  p.hline(41, 54, 63, P.ink);
  p.gradV(40, 64, 16, 32, P.ink, mix(P.ember, P.ink, 0.5));
  p.rect(41, 88, 14, 7, mix(P.ember, P.ink, 0.3));
  p.glow(48, 92, 7, P.ember, 0.5, 4);
  // anvil silhouette against the glow
  p.rect(43, 80, 10, 2, P.ink);
  p.px(53, 80, P.ink); p.px(54, 80, P.ink);        // the horn
  p.rect(45, 82, 6, 4, P.ink);
  p.rect(44, 86, 8, 2, P.ink);
  // drifting forge sparks in the doorway
  p.sparkle(52, 70, P.emberL, 1);
  p.px(45, 67, P.ember);
  p.sparkle(44, 75, P.ember, 1);
  // ---- stacked ingots + a barrel by the wall ----
  const ing = mix(P.steel, P.gray3, 0.3);
  p.rect(11, 88, 7, 3, ing); p.hline(11, 17, 88, lighten(ing, 0.25));
  p.rect(19, 88, 7, 3, darken(ing, 0.08)); p.hline(19, 25, 88, lighten(ing, 0.2));
  p.rect(15, 85, 7, 3, lighten(ing, 0.06)); p.hline(15, 21, 85, lighten(ing, 0.3));
  p.px(16, 84, P.glint);                           // fresh-forged glint
  const brl = mix(P.wood, P.gray2, 0.25);          // the barrel
  p.rect(27, 82, 9, 13, brl);
  p.gradH(27, 82, 9, 13, lighten(brl, 0.12), darken(brl, 0.12));
  p.hline(27, 35, 85, P.iron); p.hline(27, 35, 91, P.iron);
  p.ellipse(31, 82, 4, 1, lighten(brl, 0.2));
  p.vline(83, 94, 31, withAlpha(darken(brl, 0.3), 0.5));
  // threshold + spilling light
  p.rect(37, 93, 22, 3, P.gray4);
  p.hline(37, 58, 93, lighten(P.gray4, 0.15));
  p.hline(42, 54, 94, mix(P.emberL, P.ember, 0.5));
  doorSpill(p, 48, 94, 10);
  ashPile(p, 86, 94, 4);
  // light + finish
  p.shadeBottom(0.1, 86);
  p.rimLight(P.rim, 0.35, -1, -1);
  p.outline(P.ink);
}, { anchor: [48, 95] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc2_wardrobe — torn awning, wide mannequin window, curtained doorway
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc2_wardrobe', 96, 96, (p) => {
  const wall = PLAS, wallL = PLAS_L, wallD = mix(PLAS, P.gray2, 0.4);
  const rfA = mix(P.sakura, P.gray2, 0.5);          // dust-faded rose roof
  const rfD = darken(rfA, 0.22), rfL = lighten(rfA, 0.18);
  const awnA = mix(P.sakura, P.gray2, 0.35), awnB = mix(P.sakuraL, P.gray3, 0.5);
  p.softShadow(48, 94, 41, 3, 0.35, P.ink);
  // ---- wall body ----
  p.gradV(8, 32, 78, 64, wallL, wall);
  p.rect(82, 32, 4, 64, wallD);
  p.rect(8, 32, 2, 64, mix(P.white, P.gray3, 0.3));
  p.speckle(10, 36, 74, 24, wallD, 24, 13);
  crack(p, 13, 36, 16, 19);
  crack(p, 79, 62, 14, 8);
  // ---- foundation ----
  p.rect(7, 88, 82, 8, P.gray2);
  p.hline(7, 88, 88, P.gray3);
  p.speckle(8, 89, 80, 6, P.gray1, 18, 9);
  // ---- gabled roof — faded rose, hole on the right slope ----
  for (let i = 0; i <= 26; i++) {
    const y = 3 + i;
    const half = 2 + Math.round(i * 40 / 26);
    const x0 = 48 - half, x1 = 48 + half;
    p.hline(x0, x1, y, rfA);
    if (i % 4 === 2) p.hline(x0 + 1, x1 - 1, y, mix(rfA, rfD, 0.45));
    p.hline(x1 - Math.max(2, half >> 2), x1, y, rfD);
    p.hline(x0, x0 + 1, y, rfL);
  }
  // roof hole (missing shingles) + bare rafters
  p.rect(60, 15, 11, 8, P.ink2);
  p.px(59, 16, rfD); p.px(71, 15, rfD); p.px(60, 23, rfD); p.px(70, 22, rfD);
  p.line(60, 17, 70, 22, BEAM);
  p.line(61, 15, 68, 18, BEAM_L);
  // eaves + under-eave shadow
  p.hline(3, 92, 30, rfD);
  p.hline(4, 91, 31, darken(rfD, 0.18));
  p.hline(8, 85, 32, mix(wall, P.ink, 0.25));
  // bent gold finial
  p.px(48, 2, P.goldD); p.px(49, 1, mix(P.gold, P.gray3, 0.3));
  // gable medallion: faded sakura heart, cracked
  p.circle(48, 13, 5, mix(P.white, P.gray3, 0.25));
  p.ring(48, 13, 5, darken(awnA, 0.2));
  p.px(46, 11, awnA); p.px(50, 11, awnA);
  p.hline(45, 47, 12, awnA); p.hline(49, 51, 12, awnA);
  p.hline(45, 51, 13, awnA);
  p.hline(46, 50, 14, awnA);
  p.px(48, 15, awnA);
  p.line(45, 10, 51, 17, withAlpha(CRACK_C, 0.7));
  p.sparkle(54, 8, P.sakuraL, 1);
  // ---- shop sign: thread spool + needle, weathered ----
  p.hline(9, 84, 33, withAlpha(P.sakura, 0.35));    // sakura fascia trim
  p.rect(22, 34, 52, 9, mix(P.woodL, P.gray2, 0.35));
  p.hline(22, 73, 34, mix(P.woodD, P.gray2, 0.3)); p.hline(22, 73, 42, mix(P.woodD, P.gray2, 0.3));
  p.rect(42, 36, 8, 2, BEAM_D); p.rect(42, 41, 8, 2, BEAM_D);   // spool flanges
  p.rect(43, 38, 6, 3, awnA);                                   // wound thread
  p.hline(43, 48, 38, lighten(awnA, 0.2));
  p.line(52, 41, 60, 36, P.steelL);                             // the needle
  p.px(61, 35, P.steelL); p.px(61, 36, P.ink2);                 // its eye
  p.line(50, 41, 53, 42, awnA);                                 // trailing thread
  p.px(26, 37, P.ink2); p.px(72, 41, P.ink2);                   // chipped sign corners
  p.hline(26, 33, 38, BEAM_D); p.hline(26, 31, 40, BEAM_D);     // faded lettering strokes
  // ---- TORN striped awning ----
  p.hline(9, 84, 46, darken(awnA, 0.25));           // rail
  for (let x = 10; x <= 83; x++) {
    const grp = Math.floor((x - 10) / 5);
    if (grp === 4 || grp === 5 || grp === 11) continue;          // ripped-out stripes
    const s = grp % 2;
    const hem = 53 + ((x * 7) % 3) - (grp === 8 ? 2 : 0);        // ragged hem
    p.vline(47, hem, x, s ? awnB : awnA);
  }
  // dangling tatters under the torn gaps
  p.vline(47, 58, 32, awnA); p.px(32, 59, darken(awnA, 0.2));
  p.vline(47, 55, 38, awnB);
  p.vline(47, 57, 66, awnA); p.px(66, 58, darken(awnA, 0.2));
  // bare ribs showing in the gaps
  p.line(31, 47, 35, 52, P.gray3);
  p.line(64, 47, 68, 52, P.gray3);
  p.hline(10, 83, 47, withAlpha(P.white, 0.18));    // dusty sheen
  // ---- left display window: boarded up ----
  p.rect(12, 58, 17, 20, BEAM_D);
  p.rect(13, 59, 15, 18, P.ink2);
  p.line(13, 60, 27, 74, BEAM); p.line(13, 61, 27, 75, BEAM_L);
  p.line(13, 75, 27, 61, BEAM);
  p.hline(13, 27, 67, BEAM);
  p.px(15, 62, P.gray3); p.px(25, 72, P.gray3);     // nail heads
  // ---- right display window: mannequin in dim warm light ----
  p.rect(62, 56, 22, 24, mix(P.white, P.gray3, 0.4));
  p.gradV(63, 57, 20, 22, mix(P.ember, P.ink2, 0.6), mix(P.ember, P.ink2, 0.78));
  p.glow(72, 66, 8, P.ember, 0.22, 3);
  // the mannequin (dark dress form on a stand)
  p.px(72, 59, P.ink); p.px(72, 60, P.ink);                 // head knob + neck
  p.hline(70, 74, 61, P.ink);
  p.hline(69, 75, 62, P.ink);
  p.hline(69, 75, 63, P.ink);
  p.hline(70, 74, 64, P.ink);
  p.hline(70, 74, 65, P.ink);
  p.hline(69, 75, 66, P.ink);
  p.hline(68, 76, 67, P.ink);                               // skirt flare
  p.hline(67, 77, 68, P.ink);
  p.hline(67, 77, 69, P.ink);
  p.vline(70, 73, 72, P.ink);                               // stand pole
  p.hline(69, 75, 74, P.ink);                               // stand base
  p.px(70, 62, P.sakura); p.px(69, 63, P.sakuraD);          // a ribbon still pinned on
  // cracked glass pane + dusty glints
  p.line(63, 57, 68, 63, withAlpha(P.white, 0.35));
  p.px(64, 58, withAlpha(P.white, 0.5));
  p.sparkle(80, 59, withAlpha(P.white, 0.6), 1);
  // ---- centred doorway, curtained ----
  p.rect(39, 60, 18, 36, BEAM_D);
  p.hline(40, 55, 59, BEAM_D);
  p.rect(41, 62, 14, 34, P.ink2);
  p.gradV(41, 62, 14, 34, P.ink2, mix(P.ember, P.ink, 0.4));
  // hanging curtain across the top 2/3 (sakura, ragged hem, parted mid)
  for (let x = 41; x <= 54; x++) {
    const hem = 80 + ((x * 5) % 4) - (x === 47 || x === 48 ? 6 : 0);
    const c = (x & 1) ? mix(P.sakura, P.gray2, 0.45) : mix(P.sakuraD, P.gray2, 0.4);
    p.vline(62, hem, x, c);
  }
  p.hline(41, 54, 62, darken(mix(P.sakura, P.gray2, 0.45), 0.25)); // rod shadow
  // warm light slicing through the part + under the hem
  p.vline(74, 80, 47, mix(P.ember, P.ink2, 0.5));
  p.vline(74, 80, 48, mix(P.ember, P.ink2, 0.5));
  p.rect(42, 88, 12, 7, mix(P.ember, P.ink, 0.28));
  p.hline(43, 53, 94, mix(P.emberL, P.ember, 0.5));
  // ribbon scrap snagged on the door frame (identity accent)
  p.line(56, 63, 59, 68, awnA);
  p.px(59, 69, darken(awnA, 0.2));
  // threshold + spill
  p.rect(37, 93, 22, 3, P.gray3);
  p.hline(37, 58, 93, lighten(P.gray3, 0.25));
  doorSpill(p, 48, 94, 9);
  ashPile(p, 18, 94, 4);
  // light + finish
  p.shadeBottom(0.1, 86);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [48, 95] });

// ═════════════════════════════════════════════════════════════════════════════
// ruin_fc2_house — homely cottage, least ruined: patched roof, lit flower windows
// ═════════════════════════════════════════════════════════════════════════════
defineSprite('ruin_fc2_house', 96, 96, (p) => {
  const wall = mix(P.bone, P.gray2, 0.3), wallL = lighten(wall, 0.14), wallD = darken(wall, 0.15);
  const rfB = mix(P.wood, P.gray2, 0.35), rfL = lighten(rfB, 0.2), rfD = darken(rfB, 0.22);
  const woodDoor = mix(P.wood, P.gray2, 0.25);
  p.softShadow(48, 94, 34, 3, 0.35, P.ink);
  // ---- gentle chimney smoke ----
  p.circle(66, 11, 3, mix(P.gray4, P.gray3, 0.4));
  p.circle(70, 7, 2, mix(P.gray4, P.gray3, 0.2));
  p.px(73, 3, mix(P.gray4, P.gray3, 0.3));
  p.px(67, 14, P.emberL);
  // ---- cottage wall body (smaller footprint — homely) ----
  p.gradV(18, 46, 60, 50, wallL, wall);
  p.rect(18, 46, 2, 50, lighten(wall, 0.22));
  p.rect(76, 46, 2, 50, wallD);
  p.speckle(21, 52, 54, 28, wallD, 20, 7);
  crack(p, 24, 54, 11, 9); // only a light crack — least ruined
  // half-timber accents
  p.rect(18, 46, 60, 2, BEAM);
  p.hline(18, 77, 46, BEAM_L);
  p.rect(18, 70, 60, 1, withAlpha(BEAM, 0.6));
  // ---- stone footing ----
  p.rect(17, 88, 62, 8, P.gray2);
  p.hline(17, 78, 88, P.gray3);
  p.speckle(18, 89, 60, 6, darken(P.gray2, 0.2), 14, 11);
  // ---- gabled roof — PATCHED but whole ----
  for (let y = 18; y <= 45; y++) {
    const half = 2 + Math.round((y - 18) * 1.18);
    const L = Math.max(13, 48 - half), R = Math.min(82, 48 + half);
    p.hline(L, R, y, rfB);
    p.hline(L, L + Math.floor(half * 0.45), y, rfL);
    if (y % 5 === 1) p.hline(L + 1, R - 1, y, rfD);
    p.px(R, y, rfD);
  }
  // mended patches (fresh planks nailed over the holes — cared for)
  const patch = mix(P.woodL, P.gray2, 0.25);
  p.rect(30, 28, 6, 4, patch); p.rectLine(30, 28, 6, 4, darken(patch, 0.25));
  p.px(31, 29, P.iron); p.px(34, 30, P.iron);      // patch nails
  p.rect(58, 35, 7, 4, darken(patch, 0.06)); p.rectLine(58, 35, 7, 4, darken(patch, 0.28));
  p.px(59, 36, P.iron); p.px(63, 37, P.iron);
  p.rect(40, 22, 4, 3, P.ink2); p.px(40, 22, rfD); // one small spot still open
  p.hline(12, 84, 45, rfD);
  p.hline(14, 82, 44, darken(rfD, 0.12));
  p.rect(45, 17, 7, 2, rfD);
  p.hline(45, 51, 17, rfL);
  // ---- small chimney (gently smoking) ----
  p.rect(62, 16, 8, 16, P.gray3);
  p.rect(61, 14, 10, 3, P.gray4);
  p.vline(17, 31, 62, lighten(P.gray3, 0.18));
  p.vline(17, 31, 69, P.gray2);
  p.glow(66, 15, 3, P.ember, 0.35, 2);
  // gable window — warm
  p.rect(44, 28, 9, 9, BEAM_D);
  p.rect(45, 29, 7, 7, mix(P.ember, P.ink2, 0.45));
  p.px(48, 32, P.emberL);
  p.glow(48, 32, 4, P.ember, 0.3, 2);
  // ---- two warm windows flanking the door, dried-flower boxes ----
  const win = (x) => {
    p.rect(x, 56, 12, 13, BEAM_D);
    p.gradV(x + 1, 57, 10, 11, P.emberL, P.ember);
    p.vline(57, 67, x + 5, BEAM_D);
    p.hline(x + 1, x + 10, 62, BEAM_D);
    p.glow(x + 5, 62, 6, P.ember, 0.35, 3);
    p.hline(x - 1, x + 12, 69, BEAM);              // sill
  };
  win(22);
  win(62);
  const dry = mix(P.sandD, P.gray2, 0.3);          // dried blooms
  const fbox = (x) => {
    p.rect(x, 70, 12, 3, BEAM);
    p.hline(x, x + 11, 70, BEAM_L);
    p.px(x + 2, 69, dry); p.px(x + 3, 68, dry); p.px(x + 5, 69, darken(dry, 0.12));
    p.px(x + 7, 68, dry); p.px(x + 8, 69, dry); p.px(x + 9, 69, lighten(dry, 0.12));
  };
  fbox(22);
  fbox(62);
  // one stubborn soul-bloom still alive in the left box
  p.px(27, 67, P.shardL); p.px(27, 68, P.shard);
  p.glow(27, 67, 2, P.shard, 0.35, 2);
  // ---- centred cottage door (warm, welcoming) ----
  p.rect(39, 64, 18, 32, BEAM_D);
  p.hline(40, 55, 63, BEAM_D);
  p.rect(41, 66, 14, 30, woodDoor);
  p.gradV(41, 66, 14, 5, lighten(woodDoor, 0.15), woodDoor);
  p.vline(70, 94, 45, darken(P.wood, 0.3));        // plank joints
  p.vline(70, 94, 50, darken(P.wood, 0.3));
  // door ajar: warm light slicing through the opening edge
  p.vline(67, 95, 54, mix(P.emberL, P.ember, 0.5));
  p.vline(69, 94, 53, mix(P.ember, P.ink, 0.3));
  p.px(43, 80, P.goldD); p.px(43, 79, P.gold);     // handle
  // little heart carved on the door
  p.px(46, 72, BEAM_D); p.px(47, 72, BEAM_D); p.px(49, 72, BEAM_D); p.px(50, 72, BEAM_D);
  p.hline(46, 50, 73, BEAM_D);
  p.hline(47, 49, 74, BEAM_D);
  p.px(48, 75, BEAM_D);
  // lantern by the door (still tended)
  p.hline(33, 36, 66, BEAM_D);
  p.vline(67, 68, 34, P.gray3);
  p.rect(33, 69, 4, 5, P.goldD);
  p.px(34, 70, P.emberL); p.px(34, 71, P.emberL); p.px(35, 71, P.ember);
  p.glow(34, 71, 5, P.ember, 0.4, 3);
  p.sparkle(31, 64, P.emberL, 1);
  // threshold + spill
  p.rect(38, 93, 20, 3, P.gray3);
  p.hline(38, 57, 93, lighten(P.gray3, 0.25));
  p.hline(43, 53, 94, mix(P.emberL, P.ember, 0.5));
  doorSpill(p, 48, 94, 9);
  // tiny fence remnant by the right corner
  p.vline(86, 94, 82, mix(P.wood, P.gray2, 0.4));
  p.vline(88, 94, 86, mix(P.woodD, P.gray2, 0.4));
  p.hline(80, 88, 90, mix(P.wood, P.gray2, 0.45));
  ashPile(p, 13, 94, 3);
  // light + finish
  p.shadeBottom(0.08, 86);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [48, 95] });
