// Icons for core talents / facilities / items / equipment.
// ENHANCED EDITION (art_v2): same names / sizes / anchors / exports as the
// original — every defineIcon key is a hard contract. The DRAW BODIES are
// rebuilt to read like shiny RPG inventory icons: top-left light source, 3–4
// tonal steps per material, gradient fills, metallic sheen, gem/potion glow,
// rim light + kira sparkles. Local flask/shield/staff/ring helpers gained richer
// shading but keep their original signatures so callers are unaffected.
import { defineIcon, sym } from './icons.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ── shared micro-helpers (local, additive) ──────────────────────────────────
// A tiny specular pop: bright core + soft glow, the inventory "shine" beat.
function shine(p, x, y, col = P.glint, r = 1.4) {
  p.glow(x, y, r, col, 0.45, 3);
  p.px(x, y, P.glint);
}
// Faceted gem: dark rim, bright core, a glint, and a soft outer glow.
function gem(p, cx, cy, r, col, glowS = 0.5) {
  p.glow(cx, cy, r + 1.4, col, glowS, 4);
  p.ellipse(cx, cy, r, r, darken(col, 0.28));
  p.ellipse(cx, cy, r - 0.7, r - 0.7, col);
  p.ellipse(cx - 0.4, cy - 0.6, r * 0.45, r * 0.45, lighten(col, 0.45));
  p.px(cx - Math.round(r * 0.4), cy - Math.round(r * 0.4), P.glint);
}

// ── extra shape helpers (original signatures preserved) ──────────────────────
// R28 (ART-06): 道具 speak the 容器 dialect — a bottle silhouette with a real
// neck, shoulder and FLAT BASE that sits on the frame's 底座線, so a consumable
// reads as a consumable at 16px. The old version was a soft ellipse blob that
// could just as easily have been a gem or an orb.
function flask(p, liquid, big = false) {
  const bw = big ? 4 : 3;          // 瓶身半寬
  const top = big ? 5 : 6;         // 瓶肩
  const bot = 12;                  // 瓶底（坐在框的底座線上）
  const lTop = top + (big ? 1 : 2);
  // 軟木塞＋瓶頸
  p.rect(6, 1, 4, 2, P.woodD); p.rect(6, 1, 4, 1, P.woodL);
  p.rect(6, 3, 4, top - 2, P.gray2); p.vline(3, top - 1, 6, P.gray4);
  // 玻璃外框（實心邊，讓容器輪廓自己站得住，不靠 alpha 疊色）
  p.rect(8 - bw, top, bw * 2, bot - top + 1, P.gray2);
  p.rect(8 - bw + 1, top + 1, bw * 2 - 2, bot - top - 1, darken(liquid, 0.55));
  // 液體
  p.rect(8 - bw + 1, lTop, bw * 2 - 2, bot - lTop, liquid);
  p.rect(8 - bw + 1, lTop, bw * 2 - 2, 1, lighten(liquid, 0.45));    // 液面
  p.rect(8 - bw + 1, bot - 1, bw * 2 - 2, 1, darken(liquid, 0.35));  // 沉澱
  // 玻璃反光（左）＋氣泡
  p.vline(top + 1, bot - 1, 8 - bw, P.gray4);
  p.vline(lTop + 1, bot - 2, 8 - bw + 1, withAlpha(P.white, 0.5));
  p.px(8 + bw - 2, lTop + 2, lighten(liquid, 0.6));
  // 平底
  p.rect(8 - bw - 1, bot, bw * 2 + 2, 1, P.gray3);
  shine(p, 8 - bw + 1, lTop + 1, P.glint, 1.1);
}
function shield(p, c) {
  for (let y = 3; y <= 12; y++) {
    const t = (y - 3) / 9;
    const w = 4.2 * (1 - t * 0.55) * (y > 9 ? (13 - y) / 3.5 : 1);
    // vertical metal gradient: brighter up top, darker at the point
    const col = mix(lighten(c, 0.22), darken(c, 0.26), t);
    p.hline(8 - w, 7 + w, y, col);
  }
  // top bevel + boss + left sheen
  p.hline(5, 10, 3, lighten(c, 0.4));
  p.hline(5, 10, 4, lighten(c, 0.2));
  p.vline(4, 9, 8, lighten(c, 0.18));   // left rim light
  p.ellipse(8, 7, 1.4, 1.6, lighten(c, 0.3));
  p.px(7, 6, P.glint);                  // central rivet glint
  p.px(5, 4, P.rim);
}
function staff(p, shaft, gem) {
  p.line(4, 13, 11, 3, darken(shaft, 0.25));
  p.line(5, 13, 12, 3, shaft);
  p.line(4, 13, 11, 3, lighten(shaft, 0.2)); // top-left lit edge
  // crowning gem
  p.glow(12, 3, 3.4, gem, 0.55, 4);
  p.ellipse(12, 3, 2, 2, darken(gem, 0.2));
  p.ellipse(12, 3, 1.4, 1.4, gem);
  p.px(11, 2, lighten(gem, 0.5));
  p.px(12, 3, P.white);
}
// R28 (ART-06): 裝備 speak the 完整可穿戴物件 dialect — a band with visible
// THICKNESS and a hollow you can see through, plus a prong-set stone. A thin
// 1px circle read as a generic "ring symbol", not as a wearable object.
function ring(p, metal, gemc) {
  const dk = darken(metal, 0.3), lt = lighten(metal, 0.45);
  p.ellipse(8, 10, 4.2, 3.6, dk);
  p.ellipse(8, 10, 3.6, 3.0, metal);
  p.ellipse(8, 10.2, 2.4, 2.0, P.ink2);      // 中空
  p.ellipse(8, 10.2, 1.9, 1.5, P.ink);
  p.px(5, 9, lt); p.px(6, 8, lt); p.px(10, 12, dk);
  // 爪座
  p.rect(6, 5, 4, 2, dk); p.rect(6, 5, 4, 1, metal);
  p.px(6, 4, metal); p.px(9, 4, metal);
  // 寶石
  p.glow(8, 3, 3, gemc, 0.55, 4);
  p.ellipse(8, 3, 2.2, 2.2, darken(gemc, 0.3));
  p.ellipse(8, 3, 1.5, 1.5, gemc);
  p.px(7, 2, P.white);
}

