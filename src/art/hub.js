// Hub (camp) decoration sprites.
// ENHANCED EDITION (art_v2): a cozy anime-village glow-up of the home camp.
// Light source is top-left across every prop; each material gets core+shadow+
// light+specular glint, soft contact shadows ground them, and warm magical VFX
// (lamp glow, fire sparks, shard altar aura, painted roof shading) make the
// hub feel like a lived-in, sunlit haven. Names / dims / anchors are unchanged.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// 天賦祭壇 — a stone altar with a floating soul-shard + astral aura
defineSprite('hub_altar', 22, 28, (p) => {
  // ground contact shadow
  p.softShadow(11, 27, 9, 2.4, 0.38);

  // ── base plinth (3 stacked, top-left lit) ───────────────────────────────
  p.rect(2, 22, 18, 5, P.gray1);
  p.gradH(2, 22, 18, 4, P.gray2, P.gray1);   // left-lit stone
  p.hline(2, 19, 22, darken(P.gray1, 0.3));  // base shade line
  p.rect(4, 19, 14, 4, P.gray2);
  p.gradH(4, 19, 14, 3, P.gray3, P.gray2);
  p.hline(4, 17, 17, P.gray3);
  p.hline(4, 18, 17, mix(P.gray2, P.gray1, 0.5));
  // upright pillar
  p.rect(8, 11, 6, 9, P.gray2);
  p.gradH(8, 11, 3, 9, P.gray3, P.gray2);    // left face brighter
  p.rect(8, 11, 6, 2, P.gray3);
  // carved top slab
  p.rect(6, 9, 10, 3, P.gray3);
  p.hline(6, 15, 9, P.gray4);
  p.hline(6, 15, 10, lighten(P.gray3, 0.12));
  // runic glyph carved into pillar (faint shard-tone)
  p.px(10, 14, withAlpha(P.shard, 0.7)); p.px(11, 13, withAlpha(P.shardL, 0.8));
  p.px(11, 15, withAlpha(P.shard, 0.6)); p.px(12, 14, withAlpha(P.shard, 0.7));
  // moss speckle for a lived-in altar
  p.speckle(5, 17, 12, 3, withAlpha(P.moss, 0.6), 5, 7);

  // ── floating soul-shard + aura ──────────────────────────────────────────
  p.glow(11, 5, 6, P.shard, 0.5, 5);          // wide astral halo
  p.glow(11, 5, 3, P.shardL, 0.7, 3);
  p.aura(11, 5, 6, P.astral, 0.0, 2);         // astral ring
  // shard crystal (faceted)
  p.ellipse(11, 5, 2.6, 4.4, P.shardD);
  p.ellipse(11, 5, 1.6, 3.2, P.shard);
  p.vline(8, 5, 11, P.shardL);                // bright left facet
  p.vline(1, 8, 11, P.shardL);                // inner glow column
  p.px(10, 3, P.white);
  p.sparkle(11, 1, P.shardL, 1);
  p.star4(7, 3, 2, P.holyL, P.white);         // kira sparkle
  p.px(15, 7, P.shardL);

  p.rimLight(P.rimCool, 0.5);
  p.outline(P.ink);
}, { anchor: [11, 26] });

// 設施工坊 — an anvil + hammer with glowing embers
defineSprite('hub_forge', 24, 24, (p) => {
  p.softShadow(12, 23, 10, 2.2, 0.38);

  // ── wooden workbench ────────────────────────────────────────────────────
  p.rect(3, 18, 19, 5, P.woodD);
  p.gradV(3, 18, 19, 5, P.wood, P.woodD);
  p.rect(3, 18, 19, 1, P.woodL);              // top-lit plank edge
  // plank seams
  p.vline(18, 22, 9, darken(P.woodD, 0.25));
  p.vline(18, 22, 15, darken(P.woodD, 0.25));
  p.speckle(4, 19, 17, 3, withAlpha(P.woodD, 0.5), 6, 11);

  // ── anvil ───────────────────────────────────────────────────────────────
  p.rect(7, 11, 11, 4, P.gray2);
  p.gradV(7, 11, 11, 4, P.gray3, P.gray2);
  p.rect(6, 10, 13, 2, P.gray3);
  p.hline(6, 18, 10, P.gray4);                // lit top face
  p.rect(9, 14, 7, 4, P.gray1);              // anvil waist
  p.gradH(9, 14, 7, 4, P.gray2, P.gray1);
  p.px(7, 10, P.steelL);                      // horn glint
  p.px(8, 11, P.steelL);

  // ── glowing ember on the anvil ──────────────────────────────────────────
  p.glow(12, 10, 4, P.ember, 0.55, 4);
  p.ellipse(12, 10, 2, 1.5, P.ember);
  p.ellipse(12, 10, 1.2, 0.9, P.emberL);
  p.px(12, 9, P.white);
  // rising sparks
  p.px(13, 6, withAlpha(P.emberL, 0.9));
  p.px(11, 4, withAlpha(P.ember, 0.7));
  p.sparkle(14, 7, P.emberL, 1);

  // ── hammer leaning against the bench ────────────────────────────────────
  p.line(19, 17, 21, 8, P.wood);
  p.line(20, 17, 22, 8, P.woodD);
  p.rect(18, 5, 5, 3, P.steel);
  p.gradV(18, 5, 5, 3, P.steelL, P.steel);
  p.px(18, 5, P.steelL);
  p.px(22, 5, P.glint);

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
}, { anchor: [12, 22] });

