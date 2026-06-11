// R20/B1 — large interior station centrepieces (one per building) + boss_pillar (R20/B6 wall_cage move).
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════════
//  Round-20 interior STATION centrepieces — 末日遺跡 anime pixel style.
//  One hero prop per enterable building (church/guild/blacksmith/clothing/
//  achievements/personal) so each interior has an unmistakable focal point,
//  plus boss_pillar: the in-run destructible soul-cage stone (R20/B6).
//  Same recipe as town_ruin_stations.js: desaturated ash-stone bodies, two
//  accent glows — ember-orange survivor warmth (P.ember*) and soul-teal
//  afterlife light (P.shard*) — kira sparkles, rimLight, P.ink outline.
//  All standing props anchor base-centre ('feet') like other tall town sprites.
// ════════════════════════════════════════════════════════════════════════════

// shared ruin-stone tones (identical derivations to town_ruin_stations.js)
const ST    = mix(P.gray2, P.bone, 0.18);          // mid ash-stone
const STL   = mix(P.gray3, P.bone, 0.28);          // lit stone
const STD   = darken(P.gray1, 0.10);               // shaded stone
const CRACK = darken(P.gray1, 0.35);               // deep crack ink
const TIMBER = mix(P.woodD, P.gray1, 0.30);        // weathered grey timber
const CLOTH  = mix(P.blood, P.gray1, 0.32);        // faded red cloth (matches int_carpet)
const GOLDT  = mix(P.goldD, P.gray2, 0.30);        // tarnished trophy gold

// ── 1. ruin_st_goddess 40×52 anim 2f — CHURCH: cracked goddess statue ───────
// A serene robed figure on a stepped plinth, one arm snapped at the shoulder.
// Her halo of soul-teal light breathes between the two frames; votive candles
// burn warm at her feet — faith's last embers in the ruin.
defineAnim('ruin_st_goddess', 40, 52, 2, (p, f) => {
  p.softShadow(20, 50, 15, 2.6, 0.36);
  // stepped plinth: wide lower slab + narrower upper block
  p.rect(6, 45, 28, 5, ST);  p.hline(6, 33, 45, STL);  p.vline(45, 49, 6, darken(ST, 0.22));
  p.rect(11, 41, 18, 4, ST); p.hline(11, 28, 41, lighten(STL, 0.06));
  p.vline(41, 44, 28, darken(ST, 0.28));
  // plinth weathering: cracks + a chipped front corner + moss
  p.line(9, 46, 12, 49, CRACK); p.line(27, 42, 29, 47, CRACK);
  p.px(7, 45, darken(ST, 0.3)); p.px(32, 46, CRACK);
  p.px(13, 48, P.moss); p.px(26, 44, P.moss);
  // halo back-glow first so the head reads in front of it (pulses with frame)
  p.glow(20, 9, f ? 7 : 5.5, P.shard, f ? 0.4 : 0.26, 3);
  p.ring(20, 9, 6, f ? P.shardL : P.shard);
  p.ring(20, 9, 5, withAlpha(P.shard, f ? 0.8 : 0.5));
  // draped robe: trapezoid column flaring to the plinth, soft top light
  for (let y = 17; y <= 40; y++) {
    const t = (y - 17) / 23;
    const hw = Math.round(4 + t * 4);                 // shoulders 4 → hem 8
    p.hline(20 - hw, 20 + hw, y, mix(STL, STD, t * 0.8));
  }
  // robe fold shading + a long weather crack down the skirt
  p.vline(20, 39, 16, darken(ST, 0.18));
  p.vline(22, 40, 24, darken(ST, 0.22));
  p.vline(19, 38, 20, lighten(STL, 0.10));            // centre catch-light
  p.line(22, 28, 24, 36, CRACK);
  p.px(15, 36, P.moss); p.px(25, 33, P.moss);
  // intact arm (viewer-left): folded down-out, palm open in offering
  p.line(16, 20, 12, 25, ST); p.line(15, 20, 11, 25, STL);
  p.rect(10, 25, 3, 2, STL); p.px(10, 27, mix(STL, P.bone, 0.3));   // open palm
  // broken arm (viewer-right): jagged stub at the shoulder
  p.rect(24, 19, 3, 3, ST);
  p.px(26, 19, STD); p.px(25, 21, CRACK); p.px(27, 20, CRACK);      // break face
  p.px(24, 18, STL);
  // head: hooded, eyes closed in serenity
  p.circle(20, 12, 3, STL);
  p.hline(17, 23, 10, ST);  p.px(17, 11, ST); p.px(23, 11, ST);     // hood drape
  p.px(20, 9, lighten(STL, 0.16));                                  // hood crest light
  p.px(19, 13, CRACK); p.px(21, 13, CRACK);                          // closed eyes
  p.rect(19, 15, 3, 2, ST);                                          // neck into collar
  // the snapped arm's hand, fallen on the lower step (a sad little detail)
  p.rect(29, 43, 3, 2, ST); p.px(29, 43, STL); p.px(31, 44, STD);
  // votive candles: two on the lower step, one on the upper (flames flicker)
  const fl = f ? 0 : 1;                                              // flame sway
  p.rect(8, 42, 2, 4, P.bone);  p.px(8, 42, lighten(P.bone, 0.15));
  p.px(8 + fl, 41, P.ember); p.px(8, 40 + fl, P.emberL);
  p.glow(8, 41, 2.5, P.ember, 0.3, 2);
  p.rect(30, 43, 2, 3, mix(P.bone, P.sand, 0.3));
  p.px(30 + (1 - fl), 42, P.ember); p.px(31, 41 + fl, P.emberL);
  p.glow(31, 42, 2.5, P.ember, 0.28, 2);
  p.rect(27, 38, 2, 3, P.bone);
  p.px(27, 37, P.ember); p.px(27 + fl, 36, P.emberL);
  p.glow(27, 37, 2, P.ember, 0.26, 2);
  // kira sparkles drifting in the halo light
  p.star4(13, 7 + f, 2, P.white, P.shardL);
  p.star4(28, 13 - f, 1, P.astralL);
  p.sparkle(24, 5 + f, P.neonL, 0);
  p.px(17 - f, 16, withAlpha(P.shardL, 0.7));                        // stray soul-mote
  p.shadeBottom(0.16, 42);
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 2 });

