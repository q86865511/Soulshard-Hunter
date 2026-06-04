// Weapon icons + projectile / fx sprites for the auto-fire weapon system.
import { defineSprite } from '../engine/sprites.js';
import { defineIcon, sym } from './icons.js';
import { P, lighten, darken } from '../engine/palette.js';

// ---- projectile orbs (recolours) -------------------------------------------
function orb(p, c, cl) { p.ellipse(4, 4, 2.6, 2.6, c); p.ellipse(4, 4, 1.5, 1.5, cl); p.px(4, 4, P.white); }
defineSprite('bolt_fire', 8, 8, (p) => orb(p, darken(P.ember, 0.2), P.emberL), { anchor: [4, 4] });
defineSprite('bolt_ice', 8, 8, (p) => orb(p, P.iceD, P.ice), { anchor: [4, 4] });
defineSprite('bolt_volt', 8, 8, (p) => orb(p, P.goldD, P.emberL), { anchor: [4, 4] });
defineSprite('bolt_void', 8, 8, (p) => orb(p, P.purpleD, P.purpleL), { anchor: [4, 4] });

// ---- orbiting blade fx -----------------------------------------------------
defineSprite('fx_blade', 8, 10, (p) => {
  for (let y = 0; y < 10; y++) { const w = y < 5 ? 0.6 + y * 0.5 : 0.6 + (9 - y) * 0.5; p.hline(4 - w, 3 + w, y, y < 4 ? P.shardL : P.shard); }
  p.vline(0, 9, 4, P.white);
  p.outline(P.ink);
}, { anchor: [4, 5] });

// ---- weapon icons ----------------------------------------------------------
defineIcon('weapon_w_soulbolt', P.shardD, (p) => { sym.shardSym(p, P.shard); p.line(2, 13, 13, 9, P.shardL); });
defineIcon('weapon_w_fan', '#5a3a1a', (p) => { for (let i = 0; i < 3; i++) { const x = 4 + i * 3; p.line(x, 12, x + 1, 4 - i, P.ember); p.px(x + 1, 3 - i, P.emberL); } });
defineIcon('weapon_w_orbit', P.shardD, (p) => { p.ring(8, 8, 5, P.shardL); p.ellipse(8, 3, 1.4, 2, P.white); p.ellipse(13, 9, 1.4, 2, P.shard); p.ellipse(4, 10, 1.4, 2, P.shard); });
defineIcon('weapon_w_aura', '#5a2a1a', (p) => { p.ring(8, 8, 5.5, withWarm(P.ember, 0.0)); p.ring(8, 8, 5.5, P.ember); p.ring(8, 8, 3.5, P.emberL); p.ellipse(8, 8, 1.6, 1.6, P.white); });
defineIcon('weapon_w_whip', P.shardD, (p) => { p.line(2, 12, 6, 9, P.shardL); p.line(6, 9, 9, 4, P.shardL); p.line(9, 4, 13, 3, P.white); p.px(13, 2, P.white); });
defineIcon('weapon_w_nova', P.purpleD, (p) => { p.ring(8, 8, 5.5, P.manaL); p.ring(8, 8, 3, P.mana); sym.star(p, P.white); });
defineIcon('weapon_w_homing', P.purpleD, (p) => { p.line(3, 12, 9, 5, P.purpleL); p.line(9, 5, 12, 4, P.manaL); p.line(12, 4, 10, 7, P.manaL); p.line(12, 4, 13, 8, P.manaL); p.px(3, 12, P.white); });
defineIcon('weapon_w_lightning', '#5a4a1a', (p) => sym.bolt(p, P.emberL));
defineIcon('weapon_w_soulstorm', P.shardD, (p) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.line(8, 8, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, i % 2 ? P.shard : P.shardL); } p.ellipse(8, 8, 2, 2, P.white); });
defineIcon('weapon_w_inferno', '#5a1a1a', (p) => { p.ring(8, 8, 6, P.red); p.ring(8, 8, 4.5, P.ember); p.ring(8, 8, 3, P.emberL); p.ellipse(8, 8, 1.6, 1.6, P.white); });

function withWarm(c) { return c; }

export const WEAPON_ART_READY = true;
