// Enemy actor with a few reusable AI behaviours driven by its definition.
import { drawSprite, drawShadow, glowWorld, addShake } from '../engine/renderer.js';
import { getSprite, frameAt } from '../engine/sprites.js';
import { dist, dist2, angleBetween, normalize, clamp, TAU } from '../engine/math.js';
import { P } from '../engine/palette.js';
import { Projectile } from './projectile.js';
import { Sfx } from '../engine/audio.js';
import { Enemies } from './content/registry.js';
import { BALANCE } from './balance.js';
import { applyStatus, tickStatus } from './status.js';
import { ENEMY_STATUS } from './content/status_tags.js';

export class Enemy {
  constructor(def, x, y, world, opts = {}) {
    this.def = def; this.id = def.id;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.elite = !!opts.elite;
    this.boss = !!def.boss;

    const hpScale = (opts.hpScale ?? 1) * (this.elite ? 3.2 : 1);
    const dmgScale = (opts.dmgScale ?? 1) * (this.elite ? 1.5 : 1);
    const gHp = this.boss ? BALANCE.BOSS_HP_MULT : BALANCE.ENEMY_HP_MULT;     // D1/E3 global buffs
    const gDmg = this.boss ? (def.dmgMult ?? BALANCE.BOSS_DMG_MULT) : BALANCE.ENEMY_DMG_MULT;   // a boss def can opt out of the global boss-dmg mult (e.g. reaper owns its own REAPER_DMG_* knobs)
    this.maxHp = Math.max(1, Math.round((def.hp ?? 20) * hpScale * gHp));
    this.hp = this.maxHp;
    this.speed = (def.speed ?? 30) * (opts.speedScale ?? 1) * (this.elite ? 0.85 : 1);
    this.damage = (def.damage ?? 8) * dmgScale * gDmg;
    this.radius = def.radius ?? 6;
    this.sprite = def.sprite;
    this.ai = def.ai ?? 'chase';
    this.tint = def.tint ?? (this.elite ? P.gold : null);
    this.knockResist = clamp(def.knockbackResist ?? 0, 0, 0.95) + (this.boss ? 0.5 : 0) + (this.elite ? 0.2 : 0);
    this.xp = def.xp ?? 3; this.gold = def.gold ?? 1; this.shard = def.shard ?? 0;
    this.attack = def.attack || null;
    this.steal = def.steal || null;                 // 原#11: thief — { gold?, xp? } stolen on contact
    this.stolenGold = 0; this.stolenXp = 0; this.fleeing = false;

    this.facing = -1; this.flash = 0; this.touchCd = 0; this.t = Math.random() * 6.28;
    this.attackCd = (this.attack?.cooldown ?? 1.4) * (0.5 + Math.random());
    this.stateT = 0; this.dashVX = 0; this.dashVY = 0; this.charging = false; this.wobble = Math.random() * 6.28;
    this.spawnT = 0.28;       // brief spawn-in invulnerable/fade
    this.status = {}; this.hop = 0;   // D6 status effects (slow/bleed/burn/poison/stun/knockup)
    this.hitStatus = ENEMY_STATUS[this.id] || def.hitStatus || null;   // status this enemy inflicts on the player
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
    if (pl) { const a = Math.atan2(pl.y - this.y, pl.x - this.x); pl.vx += Math.cos(a) * 170; pl.vy += Math.sin(a) * 170; applyStatus(pl, 'knockup', world); }   // E3 boss control
    const pool = Enemies.upTo(2).filter((d) => !d.boss);
    for (let i = 0; i < 2 + this.phase; i++) if (pool.length) {
      const def = pool[(Math.random() * pool.length) | 0]; const ang = Math.random() * TAU;
      world.spawnEnemy(def, this.x + Math.cos(ang) * 42, this.y + Math.sin(ang) * 42, { quiet: true, hpScale: 1.4 });
    }
    Sfx.play('boss');
  }

