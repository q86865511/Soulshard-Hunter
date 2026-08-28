// Lightweight particle + floating-text system for game feel.
import { fillCircleWorld, fillRectWorld, worldToScreen, uiText, drawSprite, glowWorld } from './renderer.js';
import { withAlpha, P } from './palette.js';
import { getSprite } from './sprites.js';

// P1-2 accessibility: global particle-density multiplier (0..1). Scales the count of the
// three burst-style emitters (burst/ring/trail); floating text is unaffected.
let density = 1;
export function setParticleDensity(v) { density = Math.max(0, Math.min(1, +v || 0)); }

// ---- R28/W1-B decorative-particle caps (ART_SPEC 2.2) ----------------------
// The particle list IS the decorative light channel: damage numbers live in `texts`,
// telegraphs are beams and pickup shimmer is drawn by the pickup itself, so none of them
// pass through here. Everything in `list` is therefore capped — saturation ≤70%, alpha
// ≤0.5, linear over its life — UNLESS the emitter opted out with `warn:true` (damage
// feedback + boss/event telegraph sparks, which ART_SPEC leaves unrestricted).
// Defaults are the spec values; BALANCE.ARTV drives them via setParticleArtCaps().
let decoAlpha = 0.5, decoSat = 0.7;
export function setParticleArtCaps({ alpha, sat } = {}) {
  if (alpha != null) decoAlpha = Math.max(0, Math.min(1, +alpha || 0));
  if (sat != null) decoSat = Math.max(0, Math.min(1, +sat || 0));
  return { alpha: decoAlpha, sat: decoSat };
}

// Saturation clamp, memoised per (colour, cap) — up to 1400 live particles redraw every
// frame, so the HSL round-trip must happen once per distinct colour, never per particle.
const _desatCache = new Map();
function desaturate(col) {
  if (typeof col !== 'string' || col[0] !== '#' || decoSat >= 1) return col;
  const key = col + '|' + decoSat;
  let out = _desatCache.get(key);
  if (out !== undefined) return out;
  let h = col.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) { _desatCache.set(key, col); return col; }
  const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d === 0) { _desatCache.set(key, col); return col; }
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  if (s <= decoSat) { _desatCache.set(key, col); return col; }
  // pull each channel toward the luminance by the ratio the cap demands
  const k = decoSat / s, hx = (v) => Math.round(Math.max(0, Math.min(255, (l + (v - l) * k) * 255))).toString(16).padStart(2, '0');
  out = '#' + hx(r) + hx(g) + hx(b);
  _desatCache.set(key, out);
  return out;
}

export class Particles {
  constructor(max = 1400) { this.list = []; this.texts = []; this.max = max; }
  clear() { this.list.length = 0; this.texts.length = 0; }

