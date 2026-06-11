// R18/B7 — 無盡模式詛咒 (endless curses). Every CURSE_INTERVAL the player picks 1 of 3
// from this pool; curse and reward apply together, stacking without limit. Each `apply(s)`
// mutates the run scene `s` in place — either a multiplicative ENEMY accumulator the spawn
// path consumes (s.curseHpMul / curseDmgMul / curseSpdMul / curseCapAdd / curseBossHpMul),
// a one-shot PLAYER stat change (s.player.stats.* — fields all exist in makeBaseStats), a
// flag the run loop reads (curseBossHeal / curseBossChest / curseDrain), or an immediate
// economy reward (s.run.gold / shards). All host-side scalars → reach co-op guests via the
// normal enemy-stat snapshot, zero protocol change. Hand-written (NOT a gen/ file).
import { P } from '../../engine/palette.js';

export const CURSES = [
  { id: 'c_bloodtide', name: '嗜血潮', curse: '敵人傷害 +15%', reward: '立得 350 金幣', color: P.redL,
    apply: (s) => { s.curseDmgMul *= 1.15; s.run.gold += 350; } },
  { id: 'c_ironhide', name: '鐵骨', curse: '敵人生命 +20%', reward: '+120 魂晶', color: P.steelL,
    apply: (s) => { s.curseHpMul *= 1.20; s.run.shards += 120; } },
  { id: 'c_gale', name: '疾風群', curse: '敵人移速 +12%', reward: '你的移速 +6%', color: P.skyL,
    apply: (s) => { s.curseSpdMul *= 1.12; s.player.stats.speed *= 1.06; } },
  { id: 'c_legion', name: '增援', curse: '刷怪上限 +25%', reward: '經驗獲取 +15%', color: P.toxic,
    apply: (s) => { s.curseCapAdd += 0.25; s.player.stats.xpMult *= 1.15; } },
  { id: 'c_dull', name: '鈍刃', curse: '你的傷害 -10%', reward: '幸運 +0.25、拾取範圍 +40', color: P.goldL,
    apply: (s) => { s.player.stats.damageMult *= 0.9; s.player.stats.luck += 0.25; s.player.stats.pickupRange += 40; } },
  { id: 'c_brittle', name: '脆甲', curse: '減傷 -2', reward: '每波 Boss 擊殺後回復 30% 生命', color: P.emberL,
    apply: (s) => { s.player.stats.defense -= 2; s.curseBossHeal += 0.30; } },
  { id: 'c_gamble', name: '賭命', curse: '受到傷害 +20%', reward: '金幣獲取 +25%', color: P.magenta,
    apply: (s) => { s.curseDmgMul *= 1.20; s.player.stats.goldMult *= 1.25; } },
  { id: 'c_tyrant', name: '巨王', curse: 'Boss 生命 +30%', reward: 'Boss 額外掉落一個寶箱', color: P.purpleL,
    apply: (s) => { s.curseBossHpMul *= 1.30; s.curseBossChest = true; } },
  { id: 'c_seal', name: '禁療', curse: '治療效果 -50%', reward: '生命上限 +40（立即回滿差額）', color: P.holyL,
    apply: (s) => { s.player.healMult = (s.player.healMult || 1) * 0.5; s.player.stats.maxHp += 40; s.player.heal(40); } },
  { id: 'c_blur', name: '失準', curse: '暴擊率 -8%', reward: '射速 +10%', color: P.shardL,
    apply: (s) => { s.player.stats.critChance = Math.max(0, s.player.stats.critChance - 0.08); s.player.stats.fireRateMult *= 1.10; } },
  { id: 'c_anchor', name: '重壓', curse: '衝刺冷卻 +30%', reward: '投射物 +1', color: P.oceanL,
    apply: (s) => { s.player.stats.dashCd *= 1.30; s.player.stats.projCountAdd += 1; } },
  { id: 'c_soultax', name: '蝕魂', curse: '每 30 秒失去 5% 當前生命', reward: '每次擊殺 +1 金幣', color: P.poison,
    apply: (s) => { s.curseDrain = true; s.run.curseGoldPerKill = (s.run.curseGoldPerKill || 0) + 1; } },
];
