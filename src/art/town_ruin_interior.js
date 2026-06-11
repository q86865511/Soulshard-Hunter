// R20/B1 — ruin-flavoured interior props (rint_*): same sizes/anchors as the old
// town_* set so world.js makeInterior swaps names 1:1.
// Style: 末日遺跡 — dusty, cracked, patched, but still warm/lived-in (the
// survivors keep these rooms going). Desaturated ash-greyed wood/stone/gilt
// base, ember-orange (P.ember*) + soul-teal (P.shard*) accent glints, anime
// "kira" sparkles. Standing props: body → rimLight/softShadow → outline(P.ink),
// matching the original town props' convention.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ── shared ruin-interior tones ───────────────────────────────────────────────
const RWOOD  = mix(P.wood,  P.gray1, 0.28);   // ash-dulled wood body
const RWOODD = mix(P.woodD, P.gray1, 0.34);   // dark worn wood (matches tiles' PLANK)
const RWOODL = mix(P.woodL, P.gray2, 0.24);   // greyed lit wood edge
const RSTONE = mix(P.gray2, P.ink2, 0.18);    // dusty interior stone
const RGOLD  = mix(P.gold,  P.gray2, 0.38);   // tarnished gilt
const RGOLDD = mix(P.goldD, P.gray1, 0.36);   // deep tarnish
const ASH    = mix(P.gray3, P.gray4, 0.35);   // ash-dust film
const RIRON  = mix(P.iron,  P.gray1, 0.30);   // dulled ironwork

// 1) rint_pew — cracked wooden pew: the middle backrest plank has snapped away,
//    the seat is split through, everything wears a thin ash film.
defineSprite('rint_pew', 18, 12, (p) => {
  p.softShadow(9, 11, 8, 1.6, 0.3);
  // backrest in two pieces — the centre plank broke off long ago
  p.gradV(2, 1, 8, 3, RWOOD, RWOODD);            // surviving left run
  p.gradV(13, 1, 3, 3, RWOOD, RWOODD);           // right stub
  p.hline(2, 9, 1, RWOODL);
  p.hline(13, 15, 1, RWOODL);
  p.px(10, 1, RWOODD); p.px(10, 2, darken(RWOODD, 0.2)); // splinter stubs
  p.px(12, 3, RWOODD);
  // seat plank — cracked but solid enough to sit on
  p.rect(1, 6, 16, 3, RWOOD);
  p.hline(1, 16, 6, RWOODL);                     // front-edge light
  p.hline(2, 15, 8, RWOODD);                     // underside shadow
  p.line(6, 6, 8, 8, darken(RWOODD, 0.25));      // the seat crack
  p.px(9, 7, lighten(RWOOD, 0.12));              // crack lip catches light
  // ash-dust film + a polished sit-spot (someone still uses it)
  p.speckle(2, 6, 14, 3, withAlpha(ASH, 0.5), 5, 17);
  p.hline(11, 14, 7, withAlpha(RWOODL, 0.45));   // worn-smooth patch
  // support posts + legs
  p.vline(4, 6, 3, RWOODD); p.vline(4, 6, 14, RWOODD);
  p.rect(2, 9, 2, 3, RWOODD); p.rect(14, 9, 2, 3, RWOODD);
  p.vline(9, 11, 2, RWOOD); p.vline(9, 11, 14, RWOOD); // leg front light
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
}, { anchor: [9, 11] });

// 2) rint_stained — stained-glass window: the rose heart now bleeds soul-teal,
//    one shattered corner is patched over with a nailed board.
defineSprite('rint_stained', 14, 20, (p) => {
  // soul-teal light bleeding through the surviving glass
  p.glow(7, 10, 8, P.shard, 0.14, 4);
  // weathered stone frame — arched top + straight sides + sill
  p.rect(1, 6, 12, 13, RSTONE);
  p.ellipse(7, 6, 6, 5, RSTONE);
  p.rect(2, 7, 10, 11, P.ink2);                  // inner recess (lead field)
  p.ellipse(7, 7, 5, 4, P.ink2);
  p.hline(2, 11, 18, lighten(RSTONE, 0.16));     // sill light
  p.vline(7, 17, 1, lighten(RSTONE, 0.10));      // left frame lit edge
  p.vline(7, 17, 12, darken(RSTONE, 0.18));      // right frame shade
  p.ring(7, 6, 6, darken(RSTONE, 0.22));         // arch outer shade
  p.hline(3, 10, 1, lighten(RSTONE, 0.2));       // arch crown light
  p.line(9, 1, 10, 3, darken(RSTONE, 0.3));      // crack running off the crown
  // rose pane in the arch — a soul-teal heart, still alive
  p.glow(7, 6, 3, P.shard, 0.35, 3);
  p.ellipse(7, 6, 3, 2.6, P.shardD);
  p.ellipse(7, 6, 2, 1.6, P.shard);
  p.px(7, 5, P.shardL);
  p.px(6, 5, withAlpha(P.white, 0.7));           // glass glint
  // surviving jewel panes (dust-dimmed) — the bottom-right ones are GONE
  const panes = [
    [3, 9, P.blueL], [7, 9, P.shard], [10, 9, P.greenL],
    [3, 12, RGOLD], [7, 12, P.blueL],
    [3, 15, P.shardD],
  ];
  for (const [x, y, c] of panes) {
    const cc = mix(c, P.gray2, 0.25);            // dusty glass
    p.gradV(x, y, 2, 2, lighten(cc, 0.12), darken(cc, 0.12));
    p.px(x, y, lighten(cc, 0.35));               // muted corner glint
  }
  // shattered corner: dark hole, glow-lit shards, then a nailed board patch
  p.rect(7, 14, 5, 4, darken(P.ink2, 0.3));      // the hole
  p.px(6, 14, P.shardL); p.px(7, 13, withAlpha(P.shardL, 0.7)); // shards catch the glow
  p.rect(6, 15, 7, 2, RWOODD);                   // patch board nailed askew
  p.hline(6, 12, 15, RWOOD);                     // board top catches light
  p.px(7, 15, RIRON); p.px(11, 16, RIRON);       // nail heads
  // lead cames between the remaining panes
  p.vline(8, 14, 5, P.ink2); p.vline(8, 13, 9, P.ink2);
  p.hline(2, 11, 8, P.ink2); p.hline(2, 11, 11, P.ink2); p.hline(2, 6, 14, P.ink2);
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
  p.sparkle(7, 6, withAlpha(P.shardL, 0.9), 1);  // kira on the rose heart
}, { anchor: [7, 19] });

