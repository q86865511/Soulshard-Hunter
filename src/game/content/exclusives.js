// 原#18 專屬武器 — character-exclusive signature weapons.
// These are weapon-slot equipment that ONLY appear in their owner's in-run anvil
// (and never in chests / normal drops / other heroes' shops), and only SOMETIMES —
// most anvil rolls still surface ordinary gear. They are flagged { exclusive:true }
// so the loot pools skip them; run.js injects the owner's piece into the gear roll
// with a modest probability.
import { Equipment } from './registry.js';
// R28 B-rework: sym.*／panel 不再匯入——通用符號正是「同輪廓不同色」的來源，
// 27 把專屬武器改為各自逐像素畫出該英雄的招牌武器（見下方每則 X({...}) 的註解）。
import { defineIcon } from '../../art/icons.js';
import { P, lighten, darken, mix, withAlpha } from '../../engine/palette.js';

// charId -> exclusive equipment id
export const CHAR_EXCLUSIVE = {
  hunter: 'x_starpiercer',
  pyro: 'x_embermaw',
  guardian: 'x_avalanche',
  ranger: 'x_thousandbird',
  stormcaller: 'x_thunderspear',
  shadow: 'x_twinfang',
  // a couple of generated heroes get one too; others fall back to ordinary gear
  g_vanguard: 'x_bulwarkbreaker',
  g_arcanist: 'x_arcrift',     // R18/B5: was x_starpiercer (the hunter's) — now its own
  g_revenant: 'x_soulleech',
  // R18/B5: three more former-orphan heroes get signature weapons
  g_ranger: 'x_galeshot',
  g_warden: 'x_bastionwave',
  g_stormcaller: 'x_stormheart',
  // R20: the six final heroes' signature pieces
  h4_paladin: 'x_h4_paladin',
  h4_chronomancer: 'x_h4_chronomancer',
  h4_puppeteer: 'x_h4_puppeteer',
  h4_gravekeeper: 'x_h4_gravekeeper',
  h4_starcaller: 'x_h4_starcaller',
  h4_bladedancer: 'x_h4_bladedancer',
  // R21: the five h2_* heroes' signature pieces (gen_heroes2)
  h2_duelist: 'x_h2_duelist',
  h2_warlock: 'x_h2_warlock',
  h2_trapper: 'x_h2_trapper',
  h2_voidcaller: 'x_h2_voidcaller',
  h2_warder: 'x_h2_warder',
  // R21: the four h3_* heroes' signature pieces (gen_heroes3)
  h3_spearmaiden: 'x_h3_spearmaiden',
  h3_plague: 'x_h3_plague',
  h3_beastfang: 'x_h3_beastfang',
  h3_dragoon: 'x_h3_dragoon',
};
export function exclusiveFor(charId) { return CHAR_EXCLUSIVE[charId] || null; }

// helper to register one exclusive weapon + its icon
// R28 B-rework: every exclusive is tier 3, so the kira glint is always on
// (ART_SPEC 第 5 節 — kira 只給進化/epic/隱藏獎勵；專屬武器是每個英雄的常規解鎖，不標).
function X(o) {
  const icon = 'equip_' + o.id;
  defineIcon(icon, o.bg, o.draw);
  Equipment.register({ id: o.id, name: o.name, slot: 'weapon', tier: 3, weight: 0, price: o.price || 120, exclusive: true, icon, desc: o.desc, weapon: o.weapon });
}

// R28 B-rework — ART_SPEC 第 5 節鐵律：27 把專屬武器各畫「那一把武器本身」，
// 同類別（裝備）內任兩張的輪廓不得雷同。三把弩以 星矢／馬鐙＋絞盤／上置箭匣 分家；
// 四支長柄以 鋸齒雷矛／垂直纓槍／斜置錐形騎槍／橫置稜晶槍 分家；
// 圓球類全部改成可命名實體（裂隙／瘴囊／吸積盤／菱形核心）。
X({ id: 'x_starpiercer', name: '弒星魂弩', bg: '#163a44', price: 130,
  desc: '【專屬】極速連射的穿透魂弩，彈如星雨。',
  // 輕弩：細長槍托＋右側後掠弓臂，膛上一支星芒箭
  draw: (p) => {
    p.hline(2, 12, 9, P.woodD); p.hline(2, 12, 8, P.wood); p.px(2, 8, P.woodL);   // 槍托（三階）
    p.line(9, 2, 12, 7, P.steel); p.line(9, 2, 11, 6, P.steelL);                  // 上弓臂
    p.line(9, 13, 12, 8, P.steel); p.line(9, 13, 11, 9, P.iron);                  // 下弓臂
    p.line(9, 2, 9, 13, withAlpha(P.shardL, 0.7));                                // 弦
    p.hline(4, 12, 7, P.shardL); p.hline(4, 8, 6, P.shard);                       // 箭桿
    p.line(11, 5, 13, 7, P.shardL); p.line(11, 9, 13, 7, P.shard);                // 箭頭
    p.rect(5, 10, 2, 3, P.iron); p.px(5, 10, P.steelL);                           // 扳機護弓
    p.px(13, 7, P.white); p.px(3, 8, P.white);
  },
  weapon: { name: '弒星魂弩', damage: 8, fireRate: 6.5, projSpeed: 280, projCount: 2, spread: 0.08, pierce: 2, knockback: 12, projSprite: 'bolt', projColor: P.shardL, projRadius: 2.6, projLife: 1.3 } });

X({ id: 'x_embermaw', name: '焚世魔焰', bg: '#4a1a12', price: 140,
  desc: '【專屬】噴吐烈焰扇的魔器，近距離焚盡一切。',
  // 魔獸口器：左側張開的上下顎（各三根獠牙），右側噴出三道火舌
  draw: (p) => {
    p.glow(9, 8, 5, P.ember, 0.3, 4);
    p.line(2, 3, 8, 6, P.bone); p.line(2, 4, 8, 7, darken(P.bone, 0.3));          // 上顎
    p.line(2, 13, 8, 10, P.bone); p.line(2, 12, 8, 9, darken(P.bone, 0.35));      // 下顎
    for (let i = 0; i < 3; i++) {                                                  // 獠牙
      const x = 3 + i * 2, ty = 4 + i, by = 12 - i;
      p.line(x, ty, x + 1, ty + 2, P.white); p.line(x, by, x + 1, by - 2, P.bone);
    }
    p.rect(3, 7, 4, 2, darken(P.blood, 0.2));                                      // 喉腔陰影
    for (let i = 0; i < 3; i++) { p.line(8, 8, 14, 4 + i * 4, P.ember); p.line(9, 8, 13, 5 + i * 3, P.emberL); }
    p.hline(8, 12, 8, P.white); p.px(14, 8, P.holyL);                              // 白熱核心
  },
  weapon: { name: '焚世魔焰', damage: 9, fireRate: 2.6, projSpeed: 190, projCount: 6, spread: 0.34, pierce: 1, knockback: 26, projSprite: 'bolt_fire', projColor: P.ember, projRadius: 3, projLife: 0.6, status: { type: 'burn' } } });

