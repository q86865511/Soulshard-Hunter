// Procedural 16x16 icons for abilities / items / equipment.
// Convention: ability icons are named `ability_<id>`, items `item_<id>`,
// equipment `equip_<id>`. Workflow content follows the same naming.
//
// ENHANCED EDITION (art_v2): drop-in replacement.
//   • panel()  — rounded bevel, top sheen, inner vignette, corner studs.
//   • sym.*    — same call signatures, but crisper, 3-4 tonal steps, soft glow
//                cores and a tiny specular glint each.
//   • defineIcon() — adds a subtle rim-light pass + one "kira" glint per icon
//                so every ability reads with anime pop while staying 16x16.
// All exported symbols, names, sizes, anchors and import paths are unchanged.
import { defineSprite } from '../engine/sprites.js';
import { P, darken, lighten, mix, withAlpha } from '../engine/palette.js';

// ── panel: framed plaque the symbol sits on ────────────────────────────────
// Signature kept exactly: panel(p, bg). Now with a rounded bevel, a glossy top
// sheen, an inner vignette to push the symbol forward, and tiny corner studs.
export function panel(p, bg) {
  const edge = darken(bg, 0.42);
  const edgeHi = mix(bg, P.ink, 0.5);
  const topHi = lighten(bg, 0.26);
  const botSh = darken(bg, 0.22);

  // dark rounded outer frame (corners clipped for a soft plaque shape)
  p.rect(2, 1, 12, 14, edge);
  p.rect(1, 2, 14, 12, edge);
  p.px(2, 2, P.ink); p.px(13, 2, P.ink); p.px(2, 13, P.ink); p.px(13, 13, P.ink);

  // body as a soft vertical gradient (lit top -> shaded bottom)
  p.gradV(2, 2, 12, 12, lighten(bg, 0.08), botSh);
  p.rect(2, 2, 1, 1, edgeHi); p.rect(13, 2, 1, 1, edgeHi); // re-soften corners
  p.rect(2, 13, 1, 1, edgeHi); p.rect(13, 13, 1, 1, edgeHi);

  // inner vignette — darker rim, brighter centre, so the symbol pops
  p.rectLine(3, 3, 10, 10, darken(bg, 0.12));
  p.rect(5, 5, 6, 6, lighten(bg, 0.05));

  // glossy top sheen (a couple of bright rows fading down) + a diagonal glint
  p.rect(3, 2, 10, 1, topHi);
  p.rect(3, 3, 9, 1, mix(topHi, bg, 0.5));
  p.px(4, 2, P.white); p.px(5, 2, lighten(bg, 0.4));

  // grounded bottom shade
  p.rect(3, 12, 10, 1, botSh);
  p.rect(3, 13, 9, 1, darken(bg, 0.34));

  // little corner rivets/studs for a crafted look
  p.px(3, 3, lighten(bg, 0.3)); p.px(12, 3, lighten(bg, 0.3));
  p.px(3, 12, darken(bg, 0.3)); p.px(12, 12, darken(bg, 0.3));
}

// defineIcon(name, bg, draw) — signature kept exactly (16x16, anchor [8,8]).
// Adds a gentle rim-light on the symbol edges and a single kira glint so the
// art feels lit and "anime" without changing any contract.
export function defineIcon(name, bg, draw) {
  defineSprite(name, 16, 16, (p) => {
    panel(p, bg);
    draw(p);
    p.rimLight(P.rim, 0.4, -1, -1);
    p.outline(P.ink);
    // top-left kira glint sits over the finished icon as a final flourish
    p.star4(4, 4, 2, withAlpha(P.glint, 0.9), P.white);
  }, { anchor: [8, 8] });
}

