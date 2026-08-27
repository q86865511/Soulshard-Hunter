import { Enemies, Items, Equipment, Abilities, Talents, Facilities, Weapons, Characters } from '../registry.js';
import { P, lighten, darken, mix, withAlpha } from '../../../engine/palette.js';
import { dist, dist2, rng, clamp, TAU } from '../../../engine/math.js';
import { Projectile } from '../../projectile.js';
import { glowWorld, fillCircleWorld, drawSprite, lineWorld } from '../../../engine/renderer.js';
import { getSprite, defineSprite, defineAnim, Painter } from '../../../engine/sprites.js';
import { defineIcon, panel, sym } from '../../../art/icons.js';
import { drawSlime, drawBat, drawWisp, drawBrute, drawHunter } from '../../../art/core.js';
import { Sfx } from '../../../engine/audio.js';
import { BALANCE } from '../../balance.js';

// ===== gen_abilities_c =====
const A = (o) => Abilities.register(o);

// ---- tier 1 (common, modest stat passives) --------------------------------
A({
  id: 'ac_warbanner', name: '戰旗鼓舞', tier: 1, weight: 8, maxStacks: 6,
  desc: '傷害 +12%',
  apply: (p) => { p.stats.damageMult *= 1.12; },
});

A({
  id: 'ac_quickdraw', name: '快手扳機', tier: 1, weight: 8, maxStacks: 6,
  desc: '射速 +11%、彈速 +10%',
  apply: (p) => { p.stats.fireRateMult *= 1.11; p.stats.projSpeedMult *= 1.10; },
});

A({
  id: 'ac_fortune', name: '幸運星辰', tier: 1, weight: 7, maxStacks: 5,
  desc: '幸運 +0.10、金幣 +8%、經驗 +10%',   // R17/8.3 HAND-EDIT: gold income halved
  apply: (p) => { p.stats.luck += 0.10; p.stats.goldMult *= 1.08; p.stats.xpMult *= 1.10; },
});

// ---- tier 2 (rare stat passive + behavioural) -----------------------------
A({
  id: 'ac_ironhide', name: '鐵壁之軀', tier: 2, weight: 5, maxStacks: 4,
  desc: '防禦 +3、減傷 +4%、生命上限 +14 並回復',
  apply: (p) => {
    p.stats.defense = (p.stats.defense ?? 0) + 3;
    p.stats.armorMult = (p.stats.armorMult ?? 0) + 0.04;
    p.stats.maxHp += 14; p.heal(14);
  },
});

A({
  id: 'ac_static_field', name: '靜電力場', tier: 2, weight: 4, maxStacks: 4,
  desc: '周期性對最近的敵人釋放靜電電擊',
  apply: (p, run, lvl, world) => {
    if (lvl === 1) {
      p.extra.staticT = 0;
      p.hooks.update.push((pl, dt, w) => {
        const lv = run.abilityLevels.ac_static_field || 1;
        pl.extra.staticT -= dt;
        if (pl.extra.staticT > 0) return;
        pl.extra.staticT = Math.max(0.6, 1.6 - lv * 0.18);
        const tgt = w.nearestEnemy(pl.x, pl.y, 110 + lv * 10);
        if (!tgt) return;
        w.particles.ring(tgt.x, tgt.y, P.blueL, 6, 70);
        w.particles.spawn({ x: pl.x, y: pl.y - 4, life: 0.12, size: 2, color: P.manaL, glow: true });
        tgt.hurt(7 + lv * 4, 0, 0, w);
      });
    }
  },
});

// ---- tier 3 (epic behavioural — gated for later achievement locks) --------
A({
  id: 'ac_volatile_rounds', name: '易爆彈藥', tier: 3, weight: 3, maxStacks: 3, gated: true,
  desc: '命中有機率引發小型爆炸',
  apply: (p, run, lvl, world) => {
    if (lvl === 1) {
      p.hooks.hit.push((e, dmg, w) => {
        const lv = run.abilityLevels.ac_volatile_rounds || 1;
        if (Math.random() > 0.18 + lv * 0.05) return;
        w.spawnExplosion(e.x, e.y, 18 + lv * 5, P.emberL, 9 + lv * 6, { knockback: 50 });
      });
    }
  },
});

