// Global game state: persistent meta-progression (save) + per-run state.
import { P } from '../engine/palette.js';
import { Talents, Facilities, Characters } from './content/registry.js';
import { checkCharacterUnlocks, skinnedSprite } from './content/characters.js';
import { checkAchievements, reconcileUnlocks } from './content/achievements.js';
import { restockSkinShop } from './content/skinshop.js';
import { Audio } from '../engine/audio.js';
import { setShakeEnabled } from '../engine/renderer.js';
import { applyKeybinds } from '../engine/input.js';
import { Net, queueCloudSave, postRunResult } from '../net/api.js';   // cloud save + leaderboard (offline-first)

const SAVE_KEY = 'soulshard.save.v1';            // legacy single-save key (migrated into slot 0 on first load)
const SLOT_COUNT = 3;
const ACTIVE_KEY = 'soulshard.activeSlot';
const slotKey = (i) => SAVE_KEY + '.slot' + i;
let _slot = 0;                                    // which slot META currently represents (saveMeta writes here)
let _migrated = false;
function migrateLegacy() {
  if (_migrated) return; _migrated = true;
  try { const legacy = localStorage.getItem(SAVE_KEY); if (legacy && !localStorage.getItem(slotKey(0))) localStorage.setItem(slotKey(0), legacy); }
  catch (e) { /* */ }
}
export function activeSlot() { try { const v = parseInt(localStorage.getItem(ACTIVE_KEY), 10); return (v >= 0 && v < SLOT_COUNT) ? v : 0; } catch (e) { return 0; } }
export function setActiveSlot(i) { _slot = (i >= 0 && i < SLOT_COUNT) ? i : 0; try { localStorage.setItem(ACTIVE_KEY, String(_slot)); } catch (e) { /* */ } }
export function currentSlot() { return _slot; }
export function currentSlotKey() { return slotKey(_slot); }
const SAVE_VERSION = 2;
// Save-version migration ladder: SAVE_MIGRATIONS[v](parsed) transforms a v-save in place to v+1.
// Empty today (round-6 changes are additive, covered by the backfills in loadMeta) — the seam
// exists so the NEXT non-additive schema change has a home instead of corrupting old saves.
const SAVE_MIGRATIONS = {};

const DEFAULT_META = () => ({
  version: SAVE_VERSION,
  gold: 0,
  talents: {},           // talentId -> level
  facilities: {},        // facilityId -> level
  unlocked: { abilities: [], equipment: [], weapons: ['wand'], characters: ['hunter'], items: [] },
  loadoutWeapon: 'wand',
  selectedCharacter: 'hunter',
  stats: { runs: 0, kills: 0, bestFloor: 0, bestStage: 0, bestScore: 0, bestTime: 0, bossKills: 0, reaperKills: 0, miniBossKills: 0, clears: 0, deaths: 0, totalGold: 0, playTime: 0, history: [],
    // round-5: extra lifetime stats for the expanded achievements (task 2)
    charClears: {}, noDmgClears: 0, bestCharLevel: 0, bondsTriggered: 0, forgeUpgrades: 0, npcTalks: 0, hiddenRoomsFound: 0 },
  settings: { master: 0.9, sfx: 0.75, music: 0.5, shake: true, muted: false, keybinds: {} },
  achievements: [],      // unlocked achievement ids
  questIndex: 0,         // current story-quest chapter
  levels: { unlocked: 1, diff: {} },   // # of biomes unlocked + highest cleared difficulty per biome
  skins: {},             // characterId -> equipped skinId (#5)
  ownedSkins: [],        // purchased "charId:skinId"
  trackedQuest: 'story', // #2 quest shown on the left-side tracker
  questClaims: {},       // claimed bounty ids
  // round-5 hub systems (task 5)
  guild: { xp: 0, claimed: {} },         // 5-3 guild rank: accumulated XP + claimed rank rewards
  forge: {},                             // 5-5 weaponId -> { level, effects:[id,...] } out-of-run weapon upgrades
  skinShop: { roll: 0, offers: [], nextRoll: 0 },   // 5-6 clothing store: rotating offers + 30-min refresh timer (task-10)
  npc: { met: {} },                      // 5-1 npc id -> true once talked to (for "new" markers / story gating)
  flags: {},
});

export function applySettings() {
  const s = META.settings || {};
  Audio.setVolumes({ master: s.master, sfx: s.sfx, music: s.music, muted: s.muted });
  setShakeEnabled(s.shake !== false);
  try { applyKeybinds(s.keybinds); } catch (e) { /* */ }
}

