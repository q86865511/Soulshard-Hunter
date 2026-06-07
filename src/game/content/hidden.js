// Hidden rooms (隱藏房間): special map structures that PAUSE the run and offer a reward,
// quest, or easter egg. Single-player pauses for the choice; co-op auto-takes option 0
// (the shared world can't pause). Each room is single-use. run.js owns placement + UI;
// this file is the data + the apply() effects (which mutate the live run/player).
import { P } from '../../engine/palette.js';
import { rng } from '../../engine/math.js';

const heal = (s, frac) => { const p = s.player; if (p) p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * frac)); };
const gold = (s, g) => { s.run.gold += g; s.run.goldEarned = (s.run.goldEarned || 0) + g; };
const xp = (s, n) => { try { s.world.gainXp(n); } catch (e) { /* */ } };
const fx = (s, color, r = 22) => { try { s.world.particles.ring(s.player.x, s.player.y, color, r, 110); } catch (e) { /* */ } };
const T = (s) => Math.max(1, Math.round(s.threat || 1));

export const HIDDEN_ROOMS = [
  {
    id: 'vault', name: '寶藏密室', color: P.goldL,
    desc: '一座塵封的寶庫，魂晶在黑暗中靜靜閃爍。',
    options: [
      { label: '取走全部寶藏', hint: '大量金幣 ＋ 小幅回復',
        apply: (s) => { const g = 100 + T(s) * 45; gold(s, g); heal(s, 0.2); fx(s, P.goldL, 26); return `寶庫傾瀉而出 — 獲得 ${g} 金幣！`; } },
    ],
  },
  {
    id: 'oracle', name: '預言神殿', color: P.manaL,
    desc: '殿中浮著三道命運之光，只能取走其一。',
    options: [
      { label: '戰意之光（本局 +15% 傷害）', hint: '永久加成', apply: (s) => { s.player.stats.damageMult *= 1.15; fx(s, P.redL); return '戰意附身 — 本局傷害 +15%！'; } },
      { label: '疾風之光（本局 +12% 移速）', hint: '永久加成', apply: (s) => { s.player.stats.speed = Math.round(s.player.stats.speed * 1.12); fx(s, P.shardL); return '疾風加身 — 本局移速 +12%！'; } },
      { label: '繁星之光（所有武器 +1 投射物）', hint: '永久加成', apply: (s) => { s.player.stats.projCountAdd = (s.player.stats.projCountAdd || 0) + 1; fx(s, P.manaL); return '繁星指引 — 所有武器 +1 投射物！'; } },
    ],
  },
  {
    id: 'gambit', name: '命運賭局', color: P.emberL,
    desc: '骰子在祭壇上滾動 — 要安穩，還是要豪賭？',
    options: [
      { label: '穩拿一小袋金幣', hint: '保證入手', apply: (s) => { const g = 70 + T(s) * 15; gold(s, g); fx(s, P.goldL); return `穩穩入袋 ${g} 金幣。`; } },
      { label: '豪賭一把', hint: '六成大賺 / 四成失血', apply: (s) => {
        if (rng.next() < 0.6) { const g = 220 + T(s) * 60; gold(s, g); fx(s, P.goldL, 30); return `豪賭成功！獲得 ${g} 金幣！`; }
        const p = s.player; const dmg = Math.round(p.maxHp * 0.25); p.hp = Math.max(1, p.hp - dmg); fx(s, P.redL); return `運氣不佳 — 失去 ${dmg} 點生命…`;
      } },
    ],
  },
  {
    id: 'memorial', name: '英靈祠', color: P.holy || P.shardL,
    desc: '歷代獵手的英靈在此安息，願以力量祝福後人。',
    options: [
      { label: '接受祝福', hint: '回滿生命 ＋ 本局 +20 生命上限', apply: (s) => { s.player.stats.maxHp += 20; heal(s, 1); xp(s, 30); fx(s, P.shardL, 28); return '英靈祝福 — 生命全滿，上限 +20！'; } },
    ],
  },
  {
    id: 'egg', name: '？ ？ ？', color: P.magenta || P.manaL,
    desc: '牆上潦草寫著：「這裡是開發者偷藏的房間。噓——」',
    options: [
      { label: '撿起閃亮亮的東西', hint: '彩蛋獎勵', apply: (s) => {
        gold(s, 88); xp(s, 88); heal(s, 0.15);
        const cols = [P.magenta || P.manaL, P.shardL, P.goldL];
        for (let i = 0; i < 3; i++) try { s.world.particles.ring(s.player.x, s.player.y, cols[i], 16 + i * 8, 90 + i * 30); } catch (e) { /* */ }
        return '✨ 你發現了開發者彩蛋！（+88 金幣與經驗）';
      } },
    ],
  },
];

export function hiddenRoomById(id) { return HIDDEN_ROOMS.find((r) => r.id === id) || HIDDEN_ROOMS[0]; }
