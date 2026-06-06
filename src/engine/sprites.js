// Procedural pixel-art system — ENHANCED EDITION (art_v2).
// Sprites are defined as small draw functions over a tiny pixel API, then
// rasterised once into cached canvases. This keeps ALL art self-generated,
// consistent (shared palette + outline), and trivially extensible.
//
// This edition is a strict SUPERSET of the original engine: every original
// method/export is byte-compatible, plus a set of "anime polish" helpers
// (gradients, glow, sparkle, rim light, soft shadow, dither, aura) that the
// upgraded art uses for shinier, more dynamic results.

import { P, darken, lighten, mix, withAlpha } from './palette.js';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return c;
}

// ---- Pixel drawing API -----------------------------------------------------
export class Painter {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
  }
  clear() { this.ctx.clearRect(0, 0, this.w, this.h); }
  px(x, y, col) {
    if (!col || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.ctx.fillStyle = col;
    this.ctx.fillRect(x | 0, y | 0, 1, 1);
  }
  rect(x, y, w, h, col) {
    if (!col) return;
    this.ctx.fillStyle = col;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  rectLine(x, y, w, h, col) {
    this.hline(x, x + w - 1, y, col); this.hline(x, x + w - 1, y + h - 1, col);
    this.vline(y, y + h - 1, x, col); this.vline(y, y + h - 1, x + w - 1, col);
  }
  hline(x0, x1, y, col) { if (x1 < x0) [x0, x1] = [x1, x0]; this.rect(x0, y, x1 - x0 + 1, 1, col); }
  vline(y0, y1, x, col) { if (y1 < y0) [y0, y1] = [y1, y0]; this.rect(x, y0, 1, y1 - y0 + 1, col); }
  line(x0, y0, x1, y1, col) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // filled circle / ellipse
  circle(cx, cy, r, col) { this.ellipse(cx, cy, r, r, col); }
  ellipse(cx, cy, rx, ry, col) {
    if (rx <= 0 || ry <= 0) return;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.sqrt(1 - (y * y) / (ry * ry)) * rx;
      this.hline(Math.round(cx - w), Math.round(cx + w), Math.round(cy + y), col);
    }
  }
  ring(cx, cy, r, col) {
    for (let a = 0; a < Math.PI * 2; a += 0.12) this.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), col);
  }
  // mirror the left half onto the right (vertical symmetry axis at w/2)
  mirrorX() {
    const { ctx, w, h } = this;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const half = Math.floor(w / 2);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < half; x++) {
        const src = (y * w + x) * 4;
        const dst = (y * w + (w - 1 - x)) * 4;
        d[dst] = d[src]; d[dst + 1] = d[src + 1]; d[dst + 2] = d[src + 2]; d[dst + 3] = d[src + 3];
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  // add an outer outline around opaque pixels
  outline(col = P.ink, diagonal = false) {
    const { ctx, w, h } = this;
    const img = ctx.getImageData(0, 0, w, h);
    const a = img.data;
    const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
    const out = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1) ||
        (diagonal && (opaque(x - 1, y - 1) || opaque(x + 1, y - 1) || opaque(x - 1, y + 1) || opaque(x + 1, y + 1)))) {
        out.push(x, y);
      }
    }
    ctx.fillStyle = col;
    for (let i = 0; i < out.length; i += 2) ctx.fillRect(out[i], out[i + 1], 1, 1);
  }
  // drop a soft inner shade on the lower portion to fake volume
  shadeBottom(amt = 0.22, fromRow = null) {
    const { ctx, w, h } = this;
    const start = fromRow == null ? Math.floor(h * 0.6) : fromRow;
    const img = ctx.getImageData(0, 0, w, h);
    const a = img.data;
    for (let y = start; y < h; y++) {
      const t = ((y - start) / Math.max(1, h - start)) * amt;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (a[i + 3] === 0) continue;
        a[i] *= 1 - t; a[i + 1] *= 1 - t; a[i + 2] *= 1 - t;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  replace(from, to) {
    const f = hexRGB(from), t = hexRGB(to);
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const a = img.data;
    for (let i = 0; i < a.length; i += 4) {
      if (a[i] === f[0] && a[i + 1] === f[1] && a[i + 2] === f[2] && a[i + 3] > 0) {
        a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2];
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  ENHANCED "anime polish" helpers — all additive, safe to ignore.
  //  Conventions: call colour effects DURING drawing; call rimLight()/
  //  shadeBottom() AFTER the body is drawn but BEFORE outline().
  // ═════════════════════════════════════════════════════════════════════════

  // Vertical gradient fill (top colour -> bottom colour), 1px rows.
  gradV(x, y, w, h, top, bot) {
    for (let i = 0; i < h; i++) {
      const t = h <= 1 ? 0 : i / (h - 1);
      this.rect(x, y + i, w, 1, mix(top, bot, t));
    }
  }
  // Horizontal gradient fill (left -> right), 1px columns.
  gradH(x, y, w, h, left, right) {
    for (let i = 0; i < w; i++) {
      const t = w <= 1 ? 0 : i / (w - 1);
      this.rect(x + i, y, 1, h, mix(left, right, t));
    }
  }
  // Soft radial glow: stacked translucent discs, brightest at the centre.
  // Great for magic orbs, glowing eyes, energy auras, lava pools.
  glow(cx, cy, r, col, strength = 0.55, steps = 4) {
    for (let i = steps; i >= 1; i--) {
      const rr = (r * i) / steps;
      const a = strength * (1 - (i - 1) / steps);
      this.ellipse(cx, cy, rr, rr, withAlpha(col, a));
    }
  }
  // A bright twinkle (plus-shape). size = arm length in px.
  sparkle(x, y, col = P.white, size = 1) {
    this.px(x, y, col);
    for (let i = 1; i <= size; i++) {
      this.px(x + i, y, col); this.px(x - i, y, col);
      this.px(x, y + i, col); this.px(x, y - i, col);
    }
  }
  // A 4-point star/sparkle with long thin arms + soft core (anime "kira").
  star4(cx, cy, r, col = P.white, coreCol = null) {
    for (let i = 0; i <= r; i++) {
      const t = 1 - i / (r + 1);
      const c = withAlpha(col, 0.35 + 0.65 * t);
      this.px(cx + i, cy, c); this.px(cx - i, cy, c);
      this.px(cx, cy + i, c); this.px(cx, cy - i, c);
    }
    if (coreCol) { this.px(cx, cy, coreCol); }
  }
  // A translucent ground contact shadow (sits the sprite on the floor).
  softShadow(cx, cy, rx, ry, alpha = 0.4, col = P.shadow) {
    this.ellipse(cx, cy, rx, ry, withAlpha(col, alpha));
  }
  // Post-process rim light: brighten silhouette edges that face the light.
  // dx,dy = light direction (default top-left). Call before outline().
  rimLight(col = P.rim, amt = 0.55, dx = -1, dy = -1) {
    const { ctx, w, h } = this;
    const img = ctx.getImageData(0, 0, w, h);
    const a = img.data;
    const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
    const [r, g, b] = hexRGB(col);
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!op(x, y)) continue;
      if (!op(x + dx, y) || !op(x, y + dy)) edge.push(x, y);
    }
    for (let i = 0; i < edge.length; i += 2) {
      const idx = (edge[i + 1] * w + edge[i]) * 4;
      a[idx] += (r - a[idx]) * amt; a[idx + 1] += (g - a[idx + 1]) * amt; a[idx + 2] += (b - a[idx + 2]) * amt;
    }
    ctx.putImageData(img, 0, 0);
  }
  // 2-colour checkerboard fill — fakes a third gradient tone within a tight
  // palette without banding. Good for skies, water, energy fields.
  dither(x, y, w, h, ca, cb) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      this.px(x + i, y + j, ((i + j) & 1) ? cb : ca);
    }
  }
  // Deterministic scattered specks (texture/sparkle) — seeded so bakes are stable.
  speckle(x, y, w, h, col, count = 6, seed = 1) {
    let s = (seed | 0) || 1;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < count; i++) {
      this.px(x + Math.floor(rnd() * w), y + Math.floor(rnd() * h), col);
    }
  }
  // Animated-friendly pulsing aura ring (pass a per-frame phase 0..1).
  aura(cx, cy, r, col, phase = 0, ringCount = 2) {
    for (let k = 0; k < ringCount; k++) {
      const rr = r + k + Math.sin((phase + k * 0.5) * Math.PI * 2) * 0.6;
      const a = 0.5 - k * 0.18;
      const seg = 0.34;
      for (let ang = 0; ang < Math.PI * 2; ang += seg) {
        this.px(Math.round(cx + Math.cos(ang) * rr), Math.round(cy + Math.sin(ang) * rr), withAlpha(col, a));
      }
    }
  }
}