// shared symbol primitives ---------------------------------------------------
// Every method keeps its ORIGINAL call signature. Internals upgraded with
// core + shadow + light + specular steps and a soft glow where it sells.
export const sym = {
  heart(p, c = P.red, ox = 0, oy = 0) {
    const dk = darken(c, 0.28), lt = lighten(c, 0.32), hi = lighten(c, 0.5);
    p.glow(7.5 + ox, 7.5 + oy, 5, c, 0.22, 3); // soft outer bloom
    // body
    p.ellipse(6 + ox, 6 + oy, 1.8, 1.8, c); p.ellipse(9 + ox, 6 + oy, 1.8, 1.8, c);
    for (let y = 6; y <= 10; y++) { const w = 3.6 - (y - 6) * 0.85; p.hline(7.5 + ox - w, 7.5 + ox + w, y + oy, c); }
    // bottom-right shadow lobe + tip
    p.ellipse(9 + ox, 6.4 + oy, 1.6, 1.6, mix(c, dk, 0.45));
    p.hline(7.2 + ox, 8.4 + ox, 9 + oy, dk); p.px(7.5 + ox, 10 + oy, dk);
    // top-left lit lobe + specular glint
    p.ellipse(5.6 + ox, 5.4 + oy, 1.3, 1.3, lt);
    p.px(5 + ox, 5 + oy, hi); p.px(6 + ox, 5 + oy, lighten(c, 0.4));
    p.px(5 + ox, 4 + oy, P.white);
  },
  bolt(p, c = P.emberL) {
    const dk = darken(c, 0.3);
    p.glow(7, 8, 4.5, c, 0.22, 3);
    // shadow underlay (offset) for thickness
    p.line(9, 4, 6, 9, dk); p.hline(5, 8, 9, dk); p.line(8, 9, 5, 14, dk);
    // main bolt
    p.line(9, 3, 6, 8, c); p.line(7, 3, 5, 8, c); p.hline(5, 8, 8, c);
    p.line(8, 8, 5, 13, c); p.line(9, 8, 6, 13, c);
    // bright core highlight
    p.px(8, 8, P.white); p.px(7, 6, lighten(c, 0.4)); p.px(7, 10, lighten(c, 0.4));
  },
  sword(p) {
    // blade with edge highlight + central fuller
    p.vline(2, 11, 7, P.steelD);
    p.vline(2, 11, 8, P.steel);
    p.vline(2, 10, 9, P.steelL);
    p.px(7, 2, P.white); p.px(8, 2, P.steelL); p.px(9, 3, P.glint); // tip glint
    // guard (gold, lit top)
    p.hline(5, 10, 11, P.gold); p.hline(5, 10, 10, P.goldL); p.px(5, 11, P.goldD); p.px(10, 11, P.goldD);
    // grip + pommel
    p.vline(12, 13, 7, P.woodL); p.vline(12, 13, 8, P.wood); p.px(7.5, 14, P.goldL);
  },
  star(p, c = P.goldL) {
    const dk = darken(c, 0.3);
    p.glow(8, 8, 4.5, c, 0.2, 3);
    // 4-spoke star with thicker shaded base then bright arms
    p.vline(3, 12, 8, dk); p.hline(3, 12, 8, dk);
    p.vline(3, 12, 8, c); p.hline(3, 12, 8, c);
    p.line(5, 5, 11, 11, mix(c, dk, 0.4)); p.line(11, 5, 5, 11, mix(c, dk, 0.4));
    p.px(8, 8, P.white); p.px(7, 7, lighten(c, 0.5));
  },
  ring(p, c, r = 4) {
    const dk = darken(c, 0.3), lt = lighten(c, 0.35);
    p.ring(8, 8, r + 0.4, dk);
    p.ring(8, 8, r, c); p.ring(8, 8, r - 0.6, c);
    // top-left lit arc + a glint
    p.px(8 - Math.round(r * 0.7), 8 - Math.round(r * 0.7), lt);
    p.px(8 - Math.round(r * 0.5), 8 - Math.round(r * 0.8), P.glint);
  },
  coin(p) {
    p.glow(8, 8, 4.5, P.gold, 0.18, 3);
    p.ellipse(8, 8, 4, 4, P.goldD);
    p.ellipse(8, 8, 3.4, 3.4, P.gold);
    p.ellipse(7.4, 7.2, 2.2, 2.2, P.goldL); // lit upper-left face
    p.ellipse(8, 8, 2.4, 2.4, P.gold);
    p.vline(6, 10, 8, P.goldD); // engraving
    p.px(7, 6, P.white); p.px(6, 6, lighten(P.goldL, 0.3)); // specular
    p.px(10, 10, P.goldD);
  },
  cross(p, c) {
    const dk = darken(c, 0.28), lt = lighten(c, 0.35);
    p.glow(8, 8, 4, c, 0.18, 3);
    p.rect(7, 3, 2, 10, c); p.rect(3, 7, 10, 2, c);
    p.vline(3, 12, 7, lt); p.hline(3, 12, 7, lt); // lit top/left arms
    p.vline(3, 12, 9, dk); p.hline(3, 12, 9, dk); // shaded bottom/right
    p.px(8, 8, P.white); p.rect(7, 7, 2, 2, lighten(c, 0.3));
  },
  chevrons(p, c) {
    const dk = darken(c, 0.3), lt = lighten(c, 0.35);
    // motion-trail double chevron with lit leading edge
    p.line(5, 4, 9, 8, dk); p.line(9, 8, 5, 12, dk);
    p.line(8, 4, 12, 8, c); p.line(12, 8, 8, 12, c);
    p.line(8, 4, 11, 7, lt);
    p.px(12, 8, P.glint);
  },
  drop(p, c) {
    const dk = darken(c, 0.3), lt = lighten(c, 0.4);
    p.glow(8, 9, 4, c, 0.2, 3);
    p.ellipse(8, 9, 2.6, 3.2, c);
    p.line(8, 4, 6, 8, c); p.line(8, 4, 10, 8, c);
    p.ellipse(8.8, 9.6, 1.4, 1.6, mix(c, dk, 0.5)); // lower-right shadow
    p.px(7, 8, lt); p.ellipse(7, 8, 1, 1, lt); // upper-left highlight
    p.px(6.6, 7.4, P.white); // catch-light
  },
  shardSym(p, c = P.shard) {
    const dk = darken(c, 0.28), lt = lighten(c, 0.4);
    p.glow(8, 8, 5, c, 0.24, 3); // crystal bloom
    p.ellipse(8, 8, 2.8, 4.6, dk);
    p.ellipse(8, 8, 1.9, 3.6, c);
    p.vline(4, 12, 7, lt); // lit left facet
    p.vline(5, 11, 9, mix(c, dk, 0.4)); // right facet shadow
    p.px(7, 5, P.white); p.px(7, 6, lt); // top facet glint
  },
  spikes(p, c) {
    const dk = darken(c, 0.3), lt = lighten(c, 0.35);
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 4;
      p.line(x, 12, x + 2, 4, c); p.line(x + 4, 12, x + 2, 4, dk);
      p.px(x + 1, 6, lt); p.px(x + 2, 4, P.glint); // lit edge + tip glint
    }
  },
};

