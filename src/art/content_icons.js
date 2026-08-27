// Icons for core talents / facilities / items / equipment.
// ENHANCED EDITION (art_v2): same names / sizes / anchors / exports as the
// original — every defineIcon key is a hard contract.
//
// R28 W3-B-rework-B — 鐵律（ART_SPEC 第 5 節）：類別文法只活在「框」上（道具＝
// 直角＋底座線、裝備＝方肩框、天賦＝上尖飾、設施＝底寬梯形飾，全部由 icons.js 的
// panel() 統一處理）。glyph 必須畫「那一件具體的東西」，而且**同類別內任兩個 glyph
// 的輪廓不得雷同**。前一批把裝備全畫成「斜桿加色頭」、設施全畫成「道具擺設」被整批
// 退回，所以這一版每一張都先在計畫表上寫死「這畫的是什麼」再動筆：
//   道具  瓶（方肩直筒）／葫蘆／球形炸彈／卷軸／錐形燒瓶／符牌   ← 六種不同容器
//   裝備  橫棒魔棒／喇叭口銃杖／球頭重杖／皮背心／兜帽長袍／指環／獸牙吊墜
//   天賦  盾紋章／束箭／裂紋菱寶／樹／鱗甲肩／彎月／旗／羅盤／沙漏／金錠堆／星／書
//   設施  尖頂神龕／平頂拱門金庫／煙囪鍛爐／寬簷道場／Π 形巨石祭壇／雉堞方塔
// `sym.*`（通用符號庫）**刻意不再 import**：它正是「同輪廓不同色」的來源。
import { defineIcon } from './icons.js';
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
// W3-B-rework-B: flask() is now the 治療藥水 ALONE — 大型藥水（葫蘆）與狂熱藥劑
// （錐形燒瓶）各自有專屬瓶型，三瓶不再共用同一個輪廓。
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
// 石造建築的三階台基（設施框的 底寬梯形 就是為它畫的）。每個設施都踩在自己的
// 地基上——這是 ART_SPEC「建築剪影＋地基」文法裡「地基」那一半。
function footing(p, cap, mid, low) {
  p.rect(1, 12, 14, 1, cap);
  p.rect(0, 13, 16, 1, mid);
  p.rect(0, 14, 16, 1, low);
}

