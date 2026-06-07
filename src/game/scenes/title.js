// Title / main menu scene: main menu (開始遊戲 / 設定) + a 3-slot save picker.
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { META, loadMeta, applySettings, setActiveSlot, activeSlot, slotSummaries, deleteSlot, syncFromCloud } from '../state.js';
import { Net } from '../../net/api.js';
import { openAuth, openLeaderboard, isModalOpen, netToast } from '../../net/ui.js';
import { openSocial } from '../../net/social.js';
import { Characters } from '../content/registry.js';
import { uiText, uiRect, uiScale, view, drawSpriteUI, vignette, ctxRaw } from '../../engine/renderer.js';
import { getSprite, frameAt } from '../../engine/sprites.js';
import { pressed, mouse } from '../../engine/input.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

const AMBIENT = [
  { sprite: 'slime', x: 0.18, y: 0.62, s: 3.2, ph: 0 },
  { sprite: 'bat', x: 0.82, y: 0.34, s: 3.0, ph: 1 },
  { sprite: 'wisp', x: 0.75, y: 0.7, s: 3.0, ph: 2 },
  { sprite: 'shard', x: 0.26, y: 0.38, s: 3.4, ph: 0 },
];

const inside = (mx, my, r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
function fmtTime(s) { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? (h + ' 小時 ' + m + ' 分') : (m > 0 ? (m + ' 分鐘') : '未滿 1 分'); }

export const titleScene = {
  enter() { this.t = 0; this.mode = 'menu'; this.confirm = -1; this.slots = slotSummaries(); Music.setMode('title'); },

  // ---- layout (shared by update hit-testing + render) ----------------------
  layoutMenu() {
    const S = uiScale();
    // two big buttons (single vs multiplayer) + a row of three smaller (排行榜 · 帳號 · 設定)
    const bw = Math.min(210 * S, (view.W - 60 * S) / 2), bh = 66 * S, bgap = 20 * S;
    const totalBig = bw * 2 + bgap, x0 = view.W / 2 - totalBig / 2, yBig = view.H * 0.58;
    const sw = (totalBig - 2 * 9 * S) / 3, sh = 42 * S, sgap = 9 * S, ySub = yBig + bh + 18 * S;
    const u = Net.currentUser() || {};
    const acct = Net.isLoggedIn() ? ('☁ ' + (u.username || '帳號')) : '☁ 登入 / 註冊';
    return [
      { id: 'single', label: '🗡 單人遊戲', big: true, r: { x: x0, y: yBig, w: bw, h: bh } },
      { id: 'multi', label: '🌐 多人連線', big: true, r: { x: x0 + bw + bgap, y: yBig, w: bw, h: bh } },
      { id: 'leaderboard', label: '🏆 排行榜', r: { x: x0, y: ySub, w: sw, h: sh } },
      { id: 'account', label: acct, r: { x: x0 + sw + sgap, y: ySub, w: sw, h: sh } },
      { id: 'settings', label: '⚙ 設定', r: { x: x0 + 2 * (sw + sgap), y: ySub, w: sw, h: sh } },
    ];
  },
  layoutSlots() {
    const S = uiScale(); const cw = Math.min(540 * S, view.W - 36 * S), ch = 90 * S, gap = 12 * S;
    const x = view.W / 2 - cw / 2, y0 = view.H * 0.26;
    const cards = [];
    for (let i = 0; i < 3; i++) { const r = { x, y: y0 + i * (ch + gap), w: cw, h: ch }; cards.push({ i, r, delR: { x: r.x + r.w - 66 * S, y: r.y + 10 * S, w: 56 * S, h: 26 * S } }); }
    return { cards, back: { x: view.W / 2 - 80 * S, y: y0 + 3 * (ch + gap) + 8 * S, w: 160 * S, h: 40 * S } };
  },

  enterSlot(i) {
    setActiveSlot(i); loadMeta(i); try { applySettings(); } catch (e) { /* */ }
    // now that a slot is committed, reconcile it with the cloud (slot-gated; safe to pull)
    try { if (Net.isLoggedIn()) syncFromCloud().then(() => { try { applySettings(); } catch (e) { /* */ } }).catch(() => {}); } catch (e) { /* */ }
    setScene(refs.hub, {});
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;

    if (this.mode === 'slots') {
      if (pressed('escape')) { this.mode = 'menu'; this.confirm = -1; return; }
      const L = this.layoutSlots();
      if (mouse.justDown) {
        for (const c of L.cards) {                       // delete (with two-click confirm) takes priority over entering
          const s = this.slots[c.i];
          if (s && !s.empty && inside(mx, my, c.delR)) {
            if (this.confirm === c.i) { deleteSlot(c.i); this.slots = slotSummaries(); this.confirm = -1; }
            else this.confirm = c.i;
            return;
          }
        }
        for (const c of L.cards) if (inside(mx, my, c.r)) { this.enterSlot(c.i); return; }
        if (inside(mx, my, L.back)) { this.mode = 'menu'; this.confirm = -1; }
      }
      return;
    }

    // menu
    if (isModalOpen()) return;   // a DOM overlay (login / 多人 / 排行榜) is up — don't let canvas keys/clicks drive the title behind it
    if (pressed('escape')) { settingsUI.show(); return; }
    if (mouse.justDown) {
      for (const b of this.layoutMenu()) if (inside(mx, my, b.r)) { this.onMenu(b.id); return; }
    }
    if (pressed('space') || pressed('enter')) this.enterSlot(activeSlot());   // quick-start straight into the last-used slot
  },

  onMenu(id) {
    if (id === 'single') this.startSingle();
    else if (id === 'multi') {
      if (Net.isLoggedIn()) openSocial();
      else { openAuth(); netToast('多人連線需要先登入帳號'); }
    } else if (id === 'leaderboard') openLeaderboard();
    else if (id === 'account') openAuth();
    else if (id === 'settings') settingsUI.show();
  },
  startSingle() { this.slots = slotSummaries(); this.mode = 'slots'; this.confirm = -1; },

  // ---- render --------------------------------------------------------------
  render() {
    const S = uiScale();
    const ctx = ctxRaw();
    const g = ctx.createLinearGradient(0, 0, 0, view.H);
    g.addColorStop(0, '#161a35'); g.addColorStop(0.55, '#0e1024'); g.addColorStop(1, '#070810');
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.W, view.H);
    const rg = ctx.createRadialGradient(view.W / 2, view.H * 0.5, 0, view.W / 2, view.H * 0.5, view.W * 0.5);
    rg.addColorStop(0, withAlpha(P.shard, 0.10)); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, view.W, view.H);

    for (const a of AMBIENT) {
      const sp = getSprite(a.sprite);
      const bob = Math.sin(this.t * 1.4 + a.ph * 2) * 8 * S;
      drawSpriteUI(frameAt(sp, this.t, a.ph), view.W * a.x - sp.w * a.s * S / 2, view.H * a.y + bob, a.s * S, { alpha: 0.55 });
    }

    // title
    uiText('魂 晶 獵 手', view.W / 2, view.H * 0.16, { size: 50 * S, align: 'center', color: P.shardL, weight: '900', shadowColor: 'rgba(0,0,0,0.7)' });
    uiText('S O U L S H A R D   H U N T E R', view.W / 2, view.H * 0.16 + 34 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '700' });

    if (this.mode === 'slots') this.drawSlots(S);
    else this.drawMenu(S);

    vignette(0.5);
    settingsUI.draw();
  },

  drawMenu(S) {
    // drifting hero behind the menu
    const sp = getSprite('player'); const scale = 6.5 * S; const bob = Math.sin(this.t * 2) * 4 * S;
    const hx = view.W / 2, hy = view.H * 0.46;
    const ctx = ctxRaw();
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(hx, hy + bob, sp.w * scale * 0.32, sp.w * scale * 0.12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    drawSpriteUI(frameAt(sp, this.t * 0.6), hx - sp.ax * scale, hy - sp.h * scale + bob, scale);

    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const b of this.layoutMenu()) {
      const hov = inside(mx, my, b.r);
      const accent = b.id === 'multi' ? P.goldL : P.shardL;
      const baseBg = b.big ? (b.id === 'multi' ? '#2a2342' : '#16223a') : '#141832';
      uiRect(b.r.x, b.r.y, b.r.w, b.r.h, withAlpha(hov ? '#27306a' : baseBg, 0.96), { radius: 10 * S, stroke: hov ? accent : withAlpha(accent, b.big ? 0.55 : 0.35), lw: hov ? 3 : 2 });
      uiText(b.label, b.r.x + b.r.w / 2, b.r.y + b.r.h / 2 + (b.big ? 7 : 5) * S, { size: (b.big ? 21 : 14) * S, align: 'center', color: hov ? '#fff' : (b.big ? '#eaf2ff' : '#cfe0ff'), weight: b.big ? '900' : '800' });
    }
    uiText('金庫 ' + META.gold + '　·　最深 第 ' + (META.stats.bestStage || 0) + ' 區　·　最高分 ' + (META.stats.bestScore || 0), view.W / 2, view.H * 0.93, { size: 12 * S, align: 'center', color: P.gray2 });
    uiText('空白鍵 快速進入上次存檔　·　Esc 設定', view.W / 2, view.H * 0.97, { size: 11 * S, align: 'center', color: withAlpha(P.gray2, 0.7) });
  },

  drawSlots(S) {
    uiText('選擇存檔', view.W / 2, view.H * 0.23, { size: 18 * S, align: 'center', color: '#ffd479', weight: '800' });
    const L = this.layoutSlots(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const c of L.cards) {
      const s = this.slots[c.i]; const hov = inside(mx, my, c.r); const r = c.r;
      uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#1b2342' : '#141832', 0.97), { radius: 10 * S, stroke: hov ? P.shardL : withAlpha(P.shardL, 0.35), lw: hov ? 3 : 2 });
      uiRect(r.x, r.y, 5 * S, r.h, s && !s.empty ? P.shardL : withAlpha('#556', 0.8), { radius: 2 * S });
      const px = r.x + 16 * S;
      if (!s || s.empty) {
        uiText('存檔格 ' + (c.i + 1), px, r.y + 30 * S, { size: 16 * S, color: '#cfe0ff', weight: '800' });
        uiText('— 空的 — 點擊開始新遊戲', px, r.y + 56 * S, { size: 13 * S, color: P.gray3 });
      } else {
        const char = Characters.get(s.char); const cn = char ? char.name : s.char;
        uiText('存檔格 ' + (c.i + 1) + '　' + cn + (s.active ? '　★使用中' : ''), px, r.y + 26 * S, { size: 15 * S, color: '#fff', weight: '800' });
        uiText('遊戲時數 ' + fmtTime(s.playTime) + '　·　成就 ' + s.achievements + '　·　金庫 ' + s.gold, px, r.y + 48 * S, { size: 12 * S, color: P.shardL, weight: '700' });
        uiText('最深 第 ' + s.bestStage + ' 區　·　最高分 ' + s.bestScore + '　·　通關 ' + s.clears + '　·　生態 ' + s.biomesUnlocked + '/10', px, r.y + 68 * S, { size: 11.5 * S, color: P.gray3 });
        // delete button (two-click confirm)
        const d = c.delR; const confirming = this.confirm === c.i;
        uiRect(d.x, d.y, d.w, d.h, withAlpha(confirming ? '#5a2030' : '#2a1620', 0.95), { radius: 6 * S, stroke: withAlpha('#ff8a7a', confirming ? 0.9 : 0.4), lw: confirming ? 2 : 1 });
        uiText(confirming ? '確認?' : '刪除', d.x + d.w / 2, d.y + d.h / 2 + 4 * S, { size: 11 * S, align: 'center', color: confirming ? '#ffb4a8' : withAlpha('#ff8a7a', 0.85), weight: '700' });
      }
    }
    const bhov = inside(mx, my, L.back);
    uiRect(L.back.x, L.back.y, L.back.w, L.back.h, withAlpha(bhov ? '#27305a' : '#161b34', 0.95), { radius: 8 * S, stroke: withAlpha(P.shardL, bhov ? 0.8 : 0.4), lw: 2 });
    uiText('返回', L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 5 * S, { size: 15 * S, align: 'center', color: '#cfe0ff', weight: '800' });
  },
};

refs.title = titleScene;
