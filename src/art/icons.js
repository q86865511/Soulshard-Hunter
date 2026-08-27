// Procedural 16x16 icons for abilities / items / equipment.
// Convention: ability icons are named `ability_<id>`, items `item_<id>`,
// equipment `equip_<id>`. Workflow content follows the same naming.
//
// R28 (ART-06) — icon CATEGORY GRAMMAR:
//   • panel()  — six category frame shapes (see the grammar block below); the
//                bevel/vignette/sheen are derived from the shape, not hard-coded.
//   • sym.*    — same call signatures, crisper 3-4 tonal steps + specular glint.
//   • defineIcon() — infers the category from the name prefix, clips the glyph to
//                the frame, rim-lights it, and draws the "kira" glint ONLY when
//                the call site opts in (rare+ per ART_SPEC; it used to be on
//                every icon, which is why they all looked alike).
// All exported symbols, names, sizes, anchors and import paths are unchanged.
import { defineSprite } from '../engine/sprites.js';
import { P, darken, lighten, mix, withAlpha } from '../engine/palette.js';

// ═══════════════════════════════════════════════════════════════════════════
//  ICON CATEGORY GRAMMAR  (ART_SPEC 第 5 節 / ART-06)
// ═══════════════════════════════════════════════════════════════════════════
// Before R28 every one of the ~216 icons wore the SAME dark rounded plaque, so
// 武器/被動/道具/裝備/天賦/設施 were indistinguishable by shape — the frame
// carried zero information. Now each category owns a FRAME CORNER SYNTAX:
//
//   武器 weapon    左上/右下斜切     — a blade-cut parallelogram
//   被動 passive   圓角徽章          — a round medal
//   道具 item      直角＋底座線      — a square case on a wide plinth
//   裝備 equip     方肩框            — pauldrons over a tapered cuirass
//   天賦 talent    上尖飾            — a crest spire over the plaque
//   設施 facility  底寬梯形飾        — a building that widens into its footing
//
// The shape is authored ONCE as a per-row span table; the bevel/vignette/sheen
// are then derived by eroding that mask, so every category gets identical
// lighting on a different silhouette (and reads in greyscale, per spec).
//
// BACKWARDS COMPATIBLE: callers keep passing (name, bg, draw) — the category is
// inferred from the icon-name prefix. Anything that is not one of the six
// (patron_, boss icons, fx, …) keeps the legacy plaque silhouette byte-for-byte
// in outline terms, so no unrelated art shifts.

const CAT_PREFIX = [
  ['weapon_', 'weapon'], ['ability_', 'passive'], ['item_', 'item'],
  ['equip_', 'equip'], ['talent_', 'talent'], ['facility_', 'facility'],
];
// The icon-name prefix IS the category signal (see registry.js naming contract).
export function catFromName(name) {
  for (let i = 0; i < CAT_PREFIX.length; i++) if (name.indexOf(CAT_PREFIX[i][0]) === 0) return CAT_PREFIX[i][1];
  return 'neutral';
}

// Per-row spans of the frame silhouette. rows[y] = [[x0,x1], …] (inclusive).
function spansFor(cat) {
  const rows = [];
  const add = (y, x0, x1) => { (rows[y] || (rows[y] = [])).push([x0, x1]); };
  const band = (y0, y1, x0, x1) => { for (let y = y0; y <= y1; y++) add(y, x0, x1); };
  switch (cat) {
    case 'weapon': // 左上/右下斜切
      add(1, 5, 14); add(2, 4, 14); add(3, 3, 14); add(4, 2, 14);
      band(5, 10, 1, 14);
      add(11, 1, 13); add(12, 1, 12); add(13, 1, 11); add(14, 1, 10);
      break;
    case 'passive': // 圓角徽章
      add(1, 5, 10); add(2, 3, 12); add(3, 2, 13); add(4, 1, 14); add(5, 1, 14);
      band(6, 9, 0, 15);
      add(10, 1, 14); add(11, 1, 14); add(12, 2, 13); add(13, 3, 12); add(14, 5, 10);
      break;
    case 'item': // 直角＋底座線
      band(1, 11, 2, 13);
      add(12, 1, 14); add(13, 0, 15); add(14, 0, 15);
      break;
    case 'equip': // 方肩框
      add(0, 1, 4); add(0, 11, 14);
      band(1, 12, 1, 14);
      add(13, 2, 13); add(14, 4, 11);
      break;
    case 'talent': // 上尖飾
      add(0, 7, 8); add(1, 6, 9); add(2, 5, 10);
      band(3, 13, 1, 14); add(14, 2, 13);
      break;
    case 'facility': // 底寬梯形飾
      for (let y = 1; y <= 12; y++) { const x0 = Math.round(5 - (y - 1) * (4 / 11)); add(y, x0, 15 - x0); }
      add(13, 0, 15); add(14, 0, 15);
      break;
    default: // legacy plaque
      add(1, 2, 13); band(2, 13, 1, 14); add(14, 2, 13);
  }
  return rows;
}

