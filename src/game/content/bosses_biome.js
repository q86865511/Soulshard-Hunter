// R18/B3 — dedicated multi-phase FINAL BOSSES for the 5 R9-added biomes
// (verdant / desert / swamp / abyss / celestial). Before R18 these biomes fell back
// to spawnFinalBoss()'s random pick; now each has a themed boss wired into run.js
// FINAL_BOSS. Hand-written content + co-located procedural art (NOT a gen/ file — see
// CLAUDE.md Gotchas: re-integration would clobber gen/).
//
// Mechanics notes:
// - boss:true → enemy.js runs the shared 3-phase system (66%/33% threshold radial
//   bursts + adds). weight:0 keeps them out of the normal swarm/mini-boss pool roll
//   (run.js convention). tier 4 (tier 5 is the Reaper's).
// - radialBurst() (enemy.js) hardcodes the 'bolt_enemy' sprite but tints it with the
//   boss's `tint`, so CHARGER bosses get themed-colored phase bursts for free; only
//   SHOOTER bosses need a custom attack.projSprite for their main fire.
// - hitStatus:{type,chance} flows to BOTH on-touch (chargers) and the fired projectile
//   (shooters) via enemy.js statusOnHit — no protocol change, scalars reach co-op guests.
// - balance baseline: g_plagueheart (hp 2200 / dmg 24 / scale 2.6).
import { Enemies } from './registry.js';
import { P } from '../../engine/palette.js';
import { defineAnim, defineSprite } from '../../engine/sprites.js';
import { defineIcon } from '../../art/icons.js';

// ===========================================================================
// ART  (bodies · projectiles · icons)  — drawn by the R18-B3 Fable workflow,
// adversarially verified. Placeholder bodies below until the workflow art lands.
// ===========================================================================
// __B3_ART_START__
// projectile sprites (shooter bosses)
defineSprite('b3_sandbolt', 9, 9, (p) => {
  p.glow(4, 4, 3, P.gold);
  p.circle(4, 4, 3, P.sandD);
  p.circle(4, 4, 2, P.sand);
  p.px(3, 4, P.goldL); p.px(4, 3, P.goldL); p.px(5, 5, P.gold);
  p.px(4, 4, P.white);
  p.px(2, 1, P.gold); p.px(1, 2, P.sandL);
  p.px(6, 7, P.gold); p.px(7, 6, P.sandL);
  p.outline(P.ink);
}, { anchor: [4.5, 4.5] });
defineSprite('b3_bogspit', 9, 9, (p) => {
  p.glow(4,4,4,P.toxic);
  p.ellipse(4,4,3.4,3.2,P.poisonD);
  p.ellipse(4,4,2.5,2.3,P.slimeBog);
  p.ellipse(3,3,1.3,1.1,P.toxic);
  p.px(3,3,P.white);
  p.px(7,7,P.slimeBog); p.px(1,6,P.toxic);
  p.outline(P.ink);
}, { anchor:[4.5, 4.5] });
defineSprite('b3_holyfeather', 8, 10, (p) => {
  p.ellipse(4, 4, 2.4, 3.6, P.holy);
  p.ellipse(4, 3, 1.6, 2.6, P.white);
  p.vline(0, 8, 4, P.goldL);
  p.px(4, 9, P.gold);
  p.px(2, 2, P.holyL); p.px(6, 3, P.holyL);
  p.px(2, 5, P.holy); p.px(6, 6, P.holy);
  p.px(4, 0, P.white);
  p.outline(P.ink);
}, { anchor: [4, 5] });

