// Title / main menu scene: main menu (開始遊戲 / 設定) + a 3-slot save picker.
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { META, loadMeta, applySettings, setActiveSlot, activeSlot, slotSummaries, deleteSlot, syncFromCloud } from '../state.js';
import { Net } from '../../net/api.js';
import { openAuth, openLeaderboard, isModalOpen, netToast } from '../../net/ui.js';
import { openSocial } from '../../net/social.js';
import { Characters } from '../content/registry.js';
import { PATCH_NOTES, GAME_VERSION } from '../content/patchnotes.js';
import { uiText, uiRect, uiScale, view, drawSpriteUI, vignette, ctxRaw, textWidth } from '../../engine/renderer.js';
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
    // R17/1.1: anchored below the compact logo (fixed offsets, not 0.26H) so heading/cards
    // can never ride up into the title; cards shrink on short viewports instead of clipping.
    const S = uiScale(); const cw = Math.min(540 * S, view.W - 36 * S), gap = 12 * S;
    const y0 = view.H * 0.085 + 76 * S;
    const ch = Math.max(64 * S, Math.min(90 * S, (view.H - y0 - 64 * S) / 3 - gap));
    const x = view.W / 2 - cw / 2;
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

    if (this.mode === 'notes') {   // 更新日誌 overlay — R17 B13: version LIST → click a row → detail page
      if (pressed('escape')) { if (this.notesSel != null) { this.notesSel = null; this.notesScroll = 0; } else this.mode = 'menu'; return; }
      if (mouse.wheel) this.notesScroll = Math.max(0, Math.min(this.notesMax || 0, (this.notesScroll || 0) + mouse.wheel * 0.5));
      if (mouse.justDown) {
        if (this._notesClose && inside(mx, my, this._notesClose)) { this.mode = 'menu'; this.notesSel = null; return; }
        if (this.notesSel != null && this._notesBack && inside(mx, my, this._notesBack)) { this.notesSel = null; this.notesScroll = 0; return; }
        if (this.notesSel == null) for (const r of (this._noteRows || [])) if (inside(mx, my, r)) { this.notesSel = r.i; this.notesScroll = 0; return; }
        if (this._notesPanel && !inside(mx, my, this._notesPanel)) { this.mode = 'menu'; this.notesSel = null; return; }
      }
      return;
    }

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
      if (inside(mx, my, this.notesBtn())) { this.mode = 'notes'; this.notesScroll = 0; this.notesSel = null; return; }
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

    // title — R17/1.1: the slots list collided with the full-size logo on short viewports,
    // so the slot screen gets a compact logo pinned near the top instead.
    if (this.mode === 'slots') {
      uiText('魂 晶 獵 手', view.W / 2, view.H * 0.085, { size: 30 * S, align: 'center', color: P.shardL, weight: '900', shadowColor: 'rgba(0,0,0,0.7)' });
      uiText('S O U L S H A R D   H U N T E R', view.W / 2, view.H * 0.085 + 22 * S, { size: 10 * S, align: 'center', color: P.gray3, weight: '700' });
    } else {
      uiText('魂 晶 獵 手', view.W / 2, view.H * 0.16, { size: 50 * S, align: 'center', color: P.shardL, weight: '900', shadowColor: 'rgba(0,0,0,0.7)' });
      uiText('S O U L S H A R D   H U N T E R', view.W / 2, view.H * 0.16 + 34 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '700' });
    }

    if (this.mode === 'slots') this.drawSlots(S);
    else if (this.mode === 'notes') this.drawNotes(S);
    else this.drawMenu(S);

    vignette(0.5);
    settingsUI.draw();
  },
  notesBtn() { const S = uiScale(); const w = 210 * S, h = 30 * S; return { x: view.W / 2 - w / 2, y: view.H * 0.845, w, h }; },
  // very small CJK-aware wrap that draws + returns line count
  wrapNote(str, x, y, maxw, size) {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '500') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.forEach((l, i) => uiText(l, x, y + i * (size + 4), { size, color: P.gray4, weight: '500' }));
    return lines.length;
  },
  // R17 B13: two views — a version LIST (one row per round, mirroring docs/changelog/) and,
  // after clicking a row, that version's DETAIL page (◀ 返回 steps back to the list).
  drawNotes(S) {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const w = Math.min(view.W * 0.82, 660 * S), h = Math.min(view.H * 0.72, 540 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const sel = this.notesSel != null ? PATCH_NOTES[this.notesSel] : null;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.6));
    uiRect(x, y, w, h, withAlpha('#161a30', 0.99), { radius: 12 * S, stroke: P.ink2, lw: 2 });
    uiRect(x, y, w, 46 * S, withAlpha('#1f2542', 0.98), { radius: 12 * S });
    uiText(sel ? ('📜 ' + sel.v + (sel.title ? '　·　' + sel.title : '')) : '📜 更新日誌 · 版本一覽', x + w / 2, y + 29 * S, { size: sel ? 16 * S : 19 * S, align: 'center', color: '#fff', weight: '900' });
    const closeR = { x: x + w - 38 * S, y: y + 9 * S, w: 28 * S, h: 28 * S };
    uiRect(closeR.x, closeR.y, closeR.w, closeR.h, withAlpha('#3a2030', 0.9), { radius: 6 * S, stroke: P.redD, lw: 2 });
    uiText('✕', closeR.x + closeR.w / 2, closeR.y + closeR.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '900' });
    this._notesBack = null;
    if (sel) {   // back button (top-left of the header)
      const backR = { x: x + 10 * S, y: y + 9 * S, w: 70 * S, h: 28 * S };
      const bh = inside(mx, my, backR);
      uiRect(backR.x, backR.y, backR.w, backR.h, withAlpha(bh ? '#27306a' : '#141832', 0.95), { radius: 6 * S, stroke: withAlpha(P.shardL, bh ? 0.9 : 0.5), lw: 1.5 });
      uiText('◀ 返回', backR.x + backR.w / 2, backR.y + backR.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '700' });
      this._notesBack = backR;
    }
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(x, y + 50 * S, w, h - 70 * S); ctx.clip();
    let yy = y + 64 * S - (this.notesScroll || 0); const left = x + 22 * S, lineW = w - 44 * S;
    this._noteRows = [];
    if (!sel) {   // ---- version list: one clickable row per round ----
      const rowH = 44 * S, gap = 8 * S;
      PATCH_NOTES.forEach((note, i) => {
        const r = { x: x + 16 * S, y: yy, w: w - 32 * S, h: rowH, i };
        const hov = inside(mx, my, r);
        uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#27306a' : (i === 0 ? '#1d2440' : '#171c34'), 0.96), { radius: 8 * S, stroke: hov ? P.shardL : (i === 0 ? withAlpha(P.goldL, 0.55) : P.ink2), lw: hov ? 2.5 : 1.5 });
        uiText(note.v, r.x + 14 * S, r.y + 19 * S, { size: 14 * S, color: i === 0 ? P.goldL : '#eaf2ff', weight: '900' });
        if (i === 0) uiText('最新', r.x + 14 * S + textWidth(note.v, 14 * S, '900') + 8 * S, r.y + 18 * S, { size: 9 * S, color: P.emberL, weight: '800' });
        this.clipNote(note.title || '', r.x + 14 * S, r.y + 35 * S, r.w - 120 * S, 10.5 * S, P.gray4);
        uiText((note.date ? note.date + '　·　' : '') + note.items.length + ' 項　›', r.x + r.w - 12 * S, r.y + r.h / 2 + 4 * S, { size: 10 * S, align: 'right', color: P.gray3, weight: '700' });
        this._noteRows.push(r);
        yy += rowH + gap;
      });
    } else {   // ---- detail page for the selected version ----
      // R17 B16: the date used to share the first item's baseline (right-aligned over full-width
      // wrapped text → overlap) — it now lives in the header next to the close button instead,
      // and is skipped entirely when a narrow panel would run it into the centred title
      // (the version list already shows each round's date).
      if (sel.date) {
        const tw2 = textWidth('📜 ' + sel.v + (sel.title ? '　·　' + sel.title : ''), 16 * S, '900');
        const dLeft = closeR.x - 8 * S - textWidth(sel.date, 10 * S, '600');
        if (dLeft > x + w / 2 + tw2 / 2 + 6 * S) uiText(sel.date, closeR.x - 8 * S, y + 29 * S, { size: 10 * S, align: 'right', color: P.gray3 });
      }
      for (const it of sel.items) { const n = this.wrapNote('· ' + it, left + 4 * S, yy, lineW - 8 * S, 12 * S); yy += n * 16 * S + 6 * S; }
    }
    this.notesMax = Math.max(0, (yy + (this.notesScroll || 0)) - (y + 64 * S) - (h - 80 * S));
    ctx.restore();
    uiText(sel ? '滑鼠滾輪捲動　·　Esc / ◀ 返回版本一覽' : '點擊版本查看詳細內容　·　Esc / 點外部關閉', x + w / 2, y + h - 14 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    this._notesClose = closeR; this._notesPanel = { x, y, w, h };
  },
  // single-line CJK clip with ellipsis (local helper for the version list rows)
  clipNote(str, x, y, maxw, size, color) {
    let s = str;
    while (s.length > 1 && textWidth(s, size, '600') > maxw) s = s.slice(0, -1);
    if (s.length < str.length && s.length > 1) s = s.slice(0, -1) + '…';
    uiText(s, x, y, { size, color: color || P.gray4, weight: '600' });
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
    // 📜 更新日誌 button
    const nb = this.notesBtn(), nhov = inside(mx, my, nb);
    uiRect(nb.x, nb.y, nb.w, nb.h, withAlpha(nhov ? '#27306a' : '#141832', 0.92), { radius: 7 * S, stroke: nhov ? P.goldL : withAlpha(P.goldL, 0.45), lw: nhov ? 2.5 : 1.5 });
    uiText('📜 更新日誌 · ' + GAME_VERSION, nb.x + nb.w / 2, nb.y + nb.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: nhov ? '#fff' : P.goldL, weight: '700' });
    uiText('金庫 ' + Math.round(META.gold || 0) + '　·　最高威脅 ' + (META.stats.bestStage || 0) + ' 級　·　最高分 ' + (META.stats.bestScore || 0), view.W / 2, view.H * 0.93, { size: 12 * S, align: 'center', color: P.gray2 });   // R17/2.1:「金庫」already labels it — no broken 🪙 glyph
    uiText('空白鍵 快速進入上次存檔　·　Esc 設定', view.W / 2, view.H * 0.97, { size: 11 * S, align: 'center', color: withAlpha(P.gray2, 0.7) });
  },

  drawSlots(S) {
    uiText('選擇存檔', view.W / 2, view.H * 0.085 + 52 * S, { size: 18 * S, align: 'center', color: '#ffd479', weight: '800' });
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
        uiText('遊戲時數 ' + fmtTime(s.playTime) + '　·　成就 ' + s.achievements + '　·　金庫 ' + Math.round(s.gold || 0), px, r.y + 48 * S, { size: 12 * S, color: P.shardL, weight: '700' });   // R17/2.1
        if (r.h >= 78 * S) uiText('最高威脅 ' + s.bestStage + ' 級　·　最高分 ' + s.bestScore + '　·　通關 ' + s.clears + '　·　生態 ' + s.biomesUnlocked + '/10', px, r.y + 68 * S, { size: 11.5 * S, color: P.gray3 });   // R17/1.1: dropped when cards compress
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