function maskOf(rows) {
  const m = new Uint8Array(256);
  for (let y = 0; y < 16; y++) {
    const rs = rows[y]; if (!rs) continue;
    for (let i = 0; i < rs.length; i++) {
      for (let x = Math.max(0, rs[i][0]); x <= Math.min(15, rs[i][1]); x++) m[y * 16 + x] = 1;
    }
  }
  return m;
}
// 4-neighbour erosion; off-canvas counts as empty so edge rows keep a rim.
function erode(m) {
  const o = new Uint8Array(256);
  const at = (x, y) => (x < 0 || y < 0 || x > 15 || y > 15) ? 0 : m[y * 16 + x];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (m[y * 16 + x] && at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1)) o[y * 16 + x] = 1;
  }
  return o;
}

// Where the rare+ kira glint sits — a point comfortably inside each silhouette.
const KIRA_AT = {
  weapon: [6, 4], passive: [4, 5], item: [5, 4],
  equip: [4, 4], talent: [4, 6], facility: [6, 7], neutral: [4, 4],
};

const FRAMES = {};
function frameOf(cat) {
  let F = FRAMES[cat];
  if (!F) {
    const m0 = maskOf(spansFor(cat)), m1 = erode(m0), m2 = erode(m1);
    F = FRAMES[cat] = { cat, m0, m1, m2, m3: erode(m2), kira: KIRA_AT[cat] || KIRA_AT.neutral };
  }
  return F;
}

// Erase anything the draw body pushed outside the frame — this is what keeps the
// category silhouette readable no matter what a 234-call-site glyph does.
function clipTo(p, m) {
  const img = p.ctx.getImageData(0, 0, 16, 16);
  const a = img.data;
  for (let i = 0; i < 256; i++) if (!m[i]) a[i * 4 + 3] = 0;
  p.ctx.putImageData(img, 0, 0);
}

// Bevel + vignette + shape-following sheen, derived from the eroded masks.
function paintPanel(p, bg, F) {
  // R28 value pass: the plate is pushed a full step DOWN from the caller's bg.
  // Several bg keys (P.shardD #1f9a92, P.greenD, P.steelD…) are mid-value, and
  // the old plate lightened them further — a shard-family glyph on a shard-family
  // plate had nowhere left to go, which is half of why icons read as flat discs.
  // Hue identity is preserved; only the value drops, so every glyph gains headroom.
  const base = darken(bg, 0.34);
  const edge = darken(base, 0.45);
  const rim = darken(base, 0.18);
  const topHi = lighten(base, 0.22);
  const botSh = darken(base, 0.26);
  const bodyTop = lighten(base, 0.12), bodyBot = darken(base, 0.18);
  const core = lighten(base, 0.2);
  const { m0, m1, m2, m3 } = F;
  for (let y = 0; y < 16; y++) {
    const body = mix(bodyTop, bodyBot, y / 15);
    for (let x = 0; x < 16; x++) {
      const i = y * 16 + x;
      if (!m0[i]) continue;
      if (!m1[i]) { p.px(x, y, edge); continue; }        // outer ink-dark frame
      if (!m2[i]) { p.px(x, y, rim); continue; }         // inner vignette ring
      p.px(x, y, m3[i] ? mix(body, core, 0.45) : body);  // lit body / brighter core
    }
  }
  // Sheen follows the SHAPE (per column), so a chamfer/dome/pediment all light
  // correctly from the top-left without any per-category lighting code.
  for (let x = 0; x < 16; x++) {
    let top = -1, bot = -1;
    for (let y = 0; y < 16; y++) if (m2[y * 16 + x]) { if (top < 0) top = y; bot = y; }
    if (top < 0) continue;
    p.px(x, top, topHi);
    if (top + 1 <= bot) p.px(x, top + 1, mix(topHi, base, 0.55));
    p.px(x, bot, botSh);
    if (bot - 1 > top + 1) p.px(x, bot - 1, mix(botSh, base, 0.5));
  }
}

