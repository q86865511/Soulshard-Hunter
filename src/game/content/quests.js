// Meta story-quest chain. A linear set of chapters, each with a story beat and
// an objective tracked against lifetime META.stats. Completing the current
// chapter's objective lets the player CLAIM a gold reward and reveal the next
// chapter. Progress lives on META.questIndex.

export const STORY_QUESTS = [
  { id: 's1', title: '第一章 · 初入獵場', story: '魂晶碎裂之地，獵手循著微光而來。先證明你能在這片永夜中活下來。', desc: '單局存活 3 分鐘', fmt: 'time', prog: (s) => s.bestTime || 0, goal: 180, reward: 80 },
  { id: 's2', title: '第二章 · 潮汐漸長', story: '魂晶的低語召來越來越兇猛的潮汐。別只是躲，深入它。', desc: '達到威脅 4 級', prog: (s) => s.bestStage || 0, goal: 4, reward: 130 },
  { id: 's3', title: '第三章 · 弒君', story: '巨影盤踞獵場深處，吞噬著破碎的魂晶。是時候正面迎戰首領了。', desc: '累計擊敗 2 名首領', prog: (s) => s.bossKills || 0, goal: 2, reward: 190 },
  { id: 's4', title: '第四章 · 不滅', story: '你的名字開始在亡者間流傳。讓這一夜，比以往都更長。', desc: '單局存活 8 分鐘', fmt: 'time', prog: (s) => s.bestTime || 0, goal: 480, reward: 280 },
  { id: 's5', title: '終章 · 魂晶之主', story: '萬千魂晶終將歸於一人之手。直視深淵的盡頭。', desc: '達到威脅 8 級', prog: (s) => s.bestStage || 0, goal: 8, reward: 420 },
];

export function chapterState(meta, i) {
  const q = STORY_QUESTS[i];
  if (!q) return null;
  const p = Math.min(q.goal, q.prog(meta.stats || {}));
  return { q, prog: p, goal: q.goal, done: p >= q.goal };
}

// claim the current chapter's reward (if its objective is met) and advance
export function claimChapter(meta) {
  const i = meta.questIndex || 0;
  const st = chapterState(meta, i);
  if (!st || !st.done) return null;
  meta.gold += st.q.reward;
  meta.questIndex = i + 1;
  return st.q;
}

export function questProgress(meta) {
  return { chapter: Math.min((meta.questIndex || 0) + 1, STORY_QUESTS.length), total: STORY_QUESTS.length, allDone: (meta.questIndex || 0) >= STORY_QUESTS.length };
}
