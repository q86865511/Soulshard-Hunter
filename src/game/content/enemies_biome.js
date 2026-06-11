// R18/B4 — five new rank-and-file mobs, one per a thematically thin biome, so every
// biome's swarm reads distinct (paired with biome_tags.js affinity weighting). Enemy
// roster 48 -> 53. Hand-written content + co-located art (NOT a gen/ file).
import { Enemies } from './registry.js';
import { P } from '../../engine/palette.js';
import { defineAnim } from '../../engine/sprites.js';

// ===========================================================================
// ART
// ===========================================================================
// vr_thornling — 荊棘妖精: a darting spiky verdant pixie
defineAnim('vr_thornling', 13, 13, 4, (p, f) => {
  const oy = (f % 2) ? -1 : 0; const fl = (f === 1 || f === 3) ? 1 : 0;
  // gossamer wings
  p.ellipse(3, 6 + oy - fl, 2.4, 1.6, P.leafL); p.ellipse(10, 6 + oy - fl, 2.4, 1.6, P.leafL);
  // thorny round body
  p.ellipse(6.5, 7 + oy, 3.4, 3.4, P.leafD); p.ellipse(6.5, 7 + oy, 2.4, 2.4, P.leaf);
  // spikes
  p.line(6.5, 3.5 + oy, 6.5, 1 + oy, P.leafD); p.line(3.5, 6 + oy, 1, 5 + oy, P.leafD); p.line(9.5, 6 + oy, 12, 5 + oy, P.leafD);
  p.line(5, 10 + oy, 4, 12 + oy, P.leafD); p.line(8, 10 + oy, 9, 12 + oy, P.leafD);
  // glowing eye
  p.px(6, 6 + oy, P.toxic); p.px(7, 6 + oy, P.toxic); p.px(6, 6 + oy, P.white);
  p.outline(P.ink);
}, { anchor: [6.5, 11], fps: 8 });

// ds_duneburrower — 沙行掘者: a clawed sand-mole that rushes
defineAnim('ds_duneburrower', 16, 12, 4, (p, f) => {
  const dig = (f === 1 || f === 3) ? 1 : 0;
  p.ellipse(8, 10, 7, 1.5, P.sandD);                       // sand spray
  // segmented body half-buried
  p.ellipse(8, 8 - dig, 6, 3.6, P.dune); p.ellipse(8, 8 - dig, 5, 2.8, P.sand);
  p.hline(4, 12, 8 - dig, P.sandD); p.hline(5, 11, 6 - dig, P.sandL);
  // snout + digging claws
  p.ellipse(3, 8 - dig, 2.2, 2, P.clay); p.px(2, 8 - dig, P.ink2);          // nose
  p.line(2, 9 - dig, 0, 11 - dig, P.bone); p.line(3, 9 - dig, 1, 11 - dig, P.bone);  // claws
  // beady eyes
  p.px(5, 7 - dig, P.redL); p.px(7, 7 - dig, P.redL);
  p.outline(P.ink);
}, { anchor: [8, 11], fps: 7 });

// sw_mireleech — 沼澤巨蛭: a segmented toxic leech
defineAnim('sw_mireleech', 16, 10, 4, (p, f) => {
  const w = (f % 2) ? 1 : 0;                               // undulation
  for (let i = 0; i < 5; i++) {
    const sx = 3 + i * 2.6; const sy = 6 + ((i % 2) ? w : -w) * 0.8;
    p.ellipse(sx, sy, 1.8, 2.2, (i % 2) ? P.bogL : P.slimeBog);
  }
  p.ellipse(13, 6 - w, 2.4, 2.6, P.murk);                  // bloated head
  p.ring(13, 6 - w, 1.4, P.toxic);                         // sucker mouth
  p.px(12, 5 - w, P.toxic); p.px(14, 5 - w, P.toxic);      // eye spots
  p.px(4, 4 + w, P.toxic);                                  // toxic sheen
  p.outline(P.ink);
}, { anchor: [8, 9], fps: 6 });

