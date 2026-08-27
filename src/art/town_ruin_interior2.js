// R28/W4-G (ART_SPEC 7) — interior SPATIAL + NARRATIVE density set.
//
// The R19/R20 interiors were symmetric boxes narrower than the viewport, so half
// the screen was out-of-bounds band and the props were all mirror pairs of the
// same six rint_* sprites. This file supplies the four things ART_SPEC 7 asks
// each room to own, plus the out-of-bounds treatment:
//
//   intf_*   one DEDICATED floor material per room (a 7th floorVar slot)
//   intd_*   flat ground decals (spills / soot / chalk) — dress bare floor cheaply
//   rfoc_*   the room's ONE "working" focal installation (animated + light pool)
//   rnar_*   three NON-SHARED narrative objects per room
//   rfg_*    one ceiling-hung FOREGROUND occluder per room (drawn after actors)
//   int_oob_* layered out-of-bounds tiles (2 darkness steps + ruin silhouettes)
//
// Style is continuous with town_ruin_interior.js: ash-dulled wood/stone/gilt,
// ember-orange + soul-teal accents, standing props end body → rimLight/softShadow
// → outline(P.ink). Floor/decal/OOB tiles carry NO P.ink outline (they must tile
// or lie flat) and follow the R26 rule — no element at a FIXED per-tile position
// with enough contrast to read as a grid once repeated.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ── shared tones (mirrors town_ruin_interior.js so the two sets sit together) ──
const RWOOD = mix(P.wood, P.gray1, 0.28);
const RWOODD = mix(P.woodD, P.gray1, 0.34);
const RWOODL = mix(P.woodL, P.gray2, 0.24);
const RSTONE = mix(P.gray2, P.ink2, 0.18);
const RGOLD = mix(P.gold, P.gray2, 0.38);
const RGOLDD = mix(P.goldD, P.gray1, 0.36);
const ASH = mix(P.gray3, P.gray4, 0.35);
const RIRON = mix(P.iron, P.gray1, 0.30);
// tile bases — kept identical to town_ruin_tiles.js so a dedicated material reads
// as the SAME room, just a differently-used patch of it.
const PLANK = mix(P.woodD, P.gray1, 0.34);
const ISTONE = darken(mix(P.gray1, P.gray2, 0.42), 0.06);
const IWALL = mix(P.gray1, P.ink2, 0.38);

// ════════════════════════════════════════════════════════════════════════════
//  1. DEDICATED FLOOR MATERIALS (floorVar slot 6 — one per room)
//     Low contrast on purpose: these cover 2-5 tile clusters, and anything with
//     a hard motif at a fixed offset bakes into a visible grid (R26 rule).
// ════════════════════════════════════════════════════════════════════════════

// R28/W4-G note (R26 rule, learned the hard way in the first capture): a floor TILE has no
// world position, so ANY motif drawn at a fixed offset inside it — a wax pool, an ale ring, a
// brass fret, a rag-rug scrap — repeats on a perfect grid the moment the tile is laid in a
// patch. The dedicated materials below therefore carry only BASE VALUE/HUE plus fine grain;
// every readable shape (spills, scorches, plaques, thread) lives in the world-positioned
// intd_* decals in section 2, where it can land wherever it likes.

// intf_church — the wax field before the altar: flagstone gone pale and cloudy under
// decades of dripped votive wax, soot-greyed in the hollows.
defineSprite('intf_church', 16, 16, (p) => {
  const base = mix(ISTONE, P.bone, 0.16);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.06), darken(base, 0.05));
  p.hline(0, 15, 7, withAlpha(darken(base, 0.16), 0.7));      // the slab seams the room already has
  p.vline(0, 15, 11, withAlpha(darken(base, 0.16), 0.6));
  const wax = mix(P.bone, base, 0.55);
  p.speckle(0, 0, 16, 16, withAlpha(wax, 0.45), 14, 61);      // wax bloom, fine
  p.speckle(0, 0, 16, 16, withAlpha(lighten(wax, 0.10), 0.35), 9, 137);
  p.speckle(0, 0, 16, 16, darken(base, 0.09), 8, 17);         // soot in the hollows
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.ember, 0.22), 0.30), 4, 211);
}, { anchor: [0, 0] });

// intf_guild — the drinking end of the hall: planks gone black with years of spilled ale
// and scored all over by knife points and dragged chair legs.
defineSprite('intf_guild', 16, 16, (p) => {
  const base = darken(mix(PLANK, P.ink2, 0.16), 0.04);
  p.rect(0, 0, 16, 16, base);
  for (let b = 0; b < 4; b++) {
    const y = b * 4;
    p.gradV(0, y, 16, 3, lighten(base, 0.05), darken(base, 0.03));
    p.hline(0, 15, y + 3, darken(base, 0.20));
  }
  p.speckle(0, 0, 16, 16, darken(base, 0.16), 14, 29);        // soaked-in patches
  p.speckle(0, 0, 16, 16, lighten(base, 0.07), 7, 71);
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.ink, 0.35), 0.5), 6, 149);
  p.speckle(0, 0, 16, 16, withAlpha(darken(base, 0.24), 0.7), 5, 197);   // knife points
}, { anchor: [0, 0] });

// intf_forge — the working floor around the fire: stone burnt charcoal-dark and studded
// with cooled cinders, one or two of them not quite out.
defineSprite('intf_forge', 16, 16, (p) => {
  const base = mix(ISTONE, P.ink2, 0.38);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.06), darken(base, 0.05));
  p.hline(0, 15, 9, withAlpha(darken(base, 0.14), 0.7));
  p.vline(0, 15, 3, withAlpha(darken(base, 0.14), 0.6));
  p.speckle(0, 0, 16, 16, mix(base, P.ink, 0.42), 15, 13);    // soot
  p.speckle(0, 0, 16, 16, mix(base, P.ember, 0.26), 6, 37);   // cooled cinders
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.emberL, 0.35), 0.55), 3, 163);
  p.speckle(0, 0, 16, 16, lighten(base, 0.07), 6, 83);
}, { anchor: [0, 0] });

// intf_cloth — the cutting floor: boards scrubbed pale, chalk-dusted, and never entirely
// free of clipped selvedge and thread ends.
defineSprite('intf_cloth', 16, 16, (p) => {
  const base = lighten(mix(PLANK, P.sand, 0.24), 0.04);
  p.rect(0, 0, 16, 16, base);
  for (let b = 0; b < 4; b++) {
    const y = b * 4;
    p.gradV(0, y, 16, 3, lighten(base, 0.06), darken(base, 0.03));
    p.hline(0, 15, y + 3, darken(base, 0.18));
  }
  p.speckle(0, 0, 16, 16, withAlpha(mix(P.bone, base, 0.35), 0.45), 12, 23);   // chalk dust
  p.speckle(0, 0, 16, 16, darken(base, 0.08), 7, 97);
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.shardD, 0.5), 0.7), 3, 151);   // thread ends
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.red, 0.45), 0.6), 3, 181);
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.gold, 0.4), 0.55), 2, 233);
}, { anchor: [0, 0] });

// intf_hall — the hall of honour: pale cool marble, fine veining, kept swept.
defineSprite('intf_hall', 16, 16, (p) => {
  const base = mix(ISTONE, P.bone, 0.26);
  p.rect(0, 0, 16, 16, base);
  p.gradV(0, 0, 16, 16, lighten(base, 0.07), darken(base, 0.06));
  p.hline(0, 15, 7, withAlpha(darken(base, 0.13), 0.6));      // the same slab seams as int_stone
  p.vline(0, 15, 7, withAlpha(darken(base, 0.13), 0.5));
  p.speckle(0, 0, 16, 16, lighten(base, 0.09), 13, 11);       // veining flecks
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.shardD, 0.3), 0.35), 6, 43);
  p.speckle(0, 0, 16, 16, darken(base, 0.07), 7, 127);
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, RGOLD, 0.4), 0.35), 3, 191);   // a hint of brass dust
}, { anchor: [0, 0] });

