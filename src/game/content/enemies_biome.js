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
defineAnim('vr_thornling', 16, 14, 4, (p, f) => {
  // R28 W3-A1: standard-tier 16x14 canvas (was 13x13); +1.5/+0.5px shift to
  // recentre the unchanged silhouette. Value-tier gap (no rimLight/shadeBottom) fixed.
  p.ctx.save(); p.ctx.translate(1.5, 0.5);
  const oy = (f % 2) ? -1 : 0; const fl = (f === 1 || f === 3) ? 1 : 0;
  // gossamer wings (R28 W3-A1: widened alongside the body to hold >=55% fill
  // on the larger standard-tier canvas)
  p.ellipse(3, 6 + oy - fl, 4, 3.2, P.leafL); p.ellipse(10, 6 + oy - fl, 4, 3.2, P.leafL);
  // thorny round body
  p.ellipse(6.5, 7 + oy, 6.2, 5, P.leafD); p.ellipse(6.5, 7 + oy, 5.2, 4, P.leaf);
  // spikes
  p.line(6.5, 3 + oy, 6.5, 0.5 + oy, P.leafD); p.line(3, 6 + oy, 0.5, 5 + oy, P.leafD); p.line(10, 6 + oy, 12.5, 5 + oy, P.leafD);
  p.line(5, 10.5 + oy, 4, 12.5 + oy, P.leafD); p.line(8, 10.5 + oy, 9, 12.5 + oy, P.leafD);
  // glowing eye
  p.px(6, 6 + oy, P.toxic); p.px(7, 6 + oy, P.toxic); p.px(6, 6 + oy, P.white);
  p.ctx.restore();
  p.rimLight(P.rimCool, 0.4);
  p.shadeBottom(0.2, 9);
  p.outline(P.ink);
}, { anchor: [8, 11.5], fps: 8 });

// ds_duneburrower — 沙行掘者: a clawed sand-mole that rushes
defineAnim('ds_duneburrower', 16, 14, 4, (p, f) => {
  // R28 W3-A1: standard-tier 16x14 canvas (was 16x12); +1px y-shift to recentre.
  p.ctx.save(); p.ctx.translate(0, 1);
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
  p.ctx.restore();
  p.rimLight(P.rim, 0.4);
  p.shadeBottom(0.2, 10);
  p.outline(P.ink);
}, { anchor: [8, 12], fps: 7 });

// sw_mireleech — 沼澤巨蛭: a segmented toxic leech
defineAnim('sw_mireleech', 16, 14, 4, (p, f) => {
  // R28 W3-A1: standard-tier 16x14 canvas (was 16x10); +2px y-shift to recentre.
  p.ctx.save(); p.ctx.translate(0, 2);
  // R28 W3-A1: segments/head thickened (rx+ry) to hold >=55% fill and reach the
  // standard-tier 12-14px visible-height band on the taller canvas.
  const w = (f % 2) ? 1 : 0;                               // undulation
  for (let i = 0; i < 5; i++) {
    const sx = 3 + i * 2.6; const sy = 7 + ((i % 2) ? w : -w) * 1.2;
    p.ellipse(sx, sy, 2.1, 4.4, (i % 2) ? P.bogL : P.slimeBog);
  }
  p.ellipse(13, 7 - w, 2.8, 4.8, P.murk);                    // bloated head
  p.ring(13, 7 - w, 1.6, P.toxic);                         // sucker mouth
  p.px(12, 5 - w, P.toxic); p.px(14, 5 - w, P.toxic);      // eye spots
  p.px(4, 5 + w, P.toxic);                                  // toxic sheen
  p.ctx.restore();
  p.rimLight(P.rim, 0.4);
  p.shadeBottom(0.2, 10);
  p.outline(P.ink);
}, { anchor: [8, 11], fps: 6 });

// ab_voltjelly — 深淵電水母: a glowing abyssal jellyfish
defineAnim('ab_voltjelly', 16, 16, 4, (p, f) => {
  // R28 W3-A1: standard-tier 16x16 canvas (was 13x16); +1.5px x-shift to recentre.
  p.ctx.save(); p.ctx.translate(1.5, 0);
  // R28 W3-A1: dome widened + tendrils thickened to vlines (was thin diagonal
  // lines) to hold >=55% fill on the wider standard-tier canvas.
  const oy = (f === 2) ? 1 : 0; const spark = (f % 2);
  // bell dome
  p.ellipse(6.5, 6 + oy, 7, 5, P.oceanD); p.ellipse(6.5, 6 + oy, 6, 4, P.ocean);
  p.ellipse(6.5, 5 + oy, 3.2, 2.4, P.oceanL); p.hline(2, 11, 9 + oy, P.oceanD);
  // inner glow core
  p.ellipse(6.5, 6 + oy, 2, 2, P.skyL); p.px(6, 5 + oy, P.white);
  // trailing tendrils
  for (let i = 0; i < 4; i++) { const tx = 2 + i * 2.6; const sway = ((i + f) % 2) ? 1 : -1; p.vline(9 + oy, 13 + oy, tx, P.oceanL); p.vline(9 + oy, 12 + oy, tx + 1, P.ocean); p.px(tx + sway, 13 + oy, P.skyL); }
  // electric arc
  if (spark) { p.px(6, 2 + oy, P.white); p.line(5, 3 + oy, 8, 3 + oy, P.skyL); }
  p.ctx.restore();
  p.rimLight(P.rimCool, 0.4);
  p.shadeBottom(0.2, 11);
  p.outline(P.ink);
}, { anchor: [8, 13], fps: 6 });

// ce_cherubim — 雲端守靈: a haloed celestial sentinel that fires light
defineAnim('ce_cherubim', 16, 14, 4, (p, f) => {
  // R28 W3-A1: standard-tier 16x14 canvas (was 14x14); +1px x-shift to recentre.
  p.ctx.save(); p.ctx.translate(1, 0);
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
  p.ctx.restore();
  p.rimLight(P.rim, 0.4);
  p.shadeBottom(0.2, 9);
  p.outline(P.ink);
}, { anchor: [8, 12], fps: 6 });

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