// 營火 — animated campfire with dancing flame, sparks & glow
defineAnim('campfire', 16, 16, 3, (p, f) => {
  const fl = [0, 1, -1][f];
  const ph = f / 3;

  p.softShadow(8, 15, 6, 1.6, 0.32);
  // warm ground glow under the fire
  p.glow(8, 12, 6, P.ember, 0.28, 3);

  // ── logs (crossed, top-left lit) ────────────────────────────────────────
  p.line(3, 13, 12, 12, P.woodD);
  p.line(3, 12, 12, 11, P.wood);
  p.line(4, 13, 13, 14, P.woodD);
  p.line(4, 12, 13, 13, P.wood);
  p.px(4, 12, P.woodL); p.px(11, 11, P.woodL);   // lit log tops
  // glowing coals between logs
  p.px(7, 13, P.ember); p.px(9, 13, P.emberL); p.px(8, 14, P.ember);

  // ── layered flame ───────────────────────────────────────────────────────
  p.glow(8, 8 + fl * 0.4, 4, P.ember, 0.4, 3);
  p.ellipse(8, 9 + fl * 0.4, 3, 4, P.ember);
  p.ellipse(8, 8 + fl * 0.4, 2, 3, P.emberL);
  p.ellipse(8, 7 + fl * 0.4, 1, 1.6, P.white);
  // little secondary tongue (offsets per frame for life)
  p.px(6 + (f & 1), 9 + fl, withAlpha(P.emberL, 0.8));
  p.px(10 - (f & 1), 8, withAlpha(P.ember, 0.7));

  // ── rising sparks (animated drift) ──────────────────────────────────────
  p.px(8, 4 - fl, withAlpha(P.emberL, 0.9));
  p.px(10, 5 + fl, withAlpha(P.ember, 0.7));
  p.px(6, 6 - fl, withAlpha(P.emberL, 0.6));
  if (f === 1) p.sparkle(8, 3, P.emberL, 1);

  p.outline(P.ink);
}, { anchor: [8, 14], fps: 8 });

// 小屋 — cozy cottage with painted roof shading + lit window glow
defineSprite('hub_house', 28, 26, (p) => {
  p.softShadow(14, 25, 12, 2.4, 0.36);

  // ── timber wall (left-lit) ──────────────────────────────────────────────
  p.rect(3, 12, 22, 13, P.woodD);
  p.gradH(3, 12, 22, 13, P.wood, P.woodD);
  p.rect(4, 13, 20, 11, P.wood);
  p.gradH(4, 13, 20, 11, P.woodL, P.wood);
  // plank seams
  p.hline(4, 23, 19, darken(P.woodD, 0.2));
  p.speckle(4, 13, 20, 11, withAlpha(P.woodD, 0.35), 10, 23);

  // ── painted roof (warm reds, top-left highlight + ridge shade) ──────────
  for (let i = 0; i < 9; i++) {
    const base = i < 2 ? P.red : P.redD;
    p.hline(2 + i, 26 - i, 12 - i, base);
  }
  // sunlit upper-left slope
  for (let i = 0; i < 4; i++) p.px(3 + i, 12 - i + 1, P.redL);
  p.hline(2, 8, 11, mix(P.red, P.redL, 0.4));
  // shaded lower eave + roof ridge line
  p.hline(1, 27, 12, P.redD);
  p.hline(1, 27, 13, darken(P.redD, 0.25));
  p.px(2, 12, P.rim);                          // peak glint
  // shingle texture rows
  p.speckle(3, 8, 22, 4, withAlpha(P.blood, 0.4), 9, 31);

  // ── door + cozy lit windows ─────────────────────────────────────────────
  p.rect(12, 17, 5, 8, P.woodD);
  p.gradV(12, 17, 5, 8, P.wood, P.woodD);
  p.rectLine(12, 17, 5, 8, darken(P.woodD, 0.3));
  p.px(15, 21, P.gold);                        // doorknob
  p.px(15, 20, P.goldL);
  // windows: warm interior light spilling out
  p.rect(6, 15, 4, 4, P.ember);
  p.rect(19, 15, 4, 4, P.ember);
  p.glow(8, 17, 3, P.emberL, 0.35, 3);
  p.glow(21, 17, 3, P.emberL, 0.35, 3);
  p.px(7, 16, P.emberL); p.px(20, 16, P.emberL);
  p.rect(6, 15, 4, 1, P.holy); p.rect(19, 15, 4, 1, P.holy);
  // window frames + muntins
  p.rectLine(6, 15, 4, 4, P.woodD); p.rectLine(19, 15, 4, 4, P.woodD);
  p.vline(15, 18, 7, withAlpha(P.woodD, 0.7)); p.vline(15, 18, 20, withAlpha(P.woodD, 0.7));

  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [14, 25] });

