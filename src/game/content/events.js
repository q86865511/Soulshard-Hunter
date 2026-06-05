// Mini-boss reward EVENTS (原#3 / 原#14) — now a roster of named "patrons".
// Killing a mini-boss drops a random 3-of-these choice. Each patron has an ORIGINAL
// character name (not a bare job title), a hand-drawn portrait icon, a class tag, and
// a distinctive effect — several install a PERSISTENT run-long behaviour via player
// hooks (gold bursts, ignite-on-hit, soul harvest…), not just a one-shot stat boon.
//
// Schema: { id, name, role, title, icon:'patron_<id>', desc,
//           apply(scene) }   // scene.player / scene.run / scene.world + helpers
import { defineIcon, sym, panel } from '../../art/icons.js';
import { P, lighten, darken, withAlpha } from '../../engine/palette.js';
import { applyStatus } from '../status.js';

// ---- portraits (16x16) -----------------------------------------------------
const die = (p, x, y) => { p.rect(x, y, 5, 5, P.bone); p.rectLine(x, y, 5, 5, P.ink); p.px(x + 1, y + 1, P.ink); p.px(x + 3, y + 3, P.ink); p.px(x + 2, y + 2, P.ink); };
defineIcon('patron_gambler', '#1c2a4a', (p) => { sym.coin(p); p.ellipse(5, 6, 3, 3, P.goldD); p.ellipse(5, 6, 2, 2, P.gold); die(p, 8, 8); });
defineIcon('patron_midas', '#4a3a12', (p) => { p.rect(4, 9, 8, 4, P.gold); p.rect(4, 9, 8, 1, P.goldL); p.line(4, 9, 5, 5, P.gold); p.line(8, 9, 8, 4, P.gold); p.line(12, 9, 11, 5, P.gold); p.px(5, 5, P.goldL); p.px(8, 4, P.goldL); p.px(11, 5, P.goldL); });
defineIcon('patron_knight', '#34384a', (p) => { sym.sword(p); p.vline(3, 12, 4, P.steelL); p.line(2, 5, 4, 4, P.steel); p.line(2, 11, 4, 12, P.steel); });
defineIcon('patron_gunner', '#2a2a32', (p) => { p.rect(3, 7, 9, 3, P.iron); p.rect(3, 7, 9, 1, P.steelL); p.rect(10, 6, 3, 2, P.steel); p.rect(4, 10, 2, 3, P.woodD); p.px(12, 7, P.emberL); });
defineIcon('patron_mage', '#2a1a4a', (p) => { p.vline(4, 13, 8, P.wood); p.ellipse(8, 5, 3, 3, P.manaL); p.ellipse(8, 5, 1.6, 1.6, P.white); sym.star(p, lighten(P.manaL, 0.2)); });
defineIcon('patron_berserker', '#3a1414', (p) => { p.vline(4, 13, 6, P.woodD); p.ellipse(9, 5, 3.4, 3, P.iron); p.rect(6, 4, 4, 3, P.steelL); p.line(10, 3, 12, 6, P.redL); p.px(6, 4, P.redL); });
defineIcon('patron_merchant', '#244a2a', (p) => { p.ellipse(8, 9, 4.5, 4, P.leather); p.ellipse(8, 9, 3.4, 3, P.wood); p.rect(6, 3, 4, 3, P.woodD); p.vline(3, 4, 8, P.woodL); sym.coin(p); p.ellipse(8, 9, 1.6, 1.6, P.goldL); });
defineIcon('patron_monk', '#3a2a14', (p) => { p.ellipse(8, 8, 3.6, 3, P.skin); p.rect(5, 8, 6, 3, darken(P.skin, 0.2)); p.px(6, 7, P.ink); p.px(10, 7, P.ink); p.ring(8, 8, 5.5, withAlpha(P.emberL, 0.8)); });
defineIcon('patron_assassin', '#1a1428', (p) => { p.line(5, 12, 11, 4, P.steelL); p.line(6, 12, 12, 4, P.steel); p.rect(4, 11, 3, 2, P.woodD); p.px(11, 4, P.white); });
defineIcon('patron_engineer', '#2a2618', (p) => { p.ring(8, 8, 4.5, P.iron); p.ring(8, 8, 4, P.steel); for (let a = 0; a < 6; a++) { const x = 8 + Math.cos(a) * 5.5, y = 8 + Math.sin(a) * 5.5; p.px(x, y, P.steelL); } p.ellipse(8, 8, 1.6, 1.6, P.woodD); });
defineIcon('patron_pyro', '#4a1a12', (p) => { p.ellipse(8, 9, 3, 4, P.ember); p.ellipse(8, 9, 1.6, 2.4, P.emberL); p.line(8, 2, 6, 7, P.ember); p.line(8, 2, 10, 7, P.ember); p.px(8, 11, P.white); });
defineIcon('patron_frost', '#163a4a', (p) => { sym.shardSym(p, P.ice); p.line(5, 5, 11, 11, withAlpha(P.white, 0.7)); p.line(11, 5, 5, 11, withAlpha(P.white, 0.7)); });
defineIcon('patron_reaper', '#201828', (p) => { p.ellipse(8, 7, 3.4, 3.6, P.bone); p.rect(5, 7, 6, 3, P.bone); p.px(6, 7, P.ink); p.px(10, 7, P.ink); p.rect(7, 10, 2, 2, P.bone); p.line(12, 3, 12, 13, P.woodD); p.line(12, 3, 9, 4, P.steelL); });
defineIcon('patron_duelist', '#2a2440', (p) => { p.line(4, 12, 12, 4, P.steelL); p.rect(3, 11, 3, 3, P.gold); p.ellipse(3.5, 12.5, 2, 2, P.goldD); p.px(12, 4, P.white); });
defineIcon('patron_trial', '#3a3014', (p) => { sym.star(p, P.goldL); p.ring(8, 8, 6, withAlpha(P.goldL, 0.6)); });
defineIcon('patron_collector', '#2a1a3a', (p) => { sym.sword(p); p.vline(3, 12, 5, P.purpleL); p.vline(3, 12, 11, P.purpleL); });

