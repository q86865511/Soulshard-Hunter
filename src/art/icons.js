// Procedural 16x16 icons for abilities / items / equipment.
// Convention: ability icons are named `ability_<id>`, items `item_<id>`,
// equipment `equip_<id>`. Workflow content follows the same naming.
import { defineSprite } from '../engine/sprites.js';
import { P, darken, lighten } from '../engine/palette.js';

export function panel(p, bg) {
  p.rect(2, 1, 12, 14, darken(bg, 0.4));
  p.rect(1, 2, 14, 12, darken(bg, 0.4));
  p.rect(2, 2, 12, 12, bg);
  p.rect(3, 2, 10, 2, lighten(bg, 0.2));
  p.rect(2, 12, 12, 2, darken(bg, 0.18));
}

export function defineIcon(name, bg, draw) {
  defineSprite(name, 16, 16, (p) => { panel(p, bg); draw(p); p.outline(P.ink); }, { anchor: [8, 8] });
}

// shared symbol primitives ---------------------------------------------------
export const sym = {
  heart(p, c = P.red, ox = 0, oy = 0) {
    p.ellipse(6 + ox, 6 + oy, 1.6, 1.6, c); p.ellipse(9 + ox, 6 + oy, 1.6, 1.6, c);
    for (let y = 6; y <= 10; y++) { const w = 3.4 - (y - 6) * 0.8; p.hline(7.5 + ox - w, 7.5 + ox + w, y + oy, c); }
    p.px(5 + ox, 5 + oy, lighten(c, 0.4));
  },
  bolt(p, c = P.emberL) {
    p.line(9, 3, 6, 8, c); p.line(7, 3, 5, 8, c); p.hline(5, 8, 8, c);
    p.line(8, 8, 5, 13, c); p.line(9, 8, 6, 13, c); p.px(8, 8, P.white);
  },
  sword(p) {
    p.vline(3, 10, 7, P.steel); p.vline(3, 10, 8, P.steelL); p.px(7, 2, P.white); p.px(8, 2, P.white);
    p.hline(5, 10, 11, P.gold); p.vline(11, 13, 7, P.woodL); p.vline(11, 13, 8, P.woodL);
  },
  star(p, c = P.goldL) {
    p.vline(3, 12, 8, c); p.hline(3, 12, 8, c); p.line(5, 5, 11, 11, c); p.line(11, 5, 5, 11, c); p.px(8, 8, P.white);
  },
  ring(p, c, r = 4) { p.ring(8, 8, r, c); p.ring(8, 8, r - 0.6, c); },
  coin(p) { p.ellipse(8, 8, 4, 4, P.goldD); p.ellipse(8, 8, 3, 3, P.gold); p.vline(6, 10, 8, P.goldD); p.px(7, 6, P.goldL); },
  cross(p, c) { p.rect(7, 3, 2, 10, c); p.rect(3, 7, 10, 2, c); p.px(8, 8, lighten(c, 0.3)); },
  chevrons(p, c) { p.line(5, 4, 9, 8, c); p.line(9, 8, 5, 12, c); p.line(8, 4, 12, 8, c); p.line(12, 8, 8, 12, c); },
  drop(p, c) { p.ellipse(8, 9, 2.4, 3, c); p.line(8, 4, 6, 8, c); p.line(8, 4, 10, 8, c); p.px(7, 8, lighten(c, 0.4)); },
  shardSym(p, c = P.shard) { p.ellipse(8, 8, 2.6, 4.4, darken(c, 0.2)); p.ellipse(8, 8, 1.6, 3.4, c); p.vline(4, 12, 8, lighten(c, 0.3)); },
  spikes(p, c) { for (let i = 0; i < 3; i++) { const x = 4 + i * 4; p.line(x, 12, x + 2, 4, c); p.line(x + 4, 12, x + 2, 4, c); } },
};

