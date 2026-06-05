// ---------------------------------------------------------------------------
// Status-effect system (D6 / 原#18). Works on any actor that carries a `.status`
// map (player + enemies). Two families:
//   * damage-over-time : bleed / burn / poison  (tick hp down)
//   * control / debuff : slow (move speed) / stun / knockup (can't act)
// Durations and magnitudes live in BALANCE.STATUS; boss control is resisted.
// ---------------------------------------------------------------------------
import { BALANCE } from './balance.js';
import { P } from '../engine/palette.js';

export const STATUS_COLOR = { bleed: P.redL, burn: P.emberL, poison: P.toxic, slow: P.ice || P.manaL, stun: '#ffe066', knockup: '#ffe066' };
const CONTROL = { stun: 1, knockup: 1 };
const DOT = { bleed: 1, burn: 1, poison: 1 };

// Apply (or refresh, taking the longer remaining time) a status on a target.
export function applyStatus(target, type, world, opts = {}) {
  if (!target || target.dead) return;
  const def = BALANCE.STATUS[type]; if (!def) return;
  let dur = opts.dur ?? def.dur;
  if (target.boss && CONTROL[type]) dur *= BALANCE.BOSS_CONTROL_RESIST;   // bosses resist hard CC
  if (!target.status) target.status = {};
  const cur = target.status[type];
  const newDps = opts.dps ?? def.dps ?? 0;
  const newMult = opts.mult ?? def.mult ?? 1;
  target.status[type] = {
    t: Math.max(cur ? cur.t : 0, dur),
    dps: Math.max(cur ? cur.dps : 0, newDps),            // refresh to the STRONGER DoT ('可疊加' text) — never downgrade an active one
    mult: cur ? Math.min(cur.mult, newMult) : newMult,   // stronger slow = lower mult
    acc: cur ? cur.acc : 0,
  };
  if (type === 'knockup') target.hop = Math.max(target.hop || 0, Math.min(0.6, dur));
  if (world && world.particles && CONTROL[type])
    world.particles.text(target.x, target.y - (target.radius || 6) - 6, type === 'stun' ? '暈眩' : '擊飛', { color: STATUS_COLOR[type], size: 11, weight: '800' });
}

// Tick every active status. Returns { slowMult, controlled }. Applies DoT to hp.
export function tickStatus(target, dt, world) {
  let slowMult = 1, controlled = false;
  const st = target.status;
  if (st) {
    for (const k in st) {
      const e = st[k]; if (!e) continue;
      e.t -= dt;
      if (e.t <= 0) { delete st[k]; continue; }
      if (k === 'slow') slowMult *= e.mult;
      else if (CONTROL[k]) controlled = true;
      else if (DOT[k] && e.dps) {
        e.acc += e.dps * dt;
        if (e.acc >= 1) {
          const d = Math.floor(e.acc); e.acc -= d;
          if (world && typeof target.die !== 'function') world.attributeDamage('持續傷害', d);   // 原#16: DoT on enemies only
          else if (world && world.onPlayerHit) world.onPlayerHit(d);   // player DoT counts as a hit (flawless / no-hit accounting can't be faked)
          target.hp -= d;
          if (target.flash !== undefined) target.flash = Math.max(target.flash, 0.05);
          if (world && world.particles && Math.random() < 0.5)
            world.particles.text(target.x + (Math.random() - 0.5) * 6, target.y - (target.radius || 6) - 2, String(d), { color: STATUS_COLOR[k] || P.redL, size: 10, weight: '700' });
          if (target.hp <= 0) {
            target.hp = 0;
            if (typeof target.die === 'function') target.die(world);   // player
            else target.dead = true;                                    // enemy (world processes death)
          }
        }
      }
    }
  }
  if (target.hop > 0) target.hop -= dt;
  return { slowMult, controlled };
}

// True while the actor is hard-CC'd (used to gate input/AI).
export function isControlled(target) {
  const st = target.status; if (!st) return false;
  return !!((st.stun && st.stun.t > 0) || (st.knockup && st.knockup.t > 0));
}
