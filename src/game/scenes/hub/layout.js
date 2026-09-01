// hub/layout.js — R29/RE-04: the three panel DENSITY presets + the shared empty-state slot.
//
// The problem this exists to fix: several hub panels (bank — especially while gated, 圖鑑 目標
// tab, 個人小屋) drew a short stack of rows at the top and left 40-85% of the panel as flat
// background. R28 logged it and deferred it. The fix is NOT "make the boxes bigger": it is a
// shared vertical rhythm (so migrated panels agree on column width / row height / block gap)
// plus ONE slot type for the leftover space that always carries something useful —
// 教學 (what this thing does) · 進度 (how far you are) · 預覽 (what you'll get) · 下一步 CTA.
//
// Everything here is in DESIGN units and multiplied by the panel's own S (uiScale) via dens(),
// so no call site hard-codes an absolute coordinate to plug a hole at one resolution.
import { P, withAlpha } from '../../../engine/palette.js';
import { UI, uiBar, uiRect, uiText, uiWrapText } from '../../../engine/renderer.js';

// compact  — dense lists that must show many rows (grids, ledgers)
// standard — the default panel body (forms, settings, most tabs)
// showcase — few elements that must carry the whole panel (locked states, hero pages)
export const DENSITY = {
  compact: { pad: 14, gap: 8, rowH: 24, blockPad: 11, title: UI.FONT_BODY, body: UI.FONT_CAPTION, lineH: 14, radius: 6 },
  standard: { pad: 22, gap: 12, rowH: 32, blockPad: 15, title: UI.FONT_HEADING, body: UI.FONT_BODY, lineH: 18, radius: 8 },
  showcase: { pad: 22, gap: 14, rowH: 44, blockPad: 20, title: UI.FONT_TITLE, body: UI.FONT_BODY, lineH: 22, radius: 10 },
};

// Scaled copy of a preset. `d.S` is kept so helpers can still reach the raw scale.
export function dens(name, S) {
  const src = DENSITY[name] || DENSITY.standard;
  const out = { name: DENSITY[name] ? name : 'standard', S };
  for (const k of Object.keys(src)) out[k] = src[k] * S;
  return out;
}

// The usable body of a panel: inset by the density pad, from `top` down to just above the
// panel's own footer hint line. Callers lay out inside this and can fill it to the bottom.
export function contentRect(f, top, d) {
  return { x: f.x + d.pad, y: top, w: f.w - d.pad * 2, h: Math.max(0, f.y + f.h - 34 * d.S - top) };   // 34S clears the panel footer hint line
}

// n equal columns inside a rect, separated by the density gap.
export function columns(rect, n, d) {
  const w = (rect.w - d.gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: rect.x + i * (w + d.gap), w, y: rect.y, h: rect.h }));
}

// How tall drawBlock() will be for this spec at this width (so callers can stack / centre).
export function blockHeight(spec, w, d) {
  const { title, lines = [], bars = [], cta = null, minH = 0 } = spec;
  const inner = w - d.blockPad * 2;
  let h = d.blockPad;
  if (title) h += d.title + d.blockPad * 0.45;
  for (const l of lines) h += uiWrapText(l, inner, d.body, '600').length * d.lineH;
  if (bars.length) h += d.blockPad * 0.5 + bars.length * (d.lineH + 9 * d.S);
  if (cta) h += d.blockPad * 0.6 + 34 * d.S;
  h += d.blockPad;
  return Math.max(h, minH);
}

// Fit a spec into `maxH` by shedding the OPTIONAL parts in order of expendability
// (explanatory lines first, then the CTA's trailing hint). Without this a block whose natural
// height exceeds the space it was given silently overflows and paints over the panel footer —
// which is exactly what a full-height ledger did at 2560x1440.
export function fitBlock(spec, w, maxH, d) {
  const fits = (sp) => blockHeight({ ...sp, minH: 0 }, w, d) <= maxH;
  let sp = spec;
  if (fits(sp)) return sp;
  while ((sp.lines || []).length && !fits(sp)) sp = { ...sp, lines: sp.lines.slice(0, -1) };
  if (!fits(sp) && sp.cta && sp.cta.hint) sp = { ...sp, cta: { ...sp.cta, hint: null } };
  return sp;
}