// ── 2. ruin_st_board 44×48 — GUILD: massive quest notice board ───────────────
// Weathered timber frame on stone feet, plastered in pinned notices + wanted
// posters (one corner flutters loose), two lit lanterns off the top beam, a
// dagger stabbed through a bounty, and the guild rank-crest plaque up top.
defineSprite('ruin_st_board', 44, 48, (p) => {
  p.softShadow(22, 46, 17, 2.4, 0.34);
  // stone feet + thick side posts
  p.rect(2, 43, 6, 3, ST);  p.hline(2, 7, 43, STL);
  p.rect(36, 43, 6, 3, ST); p.hline(36, 41, 43, STL);
  p.px(3, 44, CRACK); p.px(40, 45, darken(ST, 0.3));
  p.vline(11, 44, 4, TIMBER);  p.vline(11, 44, 5, darken(TIMBER, 0.25));
  p.vline(11, 44, 38, TIMBER); p.vline(11, 44, 39, darken(TIMBER, 0.25));
  p.px(4, 20, lighten(TIMBER, 0.18)); p.px(39, 30, lighten(TIMBER, 0.15)); // worn grain
  // top beam: heavy, weather-split ends
  p.rect(1, 7, 42, 5, TIMBER);
  p.hline(1, 42, 7, lighten(TIMBER, 0.18));
  p.hline(1, 42, 11, darken(TIMBER, 0.28));
  p.px(1, 8, darken(TIMBER, 0.35)); p.px(42, 9, darken(TIMBER, 0.35)); // split ends
  p.line(8, 8, 12, 10, darken(TIMBER, 0.2));                            // beam grain
  // rank-crest plaque mounted at the beam's centre (shield + soul-gem)
  p.rect(19, 4, 6, 5, GOLDT); p.hline(19, 24, 4, lighten(GOLDT, 0.25));
  p.px(21, 9, GOLDT); p.px(22, 9, GOLDT); p.px(21, 10, darken(GOLDT, 0.2)); // shield point
  p.px(21, 6, P.shard); p.px(22, 6, P.shardL);                             // crest gem
  p.glow(21, 6, 2, P.shard, 0.25, 2);
  // board face: vertical planks behind the notices
  p.rect(6, 12, 32, 28, darken(TIMBER, 0.12));
  p.gradV(6, 12, 32, 28, darken(TIMBER, 0.04), darken(TIMBER, 0.22));
  p.vline(13, 39, 14, darken(TIMBER, 0.3));
  p.vline(13, 39, 22, darken(TIMBER, 0.3));
  p.vline(13, 39, 30, darken(TIMBER, 0.3));
  p.speckle(7, 13, 30, 26, darken(TIMBER, 0.32), 8, 17);
  p.hline(6, 37, 39, darken(TIMBER, 0.35));                              // bottom rail shadow
  // notice A (top-left): pinned, ruled text lines
  p.rect(8, 15, 8, 10, P.bone); p.px(11, 15, P.red);                      // pin
  p.hline(9, 14, 17, mix(P.bone, P.ink2, 0.45));
  p.hline(9, 13, 19, mix(P.bone, P.ink2, 0.35));
  p.hline(9, 14, 21, mix(P.bone, P.ink2, 0.4));
  p.px(15, 24, mix(P.bone, P.gray2, 0.4));                                // dog-eared corner
  // wanted poster (centre): face sketch + reward scrawl
  const POST = mix(P.bone, P.sand, 0.4);
  p.rect(18, 14, 9, 12, POST); p.px(20, 14, P.red); p.px(25, 14, P.red);  // two pins
  p.circle(22, 18, 2, mix(POST, P.ink2, 0.55));                           // mugshot head
  p.px(21, 18, POST); p.px(23, 18, POST);                                 // glaring eyes
  p.hline(19, 25, 22, mix(POST, P.ink2, 0.4));                            // name line
  p.hline(20, 24, 24, mix(POST, P.goldD, 0.5));                           // reward line
  // notice B (right): one corner flutters loose off its single pin
  p.rect(29, 16, 6, 8, P.bone); p.px(31, 16, P.red);                      // only one pin...
  p.hline(30, 33, 18, mix(P.bone, P.ink2, 0.4));
  p.hline(30, 32, 20, mix(P.bone, P.ink2, 0.32));
  p.px(35, 22, lighten(P.bone, 0.2)); p.px(36, 21, lighten(P.bone, 0.3)); // lifted corner
  p.px(34, 23, mix(P.bone, P.gray2, 0.35));                               // curl shadow
  // lower notes
  p.rect(9, 28, 6, 7, mix(P.bone, P.gray3, 0.25)); p.px(11, 28, P.red);
  p.hline(10, 13, 30, mix(P.bone, P.ink2, 0.35));
  p.hline(10, 13, 32, mix(P.bone, P.ink2, 0.3));
  p.rect(24, 29, 8, 8, P.bone); p.px(27, 29, P.red);
  p.hline(25, 30, 31, mix(P.bone, P.ink2, 0.4));
  p.hline(25, 30, 33, mix(P.bone, P.ink2, 0.35));
  p.hline(25, 29, 35, mix(P.bone, P.redD, 0.45));                         // urgent red line
  // the dagger: stabbed clean through the lower bounty into the planks
  p.vline(26, 33, 28, P.steelL); p.px(28, 34, P.steel);                   // blade
  p.hline(26, 30, 25, P.goldD); p.px(28, 24, mix(P.goldD, P.gold, 0.5)); // crossguard+pommel
  p.px(28, 26, darken(P.steel, 0.3));                                     // blade shadow line
  p.px(29, 34, withAlpha(P.shadow, 0.5));                                 // punched-paper tear
  // two small lit lanterns hanging off the beam ends (warm, cosy)
  p.vline(12, 13, 3, P.iron);                                             // chain L
  p.rect(1, 14, 4, 5, darken(P.iron, 0.15)); p.hline(1, 4, 13, P.iron);
  p.px(2, 16, P.emberL); p.px(3, 16, P.ember);                            // flame
  p.glow(2, 16, 3, P.ember, 0.35, 2);
  p.vline(12, 13, 40, P.iron);                                            // chain R
  p.rect(39, 14, 4, 5, darken(P.iron, 0.15)); p.hline(39, 42, 13, P.iron);
  p.px(40, 16, P.ember); p.px(41, 16, P.emberL);
  p.glow(41, 16, 3, P.ember, 0.35, 2);
  // kira: lantern-light catches on the plaque + a pin
  p.star4(24, 3, 1, P.white, P.goldL);
  p.sparkle(11, 15, P.emberL, 0);
  p.shadeBottom(0.16, 40);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: 'feet' });