export let META = DEFAULT_META();

export function loadMeta(slot) {
  migrateLegacy();
  if (slot != null) _slot = (slot >= 0 && slot < SLOT_COUNT) ? slot : 0; else _slot = activeSlot();
  try { localStorage.setItem(ACTIVE_KEY, String(_slot)); } catch (e) { /* */ }
  try {
    const raw = localStorage.getItem(slotKey(_slot));
    if (raw) {
      const parsed = JSON.parse(raw);
      let _sv = (typeof parsed.version === 'number') ? parsed.version : 1;   // run the migration ladder before merging
      while (_sv < SAVE_VERSION) { try { if (SAVE_MIGRATIONS[_sv]) SAVE_MIGRATIONS[_sv](parsed); } catch (e) { /* */ } _sv++; }
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
      for (const k of ['abilities','equipment','weapons','characters','items']) if (!Array.isArray(META.unlocked[k])) META.unlocked[k] = DEFAULT_META().unlocked[k];
      if (!META.skins || typeof META.skins !== 'object') META.skins = {};
      if (!Array.isArray(META.ownedSkins)) META.ownedSkins = [];
      if (typeof META.trackedQuest !== 'string') META.trackedQuest = 'story';
      if (!META.questClaims || typeof META.questClaims !== 'object') META.questClaims = {};
      // round-5 nested shapes (task 5 hub systems + task 2 stats)
      if (!META.guild || typeof META.guild !== 'object') META.guild = { xp: 0, claimed: {} };
      if (typeof META.guild.xp !== 'number') META.guild.xp = 0;
      if (!META.guild.claimed || typeof META.guild.claimed !== 'object') META.guild.claimed = {};
      if (!META.forge || typeof META.forge !== 'object') META.forge = {};
      if (!META.skinShop || typeof META.skinShop !== 'object') META.skinShop = { roll: 0, offers: [] };
      if (typeof META.skinShop.roll !== 'number') META.skinShop.roll = 0;
      if (typeof META.skinShop.nextRoll !== 'number') META.skinShop.nextRoll = 0;   // task-10: 30-min refresh timer
      if (!Array.isArray(META.skinShop.offers)) META.skinShop.offers = [];
      if (!META.npc || typeof META.npc !== 'object') META.npc = { met: {} };
      if (!META.npc.met || typeof META.npc.met !== 'object') META.npc.met = {};
      for (const k of ['charClears']) if (!META.stats[k] || typeof META.stats[k] !== 'object') META.stats[k] = {};
      for (const k of ['noDmgClears', 'bestCharLevel', 'bondsTriggered', 'forgeUpgrades', 'npcTalks']) if (typeof META.stats[k] !== 'number') META.stats[k] = 0;
      if (typeof META.saveSeq !== 'number') META.saveSeq = 0;
      if (typeof META.stats.playTime !== 'number') META.stats.playTime = 0;
      META.version = SAVE_VERSION;
    } else { META = DEFAULT_META(); }   // empty slot → fresh save
  } catch (e) { console.warn('load save failed', e); META = DEFAULT_META(); }
  try { reconcileUnlocks(META); } catch (e) { /* */ }   // re-grant achievement unlocks (A2)
  return META;
}

export function saveMeta() {
  // saveSeq = strictly-increasing, clock-safe conflict key for cloud-vs-local; savedAt is a tie-break only
  try { META.saveSeq = (META.saveSeq || 0) + 1; META.savedAt = Date.now(); META.slot = _slot; localStorage.setItem(slotKey(_slot), JSON.stringify(META)); }   // stamp the slot so cloud sync only reconciles like-with-like
  catch (e) { console.warn('save failed', e); }
  queueCloudSave(getMeta, SAVE_VERSION);   // debounced cloud push if logged in (no-op otherwise) — syncs the ACTIVE slot
}

export function resetMeta() { META = DEFAULT_META(); saveMeta(); }

export function getMeta() { return META; }

// last finished run's leaderboard components while NOT logged in — lets the leaderboard
// overlay offer a guest upload (with a self-entered name). Cleared after a successful upload.
export let lastGuestRun = null;
export function clearLastGuestRun() { lastGuestRun = null; }

