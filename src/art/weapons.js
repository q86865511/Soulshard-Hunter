// Weapon icons + projectile / fx sprites for the auto-fire weapon system.
// ENHANCED EDITION (art_v2): projectile orbs now GLOW (soft radial halo + a hot
// white core + a top-left catch-light), the orbiting blade GLEAMS (sheen + edge
// glint + motion sparkle), and the 16x16 weapon icons are flashy — neon edges,
// energy trails, kira-stars and pulsing auras. Names, dimensions, anchors and the
// WEAPON_ART_READY export are all preserved as strict drop-in contracts.
import { defineSprite } from '../engine/sprites.js';
import { defineIcon, sym } from './icons.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ---- projectile orbs (recolours) -------------------------------------------
// Anime energy-bolt: outer glow halo, saturated body, lit top-left arc, blazing
// white core + catch-light, and a tiny trailing spark for "in-flight" punch.
function orb(p, c, cl, accent) {
  const hot = accent || lighten(cl, 0.45);
  // soft radial glow halo (reads as light, not a hard disc)
  p.glow(4, 4, 3.4, hot, 0.5, 4);
  p.glow(4, 4, 2.2, cl, 0.6, 3);
  // body — vertical tonal falloff (lit top, deeper bottom)
  p.ellipse(4, 4, 2.6, 2.6, c);
  p.ellipse(4, 4, 2.6, 2.0, mix(c, cl, 0.35));
  // inner energy
  p.ellipse(4, 4, 1.6, 1.6, cl);
  p.ellipse(4, 4, 1.0, 1.0, lighten(cl, 0.3));
  // top-left lit rim arc + bottom-right shade for volume
  p.px(2, 2, lighten(cl, 0.5));
  p.px(3, 2, lighten(cl, 0.35));
  p.px(2, 3, lighten(cl, 0.35));
  p.px(6, 6, darken(c, 0.22));
  p.px(5, 6, darken(c, 0.12));
  // blazing white core + specular catch-light
  p.px(4, 4, P.white);
  p.px(3, 3, P.glint);
  // faint trailing motion spark (top-left, where it "came from")
  p.px(1, 1, withAlpha(hot, 0.7));
}
defineSprite('bolt_fire', 8, 8, (p) => orb(p, darken(P.ember, 0.2), P.emberL, P.holy), { anchor: [4, 4] });
defineSprite('bolt_ice', 8, 8, (p) => orb(p, P.iceD, P.ice, P.hiSky), { anchor: [4, 4] });
defineSprite('bolt_volt', 8, 8, (p) => orb(p, P.goldD, P.emberL, P.holyL), { anchor: [4, 4] });
defineSprite('bolt_void', 8, 8, (p) => orb(p, P.purpleD, P.purpleL, P.magentaL), { anchor: [4, 4] });

// ---- orbiting blade fx -----------------------------------------------------
// A crescent of light: gradient body, bright leading spine, a travelling gleam
// highlight and a kira-spark at the tip so the spin reads as motion.
defineSprite('fx_blade', 8, 10, (p) => {
  // soft halo behind the blade so it glows as it orbits
  p.glow(4, 5, 3.2, P.shardL, 0.4, 3);
  for (let y = 0; y < 10; y++) {
    const w = y < 5 ? 0.6 + y * 0.5 : 0.6 + (9 - y) * 0.5;
    // top half catches the light, bottom half cools into shard tone
    const body = y < 4 ? P.shardL : (y < 7 ? P.shard : darken(P.shard, 0.15));
    p.hline(4 - w, 3 + w, y, body);
  }
  // bright leading spine + a hot gleam streak along the cutting edge
  p.vline(0, 9, 4, P.white);
  p.px(4, 2, P.glint);
  p.px(4, 7, lighten(P.shardL, 0.3));
  p.px(5, 3, withAlpha(P.shardL, 0.8));
  p.px(5, 6, withAlpha(P.shardL, 0.6));
  // kira spark at the tip — sells the slash
  p.star4(4, 1, 2, P.shardL, P.white);
  p.outline(P.ink);
}, { anchor: [4, 5] });

