import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════════
//  CHURCH / TEMPLE set — goddess shrine, pew, stained glass, candelabra, archway.
//  Upgraded for "魂晶獵手" holy-anime ambience:
//    • divine warm light (P.holy / P.holyL) haloing the goddess + shard
//    • stained-glass GLOW via gradients + p.glow, leaded jewel panes
//    • candle flicker with layered ember cores + drifting sparks
//    • soft ground shadows (p.softShadow), top-left light source, rim light
//    • ornate but readable: silhouette-first, selective P.ink outline, 3–4 tones
//  Contracts preserved: all define* names / dims / anchors / fps unchanged.
// ════════════════════════════════════════════════════════════════════════════

// 1) Goddess statue — tall, serene, on a stepped stone plinth, cupping a floating shard.
defineSprite('town_goddess', 20, 34, (p) => {
  // divine light: a soft holy column pouring down from above the head
  p.glow(10, 6, 9, P.holy, 0.30, 5);                   // wide halo bloom
  p.gradV(8, 0, 4, 14, withAlpha(P.holyL, 0.16), withAlpha(P.holy, 0.0)); // light shaft
  // ground contact shadow under the plinth
  p.softShadow(10, 33, 9, 2.4, 0.42);

  // stepped stone plinth (three tiers, widest at the base) — top-left lit
  p.rect(2, 31, 16, 3, P.gray1);                        // base step
  p.gradH(2, 31, 16, 1, P.gray3, P.gray2);             // base top edge highlight
  p.rect(4, 28, 12, 3, P.gray1);                        // mid step
  p.gradH(4, 28, 12, 1, P.gray3, P.gray2);
  p.rect(6, 25, 8, 3, P.gray1);                         // top step / pedestal cap
  p.hline(6, 13, 25, P.gray3);
  p.hline(2, 4, 33, darken(P.gray1, 0.2));             // base front shade
  // faint engraved seam glints on the plinth (deterministic)
  p.speckle(3, 29, 14, 4, withAlpha(P.gray3, 0.5), 5, 21);

  // flowing carved robe — base back layer (dark), widening toward the hem
  p.ellipse(10, 23, 5, 3, P.gray1);                     // robe hem flare
  for (let y = 8; y < 25; y++) {
    const w = 2 + (y - 8) * 0.32;                       // robe widens downward
    p.hline(Math.round(10 - w), Math.round(10 + w), y, P.gray2);
  }
  // robe fold shadows (carved vertical creases)
  p.vline(11, 24, 7, darken(P.gray2, 0.22));
  p.vline(13, 24, 13, darken(P.gray2, 0.22));
  p.vline(10, 24, 10, darken(P.gray2, 0.16));
  // pale stone top highlights down the left of the robe (lit side)
  p.vline(9, 24, 6, P.gray3);
  p.vline(9, 23, 8, mix(P.gray3, P.white, 0.32));
  p.vline(8, 20, 8, withAlpha(mix(P.gray3, P.white, 0.5), 0.6)); // sheen crease
  // warm holy wash where the divine light touches the robe
  p.vline(9, 22, 7, withAlpha(P.holy, 0.18));

  // shoulders / chest
  p.rect(6, 11, 8, 3, P.gray2);
  p.hline(6, 13, 11, mix(P.gray3, P.white, 0.3));      // shoulder top light

  // gently lowered arms cupping the shard (forearms angled inward)
  p.line(6, 13, 8, 18, P.gray2); p.line(7, 13, 9, 18, P.gray3);   // left arm + edge light
  p.line(13, 13, 11, 18, P.gray2); p.line(12, 13, 10, 18, darken(P.gray2, 0.18)); // right arm (shadow side)
  p.hline(8, 11, 18, P.gray3);                          // cupped hands ledge

  // ornate gold halo ring behind the head — layered glow + crisp ring
  p.glow(10, 6, 6, P.gold, 0.22, 4);
  p.ring(10, 6, 5, withAlpha(P.gold, 0.55));
  p.ring(10, 6, 4, P.gold);
  p.px(6, 6, P.holyL); p.px(14, 6, P.holyL);           // halo end glints

  // head — serene face, pale stone (lit top-left)
  p.ellipse(10, 6, 3, 3.4, P.gray3);                    // head base
  p.ellipse(10, 5, 2.4, 2.8, mix(P.gray3, P.white, 0.4)); // lit face
  p.hline(8, 11, 3, mix(P.gray3, P.white, 0.55));       // brow/hair light
  p.px(8, 6, P.gray2); p.px(11, 6, P.gray2);            // gentle eyes
  p.px(8, 5, withAlpha(P.white, 0.7));                  // catch-light glint (left eye)
  p.px(9, 8, darken(P.gray3, 0.18)); p.px(10, 8, darken(P.gray3, 0.18)); // soft mouth
  p.px(8, 7, withAlpha(P.sakura, 0.35)); p.px(11, 7, withAlpha(P.sakura, 0.35)); // faint blush

  // floating shard cupped in the hands, with a layered divine glow
  p.glow(10, 17, 4, P.shard, 0.30, 4);                  // teal aura
  p.ellipse(10, 17, 3, 3, withAlpha(P.shard, 0.26));    // inner glow (no outline on this)

  p.rimLight(P.rim, 0.5);                               // brighten light-facing stone edges
  p.outline(P.ink);

  // shard crystal drawn AFTER outline so its glow/edges stay crisp
  p.px(10, 14, P.shardL);
  p.line(8, 17, 10, 14, P.shardD); p.line(12, 17, 10, 14, P.shard);  // crystal sides
  p.line(8, 17, 10, 20, P.shardD); p.line(12, 17, 10, 20, P.shard);
  p.vline(15, 19, 10, P.shardL);                        // bright core seam
  p.px(11, 16, P.white);                                // glint
  p.star4(10, 14, 2, withAlpha(P.shardL, 0.9), P.white); // kira sparkle atop the shard
  p.sparkle(13, 16, withAlpha(P.holyL, 0.8), 1);        // drifting holy spark
}, { anchor: [10, 33] });

