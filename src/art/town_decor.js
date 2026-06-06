import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════════
//  Town decorations — ENHANCED EDITION (art_v2)
//  Misc props that dress the hub town: tailoring gear, mirrors, trophy shelves,
//  banners, marble pillars — plus a fresh batch of "living town" ambient decor
//  (flowers, swaying lanterns, market stalls, supply crates) to make the plaza
//  feel inhabited.  Top-left light source, 3–4 tonal steps per material, soft
//  ground shadows, rim light, and a few kira sparkles for anime pop.
//  Names / dims / anchors of the original six props are preserved exactly.
// ════════════════════════════════════════════════════════════════════════════

// 1. 裁縫人台 — dress-form mannequin: faceless torso on a wooden pole + round base
defineSprite('town_mannequin', 12, 22, (p) => {
  p.softShadow(6, 21, 4.5, 1.4, 0.34);
  // round wooden base + pole (tonal turned-wood ring)
  p.ellipse(6, 20, 4, 1.6, P.woodD);
  p.ellipse(6, 19, 3, 1.2, P.wood);
  p.ellipse(6, 19, 2, 0.8, P.woodL);
  p.vline(13, 19, 6, P.woodD);
  p.vline(13, 19, 5, darken(P.wood, 0.15));
  p.px(6, 14, lighten(P.woodL, 0.2));        // pole glint
  // torso form — soft vertical gradient gives a turned-cloth volume
  p.rect(4, 11, 5, 3, P.gray3);              // waist
  p.gradV(3, 6, 7, 6, lighten(P.bone, 0.18), darken(P.bone, 0.12)); // chest
  p.rect(3, 6, 7, 1, lighten(P.bone, 0.3));  // top highlight
  p.vline(6, 13, 4, darken(P.bone, 0.2));    // left shade edge
  p.vline(6, 13, 8, mix(P.bone, P.woodD, 0.18));
  p.px(8, 8, lighten(P.bone, 0.3));          // sheen
  p.px(7, 7, P.glint);                        // specular
  // small neck knob (faceless)
  p.rect(5, 3, 3, 3, P.gray3);
  p.px(6, 3, P.gray4);
  p.px(6, 4, lighten(P.gray4, 0.25));
  // draped cloak over one shoulder — sakura-tinted royal cloth with sheen
  const cloak = tint(P.purpleL, P.sakura, 0.18);
  p.rect(8, 6, 3, 7, cloak);
  p.vline(6, 12, 10, P.purple);
  p.px(8, 6, lighten(cloak, 0.25));
  p.line(8, 13, 10, 11, P.purple);
  p.px(9, 8, lighten(cloak, 0.3));           // fold sheen
  p.px(10, 10, P.sakuraL);                    // soft trim spark
  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  p.sparkle(2, 7, P.sakuraL, 1);             // ambient kira
}, { anchor: [6, 21] });

// 2. 衣架 — clothing rack: bar on two legs with hanging garments
defineSprite('town_rack', 22, 20, (p) => {
  p.softShadow(11, 19, 9, 1.4, 0.3);
  // two legs + feet
  p.vline(4, 18, 3, P.woodD);
  p.vline(4, 18, 18, P.woodD);
  p.vline(4, 18, 4, darken(P.wood, 0.1));    // leg sheen
  p.hline(1, 5, 18, P.woodD);
  p.hline(16, 20, 18, P.woodD);
  // top bar (rounded highlight on top)
  p.hline(2, 19, 4, P.wood);
  p.hline(2, 19, 3, P.woodL);
  p.px(2, 3, lighten(P.woodL, 0.25));
  // hooked top posts
  p.px(3, 3, P.woodD); p.px(18, 3, P.woodD);
  // hanger + garment helper (gradient cloth + sheen + fold shade)
  const hang = (hx, col) => {
    p.px(hx, 5, P.steelD);                    // hook
    p.px(hx, 4, P.steelL);
    p.line(hx - 2, 7, hx + 2, 7, P.steelD);   // hanger bar
    p.gradV(hx - 2, 8, 5, 7, lighten(col, 0.22), darken(col, 0.16)); // garment body
    p.rect(hx - 2, 8, 5, 1, lighten(col, 0.35));
    p.vline(8, 14, hx + 2, darken(col, 0.25));
    p.px(hx - 1, 9, lighten(col, 0.4));        // shoulder sheen
    p.px(hx, 12, lighten(col, 0.15));          // mid fold light
  };
  hang(4, P.red);
  hang(9, P.blue);
  hang(14, P.green);
  hang(18, P.gold);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
  p.sparkle(18, 9, P.glint, 1);              // glint off the gold garment
}, { anchor: [11, 19] });

