// 原#11 — special "disruptor" monsters that mess with the player's economy/HP, using
// the engine hooks added this round: enemy.steal {gold,xp} (grab-and-flee, dropped back
// on death) and def.deathBlast (detonates on death, hurting the player too).
import { Enemies, Items, Equipment, Abilities, Talents, Facilities, Weapons, Characters } from '../registry.js';
import { P, lighten, darken, mix, withAlpha } from '../../../engine/palette.js';
import { dist, dist2, rng, clamp, TAU } from '../../../engine/math.js';
import { Projectile } from '../../projectile.js';
import { glowWorld, fillCircleWorld, drawSprite, lineWorld } from '../../../engine/renderer.js';
import { getSprite, defineSprite, defineAnim, Painter } from '../../../engine/sprites.js';
import { defineIcon, panel, sym } from '../../../art/icons.js';
import { drawSlime, drawBat, drawWisp, drawBrute, drawHunter } from '../../../art/core.js';
import { Sfx } from '../../../engine/audio.js';

// 1) 金甲竊賊 (s2_goldbug) — GOLD THIEF. Scuttles in, snatches gold on contact, then
//    bolts for the edge. Kill it to get your coins back. Fast, fragile, gleaming.
Enemies.register({
  id: 's2_goldbug', name: '金甲竊賊', sprite: 's2_goldbug', ai: 'chase', tier: 1, weight: 7,
  hp: 16, speed: 70, damage: 4, radius: 6, xp: 6, gold: 8, shard: 0.03,
  bloodColor: P.gold, tint: P.goldL, knockbackResist: 0,
  steal: { gold: 35 },
  desc: '貪婪的金甲蟲，貼身搶走你的金幣後拔腿就跑——宰了牠把錢拿回來。',
});
defineAnim('s2_goldbug', 16, 13, 4, (p, f) => {
  const sc = [0, 1, 0, -1][f % 4]; const by = 8;
  p.rect(3, by + 3, 2, 2, P.goldD); p.rect(11, by + 3, 2, 2, P.goldD);   // legs
  p.ellipse(8, by, 5.4, 4, P.goldD); p.ellipse(8, by - 0.4, 4.4, 3.2, P.gold);
  p.ellipse(6.5, by - 1.6, 2, 1.2, P.goldL); p.vline(by - 3, by + 3, 8, P.goldD);   // carapace seam
  p.px(5, by - 1, P.white); p.px(11, by - 1, P.white);                   // greedy eyes
  p.line(5, by - 3, 3 + sc, by - 5, P.goldD); p.line(11, by - 3, 13 - sc, by - 5, P.goldD);   // antennae
  p.px(8, by, lighten(P.gold, 0.3));
  p.outline(P.ink);
}, { anchor: [8, 12], fps: 9 });

// 2) 噬識魅影 (s2_wraith) — XP THIEF. A drifting wraith that siphons your experience on
//    touch, then flees. Slower but tankier than the goldbug. Drops the XP back on death.
Enemies.register({
  id: 's2_wraith', name: '噬識魅影', sprite: 's2_wraith', ai: 'flyer', tier: 2, weight: 6,
  hp: 30, speed: 52, damage: 5, radius: 6, xp: 14, gold: 2, shard: 0.04,
  bloodColor: P.mana, tint: P.manaL, knockbackResist: 0.2,
  steal: { xp: 28 },
  desc: '飄忽的魅影，貼上來吸食你的經驗便遁走——擊殺可奪回失去的記憶。',
});
defineAnim('s2_wraith', 16, 16, 3, (p, f) => {
  const yb = [0, -1, 0][f % 3]; const cy = 7 + yb;
  for (let i = 0; i < 4; i++) { const tx = 4 + i * 3; p.vline(cy + 2, 13 + (i % 2), tx, withAlpha(P.manaL, 0.8)); }   // tattered tail
  p.ellipse(8, cy, 4, 4.4, P.purpleD); p.ellipse(8, cy - 0.4, 3, 3.4, P.purple);
  p.ellipse(7, cy - 1.6, 1.4, 1.2, P.purpleL);
  p.ellipse(8, cy, 2, 1.6, P.manaL); p.px(8, cy, P.white);                // glowing core
  p.px(6, cy - 2, P.manaL); p.px(10, cy - 2, P.manaL);
  p.outline(P.ink);
}, { anchor: [8, 13], fps: 5 });

