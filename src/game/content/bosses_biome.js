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
function _ph(id, w, h, c1, c2, c3) {
  defineAnim(id, w, h, 4, (p, f) => {
    const oy = (f === 2) ? -1 : 0;
    p.ellipse(w / 2, h - 4, w * 0.42, 3, P.shadow);
    p.ellipse(w / 2, h / 2 + oy, w * 0.38, h * 0.40, c1);
    p.ellipse(w / 2, h / 2 + oy, w * 0.30, h * 0.32, c2);
    p.ellipse(w / 2 - 3, h * 0.40 + oy, 1.8, 1.8, c3);
    p.ellipse(w / 2 + 3, h * 0.40 + oy, 1.8, 1.8, c3);
    p.outline(P.ink);
  }, { anchor: [w / 2, h - 1], fps: 5 });
  defineIcon(id + '_icon', '#222', (p) => { p.ellipse(8, 8, 5, 5, c1); p.ellipse(8, 8, 3, 3, c2); p.px(6, 7, c3); p.px(10, 7, c3); });
}
_ph('b3_thornking', 38, 40, P.leafD, P.leaf, P.gold);
_ph('b3_sandpharaoh', 38, 40, P.goldD, P.gold, P.emberL);
_ph('b3_bogmaw', 40, 38, P.slimeBog, P.bog, P.toxic);
_ph('b3_leviathan', 40, 40, P.oceanD, P.ocean, P.skyL);
_ph('b3_seraphjudge', 40, 40, P.gold, P.holyL, P.astralL);
defineSprite('b3_sandbolt', 9, 9, (p) => { p.ellipse(4.5, 4.5, 4, 4, P.goldD); p.ellipse(4.5, 4.5, 2.4, 2.4, P.sandL); p.px(4, 4, P.white); p.outline(P.ink); }, { anchor: [4.5, 4.5] });
defineSprite('b3_bogspit', 9, 9, (p) => { p.ellipse(4.5, 4.5, 4, 4, P.poisonD); p.ellipse(4.5, 4.5, 2.4, 2.4, P.toxic); p.px(4, 4, P.white); p.outline(P.ink); }, { anchor: [4.5, 4.5] });
defineSprite('b3_holyfeather', 8, 10, (p) => { p.line(4, 0, 4, 9, P.gold); p.ellipse(4, 5, 2, 4, P.holyL); p.px(4, 2, P.white); p.outline(P.ink); }, { anchor: [4, 5] });
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