// 2) Church pew — a simple worn wooden bench, polished with a warm sheen.
defineSprite('town_pew', 18, 12, (p) => {
  p.softShadow(9, 11, 8, 1.6, 0.34);                    // ground contact

  // backrest — gradient gives carved depth
  p.gradV(2, 1, 14, 3, P.wood, P.woodD);
  p.hline(2, 15, 1, P.woodL);                           // top light edge
  p.hline(3, 14, 2, mix(P.wood, P.woodL, 0.4));         // mid sheen
  // seat plank
  p.rect(1, 6, 16, 3, P.wood);
  p.hline(1, 16, 6, P.woodL);                           // front-edge highlight of seat
  p.hline(2, 15, 8, P.woodD);                           // underside shadow
  // worn grain streaks on the seat (subtle, top-left lit)
  p.hline(4, 8, 7, withAlpha(P.woodD, 0.5));
  p.hline(10, 13, 7, withAlpha(P.woodL, 0.5));
  p.speckle(2, 6, 14, 3, withAlpha(P.woodL, 0.35), 4, 33); // faint grain flecks
  // back support posts connecting backrest to seat
  p.vline(4, 6, 3, P.woodD); p.vline(4, 6, 14, P.woodD);
  // legs
  p.rect(2, 9, 2, 3, P.woodD); p.rect(14, 9, 2, 3, P.woodD);
  p.vline(9, 11, 2, P.wood); p.vline(9, 11, 14, P.wood); // leg front light
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
}, { anchor: [9, 11] });