// One crafted detail per category — all coordinates verified inside the mask.
function frameAccent(p, bg, cat) {
  const base = darken(bg, 0.34);
  const hi = lighten(base, 0.5), dk = darken(base, 0.45);
  switch (cat) {
    case 'weapon': // honed bevel down the top-left cut, shadow on the bottom-right cut
      p.line(5, 2, 2, 5, hi); p.px(4, 3, P.rim);
      p.line(13, 11, 10, 14, dk);
      break;
    case 'passive': // medal beading
      p.px(3, 3, hi); p.px(12, 3, hi); p.px(3, 12, dk); p.px(12, 12, dk);
      break;
    case 'item': // the 底座線 that names the category
      p.hline(2, 13, 12, dk); p.hline(1, 14, 13, lighten(base, 0.22));
      break;
    case 'equip': // pauldron rivets
      p.px(2, 1, hi); p.px(13, 1, hi); p.px(3, 2, dk); p.px(12, 2, dk);
      break;
    case 'talent': // lit crest tip
      p.px(7, 0, P.rim); p.px(8, 0, hi); p.px(7, 1, hi);
      break;
    case 'facility': // footing shadow under the flange
      p.hline(1, 14, 12, dk); p.hline(0, 15, 14, dk);
      break;
    default:
      p.px(3, 3, hi); p.px(12, 3, hi); p.px(3, 12, dk); p.px(12, 12, dk);
  }
}

// ── panel: framed plaque the symbol sits on ────────────────────────────────
// panel(p, bg) keeps working (legacy plaque); panel(p, bg, cat) opts into one of
// the six category frames.
export function panel(p, bg, cat) {
  const key = cat || 'neutral';
  paintPanel(p, bg, frameOf(key));
  frameAccent(p, bg, key);
}

