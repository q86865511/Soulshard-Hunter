// Enemy actor with a few reusable AI behaviours driven by its definition.
import { drawSprite, drawShadow, glowWorld, addShake } from '../engine/renderer.js';
import { getSprite, frameAt } from '../engine/sprites.js';
import { dist, dist2, angleBetween, normalize, clamp, TAU } from '../engine/math.js';
import { P } from '../engine/palette.js';
import { Projectile } from './projectile.js';
import { Sfx } from '../engine/audio.js';
import { Enemies } from './content/registry.js';

export class Enemy {
  constructor(def, x, y, world, opts = {}) {
    this.def = def; this.id = def.id;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.elite = !!opts.elite;
    this.boss = !!def.boss;

    const hpScale = (opts.hpScale ?? 1) * (this.elite ? 3.2 : 1);
    const dmgScale = (opts.dmgScale ?? 1) * (this.elite ? 1.5 : 1);
    this.maxHp = Math.max(1, Math.round((def.hp ?? 20) * hpScale));
    this.hp = this.maxHp;
    this.speed = (def.speed ?? 30) * (opts.speedScale ?? 1) * (this.elite ? 0.85 : 1);
    this.damage = (def.damage ?? 8) * dmgScale;
    this.radius = def.radius ?? 6;
    this.sprite = def.sprite;
    this.ai = def.ai ?? 'chase';
    this.tint = def.tint ?? (this.elite ? P.gold : null);
    this.knockResist = clamp(def.knockbackResist ?? 0, 0, 0.95) + (this.boss ? 0.5 : 0) + (this.elite ? 0.2 : 0);
    this.xp = def.xp ?? 3; this.gold = def.gold ?? 1; this.shard = def.shard ?? 0;
    this.attack = def.attack || null;

    this.facing = -1; this.flash = 0; this.touchCd = 0; this.t = Math.random() * 6.28;
    this.attackCd = (this.attack?.cooldown ?? 1.4) * (0.5 + Math.random());
    this.stateT = 0; this.dashVX = 0; this.dashVY = 0; this.charging = false; this.wobble = Math.random() * 6.28;
    this.spawnT = 0.28;       // brief spawn-in invulnerable/fade
    this.dead = false; this.processed = false;
    this.scale = def.scale ?? (this.boss ? 2.4 : this.elite ? 1.35 : 1);
    if (this.boss) { this.phase = 0; this.phaseThresh = [0.66, 0.33]; this.enrage = 1; this.iframe = 0; }
  }

