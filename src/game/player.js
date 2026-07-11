// The player actor. Walk-only control; weapons auto-target and fire themselves.
import { drawSprite, drawShadow, addShake, glowWorld } from '../engine/renderer.js';
import { getSprite, frameAt } from '../engine/sprites.js';
import { moveAxis, pressed } from '../engine/input.js';
import { normalize, clamp } from '../engine/math.js';

// Co-op: sanitise a networked move vector (clamp magnitude to 1 so a malicious/laggy
// client can't speed-hack by sending an oversized vector).
function clampAxis(mv) {
  if (!mv) return { x: 0, y: 0 };
  let x = +mv.x || 0, y = +mv.y || 0; const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y };
}
import { P } from '../engine/palette.js';
import { Sfx } from '../engine/audio.js';
import { Weapons } from './content/registry.js';
import { computeForgeMods } from './content/forge.js';
import { markSeen } from './content/codex.js';
import { BALANCE, weaponMaxLevel } from './balance.js';
import { tickStatus } from './status.js';
import { META } from './state.js';   // P1-2: 輔助模式敵人傷害倍率 + 傷害數字開關

export class Player {
  constructor(x, y, stats) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.radius = 5;
    this.stats = stats;
    this.hp = stats.maxHp;
    this.faceX = 1; this.faceY = 0;       // last movement direction (for directional weapons)
    this.dashCd = 0; this.dashT = 0; this.dashVX = 0; this.dashVY = 0;
    this.invuln = 0.6;
    this.t = 0; this.walkT = 0; this.moving = false;
    this.dead = false; this.regenAcc = 0; this.flash = 0;
    this.weapons = [];                     // [{def, level, t, st}]
    this.hooks = { update: [], fire: [], hit: [], kill: [], hurt: [] };
    this.extra = {};
    this.timedBuffs = []; this.shieldT = 0;
    this.status = {}; this.hop = 0;        // D6 status effects (slow / DoT / stun / knockup)
    this.run = null;
    this.spriteName = 'player';
  }

  get maxHp() { return this.stats.maxHp; }
  get facing() { return this.faceX < 0 ? -1 : 1; }

  // ---- weapons -------------------------------------------------------------
  hasWeapon(id) { return this.weapons.some((w) => w.def.id === id); }
  weaponLevel(id) { const w = this.weapons.find((x) => x.def.id === id); return w ? w.level : 0; }
  addWeapon(id, world) {
    const def = Weapons.get(id); if (!def) return;
    const existing = this.weapons.find((w) => w.def.id === id);
    if (existing) { this.levelWeapon(existing, world); return existing; }
    if (this.weapons.length >= 6) return null;
    const inst = { def, level: 1, t: 0, st: {}, forge: computeForgeMods(id) };   // 5-5: attach forge mods once
    this.weapons.push(inst);
    if (!this.netInput) markSeen('w', id);   // P1 內容圖鑑: local avatar only (host mustn't record a guest's discoveries)
    return inst;
  }
  levelWeapon(inst, world) {
    inst.level = Math.min(weaponMaxLevel(inst.def), inst.level + 1);
    this.checkEvolve(inst, world);
  }
  checkEvolve(inst, world) {
    const d = inst.def;
    if (!this.weapons.includes(inst)) return;          // already evolved/removed — no double-fire
    if (!d.evolveInto || inst.level < weaponMaxLevel(d)) return;
    const req = d.evolveReq;
    const hasReq = !req || (this.run && (this.run.abilityLevels[req] > 0));
    if (!hasReq) return;
    const evoDef = Weapons.get(d.evolveInto);
    if (!evoDef) return;   // evolution target missing — keep the base weapon rather than deleting it (would lose a slot for the rest of the run)
    // replace with evolved weapon
    if (this.run) (this.run.evolvedWeaponIds || (this.run.evolvedWeaponIds = new Set())).add(d.id);   // 10.1: don't re-offer the consumed base weapon as a "new weapon"
    this.weapons = this.weapons.filter((w) => w !== inst);
    this.weapons.push({ def: evoDef, level: 1, t: 0, st: {}, forge: inst.forge });   // inherit base weapon's forge mods
    if (!this.netInput) { markSeen('rec', d.id); markSeen('w', evoDef.id); }   // P1 內容圖鑑
    if (world) { world.particles.ring(this.x, this.y, P.goldL, 24, 140); world.particles.text(this.x, this.y - 20, '武器進化！', { color: P.goldL, size: 16, life: 1.2 }); Sfx.play('levelup'); }
  }
  // fusion (合成): instantly max + force-evolve a weapon. The "2-3 maxed weapons"
  // path consumes a sacrifice; the "1 maxed weapon + passive" path passes none.
  fuseWeapons(target, sacrifice, world) {
    if (!target || target === sacrifice) return;
    if (!this.weapons.includes(target)) return;
    if (sacrifice && this.weapons.includes(sacrifice)) this.weapons = this.weapons.filter((w) => w !== sacrifice);
    target.level = weaponMaxLevel(target.def);
    const d = target.def;
    if (d.evolveInto) {
      if (this.run) (this.run.evolvedWeaponIds || (this.run.evolvedWeaponIds = new Set())).add(d.id);   // 10.1: consumed base weapon stays out of the new-weapon pool
      this.weapons = this.weapons.filter((w) => w !== target);
      const evo = Weapons.get(d.evolveInto);
      this.weapons.push(evo ? { def: evo, level: 1, t: 0, st: {}, forge: target.forge } : target);   // inherit forge mods on fusion
      if (evo && !this.netInput) { markSeen('rec', d.id); markSeen('w', evo.id); }   // P1 內容圖鑑
    }
    if (world) { world.particles.ring(this.x, this.y, P.goldL, 28, 160); world.particles.text(this.x, this.y - 20, '武器融合！', { color: P.goldL, size: 16, life: 1.3 }); Sfx.play('levelup'); }
  }

  updateWeapons(dt, world) {
    const haste = (this.stats.fireRateMult || 1) * (world.playerTempo || 1);
    const s = this.stats;
    for (const inst of this.weapons) {
      world._curSrc = inst.def.name || inst.def.id;   // 原#16: attribute this weapon's damage
      // 5-5: apply this weapon's forge modifiers ONLY while it fires/updates, then restore
      const fm = inst.forge; let snap = null;
      if (fm) {
        snap = { dm: s.damageMult, cc: s.critChance, cm: s.critMult, pa: s.pierceAdd, ar: s.area };
        s.damageMult *= fm.dmgMul; s.critChance = Math.min(BALANCE.CRIT_CAP, s.critChance + fm.crit); s.critMult += fm.critMult; s.pierceAdd += fm.pierce; s.area *= fm.areaMul;
      }
      const eff = Math.min(BALANCE.FIRE_RATE_CAP, haste * (fm ? fm.haste : 1));
      inst.fmHaste = eff;   // expose the (capped) fire-rate factor so self-gating update-driven weapons (beams/auras/turrets) honour forge 疾速 too
      try {
        if (inst.def.update) inst.def.update(world, this, inst, dt);
        if (inst.def.cooldown) {
          inst.t -= dt;
          if (inst.t <= 0) { inst.def.fire(world, this, inst); inst.t = (inst.def.cooldown(inst.level) || 1) / eff; }
        }
      } catch (e) { /* a buggy weapon must never freeze the loop or strand forge buffs */ }
      finally {
        if (snap) { s.damageMult = snap.dm; s.critChance = snap.cc; s.critMult = snap.cm; s.pierceAdd = snap.pa; s.area = snap.ar; }
        world._curSrc = null;
      }
    }
  }

  heal(a) { this.hp = Math.min(this.stats.maxHp, this.hp + a * (this.healMult ?? 1)); }   // R18/B7 c_seal + B9 m_anemic scale healing
  addTimedBuff(dur, onStart, onEnd, color = '#fff') { try { onStart?.(this); } catch (e) { /* */ } this.timedBuffs.push({ t: dur, dur, onEnd, color }); }   // dur = initial duration (pickup-log countdown reads t/dur)

  // returns true only if the hit actually LANDED (so on-hit status riders respect
  // i-frames / dash / dodge instead of pinning the player with permanent slow+DoT)
  // `src` (optional): a short attribution tag for the damage source (e.g. 'contact:slime',
  // 'hazard:spikes', 'boss:leap_slam', 'proj:enemy'). Recorded as lastHitSrc + tallied on
  // run.dmgTakenBySrc (P1-3 承傷來源; feeds P1-4 coaching). Defaults to 'other'.
  takeDamage(dmg, ang, world, src = 'other') {
    if (this.dead || this.invuln > 0 || this.dashT > 0) return false;
    const dodge = Math.min(BALANCE.DODGE_CAP, (this.stats.dodge ?? 0) * BALANCE.DODGE_MULT);
    if (Math.random() < dodge) { world.particles.text(this.x, this.y - 14, '閃避', { color: P.shardL, size: 13 }); return false; }
    let d = Math.max(1, dmg - (this.stats.defense ?? 0) * BALANCE.DEFENSE_MULT);   // 原#12: defense toned down
    d = Math.max(1, Math.round(d * (1 - (this.stats.armorMult ?? 0))));
    const asDmg = (world && world.run && world.run.assistDmgMul) || 1;   // P1-2 輔助模式：敵人傷害
    if (asDmg !== 1) d = Math.max(1, Math.round(d * asDmg));
    this.lastHitSrc = src;   // P1-3: remember the killer for deathSrc + accumulate by source
    if (world && world.run) { const m = world.run.dmgTakenBySrc || (world.run.dmgTakenBySrc = {}); m[src] = (m[src] || 0) + d; }
    this.hp -= d; this.invuln = 0.7; this.flash = 0.18;
    this.vx -= Math.cos(ang) * 70; this.vy -= Math.sin(ang) * 70;
    world.particles.blood(this.x, this.y, ang + Math.PI, P.red);
    if (META.settings.dmgNums !== false) world.particles.text(this.x, this.y - 16, String(d), { color: P.redL, size: 14 });
    addShake(4); Sfx.play('hurt');
    world._curSrc = '被動技能';   // 原#16: attribute thorns-style retaliation damage
    for (const h of this.hooks.hurt) h(this, d, ang, world);
    world._curSrc = null;
    if (world.onPlayerHit) world.onPlayerHit(d);
    if (this.hp <= 0) { this.hp = 0; this.die(world); }
    return true;
  }

  die(world) {
    if (this.dead) return;
    this.dead = true;
    if (world && world.run) world.run.deathSrc = this.lastHitSrc || 'other';   // P1-3: attribute the fatal blow (DoT/AFK falls back to the last melee/'other')
    world.particles.death(this.x, this.y, P.shard);
    world.particles.ring(this.x, this.y, P.shardL, 18, 120);
    addShake(10); Sfx.play('death');
    if (world.onPlayerDeath) world.onPlayerDeath();
  }

  // input (optional): co-op feeds remote avatars { move:{x,y}, dash } from the network.
  // When omitted, the player reads the local keyboard (single-player + the host's own avatar).
  update(dt, world, input) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.shieldT > 0) this.shieldT -= dt;
    const { slowMult, controlled } = tickStatus(this, dt, world);   // D6
    if (this.dead) return;                                          // killed by a DoT

    const netDriven = input != null;
    let ax = netDriven ? clampAxis(input.move) : moveAxis();
    const dashHeld = netDriven ? !!input.dash : (pressed('dash'));
    if (controlled) ax = { x: 0, y: 0 };   // stunned / knocked up: rooted (weapons still auto-fire)
    this.moving = ax.x !== 0 || ax.y !== 0;
    if (this.moving) { this.faceX = ax.x || this.faceX; this.faceY = ax.y; if (ax.x === 0) this.faceY = ax.y; }

    const speed = this.stats.speed * slowMult;
    if (this.dashT > 0) {
      this.dashT -= dt; this.vx = this.dashVX; this.vy = this.dashVY;
      if (Math.random() < 0.8) world.particles.spawn({ x: this.x, y: this.y, life: 0.22, size: 3, color: P.shard, drag: 0.85, glow: true });
    } else {
      const tvx = ax.x * speed, tvy = ax.y * speed, acc = this.moving ? 26 : 20;
      this.vx += (tvx - this.vx) * Math.min(1, acc * dt);
      this.vy += (tvy - this.vy) * Math.min(1, acc * dt);
      if (this.moving) this.walkT += dt;
    }

    if (!controlled && dashHeld && this.dashCd <= 0) {
      let dx = ax.x, dy = ax.y;
      if (dx === 0 && dy === 0) { dx = this.faceX; dy = this.faceY; }
      const n = normalize(dx, dy);
      const ds = this.stats.speed * 3.6;
      this.dashVX = n.x * ds; this.dashVY = n.y * ds;
      this.dashT = 0.16; this.invuln = Math.max(this.invuln, 0.22);
      this.dashCd = this.stats.dashCd ?? 0.85;
      world.particles.ring(this.x, this.y, P.shardL, 10, 70); Sfx.play('dash');
    }

    world.moveActor(this, this.vx * dt, this.vy * dt);

    this.updateWeapons(dt, world);

    if ((this.stats.hpRegen ?? 0) > 0 && this.hp < this.stats.maxHp) {
      this.regenAcc += this.stats.hpRegen * BALANCE.REGEN_MULT * dt;   // 原#12: regen toned down
      if (this.regenAcc >= 1) { const n = Math.floor(this.regenAcc); this.heal(n); this.regenAcc -= n; }
    }
    for (let i = this.timedBuffs.length - 1; i >= 0; i--) { const b = this.timedBuffs[i]; b.t -= dt; if (b.t <= 0) { try { b.onEnd?.(this); } catch (e) { /* */ } this.timedBuffs.splice(i, 1); } }
    // anti-AFK (原#15): standing still past a grace period bleeds a little HP so you
    // can't idle-farm. Movement or dashing resets it; menus freeze the field (no drain).
    if (this.moving || this.dashT > 0) this.idleT = 0;
    else this.idleT = (this.idleT || 0) + dt;
    if (this.idleT > BALANCE.AFK_GRACE && world.time > 3) {
      this.afkAcc = (this.afkAcc || 0) + Math.max(BALANCE.AFK_DRAIN_MIN, this.stats.maxHp * BALANCE.AFK_DRAIN_FRAC) * dt;
      if (this.afkAcc >= 1) { const n = Math.floor(this.afkAcc); this.afkAcc -= n; this.hp -= n; if (world.onPlayerHit) world.onPlayerHit(n); if (Math.random() < 0.3) world.particles.text(this.x, this.y - 18, '怠惰', { color: P.toxic, size: 10 }); if (this.hp <= 0) { this.hp = 0; this.die(world); } }
    }
    world._curSrc = '被動技能';   // 原#16: attribute orbit/aura-style passive damage
    for (const h of this.hooks.update) h(this, dt, world);
    world._curSrc = null;
  }

  drawWeapons(world) { for (const inst of this.weapons) if (inst.def.draw) inst.def.draw(world, this, inst); }

  draw(world) {
    const sp = getSprite(this.spriteName || 'player');
    drawShadow(this.x, this.y, this.radius + 1.5);
    const frame = this.moving ? frameAt(sp, this.walkT, 0) : frameAt(sp, this.t * 0.4);
    const blink = this.invuln > 0 && Math.floor(this.t * 20) % 2 === 0 && this.dashT <= 0;
    const opts = { ax: sp.ax, ay: sp.ay, flipX: this.faceX < 0, alpha: blink ? 0.4 : 1, scale: 0.9 };
    if (this.flash > 0) { opts.tint = '#ff5a5a'; opts.tintAmt = 0.8; }
    if (this.dashT > 0) glowWorld(this.x, this.y - 6, 10, P.shard, 0.4);
    const hopY = this.hop > 0 ? -Math.sin(Math.min(1, this.hop / 0.6) * Math.PI) * 6 : 0;
    drawSprite(frame, this.x, this.y + hopY, opts);
    // status feedback (D6): slowed=ice aura, DoT=coloured aura
    if (this.status.slow) glowWorld(this.x, this.y - 5, this.radius + 5, P.ice, 0.3);
    else if (this.status.burn || this.status.poison || this.status.bleed) glowWorld(this.x, this.y - 5, this.radius + 5, this.status.burn ? P.emberL : this.status.poison ? P.toxic : P.redL, 0.28);
    if (this.shieldT > 0) glowWorld(this.x, this.y - 6, this.radius + 7, P.ice, 0.35 + Math.sin(this.t * 10) * 0.1);
    if (world) this.drawWeapons(world);
  }
}
