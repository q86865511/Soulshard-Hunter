// Canvas renderer: world camera with integer zoom (crisp pixels) + screen-space UI.
import { withAlpha, P } from './palette.js';

let canvas, ctx;
let W = 0, H = 0;        // backing-store (device) size
let cssW = 0, cssH = 0;
let dpr = 1;

export const camera = {
  x: 0, y: 0, zoom: 4,
  shakeX: 0, shakeY: 0, shakeMag: 0,
  targetX: 0, targetY: 0,
};

export function initRenderer(cnv) {
  canvas = cnv;
  ctx = canvas.getContext('2d', { alpha: false });
  resize();
  window.addEventListener('resize', resize);
  return { canvas, ctx };
}

export function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  W = Math.floor(cssW * dpr);
  H = Math.floor(cssH * dpr);
  canvas.width = W; canvas.height = H;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  // choose a zoom so a comfortable slice of the (large) world is visible —
  // a touch more zoomed-out than before so the big map reads as big.
  // R29 E-1 — pick the zoom STEP in CSS pixels, then scale it into device space. The old
  // form fed device pixels into the step choice, so a DPR2 player saw +44%/+78% more world
  // than a DPR1 player on the same window — a gameplay (and shared-leaderboard) difference.
  // Visible world is now cssW/zCss × cssH/zCss at any DPR; dpr=1 is bit-identical to before.
  // Trade-off: fractional DPR (1.25/1.5 Windows scaling) yields a fractional device zoom, so
  // nearest-neighbour pixel widths are slightly uneven — accepted over an unfair field of view.
  const zCss = Math.max(2, Math.min(6, Math.round(Math.min(cssW / 430, cssH / 280))));
  camera.zoom = zCss * dpr;
  ctx.imageSmoothingEnabled = false;
}

export const view = {
  get W() { return W; }, get H() { return H; },
  get cssW() { return cssW; }, get cssH() { return cssH; },
  get dpr() { return dpr; },
  get zoom() { return camera.zoom; },
};

// ---- camera helpers --------------------------------------------------------
export function worldToScreen(wx, wy) {
  return {
    x: Math.round((wx - camera.x) * camera.zoom + W / 2 + camera.shakeX),
    y: Math.round((wy - camera.y) * camera.zoom + H / 2 + camera.shakeY),
  };
}
export function screenToWorld(sx, sy) {
  // sx, sy are in device pixels
  return {
    x: (sx - W / 2 - camera.shakeX) / camera.zoom + camera.x,
    y: (sy - H / 2 - camera.shakeY) / camera.zoom + camera.y,
  };
}
// convert a CSS-pixel mouse position into world coords
export function cssToWorld(mx, my) { return screenToWorld(mx * dpr, my * dpr); }

let shakeEnabled = true;
let shakeScale = 0.45;          // global damp: screen shake stays subtle by default…
let shakeUserScale = 1;         // P1-2 accessibility: player 畫面震動 strength 0..1 (independent of the per-frame shakeScale)
export function setShakeEnabled(b) { shakeEnabled = b; }
export function setShakeScale(s) { shakeScale = s; }   // …the run scene raises this only when near death
export function setShakeUserScale(v) { shakeUserScale = Math.max(0, Math.min(1, +v || 0)); }   // settings · 畫面震動 0–100%
export function addShake(mag) { if (shakeEnabled) camera.shakeMag = Math.min(10, camera.shakeMag + mag * shakeScale * shakeUserScale); }

export function updateCamera(dt) {
  // smooth follow
  camera.x += (camera.targetX - camera.x) * Math.min(1, dt * 9);
  camera.y += (camera.targetY - camera.y) * Math.min(1, dt * 9);
  if (camera.shakeMag > 0.1) {
    const a = Math.random() * Math.PI * 2;
    camera.shakeX = Math.cos(a) * camera.shakeMag * camera.zoom * 0.4;
    camera.shakeY = Math.sin(a) * camera.shakeMag * camera.zoom * 0.4;
    camera.shakeMag *= Math.pow(0.001, dt); // fast decay
  } else { camera.shakeX = camera.shakeY = 0; camera.shakeMag = 0; }
}