// ── 3. ruin_st_furnace 44×52 anim 3f — BLACKSMITH: roaring forge furnace ────
// Stone furnace mass with a chimney, a fire mouth dancing across 3 frames,
// bellows at the side, the anvil planted right in front of the mouth, tools on
// the ledge, rising ember sparks, and hot orange light licking the stones.
defineAnim('ruin_st_furnace', 44, 52, 3, (p, f) => {
  p.softShadow(20, 50, 16, 2.4, 0.36);
  // chimney stack + drifting smoke (drifts with the frame)
  p.rect(13, 2, 8, 10, ST); p.gradV(13, 2, 8, 10, STL, ST);
  p.hline(13, 20, 2, darken(ST, 0.3));                       // sooty mouth
  p.vline(2, 11, 13, darken(ST, 0.2)); p.vline(2, 11, 20, darken(ST, 0.28));
  p.px(15, 5, darken(ST, 0.35));                             // soot streak
  p.px(16 + f, 1, withAlpha(P.gray3, 0.5));
  p.px(18 + f, 0, withAlpha(P.gray4, 0.4));
  // furnace body: heavy stone block courses, soot-darkened around the mouth
  p.rect(4, 11, 30, 2, STL); p.hline(4, 33, 11, lighten(STL, 0.12));  // top ledge
  p.rect(5, 13, 28, 31, ST);
  p.gradV(5, 13, 28, 31, mix(STL, ST, 0.4), darken(STD, 0.05));
  p.hline(5, 32, 20, darken(ST, 0.25)); p.hline(5, 32, 28, darken(ST, 0.25));
  p.hline(5, 32, 36, darken(ST, 0.25));                       // block courses
  p.vline(14, 19, 14, darken(ST, 0.22)); p.vline(21, 27, 24, darken(ST, 0.22));
  p.vline(29, 35, 9, darken(ST, 0.22));                       // staggered seams
  p.line(7, 15, 9, 22, CRACK); p.line(28, 14, 30, 19, CRACK); // weather cracks
  p.px(6, 40, P.moss); p.px(31, 25, P.moss);
  // fire mouth: arched dark opening
  p.rect(12, 30, 14, 12, P.shadow);
  p.hline(13, 24, 29, P.shadow); p.hline(14, 23, 28, P.shadow);   // arch curve
  p.hline(12, 25, 42, darken(ST, 0.4));                            // hearth lip
  // the roaring fire — 3-frame flame dance (lean L / tall / lean R)
  const lean = f === 0 ? -1 : (f === 2 ? 1 : 0);
  const tall = f === 1 ? 2 : 0;
  p.hline(14, 23, 41, darken(P.ember, 0.35));                      // ember bed
  p.hline(15, 22, 40, P.ember);
  p.rect(16, 36 - tall, 6, 4 + tall, P.ember);                     // flame body
  p.rect(17 + lean, 33 - tall, 4, 4, P.emberL);
  p.px(18 + lean, 31 - tall, P.emberL); p.px(19 + lean, 30 - tall, P.white);
  p.px(15 + lean, 38, mix(P.ember, P.red, 0.4));                   // red flame roots
  p.px(22 + lean, 37, mix(P.ember, P.red, 0.35));
  p.px(17 - lean, 35, P.emberL);                                   // counter-lick
  p.glow(19, 36, 6, P.ember, 0.5, 3);
  // hot glow cast onto the stones around the mouth
  p.rect(11, 27, 16, 2, withAlpha(P.ember, 0.18));
  p.vline(30, 40, 11, withAlpha(P.ember, 0.14));
  p.vline(30, 40, 26, withAlpha(P.ember, 0.14));
  p.px(13, 28, withAlpha(P.emberL, 0.4)); p.px(24, 28, withAlpha(P.emberL, 0.35));
  // soot stain rising from the mouth arch
  p.rect(14, 24, 10, 3, withAlpha(darken(ST, 0.45), 0.6));
  // tools hung off the top ledge: tongs + hammer
  p.vline(13, 18, 7, P.iron); p.px(8, 18, P.iron); p.px(6, 18, P.iron);   // tongs jaws
  p.px(7, 19, darken(P.iron, 0.25));
  p.vline(13, 17, 29, P.wood);                                            // hammer haft
  p.rect(28, 17, 4, 2, P.steelD); p.hline(28, 31, 17, P.steel);           // hammer head
  // bellows at the right side: wooden wedge + handle + nozzle into the wall
  p.rect(33, 40, 9, 4, P.woodD);
  p.rect(34, 38, 7, 3, P.wood); p.hline(34, 40, 38, P.woodL);
  p.px(42, 41, P.iron); p.px(43, 41, darken(P.iron, 0.2));                // nozzle
  p.line(36, 37, 39, 33, P.woodD); p.px(40, 32, P.woodL);                 // handle up
  p.hline(34, 40, 41, darken(P.woodD, 0.25));                             // leather fold
  // the anvil, planted in front of the mouth
  p.rect(12, 44, 13, 2, P.iron); p.hline(12, 24, 44, P.steel);            // face
  p.px(11, 44, P.steelD); p.px(10, 45, darken(P.iron, 0.2));              // horn
  p.rect(15, 46, 6, 3, darken(P.iron, 0.25));                             // waist
  p.rect(13, 49, 10, 2, darken(P.iron, 0.1)); p.hline(13, 22, 49, P.iron);// foot
  p.px(14, 44, withAlpha(P.emberL, 0.6)); p.px(20, 44, withAlpha(P.ember, 0.5)); // hot glow on face
  // ember sparks riding the updraft (positions cycle per frame)
  p.px(17 + f * 2, 26 - f, P.emberL);
  p.px(22 - f, 23 + f, withAlpha(P.emberL, 0.8));
  p.px(14 + f, 21 - f * 2, withAlpha(P.ember, 0.7));
  p.px(25, 33 - f * 3, withAlpha(P.emberL, 0.6));
  p.sparkle(27 - f, 13, P.emberL, 0);                                     // ledge glint
  p.star4(9, 14 + f, 1, P.white, P.emberL);
  p.shadeBottom(0.15, 44);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 5 });