// 3) rint_candles — votive cluster on a tarnished stand: stub candles of uneven
//    height, heavy wax drips run onto the arm, flames still flicker warm.
defineAnim('rint_candles', 10, 14, 3, (p, f) => {
  p.softShadow(5, 13, 4, 1, 0.3);
  const gstr = 0.16 + (f === 0 ? 0.05 : 0);      // pulsing ambient warmth
  p.glow(5, 2, 7, P.ember, gstr, 4);
  // tarnished stand: foot, column, cross-arm
  p.ellipse(5, 12, 3, 1.4, RGOLDD);
  p.ellipse(5, 12, 2, 0.8, RGOLD);
  p.rect(5, 7, 1, 5, RGOLDD);
  p.vline(8, 10, 5, lighten(RGOLDD, 0.2));       // dulled column light
  p.hline(1, 8, 7, RGOLDD);                      // cross arm
  p.hline(1, 8, 6, RGOLD);                       // arm top light
  p.px(3, 7, darken(RGOLDD, 0.25));              // tarnish spot
  // candle cups
  p.px(1, 6, RGOLD); p.px(8, 6, RGOLD); p.px(5, 6, RGOLD);
  // three stub candles — burnt to uneven heights
  const cx = [1, 5, 8], top = [3, 4, 3];
  cx.forEach((x, i) => {
    p.rect(x, top[i], 1, 6 - top[i], P.bone);
    p.px(x, top[i], lighten(P.bone, 0.3));       // top wax light
    p.px(x, 5, darken(P.bone, 0.18));            // base shade
  });
  // heavy wax drips running onto the arm and foot
  p.px(2, 7, P.bone); p.px(2, 8, darken(P.bone, 0.12));
  p.px(5, 8, P.bone);
  p.px(8, 7, darken(P.bone, 0.1));
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  // flickering flames (after outline so they glow free)
  const lift = [0, -1, 1];
  cx.forEach((x, i) => {
    const fl = lift[(f + i) % 3];
    p.glow(x, top[i] - 1 + fl, 2, P.ember, 0.4, 3);
    p.px(x, top[i] - 1 + fl, P.ember);
    p.px(x, top[i] - 2 + fl, P.emberL);
    if (f !== 1) p.px(x, Math.max(0, top[i] - 3 + fl), P.white); // bright tip
  });
  p.px((f * 3 + 2) % 10, Math.max(0, 1 - f), withAlpha(P.emberL, 0.7)); // drifting spark
}, { anchor: [5, 13], fps: 6 });

// 4) rint_arch — interior stone arch: the keystone is split clean through, a
//    soul-teal moss vein climbs one pillar, rift-light spills through the gap.
defineSprite('rint_arch', 16, 24, (p) => {
  p.softShadow(8, 23, 8, 1.6, 0.28);
  // pillars — dusty stone, pock-chipped
  p.rect(0, 6, 4, 18, mix(P.gray1, P.ink2, 0.2));        // left base
  p.gradH(0, 6, 2, 18, mix(P.gray3, RSTONE, 0.5), RSTONE); // lit face
  p.rect(12, 6, 4, 18, mix(P.gray1, P.ink2, 0.2));       // right base
  p.rect(14, 6, 2, 18, darken(P.gray1, 0.22));           // shade face
  p.px(0, 12, darken(P.gray1, 0.3)); p.px(3, 18, darken(P.gray1, 0.25)); // pock chips
  p.px(13, 10, darken(P.gray1, 0.28));
  // capitals (one corner chipped off)
  p.rect(0, 6, 5, 2, RSTONE); p.rect(11, 6, 5, 2, RSTONE);
  p.hline(0, 4, 6, lighten(RSTONE, 0.2));
  p.px(15, 6, darken(RSTONE, 0.25));             // chipped capital corner
  // rounded arch ring spanning the pillars
  for (let r = 7; r >= 5; r--) {
    const c = r === 7 ? mix(P.gray3, RSTONE, 0.5) : (r === 6 ? RSTONE : mix(P.gray1, P.ink2, 0.2));
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.07) {
      const x = 8 + Math.cos(a) * r;
      const y = 7 + Math.sin(a) * r;
      if (y <= 7) p.px(Math.round(x), Math.round(y), c); // upper half only
    }
  }
  // square the shoulders into the capitals
  p.rect(2, 4, 12, 3, mix(P.gray1, P.ink2, 0.2));
  p.gradH(2, 4, 12, 1, lighten(RSTONE, 0.2), RSTONE);    // top light edge
  // inner reveals (the open doorway middle stays transparent)
  p.vline(8, 22, 4, darken(P.gray1, 0.22));
  p.vline(8, 22, 11, darken(P.gray1, 0.28));
  // soul-teal glow spilling through the opening (was holy light)
  p.gradV(5, 12, 6, 11, withAlpha(P.shard, 0.0), withAlpha(P.shard, 0.14));
  // CRACKED keystone — split clean down the middle, gap widening
  p.rect(7, 2, 2, 4, mix(P.gray3, RSTONE, 0.5));
  p.px(7, 2, P.gray4); p.px(8, 2, P.gray4);      // top light
  p.vline(2, 5, 8, darken(RSTONE, 0.35));        // the split
  p.px(8, 3, darken(RSTONE, 0.45));              // gap widens mid-stone
  p.hline(6, 9, 5, RSTONE);                      // keystone base ledge
  // moss vein creeping up the left pillar and over the shoulder
  const moss = mix(RSTONE, P.moss, 0.6);
  p.px(1, 20, moss); p.px(1, 19, moss); p.px(2, 18, mix(RSTONE, P.moss, 0.45));
  p.px(2, 16, moss); p.px(1, 14, mix(RSTONE, P.moss, 0.4));
  p.px(2, 11, mix(RSTONE, P.moss, 0.5)); p.px(3, 8, mix(RSTONE, P.moss, 0.35));
  p.px(4, 5, mix(RSTONE, P.moss, 0.4));
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
  p.sparkle(8, 14, withAlpha(P.shardL, 0.6), 1); // soul mote drifting in the doorway
}, { anchor: [8, 23] });

// 5) rint_desk — guild desk still on duty: scattered papers, an ink pot, a
//    candle stub burning low, claw-scratch gouges raked across the front.
defineSprite('rint_desk', 24, 16, (p) => {
  p.softShadow(12, 15, 11, 1.6, 0.28);
  // front panel — greyed wood with a carved recess
  p.gradV(2, 6, 20, 9, RWOOD, darken(RWOODD, 0.06));
  p.vline(7, 14, 7, darken(RWOODD, 0.22));
  p.vline(7, 14, 16, darken(RWOODD, 0.22));
  p.rect(3, 9, 18, 3, darken(RWOODD, 0.15));
  p.speckle(3, 7, 18, 7, withAlpha(ASH, 0.45), 7, 13);
  // claw-scratch marks raked across the recess
  p.line(5, 9, 8, 12, darken(RWOODD, 0.4));
  p.line(7, 9, 10, 12, darken(RWOODD, 0.35));
  p.px(6, 10, lighten(RWOOD, 0.1));              // gouge lip catch
  // the old guild sigil — half-faded but still faintly alive
  p.glow(15, 10, 3, withAlpha(P.shard, 0.3), 0.4, 3);
  p.px(15, 9, P.shardL); p.px(14, 10, P.shardD); p.px(16, 10, P.shardD);
  p.px(15, 11, P.shardD); p.px(15, 10, P.shard);
  // counter top overhang — gilt lip tarnished and nicked
  p.rect(0, 4, 24, 3, RWOOD);
  p.hline(0, 23, 4, RWOODL);
  p.hline(0, 23, 6, RGOLD);                      // tarnished gilt edge
  p.px(5, 6, darken(RGOLDD, 0.2)); p.px(17, 6, darken(RGOLDD, 0.2)); // nicks
  p.hline(0, 23, 7, darken(RWOODD, 0.2));
  // scattered loose papers — the top sheet slid off-square
  p.rect(3, 1, 6, 4, mix(P.bone, P.gray3, 0.18));
  p.rect(6, 2, 6, 3, P.bone);
  p.hline(7, 10, 3, P.ink2);                     // scribbled lines
  p.hline(4, 6, 2, withAlpha(P.ink2, 0.7));
  p.px(3, 1, lighten(P.bone, 0.12)); p.px(11, 4, darken(P.bone, 0.2));
  // ink pot + a dried spill on the counter
  p.rect(15, 2, 3, 3, P.ink2);
  p.hline(15, 17, 2, mix(P.ink2, P.gray2, 0.4)); // pot rim
  p.px(16, 2, mix(P.shard, P.ink2, 0.4));        // ink catches the soul-light
  p.ellipse(19, 5, 2, 0.8, withAlpha(P.ink2, 0.8));
  // candle stub burning low at the right end
  p.rect(21, 2, 1, 3, P.bone);
  p.px(21, 4, darken(P.bone, 0.15));
  p.px(20, 4, P.bone);                           // wax-pool drip
  p.shadeBottom(0.14);
  p.rimLight(P.rim, 0.35, 1, 1);
  p.outline(P.ink);
  // stub flame (after outline so it glows)
  p.glow(21, 1, 2, P.ember, 0.4, 2);
  p.px(21, 1, P.emberL); p.px(21, 0, withAlpha(P.white, 0.8));
}, { anchor: [12, 15] });