X({ id: 'x_avalanche', name: '山崩巨槌', bg: '#34384a', price: 150,
  desc: '【專屬】緩慢卻毀天滅地的巨槌投擲，貫穿一切。',
  // 巨槌：左上一顆方頭（三階金屬）＋斜向右下的粗柄，底下落石碎屑
  draw: (p) => {
    p.gradV(2, 2, 8, 6, lighten(P.steel, 0.28), darken(P.iron, 0.3));              // 槌頭
    p.hline(2, 9, 2, lighten(P.steelL, 0.2)); p.hline(2, 9, 7, darken(P.iron, 0.45));
    p.vline(2, 7, 5, darken(P.iron, 0.22)); p.px(2, 2, P.glint);                   // 頭面接縫＋高光
    p.px(3, 3, P.white); p.px(8, 6, P.gray1);
    p.line(8, 7, 12, 13, P.woodD); p.line(9, 7, 13, 13, P.wood);                   // 粗柄
    p.line(9, 8, 12, 12, P.woodL);
    p.rect(11, 12, 3, 2, P.iron); p.px(11, 12, P.steelL);                          // 柄尾鐵箍
    p.px(4, 10, P.gray3); p.px(6, 12, P.gray2); p.px(3, 13, P.gray3);              // 落石
  },
  weapon: { name: '山崩巨槌', damage: 46, fireRate: 1.0, projSpeed: 150, projCount: 1, spread: 0.02, pierce: 4, knockback: 90, projSprite: 'bolt', projColor: P.steelL, projRadius: 6, projLife: 2.2, projScale: 1.8 } });

X({ id: 'x_thousandbird', name: '千鳥追蹤', bg: '#244a2a', price: 135,
  desc: '【專屬】釋放成群自動追蹤的疾風箭。',
  // 千鳥：五隻大小不一的 V 形飛鳥聚成一群，領頭的是一支箭
  draw: (p) => {
    p.glow(8, 8, 5.5, P.leaf, 0.2, 4);
    const bird = (x, y, s, c, lt) => {                                             // 鳥＝一對展開的翼
      p.line(x - s, y + 1, x, y - 1, c); p.line(x, y - 1, x + s, y + 1, c);
      p.px(x, y - 1, lt);
    };
    bird(4, 4, 2, P.leafD, P.leaf);
    bird(9, 3, 2, P.leaf, P.leafL);
    bird(3, 9, 2, P.leaf, P.leafL);
    bird(6, 12, 2, P.leafD, P.leaf);
    bird(12, 11, 2, P.leafD, P.leaf);
    p.line(6, 9, 12, 6, P.woodL); p.line(6, 10, 12, 7, P.woodD);                   // 領頭箭桿
    p.line(11, 4, 13, 6, P.toxic); p.line(11, 8, 13, 6, P.greenL);                 // 箭頭
    p.px(13, 6, P.white); p.px(6, 10, P.leafL);
  },
  weapon: { name: '千鳥追蹤', damage: 9, fireRate: 3.2, projSpeed: 170, projCount: 3, spread: 0.5, pierce: 0, knockback: 12, projSprite: 'bolt_void', projColor: P.greenL, projRadius: 3, projLife: 2.0, homing: 4.5 } });

X({ id: 'x_thunderspear', name: '雷神之矛', bg: '#2a1a4a', price: 140,
  desc: '【專屬】投擲瞬發的雷矛，高速貫穿成排敵人。',
  // 雷矛：矛柄本身就是一道鋸齒閃電（Z 形輪廓），頂端一枚葉形矛頭
  draw: (p) => {
    p.glow(8, 8, 6, P.emberL, 0.28, 4);
    const zig = [[4, 14], [7, 10], [4, 8], [8, 5]];                                // 鋸齒柄
    for (let i = 0; i < 3; i++) {
      p.line(zig[i][0], zig[i][1], zig[i + 1][0], zig[i + 1][1], P.goldD);
      p.line(zig[i][0] + 1, zig[i][1], zig[i + 1][0] + 1, zig[i + 1][1], P.emberL);
      p.line(zig[i][0] + 1, zig[i][1] - 1, zig[i + 1][0] + 1, zig[i + 1][1] - 1, P.white);
    }
    for (let y = 1; y <= 5; y++) {                                                 // 矛頭（葉形）
      const w = y <= 3 ? y * 0.7 : (6 - y) * 1.1;
      p.hline(9 - w, 9 + w, y, y <= 3 ? P.steelL : P.steel);
    }
    p.vline(1, 5, 9, P.white); p.px(9, 1, P.glint);
    p.px(4, 14, P.goldD); p.px(11, 3, P.emberL);
  },
  weapon: { name: '雷神之矛', damage: 16, fireRate: 2.4, projSpeed: 340, projCount: 1, spread: 0.02, pierce: 5, knockback: 30, projSprite: 'bolt', projColor: P.emberL, projRadius: 3.4, projLife: 1.6 } });

