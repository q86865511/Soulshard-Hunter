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
import { Enemies, Equipment, Abilities } from '../content/registry.js';
import { equipItem } from '../content/equipment.js';
import { BALANCE } from '../balance.js';
import {
  camera, clear, vignette, uiText, uiRect, uiScale, view, addShake, drawSpriteUI, textWidth,
  drawSprite, drawShadow, glowWorld, worldToScreen, fillRectWorld, uiBar, setShakeScale,
  fillCircleWorld, strokeCircleWorld,
} from '../../engine/renderer.js';
import { drawHud, drawLowHpWarning, hudIcons } from '../hud.js';
import { pressed, mouse } from '../../engine/input.js';
import { rng, dist, clamp, TAU } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { getRunChoices, applyChoice, choiceStyle, fusionAvailable, MAX_WEAPONS, MAX_PASSIVES } from '../progression.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

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
const FINAL_BOSS = { crypt: 'g_plagueheart', cavern: 'g_stormtyrant', frost: 'b2_glacierseer', inferno: 'b2_emberlord', void: 'b2_voidweaver' };
const REAPER_ID = 'reaper';

export const runScene = {
  enter(payload) {
    this.run = payload.run || newRun();
    this.run.time = 0;
    this.run.stage = 1; this.run.floor = 1;
    this.world = new World(this.run);
    this.player = null;
    this.t = 0; this.dead = false; this.deathT = 0;
    this.levelQueue = this.run.startBonusLevels || 0;
    this.choice = null; this.banner = ''; this.bannerT = 0;
    this.paused = false;
    this.world.onPlayerDeath = () => this.onDeath();
    this.world.onLevelUp = () => this.onLevelUp();
    this.world.onEnemyKilled = (e) => {
      if (e === this.finalBossRef) this.onBigBossDead(e);
      else if (e === this.reaperRef) this.onReaperDead(e);
      else if (e.boss) this.onBossDead(e);
    };
    this.buildWorld();
  },

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
    this.aimCamera(); camera.x = camera.targetX; camera.y = camera.targetY;

    // chests / hidden chest / in-run shop shrine
    for (const c of map.chests) this.world.addPickup('chest', c.x, c.y, 2);
    if (map.secret) this.world.addPickup('chest', map.secret.x, map.secret.y, 3, { hidden: true });
    this.shrinePos = null; this.shopOpen = false; this.nearShrine = false; this.shopFlashT = 0;
    if (map.shrine) this.setupShrine(map.shrine);
    this.npcs = (map.npcs || []).map((n) => ({ ...n })); this.nearNpc = null;   // E1 interactive NPCs

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
    this.nextEventAt = 40;

    // difficulty scaling + finale (final boss -> killable Reaper, E2)
    this.diffMul = 1 + (Math.max(1, this.run.difficulty || 1) - 1) * 0.35;
    this.finalZone = null; this.finalBoss = false; this.finalBossRef = null;
    this.cleared = false; this.won = false; this.bigMap = false; this.buildIcons = [];
    this.reaperAt = 0; this.reaperSpawned = false; this.reaperRef = null; this.reaperSlain = false; this.banked = false;

    Music.setBiome(map.biome.id); Music.setHero(this.run.characterId);
    Music.setMode('run');
    this.banner = map.biome.name + ' · 難度 ' + (this.run.difficulty || 1);
    this.bannerT = 2.6;
  },

  tierCapNow() { return Math.min(4, 1 + Math.floor(this.threat / 2)); },

  // choose 1-3 enemy types for the current wave window; rotates over time
  rotateTypes() {
    const pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID);
    if (!pool.length) { this.activeTypes = []; this.typeRotT = 24; return; }
    const n = this.threat <= 1 ? 1 + rng.int(0, 1) : 1 + rng.int(0, 2);
    const picks = []; let p = pool.slice();
    // D4: ranged (shooter) types are far less likely to be picked — favour melee
    const wt = (x) => (x.ai === 'shooter' ? (x.weight ?? 1) * BALANCE.RANGED_SPAWN_WEIGHT : (x.weight ?? 1));
    for (let i = 0; i < n && p.length; i++) { const d = rng.weighted(p, wt); picks.push(d); p = p.filter((x) => x !== d); }
    this.activeTypes = picks;
    this.typeRotT = 30 + rng.next() * 18;
    if (this.run.time > 3) { this.banner = '敵潮更替：' + picks.map((d) => d.name).join('、'); this.bannerT = 2.0; }
  },

  setupShrine(pos) {
    this.shrinePos = pos;
    this.shopGear = this.rollShopGear();
    this.anvilBuys = 0; this.anvilChoice = null;
  },
  rollShopGear() {
    // tier >= 2 gear, incl. weapon-slot "signature weapons" (now real auto-fire weapons)
    const pool = Equipment.all().filter((d) => (d.tier ?? 1) >= 2);
    const src = (pool.length ? pool : Equipment.all()).slice();
    const offers = [];
    for (let i = 0; i < 4 && src.length; i++) {
      const d = src.splice(rng.int(0, src.length - 1), 1)[0];
      offers.push({ def: d, price: Math.round((d.price || 60) * BALANCE.GEAR_MARKUP), bought: false });
    }
    return offers;
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
    } else {   // lost soul — resources
      const g = 30 + this.threat * 6;
      this.run.gold += g; this.world.gainXp(20 + this.threat * 4); this.player.heal(20);
      this.banner = `迷途之魂：+${g} 金幣・經驗・生命`; this.bannerT = 2.4;
      this.world.particles.ring(n.x, n.y, P.manaL, 18, 110);
    }
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
    const dmgScale = (1.2 + this.threat * 0.05) * this.diffMul;
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 170, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 170, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 10);
    this.bossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.boss = true; this.bossDead = false;
    this.banner = `小王 ${this.miniIdx}／${BALANCE.MINIBOSS_TIMES.length}：${def.name || 'BOSS'} 現身！`; this.bannerT = 3.0;
    addShake(8); Sfx.play('boss'); Music.setMode('boss');
  },
  onBossDead(e) {
    this.boss = false; this.bossDead = true; this.bossRef = null;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
    this.banner = '擊敗小王！'; this.bannerT = 2.6; addShake(6);
    this.world.addPickup('heart', this.player.x, this.player.y, 30);
    Music.setMode('run');
  },

  // ---- finale: final boss at 20:00 -> clear -> killable Reaper +30s (E2) ----
  finalTick(dt) {
    const t = this.run.time;
    if (!this.finalBoss && !this.cleared && t >= LEVEL_TIME) this.spawnFinalBoss();
    if (this.cleared && !this.reaperSpawned && t >= this.reaperAt) this.spawnReaper();
  },
  spawnFinalBoss() {
    let def = Enemies.get(FINAL_BOSS[this.run.biomeId]);
    if (!def) { let bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID && !this.usedMiniBosses.includes(d.id)); if (!bs.length) bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID); def = bs.length ? bs[rng.int(0, bs.length - 1)] : null; }
    if (!def) { this.clearLevel(); return; }
    const hpScale = (4 + this.threat * 0.6) * this.diffMul;
    const dmgScale = (1.4 + this.threat * 0.05) * this.diffMul;
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
    this.banner = '關卡通關！死神將在 ' + BALANCE.REAPER_DELAY + ' 秒後降臨 — 按 E 離場，或留下迎戰'; this.bannerT = 5.0;
    this.world.addPickup('heart', this.player.x, this.player.y, 60);
    addShake(8); Sfx.play('levelup'); Music.setMode('run');
  },
  spawnReaper() {
    this.reaperSpawned = true;
    const def = Enemies.get(REAPER_ID);
    if (!def) return;
    const hpScale = (4.5 + this.threat * 0.55) * this.diffMul;
    const dmgScale = (1.6 + this.threat * 0.05) * this.diffMul;
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 220, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 220, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 12);
    this.reaperRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.bossRef = this.reaperRef; this.boss = true;
    this.banner = '☠ 死神降臨！斬殺祂以證明你的力量'; this.bannerT = 4.0;
    addShake(12); Sfx.play('boss'); Music.setMode('boss');
  },
  onReaperDead(e) {
    this.boss = false; this.reaperRef = null; this.reaperSlain = true;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
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
    Music.stop(); if (won) { addShake(8); Sfx.play('levelup'); }
    if (!this.banked) { this.banked = true; bankRun(this.run); }
  },

  // ---- special harasser events: mushrooms / surround ring (D2) / Higgs (D3) -
  eventsTick() {
    if (this.boss || this.finalBoss || this.cleared) return;
    if (this.run.time >= this.nextEventAt) {
      this.triggerEvent();
      this.nextEventAt = this.run.time + (34 + rng.next() * 26) * BALANCE.SPECIAL_EVENT_FREQ_MULT;
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
  // D2: a clump of VERY tanky monsters rings the player and closes in (their chase
  // AI naturally collapses the ring). Killable — carve a gap and dash out.
  evSurround() {
    if (this.surround) return;
    let pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID && (d.ai === 'chase' || d.ai === 'charger' || d.ai === 'wander'));
    if (!pool.length) pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID);
    if (!pool.length) return;
    const def = pool[rng.int(0, pool.length - 1)];
    const n = BALANCE.SURROUND_COUNT_BASE + Math.floor(this.threat / 2);
    const hpScale = BALANCE.SURROUND_HP_MULT * (1 + this.threat * 0.12) * this.diffMul;
    const dmgScale = BALANCE.SURROUND_DMG_MULT * this.diffMul;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng.next() * 0.1;
      const x = clamp(this.player.x + Math.cos(a) * BALANCE.SURROUND_RADIUS, TS * 2, this.world.pxW - TS * 2);
      const y = clamp(this.player.y + Math.sin(a) * BALANCE.SURROUND_RADIUS, TS * 2, this.world.pxH - TS * 2);
      if (this.world.solidAt(x, y)) continue;
      const e = this.world.spawnEnemy(def, x, y, { hpScale, dmgScale, quiet: true });
      if (e) { e.tint = P.purpleL; e.surround = true; ring.push(e); }
    }
    this.surround = { enemies: ring, t: BALANCE.SURROUND_LIFE };
    this.banner = '包圍！厚血怪向內收攏——清出缺口突圍'; this.bannerT = 3.2; Sfx.play('boss'); addShake(5);
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
          this.evtStrikes.push({ x, y, t: 1.0, max: 1.0, r: BALANCE.HIGGS_RADIUS, dmg: BALANCE.HIGGS_DMG + Math.min(this.threat, 12) });
        }
      }
      if (this.higgs.t <= 0) this.higgs = null;
    }
    if (this.surround) {
      this.surround.t -= dt;
      this.surround.enemies = this.surround.enemies.filter((e) => e && !e.dead);
      if (this.surround.t <= 0 || !this.surround.enemies.length) this.surround = null;
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
      let cx = 0, cy = 0, k = 0;
      for (const e of this.surround.enemies) { cx += e.x; cy += e.y; k++; }
      cx /= k; cy /= k;
      strokeCircleWorld(cx, cy, 30, withAlpha(P.purpleL, 0.3 + 0.15 * Math.sin(this.t * 5)), 2);
    }
    for (const s of this.evtStrikes) {
      const k = 1 - clamp(s.t / s.max, 0, 1);
      strokeCircleWorld(s.x, s.y, s.r, withAlpha(P.redL, 0.4 + 0.4 * k), 2);
      fillCircleWorld(s.x, s.y, s.r * k, withAlpha(P.ember, 0.12));
    }
  },

  // continuous spawning from the current 1-3 active enemy types
  spawnTick(dt) {
    if (this.boss || this.finalBoss) return;   // pause the swarm during a boss / the finale
    this.typeRotT -= dt;
    if (this.typeRotT <= 0) this.rotateTypes();
    this.spawnTimer -= dt;
    const t = this.run.time;
    // gentler early cap that ramps with threat + time, so a fresh build has room to
    // level up before the swarm overwhelms it (the late game still gets dense).
    const cap = Math.min(105, 9 + this.threat * 6 + Math.floor(t * 0.05));
    if (this.spawnTimer <= 0 && this.world.enemies.length < cap && this.activeTypes.length) {
      const group = 2 + Math.floor(this.threat / 2);
      // enemy hp/dmg grow with threat + time but the growth is CAPPED (no infinite pile-up);
      // difficulty multiplies on top of the capped growth.
      const tc = Math.min(t, 1200);
      const hpScale = (1 + Math.min(5, (this.threat - 1) * 0.18 + tc * 0.003)) * this.diffMul;
      const dmgScale = (1 + Math.min(2.6, (this.threat - 1) * 0.10 + tc * 0.002)) * this.diffMul;
      for (let i = 0; i < group; i++) {
        const def = this.pickSpawnType();
        const elite = this.threat >= 3 && rng.chance(0.03 + t * 0.0003);
        this.world.spawnRing(def, { hpScale, dmgScale, elite });
      }
      this.spawnTimer = Math.max(0.55, 1.9 - this.threat * 0.06 - t * 0.004);
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
    this.choice = { options, hover: -1 };
  },
  cardRects() {
    const S = uiScale(); const n = this.choice ? this.choice.options.length : 3;
    const cw = Math.min(190 * S, (view.W - 40 * S) / n - 18 * S); const ch = cw * 1.45; const gap = 18 * S;
    const totalW = n * cw + (n - 1) * gap; const x0 = (view.W - totalW) / 2; const y = (view.H - ch) / 2 + 8 * S;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateChoice() {
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
      this.choice = null;
    }
  },

  // ---- death --------------------------------------------------------------
  // If the level was already cleared, dying still shows the victory (banked once).
  onDeath() { this.finishRun(this.cleared); },

  // ---- pause ---------------------------------------------------------------
  pauseLayout() {
    const S = uiScale();
    const w = 240 * S, h = 46 * S, gap = 14 * S;
    const x = view.W / 2 - w / 2, y0 = view.H / 2 - (h * 3 + gap * 2) / 2;
    return { S, resume: { x, y: y0, w, h }, settings: { x, y: y0 + (h + gap), w, h }, quit: { x, y: y0 + (h + gap) * 2, w, h } };
  },
  updatePause() {
    if (pressed('pause') || pressed('escape')) { this.paused = false; return; }
    const L = this.pauseLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (mouse.justDown) {
      if (inside(mx, my, L.resume)) { this.paused = false; Sfx.play('uiClick'); }
      else if (inside(mx, my, L.settings)) settingsUI.show();
      else if (inside(mx, my, L.quit)) this.abandon();
    }
  },
  abandon() {
    this.run.score = Math.floor(this.run.kills * 12 + this.run.stage * 400 + this.run.time);
    META.stats.bestStage = Math.max(META.stats.bestStage || 0, this.run.stage);
    META.stats.bestScore = Math.max(META.stats.bestScore || 0, this.run.score);
    Music.stop(); bankRun(this.run); Sfx.play('portal');
    setScene(refs.hub, {});
  },
  drawPause() {
    const S = uiScale(); const L = this.pauseLayout();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.7));
    uiText('暫 停', view.W / 2, L.resume.y - 36 * S, { size: 30 * S, align: 'center', color: '#fff', weight: '900' });
    const btn = (r, label, col) => {
      const hov = inside(mx, my, r);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? (col || P.shardL) : P.ink2, lw: hov ? 3 : 2 });
      uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
    };
    btn(L.resume, '繼 續');
    btn(L.settings, '設 定');
    btn(L.quit, '放棄並返回城鎮', P.redL);
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (this.dead) {
      this.deathT += dt; this.world.particles.update(dt);
      if (this.deathT > 0.8 && (pressed('space') || pressed('enter') || mouse.justDown)) setScene(refs.hub, {});
      return;
    }
    if (this.paused) { this.updatePause(); return; }
    if (this.choice) { this.updateChoice(); return; }
    if (pressed('pause') || pressed('escape')) { this.paused = true; Sfx.play('uiClick'); return; }
    if (pressed('map')) { this.showBuild = !this.showBuild; Sfx.play('uiClick'); }
    if (pressed('minimap')) { this.bigMap = !this.bigMap; Sfx.play('uiClick'); }
    if (this.showBuild) return;   // freeze the field while reviewing your build
    if (this.shopOpen) { this.updateShopPanel(); return; }   // modal shop also freezes the field

    this.run.time += dt;
    this.threat = 1 + Math.floor(this.run.time / BALANCE.THREAT_PERIOD);   // ~1 -> 13 over the 20-min level
    this.run.stage = this.threat; this.run.floor = this.threat;   // keep loot/score scaling alive
    this.world.threat = this.threat;   // hazards read this to scale (capped)
    // screen shake stays gentle by default, swelling only when near death
    const hpFrac = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    setShakeScale(hpFrac < 0.25 ? 1.0 : 0.42);
    this.world.update(dt);
    this.aimCamera();
    if (this.bannerT > 0) this.bannerT -= dt;

    this.spawnTick(dt);
    this.miniBossTick();
    this.eventsTick();
    this.updateEvents(dt);
    this.finalTick(dt);
    this.nearShrine = !!(this.shrinePos && dist(this.player.x, this.player.y, this.shrinePos.x, this.shrinePos.y) < 20);
    this.nearNpc = null;
    for (const n of this.npcs) { if (!n.used && dist(this.player.x, this.player.y, n.x, n.y) < 22) { this.nearNpc = n; break; } }
    if (this.nearShrine && pressed('interact')) { this.shopOpen = true; Sfx.play('uiClick'); }
    else if (this.nearNpc && pressed('interact')) { this.useNpc(this.nearNpc); }
    else if (this.cleared && pressed('interact')) { this.finishRun(true); return; }   // leave as a win during the Reaper window
    // C2: surface a "can-fuse" hint (without revealing the recipe) on the rising edge
    const fr = fusionAvailable(this.run, this.player);
    if (fr && !this.fusionReady) { this.banner = '✦ 可進行武器合成 — 升級時將出現合成選項'; this.bannerT = 2.8; }
    this.fusionReady = fr;
    if (this.levelQueue > 0 && !this.choice) this.openChoice();
  },

  buildMinimap() {
    const m = this.map; const c = document.createElement('canvas'); c.width = m.tw; c.height = m.th;
    const x = c.getContext('2d');
    for (let ty = 0; ty < m.th; ty++) for (let tx = 0; tx < m.tw; tx++) { x.fillStyle = m.tiles[ty * m.tw + tx] !== 0 ? '#2e3450' : '#171a2c'; x.fillRect(tx, ty, 1, 1); }
    this.minimap = c;
  },
  drawMinimap() {
    if (!this.minimap) return;
    const S = uiScale(); const m = this.map;
    const mw = 132 * S, mh = mw * m.th / m.tw, mx = view.W - mw - 14 * S, my = 84 * S;
    uiRect(mx - 3, my - 3, mw + 6, mh + 6, withAlpha('#0b0d1a', 0.6), { radius: 4 * S, stroke: P.ink2, lw: 2 });
    drawSpriteUI(this.minimap, mx, my, mw / m.tw);
    const pxW = m.tw * TS, pxH = m.th * TS;
    const dot = (wx, wy, col, sz) => { const dx = mx + (wx / pxW) * mw, dy = my + (wy / pxH) * mh; uiRect(dx - sz / 2, dy - sz / 2, sz, sz, col, { radius: sz / 2 }); };
    const en = this.world.enemies;
    for (let i = 0; i < en.length && i < 80; i++) dot(en[i].x, en[i].y, withAlpha(P.red, 0.75), 2 * S);
    for (const pk of this.world.pickups) if (pk.type === 'chest' && (!pk.hidden || pk.revealed)) dot(pk.x, pk.y, P.goldL, 3 * S);
    if (this.shrinePos) dot(this.shrinePos.x, this.shrinePos.y, P.shardL, 3 * S);
    dot(this.player.x, this.player.y, '#ffffff', 4 * S);
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
    const en = this.world.enemies;
    for (let i = 0; i < en.length && i < 200; i++) dot(en[i].x, en[i].y, withAlpha(en[i].boss ? P.redL : P.red, 0.85), (en[i].boss ? 6 : 3) * S);
    for (const pk of this.world.pickups) if (pk.type === 'chest' && (!pk.hidden || pk.revealed)) dot(pk.x, pk.y, P.goldL, 5 * S);
    if (this.shrinePos) dot(this.shrinePos.x, this.shrinePos.y, P.shardL, 5 * S);
    if (this.finalZone) dot(this.finalZone.cx, this.finalZone.cy, P.manaL, 7 * S);
    dot(this.player.x, this.player.y, '#ffffff', 6 * S);
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
    const cardH = 56 * S, gap = 9 * S, top = y + 86 * S;
    const showGear = !this.run.purist;
    const gearCards = [];
    if (showGear) this.shopGear.forEach((offer, i) => gearCards.push({ x: gearX, y: top + i * (cardH + gap), w: colW, h: cardH, offer }));
    const aX = showGear ? anvilX : x + w / 2 - colW / 2;
    const anvilBuyCard = { x: aX, y: top, w: colW, h: cardH * 1.3 };
    // the paused 3-choice overlay shown after buying an anvil (C1)
    let choiceCards = null;
    if (this.anvilChoice) {
      const cw = Math.min(150 * S, (w - 64 * S) / 3), ch = cw * 1.2, cg = 14 * S;
      const totW = 3 * cw + 2 * cg, cx0 = x + (w - totW) / 2, cy = y + h / 2 - ch / 2;
      choiceCards = this.anvilChoice.map((opt, i) => ({ x: cx0 + i * (cw + cg), y: cy, w: cw, h: ch, opt }));
    }
    return { S, x, y, w, h, close, gearCards, anvilBuyCard, choiceCards, gearX, anvilX: aX, colW, top, showGear };
  },
  anvilPrice() { return Math.round(BALANCE.ANVIL_BASE_PRICE * Math.pow(BALANCE.ANVIL_PRICE_GROWTH, this.anvilBuys || 0)); },
  updateShopPanel() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.shopLayout();
    if (this.anvilChoice) {                       // choosing: only the 3 cards are live (game stays paused)
      if (mouse.justDown && L.choiceCards) for (const c of L.choiceCards) if (inside(mx, my, c)) { this.pickAnvil(c.opt); return; }
      return;
    }
    if (pressed('escape') || pressed('interact') || pressed('map')) { this.shopOpen = false; return; }
    if (mouse.justDown) {
      if (inside(mx, my, L.close)) { this.shopOpen = false; return; }
      for (const c of L.gearCards) if (inside(mx, my, c)) { this.buyGear(c.offer); return; }
      if (inside(mx, my, L.anvilBuyCard)) { this.buyAnvil(); return; }
      if (!inside(mx, my, L)) this.shopOpen = false;
    }
  },
  buyGear(offer) {
    if (!offer || offer.bought || this.run.purist) return;
    if (this.run.shards < offer.price) { this.flashShop('魂晶不足'); return; }
    this.run.shards -= offer.price; offer.bought = true; this.run.gearTaken = true;
    equipItem(this.player, this.run, offer.def);
    Sfx.play('equip');
  },
  buyAnvil() {
    const price = this.anvilPrice();
    if (this.run.shards < price) { this.flashShop('魂晶不足'); return; }
    this.run.shards -= price; this.anvilBuys = (this.anvilBuys || 0) + 1;
    const pool = ANVIL_POOL.slice(), pick = [];           // 3 distinct random anvils to choose from
    for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    this.anvilChoice = pick;
    Sfx.play('buy');
  },
  pickAnvil(opt) {
    try { opt.apply(this.player.stats, this.player); } catch (e) { /* */ }
    this.run.anvilCount = (this.run.anvilCount || 0) + 1;
    this.anvilChoice = null; Sfx.play('levelup');
    this.maybeBoon();
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
  render() {
    this.world.draw();
    if (this.shrinePos) this.drawShrine();
    this.drawNpcs();
    this.drawEvents();
    vignette(0.42);
    drawLowHpWarning(this.player, this.t);
    this.world.particles.drawText();
    drawHud(this.run, this.player);
    this.drawStageHud();
    this.drawMinimap();
    this.drawBanner();
    this.drawInfo();
    this.drawBigMinimap();
    if (this.shopOpen) this.drawShopPanel();
    if (this.choice) this.drawChoice();
    if (this.dead) { if (this.won) this.drawWon(); else this.drawDeath(); }
    if (this.paused) this.drawPause();
    settingsUI.draw();
  },

  drawShrine() {
    const p = this.shrinePos; if (!p) return; const S = uiScale();
    const sp = getSprite('hub_altar');
    glowWorld(p.x, p.y - 8, 14, P.shardL, 0.22 + Math.sin(this.t * 3) * 0.06);
    drawShadow(p.x, p.y, sp.w * 0.3);
    drawSprite(frameAt(sp, this.t), p.x, p.y, { ax: sp.ax, ay: sp.ay });
    const ns = worldToScreen(p.x, p.y - sp.h - 4);
    uiText('魂晶商店', ns.x, ns.y, { size: 11 * S, align: 'center', color: P.shardL, weight: '800' });
    if (this.nearShrine && !this.shopOpen) { const ps = worldToScreen(p.x, p.y + 8); uiText('按 E 開啟', ps.x, ps.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
  },
  drawNpcs() {
    if (!this.npcs || !this.npcs.length) return;
    const S = uiScale();
    for (const n of this.npcs) {
      if (n.used) continue;
      const sp = getSprite(n.kind === 'well' ? 'hub_well' : 'wisp');
      glowWorld(n.x, n.y - 6, 12, n.kind === 'well' ? P.shardL : P.manaL, 0.16 + Math.sin(this.t * 3 + n.x * 0.1) * 0.05);
      drawShadow(n.x, n.y, sp.w * 0.28);
      drawSprite(frameAt(sp, this.t), n.x, n.y, { ax: sp.ax, ay: sp.ay });
      const ns = worldToScreen(n.x, n.y - sp.h - 2);
      uiText(n.kind === 'well' ? '祈願水井' : '迷途之魂', ns.x, ns.y, { size: 10 * S, align: 'center', color: n.kind === 'well' ? P.shardL : P.manaL, weight: '700' });
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
    if (L.showGear) uiText('史詩・稜彩裝備', L.gearX, L.top - 14 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    uiText('能力值鐵砧（三選一）', L.anvilX, L.top - 14 * S, { size: 13 * S, color: P.shardL, weight: '800' });
    if (this.run.purist) uiText('純能力值之道：不再販售裝備', L.x + L.w / 2, L.y + 54 * S, { size: 11 * S, align: 'center', color: P.purpleL, weight: '700' });
    else uiText('整局不取裝備、專注鐵砧，或有奇遇…', L.x + L.w / 2, L.y + 54 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    for (const c of L.gearCards) this.drawShopCard(c, 'gear', mx, my, S);
    // anvil purchase card -> opens the paused 3-choice
    { const c = L.anvilBuyCard, hover = inside(mx, my, c), price = this.anvilPrice(), afford = this.run.shards >= price;
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover ? P.shardL : P.ink2, lw: hover ? 3 : 2 });
      uiText('鍛造能力值鐵砧', c.x + 10 * S, c.y + 20 * S, { size: 13 * S, color: '#fff', weight: '800' });
      uiText('購入後三選一強化' + (this.anvilBuys ? '　已鍛 ×' + this.anvilBuys : ''), c.x + 10 * S, c.y + 38 * S, { size: 10 * S, color: P.gray4 });
      uiText('魂晶 ' + price, c.x + c.w - 10 * S, c.y + c.h - 9 * S, { size: 12 * S, align: 'right', color: afford ? P.shardL : P.redL, weight: '800' });
    }
    uiText('點擊購買　·　E / Esc 關閉', L.x + L.w / 2, L.y + L.h - 13 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    if (this.shopFlashT > 0) { this.shopFlashT -= 1 / 60; uiText(this.shopFlash, L.x + L.w / 2, L.y + L.h - 30 * S, { size: 12 * S, align: 'center', color: P.redL, weight: '800' }); }
    // the paused 3-choice overlay (C1)
    if (this.anvilChoice && L.choiceCards) {
      uiRect(L.x, L.y, L.w, L.h, withAlpha('#0b0d1a', 0.74), { radius: 10 * S });
      uiText('選擇一項能力值強化', view.W / 2, L.choiceCards[0].y - 22 * S, { size: 16 * S, align: 'center', color: P.shardL, weight: '900' });
      for (const c of L.choiceCards) {
        const hover = inside(mx, my, c);
        uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2840', 0.98), { radius: 8 * S, stroke: hover ? P.shardL : withAlpha(P.shardL, 0.5), lw: hover ? 3 : 2 });
        uiText(c.opt.name, c.x + c.w / 2, c.y + 26 * S, { size: 13 * S, align: 'center', color: '#fff', weight: '800' });
        this.wrapText(c.opt.desc, c.x + c.w / 2, c.y + 46 * S, c.w - 16 * S, 11 * S, P.emberL);
      }
    }
  },
  drawShopCard(c, kind, mx, my, S) {
    const hover = inside(mx, my, c);
    if (kind === 'gear') {
      const o = c.offer; const afford = this.run.shards >= o.price;
      const rar = (o.def.tier || 1) >= 3 ? P.goldL : (o.def.tier || 1) === 2 ? P.purpleL : P.shardL;
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
    uiText(`${this.map.biome.name} · 難度 ${this.run.difficulty || 1} · 威脅 ${this.threat}`, view.W / 2, 24 * S, { size: 15 * S, align: 'center', color: '#fff', weight: '800' });
    let label, hot = false;
    if (this.reaperRef && !this.reaperRef.dead) { label = '☠ 死神戰'; hot = true; }
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
    if (this.choice || this.dead || this.paused || settingsUI.open) return;
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
    if (hov) this.drawTooltip(hov, mx, my, S);
    else uiText('Tab：build　·　M：放大地圖' + (this.fusionReady ? '　·　✦ 可合成' : ''), view.W - 12 * S, view.H - 10 * S, { size: 10 * S, align: 'right', color: withAlpha(this.fusionReady ? P.goldL : '#fff', this.fusionReady ? 0.7 : 0.28) });
  },
  drawTooltip(ic, mx, my, S) {
    const def = ic.def; if (!def) return;
    const accent = ic.kind === 'weapon' ? P.shardL : ic.kind === 'ability' ? (def.cursed ? P.redL : P.manaL) : ic.kind === 'equip' ? P.goldL : P.emberL;
    const sub = ic.kind === 'weapon' ? (def.evolved ? '★ 進化武器' : '武器 Lv.' + ic.level)
      : ic.kind === 'ability' ? ((def.cursed ? '詛咒被動' : '被動') + ' Lv.' + ic.level)
      : ic.kind === 'equip' ? ('裝備 · ' + (def.slot === 'weapon' ? '專武' : def.slot === 'armor' ? '護甲' : '飾品'))
      : ('道具 ' + (ic.slot || ''));
    const desc = (ic.kind === 'weapon' && def.levelDesc) ? def.levelDesc(ic.level) : (def.desc || '');
    const W = 210 * S; const lines = []; let line = '';
    for (const ch of desc) { if (textWidth(line + ch, 11 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (34 + lines.length * 14) * S;
    let x = mx + 14 * S, y = my + 6 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: accent, lw: 2 });
    uiText(def.name || ic.id || '?', x + 8 * S, y + 16 * S, { size: 13 * S, color: '#fff', weight: '800' });
    uiText(sub, x + W - 8 * S, y + 16 * S, { size: 10 * S, align: 'right', color: accent, weight: '700' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 32 * S + i * 14 * S, { size: 11 * S, color: P.gray4, weight: '500' }));
  },
  drawBuildPanel(S) {
    const w = Math.min(view.W * 0.9, 640 * S), h = Math.min(view.H * 0.86, 500 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
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
    yL += sz + 18 * S;
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
    for (const [k, v] of stats) { if (yR > y + h - 16 * S) break; uiText(k, colR, yR, { size: 11.5 * S, color: P.gray3, weight: '500' }); uiText(v, x + w - 24 * S, yR, { size: 11.5 * S, align: 'right', color: '#fff', weight: '700' }); yR += 15 * S; }
  },

  drawBanner() {
    if (this.bannerT <= 0) return;
    const S = uiScale(); const a = Math.min(1, this.bannerT);
    uiText(this.banner, view.W / 2, view.H * 0.2, { size: 28 * S, align: 'center', color: withAlpha('#ffe9a0', a), weight: '900', shadowColor: withAlpha('#000', a * 0.8) });
  },

  drawWon() {
    const S = uiScale(); const a = Math.min(0.86, this.deathT * 0.9);
    uiRect(0, 0, view.W, view.H, withAlpha('#0b1a0d', a));
    if (this.deathT < 0.3) return;
    const cx = view.W / 2;
    uiText('關 卡 通 關！', cx, view.H * 0.26, { size: 42 * S, align: 'center', color: P.goldL, weight: '900' });
    const idx = BIOMES.findIndex((b) => b.id === this.run.biomeId);
    const nextName = idx >= 0 && idx + 1 < BIOMES.length ? BIOMES[idx + 1].name : null;
    const lines = [
      `${this.map.biome.name} · 難度 ${this.run.difficulty || 1} 通關`,
      `擊殺 ${this.run.kills}　·　分數 ${this.run.score}`,
      this.reaperSlain ? '☠ 斬殺死神！傳說獎勵已入袋' : '死神未斬 — 下次留下迎戰可得傳說獎勵',
      nextName ? `★ 已解鎖新關卡：${nextName}` : '★ 已是最深關卡',
      `★ 解鎖本關更高難度（難度 ${(this.run.difficulty || 1) + 1}）`,
      `帶回金幣：${this.run.gold} → 已存入金庫`,
    ];
    lines.forEach((l, i) => uiText(l, cx, view.H * 0.26 + (52 + i * 26) * S, { size: 15 * S, align: 'center', color: (i === 3 || i === 4) ? P.shardL : i === 2 ? (this.reaperSlain ? P.goldL : P.gray3) : '#d8e8d0', weight: (i === 3 || i === 4) ? '800' : '600' }));
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', cx, view.H * 0.84, { size: 16 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },

  drawDeath() {
    const S = uiScale(); const a = Math.min(0.84, this.deathT * 0.9);
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', a));
    if (this.deathT < 0.3) return;
    const cx = view.W / 2;
    uiText('探 索 結 束', cx, view.H * 0.28, { size: 42 * S, align: 'center', color: P.redL, weight: '900' });
    const mins = Math.floor(this.run.time / 60), secs = Math.floor(this.run.time % 60);
    const lines = [
      `抵達區域：第 ${this.run.stage} 區`,
      `存活時間：${mins}:${secs.toString().padStart(2, '0')}`,
      `擊殺數：${this.run.kills}`,
      `本局分數：${this.run.score}` + (this.run.score >= (META.stats.bestScore || 0) ? '　★ 新紀錄！' : `（最佳 ${META.stats.bestScore || 0}）`),
      `帶回金幣：${this.run.gold} → 已存入金庫`,
    ];
    lines.forEach((l, i) => uiText(l, cx, view.H * 0.28 + (54 + i * 28) * S, { size: 16 * S, align: 'center', color: i === 3 ? P.goldL : '#d8def0', weight: i === 3 ? '800' : '600' }));
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', cx, view.H * 0.84, { size: 16 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },

  wrapText(str, cx, y, maxw, size, color = '#c8cfe8') {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '600') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.forEach((l, i) => uiText(l, cx, y + i * (size + 3), { size, align: 'center', color, weight: '600' }));
    return lines.length;
  },

  drawChoice() {
    const S = uiScale();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.8));
    const rects = this.cardRects();
    uiText('選 擇 強 化', view.W / 2, rects[0].y - 26 * S, { size: 26 * S, align: 'center', color: P.manaL, weight: '900' });
    uiText('（點擊卡片或按 1 / 2 / 3）', view.W / 2, rects[0].y - 6 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    rects.forEach((r, i) => {
      const c = this.choice.options[i]; const st = choiceStyle(c); const hover = this.choice.hover === i;
      const oy = hover ? -8 * S : 0;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha(st.bg, 0.97), { radius: 9 * S, stroke: hover ? st.accent : P.ink2, lw: hover ? 3 : 2 });
      uiRect(r.x, r.y + oy, r.w, 5 * S, st.accent, { radius: 2 * S });   // rarity bar (always)
      const pw = textWidth(st.tag, 10 * S, '800') + 14 * S;              // rarity pill
      uiRect(r.x + r.w - pw - 8 * S, r.y + oy + 10 * S, pw, 16 * S, withAlpha(st.accent, 0.2), { radius: 8 * S, stroke: st.accent, lw: 1 });
      uiText(st.tag, r.x + r.w - pw / 2 - 8 * S, r.y + oy + 18 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: st.accent, weight: '800' });
      const sp = getSprite(iconOr(st.icon, c.kind === 'ability' ? 'ability_power' : 'weapon_w_soulbolt')); const isc = (r.w * 0.42) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 20 * S, isc);
      const midY = r.y + oy + 20 * S + sp.h * isc;
      uiText(st.sub, r.x + r.w / 2, midY + 12 * S, { size: 11 * S, align: 'center', color: st.accent, weight: '800' });
      uiText(c.def.name, r.x + r.w / 2, midY + 31 * S, { size: 15.5 * S, align: 'center', color: '#fff', weight: '800' });
      let dy = midY + 49 * S;
      if (st.effect) { const n = this.wrapText(st.effect, r.x + r.w / 2, dy, r.w - 22 * S, 12 * S, P.emberL); dy += n * (12 * S + 3) + 5 * S; }
      this.wrapText(st.desc || '', r.x + r.w / 2, dy, r.w - 22 * S, 11.5 * S, P.gray4);
      uiText(String(i + 1), r.x + 11 * S, r.y + oy + 22 * S, { size: 14 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },
};

refs.run = runScene;
