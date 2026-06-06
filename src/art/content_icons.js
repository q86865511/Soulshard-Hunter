// Icons for core talents / facilities / items / equipment.
// ENHANCED EDITION (art_v2): same names / sizes / anchors / exports as the
// original — every defineIcon key is a hard contract. The DRAW BODIES are
// rebuilt to read like shiny RPG inventory icons: top-left light source, 3–4
// tonal steps per material, gradient fills, metallic sheen, gem/potion glow,
// rim light + kira sparkles. Local flask/shield/staff/ring helpers gained richer
// shading but keep their original signatures so callers are unaffected.
import { defineIcon, sym } from './icons.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ── shared micro-helpers (local, additive) ──────────────────────────────────
// A tiny specular pop: bright core + soft glow, the inventory "shine" beat.
function shine(p, x, y, col = P.glint, r = 1.4) {
  p.glow(x, y, r, col, 0.45, 3);
  p.px(x, y, P.glint);
}
// Faceted gem: dark rim, bright core, a glint, and a soft outer glow.
function gem(p, cx, cy, r, col, glowS = 0.5) {
  p.glow(cx, cy, r + 1.4, col, glowS, 4);
  p.ellipse(cx, cy, r, r, darken(col, 0.28));
  p.ellipse(cx, cy, r - 0.7, r - 0.7, col);
  p.ellipse(cx - 0.4, cy - 0.6, r * 0.45, r * 0.45, lighten(col, 0.45));
  p.px(cx - Math.round(r * 0.4), cy - Math.round(r * 0.4), P.glint);
}

// ── extra shape helpers (original signatures preserved) ──────────────────────
function flask(p, liquid, big = false) {
  const cy = big ? 9 : 9, ry = big ? 4.5 : 4;
  // glass body — faint cool tint so the bottle reads as glass
  p.ellipse(8, cy, 3.8, ry + 0.4, withAlpha(P.hiSky, 0.18));
  // liquid: dark base + gradient core + bright meniscus + bubbles
  p.ellipse(8, cy, 3.4, ry, darken(liquid, 0.34));
  p.ellipse(8, cy, 2.7, ry - 0.6, liquid);
  p.ellipse(8, cy + 0.8, 2.4, ry - 1.4, lighten(liquid, 0.18));
  p.ellipse(8, cy - ry + 1, 2.4, 1, lighten(liquid, 0.35)); // surface sheen
  p.px(6, cy - 1, lighten(liquid, 0.55));                   // bubble
  p.px(9, cy + 1, lighten(liquid, 0.3));
  // glass vertical highlight stripe
  p.vline(cy - ry + 1, cy + ry - 1, 6, withAlpha(P.white, 0.35));
  // neck + cork
  p.rect(6, 3, 4, 1, withAlpha(P.white, 0.25));
  p.rect(6, 2, 4, 2, P.gray4);
  p.rect(6, 2, 4, 1, lighten(P.gray4, 0.3));
  p.rect(5, 3, 6, 1, P.gray3);
  shine(p, 6, cy - 2, P.glint, 1.1);
}
function shield(p, c) {
  for (let y = 3; y <= 12; y++) {
    const t = (y - 3) / 9;
    const w = 4.2 * (1 - t * 0.55) * (y > 9 ? (13 - y) / 3.5 : 1);
    // vertical metal gradient: brighter up top, darker at the point
    const col = mix(lighten(c, 0.22), darken(c, 0.26), t);
    p.hline(8 - w, 7 + w, y, col);
  }
  // top bevel + boss + left sheen
  p.hline(5, 10, 3, lighten(c, 0.4));
  p.hline(5, 10, 4, lighten(c, 0.2));
  p.vline(4, 9, 8, lighten(c, 0.18));   // left rim light
  p.ellipse(8, 7, 1.4, 1.6, lighten(c, 0.3));
  p.px(7, 6, P.glint);                  // central rivet glint
  p.px(5, 4, P.rim);
}
function staff(p, shaft, gem) {
  p.line(4, 13, 11, 3, darken(shaft, 0.25));
  p.line(5, 13, 12, 3, shaft);
  p.line(4, 13, 11, 3, lighten(shaft, 0.2)); // top-left lit edge
  // crowning gem
  p.glow(12, 3, 3.4, gem, 0.55, 4);
  p.ellipse(12, 3, 2, 2, darken(gem, 0.2));
  p.ellipse(12, 3, 1.4, 1.4, gem);
  p.px(11, 2, lighten(gem, 0.5));
  p.px(12, 3, P.white);
}
function ring(p, metal, gemc) {
  p.ring(8, 9, 3.2, darken(metal, 0.2));
  p.ring(8, 9, 2.6, metal);
  // top-left lit arc of the band
  p.px(6, 7, lighten(metal, 0.45));
  p.px(5, 9, lighten(metal, 0.25));
  p.px(7, 6, lighten(metal, 0.3));
  // mounted gem up top
  p.glow(8, 5, 2.6, gemc, 0.5, 3);
  p.ellipse(8, 5, 1.7, 1.7, darken(gemc, 0.22));
  p.ellipse(8, 5, 1.1, 1.1, gemc);
  p.px(7, 4, P.glint);
}

