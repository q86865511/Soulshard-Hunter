// Dropped pickups: gold, soul-shards, hearts, xp orbs, and chests.
import { drawSprite, drawShadow } from '../engine/renderer.js';
import { getSprite, frameAt } from '../engine/sprites.js';
import { dist, easeOutCubic } from '../engine/math.js';
import { P } from '../engine/palette.js';

const SPRITE_BY_TYPE = { gold: 'coin', shard: 'shard', heart: 'heart', xp: 'xp', chest: 'chest', key: 'pickup_key' };

export class Pickup {
  constructor(o) {
    this.x = o.x; this.y = o.y;
    this.type = o.type;             // gold | shard | heart | xp | chest | item | equip
    this.value = o.value ?? 1;
    this.def = o.def ?? null;       // for item/equip pickups
    this.price = o.price ?? 0;      // for shop pedestals
    this.hidden = o.hidden ?? false; // secret: invisible until the player is close
    this.revealed = !this.hidden;
    this.locked = o.locked ?? false; // #8: a vault chest that needs a key (world.keys) to open
    this.sprite = o.sprite ?? (this.def && this.def.icon) ?? SPRITE_BY_TYPE[this.type] ?? 'coin';
    this.t = Math.random() * 6.28;
    this.age = 0;
    this.life = o.life ?? 30;       // despawn after a while (chests never)
    this.dead = false;
    this.magnet = false;
    this.solid = this.type === 'chest';
    this.opened = false;
    this.radius = this.type === 'chest' ? 7 : 4;
    // little spawn pop
    const a = o.angle ?? Math.random() * Math.PI * 2;
    const sp = o.pop ?? (this.type === 'chest' ? 0 : 40 + Math.random() * 40);
    this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
    this.z = 0; this.vz = this.type === 'chest' ? 0 : 30 + Math.random() * 20;
  }

  update(dt, world) {
    this.t += dt; this.age += dt;
    if (this.type !== 'chest' && this.age > this.life) { this.dead = true; return; }

    // pop physics settles quickly
    this.vx *= Math.pow(0.86, dt * 60); this.vy *= Math.pow(0.86, dt * 60);
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vz -= 120 * dt; this.z += this.vz * dt;
    if (this.z < 0) { this.z = 0; this.vz *= -0.4; }

    const player = world.nearestPlayer ? world.nearestPlayer(this.x, this.y) : world.player;   // co-op: magnet to / collected by the closest player
    if (!player || player.dead) return;
    if (this.type === 'chest') {
      const d = dist(this.x, this.y, player.x, player.y);
      if (this.hidden && !this.revealed && d < 46) {
        this.revealed = true;
        world.particles.ring(this.x, this.y, P.goldL, 18, 100);
        world.particles.text(this.x, this.y - 16, '發現隱藏寶箱！', { color: P.goldL, size: 13 });
      }
      if (this.revealed && !this.opened && d < player.radius + this.radius + 2) {
        if (this.locked && (world.keys | 0) <= 0) {   // #8: locked vault — needs a key
          if (this.t - (this._lockMsg || -9) > 1.2) { this._lockMsg = this.t; world.particles.text(this.x, this.y - 16, '🔒 需要鑰匙', { color: P.redL, size: 12 }); }
          return;
        }
        if (this.locked) { world.keys = (world.keys | 0) - 1; world.particles.text(this.x, this.y - 16, '🔑 開鎖！', { color: P.goldL, size: 13 }); }
        this.opened = true; this.dead = true;
        world.particles.ring(this.x, this.y, P.goldL, 16, 90);
        world.openChest(this.x, this.y - 4, this.value || 1);
      }
      return;
    }

    const d = dist(this.x, this.y, player.x, player.y);
    const range = (player.stats.pickupRange ?? 22) + (this.magnet ? 99999 : 0);
    if (d < range && this.age > 0.25) {
      const pull = this.magnet ? 320 : (220 - d * 2);
      const a = Math.atan2(player.y - this.y, player.x - this.x);
      this.x += Math.cos(a) * pull * dt;
      this.y += Math.sin(a) * pull * dt;
    }
    if (d < player.radius + 5) this.collect(world, player);
  }

  collect(world, collector = null) {
    if (this.dead) return;
    this.dead = true;
    const payload = (this.type === 'item' || this.type === 'equip') ? this.def : this.value;
    world.collect(this.type, payload, this.x, this.y, collector);
  }

  draw() {
    if (this.hidden && !this.revealed) return;   // secret stays invisible until found
    const sp = getSprite(this.sprite);
    const bob = Math.sin(this.t * 4) * 1.2;
    drawShadow(this.x, this.y, this.radius * 0.7, 0.28);
    const frame = frameAt(sp, this.t);
    drawSprite(frame, this.x, this.y - this.z - 1 + bob, { ax: sp.ax, ay: sp.ay });
  }
}