// boss bodies
defineAnim('b3_thornking', 38, 40, 4, (p, f) => {
  const oy=(f===2)?1:0; const swL=(f===1)?1:0; const swR=(f===3)?1:0; const pulse=(f%2===0);
  p.ellipse(19,38,12,1,P.shadow);
  for(let i=0;i<5;i++){
    const rx=7+i*6; const s=(i+f)%2;
    p.vline(30,38,rx+s,P.barkD);
    p.vline(33,38,rx+s+1,P.bark);
    p.px(rx+s,38,P.woodL);
  }
  p.rect(13,26+oy,12,8,P.barkD);
  p.rect(15,26+oy,5,8,P.bark);
  p.vline(28+oy,33,19,P.woodD);
  p.rect(3,15+oy+swL,5,9,P.barkD);
  p.rect(4,16+oy+swL,3,7,P.bark);
  p.line(4,24+oy+swL,2,30+oy+swL,P.woodD);
  p.line(5,24+oy+swL,5,31+oy+swL,P.woodD);
  p.line(6,24+oy+swL,8,30+oy+swL,P.woodD);
  p.px(2,30+oy+swL,P.woodL); p.px(5,31+oy+swL,P.woodL); p.px(8,30+oy+swL,P.woodL);
  p.rect(30,15+oy+swR,5,9,P.barkD);
  p.rect(31,16+oy+swR,3,7,P.bark);
  p.line(33,24+oy+swR,35,30+oy+swR,P.woodD);
  p.line(32,24+oy+swR,32,31+oy+swR,P.woodD);
  p.line(31,24+oy+swR,29,30+oy+swR,P.woodD);
  p.px(35,30+oy+swR,P.woodL); p.px(32,31+oy+swR,P.woodL); p.px(29,30+oy+swR,P.woodL);
  p.px(3,17+oy+swL,P.leaf); p.px(6,19+oy+swL,P.leafD); p.px(4,21+oy+swL,P.leaf); p.px(7,23+oy+swL,P.leafD);
  p.px(34,17+oy+swR,P.leaf); p.px(31,19+oy+swR,P.leafD); p.px(33,21+oy+swR,P.leaf); p.px(30,23+oy+swR,P.leafD);
  p.ellipse(19,20+oy,11,10,P.barkD);
  p.ellipse(19,20+oy,9.5,8.5,P.bark);
  p.ellipse(16,17+oy,5.5,5,P.wood);
  p.px(14,14+oy,P.woodL); p.px(15,15+oy,P.woodL);
  p.vline(18+oy,26+oy,15,P.barkD);
  p.vline(16+oy,24+oy,23,P.barkD);
  p.ring(24,23+oy,1,P.woodD);
  p.px(12,24+oy,P.leafD); p.px(15,23+oy,P.leaf); p.px(18,22+oy,P.leafD); p.px(21,20+oy,P.leaf); p.px(24,18+oy,P.leafD); p.px(22,19+oy,P.leafL);
  p.vline(17+oy,22+oy,19,P.goldD);
  p.px(19,18+oy,P.goldL); p.px(18,19+oy,P.gold); p.px(20,17+oy,P.gold);
  if(pulse){ p.glow(19,19+oy,3,P.gold); p.sparkle(19,18+oy,P.goldL); }
  p.ellipse(9,13+oy,4.5,3.5,P.leafD);
  p.ellipse(29,13+oy,4.5,3.5,P.leafD);
  p.ellipse(9,12+oy,3.5,2.5,P.moss);
  p.ellipse(29,12+oy,3.5,2.5,P.moss);
  p.px(7,11+oy,P.leaf); p.px(10,11+oy,P.leafL); p.px(28,11+oy,P.leaf); p.px(31,11+oy,P.leafL);
  p.ellipse(19,8+oy,6,5,P.barkD);
  p.ellipse(19,8+oy,5,4,P.bark);
  p.ellipse(18,7+oy,3,2.5,P.wood);
  p.hline(15,17,6+oy,P.barkD); p.hline(21,23,6+oy,P.barkD);
  p.rect(15,7+oy,2,2,P.gold); p.rect(21,7+oy,2,2,P.gold);
  p.px(16,7+oy,P.goldL); p.px(22,7+oy,P.goldL);
  p.glow(16,8+oy,2,P.gold); p.glow(22,8+oy,2,P.gold);
  p.hline(17,21,11+oy,P.ink2); p.px(18,12+oy,P.ink2); p.px(20,12+oy,P.ink2);
  p.px(19,12+oy,P.gold); if(pulse){ p.px(19,13+oy,P.goldD); }
  p.rect(14,3+oy,11,2,P.woodD);
  p.hline(14,24,3+oy,P.wood);
  p.line(15,3+oy,13,0+oy,P.woodD);
  p.vline(0+oy,3+oy,19,P.wood);
  p.line(23,3+oy,25,0+oy,P.woodD);
  p.vline(1+oy,3+oy,16,P.woodD);
  p.vline(1+oy,3+oy,22,P.woodD);
  p.px(13,0+oy,P.goldL); p.px(19,0+oy,P.goldL); p.px(25,0+oy,P.goldL);
  p.px(13,4+oy,P.woodD); p.px(25,4+oy,P.woodD);
  p.px(17,3+oy,P.moss); p.px(21,4+oy,P.moss);
  p.rimLight(P.rim);
  p.outline(P.ink);
}, { anchor:[19, 39], fps:5 });
defineAnim('b3_sandpharaoh', 38, 40, 4, (p, f) => {
  const oy = [0, -1, 0, 1][f % 4];
  const eye = (f % 2) ? P.emberL : P.ember;
  const hot = (f % 2) ? P.white : P.emberL;
  // ground shadow
  p.ellipse(19, 38, 10, 1.5, P.sandD);
  // hanging tattered burial wraps (tops hidden behind the robe hem)
  const bots = [37, 35, 36, 35, 37];
  for (let i = 0; i < 5; i++) {
    const tx = 11 + i * 4 + ((i + f) % 2);
    p.vline(29, bots[i], tx, (i % 2) ? P.bone : P.sandD);
    p.px(tx, bots[i], P.sand);
  }
  // golden staff (planted, right side)
  p.vline(9, 35, 29, P.goldD);
  p.px(29, 12, P.goldL); p.px(29, 18, P.goldL); p.px(29, 26, P.goldL);
  p.glow(29, 7, 3, P.ember);
  p.circle(29, 7, 2, P.gold);
  p.px(28, 6, P.goldL); p.px(29, 7, hot);
  // lower robe (static, grounded)
  p.rect(11, 26, 16, 9, P.sandD);
  p.gradV(13, 26, 12, 8, P.bone, P.sand);
  p.hline(13, 24, 28, P.sandD);
  p.hline(13, 24, 31, P.sandD);
  // wrapped torso (hovers with oy)
  p.rect(12, 15 + oy, 14, 12, P.bone);
  p.vline(15 + oy, 26 + oy, 12, P.sandD);
  p.vline(15 + oy, 26 + oy, 25, P.sandD);
  p.hline(13, 24, 19 + oy, P.sand);
  p.hline(13, 24, 22 + oy, P.sand);
  p.px(15, 19 + oy, P.sandD); p.px(22, 22 + oy, P.sandD);
  // gold belt
  p.hline(12, 25, 25 + oy, P.gold);
  p.px(19, 25 + oy, P.goldL);
  // wrapped arms + gold bracers
  p.rect(10, 16 + oy, 2, 8, P.bone);
  p.vline(16 + oy, 23 + oy, 10, P.sandD);
  p.rect(10, 20 + oy, 2, 2, P.gold);
  p.rect(26, 16 + oy, 2, 8, P.bone);
  p.vline(16 + oy, 23 + oy, 27, P.sandD);
  p.rect(26, 20 + oy, 2, 2, P.gold);
  p.px(28, 22 + oy, P.bone); p.px(28, 23 + oy, P.sandD);
  // broad gold pectoral collar
  p.rect(13, 13 + oy, 13, 3, P.gold);
  p.hline(13, 25, 15 + oy, P.goldD);
  p.px(14, 13 + oy, P.goldL); p.px(24, 13 + oy, P.goldL);
  // burning ankh on the chest
  p.glow(19, 20 + oy, 4, P.ember);
  p.px(19, 17 + oy, P.gold);
  p.px(18, 18 + oy, P.gold); p.px(20, 18 + oy, P.gold);
  p.px(19, 18 + oy, hot);
  p.hline(16, 22, 19 + oy, P.gold);
  p.vline(20 + oy, 23 + oy, 19, P.gold);
  p.px(19, 20 + oy, P.goldL);
  // head: striped nemes headdress + mummified face
  p.rect(13, 3 + oy, 13, 4, P.gold);
  p.hline(13, 25, 4 + oy, P.goldD);
  p.hline(14, 24, 6 + oy, P.goldD);
  p.rect(16, 7 + oy, 7, 6, P.bone);
  p.rect(13, 7 + oy, 3, 7, P.gold);
  p.rect(23, 7 + oy, 3, 7, P.gold);
  p.hline(13, 15, 8 + oy, P.goldD); p.hline(23, 25, 8 + oy, P.goldD);
  p.hline(13, 15, 10 + oy, P.goldD); p.hline(23, 25, 10 + oy, P.goldD);
  p.hline(13, 15, 13 + oy, P.goldD); p.hline(23, 25, 13 + oy, P.goldD);
  // hollow burning eyes
  p.rect(16, 8 + oy, 2, 2, P.ink2);
  p.rect(21, 8 + oy, 2, 2, P.ink2);
  p.glow(17, 9 + oy, 2, P.ember); p.glow(21, 9 + oy, 2, P.ember);
  p.px(17, 9 + oy, eye); p.px(21, 9 + oy, eye);
  p.px(19, 10 + oy, P.sandD);
  p.hline(18, 20, 11 + oy, P.sandD);
  p.hline(16, 22, 12 + oy, P.sand);
  // uraeus serpent on the brow
  p.px(19, 3 + oy, P.ember);
  p.px(19, 2 + oy, eye);
  // golden false beard
  p.vline(13 + oy, 16 + oy, 19, P.goldD);
  p.px(19, 16 + oy, P.gold);
  // orbiting sand grains
  const a = f * Math.PI / 2;
  for (let k = 0; k < 3; k++) {
    const aa = a + k * 2.094;
    const sx = 19 + Math.round(13 * Math.cos(aa));
    const sy = 29 + Math.round(3 * Math.sin(aa));
    p.px(sx, sy, P.sand);
    p.px(sx, sy - 1, P.sandL);
  }
  p.sparkle(8, 17 + (f % 2) * 2, P.goldL);
  p.sparkle(33, 30 - (f % 2) * 2, P.sand);
  p.rimLight(P.goldL);
  p.outline(P.ink);
}, { anchor: [19, 39], fps: 6 });
defineAnim('b3_bogmaw', 40, 38, 4, (p, f) => {
  const oy=(f===2)?1:0; const sw=[0,1,2,1][f]; const dl=f%2;
  p.ellipse(20,36,16,1.8,P.murk);
  p.ellipse(20,36,12,1.2,P.poisonD);
  p.ellipse(6,27+oy,5,7,P.poisonD); p.ellipse(34,27+oy,5,7,P.poisonD);
  p.ellipse(6,26+oy,3.6,5.2,P.bog); p.ellipse(34,26+oy,3.6,5.2,P.bog);
  p.px(5,22+oy,P.bogL); p.px(33,22+oy,P.bogL);
  for(let i=0;i<3;i++){ p.vline(33,36,2+i*2,P.bog); p.px(2+i*2,36,P.bogL); p.vline(33,36,37-i*2,P.bog); p.px(37-i*2,36,P.bogL); }
  p.ellipse(20,21+oy,15,12,P.poisonD);
  p.ellipse(20,21+oy,13.5,10.5,P.bog);
  p.ellipse(17,17+oy,8.5,6.5,P.bogL);
  p.px(13,15+oy,P.moss); p.px(24,14+oy,P.moss); p.px(28,19+oy,P.moss); p.px(9,20+oy,P.moss); p.px(19,16+oy,P.moss); p.px(30,15+oy,P.moss); p.px(15,21+oy,P.moss);
  p.hline(8,32,24+oy,P.ink2);
  p.px(7,23+oy,P.ink2); p.px(33,23+oy,P.ink2);
  p.ellipse(20,30,9.5+sw,5.5,P.poisonD);
  p.ellipse(20,30,8.3+sw,4.5,P.bogL);
  p.ellipse(20,31,6.8+sw,3.2,P.slimeBog);
  p.ellipse(16,28,2.6,1.3,P.greenL);
  if(sw===2){ p.glow(20,30,6,P.toxic); }
  p.vline(25+oy,28+oy+dl*2,13,P.slimeBog); p.px(13,29+oy+dl*2,P.toxic);
  p.vline(25+oy,27+oy+(1-dl)*2,27,P.slimeBog); p.px(27,28+oy+(1-dl)*2,P.toxic);
  p.vline(24+oy,27+oy+dl,7,P.slimeBog); p.px(7,28+oy+dl,P.toxic);
  p.vline(24+oy,27+oy+(1-dl),33,P.slimeBog);
  p.rect(8,31+oy,3,5-oy,P.bog); p.vline(31+oy,35,8,P.poisonD);
  p.rect(29,31+oy,3,5-oy,P.bog); p.vline(31+oy,35,31,P.poisonD);
  p.hline(7,11,36,P.poisonD); p.hline(28,32,36,P.poisonD);
  p.px(7,36,P.toxic); p.px(32,36,P.toxic);
  const warts=[[8,15],[31,16],[14,12],[26,12],[5,22],[35,22],[20,11],[11,19],[29,20]];
  for(let i=0;i<warts.length;i++){ const wx=warts[i][0], wy=warts[i][1]+oy; const lit=((f+i)%4<2);
    p.ellipse(wx,wy,1.4,1.4,P.poisonD); p.px(wx,wy,lit?P.toxic:P.moss); if(lit){p.px(wx,wy-1,P.greenL);} }
  p.glow(11,10+oy,4,P.toxic); p.glow(29,10+oy,4,P.toxic);
  p.ellipse(11,10+oy,4.6,4.4,P.poisonD); p.ellipse(29,10+oy,4.6,4.4,P.poisonD);
  p.ellipse(11,10+oy,3.5,3.3,P.bog); p.ellipse(29,10+oy,3.5,3.3,P.bog);
  p.ellipse(11,10+oy,2.2,2.4,P.toxic); p.ellipse(29,10+oy,2.2,2.4,P.toxic);
  p.vline(8+oy,12+oy,11,P.ink2); p.vline(8+oy,12+oy,29,P.ink2);
  p.px(10,8+oy,P.white); p.px(28,8+oy,P.white);
  p.px(17,20+oy,P.ink2); p.px(23,20+oy,P.ink2);
  p.rimLight(P.greenL);
  p.outline(P.ink);
}, { anchor:[20,37], fps:5 });
defineAnim('b3_leviathan', 40, 40, 4, (p, f) => {
  const sway = [0, 1, 0, -1][f % 4]; const oy = (f === 2) ? 1 : 0; const bob = [0, -1, 0, -1][f % 4]; const gl = (f % 2) ? P.skyL : P.sky;
  p.ellipse(20, 38, 13, 1.5, P.abyss);
  p.ellipse(20, 31, 13, 5.5, P.oceanD);
  p.ellipse(20, 30, 11.5, 4.4, P.ocean);
  p.ellipse(16, 28, 6, 1.8, P.oceanL);
  for (let i = 0; i < 7; i++) { const cx = 8 + i * 4; p.ring(cx, 30, 2, P.oceanD); }
  p.ellipse(32, 28, 4, 3, P.oceanD); p.ellipse(32, 27, 3, 2, P.ocean);
  p.line(35, 26, 38, 22, P.coral); p.line(35, 27, 38, 25, P.coral); p.line(35, 28, 38, 28, P.coral);
  p.px(37, 24, P.ocean); p.px(37, 26, P.ocean);
  const nx = [22, 23, 23, 21, 20], ny = [26, 23, 20, 17, 14], nr = [5, 4.6, 4.2, 3.9, 3.6];
  for (let i = 0; i < 5; i++) {
    const k = nx[i] + Math.round(sway * i / 4), y = ny[i] + oy;
    p.ellipse(k, y, nr[i], 3.2, P.oceanD);
    p.ellipse(k - 1, y, nr[i] - 1.4, 2.1, P.ocean);
    p.px(k - 2, y - 2, P.oceanL);
    p.px(k + nr[i] - 1, y - 2, P.coral); p.px(k + nr[i], y - 1, P.coral);
    p.vline(y - 1, y + 1, k - nr[i] + 1, P.bone);
    if ((f + i) % 3 !== 0) p.px(k + 1, y + 1, (f + i) % 2 ? P.skyL : P.sky);
  }
  p.ellipse(20, 35, 10, 3.8, P.oceanD);
  p.ellipse(20, 34, 8.5, 2.8, P.ocean);
  p.ellipse(20, 36, 7, 1.6, P.bone);
  for (let i = 0; i < 5; i++) p.vline(35, 37, 14 + i * 3, P.oceanD);
  p.hline(14, 26, 33, P.oceanL);
  const dots = [[10, 30], [15, 29], [25, 29], [30, 30], [14, 34], [26, 34]];
  for (let i = 0; i < dots.length; i++) { if ((f + i) % 3 < 2) p.px(dots[i][0], dots[i][1], (f + i) % 2 ? P.skyL : P.sky); }
  const hx = 20 + sway, hy = 11 + oy;
  p.line(hx - 7, hy, hx - 10, hy - 3, P.coral); p.line(hx - 7, hy + 1, hx - 10, hy + 1, P.coral); p.line(hx - 7, hy + 2, hx - 10, hy + 4, P.coral);
  p.px(hx - 9, hy - 1, P.ocean); p.px(hx - 9, hy + 2, P.ocean);
  p.line(hx + 7, hy, hx + 10, hy - 3, P.coral); p.line(hx + 7, hy + 1, hx + 10, hy + 1, P.coral); p.line(hx + 7, hy + 2, hx + 10, hy + 4, P.coral);
  p.px(hx + 9, hy - 1, P.ocean); p.px(hx + 9, hy + 2, P.ocean);
  p.ellipse(hx, hy + 7, 5.5, 2.2, P.oceanD); p.ellipse(hx, hy + 7, 4.3, 1.3, P.ocean);
  p.ellipse(hx, hy + 4, 4.6, 2.6, P.abyss);
  p.ellipse(hx, hy + 4, 2.8, 1.4, gl);
  p.px(hx, hy + 4, P.white);
  p.glow(hx, hy + 4, 3, P.sky);
  for (let t = -3; t <= 3; t += 2) { p.px(hx + t, hy + 6, P.bone); p.px(hx + t, hy + 5, P.white); }
  p.ellipse(hx, hy - 1, 6.5, 4, P.oceanD);
  p.ellipse(hx, hy - 2, 5.2, 2.9, P.ocean);
  p.ellipse(hx - 2, hy - 3, 2.6, 1.3, P.oceanL);
  p.hline(hx - 4, hx - 1, hy - 4, P.oceanL); p.hline(hx + 1, hx + 4, hy - 4, P.oceanL);
  p.px(hx - 1, hy + 1, P.oceanD); p.px(hx + 1, hy + 1, P.oceanD);
  for (let t = -4; t <= 4; t += 2) { p.px(hx + t, hy + 3, P.bone); p.px(hx + t, hy + 4, P.white); }
  p.px(hx - 4, hy - 1, P.skyL); p.px(hx - 3, hy - 1, P.white);
  p.px(hx + 3, hy - 1, P.white); p.px(hx + 4, hy - 1, P.skyL);
  p.glow(hx - 3, hy - 1, 2, P.sky); p.glow(hx + 3, hy - 1, 2, P.sky);
  p.line(hx - 1, hy - 5, hx - 4, hy - 7 + bob, P.ocean);
  p.circle(hx - 4, hy - 8 + bob, 1, gl); p.px(hx - 4, hy - 8 + bob, P.white);
  p.glow(hx - 4, hy - 8 + bob, 2, P.sky);
  if (f % 2) { p.star4(hx - 4, hy - 8 + bob, 2, P.skyL); p.sparkle(hx + 7, hy - 5, P.skyL); }
  else { p.sparkle(hx - 8, hy + 6, P.sky); }
  p.rimLight(P.rimCool);
  p.outline(P.ink);
}, { anchor: [20, 39], fps: 5 });
defineAnim('b3_seraphjudge', 40, 40, 4, (p, f) => {
  const oy = (f === 2) ? 1 : 0; const wf = [0, -1, 0, 1][f]; const fl = (f % 2) ? 1 : 0;
  p.ellipse(20, 38, 11, 1.4, P.astral);
  // === three tattered wing pairs (back layer) ===
  for (let s = -1; s <= 1; s += 2) {
    const ax = 20 + s * 5;
    // top pair — raised
    p.line(ax, 14 + oy, 20 + s * 16, 4 + wf, P.astralL);
    p.line(ax, 15 + oy, 20 + s * 17, 6 + wf, P.white);
    p.line(ax, 16 + oy, 20 + s * 16, 8 + wf, P.white);
    p.line(ax, 17 + oy, 20 + s * 14, 10 + wf, P.bone);
    p.px(20 + s * 18, 5 + wf, P.astralL); p.px(20 + s * 15, 9 + wf, P.bone);
    // mid pair — spread wide
    p.line(ax, 18 + oy, 20 + s * 18, 15 - wf, P.white);
    p.line(ax, 19 + oy, 20 + s * 19, 17 - wf, P.astralL);
    p.line(ax, 20 + oy, 20 + s * 16, 19 - wf, P.bone);
    p.px(20 + s * 17, 16 - wf, P.white);
    // low pair — drooping, ragged
    p.line(ax, 22 + oy, 20 + s * 13, 29 + wf, P.astralL);
    p.line(ax, 23 + oy, 20 + s * 11, 30 + wf, P.astral);
    p.px(20 + s * 14, 31 + wf, P.astralL); p.px(20 + s * 12, 32 + wf, P.astral);
  }
  // === broken halo (open lower-right, shedding shards) ===
  p.hline(16, 24, 2, P.goldL);
  p.px(15, 3, P.gold); p.px(25, 3, P.gold);
  p.px(14, 4, P.gold); p.px(26, 4, P.goldD);
  p.px(15, 5, P.goldD); p.px(16, 6, P.goldD);
  if (fl) { p.px(27, 6, P.goldL); p.sparkle(26, 5, P.holyL); } else { p.sparkle(14, 6, P.holyL); }
  // === helm + stern glowing visor ===
  p.rect(16, 7 + oy, 9, 6, P.gold);
  p.rect(16, 7 + oy, 9, 2, P.goldL);
  p.vline(7 + oy, 12 + oy, 20, P.goldD);
  p.px(17, 9 + oy, P.goldD); p.px(23, 9 + oy, P.goldD);
  p.hline(17, 23, 10 + oy, P.holy);
  p.px(18, 10 + oy, P.white); p.px(22, 10 + oy, P.white);
  p.px(16, 12 + oy, P.goldD); p.px(24, 12 + oy, P.goldD);
  // === gilded plate torso + pauldrons ===
  p.gradV(14, 13 + oy, 13, 9, P.goldL, P.goldD);
  p.rect(11, 13 + oy, 3, 4, P.gold); p.rect(27, 13 + oy, 3, 4, P.gold);
  p.hline(11, 13, 13 + oy, P.goldL); p.hline(27, 29, 13 + oy, P.goldL);
  p.px(11, 17 + oy, P.goldD); p.px(29, 17 + oy, P.goldD);
  // holy light bleeding through plate cracks
  p.vline(15 + oy, 18 + oy, 16, P.holy); p.px(15, 19 + oy, P.holyL);
  p.vline(17 + oy, 20 + oy, 24, P.holy); p.px(25, 16 + oy, P.holyL);
  p.star4(20, 17 + oy, 2, P.holyL, P.white);
  p.hline(15, 25, 22 + oy, P.goldD); p.px(20, 22 + oy, P.holyL);
  // === armored skirt + greaves ===
  p.gradV(15, 23 + oy, 11, 7, P.astralL, P.astral);
  p.vline(23 + oy, 29 + oy, 20, P.gold);
  p.vline(24 + oy, 27 + oy, 18, P.holy);
  p.vline(23 + oy, 28 + oy, 16, P.astral); p.vline(23 + oy, 28 + oy, 24, P.astral);
  p.rect(16, 30, 3, 7, P.goldD); p.rect(22, 30, 3, 7, P.goldD);
  p.px(17, 30, P.goldL); p.px(23, 30, P.goldL);
  p.hline(15, 18, 37, P.gold); p.hline(22, 25, 37, P.gold);
  p.rimLight(P.holyL);
  p.outline(P.ink);
}, { anchor: [20, 39], fps: 6 });

