// 5-1 城鎮 NPCs. Each NPC stands in a room of the hub town; pressing E starts a
// dialogue (greeting + ask-about topics). "Keeper" NPCs also route to a panel
// (their building's function). Dialogue lines may be plain strings OR functions of
// META so townsfolk can comment on what you've achieved this save. Pure data module.
import { P } from '../../engine/palette.js';
import { guildProgress } from './guild.js';
import { dateKey } from './daily.js';
import { grantDecor } from './room_decor.js';

// dynamic-line helpers
const clears = (m) => (m.stats && m.stats.clears) || 0;
const heroes = (m) => (m.unlocked && m.unlocked.characters || []).length;
const biomes = (m) => (m.levels && m.levels.unlocked) || 1;

export const NPCS = [
  {
    id: 'priest', name: '莉雅', title: '神官', room: 'church', station: 'talents', sprite: 'npc_priest', color: P.shardL,
    greet: ['願女神的微光照亮你的前路，獵手。', '在此向女神像祈禱，便能重塑你的天賦。'],
    topics: [
      { q: '天賦是什麼？', a: ['天賦是你靈魂的刻印——以金幣供奉，便能永久強化自身。', '攻勢、守備、機動、財富四脈，皆由女神看顧。'] },
      { q: '女神像有何來歷？', a: ['傳說她是第一位墜入永夜、又走出來的獵手。', '如今她以石像之姿，靜靜守望每一位後來者。'] },
      { q: '我們算朋友了嗎？', aff: 2, a: ['女神看顧每一個誠心的靈魂——當然，也包括你，獵手。'] },
      { q: '能為我祈福嗎？', aff: 4, a: [(m) => `你已通關 ${clears(m)} 次——女神以你為傲。願這份微光長伴左右。`] },
    ],
  },
  {
    id: 'guildmaster', name: '鐵爺', title: '公會長', room: 'guild', station: 'guild', sprite: 'npc_guildmaster', color: P.goldL,
    greet: ['哈！又一個想在獵人公會闖出名號的傢伙。', '接任務、攢聲望，等級夠了我自然有好東西給你。'],
    topics: [
      { q: '公會聲望怎麼累積？', a: ['每次出擊、每張懸賞，都會替你累積公會聲望。', (m) => `你目前是「${guildProgress(m).name}」——繼續努力。`] },
      { q: '有什麼獎勵？', a: ['每升一階，公會金庫就為你開放一份獎勵——武器、裝備、道具樣樣有。'] },
      { q: '公會的規矩？', a: ['只有一條：活著回來，把賞金花在刀口上。'] },
      { q: '我夠格了嗎？', aff: 2, a: ['哈，你比我當年強多了。再多攢些聲望，公會的大門永遠為你開。'] },
      { q: '當年的你？', aff: 4, a: ['老子年輕時也下過深淵…如今守著公會，看你們這些後生超越我，反倒踏實。'] },
    ],
  },
  {
    id: 'receptionist', name: '小鈴', title: '公會前台', room: 'guild', station: 'guild', sprite: 'npc_receptionist', color: P.shardL,
    greet: ['歡迎光臨獵人公會～要看看任務板嗎？', '主線、懸賞、還有達成條件才會出現的隱藏委託，都在這裡。'],
    topics: [
      { q: '怎麼領取獎勵？', a: ['任務達成後回來找我，點「領取」就好。', '追蹤中的任務會顯示在城鎮左上角喔。'] },
      { q: '有新任務嗎？', a: [(m) => clears(m) > 0 ? '你的戰績不錯，解鎖了不少隱藏委託呢！' : '先去出擊累積一些戰績，隱藏委託就會浮現。'] },
      { q: '今天也辛苦了～', aff: 2, a: ['嘻嘻，謝謝你常來找我聊天～前台的工作其實有點無聊呢。'] },
      { q: '有什麼悄悄話？', aff: 4, a: ['噓——我偷偷幫你留意週常懸賞了，達標記得回來找我領喔！'] },
    ],
  },
  {
    id: 'blacksmith', name: '戈登', title: '鐵匠', room: 'blacksmith', station: 'smith', sprite: 'npc_blacksmith', color: P.emberL,
    greet: ['爐火正旺。要鍛武器，還是強化營地設施？', '把武器交給我，我能替它灌上永久的特殊效果。'],
    topics: [
      { q: '鍛造能做什麼？', a: ['鍛造分兩部分：提升武器等級增加傷害，以及鑲嵌最多三種特效。', '銳利、貫穿、巨力、廣域、疾速——挑適合那把武器的。'] },
      { q: '特效會帶進戰場嗎？', a: ['當然。只要你帶著那把武器出擊，鍛造的強化就一直生效。'] },
      { q: '營地設施呢？', a: ['神龕、金庫、修練場那些，也都在我這兒升級。'] },
      { q: '這把刀不錯吧？', aff: 2, a: ['哼，識貨。常來的客人，我打起鐵來也更帶勁。'] },
      { q: '教我鍛造吧？', aff: 4, a: ['行，衝著我們的交情——記住，好鋼要捨得敲，武器跟人一樣，磨過才硬。'] },
    ],
  },
  {
    id: 'tailor', name: '薇拉', title: '裁縫師', room: 'clothing', station: 'wardrobe', sprite: 'npc_tailor', color: P.purpleL,
    greet: ['獵手也該有點品味，對吧？', '本店每次都會上架不同的造型，看上了就帶走。'],
    topics: [
      { q: '造型只是換色嗎？', a: ['才不是！每套造型都附帶獨特的配飾——皇冠、犄角、光環…', '同一個英雄，換上不同造型，氣場完全不一樣。'] },
      { q: '庫存會換嗎？', a: ['每次你從戰場歸來，貨架就會換新；不想等，也能花點金幣讓我重新進貨。'] },
      { q: '你的眼光真好～', aff: 2, a: ['呵，老主顧了嘛。下次進貨我會特別替你留意好東西。'] },
      { q: '能算我便宜點？', aff: 4, a: ['看在交情份上——以後重新進貨我替你算半價，這可是私房優惠喔。'] },
    ],
  },
  {
    id: 'curator', name: '奧德', title: '殿堂管理員', room: 'achievements', station: 'achievements', sprite: 'npc_curator', color: P.gold,
    greet: ['歡迎來到成就殿堂。每一座獎盃，都是一段傳說。', '達成成就不只是榮耀——許多還會解鎖武器與道具。'],
    topics: [
      { q: '成就有幾種？', a: ['擊殺、生存、屠王、通關、鍛造、時尚…林林總總上百項。', (m) => `你已點亮其中不少，繼續收集吧。`] },
      { q: '隱藏成就？', a: ['有些成就要達成才會揭曉內容——標著問號的就是。'] },
      { q: '常來打擾你了', aff: 2, a: ['不打擾，殿堂難得有人作伴。你的每座獎盃我都記得呢。'] },
      { q: '我的傳說呢？', aff: 4, a: [(m) => `像你這樣的常客，遲早會在這殿堂立下屬於自己的傳說。我已替你留好位置了。`] },
    ],
  },
  {
    id: 'guide', name: '蕾恩', title: '城鎮嚮導', room: 'plaza', station: null, sprite: 'npc_guide', color: P.greenL,
    greet: ['初次來到魂晶之鎮嗎？我來帶你認認路。', '正中央是出擊傳送門；四周分別是教堂、公會、鐵匠鋪、衣帽店、成就殿堂與你的小屋。'],
    topics: [
      { q: '我該做什麼？', a: ['先到傳送門出擊狩獵，賺取金幣與魂晶。', '回來後到各個房間花費它們、變強，再出發。'] },
      { q: '我的進度如何？', a: [(m) => `你已解鎖 ${heroes(m)} 名英雄、開拓 ${biomes(m)} 片生態、通關 ${clears(m)} 次。`, '一步一步來，你會成為魂晶之主的。'] },
      { q: '有什麼隱藏要素？', a: ['據說輸入某個古老的指令…能召喚開發者的力量。噓——別說是我講的。'] },
      { q: '謝謝你帶我認路', aff: 2, a: ['不客氣！能幫上新獵手，是我這嚮導最開心的事。'] },
      { q: '我們是好朋友吧？', aff: 4, a: ['當然！從你第一天踏進這座鎮，我就知道你不一樣。一路上有你真好。'] },
    ],
  },
  {
    id: 'merchant', name: '老潘', title: '雜貨商 · 魂晶銀行', room: 'market', station: 'bank', sprite: 'npc_merchant', color: P.bronze,
    greet: ['嘿，獵手！手頭緊嗎？老潘我也兼放款——先借你金幣提前強化，下一趟回來連本帶利還我就行。', '記住，借了就得還，利息可不等人哪，哈哈。'],
    topics: [
      { q: '魂晶有什麼用？', a: ['魂晶是戰場上的硬通貨——按 B 隨時打開商店，用它買裝備或鍛打屬性。'] },
      { q: '聽說了什麼八卦？', a: [(m) => clears(m) > 0 ? '聽說有人通關後，把降臨的死神也斬了。是你吧？' : '聽說擊敗關底魔王後，會有個披黑袍的傢伙找上門…小心點。'] },
      { q: '老潘你人真好', aff: 2, a: ['嘿嘿，常客嘛！放款利息…要不下次給你算鬆一點？'] },
      { q: '能多借我一點嗎？', aff: 4, a: ['看在老交情份上，我把你的銀行額度往上調了點——別揮霍啊，哈哈！'] },
    ],
  },
  {
    id: 'oldvet', name: '賈克', title: '退役老兵', room: 'garden', station: null, sprite: 'npc_oldvet', color: P.gray3,
    greet: ['坐吧，年輕人。老骨頭我曾經也是個獵手。', '這隻眼睛？嘿，被深淵裡的東西換走的。'],
    topics: [
      { q: '有什麼忠告？', a: ['別貪。看到一兩隻怪圍上來，先殺出缺口，或貼著牆走——別讓魂牢困死你。', '撞牆有時也是條活路，記住了。'] },
      { q: '深淵的盡頭有什麼？', a: ['威脅會一路攀到十三級…那之後的東西，我沒膽看。', '你要是看到了，回來告訴我。'] },
      { q: '陪你坐坐', aff: 2, a: ['哈，難得有人願意聽老頭子嘮叨。坐吧，看這花園多安靜。'] },
      { q: '當年的戰友呢？', aff: 4, a: ['都埋在深淵裡了…只剩我一個老骨頭。你能平安回來，就是對他們最好的告慰。'] },
    ],
  },
  {
    id: 'child', name: '小米', title: '鎮上的孩子', room: 'plaza', station: null, sprite: 'npc_child', color: P.redL,
    greet: ['哥哥／姐姐你好強！我長大也要當獵手！', '你身上的衣服好酷喔，是在衣帽店買的嗎？'],
    topics: [
      { q: '你在玩什麼？', a: ['我在數天上的魂晶！一閃一閃的，好漂亮～'] },
      { q: '乖乖待在鎮上喔', a: ['嗯！外面好可怕，我才不要出去呢。你要平安回來喔！'] },
      { q: '要一起玩嗎？', aff: 2, a: ['好耶！你是我最好的朋友了！我們來玩抓魂晶的遊戲～'] },
      { q: '送你個禮物', aff: 4, a: ['哇——是給我的嗎？！我也有東西要送你！是我最寶貝的小妖玩偶喔，要收好！'] },
    ],
  },
];