// 3) Stained-glass window — arched, leaded jewel-tone panes in a stone frame, glowing.
defineSprite('town_stained', 14, 20, (p) => {
  // outer holy bloom — the window radiates coloured light
  p.glow(7, 11, 8, P.holy, 0.16, 4);

  // stone frame (arched top + straight sides + sill)
  p.rect(1, 6, 12, 13, P.gray2);                        // body block
  p.ellipse(7, 6, 6, 5, P.gray2);                        // arched top fill
  p.rect(2, 7, 10, 11, P.ink2);                          // inner recess (glass backing / lead field)
  p.ellipse(7, 7, 5, 4, P.ink2);
  // stone highlights on the frame (top-left lit)
  p.hline(2, 11, 18, P.gray3);                           // sill light
  p.vline(2, 7, 18, mix(P.gray3, P.white, 0.2));        // left frame light
  p.vline(11, 7, 18, darken(P.gray2, 0.2));             // right frame shade
  p.ring(7, 6, 6, P.gray1);                              // arch outer shade
  p.hline(3, 10, 1, mix(P.gray3, P.white, 0.4));        // arch crown light

  // leaded jewel panes (luminous), separated by dark lead lines.
  // upper rose pane in the arch — radiant gold heart with an ember glow.
  p.glow(7, 6, 3, P.gold, 0.4, 3);
  p.ellipse(7, 6, 3, 2.6, P.gold);
  p.ellipse(7, 6, 2, 1.6, lighten(P.gold, 0.25));
  p.px(7, 5, P.emberL);
  p.px(6, 5, withAlpha(P.white, 0.8));                  // glass glint
  // grid of coloured panes below, each a tiny tinted gradient w/ luminous corner
  const panes = [
    [3, 9, P.blueL], [7, 9, P.redL], [10, 9, P.greenL],
    [3, 12, P.gold], [7, 12, P.blueL], [10, 12, P.redL],
    [3, 15, P.greenL], [7, 15, P.gold], [10, 15, P.blueL],
  ];
  for (const [x, y, c] of panes) {
    p.gradV(x, y, 2, 2, lighten(c, 0.15), darken(c, 0.12)); // subtle glass depth
    p.px(x, y, lighten(c, 0.45));                        // top-left luminous glint
    p.px(x + 1, y + 1, withAlpha(tint(c, P.holyL, 0.5), 0.85)); // warm inner bloom
  }
  // dark lead lines (cames) between panes
  p.vline(8, 17, 5, P.ink2); p.vline(8, 17, 9, P.ink2);
  p.hline(2, 11, 8, P.ink2); p.hline(2, 11, 11, P.ink2); p.hline(2, 11, 14, P.ink2);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // sparkle on the brightest pane (drawn after outline to stay crisp)
  p.sparkle(7, 6, withAlpha(P.holyL, 0.9), 1);
}, { anchor: [7, 19] });

// 4) Candelabra — gold stand with three candles and flickering flames + drifting sparks.
defineAnim('town_candles', 10, 14, 3, (p, f) => {
  p.softShadow(5, 13, 4, 1, 0.32);                       // ground contact

  // ambient warm glow from the flames (grows slightly on the bright frame)
  const gstr = 0.18 + (f === 0 ? 0.05 : 0);
  p.glow(5, 2, 7, P.ember, gstr, 4);

  // gold stand: foot, central column, cross-arm (lit top-left)
  p.ellipse(5, 12, 3, 1.4, P.goldD);                     // foot
  p.ellipse(5, 12, 2, 0.8, P.gold);                      // foot top sheen
  p.rect(5, 7, 1, 5, P.goldD);                            // column
  p.vline(4, 7, 5, lighten(P.goldD, 0.28));              // column highlight (left, lit)
  p.hline(1, 8, 7, P.goldD);                              // cross arm
  p.hline(1, 8, 6, lighten(P.goldD, 0.25));              // arm top light
  // candle cups
  p.px(1, 6, P.gold); p.px(8, 6, P.gold); p.px(5, 6, P.gold);

  // three bone candles (warm-lit wax)
  const cx = [1, 5, 8];
  for (const x of cx) {
    p.rect(x, 3, 1, 3, P.bone);
    p.px(x, 3, P.white);                                  // top wax light
    p.px(x, 5, darken(P.bone, 0.18));                     // base shade
  }
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);

  // flickering flames (vary height/shape by frame) — drawn after outline to glow
  const lift = [0, -1, 1];
  cx.forEach((x, i) => {
    const fl = lift[(f + i) % 3];
    p.glow(x, 2 + fl, 2, P.ember, 0.4, 3);                // per-flame halo
    p.px(x, 2 + fl, P.ember);
    p.px(x, 1 + fl, P.emberL);
    if (f !== 1) p.px(x, Math.max(0, fl), P.white);       // bright tip on some frames
  });
  // a couple of drifting sparks that rise across frames
  p.px((f + 2) % 9, Math.max(0, 1 - f), withAlpha(P.emberL, 0.75));
  p.px(4 + (f % 2), Math.max(0, 2 - f), withAlpha(P.holyL, 0.6));
}, { anchor: [5, 13], fps: 6 });

