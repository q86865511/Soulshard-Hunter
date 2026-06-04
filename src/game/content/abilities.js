// Core in-run abilities chosen on level-up. Workflow content registers more.
import { Abilities } from './registry.js';
import { P } from '../../engine/palette.js';
import { dist } from '../../engine/math.js';
import { rng } from '../../engine/math.js';

const A = (o) => Abilities.register(o);

// ---- tier 1 (common, stat boosts) -----------------------------------------
A({ id: 'power', name: '力量結晶', tier: 1, weight: 10, maxStacks: 8, desc: '傷害 +15%', apply: (p) => p.stats.damageMult *= 1.15 });
A({ id: 'haste', name: '迅捷符文', tier: 1, weight: 10, maxStacks: 8, desc: '射速 +12%', apply: (p) => p.stats.fireRateMult *= 1.12 });
A({ id: 'swift', name: '疾風之靴', tier: 1, weight: 9, maxStacks: 6, desc: '移動速度 +10%', apply: (p) => p.stats.speed *= 1.10 });
A({ id: 'vitality', name: '生命寶石', tier: 1, weight: 8, maxStacks: 8, desc: '生命上限 +16 並回復', apply: (p) => { p.stats.maxHp += 16; p.heal(16); } });
A({ id: 'crit', name: '銳利之眼', tier: 1, weight: 8, maxStacks: 6, desc: '暴擊率 +7%', apply: (p) => p.stats.critChance += 0.07 });
A({ id: 'velocity', name: '加速彈道', tier: 1, weight: 7, maxStacks: 5, desc: '彈速 +22%', apply: (p) => p.stats.projSpeedMult *= 1.22 });
A({ id: 'magnet', name: '拾取磁石', tier: 1, weight: 6, maxStacks: 4, desc: '拾取範圍 +60%', apply: (p) => p.stats.pickupRange *= 1.6 });
A({ id: 'greed', name: '貪婪之觸', tier: 1, weight: 6, maxStacks: 5, desc: '金幣獲取 +25%', apply: (p) => p.stats.goldMult *= 1.25 });
A({ id: 'regen', name: '再生之種', tier: 1, weight: 6, maxStacks: 5, desc: '每秒回復 +0.6 生命', apply: (p) => p.stats.hpRegen += 0.6 });
A({ id: 'dash', name: '瞬影', tier: 1, weight: 5, maxStacks: 3, desc: '衝刺冷卻 -22%', apply: (p) => p.stats.dashCd *= 0.78 });

// ---- tier 2 (rare) ---------------------------------------------------------
A({ id: 'multishot', name: '分裂魂彈', tier: 2, weight: 5, maxStacks: 4, desc: '投射物數量 +1', apply: (p) => p.stats.projCountAdd += 1 });
A({ id: 'pierce', name: '貫穿之矢', tier: 2, weight: 5, maxStacks: 4, desc: '穿透 +1', apply: (p) => p.stats.pierceAdd += 1 });
A({ id: 'lifesteal', name: '吸血鬼牙', tier: 2, weight: 4, maxStacks: 4, desc: '吸血 +2.5%', apply: (p) => p.stats.lifesteal += 0.025 });
A({ id: 'homing', name: '追蹤魂彈', tier: 2, weight: 4, maxStacks: 3, desc: '子彈追蹤敵人', apply: (p) => p.stats.homing += 2.2 });
A({ id: 'luck', name: '幸運符', tier: 2, weight: 4, maxStacks: 4, desc: '幸運 +0.15（掉落/魂晶）', apply: (p) => p.stats.luck += 0.15 });
A({
  id: 'bigshot', name: '巨型魂晶', tier: 2, weight: 4, maxStacks: 3, desc: '彈體 +30%、傷害 +12%',
  apply: (p) => { p.weapon.projScale = (p.weapon.projScale || 1) * 1.3; p.weapon.projRadius = (p.weapon.projRadius || 3) * 1.3; p.stats.damageMult *= 1.12; },
});
A({
  id: 'thorns', name: '荊棘護甲', tier: 2, weight: 4, maxStacks: 3, desc: '受擊時對周圍造成傷害',
  apply: (p, run, lvl) => {
    if (lvl === 1) p.hooks.hurt.push((pl, dmg, ang, w) => {
      w.spawnExplosion(pl.x, pl.y, 28, P.bone, 8 * (run.abilityLevels.thorns || 1), { knockback: 90 });
    });
  },
});