X({ id: 'x_twinfang', name: '影襲雙刃', bg: '#1a1428', price: 135,
  desc: '【專屬】高暴擊的影刃飛旋，撕裂目標。',
  // 雙牙：兩顆並排朝下的實心獠牙（左右各往外撇），刃根一段暗色握把，中央留暗縫
  draw: (p) => {
    p.glow(8, 9, 5, P.purpleL, 0.2, 4);
    const fang = (cx0, dir) => {
      p.rect(cx0 - 1, 2, 3, 2, P.woodD); p.hline(cx0 - 1, cx0 + 1, 2, P.woodL);    // 刃根握把
      for (let y = 4; y <= 14; y++) {
        const t = (y - 4) / 10;
        const cx = cx0 + dir * 1.8 * t * t;                                        // 往外撇
        const w = 2.2 * (1 - t * 0.92);
        p.hline(cx - w, cx + w, y, P.steelD);                                      // 刃體
        p.px(Math.round(cx - w * 0.35), y, P.steelL);                              // 受光脊
        p.px(Math.round(cx + w), y, darken(P.purpleD, 0.2));                       // 背光邊
        if (t > 0.25 && t < 0.85) p.px(Math.round(cx - w), y, P.purpleL);
      }
      p.px(Math.round(cx0 + dir * 1.8), 14, P.white);                              // 牙尖
    };
    fang(5, -1); fang(11, 1);
    p.vline(4, 12, 8, withAlpha(P.ink2, 0.7));                                     // 中央暗縫
  },
  weapon: { name: '影襲雙刃', damage: 13, fireRate: 3.4, projSpeed: 240, projCount: 2, spread: 0.18, pierce: 1, knockback: 16, projSprite: 'bolt_void', projColor: P.purpleL, projRadius: 2.8, projLife: 0.9 } });

X({ id: 'x_bulwarkbreaker', name: '破壁重弩', bg: '#3a1414', price: 140,
  desc: '【專屬】先鋒的重弩，沉重彈頭擊退成群。',
  // 攻城重弩：厚實槍身＋右側垂直弓臂，前端一只馬鐙鐵環、底下一具絞盤輪
  draw: (p) => {
    p.gradV(3, 6, 9, 4, lighten(P.iron, 0.24), darken(P.iron, 0.3));               // 弩身
    p.hline(3, 11, 6, P.steelL); p.hline(3, 11, 9, darken(P.iron, 0.45));
    p.vline(3, 12, 12, P.steel); p.vline(4, 11, 13, P.steelD);                     // 垂直粗弓臂
    p.px(12, 3, P.steelL); p.px(12, 12, P.gray1);
    p.hline(5, 14, 8, P.redL); p.line(13, 6, 14, 8, P.red); p.line(13, 10, 14, 8, P.redD); // 粗箭
    p.ring(3, 12, 2.2, P.iron); p.px(2, 11, P.steelL);                             // 馬鐙鐵環
    p.circle(7, 12, 2, P.woodD); p.circle(7, 12, 1.2, P.wood); p.px(6, 11, P.woodL); // 絞盤輪
    p.px(4, 7, P.glint); p.px(14, 8, P.white);
  },
  weapon: { name: '破壁重弩', damage: 30, fireRate: 1.4, projSpeed: 200, projCount: 1, spread: 0.02, pierce: 3, knockback: 70, projSprite: 'bolt', projColor: P.redL, projRadius: 5, projLife: 2.0, projScale: 1.5 } });

X({ id: 'x_soulleech', name: '噬魂之鐮', bg: '#201828', price: 138,
  desc: '【專屬】亡魂的鐮刃，揮斬間奪取生命。',
  // 鐮刀：長柄斜立，頂端一彎往右下勾回的大鐮刃，柄上掛一顆魂骷髏
  draw: (p) => {
    p.glow(9, 6, 5, P.poison, 0.24, 4);
    p.line(3, 14, 5, 4, P.woodD); p.line(4, 14, 6, 4, P.wood); p.line(4, 13, 5, 6, P.woodL); // 柄
    for (let x = 5; x <= 13; x++) {                                                // 實心鐮刃：由厚轉薄
      const t = (x - 5) / 8;
      const top = 3 + t * 3.4, bot = top + 3.2 * (1 - t * 0.72);
      for (let y = Math.round(top); y <= Math.round(bot); y++) {
        p.px(x, y, y <= top + 0.9 ? P.steelL : (y >= bot - 0.9 ? P.poison : P.steel));
      }
    }
    p.px(13, 7, P.white); p.px(6, 3, P.glint); p.hline(5, 12, 3, darken(P.steel, 0.35)); // 刃背
    p.ellipse(5, 10, 1.4, 1.4, P.bone); p.px(4, 10, P.toxic); p.px(6, 10, P.toxic);   // 魂骷髏
  },
  weapon: { name: '噬魂之鐮', damage: 18, fireRate: 2.2, projSpeed: 200, projCount: 2, spread: 0.22, pierce: 2, knockback: 22, projSprite: 'bolt_void', projColor: P.poison, projRadius: 3.4, projLife: 0.8 } });

// ---- R18 / B5: four signature weapons for the newly-promoted heroes ----
X({ id: 'x_arcrift', name: '奧術裂隙', bg: '#2a1c4a', price: 140,
  desc: '【專屬】緩重的穿透法彈，撕開空間裂隙。',
  // 空間裂隙：一道由上而下的鋸齒撕裂口（兩側岩緣外翻、中央白熱裂縫），非圓球
  draw: (p) => {
    p.glow(8, 8, 6, P.mana, 0.3, 4);
    const jag = [0, 1, 2, 1, 3, 2, 3, 2, 1, 2, 1, 0];                              // 每列半寬
    for (let i = 0; i < jag.length; i++) {
      const y = 2 + i, w = jag[i];
      p.hline(8 - w, 8 + w, y, P.purpleD);                                         // 裂口暗腔
      if (w > 0) { p.px(8 - w, y, P.purpleL); p.px(8 + w, y, darken(P.purple, 0.2)); }
      p.px(8, y, i % 3 === 0 ? P.white : P.manaL);                                 // 白熱裂縫
    }
    p.px(8, 1, P.shardL); p.px(8, 14, P.shardL);
    p.px(5, 5, P.manaL); p.px(11, 10, P.manaL); p.px(4, 10, withAlpha(P.astralL, 0.7)); // 逸散星屑
  },
  weapon: { name: '奧術裂隙', damage: 24, fireRate: 1.5, projSpeed: 175, projCount: 1, spread: 0.04, pierce: 3, knockback: 20, projSprite: 'bolt_void', projColor: P.manaL, projRadius: 6, projLife: 1.8, projScale: 1.4 } });