// ---- frame ----------------------------------------------------------------
export function clear(color = P.shadow) {
  glowFrameReset();          // R28/W0 — the once-per-frame reset point for the glow counter
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

// ---- world-space drawing ---------------------------------------------------
// cache of solid-colour silhouettes (for hit flashes), keyed by source canvas.
const _tintCache = new WeakMap();
function tintedFrame(src, color) {
  let byColor = _tintCache.get(src);
  if (!byColor) { byColor = new Map(); _tintCache.set(src, byColor); }
  let c = byColor.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d');
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    byColor.set(color, c);
  }
  return c;
}

export function drawSprite(spriteCanvas, wx, wy, opts = {}) {
  if (!spriteCanvas) return;
  const z = camera.zoom;
  const sw = spriteCanvas.width, sh = spriteCanvas.height;
  const ax = opts.ax ?? sw / 2;
  const ay = opts.ay ?? sh / 2;
  const s = worldToScreen(wx, wy);
  const scale = (opts.scale ?? 1) * z;
  ctx.save();
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
  ctx.translate(s.x, s.y);
  if (opts.flipX) ctx.scale(-1, 1);
  if (opts.rot) ctx.rotate(opts.rot);
  if (opts.squash) ctx.scale(opts.squash.x ?? 1, opts.squash.y ?? 1);
  ctx.scale(scale, scale);
  ctx.drawImage(spriteCanvas, -ax, -ay);
  if (opts.tint) {
    ctx.globalAlpha = (opts.alpha ?? 1) * (opts.tintAmt ?? 0.7);
    ctx.drawImage(tintedFrame(spriteCanvas, opts.tint), -ax, -ay);
  }
  ctx.restore();
}

