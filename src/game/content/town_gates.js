// R17/9.1 (#18): town out-of-run growth systems unlock along a MIXED progression axis —
// guild rank × cleared-biome count (player-chosen standard). Gates only ever block NEW
// purchases/panels; levels already owned are never stripped, so older saves feel no change.
import { guildRank } from './guild.js';

// number of biomes cleared at least once (any difficulty — story writes diff ≥ 1 too)
export const clearedBiomes = (meta) => Object.values(((meta || {}).levels || {}).diff || {}).filter((v) => v >= 1).length;

export const TOWN_GATES = {
  forge: { ok: (m) => clearedBiomes(m) >= 1, hint: '通關任一生態系後，鍛造爐將為你點燃' },
  bank: { ok: (m) => guildRank(m) >= 2, hint: '公會等級達「銅星 · 賞金獵人」後開放借貸' },
  talentRow2: { ok: (m) => guildRank(m) >= 3, hint: '公會等級達「青銅 · 老練會員」後開放第三排天賦' },
};
// returns the blocking hint, or null when open
export function gate(meta, key) { const g = TOWN_GATES[key]; return g && !g.ok(meta) ? g.hint : null; }

// per-facility LEVEL gates — only the next level from `fromLevel` upward is blocked
const FACILITY_LEVEL_GATES = {
  f_dojo: { fromLevel: 2, need: 3, hint: '通關 3 個生態系後可升至此級' },
  f_arsenal: { fromLevel: 3, need: 4, hint: '通關 4 個生態系後可升至此級' },
};
export function facilityGate(meta, id, nextLevel) {
  const g = FACILITY_LEVEL_GATES[id];
  return g && nextLevel >= g.fromLevel && clearedBiomes(meta) < g.need ? g.hint : null;
}

export function gateProgress(meta) { return '目前進度：通關 ' + clearedBiomes(meta) + ' 個生態系 · 公會 Rank ' + guildRank(meta); }