// 5) Stone archway — a doorway frame: two pillars + rounded arch + keystone, open middle.
defineSprite('town_arch', 16, 24, (p) => {
  p.softShadow(8, 23, 8, 1.6, 0.3);                      // ground contact

  // two pillars (top-left lit faces, shaded right faces)
  p.rect(0, 6, 4, 18, P.gray1);                          // left pillar base
  p.gradH(0, 6, 2, 18, mix(P.gray3, P.white, 0.15), P.gray2); // left pillar lit face
  p.rect(12, 6, 4, 18, P.gray1);                          // right pillar base
  p.rect(14, 6, 2, 18, darken(P.gray1, 0.18));            // right pillar shade face
  // pillar capitals (slightly wider tops)
  p.rect(0, 6, 5, 2, P.gray3); p.rect(11, 6, 5, 2, P.gray3);
  p.hline(0, 4, 6, mix(P.gray3, P.white, 0.3));         // capital top light

  // rounded arch spanning the pillars (outer ring of stone)
  for (let r = 7; r >= 5; r--) {
    const c = r === 7 ? P.gray3 : (r === 6 ? P.gray2 : P.gray1);
    for (let a = Math.PI; a <= Math.PI * 2 + 0.01; a += 0.07) {
      const x = 8 + Math.cos(a) * r;
      const y = 7 + Math.sin(a) * r;
      if (y <= 7) p.px(Math.round(x), Math.round(y), c);  // upper half only
    }
  }
  // square off the arch shoulders into the capitals
  p.rect(2, 4, 12, 3, P.gray1);
  p.gradH(2, 4, 12, 1, mix(P.gray3, P.white, 0.3), P.gray2); // arch top light edge
  // carve the open archway middle (transparent hole)
  // — done by NOT drawing inside; ensure inner faces are shaded
  p.vline(8, 22, 4, darken(P.gray1, 0.2));                // left inner reveal
  p.vline(8, 22, 11, darken(P.gray1, 0.25));              // right inner reveal
  // a soft holy glow spilling through the doorway opening
  p.gradV(5, 12, 6, 11, withAlpha(P.holy, 0.0), withAlpha(P.holy, 0.14));

  // keystone at the crown
  p.rect(7, 2, 2, 4, P.gray3);
  p.px(7, 2, P.white); p.px(8, 2, P.white);               // keystone top light
  p.hline(6, 9, 5, P.gray2);                              // keystone base ledge
  p.px(7, 3, withAlpha(P.holy, 0.4));                     // warm touch on keystone

  // a couple of block seams for masonry feel
  p.hline(0, 4, 13, withAlpha(P.ink2, 0.6));
  p.hline(11, 15, 13, withAlpha(P.ink2, 0.6));
  p.hline(0, 4, 19, withAlpha(P.ink2, 0.6));
  p.hline(11, 15, 19, withAlpha(P.ink2, 0.6));
  // faint weathering specks (deterministic)
  p.speckle(0, 8, 4, 14, withAlpha(P.gray3, 0.35), 5, 7);
  p.speckle(12, 8, 4, 14, withAlpha(darken(P.gray1, 0.15), 0.4), 5, 11);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [8, 23] });