// ---- talents ---------------------------------------------------------------
// R28 (ART-06): 天賦 speak the 星/樹/紋章 dialect. They used to reuse the same
// sword/heart/star symbols the weapons and passives use, so a talent node was
// indistinguishable from a passive pick-up. The three redrawn here establish one
// archetype each for the rest of the tree to follow.
defineIcon('talent_t_damage', P.blood, (p) => {          // 紋章
  p.glow(8, 8, 5.5, P.redL, 0.2, 3);
  for (let y = 4; y <= 13; y++) {                        // 盾形紋章面
    const t = (y - 4) / 9;
    const w = t < 0.6 ? 4 : 4 * (1 - (t - 0.6) / 0.42) + 0.4;
    p.hline(8 - w, 7 + w, y, mix(lighten(P.red, 0.12), darken(P.blood, 0.2), t));
  }
  p.hline(4, 11, 4, P.goldL); p.hline(4, 11, 5, P.gold); // 頂飾金邊
  p.line(4, 7, 8, 10, P.white); p.line(11, 7, 7, 10, P.white);   // 雙 V 紋（攻擊系）
  p.line(4, 9, 8, 12, P.goldL); p.line(11, 9, 7, 12, P.goldL);
  p.px(8, 10, P.white); p.px(5, 5, P.rim);
});
defineIcon('talent_t_firerate', P.blood, (p) => {
  p.glow(8, 8, 6, P.ember, 0.22, 3);
  sym.bolt(p, P.emberL);
  p.px(6, 8, P.white);
  p.sparkle(11, 4, P.holyL, 1);
});
defineIcon('talent_t_crit', P.blood, (p) => {
  p.glow(8, 8, 6, P.goldL, 0.22, 3);
  sym.ring(p, P.goldL, 4);
  sym.cross(p, P.gold);
  p.px(8, 8, P.glint);
  p.star4(8, 8, 3, P.holyL, P.glint);
});
defineIcon('talent_t_hp', P.blueD, (p) => {              // 樹
  p.glow(8, 6, 6, P.greenL, 0.24, 3);
  p.ellipse(8, 5, 3.6, 3, P.greenD);                     // 樹冠
  p.ellipse(5, 7, 2.2, 1.8, P.greenD); p.ellipse(11, 7, 2.2, 1.8, P.greenD);
  p.ellipse(8, 5, 3, 2.4, P.green);
  p.ellipse(6.6, 4, 1.6, 1.2, P.greenL); p.px(6, 4, P.toxic);
  p.rect(7, 7, 2, 5, P.bark); p.vline(7, 11, 7, P.barkD); // 主幹
  p.line(7, 11, 4, 13, P.bark); p.line(8, 11, 11, 13, P.bark);
  p.hline(4, 11, 13, P.barkD);                           // 根
  p.px(8, 6, P.redL); p.px(4, 7, P.redL); p.px(11, 6, P.redL); // 生命果實
});
defineIcon('talent_t_armor', P.blueD, (p) => { shield(p, P.steel); p.rimLight(P.rimCool, 0.5); });
defineIcon('talent_t_regen', P.blueD, (p) => {
  p.glow(8, 8, 6, P.greenL, 0.22, 3);
  sym.cross(p, P.greenL);
  p.px(8, 8, P.white);
  p.sparkle(12, 4, P.toxic, 1);
});
defineIcon('talent_t_speed', P.greenD, (p) => {
  p.glow(7, 8, 6, P.toxic, 0.18, 3);
  p.hline(3, 9, 5, lighten(P.greenL, 0.2));
  p.hline(4, 11, 8, P.toxic);
  p.hline(3, 8, 11, lighten(P.greenL, 0.2));
  p.hline(3, 7, 6, withAlpha(P.greenL, 0.5));
  p.px(9, 5, P.white); p.px(11, 8, P.white); p.px(8, 11, P.white);
});
defineIcon('talent_t_pickup', P.greenD, (p) => {
  // glossy red horseshoe magnet + steel poles
  p.rect(4, 4, 3, 6, darken(P.red, 0.2)); p.rect(9, 4, 3, 6, darken(P.red, 0.2));
  p.rect(4, 4, 3, 6, P.red); p.rect(9, 4, 3, 6, P.red);
  p.rect(4, 4, 8, 3, P.red);
  p.vline(4, 6, 4, P.redL); p.vline(4, 6, 9, P.redL); // left sheen on each arm
  p.rect(4, 9, 3, 2, P.steelL); p.rect(9, 9, 3, 2, P.steelL);
  p.px(5, 9, P.white); p.px(10, 9, P.white);
  p.glow(8, 12, 3, P.neonL, 0.3, 3); // magnetic field hum at the gap
});
defineIcon('talent_t_dash', P.greenD, (p) => {
  p.glow(6, 8, 5, P.toxic, 0.2, 3);
  p.hline(2, 9, 8, withAlpha(P.toxic, 0.5));
  p.hline(3, 9, 8, P.toxic);
  p.line(8, 5, 12, 8, P.greenL); p.line(8, 11, 12, 8, P.greenL);
  p.px(12, 8, P.white);
});
defineIcon('talent_t_gold', '#5a4a1a', (p) => {
  p.glow(8, 8, 6, P.goldL, 0.22, 3);
  sym.coin(p);
  p.px(6, 6, P.glint);
  p.star4(11, 5, 2, P.holyL, P.glint);
});
defineIcon('talent_t_luck', '#5a4a1a', (p) => {          // 星
  p.glow(8, 8, 6, P.goldL, 0.26, 4);
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 ? 2.4 : 5.6;
    pts.push([8 + Math.cos(a) * rad, 8.4 + Math.sin(a) * rad]);
  }
  // fan-fill the 5-point star from the centre so the star芒 lands in the outline layer
  for (let i = 0; i < 10; i++) {
    const a = pts[i], b = pts[(i + 1) % 10];
    for (let t = 0; t <= 1.001; t += 0.1) {
      p.line(8, 8.4, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, i < 5 ? P.gold : darken(P.gold, 0.18));
    }
  }
  for (let i = 0; i < 10; i++) p.line(pts[i][0], pts[i][1], pts[(i + 1) % 10][0], pts[(i + 1) % 10][1], P.goldD);
  p.line(pts[8][0], pts[8][1], pts[0][0], pts[0][1], P.goldL);  // 左上受光邊
  p.line(pts[9][0], pts[9][1], pts[0][0], pts[0][1], P.goldL);
  p.ellipse(7.6, 7.8, 1.6, 1.6, P.goldL);
  p.px(7, 7, P.white);
});
defineIcon('talent_t_xp', '#5a4a1a', (p) => {
  // bound tome with gilded spine + glowing rune lines
  p.rect(4, 4, 8, 9, darken(P.bone, 0.2));
  p.rect(4, 4, 8, 9, P.bone);
  p.rect(4, 4, 8, 1, P.white);            // top page sheen
  p.rect(4, 4, 8, 2, P.gold); p.rect(4, 4, 8, 1, P.goldL);
  p.vline(4, 12, 4, P.goldD); p.vline(4, 12, 5, P.gold);
  for (let y = 6; y <= 11; y += 2) p.hline(6, 10, y, withAlpha(P.shard, 0.85));
  p.px(11, 12, P.goldD);
  p.star4(11, 5, 2, P.shardL, P.glint);
});