// 6) rint_bench — worn bench: a cracked backrest slat and a brighter patch
//    plank nailed over a hole in the seat. Still does its job.
defineSprite('rint_bench', 20, 14, (p) => {
  // iron back uprights (peek through slat gaps)
  p.vline(1, 9, 3, RIRON);
  p.vline(1, 9, 16, RIRON);
  // backrest slats — the top one cracked
  p.rect(2, 1, 16, 2, RWOOD);
  p.hline(2, 17, 1, RWOODL);
  p.line(8, 1, 9, 2, darken(RWOODD, 0.3));       // slat crack
  p.rect(2, 4, 16, 2, RWOOD);
  p.hline(2, 17, 4, RWOODL);
  // seat — with a newer PATCH plank nailed over a hole
  p.rect(1, 7, 18, 3, RWOOD);
  p.hline(1, 18, 7, RWOODL);
  p.hline(2, 17, 9, RWOODD);
  p.rect(10, 7, 5, 2, mix(P.woodL, P.gray2, 0.15)); // fresher patch wood
  p.px(10, 7, RIRON); p.px(14, 8, RIRON);        // patch nails
  p.px(5, 8, darken(RWOODD, 0.2));               // old knot
  p.speckle(2, 7, 16, 3, withAlpha(ASH, 0.4), 4, 21); // ash-dust film
  // iron legs
  p.rect(3, 10, 2, 3, RIRON);
  p.rect(15, 10, 2, 3, RIRON);
  p.px(3, 10, P.steelL);
  p.px(15, 10, P.steelL);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [10, 13] });

// 7) rint_lantern — hanging lantern, one pane cracked: the fracture leaks a
//    brighter flicker of warm light, the bottom is sooted, the tassel frayed.
defineAnim('rint_lantern', 12, 18, 2, (p, f) => {
  const sway = f === 0 ? 0 : 1;                  // 1px sway between frames
  // cord + cap
  p.vline(0, 2, 6, RWOODD);
  p.rect(4 + sway, 3, 4, 1, RWOODD);
  const x = 2 + sway;
  // body — warm glow, dimmer than its glory days
  p.glow(x + 4, 9, 6, P.ember, 0.32, 4);
  p.gradV(x, 4, 8, 9, mix(P.emberL, P.gray3, 0.2), mix(P.ember, P.gray2, 0.25));
  p.ellipse(x + 4, 4, 4, 1.2, mix(P.emberL, P.gray3, 0.18));   // top dome
  p.ellipse(x + 4, 12, 4, 1.2, darken(mix(P.ember, P.gray2, 0.25), 0.15));
  // paper-panel ribs
  p.vline(4, 12, x + 1, withAlpha(P.redD, 0.5));
  p.vline(4, 12, x + 6, withAlpha(P.redD, 0.5));
  p.vline(4, 12, x + 4, lighten(P.emberL, 0.15)); // central hot core
  // CRACKED pane — a dark fracture, light leaks brighter through it
  p.line(x + 2, 6, x + 4, 9, darken(P.redD, 0.35));
  p.px(x + 3, 7, withAlpha(P.white, f ? 0.8 : 0.55)); // leak glint flickers
  p.px(x + 2, 9, darken(P.redD, 0.3));
  // sooty bottom band
  p.hline(x + 1, x + 6, 12, withAlpha(P.ink2, 0.5));
  // frayed tassel
  p.vline(13, 15, x + 4, mix(P.red, P.gray1, 0.3));
  p.px(x + 3, 16, mix(P.red, P.gray1, 0.4));     // loose strand
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.sparkle(x + (f ? 7 : 0), 6, withAlpha(P.emberL, 0.8), 1); // drifting warm spark
}, { anchor: [6, 1], fps: 2, loop: true });

// 8) rint_rack — clothes rack: patched rags on most hangers, but ONE fine
//    soul-woven cloak still glows among them.
defineSprite('rint_rack', 22, 20, (p) => {
  p.softShadow(11, 19, 9, 1.4, 0.28);
  // legs + feet + top bar (greyed wood)
  p.vline(4, 18, 3, RWOODD);
  p.vline(4, 18, 18, RWOODD);
  p.hline(1, 5, 18, RWOODD);
  p.hline(16, 20, 18, RWOODD);
  p.hline(2, 19, 4, RWOOD);
  p.hline(2, 19, 3, RWOODL);
  p.px(12, 3, darken(RWOODD, 0.25));             // gouge in the bar
  // hanger + garment helper: h = body height, patch = crude sewn square
  const hang = (hx, col, h, patch) => {
    p.px(hx, 5, P.steelD);                       // hook
    p.px(hx, 4, P.steelL);
    p.line(hx - 2, 7, hx + 2, 7, P.steelD);      // hanger bar
    p.gradV(hx - 2, 8, 5, h, lighten(col, 0.15), darken(col, 0.18));
    p.vline(8, 7 + h, hx + 2, darken(col, 0.25));
    p.px(hx - 1, 9, lighten(col, 0.3));          // shoulder sheen
    if (patch) {
      p.rect(hx, 10, 2, 2, mix(col, P.gray3, 0.55));
      p.px(hx, 10, mix(col, P.gray4, 0.5));      // patch stitch catch
    }
  };
  // patched rags — muted dyes, ragged hems
  hang(4, mix(P.red, P.gray1, 0.45), 6, true);
  hang(9, mix(P.blue, P.gray1, 0.5), 5, true);
  p.px(8, 13, mix(P.blue, P.gray1, 0.6));        // ragged hem tatter
  // the fine cloak — soul-woven, still glowing
  p.glow(15, 11, 4, P.shard, 0.3, 3);
  hang(15, mix(P.shard, P.gray1, 0.25), 7, false);
  p.vline(8, 14, 14, lighten(P.shard, 0.1));     // silken sheen line
  p.px(15, 12, P.shardL);
  hang(19, mix(P.gold, P.gray2, 0.5), 6, true);  // dulled gold rag
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.star4(15, 9, 2, withAlpha(P.shardL, 0.9), P.white); // kira on the cloak
}, { anchor: [11, 19] });