  hurt(dmg, kbx, kby, world, crit = false, src = null) {
    if (this.dead || this.spawnT > 0 || this.iframe > 0) return;
    this.hp -= dmg;
    world.attributeDamage(src || world._curSrc, dmg);   // 原#16: damage ranking
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
      radius: a.projRadius ?? 3, life: a.projLife ?? 3,
      statusOnHit: this.hitStatus || a.status || null,   // ranged status carriers (D6)
      ...override,
    }));
    world.particles.muzzle(this.x + Math.cos(ang) * 6, this.y + Math.sin(ang) * 6, ang, a.projColor ?? P.redL);
  }

  update(dt, world) {
    this.t += dt;
    if (this.spawnT > 0) { this.spawnT -= dt; }
    if (this.flash > 0) this.flash -= dt;
    if (this.touchCd > 0) this.touchCd -= dt;
    const { slowMult, controlled } = tickStatus(this, dt, world);   // D6
    if (this.dead) return;                                          // died to a DoT
    if (this.boss) {
      if (this.iframe > 0) this.iframe -= dt;
      if (this.phase < this.phaseThresh.length && this.hp / this.maxHp < this.phaseThresh[this.phase]) { this.phase++; this.phaseShift(world); }
    }
    const player = world.player;
    const toP = player ? dist(this.x, this.y, player.x, player.y) : 9999;
    const ang = player ? angleBetween(this.x, this.y, player.x, player.y) : 0;

    let mx = 0, my = 0;
    if (this.spawnT <= 0 && player && !player.dead && !controlled) {
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
            // D4: non-boss ranged enemies fire noticeably slower than before.
            this.attackCd = (this.attack?.cooldown ?? 1.6) * (this.boss ? 1 : BALANCE.RANGED_FIRE_MULT) / ((this.boss ? this.enrage : 1) * (world.enemyTempo || 1));
            // bosses mix patterns for variety (more radial spray as they enrage)
            if (this.boss && Math.random() < 0.28 + this.phase * 0.12) {
              this.radialBurst(world, 8 + this.phase * 4, this.attack?.projSpeed ?? 110);
            } else {
              const baseBurst = this.boss ? (this.attack?.burst ?? 1) : Math.min(BALANCE.MAX_ENEMY_BURST, this.attack?.burst ?? 1);   // D5 cap
              const burst = baseBurst + (this.boss ? this.phase : 0);
              for (let i = 0; i < burst; i++) {
                const spread = (this.attack?.spread ?? 0) * (i - (burst - 1) / 2);
                this.shoot(world, ang + spread);
              }
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

    // 原#11: a thief that has grabbed your loot turns tail and bolts for the edge
    if (this.fleeing && player && this.spawnT <= 0 && !controlled) { mx = Math.cos(ang + Math.PI); my = Math.sin(ang + Math.PI); }

    // obstacle avoidance / lightweight pathing (F1): when a wall lies ahead, pick the
    // SMALLEST course change that clears both a near and a farther probe (so the enemy
    // doesn't immediately re-collide). If fully boxed in, slide along the wall tangent.
    if (this.spawnT <= 0 && !this.charging && (mx !== 0 || my !== 0)) {
      const probe = this.radius + 11;
      if (world.solidAt(this.x + mx * probe, this.y + my * probe)) {
        const baseA = Math.atan2(my, mx);
        let bestA = null;
        for (let k = 1; k <= 8 && bestA === null; k++) {
          for (const sgn of [1, -1]) {
            const a = baseA + sgn * k * 0.39;   // ~22.5deg steps out to ~180deg
            const nx = Math.cos(a), ny = Math.sin(a);
            if (!world.solidAt(this.x + nx * probe, this.y + ny * probe) &&
                !world.solidAt(this.x + nx * probe * 1.8, this.y + ny * probe * 1.8)) { bestA = a; break; }
          }
        }
        if (bestA === null) bestA = baseA + Math.PI / 2;   // boxed: follow the wall
        mx = Math.cos(bestA); my = Math.sin(bestA);
      }
    }

    // separation from nearby enemies (anti-stacking) — grid broadphase (was O(n^2))
    let sx = 0, sy = 0;
    world.forEachNear(this.x, this.y, this.radius + 32, (o) => {
      if (o === this || o.dead) return;
      const d2 = dist2(this.x, this.y, o.x, o.y);
      const rr = this.radius + o.radius;
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2);
        sx += (this.x - o.x) / d; sy += (this.y - o.y) / d;
      }
    });

    const n = normalize(mx, my);
    const accel = this.charging ? 1 : 1;
    // D4: enemies move faster the longer the run goes (bosses pace themselves).
    const tmin = ((world.run && world.run.time) || world.time || 0) / 60;
    const sNow = this.speed * slowMult * (this.fleeing ? 1.7 : 1) * (this.boss ? 1 : 1 + Math.min(BALANCE.ENEMY_SPEEDUP_CAP, tmin * BALANCE.ENEMY_SPEEDUP_PER_MIN));
    this.vx += (n.x * sNow * accel + sx * 22) * dt * 6;
    this.vy += (n.y * sNow * accel + sy * 22) * dt * 6;
    // friction / clamp to speed (unless dashing)
    const maxV = this.charging ? sNow * 3.4 : sNow;
    const sp = Math.hypot(this.vx, this.vy);
    const drag = Math.pow(0.0001, dt);
    this.vx *= drag; this.vy *= drag;
    if (sp > maxV) { /* knockback can exceed; let drag handle it */ }

    if (Math.abs(this.vx) > 2) this.facing = this.vx < 0 ? -1 : 1;
    world.moveActor(this, this.vx * dt, this.vy * dt);

    // contact damage (a hard-CC'd enemy can't bite)
    if (this.spawnT <= 0 && player && !player.dead && this.touchCd <= 0 && !controlled) {
      if (toP < this.radius * this.scale * 0.7 + player.radius) {
        const landed = player.takeDamage(this.damage, ang, world);
        if (landed && this.hitStatus && Math.random() < (this.hitStatus.chance ?? 1)) applyStatus(player, this.hitStatus.type, world, this.hitStatus);   // D6: on-touch status (only on a real hit — respects i-frames/dash/dodge)
        if (this.steal && !this.fleeing) this.doSteal(world, player);   // 原#11: grab loot then bolt
        this.touchCd = 0.55;
        this.vx -= Math.cos(ang) * 40; this.vy -= Math.sin(ang) * 40; // small recoil
      }
    }
  }

  // 原#11: thief grabs gold/xp off the player on contact, then flips to flee AI.
  doSteal(world, player) {
    const run = world.run; if (!run) return;
    if (this.steal.gold && run.gold > 0) { const g = Math.min(run.gold, this.steal.gold); run.gold -= g; this.stolenGold += g; world.particles.text(player.x, player.y - 20, '-' + g + ' 金', { color: P.goldL, size: 12, weight: '800' }); }
    if (this.steal.xp && run.xp > 0) { const x = Math.min(run.xp, this.steal.xp); run.xp -= x; this.stolenXp += x; world.particles.text(player.x, player.y - 32, '-' + x + ' 經驗', { color: P.manaL, size: 12, weight: '800' }); }
    this.fleeing = true;
    world.particles.ring(this.x, this.y, P.goldL, 10, 70);
    Sfx.play('coin');
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
    // status feedback glow (D6): slow=ice, burn=ember, poison=toxic, bleed=red
    const sk = this.status.burn ? P.emberL : this.status.poison ? P.toxic : this.status.slow ? P.ice : this.status.bleed ? P.redL : null;
    if (sk) glowWorld(this.x, this.y - this.radius * sc * 0.3, this.radius * 1.5 * sc, sk, 0.3);
    const hopY = this.hop > 0 ? -Math.sin(Math.min(1, this.hop / 0.6) * Math.PI) * 7 : 0;
    const opts = { ax: sp.ax, ay: sp.ay, flipX: this.facing > 0, scale: sc };
    if (this.flash > 0) { opts.tint = '#ffffff'; opts.tintAmt = 0.9; }
    else if (this.tint) { opts.tint = this.tint; opts.tintAmt = 0.22; }
    if (this.charging) { opts.tint = '#ffffff'; opts.tintAmt = 0.4 + Math.sin(this.t * 40) * 0.3; }
    drawSprite(frameAt(sp, this.t), this.x, this.y + hopY, opts);
  }
}