// ---- facilities ------------------------------------------------------------
// R28 (ART-06): 設施 speak the 建築剪影＋地基 dialect — every facility is a
// BUILDING with a footing that fills the frame's 梯形底. They used to be loose
// props (a coin stack, an anvil), which read exactly like 道具.
defineIcon('facility_f_shrine', P.purpleD, (p) => {
  for (let y = 1; y <= 4; y++) { const w = y; p.hline(8 - w, 7 + w, y, y < 3 ? P.gray4 : P.gray3); } // 尖頂
  p.hline(4, 11, 5, P.gray2);                                   // 簷
  p.rect(4, 6, 2, 5, P.gray3); p.rect(10, 6, 2, 5, P.gray3);     // 柱
  p.vline(6, 10, 4, P.gray4); p.vline(6, 10, 10, P.gray4);
  p.glow(8, 8, 3.5, P.manaL, 0.55, 4);                          // 龕內魂晶
  p.ellipse(8, 8, 1.6, 2.4, P.mana);
  p.ellipse(8, 7.6, 1, 1.6, P.manaL);
  p.px(7, 7, P.white);
  p.rect(3, 11, 10, 1, P.gray3);                                // 三階台基
  p.rect(2, 12, 12, 1, P.gray2);
  p.rect(1, 13, 14, 1, darken(P.gray2, 0.25));
  p.rect(0, 14, 16, 1, darken(P.gray1, 0.3));
});
defineIcon('facility_f_bank', '#5a4a1a', (p) => {
  for (let y = 1; y <= 4; y++) { const w = y; p.hline(8 - w, 7 + w, y, y < 3 ? P.goldL : P.gold); } // 山牆
  p.hline(4, 11, 5, P.goldD);
  for (let i = 0; i < 4; i++) {                                 // 列柱
    const x = 4 + i * 2;
    p.vline(6, 10, x, P.bone); p.vline(6, 10, x + 1, darken(P.bone, 0.28));
  }
  p.hline(3, 12, 6, P.gold);
  p.glow(8, 3, 2.6, P.goldL, 0.5, 3); p.px(8, 3, P.white);      // 山牆金幣紋章
  p.rect(2, 11, 12, 1, P.bone);                                 // 台基
  p.rect(1, 12, 14, 1, darken(P.bone, 0.2));
  p.rect(0, 13, 16, 1, P.woodD);
  p.rect(0, 14, 16, 1, darken(P.woodD, 0.3));
});
defineIcon('facility_f_forge', P.gray1, (p) => {
  p.rect(6, 1, 3, 4, P.gray3); p.rect(6, 1, 3, 1, P.gray4); p.vline(1, 4, 6, P.gray4); // 煙囪
  for (let y = 5; y <= 10; y++) {                               // 屋身（貼合梯形框）
    const x0 = y < 7 ? 4 : 3;
    p.hline(x0, 15 - x0, y, mix(P.gray3, darken(P.gray2, 0.2), (y - 5) / 5));
  }
  p.hline(4, 11, 5, P.gray4);
  p.glow(8, 9, 3.4, P.ember, 0.6, 4);                           // 爐口
  p.rect(6, 8, 4, 3, darken(P.ember, 0.4));
  p.rect(6, 9, 4, 2, P.ember); p.rect(7, 10, 2, 1, P.emberL);
  p.px(7, 9, P.holyL);
  p.rect(2, 11, 12, 1, P.gray3);                                // 台基
  p.rect(1, 12, 14, 1, P.gray2);
  p.rect(0, 13, 16, 1, darken(P.gray2, 0.25));
  p.rect(0, 14, 16, 1, darken(P.gray1, 0.3));
});
defineIcon('facility_f_dojo', P.blood, (p) => {
  // crisp target with concentric rings + kira center
  p.glow(8, 8, 6, P.redL, 0.16, 3);
  sym.ring(p, P.white, 4.5); sym.ring(p, P.red, 3); sym.ring(p, P.white, 1.5);
  p.px(8, 8, P.red);
  p.star4(8, 8, 3, P.holyL, P.white);
  p.px(5, 5, P.rim);
});
defineIcon('facility_f_altar', P.shardD, (p) => {
  p.rect(4, 11, 8, 3, darken(P.gray2, 0.1)); p.rect(4, 11, 8, 1, P.gray3);
  p.rect(6, 9, 4, 2, P.gray3); p.rect(6, 9, 4, 1, P.gray4);
  p.glow(8, 6, 4, P.shardL, 0.5, 4);
  sym.shardSym(p, P.shard);
  p.px(7, 5, P.white);
  p.star4(8, 6, 2, P.shardL, P.glint);
});
defineIcon('facility_f_arsenal', P.gray1, (p) => {
  // crossed glinting blades + gold pommels
  p.line(4, 12, 11, 3, P.steel); p.line(4, 12, 11, 3, P.steelL);
  p.line(12, 12, 5, 3, P.steelD); p.line(12, 12, 5, 3, P.steel);
  p.px(11, 3, P.white); p.px(5, 3, P.white);
  p.rect(3, 11, 3, 2, P.gold); p.rect(3, 11, 3, 1, P.goldL);
  p.rect(10, 11, 3, 2, P.gold); p.rect(10, 11, 3, 1, P.goldL);
  p.sparkle(8, 7, P.glint, 1);
});