// 9) rint_mirror — full mirror in a tarnished frame: a crack web in the lower
//    corner, the glass gone dusky with one dim soul-teal reflection glint.
defineSprite('rint_mirror', 12, 22, (p) => {
  p.softShadow(6, 21, 4.5, 1.3, 0.3);
  // feet
  p.rect(2, 20, 3, 2, RGOLDD);
  p.rect(7, 20, 3, 2, RGOLDD);
  p.px(2, 20, RGOLD); p.px(7, 20, RGOLD);
  // tarnished gold frame — flaking gilt
  p.rect(1, 1, 10, 20, RGOLDD);
  p.rect(1, 1, 10, 1, RGOLD);
  p.rect(1, 1, 1, 20, RGOLD);
  p.vline(1, 20, 10, darken(RGOLDD, 0.2));
  p.hline(1, 10, 20, darken(RGOLDD, 0.2));
  p.px(3, 1, darken(RGOLDD, 0.3)); p.px(10, 8, darken(RGOLDD, 0.3)); // flaked spots
  // finial
  p.px(5, 0, RGOLD); p.px(6, 0, RGOLD);
  p.px(5, 1, RGOLDD);
  // glass — dusky soul-teal-tinted dusk, dim
  p.gradV(3, 3, 6, 16, mix(P.gray3, P.shardD, 0.3), mix(P.gray2, P.ink2, 0.4));
  p.rect(3, 3, 6, 1, mix(P.gray4, P.shardL, 0.25));
  // faint reflection streak (dimmer than the old gleam)
  p.line(4, 16, 7, 5, withAlpha(P.gray4, 0.8));
  p.px(7, 5, withAlpha(P.shardL, 0.85));         // the dim soul glint
  p.glow(6, 8, 3, P.shardD, 0.2, 3);             // soft inner sheen
  // crack web in the lower-left corner
  const ck = mix(P.ink2, P.gray3, 0.35);
  p.line(3, 18, 5, 15, ck);
  p.line(3, 16, 5, 15, ck);
  p.line(5, 15, 6, 17, withAlpha(ck, 0.8));
  p.px(4, 17, lighten(P.gray4, 0.2));            // shard facet catch
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
  p.star4(7, 5, 2, withAlpha(P.shardL, 0.8), P.white); // kira deep in the glass
}, { anchor: [6, 21] });

// 10) rint_weaponrack — weapon rack: notched but freshly-honed sword (ember
//     glint riding the edge), cracked-haft spear, and one EMPTY slot.
defineSprite('rint_weaponrack', 18, 22, (p) => {
  p.softShadow(9, 21, 8, 1.5, 0.28);
  // wooden frame
  p.rect(1, 18, 16, 3, RWOODD);
  p.rect(1, 18, 16, 1, RWOODL);
  p.vline(2, 20, 2, RWOOD);
  p.vline(2, 20, 15, RWOOD);
  p.rect(1, 6, 16, 2, RWOODD);
  p.hline(1, 16, 6, RWOODL);
  p.speckle(1, 6, 16, 15, withAlpha(ASH, 0.4), 6, 31);
  // slot pegs — the middle weapon is long gone
  p.px(4, 8, RGOLD); p.px(9, 8, RGOLD); p.px(13, 8, RGOLD);
  p.px(9, 9, darken(RWOODD, 0.3));               // dust shadow under the bare peg
  // sword (left) — blade notched along the edge, but kept keen
  p.vline(2, 17, 4, mix(P.steelL, P.gray2, 0.3));
  p.px(4, 2, P.steel);
  p.px(4, 6, darken(P.steelD, 0.2));             // notch bites
  p.px(4, 11, darken(P.steelD, 0.2));
  p.px(3, 8, lighten(P.steelL, 0.1));            // worn sheen
  p.hline(3, 5, 16, RGOLD);                      // dulled gilt crossguard
  p.px(4, 18, RGOLD); p.px(5, 18, RGOLDD);       // pommel
  // ember glint riding the fresh-honed edge (someone still whets it)
  p.px(4, 4, mix(P.steelL, P.emberL, 0.6));
  p.star4(4, 3, 2, withAlpha(P.emberL, 0.9), P.white);
  // spear (right) — haft cracked, diamond head intact
  p.vline(2, 19, 13, RWOOD);
  p.px(13, 12, darken(RWOODD, 0.3));             // haft crack
  p.px(13, 2, P.steelL); p.px(13, 3, P.steelL); p.px(13, 4, P.steel);
  p.px(12, 4, P.steelD); p.px(14, 4, P.steelD);  // barbs
  p.shadeBottom(0.12);
  p.rimLight(P.rim, 0.35, 1, 1);
  p.outline(P.ink);
}, { anchor: [9, 21] });

// 11) rint_grindstone — grindstone wheel, frame spark-scorched black where the
//     ember shower bites; the wheel is pitted but still spinning true enough.
defineSprite('rint_grindstone', 14, 16, (p) => {
  p.softShadow(7, 15, 6, 1.2, 0.28);
  // frame legs + base — char-marked from years of sparks
  p.line(2, 15, 4, 9, RWOODD);
  p.line(11, 15, 9, 9, RWOODD);
  p.rect(2, 14, 9, 2, RWOODD);
  p.hline(2, 10, 14, lighten(RWOODD, 0.1));      // lit top of base
  p.px(3, 14, mix(RWOODD, P.ink2, 0.6));         // scorch char
  p.px(4, 15, mix(RWOODD, P.ink2, 0.5));
  p.line(4, 12, 9, 12, darken(RWOODD, 0.15));    // brace
  // wheel — heavily pitted, one rim chip
  p.circle(7, 8, 5, mix(P.gray3, P.gray2, 0.5));
  p.circle(7, 8, 4, P.gray2);
  p.ring(7, 8, 5, darken(P.gray2, 0.28));
  p.px(5, 6, P.gray4); p.px(6, 5, P.gray4);      // worn highlight arc
  p.px(4, 8, mix(P.gray4, P.gray3, 0.5));
  p.speckle(4, 5, 6, 6, darken(P.gray2, 0.18), 7, 41); // heavy pitting
  p.px(9, 10, darken(P.gray2, 0.3));             // chipped rim bite
  // hub + crank (knob's gilt long dulled)
  p.circle(7, 8, 1, P.iron);
  p.px(7, 8, P.steelL);
  p.line(7, 8, 11, 6, RIRON);
  p.rect(11, 5, 2, 2, RGOLD);
  p.px(11, 5, lighten(RGOLD, 0.2));
  // bright spark shower — the wheel still earns its keep
  p.glow(1, 10, 2, withAlpha(P.ember, 0.5), 0.7, 2);
  p.px(2, 9, P.emberL);
  p.px(1, 10, P.white);
  p.px(0, 11, lighten(P.emberL, 0.2));
  p.sparkle(1, 8, P.glint, 1);
  p.rimLight(P.rim, 0.35, 1, 1);
  p.outline(P.ink);
}, { anchor: [7, 15] });

