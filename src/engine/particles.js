// Lightweight particle + floating-text system for game feel.
import { fillCircleWorld, fillRectWorld, worldToScreen, uiText, drawSprite, glowWorld } from './renderer.js';
import { withAlpha, P } from './palette.js';
import { getSprite } from './sprites.js';

// P1-2 accessibility: global particle-density multiplier (0..1). Scales the count of the
// three burst-style emitters (burst/ring/trail); floating text is unaffected.
let density = 1;
export function setParticleDensity(v) { density = Math.max(0, Math.min(1, +v || 0)); }

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
      });
    }
  }

  hit(x, y, ang, color = P.emberL) {
    this.burst(x, y, 6, { angle: ang, spread: 1.4, speed: 70, color: [color, '#fff'], size: 2, life: 0.3, glow: true });
  }
  blood(x, y, ang, color = P.blood) {
    this.burst(x, y, 8, { angle: ang, spread: 1.6, speed: 55, color: [color, P.red], size: 2, life: 0.5, grav: 120, drag: 0.9 });
  }
  death(x, y, color = P.green) {
    this.burst(x, y, 16, { speed: 60, color: [color, '#fff'], size: 2, life: 0.6, drag: 0.85, glow: true });
    this.burst(x, y, 8, { speed: 30, color: [color], size: 3, life: 0.8, grav: 80 });
  }
  muzzle(x, y, ang, color = P.shardL) {
    this.burst(x, y, 4, { angle: ang, spread: 0.6, speed: 90, color: [color, '#fff'], size: 1.5, life: 0.15, glow: true });
  }
  ring(x, y, color, n = 12, speed = 90) {
    const cnt = Math.round(n * density);
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2;
      this.spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.4, size: 2, color, drag: 0.8, glow: true });
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
      const a = p.fade ? Math.max(0, Math.min(1, p.life / p.maxLife)) : 1;
      const col = withAlpha(p.color, a);
      if (p.glow) glowWorld(p.x, p.y, p.size * 1.6, p.color, a * 0.5);
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