X({ id: 'x_galeshot', name: '疾風連弩', bg: '#1e3a26', price: 135,
  desc: '【專屬】極速雙連射的輕弩，箭如疾風。',
  // 連弩：槍身上「架著一只箭匣方盒」——這個上置箭匣是它跟另兩把弩的分家點
  draw: (p) => {
    p.hline(2, 13, 10, P.woodD); p.hline(2, 13, 9, P.wood); p.px(2, 9, P.woodL);   // 槍身
    p.gradV(4, 3, 7, 5, lighten(P.wood, 0.3), darken(P.woodD, 0.2));               // 箭匣
    p.hline(4, 10, 3, P.woodL); p.rect(4, 7, 7, 1, darken(P.woodD, 0.4));
    p.vline(3, 7, 6, darken(P.wood, 0.35)); p.vline(3, 7, 9, darken(P.wood, 0.35)); // 匣板縫
    p.px(5, 4, P.leafL); p.px(8, 4, P.leaf);                                       // 匣中箭羽
    p.line(11, 6, 13, 9, P.steel); p.line(11, 13, 13, 10, P.steel);                // 短弓臂
    p.hline(9, 14, 9, P.greenL); p.line(13, 7, 14, 9, P.toxic); p.line(13, 11, 14, 9, P.leaf); // 待發箭
    p.px(14, 9, P.white);
    p.px(2, 12, withAlpha(P.leafL, 0.6)); p.px(4, 13, withAlpha(P.leafL, 0.4));    // 疾風尾跡
  },
  weapon: { name: '疾風連弩', damage: 7, fireRate: 7.0, projSpeed: 290, projCount: 2, spread: 0.1, pierce: 1, knockback: 10, projSprite: 'bolt', projColor: P.greenL, projRadius: 2.4, projLife: 1.1 } });

X({ id: 'x_bastionwave', name: '堡壘震波', bg: '#33384c', price: 150,
  desc: '【專屬】扇形震波擊退成群，附帶緩速。',
  // 塔盾：一面高長方形塔盾（頂平底平、中央盾釘與加固帶），右緣震出一道波
  draw: (p) => {
    p.gradV(4, 2, 8, 11, lighten(P.steel, 0.3), darken(P.iron, 0.28));             // 盾面
    p.hline(4, 11, 2, lighten(P.steelL, 0.25)); p.hline(4, 11, 12, darken(P.iron, 0.5));
    p.vline(2, 12, 4, P.steelL); p.vline(2, 12, 11, darken(P.iron, 0.4));          // 左受光／右陰
    p.rect(4, 6, 8, 2, P.iron); p.hline(4, 11, 6, P.steelL);                       // 橫向加固帶
    p.ellipse(8, 7, 1.8, 1.8, P.steelL); p.ellipse(8, 7, 1, 1, P.iceD); p.px(7, 6, P.white); // 盾釘
    for (const y of [3, 5, 9, 11]) { p.px(5, y, P.gray4); p.px(10, y, P.gray1); }  // 鉚釘
    for (let i = 0; i < 3; i++) p.line(12, 7, 14, 3 + i * 4, withAlpha(P.shardL, 0.85 - i * 0.15)); // 震波
  },
  weapon: { name: '堡壘震波', damage: 22, fireRate: 1.2, projSpeed: 180, projCount: 4, spread: 0.8, pierce: 1, knockback: 80, projSprite: 'bolt', projColor: P.shardL, projRadius: 3.4, projLife: 0.7, status: { type: 'slow' } } });

X({ id: 'x_stormheart', name: '雷暴核心', bg: '#22224a', price: 142,
  desc: '【專屬】三道高速雷彈齊射，貫穿雷霆。',
  // 雷暴核心：一枚菱形能量核（三階）＋上下兩道包覆的電弧，左右各一支放電端子
  draw: (p) => {
    p.glow(8, 8, 6, P.blueL, 0.3, 4);
    for (let dy = -4; dy <= 4; dy++) {                                             // 窄高菱形核（非切工寶石的八角）
      const w = (4 - Math.abs(dy)) * 0.72;
      p.hline(8 - w, 8 + w, 8 + dy, dy < 0 ? P.blue : darken(P.blue, 0.3));
    }
    for (let dy = -2; dy <= 2; dy++) { const w = (2 - Math.abs(dy)) * 0.8; p.hline(8 - w, 8 + w, 8 + dy, P.blueL); }
    p.px(8, 8, P.white); p.px(7, 6, P.glint);
    for (let k = 0; k < 2; k++) {                                                  // 上下兩支包覆的粗電弧（吃進輪廓）
      const s = k ? 1 : -1, y0 = 8 + s * 5;
      p.line(3, y0 + s, 6, y0 - s * 2, P.gold); p.line(6, y0 - s * 2, 9, y0 + s, P.emberL);
      p.line(9, y0 + s, 12, y0 - s * 2, P.gold);
      p.px(6, y0 - s * 2, P.white); p.px(12, y0 - s * 2, P.emberL);
    }
    p.px(1, 8, P.steelL); p.px(2, 8, P.blueL); p.px(14, 8, P.steelL); p.px(13, 8, P.blueL); // 左右端子
  },
  weapon: { name: '雷暴核心', damage: 12, fireRate: 3.0, projSpeed: 330, projCount: 3, spread: 0.16, pierce: 1, knockback: 16, projSprite: 'bolt', projColor: P.blueL, projRadius: 2.8, projLife: 1.0 } });

// ---- R20: six signature weapons for the final h4_* heroes ----
X({ id: 'x_h4_paladin', name: '聖壁誓盾', bg: '#3a3214', price: 148,
  desc: '【專屬】擲出迴旋聖盾，沉重擊退、貫穿罪孽。',
  // 鳶盾：上寬下尖的騎士盾（與塔盾的長方形分家），面上一枚聖十字
  draw: (p) => {
    p.glow(8, 7, 6, P.holy, 0.26, 4);
    for (let y = 2; y <= 14; y++) {                                                // 盾形：上緣平、下收尖
      const t = (y - 2) / 12;
      let w = 5.4 * (1 - t * 0.35);
      if (y > 10) w *= (15 - y) / 4.6;
      p.hline(8 - w, 7 + w, y, t < 0.4 ? P.gold : mix(P.gold, darken(P.gold, 0.45), t));
    }
    p.hline(3, 12, 2, P.goldL); p.vline(3, 11, 3, lighten(P.gold, 0.35));          // 上緣／左緣受光
    p.vline(3, 11, 12, darken(P.gold, 0.5));
    p.vline(4, 12, 8, P.holyL); p.hline(5, 10, 6, P.holyL);                        // 聖十字
    p.px(8, 6, P.white); p.px(4, 4, P.glint);
  },
  weapon: { name: '聖壁誓盾', damage: 24, fireRate: 1.6, projSpeed: 170, projCount: 2, spread: 0.5, pierce: 3, knockback: 85, projSprite: 'bolt', projColor: P.holy, projRadius: 5, projLife: 1.2, projScale: 1.5 } });