// boss icons
defineIcon('b3_thornking_icon', '#2a3a1c', (p)=>{
  p.rect(3,4,10,2,P.woodD);
  p.hline(3,12,4,P.wood);
  p.line(4,4,3,1,P.woodD); p.vline(1,4,8,P.wood); p.line(12,4,13,1,P.woodD);
  p.px(3,1,P.goldL); p.px(8,1,P.goldL); p.px(13,1,P.goldL);
  p.ellipse(8,9,5.5,5,P.barkD); p.ellipse(8,9,4.5,4,P.bark); p.ellipse(7,8,2.5,2,P.wood);
  p.px(3,6,P.moss); p.px(12,6,P.moss); p.px(4,5,P.leafD); p.px(11,5,P.leafD);
  p.hline(4,6,7,P.barkD); p.hline(9,11,7,P.barkD);
  p.rect(4,8,2,2,P.gold); p.rect(9,8,2,2,P.gold); p.px(5,8,P.goldL); p.px(10,8,P.goldL);
  p.glow(5,9,2,P.gold); p.glow(10,9,2,P.gold);
  p.hline(6,9,12,P.ink2); p.px(7,13,P.ink2);
  p.px(8,13,P.gold);
});
defineIcon('b3_sandpharaoh_icon', '#7a5a1e', (p) => {
  p.rect(2, 1, 12, 3, P.gold);
  p.hline(2, 13, 2, P.goldD);
  p.rect(2, 4, 3, 9, P.gold);
  p.rect(11, 4, 3, 9, P.gold);
  p.hline(2, 4, 6, P.goldD); p.hline(11, 13, 6, P.goldD);
  p.hline(2, 4, 9, P.goldD); p.hline(11, 13, 9, P.goldD);
  p.hline(2, 4, 12, P.goldD); p.hline(11, 13, 12, P.goldD);
  p.rect(5, 4, 6, 7, P.bone);
  p.hline(5, 10, 10, P.sand);
  p.rect(5, 5, 2, 2, P.ink2);
  p.rect(9, 5, 2, 2, P.ink2);
  p.glow(6, 6, 2, P.ember); p.glow(9, 6, 2, P.ember);
  p.px(6, 6, P.emberL); p.px(9, 6, P.emberL);
  p.hline(7, 8, 9, P.sandD);
  p.px(7, 3, P.emberL); p.px(8, 3, P.ember);
  p.rect(7, 11, 2, 3, P.goldD);
  p.px(7, 14, P.gold); p.px(8, 14, P.gold);
  p.hline(5, 10, 15, P.gold);
  p.px(7, 15, P.emberL);
  p.sparkle(14, 8, P.goldL);
});
defineIcon('b3_bogmaw_icon', '#2c3a1e', (p) => {
  p.ellipse(8,9,7.5,6.5,P.poisonD);
  p.ellipse(8,9,6.5,5.5,P.bog);
  p.ellipse(6,7,3.5,2.5,P.bogL);
  p.hline(2,14,10,P.ink2);
  p.px(1,9,P.ink2); p.px(15,9,P.ink2);
  p.ellipse(8,13,5.5,2.6,P.bogL);
  p.ellipse(8,13,4.2,1.8,P.slimeBog);
  p.px(8,2,P.toxic); p.px(2,7,P.toxic); p.px(14,7,P.toxic);
  p.glow(4,4,3,P.toxic); p.glow(12,4,3,P.toxic);
  p.ellipse(4,4,2.8,2.6,P.poisonD); p.ellipse(12,4,2.8,2.6,P.poisonD);
  p.ellipse(4,4,1.8,1.8,P.toxic); p.ellipse(12,4,1.8,1.8,P.toxic);
  p.px(4,4,P.ink2); p.px(12,4,P.ink2);
  p.px(3,3,P.white); p.px(11,3,P.white);
});
defineIcon('b3_leviathan_icon', '#0c2c40', (p) => {
  p.ellipse(8, 5, 6, 4, P.oceanD);
  p.ellipse(8, 4, 4.8, 3, P.ocean);
  p.ellipse(6, 3, 2.4, 1.2, P.oceanL);
  p.line(2, 5, 0, 3, P.coral); p.line(2, 7, 0, 7, P.coral);
  p.line(13, 5, 15, 3, P.coral); p.line(13, 7, 15, 7, P.coral);
  p.ellipse(8, 12, 5, 2.4, P.oceanD); p.ellipse(8, 12, 3.8, 1.4, P.ocean);
  p.ellipse(8, 9, 4, 2.2, P.abyss);
  p.ellipse(8, 9, 2.4, 1.1, P.skyL);
  p.px(8, 9, P.white);
  for (let t = -3; t <= 3; t += 2) { p.px(8 + t, 7, P.bone); p.px(8 + t, 8, P.white); }
  for (let t = -2; t <= 2; t += 2) { p.px(8 + t, 11, P.bone); p.px(8 + t, 10, P.white); }
  p.px(4, 4, P.skyL); p.px(5, 4, P.white); p.px(10, 4, P.white); p.px(11, 4, P.skyL);
  p.line(8, 1, 11, 0, P.ocean); p.px(12, 0, P.skyL); p.glow(12, 0, 1, P.sky);
});
defineIcon('b3_seraphjudge_icon', '#5a5a8a', (p) => {
  // wing hints
  p.line(1, 9, 4, 6, P.astralL); p.line(14, 9, 11, 6, P.astralL);
  p.line(0, 12, 3, 9, P.white); p.line(15, 12, 12, 9, P.white);
  // broken halo
  p.hline(5, 10, 1, P.goldL);
  p.px(4, 2, P.gold); p.px(11, 2, P.gold);
  p.px(3, 3, P.goldD); p.px(12, 3, P.goldD);
  p.px(4, 4, P.goldD);
  p.sparkle(13, 4, P.holyL);
  // gilded helm + stern glowing visor
  p.rect(4, 5, 8, 9, P.gold);
  p.rect(4, 5, 8, 2, P.goldL);
  p.vline(5, 13, 7, P.goldD);
  p.px(5, 8, P.goldD); p.px(10, 8, P.goldD);
  p.hline(5, 10, 9, P.holy);
  p.px(6, 9, P.white); p.px(9, 9, P.white);
  p.vline(11, 13, 5, P.holy);
  p.px(4, 13, P.goldD); p.px(11, 13, P.goldD);
});
// __B3_ART_END__

