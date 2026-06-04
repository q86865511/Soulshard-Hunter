// In-run gameplay: continuous-survival across large biome stages. Walk only
// (weapons auto-fire); enemies pour in endlessly and escalate. Survive each
// stage's timer (or slay its boss) to open the exit to the next biome.
import { World, TS } from '../world.js';
import { generateStage, isBossStage, biomeForStage } from '../maps.js';
import { Player } from '../player.js';
import { newRun, bankRun, META, saveMeta } from '../state.js';
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { Enemies } from '../content/registry.js';
import { equipItem } from '../content/equipment.js';
import {
  camera, clear, vignette, uiText, uiRect, uiScale, view, addShake, drawSpriteUI, textWidth,
  drawSprite, drawShadow, glowWorld, worldToScreen, fillRectWorld, uiBar, setShakeScale,
} from '../../engine/renderer.js';
import { drawHud, drawLowHpWarning } from '../hud.js';
import { pressed, mouse } from '../../engine/input.js';
import { rng, dist, clamp } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { getRunChoices, applyChoice, choiceStyle } from '../progression.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

export const runScene = {
  enter(payload) {
    this.run = payload.run || newRun();
    this.run.stage = this.run.stage || 1;
    this.run.time = 0;
    this.world = new World(this.run);
    this.player = null;
    this.t = 0; this.dead = false; this.deathT = 0;
    this.levelQueue = this.run.startBonusLevels || 0;
    this.choice = null; this.banner = ''; this.bannerT = 0;
    this.paused = false;
    this.world.onPlayerDeath = () => this.onDeath();
    this.world.onLevelUp = () => this.onLevelUp();
    this.world.onEnemyKilled = (e) => { if (e.boss) this.onBossDead(); };
    this.loadStage(this.run.stage);
  },

  // ---- stage flow ----------------------------------------------------------
  loadStage(stage) {
    const map = generateStage(stage);
    this.map = map; this.run.stage = stage; this.run.floor = stage;
    this.world.loadMap(map);
    this.buildMinimap();
    this.world.enemies.length = 0; this.world.projectiles.length = 0;
    this.world.pickups.length = 0; this.world.beams.length = 0; this.world.particles.clear();

    if (!this.player) {
      this.player = new Player(map.entrance.x, map.entrance.y, this.run.stats);
      this.player.run = this.run;
      this.player.spriteName = this.run.characterSprite || 'player';
      for (const wid of (this.run.startWeapons || ['w_soulbolt'])) this.player.addWeapon(wid, this.world);
    }
    this.player.x = map.entrance.x; this.player.y = map.entrance.y; this.player.vx = this.player.vy = 0;
    this.world.player = this.player;
    this.aimCamera(); camera.x = camera.targetX; camera.y = camera.targetY;

    // chests / secret / shrine
    for (const c of map.chests) this.world.addPickup('chest', c.x, c.y, 1 + Math.floor(stage / 3));
    if (map.secret) this.world.addPickup('chest', map.secret.x, map.secret.y, 3 + Math.floor(stage / 2), { hidden: true });
    this.shopOffers = null;
    if (map.shrine) this.setupShrine(map.shrine);

    // stage goal + spawner
    this.boss = map.boss; this.bossDead = false;
    this.exitActive = false;
    this.stageTime = 0;
    this.goalTime = this.boss ? 9999 : 24 + stage * 3;
    this.spawnTimer = 1.0;
    this.tierCap = Math.min(4, 1 + Math.floor(stage / 1.5));

    if (this.boss) this.spawnBoss();
    Music.setMode(this.boss ? 'boss' : 'run');
    this.banner = map.biome.name + (this.boss ? ' · 首領' : ` · 第 ${stage} 區`);
    this.bannerT = 2.4;
  },

  nextStage() {
    Sfx.play('portal');
    this.player.heal(this.player.maxHp * 0.18);
    this.loadStage(this.run.stage + 1);
  },

  setupShrine(pos) {
    const offers = [];
    const xs = [-26, 0, 26];
    for (let i = 0; i < 3; i++) {
      const isEquip = rng.chance(0.5);
      const def = isEquip ? this.world.rollEquipment(1 + Math.floor(this.run.stage / 3)) : this.world.rollItem(1 + Math.floor(this.run.stage / 4));
      if (!def) continue;
      offers.push({ def, kind: isEquip ? 'equip' : 'item', price: def.price || 30, x: pos.x + xs[i], y: pos.y, bought: false });
    }
    this.shopOffers = offers;
  },

  spawnBoss() {
    const bosses = Enemies.filter((d) => d.boss);
    const def = bosses.length ? bosses[(this.run.stage / 5 - 1) % bosses.length | 0] : Enemies.get('brute');
    const hpScale = 1 + (this.run.stage - 1) * 0.4;
    const dmgScale = 1 + (this.run.stage - 1) * 0.14;
    this.bossRef = this.world.spawnEnemy(def, this.map.center.x, this.map.center.y - 30, { hpScale, dmgScale, quiet: true });
    this.banner = (def.name || 'BOSS') + ' 現身！'; this.bannerT = 2.6;
    addShake(8); Sfx.play('boss');
  },
  onBossDead() {
    this.bossDead = true; this.exitActive = true;
    this.banner = '擊敗首領！傳送門開啟'; this.bannerT = 2.6; addShake(6);
    this.world.addPickup('heart', this.player.x, this.player.y, 40);
  },

  // continuous spawning
  spawnTick(dt) {
    if (this.boss) return;
    this.spawnTimer -= dt;
    const cap = Math.min(86, 22 + this.run.stage * 6 + Math.floor(this.stageTime * 0.45));
    if (this.spawnTimer <= 0 && this.world.enemies.length < cap) {
      const group = 2 + Math.floor(this.run.stage / 3) + (rng.chance(0.3) ? 1 : 0);
      const pool = Enemies.upTo(this.tierCap).filter((d) => !d.boss);
      if (pool.length) {
        const hpScale = 1 + (this.run.stage - 1) * 0.22 + this.stageTime * 0.01;
        const dmgScale = 1 + (this.run.stage - 1) * 0.12 + this.stageTime * 0.006;
        for (let i = 0; i < group; i++) {
          const def = rng.weighted(pool, (d) => d.weight ?? 1);
          const elite = this.run.stage >= 2 && rng.chance(0.05 + this.stageTime * 0.0008);
          this.world.spawnRing(def, { hpScale, dmgScale, elite });
        }
      }
      this.spawnTimer = Math.max(0.32, 1.5 - this.run.stage * 0.06 - this.stageTime * 0.008);
    }
  },

  // ---- choices -------------------------------------------------------------
  onLevelUp() { this.levelQueue++; },
  openChoice() {
    this.levelQueue--;
    const options = getRunChoices(this.run, this.player);
    if (!options.length) return;
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

  // ---- death ---------------------------------------------------------------
  onDeath() {
    if (this.dead) return;
    this.dead = true; this.deathT = 0;
    this.run.score = Math.floor(this.run.kills * 12 + this.run.stage * 400 + this.run.time);
    META.stats.bestStage = Math.max(META.stats.bestStage || 0, this.run.stage);
    META.stats.bestScore = Math.max(META.stats.bestScore || 0, this.run.score);
    Music.stop();
    bankRun(this.run);
  },

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

    this.run.time += dt; this.stageTime += dt;
    // screen shake stays gentle by default, swelling only when near death
    const hpFrac = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    setShakeScale(hpFrac < 0.25 ? 1.0 : 0.42);
    this.world.update(dt);
    this.aimCamera();
    if (this.bannerT > 0) this.bannerT -= dt;

    this.spawnTick(dt);
    if (!this.boss && !this.exitActive && this.stageTime >= this.goalTime) { this.exitActive = true; this.banner = '出口已開啟 → 前往傳送門'; this.bannerT = 2.4; Sfx.play('portal'); }

    if (this.shopOffers) this.updateShop();
    if (this.exitActive && dist(this.player.x, this.player.y, this.map.exit.x, this.map.exit.y) < 14) this.nextStage();
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
    if (this.shopOffers) for (const o of this.shopOffers) if (!o.bought) dot(o.x, o.y, P.shardL, 3 * S);
    if (this.exitActive) dot(this.map.exit.x, this.map.exit.y, P.manaL, 4.5 * S);
    dot(this.player.x, this.player.y, '#ffffff', 4 * S);
  },

  aimCamera() {
    const halfW = view.W / 2 / camera.zoom, halfH = view.H / 2 / camera.zoom;
    const pxW = this.map.tw * TS, pxH = this.map.th * TS;
    camera.targetX = pxW > halfW * 2 ? clamp(this.player.x, halfW, pxW - halfW) : pxW / 2;
    camera.targetY = pxH > halfH * 2 ? clamp(this.player.y, halfH, pxH - halfH) : pxH / 2;
  },

  updateShop() {
    let near = null;
    for (const o of this.shopOffers) if (!o.bought && dist(this.player.x, this.player.y, o.x, o.y) < 18) near = o;
    this.nearOffer = near;
    if (near && pressed('interact')) {
      if (this.run.shards >= near.price) {
        this.run.shards -= near.price; near.bought = true;
        if (near.kind === 'equip') equipItem(this.player, this.run, near.def);
        else if (this.run.inventory.length < 6) this.run.inventory.push(near.def.id);
        this.world.particles.ring(near.x, near.y, P.goldL, 14, 80);
        this.world.particles.text(near.x, near.y - 14, '購買！', { color: P.goldL, size: 13 });
        Sfx.play(near.kind === 'equip' ? 'equip' : 'buy');
      } else this.world.particles.text(this.player.x, this.player.y - 16, '魂晶不足', { color: P.redL, size: 12 });
    }
  },

  // ---- render --------------------------------------------------------------
  render() {
    this.world.draw();
    this.drawExit();
    if (this.shopOffers) this.drawShop();
    vignette(0.42);
    drawLowHpWarning(this.player, this.t);
    this.world.particles.drawText();
    drawHud(this.run, this.player);
    this.drawStageHud();
    this.drawMinimap();
    this.drawBanner();
    if (this.choice) this.drawChoice();
    if (this.dead) this.drawDeath();
    if (this.paused) this.drawPause();
    settingsUI.draw();
  },

  drawExit() {
    const e = this.map.exit; const S = uiScale();
    if (this.exitActive) {
      const sp = getSprite('portal');
      glowWorld(e.x, e.y - 8, 18, P.manaL, 0.32 + Math.sin(this.t * 3) * 0.08);
      drawSprite(frameAt(sp, this.t), e.x, e.y, { ax: sp.ax, ay: sp.ay });
      const ss = worldToScreen(e.x, e.y - 28);
      uiText('傳送門 →', ss.x, ss.y, { size: 11 * S, align: 'center', color: P.manaL, weight: '800' });
    }
  },

  drawShop() {
    const S = uiScale();
    for (const o of this.shopOffers) {
      fillRectWorld(o.x - 7, o.y + 2, 14, 6, P.gray1); fillRectWorld(o.x - 6, o.y + 1, 12, 2, P.gray2);
      if (o.bought) { const ss = worldToScreen(o.x, o.y - 4); uiText('已售出', ss.x, ss.y, { size: 11 * S, align: 'center', color: P.gray3 }); continue; }
      const sp = getSprite(o.def.icon); const bob = Math.sin(this.t * 3 + o.x) * 1.5;
      glowWorld(o.x, o.y - 8 + bob, 11, o.kind === 'equip' ? P.goldL : P.shardL, 0.22);
      drawSprite(sp.frames[0], o.x, o.y - 8 + bob, { ax: sp.ax, ay: sp.ay });
      const ns = worldToScreen(o.x, o.y - 22); uiText(o.def.name, ns.x, ns.y, { size: 11 * S, align: 'center', color: '#fff', weight: '700' });
      const ps = worldToScreen(o.x, o.y + 16); uiText('魂晶 ' + o.price, ps.x, ps.y, { size: 11 * S, align: 'center', color: this.run.shards >= o.price ? P.shardL : P.redL, weight: '800' });
      if (this.nearOffer === o) uiText('按 E 購買', ps.x, ps.y + 14 * S, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.5 + Math.sin(this.t * 6) * 0.3) });
    }
  },

  drawStageHud() {
    const S = uiScale();
    // stage + biome + timer (top center, below the wave banner area)
    const name = this.map.biome.name;
    uiText(`第 ${this.run.stage} 區 · ${name}`, view.W / 2, 24 * S, { size: 16 * S, align: 'center', color: '#fff', weight: '800' });
    const mins = Math.floor(this.run.time / 60), secs = Math.floor(this.run.time % 60);
    uiText(`${mins}:${secs.toString().padStart(2, '0')}`, view.W / 2, 42 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '700' });
    // stage goal bar
    if (!this.boss) {
      const frac = clamp(this.stageTime / this.goalTime, 0, 1);
      const bw = Math.min(220 * S, view.W * 0.3);
      uiBar(view.W / 2 - bw / 2, 52 * S, bw, 6 * S, frac, { fg: frac >= 1 ? P.manaL : this.map.biome.accent, bg: '#16183a', border: P.ink });
      uiText(frac >= 1 ? '出口已開啟' : '存活中…', view.W / 2, 68 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    } else if (this.bossRef && !this.bossDead && !this.bossRef.dead) {
      const bw = Math.min(360 * S, view.W * 0.5);
      uiText(this.bossRef.def.name, view.W / 2, 50 * S, { size: 13 * S, align: 'center', color: P.redL, weight: '800' });
      uiBar(view.W / 2 - bw / 2, 58 * S, bw, 9 * S, this.bossRef.hp / this.bossRef.maxHp, { fg: P.red, bg: '#2a0e14', border: P.ink, glow: true });
    }
  },

  drawBanner() {
    if (this.bannerT <= 0) return;
    const S = uiScale(); const a = Math.min(1, this.bannerT);
    uiText(this.banner, view.W / 2, view.H * 0.2, { size: 28 * S, align: 'center', color: withAlpha('#ffe9a0', a), weight: '900', shadowColor: withAlpha('#000', a * 0.8) });
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

  wrapText(str, cx, y, maxw, size) {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '600') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.forEach((l, i) => uiText(l, cx, y + i * (size + 3), { size, align: 'center', color: '#c8cfe8', weight: '600' }));
  },

  drawChoice() {
    const S = uiScale();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.8));
    const rects = this.cardRects();
    uiText('選 擇 強 化', view.W / 2, rects[0].y - 26 * S, { size: 26 * S, align: 'center', color: P.manaL, weight: '900' });
    uiText('（點擊卡片或按 1 / 2 / 3）', view.W / 2, rects[0].y - 6 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    rects.forEach((r, i) => {
      const c = this.choice.options[i]; const st = choiceStyle(c); const hover = this.choice.hover === i;
      const oy = hover ? -7 * S : 0;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha(st.bg, 0.97), { radius: 9 * S, stroke: hover ? st.accent : P.ink2, lw: hover ? 3 : 2 });
      if (hover) uiRect(r.x, r.y + oy, r.w, 4 * S, st.accent, { radius: 2 * S });
      const sp = getSprite(iconOr(st.icon, c.kind === 'ability' ? 'ability_power' : 'weapon_w_soulbolt')); const isc = (r.w * 0.44) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 16 * S, isc);
      const midY = r.y + oy + 16 * S + sp.h * isc;
      uiText(st.sub, r.x + r.w / 2, midY + 14 * S, { size: 11 * S, align: 'center', color: st.accent, weight: '800' });
      uiText(c.def.name, r.x + r.w / 2, midY + 34 * S, { size: 16 * S, align: 'center', color: '#fff', weight: '800' });
      this.wrapText(st.desc || '', r.x + r.w / 2, midY + 54 * S, r.w - 22 * S, 12.5 * S);
      uiText(String(i + 1), r.x + 11 * S, r.y + oy + 20 * S, { size: 14 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },
};

refs.run = runScene;
