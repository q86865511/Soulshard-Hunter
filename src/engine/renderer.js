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
  const z = Math.round(Math.min(W / 430, H / 280));
  camera.zoom = Math.max(2, Math.min(6, z));
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
export function setShakeEnabled(b) { shakeEnabled = b; }
export function setShakeScale(s) { shakeScale = s; }   // …the run scene raises this only when near death
export function addShake(mag) { if (shakeEnabled) camera.shakeMag = Math.min(10, camera.shakeMag + mag * shakeScale); }

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

// A soft radial glow in world space (additive) — good for projectiles, fire, shards.
export function glowWorld(wx, wy, r, color, alpha = 0.5) {
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

// ---- screen-space UI -------------------------------------------------------
// All UI uses device pixels. Use uiScale() to keep UI readable across DPI.
// UI scale tuned so 1080p ≈ 2. Keeps panels/text a sensible size across resolutions.
// 1.3: continuous UI scaling (was integer 1/2/3 steps, which caused jumpy reflow/跑版).
// Design basis 960×600; clamp 0.85–2.5 so small screens fit and 4K isn't oversized.
export function uiScale() { return Math.max(0.85, Math.min(2.5, Math.min(W / 960, H / 600))); }

export function ctxRaw() { return ctx; }

export function uiRect(x, y, w, h, color, { radius = 0, stroke = null, lw = 1, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
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

// round16/1.1 — reverted to the original sans-serif UI font per player feedback (the KaiTi
// calligraphic look read as "ugly"). Kept the rest of the round-16 work; font stays as-is.
const FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", system-ui, sans-serif';
// round16/1.6 — UI sizing tokens (foundation): shared font sizes + component metrics so
// menus and sub-panels stay proportional. Consumed incrementally by UI code (sizes are the
// design base; callers still multiply by uiScale()).
export const UI = {
  FONT_TITLE: 22, FONT_HEADING: 16, FONT_BODY: 13, FONT_CAPTION: 10,
  BTN_H: 36, ICON_SM: 16, ICON_MD: 24, ICON_LG: 32,
  GAP_SM: 6, GAP_MD: 10, GAP_LG: 16,
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
// round16/1.4: unify every gold amount behind one coin-icon prefix (replaces the
// inconsistent mix of 「金」/「金幣」/no-icon). Use anywhere a gold AMOUNT is shown.
export function goldStr(n) { return '🪙' + (typeof n === 'number' ? Math.round(n) : n); }
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

// generic image blit in screen space (for UI icons made from sprites)
export function drawSpriteUI(spriteCanvas, x, y, scale = 1, { alpha = 1, flipX = false } = {}) {
  if (!spriteCanvas) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  const w = spriteCanvas.width * scale, h = spriteCanvas.height * scale;
  if (flipX) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(spriteCanvas, 0, 0, w, h); }
  else ctx.drawImage(spriteCanvas, x, y, w, h);
  ctx.restore();
}

export function vignette(strength = 0.5) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