// ---- core ability icons ----------------------------------------------------
defineIcon('ability_power', P.blood, (p) => sym.sword(p));
defineIcon('ability_haste', '#5a4a1a', (p) => sym.bolt(p, P.emberL));
defineIcon('ability_swift', P.blueD, (p) => {
  p.glow(8, 8, 5, P.ice, 0.2, 3);
  p.hline(3, 9, 5, P.ice); p.hline(3, 8, 6, P.iceD);
  p.hline(4, 11, 8, P.iceD); p.hline(4, 10, 9, P.ice);
  p.hline(3, 8, 11, P.ice); p.hline(3, 7, 12, P.iceD);
  p.px(9, 5, P.white); p.sparkle(11, 11, P.hiSky, 1);
});
defineIcon('ability_vitality', P.blood, (p) => sym.heart(p, P.red));
defineIcon('ability_crit', '#5a4a1a', (p) => { sym.ring(p, P.goldL, 4); sym.cross(p, P.gold); p.px(8, 8, P.white); });
defineIcon('ability_multishot', P.greenD, (p) => {
  p.line(4, 12, 12, 4, darken(P.green, 0.3));
  p.line(3, 11, 11, 3, P.green);
  for (let i = 0; i < 3; i++) {
    p.glow(5 + i * 3, 5 + i * 2, 2.4, P.greenL, 0.3, 3);
    p.ellipse(5 + i * 3, 5 + i * 2, 1.5, 1.5, P.greenL);
    p.px(5 + i * 3 - 1, 5 + i * 2 - 1, P.white);
  }
});
defineIcon('ability_pierce', P.steelD, (p) => {
  p.hline(3, 12, 8, darken(P.steel, 0.2));
  p.hline(3, 12, 7, P.steelL);
  p.line(9, 5, 12, 8, P.steelL); p.line(9, 11, 12, 8, P.steel);
  p.rect(5, 6, 2, 5, P.iron); p.vline(6, 10, 5, P.steelL);
  p.px(12, 8, P.glint); p.sparkle(12, 8, P.hiSky, 1);
});
defineIcon('ability_velocity', P.blueD, (p) => sym.chevrons(p, P.blueL));
defineIcon('ability_magnet', P.steelD, (p) => {
  p.rect(4, 4, 3, 7, P.redD); p.rect(9, 4, 3, 7, P.redD);
  p.rect(4, 3, 3, 7, P.red); p.rect(9, 3, 3, 7, P.red);
  p.rect(4, 3, 8, 3, P.red); p.rect(4, 3, 8, 1, P.redL);
  p.rect(4, 10, 3, 2, P.steelL); p.rect(9, 10, 3, 2, P.steel);
  p.px(5, 4, P.redL); // sheen on the bar
  p.sparkle(8, 13, P.neonL, 1); // magnetic pull spark
});
defineIcon('ability_greed', '#5a4a1a', (p) => sym.coin(p));
defineIcon('ability_regen', P.greenD, (p) => { sym.cross(p, P.greenL); p.sparkle(4, 12, P.toxic, 1); });
defineIcon('ability_lifesteal', P.blood, (p) => { sym.heart(p, P.redD); sym.drop(p, P.redL); });
defineIcon('ability_homing', P.purpleD, (p) => {
  p.glow(8, 8, 5, P.manaL, 0.18, 3);
  sym.ring(p, P.purpleL, 4);
  p.ring(8, 8, 2.2, P.manaL);
  p.line(8, 8, 12, 4, P.manaL); p.px(11, 5, P.astralL);
  p.px(12, 4, P.white); p.star4(12, 4, 2, withAlpha(P.glint, 0.85), P.white);
});
defineIcon('ability_bigshot', P.shardD, (p) => sym.shardSym(p, P.shard));
defineIcon('ability_glasscannon', P.purpleD, (p) => { sym.shardSym(p, P.purpleL); p.line(7, 4, 9, 12, P.ink); p.px(8, 8, P.magentaL); });
defineIcon('ability_orbit', P.shardD, (p) => {
  p.ring(8, 8, 4.5, P.shardL); p.ring(8, 8, 4.5, withAlpha(P.shard, 0.5));
  p.glow(8, 3.5, 2, P.white, 0.4, 3);
  p.ellipse(8, 3.5, 1.4, 1.4, P.white);
  p.ellipse(8, 12.5, 1.4, 1.4, P.shardL); p.px(8, 12.5, P.white);
  p.ellipse(12.5, 8, 1, 1, P.neonL);
});
defineIcon('ability_nova', '#5a2a1a', (p) => { p.glow(8, 8, 5, P.ember, 0.26, 3); sym.star(p, P.emberL); p.star4(8, 8, 3, withAlpha(P.holy, 0.7), P.white); });
defineIcon('ability_thorns', P.greenD, (p) => sym.spikes(p, P.bone));
defineIcon('ability_dash', P.blueD, (p) => {
  p.glow(8, 8, 4.5, P.ice, 0.2, 3);
  p.hline(2, 9, 8, darken(P.iceD, 0.15)); p.hline(3, 10, 7, P.iceD);
  p.line(8, 5, 12, 8, P.ice); p.line(8, 11, 12, 8, P.ice);
  p.line(8, 5, 11, 7.5, P.hiSky);
  p.px(12, 8, P.glint);
});
defineIcon('ability_luck', P.greenD, (p) => { sym.star(p, P.greenL); p.star4(11, 5, 2, withAlpha(P.toxic, 0.8), P.white); });

