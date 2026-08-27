// Weapon icons + projectile / fx sprites for the auto-fire weapon system.
// ENHANCED EDITION (art_v2): projectile orbs now GLOW (soft radial halo + a hot
// white core + a top-left catch-light), the orbiting blade GLEAMS (sheen + edge
// glint + motion sparkle), and the 16x16 weapon icons are flashy — neon edges,
// energy trails, kira-stars and pulsing auras. Names, dimensions, anchors and the
// WEAPON_ART_READY export are all preserved as strict drop-in contracts.
import { defineSprite } from '../engine/sprites.js';
import { defineIcon, sym } from './icons.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ---- projectile orbs (recolours) -------------------------------------------
// Anime energy-bolt: outer glow halo, saturated body, lit top-left arc, blazing
// white core + catch-light, and a tiny trailing spark for "in-flight" punch.
function orb(p, c, cl, accent) {
  const hot = accent || lighten(cl, 0.45);
  // soft radial glow halo (reads as light, not a hard disc)
  p.glow(4, 4, 3.4, hot, 0.5, 4);
  p.glow(4, 4, 2.2, cl, 0.6, 3);
  // body — vertical tonal falloff (lit top, deeper bottom)
  p.ellipse(4, 4, 2.6, 2.6, c);
  p.ellipse(4, 4, 2.6, 2.0, mix(c, cl, 0.35));
  // inner energy
  p.ellipse(4, 4, 1.6, 1.6, cl);
  p.ellipse(4, 4, 1.0, 1.0, lighten(cl, 0.3));
  // top-left lit rim arc + bottom-right shade for volume
  p.px(2, 2, lighten(cl, 0.5));
  p.px(3, 2, lighten(cl, 0.35));
  p.px(2, 3, lighten(cl, 0.35));
  p.px(6, 6, darken(c, 0.22));
  p.px(5, 6, darken(c, 0.12));
  // blazing white core + specular catch-light
  p.px(4, 4, P.white);
  p.px(3, 3, P.glint);
  // faint trailing motion spark (top-left, where it "came from")
  p.px(1, 1, withAlpha(hot, 0.7));
}
defineSprite('bolt_fire', 8, 8, (p) => orb(p, darken(P.ember, 0.2), P.emberL, P.holy), { anchor: [4, 4] });
defineSprite('bolt_ice', 8, 8, (p) => orb(p, P.iceD, P.ice, P.hiSky), { anchor: [4, 4] });
defineSprite('bolt_volt', 8, 8, (p) => orb(p, P.goldD, P.emberL, P.holyL), { anchor: [4, 4] });
defineSprite('bolt_void', 8, 8, (p) => orb(p, P.purpleD, P.purpleL, P.magentaL), { anchor: [4, 4] });

// ---- orbiting blade fx -----------------------------------------------------
// A crescent of light: gradient body, bright leading spine, a travelling gleam
// highlight and a kira-spark at the tip so the spin reads as motion.
defineSprite('fx_blade', 8, 10, (p) => {
  // soft halo behind the blade so it glows as it orbits
  p.glow(4, 5, 3.2, P.shardL, 0.4, 3);
  for (let y = 0; y < 10; y++) {
    const w = y < 5 ? 0.6 + y * 0.5 : 0.6 + (9 - y) * 0.5;
    // top half catches the light, bottom half cools into shard tone
    const body = y < 4 ? P.shardL : (y < 7 ? P.shard : darken(P.shard, 0.15));
    p.hline(4 - w, 3 + w, y, body);
  }
  // bright leading spine + a hot gleam streak along the cutting edge
  p.vline(0, 9, 4, P.white);
  p.px(4, 2, P.glint);
  p.px(4, 7, lighten(P.shardL, 0.3));
  p.px(5, 3, withAlpha(P.shardL, 0.8));
  p.px(5, 6, withAlpha(P.shardL, 0.6));
  // kira spark at the tip — sells the slash
  p.star4(4, 1, 2, P.shardL, P.white);
  p.outline(P.ink);
}, { anchor: [4, 5] });

// ---- weapon icons ----------------------------------------------------------
// Each icon commits to a top-left light, a glowing focal point and a neon/energy
// accent for "anime weapon UI" pop. Icon panel + final ink outline come from the
// shared defineIcon wrapper.
//
// R28 (ART-06): the kira glint is no longer automatic — it marks 稀有以上 only,
// so it is passed here per weapon from the tier in content/weapons.js
// (w_soulbolt / w_fan are tier 1 = 普通 and deliberately have none).