// ---- weapon icons ----------------------------------------------------------
// Each icon commits to a top-left light, a glowing focal point and a neon/energy
// accent for "anime weapon UI" pop. Icon panel + final ink outline come from the
// shared defineIcon wrapper.
//
// R28 (ART-06): the kira glint is no longer automatic — it marks 稀有以上 only,
// so it is passed here per weapon from the tier in content/weapons.js
// (w_soulbolt / w_fan are tier 1 = 普通 and deliberately have none).

// A diamond bolt head — the weapon dialect's "射出" shape, lit from the top-left.
function boltHead(p, cx, cy, r, col) {
  const dk = darken(col, 0.42), lt = lighten(col, 0.45);
  const dia = (x, y, rr, c) => { for (let d = -rr; d <= rr; d++) { const w = rr - Math.abs(d); p.hline(x - w, x + w, y + d, c); } };
  dia(cx, cy, r, col);
  if (r >= 2) { dia(cx + 1, cy + 1, r - 2, dk); dia(cx - 1, cy - 1, r - 2, lt); }
  p.px(cx - 1, cy - 1, P.white);
}

// BASE 魂晶彈 — one bolt, one trail, no ring. Reads as a single shot.
defineIcon('weapon_w_soulbolt', P.shardD, (p) => {
  p.glow(10, 5, 2.6, P.shard, 0.18, 3);
  // 分離的速度虛線（不接觸彈體，動勢才讀得出來，不會併成一塊大結晶）
  p.line(7, 9, 8, 8, P.shardL); p.line(6, 10, 7, 9, darken(P.shard, 0.2));
  p.line(4, 12, 5, 11, P.shard); p.line(3, 13, 4, 12, darken(P.shard, 0.3));
  boltHead(p, 10, 5, 2, P.shard);
  p.line(12, 2, 13, 1, P.shardL);                   // 破空短線
});

// R28 W3-B-rework — 鐵律（ART_SPEC 第 5 節）：類別文法（斜切框、動勢提示）只活在
// 「框」與次要提示上；glyph 必須畫出「那一把武器本身」，同類別內任兩張的輪廓不得
// 雷同。上一批把 43 支武器全畫成「一根斜桿加一顆色頭」被整批退回——所以這裡每一張
// 都是一件可命名的實物：折扇／刃輪／鏈鞭／共鳴鐘／追蹤火箭／雷杖…
// 已通過驗收的 w_soulbolt / w_soulstorm / w_aura / w_inferno 的 draw body 不動，
// 作為本批的畫風基準。

// 魂焰扇 — 一把攤開的折扇：實心扇面＋五根扇骨＋樞紐鉚釘，扇緣舔著火舌。
// 樞紐在下緣、扇面是連續實體，所以輪廓是「扇形」而不是三根放射斜桿。
defineIcon('weapon_w_fan', '#5a3a1a', (p) => {   // R28 B-rework
  p.glow(8, 9, 5.5, P.ember, 0.2, 3);
  const PX = 8, PY = 13.5;
  const at = (a, r) => [PX + Math.cos(a * Math.PI / 180) * r, PY + Math.sin(a * Math.PI / 180) * r];
  for (let a = -150; a <= -30; a += 1.1) {          // 扇面：整片都是亮紙色，才讀得出「一片扇」
    for (let r = 2; r <= 7.4; r += 0.3) {
      const [x, y] = at(a, r);
      p.px(Math.round(x), Math.round(y), r > 7.1 ? P.ember : (r > 6.4 ? P.emberL : (r < 3 ? darken(P.bone, 0.18) : P.bone)));
    }
  }
  for (const a of [-110, -70]) {                    // 兩根扇骨（淺褐，深色會把 5px 高的扇面切成條紋）
    const [x0, y0] = at(a, 2.6), [x1, y1] = at(a, 5.2);
    p.line(x0, y0, x1, y1, darken(P.bone, 0.45));
  }
  for (const a of [-150, -30]) {                    // 兩端主骨（外框，深色壓邊）
    const [x0, y0] = at(a, 2), [x1, y1] = at(a, 7.2);
    p.line(x0, y0, x1, y1, P.woodD);
  }
  for (let i = 0; i < 3; i++) {                     // 扇緣火舌（貼著扇緣，短而細）
    const a = -122 + i * 32;
    const [x0, y0] = at(a, 7.4), [x1, y1] = at(a, 8.6);
    p.line(x0, y0, x1, y1, P.ember);
    p.px(Math.round(x1), Math.round(y1), P.emberL);
  }
  p.ellipse(PX, PY, 1.7, 1.7, P.woodD);             // 樞紐鉚釘
  p.ellipse(PX, PY - 0.4, 0.9, 0.9, P.gold); p.px(8, 13, P.goldL);
});