// D6 status passives — dedicated glowing icons (no longer fall back to ability_power)
defineIcon('ability_frostbite', P.blueD, (p) => {
  p.glow(8, 8, 5, P.ice, 0.3, 3);
  p.vline(2, 14, 8, P.ice); p.hline(2, 14, 8, P.ice); p.line(4, 4, 12, 12, P.iceD); p.line(12, 4, 4, 12, P.iceD);
  p.px(5, 5, P.white); p.px(11, 11, P.white); p.px(8, 8, P.glint);
});
defineIcon('ability_lacerate', P.blood, (p) => {
  p.line(3, 2, 10, 13, P.redL); p.line(6, 2, 13, 12, P.red); p.line(9, 3, 14, 11, P.redD);
  p.px(3, 2, P.white); p.px(6, 2, P.glint); p.sparkle(11, 13, withAlpha(P.redL, 0.7), 1);
});
defineIcon('ability_ignite', '#5a2a1a', (p) => {
  p.glow(8, 9, 5, P.ember, 0.4, 3);
  p.ellipse(8, 10, 3.2, 3.6, P.ember); p.ellipse(8, 10, 1.8, 2.4, P.emberL); p.line(8, 4, 8, 8, P.ember);
  p.px(8, 5, P.gold); p.px(8, 9, P.white);
});
defineIcon('ability_overload', P.purpleD, (p) => {
  p.glow(8, 8, 5, P.mana, 0.35, 3);
  p.ring(8, 8, 5, P.manaL); sym.bolt(p, P.manaL); p.px(8, 8, P.white); p.sparkle(12, 3, withAlpha(P.neonL, 0.8), 1);
});