// ---- save slots (title-screen slot picker) --------------------------------
// Lightweight headers for each of the 3 local slots, read WITHOUT disturbing the live META.
export function slotSummaries() {
  migrateLegacy();
  const act = activeSlot();
  const out = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    let s = null;
    try { const raw = localStorage.getItem(slotKey(i)); if (raw) s = JSON.parse(raw); } catch (e) { /* */ }
    if (!s) { out.push({ i, empty: true, active: i === act }); continue; }
    const st = s.stats || {};
    out.push({
      i, empty: false, active: i === act,
      gold: s.gold || 0, playTime: st.playTime || 0, achievements: (s.achievements || []).length,
      bestStage: st.bestStage || 0, bestScore: st.bestScore || 0, runs: st.runs || 0, clears: st.clears || 0,
      char: s.selectedCharacter || 'hunter', biomesUnlocked: (s.levels && s.levels.unlocked) || 1, savedAt: s.savedAt || 0,
    });
  }
  return out;
}
export function deleteSlot(i) {
  try { localStorage.removeItem(slotKey(i)); localStorage.removeItem(slotKey(i) + '.precloud.bak'); } catch (e) { /* */ }
  if (i === _slot) {
    // active slot deleted: re-point to a valid slot + reload, so a later saveMeta()/cloud push
    // never writes the emptied slot. Prefer the first remaining non-empty slot, else slot 0.
    let next = 0;
    for (let k = 0; k < SLOT_COUNT; k++) { if (k === i) continue; let raw = null; try { raw = localStorage.getItem(slotKey(k)); } catch (e) { /* */ } if (raw) { next = k; break; } }
    setActiveSlot(next); loadMeta(next);
  }
}
export const SLOTS = SLOT_COUNT;

// Replace the in-memory + local save with a cloud blob (used right after login),
// reusing loadMeta()'s migration path so partial/old cloud saves are normalised.
export function importMeta(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.slot === 'number' && obj.slot !== _slot) return false;   // never write another slot's cloud blob into this slot
  try {
    const prev = localStorage.getItem(slotKey(_slot));
    if (prev) localStorage.setItem(slotKey(_slot) + '.precloud.bak', prev);   // recoverable backup before clobbering the active slot
    localStorage.setItem(slotKey(_slot), JSON.stringify(obj));
  } catch (e) { return false; }   // couldn't stage the blob → report failure (don't claim success)
  loadMeta();
  applySettings();
  return true;
}

// After login: reconcile cloud vs local by the savedAt marker so a logged-in player
// never silently loses NEWER guest progress to an OLDER cloud save (and vice-versa).
// A .precloud.bak is written before any overwrite, so the result is always recoverable.
export async function syncFromCloud(opts = {}) {
  if (!Net.isLoggedIn()) return { ok: false };
  try {
    const r = await Net.getSave();
    const cloud = r && r.meta;
    if (cloud) {
      // the cloud blob is one-per-account; only reconcile it with the slot it came from
      const cloudSlot = (typeof cloud.slot === 'number') ? cloud.slot : 0;   // legacy blobs (no slot) belong to slot 0 (where legacy saves migrate)
      if (cloudSlot !== _slot) {
        try { await Net.putSave(getMeta(), SAVE_VERSION); } catch (e) { /* */ }   // different slot → never pull; just push this slot up
        return { ok: true, skipped: true, slotMismatch: true };
      }
      // reconcile by saveSeq (clock-safe), savedAt only as tie-break
      const cs = cloud.saveSeq || 0, ls = META.saveSeq || 0;
      const cloudNewer = cs > ls || (cs === ls && (cloud.savedAt || 0) > (META.savedAt || 0));
      if (cloudNewer) {
        if (opts.pushOnly) return { ok: true, pulled: false, deferred: true };   // boot: don't clobber a slot before the player enters it
        return importMeta(cloud) ? { ok: true, pulled: true } : { ok: false };
      }
      await Net.putSave(getMeta(), SAVE_VERSION);   // local is newer → keep it, push up
      return { ok: true, pushed: true, keptLocal: true };
    }
    await Net.putSave(getMeta(), SAVE_VERSION);      // fresh account → seed it with local progress
    return { ok: true, pushed: true };
  } catch (e) { return { ok: false, error: e && e.message }; }
}