// ---- talents ---------------------------------------------------------------
defineIcon('talent_t_damage', P.blood, (p) => {
  p.glow(8, 8, 6, P.redL, 0.18, 3);
  sym.sword(p);
  // hot blade edge sheen + tip kira
  p.px(3, 2, P.glint); p.px(4, 3, P.steelL);
  p.star4(8, 2, 2, P.rim, P.glint);
});
defineIcon('talent_t_firerate', P.blood, (p) => {
  p.glow(8, 8, 6, P.ember, 0.22, 3);
  sym.bolt(p, P.emberL);
  p.px(6, 8, P.white);
  p.sparkle(11, 4, P.holyL, 1);
});
defineIcon('talent_t_crit', P.blood, (p) => {
  p.glow(8, 8, 6, P.goldL, 0.22, 3);
  sym.ring(p, P.goldL, 4);
  sym.cross(p, P.gold);
  p.px(8, 8, P.glint);
  p.star4(8, 8, 3, P.holyL, P.glint);
});
defineIcon('talent_t_hp', P.blueD, (p) => {
  p.glow(8, 7, 6, P.redL, 0.2, 3);
  sym.heart(p, P.redL);
  p.px(5, 5, P.white); p.px(6, 5, withAlpha(P.white, 0.6));
  p.sparkle(11, 9, P.sakuraL, 1);
});
defineIcon('talent_t_armor', P.blueD, (p) => { shield(p, P.steel); p.rimLight(P.rimCool, 0.5); });
defineIcon('talent_t_regen', P.blueD, (p) => {
  p.glow(8, 8, 6, P.greenL, 0.22, 3);
  sym.cross(p, P.greenL);
  p.px(8, 8, P.white);
  p.sparkle(12, 4, P.toxic, 1);
});
defineIcon('talent_t_speed', P.greenD, (p) => {
  p.glow(7, 8, 6, P.toxic, 0.18, 3);
  p.hline(3, 9, 5, lighten(P.greenL, 0.2));
  p.hline(4, 11, 8, P.toxic);
  p.hline(3, 8, 11, lighten(P.greenL, 0.2));
  p.hline(3, 7, 6, withAlpha(P.greenL, 0.5));
  p.px(9, 5, P.white); p.px(11, 8, P.white); p.px(8, 11, P.white);
});
defineIcon('talent_t_pickup', P.greenD, (p) => {
  // glossy red horseshoe magnet + steel poles
  p.rect(4, 4, 3, 6, darken(P.red, 0.2)); p.rect(9, 4, 3, 6, darken(P.red, 0.2));
  p.rect(4, 4, 3, 6, P.red); p.rect(9, 4, 3, 6, P.red);
  p.rect(4, 4, 8, 3, P.red);
  p.vline(4, 6, 4, P.redL); p.vline(4, 6, 9, P.redL); // left sheen on each arm
  p.rect(4, 9, 3, 2, P.steelL); p.rect(9, 9, 3, 2, P.steelL);
  p.px(5, 9, P.white); p.px(10, 9, P.white);
  p.glow(8, 12, 3, P.neonL, 0.3, 3); // magnetic field hum at the gap
});
defineIcon('talent_t_dash', P.greenD, (p) => {
  p.glow(6, 8, 5, P.toxic, 0.2, 3);
  p.hline(2, 9, 8, withAlpha(P.toxic, 0.5));
  p.hline(3, 9, 8, P.toxic);
  p.line(8, 5, 12, 8, P.greenL); p.line(8, 11, 12, 8, P.greenL);
  p.px(12, 8, P.white);
});
defineIcon('talent_t_gold', '#5a4a1a', (p) => {
  p.glow(8, 8, 6, P.goldL, 0.22, 3);
  sym.coin(p);
  p.px(6, 6, P.glint);
  p.star4(11, 5, 2, P.holyL, P.glint);
});
defineIcon('talent_t_luck', '#5a4a1a', (p) => {
  p.glow(8, 8, 6, P.goldL, 0.24, 3);
  sym.star(p, P.goldL);
  p.px(8, 8, P.glint);
  p.sparkle(12, 11, P.holyL, 1); p.sparkle(4, 4, P.holyL, 1);
});
defineIcon('talent_t_xp', '#5a4a1a', (p) => {
  // bound tome with gilded spine + glowing rune lines
  p.rect(4, 4, 8, 9, darken(P.bone, 0.2));
  p.rect(4, 4, 8, 9, P.bone);
  p.rect(4, 4, 8, 1, P.white);            // top page sheen
  p.rect(4, 4, 8, 2, P.gold); p.rect(4, 4, 8, 1, P.goldL);
  p.vline(4, 12, 4, P.goldD); p.vline(4, 12, 5, P.gold);
  for (let y = 6; y <= 11; y += 2) p.hline(6, 10, y, withAlpha(P.shard, 0.85));
  p.px(11, 12, P.goldD);
  p.star4(11, 5, 2, P.shardL, P.glint);
});

