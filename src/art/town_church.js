import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// 1) Goddess statue — tall, serene, on a stepped stone plinth, cupping a floating shard.
defineSprite('town_goddess', 20, 34, (p) => {
  // stepped stone plinth (three tiers, widest at the base)
  p.rect(2, 31, 16, 3, P.gray1);                       // base step
  p.rect(2, 31, 16, 1, P.gray2);                        // base top edge highlight
  p.rect(4, 28, 12, 3, P.gray1);                        // mid step
  p.rect(4, 28, 12, 1, P.gray2);
  p.rect(6, 25, 8, 3, P.gray1);                         // top step / pedestal cap
  p.rect(6, 25, 8, 1, P.gray3);

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
  // pale stone top highlights down the left of the robe
  p.vline(9, 24, 6, P.gray3);
  p.vline(9, 23, 8, mix(P.gray3, P.white, 0.3));

  // shoulders / chest
  p.rect(6, 11, 8, 3, P.gray2);
  p.hline(6, 13, 11, P.gray3);                          // shoulder top light

  // gently lowered arms cupping the shard (forearms angled inward)
  p.line(6, 13, 8, 18, P.gray2); p.line(7, 13, 9, 18, P.gray3);   // left arm + edge light
  p.line(13, 13, 11, 18, P.gray2); p.line(12, 13, 10, 18, darken(P.gray2, 0.18)); // right arm (shadow side)
  p.hline(8, 11, 18, P.gray3);                          // cupped hands ledge

  // thin gold halo ring behind the head
  p.ring(10, 6, 5, withAlpha(P.gold, 0.5));
  p.ring(10, 6, 4, P.gold);

  // head — serene face, pale stone
  p.ellipse(10, 6, 3, 3.4, P.gray3);                    // head base
  p.ellipse(10, 5, 2.4, 2.8, mix(P.gray3, P.white, 0.35)); // lit face
  p.hline(8, 11, 3, mix(P.gray3, P.white, 0.5));        // brow/hair light
  p.px(8, 6, P.gray2); p.px(11, 6, P.gray2);            // gentle eyes
  p.px(9, 8, darken(P.gray3, 0.18)); p.px(10, 8, darken(P.gray3, 0.18)); // soft mouth

  // floating shard cupped in the hands, with a glow
  p.ellipse(10, 17, 3, 3, withAlpha(P.shard, 0.28));    // outer glow (no outline on this)
  p.outline(P.ink);

  // shard crystal drawn AFTER outline so its glow/edges stay crisp
  p.px(10, 14, P.shardL);
  p.line(8, 17, 10, 14, P.shardD); p.line(12, 17, 10, 14, P.shard);  // crystal sides
  p.line(8, 17, 10, 20, P.shardD); p.line(12, 17, 10, 20, P.shard);
  p.vline(15, 19, 10, P.shardL);                        // bright core seam
  p.px(11, 16, P.white);                                // glint
}, { anchor: [10, 33] });

// 2) Church pew — a simple worn wooden bench.
defineSprite('town_pew', 18, 12, (p) => {
  // backrest
  p.rect(2, 1, 14, 3, P.woodD);
  p.rect(2, 1, 14, 1, P.woodL);                         // top light edge
  p.hline(3, 14, 2, P.wood);
  // seat plank
  p.rect(1, 6, 16, 3, P.wood);
  p.hline(1, 16, 6, P.woodL);                           // front-edge highlight of seat
  p.hline(2, 15, 8, P.woodD);                           // underside shadow
  // worn grain streaks on the seat
  p.hline(4, 8, 7, withAlpha(P.woodD, 0.5));
  p.hline(10, 13, 7, withAlpha(P.woodL, 0.5));
  // back support posts connecting backrest to seat
  p.vline(4, 6, 3, P.woodD); p.vline(4, 6, 14, P.woodD);
  // legs
  p.rect(2, 9, 2, 3, P.woodD); p.rect(14, 9, 2, 3, P.woodD);
  p.vline(9, 11, 2, P.wood); p.vline(9, 11, 14, P.wood); // leg front light
  p.outline(P.ink);
}, { anchor: [9, 11] });