// ===========================================================================
// DEFS  (mechanics · balance — hand-authored, stable across art iterations)
// ===========================================================================

// verdant — 樹冠巨人，衝撞流 charger，接觸流血
Enemies.register({
  id: 'b3_thornking', name: '百木之王·荊棘攝政', sprite: 'b3_thornking', ai: 'charger',
  tier: 4, boss: true, weight: 0, hp: 2400, speed: 36, damage: 26, radius: 9,
  xp: 700, gold: 360, shard: 1, scale: 2.7, knockbackResist: 0.72,
  bloodColor: P.leafD, tint: P.leafL, hitStatus: { type: 'bleed', chance: 0.4 },
  attack: { range: 160, cooldown: 2.2 },
  desc: '盤根錯節的遠古樹王，自林深處鎖定獵物便拖著荊棘藤蔓全力衝撞，撞擊撕裂皮肉使其失血不止。',
});

// desert — 黃金死靈王 shooter，寬扇砂彈緩速，金幣偏高
Enemies.register({
  id: 'b3_sandpharaoh', name: '流沙法老·安卡之影', sprite: 'b3_sandpharaoh', ai: 'shooter',
  tier: 4, boss: true, weight: 0, hp: 2300, speed: 30, damage: 25, radius: 9,
  xp: 700, gold: 440, shard: 1, scale: 2.7, knockbackResist: 0.6,
  bloodColor: P.sandD, tint: P.gold, hitStatus: { type: 'slow', chance: 0.5 },
  attack: { range: 230, cooldown: 2.0, projSpeed: 120, projDamage: 15, projColor: P.sandL, projSprite: 'b3_sandbolt', projRadius: 4, projLife: 3.2, burst: 10, spread: 0.5 },
  desc: '自黃沙古墓甦醒的死靈法老，揮動安卡權杖便掀起寬幅流沙彈幕，吞沒的獵手步履為之凝滯。',
});