X({ id: 'x_h4_chronomancer', name: '時砂漏刻', bg: '#1c2a3a', price: 142,
  desc: '【專屬】緩慢漂流的時砂彈久滯不散，貫穿並遲滯敵蹤。',
  // 沙漏：上下木板框＋兩根立柱夾住玻璃腰身，上砂堆、腰口落砂、下砂丘
  draw: (p) => {
    p.rect(3, 2, 10, 2, P.wood); p.hline(3, 12, 2, P.woodL); p.hline(3, 12, 3, P.woodD);   // 上框
    p.rect(3, 12, 10, 2, P.wood); p.hline(3, 12, 12, P.woodL); p.hline(3, 12, 13, P.woodD); // 下框
    p.vline(4, 12, 3, P.woodD); p.vline(4, 12, 12, P.woodD);                       // 立柱
    for (let y = 4; y <= 11; y++) {                                                // 玻璃腰身
      const w = Math.abs(7.5 - y) * 0.62 + 1.2;
      p.hline(8 - w, 7 + w, y, withAlpha(P.iceD, 0.55));
      p.px(Math.round(8 - w), y, P.shardL); p.px(Math.round(7 + w), y, darken(P.ice, 0.3));
    }
    p.hline(5, 10, 4, P.sandL); p.hline(6, 9, 5, P.sand);                          // 上砂堆
    p.px(8, 7, P.sandL); p.px(8, 8, P.sand); p.px(8, 9, P.sandL);                  // 落砂
    p.hline(6, 9, 11, P.sand); p.hline(7, 8, 10, P.sandL);                         // 下砂丘
    p.px(5, 4, P.white);
  },
  weapon: { name: '時砂漏刻', damage: 11, fireRate: 2.8, projSpeed: 105, projCount: 2, spread: 0.3, pierce: 4, knockback: 8, projSprite: 'bolt_void', projColor: P.sand, projRadius: 4, projLife: 2.8, status: { type: 'slow' } } });

X({ id: 'x_h4_puppeteer', name: '傀儡心匣', bg: '#2e1a2e', price: 140,
  desc: '【專屬】心匣彈出四道追魂絲線，纏殺四方之敵。',
  // 傀儡心匣：頂上一根操縱橫木，四條絲線垂到下方的心形鎖匣
  draw: (p) => {
    p.rect(3, 2, 10, 1, P.woodL); p.rect(3, 3, 10, 1, P.woodD);                    // 操縱橫木
    for (const x of [4, 6, 10, 12]) p.vline(4, 8, x, withAlpha(P.sakuraL, 0.8));   // 四條絲線
    p.gradV(4, 8, 8, 5, lighten(P.woodL, 0.2), darken(P.woodD, 0.15));             // 匣體
    p.hline(4, 11, 8, lighten(P.woodL, 0.4)); p.hline(4, 11, 12, darken(P.woodD, 0.45));
    p.vline(8, 12, 4, P.woodL); p.vline(8, 12, 11, darken(P.wood, 0.4));
    p.ellipse(7, 10, 1.2, 1.2, P.sakura); p.ellipse(9, 10, 1.2, 1.2, P.sakura);    // 心形鑰孔
    p.hline(6, 10, 10, P.sakura); p.px(8, 12, P.sakuraD); p.px(7, 11, P.sakuraL);
    p.px(8, 10, P.white); p.px(5, 9, P.glint);
    p.px(4, 4, P.sakuraL); p.px(12, 4, P.sakuraL);
  },
  weapon: { name: '傀儡心匣', damage: 6, fireRate: 3.4, projSpeed: 160, projCount: 4, spread: 0.65, pierce: 0, knockback: 10, projSprite: 'bolt_void', projColor: P.sakura, projRadius: 2.6, projLife: 2.0, homing: 5.5 } });

X({ id: 'x_h4_gravekeeper', name: '亡者名冊', bg: '#16201a', price: 145,
  desc: '【專屬】翻開名冊喚出亡魂巨浪，緩行卻無人能擋。',
  // 亡者名冊：一本「攤開」的冊子（兩頁向上翻成 V 形書口），亡魂自頁間升起
  draw: (p) => {
    p.glow(8, 6, 5, P.poison, 0.26, 4);
    for (let i = 0; i < 5; i++) {                                                  // 兩疊頁緣：向外上斜
      p.line(7 - i * 0.2, 6 + i, 2 + i * 0.4, 8 + i, i === 0 ? P.white : P.bone);
      p.line(9 + i * 0.2, 6 + i, 14 - i * 0.4, 8 + i, i === 0 ? P.bone : darken(P.bone, 0.25));
    }
    p.line(3, 12, 8, 10, darken(P.bone, 0.4)); p.line(13, 12, 8, 10, darken(P.bone, 0.5)); // 書口下緣
    p.vline(6, 12, 8, P.woodD); p.px(8, 6, P.woodL);                               // 書脊
    p.line(4, 9, 6, 9, P.gray2); p.line(10, 9, 12, 9, P.gray2);                    // 名冊字行
    p.line(4, 11, 6, 11, P.gray2); p.line(10, 11, 12, 11, P.gray2);
    p.ellipse(8, 4, 1.4, 1.8, withAlpha(P.poison, 0.85));                          // 升起的亡魂
    p.px(7, 4, P.toxic); p.px(9, 4, P.toxic); p.px(8, 2, withAlpha(P.greenL, 0.7));
  },
  weapon: { name: '亡者名冊', damage: 16, fireRate: 1.9, projSpeed: 135, projCount: 1, spread: 0.02, pierce: 6, knockback: 24, projSprite: 'bolt_void', projColor: P.poison, projRadius: 5.5, projLife: 2.4, projScale: 1.6, status: { type: 'poison' } } });