export const npcById = (id) => NPCS.find((n) => n.id === id);

// resolve a dialogue line (string or fn(meta)) to text
export function resolveLine(line, meta) { return typeof line === 'function' ? line(meta) : line; }

// flatten an NPC's full script: greeting then each topic Q + answers. R18/B11: topics tagged
// with `aff:N` only appear once your affinity with this NPC has reached level N.
export function npcScript(npc, meta) {
  const out = [];
  const lv = npcAffLevel(meta, npc.id);
  for (const l of (npc.greet || [])) out.push({ who: npc.name, text: resolveLine(l, meta) });
  for (const t of (npc.topics || [])) {
    if (t.aff && t.aff > lv) continue;
    out.push({ who: '你', text: t.q, ask: true });
    for (const l of (t.a || [])) out.push({ who: npc.name, text: resolveLine(l, meta) });
  }
  return out;
}

// ── R18/B11 NPC 好感度 (affinity) ───────────────────────────────────────────
// First conversation with each NPC per local day → +1 pt. Levels at 1/3/7/14/25 pts.
// Rewards are gold + QoL only (zero combat power, per the R16/R17 economy discipline):
// Lv2 150g · Lv3 400g · Lv4 800g + a free decoration · Lv5 1500g + a QoL perk flag.
const AFF_THRESHOLDS = [1, 3, 7, 14, 25];
const AFF_REWARD_GOLD = { 2: 150, 3: 400, 4: 800, 5: 1500 };
// Lv4 free decoration gift, one fixed piece per NPC (ids mirror content/room_decor.js).
const AFF_GIFT = { child: 'rd_impdoll', merchant: 'rd_throne', tailor: 'rd_chandelier', curator: 'rd_trophycase', priest: 'rd_aquarium', oldvet: 'rd_fireplace', guide: 'rd_painting', blacksmith: 'rd_bookwall', guildmaster: 'rd_rug', receptionist: 'rd_planter' };
// Lv5 QoL perk flags (read by bank.js / skinshop / claimWeekly).
const AFF_QOL = { merchant: 'qolBank', tailor: 'qolWardrobe', receptionist: 'qolWeekly' };