// 12) rint_trophyshelf — shelf of tarnished trophies: verdigris medals, ash
//     drifts on the lips, one cup toppled onto its side.
defineSprite('rint_trophyshelf', 24, 22, (p) => {
  p.softShadow(12, 21, 9.5, 1.4, 0.3);
  // cabinet — greyed wood, one edge nibbled by damp-rot
  p.gradV(2, 2, 20, 19, RWOOD, RWOODD);
  p.rect(2, 2, 20, 1, RWOODL);
  p.vline(2, 20, 2, lighten(RWOOD, 0.1));
  p.px(21, 4, darken(RWOODD, 0.25)); p.px(21, 5, darken(RWOODD, 0.3)); // rot nibble
  // shelf ledges + recessed dark backs
  p.hline(3, 20, 11, RWOODL);
  p.hline(3, 20, 12, darken(RWOODD, 0.25));
  p.hline(3, 20, 20, RWOODL);
  p.rect(4, 4, 16, 6, darken(RWOODD, 0.28));
  p.rect(4, 13, 16, 6, darken(RWOODD, 0.28));
  p.glow(11, 6, 6, RGOLD, 0.12, 3);              // dimmer pride than it once was
  // tarnished cup helper
  const cup = (cx, cy) => {
    p.rect(cx - 2, cy, 5, 3, RGOLD);
    p.rect(cx - 2, cy, 5, 1, mix(RGOLD, P.goldL, 0.35)); // rim still catches light
    p.px(cx + 1, cy + 2, darken(RGOLDD, 0.2));   // tarnish bloom
    p.px(cx - 3, cy, RGOLDD); p.px(cx + 3, cy, RGOLDD);  // handles
    p.rect(cx - 1, cy + 3, 3, 1, RGOLDD);        // stem
    p.rect(cx - 2, cy + 4, 5, 1, RGOLDD);        // foot
  };
  cup(7, 5);
  cup(16, 5);
  // medals — bronze gone green-grey at the edges
  const medal = (mx, my) => {
    p.circle(mx, my, 1, mix(P.bronze, P.gray2, 0.3));
    p.px(mx, my - 1, lighten(P.bronze, 0.2));
    p.px(mx - 1, my, mix(P.bronze, P.moss, 0.4)); // verdigris edge
  };
  medal(12, 7);
  // bottom shelf: one cup TOPPLED on its side, medals scattered
  p.rect(5, 16, 3, 3, RGOLD);                    // bowl, mouth facing left
  p.vline(16, 18, 4, mix(RGOLD, P.goldL, 0.3));  // rim edge catching light
  p.rect(8, 17, 2, 1, RGOLDD);                   // stem
  p.vline(16, 18, 10, RGOLDD);                   // foot disc
  p.px(6, 19, darken(RGOLDD, 0.2));              // shadow under the fallen cup
  medal(14, 16); medal(17, 16);
  // ash-dust drifts along the shelf lips
  p.speckle(4, 10, 16, 2, withAlpha(ASH, 0.55), 6, 9);
  p.speckle(4, 19, 16, 2, withAlpha(ASH, 0.5), 5, 27);
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.sparkle(7, 4, withAlpha(P.glint, 0.8), 1);   // one cup still catches the light
}, { anchor: [12, 21] });

// 13) rint_bookshelf — listing bookshelf: ash-dusted spines with gaps where
//     books were taken, flat toppled stacks below, one glowing rune tome.
defineSprite('rint_bookshelf', 18, 24, (p) => {
  // case — listing slightly: top trim sits a pixel off-true
  p.rect(0, 1, 18, 23, RWOODD);
  p.gradV(2, 2, 14, 21, darken(RWOOD, 0.08), darken(RWOOD, 0.22));
  p.hline(1, 17, 1, RWOODL);                     // top trim (shifted — the lean)
  p.px(0, 2, RWOODL);                            // left corner dropped a pixel
  p.vline(2, 22, 1, lighten(RWOOD, 0.08));
  p.vline(2, 22, 16, darken(RWOODD, 0.15));
  // shelf boards (board + bright lip)
  for (const sy of [8, 15, 22]) {
    p.hline(1, 16, sy, RWOOD);
    p.hline(1, 16, sy - 1, RWOODL);
  }
  // sagging middle shelf — dips a pixel mid-span
  p.px(8, 15, darken(RWOODD, 0.2)); p.px(8, 16, RWOOD); p.px(9, 16, RWOOD);
  // dusty book-spine helper (3 tones, ash-dimmed dye)
  const book = (x, y, h, col, tilt) => {
    const c = mix(col, P.gray2, 0.3);
    if (tilt) {
      p.line(x, y + h - 1, x + 1, y, c);         // a leaning book
      p.line(x + 1, y + h - 1, x + 2, y, darken(c, 0.18));
      p.px(x + 1, y, lighten(c, 0.3));
    } else {
      p.rect(x, y, 2, h, c);
      p.vline(y, y + h - 1, x, lighten(c, 0.18)); // lit left edge
      p.vline(y, y + h - 1, x + 1, darken(c, 0.2));
      p.px(x, y, lighten(c, 0.3));               // top glint
    }
  };
  // top shelf — gaps where books were borrowed (survivors still read)
  book(3, 2, 6, P.red, false);
  book(5, 3, 5, P.gold, true);
  book(12, 2, 6, P.purple, false);
  book(14, 2, 6, P.blue, false);
  // middle shelf — the glowing RUNE TOME among the dust
  book(3, 9, 6, P.blue, false);
  book(5, 9, 6, P.green, false);
  p.glow(9, 11, 3, P.shard, 0.4, 3);
  book(8, 9, 6, P.shardD, false);                // the rune tome
  p.px(8, 11, P.shardL);                         // rune sigil on the spine
  p.px(8, 12, P.shard);
  book(12, 10, 5, P.red, true);
  book(15, 9, 6, mix(P.gold, P.gray2, 0.2), false);
  // bottom shelf — mostly toppled flat stacks
  p.rect(3, 19, 5, 2, mix(P.green, P.gray2, 0.35));
  p.rect(4, 17, 4, 2, mix(P.red, P.gray2, 0.35));
  p.px(4, 17, lighten(mix(P.red, P.gray2, 0.35), 0.2));
  book(11, 16, 6, P.purple, false);
  book(13, 17, 5, P.blue, true);
  // ash dust along the case top + shelf lips
  p.speckle(2, 1, 14, 2, withAlpha(ASH, 0.55), 6, 11);
  p.speckle(3, 7, 13, 1, withAlpha(ASH, 0.5), 4, 23);
  p.speckle(3, 14, 13, 1, withAlpha(ASH, 0.5), 4, 37);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
  p.star4(9, 10, 2, withAlpha(P.shardL, 0.9), P.white); // kira off the tome
}, { anchor: [9, 23] });

