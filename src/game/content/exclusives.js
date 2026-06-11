// 原#18 專屬武器 — character-exclusive signature weapons.
// These are weapon-slot equipment that ONLY appear in their owner's in-run anvil
// (and never in chests / normal drops / other heroes' shops), and only SOMETIMES —
// most anvil rolls still surface ordinary gear. They are flagged { exclusive:true }
// so the loot pools skip them; run.js injects the owner's piece into the gear roll
// with a modest probability.
import { Equipment } from './registry.js';
import { defineIcon, sym, panel } from '../../art/icons.js';
import { P, lighten, darken } from '../../engine/palette.js';

// charId -> exclusive equipment id
export const CHAR_EXCLUSIVE = {
  hunter: 'x_starpiercer',
  pyro: 'x_embermaw',
  guardian: 'x_avalanche',
  ranger: 'x_thousandbird',
  stormcaller: 'x_thunderspear',
  shadow: 'x_twinfang',
  // a couple of generated heroes get one too; others fall back to ordinary gear
  g_vanguard: 'x_bulwarkbreaker',
  g_arcanist: 'x_arcrift',     // R18/B5: was x_starpiercer (the hunter's) — now its own
  g_revenant: 'x_soulleech',
  // R18/B5: three more former-orphan heroes get signature weapons
  g_ranger: 'x_galeshot',
  g_warden: 'x_bastionwave',
  g_stormcaller: 'x_stormheart',
};
export function exclusiveFor(charId) { return CHAR_EXCLUSIVE[charId] || null; }

// helper to register one exclusive weapon + its icon
function X(o) {
  const icon = 'equip_' + o.id;
  defineIcon(icon, o.bg, o.draw);
  Equipment.register({ id: o.id, name: o.name, slot: 'weapon', tier: 3, weight: 0, price: o.price || 120, exclusive: true, icon, desc: o.desc, weapon: o.weapon });
}

X({ id: 'x_starpiercer', name: '弒星魂弩', bg: '#163a44', price: 130,
  desc: '【專屬】極速連射的穿透魂弩，彈如星雨。',
  draw: (p) => { p.line(3, 8, 12, 8, P.steelL); p.line(9, 5, 13, 8, P.shardL); p.line(9, 11, 13, 8, P.shardL); p.rect(4, 6, 2, 5, P.iron); sym.shardSym(p, P.shard); },
  weapon: { name: '弒星魂弩', damage: 8, fireRate: 6.5, projSpeed: 280, projCount: 2, spread: 0.08, pierce: 2, knockback: 12, projSprite: 'bolt', projColor: P.shardL, projRadius: 2.6, projLife: 1.3 } });

X({ id: 'x_embermaw', name: '焚世魔焰', bg: '#4a1a12', price: 140,
  desc: '【專屬】噴吐烈焰扇的魔器，近距離焚盡一切。',
  draw: (p) => { p.ellipse(6, 9, 3, 4, P.ember); p.ellipse(6, 9, 1.6, 2.6, P.emberL); for (let i = 0; i < 4; i++) p.line(8, 8, 13, 5 + i * 2, P.ember); p.px(6, 11, P.white); },
  weapon: { name: '焚世魔焰', damage: 9, fireRate: 2.6, projSpeed: 190, projCount: 6, spread: 0.34, pierce: 1, knockback: 26, projSprite: 'bolt_fire', projColor: P.ember, projRadius: 3, projLife: 0.6, status: { type: 'burn' } } });

X({ id: 'x_avalanche', name: '山崩巨槌', bg: '#34384a', price: 150,
  desc: '【專屬】緩慢卻毀天滅地的巨槌投擲，貫穿一切。',
  draw: (p) => { p.rect(5, 3, 7, 5, P.iron); p.rect(5, 3, 7, 1, P.steelL); p.vline(7, 13, 8, P.woodD); p.rectLine(5, 3, 7, 5, P.ink); },
  weapon: { name: '山崩巨槌', damage: 46, fireRate: 1.0, projSpeed: 150, projCount: 1, spread: 0.02, pierce: 4, knockback: 90, projSprite: 'bolt', projColor: P.steelL, projRadius: 6, projLife: 2.2, projScale: 1.8 } });

X({ id: 'x_thousandbird', name: '千鳥追蹤', bg: '#244a2a', price: 135,
  desc: '【專屬】釋放成群自動追蹤的疾風箭。',
  draw: (p) => { for (let i = 0; i < 3; i++) { const y = 4 + i * 3; p.line(3, y, 9, y, P.greenL); p.line(7, y - 1, 9, y, P.greenL); p.line(7, y + 1, 9, y, P.greenL); } p.px(12, 8, P.toxic); },
  weapon: { name: '千鳥追蹤', damage: 9, fireRate: 3.2, projSpeed: 170, projCount: 3, spread: 0.5, pierce: 0, knockback: 12, projSprite: 'bolt_void', projColor: P.greenL, projRadius: 3, projLife: 2.0, homing: 4.5 } });

X({ id: 'x_thunderspear', name: '雷神之矛', bg: '#2a1a4a', price: 140,
  desc: '【專屬】投擲瞬發的雷矛，高速貫穿成排敵人。',
  draw: (p) => { p.line(3, 12, 12, 3, P.emberL); p.line(4, 12, 13, 3, P.white); p.px(12, 3, P.white); sym.bolt(p, P.emberL); },
  weapon: { name: '雷神之矛', damage: 16, fireRate: 2.4, projSpeed: 340, projCount: 1, spread: 0.02, pierce: 5, knockback: 30, projSprite: 'bolt', projColor: P.emberL, projRadius: 3.4, projLife: 1.6 } });

