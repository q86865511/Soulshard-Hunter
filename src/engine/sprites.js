// Procedural pixel-art system.
// Sprites are defined as small draw functions over a tiny pixel API, then
// rasterised once into cached canvases. This keeps ALL art self-generated,
// consistent (shared palette + outline), and trivially extensible by content files.

import { P, darken, lighten, mix } from './palette.js';

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