// ── 4. ruin_st_mannequin 44×50 — CLOTHING: three-mannequin display stage ────
// A plank stage under a torn curtain rail: the centre mannequin wears a fine
// soul-glowing cloak, the flanking pair are plain/cracked, sakura ribbons tie
// the rail, and a full-length mirror leans against the left edge.
defineSprite('ruin_st_mannequin', 44, 50, (p) => {
  p.softShadow(22, 48, 18, 2.4, 0.34);
  // curtain rail + end caps
  p.hline(2, 41, 5, P.iron); p.hline(2, 41, 4, lighten(P.iron, 0.2));
  p.px(2, 6, darken(P.iron, 0.25)); p.px(41, 6, darken(P.iron, 0.25));
  // torn curtain: three faded-red drapes with jagged hems (the middle ripped short)
  const hems = [
    [3, 14, [22, 24, 20, 23, 25, 21, 24, 22, 23, 20, 24, 22]],   // left drape
    [16, 27, [13, 15, 12, 14, 16, 12, 15, 13, 14, 12, 15, 13]],  // mid (torn short)
    [29, 40, [24, 21, 23, 25, 20, 24, 22, 23, 21, 25, 22, 24]],  // right drape
  ];
  for (const [x0, x1, hem] of hems) {
    for (let x = x0; x <= x1; x++) {
      const yb = hem[(x - x0) % hem.length];
      p.vline(6, yb, x, mix(CLOTH, darken(CLOTH, 0.2), (x % 3) / 2));
      p.px(x, yb, darken(CLOTH, 0.3));                            // frayed hem px
    }
    p.hline(x0, x1, 6, lighten(CLOTH, 0.12));                     // gathered top
  }
  p.vline(7, 20, 6, darken(CLOTH, 0.25)); p.vline(7, 22, 11, darken(CLOTH, 0.22));
  p.vline(7, 12, 20, darken(CLOTH, 0.25)); p.vline(7, 21, 33, darken(CLOTH, 0.22));
  p.vline(7, 19, 38, darken(CLOTH, 0.25));                        // fold shadows
  p.px(18, 10, lighten(CLOTH, 0.18)); p.px(31, 14, lighten(CLOTH, 0.15)); // sheen
  // sakura ribbons tied along the rail
  p.px(8, 5, P.sakura); p.px(9, 4, P.sakuraL); p.px(8, 6, P.sakuraD);
  p.px(30, 5, P.sakura); p.px(31, 4, P.sakuraL); p.px(31, 6, P.sakuraD);
  // plank stage
  p.rect(2, 40, 40, 2, mix(P.wood, P.gray2, 0.3));
  p.hline(2, 41, 40, lighten(mix(P.wood, P.gray2, 0.3), 0.18));
  p.rect(2, 42, 40, 5, darken(TIMBER, 0.05));
  p.gradV(2, 42, 40, 5, darken(TIMBER, 0.02), darken(TIMBER, 0.25));
  p.vline(42, 46, 12, darken(TIMBER, 0.3)); p.vline(42, 46, 24, darken(TIMBER, 0.3));
  p.vline(42, 46, 34, darken(TIMBER, 0.3));                       // front plank seams
  p.px(6, 43, darken(TIMBER, 0.35)); p.px(37, 44, CRACK);          // stage wear
  // a mannequin form: head knob, tapered torso, pole + cross base
  const MQ = mix(P.bone, P.gray3, 0.30);
  const mann = (cx, top, tone) => {
    p.circle(cx, top, 2, tone);                                   // head knob
    p.px(cx, top + 2, darken(tone, 0.2));                          // neck
    for (let y = top + 3; y <= top + 13; y++) {                    // torso taper
      const hw = y < top + 7 ? 4 - ((y - top - 3) >> 2) : 3 - ((y - top - 7) >> 2);
      p.hline(cx - hw, cx + hw, y, mix(tone, darken(tone, 0.22), (y - top - 3) / 10));
    }
    p.px(cx - 3, top + 4, lighten(tone, 0.16));                    // shoulder light
    p.vline(top + 14, 39, cx, P.iron);                             // pole
    p.hline(cx - 2, cx + 2, 39, darken(P.iron, 0.15));             // cross base
  };
  // left mannequin: plain, cracked shoulder
  mann(10, 16, MQ);
  p.line(8, 21, 9, 26, CRACK); p.px(7, 20, darken(MQ, 0.3));       // damage
  // right mannequin: plain, wrapped in a scrap of grey cloth + ribbon
  mann(34, 16, darken(MQ, 0.06));
  p.rect(31, 22, 6, 3, mix(P.gray2, CLOTH, 0.3));
  p.hline(31, 36, 22, mix(P.gray3, CLOTH, 0.3));                   // cloth wrap
  p.px(34, 20, P.sakura); p.px(35, 19, P.sakuraL);                 // pinned ribbon
  // centre mannequin: the showpiece, wearing a fine soul-glowing cloak
  p.glow(22, 25, 7, P.shard, 0.18, 3);                             // cloak aura
  mann(22, 14, lighten(MQ, 0.08));
  for (let y = 18; y <= 33; y++) {                                 // the cloak drape
    const t = (y - 18) / 15;
    const hw = Math.round(4 + t * 2.5);                            // flares past the torso
    p.hline(22 - hw, 22 + hw, y, mix(mix(P.shardD, P.void, 0.35), darken(P.shardD, 0.3), t));
  }
  p.vline(19, 32, 18, withAlpha(P.shardL, 0.5));                   // glowing edge seams
  p.vline(19, 32, 26, withAlpha(P.shardL, 0.5));
  p.hline(18, 26, 33, P.shardD); p.px(20, 33, P.shard); p.px(24, 33, P.shard); // hem glow
  p.px(22, 18, P.gold); p.px(21, 18, P.goldL);                     // gold clasp
  p.px(20, 22, withAlpha(P.shardL, 0.7)); p.px(24, 26, withAlpha(P.shard, 0.6)); // woven light
  // full-length mirror leaning at the left edge (slight lean = offset halves)
  p.rect(2, 13, 7, 14, P.woodD);                                   // upper frame (leans right)
  p.rect(1, 26, 7, 14, P.woodD);                                   // lower frame
  p.rect(3, 14, 5, 13, mix(P.steelL, P.hiSky, 0.45));              // upper glass
  p.rect(2, 27, 5, 12, mix(P.steelL, P.hiSky, 0.35));              // lower glass
  p.line(6, 15, 3, 22, P.white);                                   // long diagonal glint
  p.line(5, 28, 3, 33, withAlpha(P.white, 0.7));
  p.line(3, 35, 5, 38, CRACK);                                     // cracked low corner
  p.px(4, 39, darken(P.woodD, 0.2)); p.hline(1, 8, 39, P.woodD);   // frame foot
  // kira sparkles on the showpiece cloak + mirror
  p.star4(27, 17, 2, P.white, P.shardL);
  p.star4(7, 16, 1, P.white, P.hiSky);
  p.sparkle(17, 28, P.neonL, 0);
  p.shadeBottom(0.15, 42);
  p.rimLight(P.rimCool, 0.32);
  p.outline(P.ink);
}, { anchor: 'feet' });

