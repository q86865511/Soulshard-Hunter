// run/modes.js — modes methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { BIOMES } from '../../../art/biomes.js';
import { Music, Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { TAU, clamp, rng } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { addShake, drawSpriteUI, uiClipRound, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { RT } from '../../../net/rt.js';
import { BALANCE } from '../../balance.js';
import { CURSES } from '../../content/curses.js';
import { EVENTS } from '../../content/events.js';
import { markSeen } from '../../content/codex.js';
import { Enemies } from '../../content/registry.js';
import { META, bankRun, saveMeta } from '../../state.js';
import { TS } from '../../world.js';
import { FINAL_BOSS, LEVEL_TIME, REAPER_ID, inside } from './shared.js';

export const modesMixin = {

  // ---- mini-boss event choice (原#3): a random 3-pick of arena-style events ----
  openEventChoice() {
    const pool = EVENTS.slice(), pick = [];
    for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    if (this.coop) { if (pick.length) this.applyEvent(pick[rng.int(0, pick.length - 1)]); return; }   // co-op: auto-pick (no pausing the shared world)
    this.eventChoice = pick.length ? pick : null;
  },
  eventCardRects() {
    const S = uiScale(); const n = this.eventChoice ? this.eventChoice.length : 3;
    const cw = Math.min(212 * S, (view.W - 50 * S) / n - 16 * S); const ch = Math.min(cw * 1.45, view.H * 0.74), gap = 18 * S;   // 原#14 + R17/1.5 spacing; R17 UI-sweep polish: ×1.62 left the lower half empty — ×1.45 keeps the air without the dead band
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

  // ---- R18/B7: endless curses (every CURSE_INTERVAL, a paused 3-of-12 pick) ----------
  openCurseChoice() {
    const pool = CURSES.slice(), pick = [];
    for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    // co-op can't pause the shared world → host auto-resolves (mirrors openEventChoice)
    if (this.coop) { if (pick.length) this.applyCurse(pick[rng.int(0, pick.length - 1)]); else this.nextCurseAt += BALANCE.CURSE_INTERVAL; return; }
    if (pick.length) this.curseChoice = pick; else this.nextCurseAt += BALANCE.CURSE_INTERVAL;
  },
  updateCurseChoice() {
    const rects = this.eventCardRects(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    let pick = -1;
    rects.forEach((r, i) => { if (mouse.justDown && inside(mx, my, r)) pick = i; });
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick >= 0 && pick < this.curseChoice.length) this.applyCurse(this.curseChoice[pick]);
  },
  applyCurse(c) {
    try { c.apply(this); } catch (e) { /* */ }
    this.curses.push(c.id);
    this.curseChoice = null;
    this.nextCurseAt += BALANCE.CURSE_INTERVAL;
    this.banner = '☠ 詛咒纏身 · ' + c.name + ' — ' + c.reward; this.bannerT = 3.0;
    this.world.particles.ring(this.player.x, this.player.y, c.color || P.magenta, 26, 150); Sfx.play('levelup');
  },
  drawCurseChoice() {
    const S = uiScale(); const rects = this.eventCardRects();
    uiRect(0, 0, view.W, view.H, withAlpha('#180a14', 0.84));
    uiText('☠ 無盡詛咒 · 三選一（詛咒與報酬一同生效）', view.W / 2, rects[0].y - 30 * S, { size: 24 * S, align: 'center', color: P.magentaL, weight: '900' });
    uiText('（點擊卡片或按 1 / 2 / 3 · 已疊加 ' + this.curses.length + ' 層）', view.W / 2, rects[0].y - 8 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    rects.forEach((r, i) => {
      const c = this.curseChoice[i]; const hov = inside(mx, my, r); const oy = hov ? -8 * S : 0; const ac = c.color || P.magentaL;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha('#2a1326', 0.98), { radius: 9 * S, stroke: hov ? ac : withAlpha(ac, 0.5), lw: hov ? 3 : 2 });
      uiClipRound(r.x, r.y + oy, r.w, r.h, 9 * S, () => uiRect(r.x, r.y + oy, r.w, 5 * S, ac));
      uiText('☠', r.x + r.w / 2, r.y + oy + 54 * S, { size: 40 * S, align: 'center', color: ac, weight: '900' });
      uiText(c.name, r.x + r.w / 2, r.y + oy + 92 * S, { size: 19 * S, align: 'center', color: '#fff', weight: '900' });
      uiText('詛咒', r.x + r.w / 2, r.y + oy + 120 * S, { size: 11 * S, align: 'center', color: P.redL, weight: '800' });
      this.wrapText(c.curse, r.x + r.w / 2, r.y + oy + 136 * S, r.w - 24 * S, 12.5 * S, withAlpha(P.redL, 0.95));
      uiText('報酬', r.x + r.w / 2, r.y + oy + 172 * S, { size: 11 * S, align: 'center', color: P.toxic, weight: '800' });
      this.wrapText(c.reward, r.x + r.w / 2, r.y + oy + 188 * S, r.w - 24 * S, 12.5 * S, withAlpha(P.toxic, 0.95));
      uiText(String(i + 1), r.x + 11 * S, r.y + oy + 22 * S, { size: 14 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },
  // endless-only per-frame tick: curse trigger, soul-tax drain, milestone rewards
  endlessTick(dt) {
    if (!this.endless) return;
    const t = this.run.time;
    if (t >= this.nextCurseAt && !this.boss && !this.curseChoice) this.openCurseChoice();
    if (this.curseDrain) {
      this.curseDrainTimer -= dt;
      if (this.curseDrainTimer <= 0) { this.curseDrainTimer += 30; if (this.player && !this.player.dead) this.player.hp = Math.max(1, this.player.hp - this.player.hp * 0.05); }   // 蝕魂: never lethal
    }
    if (this.milestoneIdx < BALANCE.ENDLESS_MILESTONES.length && t >= BALANCE.ENDLESS_MILESTONES[this.milestoneIdx]) {
      const g = BALANCE.ENDLESS_MILESTONE_GOLD[this.milestoneIdx] || 0, sh = BALANCE.ENDLESS_MILESTONE_SHARD[this.milestoneIdx] || 0;
      this.run.gold += g; this.run.shards += sh;
      const mins = Math.floor(BALANCE.ENDLESS_MILESTONES[this.milestoneIdx] / 60);
      this.banner = `★ 無盡里程碑 ${mins} 分鐘！+${g} 金幣 · +${sh} 魂晶`; this.bannerT = 3.2; Sfx.play('levelup');
      this.milestoneIdx++;
    }
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
    const hpScale = (4 + this.threat * 0.6) * this.diffMul * this.curseHpMul * this.curseBossHpMul;   // R18/B7 c_ironhide + c_tyrant
    const dmgScale = (1.4 + this.threat * 0.10) * this.diffMul * this.curseDmgMul;
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 220, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 220, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 12);
    this.bossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.boss = true;
    this.banner = '⚔ 第 ' + wave + ' 波首領 · ' + (def.name || 'BOSS'); this.bannerT = 3.0;   // R17 B15: first boss (t=180s, wave=1) reads「第 1 波」— wave+1 skipped a number players never saw
    addShake(8); Sfx.play('boss'); Music.setMode('boss');
  },
  spawnFinalBoss() {
    let def = Enemies.get(FINAL_BOSS[this.run.biomeId]);
    if (!def) { let bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID && !this.usedMiniBosses.includes(d.id)); if (!bs.length) bs = Enemies.filter((d) => d.boss && d.id !== REAPER_ID); def = bs.length ? bs[rng.int(0, bs.length - 1)] : null; }
    if (!def) { this.clearLevel(); return; }
    const hpScale = (4 + this.threat * 0.6) * this.diffMul;
    const dmgScale = (1.4 + this.threat * 0.10) * this.diffMul * this.dailyBossDmgMul;  // bal: final boss escalates with threat (R18/B9 m_frenzy ×dmg)
    let bx = this.player.x, by = this.player.y, tries = 0;
    do { const a = rng.next() * TAU; bx = clamp(this.player.x + Math.cos(a) * 200, TS * 2, this.world.pxW - TS * 2); by = clamp(this.player.y + Math.sin(a) * 200, TS * 2, this.world.pxH - TS * 2); tries++; } while (this.world.solidAt(bx, by) && tries < 12);
    this.finalBossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.bossRef = this.finalBossRef; this.boss = true; this.finalBoss = true;
    this.evtMines = []; this.evtStrikes = []; this.surround = null; this.higgs = null;
    this.evtBombers = []; this.evtBombs = []; this.evtLanes = []; this.evtBoulders = []; this.evtGoblin = null;   // R20/B5: stop tracking event mobs for the finale (live ones just fight on)
    this.banner = '最終首領 · ' + (def.name || 'BOSS') + ' 降臨！'; this.bannerT = 3.6;
    addShake(10); Sfx.play('boss'); Music.setMode('boss');
  },
  onBigBossDead(e) {
    this.boss = false; this.finalBoss = false; this.bossRef = null; this.finalBossRef = null;
    this.run.bossKills = (this.run.bossKills || 0) + 1;
    if (e.def && e.def.boss) markSeen('boss', e.def.id);   // P1 內容圖鑑
    this.clearLevel();
  },
  // Banks the unlock immediately, then keeps the run alive for the Reaper window.
  clearLevel() {
    if (this.cleared) return;
    this.cleared = true; this.run.cleared = true;
    const bid = this.run.biomeId || BIOMES[0].id;
    const idx = BIOMES.findIndex((b) => b.id === bid);
    // R18/B9: a daily run is a closed showcase — it borrows a hero + biome and must NOT write
    // biome/difficulty unlocks (the hero isn't written to META.unlocked either; see hub launch).
    if (this.run.mode !== 'daily') {
      META.levels = META.levels || { unlocked: 1, diff: {} };
      META.levels.diff = META.levels.diff || {};
      META.levels.diff[bid] = Math.max(META.levels.diff[bid] || 0, this.run.difficulty || 1);
      if (idx >= 0) META.levels.unlocked = Math.max(META.levels.unlocked || 1, Math.min(BIOMES.length, idx + 2));
    }
    this.run.gold += 220 + (this.run.difficulty || 1) * 160 + this.threat * 18;
    if (this.dailyBossDropMul > 1) this.run.gold += Math.round((220 + (this.run.difficulty || 1) * 160 + this.threat * 18) * (this.dailyBossDropMul - 1));   // R18/B9 m_frenzy: final-boss clear loot doubled (QA B12)
    saveMeta();   // persist the unlock at once, so leaving/dying after this keeps it
    this.reaperAt = this.run.time + BALANCE.REAPER_DELAY;
    if (this.player) this.player.invuln = Math.max(this.player.invuln || 0, BALANCE.REAPER_GRACE);   // 10.9: brief grace so a boss death-blast / lingering AoE can't false-trigger game over right as you win
    this.banner = (this.run.mode === 'daily' ? '每日挑戰完成！死神將在 ' : '關卡通關！死神將在 ') + BALANCE.REAPER_DELAY + ' 秒後降臨 — 按 E 離場，或留下迎戰'; this.bannerT = 5.0;
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
    if (e.def && e.def.boss) markSeen('boss', e.def.id);   // P1 內容圖鑑（死神也是 boss:true）
    this.run.gold += Math.round((600 + (this.run.difficulty || 1) * 200) * (this.dailyBossDropMul || 1));   // R18/B9 m_frenzy: Reaper loot doubled (QA B12; ×1 in non-daily)
    this.run.shards += Math.round(30 * (this.dailyBossDropMul || 1));
    this.banner = '★ 死神已被斬殺！傳說自此誕生'; this.bannerT = 4.0;
    this.finishRun(true);
  },
  // Single place that ends the run + banks (guarded so it never double-banks).
  finishRun(won) {
    if (this.dead) return;
    this.won = won; this.dead = true; this.deathT = 0;
    this.run.score = Math.floor(this.run.kills * 12 + this.run.stage * 400 + this.run.time + (this.run.difficulty || 1) * 600 + (this.reaperSlain ? 5000 : 0));
    this.run.result = won ? 'clear' : 'death';   // P1-3: won here always means a cleared run; !won = died before clearing
    if (this.player) this.run.weaponIds = (this.player.weapons || []).map((w) => w.def.id);   // snapshot loadout for run_ended (bankRun has no player)
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
};