A({
  id: 'ac_soul_harvest', name: '魂魄收割', tier: 3, weight: 3, maxStacks: 3, gated: true,
  desc: '擊殺敵人有機率釋放治療脈衝並回復生命',
  apply: (p, run, lvl, world) => {
    if (lvl === 1) {
      p.hooks.kill.push((e, w) => {
        const lv = run.abilityLevels.ac_soul_harvest || 1;
        if (Math.random() > 0.16 + lv * 0.04) return;
        const heal = 2 + lv;
        w.player?.heal?.(heal);
        w.particles.ring(e.x, e.y, P.greenL, 8, 80);
        w.particles.spawn({ x: w.player.x, y: w.player.y - 6, life: 0.2, size: 2.4, color: P.green, glow: true });
      });
    }
  },
});

A({
  id: 'ac_riposte', name: '反擊架式', tier: 3, weight: 3, maxStacks: 3, gated: true,
  desc: '受擊時對周圍反擊並短暫加速（有冷卻）',
  apply: (p, run, lvl, world) => {
    if (lvl === 1) {
      p.extra.riposteCd = 0;
      p.hooks.update.push((pl, dt, w) => { if (pl.extra.riposteCd > 0) pl.extra.riposteCd -= dt; });
      p.hooks.hurt.push((pl, dmg, ang, w) => {
        const lv = run.abilityLevels.ac_riposte || 1;
        if (pl.extra.riposteCd > 0) return;
        pl.extra.riposteCd = Math.max(2.2, 4 - lv * 0.5);
        w.spawnExplosion(pl.x, pl.y, 26 + lv * 5, P.steelL, 8 + lv * 5, { knockback: 90 });
        pl.addTimedBuff(1.4, (q) => { q.stats.speed *= 1 + 0.12 * lv; }, (q) => { q.stats.speed /= 1 + 0.12 * lv; }, P.steelL);
        w.particles.text(pl.x, pl.y - 18, '反擊', { color: P.steelL, size: 12 });
      });
    }
  },
});

// ---- icons -----------------------------------------------------------------
// R28 W3-B-rework — 這 8 張原本全是「sym.<通用符號> ＋ 一兩個像素點」的組合
// （劍＋旗、電＋人字、星、橢圓、環＋電、星、魂晶＋水滴、劍＋環），在 16px 下
// 只剩顏色可分——正是 ART_SPEC 第 5 節鐵律要擋的病症。改為八個各自可命名的實體。
// kira 不給一般被動（R28 收緊：只給進化/epic/隱藏獎勵，ART_SPEC 第 5 節）。

// 戰旗鼓舞 — 旗桿＋槍尖＋飄揚的燕尾旗（旗上金色紋章）。原本借用 sym.sword() 是武器輪廓。
defineIcon('ability_ac_warbanner', P.blood, (p) => {   // R28 W3-B-rework
  p.glow(9, 6, 4.5, P.red, 0.16, 3);
  p.vline(2, 14, 4, P.woodD); p.vline(2, 13, 5, P.wood);          // 旗桿
  p.vline(1, 3, 5, P.goldL); p.px(4, 3, P.gold);                  // 槍尖
  for (let i = 0; i < 8; i++) {                                   // 旗面（右端燕尾）
    const y = 3 + i, w = 7 - Math.abs(i - 3.5) * 0.9;
    p.hline(6, 6 + w, y, i < 2 ? P.red : (i < 5 ? P.redD : darken(P.redD, 0.28)));
  }
  p.hline(6, 12, 3, P.redL); p.vline(3, 10, 6, P.redL);
  p.px(9, 5, P.goldL); p.px(8, 6, P.gold); p.px(10, 6, P.gold); p.px(9, 7, P.goldL); // 紋章
  p.px(2, 3, P.woodL);
});

// 快手扳機 — 一隻側視的手扣在扳機上（掌＋拇指＋伸出的食指＋金屬扳機弧）＋速度線。
// 與「力量結晶」的正面握拳是不同姿態：那是方塊拳體，這是有伸出食指的側手。
defineIcon('ability_ac_quickdraw', '#5a4a1a', (p) => {   // R28 W3-B-rework
  p.glow(7, 9, 5, P.emberL, 0.18, 3);
  p.ellipse(6, 10, 3.4, 3.2, P.skinD);                            // 掌（膚色，與棕底拉開明度）
  p.ellipse(6, 10, 2.9, 2.7, P.skin2);
  p.ellipse(5.2, 9, 2, 1.8, P.skin);
  p.rect(3, 6, 3, 2, P.skin2); p.hline(3, 5, 6, P.skin); p.px(3, 7, P.skinD);  // 拇指
  p.hline(8, 13, 7, P.ink2);                                      // 指與掌之間的暗縫
  p.rect(8, 8, 6, 2, P.skin2); p.hline(8, 13, 8, P.skin);         // 伸出的食指
  p.px(13, 9, P.skinD);
  p.vline(10, 12, 12, P.steelL); p.hline(10, 13, 12, P.steel);    // 扳機與護弓
  p.px(10, 11, P.steelL); p.px(12, 10, P.white);
  p.hline(1, 3, 4, P.goldL); p.hline(1, 4, 6, withAlpha(P.goldL, 0.6));       // 速度線
  p.sparkle(12, 3, P.glint, 1);
});