// ---- talents ---------------------------------------------------------------
// R28 W3-B-rework-B: 天賦 12 張＝12 個不同的可命名實體，沒有一張是「圓底板＋小記號」。
// 撞形自查（16px）：盾(上寬下尖) / 束箭(上三尖下束) / 菱寶(菱形) / 樹(球冠細幹) /
// 鱗甲肩(上凸弧下橫帶) / 彎月(C 形) / 旗(左豎桿右波浪) / 羅盤(正圓＋提環) /
// 沙漏(中央收腰的 X) / 金錠堆(方角階梯) / 星(五芒) / 書(攤開的寬扁雙頁)。
// 天賦沒有 tier 欄位 → 一律不傳 kira，也不在 body 內放 star4（那會被誤讀成 kira）。
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
// 連射＝一束三支羽箭（上端三個箭簇分開、中段收攏、下端束帶＋尾羽）。
defineIcon('talent_t_firerate', P.blood, (p) => {
  p.glow(8, 8, 5.5, P.ember, 0.22, 3);
  // 三支**分離**的直立箭矢（中間高、兩側低）。箭與箭之間留 3px 空隙——
  // 桿連成一片就會讀成「桌腳/華蓋」，那是上一版被退回的樣子。
  const arrow = (cx, top) => {
    p.px(cx, top, P.white);                               // 簇尖
    p.hline(cx - 1, cx + 1, top + 1, P.steelL);
    p.hline(cx - 2, cx + 2, top + 2, P.steel);
    p.px(cx - 2, top + 2, P.white); p.px(cx + 2, top + 2, P.iron);
    p.vline(top + 3, 10, cx, P.woodL);                    // 桿（亮）
    p.vline(top + 3, 10, cx + 1, P.barkD);                // 桿（暗）
    p.line(cx, 11, cx - 2, 13, P.red);                    // 尾羽
    p.line(cx + 1, 11, cx + 3, 13, P.redD);
    p.px(cx - 2, 13, P.redL);
  };
  arrow(3, 4); arrow(12, 4); arrow(7, 2);
  p.hline(2, 13, 10, P.woodD);                            // 束帶
  p.hline(2, 13, 9, P.leather); p.px(2, 9, lighten(P.leather, 0.4));
  p.px(5, 10, P.goldL); p.px(10, 10, P.gold);             // 束帶銅釘
});
// 致命＝一顆被打裂的菱形紅寶石（弱點），裂縫呈閃電狀、右上崩出三塊碎屑。
defineIcon('talent_t_crit', P.blood, (p) => {
  p.glow(8, 8, 6, P.redL, 0.24, 3);
  for (let y = 3; y <= 13; y++) {                         // 大菱形
    const t = y <= 8 ? (y - 3) / 5 : (13 - y) / 5;
    const w = 0.6 + t * 5.2;
    p.hline(8 - w, 7 + w, y, y <= 8 ? mix(P.redL, P.red, (y - 3) / 5) : mix(P.red, P.blood, (y - 8) / 5));
  }
  for (let y = 4; y <= 8; y++) {                          // 左上受光刻面
    const w = 0.4 + (y - 3) / 5 * 4.2;
    p.hline(8 - w, 7.5 - w * 0.35, y, lighten(P.redL, 0.28));
  }
  p.line(3, 8, 8, 3, P.redL); p.line(12, 8, 8, 3, darken(P.blood, 0.2)); // 刻面稜
  p.line(3, 8, 8, 13, mix(P.red, P.blood, 0.5));
  p.line(9, 4, 7, 8, P.white); p.line(7, 8, 10, 11, P.white);            // 暴擊裂縫
  p.px(8, 8, P.glint);
  p.px(12, 2, P.redL); p.px(13, 4, P.red); p.px(14, 3, withAlpha(P.redL, 0.7)); // 崩屑
  p.px(5, 5, P.rim);
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
// 護甲＝一片弧頂的鱗甲護肩（三排錯位鱗片）壓在鉚釘皮帶上。
defineIcon('talent_t_armor', P.blueD, (p) => {
  p.glow(8, 8, 5, P.rimCool, 0.16, 3);
  // 護肩＝三片由大到小、層層相疊的圓弧甲片（pauldron）。用同心弧而不是水平橫條，
  // 橫條在 16px 會讀成「屋簷」。
  const lame = [[8.6, 6.2, 4.4], [6.6, 5.0, 3.4], [4.6, 3.6, 2.6]];
  for (let r = 0; r < lame.length; r++) {
    const [cy, rx, ry] = lame[r];
    p.ellipse(8, cy, rx, ry, P.ink2);                     // 甲片暗邊
    p.ellipse(8, cy - 0.4, rx - 0.9, ry - 0.9, mix(P.steelD, lighten(P.steel, 0.4), r / 2));
    p.ellipse(7.2 - r * 0.2, cy - 1.2, (rx - 0.9) * 0.55, (ry - 0.9) * 0.45, mix(P.steel, P.white, 0.25 + r * 0.2));
  }
  p.px(6, 3, P.white); p.px(5, 5, P.glint);               // 左上受光
  p.px(10, 9, darken(P.steelD, 0.3));
  p.rect(2, 11, 12, 2, P.woodD);                          // 鉚釘皮帶
  p.hline(2, 13, 11, P.wood);
  p.px(4, 12, P.goldL); p.px(8, 12, P.gold); p.px(12, 12, P.goldD);
  p.hline(3, 12, 13, darken(P.woodD, 0.45));
});
// 回復＝一輪彎月（盈虧＝再生）抱著一滴翠綠甘露。
defineIcon('talent_t_regen', P.blueD, (p) => {
  p.glow(6, 8, 6, P.hiSky, 0.2, 3);
  // 外圓 r=5.5@x8 減去 r=6.2@x11.4 的內圓 —— 內圓半徑刻意大於外圓，兩端才收成尖角
  for (let y = 3; y <= 13; y++) {
    const dy = y - 8;
    const ro = Math.sqrt(Math.max(0, 5.5 * 5.5 - dy * dy));
    if (ro <= 0.6) continue;
    const ri = Math.sqrt(Math.max(0, 6.2 * 6.2 - dy * dy));
    const xL = 8 - ro;
    let xR = ri > 0 ? 11.4 - ri : 8 + ro;
    if (xR > 8 + ro) xR = 8 + ro;
    if (xR < xL) continue;
    const t = Math.abs(dy) / 5.5;
    p.hline(xL, xR, y, mix(P.hiSky, P.steelD, t * 0.9));
    p.px(Math.round(xL), y, t < 0.6 ? P.white : P.gray4);   // 受光外緣
    p.px(Math.round(xR), y, darken(P.steelD, 0.35));        // 內緣暗邊
  }
  p.px(4, 6, P.glint); p.px(3, 8, P.white);
  p.ellipse(10, 9, 1.7, 2.1, P.leafD);                      // 甘露
  p.ellipse(10, 9.3, 1.2, 1.5, P.green);
  p.px(10, 6, P.leaf); p.px(10, 7, P.leafL);                // 露珠尖
  p.px(9, 8, P.toxic); p.px(10, 8, P.white);
});
// 敏捷＝迎風飄動的戰旗（左豎桿＋右側波浪旗面）。旗面用高明度綠、桿用暗棕，
// 靠「值階」而非色相和深綠底板拉開。
defineIcon('talent_t_speed', P.greenD, (p) => {
  p.glow(10, 6, 5.5, P.toxic, 0.2, 3);
  p.px(6, 1, P.goldL); p.px(6, 2, P.gold);                 // 桿頂銅球
  p.rect(5, 2, 2, 13, P.barkD); p.vline(2, 14, 5, P.bark); // 旗桿（暗）
  const rows = [[7, 14], [7, 14], [7, 13], [7, 11], [7, 9], [7, 8]];
  for (let i = 0; i < rows.length; i++) {                  // 旗面（右尖三角）
    const y = 3 + i;
    p.hline(rows[i][0], rows[i][1], y, P.leafD);           // 暗底＝斜邊
    p.hline(rows[i][0], rows[i][1] - 1, y, i % 2 ? P.greenL : P.toxic);
  }
  p.vline(3, 8, 7, lighten(P.toxic, 0.4));                 // 貼桿受光邊
  p.line(11, 3, 12, 5, P.leafD); p.px(13, 4, P.leafD);     // 布褶
  p.px(14, 3, P.greenL); p.px(8, 8, P.leafD);
  p.hline(3, 8, 14, P.gray2); p.hline(4, 7, 13, P.gray3);  // 旗座
  p.px(4, 13, P.gray4);
});
// 感知＝黃銅羅盤（外殼＋刻度盤＋指向左上的磁針＋頂部提環）。
defineIcon('talent_t_pickup', P.greenD, (p) => {
  p.glow(8, 8, 5.5, P.toxic, 0.16, 3);
  p.hline(7, 8, 2, P.gray3); p.px(7, 3, P.gray4); p.px(8, 3, P.gray2); // 提環
  p.ellipse(8, 8, 5.8, 5.8, P.goldD);                     // 銅殼
  p.ellipse(8, 8, 5.1, 5.1, P.gold);
  p.ellipse(7.2, 7.2, 3.6, 3.6, P.goldL);                 // 左上受光
  p.ellipse(8, 8, 4.3, 4.3, P.ink2);                      // 盤面
  p.ellipse(8, 8, 3.8, 3.8, P.blueD);
  for (let k = 0; k < 8; k++) {                            // 刻度
    const a = k * Math.PI / 4;
    p.px(Math.round(8 + Math.cos(a) * 3.2), Math.round(8 + Math.sin(a) * 3.2), k % 2 ? P.gray3 : P.bone);
  }
  p.line(11, 11, 8, 8, P.steelL);                          // 磁針（南）
  p.line(5, 5, 8, 8, P.red); p.px(5, 5, P.redL);           // 磁針（北，指左上光源）
  p.ellipse(8, 8, 1.1, 1.1, P.goldL); p.px(8, 8, P.white); // 軸心
  p.px(4, 6, P.holyL);
});
// 疾走＝沙漏（冷卻縮短）。上下木框＋中央收腰的玻璃＋落下的金沙。
defineIcon('talent_t_dash', P.greenD, (p) => {
  p.glow(8, 8, 5, P.toxic, 0.16, 3);
  p.rect(3, 3, 10, 2, P.wood); p.hline(3, 12, 3, P.woodL); // 上框
  p.rect(3, 12, 10, 2, P.woodD); p.hline(3, 12, 12, P.wood); // 下框
  p.vline(5, 11, 3, P.woodD); p.vline(5, 11, 12, darken(P.woodD, 0.3)); // 立柱
  for (let y = 5; y <= 11; y++) {                          // 玻璃（X 形）
    const t = y <= 8 ? (8 - y) / 3 : (y - 8) / 3;
    const w = 0.7 + t * 3.3;
    p.hline(8 - w, 7 + w, y, y < 8 ? P.gray2 : P.gray1);
    p.px(Math.round(8 - w), y, P.gray4);
  }
  p.hline(5, 10, 5, P.gold); p.hline(6, 9, 6, P.goldD);    // 上半殘沙
  p.vline(7, 10, 8, P.goldL);                              // 落沙細流
  p.hline(6, 9, 10, P.goldD); p.hline(5, 10, 11, P.gold);  // 下半沙堆
  p.px(6, 11, P.goldL); p.px(9, 11, P.goldD);
  p.px(4, 4, P.rim); p.px(6, 5, P.holyL);
});
// 財運＝一口鑲金包邊的寶箱（弧形蓋＋鎖扣＋滿出來的金幣）。
// 原案的「三層金錠金字塔」在 32px 並排時與 t_armor 的疊層甲片同為階梯錐形，
// 依 ART_SPEC 第 5 節鐵律改掉其中一個 —— 換的是這張。
defineIcon('talent_t_gold', '#5a4a1a', (p) => {
  p.glow(8, 8, 6, P.goldL, 0.22, 3);
  p.px(6, 2, P.gold); p.px(9, 2, P.goldL); p.px(7, 1, P.goldL); // 冒出蓋外的金幣
  const lid = [[6, 9], [4, 11], [3, 12], [3, 12]];
  for (let i = 0; i < lid.length; i++) {                   // 弧形箱蓋
    const y = 3 + i;
    p.hline(lid[i][0], lid[i][1], y, P.barkD);
    p.hline(lid[i][0] + 1, lid[i][1] - 1, y, mix(P.woodL, P.wood, i / 3));
  }
  p.hline(3, 12, 7, P.goldD); p.hline(3, 12, 6, P.gold);   // 蓋緣金條
  p.px(3, 6, P.goldL); p.px(12, 7, darken(P.goldD, 0.4));
  for (let y = 8; y <= 13; y++) {                          // 箱體
    p.hline(3, 12, y, P.barkD);
    p.hline(4, 11, y, mix(P.wood, P.woodD, (y - 8) / 5));
  }
  p.vline(8, 13, 4, P.gold); p.vline(8, 13, 11, P.goldD);  // 側包邊
  p.hline(3, 12, 13, P.goldD); p.px(3, 13, P.gold);        // 底金條
  p.rect(7, 6, 2, 4, P.goldL); p.px(8, 8, P.goldD); p.px(7, 6, P.white); // 鎖扣
  p.px(5, 9, P.woodL); p.px(10, 11, darken(P.woodD, 0.4));
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
// 頓悟＝攤開的典籍（雙頁＋中縫書脊＋頁緣厚度），上方浮起三點符文。
defineIcon('talent_t_xp', '#5a4a1a', (p) => {
  p.glow(8, 5, 5, P.shardL, 0.2, 3);
  p.px(6, 3, P.shard); p.px(8, 2, P.shardL); p.px(10, 3, P.shard);  // 浮起的符文
  p.px(8, 3, withAlpha(P.shardL, 0.6));
  const rows = [[6, 9], [4, 11], [3, 12], [2, 13], [2, 13], [2, 13], [2, 13]];
  for (let i = 0; i < rows.length; i++) {                  // 攤開的雙頁
    const y = 5 + i;
    p.hline(rows[i][0], rows[i][1], y, darken(P.bone, 0.55));      // 頁緣暗邊
    p.hline(rows[i][0] + 1, rows[i][1] - 1, y, mix(P.white, darken(P.bone, 0.12), i / 6));
  }
  p.hline(2, 13, 12, darken(P.bone, 0.5));                 // 頁緣厚度
  p.hline(3, 12, 13, darken(P.bone, 0.7));                 // 書底陰影
  p.vline(5, 13, 7, P.barkD); p.vline(5, 13, 8, P.wood);   // 書脊
  p.hline(4, 6, 9, withAlpha(P.shardD, 0.9));              // 內文（兩行就好）
  p.hline(9, 11, 9, withAlpha(P.shardD, 0.75));
  p.px(3, 6, P.white); p.px(4, 5, P.glint);                // 左上受光頁角
  p.px(13, 11, darken(P.bone, 0.6));
});

// ---- facilities ------------------------------------------------------------
// R28 W3-B-rework-B: 設施 6 張＝6 座**外形不同的建築**，全部踩在 footing() 的地基上。
// 撞形自查（16px）：神龕(窄尖塔＋雙柱鏤空) / 金庫(平頂厚牆＋大圓拱門) /
// 鍛造爐(左偏煙囪＋斜屋身) / 道場(頂端留空＋寬簷大屋頂) / 祭壇(Π 形粗糙巨石，
// 頂端留空、中央鏤空) / 武器庫(窄高塔＋城垛齒)。
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
// 金庫＝平頂厚石牆＋一座撐滿門面的圓拱金庫門（鋼製轉盤＋金把手）。
// 舊版是「三角山牆＋列柱」，在 16px 下與神龕的尖頂只差一點寬度——同輪廓不同色，
// 依 ART_SPEC 第 5 節鐵律必須拆散，故改為平頂拱門。
defineIcon('facility_f_bank', '#5a4a1a', (p) => {
  p.hline(5, 10, 1, P.bone);                                    // 平頂女兒牆
  p.hline(5, 10, 2, darken(P.bone, 0.22));
  p.hline(4, 11, 3, P.bone); p.hline(4, 11, 4, darken(P.bone, 0.3)); // 突出簷口
  for (let y = 5; y <= 11; y++) {                               // 石牆體
    const x0 = y <= 5 ? 4 : (y <= 7 ? 3 : 2);
    p.hline(x0, 15 - x0, y, mix(darken(P.bone, 0.18), darken(P.bone, 0.5), (y - 5) / 6));
    p.px(x0, y, lighten(P.bone, 0.2));                          // 左緣受光
    p.px(15 - x0, y, darken(P.bone, 0.62));
  }
  p.hline(4, 11, 4, darken(P.bone, 0.34));
  p.hline(5, 10, 5, darken(P.bone, 0.55));                      // 拱門口上緣陰影
  for (let y = 5; y <= 11; y++) {                               // 圓拱門洞
    const w = y === 5 ? 2 : (y === 6 ? 2.8 : 3);
    p.hline(8 - w, 7 + w, y, y < 7 ? darken(P.woodD, 0.35) : P.ink2);
  }
  p.hline(6, 9, 4, darken(P.bone, 0.45));                       // 拱心石
  p.px(8, 4, P.goldD);
  p.ellipse(8, 9, 2.6, 2.6, P.steelD);                          // 保險門轉盤
  p.ellipse(8, 9, 2.0, 2.0, P.steel);
  p.ellipse(7.4, 8.4, 1.1, 1.1, P.steelL);
  p.line(6, 7, 10, 11, P.steelD); p.line(10, 7, 6, 11, P.steelD); // 輪輻
  p.glow(8, 9, 2.2, P.goldL, 0.45, 3);
  p.px(8, 9, P.goldL); p.px(7, 8, P.white);                      // 金把手
  footing(p, P.bone, P.woodD, darken(P.woodD, 0.35));
  p.px(3, 12, P.goldL); p.px(12, 12, P.gold);                    // 台階上的散幣
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
// 修練場＝東方道場：頂端刻意留空，寬簷大屋頂壓在矮屋身上，中央是格柵紙門。
defineIcon('facility_f_dojo', P.blood, (p) => {
  const roof = [[7, 8], [5, 10], [4, 11], [3, 12], [3, 12]];
  for (let i = 0; i < roof.length; i++) {                       // 屋頂（緩坡）
    const y = 3 + i;
    p.hline(roof[i][0], roof[i][1], y, mix(darken(P.blood, 0.15), darken(P.blood, 0.5), i / 4));
  }
  p.hline(7, 8, 3, P.redD);                                     // 屋脊
  p.px(3, 6, P.redL); p.px(12, 6, darken(P.blood, 0.3));        // 上翹簷角
  p.hline(3, 12, 7, P.woodD); p.hline(4, 11, 8, darken(P.woodD, 0.4)); // 簷下陰影
  p.line(5, 4, 4, 6, lighten(P.red, 0.15));                     // 屋瓦受光稜
  p.line(8, 3, 8, 6, darken(P.blood, 0.55));
  for (let y = 8; y <= 11; y++) p.hline(4, 11, y, mix(P.wood, P.woodD, (y - 8) / 3)); // 屋身
  p.vline(8, 11, 4, P.woodL); p.vline(8, 11, 11, darken(P.woodD, 0.4));
  p.rect(6, 8, 4, 4, P.bone);                                   // 紙門
  p.rect(6, 8, 4, 1, P.white);
  p.vline(8, 11, 8, darken(P.bone, 0.4)); p.hline(6, 9, 10, darken(P.bone, 0.32));
  p.px(6, 9, P.woodD); p.px(9, 9, P.woodD);
  footing(p, P.gray3, P.gray2, darken(P.gray1, 0.3));
});
// 魂晶祭壇＝三塊粗糙巨石構成的 Π 形門（頂端留空、中央鏤空），懸浮魂晶在門中。
defineIcon('facility_f_altar', P.shardD, (p) => {
  // 巨石刻意用**暗色**（gray1/gray2＋苔綠斑），與神龕的淺灰尖塔在灰階下也分得開
  p.hline(3, 12, 4, P.ink);                                     // 巨石的暗描邊
  p.hline(4, 11, 5, P.gray3); p.px(4, 5, P.gray4);              // 楣頂受光
  p.hline(3, 12, 6, P.gray1);
  p.hline(4, 11, 7, darken(P.gray1, 0.4));                      // 楣底陰影
  p.px(3, 6, darken(P.gray1, 0.3)); p.px(12, 6, darken(P.gray1, 0.55)); // 缺角（粗糙）
  p.px(10, 6, darken(P.moss, 0.3));                             // 苔痕
  for (let y = 8; y <= 11; y++) {                               // 左右立石（不規則）
    const jl = y === 9 ? 1 : 0, jr = y === 10 ? 1 : 0;
    p.hline(2 - jl, 5, y, P.ink);
    p.hline(10, 13 + jr, y, P.ink);
    p.hline(3 - jl, 5, y, mix(P.gray2, darken(P.gray1, 0.25), (y - 8) / 3));
    p.hline(10, 12 + jr, y, mix(darken(P.gray2, 0.2), darken(P.gray1, 0.4), (y - 8) / 3));
    p.px(3 - jl, y, P.gray3);                                   // 左緣受光
    p.px(12 + jr, y, darken(P.gray1, 0.6));
  }
  p.px(4, 10, darken(P.moss, 0.2));
  p.hline(6, 9, 8, P.ink); p.hline(6, 9, 9, P.ink);             // 門洞（Π 的鏤空要真的黑）
  p.hline(6, 9, 10, P.ink); p.hline(6, 9, 11, P.ink);
  p.glow(8, 9, 3.2, P.shardL, 0.32, 3);                         // 懸浮魂晶（收斂光暈）
  for (let dy = -3; dy <= 3; dy++) {
    const w = 1.7 - Math.abs(dy) * 0.5;
    if (w <= 0) continue;
    p.hline(8 - w, 7 + w, 9 + dy, dy < 0 ? P.shardL : P.shard);
  }
  p.px(7, 8, P.white); p.px(9, 10, darken(P.shardD, 0.2));
  p.px(8, 12, withAlpha(P.shardL, 0.6));                        // 落在石基上的光
  p.ellipse(8, 12.4, 5.2, 1.2, P.gray2);                        // 圓石基
  p.hline(3, 12, 12, P.gray3);
  p.rect(0, 13, 16, 1, darken(P.gray2, 0.25));
  p.rect(0, 14, 16, 1, darken(P.gray1, 0.3));
});
// 武器庫＝窄高的雉堞方塔（城垛齒＋鐵柵窗＋拱形鐵門），輪廓刻意比金庫瘦、比道場高。
defineIcon('facility_f_arsenal', P.gray1, (p) => {
  p.hline(5, 6, 1, P.bone); p.hline(9, 10, 1, P.bone);          // 城垛齒
  p.px(5, 1, P.white); p.px(9, 1, P.white);
  p.hline(5, 10, 2, darken(P.bone, 0.18)); p.hline(5, 10, 3, darken(P.bone, 0.34)); // 垛牆
  p.hline(4, 11, 4, P.ink2);                                    // 垛口陰影
  p.vline(4, 11, 4, P.ink); p.vline(4, 11, 11, P.ink);          // 兩側暗描邊，與框分離
  for (let y = 4; y <= 11; y++) {                               // 塔身（等寬、不貼框）
    p.hline(5, 10, y, mix(darken(P.bone, 0.22), darken(P.bone, 0.58), (y - 4) / 7));
    if (y % 3 === 0) p.hline(5, 10, y, darken(P.bone, 0.66));   // 砌石橫縫
  }
  p.vline(4, 11, 5, lighten(P.bone, 0.1));                      // 左緣受光
  p.rect(6, 5, 3, 3, P.ink2);                                   // 鐵柵窗
  p.vline(5, 7, 7, P.iron); p.px(6, 6, P.steelD); p.px(8, 6, P.steelD);
  p.glow(7, 6, 2.2, P.ember, 0.5, 3); p.px(7, 6, P.emberL);     // 窗內爐火
  for (let y = 9; y <= 11; y++) {                               // 拱形鐵門
    const w = y === 9 ? 1.6 : 2.2;
    p.hline(8 - w, 7 + w, y, y === 9 ? P.iron : darken(P.iron, 0.4));
  }
  p.vline(9, 11, 8, P.ink); p.px(6, 10, P.steelL); p.px(9, 10, P.steel); // 門縫＋門環
  footing(p, P.gray3, P.gray2, darken(P.gray1, 0.3));
});

// ---- items -----------------------------------------------------------------
// R28 W3-B-rework-B: 六個道具＝六種**不同容器**（不是「同一個瓶子換顏色」）。
// 撞形自查（16px）：方肩直筒瓶 / 葫蘆瓶 / 球形炸彈 / 半展開卷軸 / 錐形燒瓶 / 上尖符牌。
// kira flags follow the `tier` in content/items.js — tier 1 (普通) gets none,
// tier 2 (稀有) gets one. See defineIcon's opts doc for why it is opt-in.
defineIcon('item_heal_potion', P.blood, (p) => {
  p.glow(8, 8, 5.5, P.redL, 0.2, 3);
  flask(p, P.red);
  // 白十字標籤，讓「治療」在 16px 一眼可讀
  p.rect(7, 9, 2, 3, P.white); p.rect(6, 10, 4, 1, P.white);
});
// 大型藥水＝葫蘆瓶（上小球＋束腰＋下大球），與治療藥水的方肩直筒瓶完全不同輪廓。
defineIcon('item_big_potion', P.blood, (p) => {
  p.glow(8, 9, 6.5, P.redL, 0.3, 4);
  p.rect(6, 1, 4, 2, P.woodD); p.rect(6, 1, 4, 1, P.woodL);     // 木塞
  p.ellipse(8, 5, 2.8, 2.4, P.ink);                             // 上球（玻璃暗邊）
  p.ellipse(8, 5, 2.2, 1.8, P.gray4);                           // 玻璃亮環
  p.ellipse(8, 5.2, 1.5, 1.2, P.redL);
  p.px(7, 4, P.white); p.px(9, 6, darken(P.redL, 0.4));
  p.hline(6, 9, 7, P.ink); p.hline(7, 8, 7, P.gray3);           // 束腰（只留 2px 寬，葫蘆才咬得出來）
  p.ellipse(8, 10.6, 4.8, 3.3, P.ink);                          // 下球（玻璃暗邊）
  p.ellipse(8, 10.6, 4.1, 2.7, P.gray4);                        // 玻璃亮環
  p.ellipse(8, 10.9, 3.3, 2.0, darken(P.redL, 0.55));
  p.ellipse(8, 11.2, 3.1, 1.7, P.redL);
  p.hline(5, 11, 9, lighten(P.redL, 0.55));                     // 液面
  p.ellipse(10, 12, 1.6, 0.7, darken(P.redL, 0.35));            // 沉澱
  p.px(4, 10, P.white); p.px(4, 11, withAlpha(P.white, 0.5));   // 玻璃左緣反光
  p.px(11, 10, lighten(P.redL, 0.6));                           // 氣泡
  p.rect(7, 9, 2, 4, P.white); p.rect(6, 10, 4, 1, P.white);    // 白十字
  p.rect(5, 13, 7, 1, P.gray3);                                 // 平底
  shine(p, 6, 4, P.glint, 1.1);
});
// 魂晶炸彈＝球形鑄鐵彈體＋魂晶接縫＋斜引信（球體，與任何瓶罐都不同）。
defineIcon('item_bomb', P.gray1, (p) => {
  p.softShadow(8, 14, 4, 1.2, 0.35);
  p.ellipse(8, 9.6, 4.8, 4.6, P.ink);                           // 彈體暗邊
  p.ellipse(8, 9.6, 4.2, 4.0, P.gray2);                         // 鑄鐵球
  p.ellipse(7.4, 9, 3.2, 3.0, P.gray3);
  p.ellipse(6.6, 8.2, 1.7, 1.6, P.gray4);                       // 高光
  p.px(6, 8, P.white);
  p.ellipse(9.6, 11, 2.2, 1.8, darken(P.gray1, 0.2));           // 右下暗面
  p.hline(4.2, 11.8, 11, darken(P.gray1, 0.5));                 // 鑄縫
  p.glow(8, 11, 2.8, P.shard, 0.45, 3);                         // 魂晶接縫
  p.px(6, 11, P.shard); p.px(9, 11, P.shardL); p.px(11, 10, P.shardD);
  p.px(5, 12, P.shardD); p.px(8, 12, P.shard);
  p.rect(6, 4, 4, 2, P.iron); p.rect(6, 4, 4, 1, P.steel);      // 鐵箍
  p.px(6, 4, P.steelL); p.px(9, 5, darken(P.iron, 0.4));
  p.line(9, 5, 11, 3, P.wood); p.px(10, 4, P.woodL);            // 引信
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
// 狂熱藥劑＝錐形燒瓶（上窄下寬的三角瓶身）＋沸騰溢出的橙色蒸氣。
defineIcon('item_frenzy_brew', '#5a3a1a', (p) => {
  p.glow(8, 9, 6, P.ember, 0.26, 3);
  p.rect(6, 1, 4, 2, P.woodD); p.rect(6, 1, 4, 1, P.woodL);     // 木塞
  p.rect(7, 3, 2, 2, P.gray2); p.px(7, 3, P.gray4);             // 細頸
  for (let y = 5; y <= 12; y++) {                               // 錐形瓶身（玻璃）
    const t = (y - 5) / 7, w = 1.7 + t * 4.5;
    p.hline(8 - w, 7 + w, y, P.gray2);
  }
  for (let y = 6; y <= 11; y++) {                               // 瓶內空腔
    const t = (y - 5) / 7, w = 0.9 + t * 4.1;
    p.hline(8 - w, 7 + w, y, darken(P.ember, 0.6));
  }
  for (let y = 8; y <= 11; y++) {                               // 液體
    const t = (y - 5) / 7, w = 0.9 + t * 4.1;
    p.hline(8 - w, 7 + w, y, mix(P.emberL, P.ember, (y - 8) / 3));
  }
  p.hline(4.6, 11.4, 8, lighten(P.emberL, 0.4));                // 液面
  p.px(5, 10, withAlpha(P.white, 0.5)); p.px(4, 11, withAlpha(P.white, 0.35)); // 玻璃反光
  p.px(10, 9, P.holyL); p.px(9, 10, lighten(P.emberL, 0.4));    // 沸騰氣泡
  p.px(6, 9, P.emberL);
  p.px(8, 4, withAlpha(P.emberL, 0.75)); p.px(7, 5, withAlpha(P.ember, 0.7)); // 頸內蒸氣
  p.rect(1, 12, 14, 1, P.gray3);                                // 平底
  p.hline(2, 13, 13, darken(P.gray2, 0.3));
});
// 護盾符＝上尖的木製符牌，繩圈掛在頂端、牌面刻著冰藍的護盾符文。
// （舊版直接借用共用的 shield() 盾牌，與 gen 的 item_g_ward_stone 幾乎同輪廓。）
defineIcon('item_shield_charm', P.blueD, (p) => {
  p.glow(8, 9, 6, P.ice, 0.22, 3);
  p.hline(7, 8, 1, P.woodL);                                    // 繩圈
  p.line(5, 3, 8, 2, P.wood); p.line(11, 3, 8, 2, P.woodD);
  const rows = [[7, 8], [5, 10], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [3, 12], [4, 11]];
  for (let i = 0; i < rows.length; i++) {                       // 上尖符牌
    const y = 4 + i;
    p.hline(rows[i][0], rows[i][1], y, P.ink2);                 // 牌緣暗邊
    p.hline(rows[i][0] + (i > 1 ? 1 : 0), rows[i][1] - (i > 1 ? 1 : 0), y,
      mix(lighten(P.woodL, 0.4), P.woodD, i / 8));
  }
  p.vline(6, 12, 4, lighten(P.woodL, 0.5));                     // 左緣受光
  p.vline(6, 12, 11, darken(P.woodD, 0.4));
  p.px(7, 4, P.white); p.px(6, 5, P.woodL);
  p.hline(4, 11, 11, darken(P.woodD, 0.55));                    // 牌腳橫紋
  p.glow(8, 8, 3.4, P.iceD, 0.5, 3);                            // 冰藍護盾刻印
  for (let y = 6; y <= 10; y++) {
    const t = (y - 6) / 4;
    const w = t < 0.55 ? 2.6 : 2.6 * (1 - (t - 0.55) / 0.5) + 0.3;
    if (w <= 0) continue;
    p.hline(8 - w, 7 + w, y, mix(P.ice, P.iceD, t));
  }
  p.hline(5, 10, 6, P.hiSky); p.px(5, 6, P.white);
  p.px(8, 8, P.white); p.px(8, 9, P.hiSky); p.px(10, 8, P.iceD);
  p.rect(3, 13, 10, 1, P.woodD);                                // 底影
});

// ---- equipment -------------------------------------------------------------
// R28 W3-B-rework-B: 裝備 7 張＝**那一件裝備本身**。武器型裝備畫該武器，防具/飾品畫
// 可穿戴物件。前一批三支法杖全用同一個 staff()（斜桿＋色頭），正是 ART_SPEC 點名的
// 失敗樣態，這裡拆成三種完全不同的武器輪廓：
//   速射魔棒 → 橫置的短魔棒（三道銀環＋連射彈流）
//   散射法杖 → 直立的喇叭口銃杖（口內五顆扇形魂彈）
//   轟擊魔杖 → 球頭重杖（大紫水晶球＋粗短柄）
// kira 依 content/equipment.js 的 tier：tier 1 無、tier 2 有。
defineIcon('equip_rapid_rod', P.blueD, (p) => {
  p.glow(12, 9, 4.5, P.ice, 0.24, 3);
  p.rect(2, 8, 5, 3, P.woodD);                                  // 皮革握把
  p.rect(2, 8, 5, 1, P.wood); p.px(2, 8, P.woodL);
  p.px(3, 9, P.leather); p.px(5, 9, P.leather);
  p.hline(2, 6, 11, darken(P.woodD, 0.45));
  p.rect(7, 8, 5, 3, P.iron);                                   // 棒身
  p.hline(7, 11, 8, P.steel); p.hline(7, 11, 10, darken(P.iron, 0.4));
  p.vline(7, 10, 7, P.steelL); p.vline(7, 10, 9, P.steelL); p.vline(7, 10, 11, P.steelL); // 三道速射環
  p.rect(12, 7, 2, 4, P.iceD);                                  // 冰藍發射頭
  p.rect(12, 8, 2, 2, P.ice); p.px(13, 8, P.white);
  p.px(14, 9, P.hiSky);
  p.ellipse(13, 5, 1.4, 1.4, P.ice); p.px(13, 5, P.white);      // 連射彈流
  p.ellipse(10, 4, 1.1, 1.1, P.iceD); p.px(10, 4, P.hiSky);
  p.ellipse(7, 3, 0.9, 0.9, withAlpha(P.ice, 0.7));
  p.px(4, 2, withAlpha(P.hiSky, 0.5));
});
// 散射法杖＝斜持的喇叭口銃杖。**左右對稱**的直立版在 16px 會讀成一張臉（黑膛口＝眼、
// 頸環＝嘴），所以整支斜過來：木托在左下、喇叭口朝右上、五顆魂彈自膛口噴出。
defineIcon('equip_shotgun_wand', '#5a3a1a', (p) => {
  p.glow(12, 4, 4.5, P.ember, 0.16, 3);
  p.rect(1, 10, 4, 4, P.barkD); p.rect(1, 10, 4, 1, P.wood);    // 木托
  p.px(1, 13, darken(P.barkD, 0.4));
  p.line(2, 13, 9, 6, P.ink); p.line(3, 13, 10, 6, P.barkD);    // 槍身（暗木，讓銅口跳出來）
  p.line(3, 12, 10, 5, P.wood); p.line(4, 12, 10, 6, P.woodL);
  p.line(5, 11, 7, 9, P.leather);                               // 纏繩
  p.rect(7, 7, 3, 2, P.bronze); p.px(7, 7, P.goldL); p.px(9, 8, darken(P.bronze, 0.5)); // 銅箍
  // 斜向的喇叭口：以 24 個細步「掃」滿，才不會像逐段描邊那樣變成格子紋
  const AX = 9.2, AY = 6.4, BX = 11.6, BY = 3.8, PX = 0.686, PY = 0.729;
  for (let s = 0; s <= 24; s++) {
    const t = s / 24;
    const cx = AX + (BX - AX) * t, cy = AY + (BY - AY) * t, w = 1.3 + t * 2.3;
    p.line(cx - PX * w, cy - PY * w, cx + PX * w, cy + PY * w, mix(P.bronze, P.goldL, t * 0.9));
  }
  p.line(AX - PX * 1.3, AY - PY * 1.3, BX - PX * 3.6, BY - PY * 3.6, P.ink);   // 兩條長邊描邊
  p.line(AX + PX * 1.3, AY + PY * 1.3, BX + PX * 3.6, BY + PY * 3.6, P.ink);
  p.line(AX - PX * 0.8, AY - PY * 0.8, BX - PX * 3.0, BY - PY * 3.0, P.holyL); // 左上受光稜
  p.line(BX - PX * 3.4, BY - PY * 3.4, BX + PX * 3.4, BY + PY * 3.4, P.ink2);  // 膛口
  p.px(11, 3, P.emberL); p.px(12, 4, P.holyL); p.px(13, 5, P.ember);           // 膛內魂彈
});
defineIcon('equip_cannon_staff', P.purpleD, (p) => {
  gem(p, 8, 5, 4.2, P.purpleL, 0.6);                            // 巨型紫水晶球
  p.line(4, 4, 6, 2, lighten(P.purpleL, 0.4));                  // 球面刻面
  p.line(11, 7, 9, 9, darken(P.purple, 0.35));
  p.px(11, 3, P.white);
  p.rect(5, 8, 6, 2, P.iron);                                   // 承座
  p.hline(5, 10, 8, P.steel); p.px(5, 8, P.steelL);
  p.px(4, 9, P.iron); p.px(11, 9, darken(P.iron, 0.35));        // 爪
  p.rect(6, 10, 4, 4, P.woodD);                                 // 粗短柄
  p.vline(10, 13, 6, P.wood); p.vline(10, 13, 7, P.woodL);
  p.hline(5, 10, 11, P.gold); p.hline(5, 10, 12, P.goldD);      // 加固金環
  p.hline(5, 10, 14, darken(P.woodD, 0.45));                    // 柄底配重
  p.px(6, 14, P.gold);
});
// 皮革護甲＝一件無袖皮背心：肩帶＋深 V 領口＋橫向甲片＋腰帶＋雙片裙甲。
// gate 指出舊版在 16px 讀成「牛頭/面具」（兩顆圓護肩＋中央塊＝雙眼＋鼻），故重畫：
// 護肩改成窄長方肩帶、頂部挖出領口缺口，破掉「臉」的讀法。
defineIcon('equip_leather_armor', '#5a3a1a', (p) => {
  // 收腰的胸甲輪廓：寬肩 → 束腰 → 外擴裙甲。整片等寬的長方形會讀成「木門」。
  const body = [[3, 12], [3, 12], [4, 11], [4, 11], [5, 10], [5, 10]];
  p.rect(2, 1, 2, 5, P.barkD); p.rect(2, 1, 2, 1, P.woodL);     // 左肩帶（只有帶子在最上面）
  p.rect(12, 1, 2, 5, P.barkD); p.rect(12, 1, 2, 1, P.wood);    // 右肩帶
  for (let i = 0; i < body.length; i++) {
    const y = 4 + i, t = i / 5;
    p.hline(body[i][0], body[i][1], y, P.ink2);                 // 甲緣暗邊
    p.hline(body[i][0] + 1, body[i][1] - 1, y, mix(lighten(P.leather, 0.45), darken(P.leather, 0.16), t));
  }
  p.hline(6, 9, 4, P.ink); p.hline(7, 8, 5, P.ink);             // V 領缺口（只在胸口，不碰肩）
  p.line(4, 5, 10, 9, P.barkD); p.line(4, 6, 10, 10, P.wood);   // 斜背扣帶：一眼說「這是護具」
  p.px(7, 7, P.goldL); p.px(8, 8, P.goldD);                     // 帶扣
  p.px(4, 5, lighten(P.leather, 0.65)); p.px(5, 8, lighten(P.leather, 0.6)); // 左緣受光
  p.px(11, 5, darken(P.leather, 0.55)); p.px(10, 8, darken(P.leather, 0.55));
  p.px(5, 6, P.goldL); p.px(10, 6, P.goldD);                    // 鉚釘
  p.rect(4, 10, 8, 2, P.barkD); p.hline(4, 11, 10, P.wood);     // 腰帶（束在最窄處）
  p.rect(7, 10, 2, 2, P.goldL); p.px(8, 11, P.goldD);           // 扣環
  const skirt = [[3, 12], [3, 12], [4, 11]];
  for (let i = 0; i < skirt.length; i++) {                      // 外擴的雙片裙甲
    const y = 12 + i;
    p.hline(skirt[i][0], skirt[i][1], y, darken(P.leather, 0.3 + i * 0.14));
    p.px(7, y, P.ink); p.px(8, y, P.ink);                       // 中縫
  }
  p.px(3, 12, lighten(P.leather, 0.3)); p.px(12, 12, darken(P.leather, 0.6));
  p.px(3, 3, P.rim);
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
});
defineIcon('equip_swift_ring', '#5a4a1a', (p) => { p.glow(8, 4, 5, P.shardL, 0.24, 3); ring(p, P.gold, P.shardL); });
// 吸血護符＝皮繩上垂著一枚彎曲的血牙（金屬牙箍＋牙面血紋＋牙尖血滴）。
// 與疾風之戒的中空指環是完全不同的輪廓，也不再套用共用的 sym.drop 水滴符號。
defineIcon('equip_vamp_amulet', P.blood, (p) => {
  p.glow(8, 10, 5.5, P.redL, 0.3, 4);
  p.line(2, 1, 8, 6, P.barkD); p.line(3, 1, 8, 6, P.woodL);     // 皮繩
  p.line(14, 1, 8, 6, P.barkD); p.line(13, 1, 8, 6, P.wood);
  p.px(2, 1, P.woodL); p.px(14, 1, P.wood);
  p.rect(5, 6, 6, 2, P.goldD); p.rect(5, 6, 6, 1, P.goldL);     // 金屬牙箍（比牙寬，才像箍住）
  p.px(10, 7, darken(P.goldD, 0.4)); p.px(5, 6, P.holyL);
  // 彎曲的獠牙：牙根寬、往左下彎、尖端只剩 1px——刀刃是直的，這根不是
  const fang = [[5, 11], [5, 11], [5, 10], [5, 9], [5, 8], [5, 7], [5, 6]];
  for (let i = 0; i < fang.length; i++) {
    const y = 8 + i;
    p.hline(fang[i][0] - 1, fang[i][1] + 1, y, P.ink);          // 暗描邊（暗紅底板才切得開）
    p.hline(fang[i][0], fang[i][1], y, i < 3 ? P.white : (i < 5 ? P.bone : darken(P.bone, 0.18)));
    p.px(fang[i][0], y, P.white);                               // 受光左緣
    p.px(fang[i][1], y, darken(P.bone, 0.5));
  }
  p.px(9, 9, P.redD); p.px(8, 11, P.redD);                      // 牙面血斑（斜條會讀成糖果拐杖）
  p.px(5, 14, P.red); p.px(6, 13, P.redL);                      // 牙尖血滴
  p.px(6, 8, P.glint);
});

export const CONTENT_ICONS_READY = true;
