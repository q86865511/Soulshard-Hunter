// R17/6.x — EXCLUSIVE hidden-room rewards (#11). Each of the four hidden rooms now
// permanently unlocks a piece of content that exists NOWHERE else in the game:
//   魂晶寶庫  → 飾品「寶庫之印」 (hr_vault_sigil, 傳說)
//   遠古檔案室 → 武器「禁書迴響」 (hr_archive_codex)
//   聖物密室  → 被動「聖物之心」 (hr_relic_heart)
//   彩蛋房    → 隱藏造型「開發者 · 小妖」 (devkid — defined in characters.js SKINS)
// The three ids below are appended to unlocks.js LOCKED so they never appear in any
// pool until the matching room is claimed (hidden.js pushes them into META.unlocked).
// Registered through the normal registries — once unlocked they flow through level-up /
// gear rolls like any other content. Hand-written (NOT a gen/ file).
import { Weapons, Abilities, Equipment } from './registry.js';
import { Projectile } from '../projectile.js';
import { BALANCE } from '../balance.js';
import { defineIcon } from '../../art/icons.js';
import { P, withAlpha, darken } from '../../engine/palette.js';
import { Sfx } from '../../engine/audio.js';

// local damage roll (mirrors weapons.js — kept local to avoid an import cycle)
function roll(p, base) {
  const crit = Math.random() < Math.min(BALANCE.CRIT_CAP, p.stats.critChance || 0);
  return { dmg: base * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1) * (crit ? (p.stats.critMult || 2) : 1) * (0.92 + Math.random() * 0.16), crit };
}

// ---- icons ------------------------------------------------------------------
// R28 W3-B-rework — 禁書迴響：一本攤開的禁書（左右書頁＋隆起的書脊＋斷裂的鎖扣鏈
// ＋頁面上浮起的符文）。ART_SPEC 第 5 節鐵律：glyph 要畫「那一件具體的東西」——
// 這是全套 43 張武器裡唯一的「書冊」輪廓，不與任何刃/管/球共形。
defineIcon('weapon_hr_archive_codex', '#1c1430', (p) => {   // R28 B-rework
  p.glow(8, 4, 4.5, P.manaL, 0.26, 3);
  const SPAN = [[8, 3, 12], [9, 2, 13], [10, 2, 13], [11, 2, 13], [12, 3, 12], [13, 4, 11]];
  for (const [y, x0, x1] of SPAN) {                          // 攤開的書頁
    p.hline(x0, 7, y, '#4a3a6e');                            // 左頁（受光）
    p.hline(8, x1, y, P.purpleD);                            // 右頁（背光）
  }
  p.hline(3, 12, 8, '#6a5a92');                              // 上緣受光
  p.hline(4, 11, 14, darken(P.purpleD, 0.5));                // 書口暗邊
  p.vline(7, 13, 7, P.ink2); p.vline(7, 13, 8, P.ink);       // 書脊溝
  p.hline(3, 6, 10, P.purpleL); p.hline(3, 6, 12, withAlpha(P.purpleL, 0.55));   // 行文
  p.hline(10, 13, 10, P.purpleL); p.hline(10, 13, 12, withAlpha(P.purpleL, 0.55));
  p.px(12, 9, P.gold); p.px(13, 10, P.goldD); p.px(13, 11, P.goldD);             // 斷裂的鎖扣鏈
  p.star4(8, 4, 2, P.manaL, P.white);                        // 浮起的符文
  p.px(5, 5, P.magenta); p.px(11, 5, P.magenta); p.px(8, 2, P.magenta);
  p.rimLight(P.rim, 0.4);
}, { kira: true });   // tier 3 → kira
// R28 W3-B-rework — 聖物之心：一具金色聖物匣（拱頂＋匣身＋立柱底座），中央光窗
// 透出心形聖光。原本是一顆裸露的金色心臟，與「生命寶石」「吸血鬼牙」「血之契約」
// 擠在同一個心形輪廓家族（ART_SPEC 第 5 節鐵律：同類別不得同輪廓）；現在的輪廓
// 是一只有拱頂的方匣，跟任何一顆心都不會混。
defineIcon('ability_hr_relic_heart', '#3a2a10', (p) => {   // R28 W3-B-rework
  p.glow(8, 8, 6, '#ffe9a0', 0.26, 4);
  for (let i = 0; i < 3; i++) {                              // 拱頂
    const w = 4 - i;
    p.hline(8 - w, 7 + w, 5 - i, i ? P.gold : P.goldL);
  }
  p.rect(3, 6, 11, 7, P.goldD);                              // 匣身
  p.gradV(3, 6, 11, 7, P.gold, darken(P.goldD, 0.28));
  p.hline(3, 13, 6, P.goldL); p.vline(6, 12, 3, P.goldL);
  p.rect(6, 8, 5, 4, '#2a1c06');                             // 光窗
  p.ellipse(7, 9, 1.1, 1.1, '#ffe9a0'); p.ellipse(9, 9, 1.1, 1.1, '#ffe9a0');
  p.rect(6, 9, 5, 2, '#ffe9a0'); p.hline(7, 9, 11, '#ffe9a0'); p.px(8, 12, '#ffe9a0');
  p.px(8, 10, P.white); p.px(7, 9, P.white);
  p.hline(3, 12, 13, P.goldD);                               // 底座
  p.vline(7, 12, 4, P.gold); p.vline(7, 12, 12, darken(P.goldD, 0.2));
  p.star4(4, 4, 2, P.goldL, P.white);
}, { kira: true });   // tier 3 → kira
// R28 W3-B-rework — 寶庫之印：一枚「可穿戴」的鏈墜（環扣＋兩節鏈＋盾形金牌，
// 牌面鑄一個鑰匙孔）。裝備類文法要求完整的可穿戴物件，不是一枚漂浮的符號圓幣。
defineIcon('equip_hr_vault_sigil', '#3a2c0a', (p) => {   // R28 B-rework
  p.glow(8, 10, 5, P.gold, 0.24, 3);
  p.ring(8, 2, 1.5, P.goldL); p.px(8, 2, '#241a06'); p.px(8, 1, P.white);   // 環扣（中央挖空才是「環」）
  p.ellipse(8, 4, 1.2, 1.1, P.goldD); p.px(8, 4, '#241a06'); p.px(7, 4, P.gold);   // 兩節鏈
  p.px(8, 5, '#241a06');                                     // 鏈節間的暗隙
  p.ellipse(8, 6, 1.2, 1.1, P.gold); p.px(8, 6, '#3a2c0a'); p.px(7, 6, P.goldL);
  for (let y = 7; y <= 13; y++) {                            // 盾形金牌
    const w = y < 11 ? 4 : 4 - (y - 10) * 1.15;
    p.hline(8 - w, 7 + w, y, P.goldD);
    p.hline(8 - w, 8 - w + 1, y, P.gold);
  }
  p.hline(4, 11, 7, P.goldL); p.px(5, 8, P.white);           // 牌面受光上緣
  p.hline(6, 9, 13, darken(P.goldD, 0.45));                  // 牌尖暗面
  p.ellipse(8, 9.4, 1.3, 1.3, P.ink2);                       // 鑰匙孔
  for (let y = 10; y <= 12; y++) { const w = 12 - y; p.hline(8 - w, 7 + w, y, P.ink2); }
  p.px(7, 9, P.shadow);
  p.rimLight(P.rim, 0.5);
}, { kira: true });   // tier 4 → kira

