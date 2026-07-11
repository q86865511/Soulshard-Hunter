// 推薦目標引擎（P1 內容圖鑑批次）：城鎮依進度產生 1-3 個「接下來該做什麼」提示。
// 純函式、不改 META——呼叫端（城鎮面板）自行決定何時 render。
import { BIOMES } from '../../art/biomes.js';
import { ACHIEVEMENTS } from './achievements.js';
import { claimableRanks } from './guild.js';
import { TOWN_GATES } from './town_gates.js';

const GATE_TITLE = { forge: '解鎖鍛造爐', bank: '解鎖魂晶銀行', talentRow2: '解鎖天賦第三排' };

export function goalsFor(meta) {
  const m = meta || {};
  const goals = [];

  // 1) 有可領的公會階級獎勵
  try {
    const claimable = claimableRanks(m);
    if (claimable.length) goals.push({ icon: '🏅', title: '領取公會階級獎勵', desc: (claimable[0].rk.name || '') + ' 已達成，前往公會領取', frac: 1 });
  } catch (e) { /* */ }

  // 2) 下一步關卡：已解鎖但未通關的生態 -> 否則取通關難度最低的生態，建議挑戰下一難度
  try {
    const diff = (m.levels && m.levels.diff) || {};
    const unlockedN = (m.levels && m.levels.unlocked) || 1;
    let target = null;
    for (let i = 0; i < BIOMES.length && i < unlockedN; i++) { const b = BIOMES[i]; if (!(diff[b.id] >= 1)) { target = b; break; } }
    if (target) {
      goals.push({ icon: '🗺️', title: `首次通關「${target.name}」`, desc: '完成一次出擊以解鎖下一個生態系', frac: 0 });
    } else {
      let lowest = null, lowestD = Infinity;
      for (let i = 0; i < unlockedN && i < BIOMES.length; i++) { const b = BIOMES[i]; const d = diff[b.id] || 0; if (d < lowestD) { lowestD = d; lowest = b; } }
      if (lowest) goals.push({ icon: '🗺️', title: `以難度 ${lowestD + 1} 通關「${lowest.name}」`, desc: '挑戰更高難度以精通此生態系', frac: 0 });
    }
  } catch (e) { /* */ }

  // 3) 最接近完成、有具體獎勵說明的未達成成就（非隱藏）
  try {
    const got = new Set(m.achievements || []);
    let best = null, bestPct = -1;
    for (const a of ACHIEVEMENTS) {
      if (a.hidden || !a.prog || !a.rewardLabel || got.has(a.id)) continue;
      let cur, goal;
      try { [cur, goal] = a.prog(m.stats || {}, m); } catch (e) { continue; }
      if (!(goal > 0)) continue;
      const pct = Math.min(1, cur / goal);
      if (pct > bestPct) { bestPct = pct; best = a; }
    }
    if (best) goals.push({ icon: '⭐', title: best.name, desc: best.desc + '（獎勵：' + best.rewardLabel + '）', frac: Math.max(0, bestPct) });
  } catch (e) { /* */ }

  // 4) 尚未開放的城鎮功能（第一個未達成的門檻）
  try {
    for (const key of Object.keys(TOWN_GATES)) {
      const g = TOWN_GATES[key];
      if (g && !g.ok(m)) { goals.push({ icon: '🔒', title: GATE_TITLE[key] || key, desc: g.hint, frac: 0 }); break; }
    }
  } catch (e) { /* */ }

  return goals.slice(0, 3);
}
