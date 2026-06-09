// Playable characters: each has a starting weapon, a passive stat profile, an
// unlock condition, and a recoloured hunter sprite. Workflow adds more.
//
// Schema:
//   { id, name, desc, sprite:'char_<id>', startWeapon,
//     art:{cloak,cloakD,cloakL,trim,eye,skin},  // hunter recolour
//     passive(stats),                            // applied to base stats at run start
//     unlock:{ type:'free'|'gold'|'achievement', cost?, condition?, hint? } }
import { Characters } from './registry.js';
import { defineAnim, hasSprite } from '../../engine/sprites.js';
import '../../art/heroes.js';   // MUST run before the sprite-bake loop below: registers the unique
                                // hero-body archetypes into HERO_ART. characters.js is pulled in early
                                // (via state.js) — before main.js's own heroes.js import — so without
                                // this the char_<id> sprites bake with an empty HERO_ART and fall back
                                // to the generic hooded body (all heroes look like recoloured hunters).
import { drawHunter, drawHeroBody } from '../../art/core.js';
import { P, withAlpha } from '../../engine/palette.js';

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
  passive: (s) => { s.area *= 1.2; s.fireRateMult *= 1.1; }, unlock: { type: 'achievement', condition: 'reach_stage_5', hint: '抵達威脅 5 級解鎖' } });

C({ id: 'shadow', name: '暗影刺客', desc: '閃避 +12%、幸運 +0.2。起始武器：環衛刃。', sprite: 'char_shadow', startWeapon: 'w_orbit',
  art: { cloak: P.purple, cloakD: P.purpleD, cloakL: P.purpleL, trim: P.manaL, eye: P.manaL },
  passive: (s) => { s.dodge += 0.12; s.luck += 0.2; }, unlock: { type: 'achievement', condition: 'kills_2000', hint: '累計擊殺 2000 解鎖' } });

// generate each character's sprite — UNIQUE body archetype per hero (原#17), tinted
// by the character's palette; falls back to the hooded hunter if none is registered.
for (const c of Characters.all()) {
  defineAnim(c.sprite, 16, 18, 4, (p, f) => {
    drawHeroBody(p, f, c.id, c.art);
    p.outline(P.ink);
  }, { anchor: [8, 17], fps: 9 });
}

