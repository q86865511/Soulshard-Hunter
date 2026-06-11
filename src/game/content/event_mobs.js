// R20/B5 — special-event mobs (hand-written, NOT workflow gen). These power the four
// new in-run harasser events in run.js (evBombers / evBombs / evBoulders / evGoblin).
// They are registered at tier 9 + weight 0 so they NEVER enter the normal spawn pools
// (rotateTypes / surround / boss-minion pools all select via Enemies.upTo(<=4)) — they
// only spawn explicitly from the event code. Implemented as plain enemy entities so
// co-op guests see them through the existing `en` snapshot channel (protocol unchanged).
import { Enemies } from './registry.js';
import { P, lighten, darken, mix, withAlpha } from '../../engine/palette.js';
import { defineAnim } from '../../engine/sprites.js';

// 1) 自爆狂徒 (evt_bomber) — kamikaze imp squad. Sprints at you and detonates on death
//    OR when its fuse (run.js evtFuse) runs out. The blast is set per-instance by the
//    event so it scales with difficulty (no def-level deathBlast here).
Enemies.register({
  id: 'evt_bomber', name: '自爆狂徒', sprite: 'evt_bomber', ai: 'chase', tier: 9, weight: 0,
  hp: 18, speed: 88, damage: 6, radius: 6, xp: 4, gold: 3, shard: 0.02,
  bloodColor: P.ember, tint: P.emberL, knockbackResist: 0,
  desc: '抱著魂晶炸藥狂奔的亡命之徒——在牠貼臉前放倒牠，或者跑得比引信快。',
});
defineAnim('evt_bomber', 16, 15, 4, (p, f) => {
  const run = [0, 1, 0, -1][f % 4]; const by = 9;
  p.rect(4 + run, by + 4, 2, 2, P.ink2); p.rect(10 - run, by + 4, 2, 2, P.ink2);   // sprinting legs
  p.ellipse(8, by, 5, 4.6, P.ink2); p.ellipse(8, by - 0.4, 4, 3.8, mix(P.gray1, P.ink2, 0.3));   // iron bomb body
  p.ellipse(6.4, by - 1.8, 1.8, 1.2, P.gray2);                              // sheen
  p.line(3, by - 1 - run, 1, by - 3, P.gray1); p.line(13, by - 1 + run, 15, by - 3, P.gray1);   // pumping arms
  p.px(5, by - 1, P.white); p.px(10, by - 1, P.white);                      // panicked wide eyes
  p.px(5, by, P.ink); p.px(10, by, P.ink);
  const crack = mix(P.ember, P.emberL, 0.5);                                // glowing powder cracks
  p.line(6, by + 2, 9, by + 3, crack); p.px(11, by + 1, crack);
  p.rect(7, by - 6, 2, 2, P.woodD);                                          // fuse collar
  const fl = [0, 1, 2, 1][f % 4];
  p.line(8, by - 6, 9 + fl, by - 8 - fl, P.wood);                            // whipping fuse
  p.px(9 + fl, by - 9 - fl, P.emberL); p.px(10 + fl, by - 9 - fl, P.white);  // spark
  p.glow(9 + fl, by - 9 - fl, 2, withAlpha(P.emberL, 0.5));
  p.outline(P.ink);
}, { anchor: [8, 14], fps: 10 });

// 2) 魂晶詭雷 (evt_bomb) — bomberman-grid mine. Stationary (speed 0); run.js handles
//    the fuse + CROSS-shaped shockwave. Shooting it detonates it early.
Enemies.register({
  id: 'evt_bomb', name: '魂晶詭雷', sprite: 'evt_bomb', ai: 'chase', tier: 9, weight: 0,
  hp: 30, speed: 0, damage: 0, radius: 7, xp: 3, gold: 2, shard: 0.02,
  bloodColor: P.laser, tint: P.laser, knockbackResist: 0.95,
  desc: '釘進地面的魂晶炸雷，倒數後朝四方噴出十字衝擊波——別站在直線上。',
});
defineAnim('evt_bomb', 14, 14, 3, (p, f) => {
  const pulse = [0, 1, 2][f % 3]; const cy = 9;
  p.ellipse(7, cy + 2, 5.4, 2.4, darken(P.ink2, 0.1));                      // base disc
  p.ellipse(7, cy + 1.6, 4.4, 1.8, P.ink2);
  // four rune studs hinting the cross arms
  p.px(1, cy + 1, P.laser); p.px(13, cy + 1, P.laser); p.px(7, cy + 4, P.laser); p.px(7, cy - 1, withAlpha(P.laser, 0.8));
  // crystal spike core
  const core = [mix(P.laser, P.ink2, 0.35), P.laser, lighten(P.laser, 0.25)][pulse];
  p.rect(5, cy - 3, 4, 5, darken(core, 0.25));                               // crystal base (tapered by the cap above)
  p.rect(6, cy - 6, 2, 4, core);
  p.vline(cy - 5, cy + 1, 7, lighten(core, 0.3));                            // bright seam
  p.px(7, cy - 7, lighten(core, 0.45));
  if (pulse === 2) { p.sparkle(7, cy - 6, '#ffffff'); p.glow(7, cy - 3, 3, withAlpha(P.laser, 0.4)); }
  p.outline(P.ink);
}, { anchor: [7, 13], fps: 4 });

