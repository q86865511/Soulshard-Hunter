// Reusable settings overlay: volumes / screen-shake / mute, a key-binding page, an
// optional "return to hub" action (in-run), and reset-save. Pages: 'main' | 'keys'.
import { uiRect, uiText, uiScale, view, uiBar } from '../../engine/renderer.js';
import { mouse, pressed, REBINDABLE, currentKeyFor, keyLabel, captureNextKey, applyKeybinds } from '../../engine/input.js';
import { META, saveMeta, applySettings, resetMeta, currentSlotKey } from '../state.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx } from '../../engine/audio.js';

const inside = (mx, my, r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

export const settingsUI = {
  open: false, onClose: null, confirmReset: false, returnHub: null, returnTitle: null, page: 'main', capturing: null,
  show(onClose, opts = {}) { this.open = true; this.onClose = onClose || null; this.confirmReset = false; this.returnHub = opts.returnHub || null; this.returnTitle = opts.returnTitle || null; this.page = 'main'; this.capturing = null; Sfx.play('uiClick'); },
  hide() { this.open = false; this.confirmReset = false; this.capturing = null; saveMeta(); const cb = this.onClose; this.onClose = null; if (cb) cb(); },

  // ---- layout --------------------------------------------------------------
  // The panel is designed at 520×500 UI-units. fitScale() shrinks the WHOLE panel (so its
  // internal offsets stay consistent) to fit the viewport — fixes button↔row overlap on short
  // / 1080p / scaled screens where uiScale() alone would cap the height and collide the content.
  fitScale() { return Math.min(uiScale(), (view.W * 0.94) / 520, (view.H * 0.94) / 500); },
  layout() {
    const S = this.fitScale();
    const pw = 520 * S, ph = 500 * S;
    const x = (view.W - pw) / 2, y = (view.H - ph) / 2;
    const rows = [];
    [['master', '主音量'], ['sfx', '音效'], ['music', '音樂']].forEach((s, i) =>
      rows.push({ key: s[0], label: s[1], type: 'slider', x: x + pw * 0.34, y: y + 70 * S + i * 42 * S, w: pw * 0.5, h: 12 * S }));
    [['shake', '畫面震動'], ['muted', '靜音']].forEach((t, i) =>
      rows.push({ key: t[0], label: t[1], type: 'toggle', x: x + pw * 0.34, y: y + 70 * S + (3 + i) * 42 * S, w: 56 * S, h: 24 * S }));
    const bw = 220 * S, bx = x + pw / 2 - bw / 2;
    const keys = { x: bx, y: y + ph - 178 * S, w: bw, h: 30 * S };
    const home = (this.returnHub || this.returnTitle) ? { x: bx, y: y + ph - 142 * S, w: bw, h: 30 * S } : null;
    const reset = { x: x + pw / 2 - 100 * S, y: y + ph - 96 * S, w: 200 * S, h: 30 * S };
    const close = { x: x + pw / 2 - 70 * S, y: y + ph - 50 * S, w: 140 * S, h: 36 * S };
    return { x, y, w: pw, h: ph, S, rows, keys, home, reset, close };
  },
  keysLayout() {
    const S = this.fitScale();
    const pw = 520 * S, ph = 500 * S;
    const x = (view.W - pw) / 2, y = (view.H - ph) / 2;
    const rows = REBINDABLE.map((b, i) => ({ ...b, x: x + pw * 0.5, y: y + 64 * S + i * 36 * S, w: pw * 0.34, h: 26 * S }));
    const back = { x: x + pw / 2 - 70 * S, y: y + ph - 50 * S, w: 140 * S, h: 36 * S };
    const resetKeys = { x: x + pw / 2 - 100 * S, y: y + ph - 92 * S, w: 200 * S, h: 28 * S };
    return { x, y, w: pw, h: ph, S, rows, back, resetKeys };
  },

  // ---- update --------------------------------------------------------------
  update() {
    if (!this.open) return false;
    if (this.capturing) { if (pressed('escape')) this.capturing = null; return true; }   // waiting for a rebind key (captured at the input layer)
    if (pressed('escape') || pressed('pause')) { if (this.page === 'keys') { this.page = 'main'; } else this.hide(); return true; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;

    if (this.page === 'keys') {
      const L = this.keysLayout();
      if (mouse.justDown) {
        for (const r of L.rows) if (inside(mx, my, r)) { this.capturing = r.action; Sfx.play('uiClick'); captureNextKey((codeStr) => this.applyBind(r.action, codeStr)); return true; }
        if (inside(mx, my, L.resetKeys)) { META.settings.keybinds = {}; applyKeybinds({}); saveMeta(); Sfx.play('uiClick'); return true; }
        if (inside(mx, my, L.back)) { this.page = 'main'; Sfx.play('uiClick'); return true; }
      }
      return true;
    }

    const L = this.layout();
    if (mouse.down) {
      for (const r of L.rows) if (r.type === 'slider' && mx >= r.x - 10 && mx <= r.x + r.w + 10 && my >= r.y - 12 && my <= r.y + r.h + 12) {
        META.settings[r.key] = Math.round(Math.max(0, Math.min(1, (mx - r.x) / r.w)) * 20) / 20; applySettings();
      }
    }
    if (mouse.justDown) {
      if (!inside(mx, my, L.reset)) this.confirmReset = false;
      for (const r of L.rows) if (r.type === 'toggle' && inside(mx, my, r)) { META.settings[r.key] = !META.settings[r.key]; applySettings(); saveMeta(); Sfx.play('uiClick'); }
      if (inside(mx, my, L.keys)) { this.page = 'keys'; Sfx.play('uiClick'); }
      else if (L.home && inside(mx, my, L.home)) { const fn = this.returnHub || this.returnTitle; this.open = false; this.returnHub = null; this.returnTitle = null; this.onClose = null; if (fn) fn(); }
      else if (inside(mx, my, L.reset)) {
        if (this.confirmReset) { const K = currentSlotKey(); try { const cur = localStorage.getItem(K); if (cur) localStorage.setItem(K + '.bak', cur); } catch (e) { /* */ } resetMeta(); applySettings(); this.confirmReset = false; Sfx.play('death'); }
        else { this.confirmReset = true; Sfx.play('uiClick'); }
      } else if (inside(mx, my, L.close)) this.hide();
    }
    return true;
  },
  applyBind(action, codeStr) {
    META.settings.keybinds = META.settings.keybinds || {};
    META.settings.keybinds[action] = codeStr;
    applyKeybinds(META.settings.keybinds); saveMeta(); this.capturing = null; Sfx.play('uiClick');
  },

  // ---- draw ----------------------------------------------------------------
  draw() {
    if (!this.open) return;
    if (this.page === 'keys') return this.drawKeys();
    const L = this.layout(); const S = L.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.72));
    uiRect(L.x, L.y, L.w, L.h, withAlpha('#161a30', 0.99), { radius: 12 * S, stroke: P.ink2, lw: 2 });
    uiRect(L.x, L.y, L.w, 48 * S, withAlpha('#1f2542', 0.98), { radius: 12 * S });
    uiText('設 定', L.x + L.w / 2, L.y + 31 * S, { size: 20 * S, align: 'center', color: '#fff', weight: '900' });

    for (const r of L.rows) {
      uiText(r.label, r.x - 16 * S, r.y + r.h / 2 + 1 * S, { size: 14 * S, align: 'right', baseline: 'middle', color: P.gray4, weight: '700' });
      if (r.type === 'slider') {
        const v = META.settings[r.key] ?? 0.5;
        uiBar(r.x, r.y, r.w, r.h, v, { fg: P.shardL, bg: '#16183a', border: P.ink, radius: 3 });
        uiRect(r.x + r.w * v - 4 * S, r.y - 4 * S, 8 * S, r.h + 8 * S, '#fff', { radius: 3 * S });
        uiText(Math.round(v * 100) + '%', r.x + r.w + 14 * S, r.y + r.h / 2 + 1 * S, { size: 12 * S, baseline: 'middle', color: P.gray3 });
      } else {
        const on = !!META.settings[r.key]; const hov = inside(mx, my, r);
        uiRect(r.x, r.y, r.w, r.h, on ? P.greenD : '#2a2030', { radius: r.h / 2, stroke: hov ? P.gray3 : P.ink2, lw: 2 });
        uiRect(on ? r.x + r.w - r.h + 2 * S : r.x + 2 * S, r.y + 2 * S, r.h - 4 * S, r.h - 4 * S, on ? P.greenL : P.gray2, { radius: (r.h - 4 * S) / 2 });
        uiText(on ? '開' : '關', r.x + r.w + 16 * S, r.y + r.h / 2 + 1 * S, { size: 12 * S, baseline: 'middle', color: on ? P.greenL : P.gray3, weight: '700' });
      }
    }

    this.btn(L.keys, '⌨ 按鍵設定', mx, my, P.shardL);
    if (L.home) this.btn(L.home, this.returnHub ? '🏠 返回大廳' : '🏠 返回主畫面', mx, my, P.goldL);

    const hovR = inside(mx, my, L.reset);
    uiRect(L.reset.x, L.reset.y, L.reset.w, L.reset.h, withAlpha(this.confirmReset ? '#5a1a1a' : '#2a1820', 0.96), { radius: 6 * S, stroke: this.confirmReset ? P.red : P.redD, lw: 2 });
    uiText(this.confirmReset ? '確定要重置此存檔？' : '重置存檔', L.reset.x + L.reset.w / 2, L.reset.y + L.reset.h / 2 + 1 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: this.confirmReset ? P.redL : P.gray3, weight: '800' });

    const hovC = inside(mx, my, L.close);
    uiRect(L.close.x, L.close.y, L.close.w, L.close.h, withAlpha(hovC ? '#2a6a3a' : '#1f5030', 0.98), { radius: 8 * S, stroke: P.greenL, lw: 2 });
    uiText('關閉', L.close.x + L.close.w / 2, L.close.y + L.close.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
  },
  drawKeys() {
    const L = this.keysLayout(); const S = L.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.72));
    uiRect(L.x, L.y, L.w, L.h, withAlpha('#161a30', 0.99), { radius: 12 * S, stroke: P.ink2, lw: 2 });
    uiRect(L.x, L.y, L.w, 48 * S, withAlpha('#1f2542', 0.98), { radius: 12 * S });
    uiText('按鍵設定', L.x + L.w / 2, L.y + 31 * S, { size: 20 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('移動固定為 WASD / 方向鍵', L.x + L.w / 2, L.y + 56 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    for (const r of L.rows) {
      uiText(r.label, r.x - 16 * S, r.y + r.h / 2 + 1 * S, { size: 13 * S, align: 'right', baseline: 'middle', color: P.gray4, weight: '700' });
      const cap = this.capturing === r.action; const hov = inside(mx, my, r);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(cap ? '#3a2a1a' : (hov ? '#27306a' : '#16183a'), 0.97), { radius: 6 * S, stroke: cap ? P.goldL : (hov ? P.shardL : P.ink2), lw: cap ? 3 : 2 });
      uiText(cap ? '按任意鍵…' : keyLabel(currentKeyFor(r.action)), r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: cap ? P.goldL : '#fff', weight: '800' });
    }
    const hovK = inside(mx, my, L.resetKeys);
    uiRect(L.resetKeys.x, L.resetKeys.y, L.resetKeys.w, L.resetKeys.h, withAlpha('#2a1820', 0.96), { radius: 6 * S, stroke: hovK ? P.redL : P.redD, lw: 2 });
    uiText('恢復預設按鍵', L.resetKeys.x + L.resetKeys.w / 2, L.resetKeys.y + L.resetKeys.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: P.gray3, weight: '700' });
    const hovB = inside(mx, my, L.back);
    uiRect(L.back.x, L.back.y, L.back.w, L.back.h, withAlpha(hovB ? '#27305a' : '#1f2542', 0.98), { radius: 8 * S, stroke: P.shardL, lw: 2 });
    uiText('返回', L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
  },
  btn(r, label, mx, my, col) {
    const S = uiScale(); const hov = inside(mx, my, r);
    uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#27306a' : '#1b2138', 0.97), { radius: 7 * S, stroke: hov ? (col || P.shardL) : P.ink2, lw: hov ? 3 : 2 });
    uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
  },
};
