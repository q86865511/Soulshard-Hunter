// Global game state: persistent meta-progression (save) + per-run state.
import { P } from '../engine/palette.js';
import { Talents, Facilities, Characters } from './content/registry.js';
import { checkCharacterUnlocks, skinnedSprite } from './content/characters.js';
import { checkAchievements, reconcileUnlocks } from './content/achievements.js';
import { Audio } from '../engine/audio.js';
import { setShakeEnabled } from '../engine/renderer.js';

const SAVE_KEY = 'soulshard.save.v1';
const SAVE_VERSION = 2;

const DEFAULT_META = () => ({
  version: SAVE_VERSION,
  gold: 0,
  talents: {},           // talentId -> level
  facilities: {},        // facilityId -> level
  unlocked: { abilities: [], equipment: [], weapons: ['wand'], characters: ['hunter'] },
  loadoutWeapon: 'wand',
  selectedCharacter: 'hunter',
  stats: { runs: 0, kills: 0, bestFloor: 0, bestStage: 0, bestScore: 0, bestTime: 0, bossKills: 0, reaperKills: 0, miniBossKills: 0, clears: 0, deaths: 0, totalGold: 0, history: [] },
  settings: { master: 0.9, sfx: 0.75, music: 0.5, shake: true, muted: false },
  achievements: [],      // unlocked achievement ids
  questIndex: 0,         // current story-quest chapter
  levels: { unlocked: 1, diff: {} },   // # of biomes unlocked + highest cleared difficulty per biome
  skins: {},             // characterId -> equipped skinId (#5)
  ownedSkins: [],        // purchased "charId:skinId"
  trackedQuest: 'story', // #2 quest shown on the left-side tracker
  questClaims: {},       // claimed bounty ids
  flags: {},
});

export function applySettings() {
  const s = META.settings || {};
  Audio.setVolumes({ master: s.master, sfx: s.sfx, music: s.music, muted: s.muted });
  setShakeEnabled(s.shake !== false);
}

export let META = DEFAULT_META();

export function loadMeta() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      META = Object.assign(DEFAULT_META(), parsed);
      META.stats = Object.assign(DEFAULT_META().stats, parsed.stats || {});
      META.unlocked = Object.assign(DEFAULT_META().unlocked, parsed.unlocked || {});
      META.settings = Object.assign(DEFAULT_META().settings, parsed.settings || {});
      META.levels = Object.assign(DEFAULT_META().levels, parsed.levels || {});
      META.levels.diff = Object.assign({}, (parsed.levels && parsed.levels.diff) || {});
      // --- save migration: guarantee nested shapes exist for older/partial saves ---
      META.levels = META.levels || { unlocked: 1, diff: {} };
      META.levels.diff = META.levels.diff || {};
      META.achievements = Array.isArray(META.achievements) ? META.achievements : [];
      if (typeof META.questIndex !== 'number') META.questIndex = 0;
      if (!META.unlocked || typeof META.unlocked !== 'object') META.unlocked = DEFAULT_META().unlocked;
      for (const k of ['abilities','equipment','weapons','characters']) if (!Array.isArray(META.unlocked[k])) META.unlocked[k] = DEFAULT_META().unlocked[k];
      if (!META.skins || typeof META.skins !== 'object') META.skins = {};
      if (!Array.isArray(META.ownedSkins)) META.ownedSkins = [];
      if (typeof META.trackedQuest !== 'string') META.trackedQuest = 'story';
      if (!META.questClaims || typeof META.questClaims !== 'object') META.questClaims = {};
      META.version = SAVE_VERSION;
    }
  } catch (e) { console.warn('load save failed', e); META = DEFAULT_META(); }
  try { reconcileUnlocks(META); } catch (e) { /* */ }   // re-grant achievement unlocks (A2)
  return META;
}

export function saveMeta() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(META)); }
  catch (e) { console.warn('save failed', e); }
}

export function resetMeta() { META = DEFAULT_META(); saveMeta(); }

export function getMeta() { return META; }

// ---- base numbers ----------------------------------------------------------
export function makeBaseStats() {
  return {
    maxHp: 100, hpRegen: 0,
    speed: 80,
    damageMult: 1, critChance: 0.05, critMult: 2,
    fireRateMult: 1, projSpeedMult: 1, projCountAdd: 0, pierceAdd: 0,
    knockbackMult: 1, homing: 0, area: 1,
    defense: 0, armorMult: 0, dodge: 0, lifesteal: 0,
    pickupRange: 26, luck: 0,
    xpMult: 1, goldMult: 1, shardMult: 1,
    dashCd: 0.85,
  };
}