// 14) rint_rug — faded oval rug (top-down): frayed fringe, threadbare patch,
//     and a charred burn mark eating into one side. Dark-tinted outline like
//     the original (a flat prop, not P.ink).
defineSprite('rint_rug', 24, 14, (p) => {
  const oD = mix(P.redD, P.gray2, 0.35);         // faded outer band
  const oM = mix(P.red, P.gray2, 0.40);          // faded mid red
  p.ellipse(12, 7, 11.5, 6.5, oD);
  // fringe ticks — FRAYED: irregular gaps along the long edges
  for (let i = 2; i < 22; i += 3) {
    if (i !== 8 && i !== 17) { p.px(i, 0, oD); p.px(i + 1, 0, darken(oD, 0.2)); }
    if (i !== 5 && i !== 14) { p.px(i, 13, oD); p.px(i + 1, 13, darken(oD, 0.2)); }
  }
  p.px(8, 0, darken(oD, 0.35));                  // torn fringe root
  // mid band with a soft lift toward the lit top-left
  p.ellipse(12, 7, 9.5, 5.2, oM);
  p.ellipse(10, 5, 6, 3.2, lighten(oM, 0.06));
  // tarnished gold trim ring
  p.ellipse(12, 7, 7.6, 4.1, RGOLD);
  p.ellipse(12, 7, 6.4, 3.3, oD);
  // inner field + dust-dimmed medallion
  p.ellipse(12, 7, 5, 2.6, oM);
  p.ellipse(12, 7, 2.6, 1.5, mix(P.bone, P.gray3, 0.3));
  p.ellipse(12, 7, 1.2, 0.8, RGOLD);
  p.px(12, 7, mix(P.goldL, P.gray3, 0.3));
  // woven motif, half worn away
  p.px(7, 7, RGOLD); p.px(17, 7, RGOLD);
  p.px(12, 4, RGOLD);
  p.px(9, 5, mix(RGOLD, P.gray3, 0.4)); p.px(15, 9, mix(RGOLD, P.gray3, 0.4));
  // BURN MARK — a scorch with a singed ember-touched ring
  const char = mix(P.ink2, P.gray1, 0.3);
  p.ellipse(18, 9, 2.6, 1.8, char);
  p.ellipse(18, 9, 1.6, 1, darken(char, 0.3));   // charred heart
  p.px(16, 8, mix(char, P.ember, 0.35)); p.px(20, 10, mix(char, P.ember, 0.3));
  p.px(19, 7, mix(oM, char, 0.5));               // singe bleeding outward
  // threadbare patch worn to the backing
  p.ellipse(7, 9, 2, 1.2, mix(oM, P.gray2, 0.5));
  p.outline(darken(oD, 0.25));
  // faint sheen as if catching the doorway light
  p.ellipse(9, 4, 3, 1.4, withAlpha(P.rim, 0.10));
}, { anchor: [12, 13] });

// 15) rint_crate — supply crate: pried top plank with a bent nail, rust-bitten
//     brackets, and a half-flaked soul-shard supply stencil.
defineSprite('rint_crate', 16, 16, (p) => {
  p.softShadow(8, 15, 6, 1.4, 0.3);
  // box body (greyed wood gradient)
  p.gradV(2, 3, 12, 12, RWOOD, RWOODD);
  p.rect(2, 3, 12, 1, RWOODL);
  // plank seams
  p.hline(2, 13, 7, darken(RWOOD, 0.22));
  p.hline(2, 13, 11, darken(RWOOD, 0.22));
  p.vline(4, 14, 7, darken(RWOOD, 0.18));
  // PRIED top plank — lifted at one end, nail pulled and bent
  p.rect(3, 2, 7, 1, mix(RWOOD, P.gray3, 0.2));  // the lifted plank
  p.px(9, 3, darken(RWOODD, 0.4));               // dark gap beneath
  p.px(10, 2, RIRON);                            // bent nail
  p.px(3, 2, lighten(RWOOD, 0.2));               // plank end catches light
  // corner brackets — two gone to rust
  const rust = mix(P.iron, P.clay, 0.35);
  p.rect(2, 3, 2, 2, rust); p.rect(12, 3, 2, 2, P.iron);
  p.rect(2, 13, 2, 2, P.iron); p.rect(12, 13, 2, 2, rust);
  p.px(12, 3, P.steelL);                         // surviving bracket glint
  // stencil mark — painted soul-shard supply glyph, lower half flaked off
  p.px(8, 8, P.shardD); p.px(7, 9, P.shardD); p.px(9, 9, P.shardD);
  p.px(8, 9, mix(P.shard, P.gray2, 0.3));
  p.px(8, 10, withAlpha(P.shardD, 0.6));         // flaking
  p.hline(6, 10, 12, withAlpha(P.shardD, 0.4));  // faded stencil baseline
  // ash dusting on the lid
  p.speckle(3, 3, 10, 2, withAlpha(ASH, 0.5), 4, 19);
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.sparkle(4, 5, withAlpha(P.glint, 0.7), 1);
}, { anchor: [8, 15] });

// 16) rint_barrel — barrel with dried water-stain tide rings; the lower iron
//     hoop snapped and was replaced with a knotted rope band.
defineSprite('rint_barrel', 12, 14, (p) => {
  p.softShadow(6, 13, 5, 1.3, 0.3);
  // bulged body
  p.rect(2, 2, 8, 11, RWOODD);
  p.rect(1, 4, 10, 7, RWOODD);
  p.gradV(2, 3, 8, 9, lighten(RWOOD, 0.06), darken(RWOOD, 0.12));
  p.gradV(1, 5, 10, 5, lighten(RWOOD, 0.04), darken(RWOOD, 0.1));
  // stave seams + curved-side shading
  p.vline(3, 12, 4, darken(RWOODD, 0.1));
  p.vline(3, 12, 7, darken(RWOODD, 0.1));
  p.vline(3, 12, 9, darken(RWOODD, 0.1));
  p.vline(2, 4, 8, lighten(RWOOD, 0.12));        // lit left stave edge
  p.vline(4, 11, 1, darken(RWOODD, 0.18));
  p.vline(4, 11, 10, darken(RWOODD, 0.18));
  // WATER-STAIN rings — tide marks where rain pooled and dried
  p.hline(1, 10, 7, withAlpha(mix(RWOODD, P.ink2, 0.4), 0.7));
  p.hline(2, 9, 8, withAlpha(mix(RWOODD, P.ink2, 0.3), 0.5));
  // top hoop (rust-touched iron, kept) ...
  p.hline(1, 10, 4, mix(P.iron, P.clay, 0.3));
  p.hline(1, 10, 5, darken(P.iron, 0.25));
  p.px(2, 4, lighten(P.iron, 0.25));
  // ... and a ROPE band where the lower hoop snapped
  const rope = mix(P.sand, P.woodD, 0.35);
  p.hline(1, 10, 10, rope);
  p.hline(1, 10, 11, darken(rope, 0.25));
  p.px(3, 10, lighten(rope, 0.18)); p.px(7, 10, darken(rope, 0.15)); // twist knuckles
  p.px(9, 11, rope); p.px(9, 12, darken(rope, 0.2));                 // knot tail
  // top rim + warped lid
  p.ellipse(6, 2, 5, 1.6, RWOODL);
  p.ellipse(6, 2, 3.6, 1, RWOOD);
  p.px(4, 1, lighten(RWOODL, 0.2));              // lid sheen
  p.px(8, 2, darken(RWOOD, 0.25));               // warp split in the lid
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [6, 13] });