  spawn(o) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      life: o.life ?? 0.5, maxLife: o.life ?? 0.5,
      size: o.size ?? 2, color: o.color ?? '#fff',
      grav: o.grav ?? 0, drag: o.drag ?? 0.9, shape: o.shape ?? 'rect',
      rot: o.rot ?? 0, vr: o.vr ?? 0, glow: o.glow ?? false, fade: o.fade ?? true,
      sprite: o.sprite ?? null, frame: o.frame ?? 0,
      warn: !!o.warn,        // R28/W1-B: damage/telegraph particle → exempt from the deco caps
    });
  }

  burst(x, y, n, opt = {}) {
    n = Math.round(n * density);
    for (let i = 0; i < n; i++) {
      const a = opt.angle != null ? opt.angle + (Math.random() - 0.5) * (opt.spread ?? Math.PI * 2) : Math.random() * Math.PI * 2;
      const spd = (opt.speed ?? 40) * (0.4 + Math.random() * 0.8);
      this.spawn({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: (opt.life ?? 0.4) * (0.6 + Math.random() * 0.6),
        size: opt.size ?? (1 + Math.random() * 2),
        color: Array.isArray(opt.color) ? opt.color[(Math.random() * opt.color.length) | 0] : (opt.color ?? '#fff'),
        grav: opt.grav ?? 0, drag: opt.drag ?? 0.86, shape: opt.shape ?? 'rect', glow: opt.glow ?? false,
        warn: opt.warn,
      });
    }
  }

  // hit/blood/death/muzzle are combat FEEDBACK, not decoration — ART_SPEC 2.2 exempts them.
  hit(x, y, ang, color = P.emberL) {
    this.burst(x, y, 6, { angle: ang, spread: 1.4, speed: 70, color: [color, '#fff'], size: 2, life: 0.3, glow: true, warn: true });
  }
  blood(x, y, ang, color = P.blood) {
    this.burst(x, y, 8, { angle: ang, spread: 1.6, speed: 55, color: [color, P.red], size: 2, life: 0.5, grav: 120, drag: 0.9, warn: true });
  }
  death(x, y, color = P.green) {
    this.burst(x, y, 16, { speed: 60, color: [color, '#fff'], size: 2, life: 0.6, drag: 0.85, glow: true, warn: true });
    this.burst(x, y, 8, { speed: 30, color: [color], size: 3, life: 0.8, grav: 80, warn: true });
  }
  muzzle(x, y, ang, color = P.shardL) {
    this.burst(x, y, 4, { angle: ang, spread: 0.6, speed: 90, color: [color, '#fff'], size: 1.5, life: 0.15, glow: true, warn: true });
  }
  ring(x, y, color, n = 12, speed = 90, opt = {}) {
    const cnt = Math.round(n * density);
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2;
      this.spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.4, size: 2, color, drag: 0.8, glow: true, warn: opt.warn });
    }
  }
  trail(x, y, color, size = 1.5) {
    if (Math.random() >= density) return;   // single-particle emitter → probabilistic thinning
    this.spawn({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 0.25, size, color, drag: 0.9, glow: true });
  }

  text(x, y, str, opt = {}) {
    this.texts.push({
      x, y, str, vy: opt.vy ?? -34, vx: opt.vx ?? 0, life: opt.life ?? 0.8, maxLife: opt.life ?? 0.8,
      color: opt.color ?? '#fff', size: opt.size ?? 14, weight: opt.weight ?? '800', rise: opt.rise ?? true,
    });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.list.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) { this.texts.splice(i, 1); continue; }
      t.x += t.vx * dt;
      if (t.rise) t.y += t.vy * dt;
      t.vy *= Math.pow(0.9, dt * 60);
    }
  }

  draw() {
    for (const p of this.list) {
      const lin = p.fade ? Math.max(0, Math.min(1, p.life / p.maxLife)) : 1;
      // R28/W1-B: decorative particles are held under the alpha cap and desaturated so they
      // read as atmosphere behind the actors instead of competing with them. Warning/damage
      // particles pass through at full strength, and their glow stays off the deco channel.
      const deco = !p.warn;
      // R28/FIX-1 (Codex #4): was `Math.min(lin, decoAlpha)`, which CLIPPED the fade — a
      // decorative particle sat flat at the cap for most of its life and then fell off a
      // cliff at the end. Scaling instead keeps the fade linear across the whole lifetime;
      // the peak (lin = 1) is unchanged at decoAlpha, only the tail actually recedes.
      const a = deco ? lin * decoAlpha : lin;
      const color = deco ? desaturate(p.color) : p.color;
      const col = withAlpha(color, a);
      if (p.glow) glowWorld(p.x, p.y, p.size * 1.6, color, a * 0.5, { deco });
      if (p.sprite) {
        drawSprite(getSprite(p.sprite).frames[p.frame] || getSprite(p.sprite).frames[0], p.x, p.y, { alpha: a });
      } else if (p.shape === 'circle') {
        fillCircleWorld(p.x, p.y, p.size, col);
      } else {
        fillRectWorld(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, col);
      }
    }
  }

  // floating texts are drawn in screen space so they stay crisp
  drawText() {
    for (const t of this.texts) {
      const a = Math.max(0, Math.min(1, t.life / t.maxLife));
      const s = worldToScreen(t.x, t.y);
      uiText(t.str, s.x, s.y, {
        size: t.size, color: withAlpha(t.color, a), align: 'center', baseline: 'middle',
        weight: t.weight, shadow: true, shadowColor: withAlpha('#000', a * 0.7),
      });
    }
  }
}