X({ id: 'x_h4_starcaller', name: '墜星羅盤', bg: '#1a1a3a', price: 144,
  desc: '【專屬】羅盤指引五道墜星扇射，星雨洗地。',
  // 羅盤：黃銅圓殼＋掀起的上蓋鉸鏈、盤面四方位刻度與一根指北磁針
  draw: (p) => {
    p.ellipse(8, 9, 5.4, 5.4, P.goldD); p.ellipse(8, 9, 4.6, 4.6, P.gold);         // 銅殼
    p.ellipse(8, 9, 3.6, 3.6, darken(P.void, 0.05)); p.ring(8, 9, 4.6, P.goldL);   // 盤面
    p.rect(5, 1, 6, 2, P.goldD); p.rect(5, 1, 6, 1, P.goldL);                      // 掀起的上蓋
    p.px(4, 3, P.goldD); p.px(11, 3, P.goldD);                                     // 鉸鏈
    p.px(8, 5, P.white); p.px(8, 13, P.goldL); p.px(4, 9, P.goldL); p.px(12, 9, P.goldL); // 四方位刻度
    p.line(8, 9, 8, 6, P.astralL); p.line(8, 9, 8, 12, P.astral);                  // 磁針
    p.px(8, 6, P.holyL); p.ellipse(8, 9, 1, 1, P.astralL); p.px(8, 9, P.white);
    p.px(6, 7, P.glint); p.px(12, 4, P.holyL);
  },
  weapon: { name: '墜星羅盤', damage: 8, fireRate: 2.3, projSpeed: 265, projCount: 5, spread: 0.42, pierce: 1, knockback: 18, projSprite: 'bolt', projColor: P.astralL, projRadius: 2.8, projLife: 1.0 } });

X({ id: 'x_h4_bladedancer', name: '無影劍匣', bg: '#241a30', price: 143,
  desc: '【專屬】劍匣連綻三刃近身刃舞，舞步間血花飛濺。',
  // 無影劍匣：橫置的長匣（下方），一把刀正被抽出、斜插向右上，殘影兩道
  draw: (p) => {
    p.gradV(2, 10, 12, 4, lighten(P.woodL, 0.15), darken(P.woodD, 0.2));           // 劍匣
    p.hline(2, 13, 10, lighten(P.woodL, 0.4)); p.hline(2, 13, 13, darken(P.woodD, 0.5));
    p.rect(3, 11, 1, 2, P.gold); p.rect(11, 11, 1, 2, P.gold);                     // 匣箍
    p.rect(6, 9, 3, 1, P.ink2);                                                    // 匣口
    p.line(6, 12, 10, 6, withAlpha(P.sakuraL, 0.35));                              // 殘影
    p.line(7, 11, 11, 5, withAlpha(P.steelL, 0.45));
    p.line(7, 10, 12, 3, P.steelD); p.line(8, 10, 13, 3, P.steelL);                // 抽出的刀身
    p.line(8, 9, 12, 4, P.white);
    p.px(13, 2, P.glint); p.rect(6, 10, 2, 2, P.woodD);                            // 刀鐔
    p.px(4, 11, P.glint);
  },
  weapon: { name: '無影劍匣', damage: 9, fireRate: 3.1, projSpeed: 250, projCount: 3, spread: 0.2, pierce: 1, knockback: 14, projSprite: 'bolt', projColor: P.steelL, projRadius: 2.6, projLife: 0.7, status: { type: 'bleed' } } });

// ---- R21: five signature weapons for the h2_* heroes (gen_heroes2) ----
X({ id: 'x_h2_duelist', name: '烈刃雙星', bg: '#2a2e3a', price: 136,
  desc: '【專屬】高速綻放的雙生光刃，撕裂間滲血。',
  // 細劍：垂直細長劍身＋杯狀護手與護指弓、球形劍首（與雙彎爪的雙弧輪廓完全不同）
  draw: (p) => {
    p.vline(2, 8, 6, P.steelD); p.vline(1, 8, 7, P.steelL);                        // 劍身：暗邊＋亮脊
    p.vline(2, 8, 8, P.steel); p.vline(3, 7, 7, P.white);
    p.px(7, 1, P.white); p.px(6, 3, P.glint);
    p.ellipse(8, 10, 3.6, 2.2, P.goldD); p.ellipse(8, 9.6, 2.7, 1.5, P.gold);      // 杯狀護手
    p.hline(4, 11, 9, P.goldL); p.hline(5, 10, 11, darken(P.goldD, 0.3));
    p.line(4, 10, 3, 13, P.goldD); p.line(3, 13, 7, 14, P.gold);                   // 護指弓
    p.rect(7, 11, 2, 3, P.woodD); p.px(7, 11, P.woodL);                            // 握把
    p.ellipse(8, 14, 1.4, 1.2, P.gold); p.px(7, 14, P.goldL);                      // 劍首
    p.px(7, 5, P.redL);                                                            // 血槽紅光
  },
  weapon: { name: '烈刃雙星', damage: 10, fireRate: 4.2, projSpeed: 260, projCount: 2, spread: 0.12, pierce: 1, knockback: 14, projSprite: 'bolt', projColor: P.steelL, projRadius: 2.6, projLife: 0.7, status: { type: 'bleed' } } });

X({ id: 'x_h2_warlock', name: '腐朽瘴囊', bg: '#1c2414', price: 140,
  desc: '【專屬】緩飄的瘴氣囊彈，久滯成池、侵蝕血肉。',
  // 瘴囊：一只由上方繩結吊著、下墜梨形的皮囊，底部滴落毒液（下垂輪廓，非圓球）
  draw: (p) => {
    p.glow(8, 9, 5, P.poison, 0.24, 4);
    p.vline(1, 2, 8, P.woodD); p.rect(6, 2, 5, 2, P.leather); p.hline(6, 10, 2, P.woodL); // 吊繩＋束口
    for (let y = 4; y <= 13; y++) {                                                // 梨形囊身：上窄下鼓、底部收圓
      const t = (y - 4) / 9;
      const w = y >= 12 ? 4.4 - (y - 11) * 1.4 : 1.4 + t * 5.0;
      p.hline(8 - w, 7 + w, y, P.poisonD);                                         // 暗底
      p.hline(8 - w + 1, 6 + w, y, P.poison);                                      // 中階
      p.px(Math.round(8 - w) + 1, y, lighten(P.toxic, 0.15));                      // 左受光
      p.px(Math.round(6 + w), y, darken(P.poisonD, 0.35));                         // 右背光
    }
    p.ellipse(6, 8, 1.4, 2, lighten(P.green, 0.2));                                // 囊面高光
    p.px(5, 7, P.white);
    p.px(8, 14, P.toxic); p.px(11, 12, withAlpha(P.toxic, 0.7));                   // 滴落的毒液
    p.px(4, 12, P.greenL);
  },
  weapon: { name: '腐朽瘴囊', damage: 12, fireRate: 1.8, projSpeed: 150, projCount: 1, spread: 0.04, pierce: 2, knockback: 10, projSprite: 'bolt_void', projColor: P.poison, projRadius: 6, projLife: 2.4, projScale: 1.5, status: { type: 'poison' } } });