// 17) rint_mannequin — dress-form mannequin: cracked torso, a half-finished
//     soul-dyed garment pinned over one shoulder (work goes on).
defineSprite('rint_mannequin', 12, 22, (p) => {
  p.softShadow(6, 21, 4.5, 1.4, 0.3);
  // round base + pole (greyed turned wood)
  p.ellipse(6, 20, 4, 1.6, RWOODD);
  p.ellipse(6, 19, 3, 1.2, RWOOD);
  p.vline(13, 19, 6, RWOODD);
  p.vline(13, 19, 5, darken(RWOOD, 0.15));
  // torso — CRACKED down one side
  p.rect(4, 11, 5, 3, mix(P.gray3, P.gray2, 0.5));      // waist
  p.gradV(3, 6, 7, 6, mix(P.bone, P.gray3, 0.22), darken(mix(P.bone, P.gray3, 0.25), 0.1));
  p.rect(3, 6, 7, 1, lighten(P.bone, 0.15));            // top highlight
  p.vline(6, 13, 4, darken(P.bone, 0.25));              // left shade edge
  p.line(7, 7, 8, 11, mix(P.ink2, P.gray2, 0.4));       // the torso crack
  p.px(8, 9, mix(P.ink2, P.gray2, 0.55));               // crack widens
  p.px(7, 8, lighten(P.bone, 0.2));                     // crack lip catch
  // neck knob (faceless)
  p.rect(5, 3, 3, 3, mix(P.gray3, P.gray2, 0.4));
  p.px(6, 3, P.gray4);
  // pinned HALF-FINISHED garment over one shoulder
  const cloth = mix(P.shardD, P.gray2, 0.3);            // soul-dyed work cloth
  p.rect(8, 6, 3, 5, cloth);                            // only reaches mid-torso
  p.vline(6, 10, 10, darken(cloth, 0.2));
  p.px(8, 6, lighten(cloth, 0.25));
  p.px(8, 11, darken(cloth, 0.15));                     // raw unhemmed edge
  p.px(9, 11, withAlpha(darken(cloth, 0.15), 0.6));     // loose thread
  // pins — bright steel points holding the cloth in place
  p.px(8, 7, P.steelL); p.px(10, 9, P.steelL);
  p.px(9, 6, P.glint);                                  // pin head catches light
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  p.sparkle(2, 7, withAlpha(P.shardL, 0.6), 1);         // ambient soul kira
}, { anchor: [6, 21] });

// 18) rint_pillar — interior pillar: chipped flutes with raw bright break
//     faces, soul-teal moss climbing from the base.
defineSprite('rint_pillar', 12, 28, (p) => {
  p.softShadow(6, 27, 5, 1.3, 0.28);
  // square base
  p.rect(1, 24, 10, 4, mix(P.gray2, P.ink2, 0.15));
  p.rect(1, 24, 10, 1, mix(P.gray3, P.gray2, 0.5));
  p.rect(2, 23, 8, 1, mix(P.gray3, P.gray2, 0.5));
  // shaft — dusty marble, left-lit
  p.gradH(2, 4, 8, 20, mix(P.gray3, P.gray4, 0.25), mix(P.gray2, P.ink2, 0.12));
  // fluting — grooves broken by missing chunks
  p.vline(4, 23, 3, mix(P.gray4, P.gray3, 0.4));
  p.vline(4, 23, 6, P.gray3);
  p.vline(4, 23, 8, P.gray3);
  p.vline(4, 23, 4, mix(P.gray2, P.ink2, 0.1));
  p.vline(4, 23, 7, mix(P.gray2, P.ink2, 0.1));
  // chip wounds across the flutes
  p.rect(5, 9, 3, 2, darken(P.gray2, 0.2));
  p.px(5, 9, darken(P.gray2, 0.35)); p.px(7, 10, P.gray4); // raw bright break face
  p.rect(3, 16, 2, 2, darken(P.gray2, 0.22));
  p.px(4, 16, P.gray4);
  p.px(9, 6, darken(P.gray2, 0.3));
  // capital
  p.rect(1, 1, 10, 3, mix(P.gray3, P.gray2, 0.5));
  p.rect(1, 1, 10, 1, mix(P.gray4, P.gray3, 0.4));
  p.rect(2, 0, 8, 1, mix(P.gray4, P.gray3, 0.4));
  p.hline(2, 9, 4, mix(P.gray2, P.ink2, 0.1));
  p.px(10, 1, darken(P.gray2, 0.3));             // chipped capital corner
  // soul-teal moss climbing from the base
  const moss = mix(P.gray2, P.shardD, 0.55);
  p.px(2, 23, moss); p.px(3, 22, moss); p.px(2, 21, mix(P.gray2, P.shardD, 0.4));
  p.px(3, 20, mix(P.gray2, P.shardD, 0.45)); p.px(2, 18, mix(P.gray2, P.shardD, 0.3));
  p.px(9, 22, moss); p.px(9, 21, mix(P.gray2, P.shardD, 0.35));
  p.px(3, 24, lighten(moss, 0.15));              // moss catches the rift-light
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
  p.sparkle(3, 21, withAlpha(P.shardL, 0.55), 1); // faint soul-mote in the moss
}, { anchor: [6, 27] });

// 19) rint_banner_gold — gold-trim banner: smoke-stained cloth, a faded star
//     crest with one last glimmer, the lower edge torn ragged.
defineSprite('rint_banner_gold', 12, 24, (p) => {
  // top rod
  p.hline(1, 10, 1, RWOODD);
  p.hline(1, 10, 0, RWOODL);
  p.px(0, 1, RWOODD); p.px(11, 1, RWOODD);
  // cloth — faded gold, smoke-stained
  p.gradV(2, 2, 8, 15, RGOLD, RGOLDD);
  p.rect(2, 2, 8, 1, mix(RGOLD, P.goldL, 0.3));  // top seam highlight
  p.vline(2, 16, 2, lighten(RGOLD, 0.1));        // left border light
  p.vline(2, 16, 9, darken(RGOLDD, 0.2));        // right shade
  p.speckle(3, 3, 6, 13, withAlpha(mix(RGOLDD, P.ink2, 0.4), 0.5), 6, 15); // smoke stains
  // faded crest — the old star emblem, barely there
  p.glow(6, 8, 3, P.holyL, 0.12, 2);
  p.px(6, 6, mix(P.white, RGOLD, 0.45));
  p.hline(4, 8, 7, mix(P.white, RGOLD, 0.5));
  p.px(5, 8, mix(P.white, RGOLD, 0.55)); p.px(7, 8, mix(P.white, RGOLD, 0.55));
  p.px(6, 7, mix(P.holyL, RGOLD, 0.5));          // crest core, dim warmth
  // TORN lower edge — one fork ripped short, threads hanging between
  p.hline(2, 9, 17, RGOLDD);
  p.line(2, 17, 3, 20, RGOLDD);                  // left tail, shortened + ragged
  p.px(3, 21, darken(RGOLDD, 0.2));
  p.line(9, 17, 7, 22, RGOLDD);                  // right tail survives longer
  p.px(8, 20, RGOLD);                            // tail tip catches light
  p.px(7, 22, darken(RGOLDD, 0.25));
  p.px(5, 18, RGOLDD); p.px(5, 19, withAlpha(RGOLDD, 0.6)); // hanging thread
  p.px(4, 18, withAlpha(RGOLDD, 0.5));           // fray wisp
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  p.sparkle(6, 6, withAlpha(P.holyL, 0.6), 1);   // last glimmer of the crest
}, { anchor: [6, 23] });