// ── 5. ruin_st_trophy 42×54 — ACHIEVEMENTS: grand trophy monument ────────────
// Three stone tiers crowned by a big tarnished-gold cup with a soul-teal gem,
// medals + plaques on the lower tiers, a laurel engraving, one toppled little
// trophy at the base, and kira glints where the gold still shines.
defineSprite('ruin_st_trophy', 42, 54, (p) => {
  p.softShadow(21, 52, 16, 2.4, 0.36);
  // tier 3 (bottom): wide slab + laurel engraving across the front
  p.rect(4, 46, 34, 6, ST); p.hline(4, 37, 46, STL);
  p.gradV(4, 47, 34, 5, ST, darken(STD, 0.05));
  p.vline(46, 51, 4, darken(ST, 0.22)); p.vline(46, 51, 37, darken(ST, 0.28));
  const LAUR = mix(ST, P.moss, 0.55);
  p.px(13, 49, LAUR); p.px(15, 48, LAUR); p.px(17, 49, LAUR);      // left branch
  p.px(28, 49, LAUR); p.px(26, 48, LAUR); p.px(24, 49, LAUR);      // right branch
  p.px(19, 49, LAUR); p.px(22, 49, LAUR);
  p.px(20, 50, GOLDT); p.px(21, 50, GOLDT);                        // gold tie at centre
  p.line(6, 47, 8, 50, CRACK); p.px(34, 50, CRACK);                // weathering
  p.px(9, 50, P.moss);
  // tier 2: plaques + hanging medals
  p.rect(8, 38, 26, 8, ST); p.hline(8, 33, 38, lighten(STL, 0.06));
  p.gradV(8, 39, 26, 7, mix(STL, ST, 0.5), darken(ST, 0.12));
  p.vline(38, 45, 33, darken(ST, 0.28));
  p.rect(10, 40, 6, 4, P.bone); p.hline(11, 14, 41, mix(P.bone, P.ink2, 0.4));
  p.hline(11, 13, 43, mix(P.bone, P.ink2, 0.3));                   // engraved plaque L
  p.rect(26, 40, 6, 4, mix(P.bone, P.sand, 0.3));
  p.hline(27, 30, 41, mix(P.bone, P.ink2, 0.4));
  p.hline(27, 29, 43, mix(P.bone, P.ink2, 0.3));                   // engraved plaque R
  p.px(19, 39, P.red); p.px(19, 40, P.redD);                       // ribboned medals
  p.circle(19, 42, 1, GOLDT); p.px(19, 42, lighten(GOLDT, 0.3));
  p.px(23, 39, P.blue); p.px(23, 40, P.blueD);
  p.circle(23, 42, 1, GOLDT); p.px(23, 42, lighten(GOLDT, 0.25));
  // tier 1 (top block) under the cup
  p.rect(13, 30, 16, 8, ST); p.hline(13, 28, 30, lighten(STL, 0.08));
  p.gradV(13, 31, 16, 7, STL, darken(ST, 0.1));
  p.vline(30, 37, 28, darken(ST, 0.3));
  p.line(15, 32, 16, 36, CRACK);                                   // split block
  p.px(26, 35, P.moss);
  // the grand cup: foot, stem, then the wide tarnished bowl
  p.rect(17, 27, 8, 3, GOLDT); p.hline(17, 24, 27, lighten(GOLDT, 0.2)); // foot
  p.rect(19, 23, 4, 4, darken(GOLDT, 0.1));
  p.vline(23, 26, 19, lighten(GOLDT, 0.15));                       // stem catch-light
  for (let y = 11; y <= 22; y++) {                                 // bowl: rim 7 → stem 2
    const t = (y - 11) / 11;
    const hw = Math.round(7 - t * 5);
    p.hline(21 - hw, 21 + hw, y, mix(lighten(GOLDT, 0.15), darken(GOLDT, 0.2), t));
  }
  p.hline(14, 28, 11, P.goldL); p.hline(15, 27, 12, lighten(GOLDT, 0.3)); // bright rim
  p.vline(13, 19, 16, lighten(GOLDT, 0.25));                       // left sheen band
  p.px(25, 15, darken(GOLDT, 0.3)); p.px(24, 18, darken(GOLDT, 0.35)); // tarnish patches
  p.px(18, 20, mix(GOLDT, P.gray2, 0.5));
  // handles: swept arcs off the rim
  p.px(12, 12, GOLDT); p.px(11, 13, GOLDT); p.px(11, 14, darken(GOLDT, 0.15));
  p.px(12, 15, GOLDT); p.px(13, 16, darken(GOLDT, 0.2));
  p.px(30, 12, GOLDT); p.px(31, 13, lighten(GOLDT, 0.15)); p.px(31, 14, GOLDT);
  p.px(30, 15, darken(GOLDT, 0.15)); p.px(29, 16, darken(GOLDT, 0.2));
  // soul-teal gem inset on the bowl's face
  p.px(21, 15, P.shardL); p.px(20, 16, P.shard); p.px(22, 16, P.shard);
  p.px(21, 17, P.shardD); p.px(21, 16, P.neonL);
  p.glow(21, 16, 3, P.shard, 0.35, 2);
  // toppled little trophy at the base (knocked off its plinth long ago)
  p.rect(31, 50, 5, 2, darken(GOLDT, 0.12));                       // cup lying sideways
  p.px(36, 50, GOLDT); p.px(36, 51, GOLDT);                        // open mouth
  p.px(30, 50, darken(GOLDT, 0.25)); p.px(29, 51, mix(GOLDT, P.gray2, 0.4)); // foot
  p.px(33, 49, lighten(GOLDT, 0.2));                               // glint on its side
  // kira glints where the gold still catches the light
  p.star4(16, 10, 2, P.white, P.goldL);
  p.star4(27, 14, 1, P.white, P.goldL);
  p.sparkle(22, 12, P.glint, 0);
  p.sparkle(34, 49, P.goldL, 0);
  p.px(8, 39, withAlpha(P.shardL, 0.5));                           // stray soul-mote
  p.shadeBottom(0.16, 44);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: 'feet' });