export function drawShadow(wx, wy, rx, alpha = 0.32) {
  const s = worldToScreen(wx, wy);
  const z = camera.zoom;
  ctx.save();
  ctx.fillStyle = withAlpha('#000000', alpha);
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, rx * z, rx * 0.5 * z, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function fillRectWorld(wx, wy, w, h, color) {
  const s = worldToScreen(wx, wy);
  const z = camera.zoom;
  ctx.fillStyle = color;
  ctx.fillRect(s.x, s.y, Math.ceil(w * z), Math.ceil(h * z));
}
export function strokeRectWorld(wx, wy, w, h, color, lw = 1) {
  const s = worldToScreen(wx, wy);
  const z = camera.zoom;
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.strokeRect(s.x + 0.5, s.y + 0.5, w * z, h * z);
}
export function fillCircleWorld(wx, wy, r, color) {
  const s = worldToScreen(wx, wy);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(s.x, s.y, r * camera.zoom, 0, Math.PI * 2); ctx.fill();
}
export function strokeCircleWorld(wx, wy, r, color, lw = 2) {
  const s = worldToScreen(wx, wy);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(s.x, s.y, r * camera.zoom, 0, Math.PI * 2); ctx.stroke();
}
export function lineWorld(x0, y0, x1, y1, color, lw = 1) {
  const a = worldToScreen(x0, y0), b = worldToScreen(x1, y1);
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

// ---- R28/W0 glow brightness budget (ART_SPEC 2.2) --------------------------
// Module-level knobs for the world light channel. The DEFAULTS ARE IDENTITY —
// scale 1 / decoCap 1 / budget Infinity mean glowWorld + glowWorldCached render exactly
// what they rendered before this batch; nothing is dialled until a later batch calls
// setGlowCfg(). `deco:true` (opt-in, no caller passes it yet) marks the decorative channel
// that ART_SPEC caps at 0.35; warning/telegraph glows never pass it and stay uncapped.
// The per-frame call count is COUNTED ONLY here — no degradation is wired in W0.
const GLOW_CFG = { scale: 1, decoCap: 1, budget: Infinity };
let _glowCalls = 0;
export function setGlowCfg(cfg = {}) {
  if (cfg.scale != null) GLOW_CFG.scale = Math.max(0, +cfg.scale || 0);
  if (cfg.decoCap != null) GLOW_CFG.decoCap = Math.max(0, Math.min(1, +cfg.decoCap || 0));
  if (cfg.budget != null) GLOW_CFG.budget = cfg.budget === Infinity ? Infinity : Math.max(0, +cfg.budget || 0);
  return glowCfg();
}
export function glowCfg() { return { ...GLOW_CFG }; }
export function glowFrameCount() { return _glowCalls; }              // calls since the last clear()
export function glowOverBudget() { return _glowCalls > GLOW_CFG.budget; }   // always false at the default budget
export function glowFrameReset() { _glowCalls = 0; }
// alpha pipeline: global scale, then the decorative cap (identity at the defaults).
function glowAlpha(alpha, deco) {
  const a = alpha * GLOW_CFG.scale;
  return deco ? Math.min(a, GLOW_CFG.decoCap) : a;
}

// A soft radial glow in world space (additive) — good for projectiles, fire, shards.
export function glowWorld(wx, wy, r, color, alpha = 0.5, { deco = false } = {}) {
  // R28/W1-B (ART_SPEC 2.2) — once the frame is over its soft glow budget, DECORATIVE glows
  // silently degrade to the cached low-radius blit: no per-call gradient build, smaller
  // footprint, so a 200-enemy screen sheds bloom instead of framerate. Warning/telegraph
  // glows never pass `deco` and are never degraded. Identity while budget is Infinity.
  if (deco && _glowCalls > GLOW_CFG.budget) { glowWorldCached(wx, wy, r * 0.6, color, alpha, { deco: true }); return; }
  _glowCalls++;
  alpha = glowAlpha(alpha, deco);
  const s = worldToScreen(wx, wy);
  const rr = r * camera.zoom;
  const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, rr);
  g.addColorStop(0, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(s.x, s.y, rr, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Cached variant of glowWorld: bakes each (color, r) radial gradient into an
// offscreen canvas ONCE, then blits it additively (scaled by zoom + modulated by
// globalAlpha). Use for the per-frame scene light channel, where many emitters
// share a handful of (color, r) pairs so the per-call gradient build dominates.
const _glowTex = new Map();
function glowTexture(r, color) {
  const key = color + '|' + r;
  let c = _glowTex.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = r * 2;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, withAlpha(color, 1)); grad.addColorStop(1, withAlpha(color, 0));
    g2.fillStyle = grad; g2.beginPath(); g2.arc(r, r, r, 0, Math.PI * 2); g2.fill();
    _glowTex.set(key, c);
  }
  return c;
}
export function glowWorldCached(wx, wy, r, color, alpha = 0.5, { deco = false } = {}) {
  _glowCalls++;
  alpha = glowAlpha(alpha, deco);
  if (!(alpha > 0)) return;
  const s = worldToScreen(wx, wy), z = camera.zoom;
  const tex = glowTexture(Math.max(1, Math.round(r)), color), rr = r * z;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(tex, s.x - rr, s.y - rr, rr * 2, rr * 2);
  ctx.restore();
}

// Draw ONLY a solid-colour silhouette of a sprite frame (reuses the hit-flash
// tint cache) at a given alpha — used for the "surrounded" player beacon.
export function drawSpriteTint(spriteCanvas, wx, wy, color, alpha, opts = {}) {
  if (!spriteCanvas || !(alpha > 0)) return;
  const z = camera.zoom;
  const ax = opts.ax ?? spriteCanvas.width / 2, ay = opts.ay ?? spriteCanvas.height / 2;
  const s = worldToScreen(wx, wy), scale = (opts.scale ?? 1) * z;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(s.x, s.y);
  if (opts.flipX) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.drawImage(tintedFrame(spriteCanvas, color), -ax, -ay);
  ctx.restore();
}

// ---- screen-space UI -------------------------------------------------------
// All UI uses device pixels. Use uiScale() to keep UI readable across DPI.
// UI scale tuned so 1080p ≈ 2. Keeps panels/text a sensible size across resolutions.
// 1.3: continuous UI scaling (was integer 1/2/3 steps, which caused jumpy reflow/跑版).
// Design basis ~1100×680 (less aggressive than 960×600, which made 1080p panels fill the
// screen); times a user multiplier (設定 UI 大小); clamped so small screens fit + 4K isn't huge.
let _uiScaleMul = 1;
export function setUiScaleMul(m) { _uiScaleMul = Math.max(0.6, Math.min(1.5, m || 1)); }
// R29 E-2 — the 0.6/2.6 clamp is a CSS-space judgement ("how big should UI look"), so it is
// applied to the CSS-derived scale and only then multiplied into device space. The old form
// clamped after the dpr had already been folded in, so a 1920×1080 DPR2 player hit the 2.6 cap
// and got UI at 81.9% of the physical size a DPR1 player saw. Return value keeps its meaning
// (a device-pixel multiplier); dpr=1 is bit-identical to before.
export function uiScale() {
  const cssS = Math.max(0.6, Math.min(2.6, Math.min(cssW / 1100, cssH / 680) * _uiScaleMul));
  return cssS * dpr;
}

export function ctxRaw() { return ctx; }

// R29 E-3 — half-pixel alignment for ODD stroke widths. A 1 px stroke on an integer path
// straddles two device columns at half intensity each (measured: peak 0.489, visually a 2 px
// grey line) at EVERY DPR. Nudging the path by 0.5 puts it inside one column at full strength.
// Fixed here, at the single choke point, rather than at the 102 `lw:` call sites; the fill is
// nudged with it so the border still hugs the fill (0.5 device px is not visible).
export function uiRect(x, y, w, h, color, { radius = 0, stroke = null, lw = 1, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const off = (stroke && Math.round(lw) % 2 === 1) ? 0.5 : 0;
  if (off) { x += off; y += off; }
  if (radius > 0) roundRectPath(x, y, w, h, radius); else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  if (color) { ctx.fillStyle = color; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}
function roundRectPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export { roundRectPath };
// round16/UI-fix #7 — run a draw callback clipped to a rounded-rect. Used to cap a short
// "top accent bar" to its parent card's rounded corners, so the bar's tight (radius-2) corners
// can't poke past the card's radius-9 frame (the squared-corner artifact players reported).
export function uiClipRound(x, y, w, h, radius, draw) {
  ctx.save();
  if (radius > 0) roundRectPath(x, y, w, h, radius); else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  ctx.clip();
  try { draw(); } finally { ctx.restore(); }
}

// round16/1.1 — reverted to the original sans-serif UI font per player feedback (the KaiTi
// calligraphic look read as "ugly"). Kept the rest of the round-16 work; font stays as-is.
const FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", system-ui, sans-serif';
// round16/1.6 — UI sizing tokens (foundation): shared font sizes + component metrics so
// menus and sub-panels stay proportional. Consumed incrementally by UI code (sizes are the
// design base; callers still multiply by uiScale()).
// R28/W0 — aligned with ART_SPEC 4.1/4.2. Sizes stay the design base (callers still
// multiply by uiScale()); WEIGHT_* pin the only three allowed weights; GAP_* are the 8 px
// grid. GAP_SM/MD/LG were 6/10/16 and had ZERO consumers repo-wide, so re-basing them onto
// the spec grid changes no pixel today.
// R28/W1 — FONT_CAPTION folded up to the ART_SPEC 4.1 floor (10.5,「全案最小字級，禁止
// <10.5」); FONT_CAPTION_SPEC (the temporary W0 holding pen for that floor) is retired.
export const UI = {
  FONT_TITLE: 22, FONT_HEADING: 16, FONT_BODY: 13, FONT_CAPTION: 10.5,
  WEIGHT_TITLE: '900', WEIGHT_HEADING: '800', WEIGHT_BODY: '600',
  BTN_H: 36, ICON_SM: 16, ICON_MD: 24, ICON_LG: 32,
  GAP_SM: 8, GAP_MD: 16, GAP_LG: 24,
};
export function uiText(str, x, y, {
  size = 16, color = '#fff', align = 'left', baseline = 'alphabetic',
  weight = '600', shadow = true, shadowColor = 'rgba(0,0,0,0.6)', font = FONT, alpha = 1, letterSpacing = 0,
} = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = baseline;
  if (letterSpacing) ctx.letterSpacing = letterSpacing + 'px';
  if (shadow) { ctx.fillStyle = shadowColor; ctx.fillText(str, x + Math.max(1, size / 14), y + Math.max(1, size / 14)); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}
export function textWidth(str, size = 16, weight = '600', font = FONT) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// R28/W0 — ART_SPEC 4.2: THE button primitive (hover / focus / disabled built in), meant to
// replace the ~5 hand-rolled `btn` closures in the hub panels. The visual vocabulary is
// lifted from hub/panels.js's bank buttons so migrated call sites look unchanged. Pass either
// an explicit `hover`, or `mx`/`my` to have the hit-test done here. Returns the rect (with
// `.hover`/`.disabled`) so the caller can hit-test clicks against the same geometry.
// NO consumers yet — W1 migrates them.
export function uiButton(x, y, w, h, label, {
  S = 1, mx = null, my = null, hover = null, focus = false, disabled = false,
  size = UI.FONT_BODY * S, weight = UI.WEIGHT_TITLE, radius = 8 * S, lw = 2,
  fill = '#1b2138', fillHover = '#27306a', fillDisabled = '#141827',
  stroke = P.shardL, strokeDisabled = P.ink2, color = '#fff', colorDisabled = P.gray2,
  alpha = 0.96, dy = 1 * S,
} = {}) {
  const hot = disabled ? false
    : (hover != null ? !!hover
      : (mx != null && my != null && mx >= x && mx <= x + w && my >= y && my <= y + h));
  uiRect(x, y, w, h, withAlpha(disabled ? fillDisabled : (hot ? fillHover : fill), alpha),
    { radius, stroke: disabled ? strokeDisabled : stroke, lw });
  // focus ring sits OUTSIDE the frame, so keyboard focus stays readable on a hovered button
  if (focus) uiRect(x - 2 * S, y - 2 * S, w + 4 * S, h + 4 * S, null,
    { radius: radius + 2 * S, stroke: withAlpha('#ffffff', 0.75), lw: Math.max(1, lw - 0.5) });
  if (label != null && label !== '') uiText(label, x + w / 2, y + h / 2 + dy,
    { size, align: 'center', baseline: 'middle', color: disabled ? colorDisabled : color, weight });
  return { x, y, w, h, hover: hot, disabled: !!disabled };
}

// R28/W0 — shared text-measuring helpers (pure: they MEASURE, the caller draws). Behaviour
// mirrors the two hand-rolled copies still in the tree — hub/render_personal.js `clip1()` and
// run/overlays.js `wrapText()` — which W1 folds into these. Both are untouched by this batch.
//
// R29/RE-02 — UNBREAKABLE TEXT TOKENS. The per-character greedy wrap is correct for CJK (which
// has no spaces) but wrong for the numbers embedded in it: `+0.3`／`-10%`／`×1.2` were being cut
// mid-token (「-10 / %」,「+0. / 3」) at exactly the highest-traffic decision point (the sortie
// hero cards). Tokenising keeps a signed/decimal/percent number — and a latin word — atomic,
// while every CJK glyph stays its own token, so CJK wrapping is byte-identical to before.
// `(?<![0-9A-Za-z])` keeps the numeric arm from firing inside an identifier ("v2" stays one
// latin token); `[\s\S]` is the per-glyph fallback that preserves the old CJK behaviour.
const TOKEN_RE = /(?<![0-9A-Za-z])[+\-−±×✕]?\d+(?:[.,/]\d+)*[%％×°]?|[A-Za-z][A-Za-z0-9'’._-]*|[^\S\n]+|[\s\S]/gu;
// 禁則: glyphs that must never be stranded at the head of a line. On overflow we keep them on
// the current line (a few px of overhang) rather than break before them.
const NO_LINE_START = new Set([...'。，、．,.!！?？:：;；)）]］}｝」』】〉》%％°·・…～~　']);
function tokenize(str) { return str.match(TOKEN_RE) || []; }
const isBlank = (t) => !/\S/.test(t);
// Drop WHOLE tokens off the end until `str + suffix` fits — trimming by character would
// re-break the very tokens the wrap just protected (a clipped 「+0.…」 is the RE-02 bug again).
function trimTokensToWidth(str, maxW, size, weight, suffix) {
  const toks = tokenize(str);
  while (toks.length > 1 && textWidth(toks.join('') + suffix, size, weight) > maxW) toks.pop();
  let s = toks.join('');
  // last resort: a single token still too wide — fall back to per-character shaving
  while (s.length > 1 && textWidth(s + suffix, size, weight) > maxW) s = s.slice(0, -1);
  return s + suffix;
}
// Single-line clip with an ellipsis; returns the string that fits in `maxW`.
export function uiClip1(text, maxW, size = UI.FONT_BODY, weight = UI.WEIGHT_BODY) {
  const str = String(text ?? '');
  if (!(maxW > 0) || textWidth(str, size, weight) <= maxW) return str;
  return trimTokensToWidth(str, maxW, size, weight, '…');
}
// Greedy token-aware wrap (still per-glyph for CJK, which has no spaces); returns the lines.
// Explicit '\n' always breaks. `maxLines > 0` truncates and ellipsises the last kept line.
export function uiWrapText(text, maxW, size = UI.FONT_BODY, weight = UI.WEIGHT_BODY, maxLines = 0) {
  const str = String(text ?? '');
  const lines = [];
  const paras = str.split('\n');
  paras.forEach((para, pi) => {
    let line = '';
    for (const t of tokenize(para)) {
      if (!line) { if (!isBlank(t)) line = t; continue; }   // never open a line with whitespace
      if (textWidth(line + t, size, weight) <= maxW) { line += t; continue; }
      if (NO_LINE_START.has(t)) { line += t; continue; }    // 禁則: keep it on this line
      lines.push(line);
      line = isBlank(t) ? '' : t;                           // a wrap eats the space it broke on
    }
    if (line || pi < paras.length - 1) lines.push(line);    // blank line only from an explicit \n
  });
  if (maxLines > 0 && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = trimTokensToWidth(kept[maxLines - 1], maxW, size, weight, '…');
    return kept;
  }
  return lines;
}
// round16/1.4 → R17/2.1: the 🪙 emoji is missing from the CJK font stack on common
// Windows configs (rendered as □), so the STRING form is now text-only「N 金幣」.
// Anywhere the amount is drawn directly (price tags, buttons), use ui/gold.js goldLabel()
// instead — it draws the real pixel coin sprite next to the number.
export function goldStr(n) { return (typeof n === 'number' ? Math.round(n) : n) + ' 金幣'; }
// round16/1.8: pixel bitmap font for ASCII-only numeric values (HP/Lv/gold/timer…).
// Press Start 2P only covers ASCII, so use ONLY for digit/latin strings, never CJK.
// It renders ~20% wider, so callers shrink the size (×0.82).
export const PIXEL_FONT = "'Press Start 2P', monospace";

// progress / health bar
export function uiBar(x, y, w, h, frac, { fg = P.red, bg = '#000', border = '#000', radius = 2, glow = false } = {}) {
  frac = Math.max(0, Math.min(1, frac));
  uiRect(x - 1, y - 1, w + 2, h + 2, border, { radius: radius + 1 });
  uiRect(x, y, w, h, bg, { radius });
  if (frac > 0) {
    if (glow) { ctx.save(); ctx.shadowColor = fg; ctx.shadowBlur = 8; }
    uiRect(x, y, Math.max(2, w * frac), h, fg, { radius });
    if (glow) ctx.restore();
  }
}

// generic image blit in screen space (for UI icons made from sprites).
// opt-in `tint`: blit a source-in silhouette (codex 剪影 for undiscovered entries) instead of the
// real frame — reuses the world-space tintedFrame WeakMap cache. Untinted path is byte-unchanged.
export function drawSpriteUI(spriteCanvas, x, y, scale = 1, { alpha = 1, flipX = false, tint = null } = {}) {
  if (!spriteCanvas) return;
  const src = tint ? tintedFrame(spriteCanvas, tint) : spriteCanvas;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  const w = src.width * scale, h = src.height * scale;
  if (flipX) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(src, 0, 0, w, h); }
  else ctx.drawImage(src, x, y, w, h);
  ctx.restore();
}

export function vignette(strength = 0.5) {
  ctx.save();   // gradient fillStyle must not leak to later draws
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