// ---- base numbers ----------------------------------------------------------
export function makeBaseStats() {
  return {
    maxHp: 114, hpRegen: 0,
    speed: 82,
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
  // opts.characterId / opts.startWeapon let co-op build the host's run from the lobby
  // pick instead of META.selectedCharacter (which the host may not have changed).
  const char = Characters.get(opts.characterId || META.selectedCharacter || 'hunter') || Characters.get('hunter');
  const run = {
    floor: 1, stage: 1, depth: 1, time: 0,
    biomeId: opts.biomeId || null, difficulty: opts.difficulty || 1, cleared: false,
    gold: 0, goldEarned: 0, shards: 0,
    level: 1, xp: 0, xpNext: 20, kills: 0, score: 0, bossKills: 0,
    stats: makeBaseStats(),
    characterId: char ? char.id : 'hunter',
    characterSprite: char ? skinnedSprite(META, char.id) : 'player',
    startWeapons: [opts.startWeapon || (char ? char.startWeapon : 'w_soulbolt')],
    abilities: [],
    abilityLevels: {},
    equipment: { weapon: null, armor: null, trinket: null },
    inventory: [],
    dmgBySource: {},        // 原#16: weapon/source -> cumulative damage dealt (results ranking)
    bonds: [],              // 原#13: ids of bonds currently active this run
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
  META.stats.playTime = (META.stats.playTime || 0) + Math.floor(run.time || 0);   // accumulated 遊戲時數 (shown on the save-slot picker)
  META.stats.bestFloor = Math.max(META.stats.bestFloor, run.floor);
  META.stats.bestStage = Math.max(META.stats.bestStage || 0, run.stage || run.floor || 1);
  META.stats.bestScore = Math.max(META.stats.bestScore || 0, run.score || 0);
  META.stats.bestTime = Math.max(META.stats.bestTime || 0, Math.floor(run.time || 0));
  META.stats.bossKills = (META.stats.bossKills || 0) + (run.bossKills || 0);
  META.stats.reaperKills = (META.stats.reaperKills || 0) + (run.reaperKills || 0);
  META.stats.miniBossKills = (META.stats.miniBossKills || 0) + (run.miniKills || 0);
  if (run.cleared) META.stats.clears = (META.stats.clears || 0) + 1;
  if (!run.cleared) META.stats.deaths += 1;   // only a genuine loss is a death (was unconditional → every win counted as a death)
  // round-5 extra stats (task 2) + guild XP (task 5-3)
  META.stats.bestCharLevel = Math.max(META.stats.bestCharLevel || 0, run.level || 1);
  META.stats.bondsTriggered = (META.stats.bondsTriggered || 0) + ((run.bonds && run.bonds.length) || 0);
  if (run.cleared) {
    const cc = META.stats.charClears = META.stats.charClears || {};
    cc[run.characterId] = (cc[run.characterId] || 0) + 1;
    if (!(run.dmgTaken > 0)) META.stats.noDmgClears = (META.stats.noDmgClears || 0) + 1;   // flawless clear
  }
  META.guild = META.guild || { xp: 0, claimed: {} };
  // guild reputation per sortie: scaled by score/time + bounties on bosses & clears
  const gain = Math.floor((run.score || 0) / 250) + Math.floor((run.time || 0) / 60)
    + (run.bossKills || 0) * 4 + ((run.miniKills || 0) * 2) + (run.cleared ? 60 : 0) + (run.reaperKills || 0) * 40;
  META.guild.xp = (META.guild.xp || 0) + Math.max(0, gain);
  run.guildGain = Math.max(0, gain);   // surfaced on the results screen
  META.stats.history = META.stats.history || [];
  META.stats.history.push({ score: run.score || 0, stage: run.stage || run.floor || 1, kills: run.kills || 0, char: run.characterId || 'hunter' });
  META.stats.history.sort((a, b) => b.score - a.score);
  META.stats.history = META.stats.history.slice(0, 10);
  let newChars = [], newAch = [];
  try { newChars = checkCharacterUnlocks(META) || []; } catch (e) { /* ignore */ }
  try { newAch = checkAchievements(META) || []; } catch (e) { /* ignore */ }
  try { restockSkinShop(META); } catch (e) { /* ignore */ }   // 5-6: fresh clothing-store stock next visit
  saveMeta();
  // upload the run to the shared leaderboard (best-effort; score recomputed server-side)
  const runPayload = {
    kills: run.kills || 0,
    stage: run.stage || run.floor || 1,
    time_s: Math.floor(run.time || 0),
    difficulty: run.difficulty || 1,
    cleared: !!run.cleared,
    reaper: !!(run.reaperKills > 0 || run.reaperSlain),
    character: run.characterId || null,
    biome: run.biomeId || null,
    coop_size: run.coopSize || 1,   // Phase 2: party size for the shared leaderboard
  };
  try { postRunResult(runPayload); } catch (e) { /* ignore */ }                       // logged in → auto-upload
  try { if (!Net.isLoggedIn()) lastGuestRun = runPayload; } catch (e) { /* ignore */ }  // guest → offer a named upload from the leaderboard overlay
  return { newAchievements: newAch, newCharacters: newChars };   // for the results screen (原#1)
}