// ── 6. ruin_st_bed 44×44 — PERSONAL: the one warm corner in the ruin ─────────
// A patched quilt bed (warm reds + golds against all the ash), bedside table
// with a lit candle, a little rug in front, and a tilted picture frame —
// somebody still LIVES here, and it shows.
defineSprite('ruin_st_bed', 44, 44, (p) => {
  p.softShadow(23, 42, 18, 2.2, 0.34);
  // tilted picture frame "hanging" top-left (nail + slack string, one corner low)
  p.px(8, 1, P.iron);                                              // the nail
  p.line(8, 1, 5, 4, mix(P.bone, P.wood, 0.4));                    // slack string
  p.line(8, 1, 11, 4, mix(P.bone, P.wood, 0.4));
  p.rect(3, 4, 10, 8, P.woodL); p.px(13, 5, P.woodL); p.px(13, 11, P.woodL); // frame, right edge 1px low = tilt
  p.rect(4, 5, 8, 6, mix(P.sky, P.gray2, 0.35));                   // little painted sky
  p.hline(4, 11, 9, mix(P.moss, P.gray2, 0.3));                    // green hills
  p.px(6, 6, P.holy); p.px(10, 7, withAlpha(P.holyL, 0.7));        // painted sun
  p.px(12, 10, darken(P.woodL, 0.25));                             // tilt-shadow corner
  // bed: headboard, pillow, then the patched quilt
  p.rect(16, 8, 26, 6, P.woodD); p.hline(16, 41, 8, P.wood);       // headboard
  p.px(16, 7, P.wood); p.px(41, 7, P.wood);                        // posts
  p.vline(9, 13, 17, darken(P.woodD, 0.2)); p.vline(9, 13, 40, darken(P.woodD, 0.25));
  p.rect(19, 13, 11, 5, P.bone); p.hline(19, 29, 13, lighten(P.bone, 0.2)); // pillow
  p.px(20, 17, mix(P.bone, P.gray2, 0.3)); p.px(28, 16, mix(P.bone, P.gray2, 0.3)); // pillow creases
  // the quilt: warm base with stitched patches (the ONE cosy thing in town)
  const QUILT = mix(P.red, P.gray1, 0.28);
  p.rect(17, 18, 24, 18, QUILT);
  p.gradV(17, 18, 24, 18, lighten(QUILT, 0.08), darken(QUILT, 0.12));
  p.rect(20, 20, 6, 5, mix(P.ember, P.wood, 0.35));                // ember patch
  p.rect(31, 26, 7, 6, mix(P.goldD, P.gray1, 0.25));               // gold patch
  p.rect(24, 29, 5, 4, mix(P.sakuraD, P.gray1, 0.3));              // sakura patch
  // stitch marks around each patch (running thread)
  const STITCH = lighten(QUILT, 0.3);
  p.px(20, 19, STITCH); p.px(23, 19, STITCH); p.px(26, 21, STITCH); p.px(19, 23, STITCH);
  p.px(31, 25, STITCH); p.px(35, 25, STITCH); p.px(38, 28, STITCH); p.px(30, 30, STITCH);
  p.px(24, 28, STITCH); p.px(28, 30, STITCH); p.px(23, 32, STITCH);
  p.hline(17, 40, 24, darken(QUILT, 0.18));                        // quilt fold lines
  p.hline(17, 40, 31, darken(QUILT, 0.15));
  p.px(18, 19, lighten(QUILT, 0.15)); p.px(39, 20, lighten(QUILT, 0.12)); // soft top light
  // turned-down hem + draped foot of the quilt
  p.rect(17, 18, 24, 2, mix(P.bone, QUILT, 0.45));
  p.hline(17, 40, 19, mix(P.bone, QUILT, 0.6));
  p.rect(17, 36, 24, 3, darken(QUILT, 0.2));
  p.px(21, 38, darken(QUILT, 0.32)); p.px(33, 38, darken(QUILT, 0.3)); // hanging folds
  p.hline(17, 40, 39, darken(P.woodD, 0.1));                       // bed frame foot rail
  p.px(17, 40, P.woodD); p.px(40, 40, P.woodD);                    // frame feet
  // bedside table with the lit candle
  p.rect(3, 22, 10, 2, P.woodL); p.hline(3, 12, 22, lighten(P.woodL, 0.18)); // table top
  p.rect(4, 24, 8, 6, P.wood); p.gradV(4, 24, 8, 6, P.wood, P.woodD);
  p.hline(5, 10, 26, darken(P.wood, 0.25)); p.px(7, 28, P.goldD);  // drawer + knob
  p.vline(30, 35, 4, P.woodD); p.vline(30, 35, 11, P.woodD);       // legs
  p.rect(6, 17, 2, 5, P.bone); p.px(6, 17, lighten(P.bone, 0.2));  // candle stick
  p.px(6, 16, P.ember); p.px(7, 15, P.emberL); p.px(7, 14, P.white); // flame
  p.glow(7, 15, 4, P.ember, 0.4, 3);                               // warm pool of light
  p.px(5, 21, withAlpha(P.emberL, 0.5)); p.px(9, 22, withAlpha(P.ember, 0.35)); // light on the table
  // little rug in front of the bed
  p.ellipse(24, 40, 10, 2.6, CLOTH);
  p.ellipse(24, 40, 7, 1.8, lighten(CLOTH, 0.12));
  p.px(20, 40, mix(CLOTH, P.goldD, 0.5)); p.px(28, 40, mix(CLOTH, P.goldD, 0.5)); // woven motif
  p.px(24, 39, mix(CLOTH, P.bone, 0.4));
  p.px(15, 41, darken(CLOTH, 0.25)); p.px(33, 41, darken(CLOTH, 0.25)); // frayed ends
  // cosy kira: candlelight catching the quilt + frame
  p.star4(36, 22, 1, P.white, P.emberL);
  p.sparkle(11, 6, P.holyL, 0);
  p.px(13, 18, withAlpha(P.emberL, 0.45));                         // drifting warm mote
  p.shadeBottom(0.13, 36);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: 'feet' });