// defineIcon(name, bg, draw, opts?) — 16x16, anchor [8,8]. opts:
//   cat  — override the prefix-inferred category ('weapon'|'passive'|'item'|
//          'equip'|'talent'|'facility'|'neutral').
//   kira — draw the top-left kira glint. Per ART_SPEC 第 5 節 the glint marks
//          **rare and above ONLY**; common icons must not have it (every icon
//          wearing one was a main cause of the same-ness complaint). Rarity is
//          NOT knowable here — rarityOf() (game/progression.js) needs the content
//          def, and sprites bake eagerly at art-module import time, before the
//          registries exist. So it is a call-site opt-in: content authors who
//          know the def's tier pass { kira: true } for tier >= 2 / evolved /
//          exclusive. Default false.
export function defineIcon(name, bg, draw, opts) {
  const o = opts || {};
  const cat = o.cat || catFromName(name);
  const F = frameOf(cat);
  const kira = !!o.kira;
  defineSprite(name, 16, 16, (p) => {
    paintPanel(p, bg, F);
    frameAccent(p, bg, cat);
    draw(p);
    clipTo(p, F.m0);
    p.rimLight(P.rim, 0.4, -1, -1);
    if (kira) { p.star4(F.kira[0], F.kira[1], 2, withAlpha(P.glint, 0.9), P.white); clipTo(p, F.m0); }
    p.outline(P.ink);
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
// R28 (ART-06): passives speak the 中心對稱符號/身體部位 dialect. 力量 used to
// borrow sym.sword() — a WEAPON silhouette — which is exactly what made passives
// unreadable next to weapons; it is now a mirror-symmetric gauntleted fist.
defineIcon('ability_power', P.blood, (p) => {
  p.glow(8, 8, 4.5, P.red, 0.18, 4);
  // 16px 下「少即是多」：兩個大指節凸起，內部只留一條拇指橫壓
  p.rect(4, 3, 3, 2, P.steelL); p.rect(9, 3, 3, 2, P.steelL);
  p.rect(7, 4, 2, 1, P.iron);
  for (let y = 4; y <= 10; y++) {
    const w = y <= 5 ? 4 : (y <= 8 ? 5 : 4);
    p.hline(8 - w, 7 + w, y, y <= 5 ? P.steel : (y <= 8 ? mix(P.steel, P.iron, 0.35) : P.steelD));
  }
  p.hline(4, 11, 4, P.steelL);                                 // 受光上緣
  p.rect(4, 7, 8, 2, P.iron); p.hline(4, 11, 7, P.steelL);     // 拇指橫壓
  // 護腕：金色，與紅底拉開明度，也把拳體「切」出來
  p.rect(5, 11, 6, 3, P.goldD); p.rect(5, 11, 6, 1, P.goldL);
  p.hline(6, 9, 13, darken(P.goldD, 0.4));
  p.px(4, 5, P.rim);
});
// 急速：一對疾風之翼（冷色）夾住中央閃電（暖色）——左右鏡射，與武器的單向動勢區隔。
defineIcon('ability_haste', '#5a4a1a', (p) => {
  p.glow(8, 8, 4, P.emberL, 0.18, 3);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const tip = 8 + s * (6 - i);
      p.hline(8 + s * 2, tip, 5 + i * 2, i === 0 ? P.bone : (i === 1 ? darken(P.bone, 0.22) : darken(P.bone, 0.42)));
      p.px(tip, 5 + i * 2, P.rimCool);                          // 羽尖
    }
  }
  // 中央閃電：先描一圈暗影再上亮色，才不會和羽片黏成一塊
  p.line(10, 3, 6, 9, P.ink2); p.line(7, 3, 4, 9, P.ink2);
  p.line(11, 8, 7, 14, P.ink2); p.line(8, 8, 5, 14, P.ink2);
  p.line(9, 3, 6, 8, P.ember); p.line(8, 3, 5, 8, darken(P.ember, 0.25));
  p.hline(5, 10, 8, P.emberL);
  p.line(10, 8, 7, 13, P.emberL); p.line(9, 8, 6, 13, P.ember);
  p.px(8, 8, P.white); p.px(7, 5, P.holyL);
});
defineIcon('ability_swift', P.blueD, (p) => {
  p.glow(8, 8, 5, P.ice, 0.2, 3);
  p.hline(3, 9, 5, P.ice); p.hline(3, 8, 6, P.iceD);
  p.hline(4, 11, 8, P.iceD); p.hline(4, 10, 9, P.ice);
  p.hline(3, 8, 11, P.ice); p.hline(3, 7, 12, P.iceD);
  p.px(9, 5, P.white); p.sparkle(11, 11, P.hiSky, 1);
});
// 活力：心臟（身體部位）＋左右對稱的護肋，讓輪廓比純心形寬、在 16px 可讀。
defineIcon('ability_vitality', P.blood, (p) => {
  p.glow(8, 7, 3.2, P.red, 0.14, 3);
  sym.heart(p, P.redL);
  // 心跳線橫貫心臟中央——對稱、與心形一起把「生命」講清楚
  p.hline(3, 5, 8, P.white);
  p.line(5, 8, 6, 6, P.white); p.line(6, 6, 7, 10, P.white);
  p.line(7, 10, 8, 7, P.white); p.line(8, 7, 9, 8, P.white);
  p.hline(9, 12, 8, P.white);
});
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
// 荊棘：環繞己身的荊棘環（中心對稱）——舊版的單排尖刺讀起來像武器的揮擊排列。
defineIcon('ability_thorns', P.greenD, (p) => {
  p.glow(8, 8, 3, P.toxic, 0.14, 3);
  p.ring(8, 8, 4.6, P.greenD);
  p.ring(8, 8, 4, P.leafL);
  for (let i = 0; i < 8; i++) {
    const t = i * Math.PI / 4;
    p.line(8 + Math.cos(t) * 4.2, 8 + Math.sin(t) * 4.2, 8 + Math.cos(t) * 6.2, 8 + Math.sin(t) * 6.2, i % 2 ? P.bone : P.leafL);
    p.px(Math.round(8 + Math.cos(t) * 6.2), Math.round(8 + Math.sin(t) * 6.2), P.white);
  }
  p.ellipse(8, 8, 1.8, 1.8, P.leaf); p.px(7, 7, P.toxic);
});
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
