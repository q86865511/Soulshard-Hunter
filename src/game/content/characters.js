// Playable characters: each has a starting weapon, a passive stat profile, an
// unlock condition, and a recoloured hunter sprite. Workflow adds more.
//
// Schema:
//   { id, name, desc, sprite:'char_<id>', startWeapon,
//     art:{cloak,cloakD,cloakL,trim,eye,skin},  // hunter recolour
//     passive(stats),                            // applied to base stats at run start
//     unlock:{ type:'free'|'gold'|'achievement', cost?, condition?, hint? } }
import { Characters } from './registry.js';
import { defineAnim } from '../../engine/sprites.js';
import { drawHunter } from '../../art/core.js';
import { P } from '../../engine/palette.js';

const C = (o) => Characters.register(o);

C({ id: 'hunter', name: '魂晶獵手', desc: '均衡可靠的起手角色。', sprite: 'char_hunter', startWeapon: 'w_soulbolt',
  art: { cloak: P.shard, cloakD: P.shardD, cloakL: P.shardL, trim: P.gold, eye: P.emberL }, passive: () => {}, unlock: { type: 'free' } });

C({ id: 'pyro', name: '烈焰術士', desc: '傷害 +20%，但生命上限 -20。起始武器：魂焰扇。', sprite: 'char_pyro', startWeapon: 'w_fan',
  art: { cloak: P.red, cloakD: P.redD, cloakL: P.redL, trim: P.gold, eye: P.emberL },
  passive: (s) => { s.damageMult *= 1.2; s.maxHp -= 20; }, unlock: { type: 'gold', cost: 300 } });

C({ id: 'guardian', name: '晶岩守衛', desc: '生命 +40、減傷 +3，但移速 -10%。起始武器：灼蝕光環。', sprite: 'char_guardian', startWeapon: 'w_aura',
  art: { cloak: P.steel, cloakD: P.steelD, cloakL: P.steelL, trim: P.bronze, eye: P.iceD },
  passive: (s) => { s.maxHp += 28; s.defense += 2; s.speed *= 0.9; }, unlock: { type: 'gold', cost: 350 } });

C({ id: 'ranger', name: '疾風遊俠', desc: '移速 +15%、暴擊 +8%。起始武器：追魂彈。', sprite: 'char_ranger', startWeapon: 'w_homing',
  art: { cloak: P.green, cloakD: P.greenD, cloakL: P.greenL, trim: P.gold, eye: P.toxic },
  passive: (s) => { s.speed *= 1.15; s.critChance += 0.08; }, unlock: { type: 'gold', cost: 350 } });

C({ id: 'stormcaller', name: '風暴祭司', desc: '範圍 +20%、射速 +10%。起始武器：連鎖閃電。', sprite: 'char_stormcaller', startWeapon: 'w_lightning',
  art: { cloak: P.blue, cloakD: P.blueD, cloakL: P.blueL, trim: P.emberL, eye: P.emberL },
  passive: (s) => { s.area *= 1.2; s.fireRateMult *= 1.1; }, unlock: { type: 'achievement', condition: 'reach_stage_5', hint: '抵達第 5 區解鎖' } });

C({ id: 'shadow', name: '暗影刺客', desc: '閃避 +12%、幸運 +0.2。起始武器：環衛刃。', sprite: 'char_shadow', startWeapon: 'w_orbit',
  art: { cloak: P.purple, cloakD: P.purpleD, cloakL: P.purpleL, trim: P.manaL, eye: P.manaL },
  passive: (s) => { s.dodge += 0.12; s.luck += 0.2; }, unlock: { type: 'achievement', condition: 'kills_2000', hint: '累計擊殺 2000 解鎖' } });

// generate each character's recoloured sprite
for (const c of Characters.all()) {
  defineAnim(c.sprite, 16, 18, 4, (p, f) => {
    drawHunter(p, f, c.art);
    p.outline(P.ink);
  }, { anchor: [8, 17], fps: 9 });
}

// unlock achievement-gated characters based on lifetime stats
// data-driven condition matcher: reach_stage_N / kills_N / survive_N / bosses_N
function meetsCondition(cond, s) {
  if (!cond) return false;
  let m;
  if ((m = /^reach_stage_(\d+)$/.exec(cond))) return (s.bestStage || 0) >= +m[1];
  if ((m = /^kills_(\d+)$/.exec(cond))) return (s.kills || 0) >= +m[1];
  if ((m = /^survive_(\d+)$/.exec(cond))) return (s.bestTime || 0) >= +m[1];
  if ((m = /^bosses_(\d+)$/.exec(cond))) return (s.bossKills || 0) >= +m[1];
  return false;
}

export function checkCharacterUnlocks(META) {
  const got = META.unlocked.characters;
  const s = META.stats || {};
  const unlocked = [];
  for (const c of Characters.all()) {
    if (!c.unlock || c.unlock.type !== 'achievement' || got.includes(c.id)) continue;
    if (meetsCondition(c.unlock.condition, s)) { got.push(c.id); unlocked.push(c); }
  }
  return unlocked;
}