// 環衛刃 — 一具三葉刃輪：中央魂晶轂＋三片後掠的鐮形葉刃。
// 刻意不畫外軌道環（環是 g_halo／g_blackhole 的語彙），輪廓完全由葉片撐起。
defineIcon('weapon_w_orbit', P.shardD, (p) => {   // R28 B-rework
  p.glow(8, 8, 5, P.shard, 0.22, 3);
  for (let i = 0; i < 3; i++) {
    const base = -100 + i * 120;
    for (let k = 0; k <= 16; k++) {
      const f = k / 16;
      const r = 2.3 + f * 4.4;
      const t = (base + f * 66) * Math.PI / 180;      // 後掠 66°：讀得出是彎鐮不是直輻
      const cx = 8 + Math.cos(t) * r, cy = 8 + Math.sin(t) * r;
      const hw = 2 * (1 - f) + 0.2;                   // 葉根寬、葉尖收
      const nx = -Math.sin(t), ny = Math.cos(t);
      for (let s = -hw; s <= hw; s += 0.45) p.px(Math.round(cx + nx * s), Math.round(cy + ny * s), s < -hw * 0.35 ? P.shard : P.shardD);
      p.px(Math.round(cx - nx * hw), Math.round(cy - ny * hw), f > 0.75 ? P.white : P.shardL);   // 前緣刃線
    }
  }
  p.ellipse(8, 8, 2.6, 2.6, darken(P.shardD, 0.4));   // 轂
  p.ellipse(8, 8, 1.8, 1.8, P.shard);
  p.ellipse(7.4, 7.4, 1, 1, P.shardL); p.px(7, 7, P.white);
});

// BASE 灼蝕光環 — ONE broken sweep arc (open toward the lower-left) around a
// single ember core. The old version was concentric rings, i.e. the same
// composition as w_inferno with a different hue — the ART-06 complaint itself.
defineIcon('weapon_w_aura', '#5a2a1a', (p) => {
  p.glow(8, 8, 5.5, withWarm(P.ember, 0), 0.3, 4);
  for (let a = -150; a <= 60; a += 6) {
    const t = a * Math.PI / 180;
    p.px(Math.round(8 + Math.cos(t) * 5.2), Math.round(8 + Math.sin(t) * 5.2), a < -100 ? withAlpha(P.ember, 0.5) : P.emberL);
    p.px(Math.round(8 + Math.cos(t) * 4.3), Math.round(8 + Math.sin(t) * 4.3), withAlpha(P.ember, 0.75));
  }
  p.ellipse(8, 8, 2.2, 2.2, P.ember);
  p.ellipse(7.5, 7.5, 1.3, 1.3, P.holyL);
  p.px(7, 7, P.white);
});

// 魂鞭 — 一條鏈鞭：纏皮握柄＋金護環＋四節魂晶鏈環＋末端的帶刺鎚頭。
// 節狀鏈環（一顆顆帶孔的環）是全套武器裡唯一的「鎖鏈」語彙，
// 與 w_soulbolt 的速度虛線、w_homing 的軌跡完全不同。
defineIcon('weapon_w_whip', P.shardD, (p) => {   // R28 B-rework
  p.glow(12, 4, 3.5, P.shardL, 0.28, 3);
  p.line(2, 14, 5, 11, P.woodD); p.line(3, 14, 6, 11, P.wood);   // 握柄
  p.px(2, 14, P.goldD); p.px(3, 13, P.leather); p.px(4, 12, P.leather);
  p.ellipse(5.6, 10.6, 1.6, 1.6, P.goldD);                        // 護環
  p.ellipse(5.4, 10.4, 0.9, 0.9, P.gold); p.px(5, 10, P.goldL);
  const links = [[7, 9], [8.6, 7.4], [10.1, 5.9], [11.4, 4.7]];   // 鏈環
  for (let i = 0; i < links.length; i++) {
    const [x, y] = links[i];
    p.ellipse(x, y, 1.6, 1.6, i > 1 ? P.shard : P.shardD);
    p.ellipse(x, y, 0.75, 0.75, P.ink2);
    p.px(Math.round(x - 1), Math.round(y - 1), P.shardL);
  }
  p.ellipse(13, 3, 2, 2, P.iron);                                 // 帶刺鎚頭
  p.ellipse(12.6, 2.6, 1.1, 1.1, P.steelL);
  p.px(13, 1, P.steel); p.px(11, 2, P.steel); p.px(14, 4, P.steel); p.px(13, 5, P.steel);
  p.px(12, 2, P.white);
});

