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
  desc: '幸運 +0.10、金幣 +15%、經驗 +10%',
  apply: (p) => { p.stats.luck += 0.10; p.stats.goldMult *= 1.15; p.stats.xpMult *= 1.10; },
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
defineIcon('ability_ac_warbanner', P.blood, (p) => { sym.sword(p); p.vline(2, 13, 3, P.woodD); p.rect(4, 3, 5, 4, P.redD); p.px(4, 3, P.redL); });
defineIcon('ability_ac_quickdraw', '#5a4a1a', (p) => { sym.bolt(p, P.emberL); sym.chevrons(p, P.goldL); });
defineIcon('ability_ac_fortune', P.greenD, (p) => { sym.star(p, P.goldL); p.px(4, 12, P.greenL); p.px(12, 4, P.white); });
defineIcon('ability_ac_ironhide', P.steelD, (p) => { p.ellipse(8, 8, 4, 5, P.steel); p.ellipse(8, 8, 2.6, 3.6, P.steelL); p.vline(4, 12, 8, darken(P.steel, 0.2)); p.outline(P.ink); });
defineIcon('ability_ac_static_field', P.blueD, (p) => { p.ring(8, 8, 5, P.blue); sym.bolt(p, P.manaL); p.px(3, 8, P.blueL); p.px(13, 8, P.blueL); });
defineIcon('ability_ac_volatile_rounds', '#5a2a1a', (p) => { sym.star(p, P.emberL); p.ellipse(8, 8, 2, 2, P.ember); p.px(8, 8, P.white); });
defineIcon('ability_ac_soul_harvest', P.greenD, (p) => { sym.shardSym(p, P.greenL); sym.drop(p, P.green); });
defineIcon('ability_ac_riposte', P.steelD, (p) => { sym.sword(p); p.line(3, 13, 13, 3, P.steelL); p.ring(8, 8, 5, P.steel); });
