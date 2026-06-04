// In-run gameplay: continuous-survival across large biome stages. Walk only
// (weapons auto-fire); enemies pour in endlessly and escalate. Survive each
// stage's timer (or slay its boss) to open the exit to the next biome.
import { World, TS } from '../world.js';
import { generateWorld } from '../maps.js';
import { Player } from '../player.js';
import { newRun, bankRun, META, saveMeta } from '../state.js';
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { Enemies, Equipment, Abilities } from '../content/registry.js';
import { equipItem } from '../content/equipment.js';
import {
  camera, clear, vignette, uiText, uiRect, uiScale, view, addShake, drawSpriteUI, textWidth,
  drawSprite, drawShadow, glowWorld, worldToScreen, fillRectWorld, uiBar, setShakeScale,
} from '../../engine/renderer.js';
import { drawHud, drawLowHpWarning, hudIcons } from '../hud.js';
import { pressed, mouse } from '../../engine/input.js';
import { rng, dist, clamp, TAU } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { getRunChoices, applyChoice, choiceStyle } from '../progression.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

// LoL-Arena-style stat anvils sold at the in-run shop (repeatable; price climbs).
const ANVILS = [
  { name: '力量鐵砧', desc: '傷害 ×1.08', price: 45, apply: (s) => { s.damageMult *= 1.08; } },
  { name: '迅捷鐵砧', desc: '射速 ×1.06', price: 45, apply: (s) => { s.fireRateMult *= 1.06; } },
  { name: '堅韌鐵砧', desc: '生命上限 +14', price: 42, apply: (s, p) => { s.maxHp += 14; p.heal(14); } },
  { name: '銳利鐵砧', desc: '暴擊率 +4%', price: 50, apply: (s) => { s.critChance += 0.04; } },
  { name: '疾風鐵砧', desc: '移速 ×1.04', price: 40, apply: (s) => { s.speed *= 1.04; } },
  { name: '壁壘鐵砧', desc: '減傷 +1', price: 55, apply: (s) => { s.defense += 1; } },
];

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
    this.world.onEnemyKilled = (e) => { if (e.boss) this.onBossDead(e); };
    this.buildWorld();
  },

  // ---- single persistent battleground --------------------------------------
  buildWorld() {
    const map = generateWorld();
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

    // time-based threat + a rotating roster of only 1-3 active enemy types
    this.threat = 1;
    this.spawnTimer = 2.0;
    this.activeTypes = [];
    this.typeRotT = 0;
    this.rotateTypes();

    // bosses arrive as periodic events rather than stage gates
    this.boss = false; this.bossRef = null; this.bossDead = false;
    this.nextBossAt = 100;

    Music.setBiome(map.biome.id); Music.setHero(this.run.characterId);
    Music.setMode('run');
    this.banner = map.biome.name + ' · 永恆獵場';
    this.bannerT = 2.6;
  },

  tierCapNow() { return Math.min(4, 1 + Math.floor(this.threat / 2)); },

  // choose 1-3 enemy types for the current wave window; rotates over time
  rotateTypes() {
    const pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss);
    if (!pool.length) { this.activeTypes = []; this.typeRotT = 24; return; }
    const n = this.threat <= 1 ? 1 + rng.int(0, 1) : 1 + rng.int(0, 2);
    const picks = []; let p = pool.slice();
    for (let i = 0; i < n && p.length; i++) { const d = rng.weighted(p, (x) => x.weight ?? 1); picks.push(d); p = p.filter((x) => x !== d); }
    this.activeTypes = picks;
    this.typeRotT = 30 + rng.next() * 18;
    if (this.run.time > 3) { this.banner = '敵潮更替：' + picks.map((d) => d.name).join('、'); this.bannerT = 2.0; }
  },

  setupShrine(pos) {
    this.shrinePos = pos;
    this.shopGear = this.rollShopGear();
    this.shopAnvils = ANVILS.map((a) => ({ ...a, buys: 0 }));
  },
  rollShopGear() {
    const pool = Equipment.all().filter((d) => (d.tier ?? 1) >= 2);
    const src = (pool.length ? pool : Equipment.all()).slice();
    const offers = [];
    for (let i = 0; i < 4 && src.length; i++) {
      const d = src.splice(rng.int(0, src.length - 1), 1)[0];
      offers.push({ def: d, price: Math.round((d.price || 60) * 1.6), bought: false });
    }
    return offers;
  },

  bossEventTick(dt) {
    if (this.boss) return;
    if (this.run.time >= this.nextBossAt) this.spawnBossEvent();
  },
  spawnBossEvent() {
    const bosses = Enemies.filter((d) => d.boss);
    if (!bosses.length) { this.nextBossAt = this.run.time + 120; return; }
    const def = bosses[rng.int(0, bosses.length - 1)];
    const hpScale = 1 + (this.threat - 1) * 0.34;
    const dmgScale = 1 + (this.threat - 1) * 0.12;
    const a = rng.next() * TAU, R = 150;
    const bx = clamp(this.player.x + Math.cos(a) * R, TS * 2, this.world.pxW - TS * 2);
    const by = clamp(this.player.y + Math.sin(a) * R, TS * 2, this.world.pxH - TS * 2);
    this.bossRef = this.world.spawnEnemy(def, bx, by, { hpScale, dmgScale, quiet: true });
    this.boss = true; this.bossDead = false;
    this.banner = (def.name || 'BOSS') + ' 現身！'; this.bannerT = 2.8;
    addShake(8); Sfx.play('boss'); Music.setMode('boss');
  },
  onBossDead(e) {
    this.boss = false; this.bossDead = true; this.bossRef = null;
    this.nextBossAt = this.run.time + 140 + rng.next() * 40;
    this.banner = '擊敗首領！'; this.bannerT = 2.6; addShake(6);
    this.world.addPickup('heart', this.player.x, this.player.y, 28);
    Music.setMode('run');
  },

  // continuous spawning from the current 1-3 active enemy types
  spawnTick(dt) {
    if (this.boss) return;                 // pause the swarm while a boss is up
    this.typeRotT -= dt;
    if (this.typeRotT <= 0) this.rotateTypes();
    this.spawnTimer -= dt;
    const t = this.run.time;
    const cap = Math.min(120, 24 + this.threat * 6 + Math.floor(t * 0.05));
    if (this.spawnTimer <= 0 && this.world.enemies.length < cap && this.activeTypes.length) {
      const group = 2 + Math.floor(this.threat / 2) + (rng.chance(0.3) ? 1 : 0);
      const hpScale = 1 + (this.threat - 1) * 0.20 + t * 0.006;
      const dmgScale = 1 + (this.threat - 1) * 0.10 + t * 0.004;
      for (let i = 0; i < group; i++) {
        const def = this.activeTypes[rng.int(0, this.activeTypes.length - 1)];
        const elite = this.threat >= 3 && rng.chance(0.035 + t * 0.0004);
        this.world.spawnRing(def, { hpScale, dmgScale, elite });
      }
      this.spawnTimer = Math.max(0.5, 1.6 - this.threat * 0.06 - t * 0.004);
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
    if (pressed('map')) { this.showBuild = !this.showBuild; Sfx.play('uiClick'); }
    if (this.showBuild) return;   // freeze the field while reviewing your build
    if (this.shopOpen) { this.updateShopPanel(); return; }   // modal shop also freezes the field

    this.run.time += dt;
    this.threat = 1 + Math.floor(this.run.time / 45);
    this.run.stage = this.threat; this.run.floor = this.threat;   // keep loot/score scaling alive
    // screen shake stays gentle by default, swelling only when near death
    const hpFrac = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    setShakeScale(hpFrac < 0.25 ? 1.0 : 0.42);
    this.world.update(dt);
    this.aimCamera();
    if (this.bannerT > 0) this.bannerT -= dt;

    this.spawnTick(dt);
    this.bossEventTick(dt);
    this.nearShrine = !!(this.shrinePos && dist(this.player.x, this.player.y, this.shrinePos.x, this.shrinePos.y) < 20);
    if (this.nearShrine && pressed('interact')) { this.shopOpen = true; Sfx.play('uiClick'); }
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
    const gearCards = [], anvilCards = [];
    if (showGear) this.shopGear.forEach((offer, i) => gearCards.push({ x: gearX, y: top + i * (cardH + gap), w: colW, h: cardH, offer }));
    const aX = showGear ? anvilX : x + w / 2 - colW / 2;
    this.shopAnvils.forEach((anvil, i) => anvilCards.push({ x: aX, y: top + i * (cardH + gap), w: colW, h: cardH, anvil }));
    return { S, x, y, w, h, close, gearCards, anvilCards, gearX, anvilX: aX, colW, top, showGear };
  },
  updateShopPanel() {
    if (pressed('escape') || pressed('interact') || pressed('map')) { this.shopOpen = false; return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.shopLayout();
    if (mouse.justDown) {
      if (inside(mx, my, L.close)) { this.shopOpen = false; return; }
      for (const c of L.gearCards) if (inside(mx, my, c)) { this.buyGear(c.offer); return; }
      for (const c of L.anvilCards) if (inside(mx, my, c)) { this.buyAnvil(c.anvil); return; }
      if (!inside(mx, my, L)) this.shopOpen = false;
    }
  },
  buyGear(offer) {
    if (!offer || offer.bought || this.run.purist) return;
    if (this.run.shards < offer.price) { this.flashShop('魂晶不足'); return; }
    this.run.shards -= offer.price; offer.bought = true;
    equipItem(this.player, this.run, offer.def);
    Sfx.play('equip');
  },
  buyAnvil(anvil) {
    const price = Math.round(anvil.price * Math.pow(1.3, anvil.buys || 0));
    if (this.run.shards < price) { this.flashShop('魂晶不足'); return; }
    this.run.shards -= price; anvil.buys = (anvil.buys || 0) + 1;
    try { anvil.apply(this.player.stats, this.player); } catch (e) { /* */ }
    this.run.anvilCount = (this.run.anvilCount || 0) + 1;
    Sfx.play('buy');
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
    vignette(0.42);
    drawLowHpWarning(this.player, this.t);
    this.world.particles.drawText();
    drawHud(this.run, this.player);
    this.drawStageHud();
    this.drawMinimap();
    this.drawBanner();
    this.drawInfo();
    if (this.shopOpen) this.drawShopPanel();
    if (this.choice) this.drawChoice();
    if (this.dead) this.drawDeath();
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
    uiText('能力值鐵砧', L.anvilX, L.top - 14 * S, { size: 13 * S, color: P.shardL, weight: '800' });
    if (this.run.purist) uiText('純能力值之道：不再販售裝備', L.x + L.w / 2, L.y + 54 * S, { size: 11 * S, align: 'center', color: P.purpleL, weight: '700' });
    else uiText('整局不取裝備、專注鐵砧，或有奇遇…', L.x + L.w / 2, L.y + 54 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    for (const c of L.gearCards) this.drawShopCard(c, 'gear', mx, my, S);
    for (const c of L.anvilCards) this.drawShopCard(c, 'anvil', mx, my, S);
    uiText('點擊購買　·　E / Esc 關閉', L.x + L.w / 2, L.y + L.h - 13 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    if (this.shopFlashT > 0) { this.shopFlashT -= 1 / 60; uiText(this.shopFlash, L.x + L.w / 2, L.y + L.h - 30 * S, { size: 12 * S, align: 'center', color: P.redL, weight: '800' }); }
  },
  drawShopCard(c, kind, mx, my, S) {
    const hover = inside(mx, my, c);
    if (kind === 'gear') {
      const o = c.offer; const afford = this.run.shards >= o.price;
      uiRect(c.x, c.y, c.w, c.h, withAlpha(o.bought ? '#1c2c1c' : '#1b2138', 0.96), { radius: 7 * S, stroke: hover && !o.bought ? P.goldL : P.ink2, lw: hover ? 3 : 2 });
      const sp = getSprite(iconOr(o.def.icon, 'equip_leather_armor'));
      drawSpriteUI(sp.frames[0], c.x + 6 * S, c.y + 6 * S, (26 * S) / sp.w);
      uiText(o.def.name, c.x + 38 * S, c.y + 18 * S, { size: 12 * S, color: '#fff', weight: '800' });
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
    const name = this.map.biome.name;
    uiText(`威脅 ${this.threat} 級 · ${name}`, view.W / 2, 24 * S, { size: 16 * S, align: 'center', color: '#fff', weight: '800' });
    const mins = Math.floor(this.run.time / 60), secs = Math.floor(this.run.time % 60);
    uiText(`存活 ${mins}:${secs.toString().padStart(2, '0')}`, view.W / 2, 42 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '700' });
    if (this.boss && this.bossRef && !this.bossRef.dead) {
      const bw = Math.min(360 * S, view.W * 0.5);
      uiText(this.bossRef.def.name, view.W / 2, 56 * S, { size: 13 * S, align: 'center', color: P.redL, weight: '800' });
      uiBar(view.W / 2 - bw / 2, 64 * S, bw, 9 * S, this.bossRef.hp / this.bossRef.maxHp, { fg: P.red, bg: '#2a0e14', border: P.ink, glow: true });
    } else if (this.activeTypes && this.activeTypes.length) {
      uiText('當前敵潮：' + this.activeTypes.map((d) => d.name).join('、'), view.W / 2, 54 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    }
  },

  // ---- info: hover tooltips + Tab build panel (R11) ------------------------
  drawInfo() {
    if (this.choice || this.dead || this.paused || settingsUI.open) return;
    const S = uiScale();
    if (this.showBuild) { this.drawBuildPanel(S); return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    let hov = null;
    for (const ic of hudIcons) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hov = ic;
    if (hov) this.drawTooltip(hov, mx, my, S);
    else uiText('Tab：查看 build', view.W - 12 * S, view.H - 10 * S, { size: 10 * S, align: 'right', color: withAlpha('#fff', 0.28) });
  },
  drawTooltip(ic, mx, my, S) {
    const def = ic.def; if (!def) return;
    const accent = ic.kind === 'weapon' ? P.shardL : ic.kind === 'ability' ? P.manaL : P.emberL;
    const sub = ic.kind === 'weapon' ? (def.evolved ? '★ 進化武器' : '武器 Lv.' + ic.level)
      : ic.kind === 'ability' ? ('被動 Lv.' + ic.level) : ('道具 ' + (ic.slot || ''));
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
    const w = Math.min(view.W * 0.86, 600 * S), h = Math.min(view.H * 0.82, 470 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.62));
    uiRect(x, y, w, h, withAlpha('#161a30', 0.98), { radius: 10 * S, stroke: P.ink2, lw: 2 });
    uiText('當前 BUILD', x + w / 2, y + 26 * S, { size: 18 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('（Tab 關閉）', x + w / 2, y + 44 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    const row = (t, xx, yy, c) => uiText(t, xx, yy, { size: 11.5 * S, color: c || P.gray4, weight: '500' });
    const head = (t, xx, yy, c) => uiText(t, xx, yy, { size: 13 * S, color: c, weight: '800' });
    const colL = x + 22 * S, colR = x + w / 2 + 10 * S; let yL = y + 70 * S, yR = y + 70 * S;
    head('武器', colL, yL, P.shardL); yL += 18 * S;
    for (const inst of this.player.weapons) { row((inst.def.evolved ? '★ ' : '') + inst.def.name + (inst.def.evolved ? '' : '  Lv.' + inst.level), colL, yL, '#fff'); yL += 15 * S; }
    yL += 8 * S; head('被動', colL, yL, P.manaL); yL += 18 * S;
    for (const id of (this.run.abilities || [])) { const a = Abilities.get(id); const stk = this.run.abilityLevels?.[id] || 1; row((a ? a.name : id) + (stk > 1 ? ' ×' + stk : ''), colL, yL, P.gray4); yL += 14 * S; if (yL > y + h - 20 * S) break; }
    head('裝備', colR, yR, P.goldL); yR += 18 * S;
    const eq = this.run.equipment || {};
    const eqName = (slot) => { const id = eq[slot]; const d = id && Equipment.get(id); return d ? d.name : '—'; };
    row('武器 ' + eqName('weapon'), colR, yR, '#fff'); yR += 15 * S;
    row('護甲 ' + eqName('armor'), colR, yR, '#fff'); yR += 15 * S;
    row('飾品 ' + eqName('trinket'), colR, yR, '#fff'); yR += 22 * S;
    head('數值', colR, yR, P.emberL); yR += 18 * S;
    const st = this.player.stats;
    const stats = [['生命', Math.round(this.player.hp) + '/' + this.player.maxHp], ['傷害', '×' + st.damageMult.toFixed(2)], ['射速', '×' + st.fireRateMult.toFixed(2)], ['暴擊', Math.round(st.critChance * 100) + '%'], ['移速', Math.round(st.speed)], ['減傷', String(st.defense || 0)], ['閃避', Math.round((st.dodge || 0) * 100) + '%'], ['吸血', Math.round((st.lifesteal || 0) * 100) + '%'], ['幸運', (st.luck || 0).toFixed(2)]];
    for (const [k, v] of stats) { row(k, colR, yR, P.gray3); uiText(v, x + w - 24 * S, yR, { size: 11.5 * S, align: 'right', color: '#fff', weight: '700' }); yR += 15 * S; }
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