// 水井 — stone well with rippling water + wooden frame
defineSprite('hub_well', 18, 18, (p) => {
  p.softShadow(9, 17, 8, 1.8, 0.36);

  // ── stone rim (left-lit) ────────────────────────────────────────────────
  p.ellipse(9, 14, 7, 3, P.gray1);
  p.rect(3, 9, 12, 6, P.gray2);
  p.gradH(3, 9, 12, 6, P.gray3, P.gray2);
  p.rect(3, 9, 12, 1, P.gray3);
  p.hline(3, 14, 8, P.gray4);                 // sunlit top edge
  // individual stones
  p.vline(9, 14, 6, darken(P.gray1, 0.2));
  p.vline(9, 14, 11, darken(P.gray1, 0.2));
  p.speckle(4, 10, 10, 4, withAlpha(P.gray1, 0.5), 7, 13);

  // ── dark shaft + glinting water ─────────────────────────────────────────
  p.rect(4, 10, 10, 4, P.ink2);
  p.ellipse(9, 11, 4, 1.6, P.blueD);
  p.ellipse(9, 11, 3, 1.1, P.blue);
  p.glow(9, 11, 3, P.blueL, 0.3, 3);
  p.px(8, 10, P.iceD); p.px(10, 11, P.ice);   // ripple glints
  p.px(7, 11, withAlpha(P.skyL, 0.8));

  // ── wooden posts + crossbeam ────────────────────────────────────────────
  p.vline(2, 9, 3, P.wood); p.vline(2, 9, 14, P.wood);
  p.px(3, 2, P.woodL); p.px(14, 2, P.woodL);  // post highlights
  p.hline(3, 14, 2, P.woodD);
  p.hline(3, 14, 1, P.wood);
  // rope + tiny bucket hint
  p.vline(2, 6, 9, withAlpha(P.bone, 0.8));
  p.rect(8, 6, 2, 2, P.woodD); p.px(8, 6, P.woodL);

  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [9, 16] });

// 路燈（發光）— iron lamp post with a pulsing warm lantern glow
defineAnim('hub_lamp', 8, 22, 2, (p, f) => {
  p.softShadow(5, 21, 4, 1.4, 0.3);

  // ── iron post (left-lit) ────────────────────────────────────────────────
  p.vline(6, 21, 4, P.gray2);
  p.px(4, 21, P.gray3); p.px(4, 14, P.gray3);  // lit edge
  p.rect(3, 20, 4, 2, P.gray1);
  p.rect(3, 20, 4, 1, P.gray2);                // base highlight

  // ── lantern housing ─────────────────────────────────────────────────────
  p.rect(3, 3, 4, 5, P.bronze);
  p.gradV(3, 3, 4, 5, lighten(P.bronze, 0.2), P.bronze);
  p.px(3, 3, P.goldL);                         // cap glint
  p.hline(2, 7, 2, P.bronze);                  // roof brim
  p.px(2, 8, P.bronze); p.px(7, 8, P.bronze);

  // ── glowing flame (pulses per frame) ────────────────────────────────────
  const warm = f ? P.emberL : P.ember;
  p.glow(5, 5, f ? 5 : 4, P.ember, f ? 0.5 : 0.4, 4);
  p.glow(5, 5, 2, P.holy, 0.6, 2);
  p.ellipse(5, 5, 1.6, 2, warm);
  p.px(5, 4, P.white);
  if (f) p.sparkle(5, 1, withAlpha(P.emberL, 0.8), 1);

  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
}, { anchor: [5, 21], fps: 2 });