// ---- tier 3 (epic, behavioural) -------------------------------------------
A({
  id: 'orbit', name: '環繞魂衛', tier: 3, weight: 3, maxStacks: 3, desc: '召喚環繞的魂晶持續傷害敵人',
  apply: (p, run, lvl) => {
    if (lvl === 1) {
      p.extra.orbitT = 0; p.extra.orbitCd = new Map();
      p.hooks.update.push((pl, dt, w) => {
        const lv = run.abilityLevels.orbit || 1;
        const n = lv + 1;
        pl.extra.orbitT += dt * 2.4;
        for (let i = 0; i < n; i++) {
          const a = pl.extra.orbitT + (i / n) * Math.PI * 2;
          const ox = pl.x + Math.cos(a) * 30, oy = pl.y + Math.sin(a) * 30;
          w.particles.spawn({ x: ox, y: oy, life: 0.18, size: 2.4, color: P.shardL, glow: true, drag: 0.8 });
          for (const e of w.enemies) {
            if (e.dead || e.spawnT > 0) continue;
            if (dist(ox, oy, e.x, e.y) < e.radius + 5) {
              const t = pl.extra.orbitCd.get(e) || 0;
              if (w.time > t) { pl.extra.orbitCd.set(e, w.time + 0.3); e.hurt(7 + lv * 4, Math.cos(a) * 30, Math.sin(a) * 30, w); }
            }
          }
        }
      });
    }
  },
});
A({
  id: 'nova', name: '魂爆', tier: 3, weight: 3, maxStacks: 3, desc: '擊殺敵人時引發魂晶爆炸',
  apply: (p, run, lvl) => {
    if (lvl === 1) p.hooks.kill.push((e, w) => {
      const lv = run.abilityLevels.nova || 1;
      w.spawnExplosion(e.x, e.y, 22 + lv * 6, P.emberL, 12 + lv * 7, { knockback: 60 });
    });
  },
});
A({ id: 'overload', name: '過載核心', tier: 3, weight: 3, maxStacks: 3, desc: '射速 +18%、傷害 +8%', apply: (p) => { p.stats.fireRateMult *= 1.18; p.stats.damageMult *= 1.08; } });
A({
  id: 'glasscannon', name: '玻璃大砲', tier: 3, weight: 2, maxStacks: 1, desc: '傷害 +45%，但生命上限 -25%',
  apply: (p) => { p.stats.damageMult *= 1.45; p.stats.maxHp = Math.round(p.stats.maxHp * 0.75); p.hp = Math.min(p.hp, p.stats.maxHp); },
});

// ---- cursed (strong, but with a price — the curse system) ------------------
A({ id: 'curse_bloodpact', name: '血之契約', tier: 3, weight: 3, maxStacks: 2, cursed: true, desc: '傷害 +35%，但生命上限 -18%',
  apply: (p) => { p.stats.damageMult *= 1.35; p.stats.maxHp = Math.round(p.stats.maxHp * 0.82); p.hp = Math.min(p.hp, p.stats.maxHp); } });
A({ id: 'curse_frenzy', name: '狂亂咒印', tier: 3, weight: 3, maxStacks: 2, cursed: true, desc: '射速 +30%，但減傷 -3',
  apply: (p) => { p.stats.fireRateMult *= 1.30; p.stats.defense -= 3; } });
A({ id: 'curse_titan', name: '巨力詛咒', tier: 3, weight: 2, maxStacks: 2, cursed: true, desc: '傷害 +50%，但移速 -15%',
  apply: (p) => { p.stats.damageMult *= 1.50; p.stats.speed *= 0.85; } });
A({ id: 'curse_glasssoul', name: '琉璃魂', tier: 3, weight: 2, maxStacks: 1, cursed: true, desc: '暴擊 +20%、暴傷 +0.5，但閃避歸零、生命 -10%',
  apply: (p) => { p.stats.critChance += 0.20; p.stats.critMult += 0.5; p.stats.dodge = 0; p.stats.maxHp = Math.round(p.stats.maxHp * 0.9); p.hp = Math.min(p.hp, p.stats.maxHp); } });
A({ id: 'curse_greedpact', name: '貪婪之約', tier: 2, weight: 3, maxStacks: 2, cursed: true, desc: '金幣/魂晶 +40%，但受到傷害 +10%',
  apply: (p) => { p.stats.goldMult *= 1.4; p.stats.shardMult = (p.stats.shardMult || 1) * 1.4; p.stats.armorMult = (p.stats.armorMult || 0) - 0.10; } });

// ---- helpers ---------------------------------------------------------------
export function getAbilityChoices(run, n = 3) {
  const maxTier = run.level >= 4 ? 3 : run.level >= 2 ? 2 : 1;
  let pool = Abilities.all().filter((d) => (d.tier ?? 1) <= maxTier && (run.abilityLevels[d.id] || 0) < (d.maxStacks ?? 99));
  const picks = [];
  for (let i = 0; i < n && pool.length; i++) {
    const d = rng.weighted(pool, (x) => x.weight ?? 1);
    picks.push(d);
    pool = pool.filter((x) => x !== d);
  }
  return picks;
}

export function applyAbility(run, player, world, def) {
  const lvl = (run.abilityLevels[def.id] || 0) + 1;
  run.abilityLevels[def.id] = lvl;
  if (lvl === 1) run.abilities.push(def.id);
  try { def.apply?.(player, run, lvl, world); } catch (e) { console.warn('ability apply failed', def.id, e); }
}

export const TIER_COLORS = {
  1: { bg: '#26305a', accent: P.gray4, label: '普通' },
  2: { bg: '#3a2a6a', accent: P.purpleL, label: '稀有' },
  3: { bg: '#5a4011', accent: P.goldL, label: '史詩' },
};