// cursed abilities — dark crimson panel + an ominous glowing mark
defineIcon('ability_curse_bloodpact', '#2a0e16', (p) => {
  p.glow(8, 8, 6, P.blood, 0.3, 3);
  p.ring(8, 8, 5, P.blood); p.ring(8, 8, 5.4, withAlpha(P.red, 0.4));
  sym.drop(p, P.red); p.px(8, 4, P.redL); p.px(8, 5, P.white);
});
defineIcon('ability_curse_frenzy', '#2a0e16', (p) => {
  p.glow(8, 8, 6, P.blood, 0.3, 3);
  p.ring(8, 8, 5, P.blood); p.ring(8, 8, 5.4, withAlpha(P.laser, 0.4));
  sym.bolt(p, P.redL);
});
defineIcon('ability_curse_titan', '#2a0e16', (p) => {
  p.glow(8, 8, 5, P.blood, 0.26, 3);
  sym.sword(p); p.vline(3, 12, 7, P.redD); p.vline(2, 11, 6, withAlpha(P.laser, 0.5));
});
defineIcon('ability_curse_glasssoul', '#2a0e16', (p) => {
  p.glow(8, 8, 5, P.blood, 0.26, 3);
  sym.shardSym(p, P.redL); p.line(7, 4, 9, 12, P.ink); p.px(8, 9, P.magentaL);
});
defineIcon('ability_curse_greedpact', '#2a0e16', (p) => {
  p.glow(8, 8, 6, P.blood, 0.3, 3);
  p.ring(8, 8, 5, P.blood); p.ring(8, 8, 5.4, withAlpha(P.red, 0.4));
  sym.coin(p); p.px(8, 3, P.red); p.px(8, 4, P.redL);
});

export const ICONS_READY = true;
