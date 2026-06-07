// Reusable settings overlay (volumes / screen-shake / mute / reset save).
import { uiRect, uiText, uiScale, view, uiBar } from '../../engine/renderer.js';
import { mouse, pressed } from '../../engine/input.js';
import { META, saveMeta, applySettings, resetMeta, currentSlotKey } from '../state.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx } from '../../engine/audio.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

export const settingsUI = {
  open: false, onClose: null, confirmReset: false,
  show(onClose) { this.open = true; this.onClose = onClose || null; this.confirmReset = false; Sfx.play('uiClick'); },
  hide() { this.open = false; this.confirmReset = false; saveMeta(); const cb = this.onClose; this.onClose = null; if (cb) cb(); },

  layout() {
    const S = uiScale();
    const pw = Math.min(view.W * 0.84, 520 * S), ph = Math.min(view.H * 0.78, 470 * S);
    const x = (view.W - pw) / 2, y = (view.H - ph) / 2;
    const rows = [];
    [['master', '主音量'], ['sfx', '音效'], ['music', '音樂']].forEach((s, i) =>
      rows.push({ key: s[0], label: s[1], type: 'slider', x: x + pw * 0.34, y: y + 74 * S + i * 46 * S, w: pw * 0.5, h: 12 * S }));
    [['shake', '畫面震動'], ['muted', '靜音']].forEach((t, i) =>
      rows.push({ key: t[0], label: t[1], type: 'toggle', x: x + pw * 0.34, y: y + 74 * S + (3 + i) * 46 * S, w: 56 * S, h: 24 * S }));
    const reset = { x: x + pw / 2 - 100 * S, y: y + ph - 96 * S, w: 200 * S, h: 32 * S };
    const close = { x: x + pw / 2 - 70 * S, y: y + ph - 50 * S, w: 140 * S, h: 36 * S };
    return { x, y, w: pw, h: ph, S, rows, reset, close };
  },

  update() {
    if (!this.open) return false;
    if (pressed('escape') || pressed('pause')) { this.hide(); return true; }
    const L = this.layout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    // sliders respond to drag (mouse held)
    if (mouse.down) {
      for (const r of L.rows) if (r.type === 'slider' && mx >= r.x - 10 && mx <= r.x + r.w + 10 && my >= r.y - 12 && my <= r.y + r.h + 12) {
        META.settings[r.key] = Math.round(Math.max(0, Math.min(1, (mx - r.x) / r.w)) * 20) / 20; applySettings();
      }
    }
    if (mouse.justDown) {
      if (!inside(mx, my, L.reset)) this.confirmReset = false;
      for (const r of L.rows) if (r.type === 'toggle' && inside(mx, my, r)) { META.settings[r.key] = !META.settings[r.key]; applySettings(); saveMeta(); Sfx.play('uiClick'); }
      if (inside(mx, my, L.reset)) {
        if (this.confirmReset) { const K = currentSlotKey(); try { const cur = localStorage.getItem(K); if (cur) localStorage.setItem(K + '.bak', cur); } catch (e) {} resetMeta(); applySettings(); this.confirmReset = false; Sfx.play('death'); }   // back up the ACTIVE slot (not the legacy key) before wiping it
        else { this.confirmReset = true; Sfx.play('uiClick'); }
      } else if (inside(mx, my, L.close)) this.hide();
    }
    return true;
  },

  draw() {
    if (!this.open) return;
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
        const kx = r.x + r.w * v;
        uiRect(kx - 4 * S, r.y - 4 * S, 8 * S, r.h + 8 * S, '#fff', { radius: 3 * S });
        uiText(Math.round(v * 100) + '%', r.x + r.w + 14 * S, r.y + r.h / 2 + 1 * S, { size: 12 * S, baseline: 'middle', color: P.gray3 });
      } else {
        const on = !!META.settings[r.key];
        const hov = inside(mx, my, r);
        uiRect(r.x, r.y, r.w, r.h, on ? P.greenD : '#2a2030', { radius: r.h / 2, stroke: hov ? P.gray3 : P.ink2, lw: 2 });
        uiRect(on ? r.x + r.w - r.h + 2 * S : r.x + 2 * S, r.y + 2 * S, r.h - 4 * S, r.h - 4 * S, on ? P.greenL : P.gray2, { radius: (r.h - 4 * S) / 2 });
        uiText(on ? '開' : '關', r.x + r.w + 16 * S, r.y + r.h / 2 + 1 * S, { size: 12 * S, baseline: 'middle', color: on ? P.greenL : P.gray3, weight: '700' });
      }
    }

    const hovR = inside(mx, my, L.reset);
    uiRect(L.reset.x, L.reset.y, L.reset.w, L.reset.h, withAlpha(this.confirmReset ? '#5a1a1a' : '#2a1820', 0.96), { radius: 6 * S, stroke: this.confirmReset ? P.red : P.redD, lw: 2 });
    uiText(this.confirmReset ? '確定要重置全部存檔？' : '重置存檔', L.reset.x + L.reset.w / 2, L.reset.y + L.reset.h / 2 + 1 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: this.confirmReset ? P.redL : P.gray3, weight: '800' });

    const hovC = inside(mx, my, L.close);
    uiRect(L.close.x, L.close.y, L.close.w, L.close.h, withAlpha(hovC ? '#2a6a3a' : '#1f5030', 0.98), { radius: 8 * S, stroke: P.greenL, lw: 2 });
    uiText('關閉', L.close.x + L.close.w / 2, L.close.y + L.close.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
  },
};