// 幸運星辰 — 一顆拖著三道尾跡的流星。與「幸運符」的四葉草、「魂爆」的蕈狀雲都不同。
defineIcon('ability_ac_fortune', P.greenD, (p) => {   // R28 W3-B-rework
  p.glow(11, 5, 5, P.gold, 0.24, 3);
  p.line(9, 7, 3, 13, P.goldL); p.line(9, 8, 4, 13, P.gold);      // 尾跡
  p.line(8, 7, 3, 12, withAlpha(P.holyL, 0.55));
  p.px(3, 13, P.goldD); p.px(4, 12, P.gold);
  p.ellipse(11, 5, 2.3, 2.3, P.goldD);                            // 星體
  p.ellipse(11, 5, 1.8, 1.8, P.gold);
  p.ellipse(10.4, 4.4, 1.1, 1.1, P.goldL); p.px(10, 4, P.white);
  p.star4(11, 5, 3, withAlpha(P.holy, 0.85), P.white);
  p.sparkle(5, 6, withAlpha(P.holyL, 0.8), 1); p.px(13, 11, P.goldL);
});

// 鐵壁之軀 — 一段帶垛口的磚石城牆（三排交錯磚縫）。
// 「牆」的方正量體與「鋼鐵之肌」的鱗片、「魂晶結界」的六角泡完全分開。
defineIcon('ability_ac_ironhide', P.steelD, (p) => {   // R28 W3-B-rework
  p.glow(8, 9, 5, P.steelL, 0.12, 3);
  p.rect(3, 3, 3, 2, P.gray2); p.rect(7, 3, 3, 2, P.gray2); p.rect(11, 3, 2, 2, P.gray2); // 垛口
  p.hline(3, 5, 3, P.gray3); p.hline(7, 9, 3, P.gray3); p.hline(11, 12, 3, P.gray3);
  for (let r = 0; r < 3; r++) {                                   // 三排交錯磚
    const y = 5 + r * 3;
    p.rect(2, y, 12, 3, (r % 2) ? P.gray1 : P.gray2);
    p.hline(2, 13, y, P.gray3);
    const off = (r % 2) ? 0 : 2;
    for (let i = 0; i < 3; i++) p.vline(y, y + 2, 3 + off + i * 4, P.ink2);
    p.hline(2, 13, y + 2, P.ink2);
  }
  p.px(3, 3, P.gray4); p.px(2, 5, P.gray4); p.px(8, 8, P.gray4);
});   // tier 2 → kira

// 靜電力場 — 一座特斯拉線圈（寬底座＋支柱＋放電球頂＋向外竄的電弧）。
// 「連鎖閃電」是裸閃電、「過載核心」是有殼電池——三者輪廓互不重疊。
defineIcon('ability_ac_static_field', P.blueD, (p) => {   // R28 W3-B-rework
  p.glow(8, 4, 4.5, P.neon, 0.3, 3);
  p.ellipse(8, 4, 2.8, 2.4, P.neonD);                             // 放電球頂
  p.ellipse(8, 4, 2.1, 1.8, P.neon);
  p.ellipse(7.3, 3.4, 1, 0.9, P.neonL); p.px(7, 3, P.white);
  for (let y = 7; y <= 10; y++) p.hline(5, 11, y, (y % 2) ? lighten(P.bronze, 0.25) : darken(P.bronze, 0.4)); // 銅線圈
  p.vline(7, 10, 5, P.goldL); p.vline(7, 10, 11, darken(P.bronze, 0.5));
  p.vline(5, 7, 8, P.gray2);                                      // 柱
  p.rect(4, 11, 9, 2, P.gray2); p.hline(4, 12, 11, P.gray4);      // 底座
  p.rect(3, 13, 11, 1, P.gray1);
  p.line(5, 3, 2, 5, P.neonL); p.line(11, 3, 14, 5, P.neonL);     // 電弧
  p.line(4, 5, 3, 7, withAlpha(P.neonL, 0.7)); p.line(12, 5, 13, 7, withAlpha(P.neonL, 0.7));
  p.px(2, 5, P.white); p.px(14, 5, P.white);
});   // tier 2 → kira