  // ---- boss phases ---------------------------------------------------------
  radialBurst(world, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU + world.time;
      this.shoot(world, a, { projSpeed: speed, projDamage: this.attack?.projDamage ?? this.damage, projColor: this.tint || P.redL, projSprite: 'bolt_enemy' });
    }
  }
  phaseShift(world) {
    this.iframe = 0.7; this.enrage += 0.45; this.flash = 0.3;
    addShake(9);
    world.particles.ring(this.x, this.y, this.tint || P.redL, 28, 170);
    world.spawnExplosion(this.x, this.y, this.radius * this.scale * 1.4, this.tint || P.emberL, 0);
    world.particles.text(this.x, this.y - this.radius * this.scale - 8, '階段 ' + (this.phase + 1), { color: P.redL, size: 18, life: 1.3 });
    this.radialBurst(world, 12 + this.phase * 6, (this.attack?.projSpeed ?? 110));
    const pl = world.player;
    if (pl) { const a = Math.atan2(pl.y - this.y, pl.x - this.x); pl.vx += Math.cos(a) * 170; pl.vy += Math.sin(a) * 170; }
    const pool = Enemies.upTo(2).filter((d) => !d.boss);
    for (let i = 0; i < 2 + this.phase; i++) if (pool.length) {
      const def = pool[(Math.random() * pool.length) | 0]; const ang = Math.random() * TAU;
      world.spawnEnemy(def, this.x + Math.cos(ang) * 42, this.y + Math.sin(ang) * 42, { quiet: true, hpScale: 1.4 });
    }
    Sfx.play('boss');
  }

  hurt(dmg, kbx, kby, world, crit = false) {
    if (this.dead || this.spawnT > 0 || this.iframe > 0) return;
    this.hp -= dmg;
    this.flash = 0.1;
    if (crit) Sfx.play('crit'); else Sfx.hit();
    world.particles.text(this.x, this.y - this.radius * this.scale - 4, String(Math.round(dmg)),
      { color: crit ? P.goldL : '#ffffff', size: crit ? 18 : 13, weight: crit ? '900' : '800' });
    world.particles.blood(this.x, this.y, Math.atan2(kby, kbx), this.def.bloodColor || P.blood);
    const k = 1 - this.knockResist;
    this.vx += kbx * k; this.vy += kby * k;
    if (this.hp <= 0) this.dead = true;
  }

  shoot(world, ang, override = {}) {
    const a = this.attack || {};
    world.addProjectile(new Projectile({
      x: this.x + Math.cos(ang) * (this.radius + 2),
      y: this.y + Math.sin(ang) * (this.radius + 2),
      vx: Math.cos(ang) * (a.projSpeed ?? 90), vy: Math.sin(ang) * (a.projSpeed ?? 90),
      damage: a.projDamage ?? this.damage, faction: 'enemy',
      sprite: a.projSprite ?? 'bolt_enemy', color: a.projColor ?? P.red,
      radius: a.projRadius ?? 3, life: a.projLife ?? 3, ...override,
    }));
    world.particles.muzzle(this.x + Math.cos(ang) * 6, this.y + Math.sin(ang) * 6, ang, a.projColor ?? P.redL);
  }

  update(dt, world) {
    this.t += dt;
    if (this.spawnT > 0) { this.spawnT -= dt; }
    if (this.flash > 0) this.flash -= dt;
    if (this.touchCd > 0) this.touchCd -= dt;
    if (this.boss) {
      if (this.iframe > 0) this.iframe -= dt;
      if (this.phase < this.phaseThresh.length && this.hp / this.maxHp < this.phaseThresh[this.phase]) { this.phase++; this.phaseShift(world); }
    }
    const player = world.player;
    const toP = player ? dist(this.x, this.y, player.x, player.y) : 9999;
    const ang = player ? angleBetween(this.x, this.y, player.x, player.y) : 0;

    let mx = 0, my = 0;
    if (this.spawnT <= 0 && player && !player.dead) {
      switch (this.ai) {
        case 'chase': { mx = Math.cos(ang); my = Math.sin(ang); break; }
        case 'flyer': { // bat-like erratic approach
          this.wobble += dt * 6;
          mx = Math.cos(ang) + Math.cos(this.wobble) * 0.5;
          my = Math.sin(ang) + Math.sin(this.wobble * 1.3) * 0.5;
          break;
        }
        case 'shooter': {
          const pref = this.attack?.range ?? 120;
          if (toP > pref + 16) { mx = Math.cos(ang); my = Math.sin(ang); }
          else if (toP < pref - 30 && !this.boss) { mx = -Math.cos(ang); my = -Math.sin(ang); }
          else { mx = Math.cos(ang + Math.PI / 2) * 0.6; my = Math.sin(ang + Math.PI / 2) * 0.6; } // bosses hold ground & strafe
          this.attackCd -= dt;
          if (this.attackCd <= 0 && toP < pref + 40 && world.lineClear(this.x, this.y, player.x, player.y)) {
            this.attackCd = (this.attack?.cooldown ?? 1.6) / ((this.boss ? this.enrage : 1) * (world.enemyTempo || 1));
            const burst = (this.attack?.burst ?? 1) + (this.boss ? this.phase : 0);
            for (let i = 0; i < burst; i++) {
              const spread = (this.attack?.spread ?? 0) * (i - (burst - 1) / 2);
              this.shoot(world, ang + spread);
            }
          }
          break;
        }
        case 'charger': {
          this.attackCd -= dt;
          if (this.charging) {
            this.stateT -= dt;
            mx = this.dashVX; my = this.dashVY;
            if (this.stateT <= 0) { this.charging = false; this.attackCd = (this.attack?.cooldown ?? 2.2) / ((this.boss ? this.enrage : 1) * (world.enemyTempo || 1)); }
          } else if (this.attackCd <= 0 && toP < (this.attack?.range ?? 140)) {
            // telegraph then dash
            this.charging = true; this.stateT = 0.4;
            this.dashVX = Math.cos(ang) * 3.2; this.dashVY = Math.sin(ang) * 3.2;
            world.particles.ring(this.x, this.y, this.tint || P.redL, 10, 60);
          } else {
            mx = Math.cos(ang) * 0.5; my = Math.sin(ang) * 0.5;
          }
          break;
        }
        case 'wander': {
          this.wobble += dt;
          mx = Math.cos(this.wobble * 0.7); my = Math.sin(this.wobble * 1.1);
          if (toP < 90) { mx = Math.cos(ang); my = Math.sin(ang); }
          break;
        }
        default: { mx = Math.cos(ang); my = Math.sin(ang); }
      }
    }

    // obstacle avoidance: if a wall lies just ahead of the desired heading, steer
    // around it instead of grinding into it (fixes melee enemies sticking on walls).
    if (this.spawnT <= 0 && !this.charging && (mx !== 0 || my !== 0)) {
      const probe = this.radius + 9;
      if (world.solidAt(this.x + mx * probe, this.y + my * probe)) {
        const baseA = Math.atan2(my, mx);
        for (const off of [0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.7]) {
          const a = baseA + off, nx = Math.cos(a), ny = Math.sin(a);
          if (!world.solidAt(this.x + nx * probe, this.y + ny * probe)) { mx = nx; my = ny; break; }
        }
      }
    }

    // separation from nearby enemies (cheap anti-stacking)
    let sx = 0, sy = 0;
    const list = world.enemies;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (o === this || o.dead) continue;
      const d2 = dist2(this.x, this.y, o.x, o.y);
      const rr = this.radius + o.radius;
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2);
        sx += (this.x - o.x) / d; sy += (this.y - o.y) / d;
      }
    }

    const n = normalize(mx, my);
    const accel = this.charging ? 1 : 1;
    this.vx += (n.x * this.speed * accel + sx * 22) * dt * 6;
    this.vy += (n.y * this.speed * accel + sy * 22) * dt * 6;
    // friction / clamp to speed (unless dashing)
    const maxV = this.charging ? this.speed * 3.4 : this.speed;
    const sp = Math.hypot(this.vx, this.vy);
    const drag = Math.pow(0.0001, dt);
    this.vx *= drag; this.vy *= drag;
    if (sp > maxV) { /* knockback can exceed; let drag handle it */ }

    if (Math.abs(this.vx) > 2) this.facing = this.vx < 0 ? -1 : 1;
    world.moveActor(this, this.vx * dt, this.vy * dt);

    // contact damage
    if (this.spawnT <= 0 && player && !player.dead && this.touchCd <= 0) {
      if (toP < this.radius * this.scale * 0.7 + player.radius) {
        player.takeDamage(this.damage, ang, world);
        this.touchCd = 0.55;
        this.vx -= Math.cos(ang) * 40; this.vy -= Math.sin(ang) * 40; // small recoil
      }
    }
  }

  draw() {
    const sp = getSprite(this.sprite);
    const sc = this.scale;
    drawShadow(this.x, this.y, this.radius * 0.9 * sc);
    if (this.spawnT > 0) {
      const a = 1 - this.spawnT / 0.28;
      drawSprite(frameAt(sp, this.t), this.x, this.y, { ax: sp.ax, ay: sp.ay, flipX: this.facing > 0, alpha: a, scale: sc, squash: { x: 1, y: a } });
      return;
    }
    if (this.tint && !this.flash) glowWorld(this.x, this.y - this.radius * sc * 0.4, this.radius * 1.6 * sc, this.tint, this.elite ? 0.32 : 0.18);
    const opts = { ax: sp.ax, ay: sp.ay, flipX: this.facing > 0, scale: sc };
    if (this.flash > 0) { opts.tint = '#ffffff'; opts.tintAmt = 0.9; }
    else if (this.tint) { opts.tint = this.tint; opts.tintAmt = 0.22; }
    if (this.charging) { opts.tint = '#ffffff'; opts.tintAmt = 0.4 + Math.sin(this.t * 40) * 0.3; }
    drawSprite(frameAt(sp, this.t), this.x, this.y, opts);
  }
}