export const WEAPONS = {
  wand: { id: 'wand', name: '魂晶法杖', kind: 'weapon', slot: 'weapon', tier: 1,
    damage: 11, fireRate: 3.6, projSpeed: 168, projCount: 1, spread: 0.05, pierce: 0,
    knockback: 26, projSprite: 'bolt', projColor: P.shard, projRadius: 3, projLife: 1.4, homing: 0,
    desc: '基礎遠程武器，穩定發射魂晶彈。' },
};

export function defaultWeapon() { return { ...WEAPONS.wand }; }

// ---- run lifecycle ---------------------------------------------------------
export function newRun(opts = {}) {
  const char = Characters.get(META.selectedCharacter || 'hunter') || Characters.get('hunter');
  const run = {
    floor: 1, stage: 1, depth: 1, time: 0,
    biomeId: opts.biomeId || null, difficulty: opts.difficulty || 1, cleared: false,
    gold: 0, goldEarned: 0, shards: 0,
    level: 1, xp: 0, xpNext: 20, kills: 0, score: 0, bossKills: 0,
    stats: makeBaseStats(),
    characterId: char ? char.id : 'hunter',
    characterSprite: char ? skinnedSprite(META, char.id) : 'player',
    startWeapons: [char ? char.startWeapon : 'w_soulbolt'],
    abilities: [],
    abilityLevels: {},
    equipment: { weapon: null, armor: null, trinket: null },
    inventory: [],
    startedAt: (typeof performance !== 'undefined' ? performance.now() : 0),
  };
  applyMeta(run);
  if (char && char.passive) { try { char.passive(run.stats); } catch (e) { console.warn('character passive', e); } }
  return run;
}

// Apply permanent talents + facility passives onto the run's stats.
export function applyMeta(run) {
  for (const [id, lvl] of Object.entries(META.talents || {})) {
    const t = Talents.get(id);
    if (t && typeof t.apply === 'function' && lvl > 0) {
      try { t.apply(run.stats, lvl, run); } catch (e) { console.warn('talent apply failed', id, e); }
    }
  }
  for (const [id, lvl] of Object.entries(META.facilities || {})) {
    const f = Facilities.get(id);
    if (f && typeof f.applyRun === 'function' && lvl > 0) {
      try { f.applyRun(run, lvl); } catch (e) { console.warn('facility applyRun failed', id, e); }
    }
  }
}

export function bankRun(run) {
  META.gold += run.gold;
  META.stats.runs += 1;
  META.stats.kills += run.kills;
  META.stats.totalGold += run.gold;
  META.stats.bestFloor = Math.max(META.stats.bestFloor, run.floor);
  META.stats.bestStage = Math.max(META.stats.bestStage || 0, run.stage || run.floor || 1);
  META.stats.bestScore = Math.max(META.stats.bestScore || 0, run.score || 0);
  META.stats.bestTime = Math.max(META.stats.bestTime || 0, Math.floor(run.time || 0));
  META.stats.bossKills = (META.stats.bossKills || 0) + (run.bossKills || 0);
  META.stats.reaperKills = (META.stats.reaperKills || 0) + (run.reaperKills || 0);
  META.stats.miniBossKills = (META.stats.miniBossKills || 0) + (run.miniKills || 0);
  if (run.cleared) META.stats.clears = (META.stats.clears || 0) + 1;
  META.stats.deaths += 1;
  META.stats.history = META.stats.history || [];
  META.stats.history.push({ score: run.score || 0, stage: run.stage || run.floor || 1, kills: run.kills || 0, char: run.characterId || 'hunter' });
  META.stats.history.sort((a, b) => b.score - a.score);
  META.stats.history = META.stats.history.slice(0, 10);
  let newChars = [], newAch = [];
  try { newChars = checkCharacterUnlocks(META) || []; } catch (e) { /* ignore */ }
  try { newAch = checkAchievements(META) || []; } catch (e) { /* ignore */ }
  saveMeta();
  return { newAchievements: newAch, newCharacters: newChars };   // for the results screen (原#1)
}