// ---- patrons ---------------------------------------------------------------
export const EVENTS = [
  // --- persistent (hook-based) signature effects ----------------------------
  { id: 'p_gambler', name: '阿奇·卡拉斯', role: '賭徒', title: '孤注一擲', icon: 'patron_gambler',
    desc: '傷害 +12%；命中敵人時有 10% 機率爆出額外金幣。',
    apply: (s) => { s.player.stats.damageMult *= 1.12; s.player.hooks.hit.push((e, dmg, w) => { if (Math.random() < 0.10) { const g = 2 + Math.floor((s.threat || 1) * 0.8); s.run.gold += g; w.particles.text(e.x, e.y - 10, '+' + g + '金', { color: P.goldL, size: 10, weight: '800' }); } }); } },
  { id: 'p_midas', name: '金手指·麥達斯', role: '黃金狂人', title: '點石成金', icon: 'patron_midas',
    desc: '金幣越多傷害越高（上限 +30%）；金幣獲取 +25%。',
    apply: (s) => { s.player.stats.goldMult *= 1.25; const bonus = Math.min(0.30, (s.run.gold || 0) / 2000 * 0.30); s.player.stats.damageMult *= 1 + bonus; s.banner = '點石成金：依現有金幣獲得 +' + Math.round(bonus * 100) + '% 傷害'; s.bannerT = 2.4; } },
  { id: 'p_pyro', name: '焚心·伊格尼斯', role: '炎術士', title: '燎原之印', icon: 'patron_pyro',
    desc: '所有攻擊命中有 30% 機率點燃敵人（灼燒）。',
    apply: (s) => { s.player.hooks.hit.push((e, dmg, w) => { if (Math.random() < 0.30) applyStatus(e, 'burn', w); }); s.player.stats.damageMult *= 1.05; } },
  { id: 'p_frost', name: '霜白·寇德', role: '冰術士', title: '凜冬之握', icon: 'patron_frost',
    desc: '所有攻擊命中使敵人緩速；範圍 +8%。',
    apply: (s) => { s.player.hooks.hit.push((e, dmg, w) => applyStatus(e, 'slow', w)); s.player.stats.area = (s.player.stats.area || 1) * 1.08; } },
  { id: 'p_reaper', name: '收魂·莫提斯', role: '死靈師', title: '靈魂收割', icon: 'patron_reaper',
    desc: '擊殺敵人時有 20% 機率回復 4 點生命。',
    apply: (s) => { s.player.hooks.kill.push((e, w) => { if (Math.random() < 0.20) { s.player.heal(4); } }); s.player.stats.maxHp += 12; s.player.heal(12); } },

  // --- class identities (instant themed packages) ---------------------------
  { id: 'p_knight', name: '加雷斯爵士', role: '聖殿騎士', title: '鋼鐵誓約', icon: 'patron_knight',
    desc: '近戰之魂：生命上限 +35、減傷 +3、擊退 +30%。',
    apply: (s) => { const st = s.player.stats; st.maxHp += 35; s.player.heal(35); st.defense += 3; st.knockbackMult = (st.knockbackMult || 1) * 1.3; } },
  { id: 'p_gunner', name: '神槍·雷克斯', role: '槍手', title: '速射協定', icon: 'patron_gunner',
    desc: '射速 +22%、彈速 +20%、暴擊 +6%。',
    apply: (s) => { const st = s.player.stats; st.fireRateMult *= 1.22; st.projSpeedMult *= 1.20; st.critChance += 0.06; } },
  { id: 'p_mage', name: '星河·瑟蕾娜', role: '大法師', title: '奧術精通', icon: 'patron_mage',
    desc: '範圍 +22%、傷害 +12%（脆皮代價：生命 -10）。',
    apply: (s) => { const st = s.player.stats; st.area = (st.area || 1) * 1.22; st.damageMult *= 1.12; st.maxHp = Math.max(20, st.maxHp - 10); s.player.hp = Math.min(s.player.hp, st.maxHp); } },
  { id: 'p_berserker', name: '血斧·卡爾戈', role: '狂戰士', title: '嗜血狂怒', icon: 'patron_berserker',
    desc: '傷害 +35%，但減傷 -3。', apply: (s) => { s.player.stats.damageMult *= 1.35; s.player.stats.defense -= 3; } },
  { id: 'p_assassin', name: '夜影·薇拉', role: '刺客', title: '致命專注', icon: 'patron_assassin',
    desc: '暴擊率 +14%、暴擊傷害 +0.6、閃避 +6%。',
    apply: (s) => { const st = s.player.stats; st.critChance += 0.14; st.critMult += 0.6; st.dodge += 0.06; } },
  { id: 'p_duelist', name: '疾風·芬恩', role: '決鬥者', title: '凌厲劍舞', icon: 'patron_duelist',
    desc: '移速 +16%、暴擊 +8%、衝刺冷卻 -20%。',
    apply: (s) => { const st = s.player.stats; st.speed *= 1.16; st.critChance += 0.08; st.dashCd *= 0.8; } },
  { id: 'p_monk', name: '鐵拳·道嚴', role: '武僧', title: '不滅之軀', icon: 'patron_monk',
    desc: '生命上限 +25、每秒回復 +0.8、閃避 +5%。',
    apply: (s) => { const st = s.player.stats; st.maxHp += 25; s.player.heal(25); st.hpRegen += 0.8; st.dodge += 0.05; } },
  { id: 'p_engineer', name: '發條·蓋茲', role: '工匠', title: '多重彈幕', icon: 'patron_engineer',
    desc: '投射物 +1、穿透 +1、傷害 +6%。',
    apply: (s) => { const st = s.player.stats; st.projCountAdd = (st.projCountAdd || 0) + 1; st.pierceAdd = (st.pierceAdd || 0) + 1; st.damageMult *= 1.06; } },
  { id: 'p_merchant', name: '商隊·賽門', role: '行商', title: '財富湧流', icon: 'patron_merchant',
    desc: '立即 +1200 金幣、+90 魂晶；幸運 +0.3。',
    apply: (s) => { s.run.gold += 1200; s.run.shards += 90; s.player.stats.luck = (s.player.stats.luck || 0) + 0.3; } },

  // --- challenges / sacrifices (kept, re-themed as named patrons) -----------
  { id: 'p_trial', name: '試煉者·阿斯特', role: '試煉導師', title: '無傷試煉', icon: 'patron_trial',
    desc: '12 秒內不受傷 → 額外 3 次升級。',
    apply: (s) => s.startChallenge({ name: '無傷試煉', dur: 12, type: 'nohit', reward: (sc) => sc.grantLevelUps(3) }) },
  { id: 'p_collector', name: '收藏家·歐林', role: '收藏家', title: '以一換三', icon: 'patron_collector',
    desc: '犧牲一把武器 → 立即額外 3 次升級。',
    apply: (s) => { s.grantLevelUps(s.sacrificeWeapon() ? 3 : 2); } },
];