// 3) Stained-glass window — arched, leaded jewel-tone panes in a stone frame.
defineSprite('town_stained', 14, 20, (p) => {
  // stone frame (arched top + straight sides + sill)
  p.rect(1, 6, 12, 13, P.gray2);                        // body block
  p.ellipse(7, 6, 6, 5, P.gray2);                        // arched top fill
  p.rect(2, 7, 10, 11, P.ink2);                          // inner recess (glass backing / lead field)
  p.ellipse(7, 7, 5, 4, P.ink2);
  // stone highlights on the frame
  p.hline(2, 11, 18, P.gray3);                           // sill light
  p.vline(7, 18, 1, P.gray3);                            // left frame light
  p.ring(7, 6, 6, P.gray1);                              // arch outer shade

  // leaded jewel panes (luminous), separated by dark lead lines
  // upper rose pane in the arch
  p.ellipse(7, 6, 3, 2.6, P.gold);
  p.px(7, 5, P.emberL);
  // grid of coloured panes below
  const panes = [
    [3, 9, P.blueL], [7, 9, P.redL], [10, 9, P.greenL],
    [3, 12, P.gold], [7, 12, P.blueL], [10, 12, P.redL],
    [3, 15, P.greenL], [7, 15, P.gold], [10, 15, P.blueL],
  ];
  for (const [x, y, c] of panes) {
    p.rect(x, y, 2, 2, c);
    p.px(x, y, lighten(c, 0.4));                          // top-left luminous glint
  }
  // dark lead lines (cames) between panes
  p.vline(8, 17, 5, P.ink2); p.vline(8, 17, 9, P.ink2);
  p.hline(2, 11, 8, P.ink2); p.hline(2, 11, 11, P.ink2); p.hline(2, 11, 14, P.ink2);
  p.outline(P.ink);
}, { anchor: [7, 19] });

// 4) Candelabra — gold stand with three candles and flickering flames.
defineAnim('town_candles', 10, 14, 3, (p, f) => {
  // gold stand: foot, central column, cross-arm
  p.ellipse(5, 12, 3, 1.4, P.goldD);                     // foot
  p.rect(5, 7, 1, 5, P.goldD);                            // column
  p.vline(7, 11, 4, lighten(P.goldD, 0.25));             // column highlight
  p.hline(1, 8, 7, P.goldD);                              // cross arm
  p.hline(1, 8, 6, lighten(P.goldD, 0.2));               // arm top light
  // candle cups
  p.px(1, 6, P.gold); p.px(8, 6, P.gold); p.px(5, 6, P.gold);

  // three bone candles
  const cx = [1, 5, 8];
  for (const x of cx) {
    p.rect(x, 3, 1, 3, P.bone);
    p.px(x, 3, P.white);                                  // top wax light
  }
  // flickering flames (vary height/shape by frame)
  const lift = [0, -1, 1];
  cx.forEach((x, i) => {
    const fl = lift[(f + i) % 3];
    p.px(x, 2 + fl, P.ember);
    p.px(x, 1 + fl, P.emberL);
    if (f !== 1) p.px(x, Math.max(0, fl), P.white);       // bright tip on some frames
  });
  p.outline(P.ink);
}, { anchor: [5, 13], fps: 6 });

// 5) Stone archway — a doorway frame: two pillars + rounded arch + keystone, open middle.
defineSprite('town_arch', 16, 24, (p) => {
  // two pillars
  p.rect(0, 6, 4, 18, P.gray1);                          // left pillar base
  p.rect(0, 6, 2, 18, P.gray2);                           // left pillar lit face
  p.rect(12, 6, 4, 18, P.gray1);                          // right pillar base
  p.rect(14, 6, 2, 18, darken(P.gray1, 0.18));            // right pillar shade face
  // pillar capitals (slightly wider tops)
  p.rect(0, 6, 5, 2, P.gray3); p.rect(11, 6, 5, 2, P.gray3);

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
  p.rect(2, 4, 12, 1, P.gray3);                           // arch top light edge
  // carve the open archway middle (transparent hole)
  // — done by NOT drawing inside; ensure inner faces are shaded
  p.vline(8, 22, 4, darken(P.gray1, 0.2));                // left inner reveal
  p.vline(8, 22, 11, darken(P.gray1, 0.25));              // right inner reveal

  // keystone at the crown
  p.rect(7, 2, 2, 4, P.gray3);
  p.px(7, 2, P.white); p.px(8, 2, P.white);               // keystone top light
  p.hline(6, 9, 5, P.gray2);                              // keystone base ledge

  // a couple of block seams for masonry feel
  p.hline(0, 4, 13, withAlpha(P.ink2, 0.6));
  p.hline(11, 15, 13, withAlpha(P.ink2, 0.6));
  p.hline(0, 4, 19, withAlpha(P.ink2, 0.6));
  p.hline(11, 15, 19, withAlpha(P.ink2, 0.6));
  p.outline(P.ink);
}, { anchor: [8, 23] });