function hexRGB(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// ---- Registry --------------------------------------------------------------
const REG = new Map();

/**
 * defineSprite(name, w, h, draw, opts)
 *   draw(p) -> paints one frame. opts: { anchor:[ax,ay] | 'feet' | 'center', fps, loop }
 * defineAnim(name, w, h, frames, draw, opts)
 *   draw(p, frameIndex) -> paints frame i.
 */
export function defineSprite(name, w, h, draw, opts = {}) {
  return defineAnim(name, w, h, 1, (p) => draw(p), opts);
}

export function defineAnim(name, w, h, frameCount, draw, opts = {}) {
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const p = new Painter(w, h);
    draw(p, i);
    frames.push(p.canvas);
  }
  let ax = w / 2, ay = h / 2;
  if (opts.anchor === 'feet') { ax = w / 2; ay = h - 1; }
  else if (opts.anchor === 'center') { ax = w / 2; ay = h / 2; }
  else if (Array.isArray(opts.anchor)) { ax = opts.anchor[0]; ay = opts.anchor[1]; }
  const sprite = { name, frames, w, h, ax, ay, fps: opts.fps ?? 6, loop: opts.loop ?? true };
  REG.set(name, sprite);
  return sprite;
}

let _missing = null;
export function getSprite(name) {
  const s = REG.get(name);
  if (s) return s;
  if (!_missing) {
    const p = new Painter(16, 16);
    p.rect(0, 0, 16, 16, '#ff00ff'); p.rect(0, 0, 8, 8, '#000'); p.rect(8, 8, 8, 8, '#000');
    _missing = { name: '__missing', frames: [p.canvas], w: 16, h: 16, ax: 8, ay: 8, fps: 1, loop: true };
  }
  return _missing;
}
export function hasSprite(name) { return REG.has(name); }
export function allSpriteNames() { return [...REG.keys()]; }
// returns name if a real sprite is registered, otherwise the fallback
export function iconOr(name, fallback) { return name && REG.has(name) ? name : fallback; }

// pick a frame canvas from a sprite given elapsed time (seconds) + optional offset
export function frameAt(sprite, time, offset = 0) {
  const n = sprite.frames.length;
  if (n <= 1) return sprite.frames[0];
  let idx = Math.floor((time * sprite.fps) + offset);
  idx = sprite.loop ? ((idx % n) + n) % n : Math.min(n - 1, Math.max(0, idx));
  return sprite.frames[idx];
}

// convenience for symmetric characters: draw left half, auto-mirror, outline.
export function symmetric(p, draw, { outline = P.ink, diagonal = false } = {}) {
  draw(p);
  p.mirrorX();
  if (outline) p.outline(outline, diagonal);
}

// expose the sprite registry getter for galleries / tooling
export function getRegistry() { return REG; }