// A diamond bolt head — the weapon dialect's "射出" shape, lit from the top-left.
function boltHead(p, cx, cy, r, col) {
  const dk = darken(col, 0.42), lt = lighten(col, 0.45);
  const dia = (x, y, rr, c) => { for (let d = -rr; d <= rr; d++) { const w = rr - Math.abs(d); p.hline(x - w, x + w, y + d, c); } };
  dia(cx, cy, r, col);
  if (r >= 2) { dia(cx + 1, cy + 1, r - 2, dk); dia(cx - 1, cy - 1, r - 2, lt); }
  p.px(cx - 1, cy - 1, P.white);
}

// BASE 魂晶彈 — one bolt, one trail, no ring. Reads as a single shot.
defineIcon('weapon_w_soulbolt', P.shardD, (p) => {
  p.glow(10, 5, 2.6, P.shard, 0.18, 3);
  // 分離的速度虛線（不接觸彈體，動勢才讀得出來，不會併成一塊大結晶）
  p.line(7, 9, 8, 8, P.shardL); p.line(6, 10, 7, 9, darken(P.shard, 0.2));
  p.line(4, 12, 5, 11, P.shard); p.line(3, 13, 4, 12, darken(P.shard, 0.3));
  boltHead(p, 10, 5, 2, P.shard);
  p.line(12, 2, 13, 1, P.shardL);                   // 破空短線
});

defineIcon('weapon_w_fan', '#5a3a1a', (p) => {
  p.glow(8, 9, 5, P.ember, 0.32, 3);
  for (let i = 0; i < 3; i++) {
    const x = 4 + i * 3;
    // each fan blade gets a hot inner edge + lit tip
    p.line(x, 12, x + 1, 4 - i, darken(P.ember, 0.1));
    p.line(x, 12, x + 1, 5 - i, P.emberL);
    p.px(x + 1, 3 - i, P.holyL);
    p.px(x + 1, 4 - i, P.emberL);
  }
  p.sparkle(11, 3, P.emberL, 1);
});

defineIcon('weapon_w_orbit', P.shardD, (p) => {
  p.glow(8, 8, 5.5, P.shard, 0.3, 3);
  // neon orbit ring (double for a glowing edge)
  p.ring(8, 8, 5, P.shardL);
  p.ring(8, 8, 5, withAlpha(P.shard, 0.5));
  // orbiting motes, each a small glowing bead
  p.glow(8, 3, 1.6, P.shardL, 0.6, 2); p.ellipse(8, 3, 1.4, 2, P.white);
  p.glow(13, 9, 1.6, P.shard, 0.6, 2); p.ellipse(13, 9, 1.4, 2, P.shardL);
  p.glow(4, 10, 1.6, P.shard, 0.6, 2); p.ellipse(4, 10, 1.4, 2, P.shardL);
  p.sparkle(8, 8, P.shardL, 1);
}, { kira: true });

// BASE 灼蝕光環 — ONE broken sweep arc (open toward the lower-left) around a
// single ember core. The old version was concentric rings, i.e. the same
// composition as w_inferno with a different hue — the ART-06 complaint itself.
defineIcon('weapon_w_aura', '#5a2a1a', (p) => {
  p.glow(8, 8, 5.5, withWarm(P.ember, 0), 0.3, 4);
  for (let a = -150; a <= 60; a += 6) {
    const t = a * Math.PI / 180;
    p.px(Math.round(8 + Math.cos(t) * 5.2), Math.round(8 + Math.sin(t) * 5.2), a < -100 ? withAlpha(P.ember, 0.5) : P.emberL);
    p.px(Math.round(8 + Math.cos(t) * 4.3), Math.round(8 + Math.sin(t) * 4.3), withAlpha(P.ember, 0.75));
  }
  p.ellipse(8, 8, 2.2, 2.2, P.ember);
  p.ellipse(7.5, 7.5, 1.3, 1.3, P.holyL);
  p.px(7, 7, P.white);
}, { kira: true });

defineIcon('weapon_w_whip', P.shardD, (p) => {
  p.glow(13, 3, 3, P.shardL, 0.4, 3);
  // cracking energy whip: cooling base -> hot snapping tip
  p.line(2, 12, 6, 9, darken(P.shard, 0.1));
  p.line(2, 12, 6, 9, P.shardL);
  p.line(6, 9, 9, 4, P.shardL);
  p.line(9, 4, 13, 3, P.white);
  // motion ghost of the snap
  p.line(7, 10, 10, 5, withAlpha(P.shard, 0.5));
  p.px(13, 2, P.white);
  p.star4(13, 3, 2, P.shardL, P.white);
}, { kira: true });

