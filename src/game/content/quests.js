// Meta story-quest chain. A linear set of chapters, each with a story beat and
// an objective tracked against lifetime META.stats. Completing the current
// chapter's objective lets the player CLAIM a gold reward and reveal the next
// chapter. Progress lives on META.questIndex.

export const STORY_QUESTS = [
  { id: 's1', title: '第一章 · 初入獵場', story: '魂晶碎裂之地，獵手循著微光而來。先證明你能在這片永夜中活下來。', desc: '單局存活 3 分鐘', fmt: 'time', prog: (s) => s.bestTime || 0, goal: 180, reward: 80 },
  { id: 's2', title: '第二章 · 潮汐漸長', story: '魂晶的低語召來越來越兇猛的潮汐。別只是躲，深入它。', desc: '達到威脅 4 級', prog: (s) => s.bestStage || 0, goal: 4, reward: 130 },
  { id: 's3', title: '第三章 · 弒君', story: '巨影盤踞獵場深處，吞噬著破碎的魂晶。是時候正面迎戰首領了。', desc: '累計擊敗 2 名首領', prog: (s) => s.bossKills || 0, goal: 2, reward: 190 },
  { id: 's4', title: '第四章 · 不滅', story: '你的名字開始在亡者間流傳。讓這一夜，比以往都更長。', desc: '單局存活 8 分鐘', fmt: 'time', prog: (s) => s.bestTime || 0, goal: 480, reward: 280 },
  { id: 's5', title: '第五章 · 千刃', story: '潮水化作鋼鐵的洪流。你已不再閃躲，而是收割。', desc: '累計擊殺 1000 名敵人', prog: (s) => s.kills || 0, goal: 1000, reward: 380 },
  { id: 's6', title: '第六章 · 破曉', story: '第一道光自獵場盡頭裂開——你終於擊穿了它的最終守衛。', desc: '通關任一關卡', prog: (s) => s.clears || 0, goal: 1, reward: 500 },
  { id: 's7', title: '第七章 · 沉淵', story: '越深處，魂晶越純，亦越飢渴。威脅自四面八方收攏。', desc: '達到威脅 10 級', prog: (s) => s.bestStage || 0, goal: 10, reward: 650 },
  { id: 's8', title: '第八章 · 王座之路', story: '一個個盤踞者倒下，王座的輪廓漸漸清晰。', desc: '累計擊敗 12 名首領', prog: (s) => s.bossKills || 0, goal: 12, reward: 800 },
  { id: 's9', title: '第九章 · 長夜', story: '時間在這裡失去意義。你與永夜對峙，誰先眨眼。', desc: '單局存活 15 分鐘', fmt: 'time', prog: (s) => s.bestTime || 0, goal: 900, reward: 950 },
  { id: 's10', title: '第十章 · 諸界征服', story: '五片生態，五種死法。你逐一將它們踏在腳下。', desc: '累計通關 3 次', prog: (s) => s.clears || 0, goal: 3, reward: 1150 },
  { id: 's11', title: '第十一章 · 極限', story: '威脅攀上人類從未抵達的高度。你卻笑了。', desc: '達到威脅 12 級', prog: (s) => s.bestStage || 0, goal: 12, reward: 1400 },
  { id: 's12', title: '第十二章 · 弒神', story: '破關之後，那身披黑袍的收割者終於現身。這次，輪到祂恐懼。', desc: '擊殺死神 1 次', prog: (s) => s.reaperKills || 0, goal: 1, reward: 1800 },
  { id: 's13', title: '第十三章 · 萬骸', story: '你走過的路鋪滿屍骸，多到連魂晶都來不及吞噬。', desc: '累計擊殺 5000 名敵人', prog: (s) => s.kills || 0, goal: 5000, reward: 2200 },
  { id: 's14', title: '第十四章 · 不朽傳說', story: '弒神者之名響徹諸界。死神已不只一次倒在你的刃下。', desc: '累計擊殺死神 3 次', prog: (s) => s.reaperKills || 0, goal: 3, reward: 2800 },
  { id: 's15', title: '終章 · 魂晶之主', story: '萬千魂晶終歸於一人之手。你直視深淵盡頭——那裡只剩你的倒影。', desc: '達到威脅 13 級', prog: (s) => s.bestStage || 0, goal: 13, reward: 4000 },
  // 逆星之章 (act 2): the永夜 didn't end when you became its master — it just changed how it watches you.
  { id: 's16', title: '逆星 · 餘燼未熄', story: '成為魂晶之主後，永夜並未終結——它只是換了個方式凝視你。', desc: '累計擊殺 10000 名敵人', prog: (s) => s.kills || 0, goal: 10000, reward: 5000 },
  { id: 's17', title: '逆星 · 跨界者', story: '你開始在不同的生態間來去自如，像在自家後院散步。', desc: '累計通關 6 次', prog: (s) => s.clears || 0, goal: 6, reward: 6500 },
  { id: 's18', title: '逆星 · 死神獵人', story: '收割者見到你已學會轉身就逃——可惜，你更快。', desc: '累計擊殺死神 5 次', prog: (s) => s.reaperKills || 0, goal: 5, reward: 9000 },
  { id: 's19', title: '逆星 · 超越', story: '當分數失去意義，你終於明白：你追逐的從來不是魂晶，而是「還能不能再強一點」。', desc: '單局分數突破 80000', prog: (s) => s.bestScore || 0, goal: 80000, reward: 13000 },
];