// swamp — 鼓脹毒蟾 shooter，高拋慢速毒涎
Enemies.register({
  id: 'b3_bogmaw', name: '腐沼之喉·巨蟾母', sprite: 'b3_bogmaw', ai: 'shooter',
  tier: 4, boss: true, weight: 0, hp: 2500, speed: 24, damage: 24, radius: 9,
  xp: 720, gold: 380, shard: 1, scale: 2.8, knockbackResist: 0.7,
  bloodColor: P.poisonD, tint: P.slimeBog, hitStatus: { type: 'poison', chance: 0.6 },
  attack: { range: 200, cooldown: 2.4, projSpeed: 72, projDamage: 14, projColor: P.toxic, projSprite: 'b3_bogspit', projRadius: 5, projLife: 5.0, burst: 8, spread: 0.42 },
  desc: '蟄伏腐沼深處的巨蟾母，鼓脹的咽囊一張一縮，朝天噴吐成片高拋毒涎，所過之處盡是劇毒淤泥。',
});

// abyss — 海溝巨蛇 charger，高速貫場衝鋒，極難擊退
Enemies.register({
  id: 'b3_leviathan', name: '深淵利維坦', sprite: 'b3_leviathan', ai: 'charger',
  tier: 4, boss: true, weight: 0, hp: 2700, speed: 44, damage: 30, radius: 9,
  xp: 760, gold: 400, shard: 1, scale: 2.8, knockbackResist: 0.85,
  bloodColor: P.oceanD, tint: P.oceanL, hitStatus: { type: 'slow', chance: 0.3 },
  attack: { range: 220, cooldown: 2.0 },
  desc: '潛伏萬丈海溝的遠古巨獸，自黑暗中加速貫穿整片戰場，沉重軀體幾乎無法撼動，所到之處掀起水壓激盪。',
});

// celestial — 三對殘翼墮天使 shooter，聖羽飛鏢機率暈眩
Enemies.register({
  id: 'b3_seraphjudge', name: '墮天審判·熾羽座天使', sprite: 'b3_seraphjudge', ai: 'shooter',
  tier: 4, boss: true, weight: 0, hp: 2600, speed: 38, damage: 27, radius: 9,
  xp: 740, gold: 400, shard: 1, scale: 2.7, knockbackResist: 0.65,
  bloodColor: P.astral, tint: P.holyL, hitStatus: { type: 'stun', chance: 0.25 },
  attack: { range: 240, cooldown: 1.8, projSpeed: 150, projDamage: 15, projColor: P.holyL, projSprite: 'b3_holyfeather', projRadius: 3, projLife: 2.6, burst: 12, spread: 0.5 },
  desc: '墜入凡塵的審判天使，三對殘翼鋪天蓋地，傾瀉成片熾白聖羽飛鏢，被擊中者在神光中一瞬失神。',
});