// ── 7. boss_pillar 16×28 anim 3f — IN-RUN destructible soul-cage pillar ─────
// A boss summons rings of these to wall the player in. Jagged obsidian-violet
// shard torn up out of the ground, soul-teal core veins pulsing bright → dim
// → bright across the 3 frames, rune ring smouldering at its root. Menacing
// and readable even at game zoom.
defineAnim('boss_pillar', 16, 28, 3, (p, f) => {
  const bright = f !== 1;                              // frame pulse: lit / dim / lit
  const OBS  = mix(P.void, P.purpleD, 0.45);           // obsidian-violet body
  const OBSL = mix(OBS, P.astral, 0.40);               // lit facet
  const OBSD = darken(OBS, 0.30);                      // shaded facet
  p.softShadow(8, 27, 6, 1.6, 0.35);
  // rune ring at the root (segmented ellipse, glows harder on bright frames)
  const ringC = withAlpha(P.shard, bright ? 0.65 : 0.35);
  for (let a = 0; a < Math.PI * 2; a += 0.45) {
    p.px(Math.round(8 + Math.cos(a) * 5.5), Math.round(25.5 + Math.sin(a) * 1.8), ringC);
  }
  p.px(3, 25, bright ? P.shardL : P.shardD);           // rune nodes on the ring
  p.px(13, 26, bright ? P.shardL : P.shardD);
  p.px(8, 27, withAlpha(P.shard, bright ? 0.8 : 0.4));
  p.glow(8, 25, 4, P.shard, bright ? 0.3 : 0.14, 2);
  // torn-earth rubble where it erupted
  p.px(2, 24, STD); p.px(14, 24, ST); p.px(12, 26, STD); p.px(4, 26, darken(ST, 0.2));
  // the shard: jagged tapering spike, hand-stepped silhouette
  p.px(8, 2, OBSL);                                    // needle tip
  p.vline(3, 4, 8, OBS);
  p.hline(7, 9, 5, OBS);  p.hline(7, 9, 6, OBS);
  p.hline(6, 9, 7, OBS);  p.hline(6, 10, 8, OBS);
  p.hline(6, 10, 9, OBS); p.hline(5, 10, 10, OBS);     // jag step out
  p.hline(6, 10, 11, OBS);                              // notch back in
  p.hline(5, 11, 12, OBS); p.hline(5, 11, 13, OBS);
  p.hline(4, 11, 14, OBS); p.hline(4, 12, 15, OBS);
  p.hline(5, 12, 16, OBS);                              // left notch
  p.hline(4, 12, 17, OBS); p.hline(4, 12, 18, OBS);
  p.hline(4, 13, 19, OBS); p.hline(3, 13, 20, OBS);
  p.hline(3, 13, 21, OBS); p.hline(4, 12, 22, OBS);     // waist before the root flare
  p.hline(3, 13, 23, OBS); p.hline(3, 13, 24, OBS);
  p.hline(4, 12, 25, darken(OBS, 0.15));                // root sinks into the ring
  // side spikelet bursting off the left flank
  p.px(2, 16, OBS); p.px(1, 14, OBS); p.px(2, 15, OBSL); p.px(1, 13, OBSL);
  p.px(3, 17, OBSD);
  // facet shading: lit left edge, shaded right edge, glassy face glint
  p.vline(6, 13, 6, OBSL); p.vline(15, 21, 4, OBSL); p.px(5, 14, OBSL);
  p.vline(8, 14, 10, OBSD); p.vline(16, 24, 12, OBSD); p.px(11, 13, OBSD);
  p.px(7, 4, lighten(OBSL, 0.25)); p.px(5, 18, lighten(OBSL, 0.2)); // glassy glints
  p.line(9, 10, 10, 16, darken(OBSD, 0.2));             // fracture seam
  // soul-teal core veins: a jagged conduit down the heart, pulsing
  const vein  = bright ? P.shardL : P.shardD;
  const veinB = bright ? P.shard : darken(P.shardD, 0.2);
  p.px(8, 4, vein); p.px(8, 6, vein); p.px(7, 8, vein); p.px(8, 9, vein);
  p.px(8, 11, vein); p.px(7, 13, vein); p.px(8, 15, vein); p.px(8, 17, vein);
  p.px(7, 19, vein); p.px(8, 21, vein); p.px(8, 23, vein);
  p.px(9, 7, veinB); p.px(6, 12, veinB); p.px(9, 14, veinB);       // branch capillaries
  p.px(6, 18, veinB); p.px(10, 20, veinB); p.px(9, 22, veinB);
  if (bright) {
    p.glow(8, 13, 3.5, P.shard, 0.4, 3);
    p.px(8, 13 + (f === 2 ? 4 : 0), P.white);                       // white-hot node travels
    p.star4(11, 6 + f, 1, P.white, P.shardL);                       // kira on the tip facet
    p.px(12 - f, 9, withAlpha(P.shardL, 0.7));                      // escaping soul-mote
  } else {
    p.glow(8, 13, 3, P.shard, 0.16, 2);
    p.px(8, 13, P.shardD);
  }
  p.rimLight(P.rimCool, 0.3);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 5 });