// THE empty-state slot. Draws a framed block carrying any of: an icon + title (教學),
// wrapped body lines, labelled progress bars (進度), and a call-to-action pill (下一步).
// Returns the block rect plus `cta` (the pill's rect) so an interactive caller can hit-test it
// — a purely informational caller can ignore the return value.
export function drawBlock(x, y, w, d, spec) {
  const { icon, title, lines = [], bars = [], cta = null, tone = P.shardL, minH = 0 } = spec;
  const h = blockHeight(spec, w, d);
  // same fill as the panel's existing card idiom (sortie/codex cards) so a block reads as part
  // of the panel vocabulary, not a new kind of box — and so it separates from the panel ground.
  uiRect(x, y, w, h, withAlpha('#1e2540', 0.94), { radius: d.radius, stroke: withAlpha(tone, 0.45), lw: 1.5 });
  const ix = x + d.blockPad, inner = w - d.blockPad * 2;
  // when `minH` stretched the block past its natural height, CENTRE the content group in it —
  // a stretched block with everything jammed at the top just relocates the dead space.
  const natural = minH ? blockHeight({ ...spec, minH: 0 }, w, d) : h;
  let cy = y + d.blockPad + Math.max(0, (h - natural) / 2);
  if (title) {
    if (icon) uiText(icon, ix + d.title * 0.5, cy + d.title * 0.55, { size: d.title * 1.15, align: 'center', baseline: 'middle', shadow: false });   /* pictogram, exempt from type ramp */
    uiText(title, ix + (icon ? d.title * 1.5 : 0), cy + d.title * 0.85, { size: d.title, color: tone, weight: '800' });
    cy += d.title + d.blockPad * 0.45;
  }
  for (const l of lines) {
    for (const seg of uiWrapText(l, inner, d.body, '600')) {
      cy += d.lineH;
      uiText(seg, ix, cy - d.lineH * 0.25, { size: d.body, color: P.gray4, weight: '600' });
    }
  }
  if (bars.length) {
    cy += d.blockPad * 0.5;
    for (const b of bars) {
      uiText(b.label, ix, cy + d.body * 0.85, { size: d.body, color: P.gray3, weight: '600' });
      if (b.note) uiText(b.note, x + w - d.blockPad, cy + d.body * 0.85, { size: d.body, align: 'right', color: b.noteColor || P.goldL, weight: '800' });
      uiBar(ix, cy + d.lineH, inner, 5 * d.S, Math.max(0, Math.min(1, b.frac || 0)), { fg: b.color || tone, bg: '#16183a', border: P.ink });
      cy += d.lineH + 9 * d.S;
    }
  }
  let ctaRect = null;
  if (cta) {
    cy += d.blockPad * 0.6;
    const bw = Math.min(inner, 300 * d.S), bh = 30 * d.S;
    ctaRect = { x: ix, y: cy, w: bw, h: bh };
    uiRect(ctaRect.x, ctaRect.y, bw, bh, withAlpha(cta.hover ? '#27306a' : '#1b2138', 0.96), { radius: d.radius * 0.8, stroke: withAlpha(cta.color || P.goldL, cta.hover ? 0.95 : 0.7), lw: 1.5 });
    uiText(cta.label, ctaRect.x + bw / 2, cy + bh / 2 + 1 * d.S, { size: d.body, align: 'center', baseline: 'middle', color: cta.color || P.goldL, weight: '800' });
    if (cta.hint) uiText(cta.hint, ix + bw + d.gap, cy + bh / 2 + 1 * d.S, { size: d.body, baseline: 'middle', color: P.gray3, weight: '600' });
  }
  return { x, y, w, h, cta: ctaRect };
}