// ab_voltjelly — 深淵電水母: a glowing abyssal jellyfish
defineAnim('ab_voltjelly', 13, 16, 4, (p, f) => {
  const oy = (f === 2) ? 1 : 0; const spark = (f % 2);
  // bell dome
  p.ellipse(6.5, 6 + oy, 5, 4.5, P.oceanD); p.ellipse(6.5, 6 + oy, 4, 3.4, P.ocean);
  p.ellipse(6.5, 5 + oy, 2.6, 2, P.oceanL); p.hline(3, 10, 9 + oy, P.oceanD);
  // inner glow core
  p.ellipse(6.5, 6 + oy, 1.6, 1.6, P.skyL); p.px(6, 5 + oy, P.white);
  // trailing tendrils
  for (let i = 0; i < 4; i++) { const tx = 3 + i * 2.2; const sway = ((i + f) % 2) ? 1 : -1; p.line(tx, 9 + oy, tx + sway, 15, P.oceanL); p.px(tx + sway, 15, P.skyL); }
  // electric arc
  if (spark) { p.px(6, 2 + oy, P.white); p.line(5, 3 + oy, 8, 3 + oy, P.skyL); }
  p.outline(P.ink);
}, { anchor: [6.5, 13], fps: 6 });

// ce_cherubim — 雲端守靈: a haloed celestial sentinel that fires light
defineAnim('ce_cherubim', 14, 14, 4, (p, f) => {
  const oy = (f === 2) ? -1 : 0; const fl = (f === 1 || f === 3) ? 1 : 0; const sh = (f % 2);
  // feathered wings
  p.ellipse(3, 8 + oy - fl, 2.6, 3, P.white); p.ellipse(11, 8 + oy - fl, 2.6, 3, P.white);
  p.ellipse(3, 8 + oy - fl, 1.6, 2, P.holyL); p.ellipse(11, 8 + oy - fl, 1.6, 2, P.holyL);
  // radiant orb body
  p.ellipse(7, 8 + oy, 3.2, 3.2, P.gold); p.ellipse(7, 8 + oy, 2.2, 2.2, P.holyL); p.px(7, 8 + oy, P.white);
  // serene eye
  p.px(6, 7 + oy, P.astralL); p.px(8, 7 + oy, P.astralL);
  // floating halo
  p.ring(7, 3 + oy, 2.4, sh ? P.white : P.holyL); p.px(7, 1 + oy, P.gold);
  p.outline(P.ink);
}, { anchor: [7, 12], fps: 6 });

// ===========================================================================
// DEFS
// ===========================================================================
Enemies.register({
  id: 'vr_thornling', name: '荊棘妖精', sprite: 'vr_thornling', ai: 'flyer', tier: 1, weight: 8,
  hp: 16, speed: 64, damage: 7, radius: 5, xp: 4, gold: 2, bloodColor: P.leafD,
  desc: '翠林深處飛竄的小妖，速度極快、軌跡刁鑽，成群騷擾令人難以招架。',
});

Enemies.register({
  id: 'ds_duneburrower', name: '沙行掘者', sprite: 'ds_duneburrower', ai: 'charger', tier: 2, weight: 6,
  hp: 64, speed: 30, damage: 14, radius: 7, xp: 10, gold: 4, shard: 0.05, knockbackResist: 0.45, bloodColor: P.sandD,
  attack: { range: 150, cooldown: 2.1 },
  desc: '潛行沙下的掘地獸，鎖定獵物後破沙突進，揚起漫天黃沙。',
});

Enemies.register({
  id: 'sw_mireleech', name: '沼澤巨蛭', sprite: 'sw_mireleech', ai: 'chase', tier: 2, weight: 7,
  hp: 40, speed: 38, damage: 10, radius: 6, xp: 8, gold: 3, bloodColor: P.bogL,
  hitStatus: { type: 'poison', chance: 0.55 },
  desc: '腐沼中蠕行的巨蛭，吸附獵物注入劇毒，傷口潰爛不止。',
});

Enemies.register({
  id: 'ab_voltjelly', name: '深淵電水母', sprite: 'ab_voltjelly', ai: 'flyer', tier: 2, weight: 6,
  hp: 30, speed: 46, damage: 9, radius: 6, xp: 9, gold: 4, shard: 0.05, bloodColor: P.oceanD,
  hitStatus: { type: 'slow', chance: 0.5 },
  desc: '漂浮海溝的發光水母，觸鬚帶電，纏上便使人步履滯緩。',
});

Enemies.register({
  id: 'ce_cherubim', name: '雲端守靈', sprite: 'ce_cherubim', ai: 'shooter', tier: 1, weight: 7,
  hp: 20, speed: 32, damage: 6, radius: 6, xp: 6, gold: 2, shard: 0.04, bloodColor: P.astral,
  attack: { range: 150, cooldown: 1.8, projSpeed: 110, projDamage: 8, projColor: P.holyL, projSprite: 'bolt_enemy' },
  desc: '天界雲海的守護靈，保持距離放出熾白光彈。',
});