// 3) 滾岩魔 (evt_boulder) — rolling crusher. Movement is integrated manually by run.js
//    (fixed lane trajectory, beam-telegraphed); contact damage + knockback come from the
//    normal enemy touch path. Tanky but killable for a loot reward.
Enemies.register({
  id: 'evt_boulder', name: '滾岩魔', sprite: 'evt_boulder', ai: 'chase', tier: 9, weight: 0,
  hp: 400, speed: 0, damage: 26, radius: 11, xp: 10, gold: 8, shard: 0.06,
  bloodColor: P.gray2, tint: null, knockbackResist: 0.95, scale: 1.4,
  desc: '被魂火喚醒的巨岩，沿直線輾過一切。打得碎，但你大概更想先閃開。',
});
defineAnim('evt_boulder', 18, 18, 4, (p, f) => {
  const cx = 9, cy = 9;
  p.ellipse(cx, cy, 7.5, 7.5, mix(P.gray1, P.gray2, 0.4));                  // boulder mass
  p.ellipse(cx - 2, cy - 3, 3, 2, P.gray2);                                  // top-light
  // rotating crack pattern — the highlight + cracks shift per frame to read as rolling
  const rot = f % 4;
  const cr = darken(P.gray1, 0.3), em = mix(P.ember, P.emberL, 0.4);
  if (rot === 0) { p.line(4, cy - 2, 9, cy + 1, cr); p.line(9, cy + 1, 13, cy - 1, cr); p.px(8, cy + 2, em); }
  if (rot === 1) { p.line(5, cy + 2, 10, cy - 2, cr); p.line(10, cy - 2, 13, cy + 2, cr); p.px(11, cy, em); }
  if (rot === 2) { p.line(4, cy + 1, 8, cy - 3, cr); p.line(8, cy - 3, 12, cy + 3, cr); p.px(7, cy - 2, em); }
  if (rot === 3) { p.line(6, cy + 3, 9, cy - 1, cr); p.line(9, cy - 1, 14, cy + 1, cr); p.px(10, cy - 3, em); }
  p.px(cx - 3 + rot, cy + 4, darken(P.gray1, 0.2));                          // tumbling pebble chips
  p.px(cx + 4 - rot, cy - 5, P.gray2);
  // furious ember eyes (fixed — the face glares forward while the body rolls)
  p.px(6, cy - 1, em); p.px(12, cy - 1, em);
  p.speckle(3, 3, 12, 12, withAlpha(P.gray3, 0.5), 5, 17 + f);
  p.outline(P.ink);
}, { anchor: [9, 16], fps: 8 });

// 4) 寶藏哥布林 (evt_goblin) — treasure goblin. Spawns fleeing (run.js sets e.fleeing)
//    and despawns after EVT_GOBLIN_LIFE; catch it for a gold shower + a guaranteed equip.
Enemies.register({
  id: 'evt_goblin', name: '寶藏哥布林', sprite: 'evt_goblin', ai: 'chase', tier: 9, weight: 0,
  hp: 90, speed: 86, damage: 3, radius: 6, xp: 15, gold: 150, shard: 0.5,
  bloodColor: P.green, tint: null, knockbackResist: 0.3,
  desc: '扛著鼓脹寶袋的哥布林，見人就跑。攔下牠，袋裡的一切都是你的。',
});
defineAnim('evt_goblin', 16, 17, 4, (p, f) => {
  const run = [0, 1, 0, -1][f % 4]; const by = 10;
  const skin = mix(P.green, P.leaf, 0.45), skinD = darken(skin, 0.2);
  p.rect(5 + run, by + 4, 2, 3, skinD); p.rect(9 - run, by + 4, 2, 3, skinD);   // scrambling legs
  p.rect(5, by, 6, 5, mix(P.leather, P.woodD, 0.4));                        // ragged tunic
  p.hline(5, 10, by + 2, P.woodD);
  p.ellipse(7, by - 3, 3, 2.6, skin);                                        // head
  p.px(4, by - 4, skin); p.px(10, by - 4, skin);                             // big pointy ears
  p.px(6, by - 3, P.white); p.px(8, by - 3, P.white);                        // greedy darting eyes
  p.px(6, by - 3, P.ink); p.px(8, by - 3, P.ink);
  p.px(7, by - 1, darken(skin, 0.3));                                        // grin
  // the oversized treasure sack over the shoulder — the star of the show
  const sx = 11, sy = by - 4 + (run === 0 ? 0 : -1);
  p.ellipse(sx, sy, 4, 4.4, P.leather); p.ellipse(sx, sy - 0.4, 3.2, 3.6, lighten(P.leather, 0.12));
  p.rect(sx - 1, sy - 5, 2, 2, P.woodD);                                     // knotted neck
  p.px(sx - 2, sy - 1, P.goldL); p.px(sx + 1, sy + 1, P.gold);               // bulging coin glints
  p.px(sx, sy - 2, lighten(P.goldL, 0.2));
  p.px(sx + 3, sy - 4, P.goldL); p.sparkle(sx + 3, sy - 5, '#fff7d0');       // a coin slips out
  p.glow(sx, sy, 3, withAlpha(P.goldL, 0.25));
  p.outline(P.ink);
}, { anchor: [8, 16], fps: 10 });