export function npcAffLevel(meta, id) {
  const pts = (meta.npcAff && meta.npcAff[id] && meta.npcAff[id].pts) || 0;
  let lv = 0; for (const t of AFF_THRESHOLDS) if (pts >= t) lv++; return lv;
}
export function npcAffPts(meta, id) { return (meta.npcAff && meta.npcAff[id] && meta.npcAff[id].pts) || 0; }
export function npcAffMaxLevel(meta) { let x = 0; for (const n of NPCS) { const l = npcAffLevel(meta, n.id); if (l > x) x = l; } return x; }
export function affNextThreshold(lv) { return AFF_THRESHOLDS[lv] || null; }

// Record a conversation: at most +1 pt per NPC per local day. Returns the reward summary
// { level, gold, decor, qol } when this talk crossed into a new level, else null.
export function talkAffinity(meta, id) {
  meta.npcAff = meta.npcAff || {};
  const rec = meta.npcAff[id] = meta.npcAff[id] || { pts: 0, lastDay: '' };
  const today = dateKey();
  if (rec.lastDay === today) return null;   // already counted today
  const before = npcAffLevel(meta, id);
  rec.lastDay = today; rec.pts = (rec.pts || 0) + 1;
  const after = npcAffLevel(meta, id);
  if (after <= before) return null;
  let gold = 0, decor = null, qol = null;
  for (let lv = before + 1; lv <= after; lv++) {
    gold += AFF_REWARD_GOLD[lv] || 0;
    if (lv === 4 && AFF_GIFT[id] && grantDecor(meta, AFF_GIFT[id])) decor = AFF_GIFT[id];
    if (lv === 5 && AFF_QOL[id]) { meta.flags = meta.flags || {}; meta.flags[AFF_QOL[id]] = true; qol = AFF_QOL[id]; }
  }
  meta.gold += gold;
  return { level: after, gold, decor, qol };
}

export function markMet(meta, id) {
  meta.npc = meta.npc || { met: {} };
  meta.npc.met = meta.npc.met || {};
  if (!meta.npc.met[id]) {
    meta.npc.met[id] = true;
    meta.stats = meta.stats || {};
    meta.stats.npcTalks = (meta.stats.npcTalks || 0) + 1;   // task-2: social achievements
    return true;   // newly met
  }
  return false;
}