// 易爆彈藥 — 一枚直立的黃銅彈殼（彈頭＋殼身＋底火座），殼上裂紋外洩火星。
// 與「引爆印記」的球形炸彈是完全不同的量體（柱狀 vs 球狀）。
defineIcon('ability_ac_volatile_rounds', '#5a2a1a', (p) => {   // R28 W3-B-rework
  p.glow(8, 9, 5, P.ember, 0.24, 3);
  for (let i = 0; i < 3; i++) {                                   // 彈頭（鉛灰，與黃銅殼分明度）
    const w = 1.6 - i * 0.5;
    p.hline(8 - w, 7 + w, 5 - i, i < 1 ? P.iron : P.steel);
  }
  p.px(8, 3, P.steelL);
  p.gradV(5, 6, 6, 7, lighten(P.bronze, 0.45), darken(P.bronze, 0.2));  // 黃銅殼身
  p.vline(7, 12, 5, P.goldL);
  p.vline(7, 12, 10, darken(P.bronze, 0.5));
  p.hline(6, 9, 6, P.gray1);                                      // 頸縮
  p.rect(4, 12, 8, 2, P.gray2); p.hline(4, 11, 12, P.gray4); p.hline(4, 11, 13, P.ink2); // 底火座
  p.ellipse(8, 13, 1, 0.8, P.ember);
  p.line(7, 8, 9, 11, P.laser); p.px(8, 9, P.white);              // 裂紋
  p.px(3, 8, P.emberL); p.px(12, 10, P.ember);
});   // tier 3 → kira

// 魂魄收割 — 一盞收魂提燈（提環＋燈頂＋玻璃燈體內的魂火＋燈底），旁有逸散的魂點。
defineIcon('ability_ac_soul_harvest', P.greenD, (p) => {   // R28 W3-B-rework
  p.glow(8, 9, 5.5, P.toxic, 0.24, 3);
  p.ring(8, 3, 2, P.gray3); p.px(8, 1, P.gray4);                  // 提環
  p.rect(5, 5, 7, 2, P.gray2); p.hline(5, 11, 5, P.gray4);        // 燈頂
  p.rect(5, 7, 7, 5, withAlpha(P.void, 0.92));                    // 玻璃燈體
  p.vline(7, 11, 5, P.gray3); p.vline(7, 11, 11, P.gray1);
  p.ellipse(8, 10, 2, 2.4, P.green);                              // 魂火
  p.ellipse(8, 10, 1.2, 1.6, P.toxic); p.px(8, 10, P.white); p.px(8, 7, P.toxic);
  p.rect(4, 12, 9, 2, P.gray1); p.hline(4, 12, 12, P.gray3);      // 燈底
  p.px(3, 6, withAlpha(P.toxic, 0.8)); p.px(13, 8, withAlpha(P.toxic, 0.7));
});   // tier 3 → kira

// 反擊架式 — 一面斜置的擋板把入射的紅色攻擊彈開（V 形反彈箭頭＋撞擊火花）。
// 原本是 sym.sword()＋環（武器輪廓＋通用環），兩項都違反被動的文法。
defineIcon('ability_ac_riposte', P.steelD, (p) => {   // R28 W3-B-rework
  p.glow(8, 8, 5, P.steelL, 0.16, 3);
  for (let i = 0; i < 10; i++) {                                  // 斜擋板
    const x = 3 + i, y = 12 - i;
    p.px(x - 1, y, P.iron); p.px(x, y, P.steel); p.px(x + 1, y, P.steelL); p.px(x, y + 1, P.steelD);
  }
  p.line(13, 2, 10, 5, withAlpha(P.laser, 0.85)); p.px(10, 5, P.laser);  // 入射
  p.px(13, 2, P.redL);
  p.line(9, 6, 13, 10, P.hiSky);                                  // 反彈
  p.hline(11, 13, 10, P.hiSky); p.vline(8, 10, 13, P.hiSky);
  p.star4(9, 6, 3, withAlpha(P.glint, 0.9), P.white);             // 撞擊火花
  p.px(6, 9, P.white);
});   // tier 3 → kira