X({ id: 'x_h2_trapper', name: '裂地壓爆', bg: '#3a2a14', price: 142,
  desc: '【專屬】沉重的壓爆彈頭，轟然擊退成排來敵。',
  // 壓爆地雷：頂上一根 T 形壓桿，下方矮圓筒雷體，地面裂成三道
  draw: (p) => {
    p.rect(5, 1, 6, 1, P.steelL); p.rect(5, 2, 6, 1, P.iron);                      // T 形壓桿
    p.vline(3, 6, 8, P.steel); p.px(8, 3, P.white);
    p.rect(6, 6, 5, 1, P.gray4); p.rect(6, 7, 5, 1, P.gray1);                      // 壓盤
    p.gradV(3, 8, 11, 4, lighten(P.iron, 0.22), darken(P.iron, 0.35));             // 矮圓筒雷體
    p.hline(3, 13, 8, P.steelL); p.hline(3, 13, 11, darken(P.iron, 0.5));
    p.px(3, 9, P.gray4); p.px(13, 10, P.gray1);
    p.hline(5, 10, 10, P.emberL); p.px(8, 10, P.white);                            // 熾熱裝藥縫
    p.line(2, 13, 5, 12, P.emberL); p.line(8, 13, 8, 14, P.ember); p.line(11, 12, 14, 13, P.emberL); // 地裂
  },
  weapon: { name: '裂地壓爆', damage: 22, fireRate: 1.5, projSpeed: 200, projCount: 1, spread: 0.03, pierce: 3, knockback: 88, projSprite: 'bolt', projColor: P.emberL, projRadius: 5, projLife: 1.8, projScale: 1.4 } });

X({ id: 'x_h2_voidcaller', name: '寂滅奇點', bg: '#1a1430', price: 148,
  desc: '【專屬】緩行的虛空奇點，吞噬並貫穿一切途經之物。',
  // 奇點：中央全黑的球體，被一圈「側傾的扁平吸積盤」橫貫（寬扁橢圓的輪廓）
  draw: (p) => {
    p.glow(8, 8, 7, P.purpleL, 0.3, 5);
    p.ellipse(8, 8, 7, 2.4, P.purpleD);                                            // 吸積盤（外）
    p.ellipse(8, 8, 6, 1.7, P.purpleL);
    p.ellipse(8, 7.4, 5, 1.1, P.manaL);                                            // 盤面受光弧
    p.ellipse(8, 8, 3.2, 3.2, P.ink2); p.ellipse(8, 8, 2.4, 2.4, darken(P.void, 0.5)); // 事件視界
    p.ring(8, 8, 3.3, withAlpha(P.manaL, 0.85));                                   // 光環
    p.px(6, 6, withAlpha(P.white, 0.8));
    p.px(1, 8, P.purpleL); p.px(14, 8, P.purpleL);                                 // 盤緣拉伸的光
    p.px(3, 10, P.manaL); p.px(12, 6, P.manaL);
  },
  weapon: { name: '寂滅奇點', damage: 30, fireRate: 1.3, projSpeed: 140, projCount: 1, spread: 0.02, pierce: 4, knockback: 20, projSprite: 'bolt_void', projColor: P.manaL, projRadius: 7, projLife: 2.6, projScale: 1.8 } });

X({ id: 'x_h2_warder', name: '凜冬霜壁', bg: '#14283a', price: 144,
  desc: '【專屬】扇形霜壁震波，擊退並凍緩成群之敵。',
  // 霜壁：一排高低參差的冰柱豎在霜地上（天際線般的鋸齒輪廓，非方盾）
  draw: (p) => {
    p.glow(8, 9, 6, P.ice, 0.26, 4);
    const spike = (x, top, w, c, lt) => {
      for (let y = top; y <= 12; y++) {
        const t = (y - top) / (13 - top), ww = w * (0.25 + t * 0.75);
        p.hline(x - ww, x + ww, y, y < top + 2 ? lt : c);
        p.px(Math.round(x + ww), y, darken(P.blueD, 0.2));                         // 右側暗邊＝柱與柱的斷口
        p.px(Math.round(x - ww), y, lt);
      }
      p.px(x, top, P.white);
    };
    spike(3, 7, 1.6, P.iceD, P.ice);
    spike(7, 2, 2.0, P.ice, P.hiSky);
    spike(10, 6, 1.5, P.iceD, P.ice);
    spike(13, 9, 1.2, darken(P.ice, 0.3), P.iceD);
    p.hline(1, 14, 13, P.shardL); p.hline(1, 14, 14, darken(P.iceD, 0.4));         // 霜地基座
    p.px(2, 13, P.white); p.px(7, 4, P.white);
  },
  weapon: { name: '凜冬霜壁', damage: 16, fireRate: 1.6, projSpeed: 180, projCount: 4, spread: 0.7, pierce: 1, knockback: 60, projSprite: 'bolt', projColor: P.shardL, projRadius: 3.4, projLife: 0.8, status: { type: 'slow' } } });

// ---- R21: four signature weapons for the h3_* heroes (gen_heroes3) ----
X({ id: 'x_h3_spearmaiden', name: '破穹魂矛', bg: '#16223a', price: 140,
  desc: '【專屬】高速擲出的長魂矛，貫穿成列敵陣。',
  // 魂矛：一支「筆直豎立」的長槍——葉形槍尖、頸下紅纓、細長槍桿、底部鐵鐏
  draw: (p) => {
    for (let y = 1; y <= 5; y++) {                                                 // 葉形槍尖
      const w = y <= 3 ? y * 0.75 : (6 - y) * 1.2;
      p.hline(8 - w, 8 + w, y, y <= 3 ? P.steelL : P.steel);
    }
    p.vline(1, 5, 8, P.white); p.px(8, 1, P.glint);
    p.rect(6, 6, 5, 1, P.gold); p.px(6, 6, P.goldL);                               // 槍纓箍
    p.line(7, 7, 5, 9, P.red); p.line(9, 7, 11, 9, P.redD); p.px(8, 8, P.redL);    // 紅纓
    p.vline(6, 13, 8, P.woodD); p.vline(6, 13, 7, P.wood); p.px(7, 8, P.woodL);    // 槍桿
    p.rect(7, 13, 2, 2, P.iron); p.px(7, 13, P.steelL);                            // 鐵鐏
    p.px(8, 4, P.blueL);
  },
  weapon: { name: '破穹魂矛', damage: 15, fireRate: 2.6, projSpeed: 330, projCount: 1, spread: 0.02, pierce: 6, knockback: 26, projSprite: 'bolt', projColor: P.blueL, projRadius: 3.2, projLife: 1.6, projScale: 1.3 } });

