// In-run gameplay: continuous-survival across large biome stages. Walk only
// (weapons auto-fire); enemies pour in endlessly and escalate. Survive each
// stage's timer (or slay its boss) to open the exit to the next biome.
import { World, TS } from '../world.js';
import { generateWorld } from '../maps.js';
import { BIOMES } from '../../art/biomes.js';
import { Player } from '../player.js';
import { newRun, bankRun, META, saveMeta } from '../state.js';
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { RT } from '../../net/rt.js';   // Phase 2 co-op: leave-room on host abandon
import { Net } from '../../net/api.js';   // round16/7.3: "playing now" heartbeat (offline-first; no-op without a server)
import { Enemies, Equipment, Abilities, Weapons, Characters } from '../content/registry.js';
import { equipItem } from '../content/equipment.js';
import { BONDS, activeBonds, checkBonds, bondProgress, bondAdvancedBy } from '../content/bonds.js';
import { exclusiveFor } from '../content/exclusives.js';
import { BALANCE, weaponMaxLevel } from '../balance.js';
import { isUnlocked, cheatUnlockAll } from '../content/unlocks.js';
import { STORY_QUESTS, trackedQuestStates, fmtQuestVal } from '../content/quests.js';
import { heroLore } from '../content/lore.js';
import { EVENTS } from '../content/events.js';
import { HIDDEN_ROOMS, hiddenRoomById, claimHidden, hiddenClaimed } from '../content/hidden.js';
import { skinSpriteName } from '../content/characters.js';   // R17/6.5: devkid reveal sprite in the hidden panel
import { Cheats } from '../cheats.js';
import {
  camera, clear, vignette, uiText, uiRect, uiScale, view, addShake, drawSpriteUI, textWidth,
  drawSprite, drawShadow, glowWorld, worldToScreen, fillRectWorld, uiBar, setShakeScale,
  fillCircleWorld, strokeCircleWorld, goldStr, ctxRaw, uiClipRound,
} from '../../engine/renderer.js';
import { drawHud, drawLowHpWarning, hudIcons, drawAchievementToasts } from '../hud.js';
import { pressed, mouse } from '../../engine/input.js';
import { rng, dist, clamp, TAU } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { getRunChoices, applyChoice, choiceStyle, fusionAvailable, MAX_WEAPONS, MAX_PASSIVES, RARITY, CHOICE_TYPE, rarityOf } from '../progression.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

// 原#1: stat fields shown in equip before/after diffs, with display formatting.
const STAT_LABELS = [
  ['maxHp', '生命上限', 'int'], ['damageMult', '傷害', 'mult'], ['fireRateMult', '射速', 'mult'],
  ['critChance', '暴擊率', 'pct'], ['critMult', '暴擊傷害', 'mult'], ['speed', '移速', 'int'],
  ['defense', '減傷', 'int'], ['dodge', '閃避', 'pct'], ['lifesteal', '吸血', 'pct'],
  ['projCountAdd', '投射物', 'plus'], ['pierceAdd', '穿透', 'plus'], ['area', '範圍', 'mult'],
  ['projSpeedMult', '彈速', 'mult'], ['pickupRange', '拾取', 'int'], ['luck', '幸運', 'f2'],
  ['hpRegen', '生命回復', 'f1'], ['goldMult', '金幣', 'mult'], ['xpMult', '經驗', 'mult'],
];
const fmtStat = (v, fmt) => {
  if (fmt === 'mult') return '×' + (v || 0).toFixed(2);
  if (fmt === 'pct') return Math.round((v || 0) * 100) + '%';
  if (fmt === 'plus') return '+' + Math.round(v || 0);
  if (fmt === 'f2') return (v || 0).toFixed(2);
  if (fmt === 'f1') return (v || 0).toFixed(1);
  return String(Math.round(v || 0));
};

// Stat-anvil POOL. Buying an anvil (C1) opens a paused 3-of-these random pick.
const ANVIL_POOL = [
  { name: '力量鐵砧', desc: '傷害 ×1.08', apply: (s) => { s.damageMult *= 1.08; } },
  { name: '迅捷鐵砧', desc: '射速 ×1.07', apply: (s) => { s.fireRateMult *= 1.07; } },
  { name: '堅韌鐵砧', desc: '生命上限 +16', apply: (s, p) => { s.maxHp += 16; p.heal(16); } },
  { name: '銳利鐵砧', desc: '暴擊率 +4%', apply: (s) => { s.critChance += 0.04; } },
  { name: '疾風鐵砧', desc: '移速 ×1.05', apply: (s) => { s.speed *= 1.05; } },
  { name: '壁壘鐵砧', desc: '減傷 +1', apply: (s) => { s.defense += 1; } },
  { name: '貫穿鐵砧', desc: '穿透 +1', apply: (s) => { s.pierceAdd = (s.pierceAdd || 0) + 1; } },
  { name: '增幅鐵砧', desc: '範圍 ×1.10', apply: (s) => { s.area = (s.area || 1) * 1.1; } },
  { name: '吸血鐵砧', desc: '吸血 +2%', apply: (s) => { s.lifesteal = (s.lifesteal || 0) + 0.02; } },
  { name: '狂暴鐵砧', desc: '暴擊傷害 +0.3', apply: (s) => { s.critMult = (s.critMult || 2) + 0.3; } },
];

// A level lasts 20 minutes (E2): a DISTINCT mini-boss every 5 min, the level's
// FINAL BOSS at 20:00, then 30s after it dies a killable Reaper appears (hidden).
// Clearing the final boss unlocks the next level + difficulty.
const LEVEL_TIME = BALANCE.LEVEL_TIME;
// 6.2 首局戰鬥提示：在第一場戰鬥的指定秒數淡入淡出的底部橫幅（看過一次後不再）。
const BATTLE_HINTS = [
  { t: 3, text: '武器自動瞄準並射擊，無需手動操作。' },
  { t: 12, text: '按【空白】或【右鍵】可緊急閃避（短暫無敵）。' },
  { t: 22, text: '按【B】隨時開啟商店，花費魂晶強化裝備。' },
  { t: 33, text: '按【M】查看放大地圖，按【Tab】查看目前配裝。' },
  { t: 45, text: '升級時時間暫停，從三個選項中挑選強化。' },
];
const FINAL_BOSS = { crypt: 'g_plagueheart', cavern: 'g_stormtyrant', frost: 'b2_glacierseer', inferno: 'b2_emberlord', void: 'b2_voidweaver' };
const REAPER_ID = 'reaper';
// task-4: cardinal probes (px) used to detect the player backing into a wall during 魂牢
const SURROUND_PROBES = [[14, 0], [-14, 0], [0, 14], [0, -14]];

// Co-op level-up: build up to 3 WEAPON choices for a player (level an owned weapon /
// grant a new one). Per-avatar, so it's safe to apply to any player without the shared
// run-stats tangle. Sent to guests for display; the host applies the pick.
function buildWeaponChoices(player) {
  const opts = [];
  for (const w of player.weapons) if (!w.def.evolved && w.level < weaponMaxLevel(w.def)) opts.push({ act: 'level', wid: w.def.id, name: w.def.name, icon: w.def.icon || ('weapon_' + w.def.id), lvl: w.level });
  if (player.weapons.length < 6) {
    const have = new Set(player.weapons.map((w) => w.def.id));
    const pool = Weapons.all().filter((d) => !d.evolved && !have.has(d.id) && isUnlocked(META, 'weapons', d.id));
    for (let i = 0; i < 4 && pool.length; i++) { const d = pool.splice(rng.int(0, pool.length - 1), 1)[0]; opts.push({ act: 'new', wid: d.id, name: d.name, icon: d.icon || ('weapon_' + d.id), lvl: 0 }); }
  }
  for (let i = opts.length - 1; i > 0; i--) { const j = rng.int(0, i); const t = opts[i]; opts[i] = opts[j]; opts[j] = t; }   // shuffle
  const pick = opts.slice(0, 3);
  if (!pick.length) pick.push({ act: 'heal', wid: '', name: '回復生命', icon: 'item_heart', lvl: 0 });
  return pick;
}
function applyWeaponChoice(player, opt, world) {
  if (!opt) { player.heal(player.maxHp * 0.12); return; }
  if (opt.act === 'level') { const inst = player.weapons.find((w) => w.def.id === opt.wid); if (inst) player.levelWeapon(inst, world); else player.addWeapon(opt.wid, world); }
  else if (opt.act === 'new') player.addWeapon(opt.wid, world);
  else player.heal(player.maxHp * 0.15);
}

