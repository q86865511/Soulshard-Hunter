// Core permanent talents (meta). Bought with gold in the hub; applied to the
// run's BASE stats at run start via state.applyMeta(). Workflow adds more.
//
// Schema:
//   { id, name, desc, branch:'offense'|'defense'|'utility'|'fortune',
//     row, maxLevel, icon:'talent_<id>',
//     cost(level) -> gold for the NEXT level (level is current 0-based),
//     apply(stats, level, run) -> mutate base stats,
//     requires?: [talentId] }
import { Talents } from './registry.js';
import { BALANCE } from '../balance.js';

const T = (o) => Talents.register(o);
// Steeper growth + smaller per-level gains: meta is a gentle edge, not a power crutch.
// round16/9.2: base cost ×TALENT_COST_MUL (town spends were too cheap); growth rate unchanged.
const cost = (base, growth = 1.7) => (lvl) => Math.round(base * BALANCE.TALENT_COST_MUL * Math.pow(growth, lvl));

// R17/8.3: per-level values trimmed ~25-30% (town meta was stacking toward near-invincible
// late-run builds) and the gold talent HALVED per the economy rebalance.
// offense ------------------------------------------------------------------
T({ id: 't_damage', name: '鋒銳', desc: '基礎傷害 +2%/級', branch: 'offense', row: 0, maxLevel: 8, icon: 'talent_t_damage', cost: cost(45), apply: (s, l) => s.damageMult *= 1 + 0.02 * l });
T({ id: 't_firerate', name: '連射', desc: '射速 +2.5%/級', branch: 'offense', row: 1, maxLevel: 6, icon: 'talent_t_firerate', cost: cost(60), apply: (s, l) => s.fireRateMult *= 1 + 0.025 * l });
T({ id: 't_crit', name: '致命', desc: '暴擊率 +1.2%/級', branch: 'offense', row: 2, maxLevel: 6, icon: 'talent_t_crit', cost: cost(75), apply: (s, l) => s.critChance += 0.012 * l, requires: ['t_damage'] });

// defense ------------------------------------------------------------------
T({ id: 't_hp', name: '強健', desc: '生命上限 +7/級', branch: 'defense', row: 0, maxLevel: 8, icon: 'talent_t_hp', cost: cost(45), apply: (s, l) => s.maxHp += 7 * l });
T({ id: 't_armor', name: '護甲', desc: '減傷 +1/級', branch: 'defense', row: 1, maxLevel: 5, icon: 'talent_t_armor', cost: cost(70), apply: (s, l) => s.defense += l });
T({ id: 't_regen', name: '回復', desc: '每秒回復 +0.15/級', branch: 'defense', row: 2, maxLevel: 5, icon: 'talent_t_regen', cost: cost(80), apply: (s, l) => s.hpRegen += 0.15 * l, requires: ['t_hp'] });

// utility ------------------------------------------------------------------
T({ id: 't_speed', name: '敏捷', desc: '移動速度 +2%/級', branch: 'utility', row: 0, maxLevel: 6, icon: 'talent_t_speed', cost: cost(50), apply: (s, l) => s.speed *= 1 + 0.02 * l });
T({ id: 't_pickup', name: '感知', desc: '拾取範圍 +9%/級', branch: 'utility', row: 1, maxLevel: 5, icon: 'talent_t_pickup', cost: cost(45), apply: (s, l) => s.pickupRange *= 1 + 0.09 * l });
T({ id: 't_dash', name: '疾走', desc: '衝刺冷卻 -4%/級', branch: 'utility', row: 2, maxLevel: 5, icon: 'talent_t_dash', cost: cost(75), apply: (s, l) => s.dashCd *= Math.pow(0.96, l), requires: ['t_speed'] });

// fortune ------------------------------------------------------------------
T({ id: 't_gold', name: '財運', desc: '金幣獲取 +3%/級', branch: 'fortune', row: 0, maxLevel: 6, icon: 'talent_t_gold', cost: cost(55), apply: (s, l) => s.goldMult *= 1 + 0.03 * l });
T({ id: 't_luck', name: '幸運', desc: '幸運 +0.05/級（掉落/魂晶）', branch: 'fortune', row: 1, maxLevel: 5, icon: 'talent_t_luck', cost: cost(70), apply: (s, l) => s.luck += 0.05 * l });
T({ id: 't_xp', name: '頓悟', desc: '經驗獲取 +4%/級', branch: 'fortune', row: 2, maxLevel: 5, icon: 'talent_t_xp', cost: cost(60), apply: (s, l) => s.xpMult *= 1 + 0.04 * l });

export const TALENT_BRANCHES = [
  { id: 'offense', name: '攻勢', color: '#e2474c' },
  { id: 'defense', name: '守備', color: '#3f7bdc' },
  { id: 'utility', name: '機動', color: '#5bbf57' },
  { id: 'fortune', name: '財富', color: '#ffcf4d' },
];
