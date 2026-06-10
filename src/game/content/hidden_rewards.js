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
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx } from '../../engine/audio.js';

// local damage roll (mirrors weapons.js — kept local to avoid an import cycle)
function roll(p, base) {
  const crit = Math.random() < Math.min(BALANCE.CRIT_CAP, p.stats.critChance || 0);
  return { dmg: base * BALANCE.PLAYER_DAMAGE_MULT * (p.stats.damageMult || 1) * (crit ? (p.stats.critMult || 2) : 1) * (0.92 + Math.random() * 0.16), crit };
}

// ---- icons ------------------------------------------------------------------
defineIcon('weapon_hr_archive_codex', '#1c1430', (p) => {   // open forbidden tome + floating glyph
  p.rect(3, 9, 10, 5, P.purpleD); p.rect(3, 9, 5, 5, '#3a2a5a'); p.vline(9, 13, 8, P.ink);
  p.hline(4, 7, 10, P.purpleL); p.hline(9, 12, 10, P.purpleL); p.hline(4, 7, 12, withAlpha(P.purpleL, 0.6)); p.hline(9, 12, 12, withAlpha(P.purpleL, 0.6));
  p.glow(8, 5, 4, P.manaL, 0.3, 3); p.star4(8, 5, 2, P.manaL, P.white); p.px(5, 4, P.magenta); p.px(11, 4, P.magenta);
  p.rimLight(P.rim, 0.4);
});
defineIcon('ability_hr_relic_heart', '#3a2a10', (p) => {    // radiant reliquary heart
  p.ellipse(6, 7, 2.4, 2.4, '#ffe9a0'); p.ellipse(10, 7, 2.4, 2.4, '#ffe9a0');
  p.rect(4, 7, 9, 3, '#ffe9a0'); p.px(8, 12, '#ffe9a0'); p.hline(6, 10, 11, '#ffe9a0');
  p.ellipse(8, 8, 1.6, 1.8, P.gold); p.px(8, 8, P.white);
  p.glow(8, 8, 5, '#ffe9a0', 0.3, 4); p.star4(12, 3, 2, P.goldL, P.white); p.star4(3, 11, 1.5, P.goldL, P.white);
});
defineIcon('equip_hr_vault_sigil', '#3a2c0a', (p) => {      // coin-sigil over a keyhole
  p.ellipse(8, 8, 5, 5, P.goldD); p.ellipse(8, 8, 4, 4, P.gold); p.ring(8, 8, 5, P.goldL);
  p.ellipse(8, 7, 1.5, 1.5, P.ink2); p.rect(7, 8, 3, 3, P.ink2);
  p.px(5, 5, P.goldL); p.star4(12, 4, 2, P.goldL, P.white);
  p.rimLight(P.rim, 0.5);
});

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