// 震爆波 — 一口共鳴鐘：吊冠環＋梯形鐘身＋外撇鐘唇＋鐘舌，兩側各兩道震波弧。
// 弧線只是次要提示，主體是鐘（梯形＋唇），不是 w_aura／w_nova 舊版的同心圓。
defineIcon('weapon_w_nova', P.purpleD, (p) => {   // R28 B-rework
  p.glow(8, 8, 6, P.mana, 0.24, 4);
  for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {          // 側向震波弧
    const r = 6 + i * 1.7;
    for (let a = -34; a <= 34; a += 7) {
      const t = a * Math.PI / 180;
      p.px(Math.round(8 + s * Math.cos(t) * r), Math.round(9 + Math.sin(t) * r), withAlpha(P.astralL, i ? 0.4 : 0.7));
    }
  }
  p.vline(2, 3, 8, P.goldD); p.ring(8, 2, 1.3, P.gold);           // 吊冠環
  for (let y = 4; y <= 11; y++) {                                 // 鐘身（梯形）
    const w = 1.5 + (y - 4) * 0.52;
    p.hline(8 - w, 7 + w, y, P.goldD);
    p.hline(8 - w, 8 - w + 1, y, P.gold);
  }
  p.vline(5, 10, 6, P.goldL); p.px(6, 5, P.white);                // 左受光面
  p.vline(6, 11, 10, darken(P.goldD, 0.3));
  p.hline(2, 13, 11, P.goldL); p.hline(2, 13, 12, P.gold);        // 外撇鐘唇
  p.hline(3, 12, 13, darken(P.goldD, 0.35));
  p.ellipse(8, 14, 1.2, 1.1, P.bronze); p.px(8, 13, P.goldL);     // 鐘舌
});

// 追魂彈 — 一枚追蹤火箭：垂直升空後折向右上的「彎折彈體」，
// 尾端三片尾翼＋噴焰。彎折的本體本身就是「追蹤」，所以它不是一根直斜桿。
defineIcon('weapon_w_homing', P.purpleD, (p) => {   // R28 B-rework
  p.glow(11, 5, 4, P.mana, 0.3, 3);
  p.line(6, 13, 7, 8, P.gray2); p.line(7, 13, 8, 8, P.gray3);     // 直段彈體
  p.line(8, 13, 9, 8, darken(P.gray2, 0.3));
  p.line(7, 8, 11, 5, P.gray3); p.line(8, 9, 12, 6, P.gray2);     // 折向右上的斜段
  p.line(7, 7, 11, 4, P.steelL);
  p.hline(6, 8, 11, P.purpleL); p.hline(6, 8, 10, P.purpleD);     // 彈體束環
  p.line(11, 4, 13, 3, P.magenta); p.line(11, 5, 13, 4, P.laser); // 錐形彈頭
  p.px(13, 3, P.white);
  p.line(5, 12, 7, 14, P.purpleD); p.line(9, 12, 7, 14, P.purpleD);  // 三片尾翼
  p.line(4, 11, 6, 13, P.purple); p.line(10, 11, 8, 13, P.purple);
  p.ellipse(7, 14, 1.4, 1, P.astral); p.px(7, 14, P.astralL);      // 噴焰
  p.px(6, 13, P.holyL);
});

