// run/lifecycle.js — lifecycle methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { BIOMES } from '../../../art/biomes.js';
import { Music, Sfx } from '../../../engine/audio.js';
import { TAU, clamp, dist, rng } from '../../../engine/math.js';
import { P } from '../../../engine/palette.js';
import { addShake, camera } from '../../../engine/renderer.js';
import { Net } from '../../../net/api.js';
import { BALANCE } from '../../balance.js';
import { biomeWeight } from '../../content/biome_tags.js';
import { applyDailyMutators } from '../../content/daily.js';
import { exclusiveFor } from '../../content/exclusives.js';
import { HIDDEN_ROOMS } from '../../content/hidden.js';
import { heroLore } from '../../content/lore.js';
import { STORY_QUESTS } from '../../content/quests.js';
import { markSeen } from '../../content/codex.js';
import { Characters, Enemies, Equipment } from '../../content/registry.js';
import { isUnlocked } from '../../content/unlocks.js';
import { generateWorld } from '../../maps.js';
import { Player } from '../../player.js';
import { META, newRun } from '../../state.js';
import { TS, World } from '../../world.js';
import { FINAL_BOSS, REAPER_ID } from './shared.js';

export const lifecycleMixin = {
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
    this.leaveConfirm = false; this._lastKeys = 0;   // R17 QA: singleton scene — stale _lastKeys from a prior run suppressed the key banner
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
    // R20/B5: new event roster state (kamikaze squad / cross-mines / boulder lanes / treasure goblin)
    this.evtBombers = []; this.evtBombs = []; this.evtBoulders = []; this.evtLanes = []; this.evtGoblin = null;
    this.nextEventAt = BALANCE.SURROUND_PERIOD[0];   // first event time from config (was hardcoded 40)

    // difficulty scaling + finale (final boss -> killable Reaper, E2)
    const D = this.run.difficulty == null ? 1 : this.run.difficulty;
    this.storyMode = D <= 0;   // 6.5 劇情難度
    this.endless = this.run.mode === 'endless';   // 6.6 無盡挑戰
    this.endlessWave = 0;
    // R18/B7: endless curse accumulators (consumed at the spawn paths). curses[] = chosen ids.
    this.curses = []; this.curseChoice = null; this.nextCurseAt = BALANCE.CURSE_INTERVAL;
    this.curseHpMul = 1; this.curseDmgMul = 1; this.curseSpdMul = 1; this.curseCapAdd = 0; this.curseBossHpMul = 1;
    this.curseBossHeal = 0; this.curseBossChest = false; this.curseDrain = false; this.curseDrainTimer = 30;
    this.run.curseGoldPerKill = 0;
    this.milestoneIdx = 0;   // next ENDLESS_MILESTONES index
    // R18/B9 daily-challenge mutators: neutral defaults (consumed at the spawn/price/tempo paths),
    // then applied once for mode==='daily'. Most mutators reuse the B7 curse accumulators above.
    this.dailyEliteMul = 1; this.dailyTwinBoss = false; this.dailyVolatile = 0; this.dailyShopMul = 1;
    this.dailyBossDmgMul = 1; this.dailyBossDropMul = 1; this.dailyTempoMul = 1; this.dailyFog = false;
    this.world.aimMul = 1;
    this.petId = META.pet || null; this.petState = { x: null, y: null, t: 0, bob: 0 };   // R18/B10 cosmetic pet (local player only)
    if (this.run.mode === 'daily') { try { applyDailyMutators(this); } catch (e) { console.warn('daily mutators', e); } }
    this.diffMul = this.storyMode ? BALANCE.STORY_DIFF_MUL : (1 + (D - 1) * 0.35);
    // P1-2 輔助模式：lock the enemy hp/dmg/speed mults onto the run at start (mid-run setting
    // changes only take effect next run). Co-op forces 1× so an assist host can't skew a shared
    // board. run.assist (any mult < 1) is the single gate that skips leaderboard upload.
    const A = META.assist || {};
    this.run.assistHpMul = this.coop ? 1 : (A.hp || 1);
    this.run.assistDmgMul = this.coop ? 1 : (A.dmg || 1);
    this.run.assistSpeedMul = this.coop ? 1 : (A.speed || 1);
    this.run.assist = !this.coop && (this.run.assistHpMul < 1 || this.run.assistDmgMul < 1 || this.run.assistSpeedMul < 1);
    if (this.storyMode) {   // weak enemies + generous loot, almost unloseable
      this.run.dropQuality = (this.run.dropQuality || 0) + BALANCE.STORY_DROP_QUALITY;
      if (this.player) this.player.stats.luck = (this.player.stats.luck || 0) + BALANCE.STORY_LUCK_BONUS;
    }
    this.finalZone = null; this.finalBoss = false; this.finalBossRef = null;
    this.cleared = false; this.won = false; this.bigMap = false; this.buildIcons = [];
    this.reaperAt = 0; this.reaperSpawned = false; this.reaperRef = null; this.reaperSlain = false; this.banked = false;

    Music.setBiome(map.biome.id); Music.setHero(this.run.characterId);
    Music.setMode('run');
    this.banner = map.biome.name + ' · ' + (this.storyMode ? '劇情' : '難度 ' + this.run.difficulty) + (this.run.assist ? ' · 輔助' : '');
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
    // D4: ranged (shooter) types are far less likely to be picked — favour melee.
    // R18/B4: biome affinity leans the roster toward the current biome's theme.
    const wt = (x) => (x.ai === 'shooter' ? (x.weight ?? 1) * BALANCE.RANGED_SPAWN_WEIGHT : (x.weight ?? 1)) * biomeWeight(x, this.run.biomeId);
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
    const dmgScale = (1.2 + this.threat * 0.10) * this.diffMul * this.dailyBossDmgMul;  // bal: boss bite escalates with threat (R18/B9 m_frenzy ×dmg)
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 170, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 170, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 10);
    this.bossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    if (this.dailyTwinBoss) {   // R18/B9 m_twin: a second mini-boss of the same kind escorts it
      let tx = this.player.x, ty = this.player.y, tr = 0;
      do { const a = rng.next() * TAU; tx = clamp(this.player.x + Math.cos(a) * 200, TS * 2, this.world.pxW - TS * 2); ty = clamp(this.player.y + Math.sin(a) * 200, TS * 2, this.world.pxH - TS * 2); tr++; } while (this.world.solidAt(tx, ty) && tr < 10);
      this.world.spawnEnemy(def, tx, ty, { hpScale: hpScale * 0.85, dmgScale, quiet: true });
    }
    this.boss = true; this.bossDead = false;
    this.banner = `小王 ${this.miniIdx}／${BALANCE.MINIBOSS_TIMES.length}：${def.name || 'BOSS'} 現身！`; this.bannerT = 3.0;
    addShake(8); Sfx.play('boss'); Music.setMode('miniboss');
  },
  onBossDead(e) {
    this.boss = false; this.bossDead = true; this.bossRef = null;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
    this.run.miniKills = (this.run.miniKills || 0) + 1;
    if (e.def && e.def.boss) markSeen('boss', e.def.id);   // P1 內容圖鑑
    this.banner = '擊敗小王！'; this.bannerT = 2.6; addShake(6);
    this.world.addPickup('heart', this.player.x, this.player.y, 30);
    // R18/B7 endless curses (fire on every boss-wave kill)
    if (this.curseBossHeal > 0 && this.player) this.player.heal(this.player.maxHp * this.curseBossHeal);   // c_brittle
    if (this.curseBossChest) { this.world.addPickup('gold', this.player.x + 24, this.player.y, 120); this.world.addPickup('shard', this.player.x - 24, this.player.y, 15); }   // c_tyrant: extra loot
    if (this.dailyBossDropMul > 1) { this.world.addPickup('gold', this.player.x + 18, this.player.y - 12, Math.round(90 * (this.dailyBossDropMul - 1))); this.world.addPickup('shard', this.player.x - 18, this.player.y - 12, Math.round(12 * (this.dailyBossDropMul - 1))); }   // R18/B9 m_frenzy: doubled boss loot

    Music.setMode('run');
    this.openEventChoice();   // 原#3: mini-boss drops a 3-of-N event choice
  },
};
