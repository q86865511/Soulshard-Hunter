// Achievement system: lifetime milestones tracked on META.stats. Unlocked ids
// live in META.achievements. Some are hidden until earned. Hidden CHARACTERS are
// unlocked separately by characters.checkCharacterUnlocks (shared conditions).
//
// Schema: { id, name, desc, hidden?, check(stats, meta) -> bool, reward?(meta) }

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: '初次狩獵', desc: '累計擊殺 1 名敵人', check: (s) => (s.kills || 0) >= 1 },
  { id: 'slayer_500', name: '小有名氣', desc: '累計擊殺 500 名敵人', check: (s) => (s.kills || 0) >= 500 },
  { id: 'slayer_2000', name: '魂晶收割者', desc: '累計擊殺 2000 名敵人', check: (s) => (s.kills || 0) >= 2000 },
  { id: 'slayer_5000', name: '殺戮機器', desc: '累計擊殺 5000 名敵人（解鎖隱藏英雄）', check: (s) => (s.kills || 0) >= 5000 },
  { id: 'survive_5', name: '撐住了', desc: '單局存活 5 分鐘', check: (s) => (s.bestTime || 0) >= 300 },
  { id: 'survive_10', name: '不死之軀', desc: '單局存活 10 分鐘（解鎖隱藏英雄）', check: (s) => (s.bestTime || 0) >= 600 },
  { id: 'threat_5', name: '威脅升級', desc: '達到威脅 5 級', check: (s) => (s.bestStage || 0) >= 5 },
  { id: 'threat_8', name: '深淵獵手', desc: '達到威脅 8 級', check: (s) => (s.bestStage || 0) >= 8 },
  { id: 'boss_1', name: '首領終結者', desc: '擊敗 1 名首領', check: (s) => (s.bossKills || 0) >= 1 },
  { id: 'boss_10', name: '首領剋星', desc: '擊敗 10 名首領', check: (s) => (s.bossKills || 0) >= 10 },
  { id: 'rich', name: '富甲一方', desc: '金庫累計 5000 金幣', check: (s) => (s.totalGold || 0) >= 5000 },
  { id: 'veteran', name: '百戰老兵', desc: '累計出擊 50 次', check: (s) => (s.runs || 0) >= 50 },
  { id: 'legend_score', name: '？？？', realName: '傳奇分數', desc: '單局分數突破 10000', hidden: true, check: (s) => (s.bestScore || 0) >= 10000 },
  { id: 'godspeed', name: '？？？', realName: '神速', desc: '達到威脅 12 級', hidden: true, check: (s) => (s.bestStage || 0) >= 12 },
];

// Returns the array of newly-unlocked achievement defs (for banners/toasts).
export function checkAchievements(meta) {
  if (!meta.achievements) meta.achievements = [];
  const s = meta.stats || {};
  const got = meta.achievements;
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (got.includes(a.id)) continue;
    try { if (a.check(s, meta)) { got.push(a.id); newly.push(a); if (a.reward) a.reward(meta); } } catch (e) { /* */ }
  }
  return newly;
}

export function achievementProgress(meta) {
  return { unlocked: (meta.achievements || []).length, total: ACHIEVEMENTS.length };
}