// 3. 全身鏡 — standing full-length mirror in an ornate gold frame
defineSprite('town_mirror', 12, 22, (p) => {
  p.softShadow(6, 21, 4.5, 1.3, 0.32);
  // little feet
  p.rect(2, 20, 3, 2, P.goldD);
  p.rect(7, 20, 3, 2, P.goldD);
  p.px(2, 20, P.gold); p.px(7, 20, P.gold);
  // outer ornate gold frame — warm bevel
  p.rect(1, 1, 10, 20, P.goldD);
  p.rect(1, 1, 10, 1, P.goldL);
  p.rect(1, 1, 1, 20, P.gold);
  p.vline(1, 20, 10, darken(P.goldD, 0.18));
  p.hline(1, 10, 20, darken(P.goldD, 0.18));
  // little crown finial top
  p.px(5, 0, P.goldL); p.px(6, 0, P.goldL);
  p.px(5, 1, P.gold);
  // reflective glass — cool aurora-tinted gradient, brighter at top-left
  p.gradV(3, 3, 6, 16, tint(P.gray4, P.rimCool, 0.4), tint(P.gray3, P.blueD, 0.25));
  p.rect(3, 3, 6, 1, P.hiSky);
  // diagonal white reflection streaks (the "mirror gleam")
  p.line(4, 16, 7, 4, P.white);
  p.line(5, 17, 8, 6, lighten(P.gray4, 0.35));
  p.px(7, 5, P.white);
  p.glow(6, 7, 3, P.rimCool, 0.3, 3);        // soft inner shine
  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  p.star4(8, 5, 2, P.glint, P.white);        // kira gleam top-right
  p.sparkle(4, 12, P.rimCool, 1);
}, { anchor: [6, 21] });

// 4. 戰利品架 — trophy shelf: cabinet with cups + medals, hall-of-fame look
defineSprite('town_trophyshelf', 24, 22, (p) => {
  p.softShadow(12, 21, 9.5, 1.4, 0.32);
  // cabinet body (warm wood gradient)
  p.gradV(2, 2, 20, 19, P.wood, P.woodD);
  p.rect(2, 2, 20, 1, P.woodL);
  p.vline(2, 20, 2, lighten(P.wood, 0.12));
  // two shelf ledges
  p.hline(3, 20, 11, P.woodL);
  p.hline(3, 20, 12, darken(P.woodD, 0.25));
  p.hline(3, 20, 20, P.woodL);
  // back panels (recessed dark) with a faint vignette glow so cups pop
  p.rect(4, 4, 16, 6, darken(P.woodD, 0.28));
  p.rect(4, 13, 16, 6, darken(P.woodD, 0.28));
  p.glow(11, 6, 6, P.gold, 0.16, 3);
  p.glow(11, 16, 6, P.gold, 0.14, 3);
  // -- gleaming gold cup helper
  const cup = (cx, cy) => {
    p.rect(cx - 2, cy, 5, 3, P.gold);
    p.rect(cx - 2, cy, 5, 1, P.goldL);
    p.px(cx - 2, cy + 1, P.glint);                       // rim glint
    p.px(cx - 3, cy, P.goldD); p.px(cx + 3, cy, P.goldD); // handles
    p.rect(cx - 1, cy + 3, 3, 1, P.goldD);                // stem
    p.rect(cx - 2, cy + 4, 5, 1, P.goldD);                // foot
  };
  cup(7, 5);
  cup(16, 5);
  // medal helper (bronze round with highlight)
  const medal = (mx, my) => {
    p.circle(mx, my, 1, P.bronze);
    p.px(mx, my - 1, lighten(P.bronze, 0.35));
    p.px(mx - 1, my, darken(P.bronze, 0.2));
  };
  medal(12, 7);
  // -- bottom shelf: trophy + a row of medals
  cup(6, 14);
  medal(12, 16);
  medal(15, 16);
  medal(18, 16);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  // hall-of-fame sparkles off the silverware
  p.star4(7, 4, 2, P.glint, P.white);
  p.sparkle(16, 4, P.glint, 1);
  p.sparkle(6, 13, P.holyL, 1);
}, { anchor: [12, 21] });

