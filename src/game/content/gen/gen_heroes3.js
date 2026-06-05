import { Enemies, Items, Equipment, Abilities, Talents, Facilities, Weapons, Characters } from '../registry.js';
import { registerHeroBody } from '../../../art/core.js';
import { P, lighten, darken, mix, withAlpha } from '../../../engine/palette.js';
import { dist, dist2, rng, clamp, TAU } from '../../../engine/math.js';
import { Projectile } from '../../projectile.js';
import { glowWorld, fillCircleWorld, drawSprite, lineWorld } from '../../../engine/renderer.js';
import { getSprite, defineSprite, defineAnim, Painter } from '../../../engine/sprites.js';
import { defineIcon, panel, sym } from '../../../art/icons.js';
import { drawSlime, drawBat, drawWisp, drawBrute, drawHunter } from '../../../art/core.js';
import { Sfx } from '../../../engine/audio.js';
import { BALANCE } from '../../balance.js';

// gen_heroes3 — 4 NEW playable heroes, each with a UNIQUE 16x18 feet-anchored
// pixel body drawn inline (NOT a recoloured hunter). All ids/sprites use the
// h3_ prefix. Passives are modest, trade-off driven (post-nerf balance).
//
// Archetypes:
//   spearmaiden  — tall spear + flowing skirt + circlet (reach/poise)
//   plague       — plague-doctor beak mask, wide-brim hat, satchel, cane
//   beastfang    — fur-pelt shoulders + hood + claw, hunched stance
//   dragoon      — winged/horned dragoon helm + pauldrons + lance

// ---------- Art palettes (cloak, cloakD, cloakL, trim, eye) ----------
const H3ART_spearmaiden = { cloak: P.blue,   cloakD: P.blueD,   cloakL: P.blueL,   trim: P.gold,    eye: P.iceD,   skin: P.skin };
const H3ART_plague      = { cloak: P.gray1,  cloakD: P.shadow,  cloakL: P.gray3,   trim: P.bone,    eye: P.toxic,  skin: P.bone };
const H3ART_beastfang   = { cloak: P.leather,cloakD: P.woodD,   cloakL: P.woodL,   trim: P.bone,    eye: P.emberL, skin: P.skin2 };
const H3ART_dragoon     = { cloak: P.steel,  cloakD: P.steelD,  cloakL: P.steelL,  trim: P.red,     eye: P.emberL, skin: P.skin };