// ---- core ability icons ----------------------------------------------------
defineIcon('ability_power', P.blood, (p) => sym.sword(p));
defineIcon('ability_haste', '#5a4a1a', (p) => sym.bolt(p, P.emberL));
defineIcon('ability_swift', P.blueD, (p) => { p.hline(3, 9, 5, P.ice); p.hline(4, 11, 8, P.iceD); p.hline(3, 8, 11, P.ice); });
defineIcon('ability_vitality', P.blood, (p) => sym.heart(p, P.red));
defineIcon('ability_crit', '#5a4a1a', (p) => { sym.ring(p, P.goldL, 4); sym.cross(p, P.gold); });
defineIcon('ability_multishot', P.greenD, (p) => { for (let i = 0; i < 3; i++) { p.ellipse(5 + i * 3, 5 + i * 2, 1.4, 1.4, P.greenL); } p.line(4, 11, 12, 5, P.green); });
defineIcon('ability_pierce', P.steelD, (p) => { p.hline(3, 12, 8, P.steelL); p.line(9, 5, 12, 8, P.steelL); p.line(9, 11, 12, 8, P.steelL); p.rect(5, 6, 2, 5, P.iron); });
defineIcon('ability_velocity', P.blueD, (p) => sym.chevrons(p, P.blueL));
defineIcon('ability_magnet', P.steelD, (p) => { p.rect(4, 4, 3, 7, P.red); p.rect(9, 4, 3, 7, P.red); p.rect(4, 4, 8, 3, P.red); p.rect(4, 10, 3, 2, P.steelL); p.rect(9, 10, 3, 2, P.steelL); });
defineIcon('ability_greed', '#5a4a1a', (p) => sym.coin(p));
defineIcon('ability_regen', P.greenD, (p) => sym.cross(p, P.greenL));
defineIcon('ability_lifesteal', P.blood, (p) => { sym.heart(p, P.redD); sym.drop(p, P.redL); });
defineIcon('ability_homing', P.purpleD, (p) => { p.ring(8, 8, 4, P.purpleL); p.ring(8, 8, 2.2, P.manaL); p.line(8, 8, 12, 4, P.manaL); p.px(12, 4, P.white); });
defineIcon('ability_bigshot', P.shardD, (p) => sym.shardSym(p, P.shard));
defineIcon('ability_glasscannon', P.purpleD, (p) => { sym.shardSym(p, P.purpleL); p.line(7, 4, 9, 12, P.ink); });
defineIcon('ability_orbit', P.shardD, (p) => { p.ring(8, 8, 4.5, P.shardL); p.ellipse(8, 3.5, 1.4, 1.4, P.white); p.ellipse(8, 12.5, 1.4, 1.4, P.shardL); });
defineIcon('ability_nova', '#5a2a1a', (p) => sym.star(p, P.emberL));
defineIcon('ability_thorns', P.greenD, (p) => sym.spikes(p, P.bone));
defineIcon('ability_dash', P.blueD, (p) => { p.hline(3, 10, 8, P.iceD); p.line(8, 5, 12, 8, P.ice); p.line(8, 11, 12, 8, P.ice); });
defineIcon('ability_luck', P.greenD, (p) => sym.star(p, P.greenL));

// cursed abilities — dark crimson panel + an ominous mark
defineIcon('ability_curse_bloodpact', '#2a0e16', (p) => { sym.drop(p, P.red); p.px(8, 4, P.redL); p.ring(8, 8, 5, P.blood); });
defineIcon('ability_curse_frenzy', '#2a0e16', (p) => { sym.bolt(p, P.redL); p.ring(8, 8, 5, P.blood); });
defineIcon('ability_curse_titan', '#2a0e16', (p) => { sym.sword(p); p.vline(3, 12, 8, P.redD); });
defineIcon('ability_curse_glasssoul', '#2a0e16', (p) => { sym.shardSym(p, P.redL); p.line(7, 4, 9, 12, P.ink); });
defineIcon('ability_curse_greedpact', '#2a0e16', (p) => { sym.coin(p); p.px(8, 3, P.red); p.ring(8, 8, 5, P.blood); });

export const ICONS_READY = true;