// 5. 成就金旗 — hanging golden achievement banner with white star + forked bottom
defineSprite('town_banner_gold', 12, 24, (p) => {
  // top rod
  p.hline(1, 10, 1, P.woodD);
  p.hline(1, 10, 0, P.woodL);
  p.px(0, 1, P.woodD); p.px(11, 1, P.woodD);
  // banner cloth body — radiant gold gradient (bright top -> deep bottom)
  p.gradV(2, 2, 8, 17, P.gold, P.goldD);
  p.rect(2, 2, 8, 1, P.goldL);                // top seam highlight
  p.vline(2, 18, 2, lighten(P.gold, 0.15));   // left border light
  p.vline(2, 18, 9, darken(P.goldD, 0.22));   // right shade
  p.vline(2, 18, 3, lighten(P.gold, 0.2));    // inner sheen
  // glowing white star emblem
  p.glow(6, 8, 3, P.holyL, 0.3, 3);
  p.px(6, 6, P.white);
  p.hline(4, 8, 7, P.white);
  p.px(5, 8, P.white); p.px(7, 8, P.white);
  p.px(4, 9, P.white); p.px(8, 9, P.white);
  p.px(6, 7, P.holyL);                         // star core warm glow
  // pointed / forked bottom (V notch)
  p.hline(2, 9, 19, P.goldD);
  p.line(2, 19, 4, 22, P.goldD);
  p.line(9, 19, 7, 22, P.goldD);
  p.px(3, 21, darken(P.goldD, 0.2));
  p.px(8, 21, darken(P.goldD, 0.2));
  p.px(4, 20, P.gold); p.px(7, 20, P.gold);    // tail tips catch light
  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  p.star4(6, 6, 2, P.holyL, P.white);          // kira on the emblem
  p.sparkle(9, 4, P.glint, 1);
}, { anchor: [6, 23] });

// 6. 大理石柱 — fluted marble pillar with capital + square base, pale + stately
defineSprite('town_pillar', 12, 28, (p) => {
  p.softShadow(6, 27, 5, 1.3, 0.3);
  // square base
  p.rect(1, 24, 10, 4, P.gray2);
  p.rect(1, 24, 10, 1, P.gray3);
  p.rect(2, 23, 8, 1, P.gray3);
  p.px(1, 24, lighten(P.gray3, 0.2));
  // shaft — cool marble gradient (left-lit)
  p.gradH(2, 4, 8, 20, lighten(P.gray3, 0.18), P.gray2);
  // vertical fluting: light highlights + shadow grooves
  p.vline(4, 23, 3, lighten(P.gray4, 0.1));
  p.vline(4, 23, 6, P.gray4);
  p.vline(4, 23, 8, P.gray4);
  p.vline(4, 23, 4, P.gray2);
  p.vline(4, 23, 7, P.gray2);
  p.vline(4, 23, 9, darken(P.gray2, 0.12));
  // capital (top spreads wider)
  p.rect(1, 1, 10, 3, P.gray3);
  p.rect(1, 1, 10, 1, P.gray4);
  p.rect(2, 0, 8, 1, P.gray4);
  p.hline(2, 9, 4, P.gray2);
  p.px(2, 1, lighten(P.gray4, 0.2));           // capital corner light
  p.rimLight(P.rimCool, 0.45);
  p.outline(P.ink);
  p.sparkle(3, 6, P.hiSky, 1);                 // faint marble shimmer
}, { anchor: [6, 27] });