X({ id: 'x_h3_plague', name: '疫癘藥瓶', bg: '#1c2418', price: 138,
  desc: '【專屬】拋撒三枚毒瓶，炸開蔓延的疫癘毒霧。',
  // 疫癘藥瓶：方肩的玻璃藥罐，貼著一張骷髏警示標籤，罐口封蠟
  draw: (p) => {
    p.glow(8, 9, 5, P.toxic, 0.24, 4);
    p.rect(6, 1, 4, 2, P.woodD); p.rect(6, 1, 4, 1, P.bone); p.px(6, 1, P.white);  // 木塞
    p.rect(6, 3, 4, 1, darken(P.red, 0.2));                                        // 封蠟
    p.rect(4, 4, 8, 10, darken(P.toxic, 0.45));                                    // 方肩罐身
    p.rect(5, 5, 6, 8, P.toxic); p.rect(5, 5, 6, 2, lighten(P.toxic, 0.35));       // 藥液＋液面
    p.vline(5, 12, 5, withAlpha(P.white, 0.55)); p.px(5, 5, P.white);              // 玻璃反光
    p.vline(5, 12, 11, darken(P.toxic, 0.4)); p.hline(4, 11, 13, darken(P.toxic, 0.55));
    p.rect(6, 8, 4, 4, P.bone);                                                    // 骷髏標籤
    p.px(7, 9, P.ink); p.px(9, 9, P.ink); p.hline(7, 8, 11, P.ink); p.px(8, 10, P.gray2);
    p.px(6, 6, P.greenL);
  },
  weapon: { name: '疫癘藥瓶', damage: 10, fireRate: 2.4, projSpeed: 165, projCount: 3, spread: 0.4, pierce: 1, knockback: 14, projSprite: 'bolt_void', projColor: P.toxic, projRadius: 3.4, projLife: 1.8, status: { type: 'poison' } } });

X({ id: 'x_h3_beastfang', name: '嗜血追爪', bg: '#2a1c14', price: 140,
  desc: '【專屬】釋出追蹤的三道獸爪，撕咬間血流不止。',
  // 獸爪手甲：底下一塊護腕板與指節環，上面伸出三根外彎的獸爪
  draw: (p) => {
    p.gradV(3, 10, 10, 4, lighten(P.leather, 0.28), darken(P.woodD, 0.2));         // 護腕板
    p.hline(3, 12, 10, lighten(P.woodL, 0.3)); p.hline(3, 12, 13, darken(P.woodD, 0.5));
    p.hline(3, 12, 12, withAlpha(P.bone, 0.4));                                    // 縫線
    p.rect(3, 8, 10, 2, P.iron); p.hline(3, 12, 8, P.steelL);                      // 指節橫樑
    for (let i = 0; i < 3; i++) {                                                  // 三根外彎獸爪（實心、由粗轉尖）
      const bx = 4 + i * 3.4, top = 6 - i * 1.6;
      for (let y = 8; y >= top; y--) {
        const t = (8 - y) / (8 - top), cx = bx + t * t * 2.2, w = 1.1 * (1 - t * 0.85);
        p.hline(cx - w, cx + w, y, darken(P.bone, 0.3));
        p.px(Math.round(cx - w), y, P.bone);
        if (w > 0.7) p.px(Math.round(cx), y, lighten(P.bone, 0.2));
      }
      p.px(Math.round(bx + 2.2), Math.round(top), P.white);
    }
    p.px(5, 11, P.redL); p.px(10, 12, P.red); p.px(4, 10, P.glint);                // 血漬＋高光
  },
  weapon: { name: '嗜血追爪', damage: 9, fireRate: 3.2, projSpeed: 200, projCount: 3, spread: 0.5, pierce: 1, knockback: 16, projSprite: 'bolt', projColor: P.emberL, projRadius: 2.8, projLife: 1.6, homing: 5.0, status: { type: 'bleed' } } });

X({ id: 'x_h3_dragoon', name: '墜龍重矛', bg: '#2a1414', price: 150,
  desc: '【專屬】俯衝墜下的龍騎重矛，沉重貫穿、勢不可擋。',
  // 龍騎重矛：由左上尖端往右下加粗的錐形騎槍，槍身中段套一只圓形護手盤
  draw: (p) => {
    p.glow(9, 9, 5, P.ember, 0.2, 4);
    for (let i = 0; i <= 12; i++) {                                                // 錐形槍身（左上尖 → 右下粗）
      const x = 2 + i, y = 2 + i, w = 0.2 + i * 0.3;
      for (let k = -Math.round(w); k <= Math.round(w); k++) {
        p.px(x + k, y - k, k < 0 ? P.steelL : (k === 0 ? P.steel : P.steelD));     // 沿垂直於軸的方向給三階
      }
    }
    p.px(2, 2, P.white); p.px(3, 3, P.glint); p.px(1, 1, P.white);                 // 槍尖
    p.ring(9, 9, 2.8, P.iron); p.ring(9, 9, 2.2, P.steelL);                        // 圓形護手盤
    p.px(7, 7, P.white);
    p.line(11, 8, 14, 5, P.redD); p.line(12, 9, 14, 7, P.red); p.px(14, 5, P.emberL); // 龍翼小鰭
    p.rect(12, 12, 3, 3, P.iron); p.px(12, 12, P.steelL); p.px(14, 14, P.gray1);   // 槍尾配重
  },
  weapon: { name: '墜龍重矛', damage: 38, fireRate: 1.1, projSpeed: 230, projCount: 1, spread: 0.02, pierce: 4, knockback: 80, projSprite: 'bolt', projColor: P.emberL, projRadius: 5.5, projLife: 2.0, projScale: 1.7 } });