// ---- facilities ------------------------------------------------------------
defineIcon('facility_f_shrine', P.purpleD, (p) => {
  // stone pillars + floating mana orb
  p.rect(3, 11, 10, 3, darken(P.gray2, 0.1)); p.rect(3, 11, 10, 1, P.gray3);
  p.vline(4, 10, 4, P.gray3); p.vline(4, 10, 11, P.gray3);
  p.vline(4, 10, 4, P.gray4); // left pillar lit edge
  p.rect(3, 4, 10, 2, P.gray3); p.rect(3, 4, 10, 1, P.gray4);
  p.glow(8, 8, 4, P.manaL, 0.5, 4);
  p.ellipse(8, 8, 2, 3, P.mana);
  p.ellipse(8, 7.4, 1.2, 1.8, P.manaL);
  p.px(7, 7, P.white);
  p.star4(8, 8, 2, P.astralL, P.white);
});
defineIcon('facility_f_bank', '#5a4a1a', (p) => {
  // glossy coin stack with glow
  p.glow(7.5, 8, 6, P.goldL, 0.2, 3);
  p.ellipse(5, 10, 2.6, 2.1, P.goldD); p.ellipse(5, 9.4, 2.5, 1.9, P.gold);
  p.ellipse(10, 10, 2.6, 2.1, P.goldD); p.ellipse(10, 9.4, 2.5, 1.9, P.gold);
  p.ellipse(7.5, 7, 2.6, 2.1, P.goldD); p.ellipse(7.5, 6.4, 2.5, 1.9, P.goldL);
  p.px(6.5, 6, P.white); p.px(4, 9, lighten(P.gold, 0.3)); p.px(9, 9, lighten(P.gold, 0.3));
  p.star4(7.5, 6, 2, P.holyL, P.glint);
});
defineIcon('facility_f_forge', P.gray1, (p) => {
  // anvil + glowing molten ingot + hammer
  p.rect(3, 9, 8, 3, darken(P.gray3, 0.15)); p.rect(3, 9, 8, 1, P.gray4);
  p.rect(5, 12, 4, 2, P.gray2);
  p.glow(10, 9, 3, P.ember, 0.45, 3);
  p.rect(9, 8, 3, 2, P.emberL); p.px(10, 8, P.white); // hot ingot
  p.line(11, 9, 13, 4, P.wood); p.line(11, 9, 13, 4, lighten(P.wood, 0.2));
  p.rect(11, 3, 3, 2, P.steelL); p.rect(11, 3, 3, 1, P.white);
  p.sparkle(8, 7, P.emberL, 1); p.px(7, 6, P.ember);
});
defineIcon('facility_f_dojo', P.blood, (p) => {
  // crisp target with concentric rings + kira center
  p.glow(8, 8, 6, P.redL, 0.16, 3);
  sym.ring(p, P.white, 4.5); sym.ring(p, P.red, 3); sym.ring(p, P.white, 1.5);
  p.px(8, 8, P.red);
  p.star4(8, 8, 3, P.holyL, P.white);
  p.px(5, 5, P.rim);
});
defineIcon('facility_f_altar', P.shardD, (p) => {
  p.rect(4, 11, 8, 3, darken(P.gray2, 0.1)); p.rect(4, 11, 8, 1, P.gray3);
  p.rect(6, 9, 4, 2, P.gray3); p.rect(6, 9, 4, 1, P.gray4);
  p.glow(8, 6, 4, P.shardL, 0.5, 4);
  sym.shardSym(p, P.shard);
  p.px(7, 5, P.white);
  p.star4(8, 6, 2, P.shardL, P.glint);
});
defineIcon('facility_f_arsenal', P.gray1, (p) => {
  // crossed glinting blades + gold pommels
  p.line(4, 12, 11, 3, P.steel); p.line(4, 12, 11, 3, P.steelL);
  p.line(12, 12, 5, 3, P.steelD); p.line(12, 12, 5, 3, P.steel);
  p.px(11, 3, P.white); p.px(5, 3, P.white);
  p.rect(3, 11, 3, 2, P.gold); p.rect(3, 11, 3, 1, P.goldL);
  p.rect(10, 11, 3, 2, P.gold); p.rect(10, 11, 3, 1, P.goldL);
  p.sparkle(8, 7, P.glint, 1);
});