// ════════════════════════════════════════════════════════════════════════════
//  NEW ambient decor (additive) — flowers, lanterns, market stalls, crates.
//  These give the plaza life. New names only; no original contract touched.
// ════════════════════════════════════════════════════════════════════════════

// 7. 花盆 — flower planter: terracotta pot bursting with sakura blooms
defineSprite('town_flowerpot', 14, 16, (p) => {
  p.softShadow(7, 15, 5, 1.3, 0.34);
  // terracotta pot (tapered, clay gradient)
  p.gradV(3, 9, 8, 6, lighten(P.clay, 0.2), darken(P.clay, 0.18));
  p.rect(2, 8, 10, 2, P.clay);                 // rim
  p.rect(2, 8, 10, 1, lighten(P.clay, 0.3));
  p.vline(9, 14, 3, darken(P.clay, 0.25));     // left shade
  p.px(10, 10, lighten(P.clay, 0.35));         // glaze sheen
  p.px(4, 12, darken(P.clay, 0.3));
  // dark soil
  p.hline(4, 9, 9, darken(P.bark, 0.2));
  // foliage cushion
  p.ellipse(5, 7, 2.4, 1.8, P.leafD);
  p.ellipse(9, 7, 2.4, 1.8, P.leaf);
  p.ellipse(7, 6, 2.6, 2, P.leaf);
  p.px(7, 5, P.leafL); p.px(9, 6, P.leafL);
  // sakura blooms — soft glow + petals + golden centres
  const bloom = (bx, by) => {
    p.glow(bx, by, 2, P.sakura, 0.3, 2);
    p.px(bx, by, P.sakuraL);
    p.px(bx - 1, by, P.sakura); p.px(bx + 1, by, P.sakura);
    p.px(bx, by - 1, P.sakura); p.px(bx, by + 1, P.sakuraD);
    p.px(bx, by, P.gold);                       // pistil
  };
  bloom(5, 4);
  bloom(9, 5);
  bloom(7, 2);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
  p.star4(11, 3, 2, P.sakuraL, P.white);       // drifting kira petal-spark
  p.sparkle(2, 5, P.sakuraL, 1);
}, { anchor: [7, 15] });

// 8. 紙燈籠 — hanging paper lantern, gently swaying + glowing (2-frame anim)
defineAnim('town_lantern', 12, 18, 2, (p, f) => {
  const sway = f === 0 ? 0 : 1;                 // 1px sway between frames
  const cx = 6 + (f === 0 ? -0 : 0);
  // cord + cap
  p.vline(0, 2, 6, P.woodD);
  p.rect(4 + sway, 3, 4, 1, P.woodD);           // top cap
  // lantern body — warm glowing gradient with ribs
  const x = 2 + sway;
  p.glow(x + 4, 9, 6, P.ember, 0.4, 4);         // outer halo
  p.gradV(x, 4, 8, 9, P.emberL, P.ember);
  p.ellipse(x + 4, 4, 4, 1.2, P.emberL);        // top dome
  p.ellipse(x + 4, 12, 4, 1.2, darken(P.ember, 0.15)); // bottom
  // vertical ribs (paper panels)
  p.vline(4, 12, x + 1, withAlpha(P.redD, 0.5));
  p.vline(4, 12, x + 6, withAlpha(P.redD, 0.5));
  p.vline(4, 12, x + 4, lighten(P.emberL, 0.2)); // central hot core
  // bottom tassel
  p.vline(13, 16, x + 4, P.red);
  p.px(x + 4, 16, P.gold);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
  // floating warm sparks (deterministic so bakes stay stable)
  p.sparkle(x + (f ? 7 : 0), 6, P.emberL, 1);
  p.star4(x + 4, 8, 2, P.holyL, P.white);
}, { anchor: [6, 1], fps: 2, loop: true });

