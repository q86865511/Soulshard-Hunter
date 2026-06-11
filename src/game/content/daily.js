// R18/B9 — 每日挑戰 (daily challenge). A deterministic biome + hero + 3 mutators are
// derived from the local date key via makeRng, so everyone playing on the same day faces
// the SAME challenge. Unlimited attempts, best score uploaded to the daily board (server
// DISTINCT-ON keeps each player's best). The map layout / drops stay non-deterministic on
// purpose — the daily contract is biome+hero+mutators, not a full seeded run (that would
// mean threading a seed through maps.js / co-op, out of scope).
//
// Mutators reuse the SAME scene accumulators as the B7 endless curses (curseHpMul /
// curseDmgMul / curseSpdMul / curseCapAdd) plus player stats + a few daily-only flags
// (dailyEliteMul / dailyTwinBoss / dailyVolatile / dailyShopMul / dailyBossDmgMul /
// dailyBossDropMul / dailyTempoMul / dailyFog, world.aimMul). All host-side scalars →
// zero protocol change (the spec's co-op rule). Applied ONCE in run.js buildWorld().
import { BIOMES } from '../../art/biomes.js';
import { Characters } from './registry.js';
import { makeRng } from '../../engine/math.js';
import { P } from '../../engine/palette.js';

// local YYYYMMDD (matches the client dailyKey() in net/ui.js + server taipeiDateKey shape)
export function dateKey(d) {
  d = d || new Date();
  return '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}
// ISO-week key, e.g. '2026-W24' (Thursday-anchored, matches ISO 8601)
export function weekKey(d) {
  d = d ? new Date(d.getTime()) : new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));   // shift to the week's Thursday
  const week1 = new Date(d.getFullYear(), 0, 4);
  const wk = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return d.getFullYear() + '-W' + String(wk).padStart(2, '0');
}
// xmur3 string hash → uint32 seed (deterministic, no Date dependency)
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// 12 mutators. `group` dedupes near-identical effects when drawing 3. Each apply(s) edits
// the run scene `s` once (s.run / s.player / accumulators / daily flags).
export const DAILY_MUTATORS = [
  { id: 'm_swift', name: '敵潮加速', group: 'speed', desc: '敵人移速 +20%', color: P.skyL,
    apply: (s) => { s.curseSpdMul *= 1.20; } },
  { id: 'm_anemic', name: '禁療領域', group: 'heal', desc: '全治療效果 ×0.25', color: P.holyL,
    apply: (s) => { s.player.healMult = (s.player.healMult || 1) * 0.25; } },
  { id: 'm_twin', name: '雙生小王', group: 'boss', desc: '每個小王時點生成 2 隻', color: P.purpleL,
    apply: (s) => { s.dailyTwinBoss = true; } },
  { id: 'm_greed', name: '黃金狂潮', group: 'gold', desc: '金幣 +50%', color: P.goldL,
    apply: (s) => { s.player.stats.goldMult *= 1.5; } },
  { id: 'm_glass', name: '玻璃獵手', group: 'glass', desc: '造成傷害 +30%、受到傷害 +30%', color: P.magenta,
    apply: (s) => { s.player.stats.damageMult *= 1.3; s.curseDmgMul *= 1.3; } },
  { id: 'm_horde', name: '蜂群', group: 'horde', desc: '刷怪上限 +40%、敵人生命 −15%', color: P.toxic,
    apply: (s) => { s.curseCapAdd += 0.40; s.curseHpMul *= 0.85; } },
  { id: 'm_elite', name: '精英橫行', group: 'elite', desc: '精英機率 ×3', color: P.emberL,
    apply: (s) => { s.dailyEliteMul = (s.dailyEliteMul || 1) * 3; } },
  { id: 'm_fog', name: '迷霧戰場', group: 'fog', desc: '自動瞄準距離 −30%、暗角加深', color: P.gray4,
    apply: (s) => { if (s.world) s.world.aimMul = (s.world.aimMul || 1) * 0.7; s.dailyFog = true; } },
  { id: 'm_tempo', name: '急速戰場', group: 'tempo', desc: '玩家與敵人攻擊節奏 +15%', color: P.shardL,
    apply: (s) => { s.dailyTempoMul = (s.dailyTempoMul || 1) * 1.15; } },
  { id: 'm_volatile', name: '自爆潮', group: 'volatile', desc: '12% 雜兵帶死亡爆炸', color: P.laser,
    apply: (s) => { s.dailyVolatile = (s.dailyVolatile || 0) + 0.12; } },
  { id: 'm_tax', name: '戰場稅', group: 'gold', desc: '商店價格 +50%、金幣 +80%', color: P.bronze,
    apply: (s) => { s.dailyShopMul = (s.dailyShopMul || 1) * 1.5; s.player.stats.goldMult *= 1.8; } },
  { id: 'm_frenzy', name: '狂亂之王', group: 'boss', desc: 'Boss 傷害 +25%、Boss 掉落翻倍', color: P.redL,
    apply: (s) => { s.dailyBossDmgMul = (s.dailyBossDmgMul || 1) * 1.25; s.dailyBossDropMul = (s.dailyBossDropMul || 1) * 2; } },
];

export function mutatorById(id) { return DAILY_MUTATORS.find((m) => m.id === id) || null; }

// Deterministic daily contract for a date key (defaults to today). biome = 10-of-1 ignoring
// unlocks (closed showcase run); hero = full roster (newRun accepts any id); 3 mutators by
// shuffle, deduped on group.
export function dailyChallenge(key) {
  key = key || dateKey();
  const rng = makeRng(hashSeed('daily:' + key));
  const biome = BIOMES[rng.int(0, BIOMES.length - 1)];
  const chars = Characters.all();
  const hero = chars.length ? chars[rng.int(0, chars.length - 1)] : { id: 'hunter' };
  const pool = rng.shuffle(DAILY_MUTATORS.slice());
  const picked = []; const groups = new Set();
  for (const m of pool) { if (groups.has(m.group)) continue; groups.add(m.group); picked.push(m); if (picked.length === 3) break; }
  return { key, biomeId: biome.id, characterId: hero.id, mutators: picked.map((m) => m.id) };
}

// Apply a daily run's mutators onto the run scene. Called from buildWorld for mode==='daily'.
export function applyDailyMutators(s) {
  for (const id of (s.run.dailyMutators || [])) {
    const m = mutatorById(id);
    if (m) { try { m.apply(s); } catch (e) { console.warn('daily mutator', id, e); } }
  }
}