// 3) 引爆魔偶 (s2_bombard) — DEATH BOMB. Trundles toward you and, on death, detonates a
//    wide blast that hurts YOU too — so don't kill it in your own face.
Enemies.register({
  id: 's2_bombard', name: '引爆魔偶', sprite: 's2_bombard', ai: 'chase', tier: 2, weight: 6,
  hp: 26, speed: 38, damage: 9, radius: 7, xp: 12, gold: 5, shard: 0.05,
  bloodColor: P.ember, tint: P.red, knockbackResist: 0.1,
  deathBlast: { r: 52, dmg: 40, color: P.ember },
  desc: '體內塞滿魂晶火藥的魔偶，死亡時引發大範圍爆炸——別在貼臉時擊殺。',
});
defineAnim('s2_bombard', 16, 15, 4, (p, f) => {
  const fuse = [0, 1, 2, 1][f % 4]; const by = 9;
  p.rect(4, by + 3, 3, 2, P.ink2); p.rect(9, by + 3, 3, 2, P.ink2);       // squat legs
  p.ellipse(8, by, 6, 5.4, P.ink2); p.ellipse(8, by - 0.4, 5, 4.4, P.gray1);
  p.ellipse(6, by - 2, 2.4, 1.6, P.gray3);                                 // sheen
  p.hline(2, 14, by + 1, P.redD); p.px(5, by + 1, P.red); p.px(8, by + 1, P.red); p.px(11, by + 1, P.red);
  p.px(6, by - 1, P.redL); p.px(10, by - 1, P.redL); p.px(6, by, P.white); p.px(10, by, P.white);
  p.rect(7, by - 6, 2, 2, P.woodD);                                        // fuse collar
  p.line(8, by - 6, 9 + fuse - 1, by - 9 - fuse, P.wood); p.px(9 + fuse - 1, by - 9 - fuse, P.emberL);
  if (fuse >= 1) p.px(10 + fuse - 1, by - 10 - fuse, P.white);
  p.outline(P.ink);
}, { anchor: [8, 14], fps: 9 });

// 4) 黑市掮客 (s2_brigand) — heavyweight GOLD THIEF. Tankier, steals a big purse, hits a
//    little harder. A priority target when it appears.
Enemies.register({
  id: 's2_brigand', name: '黑市掮客', sprite: 's2_brigand', ai: 'charger', tier: 3, weight: 4,
  hp: 60, speed: 46, damage: 10, radius: 7, xp: 20, gold: 14, shard: 0.08,
  bloodColor: P.leather, tint: P.bronze, knockbackResist: 0.25,
  steal: { gold: 90 }, attack: { range: 150, cooldown: 1.6 },
  desc: '老練的黑市掮客，瞅準空檔猛撲奪走一大袋金幣就閃——務必追殺回本。',
});
defineAnim('s2_brigand', 16, 17, 4, (p, f) => {
  const oy = (f === 1 || f === 3) ? -1 : 0; const by = 9 + oy;
  p.rect(4, 15 + oy, 3, 2, P.woodD); p.rect(9, 15 + oy, 3, 2, P.woodD);   // boots
  p.rect(4, by, 8, 6, darken(P.leather, 0.2)); p.rect(5, by, 6, 5, P.leather);   // cloaked torso
  p.hline(4, 11, by + 3, P.woodD); p.rect(6, by + 1, 4, 3, darken(P.bronze, 0.1));   // belt + purse
  p.ellipse(8, by - 3, 3, 3, darken(P.leather, 0.25)); p.rect(5, by - 4, 6, 2, P.leather);   // hood
  p.rect(6, by - 3, 4, 2, P.ink2); p.px(6, by - 3, P.emberL); p.px(9, by - 3, P.emberL);      // masked eyes
  p.line(11, by, 14, by - 3, P.steelL); p.px(14, by - 4, P.white);        // dagger
  p.outline(P.ink);
}, { anchor: [8, 16], fps: 9 });