// intf_home — the lived-in patch: boards worn pale and warm by bare feet.
defineSprite('intf_home', 16, 16, (p) => {
  const base = lighten(mix(PLANK, P.sandD, 0.30), 0.05);
  p.rect(0, 0, 16, 16, base);
  for (let b = 0; b < 4; b++) {
    const y = b * 4;
    p.gradV(0, y, 16, 3, lighten(base, 0.07), darken(base, 0.03));
    p.hline(0, 15, y + 3, darken(base, 0.19));
  }
  p.speckle(0, 0, 16, 16, withAlpha(lighten(base, 0.11), 0.6), 13, 31);   // foot-polished grain
  p.speckle(0, 0, 16, 16, darken(base, 0.08), 8, 59);
  p.speckle(0, 0, 16, 16, withAlpha(mix(base, P.ember, 0.20), 0.35), 4, 173);  // hearth warmth
}, { anchor: [0, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  2. GROUND DECALS (flat, drawn between tiles and props — no outline)
// ════════════════════════════════════════════════════════════════════════════

// intd_wax — a candle's worth of wax run out across the flagstones.
defineSprite('intd_wax', 14, 9, (p) => {
  const wax = mix(P.bone, P.gray3, 0.30);
  p.ellipse(6, 5, 5, 3, withAlpha(wax, 0.55));
  p.ellipse(6, 5, 3, 1.8, withAlpha(lighten(wax, 0.14), 0.6));
  p.px(2, 3, withAlpha(wax, 0.7)); p.px(11, 7, withAlpha(wax, 0.6));
  p.px(9, 2, withAlpha(lighten(wax, 0.2), 0.5));
  p.speckle(1, 1, 12, 7, withAlpha(wax, 0.35), 5, 13);
}, { anchor: [7, 5] });

// intd_ale — a mug went over here and nobody mopped it.
defineSprite('intd_ale', 15, 9, (p) => {
  const st = mix(P.woodD, P.ink2, 0.45);
  p.ellipse(7, 5, 6, 3.2, withAlpha(st, 0.5));
  p.ellipse(6, 5, 3.4, 1.8, withAlpha(darken(st, 0.2), 0.5));
  p.ring(12, 3, 2, withAlpha(st, 0.45));
  p.px(2, 7, withAlpha(st, 0.5)); p.px(13, 7, withAlpha(st, 0.4));
  p.speckle(1, 1, 13, 7, withAlpha(st, 0.3), 5, 29);
}, { anchor: [7, 5] });

// intd_soot — a scorch scar where a hot billet was dropped, cinders around it.
defineSprite('intd_soot', 15, 10, (p) => {
  const ch = mix(P.ink2, P.gray1, 0.25);
  p.ellipse(7, 5, 6, 3.4, withAlpha(ch, 0.6));
  p.ellipse(7, 5, 3.6, 2, withAlpha(darken(ch, 0.3), 0.7));
  p.px(4, 4, withAlpha(mix(ch, P.ember, 0.45), 0.8));
  p.px(10, 6, withAlpha(mix(ch, P.emberL, 0.35), 0.7));
  p.speckle(1, 1, 13, 8, withAlpha(ch, 0.45), 7, 17);
}, { anchor: [7, 5] });

// intd_thread — chalk arc, snipped selvedge and a dropped pin on the cutting floor.
defineSprite('intd_thread', 15, 10, (p) => {
  const chalk = withAlpha(mix(P.bone, P.gray3, 0.25), 0.5);
  p.line(1, 8, 7, 2, chalk);
  p.line(7, 2, 13, 5, withAlpha(mix(P.bone, P.gray3, 0.35), 0.4));
  p.px(3, 6, mix(P.shardD, P.gray2, 0.3)); p.px(4, 6, mix(P.shardD, P.gray2, 0.4));
  p.px(9, 7, mix(P.red, P.gray2, 0.35)); p.px(10, 8, mix(P.red, P.gray2, 0.45));
  p.px(11, 3, mix(P.gold, P.gray2, 0.35));
  p.px(6, 8, P.steelL);
  p.speckle(1, 1, 13, 8, withAlpha(P.gray3, 0.3), 4, 41);
}, { anchor: [7, 5] });

// intd_plaque — a name plate set flush into the hall floor, brass gone dull.
defineSprite('intd_plaque', 13, 8, (p) => {
  p.rect(1, 2, 11, 4, withAlpha(RGOLDD, 0.7));
  p.rect(2, 3, 9, 2, withAlpha(RGOLD, 0.6));
  p.hline(2, 10, 3, withAlpha(mix(RGOLD, P.goldL, 0.35), 0.55));
  p.hline(3, 5, 4, withAlpha(darken(RGOLDD, 0.3), 0.6));   // engraved letters, unreadable
  p.hline(7, 9, 4, withAlpha(darken(RGOLDD, 0.3), 0.5));
  p.px(1, 5, withAlpha(P.gray2, 0.5)); p.px(11, 2, withAlpha(P.gray2, 0.5));
  p.speckle(1, 2, 11, 4, withAlpha(ASH, 0.3), 4, 19);
}, { anchor: [6, 4] });

// intd_crumbs — someone ate here, on the floor, and dropped a sock doing it.
defineSprite('intd_crumbs', 13, 8, (p) => {
  p.ellipse(5, 5, 4, 2.2, withAlpha(mix(P.woodD, P.ink2, 0.4), 0.35));   // tea splash
  p.px(3, 3, mix(P.sand, P.gray2, 0.3)); p.px(6, 2, mix(P.sand, P.gray2, 0.4));
  p.px(8, 5, mix(P.sand, P.gray2, 0.3)); p.px(4, 6, mix(P.sand, P.gray2, 0.35));
  p.ellipse(10, 4, 2.4, 1.4, withAlpha(mix(P.gray2, P.blueL, 0.18), 0.8));   // the sock
  p.px(9, 3, withAlpha(mix(P.gray3, P.blueL, 0.2), 0.8));
  p.speckle(1, 1, 11, 6, withAlpha(P.gray3, 0.28), 4, 23);
}, { anchor: [6, 4] });

// intd_dust — an ash/grit drift that has collected where nobody walks. Shared by every
// room: it is the neutral ground-break that keeps a bare floor from reading as a sheet.
defineSprite('intd_dust', 15, 10, (p) => {
  // NOTE: kept DARKER than the floor. A pale drift reads as fog/steam sitting on the tiles;
  // grit that has settled into the low spots has to sit in shadow to read as grit.
  const d = mix(P.ink2, P.gray1, 0.30);
  p.ellipse(7, 5, 5.5, 2.6, withAlpha(d, 0.16));
  p.ellipse(5, 6, 3.2, 1.5, withAlpha(d, 0.14));
  p.speckle(1, 1, 13, 8, withAlpha(d, 0.34), 11, 37);
  p.speckle(2, 2, 11, 6, withAlpha(mix(P.gray2, P.gray3, 0.4), 0.20), 5, 89);
}, { anchor: [7, 5] });

// intd_crack — a floor crack with rubble grit lodged in it, drawn dark so it grounds.
defineSprite('intd_crack', 16, 11, (p) => {
  const ck = withAlpha(mix(P.ink2, P.gray1, 0.22), 0.55);
  p.line(1, 8, 6, 4, ck);
  p.line(6, 4, 10, 6, ck);
  p.line(10, 6, 14, 3, withAlpha(mix(P.ink2, P.gray1, 0.3), 0.42));
  p.line(6, 4, 7, 1, withAlpha(mix(P.ink2, P.gray1, 0.3), 0.38));   // a branch
  p.px(4, 6, withAlpha(P.gray3, 0.35)); p.px(11, 5, withAlpha(P.gray3, 0.3));
  p.speckle(1, 1, 14, 9, withAlpha(mix(P.ink2, P.gray1, 0.25), 0.25), 6, 53);
}, { anchor: [8, 5] });

// ════════════════════════════════════════════════════════════════════════════
//  3. FOCAL INSTALLATIONS — one per room, ANIMATED, "someone is working here".
//     Each has a LIGHT_BY_SPRITE entry (game/lights.js) so it also owns a
//     ground light pool on the deco channel.
// ════════════════════════════════════════════════════════════════════════════

// rfoc_censer (church) — the thurible still swings: an iron stand, a chained
// censer arcing side to side, soul-fire in its belly and incense curling up.
defineAnim('rfoc_censer', 20, 30, 4, (p, f) => {
  p.softShadow(10, 29, 7, 1.8, 0.30);
  const sw = [-2, -1, 1, 2][f];                       // the swing
  // tripod stand + gooseneck arm
  p.line(5, 29, 9, 14, RIRON); p.line(15, 29, 11, 14, RIRON);
  p.line(10, 29, 10, 20, darken(RIRON, 0.18));
  p.rect(8, 12, 4, 3, RIRON);
  p.hline(6, 13, 12, lighten(RIRON, 0.2));
  p.line(10, 12, 14, 6, RIRON);                       // arm reaching over
  p.px(14, 5, RGOLD);
  // chain down to the censer (redrawn per frame — it follows the swing)
  const hx = 14 + sw;
  p.line(14, 6, hx, 12, mix(P.steelD, P.gray2, 0.3));
  p.px(hx, 11, P.steelL);
  // censer body: pierced brass bowl, soul-fire inside
  p.glow(hx, 15, 6, P.shard, 0.30, 4);
  p.ellipse(hx, 15, 4, 3.4, RGOLDD);
  p.ellipse(hx, 15, 3, 2.4, RGOLD);
  p.ellipse(hx, 13, 3.4, 1.2, mix(RGOLD, P.goldL, 0.3));   // lid rim
  p.px(hx - 2, 15, mix(P.shard, RGOLDD, 0.4));             // pierce holes leaking light
  p.px(hx + 2, 16, mix(P.shard, RGOLDD, 0.4));
  p.px(hx, 16, P.shardL);
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
  // incense smoke + embers rise after the outline so they float free
  const puff = [0, 1, 2, 1][f];
  p.px(hx - 1 + puff, 10, withAlpha(P.gray3, 0.6));
  p.px(hx + puff, 8, withAlpha(P.gray3, 0.45));
  p.px(hx - 1 + puff, 6, withAlpha(P.gray4, 0.3));
  p.px(hx, 13, P.shardL);
  if (f % 2 === 0) p.star4(hx, 14, 2, withAlpha(P.shardL, 0.8), P.white);
}, { anchor: [10, 29], fps: 3 });

// rfoc_stewpot (guild) — the hall's cauldron over a low fire: it never goes out,
// it never gets washed, and it is the only reason anyone comes back alive.
defineAnim('rfoc_stewpot', 22, 22, 4, (p, f) => {
  p.softShadow(11, 21, 9, 2, 0.30);
  // fire ring: stacked stones + embers
  p.ellipse(11, 19, 8, 2.6, mix(P.gray2, P.ink2, 0.2));
  p.ellipse(11, 19, 6, 1.8, mix(P.gray1, P.ink2, 0.3));
  const gs = 0.28 + (f === 1 ? 0.1 : f === 3 ? 0.05 : 0);
  p.glow(11, 18, 7, P.ember, gs, 4);
  p.px(8, 18, P.emberL); p.px(13, 19, P.ember); p.px(11, 19, lighten(P.emberL, 0.15));
  // tripod
  p.line(3, 20, 9, 6, RIRON); p.line(19, 20, 13, 6, RIRON);
  p.line(11, 5, 11, 8, darken(RIRON, 0.2));
  p.px(11, 4, RIRON);
  // the pot: soot-black iron, bulged, a hook handle
  p.ellipse(11, 12, 7, 5.5, mix(P.ink2, P.gray1, 0.18));
  p.ellipse(11, 12, 6, 4.6, mix(P.gray1, P.ink2, 0.45));
  p.ellipse(11, 8, 6, 1.8, darken(mix(P.gray1, P.ink2, 0.4), 0.15));   // rim
  p.ellipse(11, 8, 5, 1.2, mix(P.woodD, P.leafD, 0.4));                // the stew
  p.hline(5, 17, 8, lighten(mix(P.gray1, P.ink2, 0.4), 0.18));
  p.line(6, 6, 11, 4, RIRON); p.line(16, 6, 11, 4, RIRON);             // bail handle
  p.px(4, 14, mix(P.ink, P.gray1, 0.3));                               // soot bloom
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  // bubbles surfacing + steam (after outline)
  const bub = [[9, 8], [13, 8], [11, 7], [10, 8]][f];
  p.px(bub[0], bub[1], mix(P.leafL, P.sand, 0.4));
  p.px(bub[0], bub[1] - 1, withAlpha(P.bone, 0.6));
  const sx = [0, 1, 0, -1][f];
  p.px(11 + sx, 5, withAlpha(P.gray4, 0.55));
  p.px(10 + sx, 3, withAlpha(P.gray4, 0.4));
  p.px(11 + sx, 1, withAlpha(P.gray3, 0.25));
}, { anchor: [11, 21], fps: 3 });

// rfoc_forgefire (blacksmith) — the fire is IN. A brick hearth, the bellows
// breathing, a billet buried in the coals glowing白熱 and throwing sparks.
defineAnim('rfoc_forgefire', 24, 26, 4, (p, f) => {
  p.softShadow(12, 25, 10, 2, 0.30);
  const hot = f % 2 === 0;                            // the bellows stroke
  // brick hearth block
  p.gradV(2, 12, 18, 13, mix(P.clay, P.gray1, 0.4), mix(P.clay, P.ink2, 0.5));
  p.hline(2, 19, 12, mix(P.clay, P.gray3, 0.35));
  p.hline(2, 19, 17, darken(mix(P.clay, P.gray1, 0.4), 0.2));    // brick courses
  p.hline(2, 19, 21, darken(mix(P.clay, P.gray1, 0.4), 0.2));
  p.vline(13, 16, 7, darken(mix(P.clay, P.gray1, 0.4), 0.18));
  p.vline(18, 21, 14, darken(mix(P.clay, P.gray1, 0.4), 0.18));
  p.speckle(3, 13, 16, 11, withAlpha(mix(P.ink2, P.clay, 0.3), 0.5), 7, 19);
  // fire bowl carved into the top
  p.ellipse(10, 12, 7, 3, mix(P.ink2, P.gray1, 0.2));
  p.glow(10, 11, hot ? 9 : 7, P.ember, hot ? 0.45 : 0.32, 4);
  p.ellipse(10, 12, 5.4, 2.2, hot ? P.emberL : P.ember);
  p.ellipse(10, 12, 3, 1.2, hot ? lighten(P.emberL, 0.25) : P.emberL);
  // the billet: half buried, working end white-hot
  p.line(6, 13, 15, 10, mix(P.gray2, P.steelD, 0.4));
  p.px(15, 10, hot ? P.white : P.emberL);
  p.px(14, 11, hot ? lighten(P.emberL, 0.3) : P.ember);
  // chimney flue rising off the back
  p.rect(14, 0, 7, 12, mix(P.gray1, P.ink2, 0.35));
  p.vline(0, 11, 14, mix(P.gray2, P.ink2, 0.15));
  p.hline(14, 20, 3, darken(mix(P.gray1, P.ink2, 0.35), 0.2));
  p.px(19, 6, mix(P.ink, P.gray1, 0.35));
  // bellows on the left, nozzle into the fire bed
  const bh = hot ? 4 : 6;                             // compressed / drawn
  p.gradV(0, 15 - (bh - 4), 7, bh, mix(P.wood, P.gray2, 0.3), RWOODD);
  p.hline(0, 6, 15 - (bh - 4), RWOODL);
  p.line(6, 17, 9, 14, RIRON);                        // nozzle
  p.px(1, 18, RIRON);                                 // handle stub
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  // spark shower (after outline so it glows clear of the body)
  const sp = [[8, 7], [11, 5], [9, 4], [12, 6]][f];
  p.px(sp[0], sp[1], P.white);
  p.px(sp[0] + 1, sp[1] + 2, P.emberL);
  p.px(sp[0] - 2, sp[1] + 3, withAlpha(P.ember, 0.8));
  if (hot) p.star4(10, 10, 3, withAlpha(P.emberL, 0.9), P.white);
}, { anchor: [12, 25], fps: 4 });

// rfoc_loom (clothing) — the loom is threaded and someone is mid-bolt: the
// shuttle travels, the warp is under tension, soul-dyed cloth grows on the beam.
defineAnim('rfoc_loom', 24, 26, 4, (p, f) => {
  p.softShadow(12, 25, 9, 1.8, 0.28);
  // frame — two uprights, top beam, cloth beam
  p.rect(1, 2, 3, 23, RWOODD);
  p.rect(20, 2, 3, 23, RWOODD);
  p.vline(2, 24, 1, RWOOD); p.vline(2, 24, 20, RWOOD);
  p.rect(1, 1, 22, 3, RWOOD);
  p.hline(1, 22, 1, RWOODL);
  p.px(6, 1, darken(RWOODD, 0.25));                    // gouge in the beam
  // warp threads under tension (uneven spacing — never a fixed comb)
  const warp = mix(P.bone, P.gray3, 0.35);
  for (const x of [6, 8, 9, 11, 13, 14, 16, 18]) p.vline(4, 17, x, withAlpha(warp, x % 3 ? 0.75 : 0.5));
  // heddle bar, lifted a pixel between frames
  const hb = f % 2 ? 10 : 9;
  p.hline(5, 19, hb, RWOODD);
  p.hline(5, 19, hb - 1, RWOODL);
  // the shuttle travelling the shed
  const shx = [6, 10, 14, 10][f];
  p.rect(shx - 2, hb + 1, 5, 2, mix(P.wood, P.sand, 0.35));
  p.px(shx - 3, hb + 2, RWOODD); p.px(shx + 3, hb + 2, RWOODD);   // pointed ends
  p.px(shx, hb + 1, lighten(P.sand, 0.2));
  p.hline(5, shx, hb + 2, withAlpha(mix(P.shard, P.gray2, 0.3), 0.8));  // weft paid out
  // finished cloth wound onto the lower beam — soul-dyed, faintly lit
  p.glow(12, 21, 6, P.shard, 0.18, 3);
  p.gradV(5, 18, 15, 4, mix(P.shardD, P.gray2, 0.25), mix(P.shardD, P.ink2, 0.35));
  p.hline(5, 19, 18, mix(P.shard, P.gray3, 0.2));
  p.px(9, 20, P.shardL); p.px(15, 19, withAlpha(P.shardL, 0.7));       // sheen on the nap
  p.rect(4, 22, 17, 3, RWOODD);                                         // cloth beam
  p.hline(4, 20, 22, RWOOD);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  if (f === 1) p.star4(shx, hb + 1, 2, withAlpha(P.shardL, 0.8), P.white);
}, { anchor: [12, 25], fps: 3 });

// rfoc_restore (achievements) — the curator's bench: a battered cup half
// polished back to gold, jars of paste, a candle burning down over the work.
defineAnim('rfoc_restore', 24, 22, 4, (p, f) => {
  p.softShadow(12, 21, 10, 1.8, 0.30);
  // bench
  p.rect(1, 8, 22, 4, RWOOD);
  p.hline(1, 22, 8, RWOODL);
  p.hline(1, 22, 11, darken(RWOODD, 0.2));
  p.rect(3, 12, 3, 9, RWOODD); p.rect(18, 12, 3, 9, RWOODD);
  p.line(6, 16, 18, 16, RWOODD);                       // stretcher
  p.speckle(2, 8, 20, 3, withAlpha(ASH, 0.4), 6, 23);
  // the trophy under restoration — right half brought back to gold, left dull
  p.rect(8, 3, 6, 4, RGOLDD);
  p.rect(11, 3, 3, 4, mix(RGOLD, P.goldL, 0.35));      // polished half
  p.hline(8, 13, 3, mix(RGOLD, P.goldL, 0.2));
  p.px(7, 3, RGOLDD); p.px(14, 3, RGOLD);              // handles
  p.rect(10, 7, 2, 1, RGOLDD);
  p.px(9, 4, darken(RGOLDD, 0.25));                    // tarnish still to go
  // rag mid-stroke over the dull half
  const rx = [8, 9, 10, 9][f];
  p.rect(rx, 5, 3, 2, mix(P.bone, P.gray2, 0.35));
  p.px(rx, 5, lighten(P.bone, 0.15));
  // polish jars + a brush
  p.rect(2, 5, 3, 3, mix(P.green, P.gray1, 0.5));
  p.hline(2, 4, 5, mix(P.greenL, P.gray2, 0.4));
  p.rect(17, 5, 2, 3, mix(P.bronze, P.gray2, 0.35));
  p.line(20, 7, 22, 4, RWOODD); p.px(22, 3, mix(P.sand, P.gray2, 0.3));
  // candle burning down at the bench end
  p.rect(15, 4, 1, 4, P.bone);
  p.px(15, 7, darken(P.bone, 0.2));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  // flame + the polish glint sweeping the cup (after outline)
  const lift = [0, -1, 0, 1][f];
  p.glow(15, 2 + lift, 3, P.ember, 0.4, 3);
  p.px(15, 2 + lift, P.emberL);
  p.px(15, 1 + lift, withAlpha(P.white, 0.85));
  if (f % 2 === 0) p.star4(12, 4, 2, withAlpha(P.glint, 0.9), P.white);
}, { anchor: [12, 21], fps: 3 });

// rfoc_hearth (personal) — your own small stove, kettle on, steam going. The
// one fire in this town that is lit for nobody but you.
defineAnim('rfoc_hearth', 20, 24, 4, (p, f) => {
  p.softShadow(10, 23, 8, 1.8, 0.30);
  // stone stove body
  p.gradV(1, 10, 18, 13, mix(P.gray2, P.ink2, 0.22), mix(P.gray1, P.ink2, 0.4));
  p.hline(1, 18, 10, mix(P.gray3, P.gray2, 0.4));
  p.hline(1, 18, 15, darken(mix(P.gray2, P.ink2, 0.22), 0.2));
  p.vline(16, 22, 6, darken(mix(P.gray2, P.ink2, 0.22), 0.16));
  p.px(14, 18, mix(P.gray2, P.moss, 0.35));            // damp patch at the base
  // fire box + its door, ajar
  p.rect(4, 16, 9, 6, mix(P.ink2, P.gray1, 0.15));
  const gs = 0.30 + (f === 0 ? 0.08 : f === 2 ? 0.04 : 0);
  p.glow(8, 19, 6, P.ember, gs, 4);
  p.ellipse(8, 20, 4, 2, P.ember);
  p.ellipse(8, 20, 2.4, 1.2, P.emberL);
  p.line(13, 15, 15, 21, RIRON);                       // the door swung open
  p.px(15, 18, P.steelL);
  // kettle on the plate
  p.ellipse(10, 8, 5, 3.4, mix(P.gray2, P.steelD, 0.4));
  p.ellipse(10, 8, 4, 2.6, mix(P.steel, P.gray1, 0.45));
  p.ellipse(10, 6, 3, 1.2, mix(P.steelL, P.gray2, 0.4));
  p.line(6, 6, 10, 3, mix(P.steelD, P.gray1, 0.3));    // handle
  p.line(14, 6, 10, 3, mix(P.steelD, P.gray1, 0.3));
  p.line(14, 8, 17, 5, mix(P.steel, P.gray1, 0.4));    // spout
  p.px(7, 9, mix(P.ink, P.gray1, 0.4));                // soot on the belly
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  // steam from the spout (after outline)
  const s = [0, 1, 2, 1][f];
  p.px(17 - s, 3, withAlpha(P.gray4, 0.6));
  p.px(16 - s, 1, withAlpha(P.gray4, 0.42));
  p.px(17 - s, 0, withAlpha(P.gray3, 0.25));
  p.px(9, 19, lighten(P.emberL, 0.2));
}, { anchor: [10, 23], fps: 3 });

// ════════════════════════════════════════════════════════════════════════════
//  4. NARRATIVE OBJECTS — three per room, NOT shared between rooms.
// ════════════════════════════════════════════════════════════════════════════

// ── church: 燭與經卷 ─────────────────────────────────────────────────────────

// rnar_ch_scribe — the copying desk: a sloped lectern, an open codex, quill
// still in the pot, a page abandoned half-lettered.
defineSprite('rnar_ch_scribe', 20, 20, (p) => {
  p.softShadow(10, 19, 8, 1.6, 0.28);
  p.rect(3, 12, 3, 7, RWOODD); p.rect(14, 12, 3, 7, RWOODD);   // legs
  p.line(5, 16, 15, 16, RWOODD);
  // sloped writing board
  p.gradV(1, 6, 18, 7, RWOOD, RWOODD);
  p.line(1, 6, 18, 9, RWOODL);
  p.hline(1, 18, 12, darken(RWOODD, 0.2));
  p.hline(2, 17, 13, RWOOD);                                    // pen ledge
  // the open codex
  p.rect(4, 4, 12, 5, mix(P.bone, P.gray3, 0.25));
  p.vline(4, 8, 10, mix(P.gray2, P.woodD, 0.4));                // spine
  p.hline(5, 8, 5, withAlpha(P.ink2, 0.7)); p.hline(5, 9, 6, withAlpha(P.ink2, 0.6));
  p.hline(12, 15, 5, withAlpha(P.ink2, 0.6)); p.hline(12, 14, 6, withAlpha(P.ink2, 0.5));
  p.hline(12, 13, 7, withAlpha(P.ink2, 0.35));                  // the line it stops on
  p.px(4, 4, lighten(P.bone, 0.15));
  p.rect(3, 3, 3, 1, mix(P.red, P.gray2, 0.35));                // ribbon marker
  p.px(3, 4, mix(P.red, P.gray2, 0.4));
  // ink pot + quill
  p.rect(16, 6, 3, 3, P.ink2);
  p.hline(16, 18, 5, mix(P.ink2, P.gray2, 0.4));
  p.line(17, 5, 19, 0, mix(P.bone, P.gray3, 0.2));              // quill
  p.px(19, 0, mix(P.bone, P.gray4, 0.15));
  p.px(17, 2, withAlpha(P.ink2, 0.7));
  // a loose page slid to the floor edge of the desk
  p.rect(0, 10, 4, 3, mix(P.bone, P.gray3, 0.35));
  p.hline(1, 3, 11, withAlpha(P.ink2, 0.5));
  p.speckle(2, 6, 16, 6, withAlpha(ASH, 0.35), 5, 29);
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.sparkle(10, 4, withAlpha(P.shardL, 0.5), 1);
}, { anchor: [10, 19] });

// rnar_ch_offering — the offering table: what the town could still spare.
// Stale bread, dried flowers, a child's carved toy, three soul shards.
defineSprite('rnar_ch_offering', 20, 16, (p) => {
  p.softShadow(10, 15, 8, 1.5, 0.28);
  p.gradV(1, 7, 18, 3, RSTONE, darken(RSTONE, 0.18));           // stone slab
  p.hline(1, 18, 7, lighten(RSTONE, 0.18));
  p.rect(5, 10, 3, 5, darken(RSTONE, 0.12)); p.rect(12, 10, 3, 5, darken(RSTONE, 0.12));
  p.px(6, 12, mix(RSTONE, P.moss, 0.4));
  // bread, gone hard
  p.ellipse(4, 5, 3, 2, mix(P.sand, P.woodD, 0.35));
  p.line(2, 4, 6, 4, darken(mix(P.sand, P.woodD, 0.35), 0.2));
  p.px(3, 4, lighten(P.sand, 0.12));
  // dried flowers, tied
  p.line(9, 6, 9, 2, mix(P.leafD, P.sandD, 0.5));
  p.line(10, 6, 11, 3, mix(P.leafD, P.sandD, 0.55));
  p.px(9, 1, mix(P.sakura, P.gray2, 0.45)); p.px(11, 2, mix(P.sakura, P.gray2, 0.5));
  p.px(10, 5, mix(P.sand, P.gray2, 0.3));                       // the twine
  // a carved toy horse someone's child left
  p.rect(14, 3, 4, 2, mix(P.wood, P.sand, 0.3));
  p.px(17, 2, mix(P.wood, P.sand, 0.3)); p.px(14, 5, RWOODD); p.px(17, 5, RWOODD);
  // three soul shards, the real offering
  p.glow(11, 8, 4, P.shard, 0.30, 3);
  p.px(10, 7, P.shardL); p.px(11, 8, P.shard); p.px(12, 7, P.shardD);
  p.speckle(2, 7, 16, 2, withAlpha(ASH, 0.4), 5, 17);
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
  p.star4(11, 7, 2, withAlpha(P.shardL, 0.85), P.white);
}, { anchor: [10, 15] });

// rnar_ch_bell — the tower bell, down on the flagstones where it fell, split
// from lip to crown. Nobody has managed to move it since.
defineSprite('rnar_ch_bell', 24, 18, (p) => {
  p.softShadow(12, 17, 11, 2, 0.32);
  // rubble it landed in
  p.ellipse(12, 16, 11, 2, mix(P.gray1, P.ink2, 0.3));
  p.px(2, 15, RSTONE); p.px(21, 16, RSTONE); p.px(5, 16, darken(RSTONE, 0.2));
  // the bell, lying on its side, mouth to the left
  p.ellipse(13, 9, 9, 7, RGOLDD);
  p.ellipse(13, 9, 7.5, 5.6, RGOLD);
  p.ellipse(6, 9, 2, 5.4, darken(RGOLDD, 0.2));                 // the mouth, in shadow
  p.ellipse(6, 9, 1.2, 4, mix(P.ink2, RGOLDD, 0.4));
  p.hline(8, 20, 4, mix(RGOLD, P.goldL, 0.3));                  // top edge catches light
  p.hline(8, 19, 14, darken(RGOLDD, 0.22));
  p.rect(21, 7, 3, 4, RGOLDD);                                  // crown / hanging loop
  p.px(23, 7, RGOLD);
  // the split — crown to lip, wide enough to see through
  p.line(20, 6, 8, 11, darken(RGOLDD, 0.45));
  p.px(15, 9, mix(P.ink2, RGOLDD, 0.5)); p.px(13, 10, mix(P.ink2, RGOLDD, 0.5));
  p.px(16, 8, mix(RGOLD, P.goldL, 0.4));                        // raw break edge
  // clapper spilled out of the mouth
  p.line(3, 12, 6, 10, RIRON);
  p.circle(2, 13, 1, mix(P.iron, P.gray2, 0.3));
  p.speckle(8, 5, 13, 8, withAlpha(ASH, 0.4), 7, 31);
  p.px(10, 12, mix(RGOLDD, P.moss, 0.4));                       // verdigris in the damp
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
}, { anchor: [12, 17] });

// ── guild: 任務板與酒桌 ──────────────────────────────────────────────────────

// rnar_gu_table — the long table: tankards, a knife stuck in the boards, dice
// mid-throw, and one seat nobody sits in any more.
defineSprite('rnar_gu_table', 28, 18, (p) => {
  p.softShadow(14, 17, 13, 2, 0.30);
  // table top + apron
  p.gradV(0, 5, 28, 4, RWOOD, RWOODD);
  p.hline(0, 27, 5, RWOODL);
  p.hline(0, 27, 8, darken(RWOODD, 0.22));
  p.hline(0, 27, 6, withAlpha(darken(RWOOD, 0.14), 0.5));       // plank seam
  p.rect(3, 9, 3, 8, RWOODD); p.rect(22, 9, 3, 8, RWOODD);      // legs
  p.line(6, 13, 22, 13, RWOODD);
  p.speckle(1, 5, 26, 3, withAlpha(ASH, 0.35), 8, 13);
  // three tankards, one on its side
  const mug = (x, tip) => {
    if (tip) { p.rect(x, 3, 4, 2, mix(P.bronze, P.gray2, 0.4)); p.px(x + 4, 4, RGOLDD); p.ellipse(x + 5, 5, 2, 1, withAlpha(mix(P.woodD, P.ink2, 0.4), 0.6)); }
    else { p.rect(x, 1, 3, 4, mix(P.bronze, P.gray2, 0.35)); p.hline(x, x + 2, 1, mix(P.bronze, P.gray3, 0.3)); p.px(x + 3, 2, RGOLDD); p.px(x, 1, lighten(P.bronze, 0.2)); }
  };
  mug(2, false); mug(8, false); mug(17, true);
  // knife driven into the boards, still standing
  p.line(24, 5, 24, 0, mix(P.steelL, P.gray2, 0.25));
  p.px(24, 1, P.steelL); p.px(24, 5, RWOODD);
  p.px(23, 5, darken(RWOODD, 0.3));                             // the gouge around it
  // dice, freshly thrown
  p.rect(12, 3, 2, 2, mix(P.bone, P.gray3, 0.2));
  p.px(12, 3, P.ink2); p.px(13, 4, P.ink2);
  p.rect(14, 4, 2, 2, mix(P.bone, P.gray3, 0.25));
  p.px(15, 4, P.ink2);
  // one chair, pulled back and never pushed in
  p.rect(25, 2, 3, 8, RWOODD);
  p.hline(25, 27, 2, RWOOD);
  p.px(26, 6, darken(RWOODD, 0.25));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [14, 17] });

// rnar_gu_maptable — the campaign table: the ten biomes drawn in charcoal,
// pins where hunters were lost, a black cord ringing what nobody goes near.
defineSprite('rnar_gu_maptable', 24, 18, (p) => {
  p.softShadow(12, 17, 11, 1.8, 0.30);
  p.rect(2, 11, 3, 6, RWOODD); p.rect(19, 11, 3, 6, RWOODD);
  p.gradV(0, 4, 24, 7, RWOOD, RWOODD);
  p.hline(0, 23, 4, RWOODL);
  p.hline(0, 23, 10, darken(RWOODD, 0.22));
  // the vellum map, curling at the corners
  p.rect(2, 1, 20, 8, mix(P.sand, P.gray3, 0.35));
  p.hline(2, 21, 1, lighten(mix(P.sand, P.gray3, 0.3), 0.14));
  p.px(2, 8, darken(mix(P.sand, P.gray3, 0.35), 0.2));
  p.px(21, 1, darken(mix(P.sand, P.gray3, 0.35), 0.2));         // curled corners
  // charcoal coastlines + a river
  const ch = withAlpha(P.ink2, 0.7);
  p.line(4, 6, 9, 3, ch); p.line(9, 3, 14, 5, ch); p.line(14, 5, 19, 2, ch);
  p.line(6, 8, 11, 7, withAlpha(P.ink2, 0.5));
  p.speckle(3, 2, 18, 6, withAlpha(P.ink2, 0.35), 6, 23);
  // pins — red for lost, teal for held
  p.px(7, 4, P.redL); p.px(7, 5, P.redD);
  p.px(13, 6, P.redL); p.px(13, 7, P.redD);
  p.px(17, 3, P.shardL); p.px(17, 4, P.shardD);
  // black cord ringing the crypt quarter
  p.ring(11, 5, 3, withAlpha(P.ink2, 0.8));
  p.px(8, 5, P.ink); p.px(14, 5, P.ink);
  // a compass and a spent candle stub weighing it down
  p.circle(20, 7, 2, RGOLDD);
  p.px(20, 6, mix(RGOLD, P.goldL, 0.3)); p.px(20, 7, P.redD);
  p.rect(3, 10, 1, 2, P.bone); p.px(3, 9, darken(P.bone, 0.2));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [12, 17] });

// rnar_gu_trophy — the wall trophy: a biome brute's skull, mounted, with the
// killing spear still through it and the contract nailed underneath.
defineSprite('rnar_gu_trophy', 20, 24, (p) => {
  // mounting plaque
  p.gradV(3, 12, 14, 8, RWOOD, RWOODD);
  p.hline(3, 16, 12, RWOODL);
  p.px(3, 19, darken(RWOODD, 0.25)); p.px(16, 19, darken(RWOODD, 0.25));
  // the skull
  p.ellipse(10, 7, 6, 5.4, mix(P.bone, P.gray3, 0.28));
  p.ellipse(10, 11, 4, 3, mix(P.bone, P.gray3, 0.34));          // jaw
  p.ellipse(7, 6, 1.6, 1.4, mix(P.ink2, P.gray1, 0.2));         // eye sockets
  p.ellipse(13, 6, 1.6, 1.4, mix(P.ink2, P.gray1, 0.2));
  p.px(7, 6, withAlpha(P.shardD, 0.8));                          // a last soul-ember
  p.px(10, 9, mix(P.ink2, P.gray1, 0.3));                        // nasal cavity
  p.hline(8, 12, 12, darken(mix(P.bone, P.gray3, 0.34), 0.2));   // teeth line
  p.px(8, 13, mix(P.bone, P.gray4, 0.15)); p.px(11, 13, mix(P.bone, P.gray4, 0.15));
  // horns, one snapped short
  p.line(5, 4, 2, 0, mix(P.bone, P.woodD, 0.35));
  p.line(15, 4, 17, 1, mix(P.bone, P.woodD, 0.35));
  p.px(17, 1, darken(mix(P.bone, P.woodD, 0.35), 0.3));          // the break
  // the spear still through the crown
  p.line(1, 11, 19, 3, RWOOD);
  p.px(19, 3, P.steelL); p.px(18, 4, P.steel);
  p.px(9, 7, darken(RWOODD, 0.3));
  // the contract, nailed under the plaque, stamped PAID
  p.rect(5, 14, 9, 5, mix(P.bone, P.gray3, 0.3));
  p.hline(6, 12, 15, withAlpha(P.ink2, 0.6)); p.hline(6, 11, 16, withAlpha(P.ink2, 0.5));
  p.hline(6, 10, 17, withAlpha(P.ink2, 0.4));
  p.circle(12, 17, 1, withAlpha(P.redD, 0.8));                   // wax seal
  p.px(5, 14, RIRON); p.px(13, 14, RIRON);                       // nails
  p.speckle(4, 13, 12, 6, withAlpha(ASH, 0.35), 5, 19);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [10, 23] });

// ── blacksmith: 爐火與半成品 ────────────────────────────────────────────────

// rnar_bs_anvil — the anvil, with a blade half drawn out on the face and the
// hammer set down exactly where it will be picked up again.
defineSprite('rnar_bs_anvil', 20, 18, (p) => {
  p.softShadow(10, 17, 8, 1.6, 0.32);
  // stump block
  p.gradV(4, 12, 12, 6, RWOOD, RWOODD);
  p.hline(4, 15, 12, RWOODL);
  p.vline(12, 17, 5, darken(RWOODD, 0.18));
  p.speckle(5, 13, 10, 4, withAlpha(mix(P.ink2, RWOODD, 0.4), 0.5), 6, 17);   // hammer bruising
  // anvil body: horn left, heel right, waisted
  p.rect(3, 7, 14, 3, mix(P.gray1, P.ink2, 0.25));
  p.hline(3, 16, 7, mix(P.steelD, P.gray2, 0.35));              // polished face
  p.hline(4, 15, 6, withAlpha(mix(P.steelL, P.gray3, 0.4), 0.7));
  p.rect(7, 10, 6, 2, mix(P.gray1, P.ink2, 0.35));              // waist
  p.rect(5, 11, 10, 2, mix(P.gray1, P.ink2, 0.25));             // base
  p.line(3, 8, 0, 9, mix(P.gray1, P.ink2, 0.25));               // the horn
  p.px(0, 9, mix(P.steelD, P.gray2, 0.3));
  p.px(16, 6, mix(P.ink2, P.gray1, 0.2));                       // hardy hole
  // the blade being drawn out — tang cold, edge still ember
  p.line(5, 6, 14, 4, mix(P.gray2, P.steelD, 0.45));
  p.px(14, 4, P.emberL); p.px(13, 4, P.ember);
  p.glow(14, 4, 4, P.ember, 0.35, 3);
  p.px(5, 6, RWOODD);                                           // the wrapped tang
  // hammer, resting where it was set down
  p.line(17, 12, 19, 6, RWOOD);
  p.rect(17, 4, 4, 3, mix(P.iron, P.gray1, 0.2));
  p.px(17, 4, P.steelL);
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.star4(14, 3, 2, withAlpha(P.emberL, 0.9), P.white);
}, { anchor: [10, 17] });

// rnar_bs_quench — the slack tub: black water skinned with scale, tongs hung
// on the rim, the last quench still steaming off it.
defineSprite('rnar_bs_quench', 18, 20, (p) => {
  p.softShadow(9, 19, 7, 1.6, 0.30);
  // tub — half barrel, iron banded
  p.rect(2, 7, 14, 12, RWOODD);
  p.gradV(3, 8, 12, 10, RWOOD, darken(RWOODD, 0.1));
  p.vline(8, 18, 5, darken(RWOODD, 0.15)); p.vline(8, 18, 11, darken(RWOODD, 0.15));
  p.hline(2, 15, 10, mix(P.iron, P.clay, 0.3));                 // hoops
  p.hline(2, 15, 16, darken(P.iron, 0.2));
  p.px(3, 10, lighten(P.iron, 0.2));
  // the water — black, an oily scale skin on top
  p.ellipse(9, 7, 6.6, 2.2, mix(P.ink2, P.gray1, 0.12));
  p.ellipse(9, 7, 5.4, 1.5, mix(P.ink, P.blue, 0.22));
  p.px(7, 7, withAlpha(mix(P.gray4, P.blueL, 0.4), 0.7));        // sheen
  p.px(11, 6, withAlpha(P.gray3, 0.5));
  p.px(9, 8, mix(P.ink2, P.ember, 0.25));                        // scale flake
  // tongs hooked over the rim
  p.line(13, 6, 16, 1, RIRON);
  p.line(15, 6, 17, 2, RIRON);
  p.px(14, 6, mix(P.iron, P.gray2, 0.3));
  p.px(16, 1, P.steelL);
  // a water line dried on the outside + a puddle it dripped
  p.hline(3, 14, 12, withAlpha(mix(RWOODD, P.ink2, 0.4), 0.6));
  p.ellipse(4, 19, 3, 1, withAlpha(mix(P.ink2, P.gray1, 0.3), 0.5));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  // steam lifting off the surface
  p.px(8, 4, withAlpha(P.gray4, 0.5));
  p.px(9, 2, withAlpha(P.gray4, 0.35));
  p.px(8, 0, withAlpha(P.gray3, 0.22));
}, { anchor: [9, 19] });

// rnar_bs_stock — the stock corner: a coal heap with the shovel left in it,
// bar iron leaning, and a crate of billets nobody has got to yet.
defineSprite('rnar_bs_stock', 22, 20, (p) => {
  p.softShadow(11, 19, 10, 1.8, 0.30);
  // coal heap
  const coal = mix(P.ink2, P.gray1, 0.15);
  p.ellipse(7, 16, 7, 4, coal);
  p.ellipse(6, 14, 5, 2.6, mix(coal, P.gray1, 0.25));
  p.px(4, 14, mix(coal, P.gray3, 0.35)); p.px(9, 13, mix(coal, P.gray3, 0.3));  // facet glints
  p.px(7, 15, mix(coal, P.blueL, 0.18));
  p.speckle(2, 13, 11, 5, darken(coal, 0.3), 7, 13);
  // shovel standing in the heap
  p.line(8, 14, 12, 2, RWOOD);
  p.rect(11, 0, 3, 3, mix(P.iron, P.gray2, 0.25));
  p.px(11, 0, P.steelL);
  // bar iron leaning on the wall
  p.line(15, 19, 17, 2, mix(P.gray2, P.steelD, 0.4));
  p.line(17, 19, 18, 4, mix(P.gray1, P.steelD, 0.5));
  p.line(19, 19, 20, 6, mix(P.iron, P.clay, 0.3));              // one gone to rust
  p.px(17, 2, P.steelL);
  // crate of billets
  p.rect(13, 13, 9, 6, RWOODD);
  p.hline(13, 21, 13, RWOODL);
  p.hline(13, 21, 16, darken(RWOODD, 0.2));
  p.px(14, 12, mix(P.gray2, P.steelD, 0.4)); p.px(16, 12, mix(P.gray2, P.steelD, 0.35));
  p.px(18, 12, mix(P.gray2, P.steelD, 0.45));                   // billet ends poking out
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [11, 19] });

// ── clothing: 布匹與試衣鏡 ──────────────────────────────────────────────────

// rnar_cl_bolts — bolts of cloth stacked and leaning: mostly grey salvage, one
// soul-dyed length kept for something that matters.
defineSprite('rnar_cl_bolts', 20, 22, (p) => {
  p.softShadow(10, 21, 9, 1.6, 0.28);
  // laid flat, stacked
  const bolt = (x, y, w, col) => {
    p.rect(x, y, w, 3, col);
    p.hline(x, x + w - 1, y, lighten(col, 0.14));
    p.hline(x, x + w - 1, y + 2, darken(col, 0.16));
    p.ellipse(x + w - 1, y + 1, 1.2, 1.5, darken(col, 0.22));   // rolled end
    p.px(x + w - 1, y + 1, lighten(col, 0.1));
  };
  bolt(1, 18, 17, mix(P.gray2, P.woodD, 0.3));
  bolt(2, 15, 15, mix(P.blue, P.gray1, 0.45));
  bolt(1, 12, 14, mix(P.red, P.gray1, 0.5));
  bolt(3, 9, 12, mix(P.sand, P.gray2, 0.4));
  // the good one, standing on end
  p.glow(17, 8, 5, P.shard, 0.22, 3);
  p.rect(15, 2, 4, 16, mix(P.shardD, P.gray2, 0.22));
  p.vline(2, 17, 15, mix(P.shard, P.gray3, 0.18));
  p.vline(2, 17, 18, darken(mix(P.shardD, P.gray2, 0.3), 0.2));
  p.ellipse(17, 2, 2, 1, mix(P.shard, P.gray3, 0.2));
  p.px(16, 6, P.shardL);
  // a measuring tape hung over the stack
  p.line(4, 9, 6, 4, mix(P.bone, P.gray3, 0.3));
  p.px(6, 3, mix(P.bone, P.gray4, 0.2));
  p.px(5, 6, withAlpha(P.ink2, 0.6)); p.px(5, 7, withAlpha(P.ink2, 0.5));   // tick marks
  p.speckle(2, 9, 14, 10, withAlpha(ASH, 0.3), 6, 37);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  p.star4(17, 5, 2, withAlpha(P.shardL, 0.8), P.white);
}, { anchor: [10, 21] });

// rnar_cl_sewing — the work table mid-garment: pincushion bristling, shears
// open, a spool run half out, chalk stub worn to nothing.
defineSprite('rnar_cl_sewing', 22, 18, (p) => {
  p.softShadow(11, 17, 10, 1.6, 0.28);
  p.rect(2, 11, 3, 6, RWOODD); p.rect(17, 11, 3, 6, RWOODD);
  p.gradV(0, 6, 22, 5, RWOOD, RWOODD);
  p.hline(0, 21, 6, RWOODL);
  p.hline(0, 21, 10, darken(RWOODD, 0.22));
  p.line(5, 14, 17, 14, RWOODD);
  // the garment in progress, pinned
  p.rect(2, 2, 10, 5, mix(P.purple, P.gray1, 0.45));
  p.hline(2, 11, 2, lighten(mix(P.purple, P.gray1, 0.4), 0.15));
  p.line(3, 6, 10, 4, withAlpha(mix(P.bone, P.gray3, 0.3), 0.7));   // basting stitch
  p.px(4, 3, P.steelL); p.px(8, 5, P.steelL); p.px(10, 3, P.steelL); // pins
  p.px(11, 6, mix(P.purple, P.gray2, 0.6));                          // raw edge
  // shears, open, lying across the corner
  p.line(13, 6, 18, 3, mix(P.steelL, P.gray2, 0.3));
  p.line(13, 6, 18, 5, mix(P.steel, P.gray2, 0.35));
  p.circle(12, 7, 1, RIRON); p.px(12, 5, RIRON);
  p.px(18, 3, P.steelL);
  // pincushion, bristling
  p.ellipse(16, 8, 2.4, 1.8, mix(P.red, P.gray1, 0.4));
  p.px(15, 7, P.steelL); p.px(17, 7, P.glint); p.px(16, 6, P.steelL);
  // spool run half out + the chalk stub
  p.rect(19, 7, 2, 3, RWOODD);
  p.rect(19, 8, 2, 1, mix(P.gold, P.gray2, 0.35));
  p.line(19, 9, 14, 10, withAlpha(mix(P.gold, P.gray2, 0.4), 0.8));
  p.px(6, 9, mix(P.bone, P.gray3, 0.2));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [11, 17] });

// rnar_cl_dye — the dye vat: rim crusted in a dozen colours it has held, the
// current bath soul-teal, a length of cloth draped out to drip.
defineSprite('rnar_cl_dye', 18, 22, (p) => {
  p.softShadow(9, 21, 8, 1.6, 0.30);
  // vat
  p.rect(1, 8, 16, 13, RWOODD);
  p.gradV(2, 9, 14, 11, RWOOD, darken(RWOODD, 0.12));
  p.hline(1, 16, 11, mix(P.iron, P.clay, 0.3));
  p.hline(1, 16, 18, darken(P.iron, 0.2));
  p.vline(9, 20, 6, darken(RWOODD, 0.15)); p.vline(9, 20, 12, darken(RWOODD, 0.15));
  // rim crusted with old dye runs — every colour it ever held
  p.ellipse(9, 8, 8, 2.4, mix(P.gray2, P.woodD, 0.35));
  p.px(2, 9, mix(P.red, P.gray1, 0.4)); p.px(4, 10, mix(P.blue, P.gray1, 0.45));
  p.px(13, 9, mix(P.purple, P.gray1, 0.45)); p.px(15, 11, mix(P.gold, P.gray1, 0.5));
  p.px(6, 12, mix(P.green, P.gray1, 0.5));
  // the bath, soul-teal and deep
  p.glow(9, 8, 6, P.shard, 0.24, 3);
  p.ellipse(9, 8, 6.4, 1.8, mix(P.shardD, P.ink2, 0.35));
  p.ellipse(8, 8, 4, 1.1, mix(P.shard, P.ink2, 0.3));
  p.px(7, 7, P.shardL);
  // cloth draped over the rim, dripping
  p.rect(12, 4, 5, 9, mix(P.shardD, P.gray2, 0.28));
  p.hline(12, 16, 4, mix(P.shard, P.gray3, 0.2));
  p.vline(5, 12, 16, darken(mix(P.shardD, P.gray2, 0.3), 0.18));
  p.px(14, 13, mix(P.shard, P.gray2, 0.2));
  p.px(14, 15, withAlpha(P.shardD, 0.7));                       // a drip falling
  // stirring paddle propped in the vat
  p.line(4, 9, 2, 1, RWOOD);
  p.px(2, 0, RWOODD);
  p.px(4, 8, mix(P.shardD, P.gray2, 0.3));
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
  p.sparkle(9, 7, withAlpha(P.shardL, 0.75), 1);
}, { anchor: [9, 21] });

// ── achievements: 獎座與旗幟 ────────────────────────────────────────────────

// rnar_ac_plinth — a relic under a cracked glass dome: the first hunter's
// broken blade, lit from below, dust in the air inside the case.
defineSprite('rnar_ac_plinth', 16, 28, (p) => {
  p.softShadow(8, 27, 7, 1.6, 0.30);
  // plinth
  p.rect(1, 20, 14, 8, mix(P.gray2, P.ink2, 0.2));
  p.rect(1, 20, 14, 1, mix(P.gray3, P.gray2, 0.45));
  p.rect(2, 19, 12, 1, mix(P.gray3, P.gray2, 0.45));
  p.rect(3, 23, 10, 3, darken(mix(P.gray2, P.ink2, 0.2), 0.14));
  p.hline(4, 11, 24, withAlpha(RGOLD, 0.6));                    // engraved band
  p.px(6, 26, mix(P.gray2, P.moss, 0.35));
  // glass dome — dusky, cracked at one shoulder
  p.glow(8, 13, 7, P.shard, 0.20, 4);
  p.gradV(2, 5, 12, 14, withAlpha(mix(P.gray4, P.shardL, 0.3), 0.30), withAlpha(mix(P.gray3, P.shardD, 0.4), 0.22));
  p.ellipse(8, 5, 6, 3, withAlpha(mix(P.gray4, P.shardL, 0.25), 0.30));
  p.vline(5, 18, 2, withAlpha(P.gray4, 0.55));                  // glass edges
  p.vline(5, 18, 13, withAlpha(P.gray3, 0.5));
  p.line(3, 6, 6, 11, withAlpha(mix(P.gray4, P.white, 0.4), 0.6));   // the crack
  p.px(5, 9, withAlpha(P.white, 0.5));
  // the relic: a snapped sword, point missing, wrapped grip
  p.line(8, 18, 8, 8, mix(P.steelD, P.gray2, 0.4));
  p.px(8, 8, mix(P.steelL, P.gray3, 0.3));                      // the raw break
  p.px(7, 9, withAlpha(P.steelL, 0.7));
  p.hline(6, 10, 15, RGOLDD);                                   // crossguard
  p.rect(7, 16, 2, 3, RWOODD);                                  // grip
  p.px(8, 19, RGOLD);                                           // pommel
  p.px(8, 12, withAlpha(P.shardL, 0.8));                        // soul still in the steel
  p.speckle(3, 7, 10, 11, withAlpha(P.gray4, 0.28), 6, 29);     // dust in the case
  p.rimLight(P.rimCool, 0.38);
  p.outline(P.ink);
  p.star4(8, 11, 2, withAlpha(P.shardL, 0.85), P.white);
}, { anchor: [8, 27] });

// rnar_ac_roll — the roll of the fallen: a slate name-board, most lines
// scratched in by different hands, the newest still pale.
defineSprite('rnar_ac_roll', 18, 26, (p) => {
  p.softShadow(9, 25, 8, 1.6, 0.28);
  // slate slab on a stone foot
  p.rect(3, 22, 12, 4, mix(P.gray2, P.ink2, 0.25));
  p.hline(3, 14, 22, mix(P.gray3, P.gray2, 0.45));
  p.gradV(1, 1, 16, 21, mix(P.gray1, P.ink2, 0.3), mix(P.ink2, P.gray1, 0.4));
  p.rect(1, 1, 16, 1, mix(P.gray3, P.gray2, 0.4));
  p.vline(1, 21, 1, mix(P.gray2, P.gray3, 0.4));
  p.vline(1, 21, 16, darken(mix(P.gray1, P.ink2, 0.3), 0.2));
  p.px(15, 4, darken(mix(P.gray1, P.ink2, 0.3), 0.3));          // chipped corner
  p.px(2, 18, mix(P.gray1, P.moss, 0.35));
  // scratched names — deliberately uneven lengths and left margins
  const nm = mix(P.gray4, P.bone, 0.25);
  const rows = [[3, 4, 11], [4, 6, 13], [3, 8, 9], [5, 10, 14], [3, 12, 12], [4, 14, 10], [3, 16, 13], [5, 18, 8]];
  for (const [x0, y, x1] of rows) p.hline(x0, x1, y, withAlpha(nm, 0.55 + ((y * 7) % 3) * 0.1));
  p.hline(3, 10, 20, withAlpha(lighten(nm, 0.25), 0.9));        // the newest, still bright
  p.px(11, 20, withAlpha(P.shardL, 0.7));
  // a chalk stub and a wreath hook at the top
  p.rect(0, 19, 1, 2, mix(P.bone, P.gray3, 0.2));
  p.px(8, 0, RGOLDD);
  p.speckle(2, 2, 14, 19, withAlpha(ASH, 0.28), 7, 41);
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
}, { anchor: [9, 25] });

// rnar_ac_relic — a dead hunter's kit laid out in honour: dented helm on a
// stand, a dried laurel over it, their cloak folded beneath.
defineSprite('rnar_ac_relic', 18, 22, (p) => {
  p.softShadow(9, 21, 8, 1.6, 0.28);
  // folded cloak as the base
  p.rect(1, 16, 16, 5, mix(P.blue, P.gray1, 0.5));
  p.hline(1, 16, 16, mix(P.blueL, P.gray2, 0.45));
  p.hline(1, 16, 18, darken(mix(P.blue, P.gray1, 0.5), 0.18));
  p.px(2, 20, mix(P.blue, P.gray2, 0.6)); p.px(15, 19, mix(P.blue, P.gray2, 0.6));
  // stand
  p.rect(8, 11, 2, 5, RWOODD);
  p.ellipse(9, 16, 3, 1.2, RWOOD);
  // the helm — dented, visor gone, one cheek plate torn away
  p.ellipse(9, 7, 6, 5, mix(P.iron, P.gray1, 0.25));
  p.ellipse(9, 6, 5, 3.6, mix(P.steel, P.gray1, 0.35));
  p.hline(4, 13, 9, darken(mix(P.iron, P.gray1, 0.25), 0.2));
  p.rect(6, 8, 6, 2, mix(P.ink2, P.gray1, 0.2));                // the empty visor slot
  p.px(11, 4, darken(mix(P.iron, P.gray1, 0.25), 0.35));        // the dent that did it
  p.px(12, 5, darken(mix(P.iron, P.gray1, 0.25), 0.3));
  p.px(4, 9, mix(P.iron, P.clay, 0.35));                        // rust where the plate tore
  p.px(5, 5, mix(P.steelL, P.gray3, 0.3));                      // one polished highlight
  // dried laurel draped over the crown
  const lf = mix(P.leafD, P.sandD, 0.5);
  p.line(4, 4, 9, 1, lf); p.line(9, 1, 14, 4, lf);
  p.px(5, 4, mix(lf, P.leaf, 0.3)); p.px(9, 0, mix(lf, P.sand, 0.3));
  p.px(13, 4, mix(lf, P.leaf, 0.25)); p.px(7, 2, darken(lf, 0.2));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  p.sparkle(9, 5, withAlpha(P.holyL, 0.5), 1);
}, { anchor: [9, 21] });

// ── personal: 生活痕跡 ──────────────────────────────────────────────────────

// rnar_pe_table — your table: a meal half eaten because the horn went, the
// chair still shoved back, a book face-down holding its page.
defineSprite('rnar_pe_table', 22, 18, (p) => {
  p.softShadow(11, 17, 10, 1.8, 0.28);
  p.rect(3, 10, 3, 7, RWOODD); p.rect(16, 10, 3, 7, RWOODD);
  p.gradV(1, 5, 20, 5, RWOOD, RWOODD);
  p.hline(1, 20, 5, RWOODL);
  p.hline(1, 20, 9, darken(RWOODD, 0.22));
  p.hline(1, 20, 7, withAlpha(darken(RWOOD, 0.12), 0.5));
  // bowl, spoon still in it, half a loaf beside
  p.ellipse(6, 4, 3.4, 1.8, mix(P.gray3, P.bone, 0.35));
  p.ellipse(6, 4, 2.4, 1.2, mix(P.leafD, P.woodD, 0.45));
  p.line(7, 4, 9, 1, mix(P.wood, P.sand, 0.3));                 // spoon handle
  p.ellipse(12, 4, 2.6, 1.6, mix(P.sand, P.woodD, 0.3));
  p.px(11, 3, lighten(P.sand, 0.15));
  p.px(13, 5, darken(mix(P.sand, P.woodD, 0.3), 0.2));          // the torn end
  // a cup gone cold
  p.rect(16, 2, 3, 3, mix(P.gray3, P.bone, 0.3));
  p.px(19, 3, mix(P.gray2, P.bone, 0.3));
  p.ellipse(17, 2, 1.4, 0.7, mix(P.woodD, P.ink2, 0.4));
  // the book, face down, keeping its place
  p.rect(1, 2, 5, 3, mix(P.red, P.gray1, 0.4));
  p.hline(1, 5, 2, lighten(mix(P.red, P.gray1, 0.4), 0.15));
  p.hline(1, 5, 4, mix(P.bone, P.gray3, 0.3));                  // page block
  p.px(3, 1, mix(P.gold, P.gray2, 0.4));                        // a ribbon out the top
  // chair shoved back
  p.rect(19, 1, 3, 9, RWOODD);
  p.hline(19, 21, 1, RWOOD);
  p.px(20, 5, darken(RWOODD, 0.25));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [11, 17] });

// rnar_pe_wash — the wash stand: basin, a towel that never fully dries, a
// shaving mirror shard propped against the wall.
defineSprite('rnar_pe_wash', 16, 22, (p) => {
  p.softShadow(8, 21, 7, 1.4, 0.28);
  // stand
  p.rect(2, 10, 2, 11, RWOODD); p.rect(12, 10, 2, 11, RWOODD);
  p.rect(1, 8, 14, 3, RWOOD);
  p.hline(1, 14, 8, RWOODL);
  p.line(4, 16, 12, 16, RWOODD);
  // basin + pitcher
  p.ellipse(6, 7, 4.4, 2.2, mix(P.gray3, P.bone, 0.3));
  p.ellipse(6, 7, 3.4, 1.5, mix(P.gray2, P.blueL, 0.22));       // the water
  p.px(5, 6, withAlpha(P.gray4, 0.7));
  p.rect(11, 4, 4, 4, mix(P.clay, P.gray2, 0.35));
  p.ellipse(13, 4, 2, 1, mix(P.clay, P.gray3, 0.3));
  p.px(15, 5, mix(P.clay, P.gray2, 0.4));                       // the handle
  p.px(11, 6, darken(mix(P.clay, P.gray2, 0.35), 0.25));        // a chip
  // towel over the rail, damp at the hem
  p.rect(1, 11, 4, 7, mix(P.bone, P.gray3, 0.3));
  p.hline(1, 4, 11, lighten(mix(P.bone, P.gray3, 0.25), 0.12));
  p.hline(1, 4, 17, mix(P.gray2, P.blueL, 0.25));
  p.px(3, 18, withAlpha(mix(P.gray2, P.blueL, 0.3), 0.7));
  // a mirror shard propped up, catching one eye's worth of light
  p.line(9, 3, 12, 0, mix(P.gray4, P.blueL, 0.3));
  p.line(9, 3, 10, 0, mix(P.gray3, P.blueL, 0.35));
  p.px(11, 1, withAlpha(P.white, 0.7));
  p.px(9, 3, mix(P.gray2, P.ink2, 0.3));
  // a comb and a razor on the shelf
  p.rect(6, 9, 3, 1, mix(P.bone, P.woodD, 0.35));
  p.px(9, 9, P.steelL);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [8, 21] });

// rnar_pe_kit — the corner where the gear lands: boots kicked off mid-stride,
// a pack spilling its contents, the belt still buckled.
defineSprite('rnar_pe_kit', 20, 16, (p) => {
  p.softShadow(10, 15, 9, 1.5, 0.28);
  // the pack, slumped and open
  p.ellipse(6, 10, 5.4, 5, mix(P.woodD, P.gray1, 0.35));
  p.ellipse(6, 9, 4.4, 3.6, mix(P.wood, P.gray1, 0.4));
  p.ellipse(6, 6, 4, 1.6, darken(mix(P.woodD, P.gray1, 0.35), 0.2));   // the open mouth
  p.px(4, 6, mix(P.sand, P.gray2, 0.35)); p.px(7, 6, mix(P.bone, P.gray3, 0.3));   // spilling out
  p.px(9, 8, mix(P.shardD, P.gray2, 0.2));
  p.line(2, 8, 1, 13, mix(P.wood, P.gray2, 0.4));                       // a loose strap
  p.px(1, 13, RGOLDD);
  // boots, one upright, one over on its side
  p.rect(12, 8, 3, 6, mix(P.woodD, P.ink2, 0.3));
  p.rect(11, 12, 5, 2, mix(P.ink2, P.gray1, 0.25));
  p.hline(12, 14, 8, mix(P.wood, P.gray2, 0.45));
  p.rect(15, 12, 5, 2, mix(P.woodD, P.ink2, 0.35));
  p.rect(18, 10, 2, 3, mix(P.woodD, P.ink2, 0.3));
  p.px(19, 13, mix(P.ink2, P.gray1, 0.3));
  p.px(13, 9, mix(P.gray2, P.woodD, 0.3));                              // scuffed toe
  // the belt, still buckled, dropped in a loop
  p.ring(15, 5, 3, mix(P.woodD, P.gray1, 0.3));
  p.px(12, 5, RGOLDD); p.px(12, 4, RGOLD);
  p.px(17, 3, mix(P.wood, P.gray2, 0.4));
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [10, 15] });

// ════════════════════════════════════════════════════════════════════════════
//  5. FOREGROUND OCCLUDERS (rfg_*) — hung from the ceiling, so they are drawn
//     AFTER the actors (world.drawForeground) and the hero walks UNDER them.
//     Anchored at the TOP edge: the placement y is where they hang FROM.
// ════════════════════════════════════════════════════════════════════════════

// rfg_ch_chandelier (church) — the nave ring, half its candles out, hanging
// crooked since the roof took a hit.
defineAnim('rfg_ch_chandelier', 30, 22, 2, (p, f) => {
  // chain up out of frame
  p.vline(0, 5, 15, mix(P.steelD, P.gray2, 0.3));
  p.px(15, 2, P.steelL);
  p.line(15, 5, 9, 9, RIRON); p.line(15, 5, 22, 9, RIRON);      // suspension arms
  // the ring — tilted a pixel to the right (it hangs crooked)
  p.ellipse(15, 11, 13, 3.4, RGOLDD);
  p.ellipse(15, 11, 11.4, 2.4, RGOLD);
  p.ellipse(15, 10, 11, 2, darken(RGOLDD, 0.18));
  p.px(3, 12, darken(RGOLDD, 0.3)); p.px(26, 11, mix(RGOLD, P.goldL, 0.3));
  // candle cups around the ring — uneven heights, several burnt right out
  const cups = [[4, 12], [8, 11], [12, 10], [16, 10], [20, 11], [24, 12], [27, 13]];
  const lit = [true, false, true, true, false, true, false];
  cups.forEach(([cxx, cyy], i) => {
    p.rect(cxx, cyy - 3, 1, 3, lit[i] ? P.bone : mix(P.bone, P.gray2, 0.5));
    p.px(cxx, cyy - 3, lit[i] ? lighten(P.bone, 0.25) : mix(P.gray3, P.bone, 0.4));
    p.px(cxx, cyy, RGOLDD);
  });
  // wax that has run right down the ring and hangs in points
  p.px(6, 13, mix(P.bone, P.gray3, 0.3)); p.px(6, 14, mix(P.bone, P.gray3, 0.4));
  p.px(18, 13, mix(P.bone, P.gray3, 0.35));
  p.px(23, 13, mix(P.bone, P.gray3, 0.3)); p.px(23, 14, mix(P.bone, P.gray3, 0.45));
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
  // flames last so they glow clear of the outline
  cups.forEach(([cxx, cyy], i) => {
    if (!lit[i]) return;
    const fl = (i + f) % 2;
    p.glow(cxx, cyy - 4 - fl, 3, P.ember, 0.38, 3);
    p.px(cxx, cyy - 4 - fl, P.emberL);
    p.px(cxx, cyy - 5 - fl, withAlpha(P.white, 0.8));
  });
}, { anchor: [15, 0], fps: 3 });

// rfg_gu_beam (guild) — a snapped roof beam propped where it fell, with the
// hall lantern and a coil of climbing rope still hanging off it.
defineSprite('rfg_gu_beam', 32, 20, (p) => {
  // the beam, running across at a slight fall to the right
  p.gradV(0, 2, 32, 5, RWOOD, RWOODD);
  p.hline(0, 31, 2, RWOODL);
  p.hline(0, 31, 6, darken(RWOODD, 0.24));
  p.px(26, 3, darken(RWOODD, 0.3)); p.px(27, 4, darken(RWOODD, 0.35));   // the splinter break
  p.px(28, 3, mix(RWOOD, P.sand, 0.35));                                  // raw wood at the break
  p.speckle(1, 3, 30, 3, withAlpha(ASH, 0.35), 8, 23);
  p.hline(4, 9, 4, withAlpha(darken(RWOOD, 0.2), 0.6));                   // adze marks
  // iron strap holding the joint
  p.rect(13, 1, 3, 7, RIRON);
  p.px(13, 2, P.steelL); p.px(15, 6, darken(RIRON, 0.2));
  // the hall lantern on a hook
  p.vline(7, 11, 7, mix(P.steelD, P.gray2, 0.3));
  p.glow(7, 15, 6, P.ember, 0.30, 4);
  p.gradV(4, 11, 7, 7, mix(P.emberL, P.gray3, 0.22), mix(P.ember, P.gray2, 0.3));
  p.ellipse(7, 11, 3.4, 1.2, mix(P.emberL, P.gray3, 0.2));
  p.ellipse(7, 17, 3.4, 1.2, darken(mix(P.ember, P.gray2, 0.3), 0.18));
  p.vline(12, 16, 5, withAlpha(P.redD, 0.5)); p.vline(12, 16, 9, withAlpha(P.redD, 0.5));
  p.px(7, 14, lighten(P.emberL, 0.2));
  // a coil of rope hung over the far end
  const rope = mix(P.sand, P.woodD, 0.4);
  p.ellipse(23, 11, 3, 4, rope);
  p.ellipse(23, 11, 1.8, 2.6, darken(rope, 0.2));
  p.px(22, 8, lighten(rope, 0.18)); p.px(24, 14, darken(rope, 0.25));
  p.vline(7, 16, 23, rope);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [16, 0] });

// rfg_bs_hood (blacksmith) — the smoke hood over the working floor, blackened
// inside, with tongs and a chain hoist hanging off its rail.
defineSprite('rfg_bs_hood', 30, 20, (p) => {
  // the hood — a tapered sheet-iron canopy
  p.gradV(0, 0, 30, 8, mix(P.gray1, P.ink2, 0.35), mix(P.ink2, P.gray1, 0.25));
  p.hline(0, 29, 0, mix(P.gray2, P.ink2, 0.15));
  p.line(0, 8, 6, 12, mix(P.gray1, P.ink2, 0.4));
  p.line(29, 8, 23, 12, mix(P.gray1, P.ink2, 0.4));
  p.rect(6, 8, 18, 4, mix(P.ink2, P.gray1, 0.18));
  p.hline(6, 23, 12, mix(P.gray2, P.ink2, 0.2));                 // the lip
  p.hline(6, 23, 11, darken(mix(P.ink2, P.gray1, 0.18), 0.3));   // soot-black underside
  p.speckle(2, 2, 26, 8, withAlpha(mix(P.ink, P.gray1, 0.3), 0.6), 9, 17);
  p.px(9, 5, mix(P.iron, P.clay, 0.35)); p.px(20, 3, mix(P.iron, P.clay, 0.3));   // rust runs
  // rivet line along the seam
  for (const rx of [3, 8, 14, 19, 25, 28]) p.px(rx, 7, mix(P.steelL, P.gray2, 0.4));
  // rail under the lip, with the tools that live on it
  p.hline(4, 25, 13, RIRON);
  p.line(9, 13, 8, 19, RIRON); p.line(11, 13, 12, 18, RIRON);    // tongs
  p.px(8, 19, mix(P.steelL, P.gray3, 0.3));
  p.line(17, 13, 17, 17, mix(P.steelD, P.gray2, 0.3));           // chain
  p.px(17, 15, P.steelL);
  p.rect(16, 17, 3, 2, mix(P.iron, P.gray1, 0.2));               // the hoist hook block
  p.px(17, 19, RIRON);
  p.rimLight(P.rim, 0.28);
  p.outline(P.ink);
}, { anchor: [15, 0] });

// rfg_cl_line (clothing) — the drying line strung across the shop, hung with
// finished pieces and the dye-run cloth that is still dripping.
defineSprite('rfg_cl_line', 32, 22, (p) => {
  // the line itself, with a real sag
  const cord = mix(P.sand, P.gray2, 0.4);
  p.line(0, 1, 8, 3, cord); p.line(8, 3, 22, 4, cord); p.line(22, 4, 31, 1, cord);
  // hung pieces — different lengths, colours and pin counts (never a rhythm)
  const hang = (x, w, h, col, y0) => {
    p.rect(x, y0, w, h, col);
    p.hline(x, x + w - 1, y0, lighten(col, 0.16));
    p.vline(y0, y0 + h - 1, x + w - 1, darken(col, 0.2));
    p.px(x + 1, y0 - 1, RWOODD);                                  // the peg
    p.px(x + w - 2, y0 + h - 1, darken(col, 0.25));               // weighted hem
  };
  hang(2, 6, 9, mix(P.blue, P.gray1, 0.45), 3);
  hang(10, 5, 13, mix(P.red, P.gray1, 0.5), 4);
  hang(17, 7, 8, mix(P.sand, P.gray2, 0.4), 5);
  // the soul-dyed length, still wet at the hem
  p.glow(27, 10, 5, P.shard, 0.20, 3);
  hang(25, 6, 12, mix(P.shardD, P.gray2, 0.25), 3);
  p.px(28, 15, P.shardL);
  p.px(28, 17, withAlpha(P.shardL, 0.75));
  p.px(28, 19, withAlpha(P.shard, 0.45));                         // the drip, falling
  // a lone wooden peg left on the empty stretch
  p.px(21, 3, RWOODD); p.px(21, 4, RWOOD);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
  p.star4(27, 8, 2, withAlpha(P.shardL, 0.7), P.white);
}, { anchor: [16, 0] });

// rfg_ac_banner (achievements) — the long honour banner, hung from the ceiling
// rail down into the gallery; the hall's crest and a name-roll down its length.
defineSprite('rfg_ac_banner', 20, 30, (p) => {
  // ceiling rail + finials
  p.hline(0, 19, 1, RGOLDD);
  p.hline(0, 19, 0, mix(RGOLD, P.goldL, 0.3));
  p.px(0, 2, RGOLDD); p.px(19, 2, RGOLDD);
  // cloth — deep hall crimson, smoke-shaded down the right
  p.gradV(3, 2, 14, 24, mix(P.red, P.gray1, 0.35), mix(P.redD, P.gray1, 0.5));
  p.vline(2, 25, 3, lighten(mix(P.red, P.gray1, 0.3), 0.1));
  p.vline(2, 25, 16, darken(mix(P.redD, P.gray1, 0.5), 0.2));
  p.speckle(4, 3, 12, 22, withAlpha(mix(P.ink2, P.redD, 0.4), 0.4), 8, 19);
  // gold border tape
  p.vline(2, 25, 4, withAlpha(RGOLD, 0.7));
  p.vline(2, 25, 15, withAlpha(RGOLDD, 0.7));
  p.hline(3, 16, 2, withAlpha(RGOLD, 0.6));
  // the crest — a laurel ring around a soul shard
  p.glow(10, 9, 5, P.shard, 0.22, 3);
  p.ring(10, 9, 4, RGOLD);
  p.ring(10, 9, 3, withAlpha(RGOLDD, 0.7));
  p.px(10, 8, P.shardL); p.px(10, 9, P.shard); p.px(9, 9, P.shardD); p.px(11, 9, P.shardD);
  p.px(7, 6, mix(RGOLD, P.goldL, 0.3)); p.px(13, 12, RGOLDD);
  // the name roll stitched down the lower half — uneven, added to over years
  const nm = withAlpha(mix(RGOLD, P.bone, 0.4), 0.55);
  const rows = [[5, 15, 13], [6, 17, 14], [5, 19, 11], [7, 21, 14], [5, 23, 12]];
  for (const [x0, y, x1] of rows) p.hline(x0, x1, y, nm);
  // torn, forked hem
  p.line(3, 26, 5, 29, mix(P.redD, P.gray1, 0.5));
  p.line(16, 26, 14, 28, mix(P.redD, P.gray1, 0.5));
  p.hline(6, 13, 26, mix(P.redD, P.gray1, 0.55));
  p.px(9, 27, darken(mix(P.redD, P.gray1, 0.5), 0.2));
  p.px(11, 28, withAlpha(mix(P.redD, P.gray1, 0.5), 0.6));       // a hanging thread
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
  p.sparkle(10, 7, withAlpha(P.shardL, 0.7), 1);
}, { anchor: [10, 0] });

// rfg_pe_laundry (personal) — your own line: two shirts, a blanket that never
// quite dries, and a bunch of herbs hung to keep the damp smell down.
defineSprite('rfg_pe_laundry', 28, 20, (p) => {
  const cord = mix(P.sand, P.gray2, 0.45);
  p.line(0, 2, 10, 4, cord); p.line(10, 4, 27, 2, cord);
  // a shirt, a blanket, a second shirt — all different sizes and drops
  const hang = (x, w, h, col, y0) => {
    p.rect(x, y0, w, h, col);
    p.hline(x, x + w - 1, y0, lighten(col, 0.15));
    p.vline(y0, y0 + h - 1, x + w - 1, darken(col, 0.18));
    p.px(x + 1, y0 - 1, RWOODD);
  };
  hang(2, 6, 8, mix(P.bone, P.gray3, 0.35), 4);
  p.px(3, 12, mix(P.gray2, P.bone, 0.4));                        // a patched elbow
  hang(9, 10, 11, mix(P.blue, P.gray1, 0.55), 5);
  p.hline(9, 18, 9, mix(P.blueL, P.gray2, 0.45));                // woven stripe
  p.px(13, 16, mix(P.gray2, P.blueL, 0.4));                      // damp patch at the hem
  hang(21, 5, 7, mix(P.green, P.gray1, 0.55), 3);
  // herbs bundled at the end
  const hb = mix(P.leafD, P.sandD, 0.45);
  p.line(27, 3, 25, 9, hb); p.line(27, 3, 27, 8, hb); p.line(27, 3, 28, 7, hb);
  p.px(26, 3, mix(P.sand, P.gray2, 0.3));                        // the twine
  p.px(25, 9, mix(hb, P.leaf, 0.3)); p.px(27, 8, mix(hb, P.leaf, 0.25));
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [14, 0] });

// ════════════════════════════════════════════════════════════════════════════
//  6. OUT-OF-BOUNDS BAND (int_oob_*) — used via `tileset.oobTiles`.
//     ART_SPEC 7: two darkness steps plus ruin SILHOUETTES; never a flat fill.
//     Three variants so the hash never repeats a shape on a fixed grid.
// ════════════════════════════════════════════════════════════════════════════

const OOBB = mix(IWALL, P.ink, 0.22);   // dark, but never near-black — a flat black band is
                                        // exactly the 'large flat colour' ART_SPEC 7 forbids.

// int_oob_a — nearest step: a collapsed wall stub and floor rubble, readable.
defineSprite('int_oob_a', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, OOBB);
  p.gradV(0, 0, 16, 16, lighten(OOBB, 0.10), darken(OOBB, 0.06));
  const sil = mix(OOBB, P.gray2, 0.55);
  p.rect(2, 6, 5, 10, sil);                       // broken wall stub
  p.hline(2, 6, 6, lighten(sil, 0.10));
  p.px(4, 5, sil); p.px(6, 4, mix(sil, OOBB, 0.4));   // ragged top course
  p.hline(2, 6, 10, darken(sil, 0.2));
  p.ellipse(11, 14, 4, 1.8, mix(OOBB, P.gray1, 0.20));   // rubble drift
  p.px(10, 13, mix(sil, P.gray2, 0.25)); p.px(13, 13, mix(sil, P.gray2, 0.2));
  p.speckle(0, 0, 16, 16, darken(OOBB, 0.26), 10, 13);
  p.speckle(0, 0, 16, 16, lighten(OOBB, 0.14), 7, 47);
}, { anchor: [0, 0] });

// int_oob_b — same step, different silhouette: a fallen arch rib.
defineSprite('int_oob_b', 16, 16, (p) => {
  p.rect(0, 0, 16, 16, OOBB);
  p.gradV(0, 0, 16, 16, lighten(OOBB, 0.08), darken(OOBB, 0.07));
  const sil = mix(OOBB, P.gray2, 0.48);
  p.line(1, 15, 8, 4, sil);                       // the toppled rib
  p.line(2, 15, 9, 4, darken(sil, 0.18));
  p.line(8, 4, 14, 8, sil);
  p.px(8, 3, mix(sil, P.gray2, 0.2));
  p.ellipse(4, 15, 3.4, 1.4, mix(OOBB, P.gray1, 0.18));
  p.px(12, 12, mix(sil, OOBB, 0.35)); p.px(13, 13, mix(sil, OOBB, 0.4));
  p.speckle(0, 0, 16, 16, darken(OOBB, 0.24), 10, 29);
  p.speckle(0, 0, 16, 16, lighten(OOBB, 0.13), 7, 61);
}, { anchor: [0, 0] });

// int_oob_c — the FAR step: everything one shade deeper, silhouettes reduced
// to a suggestion. Dither keeps it off a flat colour.
defineSprite('int_oob_c', 16, 16, (p) => {
  const far = darken(OOBB, 0.22);
  p.rect(0, 0, 16, 16, far);
  p.gradV(0, 0, 16, 16, lighten(far, 0.07), darken(far, 0.05));
  const sil = mix(far, P.gray2, 0.34);
  p.rect(9, 9, 4, 7, sil);                        // a distant stub, barely there
  p.px(9, 8, mix(sil, far, 0.4)); p.px(12, 8, mix(sil, far, 0.5));
  p.line(1, 14, 5, 11, mix(far, P.gray1, 0.12));
  p.dither(0, 0, 16, 8, far, lighten(far, 0.05));
  p.speckle(0, 0, 16, 16, darken(far, 0.20), 9, 19);
  p.speckle(0, 0, 16, 16, lighten(far, 0.11), 6, 71);
}, { anchor: [0, 0] });