X({ id: 'x_twinfang', name: '影襲雙刃', bg: '#1a1428', price: 135,
  desc: '【專屬】高暴擊的影刃飛旋，撕裂目標。',
  draw: (p) => { p.line(4, 12, 11, 5, P.steelL); p.line(5, 12, 12, 5, P.purpleL); p.line(11, 12, 4, 5, P.steelL); p.px(11, 5, P.white); p.px(4, 5, P.white); },
  weapon: { name: '影襲雙刃', damage: 13, fireRate: 3.4, projSpeed: 240, projCount: 2, spread: 0.18, pierce: 1, knockback: 16, projSprite: 'bolt_void', projColor: P.purpleL, projRadius: 2.8, projLife: 0.9 } });

X({ id: 'x_bulwarkbreaker', name: '破壁重弩', bg: '#3a1414', price: 140,
  desc: '【專屬】先鋒的重弩，沉重彈頭擊退成群。',
  draw: (p) => { p.rect(4, 6, 8, 4, P.iron); p.rect(4, 6, 8, 1, P.steelL); p.line(11, 8, 14, 8, P.redL); p.rect(5, 10, 2, 3, P.woodD); },
  weapon: { name: '破壁重弩', damage: 30, fireRate: 1.4, projSpeed: 200, projCount: 1, spread: 0.02, pierce: 3, knockback: 70, projSprite: 'bolt', projColor: P.redL, projRadius: 5, projLife: 2.0, projScale: 1.5 } });

X({ id: 'x_soulleech', name: '噬魂之鐮', bg: '#201828', price: 138,
  desc: '【專屬】亡魂的鐮刃，揮斬間奪取生命。',
  draw: (p) => { p.line(4, 13, 5, 4, P.woodD); p.line(5, 4, 12, 6, P.steelL); p.line(5, 4, 11, 9, P.poison); p.px(12, 6, P.toxic); },
  weapon: { name: '噬魂之鐮', damage: 18, fireRate: 2.2, projSpeed: 200, projCount: 2, spread: 0.22, pierce: 2, knockback: 22, projSprite: 'bolt_void', projColor: P.poison, projRadius: 3.4, projLife: 0.8 } });

// ---- R18 / B5: four signature weapons for the newly-promoted heroes ----
X({ id: 'x_arcrift', name: '奧術裂隙', bg: '#2a1c4a', price: 140,
  desc: '【專屬】緩重的穿透法彈，撕開空間裂隙。',
  draw: (p) => { p.ellipse(8, 8, 3.4, 4.4, P.purpleD); p.ellipse(8, 8, 1.8, 3, P.manaL); p.px(8, 8, P.white); p.px(8, 3, P.shardL); p.px(8, 13, P.shardL); },
  weapon: { name: '奧術裂隙', damage: 24, fireRate: 1.5, projSpeed: 175, projCount: 1, spread: 0.04, pierce: 3, knockback: 20, projSprite: 'bolt_void', projColor: P.manaL, projRadius: 6, projLife: 1.8, projScale: 1.4 } });

X({ id: 'x_galeshot', name: '疾風連弩', bg: '#1e3a26', price: 135,
  desc: '【專屬】極速雙連射的輕弩，箭如疾風。',
  draw: (p) => { p.line(3, 6, 11, 6, P.greenL); p.line(3, 10, 11, 10, P.greenL); p.line(9, 5, 12, 6, P.toxic); p.line(9, 11, 12, 10, P.toxic); p.rect(4, 7, 2, 3, P.woodD); },
  weapon: { name: '疾風連弩', damage: 7, fireRate: 7.0, projSpeed: 290, projCount: 2, spread: 0.1, pierce: 1, knockback: 10, projSprite: 'bolt', projColor: P.greenL, projRadius: 2.4, projLife: 1.1 } });

X({ id: 'x_bastionwave', name: '堡壘震波', bg: '#33384c', price: 150,
  desc: '【專屬】扇形震波擊退成群，附帶緩速。',
  draw: (p) => { p.rect(5, 6, 6, 5, P.iron); p.rect(5, 6, 6, 1, P.steelL); for (let i = 0; i < 4; i++) p.line(11, 8, 14, 5 + i * 2, P.shardL); p.px(8, 8, P.iceD); },
  weapon: { name: '堡壘震波', damage: 22, fireRate: 1.2, projSpeed: 180, projCount: 4, spread: 0.8, pierce: 1, knockback: 80, projSprite: 'bolt', projColor: P.shardL, projRadius: 3.4, projLife: 0.7, status: { type: 'slow' } } });

X({ id: 'x_stormheart', name: '雷暴核心', bg: '#22224a', price: 142,
  desc: '【專屬】三道高速雷彈齊射，貫穿雷霆。',
  draw: (p) => { for (let i = 0; i < 3; i++) { const y = 4 + i * 4; p.line(3, y, 9, y, P.blueL); p.px(10, y, P.white); } p.line(11, 8, 14, 5, P.emberL); p.px(12, 8, P.emberL); },
  weapon: { name: '雷暴核心', damage: 12, fireRate: 3.0, projSpeed: 330, projCount: 3, spread: 0.16, pierce: 1, knockback: 16, projSprite: 'bolt', projColor: P.blueL, projRadius: 2.8, projLife: 1.0 } });