// ---- items -----------------------------------------------------------------
defineIcon('item_heal_potion', P.blood, (p) => { p.glow(8, 9, 6, P.redL, 0.18, 3); flask(p, P.red); });
defineIcon('item_big_potion', P.blood, (p) => { p.glow(8, 9, 7, P.redL, 0.24, 4); flask(p, P.redL, true); p.star4(11, 5, 2, P.holyL, P.glint); });
defineIcon('item_bomb', P.gray1, (p) => {
  p.softShadow(8, 14, 4, 1.2, 0.35);
  p.ellipse(8, 10, 4, 4, P.ink2);
  p.ellipse(8, 10, 3.3, 3.3, P.gray1);
  p.ellipse(7, 9, 2, 2, P.gray2);
  p.ellipse(6.4, 8.4, 1, 1, P.gray4); // glossy highlight
  p.px(6, 8, P.white);
  p.rect(7, 5, 2, 1, P.gray4);         // fuse cap
  p.line(9, 6, 11, 3, P.wood);
  p.glow(12, 3, 2.6, P.ember, 0.6, 3);
  p.px(11, 2, P.emberL); p.px(12, 3, P.holyL); p.px(13, 2, P.ember);
});
defineIcon('item_magnet_scroll', '#5a4a1a', (p) => {
  // aged parchment with rolled ends + glowing rune
  p.rect(4, 4, 8, 8, darken(P.bone, 0.12)); p.rect(4, 4, 8, 8, P.bone);
  p.rect(4, 4, 8, 1, P.white);
  p.rect(3, 3, 2, 10, P.wood); p.rect(3, 3, 1, 10, P.woodL);
  p.rect(11, 3, 2, 10, P.wood); p.rect(12, 3, 1, 10, P.woodD);
  p.hline(6, 10, 6, P.woodD); p.hline(6, 10, 8, P.woodD); p.hline(6, 9, 10, P.woodD);
  p.glow(8, 8, 3, P.shard, 0.35, 3);
  p.px(8, 8, P.shardL); p.star4(10, 5, 2, P.shardL, P.glint);
});
defineIcon('item_frenzy_brew', '#5a3a1a', (p) => { p.glow(8, 9, 6, P.ember, 0.2, 3); flask(p, P.ember); p.sparkle(11, 5, P.holyL, 1); });
defineIcon('item_shield_charm', P.blueD, (p) => { p.glow(8, 8, 6, P.ice, 0.2, 3); shield(p, P.ice); p.rimLight(P.rimCool, 0.5); p.star4(8, 4, 2, P.hiSky, P.glint); });