// ---- 遠古檔案室 → weapon「禁書迴響」 ------------------------------------------
Weapons.register({
  id: 'hr_archive_codex', name: '禁書迴響', icon: 'weapon_hr_archive_codex', tier: 3, weight: 4, maxLevel: 7,
  cooldown: (l) => Math.max(0.9, 2.4 - l * 0.18),
  fire(world, p, inst) {
    const l = inst.level, count = 2 + Math.floor(l / 2);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;   // glyphs erupt outward, then home
      const { dmg, crit } = roll(p, 10 + l * 4);
      world.addProjectile(new Projectile({ x: p.x, y: p.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, damage: dmg, crit, faction: 'player', sprite: 'bolt_void', color: P.manaL, homing: 5.0, life: 2.6, knockback: 18 }));
    }
    Sfx.play('shoot');
  },
  levelDesc: (l) => `符文彈 ${2 + Math.floor(l / 2)} · 單發 ${10 + l * 4} · 追蹤`,
  desc: '誦讀禁書，放出迴響的追魂符文彈。（隱藏房間專屬）',
});

// ---- 聖物密室 → passive「聖物之心」 -------------------------------------------
Abilities.register({
  id: 'hr_relic_heart', name: '聖物之心', tier: 3, weight: 3, maxStacks: 3,
  desc: '每擊殺 40/35/30 名敵人，爆發聖光重創四周並獲得 0.6 秒無敵。（隱藏房間專屬）',
  apply: (p, run, lvl) => {
    if (lvl === 1) p.hooks.kill.push((e, w) => {
      const lv = run.abilityLevels.hr_relic_heart || 1;
      const need = [40, 35, 30][Math.min(2, lv - 1)];
      run._relicKills = (run._relicKills || 0) + 1;
      if (run._relicKills < need) return;
      run._relicKills = 0;
      w.spawnExplosion(p.x, p.y, 70, '#ffe9a0', 60 + lv * 30, { knockback: 90 });
      p.invuln = Math.max(p.invuln || 0, 0.6);
      try { w.particles.ring(p.x, p.y, '#ffe9a0', 30, 170); Sfx.play('levelup'); } catch (err) { /* */ }
    });
  },
});

// ---- 魂晶寶庫 → trinket「寶庫之印」 -------------------------------------------
Equipment.register({
  id: 'hr_vault_sigil', name: '寶庫之印', slot: 'trinket', tier: 4, weight: 3, price: 140, icon: 'equip_hr_vault_sigil',
  desc: '金幣 +15%、幸運 +0.3、拾取範圍 +15%。（隱藏房間專屬）',
  apply: (p) => { p.stats.goldMult *= 1.15; p.stats.luck = (p.stats.luck || 0) + 0.3; p.stats.pickupRange *= 1.15; },
});

// reveal metadata for the hidden-room panel (icon + display name per reward)
export const HIDDEN_REWARD_INFO = {
  vault: { icon: 'equip_hr_vault_sigil', name: '寶庫之印', kindLabel: '傳說飾品' },
  archive: { icon: 'weapon_hr_archive_codex', name: '禁書迴響', kindLabel: '專屬武器' },
  relic: { icon: 'ability_hr_relic_heart', name: '聖物之心', kindLabel: '專屬被動' },
  egg: { icon: null, name: '開發者 · 小妖', kindLabel: '隱藏造型' },   // icon resolved to the skinned sprite at draw time
};