// ---- items -----------------------------------------------------------------
// kira flags below follow the `tier` in content/items.js — tier 1 (普通) gets
// none, tier 2 (稀有) gets one. See defineIcon's opts doc for why it is opt-in.
defineIcon('item_heal_potion', P.blood, (p) => {
  p.glow(8, 8, 5.5, P.redL, 0.2, 3);
  flask(p, P.red);
  // 白十字標籤，讓「治療」在 16px 一眼可讀
  p.rect(7, 9, 2, 3, P.white); p.rect(6, 10, 4, 1, P.white);
});
defineIcon('item_big_potion', P.blood, (p) => {
  p.glow(8, 8, 6.5, P.redL, 0.28, 4);
  flask(p, P.redL, true);
  p.rect(7, 7, 2, 4, P.white); p.rect(6, 9, 4, 1, P.white);
}, { kira: true });
defineIcon('item_bomb', P.gray1, (p) => {
  p.softShadow(8, 14, 4, 1.2, 0.35);
  p.ellipse(8, 10, 4, 4, P.ink2);
  p.ellipse(8, 10, 3.3, 3.3, P.gray1);
  p.ellipse(7, 9, 2, 2, P.gray2);
  p.ellipse(6.4, 8.4, 1, 1, P.gray4); // glossy highlight
  p.px(6, 8, P.white);
  p.rect(7, 5, 2, 1, P.gray4);         // fuse cap
  p.line(9, 6, 11, 3, P.wood);
  p.glow(12, 3, 2.6, P.ember, 0.6, 3);
  p.px(11, 2, P.emberL); p.px(12, 3, P.holyL); p.px(13, 2, P.ember);
});
defineIcon('item_magnet_scroll', '#5a4a1a', (p) => {
  // 半展開卷軸：上方捲筒＋垂下的紙面＋下緣捲曲——剪影就說得出「可用掉的卷軸」
  p.rect(3, 2, 10, 3, P.wood); p.rect(3, 2, 10, 1, P.woodL);
  p.ellipse(3.5, 3.5, 1.3, 1.7, P.woodD); p.ellipse(12.5, 3.5, 1.3, 1.7, P.woodD);  // 端蓋
  p.px(3, 3, P.wood); p.px(12, 3, darken(P.wood, 0.2));
  p.rect(5, 5, 6, 7, P.bone);                       // 紙面（比捲筒窄）
  p.rect(5, 5, 6, 1, P.white);
  p.rect(5, 11, 6, 1, darken(P.bone, 0.3));
  p.hline(4, 11, 12, P.woodD); p.px(4, 12, P.wood); p.px(11, 12, P.wood);  // 下緣捲曲
  // 磁力符文（本卷軸的內容）
  p.glow(8, 7, 3, P.neonL, 0.32, 3);
  p.rect(6, 7, 2, 3, P.red); p.rect(8, 7, 2, 3, P.blue);
  p.rect(6, 10, 4, 1, P.steelL);
  p.px(6, 7, P.redL); p.px(9, 7, P.blueL);
});
defineIcon('item_frenzy_brew', '#5a3a1a', (p) => {
  p.glow(8, 8, 5.5, P.ember, 0.22, 3);
  flask(p, P.ember);
  // 雙箭頭標籤＝射速藥劑
  p.line(6, 10, 8, 7, withAlpha(P.white, 0.85)); p.line(10, 10, 8, 7, withAlpha(P.white, 0.85));
  p.line(6, 12, 8, 9, withAlpha(P.holyL, 0.8)); p.line(10, 12, 8, 9, withAlpha(P.holyL, 0.8));
}, { kira: true });
defineIcon('item_shield_charm', P.blueD, (p) => { p.glow(8, 8, 6, P.ice, 0.2, 3); shield(p, P.ice); p.rimLight(P.rimCool, 0.5); p.star4(8, 4, 2, P.hiSky, P.glint); });