// 一般任務 (regular bounties) — accepted/tracked from the guild, claimed once done.
export const SIDE_QUESTS = [
  { id: 'b_hunt', title: '懸賞 · 清剿', desc: '累計擊殺 300 名敵人', prog: (s) => s.kills || 0, goal: 300, reward: 120 },
  { id: 'b_survive', title: '懸賞 · 堅守', desc: '單局存活 6 分鐘', fmt: 'time', prog: (s) => s.bestTime || 0, goal: 360, reward: 150 },
  { id: 'b_boss', title: '懸賞 · 獵首', desc: '累計擊敗 6 名首領', prog: (s) => s.bossKills || 0, goal: 6, reward: 200 },
  { id: 'b_mini', title: '懸賞 · 屠戮小王', desc: '累計擊殺 15 隻小王', prog: (s) => s.miniBossKills || 0, goal: 15, reward: 220 },
  { id: 'b_gold', title: '懸賞 · 致富', desc: '金庫累計 8000 金幣', prog: (s) => s.totalGold || 0, goal: 8000, reward: 260 },
  { id: 'b_threat', title: '懸賞 · 深入', desc: '達到威脅 7 級', prog: (s) => s.bestStage || 0, goal: 7, reward: 240 },
];
// 隱藏任務 — only appear in the guild once their trigger condition is met.
export const HIDDEN_QUESTS = [
  { id: 'h_reaper', title: '隱藏 · 弒神之證', desc: '再次擊殺死神', prog: (s) => s.reaperKills || 0, goal: 2, reward: 500, trigger: (m) => (m.stats.reaperKills || 0) >= 1 },
  { id: 'h_clear', title: '隱藏 · 征服者', desc: '累計通關 5 次', prog: (s) => s.clears || 0, goal: 5, reward: 600, trigger: (m) => (m.stats.clears || 0) >= 1 },
  { id: 'h_legend', title: '隱藏 · 傳奇之證', desc: '單局分數突破 50000', prog: (s) => s.bestScore || 0, goal: 50000, reward: 800, trigger: (m) => (m.stats.bestScore || 0) >= 20000 },
];

import { addGuildXp } from './guild.js';

export function chapterState(meta, i) {
  const q = STORY_QUESTS[i];
  if (!q) return null;
  const p = Math.min(q.goal, q.prog(meta.stats || {}));
  return { q, prog: p, goal: q.goal, done: p >= q.goal };
}

const allBounties = () => [...SIDE_QUESTS, ...HIDDEN_QUESTS];
// guild list: side quests + any triggered hidden quests, minus already-claimed ones
export function guildQuests(meta) {
  const claims = meta.questClaims || {};
  return allBounties().filter((q) => !claims[q.id] && (!q.trigger || q.trigger(meta)));
}
function bountyState(meta, q) {
  const p = Math.min(q.goal, q.prog(meta.stats || {}));
  return { q, prog: p, goal: q.goal, done: p >= q.goal, fmt: q.fmt };
}
export function trackQuest(meta, id) { meta.trackedQuest = id; }
export function claimQuest(meta, id) {
  const q = allBounties().find((x) => x.id === id); if (!q) return false;
  const st = bountyState(meta, q);
  if (!st.done || (meta.questClaims && meta.questClaims[id])) return false;
  meta.questClaims = meta.questClaims || {};
  meta.questClaims[id] = true; meta.gold += q.reward;
  addGuildXp(meta, q.reward / 3);   // 5-3: bounties build guild reputation
  if (meta.trackedQuest === id) meta.trackedQuest = 'story';
  return true;
}
// the quest shown on the persistent left-side tracker (default = story mainline)
export function trackedQuestState(meta) {
  const id = meta.trackedQuest || 'story';
  if (id !== 'story') {
    const q = allBounties().find((x) => x.id === id);
    if (q) { const st = bountyState(meta, q); return { title: q.title, sub: q.desc, prog: st.prog, goal: st.goal, frac: q.goal ? st.prog / q.goal : 1, fmt: q.fmt, done: st.done }; }
  }
  const st = chapterState(meta, meta.questIndex || 0);
  if (!st) return { title: '主線 · 全章完成', sub: '你已成為魂晶之主', frac: 1, done: true };
  return { title: st.q.title, sub: st.q.desc, prog: st.prog, goal: st.goal, frac: st.goal ? st.prog / st.goal : 1, fmt: st.q.fmt, done: st.done };
}
export function fmtQuestVal(v, fmt) { return fmt === 'time' ? Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0') : String(Math.floor(v)); }

// claim the current chapter's reward (if its objective is met) and advance
export function claimChapter(meta) {
  const i = meta.questIndex || 0;
  const st = chapterState(meta, i);
  if (!st || !st.done) return null;
  meta.gold += st.q.reward;
  addGuildXp(meta, st.q.reward / 3);   // 5-3: story chapters build guild reputation
  meta.questIndex = i + 1;
  return st.q;
}

export function questProgress(meta) {
  return { chapter: Math.min((meta.questIndex || 0) + 1, STORY_QUESTS.length), total: STORY_QUESTS.length, allDone: (meta.questIndex || 0) >= STORY_QUESTS.length };
}