// ===========================================================================
// 1) SPEAR-MAIDEN — slender, long spear held vertical on her right, a flared
//    skirt, a thin circlet with a gem. Distinct from the hunter's hood blob.
// ===========================================================================
function drawH3_spearmaiden(p, f, a) {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.blue, cloakD = a.cloakD ?? P.blueD, cloakL = a.cloakL ?? P.blueL;
  const trim = a.trim ?? P.gold, eye = a.eye ?? P.iceD, skin = a.skin ?? P.skin;

  // boots
  p.rect(5, 16 + oy, 2, 2, darken(cloakD, 0.25));
  p.rect(9, 16 + oy, 2, 2, darken(cloakD, 0.25));
  if (step > 0) p.px(6, 17 + oy, P.ink2);
  if (step < 0) p.px(9, 17 + oy, P.ink2);

  // flared skirt (wide at hem, narrow at waist)
  const sTop = 11 + oy, sBot = 16 + oy;
  for (let y = sTop; y <= sBot; y++) {
    const t = (y - sTop) / (sBot - sTop);
    const hw = Math.round(2 + t * 3);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  for (let y = sTop + 1; y <= sBot - 1; y++) {
    const t = (y - sTop) / (sBot - sTop);
    const hw = Math.round(1 + t * 2);
    p.hline(8 - hw, 7 + hw, y, cloak);
  }
  p.hline(3, 12, sBot, trim);                 // gold hem
  p.px(7, sTop + 1, cloakL); p.px(8, sTop + 1, cloakL);

  // torso / bodice
  p.rect(6, 8 + oy, 5, 4, cloakD);
  p.rect(6, 8 + oy, 5, 3, cloak);
  p.vline(8 + oy, 11 + oy, 8, trim);          // central lacing
  p.px(6, 9 + oy, cloakL);

  // bare arms — left rests, right grips spear high
  p.rect(4, 9 + oy, 2, 3, skin);              // left arm
  p.rect(11, 7 + oy, 2, 4, skin);             // right arm raised to grip
  p.px(11, 7 + oy, lighten(skin, 0.2));

  // head + hair + circlet
  p.ellipse(8, 5 + oy, 3, 3, skin);           // face
  p.rect(5, 3 + oy, 6, 2, cloakD);            // hair top
  p.px(5, 5 + oy, cloakD); p.px(10, 5 + oy, cloakD);   // side hair
  p.vline(6 + oy, 9 + oy, 5, cloakD);         // long hair strand (left, behind)
  p.hline(5, 10, 3 + oy, trim);               // circlet band
  p.px(8, 2 + oy, lighten(trim, 0.3));        // circlet gem
  // eyes
  p.px(7, 5 + oy, eye); p.px(9, 5 + oy, eye);

  // SPEAR — long shaft up the right side, leaf blade at top (kept inside box;
  // top starts at y1 so the -1 bob never goes off-canvas)
  p.vline(4 + oy, 16 + oy, 13, P.wood);        // shaft
  p.rect(12, 2 + oy, 2, 3, P.steel);           // leaf blade
  p.px(13, 1 + oy, P.steelL);                  // blade tip
  p.px(12, 3 + oy, P.steelL);
  p.px(13, 5 + oy, trim);                      // collar under blade
}

// ===========================================================================
// 2) PLAGUE-DOCTOR — wide-brim hat, long beaked mask, buttoned long coat,
//    a satchel on the hip and a short cane. Unmistakable silhouette.
// ===========================================================================
function drawH3_plague(p, f, a) {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.gray1, cloakD = a.cloakD ?? P.shadow, cloakL = a.cloakL ?? P.gray3;
  const trim = a.trim ?? P.bone, eye = a.eye ?? P.toxic, beak = P.bone;

  // boots
  p.rect(5, 16 + oy, 2, 2, P.ink2);
  p.rect(9, 16 + oy, 2, 2, P.ink2);
  if (step > 0) p.px(6, 17 + oy, P.shadow);
  if (step < 0) p.px(9, 17 + oy, P.shadow);

  // long coat (straight, ankle length)
  const cTop = 9 + oy, cBot = 16 + oy;
  for (let y = cTop; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(3 + t * 1.5);
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  for (let y = cTop + 1; y <= cBot; y++) {
    const t = (y - cTop) / (cBot - cTop);
    const hw = Math.round(2 + t * 1);
    p.hline(8 - hw, 7 + hw, y, cloak);
  }
  p.vline(cTop + 1, cBot, 8, cloakD);         // coat seam
  p.px(8, 11 + oy, trim); p.px(8, 13 + oy, trim); p.px(8, 15 + oy, trim); // buttons

  // arms
  p.rect(3, 10 + oy, 2, 4, cloakD);           // left
  p.rect(11, 10 + oy, 2, 4, cloakD);          // right
  p.px(4, 10 + oy, cloak);

  // satchel on left hip
  p.rect(2, 12 + oy, 3, 3, P.leather);
  p.rect(2, 12 + oy, 3, 1, darken(P.leather, 0.2));
  p.px(3, 13 + oy, trim);                      // buckle

  // neck
  p.rect(7, 8 + oy, 2, 1, cloakD);

  // head: round mask base
  p.ellipse(8, 5 + oy, 3, 3, cloakL);
  p.ellipse(8, 5 + oy, 3, 3, mix(cloakL, P.white, 0.15));
  // round goggle lenses
  p.px(6, 5 + oy, P.steelD); p.px(7, 5 + oy, eye);
  p.px(9, 5 + oy, eye); p.px(10, 5 + oy, P.steelD);
  // long downward beak
  p.line(8, 6 + oy, 7, 9 + oy, beak);
  p.line(9, 6 + oy, 8, 9 + oy, beak);
  p.px(8, 7 + oy, darken(beak, 0.15));
  p.px(7, 9 + oy, darken(beak, 0.2));

  // wide-brim hat (crown kept at y1 so -1 bob stays in-canvas)
  p.hline(2, 13, 3 + oy, cloakD);             // wide brim
  p.hline(3, 12, 2 + oy, cloak);
  p.rect(6, 1 + oy, 4, 2, cloakD);            // crown
  p.hline(6, 9, 1 + oy, mix(cloakD, P.white, 0.12));

  // cane in right hand
  p.vline(11 + oy, 16 + oy, 13, P.woodD);
  p.px(13, 10 + oy, trim);                     // cane knob
}

// ===========================================================================
// 3) BEAST-FANG — a hunched beastmaster: shaggy fur pelt over the shoulders,
//    a fanged hood, one clawed hand raised. Broad, low silhouette.
// ===========================================================================
function drawH3_beastfang(p, f, a) {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.leather, cloakD = a.cloakD ?? P.woodD, cloakL = a.cloakL ?? P.woodL;
  const trim = a.trim ?? P.bone, eye = a.eye ?? P.emberL, skin = a.skin ?? P.skin2;
  const fur = mix(cloak, P.bone, 0.25), furD = darken(cloakD, 0.1);

  // wide stance feet (wraps)
  p.rect(3, 16 + oy, 3, 2, furD);
  p.rect(10, 16 + oy, 3, 2, furD);
  if (step > 0) p.px(4, 17 + oy, P.ink2);
  if (step < 0) p.px(11, 17 + oy, P.ink2);

  // hunched legs / loincloth
  p.rect(4, 13 + oy, 8, 3, cloakD);
  p.rect(6, 13 + oy, 4, 3, cloak);
  p.hline(5, 10, 15 + oy, trim);              // bone-tooth belt
  p.px(6, 15 + oy, P.bone); p.px(9, 15 + oy, P.bone);

  // broad bare chest
  p.rect(5, 9 + oy, 6, 4, skin);
  p.rect(5, 9 + oy, 6, 1, lighten(skin, 0.15));
  p.px(6, 11 + oy, darken(skin, 0.18)); p.px(9, 11 + oy, darken(skin, 0.18)); // pecs

  // big shaggy fur mantle across the shoulders
  p.hline(2, 13, 8 + oy, furD);
  p.hline(2, 13, 7 + oy, fur);
  p.px(2, 9 + oy, furD); p.px(13, 9 + oy, furD);    // fur droops
  p.px(3, 9 + oy, fur);  p.px(12, 9 + oy, fur);
  p.px(4, 6 + oy, fur);  p.px(11, 6 + oy, fur);     // ruffled tufts

  // arms — left at side, right raised with claws
  p.rect(2, 10 + oy, 2, 4, skin);             // left arm
  p.rect(12, 8 + oy, 2, 3, skin);             // right arm raised
  // claws on right hand
  p.px(13, 6 + oy, P.bone); p.px(14, 6 + oy, P.bone); p.px(14, 7 + oy, P.bone);

  // beast hood / head with ears
  p.ellipse(8, 5 + oy, 3, 3, cloakD);         // hood
  p.ellipse(8, 5 + oy, 2.4, 2.4, cloak);
  p.px(5, 2 + oy, cloakD); p.px(11, 2 + oy, cloakD);   // ears (base)
  p.px(5, 3 + oy, cloak);  p.px(11, 3 + oy, cloak);
  // shadowed face under hood
  p.rect(6, 5 + oy, 4, 2, P.ink2);
  p.px(6, 5 + oy, eye); p.px(9, 5 + oy, eye); // feral eyes
  // fangs
  p.px(7, 7 + oy, P.bone); p.px(8, 7 + oy, P.bone);
}

// ===========================================================================
// 4) DRAGOON — heavy plate: a horned/winged dragoon helm with a crest, big
//    angular pauldrons, and a couched lance. Knightly, top-heavy silhouette.
// ===========================================================================
function drawH3_dragoon(p, f, a) {
  const oy = (f === 1 || f === 3) ? -1 : 0;
  const step = f === 1 ? 1 : f === 3 ? -1 : 0;
  const cloak = a.cloak ?? P.steel, cloakD = a.cloakD ?? P.steelD, cloakL = a.cloakL ?? P.steelL;
  const trim = a.trim ?? P.red, eye = a.eye ?? P.emberL;

  // armored boots / greaves
  p.rect(5, 16 + oy, 2, 2, cloakD);
  p.rect(9, 16 + oy, 2, 2, cloakD);
  if (step > 0) p.px(6, 17 + oy, P.ink2);
  if (step < 0) p.px(9, 17 + oy, P.ink2);

  // tasset skirt of plate
  const tTop = 12 + oy, tBot = 16 + oy;
  for (let y = tTop; y <= tBot; y++) {
    const hw = 3;
    p.hline(8 - hw, 7 + hw, y, cloakD);
  }
  p.rect(6, tTop, 4, tBot - tTop + 1, cloak);
  p.hline(4, 11, tBot, mix(cloakD, P.white, 0.1));

  // cuirass torso
  p.rect(5, 8 + oy, 6, 5, cloakD);
  p.rect(6, 8 + oy, 4, 4, cloak);
  p.rect(7, 8 + oy, 2, 1, cloakL);            // chest highlight
  p.vline(9 + oy, 12 + oy, 8, mix(cloak, P.white, 0.15)); // ridge
  p.px(8, 10 + oy, trim);                      // gem stud

  // big angular pauldrons
  p.rect(2, 7 + oy, 3, 3, cloakD);
  p.rect(11, 7 + oy, 3, 3, cloakD);
  p.px(2, 7 + oy, cloakL); p.px(13, 7 + oy, cloakL);
  p.px(3, 8 + oy, cloak);  p.px(12, 8 + oy, cloak);

  // gauntlet arms
  p.rect(3, 10 + oy, 2, 3, cloak);
  p.rect(11, 10 + oy, 2, 3, cloak);

  // dragoon HELM — angular, with a tall crest and side horns/wings
  p.rect(6, 3 + oy, 5, 4, cloakD);            // helm box
  p.rect(6, 4 + oy, 5, 2, cloak);
  p.rect(6, 5 + oy, 5, 1, P.ink2);            // visor slit
  p.px(7, 5 + oy, eye); p.px(9, 5 + oy, eye); // glow through visor
  // tall central crest (top at y1 so -1 bob stays on-canvas)
  p.vline(1 + oy, 3 + oy, 8, trim);
  p.px(8, 1 + oy, lighten(trim, 0.3));
  p.px(7, 2 + oy, trim);
  // swept side wings/horns
  p.line(6, 4 + oy, 4, 2 + oy, cloakL);
  p.line(11, 4 + oy, 13, 2 + oy, cloakL);
  p.px(4, 2 + oy, P.white); p.px(13, 2 + oy, P.white);

  // couched LANCE along the right arm (kept to x<=14 for an outline margin)
  p.line(10, 13 + oy, 14, 6 + oy, P.woodL);
  p.px(14, 5 + oy, P.steelL);
  p.rect(13, 5 + oy, 2, 2, P.steel);          // lance tip
  p.px(11, 12 + oy, trim);                      // vamplate guard
}

// ---------- Sprites (16x18, feet anchored at [8,17]) ----------
defineAnim('char_h3_spearmaiden', 16, 18, 4, (p, f) => { drawH3_spearmaiden(p, f, H3ART_spearmaiden); p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h3_plague',      16, 18, 4, (p, f) => { drawH3_plague(p, f, H3ART_plague);           p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h3_beastfang',   16, 18, 4, (p, f) => { drawH3_beastfang(p, f, H3ART_beastfang);     p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });
defineAnim('char_h3_dragoon',     16, 18, 4, (p, f) => { drawH3_dragoon(p, f, H3ART_dragoon);         p.outline(P.ink); }, { anchor: [8, 17], fps: 9 });

// ---------- Hero body registry (so skins recolour the unique body) ----------
registerHeroBody('h3_spearmaiden', (p, f, a) => drawH3_spearmaiden(p, f, a));
registerHeroBody('h3_plague',      (p, f, a) => drawH3_plague(p, f, a));
registerHeroBody('h3_beastfang',   (p, f, a) => drawH3_beastfang(p, f, a));
registerHeroBody('h3_dragoon',     (p, f, a) => drawH3_dragoon(p, f, a));

// ---------- Characters ----------
const C = (o) => Characters.register(o);

// 1) Spear-Maiden — poised zoner: extra pierce + reach (area) and a touch of
//    crit, paid for with a slightly slower cadence. Pairs with the soul-whip.
C({
  id: 'h3_spearmaiden', name: '魂矛巫女',
  desc: '穿透 +1、範圍 +8%、暴擊 +4%，但射速 -6%。起始武器：魂鞭。',
  sprite: 'char_h3_spearmaiden', startWeapon: 'w_whip',
  art: H3ART_spearmaiden,
  passive: (s) => {
    s.pierceAdd += 1;
    s.area *= 1.08;
    s.critChance += 0.04;
    s.fireRateMult *= 0.94;
  },
  unlock: { type: 'gold', cost: 320 },
});

// 2) Plague-Doctor — attrition caster: stronger, wider lingering damage and
//    extra pickup pull, but frailer. Pairs with the searing aura domain.
C({
  id: 'h3_plague', name: '瘟疫醫師',
  desc: '傷害 +10%、範圍 +10%、拾取 +20%，但生命上限 -14。起始武器：灼蝕光環。',
  sprite: 'char_h3_plague', startWeapon: 'w_aura',
  art: H3ART_plague,
  passive: (s) => {
    s.damageMult *= 1.10;
    s.area *= 1.10;
    s.pickupRange += 5;
    s.maxHp -= 14;
  },
  unlock: { type: 'gold', cost: 360 },
});

// 3) Beast-Fang — savage bruiser: harder hits + bite-back lifesteal and stronger
//    knockback, traded for thinner skin and slower shots. Orbiting claws fit the
//    melee feel. Unlocked by lifetime kills.
C({
  id: 'h3_beastfang', name: '獸牙馴者',
  desc: '傷害 +14%、吸血 +3%、擊退 +20%，但減傷 -1、射速 -6%。起始武器：環衛刃。',
  sprite: 'char_h3_beastfang', startWeapon: 'w_orbit',
  art: H3ART_beastfang,
  passive: (s) => {
    s.damageMult *= 1.14;
    s.lifesteal += 0.03;
    s.knockbackMult *= 1.20;
    s.defense -= 1;
    s.fireRateMult *= 0.94;
  },
  unlock: { type: 'achievement', condition: 'kills_3000', hint: '累計擊殺 3000 解鎖。' },
});

// 4) Dragoon — armored vanguard: tanky (HP + armor) with a couched charge, but
//    heavy and slow on foot. Pairs with the shockwave nova. Unlocked by surviving
//    a long single run.
C({
  id: 'h3_dragoon', name: '龍騎先鋒',
  desc: '生命 +26、減傷 +2，但移速 -10%、射速 -6%。起始武器：震爆波。',
  sprite: 'char_h3_dragoon', startWeapon: 'w_nova',
  art: H3ART_dragoon,
  passive: (s) => {
    s.maxHp += 26;
    s.defense += 2;
    s.speed *= 0.90;
    s.fireRateMult *= 0.94;
  },
  unlock: { type: 'achievement', condition: 'survive_480', hint: '單局存活 480 秒解鎖。' },
});