// 旗幟 — banner decoration with sheen + shard emblem
defineSprite('hub_banner', 12, 22, (p) => {
  p.softShadow(5, 21, 4, 1.2, 0.28);

  // ── pole ────────────────────────────────────────────────────────────────
  p.vline(2, 21, 2, P.woodD);
  p.px(2, 2, P.gold); p.px(2, 3, P.goldL);     // finial
  p.vline(2, 21, 1, withAlpha(P.woodL, 0.5));  // lit pole edge

  // ── cloth (left-lit with vertical sheen) ────────────────────────────────
  p.rect(3, 2, 8, 11, P.blueD);
  p.gradH(3, 2, 8, 11, P.blue, P.blueD);
  p.rect(3, 2, 8, 2, P.blueL);                 // top band
  p.vline(2, 12, 4, withAlpha(P.blueL, 0.6));  // fold sheen
  p.vline(2, 12, 8, withAlpha(P.blueD, 0.7));  // fold shade

  // ── glowing shard emblem ────────────────────────────────────────────────
  p.glow(7, 7, 3, P.shard, 0.35, 3);
  p.ellipse(7, 7, 1.6, 2.6, P.shardD);
  p.ellipse(7, 7, 1, 1.8, P.shard);
  p.px(6, 5, P.shardL); p.px(7, 5, P.white);
  p.star4(7, 7, 2, withAlpha(P.shardL, 0.7));

  // ── pennant fringe (zig-zag bottom) ─────────────────────────────────────
  for (let i = 0; i < 3; i++) {
    p.px(4 + i * 2, 13, P.blueD); p.px(5 + i * 2, 12, P.blueD);
    p.px(4 + i * 2, 12, P.blue);
  }

  p.rimLight(P.rimCool, 0.5);
  p.outline(P.ink);
}, { anchor: [2, 21] });

// ── ADDITIVE ambient decor (new, optional) ────────────────────────────────

// 花叢 — a small flowering bush to soften the camp
defineSprite('hub_bush', 14, 12, (p) => {
  p.softShadow(7, 11, 6, 1.6, 0.34);
  // leafy mound (top-left lit)
  p.ellipse(7, 7, 6, 4, P.leafD);
  p.ellipse(6, 6, 5, 3.4, P.leaf);
  p.ellipse(5, 5, 3, 2.2, P.leafL);
  p.speckle(2, 4, 10, 6, withAlpha(P.leafD, 0.5), 8, 17);
  // sakura blossoms
  p.px(4, 4, P.sakuraL); p.px(9, 5, P.sakura);
  p.px(11, 7, P.sakuraL); p.px(6, 8, P.sakura);
  p.sparkle(4, 4, P.sakuraL, 1);
  p.px(10, 4, P.sakuraD);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
}, { anchor: [7, 11] });

// 燈籠 — hanging paper lantern (animated soft glow), warm festival accent
defineAnim('hub_lantern', 10, 14, 2, (p, f) => {
  const sway = f ? 1 : 0;
  // hanging cord
  p.vline(0, 2, 5, P.woodD);
  // lantern body (left-lit), sways slightly
  const cx = 5 + sway * 0.0;
  p.glow(cx, 8, f ? 5 : 4, P.laser, f ? 0.4 : 0.3, 4);
  p.ellipse(cx, 8, 3.4, 4, P.redD);
  p.gradH(2, 4, 7, 8, P.red, P.redD);
  p.ellipse(cx, 8, 3.4, 4, withAlpha(P.red, 0));
  p.ellipse(cx, 8, 2.4, 3, P.red);
  p.ellipse(cx, 8, 1.4, 2.4, P.ember);        // glowing core
  p.px(cx | 0, 7, P.emberL);
  // top & bottom caps
  p.rect(3, 3, 4, 1, P.gold); p.rect(3, 12, 4, 1, P.goldD);
  // tassel
  p.vline(12, 13, 5, P.gold);
  if (f) p.sparkle(8, 6, withAlpha(P.emberL, 0.7), 1);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
}, { anchor: [5, 12], fps: 3 });
