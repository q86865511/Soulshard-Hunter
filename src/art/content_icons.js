// Icons for core talents / facilities / items / equipment.
import { defineIcon, sym } from './icons.js';
import { P, lighten, darken } from '../engine/palette.js';

// extra shape helpers --------------------------------------------------------
function flask(p, liquid, big = false) {
  p.rect(6, 2, 4, 2, P.gray4);
  p.rect(5, 3, 6, 1, P.gray3);
  const cy = big ? 9 : 9, ry = big ? 4.5 : 4;
  p.ellipse(8, cy, 3.4, ry, darken(liquid, 0.28));
  p.ellipse(8, cy, 2.6, ry - 0.8, liquid);
  p.px(6, cy - 2, lighten(liquid, 0.4));
  p.ellipse(8, cy - ry + 1, 2.4, 1, lighten(liquid, 0.2));
}
function shield(p, c) {
  for (let y = 3; y <= 12; y++) {
    const t = (y - 3) / 9;
    const w = 4.2 * (1 - t * 0.55) * (y > 9 ? (13 - y) / 3.5 : 1);
    p.hline(8 - w, 7 + w, y, t < 0.45 ? c : darken(c, 0.18));
  }
  p.hline(5, 10, 3, lighten(c, 0.25));
  p.vline(4, 9, 8, lighten(c, 0.15));
}
function staff(p, shaft, gem) {
  p.line(4, 13, 11, 3, shaft); p.line(5, 13, 12, 3, darken(shaft, 0.2));
  p.ellipse(12, 3, 2, 2, gem); p.px(12, 3, P.white);
}
function ring(p, metal, gem) {
  p.ring(8, 9, 3.2, metal); p.ring(8, 9, 2.4, darken(metal, 0.2));
  p.ellipse(8, 5, 1.6, 1.6, gem); p.px(8, 5, P.white);
}

// ---- talents ---------------------------------------------------------------
defineIcon('talent_t_damage', P.blood, (p) => sym.sword(p));
defineIcon('talent_t_firerate', P.blood, (p) => sym.bolt(p, P.emberL));
defineIcon('talent_t_crit', P.blood, (p) => { sym.ring(p, P.goldL, 4); sym.cross(p, P.gold); });
defineIcon('talent_t_hp', P.blueD, (p) => sym.heart(p, P.redL));
defineIcon('talent_t_armor', P.blueD, (p) => shield(p, P.steel));
defineIcon('talent_t_regen', P.blueD, (p) => sym.cross(p, P.greenL));
defineIcon('talent_t_speed', P.greenD, (p) => { p.hline(3, 9, 5, P.greenL); p.hline(4, 11, 8, P.toxic); p.hline(3, 8, 11, P.greenL); });
defineIcon('talent_t_pickup', P.greenD, (p) => { p.rect(4, 4, 3, 6, P.red); p.rect(9, 4, 3, 6, P.red); p.rect(4, 4, 8, 3, P.red); p.rect(4, 9, 3, 2, P.steelL); p.rect(9, 9, 3, 2, P.steelL); });
defineIcon('talent_t_dash', P.greenD, (p) => { p.hline(3, 9, 8, P.toxic); p.line(8, 5, 12, 8, P.greenL); p.line(8, 11, 12, 8, P.greenL); });
defineIcon('talent_t_gold', '#5a4a1a', (p) => sym.coin(p));
defineIcon('talent_t_luck', '#5a4a1a', (p) => sym.star(p, P.goldL));
defineIcon('talent_t_xp', '#5a4a1a', (p) => { p.rect(4, 4, 8, 9, P.bone); p.rect(4, 4, 8, 2, P.gold); p.vline(5, 12, 8, P.goldD); for (let y = 6; y <= 11; y += 2) p.hline(5, 10, y, P.goldD); });

