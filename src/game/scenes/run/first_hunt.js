// R33: self-contained solo showcase, attached to the existing run lifecycle.
import '../../../art/first_hunt.js';
import { Music, Sfx } from '../../../engine/audio.js';
import { currentKeyFor, keyLabel, mouse, pressed } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { addShake, fillRectWorld, strokeCircleWorld, UI, uiBar, uiButton, uiRect, uiScale, uiText, uiWrapText, view } from '../../../engine/renderer.js';
import { BALANCE, weaponMaxLevel } from '../../balance.js';
import { FIRST_HUNT_BOSS, FIRST_HUNT_UPGRADES, firstHuntHero } from '../../content/first_hunt.js';
import { Enemies } from '../../content/registry.js';
import { inside } from './shared.js';

const cfg = BALANCE.FIRST_HUNT;
const range = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const firstHuntMixin = {
  initFirstHunt() {
    const hero = firstHuntHero(this.run.characterId);
    this.firstHunt = { hero, charge: 0, pulses: 0, cooldown: 0, power: 1, growth: 0, surge: false, bossPhase: 0, bossCd: cfg.BOSS_CD[0], attack: null, target: null };
    this.firstHuntChoice = false;
    this.story = null; this.hudTut = false; this.levelQueue = 0;
    this.petId = null;
    this.activeTypes = ['slime', 'bat', 'wisp'].map((id) => Enemies.get(id)).filter(Boolean);
    this.spawnTimer = cfg.SPAWN_DELAY;
    this.world.onXpCollected = (v) => {
      if (hero.id === 'hunter') this.firstHunt.charge = Math.min(cfg.CHARGE_MAX, this.firstHunt.charge + Math.max(0, v) * cfg.PICKUP_CHARGE);
    };
    for (let i = 1; i < cfg.START_WEAPON_LEVEL; i++) this.firstHuntLevelUp();
    this.banner = '初獵 · 重燃魂火'; this.bannerT = 3;
  },
  firstHuntLevelUp() {
    const inst = this.player?.weapons[0];
    if (inst && inst.level < BALANCE.WEAPON_MAX_LEVEL) this.player.levelWeapon(inst, this.world);
  },
  firstHuntEnemyKilled(e) {
    if (e === this.bossRef) {
      this.run.firstHuntBossDefeated = true; this.run.cleared = true;
      this.cleared = true; this.boss = false; this.firstHunt.attack = null;
      this.finishRun(true); return;
    }
    if (this.firstHunt.hero.id === 'pyro') {
      this.firstHunt.target = { x: e.x, y: e.y };
      this.firstHunt.charge = Math.min(cfg.CHARGE_MAX, this.firstHunt.charge + cfg.KILL_CHARGE);
    }
  },
  firstHuntTick(dt) {
    const f = this.firstHunt, p = this.player;
    if (!f || this.dead || p.dead) return;
    f.cooldown = Math.max(0, f.cooldown - dt);
    if (f.hero.id === 'guardian' && this.world.nearestEnemy(p.x, p.y, cfg.GUARD_NEAR)) f.charge = Math.min(cfg.CHARGE_MAX, f.charge + cfg.GUARD_CHARGE_PER_SEC * dt);
    if (f.charge >= cfg.CHARGE_MAX && f.cooldown <= 0) {
      f.charge = 0; f.pulses++; f.cooldown = cfg.PULSE_COOLDOWN;
      const at = f.hero.id === 'pyro' && f.target ? f.target : p;
      const radius = cfg.PULSE_RADIUS[f.hero.id] * Math.sqrt(f.power);
      const opts = { src: f.hero.skill, knockback: cfg.PULSE_KNOCKBACK[f.hero.id] };
      if (f.hero.id === 'pyro') opts.status = { type: 'burn', chance: 1, dur: cfg.BURN_DURATION, dps: cfg.BURN_DPS * f.power };
      this.world.dealAreaDamage(at.x, at.y, radius, cfg.PULSE_DAMAGE[f.hero.id] * f.power, opts);
      this.world.particles.ring(at.x, at.y, f.hero.color, 24, radius * 5);
      this.world.particles.text(p.x, p.y - 28, f.hero.skill, { color: f.hero.color, size: 14, life: 1.0 });
      // These rings remain in the warning layer even with decorative particles disabled.
      f.pulse = { x: at.x, y: at.y, radius, life: 0.35 };
      if (f.hero.id === 'guardian') p.invuln = Math.max(p.invuln, cfg.GUARD_INVULN);
      addShake(3); Sfx.play(f.hero.id === 'pyro' ? 'explosion' : f.hero.id === 'guardian' ? 'crit' : 'shard');
    }
    if (f.pulse) { f.pulse.life -= dt; if (f.pulse.life <= 0) f.pulse = null; }
    if (f.growth < cfg.GROWTH_AT.length && this.run.time >= cfg.GROWTH_AT[f.growth]) {
      this.firstHuntChoice = true; return;
    }
    if (!f.surge && this.run.time >= cfg.SURGE_AT) {
      f.surge = true; this.banner = '魂火甦醒 · 守衛湧入'; this.bannerT = 3;
      for (let i = 0; i < cfg.SURGE_COUNT; i++) this.spawnFirstHuntMob(true);
    }
    if (!this.boss && this.run.time >= cfg.BOSS_AT) this.spawnFirstHuntBoss();
    if (this.boss && this.bossRef && !this.bossRef.dead) this.tickFirstHuntBoss(dt);
  },
  spawnFirstHuntMob(surge = false) {
    const pool = this.activeTypes.slice(0, this.run.time < cfg.ROSTER_SECOND_AT ? 1 : this.run.time < cfg.SURGE_AT ? 2 : 3);
    const def = pool[Math.floor(Math.random() * pool.length)]; if (!def) return;
    // Spawn at least 140 world pixels from the player, within the walkable arena.
    const w = this.world, p = this.player;
    for (let i = 0; i < cfg.MOB_SPAWN_TRIES; i++) {
      const a = Math.random() * Math.PI * 2, r = cfg.MOB_RING_MIN + Math.random() * cfg.MOB_RING_JITTER;
      const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (x < cfg.MOB_MARGIN || y < cfg.MOB_MARGIN || x > w.pxW - cfg.MOB_MARGIN || y > w.pxH - cfg.MOB_MARGIN || w.solidAt(x, y)) continue;
      // Trial deaths drop XP/health only: no random equipment or economy distractions.
      return w.spawnEnemy({ ...def, gold: 0, shard: 0 }, x, y, { quiet: true,
        hpScale: cfg.MOB_HP * (surge ? cfg.SURGE_HP : 1), dmgScale: cfg.MOB_DAMAGE, speedScale: cfg.MOB_SPEED });
    }
    return null;
  },
  firstHuntSpawnTick(dt) {
    if (this.boss || this.dead) return;
    const phase = this.run.time < cfg.SPAWN_PHASE_AT ? 0 : this.run.time < cfg.SURGE_AT ? 1 : 2;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = cfg.SPAWN_INTERVAL[phase];
      if (this.world.enemies.length < cfg.SPAWN_CAP[phase]) this.spawnFirstHuntMob();
    }
  },
  spawnFirstHuntBoss() {
    const c = this.map.center;
    // Authored safe position on the open center aisle; no generic phase adds/moves.
    const def = FIRST_HUNT_BOSS;
    this.world.enemies = []; this.world.projectiles = [];
    this.bossRef = this.world.spawnEnemy(def, c.x, c.y + cfg.BOSS_SPAWN_OFFSET_Y, { quiet: true, hpScale: 1 / BALANCE.BOSS_HP_MULT, dmgScale: 1 / BALANCE.BOSS_DMG_MULT });
    this.bossRef.phaseThresh = [];
    this.bossRef.spawnT = cfg.BOSS_SPAWN_GRACE;
    this.player.invuln = Math.max(this.player.invuln, cfg.BOSS_SPAWN_GRACE);
    this.player.heal(cfg.BOSS_HEAL);
    this.boss = true;
    this.firstHunt.addCd = cfg.BOSS_ADDS_INTERVAL;
    this.banner = '守火者甦醒 · 避開落印，奪回魂火'; this.bannerT = 3;
    Music.setMode('boss'); Sfx.play('boss');
  },
  tickFirstHuntBoss(dt) {
    const f = this.firstHunt, e = this.bossRef, p = this.player;
    // Small, bounded reinforcements keep pickup/kill-based identities alive in the finale.
    f.addCd -= dt;
    if (f.addCd <= 0) {
      f.addCd = cfg.BOSS_ADDS_INTERVAL;
      for (let i = 0; i < cfg.BOSS_ADDS_COUNT && this.world.enemies.length < cfg.BOSS_ADDS_CAP + 1; i++) this.spawnFirstHuntMob();
    }
    if (!f.bossPhase && e.hp / e.maxHp <= cfg.BOSS_PHASE_HP) {
      f.bossPhase = 1; f.bossCd = cfg.BOSS_CD[1]; f.attack = null;
      this.banner = '第二階段 · 十字裂擊'; this.bannerT = 2.5; Sfx.play('boss');
    }
    if (f.attack) {
      const a = f.attack; a.remaining -= dt;
      if (a.remaining > 0) return;
      const dx = Math.abs(p.x - a.x), dy = Math.abs(p.y - a.y);
      const hit = a.kind === 'circle' ? Math.hypot(dx, dy) < cfg.BOSS_RADIUS + p.radius
        : (dx < cfg.BOSS_CROSS_WIDTH + p.radius && dy < cfg.BOSS_CROSS_REACH) || (dy < cfg.BOSS_CROSS_WIDTH + p.radius && dx < cfg.BOSS_CROSS_REACH);
      f.attack = null;
      if (hit) p.takeDamage(cfg.BOSS_DAMAGE, Math.atan2(p.y - a.y, p.x - a.x), this.world, 'boss');
      this.world.particles.ring(a.x, a.y, '#ff8a50', 24, cfg.BOSS_RADIUS * 6, { warn: true });
      return;
    }
    f.bossCd -= dt;
    if (f.bossCd > 0 || e.spawnT > 0) return;
    const cross = f.bossPhase === 1;
    f.attack = { kind: cross ? 'cross' : 'circle', x: cross ? e.x : p.x, y: cross ? e.y : p.y, remaining: cfg.BOSS_WINDUP };
    f.bossCd = cfg.BOSS_CD[f.bossPhase];
    this.world.addMoveLabel(e, cross ? '十字裂擊・離開直線' : '魂火落印・移開光圈', '#ff8a50');
    if (cross) {
      const a = f.attack, r = cfg.BOSS_CROSS_REACH;
      this.world.addBeam(a.x - r, a.y, a.x + r, a.y, '#ff5a3c', cfg.BOSS_WINDUP);
      this.world.addBeam(a.x, a.y - r, a.x, a.y + r, '#ff5a3c', cfg.BOSS_WINDUP);
    }
  },
  firstHuntChoiceRects() {
    const S = uiScale(), w = Math.min(230 * S, (view.W - 64 * S) / 3), gap = 12 * S;
    const x = (view.W - w * 3 - gap * 2) / 2, h = Math.min(230 * S, view.H * 0.5);
    return FIRST_HUNT_UPGRADES.map((u, i) => ({ ...u, x: x + i * (w + gap), y: (view.H - h) / 2, w, h }));
  },
  chooseFirstHuntUpgrade(id) {
    if (!this.firstHuntChoice || this.firstHunt.growth >= cfg.GROWTH_AT.length || !FIRST_HUNT_UPGRADES.some((u) => u.id === id)) return false;
    const p = this.player, f = this.firstHunt;
    if (id === 'resonance') f.power *= cfg.UPGRADE_POWER;
    else if (id === 'weapon') {
      const inst = p.weapons[0];
      for (let i = 0; i < cfg.UPGRADE_WEAPON_LEVELS; i++) {
        if (inst.level < weaponMaxLevel(inst.def)) this.firstHuntLevelUp();
        else p.stats.damageMult *= cfg.UPGRADE_WEAPON_DAMAGE ** (1 / cfg.UPGRADE_WEAPON_LEVELS);
      }
    }
    else { p.stats.maxHp += cfg.UPGRADE_HP; p.heal(cfg.UPGRADE_HP); p.stats.pickupRange += cfg.UPGRADE_PICKUP; }
    f.growth++; this.firstHuntChoice = false;
    this.banner = FIRST_HUNT_UPGRADES.find((u) => u.id === id).name; this.bannerT = 2;
    Sfx.play('levelup'); return true;
  },
  updateFirstHuntChoice() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const rects = this.firstHuntChoiceRects();
    for (let i = 0; i < rects.length; i++) if (pressed('slot' + (i + 1)) || (mouse.justDown && inside(mx, my, rects[i]))) { this.chooseFirstHuntUpgrade(rects[i].id); return; }
  },
  drawFirstHuntChoice() {
    const S = uiScale(), rects = this.firstHuntChoiceRects(), f = this.firstHunt;
    uiRect(0, 0, view.W, view.H, '#0b101bea');
    uiText(f.growth ? '魂火共鳴 · 決定你的構築' : '首次成長 · 選擇獵手祝福', view.W / 2, rects[0].y - 30 * S, { size: UI.FONT_TITLE * S, align: 'center', color: f.hero.color, weight: UI.WEIGHT_TITLE });
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i], hover = inside(mouse.x * view.dpr, mouse.y * view.dpr, r);
      uiRect(r.x, r.y, r.w, r.h, hover ? '#29444a' : '#182830', { radius: 6 * S, stroke: hover ? '#e8fff7' : f.hero.color, lw: 2 });
      uiText('0' + (i + 1), r.x + 20 * S, r.y + 37 * S, { size: UI.FONT_TITLE * S, color: f.hero.color, weight: UI.WEIGHT_TITLE });
      uiText(r.name, r.x + 20 * S, r.y + 80 * S, { size: UI.FONT_HEADING * S, color: '#fff', weight: UI.WEIGHT_HEADING });
      uiWrapText(r.desc, r.w - 40 * S, UI.FONT_BODY * S, UI.WEIGHT_BODY).forEach((line, j) => uiText(line, r.x + 20 * S, r.y + (110 + j * 22) * S, { size: UI.FONT_BODY * S, color: '#c2d4d4' }));
    }
    uiText('時間已暫停 · 按 1 / 2 / 3 或點選', view.W / 2, rects[0].y + rects[0].h + 30 * S, { size: UI.FONT_BODY * S, align: 'center', color: '#c2d4d4' });
  },
  drawFirstHuntWorld() {
    const f = this.firstHunt;
    if (f.pulse) strokeCircleWorld(f.pulse.x, f.pulse.y, f.pulse.radius * (1 - f.pulse.life * 0.8), withAlpha(f.hero.color, 0.9), 2);
    const a = f.attack;
    if (a?.kind === 'circle') {
      strokeCircleWorld(a.x, a.y, cfg.BOSS_RADIUS, '#ff5a3c', 3);
      strokeCircleWorld(a.x, a.y, cfg.BOSS_RADIUS * Math.max(0.05, a.remaining / cfg.BOSS_WINDUP), '#ffe5ce', 2);
    }
    if (a?.kind === 'cross') {
      // Telegraph the full damage footprint; the narrow center beam alone would
      // understate a 24-world-pixel-wide hit strip, especially at high zoom.
      const r = cfg.BOSS_CROSS_REACH, w = cfg.BOSS_CROSS_WIDTH;
      fillRectWorld(a.x - r, a.y - w, r * 2, w * 2, withAlpha('#ff5a3c', 0.18));
      fillRectWorld(a.x - w, a.y - r, w * 2, r * 2, withAlpha('#ff5a3c', 0.18));
    }
  },
  drawFirstHuntHud() {
    const S = uiScale(), f = this.firstHunt, t = Math.floor(this.run.time);
    uiText(`初獵 · 魂火祭壇　${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, view.W / 2, 24 * S, { size: UI.FONT_HEADING * S, align: 'center', color: '#fff', weight: UI.WEIGHT_HEADING });
    const label = this.boss ? (f.bossPhase ? '第二階段・十字裂擊' : '守火者・避開落印光圈') : `奪回魂火 · 首領甦醒 ${Math.max(0, Math.ceil(cfg.BOSS_AT - t))} 秒`;
    uiText(label, view.W / 2, 44 * S, { size: UI.FONT_BODY * S, align: 'center', color: this.boss ? '#ffb49a' : f.hero.color });
    if (this.bossRef && !this.bossRef.dead) uiBar(view.W / 2 - 150 * S, 58 * S, 300 * S, 10 * S, this.bossRef.hp / this.bossRef.maxHp, { fg: '#e57866', bg: '#29181e', border: P.ink });
    const w = Math.min(460 * S, view.W * 0.65), x = (view.W - w) / 2, y = view.H - 83 * S;
    uiRect(x, y, w, 58 * S, '#101d29ec', { radius: 5 * S, stroke: '#38525a', lw: 1 });
    uiText(f.hero.skill + '　' + Math.floor(f.charge) + '%　·　已發動 ' + f.pulses + ' 次', x + 12 * S, y + 18 * S, { size: UI.FONT_BODY * S, color: f.hero.color, weight: UI.WEIGHT_HEADING });
    uiBar(x + 12 * S, y + 25 * S, w - 24 * S, 5 * S, f.charge / cfg.CHARGE_MAX, { fg: f.hero.color, bg: '#091119', border: P.ink });
    const hint = this.run.time < 12 ? 'WASD／方向鍵 移動 · 武器自動攻擊' : `${keyLabel(currentKeyFor('dash'))} 衝刺 · ${f.hero.role} · 滿格自動發動`;
    uiText(hint, x + 12 * S, y + 47 * S, { size: UI.FONT_CAPTION * S, color: '#d0dddd' });
  },
  drawFirstHuntResult() {
    if (this.deathT < 0.3) return;
    const S = uiScale(), w = Math.min(620 * S, view.W * 0.85), h = Math.min(370 * S, view.H * 0.8), x = (view.W - w) / 2, y = (view.H - h) / 2;
    uiRect(0, 0, view.W, view.H, '#080e17dd');
    uiRect(x, y, w, h, '#14232dfc', { radius: 8 * S, stroke: this.firstHunt.hero.color, lw: 2 });
    uiText(this.won ? '魂火已奪回' : '獵手，先回營整備', x + 28 * S, y + 48 * S, { size: UI.FONT_TITLE * S, color: this.firstHunt.hero.color, weight: UI.WEIGHT_TITLE });
    const receipt = this.run.firstHuntReceipt;
    const reward = receipt?.cheated ? '本次使用開發者功能，不發重建印記。' : receipt?.earned ? '首次通關 · 獲得 1 枚重建印記，回城點亮據點。' : this.won ? '此角色的印記已領取；可換另一名獵手取得新印記。' : '失敗不扣資源；換一項祝福或試試另一名獵手。';
    const lines = [this.firstHunt.hero.name + ` · 擊殺 ${this.run.kills} · 能力發動 ${this.firstHunt.pulses} 次`, reward,
      this.firstHunt.hero.tip, '初獵紀錄獨立保存；正式關卡進度與排行榜不受影響。'];
    let yy = y + 90 * S;
    for (const line of lines) {
      for (const text of uiWrapText(line, w - 56 * S, UI.FONT_BODY * S, UI.WEIGHT_BODY)) { uiText(text, x + 28 * S, yy, { size: UI.FONT_BODY * S, color: '#d1dedc' }); yy += 21 * S; }
      yy += 13 * S;
    }
    uiButton(x + 28 * S, y + h - 58 * S, w - 56 * S, 36 * S, '點擊／空白鍵　回城重建', { S, size: UI.FONT_HEADING * S });
  },
};
