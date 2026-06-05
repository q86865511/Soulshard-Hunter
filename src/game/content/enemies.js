// Core enemy definitions. Workflow-generated enemies register alongside these.
import { Enemies } from './registry.js';
import { P } from '../../engine/palette.js';

Enemies.registerMany([
  {
    id: 'slime', name: '黏液史萊姆', sprite: 'slime', ai: 'chase', tier: 1, weight: 12,
    hp: 24, speed: 30, damage: 9, radius: 6, xp: 4, gold: 2, bloodColor: P.greenD,
    desc: '最常見的地城害蟲，緩慢但成群結隊。',
  },
  {
    id: 'bat', name: '暗影蝙蝠', sprite: 'bat', ai: 'flyer', tier: 1, weight: 9,
    hp: 14, speed: 60, damage: 7, radius: 5, xp: 3, gold: 1, bloodColor: P.purpleD,
    desc: '飛行迅速、軌跡飄忽，難以瞄準。',
  },
  {
    id: 'wisp', name: '幽魂鬼火', sprite: 'wisp', ai: 'shooter', tier: 1, weight: 7,
    hp: 18, speed: 34, damage: 6, radius: 6, xp: 5, gold: 2, shard: 0.04, bloodColor: P.mana,
    attack: { range: 130, cooldown: 1.7, projSpeed: 95, projDamage: 8, projColor: P.manaL, projSprite: 'bolt_enemy' },
    desc: '保持距離放出魂火彈。',
  },
  {
    id: 'brute', name: '石拳魔像', sprite: 'brute', ai: 'charger', tier: 2, weight: 5,
    hp: 78, speed: 26, damage: 15, radius: 8, xp: 11, gold: 5, shard: 0.08, knockbackResist: 0.55, bloodColor: P.gray1,
    attack: { range: 150, cooldown: 2.3 },
    desc: '蓄力後猛烈衝撞，硬直高、抗擊退。',
  },
  {
    // 死神 — hidden, killable superboss summoned 30s after the final boss dies (E2).
    // Registered in core so it is always available; spawned only by the run scene.
    id: 'reaper', name: '死神', sprite: 'reaper', ai: 'charger', tier: 5, boss: true, weight: 0,
    hp: 5200, speed: 56, damage: 38, radius: 11, scale: 2.2, xp: 0, gold: 12, shard: 0.6,
    knockbackResist: 0.82, bloodColor: P.void,
    attack: { range: 240, cooldown: 1.4, burst: 6, spread: 0.5, projSpeed: 150, projDamage: 26, projColor: P.redL, projSprite: 'bolt_enemy' },
    hitStatus: { type: 'slow', mult: 0.6, dur: 2, chance: 0.8 },
    desc: '隱藏的死神，動作飛快、收割靈魂——但並非不可戰勝。',
  },
]);