// 連鎖閃電 — 一把雷杖：纏繩杖身＋杖尾箍＋頂端三爪避雷叉夾住一顆雷石，
// 電弧自爪間跳向左右兩處（＝「連鎖」的次要動勢，主體仍是那把杖）。
defineIcon('weapon_w_lightning', '#5a4a1a', (p) => {   // R28 B-rework
  p.glow(8, 5, 4.5, P.holy, 0.24, 3);
  // 杖身：冷色鐵桿（在暖棕框上跳得出來）＋三道金束環
  p.vline(6, 14, 7, P.gray1); p.vline(6, 14, 8, P.iron); p.vline(6, 14, 9, darken(P.gray1, 0.4));
  p.px(7, 6, P.gray4); p.px(7, 9, P.gray3);
  for (const y of [8, 11, 14]) { p.hline(6, 10, y, P.goldD); p.px(6, y, P.gold); }
  p.line(7, 6, 4, 2, P.gray2); p.vline(1, 6, 8, P.gray3); p.line(9, 6, 12, 2, P.gray2);   // 三爪避雷叉
  p.line(7, 5, 5, 2, P.gray4); p.line(9, 5, 11, 2, P.gray4);
  p.px(4, 2, P.steelL); p.px(8, 1, P.steelL); p.px(12, 2, P.steelL);
  p.ellipse(8, 5, 2, 2, P.goldD);                                 // 爪中雷石
  p.ellipse(7.8, 4.8, 1.2, 1.2, P.emberL); p.px(7, 4, P.white);
  p.line(6, 5, 3, 7, P.holyL); p.px(4, 6, P.emberL); p.px(3, 7, P.white);   // 連鎖電弧
  p.line(10, 5, 13, 7, P.holyL); p.px(12, 6, P.emberL); p.px(13, 7, P.white);
});

// EVO of w_soulbolt — the base bolt PLUS a second layer of shape (a containment
// 光環 + two 裂變 sub-bolts), not just a recolour, per ART_SPEC 第 5 節.
defineIcon('weapon_w_soulstorm', P.shardD, (p) => {
  p.glow(8, 8, 2.6, P.shard, 0.18, 3);
  p.ring(8, 8, 5.2, P.shardL);                      // 第二層：環繞光環
  p.ring(8, 8, 4.4, darken(P.shard, 0.4));
  boltHead(p, 8, 8, 2, P.shardL);                   // 主彈（與 base 同語彙）
  // 第二層：四枚裂變副彈環繞主彈
  boltHead(p, 8, 2, 1, P.shard); boltHead(p, 8, 14, 1, P.shard);
  boltHead(p, 2, 8, 1, P.shard); boltHead(p, 14, 8, 1, P.shard);
}, { kira: true });

// EVO of w_aura — keeps the sweep arc, then adds the second layer: six outward
// flame 角 breaking the silhouette, and a 裂變 three-lobed core.
defineIcon('weapon_w_inferno', '#5a1a1a', (p) => {
  p.glow(8, 8, 6.5, P.red, 0.34, 4);
  // 第二層：向外爆出的火焰角（進 silhouette，32x32 下一眼與 base 分開）
  for (let i = 0; i < 6; i++) {
    const t = (-150 + i * 40) * Math.PI / 180;
    p.line(8 + Math.cos(t) * 4, 8 + Math.sin(t) * 4, 8 + Math.cos(t) * 5.8, 8 + Math.sin(t) * 5.8, i % 2 ? P.ember : P.emberL);
    p.px(Math.round(8 + Math.cos(t) * 5.8), Math.round(8 + Math.sin(t) * 5.8), P.holyL);
  }
  // 掃擊弧（與 base 同語彙，但雙層且更熱）
  for (let a = -150; a <= 60; a += 6) {
    const t = a * Math.PI / 180;
    p.px(Math.round(8 + Math.cos(t) * 4.4), Math.round(8 + Math.sin(t) * 4.4), P.laser);
    p.px(Math.round(8 + Math.cos(t) * 3.5), Math.round(8 + Math.sin(t) * 3.5), withAlpha(P.emberL, 0.8));
  }
  // 裂變核心：三瓣而非單一圓核
  for (let i = 0; i < 3; i++) {
    const t = (-90 + i * 120) * Math.PI / 180;
    p.ellipse(8 + Math.cos(t) * 1.3, 8 + Math.sin(t) * 1.3, 1.2, 1.2, P.holyL);
  }
  p.ellipse(8, 8, 1.1, 1.1, P.white);
}, { kira: true });

// Optional warm-trim hook for aura rings; identity by default (kept from the
// original so weapon_w_aura's call shape is unchanged). Accepts an optional
// blend amount toward holy warmth for future use.
function withWarm(c, amt = 0) { return amt > 0 ? tint(c, P.holy, amt) : c; }

export const WEAPON_ART_READY = true;