defineIcon('weapon_w_nova', P.purpleD, (p) => {
  p.glow(8, 8, 6, P.mana, 0.4, 4);
  p.ring(8, 8, 5.5, P.manaL);
  p.ring(8, 8, 5.5, withAlpha(P.astral, 0.5));
  p.ring(8, 8, 3, P.mana);
  sym.star(p, P.white);
  p.glow(8, 8, 2, P.astralL, 0.6, 2);
  p.star4(8, 8, 4, P.manaL, P.white);
}, { kira: true });

defineIcon('weapon_w_homing', P.purpleD, (p) => {
  p.glow(11, 5, 3.5, P.mana, 0.4, 3);
  // glowing curved trail into a neon arrowhead
  p.line(3, 12, 9, 5, withAlpha(P.purpleL, 0.6));
  p.line(3, 12, 9, 5, P.purpleL);
  p.line(9, 5, 12, 4, P.manaL);
  p.line(12, 4, 10, 7, P.manaL);
  p.line(12, 4, 13, 8, P.manaL);
  p.px(12, 4, P.white);
  p.px(3, 12, P.white);
  p.sparkle(11, 5, P.astralL, 1);
}, { kira: true });

defineIcon('weapon_w_lightning', '#5a4a1a', (p) => {
  p.glow(8, 8, 5.5, P.holy, 0.3, 3);
  // neon under-glow bolt, then the bright bolt on top
  sym.bolt(p, withAlpha(P.neon, 0.5));
  sym.bolt(p, P.emberL);
  p.px(8, 8, P.white);
  p.star4(9, 4, 2, P.holyL, P.white);
}, { kira: true });

// EVO of w_soulbolt — the base bolt PLUS a second layer of shape (a containment
// 光環 + two 裂變 sub-bolts), not just a recolour, per ART_SPEC 第 5 節.
defineIcon('weapon_w_soulstorm', P.shardD, (p) => {
  p.glow(8, 8, 2.6, P.shard, 0.18, 3);
  p.ring(8, 8, 5.2, P.shardL);                      // 第二層：環繞光環
  p.ring(8, 8, 4.4, darken(P.shard, 0.4));
  boltHead(p, 8, 8, 2, P.shardL);                   // 主彈（與 base 同語彙）
  // 第二層：四枚裂變副彈環繞主彈
  boltHead(p, 8, 2, 1, P.shard); boltHead(p, 8, 14, 1, P.shard);
  boltHead(p, 2, 8, 1, P.shard); boltHead(p, 14, 8, 1, P.shard);
}, { kira: true });

// EVO of w_aura — keeps the sweep arc, then adds the second layer: six outward
// flame 角 breaking the silhouette, and a 裂變 three-lobed core.
defineIcon('weapon_w_inferno', '#5a1a1a', (p) => {
  p.glow(8, 8, 6.5, P.red, 0.34, 4);
  // 第二層：向外爆出的火焰角（進 silhouette，32x32 下一眼與 base 分開）
  for (let i = 0; i < 6; i++) {
    const t = (-150 + i * 40) * Math.PI / 180;
    p.line(8 + Math.cos(t) * 4, 8 + Math.sin(t) * 4, 8 + Math.cos(t) * 5.8, 8 + Math.sin(t) * 5.8, i % 2 ? P.ember : P.emberL);
    p.px(Math.round(8 + Math.cos(t) * 5.8), Math.round(8 + Math.sin(t) * 5.8), P.holyL);
  }
  // 掃擊弧（與 base 同語彙，但雙層且更熱）
  for (let a = -150; a <= 60; a += 6) {
    const t = a * Math.PI / 180;
    p.px(Math.round(8 + Math.cos(t) * 4.4), Math.round(8 + Math.sin(t) * 4.4), P.laser);
    p.px(Math.round(8 + Math.cos(t) * 3.5), Math.round(8 + Math.sin(t) * 3.5), withAlpha(P.emberL, 0.8));
  }
  // 裂變核心：三瓣而非單一圓核
  for (let i = 0; i < 3; i++) {
    const t = (-90 + i * 120) * Math.PI / 180;
    p.ellipse(8 + Math.cos(t) * 1.3, 8 + Math.sin(t) * 1.3, 1.2, 1.2, P.holyL);
  }
  p.ellipse(8, 8, 1.1, 1.1, P.white);
}, { kira: true });

// Optional warm-trim hook for aura rings; identity by default (kept from the
// original so weapon_w_aura's call shape is unchanged). Accepts an optional
// blend amount toward holy warmth for future use.
function withWarm(c, amt = 0) { return amt > 0 ? tint(c, P.holy, amt) : c; }

export const WEAPON_ART_READY = true;
