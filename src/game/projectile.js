// Projectiles for both player and enemies. Collision is resolved by the world.
import { drawSprite, glowWorld } from '../engine/renderer.js';
import { getSprite } from '../engine/sprites.js';
import { P } from '../engine/palette.js';
import { dist2 } from '../engine/math.js';

export class Projectile {
  constructor(o) {
    this.x = o.x; this.y = o.y; this.vx = o.vx; this.vy = o.vy;
    this.radius = o.radius ?? 3;
    this.damage = o.damage ?? 10;
    this.faction = o.faction ?? 'player'; // 'player' | 'enemy'
    this.pierce = o.pierce ?? 0;
    this.life = o.life ?? 2.4;
    this.sprite = o.sprite ?? (this.faction === 'player' ? 'bolt' : 'bolt_enemy');
    this.knockback = o.knockback ?? 24;
    this.crit = o.crit ?? false;
    this.color = o.color ?? (this.faction === 'player' ? P.shard : P.red);
    this.homing = o.homing ?? 0;          // steering strength (player only)
    this.scale = o.scale ?? 1;
    this.rot = Math.atan2(this.vy, this.vx);
    this.spin = o.spin ?? 0;
    this.onHit = o.onHit || null;         // (target, world) => void  extra effects
    this.statusOnHit = o.statusOnHit || null;
    this.hitSet = new Set();
    this.dead = false;
    this.trailColor = o.trailColor ?? this.color;
    this.noTrail = o.noTrail ?? false;
  }

  update(dt, world) {
    if (this.homing > 0 && this.faction === 'player') {
      let best = null, bd = 9999 * 9999;
      for (const e of world.enemies) {
        if (e.dead || e.spawnT > 0 || this.hitSet.has(e)) continue;   // ignore spawn-invulnerable foes (matches resolveCombat/dealAreaDamage)
        const d = dist2(this.x, this.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const desired = Math.atan2(best.y - this.y, best.x - this.x);
        const cur = Math.atan2(this.vy, this.vx);
        let diff = desired - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const turn = Math.sign(diff) * Math.min(Math.abs(diff), this.homing * dt);
        const sp = Math.hypot(this.vx, this.vy);
        const na = cur + turn;
        this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
      }
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.rot = this.spin ? this.rot + this.spin * dt : Math.atan2(this.vy, this.vx);
    this.life -= dt;
    if (!this.noTrail && Math.random() < 0.6) world.particles.trail(this.x, this.y, this.trailColor, this.radius * 0.7);
    if (this.life <= 0) { this.dead = true; return; }
    if (world.solidAt(this.x, this.y)) {
      this.dead = true;
      world.particles.hit(this.x, this.y, this.rot + Math.PI, this.color);
    }
  }

  draw() {
    glowWorld(this.x, this.y, this.radius * 2.2 * this.scale, this.color, 0.5);
    const sp = getSprite(this.sprite);
    drawSprite(sp.frames[0], this.x, this.y, { ax: sp.ax, ay: sp.ay, rot: this.rot + Math.PI / 2, scale: this.scale });
  }
}