// 20) rint_plant — potted plant: leaves half-dried to sand-bleached husks, but
//     ONE fresh green sprout pushes through with a dew glint (hope motif).
defineSprite('rint_plant', 12, 18, (p) => {
  p.softShadow(6, 17, 5, 1.2, 0.28);
  // pot — chipped, hairline-cracked terracotta
  p.gradV(2, 12, 8, 5, mix(P.bronze, P.gray2, 0.25), darken(mix(P.bronze, P.gray2, 0.3), 0.12));
  p.rect(1, 11, 10, 2, mix(lighten(P.bronze, 0.15), P.gray2, 0.25)); // lip
  p.px(9, 11, darken(P.bronze, 0.3));            // chipped lip
  p.px(3, 14, darken(P.bronze, 0.3));            // hairline crack
  p.px(3, 15, withAlpha(darken(P.bronze, 0.3), 0.7));
  p.shadeBottom(0.15);
  // dry soil
  p.hline(3, 8, 11, darken(RWOODD, 0.2));
  // half-dried foliage — limp, sand-bleached leaves
  const dry = mix(P.leafD, P.sandD, 0.55);
  const dry2 = mix(P.leaf, P.sandD, 0.5);
  p.ellipse(3, 9, 2, 3.5, dry);                  // drooping left leaf
  p.line(3, 11, 4, 7, darken(dry, 0.2));
  p.ellipse(9, 9, 2, 3.5, dry2);                 // curling right leaf
  p.line(9, 11, 8, 7, darken(dry2, 0.2));
  p.px(9, 6, darken(dry2, 0.25));                // crisped tip
  p.ellipse(6, 7, 1.6, 4, mix(dry, dry2, 0.5));  // centre stalk, browning
  p.px(6, 3, darken(dry, 0.15));
  // ...but ONE fresh green sprout pushes through
  p.vline(3, 6, 5, P.leaf);                      // young stem
  p.px(4, 2, P.leafL); p.px(6, 2, P.leafL);      // twin seed leaves
  p.px(4, 3, P.leaf); p.px(6, 3, P.leaf);
  p.px(5, 1, lighten(P.leafL, 0.15));            // fresh tip
  p.px(5, 2, P.glint);                            // dew glint — life persists
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.sparkle(8, 4, withAlpha(P.auroraL, 0.5), 1); // tiny hopeful kira
}, { anchor: [6, 17] });

// 21) rint_chest2 — small keepsake chest: drag-scuffed planks, dented lid,
//     tarnished fittings, and a faint SOUL glint humming at the keyhole.
defineSprite('rint_chest2', 14, 12, (p) => {
  p.softShadow(7, 11, 6, 1.1, 0.3);
  // body — scuffed planks
  p.rect(1, 6, 12, 5, RWOODD);
  p.gradV(2, 7, 10, 3, RWOOD, darken(RWOOD, 0.15));
  p.hline(2, 11, 7, RWOODL);
  p.hline(4, 8, 9, darken(RWOODD, 0.25));        // drag-scuff gouge
  p.px(3, 8, lighten(RWOOD, 0.12));              // scuff lip
  // rounded lid — layered dome, one dent
  p.ellipse(7, 6, 6, 3, RWOODD);
  p.ellipse(7, 6, 5, 2.4, RWOOD);
  p.ellipse(7, 5, 4, 1.6, RWOODL);
  p.hline(1, 12, 6, darken(RWOODD, 0.2));        // lid band
  p.px(10, 4, darken(RWOODD, 0.3));              // dent in the lid
  // tarnished corner fittings
  p.rect(1, 5, 2, 2, RGOLD); p.px(1, 5, mix(RGOLD, P.goldL, 0.3));
  p.rect(11, 5, 2, 2, RGOLD); p.px(12, 6, RGOLDD);
  p.rect(1, 9, 2, 2, RGOLDD);
  p.rect(11, 9, 2, 2, RGOLDD);
  // lock plate + the keyhole's faint SOUL glint (something inside still hums)
  p.rect(6, 6, 2, 3, RGOLDD);
  p.px(6, 6, RGOLD);
  p.glow(7, 7, 2, P.shard, 0.35, 2);
  p.px(7, 7, P.shardL);                          // keyhole glint
  p.px(7, 8, withAlpha(P.shard, 0.7));           // light seeping below
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
  p.sparkle(7, 6, withAlpha(P.shardL, 0.8), 1);
}, { anchor: [7, 11] });

// 22) rint_lamp2 — standing lamp: pole kinked at mid-height so the sooty shade
//     leans a pixel off-axis; still burns a low, warm flicker.
defineAnim('rint_lamp2', 8, 20, 2, (p, f) => {
  // weak pool of warm light on the floor (the lamp burns low)
  p.softShadow(4, 19, 4, 1.4, 0.26);
  p.ellipse(4, 18, f ? 3.6 : 3, f ? 1.5 : 1.2, withAlpha(P.emberL, f ? 0.18 : 0.1));
  // base
  p.ellipse(4, 18, 3, 1.2, mix(P.gray2, P.ink2, 0.2));
  p.ellipse(4, 17, 2.4, 0.9, mix(P.gray2, P.gray3, 0.35));
  p.rect(3, 17, 2, 2, mix(P.gray2, P.ink2, 0.2));
  // BENT pole — straight below, kinked right above the dent
  const pole = mix(P.gray2, P.ink2, 0.12);
  p.vline(11, 17, 4, pole);
  p.vline(11, 16, 3, withAlpha(lighten(P.gray2, 0.2), 0.7)); // lit edge (lower run)
  p.px(4, 10, pole); p.px(5, 10, darken(pole, 0.2));         // the kink (dented joint)
  p.vline(6, 9, 5, pole);                                     // upper run, leaning
  p.px(5, 6, lighten(P.gray2, 0.2));
  // shade — warm but soot-darkened down one panel, sitting off-axis
  p.gradV(3, 1, 5, 5, f ? lighten(P.emberL, 0.18) : mix(P.emberL, P.gray3, 0.12), mix(P.ember, P.gray2, 0.15));
  p.rect(4, 5, 3, 1, RGOLD);                     // dulled gilt ring
  p.vline(1, 4, 7, mix(P.ember, P.ink2, 0.45));  // sooty right panel
  p.px(3, 1, f ? P.rim : lighten(P.emberL, 0.08));
  // bright core
  p.px(5, 3, f ? P.glint : P.emberL);
  p.px(5, 2, f ? lighten(P.emberL, 0.2) : P.ember);
  // outline the solid lamp BEFORE the soft glow so the halo stays haloed
  p.outline(P.ink);
  // soft glow halo on top — no outline (varies by frame)
  p.glow(5, 3, f ? 3.6 : 2.8, P.emberL, f ? 0.3 : 0.16, 3);
  p.ellipse(5, 4, f ? 1.8 : 1.4, f ? 2.2 : 1.8, withAlpha(P.white, f ? 0.24 : 0.12));
  if (f) p.star4(5, 3, 2, withAlpha(P.glint, 0.55), P.glint); // kira when fully lit
}, { anchor: [4, 19], fps: 2 });
