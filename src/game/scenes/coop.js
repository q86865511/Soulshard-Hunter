// Guest co-op scene (Phase 2). The guest does NOT simulate: it renders the host's
// authoritative world snapshots (interpolated) and pilots its own avatar with local
// prediction + reconciliation. Camera follows the guest's own avatar (each-follows-own).
import { World, TS } from '../world.js';
import { Player } from '../player.js';
import { Enemy } from '../enemy.js';
import { Enemies } from '../content/registry.js';
import { deserializeMap, applySnapshot } from '../net/protocol.js';
import { RT } from '../../net/rt.js';
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { Particles } from '../../engine/particles.js';
import {
  camera, vignette, uiText, uiRect, uiBar, uiScale, view, worldToScreen,
  drawSprite, drawShadow, glowWorld, lineWorld, drawSpriteUI,
} from '../../engine/renderer.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { pressed, mouse, moveAxis } from '../../engine/input.js';
import { clamp } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Music } from '../../engine/audio.js';

const lerp = (a, b, k) => a + (b - a) * k;
const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

export const coopScene = {
  enter(payload) {
    const start = payload.start, rs = payload.runstart;
    this.start = start; this.runstart = rs;
    this.selfCid = start.you;
    this.defList = rs.defs;
    this.t = 0; this.selfDead = false; this.runOver = false; this.hostGone = false; this.disconnected = false;
    this.runResult = null; this.inputSeq = 0; this._inAccum = 0; this._dashPend = false;
    this.levelup = null; this._snapSilent = 0; this._gotSnap = false;
    this.particles = new Particles();
    this.banner = rs.biomeName || ''; this.bannerT = 2.4;

    // puppet world: tiles + hazards only (for drawing); entities live in our own maps
    this.map = deserializeMap(rs.map); this.map.biome.name = rs.biomeName || '';
    this.world = new World({ floor: 1 });
    this.world.loadMap(this.map);

    // player avatars (index-aligned to the snapshot's pl[]), for drawing
    this.players = rs.players.map((pp) => {
      const pl = new Player(this.map.entrance.x, this.map.entrance.y, { maxHp: 100, speed: pp.speed || 82 });
      pl.spriteName = pp.sprite || 'player'; pl.netName = pp.name; pl.cid = pp.cid;
      pl.isSelf = pp.cid === this.selfCid; pl.weapons = [];
      if (pl.isSelf) { pl.x = this.map.entrance.x; pl.y = this.map.entrance.y; }   // self renders immediately for local prediction
      else { pl.x = null; pl.y = null; }   // remotes appear only after the first snapshot — avoids the entrance->true-position pop
      pl.tx = pl.x; pl.ty = pl.y;
      pl.netX = pl.x; pl.netY = pl.y; pl.hp = 100; pl.nmax = 100; pl.faceX = 1;   // nmax = networked max HP (maxHp is a getter)
      return pl;
    });
    this.self = this.players.find((p) => p.isSelf) || this.players[0];
    this.selfSpeed = (this.self && this.self.stats && this.self.stats.speed) || 82;

    // the decode target shared with protocol.applySnapshot
    this.guest = {
      players: this.players, enemies: new Map(), pickups: new Map(), projectiles: [], beams: [],
      world: this.world, defList: this.defList, hud: null,
      makeEnemy: (idx, x, y) => this.makeEnemy(idx, x, y),
      onEnemyGone: (e) => this.deathFx(e),
    };

    camera.x = camera.targetX = this.self.x; camera.y = camera.targetY = this.self.y;
    Music.setBiome(this.map.biome.id); Music.setHero((this.runstart.players.find((p) => p.cid === this.selfCid) || {}).charId);
    Music.setMode('run');

    this._subs = [
      RT.on('snap', (m) => this.onSnap(m)),
      RT.on('runend', (m) => this.onRunEnd(m)),
      RT.on('room:closed', () => this.onHostGone()),       // authoritative: the host left / closed the room
      RT.on('rt:close', () => this.onDisconnected()),      // OUR socket dropped — distinct from host-gone (may be a transient blip)
      RT.on('levelup', (m) => { if (m.cid === this.selfCid && !this.runOver && !this.hostGone && !this.disconnected) this.levelup = { opts: m.opts || [], t: 0, hover: -1 }; }),
    ];
  },

  exit() {
    for (const u of (this._subs || [])) { try { u(); } catch (e) { /* */ } }
    this._subs = [];
    try { RT.leaveRoom(); } catch (e) { /* */ }   // always release the server room (idempotent) so it isn't orphaned
  },

  makeEnemy(idx, x, y) {
    if (idx < 0 || idx >= this.defList.length) return null;   // guard out-of-range/corrupted snapshot defIdx (host/version mismatch)
    const id = this.defList[idx]; const def = id && Enemies.get(id);
    if (!def) return null;
    const e = new Enemy(def, x, y, this.world, { quiet: true });
    e.spawnT = 0; e.tx = x; e.ty = y; e.t = Math.random() * 6; e.flash = 0; e.status = {};
    return e;
  },
  deathFx(e) { try { this.particles.death(e.x, e.y, (e.def && e.def.bloodColor) || P.green); } catch (err) { /* */ } },

  // ---- network in ----------------------------------------------------------
  onSnap(m) { try { applySnapshot(this.guest, m); } catch (e) { /* a bad frame must not kill the scene */ } this._gotSnap = true; this._snapSilent = 0; },
  onRunEnd(m) { this.runOver = true; this.runResult = m || {}; Music.setMode(m && m.won ? 'victory' : 'death'); },
  onHostGone() { if (this.runOver) return; this.hostGone = true; Music.setMode('hub'); },
  // our own socket dropped mid-run. The server treats a guest disconnect as a leave (new cid
  // on reconnect can't resume v1), so the session is over — but say "you disconnected", not "host left".
  onDisconnected() { if (this.runOver || this.hostGone) return; this.disconnected = true; Music.setMode('hub'); },

  // ---- input out (throttled ~33Hz; dash coalesced so a press is never dropped) --
  sendInputTick(dt) {
    if (pressed('dash')) this._dashPend = true;
    this._inAccum += dt;
    if (this._inAccum >= 1 / 33) {
      this._inAccum = 0;
      const ax = moveAxis();
      RT.input({ seq: ++this.inputSeq, mv: [Math.round(ax.x * 1000) / 1000, Math.round(ax.y * 1000) / 1000], dash: this._dashPend });
      this._dashPend = false;
    }
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt; this.world.time += dt;
    if (this.bannerT > 0) this.bannerT -= dt;

    if (this.runOver || this.hostGone || this.disconnected) {
      this.particles.update(dt);
      if (this.t > 0.4 && (pressed('space') || pressed('enter') || mouse.justDown)) setScene(refs.hub, {});
      return;
    }
    // host's snapshots stopped flowing (host crashed / lost network) without a clean
    // room:closed → treat as host gone after a grace window.
    this._snapSilent += dt;
    if (this._gotSnap && this._snapSilent > 6) { this.onHostGone(); return; }

    if (this.levelup) this.updateLevelup(dt);   // non-blocking level-up pick
    if (pressed('escape')) { this.leave(); return; }

    this.sendInputTick(dt);
    this.predictSelf(dt);

    const k = Math.min(1, 18 * dt);
    for (const e of this.guest.enemies.values()) { e.x = lerp(e.x, e.tx, k); e.y = lerp(e.y, e.ty, k); e.t += dt; if (e.flash > 0) e.flash -= dt; }
    for (const q of this.guest.pickups.values()) { q.x = lerp(q.x, q.tx, k); q.y = lerp(q.y, q.ty, k); q.t += dt; }
    for (const p of this.guest.projectiles) { p.x += p.vx * dt; p.y += p.vy * dt; }
    for (const pl of this.players) {
      if (pl.isSelf || pl.x == null) continue;
      pl.x = lerp(pl.x, pl.tx, k); pl.y = lerp(pl.y, pl.ty, k); pl.t += dt; if (pl.moving) pl.walkT += dt;
    }
    for (let i = this.guest.beams.length - 1; i >= 0; i--) { this.guest.beams[i].life -= dt; if (this.guest.beams[i].life <= 0) this.guest.beams.splice(i, 1); }
    this.particles.update(dt);

    this.selfDead = !!(this.self && this.self.dead);
    this.aimCamera();
  },

  predictSelf(dt) {
    const s = this.self; if (!s) return;
    s.t += dt;
    if (s.dead) { if (s.netX != null) { s.x = s.netX; s.y = s.netY; } return; }   // spectate from the authoritative spot
    const ax = moveAxis(); const sp = s.nspeed || this.selfSpeed;   // track the host's live speed (slow/buff/level-up) so prediction doesn't drift
    const tvx = ax.x * sp, tvy = ax.y * sp, acc = (ax.x || ax.y) ? 26 : 20;
    s.vx = (s.vx || 0) + (tvx - (s.vx || 0)) * Math.min(1, acc * dt);
    s.vy = (s.vy || 0) + (tvy - (s.vy || 0)) * Math.min(1, acc * dt);
    s.moving = !!(ax.x || ax.y);
    if (ax.x) s.faceX = ax.x;   // update facing immediately on any horizontal input (even pure-vertical movement keeps last facing)
    if (s.moving) s.walkT += dt;
    this.world.moveActor(s, s.vx * dt, s.vy * dt);
    if (s.netX != null) {   // reconcile toward the host's authoritative position
      const ex = s.netX - s.x, ey = s.netY - s.y, e = Math.hypot(ex, ey);
      if (e > 72) { s.x = s.netX; s.y = s.netY; s.vx = s.vy = 0; }
      else { s.x += ex * Math.min(1, 8 * dt); s.y += ey * Math.min(1, 8 * dt); }
    }
  },

  aimCamera() {
    const s = this.self; if (!s || s.x == null) return;
    const halfW = view.W / 2 / camera.zoom, halfH = view.H / 2 / camera.zoom;
    const pxW = this.map.tw * TS, pxH = this.map.th * TS;
    camera.targetX = pxW > halfW * 2 ? clamp(s.x, halfW, pxW - halfW) : pxW / 2;
    camera.targetY = pxH > halfH * 2 ? clamp(s.y, halfH, pxH - halfH) : pxH / 2;
  },

  leave() { try { RT.leaveRoom(); } catch (e) { /* */ } setScene(refs.hub, {}); },

  // ---- non-blocking level-up pick (options computed by the host; host applies) -----
  levelupRects(n) {
    const S = uiScale(); const cw = Math.min(150 * S, (view.W - 40 * S) / n - 12 * S); const ch = cw * 1.18; const gap = 12 * S;
    const totalW = n * cw + (n - 1) * gap; const x0 = (view.W - totalW) / 2; const y = view.H - ch - 16 * S;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateLevelup(dt) {
    const lu = this.levelup; if (!lu.opts.length) { this.levelup = null; return; }
    lu.t += dt;
    const rects = this.levelupRects(lu.opts.length); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    lu.hover = -1; rects.forEach((r, i) => { if (inside(mx, my, r)) lu.hover = i; });
    let pick = -1;
    if (mouse.justDown && lu.hover >= 0) pick = lu.hover;
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick < 0 && lu.t > 18) pick = 0;   // auto-pick if ignored far too long
    if (pick >= 0 && pick < lu.opts.length) {
      RT.send({ t: 'levelpick', i: pick });
      if (this.self) this.particles.ring(this.self.x, this.self.y, P.manaL, 18, 100);
      this.levelup = null;
    }
  },
  drawLevelupMenu() {
    const S = uiScale(); const lu = this.levelup; const rects = this.levelupRects(lu.opts.length);
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiText('★ 升級！選擇武器（點擊或按 1 / 2 / 3）', view.W / 2, rects[0].y - 12 * S, { size: 13 * S, align: 'center', color: P.manaL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
    rects.forEach((r, i) => {
      const o = lu.opts[i]; const hover = lu.hover === i; const oy = hover ? -6 * S : 0;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha('#1b2840', 0.96), { radius: 8 * S, stroke: hover ? P.shardL : withAlpha(P.shardL, 0.5), lw: hover ? 3 : 2 });
      uiRect(r.x, r.y + oy, r.w, 4 * S, P.shardL, { radius: 2 * S });
      const sp = getSprite(iconOr(o.icon, 'weapon_w_soulbolt')); const isc = (r.w * 0.36) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 12 * S, isc);
      const midY = r.y + oy + 14 * S + sp.h * isc;
      uiText(o.act === 'new' ? '新武器' : o.act === 'heal' ? '回復生命' : ('Lv.' + o.lvl + ' → ' + (o.lvl + 1)), r.x + r.w / 2, midY + 8 * S, { size: 10 * S, align: 'center', color: P.shardL, weight: '800' });
      uiText(o.name, r.x + r.w / 2, midY + 24 * S, { size: 13 * S, align: 'center', color: '#fff', weight: '800' });
      uiText(String(i + 1), r.x + 9 * S, r.y + oy + 18 * S, { size: 13 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },

  // ---- render --------------------------------------------------------------
  render() {
    this.drawField();
    vignette(0.4);
    this.particles.drawText();
    this.drawHud();
    // banner: prefer the host's synced announcement (敵潮/小王/羈絆/通關…); fall back to the local intro
    const hb = this.guest.hud;
    const bText = (hb && hb.bannerT > 0 && hb.banner) ? hb.banner : (this.bannerT > 0 ? this.banner : null);
    const bA = (hb && hb.bannerT > 0 && hb.banner) ? Math.min(1, hb.bannerT) : Math.min(1, this.bannerT);
    if (bText) uiText(bText, view.W / 2, view.H * 0.2, { size: 26 * uiScale(), align: 'center', color: withAlpha('#ffe9a0', bA), weight: '900', shadowColor: withAlpha('#000', bA * 0.8) });
    if (this.levelup && !this.runOver && !this.hostGone && !this.disconnected) this.drawLevelupMenu();
    if (this.selfDead && !this.runOver && !this.hostGone && !this.disconnected) this.drawSpectate();
    if (this.runOver) this.drawRunOver();
    if (this.hostGone) this.drawHostGone();
    if (this.disconnected && !this.hostGone) this.drawDisconnected();
  },

  drawField() {
    this.world.drawTiles();
    this.world.drawHazards();
    for (const d of this.world.decor) { const sp = getSprite(d.sprite); drawSprite(frameAt(sp, this.world.time, d.phase || 0), d.x, d.y, { ax: sp.ax, ay: sp.ay }); }
    // depth-sorted actors (pickups + enemies + players)
    const draws = [];
    for (const q of this.guest.pickups.values()) draws.push({ y: q.y, fn: () => this.drawPickup(q) });
    for (const e of this.guest.enemies.values()) draws.push({ y: e.y, fn: () => e.draw(this.world) });
    for (const pl of this.players) if (pl && !pl.dead && pl.x != null) draws.push({ y: pl.y, fn: () => pl.draw(this.world) });
    draws.sort((a, b) => a.y - b.y);
    for (const d of draws) { try { d.fn(); } catch (e) { /* */ } }
    // projectiles above actors
    for (const p of this.guest.projectiles) {
      glowWorld(p.x, p.y, 3 * 2.2 * p.scale, p.color, 0.5);
      const sp = getSprite(p.sprite); drawSprite(sp.frames[0], p.x, p.y, { ax: sp.ax, ay: sp.ay, rot: p.rot + Math.PI / 2, scale: p.scale });
    }
    for (const b of this.guest.beams) {
      const a = Math.max(0, b.life / b.max);
      lineWorld(b.x0, b.y0, b.x1, b.y1, withAlpha('#ffffff', a), 3);
      lineWorld(b.x0, b.y0, b.x1, b.y1, withAlpha(b.color, a * 0.8), 1.5);
    }
    this.particles.draw();
  },

  drawPickup(q) {
    const sp = getSprite(q.sprite); const bob = Math.sin(q.t * 4) * 1.2;
    drawShadow(q.x, q.y, 3, 0.28);
    drawSprite(frameAt(sp, q.t), q.x, q.y - 1 + bob, { ax: sp.ax, ay: sp.ay });
  },

  drawHud() {
    const S = uiScale(); const hud = this.guest.hud;
    // stage banner
    if (hud) {
      uiText(hud.ti || '', view.W / 2, 24 * S, { size: 15 * S, align: 'center', color: '#fff', weight: '800' });
      if (hud.bn) {
        uiText('★ ' + hud.bn, view.W / 2, 44 * S, { size: 13 * S, align: 'center', color: P.redL, weight: '800' });
        const bw = Math.min(360 * S, view.W * 0.5);
        uiBar(view.W / 2 - bw / 2, 52 * S, bw, 9 * S, hud.bf || 0, { fg: P.red, bg: '#2a0e14', border: P.ink, glow: true });
      } else if (hud.su) uiText(hud.su, view.W / 2, 42 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '700' });
    }
    // self HP + kills
    const s = this.self;
    if (s) {
      const sm = s.nmax || 1;
      uiBar(12 * S, 14 * S, 180 * S, 14 * S, Math.max(0, Math.min(1, s.hp / sm)), { fg: P.red, bg: '#2a0e14', border: P.ink });
      uiText(Math.max(0, Math.round(s.hp)) + ' / ' + Math.round(sm), 102 * S, 24 * S, { size: 10 * S, align: 'center', color: '#fff', weight: '700' });
    }
    uiText('連線合作 · 訪客' + (hud ? '　擊殺 ' + (hud.kills || 0) : ''), view.W - 12 * S, 18 * S, { size: 11 * S, align: 'right', color: withAlpha(P.shardL, 0.85), weight: '700' });
    // teammate name + hp tags above avatars
    for (const pl of this.players) {
      if (!pl || pl.dead || pl.x == null) continue;
      const ns = worldToScreen(pl.x, pl.y - 20);
      uiText(pl.netName + (pl.isSelf ? '（你）' : ''), ns.x, ns.y, { size: 9.5 * S, align: 'center', color: pl.isSelf ? P.shardL : '#cfe0ff', weight: '700', shadowColor: withAlpha('#000', 0.8) });
      const bw = 30 * S, bx = ns.x - bw / 2, by = ns.y + 3 * S;
      uiRect(bx, by, bw, 3.2 * S, withAlpha('#2a0e14', 0.9), { radius: 1.5 * S });
      uiRect(bx, by, bw * Math.max(0, Math.min(1, pl.hp / (pl.nmax || 1))), 3.2 * S, pl.isSelf ? P.greenL : P.red, { radius: 1.5 * S });
    }
    uiText('Esc 離開房間', view.W - 12 * S, view.H - 10 * S, { size: 10 * S, align: 'right', color: withAlpha('#fff', 0.3) });
  },

  drawSpectate() {
    const S = uiScale();
    uiText('你已陣亡 — 觀戰中', view.W / 2, view.H * 0.5, { size: 22 * S, align: 'center', color: P.redL, weight: '900', shadowColor: withAlpha('#000', 0.8) });
    uiText('隊友仍在奮戰…', view.W / 2, view.H * 0.5 + 26 * S, { size: 13 * S, align: 'center', color: P.gray3 });
  },
  drawRunOver() {
    const S = uiScale(); const won = this.runResult && this.runResult.won;
    uiRect(0, 0, view.W, view.H, withAlpha(won ? '#0b1a0d' : '#0b0d1a', 0.82));
    uiText(won ? '隊伍通關！' : '探索結束', view.W / 2, view.H * 0.36, { size: 34 * S, align: 'center', color: won ? P.goldL : P.redL, weight: '900' });
    if (this.runResult && this.runResult.score != null) uiText('隊伍分數 ' + this.runResult.score, view.W / 2, view.H * 0.36 + 36 * S, { size: 15 * S, align: 'center', color: '#fff', weight: '700' });
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', view.W / 2, view.H * 0.9, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },
  drawHostGone() {
    const S = uiScale();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.82));
    uiText('房間已關閉', view.W / 2, view.H * 0.42, { size: 30 * S, align: 'center', color: P.redL, weight: '900' });
    uiText('房主已離線或結束遊戲', view.W / 2, view.H * 0.42 + 30 * S, { size: 14 * S, align: 'center', color: P.gray3 });
    uiText('點擊返回城鎮', view.W / 2, view.H * 0.9, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.8), weight: '700' });
  },
  drawDisconnected() {
    const S = uiScale();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.82));
    uiText('與伺服器連線中斷', view.W / 2, view.H * 0.42, { size: 28 * S, align: 'center', color: P.redL, weight: '900' });
    uiText('你的網路斷線了 — 請返回城鎮重新加入房間', view.W / 2, view.H * 0.42 + 30 * S, { size: 14 * S, align: 'center', color: P.gray3 });
    uiText('點擊返回城鎮', view.W / 2, view.H * 0.9, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.8), weight: '700' });
  },
};

refs.coop = coopScene;