// ---- equipment -------------------------------------------------------------
defineIcon('equip_rapid_rod', P.blueD, (p) => { p.glow(12, 3, 5, P.ice, 0.22, 3); staff(p, P.iron, P.ice); p.rimLight(P.rimCool, 0.45); });
defineIcon('equip_shotgun_wand', '#5a3a1a', (p) => {
  p.glow(12, 3, 5, P.ember, 0.24, 3);
  staff(p, P.wood, P.ember);
  p.sparkle(13, 1, P.emberL, 1); p.px(14, 4, P.holyL); p.px(11, 1, P.emberL);
  p.rimLight(P.rim, 0.4);
});
defineIcon('equip_cannon_staff', P.purpleD, (p) => {
  p.line(4, 13, 11, 4, darken(P.wood, 0.2)); p.line(4, 13, 11, 4, P.wood);
  p.line(4, 13, 11, 4, lighten(P.wood, 0.18));
  p.glow(12, 4, 4.2, P.purpleL, 0.6, 4);
  p.ellipse(12, 4, 2.6, 2.6, darken(P.purple, 0.15));
  p.ellipse(12, 4, 1.8, 1.8, P.purpleL);
  p.px(11, 3, P.white); p.px(12, 4, P.white);
  p.star4(12, 4, 3, P.astralL, P.glint);
});
// 裝備＝完整可穿戴物件（肩/腰/袖俱全），不是一團漸層色塊。kira 依
// content/equipment.js 的 tier：tier 1 無、tier 2 有。
defineIcon('equip_leather_armor', '#5a3a1a', (p) => {
  // 圓弧護肩（先畫，內側被胸甲蓋住 → 肩線連續，不會讀成一對角）
  p.ellipse(4, 6, 2.4, 2.2, P.iron); p.ellipse(4.4, 5.4, 1.6, 1.3, P.steelL);
  p.ellipse(11, 6, 2.4, 2.2, P.iron); p.ellipse(11.4, 5.4, 1.6, 1.3, P.steel);
  for (let y = 3; y <= 12; y++) {                                // 胸甲
    const t = (y - 3) / 9, w = 4 - Math.round(t * 1.6);
    p.hline(8 - w, 7 + w, y, mix(lighten(P.leather, 0.5), darken(P.leather, 0.15), t));
  }
  // 橫向甲片＋中縫（避免用會讀成五官的斜線）
  p.hline(4, 11, 3, darken(P.leather, 0.5));
  p.hline(4, 11, 6, darken(P.leather, 0.45));
  p.hline(5, 10, 9, darken(P.leather, 0.4));
  p.rect(4, 10, 8, 2, P.woodD); p.rect(4, 10, 8, 1, P.wood);     // 腰帶
  p.rect(7, 10, 2, 2, P.goldL); p.px(8, 11, P.goldD);            // 扣環
  p.vline(4, 9, 8, lighten(P.leather, 0.28));                    // 中縫
  for (let y = 4; y <= 9; y += 2) { p.px(6, y, withAlpha(P.white, 0.3)); p.px(9, y, withAlpha(P.white, 0.22)); }
  p.px(5, 4, P.rim);
});
defineIcon('equip_mage_robe', P.purpleD, (p) => {
  p.ellipse(8, 4, 3.2, 3.2, P.purple); p.ellipse(8, 4, 2.6, 2.6, P.purpleL);   // 兜帽
  p.ellipse(8, 4.6, 2, 2.2, P.ink2);                                           // 帽內深影
  p.px(6, 3, P.astralL); p.px(7, 2, P.magentaL); p.px(9, 2, P.astralL);        // 左上受光緣
  p.glow(8, 5, 1.8, P.manaL, 0.4, 3); p.px(7, 5, P.astralL); p.px(9, 5, P.astralL);
  p.rect(2, 7, 3, 5, P.purpleD); p.rect(11, 7, 3, 5, P.purpleD);          // 袖
  p.rect(2, 7, 3, 1, P.purple); p.rect(11, 7, 3, 1, P.purple);
  for (let y = 6; y <= 12; y++) {                                         // 袍身
    const t = (y - 6) / 6, w = 2 + Math.round(t * 2);
    p.hline(8 - w, 7 + w, y, mix(P.purpleL, P.purpleD, t));
  }
  p.hline(4, 11, 13, P.purpleD);                                          // 下擺
  p.vline(6, 12, 7, P.goldL); p.vline(6, 12, 8, P.goldD);                 // 前襟金邊
  p.px(6, 4, P.rimCool);
}, { kira: true });
defineIcon('equip_swift_ring', '#5a4a1a', (p) => { p.glow(8, 4, 5, P.shardL, 0.24, 3); ring(p, P.gold, P.shardL); });
defineIcon('equip_vamp_amulet', P.blood, (p) => {
  // gold chain + glowing blood gem pendant
  p.line(5, 3, 8, 7, P.goldD); p.line(5, 3, 8, 7, P.gold);
  p.line(11, 3, 8, 7, P.goldD); p.line(11, 3, 8, 7, P.gold);
  p.px(5, 3, P.goldL); p.px(11, 3, P.goldL);
  p.glow(8, 9, 4, P.redL, 0.5, 4);
  sym.drop(p, P.red);
  p.ellipse(8, 9, 1, 1.4, P.redL);
  p.px(7, 8, P.white);
  p.star4(8, 9, 2, P.sakuraL, P.glint);
}, { kira: true });

export const CONTENT_ICONS_READY = true;