// 9. 攤位 — market stall: striped awning, counter, wares (jars + fruit)
defineSprite('town_stall', 28, 24, (p) => {
  p.softShadow(14, 23, 12, 1.6, 0.3);
  // back posts + counter frame
  p.vline(6, 22, 2, P.woodD);
  p.vline(6, 22, 25, P.woodD);
  // wooden counter (gradient top)
  p.gradV(2, 16, 24, 6, P.woodL, P.wood);
  p.rect(2, 16, 24, 1, lighten(P.woodL, 0.25));
  p.hline(2, 25, 21, P.woodD);
  // counter plank seams
  p.vline(17, 20, 9, darken(P.wood, 0.18));
  p.vline(17, 20, 17, darken(P.wood, 0.18));
  // striped awning (red / cream) with scalloped fringe
  for (let i = 0; i < 24; i++) {
    const col = (i & 3) < 2 ? P.red : P.bone;
    p.gradV(2 + i, 6, 1, 7, lighten(col, 0.25), col);
  }
  p.rect(2, 6, 24, 1, lighten(P.white, 0.0));
  p.hline(2, 25, 5, P.redD);                    // awning top edge
  // scalloped fringe along the bottom of awning
  for (let i = 2; i < 26; i += 3) {
    p.px(i, 13, P.redD); p.px(i + 1, 14, P.redD);
  }
  // wares on counter: two glazed jars + a fruit pile
  const jar = (jx, col) => {
    p.gradV(jx, 11, 4, 5, lighten(col, 0.3), darken(col, 0.15));
    p.rect(jx, 10, 4, 1, darken(P.bark, 0.1)); // lid
    p.px(jx + 1, 12, lighten(col, 0.45));       // glaze glint
  };
  jar(4, P.blue);
  jar(20, P.green);
  // fruit pile (red rounds w/ leaf)
  p.circle(13, 14, 1, P.red); p.px(13, 13, P.redL);
  p.circle(15, 14, 1, P.red); p.px(15, 13, P.redL);
  p.circle(14, 13, 1, P.redL); p.px(14, 12, P.greenL);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
  p.sparkle(5, 12, P.glint, 1);
  p.star4(21, 12, 2, P.glint, P.white);
}, { anchor: [14, 23] });

// 10. 木箱 — supply crate: banded wooden box with rope handle + shard cargo glow
defineSprite('town_crate', 16, 16, (p) => {
  p.softShadow(8, 15, 6, 1.4, 0.34);
  // box body (warm wood gradient)
  p.gradV(2, 3, 12, 12, P.woodL, P.woodD);
  p.rect(2, 3, 12, 1, lighten(P.woodL, 0.3));   // top highlight
  // plank seams
  p.hline(2, 13, 7, darken(P.wood, 0.22));
  p.hline(2, 13, 11, darken(P.wood, 0.22));
  p.vline(3, 14, 7, darken(P.wood, 0.18));
  // diagonal reinforcement boards (corner -> corner)
  p.line(3, 13, 12, 4, lighten(P.wood, 0.18));
  p.line(3, 4, 12, 13, lighten(P.wood, 0.12));
  // iron corner brackets
  p.rect(2, 3, 2, 2, P.iron); p.rect(12, 3, 2, 2, P.iron);
  p.rect(2, 13, 2, 2, P.iron); p.rect(12, 13, 2, 2, P.iron);
  p.px(2, 3, P.steelL); p.px(12, 3, P.steelL); // bracket glints
  // a sliver of glowing shard cargo peeking out the top
  p.glow(8, 3, 3, P.shard, 0.4, 3);
  p.px(7, 2, P.shardL); p.px(8, 2, P.shard); p.px(9, 2, P.shardD);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
  p.star4(8, 2, 2, P.shardL, P.white);          // shard kira
  p.sparkle(3, 5, P.glint, 1);
}, { anchor: [8, 15] });