export const runScene = {
  enter(payload) {
    this.run = payload.run || newRun();
    this.run.time = 0;
    this.run.stage = 1; this.run.floor = 1;
    this.coop = payload.coop || null;   // Phase 2: a CoopHost handle when this is a host co-op run (null = single-player)
    this.coopMenu = false; this.coopPick = null; this.coopPickQueue = 0;
    this.world = new World(this.run);
    this.player = null;
    this.t = 0; this.dead = false; this.deathT = 0;
    this.levelQueue = this.run.startBonusLevels || 0;
    this.choice = null; this.banner = ''; this.bannerT = 0;
    this.paused = false; this.confirmQuit = false;   // 4.8
    // co-op: the run ends only when EVERY avatar is down (one player dying isn't game-over)
    this.world.onPlayerDeath = () => { if (this.coop) { if (!this.world.anyPlayerAlive()) this.onDeath(); } else this.onDeath(); };
    this.world.onLevelUp = () => this.onLevelUp();
    this.world.onEnemyKilled = (e) => {
      if (e === this.finalBossRef) this.onBigBossDead(e);
      else if (e === this.reaperRef) this.onReaperDead(e);
      else if (e.boss) this.onBossDead(e);
    };
    this.world.onEquipPickup = (def) => this.openEquipChoice(def);
    this.world.onPlayerHit = (d) => { this.run.dmgTaken = (this.run.dmgTaken || 0) + (d || 0); if (this.challenge && this.challenge.type === 'nohit') this.failChallenge(); };   // 原#3 challenge fail + task-2 no-hit tracking
    this.equipChoice = null; this.equipQueue = [];
    this.eventChoice = null; this.challenge = null;   // 原#3 mini-boss event + timed challenge
    this.newlyUnlocked = [];   // 原#1 results screen: achievements unlocked this run
    this.hudTut = false; this._hudTutShown = false; this._bhIdx = 0; this._bhActive = null;   // 6.2/6.3 first-run tutorials (single-player only)
    this.buildWorld();
    this._startPresence();   // round16/7.3: announce "playing now" (REST heartbeat; offline-first)
  },

  // round16/7.3 — lightweight "playing now" heartbeat so the admin console can see who is
  // mid-run (logged-in OR offline guest). Best-effort; no server → silent no-op.
  _presenceInfo() { return { name: (Net.currentUser() || {}).username || '訪客', biome: this.run && this.run.biomeId, difficulty: this.run && this.run.difficulty }; },
  _startPresence() {
    this._stopPresence();
    try { Net.pingPlaying(this._presenceInfo()); } catch (e) { /* */ }
    this._presenceTimer = setInterval(() => { try { Net.pingPlaying(this._presenceInfo()); } catch (e) { /* */ } }, 30000);
  },
  _stopPresence() {
    if (this._presenceTimer) { clearInterval(this._presenceTimer); this._presenceTimer = null; try { Net.stopPlayingBeat(); } catch (e) { /* */ } }
  },
  exit() { this._stopPresence(); },

  // ---- the level battleground (one biome, 30 min, final-boss climax) --------
  buildWorld() {
    const biome = BIOMES.find((b) => b.id === this.run.biomeId) || BIOMES[0];
    const map = generateWorld(biome);
    this.map = map;
    this.world.loadMap(map);
    this.buildMinimap();
    this.world.enemies.length = 0; this.world.projectiles.length = 0;
    this.world.pickups.length = 0; this.world.beams.length = 0; this.world.particles.clear();

    this.player = new Player(map.entrance.x, map.entrance.y, this.run.stats);
    this.player.run = this.run;
    this.player.spriteName = this.run.characterSprite || 'player';
    for (const wid of (this.run.startWeapons || ['w_soulbolt'])) this.player.addWeapon(wid, this.world);
    this.world.player = this.player;
    this.world.players = [this.player];
    if (this.coop) this.coop.setup(this, this.player);   // build remote avatars + start broadcasting (sets world.players/inputFor)
    this.aimCamera(); camera.x = camera.targetX; camera.y = camera.targetY;

    // chests / hidden chest / in-run shop shrine
    for (const c of map.chests) this.world.addPickup('chest', c.x, c.y, 2);
    if (map.secret) this.world.addPickup('chest', map.secret.x, map.secret.y, 3, { hidden: true });
    this.shrinePos = null; this.shopOpen = false; this.nearShrine = false; this.shopFlashT = 0;
    this.anvilBuys = 0; this.gearBuys = 0; this.shopChoice = null;   // 原#4: shop is global now (B key), not shrine-gated
    if (map.shrine) this.setupShrine(map.shrine);
    this.npcs = (map.npcs || []).map((n) => ({ ...n })); this.nearNpc = null;   // E1 interactive NPCs
    // hidden rooms (隱藏房間): each map marker gets a random room type; entering pauses for a reward/choice
    this.hiddenRooms = (map.hiddenRooms || []).map((h) => ({ x: h.x, y: h.y, id: HIDDEN_ROOMS[rng.int(0, HIDDEN_ROOMS.length - 1)].id, used: false, found: false }));
    this.nearHidden = null; this.hiddenPanel = null;
    // #8: a locked vault chest (opened with a key dropped by a room guardian)
    if (map.vault) this.world.addPickup('chest', map.vault.x, map.vault.y, 3, { locked: true });
    // #8 → R17/7.1: room guardians no longer spawn at 0:00 (players grabbed a key in ~20s) —
    // each wakes at a random moment in [GUARDIAN_DELAY_MIN, MAX], announced with a banner.
    this.guardianPlan = (map.featureRooms || []).map((fr) => ({ fr, at: BALANCE.GUARDIAN_DELAY_MIN + rng.next() * (BALANCE.GUARDIAN_DELAY_MAX - BALANCE.GUARDIAN_DELAY_MIN), done: false }));
    this.interactCap = 7; this.nextInteractAt = 16; this.chestRefreshT = 30;     // 原#2: timed refresh

    // time-based threat + a rotating roster of only 1-3 active enemy types
    this.threat = 1;
    this.spawnTimer = 2.0;
    this.activeTypes = [];
    this.typeRotT = 0;
    this.rotateTypes();

    // mini-bosses: a DISTINCT boss at each of MINIBOSS_TIMES (E1/E2)
    this.boss = false; this.bossRef = null; this.bossDead = false;
    this.miniIdx = 0; this.usedMiniBosses = [];

    // special "harasser" events (mushrooms / surround ring (D2) / Higgs zoning (D3))
    this.evtMines = []; this.evtStrikes = []; this.surround = null; this.higgs = null;
    this.nextEventAt = BALANCE.SURROUND_PERIOD[0];   // first event time from config (was hardcoded 40)

    // difficulty scaling + finale (final boss -> killable Reaper, E2)
    const D = this.run.difficulty == null ? 1 : this.run.difficulty;
    this.storyMode = D <= 0;   // 6.5 劇情難度
    this.endless = this.run.mode === 'endless';   // 6.6 無盡挑戰
    this.endlessWave = 0;
    this.diffMul = this.storyMode ? BALANCE.STORY_DIFF_MUL : (1 + (D - 1) * 0.35);
    if (this.storyMode) {   // weak enemies + generous loot, almost unloseable
      this.run.dropQuality = (this.run.dropQuality || 0) + BALANCE.STORY_DROP_QUALITY;
      if (this.player) this.player.stats.luck = (this.player.stats.luck || 0) + BALANCE.STORY_LUCK_BONUS;
    }
    this.finalZone = null; this.finalBoss = false; this.finalBossRef = null;
    this.cleared = false; this.won = false; this.bigMap = false; this.buildIcons = [];
    this.reaperAt = 0; this.reaperSpawned = false; this.reaperRef = null; this.reaperSlain = false; this.banked = false;

    Music.setBiome(map.biome.id); Music.setHero(this.run.characterId);
    Music.setMode('run');
    this.banner = map.biome.name + ' · ' + (this.storyMode ? '劇情' : '難度 ' + this.run.difficulty);
    this.bannerT = 2.6;
    // G3: a brief cinematic recounting the current story chapter
    const q = STORY_QUESTS[META.questIndex || 0];
    const lore = heroLore(this.run.characterId);
    const who = (Characters.get(this.run.characterId) || {}).name || '';
    this.story = (q || lore) ? {
      title: q ? q.title : (who + (lore ? ' · ' + lore.epithet : '')),
      text: q ? q.story : (lore ? lore.lore : ''),
      quote: lore ? lore.quote : null, who, chapter: !!q,
      t: 6.5, dur: 6.5,
    } : null;
  },

  tierCapNow() { return Math.min(4, 1 + Math.floor(this.threat / 2)); },

  // choose 1-3 enemy types for the current wave window; rotates over time
  rotateTypes() {
    const pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID);
    if (!pool.length) { this.activeTypes = []; this.typeRotT = 24; return; }
    const n = this.threat <= 1 ? 2 + rng.int(0, 1) : 2 + rng.int(0, 2);   // task-11: 2-4 concurrent types for a varied swarm (was 1-3)
    const picks = []; let p = pool.slice();
    // D4: ranged (shooter) types are far less likely to be picked — favour melee
    const wt = (x) => (x.ai === 'shooter' ? (x.weight ?? 1) * BALANCE.RANGED_SPAWN_WEIGHT : (x.weight ?? 1));
    for (let i = 0; i < n && p.length; i++) { const d = rng.weighted(p, wt); picks.push(d); p = p.filter((x) => x !== d); }
    this.activeTypes = picks;
    this.typeRotT = 30 + rng.next() * 18;
    if (this.run.time > 3) { this.banner = '敵潮更替：' + picks.map((d) => d.name).join('、'); this.bannerT = 2.0; }
  },

  setupShrine(pos) { this.shrinePos = pos; this.shrineUsed = false; },
  // 3 random tier>=2 unlocked equipment defs for the 裝備鐵砧 three-pick (#3)
  rollGearChoice() {
    const pool = Equipment.all().filter((d) => (d.tier ?? 1) >= 2 && !d.exclusive && isUnlocked(META, 'equipment', d.id));
    const src = (pool.length ? pool : Equipment.all().filter((d) => !d.exclusive)).slice();
    const pick = [];
    for (let i = 0; i < 3 && src.length; i++) pick.push(src.splice(rng.int(0, src.length - 1), 1)[0]);
    // 原#18: sometimes the current hero's EXCLUSIVE weapon appears in their own anvil
    const exId = exclusiveFor(this.run.characterId);
    const exDef = exId && Equipment.get(exId);
    if (exDef && pick.length && rng.chance(0.32) && !pick.some((d) => d.id === exId)) pick[rng.int(0, pick.length - 1)] = exDef;
    return pick;
  },

  // ---- interactive NPCs (E1) ----------------------------------------------
  useNpc(n) {
    n.used = true; Sfx.play('levelup');
    if (n.kind === 'well') {
      const boons = [
        { n: '力量', f: (s) => { s.damageMult *= 1.06; } },
        { n: '迅捷', f: (s) => { s.fireRateMult *= 1.06; } },
        { n: '活力', f: (s, p) => { s.maxHp += 18; p.heal(18); } },
        { n: '疾風', f: (s) => { s.speed *= 1.05; } },
        { n: '銳利', f: (s) => { s.critChance += 0.03; } },
      ];
      const b = boons[rng.int(0, boons.length - 1)];
      try { b.f(this.player.stats, this.player); } catch (e) { /* */ }
      this.banner = `祈願水井：獲得「${b.n}」之祝福！`; this.bannerT = 2.6;
      this.world.particles.ring(n.x, n.y, P.shardL, 22, 130);
    } else if (n.kind === 'shard') {   // 原#2/#4: shard vein — a burst of soulshards
      const g = 14 + this.threat * 4;
      this.run.shards += g;
      this.banner = `魂晶礦脈：+${g} 魂晶`; this.bannerT = 2.2;
      this.world.particles.ring(n.x, n.y, P.shardL, 20, 120);
    } else if (n.kind === 'forge') {   // 原#2: travelling smith forges a free piece of gear
      const d = this.rollGearChoice()[0] || this.world.rollEquipment(2);
      if (d) { this.openEquipChoice(d); this.banner = '流浪鐵匠：免費鍛造一件裝備'; }
      else this.banner = '流浪鐵匠暫無存貨';
      this.bannerT = 2.2; this.world.particles.ring(n.x, n.y, P.emberL, 18, 110);
    } else {   // lost soul — resources
      const g = 30 + this.threat * 6;
      this.run.gold += g; this.world.gainXp(20 + this.threat * 4); this.player.heal(20);
      this.banner = `迷途之魂：+${g} 金幣・經驗・生命`; this.bannerT = 2.4;
      this.world.particles.ring(n.x, n.y, P.manaL, 18, 110);
    }
  },

  // 原#2: periodically spawn fresh interactables (and the odd chest) so the map
  // never feels empty. Capped, and kept away from the player.
  interactablesTick(dt) {
    if (this.boss || this.finalBoss || this.cleared) return;
    this.nextInteractAt = this.nextInteractAt ?? 16;
    if (this.run.time >= this.nextInteractAt) {
      if ((this.npcs || []).filter((n) => !n.used).length < (this.interactCap || 7)) this.spawnInteractable();
      this.nextInteractAt = this.run.time + 13 + rng.next() * 12;
    }
    this.chestRefreshT = (this.chestRefreshT ?? 30) - dt;
    if (this.chestRefreshT <= 0) {
      this.chestRefreshT = 26 + rng.next() * 16;
      if (this.world.pickups.filter((p) => p.type === 'chest' && !p.dead).length < 5) {
        const t = this.world.randomFloorTile(rng);
        if (dist(t.x, t.y, this.player.x, this.player.y) > 130) { this.world.addPickup('chest', t.x, t.y, 2); this.world.particles.ring(t.x, t.y, P.goldL, 12, 70); }
      }
    }
  },
  spawnInteractable(kind) {
    const kinds = ['well', 'soul', 'soul', 'shard', 'forge'];
    const k = kind || kinds[rng.int(0, kinds.length - 1)];
    let pos = null;
    for (let i = 0; i < 30; i++) { const t = this.world.randomFloorTile(rng); if (dist(t.x, t.y, this.player.x, this.player.y) > 150) { pos = t; break; } }
    if (!pos) return;
    this.npcs.push({ kind: k, x: pos.x, y: pos.y, used: false, fresh: 1.2 });
    this.world.particles.ring(pos.x, pos.y, k === 'well' ? P.shardL : k === 'forge' ? P.emberL : P.manaL, 14, 90);
  },

  // 原#4/#2: the on-map altar no longer opens the shop (B does); instead it is a
  // one-time blessing shrine that grants a small boon + soulshards.
  useShrine() {
    if (this.shrineUsed) { this.banner = '神龕已枯竭'; this.bannerT = 1.2; return; }
    this.shrineUsed = true; Sfx.play('levelup');
    const boons = [
      { n: '力量', f: (s) => { s.damageMult *= 1.07; } },
      { n: '迅捷', f: (s) => { s.fireRateMult *= 1.07; } },
      { n: '堅韌', f: (s, p) => { s.maxHp += 20; p.heal(20); } },
      { n: '銳利', f: (s) => { s.critChance += 0.04; } },
      { n: '增幅', f: (s) => { s.area = (s.area || 1) * 1.08; } },
    ];
    const b = boons[rng.int(0, boons.length - 1)];
    try { b.f(this.player.stats, this.player); } catch (e) { /* */ }
    this.run.shards += 10 + this.threat * 2;
    this.banner = `祝福神龕：獲得「${b.n}」之祝福 ＋ 魂晶`; this.bannerT = 2.6;
    this.world.particles.ring(this.shrinePos.x, this.shrinePos.y, P.shardL, 24, 140);
  },

  // ---- mini-bosses: a DISTINCT boss at 5 / 10 / 15 min (E1/E2) --------------
  miniBossTick() {
    if (this.boss || this.finalBoss || this.cleared) return;
    if (this.miniIdx >= BALANCE.MINIBOSS_TIMES.length) return;
    if (this.run.time >= BALANCE.MINIBOSS_TIMES[this.miniIdx]) { this.miniIdx++; this.spawnMiniBoss(); }
  },
  spawnMiniBoss() {
    const finalId = FINAL_BOSS[this.run.biomeId];
    // a distinct boss each time, never the level's final boss, never the Reaper
    // (bosses register with weight 0 to stay out of trash pools — don't filter on it)
    let pool = Enemies.filter((d) => d.boss && d.id !== finalId && d.id !== REAPER_ID && !this.usedMiniBosses.includes(d.id));
    if (!pool.length) pool = Enemies.filter((d) => d.boss && d.id !== finalId && d.id !== REAPER_ID);
    if (!pool.length) return;
    const def = pool[rng.int(0, pool.length - 1)];
    this.usedMiniBosses.push(def.id);
    const hpScale = (2 + this.threat * 0.4) * this.diffMul;     // tougher each time, but below the final boss
    const dmgScale = (1.2 + this.threat * 0.10) * this.diffMul;  // bal: boss bite escalates with threat (was 0.05 → late bosses were sponges)
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 170, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 170, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 10);
    this.bossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.boss = true; this.bossDead = false;
    this.banner = `小王 ${this.miniIdx}／${BALANCE.MINIBOSS_TIMES.length}：${def.name || 'BOSS'} 現身！`; this.bannerT = 3.0;
    addShake(8); Sfx.play('boss'); Music.setMode('miniboss');
  },
  onBossDead(e) {
    this.boss = false; this.bossDead = true; this.bossRef = null;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
    this.run.miniKills = (this.run.miniKills || 0) + 1;
    this.banner = '擊敗小王！'; this.bannerT = 2.6; addShake(6);
    this.world.addPickup('heart', this.player.x, this.player.y, 30);
    Music.setMode('run');
    this.openEventChoice();   // 原#3: mini-boss drops a 3-of-N event choice
  },

  // ---- mini-boss event choice (原#3): a random 3-pick of arena-style events ----
  openEventChoice() {
    const pool = EVENTS.slice(), pick = [];
    for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    if (this.coop) { if (pick.length) this.applyEvent(pick[rng.int(0, pick.length - 1)]); return; }   // co-op: auto-pick (no pausing the shared world)
    this.eventChoice = pick.length ? pick : null;
  },
  eventCardRects() {
    const S = uiScale(); const n = this.eventChoice ? this.eventChoice.length : 3;
    const cw = Math.min(212 * S, (view.W - 50 * S) / n - 16 * S); const ch = Math.min(cw * 1.62, view.H * 0.74), gap = 18 * S;   // 原#14 + R17/1.5: taller card = breathing room between portrait and text
    const totalW = n * cw + (n - 1) * gap, x0 = (view.W - totalW) / 2, y = (view.H - ch) / 2 + 6 * S;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateEventChoice() {
    const rects = this.eventCardRects(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    let pick = -1;
    rects.forEach((r, i) => { if (mouse.justDown && inside(mx, my, r)) pick = i; });
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick >= 0 && pick < this.eventChoice.length) this.applyEvent(this.eventChoice[pick]);
  },
  applyEvent(ev) {
    const prevBanner = this.banner;
    try { ev.apply(this); } catch (e) { /* */ }
    this.eventChoice = null;
    // 4.14: remember the chosen patron so the HUD can show a persistent buff indicator (hover = effect).
    (this.run.patrons = this.run.patrons || []).push({ name: ev.name, role: ev.role, title: ev.title, icon: ev.icon, desc: ev.desc });
    if (this.banner === prevBanner) { this.banner = '✦ 贊助者 ' + ev.name + ' · 「' + (ev.title || ev.name) + '」'; this.bannerT = 2.4; }   // keep a custom banner the patron set (e.g. Midas' calculated +X% damage)
    this.world.particles.ring(this.player.x, this.player.y, P.goldL, 24, 140); Sfx.play('levelup');
  },
  drawEventChoice() {
    const S = uiScale(); const rects = this.eventCardRects();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.82));
    uiText('小王戰利品 · 贊助者三選一', view.W / 2, rects[0].y - 30 * S, { size: 24 * S, align: 'center', color: P.goldL, weight: '900' });
    uiText('（點擊卡片或按 1 / 2 / 3）', view.W / 2, rects[0].y - 8 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    rects.forEach((r, i) => {
      const ev = this.eventChoice[i]; const hov = inside(mx, my, r); const oy = hov ? -8 * S : 0;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha('#241a3a', 0.98), { radius: 9 * S, stroke: hov ? P.goldL : withAlpha(P.goldL, 0.5), lw: hov ? 3 : 2 });
      uiClipRound(r.x, r.y + oy, r.w, r.h, 9 * S, () => uiRect(r.x, r.y + oy, r.w, 5 * S, P.goldL));   // #7: accent clipped to rounded corners
      // 原#14 + R17/1.5: character portrait — spacing widened (icon and text were cramped)
      const psz = 50 * S; const sp = getSprite(iconOr(ev.icon, 'ability_power'));
      uiRect(r.x + r.w / 2 - psz / 2 - 3 * S, r.y + oy + 18 * S, psz + 6 * S, psz + 6 * S, withAlpha('#10121f', 0.7), { radius: 8 * S, stroke: withAlpha(P.goldL, 0.5), lw: 1.5 });
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - psz / 2, r.y + oy + 21 * S, psz / sp.w);
      uiText(ev.role || '', r.x + r.w / 2, r.y + oy + psz + 44 * S, { size: 11 * S, align: 'center', color: P.shardL, weight: '700' });
      uiText(ev.name, r.x + r.w / 2, r.y + oy + psz + 64 * S, { size: 16 * S, align: 'center', color: '#fff', weight: '900' });
      uiText('「' + (ev.title || '') + '」', r.x + r.w / 2, r.y + oy + psz + 84 * S, { size: 12.5 * S, align: 'center', color: P.goldL, weight: '800' });
      this.wrapText(ev.desc, r.x + r.w / 2, r.y + oy + psz + 106 * S, r.w - 22 * S, 11.5 * S, P.gray4);
      uiText(String(i + 1), r.x + 11 * S, r.y + oy + 22 * S, { size: 14 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },

  // ---- timed challenge mini-quests (原#3) ----------------------------------
  grantLevelUps(n) { this.levelQueue += n; },
  allWeaponsLevelUp() { for (const inst of this.player.weapons) if (!inst.def.evolved) this.player.levelWeapon(inst, this.world); },
  sacrificeWeapon() {
    const cand = this.player.weapons.filter((w) => !w.def.equipped && !w.def.evolved);
    if (cand.length <= 1) return false;   // never leave the player weaponless
    cand.sort((a, b) => a.level - b.level);
    this.player.weapons = this.player.weapons.filter((w) => w !== cand[0]);
    return true;
  },
  startChallenge(def) {
    this.challenge = { name: def.name, t: def.dur, type: def.type, need: def.need || 0, startKills: this.run.kills, reward: def.reward };
    this.banner = '挑戰開始：' + def.name; this.bannerT = 2.0;
  },
  updateChallenge(dt) {
    const c = this.challenge; if (!c) return;
    c.t -= dt;
    if (c.type === 'kills' && this.run.kills - c.startKills >= c.need) { this.completeChallenge(); return; }
    if (c.t <= 0) { if (c.type === 'nohit') this.completeChallenge(); else this.failChallenge(); }
  },
  completeChallenge() {
    const c = this.challenge; this.challenge = null;
    try { c.reward && c.reward(this); } catch (e) { /* */ }
    this.banner = '挑戰成功：' + c.name + '！'; this.bannerT = 2.8; addShake(5); Sfx.play('levelup');
  },
  failChallenge() {
    const c = this.challenge; this.challenge = null;
    this.banner = '挑戰失敗：' + c.name; this.bannerT = 1.8;
  },
  drawChallenge() {
    const S = uiScale(); const c = this.challenge;
    const txt = c.type === 'kills'
      ? `${c.name}　${Math.min(c.need, this.run.kills - c.startKills)}/${c.need}　${Math.ceil(c.t)}s`
      : `${c.name}　保持無傷　${Math.ceil(c.t)}s`;
    uiText('⚔ ' + txt, view.W / 2, 92 * S, { size: 13 * S, align: 'center', color: P.goldL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },

  // ---- finale: final boss at 20:00 -> clear -> killable Reaper +30s (E2) ----
  finalTick(dt) {
    const t = this.run.time;
    if (this.endless) {   // 6.6: no final boss / no clear / no Reaper — recurring cross-biome boss waves; threat keeps climbing
      const wave = Math.floor(t / BALANCE.ENDLESS_BOSS_INTERVAL);
      if (wave > this.endlessWave && !this.boss) { this.endlessWave = wave; this.spawnEndlessBoss(wave); }
      return;
    }
    if (!this.finalBoss && !this.cleared && !this.boss && t >= LEVEL_TIME) this.spawnFinalBoss();   // don't spawn the finale on top of a still-living mini-boss
    if (this.cleared && !this.reaperSpawned && t >= this.reaperAt) this.spawnReaper();
  },
  spawnEndlessBoss(wave) {   // 6.6: random boss from the whole pool (cross-biome), scaling with threat
    let bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID);
    if (!bs.length) return;
    const def = bs[rng.int(0, bs.length - 1)];
    const hpScale = (4 + this.threat * 0.6) * this.diffMul;
    const dmgScale = (1.4 + this.threat * 0.10) * this.diffMul;
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 220, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 220, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 12);
    this.bossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.boss = true;
    this.banner = '⚔ 第 ' + (wave + 1) + ' 波首領 · ' + (def.name || 'BOSS'); this.bannerT = 3.0;
    addShake(8); Sfx.play('boss'); Music.setMode('boss');
  },
  spawnFinalBoss() {
    let def = Enemies.get(FINAL_BOSS[this.run.biomeId]);
    if (!def) { let bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID && !this.usedMiniBosses.includes(d.id)); if (!bs.length) bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID); def = bs.length ? bs[rng.int(0, bs.length - 1)] : null; }
    if (!def) { this.clearLevel(); return; }
    const hpScale = (4 + this.threat * 0.6) * this.diffMul;
    const dmgScale = (1.4 + this.threat * 0.10) * this.diffMul;  // bal: final boss escalates with threat (was 0.05)
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 200, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 200, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 12);
    this.finalBossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.bossRef = this.finalBossRef; this.boss = true; this.finalBoss = true;
    this.evtMines = []; this.evtStrikes = []; this.surround = null; this.higgs = null;
    this.banner = '最終首領 · ' + (def.name || 'BOSS') + ' 降臨！'; this.bannerT = 3.6;
    addShake(10); Sfx.play('boss'); Music.setMode('boss');
  },
  onBigBossDead(e) {
    this.boss = false; this.finalBoss = false; this.bossRef = null; this.finalBossRef = null;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
    this.clearLevel();
  },
  // Banks the unlock immediately, then keeps the run alive for the Reaper window.
  clearLevel() {
    if (this.cleared) return;
    this.cleared = true; this.run.cleared = true;
    const bid = this.run.biomeId || BIOMES[0].id;
    const idx = BIOMES.findIndex((b) => b.id === bid);
    META.levels = META.levels || { unlocked: 1, diff: {} };
    META.levels.diff = META.levels.diff || {};
    META.levels.diff[bid] = Math.max(META.levels.diff[bid] || 0, this.run.difficulty || 1);
    if (idx >= 0) META.levels.unlocked = Math.max(META.levels.unlocked || 1, Math.min(BIOMES.length, idx + 2));
    this.run.gold += 220 + (this.run.difficulty || 1) * 160 + this.threat * 18;
    saveMeta();   // persist the unlock at once, so leaving/dying after this keeps it
    this.reaperAt = this.run.time + BALANCE.REAPER_DELAY;
    if (this.player) this.player.invuln = Math.max(this.player.invuln || 0, BALANCE.REAPER_GRACE);   // 10.9: brief grace so a boss death-blast / lingering AoE can't false-trigger game over right as you win
    this.banner = '關卡通關！死神將在 ' + BALANCE.REAPER_DELAY + ' 秒後降臨 — 按 E 離場，或留下迎戰'; this.bannerT = 5.0;
    this.world.addPickup('heart', this.player.x, this.player.y, 60);
    addShake(8); Sfx.play('levelup'); Music.setMode('run');
  },
  spawnReaper() {
    this.reaperSpawned = true;
    const def = Enemies.get(REAPER_ID);
    if (!def) return;
    const hpScale = (BALANCE.REAPER_HP_BASE + this.threat * BALANCE.REAPER_HP_PER_THREAT) * this.diffMul;
    const dmgScale = (BALANCE.REAPER_DMG_BASE + this.threat * BALANCE.REAPER_DMG_PER_THREAT) * this.diffMul;
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 220, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 220, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 12);
    this.reaperRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.bossRef = this.reaperRef; this.boss = true;
    this.banner = '☠ 死神降臨！斬殺祂以證明你的力量'; this.bannerT = 4.0;
    addShake(12); Sfx.play('boss'); Music.setMode('reaper');
  },
  onReaperDead(e) {
    this.boss = false; this.reaperRef = null; this.reaperSlain = true;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
    this.run.reaperKills = (this.run.reaperKills || 0) + 1;
    this.run.gold += 600 + (this.run.difficulty || 1) * 200;
    this.run.shards += 30;
    this.banner = '★ 死神已被斬殺！傳說自此誕生'; this.bannerT = 4.0;
    this.finishRun(true);
  },
  // Single place that ends the run + banks (guarded so it never double-banks).
  finishRun(won) {
    if (this.dead) return;
    this.won = won; this.dead = true; this.deathT = 0;
    this.run.score = Math.floor(this.run.kills * 12 + this.run.stage * 400 + this.run.time + (this.run.difficulty || 1) * 600 + (this.reaperSlain ? 5000 : 0));
    META.stats.bestStage = Math.max(META.stats.bestStage || 0, this.run.stage);
    META.stats.bestScore = Math.max(META.stats.bestScore || 0, this.run.score);
    if (won) { addShake(8); Sfx.play('levelup'); Music.setMode('victory'); } else { Music.setMode('death'); }
    if (this.coop) this.run.coopSize = this.coop.size();   // record party size on the leaderboard upload
    if (!this.banked) {
      this.banked = true;
      const r = bankRun(this.run) || {};
      this.newlyUnlocked = r.newAchievements || [];      // 原#1 results screen
      this.newCharacters = r.newCharacters || [];
    }
    if (this.coop) { try { this.coop.end({ won, score: this.run.score }); } catch (e) { /* */ } try { RT.leaveRoom(); } catch (e) { /* */ } this.coop = null; }   // tell guests the run ended, release the room (guests get room:closed), stop broadcasting
  },

  // safety net: if a co-op run scene is torn down without going through finishRun/abandon,
  // still dispose the host handle + release the room. No-op for single-player (this.coop null).
  exit() {
    if (this.coop) { try { this.coop.dispose(); } catch (e) { /* */ } try { RT.leaveRoom(); } catch (e) { /* */ } this.coop = null; }
  },

  // opening-softener factor at the current time (mirrors spawnTick) — events use it too
  earlyDmgGrace() { const t = this.run.time; return t < BALANCE.EARLY_GRACE ? BALANCE.EARLY_DMG_GRACE + (1 - BALANCE.EARLY_DMG_GRACE) * (t / BALANCE.EARLY_GRACE) : 1; },
  // ---- special harasser events: mushrooms / surround ring (D2) / Higgs (D3) -
  eventsTick() {
    if (this.boss || this.finalBoss || this.cleared) return;
    if (this.run.time >= this.nextEventAt) {
      this.triggerEvent();
      const [evBase, evRand] = BALANCE.SURROUND_PERIOD;   // wire the (previously dead) config
      this.nextEventAt = this.run.time + (evBase + rng.next() * evRand) * BALANCE.SPECIAL_EVENT_FREQ_MULT;
    }
  },
  triggerEvent() {
    const r = rng.next();
    if (r < 0.4) this.evMushrooms();
    else if (r < 0.74) this.evHiggs();
    else this.evSurround();
  },
  evMushrooms() {
    const n = 5 + Math.floor(this.threat / 2);
    for (let i = 0; i < n; i++) {
      const a = rng.next() * TAU, r = 28 + rng.next() * 132;
      const x = clamp(this.player.x + Math.cos(a) * r, TS * 2, this.world.pxW - TS * 2);
      const y = clamp(this.player.y + Math.sin(a) * r, TS * 2, this.world.pxH - TS * 2);
      if (this.world.solidAt(x, y)) continue;
      this.evtMines.push({ x, y, arm: 0.9, life: 9, r: 34, dmg: 16 + Math.min(this.threat, 10) * 2, pulse: rng.next() * TAU });
    }
    this.banner = '提摩的蘑菇地雷！小心腳下'; this.bannerT = 2.6; Sfx.play('boss');
  },
  // D2 (task-4): a ring of monsters rings the player and actively closes in. You
  // are NOT held until the whole ring dies — carve a gap (kill SURROUND_BREACH_KILLS)
  // or back into a wall to break out.
  evSurround() {
    if (this.surround) return;
    let pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID && (d.ai === 'chase' || d.ai === 'charger' || d.ai === 'wander'));
    if (!pool.length) pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID);
    if (!pool.length) return;
    const def = pool[rng.int(0, pool.length - 1)];
    const n = BALANCE.SURROUND_COUNT_BASE + Math.floor(this.threat * 0.5);
    const hpScale = BALANCE.SURROUND_HP_MULT * (1 + this.threat * 0.1) * this.diffMul;
    const dmgScale = BALANCE.SURROUND_DMG_MULT * this.diffMul * this.earlyDmgGrace();   // honour the opening softener
    const cx = this.player.x, cy = this.player.y;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng.next() * 0.1;
      const x = clamp(cx + Math.cos(a) * BALANCE.SURROUND_RADIUS, TS * 2, this.world.pxW - TS * 2);
      const y = clamp(cy + Math.sin(a) * BALANCE.SURROUND_RADIUS, TS * 2, this.world.pxH - TS * 2);
      if (this.world.solidAt(x, y)) continue;
      // tanky chasers that close the net — but killable enough to punch a hole through
      const e = this.world.spawnEnemy(def, x, y, { hpScale, dmgScale, speedScale: BALANCE.SURROUND_SPEED_MULT, quiet: true });
      if (e) { e.tint = P.purpleL; e.surround = true; ring.push(e); }
    }
    const breachNeed = Math.min(BALANCE.SURROUND_BREACH_KILLS, ring.length);   // never require more kills than actually spawned (some ring slots land on walls)
    this.surround = { enemies: ring, t: BALANCE.SURROUND_LIFE, cx, cy, lockR: BALANCE.SURROUND_RADIUS + 48, total: ring.length, breachNeed, breached: false, wasWall: false };
    this.banner = '魂牢降臨！怪群收攏包圍 — 殺出缺口（×' + breachNeed + '）或貼牆突圍！'; this.bannerT = 3.6; Sfx.play('boss'); addShake(6);
  },
  // D3: the Higgs bomb now LINGERS — it lobs delayed blasts every couple seconds
  // to zone the player, instead of one big burst.
  evHiggs() {
    if (this.higgs) return;
    this.higgs = { t: BALANCE.HIGGS_DURATION, next: 0.2 };
    this.banner = '希格斯的炸彈雨！持續轟炸卡位'; this.bannerT = 2.8; Sfx.play('boss'); addShake(4);
  },
  eventExplode(x, y, r, dmg) {
    this.world.spawnExplosion(x, y, r, P.ember, dmg * 0.7, { knockback: 80 });
    const p = this.player;
    if (p && !p.dead && dist(p.x, p.y, x, y) < r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - y, p.x - x), this.world);
  },
  updateEvents(dt) {
    for (let i = this.evtMines.length - 1; i >= 0; i--) {
      const m = this.evtMines[i]; m.arm -= dt; m.life -= dt; m.pulse += dt * 6;
      let go = m.life <= 0;
      if (m.arm <= 0 && !go && dist(this.player.x, this.player.y, m.x, m.y) < 16) go = true;
      if (go) { this.eventExplode(m.x, m.y, m.r, m.dmg); this.evtMines.splice(i, 1); }
    }
    if (this.higgs) {
      this.higgs.t -= dt; this.higgs.next -= dt;
      if (this.higgs.next <= 0 && this.higgs.t > 0) {
        this.higgs.next = BALANCE.HIGGS_INTERVAL;
        const k = 1 + (rng.chance(0.5) ? 1 : 0);
        for (let j = 0; j < k; j++) {
          const a = rng.next() * TAU, r = rng.next() * 72;
          const x = clamp(this.player.x + Math.cos(a) * r, TS * 2, this.world.pxW - TS * 2);
          const y = clamp(this.player.y + Math.sin(a) * r, TS * 2, this.world.pxH - TS * 2);
          this.evtStrikes.push({ x, y, t: 1.0, max: 1.0, r: BALANCE.HIGGS_RADIUS, dmg: (BALANCE.HIGGS_DMG + Math.min(this.threat, 12)) * this.earlyDmgGrace() });
        }
      }
      if (this.higgs.t <= 0) this.higgs = null;
    }
    if (this.surround) {
      const sur = this.surround;
      sur.t -= dt;
      sur.enemies = sur.enemies.filter((e) => e && !e.dead);
      const killed = sur.total - sur.enemies.length;
      const p = this.player, sx = sur.cx, sy = sur.cy;
      // task-4 breach: carved a gap (killed >= breach) OR pressed into a wall (撞牆) for ~0.6s
      let wall = false;
      for (const o of SURROUND_PROBES) if (this.world.solidAt(p.x + o[0], p.y + o[1])) { wall = true; break; }
      sur.wallT = wall ? (sur.wallT || 0) + dt : 0;   // bal: require a SUSTAINED wall-press, not a 1-frame brush
      const wallBreach = sur.wallT >= 0.6;
      if (killed >= sur.breachNeed || wallBreach) { sur.breached = true; sur.wasWall = sur.wasWall || wallBreach; }
      // the ring tightens — the lock radius creeps inward so the circle visibly collapses
      sur.lockR = Math.max(BALANCE.SURROUND_LOCK_MIN, sur.lockR - BALANCE.SURROUND_CLOSE_SPEED * dt);
      // hold the player in the kill-zone until they breach (or the ring empties / times out)
      if (BALANCE.SURROUND_MUST_CLEAR && sur.enemies.length >= 2 && !sur.breached) {
        const dx = p.x - sx, dy = p.y - sy, d = Math.hypot(dx, dy);
        if (d > sur.lockR) {
          const k = sur.lockR / d;   // pull the player back inside the ring — via moveActor so they can't be shoved INTO a wall (player doesn't phase walls)
          this.world.moveActor(p, (sx + dx * k) - p.x, (sy + dy * k) - p.y); p.vx *= -0.3; p.vy *= -0.3;
          if (Math.random() < 0.16) this.world.particles.text(p.x, p.y - 16, '殺出缺口！', { color: P.purpleL, size: 10 });
        }
      }
      if (sur.t <= 0 || !sur.enemies.length || sur.breached) {
        if (sur.breached && sur.enemies.length) { this.banner = sur.wasWall ? '貼牆突圍！' : '殺出缺口，突破魂牢！'; this.bannerT = 2.2; }
        else if (!sur.enemies.length && sur.total) { this.banner = '魂牢清空！'; this.bannerT = 2.2; }
        this.surround = null;
      }
    }
    for (let i = this.evtStrikes.length - 1; i >= 0; i--) {
      const s = this.evtStrikes[i]; s.t -= dt;
      if (s.t <= 0) { this.eventExplode(s.x, s.y, s.r, s.dmg); this.evtStrikes.splice(i, 1); }
    }
  },
  drawEvents() {
    for (const m of this.evtMines) {
      const armed = m.arm <= 0;
      glowWorld(m.x, m.y, armed ? 8 : 5, armed ? P.red : P.toxic, 0.3 + (armed ? 0.25 * (0.5 + 0.5 * Math.sin(m.pulse)) : 0));
      fillCircleWorld(m.x, m.y, 3.5, P.toxic); fillCircleWorld(m.x, m.y - 1, 2.3, P.redL);
      if (armed) strokeCircleWorld(m.x, m.y, m.r, withAlpha(P.red, 0.22), 1.5);
    }
    if (this.surround && this.surround.enemies.length) {
      const sr = this.surround.lockR;
      strokeCircleWorld(this.surround.cx, this.surround.cy, sr, withAlpha(P.purpleL, 0.16 + 0.1 * Math.sin(this.t * 4)), 2.5);
      strokeCircleWorld(this.surround.cx, this.surround.cy, sr - 3, withAlpha(P.purpleL, 0.08), 1);
      const ns = worldToScreen(this.surround.cx, this.surround.cy - sr - 6);
      const need = Math.max(0, (this.surround.breachNeed || BALANCE.SURROUND_BREACH_KILLS) - (this.surround.total - this.surround.enemies.length));
      const msg = need > 0 ? ('魂牢 · 殺出缺口還需 ×' + need + '（或貼牆）') : '魂牢 · 缺口已開，快突圍！';
      uiText(msg, ns.x, ns.y, { size: 11 * uiScale(), align: 'center', color: P.purpleL, weight: '800' });
    }
    for (const s of this.evtStrikes) {
      const k = 1 - clamp(s.t / s.max, 0, 1);
      strokeCircleWorld(s.x, s.y, s.r, withAlpha(P.redL, 0.4 + 0.4 * k), 2);
      fillCircleWorld(s.x, s.y, s.r * k, withAlpha(P.ember, 0.12));
    }
  },

  // continuous spawning from the current 1-3 active enemy types
  spawnTick(dt) {
    if (this.boss || this.finalBoss || this.cleared) return;   // pause the swarm during a boss / the finale / the post-clear Reaper window
    this.typeRotT -= dt;
    if (this.typeRotT <= 0) this.rotateTypes();
    this.spawnTimer -= dt;
    const t = this.run.time;
    // gentler early cap that ramps with threat + time, so a fresh build has room to
    // level up before the swarm overwhelms it (the late game still gets dense).
    // 原#3 + sim easing: soften the opening so a fresh build can get going
    const grace = t < BALANCE.EARLY_GRACE ? 0.45 + 0.55 * (t / BALANCE.EARLY_GRACE) : 1;
    const cap = Math.round(Math.min(BALANCE.SPAWN_CAP_MAX, (BALANCE.SPAWN_CAP_BASE + this.threat * BALANCE.SPAWN_CAP_PER_THREAT + Math.floor(t * 0.11)) * grace));
    if (this.spawnTimer <= 0 && this.world.enemies.length < cap && this.activeTypes.length) {
      const group = 2 + Math.floor((this.threat / 1.5) * grace);   // task-11: bigger spawn groups → swarm pressure
      // enemy hp/dmg grow with threat + time but the growth is CAPPED (no infinite pile-up);
      // difficulty multiplies on top of the capped growth.
      const tc = Math.min(t, 1200);
      const dmgGrace = t < BALANCE.EARLY_GRACE ? BALANCE.EARLY_DMG_GRACE + (1 - BALANCE.EARLY_DMG_GRACE) * (t / BALANCE.EARLY_GRACE) : 1;
      const hpScale = (1 + Math.min(4.4, (this.threat - 1) * 0.15 + tc * 0.0028)) * this.diffMul;
      const dmgScale = (1 + Math.min(3.0, (this.threat - 1) * 0.10 + tc * 0.0022)) * this.diffMul * dmgGrace;  // bal: late trash keeps scaling (was min 2.2 / 0.08 / 0.0018)
      for (let i = 0; i < group; i++) {
        const def = this.pickSpawnType();
        const elite = this.threat >= 3 && rng.chance(0.03 + t * 0.0003);
        this.world.spawnRing(def, { hpScale, dmgScale, elite });
      }
      this.spawnTimer = Math.max(BALANCE.SPAWN_INTERVAL_MIN, (BALANCE.SPAWN_INTERVAL_BASE - this.threat * 0.06 - t * 0.004) / grace);
    }
  },
  // mostly the active roster, but occasionally inject a "special" (s_*) monster (D3)
  pickSpawnType() {
    if (rng.chance(0.12)) {
      const sp = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && /^s_/.test(d.id));
      if (sp.length) return sp[rng.int(0, sp.length - 1)];
    }
    return this.activeTypes[rng.int(0, this.activeTypes.length - 1)];
  },

  // ---- choices -------------------------------------------------------------
  onLevelUp() { this.levelQueue++; },
  openChoice() {
    const options = getRunChoices(this.run, this.player);
    this.levelQueue--;
    if (!options.length) {   // fully capped — don't waste the level-up, grant a heal
      this.player.heal(this.player.maxHp * 0.15);
      this.world.particles.text(this.player.x, this.player.y - 16, '已達上限 · 回復生命', { color: P.redL, size: 12 });
      return;
    }
    this.choice = { options, hover: -1, bondHints: options.map((c) => this.bondHintsFor(c)) };   // 8.2: cache hints once (world is paused while choosing → build is frozen)
    this.peekBuild = false;   // 4.19: start showing the cards, not the build peek
  },
  cardRects() {
    const S = uiScale(); const n = this.choice ? this.choice.options.length : 3;
    const cw = Math.min(190 * S, (view.W - 40 * S) / n - 18 * S); const ch = cw * 1.45; const gap = 18 * S;
    const totalW = n * cw + (n - 1) * gap; const x0 = (view.W - totalW) / 2; const y = (view.H - ch) / 2 + 8 * S;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateChoice() {
    if (pressed('build')) { this.peekBuild = !this.peekBuild; Sfx.play('uiClick'); return; }   // 4.19: TAB peeks the build
    if (this.peekBuild) return;   // viewing the build panel — ignore card input until TAB back
    const rects = this.cardRects(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    this.choice.hover = -1;
    rects.forEach((r, i) => { if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) this.choice.hover = i; });
    let pick = -1;
    if (mouse.justDown && this.choice.hover >= 0) pick = this.choice.hover;
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick >= 0 && pick < this.choice.options.length) {
      const c = this.choice.options[pick];
      applyChoice(this.run, this.player, this.world, c);
      this.world.particles.ring(this.player.x, this.player.y, P.manaL, 18, 100);
      this.banner = c.def.name; this.bannerT = 1.4; Sfx.play('levelup');
      this.choice = null; this.peekBuild = false;
    }
  },

  // ---- equipment before/after diff (原#1) ----------------------------------
  // Rows of [label, before, after, fmt] showing how swapping in `def` changes stats.
  equipDiffRows(def) {
    if (!def) return [];
    const cur = this.player.stats;
    if (def.slot === 'weapon') {   // signature weapon: compare the weapon stat block
      const curId = this.run.equipment && this.run.equipment.weapon;
      const cw = (curId && Equipment.get(curId) && Equipment.get(curId).weapon) || null;
      const nw = def.weapon || {};
      const rows = [
        ['傷害', cw ? cw.damage || 0 : 0, nw.damage || 0, 'int'],
        ['射速', cw ? cw.fireRate || 0 : 0, nw.fireRate || 0, 'f1'],
        ['投射物', cw ? cw.projCount || 1 : 0, nw.projCount || 1, 'int'],
        ['穿透', cw ? cw.pierce || 0 : 0, nw.pierce || 0, 'int'],
      ];
      return rows.filter((r) => Math.abs(r[2] - r[1]) > 1e-9);
    }
    // armor / trinket: trial = current stats, undo current slot item, apply candidate
    const slot = def.slot;
    const curDelta = (this.run.equipDelta && this.run.equipDelta[slot]) || {};
    const trial = { ...cur };
    for (const f in curDelta) trial[f] = (trial[f] || 0) - curDelta[f];
    const fakeP = { stats: trial, hp: this.player.hp, heal() {} };
    try { def.apply?.(fakeP); } catch (e) { /* */ }
    const rows = [];
    for (const [f, lab, fmt] of STAT_LABELS) { const b = cur[f] || 0, a = trial[f] || 0; if (Math.abs(a - b) > 1e-9) rows.push([lab, b, a, fmt]); }
    return rows;
  },
  // Draw a compact before→after table. Returns the height consumed.
  drawEquipDiff(x, y, w, def, S, opts = {}) {
    const rows = this.equipDiffRows(def);
    const title = opts.title !== undefined ? opts.title : '替換後變化';
    if (title) uiText(title, x, y, { size: 11 * S, color: P.gray3, weight: '700' });
    let yy = y + (title ? 15 * S : 0);
    if (!rows.length) { uiText('（無屬性變化）', x, yy, { size: 10 * S, color: P.gray2 }); return yy + 12 * S - y; }
    for (const [lab, b, a, fmt] of rows.slice(0, opts.max || 8)) {
      const up = a > b; const col = up ? P.greenL : P.redL;
      uiText(lab, x, yy, { size: 10.5 * S, color: P.gray4 });
      uiText(fmtStat(b, fmt), x + (opts.lw || 92 * S), yy, { size: 10.5 * S, align: 'right', color: P.gray3 });
      uiText('→', x + (opts.lw || 92 * S) + 8 * S, yy, { size: 10 * S, color: P.gray3 });
      uiText(fmtStat(a, fmt), x + (opts.lw || 92 * S) + 56 * S, yy, { size: 10.5 * S, align: 'right', color: col, weight: '800' });
      yy += 13.5 * S;
    }
    return yy - y;
  },

  // ---- equip-pickup menu (B1): paused; equip (replace its slot) or discard ----
  openEquipChoice(def) {
    if (!def) return;
    if (this.equipChoice) { this.equipQueue.push(def); return; }
    this.equipChoice = { def }; Sfx.play('uiClick');
  },
  equipChoiceLayout() {
    const S = uiScale();
    const w = Math.min(view.W * 0.82, 470 * S), h = 396 * S;   // 原#1: taller to fit the before/after diff
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const bw = (w - 60 * S) / 2, by = y + h - 54 * S;
    return { S, x, y, w, h, equip: { x: x + 20 * S, y: by, w: bw, h: 40 * S }, discard: { x: x + w - 20 * S - bw, y: by, w: bw, h: 40 * S } };
  },
  updateEquipChoice() {
    const L = this.equipChoiceLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (pressed('space') || pressed('enter')) { this.resolveEquip(true); return; }
    if (pressed('escape')) { this.resolveEquip(false); return; }
    if (mouse.justDown) {
      if (inside(mx, my, L.equip)) this.resolveEquip(true);
      else if (inside(mx, my, L.discard)) this.resolveEquip(false);
    }
  },
  resolveEquip(take) {
    const def = this.equipChoice && this.equipChoice.def;
    if (take && def) { equipItem(this.player, this.run, def); Sfx.play('equip'); this.banner = '已裝備：' + def.name; this.bannerT = 1.6; }
    else Sfx.play('uiClick');
    this.equipChoice = this.equipQueue.length ? { def: this.equipQueue.shift() } : null;
  },
  drawEquipChoice() {
    const L = this.equipChoiceLayout(); const S = L.S; const def = this.equipChoice.def;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.78));
    uiRect(L.x, L.y, L.w, L.h, withAlpha('#161a30', 0.99), { radius: 10 * S, stroke: P.goldL, lw: 2 });
    uiText('撿到裝備', L.x + L.w / 2, L.y + 26 * S, { size: 18 * S, align: 'center', color: '#fff', weight: '900' });
    const sp = getSprite(iconOr(def.icon, 'equip_leather_armor'));
    drawSpriteUI(sp.frames[0], L.x + L.w / 2 - 16 * S, L.y + 38 * S, (32 * S) / sp.w);
    const slotName = def.slot === 'weapon' ? '專武' : def.slot === 'armor' ? '護甲' : '飾品';
    uiText(def.name + '　·　' + slotName, L.x + L.w / 2, L.y + 88 * S, { size: 14 * S, align: 'center', color: RARITY[rarityOf(def)].accent, weight: '800' });   // R17/5.1
    this.wrapText(def.desc || '', L.x + L.w / 2, L.y + 106 * S, L.w - 44 * S, 11 * S, P.gray4);
    // current equipment by category (依類別分區)
    const eq = this.run.equipment || {};
    const slots = [['weapon', '專武'], ['armor', '護甲'], ['trinket', '飾品']];
    const cellW = (L.w - 60 * S) / 3, sy = L.y + 150 * S;
    slots.forEach(([slot, label], i) => {
      const cx = L.x + 24 * S + i * (cellW + 6 * S); const cur = eq[slot] && Equipment.get(eq[slot]); const isTarget = def.slot === slot;
      uiRect(cx, sy, cellW, 52 * S, withAlpha('#10121f', 0.85), { radius: 6 * S, stroke: isTarget ? P.goldL : P.ink2, lw: isTarget ? 2 : 1 });
      uiText(label + (isTarget ? ' ◀' : ''), cx + cellW / 2, sy + 13 * S, { size: 10 * S, align: 'center', color: isTarget ? P.goldL : P.gray3, weight: '700' });
      if (cur) { const csp = getSprite(iconOr(cur.icon, 'equip_leather_armor')); drawSpriteUI(csp.frames[0], cx + cellW / 2 - 11 * S, sy + 20 * S, (22 * S) / csp.w); }
      else uiText('（空）', cx + cellW / 2, sy + 36 * S, { size: 10 * S, align: 'center', color: P.gray2 });
    });
    // 原#1: before/after stat comparison vs the item currently in this slot
    this.drawEquipDiff(L.x + 24 * S, sy + 66 * S, L.w - 48 * S, def, S, { lw: 150 * S });
    const btn = (r, label, col) => { const hov = inside(mx, my, r); uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? col : P.ink2, lw: hov ? 3 : 2 }); uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' }); };
    btn(L.equip, eq[def.slot] ? '替換並裝備' : '裝備到空格', P.goldL);
    btn(L.discard, '放棄', P.redL);
    uiText('空白鍵裝備　·　Esc 放棄', L.x + L.w / 2, L.y + L.h - 8 * S, { size: 10 * S, align: 'center', color: P.gray3 });
  },

  // ---- death --------------------------------------------------------------
  // If the level was already cleared, dying still shows the victory (banked once).
  onDeath() { this.finishRun(this.cleared); },

  // ---- pause ---------------------------------------------------------------
  pauseLayout() {
    const S = uiScale();
    const w = 240 * S, h = 46 * S, gap = 14 * S;
    const x = view.W / 2 - w / 2, y0 = view.H / 2 - (h * 4 + gap * 3) / 2;   // R17/10.1: 4 buttons
    return { S, resume: { x, y: y0, w, h }, settings: { x, y: y0 + (h + gap), w, h }, guide: { x, y: y0 + (h + gap) * 2, w, h }, quit: { x, y: y0 + (h + gap) * 3, w, h } };
  },
  updatePause() {
    const L = this.pauseLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (pressed('pause') || pressed('escape')) { if (this.confirmQuit) { this.confirmQuit = false; return; } this.paused = false; return; }
    if (!mouse.justDown) return;
    if (this.confirmQuit) {   // 4.8: confirm before abandoning the run
      if (inside(mx, my, L.resume)) { this.abandon(); }                                   // 確定放棄
      else if (inside(mx, my, L.quit)) { this.confirmQuit = false; Sfx.play('uiClick'); }  // 取消
      return;
    }
    if (inside(mx, my, L.resume)) { this.paused = false; Sfx.play('uiClick'); }
    else if (inside(mx, my, L.settings)) settingsUI.show(null, { returnHub: () => this.abandon() });   // settings menu also offers 返回大廳 in-run
    else if (inside(mx, my, L.guide)) { this.paused = false; this.hudTut = true; this._hudTutShown = true; Sfx.play('uiClick'); }   // R17/10.1: replay介面一覽
    else if (inside(mx, my, L.quit)) { this.confirmQuit = true; Sfx.play('uiClick'); }   // 4.8: ask first
  },
  abandon() {
    this.run.score = Math.floor(this.run.kills * 12 + this.run.stage * 400 + this.run.time);
    Music.stop(); Sfx.play('portal');
    if (this.coop) { try { this.coop.dispose(); } catch (e) { /* */ } RT.leaveRoom(); this.coop = null; }   // host leaving closes the room for guests
    if (!this.dead && !this.banked) { this.banked = true; bankRun(this.run); }   // bank at most once (bankRun already applies bestStage/bestScore)
    setScene(refs.hub, {});
  },
  // ---- R17/1.7: post-clear leave confirm ------------------------------------
  // After the final boss dies, E anywhere used to finishRun(true) instantly — players trying to
  // reach the shrine (or fight the Reaper) got yanked to the results screen. Single-player only.
  leaveConfirmLayout() {
    const S = uiScale(); const w = 190 * S, h = 44 * S, gap = 18 * S;
    const y = view.H / 2 + 12 * S;
    return { S, yes: { x: view.W / 2 - w - gap / 2, y, w, h }, no: { x: view.W / 2 + gap / 2, y, w, h } };
  },
  updateLeaveConfirm() {
    const L = this.leaveConfirmLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (pressed('escape') || pressed('pause')) { this.leaveConfirm = false; Sfx.play('uiClick'); return; }
    if (pressed('interact') || pressed('enter')) { this.leaveConfirm = false; this.finishRun(true); return; }   // a fresh E confirms (E,E = quick leave)
    if (!mouse.justDown) return;
    if (inside(mx, my, L.yes)) { this.leaveConfirm = false; this.finishRun(true); }
    else if (inside(mx, my, L.no)) { this.leaveConfirm = false; Sfx.play('uiClick'); }
    else { this.leaveConfirm = false; Sfx.play('uiClick'); }   // click outside = cancel
  },
  drawLeaveConfirm() {
    const S = uiScale(); const L = this.leaveConfirmLayout();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.7));
    uiText('離開戰場並結算勝利？', view.W / 2, view.H / 2 - 54 * S, { size: 26 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('死神仍會降臨——留下迎戰可得傳說獎勵', view.W / 2, view.H / 2 - 26 * S, { size: 13 * S, align: 'center', color: P.gray3 });
    const btn = (r, label, col) => { const hov = inside(mx, my, r); uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? col : P.ink2, lw: hov ? 3 : 2 }); uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' }); };
    btn(L.yes, '確定離場', P.greenL);
    btn(L.no, '繼續戰鬥', P.goldL);
    uiText('E / Enter 確定　·　Esc / 點擊外部 取消', view.W / 2, L.yes.y + L.yes.h + 24 * S, { size: 10.5 * S, align: 'center', color: P.gray3 });
  },

  drawPause() {
    const S = uiScale(); const L = this.pauseLayout();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.7));
    const btn = (r, label, col) => {
      const hov = inside(mx, my, r);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? (col || P.shardL) : P.ink2, lw: hov ? 3 : 2 });
      uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
    };
    if (this.confirmQuit) {   // 4.8: abandon confirmation
      uiText('確定放棄本局？', view.W / 2, L.resume.y - 40 * S, { size: 24 * S, align: 'center', color: '#fff', weight: '900' });
      uiText('本局進度將結算後返回城鎮', view.W / 2, L.resume.y - 14 * S, { size: 12 * S, align: 'center', color: P.gray3 });
      btn(L.resume, '確定放棄', P.redL);
      btn(L.quit, '取消');
      return;
    }
    uiText('暫 停', view.W / 2, L.resume.y - 36 * S, { size: 30 * S, align: 'center', color: '#fff', weight: '900' });
    btn(L.resume, '繼 續');
    btn(L.settings, '設 定');
    btn(L.guide, '📖 介面一覽');   // R17/10.1: re-show the HUD walkthrough any time
    btn(L.quit, '放棄並返回城鎮', P.redL);
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (Cheats.toast > 0) Cheats.toast -= dt;
    if (Cheats.enabled) this.cheatInput();           // F2 dev panel clicks
    if (settingsUI.open) { settingsUI.update(); return; }
    if (this.dead) {
      this.deathT += dt; this.world.particles.update(dt);
      if (this.deathT > 0.8 && (pressed('space') || pressed('enter') || mouse.justDown)) setScene(refs.hub, {});
      return;
    }
    if (this.paused) { this.updatePause(); return; }
    if (this.leaveConfirm) { this.updateLeaveConfirm(); return; }   // R17/1.7: post-clear leave needs a confirm
    if (this.hudTut) { this.updateHudTut(); return; }   // 6.3A first-run HUD walkthrough pauses the field
    if (this.hiddenPanel) { this.updateHidden(dt); return; }   // a hidden room pauses the run for its choice
    if (this.choice) { this.updateChoice(); return; }
    if (this.equipChoice) { this.updateEquipChoice(); return; }   // B1 equip menu pauses the field
    if (this.eventChoice) { this.updateEventChoice(); return; }   // 原#3 mini-boss event pauses the field
    if (this.coop) {
      // online co-op can't freeze the SHARED world: Esc opens a non-blocking leave menu,
      // Tab build-review / minimap are view-only overlays, the in-run shop is disabled.
      if (pressed('pause') || pressed('escape')) { this.coopMenu = !this.coopMenu; Sfx.play('uiClick'); }
      if (this.coopMenu && this.updateCoopMenu()) return;        // returns true only if we left the run
      if (this.coopPick) this.updateCoopPick(dt);                // non-blocking level-up pick (world keeps running)
      if (pressed('build')) { this.showBuild = !this.showBuild; Sfx.play('uiClick'); }
      if (pressed('minimap')) { this.bigMap = !this.bigMap; Sfx.play('uiClick'); }
    } else {
      if (pressed('pause') || (pressed('escape') && !this.shopOpen)) { this.paused = true; this.confirmQuit = false; Sfx.play('uiClick'); return; }   // when the shop is open, Esc backs out of it (handled below) rather than opening pause over it
      if (pressed('build')) { this.showBuild = !this.showBuild; Sfx.play('uiClick'); }
      if (pressed('minimap')) { this.bigMap = !this.bigMap; Sfx.play('uiClick'); }
      if (pressed('shop') && !this.shopChoice) {                          // 原#4: B opens the soulshard / anvil shop anywhere
        if (Cheats.eatShop) Cheats.eatShop = false;                       // task 1: this B is part of the Konami code — don't pop the shop
        else { this.shopOpen = !this.shopOpen; Sfx.play('uiClick'); }
      }
      if (this.showBuild) return;   // freeze the field while reviewing your build
      if (this.shopOpen) { this.updateShopPanel(); return; }   // modal shop also freezes the field
    }

    if (Cheats.enabled && Cheats.fast) dt *= 3;   // F2 time-warp
    this.run.time += dt;
    // 6.3A: 2s into the FIRST battle (after any intro), pause once for a HUD walkthrough.
    if (!META.tutorialHUDDone && !this._hudTutShown && !this.coop && !this.story && this.run.time >= 2) { this.hudTut = true; this._hudTutShown = true; return; }
    this.tickBattleHints(dt);   // 6.2 first-battle combat hints
    this.threat = 1 + Math.floor(this.run.time / BALANCE.THREAT_PERIOD);   // ~1 -> 13 over the 20-min level
    // report-cap stage at the threat ceiling (threat keeps climbing past 20:00 during the Reaper window;
    // an uncapped stage would trip the server's anti-cheat plausibility gate on legit clear+reaper runs)
    this.run.stage = Math.min(this.threat, BALANCE.THREAT_CEIL); this.run.floor = this.threat;   // keep loot/score scaling alive
    this.world.threat = this.threat;   // hazards read this to scale (capped)
    // screen shake stays gentle by default, swelling only when near death
    const hpFrac = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    setShakeScale(hpFrac < 0.25 ? 1.0 : 0.42);
    this.world.update(dt);
    // R17/1.4: a key pickup was just small floating text and easy to miss — surface it as a banner.
    // Increase-only detection: opening the vault DECREMENTS world.keys and must not retrigger.
    const wk = this.world.keys | 0;
    if (wk > (this._lastKeys | 0)) { this.banner = '🔑 獲得鑰匙！可開啟封鎖的寶庫寶箱'; this.bannerT = 3.2; Sfx.play('levelup'); }
    this._lastKeys = wk;
    if (Cheats.enabled && Cheats.godmode && this.player) this.player.hp = this.player.maxHp;   // F2 invincibility
    this.aimCamera();
    if (this.bannerT > 0) this.bannerT -= dt;
    // 4.7: the 空白 used to launch from the hub carried into the run and instantly
    // skipped the intro. Require space to be RELEASED first (arm), then a fresh press skips.
    if (this.story) { this.story.t -= dt; if (!pressed('space')) this.story.armed = true; if (this.story.t <= 0) this.story = null; else if (this.story.armed && pressed('space')) this.story = null; }

    if (this.challenge) this.updateChallenge(dt);   // 原#3 timed challenge
    this.spawnTick(dt);
    this.miniBossTick();
    this.eventsTick();
    this.updateEvents(dt);
    this.interactablesTick(dt);   // 原#2: refresh map interactables over time
    this.guardianTick();          // R17/7.1: randomized guardian wake-ups
    this.finalTick(dt);
    this.nearShrine = !!(this.shrinePos && !this.shrineUsed && dist(this.player.x, this.player.y, this.shrinePos.x, this.shrinePos.y) < 20);
    this.nearNpc = null;
    for (const n of this.npcs) { if (!n.used && dist(this.player.x, this.player.y, n.x, n.y) < 22) { this.nearNpc = n; break; } }
    this.nearHidden = null;
    for (const h of (this.hiddenRooms || [])) {
      if (h.used) continue;
      const dd = dist(this.player.x, this.player.y, h.x, h.y);
      if (!h.found && dd < 46) { h.found = true; this.banner = '✦ 發現隱藏房間！'; this.bannerT = 2.0; try { this.world.particles.ring(h.x, h.y, P.shardL, 20, 110); Sfx.play('levelup'); } catch (e) { /* */ } }   // 隱藏: only revealed on approach
      if (h.found && dd < 24) { this.nearHidden = h; break; }
    }
    if (this.world.vaultNear && pressed('interact')) { this.openVault(this.world.vaultNear); }   // R17/7.3: key-use confirm beats everything
    else if (this.nearShrine && pressed('interact')) { this.useShrine(); }
    else if (this.nearNpc && pressed('interact')) { this.useNpc(this.nearNpc); }
    else if (this.nearHidden && pressed('interact')) { this.openHidden(this.nearHidden); }
    else if (this.cleared && pressed('interact')) {   // leave as a win during the Reaper window
      // R17/1.7: E used to end the run INSTANTLY anywhere outside an interactable's 22px ring —
      // confirm first. Co-op can't freeze the shared world, so it keeps the immediate exit.
      if (this.coop) { this.finishRun(true); return; }
      this.leaveConfirm = true; Sfx.play('uiClick'); return;
    }
    // C2: surface a "can-fuse" hint (without revealing the recipe) on the rising edge
    const fr = fusionAvailable(this.run, this.player);
    if (fr && !this.fusionReady) { this.banner = '✦ 可進行武器合成 — 升級時將出現合成選項'; this.bannerT = 2.8; }
    this.fusionReady = fr;
    // 原#13: re-evaluate bond synergies on a light throttle; announce newly completed ones
    this.bondT = (this.bondT || 0) - dt;
    if (this.bondT <= 0) {
      this.bondT = 0.5;
      const nb = checkBonds(this.run, this.player);
      if (nb.length) {
        const n = nb[0];
        this.banner = (n.toTier > 1 ? ('★ 羈絆升階 · ' + n.bond.name + ' 第' + n.toTier + ' 階（' + n.tier.bonusDesc + '）')
          : ('★ 羈絆達成 · ' + n.bond.name + '（' + n.tier.bonusDesc + '）'));
        this.bannerT = 2.8; Sfx.play('levelup'); this.world.particles.ring(this.player.x, this.player.y, P.goldL, 26, 150);
        try { for (const x of nb) if (x.fromTier === 0 && !META.bondsSeen.includes(x.bond.id)) META.bondsSeen.push(x.bond.id); } catch (e) { /* */ }   // 8.2: live-record for the 圖鑑
      }
    }
    if (this.levelQueue > 0) { if (this.coop) this.coopLevelUp(); else if (!this.choice) this.openChoice(); }
    if (this.coop) this.coop.tick(dt, this);   // broadcast a world snapshot to guests (~18Hz)
  },

  // ---- co-op (host) helpers ------------------------------------------------
  // Party level-up: can't pause the shared world for a pick menu, so auto-level every
  // living avatar's weapons (or top a maxed one up with a small heal).
  // co-op party level-up: a NON-BLOCKING pick menu for every player (the shared world
  // can't pause). The host gets the full single-player choice menu (own run state); each
  // guest gets a weapon-choice menu the host computed + applies the pick authoritatively.
  coopLevelUp() {
    this.levelQueue--;
    if (this.coopPick) this.coopPickQueue = Math.min(3, (this.coopPickQueue || 0) + 1);   // stack if one is already open (capped so rapid level-ups can't trap the host in an endless menu chain)
    else this.openCoopPick();
    for (const slot of this.coop.players) {
      if (slot.isLocal || slot.left || !slot.player || slot.player.dead) continue;
      this.coop.sendLevelup(slot, buildWeaponChoices(slot.player));
    }
    this.banner = '隊伍升級！選擇強化'; this.bannerT = 1.4; Sfx.play('levelup');
  },
  openCoopPick() {
    const options = getRunChoices(this.run, this.player);
    if (!options.length) { this.player.heal(this.player.maxHp * 0.12); return; }   // fully capped → heal instead
    this.coopPick = { options, hover: -1, t: 0 };
  },
  // host applies a guest's networked pick to that guest's avatar (coophost calls this)
  applyCoopGuestPick(slot, i) {
    if (!slot || !slot.pendingOpts || !slot.player) return;
    applyWeaponChoice(slot.player, slot.pendingOpts[i] || slot.pendingOpts[0], this.world);
    slot.pendingOpts = null;
  },
  coopPickRects(n) {
    const S = uiScale(); const cw = Math.min(150 * S, (view.W - 40 * S) / n - 12 * S); const ch = cw * 1.18; const gap = 12 * S;
    const totalW = n * cw + (n - 1) * gap; const x0 = (view.W - totalW) / 2; const y = view.H - ch - 16 * S;   // bottom row → world stays visible
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateCoopPick(dt) {
    const cp = this.coopPick; cp.t += dt;
    const rects = this.coopPickRects(cp.options.length); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    cp.hover = -1; rects.forEach((r, i) => { if (inside(mx, my, r)) cp.hover = i; });
    let pick = -1;
    if (mouse.justDown && cp.hover >= 0) pick = cp.hover;
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick < 0 && cp.t > 18) pick = 0;   // auto-pick if ignored far too long (never blocks the run)
    if (pick >= 0 && pick < cp.options.length) {
      try { applyChoice(this.run, this.player, this.world, cp.options[pick]); } catch (e) { /* */ }
      this.world.particles.ring(this.player.x, this.player.y, P.manaL, 18, 100);
      this.banner = cp.options[pick].def.name; this.bannerT = 1.4; Sfx.play('levelup');
      this.coopPick = null;
      if (this.coopPickQueue > 0) { this.coopPickQueue--; this.openCoopPick(); }
    }
  },
  drawCoopPick() {
    const S = uiScale(); const cp = this.coopPick; const rects = this.coopPickRects(cp.options.length);
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiText('★ 選擇強化（點擊或按 1 / 2 / 3）', view.W / 2, rects[0].y - 12 * S, { size: 13 * S, align: 'center', color: P.manaL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
    rects.forEach((r, i) => {
      const c = cp.options[i]; const st = choiceStyle(c); const hover = cp.hover === i; const oy = hover ? -6 * S : 0;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha(st.bg, 0.96), { radius: 8 * S, stroke: hover ? st.accent : withAlpha(st.accent, 0.5), lw: hover ? 3 : 2 });
      uiClipRound(r.x, r.y + oy, r.w, r.h, 8 * S, () => uiRect(r.x, r.y + oy, r.w, 4 * S, st.accent));   // #7: accent clipped to rounded corners
      const sp = getSprite(iconOr(st.icon, c.kind === 'ability' ? 'ability_power' : 'weapon_w_soulbolt')); const isc = (r.w * 0.36) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 12 * S, isc);
      const midY = r.y + oy + 14 * S + sp.h * isc;
      uiText(st.sub, r.x + r.w / 2, midY + 8 * S, { size: 10 * S, align: 'center', color: st.accent, weight: '800' });
      uiText(c.def.name, r.x + r.w / 2, midY + 24 * S, { size: 13 * S, align: 'center', color: '#fff', weight: '800' });
      uiText(String(i + 1), r.x + 9 * S, r.y + oy + 18 * S, { size: 13 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },
  // Non-blocking online leave menu (the world keeps simulating underneath). Returns
  // true if the player left the run.
  coopMenuLayout() {
    const S = uiScale(); const w = 240 * S, h = 46 * S, gap = 14 * S;
    const x = view.W / 2 - w / 2, y0 = view.H / 2 - (h * 2 + gap) / 2;
    return { S, resume: { x, y: y0, w, h }, leave: { x, y: y0 + h + gap, w, h } };
  },
  updateCoopMenu() {
    const L = this.coopMenuLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (mouse.justDown) {
      if (inside(mx, my, L.resume)) { this.coopMenu = false; Sfx.play('uiClick'); }
      else if (inside(mx, my, L.leave)) { this.abandon(); return true; }
    }
    return false;
  },
  drawCoopMenu() {
    const S = uiScale(); const L = this.coopMenuLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.45));
    uiText('連線合作中', view.W / 2, L.resume.y - 40 * S, { size: 26 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('（世界持續進行，無法暫停）', view.W / 2, L.resume.y - 16 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    const btn = (r, label, col) => { const hov = inside(mx, my, r); uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? (col || P.shardL) : P.ink2, lw: hov ? 3 : 2 }); uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' }); };
    btn(L.resume, '繼 續');
    btn(L.leave, '離開房間', P.redL);
  },

  buildMinimap() {
    const m = this.map; const c = document.createElement('canvas'); c.width = m.tw; c.height = m.th;
    const x = c.getContext('2d');
    for (let ty = 0; ty < m.th; ty++) for (let tx = 0; tx < m.tw; tx++) { x.fillStyle = m.tiles[ty * m.tw + tx] !== 0 ? '#2e3450' : '#171a2c'; x.fillRect(tx, ty, 1, 1); }
    this.minimap = c;
  },
  // shared marker set so the small map and the big (M) map always match (#4)
  plotMinimap(dot, sc) {
    const en = this.world.enemies;
    for (let i = 0; i < en.length && i < 220; i++) {   // 4.22: 守護怪 distinct (gold) so the key source is findable
      const e = en[i], col = e.guardian ? P.goldL : (e.boss ? P.redL : (e.surround ? P.purpleL : P.red));
      dot(e.x, e.y, withAlpha(col, e.guardian ? 1 : 0.85), (e.guardian ? 4 : e.boss ? 5 : e.surround ? 3 : 2.5) * sc);
    }
    for (const pk of this.world.pickups) if (pk.type === 'chest' && (!pk.hidden || pk.revealed)) dot(pk.x, pk.y, pk.locked ? P.redL : P.goldL, 3 * sc);   // 4.22: locked vault = red
    if (this.shrinePos) dot(this.shrinePos.x, this.shrinePos.y, P.shardL, 3.5 * sc);
    for (const n of (this.npcs || [])) if (!n.used) dot(n.x, n.y, n.kind === 'well' ? P.shardL : P.manaL, 3.5 * sc);
    if (this.bossRef && !this.bossRef.dead) dot(this.bossRef.x, this.bossRef.y, P.redL, 5 * sc);
    dot(this.player.x, this.player.y, '#ffffff', 4 * sc);
  },
  // #4: minimap sits at the top-LEFT, below the HP / XP / dash UI, slightly enlarged.
  drawMinimap() {
    if (!this.minimap) return;
    const S = uiScale(); const m = this.map;
    const mw = 144 * S, mh = mw * m.th / m.tw;
    const mx = 12 * S, my = 72 * S;   // below the (taller) vitals panel — was 66, which overlapped it
    uiRect(mx - 4, my - 4, mw + 8, mh + 8, withAlpha('#0b0d1a', 0.72), { radius: 6 * S, stroke: P.shardL, lw: 2 });
    uiClipRound(mx - 4, my - 4, mw + 8, mh + 8, 6 * S, () => uiRect(mx - 4, my - 4, mw + 8, 3 * S, withAlpha(P.shardL, 0.5)));   // #7
    drawSpriteUI(this.minimap, mx, my, mw / m.tw);
    const pxW = m.tw * TS, pxH = m.th * TS;
    const dot = (wx, wy, col, sz) => { const dx = mx + (wx / pxW) * mw, dy = my + (wy / pxH) * mh; uiRect(dx - sz / 2, dy - sz / 2, sz, sz, col, { radius: sz / 2 }); };
    this.plotMinimap(dot, S);
  },
  // #2: persistent tracked-quest panel on the left, below the minimap
  drawQuestTracker() {
    if (this.dead || this.choice || this.equipChoice || this.eventChoice || this.shopOpen || this.paused) return;
    const S = uiScale(); const list = trackedQuestStates(META); if (!list.length) return;   // 5.2: one row per tracked quest
    const x = 12 * S, w = 158 * S, h = 46 * S, gap = 6 * S; let y = 196 * S;
    for (const q of list) {
      uiRect(x, y, w, h, withAlpha('#0b0d1a', 0.6), { radius: 5 * S, stroke: withAlpha(P.goldL, q.done ? 0.85 : 0.6), lw: 1.5 });
      uiText('任務 · ' + q.title, x + 8 * S, y + 15 * S, { size: 10.5 * S, color: q.done ? P.greenL : P.goldL, weight: '800' });
      if (q.sub) uiText(q.sub, x + 8 * S, y + 28 * S, { size: 9 * S, color: P.gray3 });
      uiBar(x + 8 * S, y + 34 * S, w - 16 * S, 5 * S, q.frac || 0, { fg: q.done ? P.greenL : P.shardL, bg: '#16183a', border: P.ink });
      if (q.goal) uiText(fmtQuestVal(q.prog, q.fmt) + '/' + fmtQuestVal(q.goal, q.fmt), x + w - 8 * S, y + 31 * S, { size: 9 * S, align: 'right', color: P.gray3 });
      y += h + gap;
    }
  },

  // 6.2: tick + show the first-battle combat hints (fade in 0.5s · hold 3s · fade out 0.5s).
  tickBattleHints(dt) {
    if (META.tutorialBattleDone || this.coop) return;
    if (this._bhIdx < BATTLE_HINTS.length && this.run.time >= BATTLE_HINTS[this._bhIdx].t) { this._bhActive = { text: BATTLE_HINTS[this._bhIdx].text, t: 0 }; this._bhIdx++; }
    if (this._bhActive) { this._bhActive.t += dt; if (this._bhActive.t > 4) { this._bhActive = null; if (this._bhIdx >= BATTLE_HINTS.length) { META.tutorialBattleDone = true; saveMeta(); } } }
  },
  drawBattleHint() {
    const e = this._bhActive;
    if (!e || this.dead || this.choice || this.equipChoice || this.eventChoice || this.paused || this.hudTut || this.shopOpen) return;
    const S = uiScale();
    const a = e.t < 0.5 ? e.t / 0.5 : (e.t > 3.5 ? Math.max(0, (4 - e.t) / 0.5) : 1);
    const w = Math.min(view.W * 0.7, 520 * S), h = 38 * S, x = (view.W - w) / 2, y = view.H - 124 * S;
    uiRect(x, y, w, h, withAlpha('#0d1430', 0.86 * a), { radius: 8 * S, stroke: withAlpha(P.shardL, 0.7 * a), lw: 1.5 });
    uiText('💡 ' + e.text, x + w / 2, y + h / 2 + 1 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: withAlpha('#fff', a), weight: '700' });
  },
  // 6.3A: first-run HUD walkthrough — paused overlay with callouts pointing at the live HUD regions.
  updateHudTut() {
    if (pressed('interact') || pressed('enter') || pressed('space') || pressed('escape') || pressed('pause') || mouse.justDown) {
      this.hudTut = false; META.tutorialHUDDone = true; saveMeta(); Sfx.play('uiClick');
    }
  },
  drawHudTut() {
    const S = uiScale(); const W = view.W, H = view.H, pad = 12 * S;
    uiRect(0, 0, W, H, withAlpha('#070912', 0.78));
    uiText('新 手 指 南 · 介 面 一 覽', W / 2, 56 * S, { size: 24 * S, align: 'center', color: P.shardL, weight: '900' });
    uiText('熟悉一下畫面上的資訊（每個帳號只出現一次）', W / 2, 80 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '600' });
    const ctx = ctxRaw();
    const callout = (tx, ty, bx, by, label) => {
      const tw = textWidth(label, 12 * S, '700') + 18 * S, bh = 26 * S;
      const rx = bx - tw / 2, ry = by - bh / 2;
      ctx.save(); ctx.strokeStyle = withAlpha('#fff', 0.7); ctx.lineWidth = 1.5 * S;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = withAlpha(P.shardL, 0.9); ctx.beginPath(); ctx.arc(tx, ty, 3.5 * S, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      uiRect(rx, ry, tw, bh, withAlpha('#10142c', 0.97), { radius: 6 * S, stroke: P.shardL, lw: 1.5 });
      uiText(label, bx, by + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700' });
    };
    // anchors mirror hud.js layout (vitals top-left, counters top-right, weapons bottom-left, quest tracker left)
    callout(pad + 90 * S, pad + 18 * S, pad + 250 * S, pad + 24 * S, '生命 · 經驗 · 衝刺');
    callout(W - pad - 56 * S, pad + 30 * S, W - pad - 150 * S, pad + 96 * S, '金幣 · 魂晶 · 擊殺');
    callout(pad + 40 * S, H - pad - 16 * S, pad + 150 * S, H - pad - 70 * S, '武器（自動開火 / 升級進化）');
    callout(pad + 70 * S, 210 * S, pad + 230 * S, 210 * S, '任務追蹤 · 羈絆');
    uiText('按任意鍵（或點擊）開始狩獵', W / 2, H - 40 * S, { size: 15 * S, align: 'center', color: withAlpha(P.goldL, 0.7 + 0.3 * Math.sin(this.t * 5)), weight: '800' });
  },

  // 8.2: live 羈絆 panel on the left, BELOW the quest tracker — shows the bonds
  // currently active this run (icon badge + name + reached tier).
  // 4.20: hold V to see the current pickup radius (world-space ring + label).
  drawPickupRange() {
    if (!pressed('range') || this.dead || this.choice || this.equipChoice || this.eventChoice || this.paused || this.shopOpen || this.bigMap || this.showBuild) return;
    const r = this.player.stats.pickupRange || 26, pz = Math.sin(this.t * 5) * 0.5 + 0.5;
    fillCircleWorld(this.player.x, this.player.y, r, withAlpha(P.shardL, 0.06));
    strokeCircleWorld(this.player.x, this.player.y, r, withAlpha(P.shardL, 0.5 + 0.3 * pz), 2);
    const ns = worldToScreen(this.player.x, this.player.y - r - 8);
    uiText('拾取範圍 ' + Math.round(r), ns.x, ns.y, { size: 11 * uiScale(), align: 'center', color: P.shardL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },
  // 4.2 + R16 #6: persistent recent-pickup log (bottom-right) shown as ICON chips (latest at the
  // bottom, brightest). Hover a chip → tooltip with its effect; a chip whose timed buff is still
  // active shows the remaining seconds + a draining progress bar. Hit-rects go to hudIcons so the
  // generic hover loop (drawInfo) picks them up.
  drawPickupLog() {
    const log = this.run.pickupLog;
    if (!log || !log.length || this.dead || this.choice || this.equipChoice || this.shopOpen || this.bigMap || this.showBuild || this.paused) return;
    const S = uiScale(), shown = log.slice(-6);
    const sz = 26 * S, gap = 5 * S, x = view.W - 12 * S - sz, y0 = view.H - 70 * S;
    uiText('近期拾取', x + sz, y0 - shown.length * (sz + gap) - 4 * S, { size: 9 * S, align: 'right', color: P.gray3, weight: '700', shadowColor: withAlpha('#000', 0.8) });
    shown.forEach((e, i) => {
      const idx = shown.length - 1 - i;                 // 0 = latest (sits at the bottom)
      const y = y0 - idx * (sz + gap);
      const a = 0.5 + 0.5 * ((i + 1) / shown.length);
      const active = !!(e.buff && this.player.timedBuffs.includes(e.buff) && e.buff.t > 0);
      const accent = active ? (e.buff.color || P.shardL) : (e.color || P.shardL);
      uiRect(x, y, sz, sz, withAlpha('#10121f', active ? 0.94 : 0.55 + 0.3 * a), { radius: 5 * S, stroke: withAlpha(accent, active ? 1 : 0.55 * a + 0.2), lw: active ? 2 : 1.5 });
      if (e.icon) { const sp = getSprite(iconOr(e.icon, 'shard')); drawSpriteUI(sp.frames[0], x + 3 * S, y + 3 * S, (sz - 6 * S) / sp.w, { alpha: active ? 1 : a }); }
      else uiText(e.emoji || '·', x + sz / 2, y + sz / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: withAlpha(accent, a) });
      if (active) {                                     // remaining-seconds badge + draining bar
        const frac = Math.max(0, Math.min(1, e.buff.t / (e.buff.dur || e.buff.t)));
        uiRect(x + 2 * S, y + sz - 4 * S, (sz - 4 * S) * frac, 2.5 * S, withAlpha(accent, 0.9), { radius: 1.2 * S });
        uiText(Math.ceil(e.buff.t) + 's', x + sz - 2 * S, y + 10 * S, { size: 9 * S, align: 'right', baseline: 'middle', color: accent, weight: '900', shadowColor: withAlpha('#000', 0.85) });
      }
      hudIcons.push({ x, y, w: sz, h: sz, kind: 'pickup', entry: e, active, rem: active ? Math.ceil(e.buff.t) : 0 });
    });
  },
  // R16 #6: hover tooltip for a recent-pickup chip — name + effect text (+ remaining seconds).
  drawPickupTooltip(ic, mx, my, S) {
    const e = ic.entry; const W = 198 * S;
    const lines = []; let line = '';
    for (const ch of (e.desc || '')) { if (textWidth(line + ch, 10.5 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (28 + lines.length * 13 + (ic.active ? 14 : 0)) * S;
    let x = mx + 14 * S, y = my - H - 8 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y < 6 * S) y = my + 16 * S;
    const accent = (ic.active && e.buff) ? (e.buff.color || P.shardL) : (e.color || P.shardL);
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: accent, lw: 2 });
    uiText((e.emoji ? e.emoji + ' ' : '') + (e.name || e.text || '拾取'), x + 8 * S, y + 17 * S, { size: 12 * S, color: '#fff', weight: '800' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 31 * S + i * 13 * S, { size: 10.5 * S, color: P.gray4, weight: '500' }));
    if (ic.active) uiText('剩餘 ' + ic.rem + ' 秒', x + 8 * S, y + 31 * S + lines.length * 13 * S, { size: 10.5 * S, color: accent, weight: '800' });
  },
  // 4.22: held vault keys (dropped by 守護怪, spent on locked vault chests).
  drawKeyHud() {
    const keys = (this.world && this.world.keys) | 0;
    if (keys <= 0 || this.dead) return;
    const S = uiScale();
    uiText('🔑 × ' + keys, view.W - 12 * S, 96 * S, { size: 13 * S, align: 'right', color: P.goldL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },
  // 4.14: persistent patron-buff strip (top-centre, under the stage line). Hover a patron icon → its effect.
  drawPatronHud() {
    const list = this.run.patrons;
    if (!list || !list.length || this.dead || this.choice || this.equipChoice || this.eventChoice || this.paused || this.hudTut) return;
    const S = uiScale(), sz = 22 * S, gap = 5 * S, total = list.length * (sz + gap) - gap;
    let x = view.W / 2 - total / 2; const y = 80 * S;
    for (const pt of list) {
      const sp = getSprite(iconOr(pt.icon, 'patron_gambler'));
      uiRect(x, y, sz, sz, withAlpha('#10121f', 0.72), { radius: 5 * S, stroke: withAlpha(P.goldL, 0.7), lw: 1.5 });
      drawSpriteUI(sp.frames[0], x + 2 * S, y + 2 * S, (sz - 4 * S) / sp.w);
      hudIcons.push({ x, y, w: sz, h: sz, kind: 'patron', patron: pt });
      x += sz + gap;
    }
  },
  drawPatronTooltip(ic, mx, my, S) {
    const p = ic.patron; const W = 204 * S; const lines = []; let line = '';
    for (const ch of (p.desc || '')) { if (textWidth(line + ch, 10.5 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (44 + lines.length * 13) * S;
    let x = mx + 14 * S, y = my + 8 * S; if (x + W > view.W) x = view.W - W - 6 * S; if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: P.goldL, lw: 2 });
    uiText('✦ ' + p.name, x + 8 * S, y + 17 * S, { size: 12 * S, color: P.goldL, weight: '800' });
    uiText((p.role ? p.role + ' · ' : '') + '「' + (p.title || '') + '」', x + 8 * S, y + 32 * S, { size: 10 * S, color: P.shardL, weight: '700' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 46 * S + i * 13 * S, { size: 10.5 * S, color: P.gray4, weight: '500' }));
  },
  // TFT 式羈絆側欄：六角徽章（依階級銅/銀/金配色）＋名稱＋階數；已達成＋快達成。
  drawBondTracker() {
    if (this.dead || this.choice || this.equipChoice || this.eventChoice || this.shopOpen || this.paused || this.bigMap) return;
    const S = uiScale();
    const list = [];
    for (const b of BONDS) {
      const pg = bondProgress(b, this.run, this.player);
      if (pg.level >= 1) list.push({ b, pg, near: false });
      else if (pg.count >= 1 && pg.nextTier && pg.nextTier.at - pg.count <= 1) list.push({ b, pg, near: true });
    }
    if (!list.length) return;
    list.sort((a, x2) => x2.pg.level - a.pg.level);   // achieved first, higher tier first
    const achievedN = list.filter((o) => !o.near).length;
    const x = 12 * S, w = 170 * S;
    const tq = trackedQuestStates(META).length;   // 5.2: sit below however many quest rows are tracked (each row h=46, inter-row gap=6)
    // last row bottom = 196 + (tq-1)*52 + 46; bond box sits +4 below it (the SAME 4px margin the
    // original single-quest layout used: tq=1 → 246, matching pre-5.2). NOT 196+tq*52 (that'd be a 6px gap).
    const y = (tq ? 196 + tq * 46 + (tq - 1) * 6 + 4 : 196) * S;
    const rows = list.slice(0, 7), extra = list.length - rows.length;
    const headH = 22 * S, rowH = 22 * S;
    const h = headH + rows.length * rowH + (extra > 0 ? 12 * S : 0) + 6 * S;
    uiRect(x, y, w, h, withAlpha('#0b0d1a', 0.62), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.45), lw: 1.5 });
    uiText('羈絆 · ' + achievedN, x + 10 * S, y + 15 * S, { size: 10 * S, color: P.goldL, weight: '800' });
    // tier → TFT 銅/銀/金 配色
    const tierStyle = (lvl) => lvl <= 0 ? { fill: '#262c40', stroke: '#566089', txt: '#aeb6d8' }
      : lvl === 1 ? { fill: '#6e4322', stroke: '#c8843e', txt: '#ffe6c8' }
        : lvl === 2 ? { fill: '#515b6b', stroke: '#cdd8e6', txt: '#ffffff' }
          : { fill: '#7a5c16', stroke: '#f2c14e', txt: '#fff3c8' };
    const ctx = ctxRaw(), hr = 9 * S;
    rows.forEach((o, i) => {
      const cy = y + headH + i * rowH + rowH / 2 - 2 * S, hx = x + 11 * S + hr;
      const st = tierStyle(o.near ? 0 : o.pg.level);
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90), px = hx + hr * Math.cos(a), py = cy + hr * Math.sin(a); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath();
      ctx.fillStyle = st.fill; ctx.fill();
      ctx.lineWidth = 1.6 * S; ctx.strokeStyle = st.stroke; ctx.stroke();
      ctx.restore();
      uiText(o.b.tag, hx, cy + 0.5 * S, { size: 9 * S, align: 'center', baseline: 'middle', color: st.txt, weight: '900', shadow: false });
      const nameX = hx + hr + 7 * S;
      let nm = o.b.name;
      while (nm.length > 1 && textWidth(nm, 10 * S, '800') > w - (nameX - x) - 42 * S) nm = nm.slice(0, -1);
      uiText(nm, nameX, cy + 0.5 * S, { size: 10 * S, baseline: 'middle', color: o.near ? '#aeb6d8' : '#f0e4c0', weight: '800' });
      // near = how many requirement pieces collected (e.g. 1/2); achieved = current tier / max tier
      uiText(o.near ? (o.pg.count + '/' + o.pg.tiers[0].at) : (o.pg.level + '/' + o.pg.max), x + w - 10 * S, cy + 0.5 * S, { size: 9.5 * S, align: 'right', baseline: 'middle', color: o.near ? P.shardL : st.stroke, weight: '900' });
      hudIcons.push({ x, y: cy - rowH / 2 + 2 * S, w, h: rowH, kind: 'bond', bond: o.b, prog: o.pg });   // hover → effect tooltip (drawBondTooltip)
    });
    if (extra > 0) uiText('＋' + extra + ' 個…', x + w - 10 * S, y + h - 6 * S, { size: 8 * S, align: 'right', color: P.gray3, weight: '600' });
  },

  // M: a big semi-transparent minimap floating in the centre of the screen
  drawBigMinimap() {
    if (!this.bigMap || !this.minimap || this.showBuild || this.choice || this.shopOpen || this.dead) return;
    const S = uiScale(); const m = this.map;
    const mw = Math.min(view.W * 0.6, view.H * 0.6 * m.tw / m.th), mh = mw * m.th / m.tw;
    const mx = (view.W - mw) / 2, my = (view.H - mh) / 2;
    uiRect(mx - 4, my - 4, mw + 8, mh + 8, withAlpha('#0b0d1a', 0.42), { radius: 6 * S, stroke: P.shardL, lw: 2 });
    drawSpriteUI(this.minimap, mx, my, mw / m.tw, { alpha: 0.5 });
    const pxW = m.tw * TS, pxH = m.th * TS;
    const dot = (wx, wy, col, sz) => { const dx = mx + (wx / pxW) * mw, dy = my + (wy / pxH) * mh; uiRect(dx - sz / 2, dy - sz / 2, sz, sz, col, { radius: sz / 2 }); };
    this.plotMinimap(dot, S * 1.6);   // same markers as the small map, larger
    // 4.13: player marker = character avatar (頭貼) — pulsing gold ring so it stands out
    const psp = getSprite(this.run.characterSprite || 'player');
    const pdx = mx + (this.player.x / pxW) * mw, pdy = my + (this.player.y / pxH) * mh;
    const asz = 24 * S, asc = (asz - 4 * S) / psp.w, pz = Math.sin(this.t * 5) * 0.5 + 0.5;
    uiRect(pdx - asz / 2, pdy - asz / 2, asz, asz, withAlpha('#10121f', 0.9), { radius: asz / 2, stroke: withAlpha(P.goldL, 0.6 + 0.4 * pz), lw: 2 });
    drawSpriteUI(psp.frames[0], pdx - psp.w * asc / 2, pdy - psp.h * asc / 2, asc);
    uiText('放大地圖　·　M 關閉', view.W / 2, my - 12 * S, { size: 12 * S, align: 'center', color: withAlpha(P.shardL, 0.85), weight: '700' });
  },

  aimCamera() {
    const halfW = view.W / 2 / camera.zoom, halfH = view.H / 2 / camera.zoom;
    const pxW = this.map.tw * TS, pxH = this.map.th * TS;
    camera.targetX = pxW > halfW * 2 ? clamp(this.player.x, halfW, pxW - halfW) : pxW / 2;
    camera.targetY = pxH > halfH * 2 ? clamp(this.player.y, halfH, pxH - halfH) : pxH / 2;
  },

  // ---- in-run shop: epic/prismatic gear + stat anvils (+ hidden purist boon) -
  shopLayout() {
    const S = uiScale();
    const w = Math.min(view.W * 0.9, 720 * S), h = Math.min(view.H * 0.85, 520 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const close = { x: x + w - 38 * S, y: y + 10 * S, w: 28 * S, h: 28 * S };
    const colW = (w - 60 * S) / 2;
    const gearX = x + 24 * S, anvilX = x + 36 * S + colW;
    const cardH = 56 * S, top = y + 100 * S;
    const gearBuyCard = { x: gearX, y: top, w: colW, h: cardH * 1.4 };
    const anvilBuyCard = { x: anvilX, y: top, w: colW, h: cardH * 1.4 };
    // the paused 3-choice overlay (stat OR gear) (#3 / C1)
    let choiceCards = null;
    if (this.shopChoice) {
      const cw = Math.min(166 * S, (w - 64 * S) / 3), ch = cw * 1.62, cg = 14 * S;   // 原#4: taller cards fit the diff
      const totW = 3 * cw + 2 * cg, cx0 = x + (w - totW) / 2, cy = y + h / 2 - ch / 2;
      choiceCards = this.shopChoice.opts.map((opt, i) => ({ x: cx0 + i * (cw + cg), y: cy, w: cw, h: ch, opt }));
    }
    return { S, x, y, w, h, close, gearBuyCard, anvilBuyCard, choiceCards, gearX, anvilX, colW, top };
  },
  anvilPrice() { return Math.round(BALANCE.ANVIL_BASE_PRICE * Math.pow(BALANCE.ANVIL_PRICE_GROWTH, this.anvilBuys || 0)); },
  gearPrice() { return Math.round(BALANCE.GEAR_ANVIL_BASE_PRICE * Math.pow(BALANCE.GEAR_ANVIL_GROWTH, this.gearBuys || 0)); },
  updateShopPanel() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.shopLayout();
    if (this.shopChoice) {                        // choosing: only the 3 cards (+ skip) are live (game stays paused)
      const sk = this.shopSkipRect(L);            // 4.18: allow skipping the anvil roll
      if (pressed('escape') || (mouse.justDown && sk && inside(mx, my, sk))) { this.shopChoice = null; Sfx.play('uiClick'); return; }
      if (mouse.justDown && L.choiceCards) for (const c of L.choiceCards) if (inside(mx, my, c)) { this.pickShop(c.opt); return; }
      return;
    }
    if (pressed('escape') || pressed('interact') || pressed('build')) { this.shopOpen = false; return; }
    if (mouse.justDown) {
      if (inside(mx, my, L.close)) { this.shopOpen = false; return; }
      if (inside(mx, my, L.gearBuyCard)) { this.buyGearAnvil(); return; }
      if (inside(mx, my, L.anvilBuyCard)) { this.buyAnvil(); return; }
      if (!inside(mx, my, L)) this.shopOpen = false;
    }
  },
  buyAnvil() {
    const price = this.anvilPrice();
    if (this.run.shards < price) { this.flashShop('魂晶不足'); return; }
    this.run.shards -= price; this.anvilBuys = (this.anvilBuys || 0) + 1;
    const pool = ANVIL_POOL.slice(), pick = [];
    for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    this.shopChoice = { kind: 'stat', opts: pick }; Sfx.play('buy');
  },
  buyGearAnvil() {
    const price = this.gearPrice();
    if (this.run.shards < price) { this.flashShop('魂晶不足'); return; }
    const pick = this.rollGearChoice();
    if (!pick.length) { this.flashShop('已無裝備可鍛'); return; }
    this.run.shards -= price; this.gearBuys = (this.gearBuys || 0) + 1;
    this.shopChoice = { kind: 'gear', opts: pick }; Sfx.play('buy');
  },
  shopSkipRect(L) {   // 4.18: the「跳過」button below the anvil 3-choice
    if (!L || !L.choiceCards || !L.choiceCards.length) return null;
    const S = uiScale(), c0 = L.choiceCards[0];
    return { x: view.W / 2 - 80 * S, y: c0.y + c0.h + 12 * S, w: 160 * S, h: 30 * S };
  },
  pickShop(opt) {
    if (this.shopChoice.kind === 'stat') { try { opt.apply(this.player.stats, this.player); } catch (e) { /* */ } this.run.anvilCount = (this.run.anvilCount || 0) + 1; this.shopChoice = null; this.maybeBoon(); }
    else { equipItem(this.player, this.run, opt); this.run.gearTaken = true; this.shopChoice = null; }
    Sfx.play('levelup');
  },
  // hidden path: buy lots of anvils and NEVER take gear -> a one-time random boon
  maybeBoon() {
    if (this.run.boonUsed || this.run.gearTaken) return;
    if ((this.run.anvilCount || 0) >= 4 && rng.chance(0.35)) this.triggerBoon();
  },
  triggerBoon() {
    this.run.boonUsed = true; this.run.purist = true;
    const boons = [
      { n: '傷害', f: (s, m) => { s.damageMult *= 1 + m; } },
      { n: '生命', f: (s, m, p) => { const a = Math.round(p.maxHp * m); s.maxHp += a; p.heal(a); } },
      { n: '射速', f: (s, m) => { s.fireRateMult *= 1 + m; } },
      { n: '移速', f: (s, m) => { s.speed *= 1 + m * 0.5; } },
      { n: '暴擊', f: (s, m) => { s.critChance += m * 0.5; } },
    ];
    const b = boons[rng.int(0, boons.length - 1)];
    const mag = 0.01 + rng.next() * 0.99;     // 1% .. 100%
    try { b.f(this.player.stats, mag, this.player); } catch (e) { /* */ }
    this.banner = `稜彩祝福！${b.n} +${Math.round(mag * 100)}%　自此踏上純能力值之道`;
    this.bannerT = 4.0; Sfx.play('levelup');
    this.world.particles.ring(this.player.x, this.player.y, P.purpleL, 30, 200);
  },
  flashShop(msg) { this.shopFlash = msg; this.shopFlashT = 1.2; },

  // ---- render --------------------------------------------------------------
  // ---- hidden rooms (隱藏房間) ---------------------------------------------
  openHidden(h) {
    const room = hiddenRoomById(h.id);
    h.used = true;
    META.stats.hiddenRoomsFound = (META.stats.hiddenRoomsFound || 0) + 1;
    const already = hiddenClaimed(room.id);
    if (this.coop) {   // co-op can't pause the shared world → resolve immediately
      const res = already ? '此密室已探索過' : (claimHidden(room.id) || '');
      const txt = typeof res === 'string' ? res : (res && res.text) || '';   // R17/6.5: claims return reveal objects now
      this.banner = '隱藏房間 · ' + (txt || room.name); this.bannerT = 2.8; Sfx.play('levelup');
      return;
    }
    this.hiddenPanel = { room, claimed: already, result: null, t: 0 }; Sfx.play('levelup');
  },
  updateHidden(dt) {
    const hp = this.hiddenPanel; hp.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (pressed('escape') || pressed('pause')) { this.hiddenPanel = null; return; }
    if (!(mouse.justDown || pressed('interact') || pressed('space') || pressed('slot1'))) return;
    if (hp.result == null) {
      hp.result = hp.claimed ? '此密室已被探索過 — 寶藏早已取走。' : (claimHidden(hp.room.id) || '此密室已被探索過。');
      const txt = typeof hp.result === 'string' ? hp.result : hp.result.text;   // R17/6.5
      this.banner = '隱藏房間 · ' + txt; this.bannerT = 3.2; Sfx.play('levelup');
      if (typeof hp.result === 'object') { try { this.world.particles.ring(this.player.x, this.player.y, P.goldL, 30, 170); } catch (e) { /* */ } }
    } else { this.hiddenPanel = null; }   // a second press closes
  },
  // R17/7.1: wake each planned guardian at its rolled time (skipped once the level is cleared)
  guardianTick() {
    if (!this.guardianPlan) return;
    for (const g of this.guardianPlan) {
      if (g.done || this.run.time < g.at) continue;
      g.done = true;
      if (this.cleared) continue;
      const def = Enemies.get('brute') || Enemies.get('slime');
      if (!def) continue;
      const e = this.world.spawnEnemy(def, g.fr.x, g.fr.y, { hpScale: BALANCE.GUARDIAN_HP_SCALE, dmgScale: BALANCE.GUARDIAN_DMG_SCALE, elite: true, quiet: true });
      if (e) { e.guardian = true; e.scale = (e.scale || 1) * 1.25; }
      this.banner = '⚔ 寶庫守護怪甦醒了——擊敗牠奪取鑰匙！'; this.bannerT = 3.0; Sfx.play('levelup');
      try { this.world.particles.ring(g.fr.x, g.fr.y, P.goldL, 26, 150); } catch (err) { /* */ }
    }
  },
  // R17/7.3: the vault no longer auto-eats a key on touch — E confirms, with fanfare
  openVault(pk) {
    if (!pk || pk.opened || (this.world.keys | 0) <= 0) return;
    this.world.keys -= 1;
    pk.opened = true; pk.dead = true;
    this.world.openChest(pk.x, pk.y - 4, pk.value || 1);
    this.world.vaultNear = null;
    this.banner = '🔑 寶庫開啟！'; this.bannerT = 2.4;
    try { this.world.particles.ring(pk.x, pk.y, P.goldL, 18, 120); this.world.particles.ring(pk.x, pk.y, P.goldL, 30, 170); } catch (e) { /* */ }
    Sfx.play('levelup');
  },
  drawVaultPrompt() {
    const pk = this.world.vaultNear; if (!pk || this.dead) return;
    const S = uiScale(); const ps = worldToScreen(pk.x, pk.y - 18);
    uiText('【E】使用鑰匙開啟寶庫', ps.x, ps.y, { size: 12 * S, align: 'center', color: withAlpha('#ffd479', 0.65 + Math.sin(this.t * 6) * 0.3), weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },
  drawHiddenRooms() {
    if (!this.hiddenRooms) return; const S = uiScale();
    for (const h of this.hiddenRooms) {
      if (h.used || !h.found) continue;   // invisible until discovered on approach
      const room = hiddenRoomById(h.id); const pulse = 0.5 + Math.sin(this.t * 3 + h.x * 0.1) * 0.5;
      glowWorld(h.x, h.y - 4, 16 + pulse * 6, room.color, 0.2 + pulse * 0.12);
      strokeCircleWorld(h.x, h.y - 4, 11 + pulse * 2, room.color, 2);
      strokeCircleWorld(h.x, h.y - 4, 6, withAlpha(room.color, 0.7), 1.5);
      fillCircleWorld(h.x, h.y - 4, 2.5, room.color);
      const ns = worldToScreen(h.x, h.y - 22); uiText('✦', ns.x, ns.y, { size: 14 * S, align: 'center', color: room.color, weight: '900', shadowColor: withAlpha('#000', 0.8) });
      if (this.nearHidden === h) { const ps = worldToScreen(h.x, h.y + 10); uiText('按 E 進入隱藏房間', ps.x, ps.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
  },
  drawHidden() {
    // 4.16: framed reveal panel (was free-floating centred text); the reward string
    // (hp.result, from claimHidden) already names the specific item.
    const S = uiScale(); const hp = this.hiddenPanel; const room = hp.room;
    uiRect(0, 0, view.W, view.H, withAlpha('#070912', 0.85));
    const w = Math.min(view.W * 0.82, 560 * S), h = Math.min(view.H * 0.62, 350 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    uiRect(x, y, w, h, withAlpha('#12152a', 0.98), { radius: 12 * S, stroke: room.color || P.goldL, lw: 2.5 });
    uiClipRound(x, y, w, h, 12 * S, () => uiRect(x, y, w, 6 * S, withAlpha(room.color || P.goldL, 0.7)));   // #7
    uiText('✦ 隱藏房間 ✦', view.W / 2, y + 26 * S, { size: 12 * S, align: 'center', color: withAlpha(room.color || P.goldL, 0.85), weight: '800' });
    uiText(room.name, view.W / 2, y + 56 * S, { size: 26 * S, align: 'center', color: room.color || P.goldL, weight: '900', shadowColor: withAlpha('#000', 0.8) });
    this.wrapText(room.desc || '', view.W / 2, y + 86 * S, w - 60 * S, 13 * S, P.gray3);
    if (hp.result != null && typeof hp.result === 'object') {
      // R17/6.5: reveal card — the unlocked thing's icon + name, not just a sentence
      const rv = hp.result;
      const iconName = rv.icon || skinSpriteName(META.selectedCharacter || 'hunter', 'devkid');
      const sp = getSprite(iconOr(iconName, 'ability_power'));
      const isz = 44 * S, ix = view.W / 2 - isz / 2, iy = y + h * 0.40;
      const pulse = 0.5 + Math.sin(this.t * 4) * 0.5;
      uiRect(ix - 7 * S, iy - 7 * S, isz + 14 * S, isz + 14 * S, withAlpha('#10121f', 0.9), { radius: 9 * S, stroke: withAlpha(P.goldL, 0.6 + pulse * 0.4), lw: 2.5 });
      drawSpriteUI(sp.frames[0], ix, iy, isz / sp.w);
      uiText(rv.name || '', view.W / 2, iy + isz + 24 * S, { size: 17 * S, align: 'center', color: P.goldL, weight: '900', shadowColor: withAlpha('#000', 0.8) });
      if (rv.kindLabel) uiText('— ' + rv.kindLabel + ' —', view.W / 2, iy + isz + 40 * S, { size: 10.5 * S, align: 'center', color: P.shardL, weight: '700' });
      this.wrapText(rv.text || '', view.W / 2, iy + isz + 58 * S, w - 56 * S, 12.5 * S, P.gray4);
    }
    else if (hp.result != null) this.wrapText(hp.result, view.W / 2, y + h * 0.55, w - 56 * S, 14.5 * S, P.goldL);
    else if (hp.claimed) uiText('（此密室你已探索過）', view.W / 2, y + h * 0.55, { size: 13 * S, align: 'center', color: P.gray3 });
    else uiText('一份未知的寶藏在此等候…', view.W / 2, y + h * 0.55, { size: 13 * S, align: 'center', color: withAlpha('#fff', 0.7), weight: '600' });
    uiText(hp.result != null ? '點擊 / 按 E 關閉' : '點擊 / 按 E 探索此密室', view.W / 2, y + h - 22 * S, { size: 12 * S, align: 'center', color: withAlpha('#ffd479', 0.6 + 0.3 * Math.sin(this.t * 5)), weight: '700' });
    settingsUI.draw();
  },

  render() {
    this.world.draw();
    if (this.shrinePos) this.drawShrine();
    this.drawNpcs();
    this.drawHiddenRooms();
    this.drawVaultPrompt();   // R17/7.3:【E】use-key confirm hint above the locked chest
    this.drawEvents();
    this.drawPickupRange();   // 4.20: V shows the pickup-range ring (world space)
    vignette(0.42);
    drawLowHpWarning(this.player, this.t);
    this.world.particles.drawText();
    drawHud(this.run, this.player);
    this.drawKeyHud();        // 4.22: held vault keys
    this.drawPickupLog();     // 4.2: recent-pickup log
    this.drawStageHud();
    this.drawPatronHud();   // 4.14 persistent patron-buff strip
    this.drawMinimap();
    this.drawQuestTracker();
    this.drawBondTracker();
    this.drawBanner();
    this.drawBattleHint();   // 6.2 first-battle combat hints
    this.drawInfo();
    this.drawBigMinimap();
    if (this.story && this.story.t > 0) this.drawStory();
    if (this.challenge) this.drawChallenge();
    if (this.shopOpen) this.drawShopPanel();
    // level-up has input priority (update() resolves this.choice first), so it must also draw ON TOP —
    // show only the active one so the equip window never hides the level-up cards behind it
    if (this.choice) { if (this.peekBuild) this.drawChoicePeekBuild(); else this.drawChoice(); }   // 4.19: TAB peek
    else if (this.equipChoice) this.drawEquipChoice();
    if (this.eventChoice) this.drawEventChoice();
    if (this.coop) this.drawCoopTags();
    if (this.coop && this.coopPick && !this.coopMenu) this.drawCoopPick();
    if (this.dead) { if (this.won) this.drawWon(); else this.drawDeath(); }
    if (this.paused) this.drawPause();
    if (this.leaveConfirm && !this.dead) this.drawLeaveConfirm();   // R17/1.7
    if (this.hudTut) this.drawHudTut();   // 6.3A first-run HUD walkthrough (on top)
    if (this.hiddenPanel) this.drawHidden();
    if (this.coop && this.coopMenu) this.drawCoopMenu();
    drawAchievementToasts();   // round16/4.9-B: global unlock banners (above HUD/panels)
    settingsUI.draw();
    this.drawCheatPanel();   // F2 dev overlay (on top of everything)
  },

  // co-op: floating name + HP tag above each teammate's avatar so you can tell who's who
  drawCoopTags() {
    if (!this.coop) return; const S = uiScale();
    for (const slot of this.coop.players) {
      const pl = slot.player; if (!pl || pl.dead || slot.left) continue;
      const isSelf = slot.cid === this.coop.selfCid;
      const ns = worldToScreen(pl.x, pl.y - 20);
      uiText(slot.name + (isSelf ? '（你）' : ''), ns.x, ns.y, { size: 9.5 * S, align: 'center', color: isSelf ? P.shardL : '#cfe0ff', weight: '700', shadowColor: withAlpha('#000', 0.8) });
      const bw = 30 * S, bx = ns.x - bw / 2, by = ns.y + 3 * S;
      uiRect(bx, by, bw, 3.2 * S, withAlpha('#2a0e14', 0.9), { radius: 1.5 * S });
      uiRect(bx, by, bw * Math.max(0, Math.min(1, pl.hp / (pl.maxHp || 1))), 3.2 * S, isSelf ? P.greenL : P.red, { radius: 1.5 * S });
    }
  },

  drawShrine() {
    const p = this.shrinePos; if (!p) return; const S = uiScale();
    const sp = getSprite('hub_altar');
    const used = this.shrineUsed;
    glowWorld(p.x, p.y - 8, 14, used ? P.gray2 : P.shardL, used ? 0.08 : 0.22 + Math.sin(this.t * 3) * 0.06);
    drawShadow(p.x, p.y, sp.w * 0.3);
    drawSprite(frameAt(sp, this.t), p.x, p.y, { ax: sp.ax, ay: sp.ay, alpha: used ? 0.45 : 1 });
    if (used) return;
    const ns = worldToScreen(p.x, p.y - sp.h - 4);
    uiText('祝福神龕', ns.x, ns.y, { size: 11 * S, align: 'center', color: P.shardL, weight: '800' });
    if (this.nearShrine) { const ps = worldToScreen(p.x, p.y + 8); uiText('按 E 祈福', ps.x, ps.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
  },
  drawNpcs() {
    if (!this.npcs || !this.npcs.length) return;
    const S = uiScale();
    const KIND = {
      well:  { sprite: 'hub_well',  label: '祈願水井', color: P.shardL },
      soul:  { sprite: 'wisp',      label: '迷途之魂', color: P.manaL },
      shard: { sprite: 'shard',     label: '魂晶礦脈', color: P.shardL },
      forge: { sprite: 'npc_smith', label: '流浪鐵匠', color: P.emberL },
    };
    for (const n of this.npcs) {
      if (n.used) continue;
      const k = KIND[n.kind] || KIND.soul;
      const sp = getSprite(k.sprite);
      const scale = n.kind === 'shard' ? 1.6 : 1;
      if (n.fresh > 0) n.fresh -= 1 / 60;
      glowWorld(n.x, n.y - 6, 12 + (n.fresh > 0 ? 8 * n.fresh : 0), k.color, 0.16 + Math.sin(this.t * 3 + n.x * 0.1) * 0.05);
      drawShadow(n.x, n.y, sp.w * 0.28 * scale);
      drawSprite(frameAt(sp, this.t), n.x, n.y, { ax: sp.ax, ay: sp.ay, scale });
      const ns = worldToScreen(n.x, n.y - sp.h * scale - 2);
      uiText(k.label, ns.x, ns.y, { size: 10 * S, align: 'center', color: k.color, weight: '700' });
      if (this.nearNpc === n) { const ps = worldToScreen(n.x, n.y + 8); uiText('按 E', ps.x, ps.y, { size: 10 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
  },
  drawShopPanel() {
    const L = this.shopLayout(); const S = L.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.66));
    uiRect(L.x, L.y, L.w, L.h, withAlpha('#161a30', 0.98), { radius: 10 * S, stroke: P.shardD, lw: 2 });
    uiText('魂 晶 商 店', L.x + 22 * S, L.y + 30 * S, { size: 18 * S, color: '#fff', weight: '900' });
    const ssp = getSprite('shard'); drawSpriteUI(ssp.frames[0], L.x + L.w - 156 * S, L.y + 12 * S, 2 * S);
    uiText(String(this.run.shards), L.x + L.w - 132 * S, L.y + 30 * S, { size: 16 * S, color: P.shardL, weight: '800' });
    uiRect(L.close.x, L.close.y, L.close.w, L.close.h, withAlpha('#3a2030', 0.9), { radius: 6 * S, stroke: P.redD, lw: 2 });
    uiText('✕', L.close.x + L.close.w / 2, L.close.y + L.close.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '900' });
    uiText('裝備鐵砧（三選一）', L.gearX, L.top - 14 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    uiText('能力值鐵砧（三選一）', L.anvilX, L.top - 14 * S, { size: 13 * S, color: P.shardL, weight: '800' });
    uiText('鍛造鐵砧後三選一：史詩/稜彩裝備，或能力值強化', L.x + L.w / 2, L.y + 56 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    const buyCard = (c, title, sub, price, accent) => {
      const hover = inside(mx, my, c), afford = this.run.shards >= price;
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover ? accent : P.ink2, lw: hover ? 3 : 2 });
      uiText(title, c.x + 10 * S, c.y + 22 * S, { size: 13 * S, color: '#fff', weight: '800' });
      uiText(sub, c.x + 10 * S, c.y + 40 * S, { size: 10 * S, color: P.gray4 });
      uiText('魂晶 ' + price, c.x + c.w - 10 * S, c.y + c.h - 9 * S, { size: 12 * S, align: 'right', color: afford ? accent : P.redL, weight: '800' });
    };
    buyCard(L.gearBuyCard, '鍛造裝備鐵砧', '三選一 史詩/稜彩裝備' + (this.gearBuys ? '　已鍛 ×' + this.gearBuys : ''), this.gearPrice(), P.goldL);
    buyCard(L.anvilBuyCard, '鍛造能力值鐵砧', '三選一 能力值強化' + (this.anvilBuys ? '　已鍛 ×' + this.anvilBuys : ''), this.anvilPrice(), P.shardL);
    uiText('點擊購買　·　B / Esc 關閉', L.x + L.w / 2, L.y + L.h - 13 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    if (this.shopFlashT > 0) { this.shopFlashT -= 1 / 60; uiText(this.shopFlash, L.x + L.w / 2, L.y + L.h - 30 * S, { size: 12 * S, align: 'center', color: P.redL, weight: '800' }); }
    // the paused 3-choice overlay — stat or gear (#3 / C1)
    if (this.shopChoice && L.choiceCards) {
      const gear = this.shopChoice.kind === 'gear';
      uiRect(L.x, L.y, L.w, L.h, withAlpha('#0b0d1a', 0.76), { radius: 10 * S });
      uiText(gear ? '選擇一件裝備' : '選擇一項能力值強化', view.W / 2, L.choiceCards[0].y - 22 * S, { size: 16 * S, align: 'center', color: gear ? P.goldL : P.shardL, weight: '900' });
      for (const c of L.choiceCards) {
        const hover = inside(mx, my, c); const o = c.opt;
        const rar = gear ? RARITY[rarityOf(o)].accent : P.shardL;   // R17/5.1: 白/藍/紫/黃
        uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2840', 0.98), { radius: 8 * S, stroke: hover ? rar : withAlpha(rar, 0.5), lw: hover ? 3 : 2 });
        if (gear) {
          const sp = getSprite(iconOr(o.icon, 'equip_leather_armor'));
          drawSpriteUI(sp.frames[0], c.x + c.w / 2 - 16 * S, c.y + 12 * S, (32 * S) / sp.w);
          const slotName = o.slot === 'weapon' ? '專武' : o.slot === 'armor' ? '護甲' : '飾品';
          uiText(o.name + ' · ' + slotName, c.x + c.w / 2, c.y + 56 * S, { size: 12.5 * S, align: 'center', color: rar, weight: '800' });
          const nLines = this.wrapText(o.desc || '', c.x + c.w / 2, c.y + 74 * S, c.w - 16 * S, 10.5 * S, P.gray4);
          // 原#1/#4: before/after diff vs the current item in this slot
          this.drawEquipDiff(c.x + 10 * S, c.y + 80 * S + nLines * 13 * S, c.w - 20 * S, o, S, { title: '替換後', lw: c.w - 78 * S, max: 5 });
        } else {
          uiText('⚒', c.x + c.w / 2, c.y + 24 * S, { size: 22 * S, align: 'center', color: P.shardL, weight: '900' });   // 4.18: stat-anvil emblem
          uiText(o.name, c.x + c.w / 2, c.y + 48 * S, { size: 13 * S, align: 'center', color: '#fff', weight: '800' });
          this.wrapText(o.desc, c.x + c.w / 2, c.y + 68 * S, c.w - 16 * S, 11 * S, P.emberL);
        }
      }
      // 4.18: skip the roll (Esc also works) — you keep nothing but aren't forced into a bad pick
      const sk = this.shopSkipRect(L), skh = inside(mx, my, sk);
      uiRect(sk.x, sk.y, sk.w, sk.h, withAlpha(skh ? '#3a2030' : '#241620', 0.96), { radius: 7 * S, stroke: skh ? P.redL : withAlpha(P.redL, 0.5), lw: 1.5 });
      uiText('跳過（放棄此次鍛造）', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: skh ? '#fff' : P.gray3, weight: '700' });
    }
  },
  drawShopCard(c, kind, mx, my, S) {
    const hover = inside(mx, my, c);
    if (kind === 'gear') {
      const o = c.offer; const afford = this.run.shards >= o.price;
      const rar = RARITY[rarityOf(o.def)].accent;   // R17/5.1: 白/藍/紫/黃 (exclusive = 傳說金)
      uiRect(c.x, c.y, c.w, c.h, withAlpha(o.bought ? '#1c2c1c' : '#1b2138', 0.96), { radius: 7 * S, stroke: o.bought ? P.ink2 : hover ? rar : withAlpha(rar, 0.55), lw: hover ? 3 : 2 });
      const sp = getSprite(iconOr(o.def.icon, 'equip_leather_armor'));
      drawSpriteUI(sp.frames[0], c.x + 6 * S, c.y + 6 * S, (26 * S) / sp.w);
      uiText(o.def.name, c.x + 38 * S, c.y + 18 * S, { size: 12 * S, color: o.bought ? P.gray3 : rar, weight: '800' });
      this.clipShop(o.def.desc || '', c.x + 38 * S, c.y + 32 * S, c.w - 46 * S, 10 * S);
      uiText(o.bought ? '已購買' : ('魂晶 ' + o.price), c.x + c.w - 8 * S, c.y + c.h - 7 * S, { size: 11 * S, align: 'right', color: o.bought ? P.greenL : afford ? P.shardL : P.redL, weight: '800' });
    } else {
      const a = c.anvil; const price = Math.round(a.price * Math.pow(1.3, a.buys || 0)); const afford = this.run.shards >= price;
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover ? P.shardL : P.ink2, lw: hover ? 3 : 2 });
      uiText(a.name + (a.buys ? ' ×' + a.buys : ''), c.x + 10 * S, c.y + 18 * S, { size: 12 * S, color: '#fff', weight: '800' });
      this.clipShop(a.desc, c.x + 10 * S, c.y + 32 * S, c.w - 18 * S, 10 * S);
      uiText('魂晶 ' + price, c.x + c.w - 8 * S, c.y + c.h - 7 * S, { size: 11 * S, align: 'right', color: afford ? P.shardL : P.redL, weight: '800' });
    }
  },
  clipShop(str, x, y, maxw, size) {
    let s = str; while (s.length > 1 && textWidth(s, size, '500') > maxw) s = s.slice(0, -1);
    if (s.length < str.length && s.length > 1) s = s.slice(0, -1) + '…';
    uiText(s, x, y, { size, color: P.gray4, weight: '500' });
  },

  drawStageHud() {
    const S = uiScale();
    const diffLabel = this.endless ? '無盡挑戰' : (this.storyMode ? '劇情' : '難度 ' + (this.run.difficulty || 1));   // 6.5/6.6
    const et = this.run.time || 0, em = Math.floor(et / 60), es = Math.floor(et % 60);   // 4.11: 已遊玩時間
    uiText(`${this.map.biome.name} · ${diffLabel} · 威脅 ${this.threat} · ⏱ ${em}:${es.toString().padStart(2, '0')}`, view.W / 2, 24 * S, { size: 15 * S, align: 'center', color: '#fff', weight: '800' });
    let label, hot = false;
    if (this.endless) {   // 6.6: wave count + next-boss countdown (no clear/Reaper)
      const wv = this.endlessWave + 1, nextAt = (this.endlessWave + 1) * BALANCE.ENDLESS_BOSS_INTERVAL;
      const r = Math.max(0, nextAt - this.run.time), mm = Math.floor(r / 60), ss = Math.floor(r % 60);
      label = `第 ${wv} 波　·　距首領 ${mm}:${ss.toString().padStart(2, '0')}`; hot = this.boss;
    }
    else if (this.reaperRef && !this.reaperRef.dead) { label = '☠ 死神戰'; hot = true; }
    else if (this.cleared) { const rem = Math.max(0, Math.ceil(this.reaperAt - this.run.time)); label = this.reaperSpawned ? '☠ 死神戰' : `通關！死神 ${rem}s　·　按 E 離場`; hot = true; }
    else if (this.finalBoss) { label = '最終決戰！'; hot = true; }
    else {
      const nextMini = this.miniIdx < BALANCE.MINIBOSS_TIMES.length ? BALANCE.MINIBOSS_TIMES[this.miniIdx] : null;
      const tgt = nextMini != null ? nextMini : LEVEL_TIME;
      const r = Math.max(0, tgt - this.run.time), mm = Math.floor(r / 60), ss = Math.floor(r % 60);
      label = (nextMini != null ? '距小王 ' : '距最終首領 ') + `${mm}:${ss.toString().padStart(2, '0')}`;
    }
    uiText(label, view.W / 2, 42 * S, { size: 13 * S, align: 'center', color: hot ? P.redL : P.gray3, weight: '700' });
    if (this.boss && this.bossRef && !this.bossRef.dead) {
      const bw = Math.min(360 * S, view.W * 0.5);
      uiText((this.reaperRef && this.bossRef === this.reaperRef ? '☠ ' : this.finalBoss ? '★ ' : '') + this.bossRef.def.name, view.W / 2, 56 * S, { size: 13 * S, align: 'center', color: P.redL, weight: '800' });
      uiBar(view.W / 2 - bw / 2, 64 * S, bw, 9 * S, this.bossRef.hp / this.bossRef.maxHp, { fg: P.red, bg: '#2a0e14', border: P.ink, glow: true });
    } else if (this.activeTypes && this.activeTypes.length) {
      uiText('當前敵潮：' + this.activeTypes.map((d) => d.name).join('、'), view.W / 2, 54 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    }
  },

  // ---- info: hover tooltips + Tab build panel (R11) ------------------------
  drawInfo() {
    if (this.choice || this.equipChoice || this.eventChoice || this.dead || this.paused || settingsUI.open) return;
    const S = uiScale();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (this.showBuild) {
      this.drawBuildPanel(S);
      let hb = null;
      for (const ic of (this.buildIcons || [])) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hb = ic;
      if (hb) this.drawTooltip(hb, mx, my, S);
      return;
    }
    let hov = null;
    for (const ic of hudIcons) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hov = ic;
    if (hov) { this.drawTooltip(hov, mx, my, S); return; }
    // 原#8: hover over a world interactable (chest / well / soul / shrine / ground loot) to see its name + effect
    const wi = this.hoverWorldInfo(mx, my, S);
    if (wi) this.drawWorldTip(wi, mx, my, S);
    else uiText('Tab：build　·　B：商店　·　M：放大地圖' + (this.fusionReady ? '　·　✦ 可合成' : ''), view.W - 12 * S, view.H - 10 * S, { size: 10 * S, align: 'right', color: withAlpha(this.fusionReady ? P.goldL : '#fff', this.fusionReady ? 0.7 : 0.28) });
  },
  // 原#8: nearest hoverable world interactable to the cursor (screen-space hit test)
  hoverWorldInfo(mx, my, S) {
    const cands = [];
    for (const n of (this.npcs || [])) if (!n.used) cands.push({ x: n.x, y: n.y, name: n.kind === 'well' ? '祈願水井' : n.kind === 'shard' ? '魂晶礦脈' : n.kind === 'forge' ? '流浪鐵匠' : '迷途之魂', desc: n.kind === 'well' ? '飲下祝福，永久獲得一項隨機能力提升。' : n.kind === 'shard' ? '敲取魂晶礦，獲得大量魂晶。' : n.kind === 'forge' ? '流浪鐵匠免費替你打造一件裝備。' : '回收散落的魂力：金幣、經驗與生命。', color: n.kind === 'well' ? P.shardL : n.kind === 'forge' ? P.emberL : P.manaL });
    if (this.shrinePos && !this.shrineUsed) cands.push({ x: this.shrinePos.x, y: this.shrinePos.y, name: '祝福神龕', desc: '一次性祈福：隨機能力提升並獲得魂晶。', color: P.shardL });
    for (const pk of this.world.pickups) {
      if (pk.dead) continue;
      if (pk.type === 'chest' && (!pk.hidden || pk.revealed)) cands.push({ x: pk.x, y: pk.y, name: '寶箱', desc: '開啟可得裝備、道具或魂晶。', color: P.goldL });
      else if (pk.type === 'equip' && pk.def) cands.push({ x: pk.x, y: pk.y, name: pk.def.name + '（裝備）', desc: pk.def.desc || '', color: P.goldL });
      else if (pk.type === 'item' && pk.def) cands.push({ x: pk.x, y: pk.y, name: pk.def.name + '（道具）', desc: pk.def.desc || '', color: P.emberL });
    }
    let best = null, bd = (26 * S) * (26 * S);
    for (const c of cands) { const ss = worldToScreen(c.x, c.y); const d = (ss.x - mx) ** 2 + (ss.y - my) ** 2; if (d < bd) { bd = d; best = c; } }
    return best;
  },
  drawWorldTip(info, mx, my, S) {
    const W = 196 * S; const lines = []; let line = '';
    for (const ch of (info.desc || '')) { if (textWidth(line + ch, 10.5 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (28 + lines.length * 13) * S;
    let x = mx + 16 * S, y = my + 10 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.96), { radius: 6 * S, stroke: info.color || P.shardL, lw: 2 });
    uiText(info.name, x + 8 * S, y + 17 * S, { size: 12 * S, color: '#fff', weight: '800' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 31 * S + i * 13 * S, { size: 10.5 * S, color: P.gray4, weight: '500' }));
  },
  // 8.2: a coloured tag badge that doubles as the 羈絆 icon (gold=achieved / blue=接近 / gray=未達成).
  drawBondBadge(x, y, sz, b, pg, S) {
    const achieved = pg.level >= 1, near = !achieved && pg.count >= 1;
    const bg = achieved ? withAlpha(P.gold, 0.92) : near ? withAlpha('#28304e', 0.95) : withAlpha('#191c2c', 0.9);
    uiRect(x, y, sz, sz, bg, { radius: 4 * S, stroke: achieved ? P.goldL : near ? P.shardL : P.ink2, lw: 1.5 });
    uiText(b.tag, x + sz / 2, y + sz / 2 + 0.5 * S, { size: sz * 0.5, align: 'center', baseline: 'middle', color: achieved ? '#1a1404' : near ? '#dfe6ff' : P.gray3, weight: '900' });
    if (achieved) uiText(String(pg.level), x + sz - 1.5 * S, y + sz - 0.5 * S, { size: sz * 0.34, align: 'right', color: '#2a1d00', weight: '900', shadow: false });
  },
  // 8.2: rich 羈絆 hover tooltip — name, 需求, and every tier's effect (reached = bright).
  drawBondTooltip(ic, mx, my, S) {
    const b = ic.bond, pg = ic.prog || bondProgress(b, this.run, this.player);
    const achieved = pg.level >= 1;
    const W = 236 * S, H = (50 + b.tiers.length * 14) * S;
    let x = mx + 14 * S, y = my + 6 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: achieved ? P.goldL : P.shardL, lw: 2 });
    const tagCY = y + 8 * S + 9 * S;   // #8: vertical centre of the 18×18 tag box — name & tier align to it
    uiRect(x + 8 * S, y + 8 * S, 18 * S, 18 * S, withAlpha(achieved ? P.gold : '#2a2f4a', 0.95), { radius: 4 * S });
    uiText(b.tag, x + 17 * S, tagCY, { size: 11 * S, align: 'center', baseline: 'middle', color: achieved ? '#1a1404' : P.gray3, weight: '900' });
    uiText(b.name, x + 32 * S, tagCY, { size: 13 * S, baseline: 'middle', color: '#fff', weight: '800' });
    uiText('第 ' + pg.level + ' / ' + pg.max + ' 階', x + W - 8 * S, tagCY, { size: 10 * S, align: 'right', baseline: 'middle', color: achieved ? P.goldL : P.gray3, weight: '700' });
    uiText('需求：' + b.goal, x + 8 * S, y + 36 * S, { size: 10 * S, color: P.gray3, weight: '600' });
    b.tiers.forEach((t, k) => {
      const reached = pg.level >= k + 1, ty = y + 50 * S + k * 14 * S;
      uiText((reached ? '✓ ' : '· ') + '第 ' + (k + 1) + ' 階（達成 ' + t.at + '）', x + 8 * S, ty, { size: 9.5 * S, color: reached ? '#dfe6ff' : P.gray3, weight: '700' });
      uiText(t.bonusDesc, x + W - 8 * S, ty, { size: 9.5 * S, align: 'right', color: reached ? P.emberL : P.gray2, weight: '700' });
    });
  },
  drawTooltip(ic, mx, my, S) {
    if (ic.kind === 'bond') return this.drawBondTooltip(ic, mx, my, S);
    if (ic.kind === 'pickup') return this.drawPickupTooltip(ic, mx, my, S);
    if (ic.kind === 'patron') return this.drawPatronTooltip(ic, mx, my, S);
    const def = ic.def; if (!def) return;
    const accent = ic.kind === 'weapon' ? P.shardL : ic.kind === 'ability' ? (def.cursed ? P.redL : P.manaL) : ic.kind === 'equip' ? P.goldL : P.emberL;
    const sub = ic.kind === 'weapon' ? (def.evolved ? '★ 進化武器' : '武器 Lv.' + ic.level)
      : ic.kind === 'ability' ? ((def.cursed ? '詛咒被動' : '被動') + ' Lv.' + ic.level)
      : ic.kind === 'equip' ? ('裝備 · ' + (def.slot === 'weapon' ? '專武' : def.slot === 'armor' ? '護甲' : '飾品'))
      : ('道具 ' + (ic.slot || ''));
    const desc = (ic.kind === 'weapon' && def.levelDesc) ? def.levelDesc(ic.level) : (def.desc || '');
    // 10.4 (hover): a weapon's evolution path is shown here, on hover, instead of an always-on line.
    let evo = null;
    if (ic.kind === 'weapon' && !def.evolved && def.evolveInto) {
      const target = Weapons.get(def.evolveInto), req = def.evolveReq;
      const hasReq = !req || (this.run.abilityLevels && this.run.abilityLevels[req] > 0);
      const maxed = (ic.level || 1) >= weaponMaxLevel(def);
      const reqName = req ? ((Abilities.get(req) && Abilities.get(req).name) || req) : null;
      const ready = maxed && hasReq;
      evo = { text: '↓ 進化：' + (target ? target.name : '???') + (reqName ? '（需 ' + reqName + ' ' + (hasReq ? '✓' : '✗') + '）' : '') + (ready ? '　★ 即將進化！' : (maxed ? '' : ' · 需滿級')), col: ready ? P.goldL : (hasReq ? P.shardL : P.gray3) };
    } else if (ic.kind === 'weapon' && !def.evolved) {
      evo = { text: '（此武器無進化路線）', col: P.gray2 };
    }
    let W = 210 * S; const lines = []; let line = '';
    for (const ch of desc) { if (textWidth(line + ch, 11 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    if (evo) W = Math.max(W, textWidth(evo.text, 10 * S, '700') + 16 * S);   // widen for a long evolution line
    const H = (34 + lines.length * 14) * S + (evo ? 16 * S : 0);
    let x = mx + 14 * S, y = my + 6 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: accent, lw: 2 });
    uiText(def.name || ic.id || '?', x + 8 * S, y + 16 * S, { size: 13 * S, color: RARITY[rarityOf(def)].accent, weight: '800' });   // R17/5.1: name reads its rarity
    uiText(sub, x + W - 8 * S, y + 16 * S, { size: 10 * S, align: 'right', color: accent, weight: '700' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 32 * S + i * 14 * S, { size: 11 * S, color: P.gray4, weight: '500' }));
    if (evo) uiText(evo.text, x + 8 * S, y + 32 * S + lines.length * 14 * S, { size: 10 * S, color: evo.col, weight: '700' });
  },
  drawBuildPanel(S) {
    const w = Math.min(view.W * 0.9, 640 * S), h = Math.min(view.H * 0.86, 500 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const bandTop = y + h - 108 * S;   // 8.2: reserved area for the 羈絆 three-state band
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.66));
    uiRect(x, y, w, h, withAlpha('#161a30', 0.98), { radius: 10 * S, stroke: P.ink2, lw: 2 });
    uiText('當前 BUILD', x + w / 2, y + 26 * S, { size: 18 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('Tab 關閉　·　滑鼠移到圖示看說明', x + w / 2, y + 44 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    this.buildIcons = [];
    const sz = 30 * S, gap = 6 * S;
    const head = (t, xx, yy, c, extra, ecol) => { uiText(t, xx, yy, { size: 13 * S, color: c, weight: '800' }); if (extra) uiText(extra, xx + textWidth(t, 13 * S, '800') + 10 * S, yy, { size: 11 * S, color: ecol || P.gray3, weight: '700' }); };
    const cell = (bx, by, sp, stroke, badge, bcol) => { uiRect(bx, by, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke, lw: 2 }); drawSpriteUI(sp.frames[0], bx + 3 * S, by + 3 * S, (sz - 6 * S) / sp.w); if (badge) uiText(badge, bx + sz - 3 * S, by + sz - 3 * S, { size: 9 * S, align: 'right', color: bcol, weight: '800' }); };
    // left column: weapons + passives
    const colL = x + 24 * S; let yL = y + 70 * S;
    const wCount = this.player.weapons.filter((w) => !w.def.equipped).length;
    head('武器', colL, yL, P.shardL, wCount + ' / ' + MAX_WEAPONS, wCount >= MAX_WEAPONS ? P.redL : P.gray3); yL += 14 * S;
    this.player.weapons.forEach((inst, i) => {
      const bx = colL + i * (sz + gap);
      cell(bx, yL, getSprite(iconOr(inst.def.icon, 'weapon_w_soulbolt')), inst.def.evolved ? P.goldL : P.ink2, inst.def.evolved ? '★' : 'L' + inst.level, inst.def.evolved ? P.goldL : P.shardL);
      this.buildIcons.push({ x: bx, y: yL, w: sz, h: sz, kind: 'weapon', def: inst.def, level: inst.level });
    });
    yL += sz + 18 * S;   // 10.4: per-weapon evolution path now shown in the hover tooltip (drawTooltip), not as an always-on line
    const abils = this.run.abilities || [];
    head('被動', colL, yL, P.manaL, abils.length + ' / ' + MAX_PASSIVES, abils.length >= MAX_PASSIVES ? P.redL : P.gray3); yL += 14 * S;
    const perRow = 7;
    abils.slice(0, MAX_PASSIVES).forEach((id, i) => {
      const bx = colL + (i % perRow) * (sz + gap), by = yL + Math.floor(i / perRow) * (sz + gap);
      const a = Abilities.get(id); const stk = this.run.abilityLevels?.[id] || 1;
      cell(bx, by, getSprite(iconOr('ability_' + id, 'ability_power')), a && a.cursed ? P.redL : P.ink2, stk > 1 ? '×' + stk : '', P.goldL);
      if (a) this.buildIcons.push({ x: bx, y: by, w: sz, h: sz, kind: 'ability', id, def: a, level: stk });
    });
    // right column: equipment + stats
    const colR = x + w * 0.56; let yR = y + 70 * S;
    head('裝備', colR, yR, P.goldL); yR += 16 * S;
    const eq = this.run.equipment || {};
    [['weapon', '專武'], ['armor', '護甲'], ['trinket', '飾品']].forEach(([slot, label], i) => {
      const bx = colR + i * (sz + 18 * S);
      const id = eq[slot]; const d = id && Equipment.get(id);
      if (d) { cell(bx, yR, getSprite(iconOr(d.icon, 'equip_leather_armor')), P.goldL, '', ''); this.buildIcons.push({ x: bx, y: yR, w: sz, h: sz, kind: 'equip', def: d }); }
      else { uiRect(bx, yR, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke: P.ink2, lw: 2 }); uiText('—', bx + sz / 2, yR + sz / 2 + 4 * S, { size: 12 * S, align: 'center', color: P.gray2 }); }
      uiText(label, bx + sz / 2, yR + sz + 11 * S, { size: 9 * S, align: 'center', color: P.gray3 });
    });
    yR += sz + 32 * S;
    head('數值', colR, yR, P.emberL); yR += 16 * S;
    const st = this.player.stats;
    const stats = [['生命', Math.round(this.player.hp) + ' / ' + this.player.maxHp], ['傷害', '×' + st.damageMult.toFixed(2)], ['射速', '×' + st.fireRateMult.toFixed(2)], ['暴擊', Math.round(st.critChance * 100) + '%'], ['暴傷', '×' + (st.critMult || 2).toFixed(1)], ['移速', Math.round(st.speed)], ['減傷', String(st.defense || 0)], ['閃避', Math.round((st.dodge || 0) * 100) + '%'], ['吸血', Math.round((st.lifesteal || 0) * 100) + '%'], ['幸運', (st.luck || 0).toFixed(2)]];
    for (const [k, v] of stats) { if (yR > bandTop - 8 * S) break; uiText(k, colR, yR, { size: 11.5 * S, color: P.gray3, weight: '500' }); uiText(v, x + w - 24 * S, yR, { size: 11.5 * S, align: 'right', color: '#fff', weight: '700' }); yR += 15 * S; }
    // 8.2 羈絆可見化：底部全寬三態總覽（金=已達成含階級 / 白=接近 / 灰=未達成）
    uiRect(x + 18 * S, bandTop, w - 36 * S, Math.max(1, S), withAlpha(P.ink2, 0.9));
    const pgList = BONDS.map((b) => bondProgress(b, this.run, this.player));   // live → header count + grid glyphs always agree (checkBonds is throttled)
    const achieved = BONDS.map((b, i) => ({ b, pg: pgList[i] })).filter((o) => o.pg.level >= 1);   // Tab 只列「已達成」
    head('羈絆', colL, bandTop + 16 * S, P.goldL, achieved.length + ' / ' + BONDS.length, P.gray3);
    if (!achieved.length) { uiText('尚未觸發任何羈絆 — 湊齊特定武器／被動組合即可啟動', colL, bandTop + 38 * S, { size: 10 * S, color: P.gray2, weight: '600' }); }
    else {
      const cols = 3, cellW = (w - 48 * S) / cols, gy = bandTop + 36 * S, rowH = 18 * S, bsz = 15 * S;
      achieved.forEach((o, i) => {
        const b = o.b, pg = o.pg;
        const cx2 = colL + (i % cols) * cellW, ry = gy + Math.floor(i / cols) * rowH, by = ry - bsz + 2 * S;
        this.drawBondBadge(cx2, by, bsz, b, pg, S);
        let nm = b.name + ' ' + pg.level + '/' + pg.max + '階';
        while (nm.length > 1 && textWidth(nm, 10 * S, '700') > cellW - bsz - 10 * S) nm = nm.slice(0, -1);
        uiText(nm, cx2 + bsz + 5 * S, ry, { size: 10 * S, color: P.goldL, weight: '700' });
        this.buildIcons.push({ x: cx2, y: by, w: cellW - 4 * S, h: rowH, kind: 'bond', bond: b, prog: pg });
      });
    }
  },

  drawBanner() {
    if (this.bannerT <= 0) return;
    const S = uiScale(); const a = Math.min(1, this.bannerT);
    uiText(this.banner, view.W / 2, view.H * 0.2, { size: 28 * S, align: 'center', color: withAlpha('#ffe9a0', a), weight: '900', shadowColor: withAlpha('#000', a * 0.8) });
  },
  // G3: a cinematic letterbox recounting the current story chapter at run start
  drawStory() {
    const S = uiScale(); const st = this.story;
    const a = Math.min(1, Math.min((st.dur - st.t) / 0.6, st.t / 1.0));   // fade in 0.6s / out 1s
    if (a <= 0) return;
    const bandH = view.H * 0.34, by = view.H * 0.5 - bandH / 2;
    uiRect(0, by, view.W, bandH, withAlpha('#05060c', 0.82 * a));
    uiRect(0, by, view.W, 2 * S, withAlpha(P.shardL, 0.5 * a));
    uiRect(0, by + bandH - 2 * S, view.W, 2 * S, withAlpha(P.shardL, 0.5 * a));
    uiText(st.chapter ? ('第 ' + ((META.questIndex || 0) + 1) + ' 章') : (st.who || '角色'), view.W / 2, by + 22 * S, { size: 12 * S, align: 'center', color: withAlpha(P.shardL, a), weight: '700' });
    uiText(st.title, view.W / 2, by + 44 * S, { size: 24 * S, align: 'center', color: withAlpha(P.goldL, a), weight: '900', shadowColor: withAlpha('#000', a) });
    const reveal = Math.floor(Math.min(st.text.length, (st.dur - st.t) / 0.03));   // typewriter reveal
    this.wrapText(st.text.slice(0, reveal), view.W / 2, by + 76 * S, view.W * 0.7, 14 * S, withAlpha('#d8e0f0', a));
    if (st.quote) uiText('「' + st.quote + '」　— ' + (st.who || ''), view.W / 2, by + bandH - 34 * S, { size: 12.5 * S, align: 'center', color: withAlpha(P.shardL, a * 0.95), weight: '700' });   // 角色劇情: signature battle quote
    uiText('按 空白鍵 跳過', view.W / 2, by + bandH - 14 * S, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.4 * a) });
  },

  // ---- hidden dev cheat panel (F2) ----------------------------------------
  cheatButtons() {
    const S = uiScale();
    const w = 98 * S, h = 22 * S, gap = 5 * S, x = view.W - w - 8 * S;
    let y = 122 * S;
    const items = [
      { id: 'god', label: (Cheats.godmode ? '✓ ' : '') + '無敵' },
      { id: 'fast', label: (Cheats.fast ? '✓ ' : '') + '加速 ×3' },
      { id: 'gold', label: '+金幣/魂晶' },
      { id: 'level', label: '升等' },
      { id: 'spawn', label: '刷怪' },
      { id: 'kill', label: '殺光雜兵' },
      { id: 'unlock', label: '解鎖全部' },
      { id: 'clear', label: '強制通關' },
    ];
    return items.map((it) => { const r = { ...it, x, y, w, h }; y += h + gap; return r; });
  },
  cheatInput() {
    if (!mouse.justDown) return;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const b of this.cheatButtons()) if (inside(mx, my, b)) { this.doCheat(b.id); break; }
  },
  doCheat(id) {
    Sfx.play('uiClick');
    const w = this.world;
    if (id === 'god') Cheats.godmode = !Cheats.godmode;
    else if (id === 'fast') Cheats.fast = !Cheats.fast;
    else if (id === 'gold') { this.run.gold += 1000; this.run.shards += 100; this.banner = '作弊：+1000 金幣 / +100 魂晶'; this.bannerT = 1.4; }
    else if (id === 'level') { this.levelQueue++; }
    else if (id === 'spawn') { for (let i = 0; i < 8; i++) w.spawnRing(this.pickSpawnType(), { hpScale: this.diffMul, dmgScale: this.diffMul }); }
    else if (id === 'kill') { for (const e of w.enemies) if (!e.boss) e.dead = true; this.banner = '作弊：清場'; this.bannerT = 1.2; }
    else if (id === 'unlock') { cheatUnlockAll(META); saveMeta(); this.banner = '作弊：已解鎖全部內容與關卡'; this.bannerT = 1.6; }
    else if (id === 'clear') { if (!this.cleared) this.clearLevel(); }
  },
  drawCheatPanel() {
    const S = uiScale();
    if (Cheats.toast > 0) uiText('☠ 開發者模式 ' + (Cheats.enabled ? '開啟' : '關閉'), view.W / 2, view.H * 0.12, { size: 18 * S, align: 'center', color: P.goldL, weight: '900' });
    if (!Cheats.enabled) return;
    const btns = this.cheatButtons();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiText('☠ DEV', btns[0].x + btns[0].w / 2, btns[0].y - 9 * S, { size: 10 * S, align: 'center', color: P.redL, weight: '800' });
    for (const b of btns) {
      const hov = inside(mx, my, b);
      const on = (b.id === 'god' && Cheats.godmode) || (b.id === 'fast' && Cheats.fast);
      uiRect(b.x, b.y, b.w, b.h, withAlpha(on ? '#2a5a3a' : (hov ? '#3a2a4a' : '#1a1430'), 0.95), { radius: 5 * S, stroke: on ? P.greenL : hov ? P.goldL : P.ink2, lw: 1.5 });
      uiText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700' });
    }
  },

  drawWon() {
    const S = uiScale(); const a = Math.min(0.9, this.deathT * 0.9);
    uiRect(0, 0, view.W, view.H, withAlpha('#0b1a0d', a));
    if (this.deathT < 0.3) return;
    const cx = view.W / 2;
    uiText('關 卡 通 關！', cx, view.H * 0.11, { size: 36 * S, align: 'center', color: P.goldL, weight: '900' });
    const idx = BIOMES.findIndex((b) => b.id === this.run.biomeId);
    const nextName = idx >= 0 && idx + 1 < BIOMES.length ? BIOMES[idx + 1].name : null;
    const lines = [
      `${this.map.biome.name} · 難度 ${this.run.difficulty || 1} 通關　·　擊殺 ${this.run.kills}　·　分數 ${this.run.score}`,
      this.reaperSlain ? '☠ 斬殺死神！傳說獎勵已入袋' : '死神未斬 — 下次留下迎戰可得傳說獎勵',
      (nextName ? `★ 解鎖新關卡：${nextName}　` : '★ 已是最深關卡　') + `· 難度 ${(this.run.difficulty || 1) + 1} 已解鎖　· 帶回 ${goldStr(this.run.gold)}`,   // R17/10.2 wording
    ];
    lines.forEach((l, i) => uiText(l, cx, view.H * 0.11 + (40 + i * 20) * S, { size: 13 * S, align: 'center', color: i === 1 ? (this.reaperSlain ? P.goldL : P.gray3) : '#d8e8d0', weight: i === 2 ? '800' : '600' }));
    if (this.run.bankRepaid > 0) uiText('🏦 銀行還款 -' + goldStr(this.run.bankRepaid) + (META.bank && META.bank.debt > 0 ? '（尚欠 ' + goldStr(META.bank.debt) + '）' : ''), cx, view.H * 0.11 + (40 + lines.length * 20) * S, { size: 12 * S, align: 'center', color: P.emberL, weight: '700' });   // 7.2
    this.drawResultSummary(view.H * 0.28);
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', cx, view.H * 0.95, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },

  drawDeath() {
    const S = uiScale(); const a = Math.min(0.88, this.deathT * 0.9);
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', a));
    if (this.deathT < 0.3) return;
    const cx = view.W / 2;
    uiText('探 索 結 束', cx, view.H * 0.11, { size: 36 * S, align: 'center', color: P.redL, weight: '900' });
    const mins = Math.floor(this.run.time / 60), secs = Math.floor(this.run.time % 60);
    const lines = [
      `抵達威脅 ${this.run.stage}　·　存活 ${mins}:${secs.toString().padStart(2, '0')}　·　擊殺 ${this.run.kills}`,
      `本局分數 ${this.run.score}` + (this.run.score >= (META.stats.bestScore || 0) ? '　★ 新紀錄！' : `（最佳 ${META.stats.bestScore || 0}）`) + `　·　帶回 ${goldStr(this.run.gold)}`,
    ];
    lines.forEach((l, i) => uiText(l, cx, view.H * 0.11 + (40 + i * 20) * S, { size: 13 * S, align: 'center', color: i === 1 ? P.goldL : '#d8def0', weight: i === 1 ? '800' : '600' }));
    if (this.run.bankRepaid > 0) uiText('🏦 銀行還款 -' + goldStr(this.run.bankRepaid) + (META.bank && META.bank.debt > 0 ? '（尚欠 ' + goldStr(META.bank.debt) + '）' : ''), cx, view.H * 0.11 + (40 + lines.length * 20) * S, { size: 12 * S, align: 'center', color: P.emberL, weight: '700' });   // 7.2
    this.drawResultSummary(view.H * 0.26);
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', cx, view.H * 0.95, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },

  // 原#1/#13/#16: results-screen build (hover for details) + damage ranking + bonds + unlocks
  drawResultSummary(topY) {
    const S = uiScale();
    const w = Math.min(view.W * 0.94, 720 * S), h = Math.min(view.H * 0.62, 430 * S);   // R17/1.6: taller — sections breathe
    const x = (view.W - w) / 2, y = topY;
    uiRect(x, y, w, h, withAlpha('#0e1322', 0.92), { radius: 8 * S, stroke: P.ink2, lw: 2 });
    // R17/1.6: one shared rhythm for the whole left column — header → HEAD_DROP → icon rows → SEC_GAP
    const sz = 26 * S, gap = 6 * S, SEC_GAP = 16 * S, HEAD_DROP = 13 * S;
    this.resultIcons = [];
    const cell = (bx, by, sp, stroke, badge, bcol) => { uiRect(bx, by, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke, lw: 2 }); drawSpriteUI(sp.frames[0], bx + 3 * S, by + 3 * S, (sz - 6 * S) / sp.w); if (badge) uiText(badge, bx + sz - 3 * S, by + sz - 3 * S, { size: 9 * S, align: 'right', color: bcol, weight: '800' }); };
    // LEFT — build (hover any icon for its effect)
    const colL = x + 18 * S; let yL = y + 24 * S;
    uiText('本局配置', colL, yL, { size: 13 * S, color: P.shardL, weight: '800' });
    uiText('滑鼠移到圖示看效果', colL + 86 * S, yL, { size: 9.5 * S, color: P.gray3 }); yL += SEC_GAP;
    uiText('武器', colL, yL, { size: 10 * S, color: P.gray3 }); yL += HEAD_DROP;
    this.player.weapons.forEach((inst, i) => { const bx = colL + i * (sz + gap); cell(bx, yL, getSprite(iconOr(inst.def.icon, 'weapon_w_soulbolt')), inst.def.evolved ? P.goldL : P.ink2, inst.def.evolved ? '★' : 'L' + inst.level, inst.def.evolved ? P.goldL : P.shardL); this.resultIcons.push({ x: bx, y: yL, w: sz, h: sz, kind: 'weapon', def: inst.def, level: inst.level }); });
    yL += sz + SEC_GAP;
    const abils = this.run.abilities || [];
    uiText('被動 ×' + abils.length, colL, yL, { size: 10 * S, color: P.manaL }); yL += HEAD_DROP;
    const per = 8; abils.slice(0, 16).forEach((id, i) => { const bx = colL + (i % per) * (sz + gap), by = yL + Math.floor(i / per) * (sz + gap); const ab = Abilities.get(id); const stk = (this.run.abilityLevels && this.run.abilityLevels[id]) || 1; cell(bx, by, getSprite(iconOr('ability_' + id, 'ability_power')), ab && ab.cursed ? P.redL : P.ink2, stk > 1 ? '×' + stk : '', P.goldL); if (ab) this.resultIcons.push({ x: bx, y: by, w: sz, h: sz, kind: 'ability', id, def: ab, level: stk }); });
    yL += (Math.ceil(Math.min(abils.length, 16) / per) || 1) * (sz + gap) - gap + SEC_GAP;
    const eq = this.run.equipment || {};
    uiText('裝備', colL, yL, { size: 10 * S, color: P.goldL }); yL += HEAD_DROP;   // R17/1.6: own row, same rhythm as the others
    [['weapon'], ['armor'], ['trinket']].forEach(([slot], i) => { const bx = colL + i * (sz + gap); const d = eq[slot] && Equipment.get(eq[slot]); if (d) { cell(bx, yL, getSprite(iconOr(d.icon, 'equip_leather_armor')), P.goldL, '', ''); this.resultIcons.push({ x: bx, y: yL, w: sz, h: sz, kind: 'equip', def: d }); } else { uiRect(bx, yL, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke: P.ink2, lw: 1 }); uiText('—', bx + sz / 2, yL + sz / 2 + 4 * S, { size: 11 * S, align: 'center', color: P.gray2 }); } });
    yL += sz + SEC_GAP;
    // bonds (原#13 + 8.2: 圖示徽章 + hover 看各階效果)
    const bonds = activeBonds(this.run);
    if (bonds.length) {
      uiText('羈絆', colL, yL, { size: 10 * S, color: P.goldL, weight: '800' }); yL += HEAD_DROP;
      const bsz = 18 * S, bgap = 4 * S, bx0 = colL, maxX = colL + w * 0.46;
      let bx = bx0, by = yL;
      for (const gb of bonds) {
        if (bx + bsz > maxX) { bx = bx0; by += bsz + bgap; }
        const pg = bondProgress(gb.bond, this.run, this.player);
        this.drawBondBadge(bx, by, bsz, gb.bond, pg, S);
        this.resultIcons.push({ x: bx, y: by, w: bsz, h: bsz, kind: 'bond', bond: gb.bond, prog: pg });
        bx += bsz + bgap;
      }
      yL = by + bsz + SEC_GAP;
    }
    // RIGHT — damage ranking (原#16)
    const colR = x + w * 0.47; let yR = y + 24 * S; const rw = w * 0.5 - 18 * S;
    uiText('傷害排行', colR, yR, { size: 13 * S, color: P.emberL, weight: '800' });
    uiText('來源 · 佔比', x + w - 18 * S, yR, { size: 9.5 * S, align: 'right', color: P.gray3 }); yR += 18 * S;
    const dmgEntries = Object.entries(this.run.dmgBySource || {}).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
    const total = dmgEntries.reduce((s, e) => s + e[1], 0) || 1;
    const maxV = dmgEntries.length ? dmgEntries[0][1] : 1;
    const fmtDmg = (v) => v >= 10000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v));
    if (!dmgEntries.length) uiText('（本局無傷害紀錄）', colR, yR, { size: 11 * S, color: P.gray3 });
    dmgEntries.slice(0, 9).forEach(([name, v], i) => {
      if (yR > y + h - 30 * S) return;
      const frac = v / maxV, pct = Math.round((v / total) * 100);
      const rankCol = i === 0 ? P.goldL : i === 1 ? P.shardL : i === 2 ? P.emberL : '#cfd6ee';
      uiRect(colR, yR + 2 * S, rw, 13 * S, withAlpha('#15192c', 0.85), { radius: 3 * S });
      uiRect(colR, yR + 2 * S, rw * frac, 13 * S, withAlpha(rankCol, 0.3), { radius: 3 * S });
      uiText((i + 1) + '. ' + name, colR + 5 * S, yR + 11 * S, { size: 10.5 * S, color: '#fff', weight: i === 0 ? '800' : '600' });
      uiText(fmtDmg(v) + ' · ' + pct + '%', colR + rw - 5 * S, yR + 11 * S, { size: 10 * S, align: 'right', color: rankCol, weight: '700' });
      yR += 17 * S;
    });
    // unlocks — bottom strip
    const un = this.newlyUnlocked || [], nc = this.newCharacters || [];
    let oy = y + h - 40 * S;
    uiText('★ 本局解鎖', colL, oy, { size: 12 * S, color: P.goldL, weight: '800' }); oy += 15 * S;
    const items = [];
    for (const ac of un) items.push('成就「' + (ac.realName || ac.name) + '」' + (ac.rewardLabel ? ' → ' + ac.rewardLabel : ''));
    for (const c of nc) items.push('角色「' + c.name + '」');
    if (!items.length) uiText('（本局沒有新解鎖）', colL + 4 * S, oy, { size: 11 * S, color: P.gray3 });
    else { items.slice(0, 2).forEach((t, i) => this.clipShop(t, colL + 4 * S, oy + i * 13 * S, w - 40 * S, 11 * S)); if (items.length > 2) uiText('…等 ' + items.length + ' 項', x + w - 18 * S, oy, { size: 10 * S, align: 'right', color: P.gray3 }); }
    // hover tooltip over any build icon (原#16: 滑鼠看效果)
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    let hov = null; for (const ic of this.resultIcons) if (inside(mx, my, ic)) hov = ic;
    if (hov) this.drawTooltip(hov, mx, my, S);
  },

  wrapText(str, cx, y, maxw, size, color = '#c8cfe8') {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '600') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.forEach((l, i) => uiText(l, cx, y + i * (size + 3), { size, align: 'center', color, weight: '600' }));
    return lines.length;
  },

  // 8.2 羈絆可見化：找出「選這張卡會推進哪些羈絆」(TFT 式)，依接近完成度排序。
  bondHintsFor(choice) {
    const out = [];
    for (const b of BONDS) {
      const h = bondAdvancedBy(b, choice, this.run, this.player);
      if (h) out.push({ b, h, prog: bondProgress(b, this.run, this.player) });
    }
    out.sort((a, x) => (x.h.toLevel - a.h.toLevel) || (x.prog.count - a.prog.count));
    return out;
  },
  // Draw the 羈絆 detail block pinned to the bottom of a choice card.
  drawCardBonds(r, oy, S, hints) {
    if (!hints.length) return;
    const top = hints[0], b = top.b, h = top.h, pg = top.prog;
    const innerW = r.w - 24 * S;
    if (r.h < 190 * S) {   // tiny card: one-line compact hint, avoids overlapping the name
      const by = r.y + oy + r.h - 18 * S;
      uiRect(r.x + 6 * S, by, r.w - 12 * S, 16 * S, withAlpha('#0c0e1a', 0.94), { radius: 5 * S, stroke: withAlpha(P.goldL, 0.7), lw: 1 });
      let s = '★ ' + b.name + ' 第' + h.toLevel + '/' + h.max + '階 · ' + (h.crosses ? '解鎖 ' : '推進 ') + (h.toward ? h.toward.bonusDesc : '');
      while (s.length > 2 && textWidth(s, 9 * S, '700') > r.w - 18 * S) s = s.slice(0, -1);
      uiText(s, r.x + r.w / 2, by + 8 * S, { size: 9 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '700' });
      return;
    }
    const lines = 3 + (hints.length > 1 ? 1 : 0);   // name+tier / parts-or-count / toward-effect / (+others)
    const blockH = 9 * S + lines * 13 * S;
    const by = r.y + oy + r.h - blockH - 7 * S;
    uiRect(r.x + 6 * S, by, r.w - 12 * S, blockH, withAlpha('#0c0e1a', 0.94), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.7), lw: 1.5 });
    let y = by + 12 * S;
    uiText('★ ' + b.name, r.x + 12 * S, y, { size: 11 * S, color: P.goldL, weight: '900' });
    uiText('第 ' + h.toLevel + ' / ' + h.max + ' 階', r.x + r.w - 12 * S, y, { size: 9.5 * S, align: 'right', color: P.gold, weight: '800' });
    y += 14 * S;
    if (pg.parts && pg.parts.length) {                 // 組合型：逐件 ✓ / ▶(此選項填上) / ·
      let px = r.x + 12 * S;
      for (const p of pg.parts) {
        const fill = p.label === h.fillsPart;
        const txt = (fill ? '▶' : (p.ok ? '✓' : '·')) + p.label;
        const tw = textWidth(txt, 9.5 * S, '700');
        if (px + tw > r.x + r.w - 12 * S) { uiText('…', px, y, { size: 9.5 * S, color: P.gray3, weight: '700' }); break; }
        uiText(txt, px, y, { size: 9.5 * S, color: fill ? P.goldL : (p.ok ? P.greenL : P.gray2), weight: '700' });
        px += tw + 7 * S;
      }
    } else {                                            // 數量型：進度 X → X+1（下一階需 Y）
      const next = pg.nextTier ? '（下一階需 ' + pg.nextTier.at + '）' : '（已滿階）';
      uiText('進度 ' + pg.count + ' → ' + (pg.count + 1) + ' ' + next, r.x + 12 * S, y, { size: 9.5 * S, color: P.gray4, weight: '700' });
    }
    y += 13 * S;
    let eff = (h.crosses ? '解鎖 ' : '推進 ') + (h.toward ? h.toward.bonusDesc : '');
    while (eff.length > 2 && textWidth(eff, 10 * S, '800') > innerW) eff = eff.slice(0, -1);
    uiText(eff, r.x + 12 * S, y, { size: 10 * S, color: h.crosses ? P.emberL : P.shardL, weight: '800' });
    y += 13 * S;
    if (hints.length > 1) uiText('＋ 另推進 ' + (hints.length - 1) + ' 個羈絆', r.x + r.w / 2, y, { size: 9 * S, align: 'center', color: P.gray3, weight: '700' });
  },

  // 4.19: while choosing, TAB shows the current build (read-only) over the choice.
  drawChoicePeekBuild() {
    const S = uiScale(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    this.drawBuildPanel(S);
    let hb = null;
    for (const ic of (this.buildIcons || [])) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hb = ic;
    if (hb) this.drawTooltip(hb, mx, my, S);
    uiText('TAB 返回選擇強化', view.W / 2, 16 * S, { size: 13 * S, align: 'center', color: P.goldL, weight: '800' });
  },
  drawChoice() {
    const S = uiScale();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.8));
    const rects = this.cardRects();
    uiText('選 擇 強 化', view.W / 2, rects[0].y - 28 * S, { size: 26 * S, align: 'center', color: P.manaL, weight: '900' });
    uiText('點擊卡片或按 1 / 2 / 3　·　★ 金框＝可推進羈絆　·　TAB 查看 build', view.W / 2, rects[0].y - 8 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    rects.forEach((r, i) => {
      const c = this.choice.options[i]; const st = choiceStyle(c); const hover = this.choice.hover === i;
      const hints = (this.choice.bondHints && this.choice.bondHints[i]) || this.bondHintsFor(c);
      const oy = hover ? -8 * S : 0;
      const stroke = hover ? st.accent : (hints.length ? withAlpha(P.goldL, 0.85) : P.ink2);
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha(st.bg, 0.97), { radius: 9 * S, stroke, lw: hover ? 3 : (hints.length ? 2.5 : 2) });
      uiClipRound(r.x, r.y + oy, r.w, r.h, 9 * S, () => uiRect(r.x, r.y + oy, r.w, 5 * S, st.accent));   // #7: rarity bar clipped to the card's rounded corners
      const tc = st.tagCol || st.accent;                                 // rarity pill uses the RARITY colour (普通灰/稀有紫/史詩金)
      const pw = textWidth(st.tag, 10 * S, '800') + 14 * S;              // rarity pill
      uiRect(r.x + r.w - pw - 8 * S, r.y + oy + 10 * S, pw, 16 * S, withAlpha(tc, 0.22), { radius: 8 * S, stroke: tc, lw: 1 });
      uiText(st.tag, r.x + r.w - pw / 2 - 8 * S, r.y + oy + 18 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: tc, weight: '800' });
      if (hints.length) uiText('★', r.x + r.w / 2, r.y + oy + 14 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '900' });
      const sp = getSprite(iconOr(st.icon, c.kind === 'ability' ? 'ability_power' : 'weapon_w_soulbolt')); const isc = (r.w * 0.42) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 20 * S, isc);
      const midY = r.y + oy + 20 * S + sp.h * isc;
      uiText(st.sub, r.x + r.w / 2, midY + 12 * S, { size: 11 * S, align: 'center', color: st.accent, weight: '800' });
      uiText(c.def.name, r.x + r.w / 2, midY + 31 * S, { size: 15.5 * S, align: 'center', color: '#fff', weight: '800' });
      let dy = midY + 49 * S;
      if (st.effect) { const n = this.wrapText(st.effect, r.x + r.w / 2, dy, r.w - 22 * S, 12 * S, P.emberL); dy += n * (12 * S + 3) + 5 * S; }
      this.wrapText(st.desc || '', r.x + r.w / 2, dy, r.w - 22 * S, 11.5 * S, P.gray4);
      // R17/5.1: type pill top-left (1·武器 / 2·被動 / 升級 / 合成 / 詛咒) — replaces the bare hotkey digit
      const ti = CHOICE_TYPE[st.type] || CHOICE_TYPE.ability;
      const tlab = (i + 1) + '·' + ti.label;
      const tpw = textWidth(tlab, 10 * S, '800') + 14 * S;
      uiRect(r.x + 8 * S, r.y + oy + 10 * S, tpw, 16 * S, withAlpha(ti.col, 0.2), { radius: 8 * S, stroke: ti.col, lw: 1 });
      uiText(tlab, r.x + 8 * S + tpw / 2, r.y + oy + 18 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: ti.col, weight: '800' });
      this.drawCardBonds(r, oy, S, hints);   // 8.2: bond breakdown at the card bottom
    });
  },
};

refs.run = runScene;