// alternate cosmetic SKINS (#5 / task-3): a recolour PLUS a distinct accessory overlay
// (`deco`) drawn above/around the hero's head so each skin changes the SILHOUETTE, not
// just the palette. Applicable to any hero; buying one in the 衣帽店 unlocks the variant
// sprite `char_<id>__<skinId>`. deco(p, oy) draws in 16x18 local coords (oy = 1px bob).
export const SKINS = [
  { id: 'flame', name: '烈焰', price: 200, art: { cloak: P.red, cloakD: P.redD, cloakL: P.redL, trim: P.gold, eye: P.emberL },
    deco: (p, oy) => { p.line(3, 9 + oy, 2, 5 + oy, P.ember); p.line(13, 9 + oy, 14, 5 + oy, P.ember); p.ellipse(8, 1 + oy, 1.4, 2, P.emberL); p.px(8, 0 + oy, P.white); } },   // shoulder + crown flames
  { id: 'tide', name: '碧波', price: 200, art: { cloak: P.blue, cloakD: P.blueD, cloakL: P.blueL, trim: P.shardL, eye: P.iceD },
    deco: (p, oy) => { p.ring(8, 2 + oy, 4, withAlpha(P.blueL, 0.85)); p.px(8, -1 + oy, P.iceD); p.px(4, 4 + oy, P.shardL); p.px(12, 4 + oy, P.shardL); } },   // water halo + droplets
  { id: 'verdant', name: '翠影', price: 200, art: { cloak: P.green, cloakD: P.greenD, cloakL: P.greenL, trim: P.gold, eye: P.toxic },
    deco: (p, oy) => { p.px(8, 1 + oy, P.greenL); p.line(5, 2 + oy, 4, 0 + oy, P.green); p.line(11, 2 + oy, 12, 0 + oy, P.green); p.px(5, 2 + oy, P.greenD); p.px(11, 2 + oy, P.greenD); } },   // leaf crown
  { id: 'royal', name: '皇金', price: 350, art: { cloak: P.gold, cloakD: P.bronze, cloakL: '#ffe9a0', trim: P.purpleL, eye: P.emberL },
    deco: (p, oy) => { p.hline(5, 10, 2 + oy, P.gold); p.px(5, 1 + oy, P.goldL); p.px(8, 0 + oy, P.goldL); p.px(10, 1 + oy, P.goldL); p.px(8, 2 + oy, P.redL); } },   // gold crown + jewel
  { id: 'void', name: '虛影', price: 350, art: { cloak: P.purple, cloakD: P.purpleD, cloakL: P.purpleL, trim: P.manaL, eye: P.manaL },
    deco: (p, oy) => { p.line(5, 3 + oy, 3, 0 + oy, P.purpleD); p.line(11, 3 + oy, 13, 0 + oy, P.purpleD); p.px(3, 0 + oy, P.purpleL); p.px(13, 0 + oy, P.purpleL); p.px(8, 1 + oy, withAlpha(P.manaL, 0.7)); } },   // void horns
  // 原#7 / task-3: more cosmetic skins, each with its own accessory
  { id: 'frost', name: '霜寒', price: 250, art: { cloak: P.ice, cloakD: P.iceD, cloakL: P.white, trim: P.shardL, eye: P.blueL },
    deco: (p, oy) => { p.line(6, 2 + oy, 5, -1 + oy, P.ice); p.line(8, 2 + oy, 8, -2 + oy, P.white); p.line(10, 2 + oy, 11, -1 + oy, P.ice); } },   // ice-spike crown
  { id: 'ember', name: '餘燼', price: 250, art: { cloak: P.ember, cloakD: P.redD, cloakL: P.emberL, trim: P.gold, eye: P.white },
    deco: (p, oy) => { p.px(4, 2 + oy, P.emberL); p.px(8, 0 + oy, P.ember); p.px(12, 3 + oy, P.emberL); p.px(6, -1 + oy, P.white); p.px(11, -1 + oy, P.emberL); } },   // floating embers
  { id: 'phantom', name: '幽冥', price: 320, art: { cloak: P.shadow, cloakD: P.ink, cloakL: P.gray2, trim: P.purpleL, eye: P.toxic },
    deco: (p, oy) => { p.ring(8, 3 + oy, 4, withAlpha(P.purpleL, 0.5)); p.px(4, 6 + oy, withAlpha(P.gray4, 0.7)); p.px(12, 6 + oy, withAlpha(P.gray4, 0.7)); p.px(8, -1 + oy, withAlpha(P.toxic, 0.8)); } },   // spectral halo
  { id: 'jade', name: '碧玉', price: 250, art: { cloak: P.toxic, cloakD: P.greenD, cloakL: P.greenL, trim: P.bone, eye: P.white },
    deco: (p, oy) => { p.ring(8, 3 + oy, 3, withAlpha(P.toxic, 0.6)); p.px(8, 4 + oy, P.greenL); p.px(8, 3 + oy, P.white); p.px(8, 0 + oy, P.bone); } },   // jade gem + halo
  { id: 'crimson', name: '緋紅', price: 320, art: { cloak: P.blood, cloakD: P.redD, cloakL: P.redL, trim: P.gold, eye: P.emberL },
    deco: (p, oy) => { p.line(5, 3 + oy, 4, 0 + oy, P.blood); p.line(11, 3 + oy, 12, 0 + oy, P.blood); p.px(4, 0 + oy, P.redL); p.px(12, 0 + oy, P.redL); p.px(8, 1 + oy, P.redL); } },   // crimson horns
  { id: 'bone', name: '枯骨', price: 280, art: { cloak: P.bone, cloakD: P.gray2, cloakL: P.white, trim: P.ember, eye: P.redL },
    deco: (p, oy) => { p.ellipse(8, 2 + oy, 1.6, 1.6, P.bone); p.px(7, 2 + oy, P.ink2); p.px(9, 2 + oy, P.ink2); p.px(3, 9 + oy, P.bone); p.px(13, 9 + oy, P.bone); } },   // skull crest + shoulder bone
  // ---- HIDDEN skins (task-10): a full body() override — a COMPLETELY different silhouette,
  // not a recoloured hero. Rarer in the 衣帽店 (rolled ~45% of restocks). ----
  { id: 'golem', name: '魂晶巨像', price: 600, hidden: true, art: { cloak: P.shard, cloakD: P.shardD, cloakL: P.shardL, trim: P.gold, eye: P.white },
    body: (p, f, a) => { const oy = (f === 1 || f === 3) ? -1 : 0;
      p.rect(4, 15 + oy, 3, 3, a.cloakD); p.rect(9, 15 + oy, 3, 3, a.cloakD);
      p.rect(3, 7 + oy, 10, 9, a.cloakD); p.rect(4, 7 + oy, 8, 8, a.cloak);
      p.ellipse(8, 11 + oy, 2, 2.6, a.cloakL); p.px(8, 11 + oy, a.eye);
      p.rect(5, 3 + oy, 6, 5, a.cloakD); p.rect(6, 3 + oy, 4, 3, a.cloak); p.px(7, 5 + oy, a.eye); p.px(9, 5 + oy, a.eye);
      p.px(2, 7 + oy, a.cloakL); p.px(13, 7 + oy, a.cloakL); p.px(3, 6 + oy, a.cloakL); p.px(12, 6 + oy, a.cloakL); p.px(8, 1 + oy, a.cloakL); } },
  { id: 'wraith', name: '虛無亡魂', price: 600, hidden: true, art: { cloak: P.shadow, cloakD: P.ink, cloakL: P.purpleL, trim: P.toxic, eye: P.toxic },
    body: (p, f, a) => { const oy = (f === 1 || f === 3) ? -1 : 0; const fl = (f === 1 || f === 3) ? 1 : 0;
      for (let y = 12 + oy; y <= 17 + oy; y++) { const w = 3 - (y - (12 + oy)) * 0.45; p.hline(8 - w, 8 + w, y, a.cloakD); }
      p.px(6, 17 + oy, a.cloak); p.px(10, 16 + oy, a.cloak);
      p.ellipse(8, 9 + oy, 4, 5, a.cloakD); p.ellipse(8, 8 + oy, 3.2, 4, a.cloak);
      p.ellipse(8, 6 + oy, 2.6, 2.6, P.ink2); p.px(7, 6 + oy, a.eye); p.px(9, 6 + oy, a.eye);
      p.px(3, 9 + oy + fl, a.cloakL); p.px(13, 9 + oy - fl, a.cloakL);
      p.ring(8, 8 + oy, 6, withAlpha(a.cloakL, 0.35)); } },
  { id: 'mecha', name: '機甲獵手', price: 600, hidden: true, art: { cloak: P.steel, cloakD: P.steelD, cloakL: P.steelL, trim: P.emberL, eye: P.emberL },
    body: (p, f, a) => { const oy = (f === 1 || f === 3) ? -1 : 0;
      p.rect(4, 14 + oy, 3, 4, a.cloakD); p.rect(9, 14 + oy, 3, 4, a.cloakD); p.px(5, 17 + oy, P.ink2); p.px(10, 17 + oy, P.ink2);
      p.rect(3, 7 + oy, 10, 8, a.cloakD); p.rect(4, 8 + oy, 8, 6, a.cloak); p.hline(4, 11, 11 + oy, a.cloakL); p.px(8, 9 + oy, a.eye);
      p.rect(5, 3 + oy, 6, 4, a.cloakD); p.rect(5, 4 + oy, 6, 1, a.eye);
      p.vline(2 + oy, 3 + oy, 8, a.cloakL); p.px(8, 1 + oy, a.eye);
      p.rect(2, 7 + oy, 2, 3, a.cloakL); p.rect(12, 7 + oy, 2, 3, a.cloakL); } },
  { id: 'seraph', name: '熾天使', price: 700, hidden: true, art: { cloak: '#ffe9a0', cloakD: P.gold, cloakL: P.white, trim: P.emberL, eye: P.shardL, skin: P.skin },
    body: (p, f, a) => { const oy = (f === 1 || f === 3) ? -1 : 0;
      p.line(3, 6 + oy, 1, 11 + oy, a.cloakL); p.line(3, 6 + oy, 2, 13 + oy, a.cloakL); p.line(13, 6 + oy, 15, 11 + oy, a.cloakL); p.line(13, 6 + oy, 14, 13 + oy, a.cloakL);
      p.line(2, 7 + oy, 1, 11 + oy, P.white); p.line(14, 7 + oy, 15, 11 + oy, P.white);
      for (let y = 8 + oy; y <= 16 + oy; y++) { const w = 2 + (y - (8 + oy)) * 0.5; p.hline(8 - w, 8 + w, y, a.cloakD); }
      for (let y = 9 + oy; y <= 16 + oy; y++) { const w = 1.4 + (y - (9 + oy)) * 0.4; p.hline(8 - w, 8 + w, y, a.cloak); }
      p.ellipse(8, 6 + oy, 2.2, 2.2, a.skin || P.skin); p.px(7, 6 + oy, P.ink); p.px(9, 6 + oy, P.ink);
      p.ring(8, 2 + oy, 3, a.trim); p.px(8, -1 + oy, P.white); } },
];
// Skin variant sprites are generated LAZILY on first use — gen-content heroes are
// registered after this module loads, so an eager loop would miss them (rendering
// magenta). hasSprite() makes generation idempotent.
function ensureSkin(c, sk) {
  const name = `${c.sprite}__${sk.id}`;
  // 原#17: skins recolour the hero's UNIQUE body archetype; task-3: + an accessory overlay.
  // task-10: a HIDDEN skin supplies its own body(p,f,art) for a TOTALLY different silhouette
  // (golem / wraith / mecha / seraph) — not a recolour of the hooded hero at all.
  if (!hasSprite(name)) defineAnim(name, 16, 18, 4, (p, f) => {
    const art = { ...c.art, ...sk.art };
    if (sk.body) { try { sk.body(p, f, art); } catch (e) { /* */ } }
    else { drawHeroBody(p, f, c.id, art); if (sk.deco) { try { sk.deco(p, (f === 1 || f === 3) ? -1 : 0); } catch (e) { /* */ } } }
    p.outline(P.ink);
  }, { anchor: [8, 17], fps: 9 });
  return name;
}
// resolve (and ensure) the sprite name for a character + a skin id
export function skinSpriteName(charId, skinId) {
  const c = Characters.get(charId); if (!c) return 'player';
  const sk = skinId && SKINS.find((s) => s.id === skinId);
  return sk ? ensureSkin(c, sk) : c.sprite;
}
// resolve the sprite for a character given the player's equipped skin (meta.skins)
export function skinnedSprite(meta, charId) {
  return skinSpriteName(charId, meta && meta.skins && meta.skins[charId]);
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