// ---- equipment -------------------------------------------------------------
defineIcon('equip_rapid_rod', P.blueD, (p) => { p.glow(12, 3, 5, P.ice, 0.22, 3); staff(p, P.iron, P.ice); p.rimLight(P.rimCool, 0.45); });
defineIcon('equip_shotgun_wand', '#5a3a1a', (p) => {
  p.glow(12, 3, 5, P.ember, 0.24, 3);
  staff(p, P.wood, P.ember);
  p.sparkle(13, 1, P.emberL, 1); p.px(14, 4, P.holyL); p.px(11, 1, P.emberL);
  p.rimLight(P.rim, 0.4);
});
defineIcon('equip_cannon_staff', P.purpleD, (p) => {
  p.line(4, 13, 11, 4, darken(P.wood, 0.2)); p.line(4, 13, 11, 4, P.wood);
  p.line(4, 13, 11, 4, lighten(P.wood, 0.18));
  p.glow(12, 4, 4.2, P.purpleL, 0.6, 4);
  p.ellipse(12, 4, 2.6, 2.6, darken(P.purple, 0.15));
  p.ellipse(12, 4, 1.8, 1.8, P.purpleL);
  p.px(11, 3, P.white); p.px(12, 4, P.white);
  p.star4(12, 4, 3, P.astralL, P.glint);
});
defineIcon('equip_leather_armor', '#5a3a1a', (p) => {
  for (let y = 4; y <= 12; y++) {
    const t = (y - 4) / 8;
    const w = 4.5 * (1 - t * 0.3);
    const col = mix(lighten(P.leather, 0.16), P.woodD, t);
    p.hline(8 - w, 7 + w, y, col);
  }
  p.rect(6, 4, 4, 2, P.woodL); p.rect(6, 4, 4, 1, lighten(P.woodL, 0.25)); // collar
  p.vline(5, 11, 8, lighten(P.leather, 0.3)); // center seam sheen
  p.vline(4, 10, 5, withAlpha(P.woodL, 0.5));  // left rim
  p.px(5, 5, P.rim);
  p.px(7, 9, withAlpha(P.white, 0.3)); // stitch glint
});
defineIcon('equip_mage_robe', P.purpleD, (p) => {
  for (let y = 4; y <= 13; y++) {
    const t = (y - 4) / 9;
    const w = 2 + t * 3.5;
    const col = mix(lighten(P.purple, 0.18), P.purpleD, t);
    p.hline(8 - w, 7 + w, y, col);
  }
  p.rect(6, 4, 4, 2, P.purpleL); p.rect(6, 4, 4, 1, lighten(P.purpleL, 0.3)); // hood trim
  p.vline(5, 12, 5, withAlpha(P.purpleL, 0.5)); // left flowing sheen
  p.glow(8, 8, 3, P.manaL, 0.45, 3);
  p.px(8, 8, P.white);
  p.star4(8, 8, 2, P.astralL, P.glint);
  p.px(5, 5, P.rimCool);
});
defineIcon('equip_swift_ring', '#5a4a1a', (p) => { p.glow(8, 5, 5, P.shardL, 0.24, 3); ring(p, P.gold, P.shardL); p.star4(8, 5, 2, P.shardL, P.glint); });
defineIcon('equip_vamp_amulet', P.blood, (p) => {
  // gold chain + glowing blood gem pendant
  p.line(5, 3, 8, 7, P.goldD); p.line(5, 3, 8, 7, P.gold);
  p.line(11, 3, 8, 7, P.goldD); p.line(11, 3, 8, 7, P.gold);
  p.px(5, 3, P.goldL); p.px(11, 3, P.goldL);
  p.glow(8, 9, 4, P.redL, 0.5, 4);
  sym.drop(p, P.red);
  p.ellipse(8, 9, 1, 1.4, P.redL);
  p.px(7, 8, P.white);
  p.star4(8, 9, 2, P.sakuraL, P.glint);
});

export const CONTENT_ICONS_READY = true;