// ---- facilities ------------------------------------------------------------
defineIcon('facility_f_shrine', P.purpleD, (p) => { p.rect(3, 11, 10, 3, P.gray2); p.vline(4, 10, 4, P.gray3); p.vline(4, 10, 11, P.gray3); p.rect(3, 4, 10, 2, P.gray3); p.ellipse(8, 8, 2, 3, P.manaL); p.px(8, 8, P.white); });
defineIcon('facility_f_bank', '#5a4a1a', (p) => { p.ellipse(5, 10, 2.5, 2, P.gold); p.ellipse(10, 10, 2.5, 2, P.gold); p.ellipse(7.5, 7, 2.5, 2, P.goldL); p.px(5, 10, P.goldD); p.px(10, 10, P.goldD); });
defineIcon('facility_f_forge', P.gray1, (p) => { p.rect(3, 9, 8, 3, P.gray3); p.rect(5, 12, 4, 2, P.gray2); p.rect(9, 8, 3, 2, P.gray4); p.line(11, 9, 13, 4, P.wood); p.rect(11, 3, 3, 2, P.steelL); });
defineIcon('facility_f_dojo', P.blood, (p) => { sym.ring(p, P.white, 4.5); sym.ring(p, P.red, 3); sym.ring(p, P.white, 1.5); p.px(8, 8, P.red); });
defineIcon('facility_f_altar', P.shardD, (p) => { p.rect(4, 11, 8, 3, P.gray2); p.rect(6, 9, 4, 2, P.gray3); sym.shardSym(p, P.shard); });
defineIcon('facility_f_arsenal', P.gray1, (p) => { p.line(4, 12, 11, 3, P.steelL); p.line(12, 12, 5, 3, P.steel); p.rect(3, 11, 3, 2, P.gold); p.rect(10, 11, 3, 2, P.gold); });

// ---- items -----------------------------------------------------------------
defineIcon('item_heal_potion', P.blood, (p) => flask(p, P.red));
defineIcon('item_big_potion', P.blood, (p) => flask(p, P.redL, true));
defineIcon('item_bomb', P.gray1, (p) => { p.ellipse(8, 10, 4, 4, P.ink2); p.ellipse(8, 10, 3, 3, P.gray2); p.px(6, 8, P.gray4); p.line(9, 6, 11, 3, P.wood); p.px(11, 2, P.emberL); p.px(12, 3, P.ember); });
defineIcon('item_magnet_scroll', '#5a4a1a', (p) => { p.rect(4, 4, 8, 8, P.bone); p.rect(3, 3, 2, 10, P.wood); p.rect(11, 3, 2, 10, P.wood); p.hline(6, 10, 6, P.woodD); p.hline(6, 10, 8, P.woodD); p.hline(6, 9, 10, P.woodD); });
defineIcon('item_frenzy_brew', '#5a3a1a', (p) => flask(p, P.ember));
defineIcon('item_shield_charm', P.blueD, (p) => shield(p, P.ice));

// ---- equipment -------------------------------------------------------------
defineIcon('equip_rapid_rod', P.blueD, (p) => staff(p, P.iron, P.ice));
defineIcon('equip_shotgun_wand', '#5a3a1a', (p) => { staff(p, P.wood, P.ember); p.px(13, 1, P.emberL); p.px(14, 4, P.emberL); p.px(11, 1, P.emberL); });
defineIcon('equip_cannon_staff', P.purpleD, (p) => { p.line(4, 13, 11, 4, P.woodD); p.ellipse(12, 4, 2.6, 2.6, P.purpleL); p.px(12, 4, P.white); });
defineIcon('equip_leather_armor', '#5a3a1a', (p) => { for (let y = 4; y <= 12; y++) { const t = (y - 4) / 8; const w = 4.5 * (1 - t * 0.3); p.hline(8 - w, 7 + w, y, t < 0.4 ? P.leather : P.woodD); } p.rect(6, 4, 4, 2, P.woodL); p.vline(5, 11, 8, P.woodL); });
defineIcon('equip_mage_robe', P.purpleD, (p) => { for (let y = 4; y <= 13; y++) { const t = (y - 4) / 9; const w = 2 + t * 3.5; p.hline(8 - w, 7 + w, y, t < 0.4 ? P.purple : P.purpleD); } p.rect(6, 4, 4, 2, P.purpleL); p.px(8, 8, P.manaL); });
defineIcon('equip_swift_ring', '#5a4a1a', (p) => ring(p, P.gold, P.shardL));
defineIcon('equip_vamp_amulet', P.blood, (p) => { p.line(5, 3, 8, 7, P.gold); p.line(11, 3, 8, 7, P.gold); sym.drop(p, P.red); });

export const CONTENT_ICONS_READY = true;
