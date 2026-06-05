// 5-3 獵人公會 rank track. Guild XP (聲望) accrues every sortie (state.bankRun) and
// when claiming quests (quests.js). Crossing a rank threshold lets the player CLAIM a
// one-time reward at the guild — gold and/or a content unlock — giving the guild its
// own progression path alongside achievements. Pure data module: takes `meta` in.

// idempotent unlock helper (mirrors achievements.U)
const U = (kind, id) => (meta) => {
  if (!meta.unlocked) meta.unlocked = {};
  const arr = meta.unlocked[kind] = Array.isArray(meta.unlocked[kind]) ? meta.unlocked[kind] : [];
  if (!arr.includes(id)) arr.push(id);
};

// reward: { gold?, grant?(meta), label } — label is shown on the claim button
export const GUILD_RANKS = [
  { xp: 0,     name: '銅章 · 見習獵人', reward: null },
  { xp: 150,   name: '鐵章 · 正式會員', reward: { gold: 150, label: '+150 金' } },
  { xp: 400,   name: '銅星 · 賞金獵人', reward: { grant: U('weapons', 'w_soulstorm'), label: '武器「魂晶風暴」' } },
  { xp: 800,   name: '青銅 · 老練會員', reward: { gold: 180, grant: U('abilities', 'overload'), label: '被動「過載」+180 金' } },
  { xp: 1400,  name: '白銀 · 銀章獵人', reward: { grant: U('equipment', 'g_dragon_scale'), label: '裝備「龍鱗甲」' } },
  { xp: 2200,  name: '銀星 · 精英獵人', reward: { gold: 260, grant: U('items', 'it_timeslow_burst'), label: '道具「時滯爆發」+260 金' } },
  { xp: 3200,  name: '黃金 · 金章好手', reward: { grant: U('weapons', 'g_laserbeam'), label: '武器「聚能雷射」' } },
  { xp: 4600,  name: '金星 · 名譽會員', reward: { gold: 360, grant: U('abilities', 'g_executioner'), label: '被動「處決」+360 金' } },
  { xp: 6400,  name: '白金 · 白金獵人', reward: { grant: U('equipment', 'ep_chromatic_core'), label: '史詩裝備「彩晶核心」' } },
  { xp: 8800,  name: '鑽石 · 鑽石獵人', reward: { gold: 500, grant: U('weapons', 'g_blackhole'), label: '武器「黑洞」+500 金' } },
  { xp: 12000, name: '星辰 · 公會之星', reward: { grant: (m) => { U('abilities', 'ac_warbanner')(m); U('equipment', 'ep_void_mantle')(m); }, label: '被動「戰旗」+ 史詩「虛空斗篷」' } },
  { xp: 16000, name: '傳奇 · 公會之柱', reward: { gold: 1200, grant: U('items', 'g_purge_wave'), label: '道具「淨化波」+1200 金' } },
];

// current rank index from xp (highest threshold reached)
export function guildRank(meta) {
  const xp = (meta.guild && meta.guild.xp) || 0;
  let r = 0;
  for (let i = 0; i < GUILD_RANKS.length; i++) if (xp >= GUILD_RANKS[i].xp) r = i;
  return r;
}

export function guildProgress(meta) {
  const xp = (meta.guild && meta.guild.xp) || 0;
  const r = guildRank(meta);
  const cur = GUILD_RANKS[r];
  const next = GUILD_RANKS[r + 1] || null;
  const base = cur.xp, span = next ? next.xp - cur.xp : 1;
  return { rank: r, name: cur.name, xp, next, frac: next ? Math.min(1, (xp - base) / span) : 1, toNext: next ? Math.max(0, next.xp - xp) : 0 };
}

// ranks whose threshold is reached and whose reward hasn't been claimed
export function claimableRanks(meta) {
  const xp = (meta.guild && meta.guild.xp) || 0;
  const claimed = (meta.guild && meta.guild.claimed) || {};
  return GUILD_RANKS.map((rk, i) => ({ rk, i })).filter(({ rk, i }) => rk.reward && xp >= rk.xp && !claimed[i]);
}

export function claimGuildRank(meta, i) {
  const rk = GUILD_RANKS[i];
  const xp = (meta.guild && meta.guild.xp) || 0;
  if (!rk || !rk.reward || xp < rk.xp) return null;
  meta.guild = meta.guild || { xp: 0, claimed: {} };
  meta.guild.claimed = meta.guild.claimed || {};
  if (meta.guild.claimed[i]) return null;
  meta.guild.claimed[i] = true;
  if (rk.reward.gold) meta.gold += rk.reward.gold;
  if (rk.reward.grant) { try { rk.reward.grant(meta); } catch (e) { /* */ } }
  return rk;
}

// small guild-XP top-up when claiming quests (called from quests.js)
export function addGuildXp(meta, n) {
  meta.guild = meta.guild || { xp: 0, claimed: {} };
  meta.guild.xp = (meta.guild.xp || 0) + Math.max(0, Math.floor(n));
}
