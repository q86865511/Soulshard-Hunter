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
//
// R28 W3-B-rework — 鐵律（ART_SPEC 第 5 節）：類別文法只活在「框」上（passive =
// 圓角徽章，由 panel() 統一處理）。glyph 必須畫「那一件具體的東西」，同類別內
// 任兩個 glyph 的輪廓不得雷同。上一批把 54 個被動全畫成「圓徽＋中央小記號」被
// 整批退回——所以這裡每一張都是一個可命名的實體：靴／眼／獠牙／四葉草／馬蹄磁鐵
// ／錢堆／嫩芽／奔跑殘影／雪花／蕈狀爆炸／電池／捲軸／螺旋／砝碼／琉璃人像／錢袋…
// 通用符號（sym.ring / sym.cross / sym.star / sym.shardSym）刻意不再直接套用在
// 被動上：它們正是「同輪廓不同色」的來源。
// kira（左上星芒）依 def 的 tier：>= 2 才傳 { kira: true }（ART_SPEC 第 5 節）。
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
// 疾風之靴：一隻側視的皮靴（鞋筒＋鞋面＋鞋底），腳踝三根冷色風羽。
// 與「急速」的一對大翼、與「閃身步法」的腳掌印都是不同輪廓。
defineIcon('ability_swift', P.blueD, (p) => {
  p.glow(8, 10, 4.5, P.ice, 0.16, 3);
  p.rect(6, 3, 5, 6, P.wood);                         // 鞋筒
  p.rect(6, 3, 2, 6, P.woodL);                        // 受光左緣
  p.hline(6, 10, 3, P.leather);
  p.rect(4, 9, 9, 3, P.wood);                         // 鞋面往右伸出鞋頭
  p.hline(4, 12, 9, P.woodL);
  p.rect(11, 9, 2, 3, P.leather);
  p.hline(3, 12, 12, P.ink2); p.hline(4, 12, 13, darken(P.wood, 0.5)); // 鞋底
  p.line(7, 4, 9, 6, P.bone); p.line(7, 6, 9, 8, P.bone);              // 鞋帶
  p.line(5, 6, 2, 5, P.ice); p.line(5, 7, 2, 7, P.iceD); p.line(5, 8, 3, 9, P.iceD); // 踝側風羽
  p.px(2, 5, P.hiSky); p.px(3, 9, P.hiSky);
  p.sparkle(12, 6, P.hiSky, 1);
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
// 銳利之眼：一隻睜開的眼（杏仁眼瞼＋金虹膜＋縱瞳＋三根睫毛）。
// 與「鷹眼瞄具」的中空靶環、「尋寶直覺」的實心金幣＋偵測環都不同。
defineIcon('ability_crit', '#5a4a1a', (p) => {
  p.glow(8, 8, 4.5, P.gold, 0.16, 3);
  const hw = [2, 4.5, 6, 6.5, 6, 4.5, 2];                             // 杏仁形眼白
  for (let i = 0; i < hw.length; i++) {
    const y = 5 + i, w = hw[i];
    p.hline(8 - w, 7 + w, y, i < 3 ? lighten(P.bone, 0.22) : P.bone);
    p.px(Math.round(8 - w), y, P.woodD); p.px(Math.round(7 + w), y, P.woodD);
  }
  p.hline(6, 9, 5, P.woodD); p.hline(5, 10, 11, darken(P.bone, 0.4)); // 上下眼瞼
  p.ellipse(8, 8, 2.4, 2.4, P.woodD);                                 // 虹膜（留足眼白）
  p.ellipse(8, 8, 2, 2, P.goldD);
  p.ellipse(8, 8, 1.5, 1.5, P.gold);
  p.px(8, 8, P.ink); p.px(8, 7, P.ink);                               // 瞳孔
  p.px(7, 7, P.white); p.px(9, 9, P.goldL);
  p.line(4, 4, 5, 5, P.woodD); p.vline(2, 4, 8, P.woodD); p.line(12, 4, 11, 5, P.woodD); // 睫毛
});
// 分裂魂彈：一顆魂晶炸成三塊菱形碎片（下方母體最亮），碎片間留裂隙。
// 與「裂變彈幕」的三支扇形箭頭是完全不同的輪廓（菱形塊 vs 細長箭）。
defineIcon('ability_multishot', P.greenD, (p) => {
  p.glow(8, 9, 5, P.toxic, 0.2, 3);
  const dia = (cx, cy, r, c, lt) => {
    for (let dy = -r; dy <= r; dy++) { const w = r - Math.abs(dy); p.hline(cx - w, cx + w, cy + dy, c); }
    p.px(cx - 1, cy - 1, lt); p.px(cx, cy - r, lt);
  };
  dia(4, 5, 2, P.green, P.greenL);                                    // 飛散碎片（左上）
  dia(12, 6, 2, P.green, P.greenL);                                   // 飛散碎片（右上）
  dia(8, 11, 3, P.greenL, P.white);                                   // 母體（下，最大最亮）
  p.px(8, 11, P.toxic);
  p.line(6, 8, 5, 7, withAlpha(P.toxic, 0.75));                       // 裂隙
  p.line(10, 8, 11, 8, withAlpha(P.toxic, 0.75));
  p.px(4, 3, P.white); p.px(12, 4, P.white);
});
// 貫穿之矢：一支完整的箭（尾羽＋箭桿＋箭頭）水平穿過兩個破孔。
// 與「破甲彈頭」的粗錐彈頭＋碎甲片不同：這裡是細長帶羽的箭。
defineIcon('ability_pierce', P.steelD, (p) => {
  p.ellipse(6, 8, 2.4, 2.8, P.shadow); p.ring(6, 8, 2.6, P.iron);     // 破孔一
  p.ellipse(10, 8, 2, 2.4, P.shadow); p.ring(10, 8, 2.2, P.iron);     // 破孔二
  p.px(5, 6, P.steelD); p.px(9, 6, P.steelD);
  p.hline(2, 12, 8, P.wood); p.hline(2, 12, 7, P.woodL);              // 箭桿
  p.line(11, 5, 14, 8, P.steelL); p.line(11, 11, 14, 8, P.steel);     // 箭頭
  p.hline(11, 14, 8, P.steelL); p.px(14, 8, P.glint);
  p.line(2, 5, 4, 7, P.redL); p.line(2, 11, 4, 9, P.red);             // 尾羽
  p.px(2, 5, P.white);
}, { kira: true });
// 加速彈道：一枚斜向飛出的彈丸，後方拖三道遞亮的尾焰。
defineIcon('ability_velocity', P.blueD, (p) => {
  p.glow(7, 9, 5, P.ice, 0.18, 3);
  p.line(2, 13, 6, 9, withAlpha(P.hiSky, 0.45));                      // 尾焰
  p.line(3, 13, 7, 9, P.iceD);
  p.line(4, 13, 8, 9, P.ice);
  p.line(6, 10, 11, 5, P.steelD);                                     // 彈體（斜膠囊）
  p.line(7, 10, 12, 5, P.steel);
  p.line(7, 9, 12, 4, P.steelL);
  p.line(6, 11, 8, 9, P.goldD);                                       // 底環
  p.px(12, 4, P.white); p.px(13, 3, P.glint);                         // 彈尖
});
// 拾取磁石：開口朝下的馬蹄磁鐵，兩極銀白。
// 拾取磁石：開口朝下的馬蹄磁鐵——U 的內側「不畫」，露出底板當開口，
// 這樣 16px 下才不會糊成一塊紅磚。
defineIcon('ability_magnet', P.steelD, (p) => {
  p.glow(8, 8, 4.5, P.red, 0.16, 3);
  p.rect(3, 3, 3, 8, P.redD); p.rect(10, 3, 3, 8, P.redD);            // 兩臂
  p.rect(3, 3, 3, 7, P.red); p.rect(10, 3, 3, 7, P.red);
  p.rect(3, 3, 10, 4, P.redD); p.rect(3, 3, 10, 3, P.red);            // 頂弧
  p.hline(3, 12, 3, P.redL); p.vline(3, 10, 3, P.redL);               // 受光上緣與左緣
  p.hline(6, 9, 6, darken(P.redD, 0.35));                             // 內弧陰影
  p.vline(7, 10, 6, darken(P.redD, 0.3)); p.vline(7, 10, 9, darken(P.redD, 0.3));
  p.rect(3, 11, 3, 2, P.steelL); p.rect(10, 11, 3, 2, P.steel);       // 兩極
  p.hline(3, 5, 11, P.white); p.hline(10, 12, 12, P.iron);
  p.px(7, 12, P.neonL); p.px(9, 13, P.neonL);                         // 開口處的吸力火花
});
// 貪婪之觸：金字塔狀的錢堆（六枚金幣）。與「尋寶直覺」的單幣＋偵測環不同。
defineIcon('ability_greed', '#5a4a1a', (p) => {
  p.glow(8, 10, 5, P.gold, 0.18, 3);
  const coin = (cx, cy) => {
    p.ellipse(cx, cy, 2.4, 1.7, P.goldD);
    p.ellipse(cx, cy - 0.4, 2.2, 1.3, P.gold);
    p.hline(cx - 1, cx + 1, cy - 1, P.goldL); p.px(cx - 1, cy - 1, P.white);
  };
  coin(5, 12); coin(11, 12); coin(8, 12);
  coin(6, 9); coin(10, 9);
  coin(8, 6);
  p.star4(8, 3, 2, withAlpha(P.holy, 0.8), P.white);
});
// 再生之種：一顆種子抽出的嫩芽（雙子葉＋莖＋頂芽）。
defineIcon('ability_regen', P.greenD, (p) => {
  p.glow(8, 9, 4.5, P.toxic, 0.16, 3);
  p.ellipse(8, 12, 2.6, 1.9, P.wood);                                 // 種子
  p.ellipse(7.4, 11.4, 1.6, 1.1, P.woodL);
  p.vline(5, 11, 8, P.leaf); p.vline(6, 11, 7, P.leafD);              // 莖
  p.ellipse(5, 7, 2.6, 1.6, P.leaf); p.ellipse(5, 6.6, 1.9, 1, P.leafL);   // 左葉
  p.ellipse(11, 6, 2.4, 1.5, P.leaf); p.ellipse(11, 5.6, 1.7, 1, P.leafL); // 右葉
  p.px(8, 4, P.toxic); p.px(8, 5, P.leafL);                           // 頂芽
  p.px(3, 7, P.leafD); p.px(13, 6, P.leafD);
  p.sparkle(12, 10, P.toxic, 1);
});
// 吸血鬼牙：一對獠牙自暗紅牙齦垂下，牙尖各掛一滴血。
// 與「殘虐之刃」的獸爪（有掌）、「裂創」的三道爪痕都是不同輪廓。
defineIcon('ability_lifesteal', P.blood, (p) => {
  p.glow(8, 8, 5, P.red, 0.2, 3);
  p.rect(3, 3, 10, 3, darken(P.blood, 0.35));                         // 牙齦
  p.hline(3, 12, 3, P.redD); p.hline(3, 12, 5, darken(P.blood, 0.5));
  const fang = (cx) => {
    for (let i = 0; i < 7; i++) {
      const w = 1.9 - i * 0.28;
      p.hline(cx - w, cx + w, 5 + i, i < 2 ? P.white : P.bone);
    }
    p.vline(5, 10, Math.round(cx - 1), lighten(P.bone, 0.25));
    p.vline(6, 11, Math.round(cx + 1), darken(P.bone, 0.28));
  };
  fang(5); fang(11);
  p.ellipse(5, 13, 1, 1.2, P.red); p.px(5, 12, P.redL);               // 滴血
  p.ellipse(11, 13, 1, 1.2, P.redD);
  p.ellipse(8, 10, 1.4, 1.9, P.redL); p.px(8, 9, P.white);            // 中央血珠
}, { kira: true });
// 追蹤魂彈：一發彈丸沿彎曲軌跡拐向右上角的圈叉標記——全場唯一的曲線軌跡。
defineIcon('ability_homing', P.purpleD, (p) => {
  p.glow(7, 9, 5.5, P.mana, 0.22, 3);
  for (let dy = -3; dy <= 3; dy++) {                                  // 目標菱形標記
    const w = 3 - Math.abs(dy); p.hline(12 - w, 12 + w, 4 + dy, P.magentaD);
  }
  for (let dy = -2; dy <= 2; dy++) {
    const w = 2 - Math.abs(dy); p.hline(12 - w, 12 + w, 4 + dy, P.magenta);
  }
  p.px(12, 4, P.white); p.px(11, 3, P.magentaL);
  const pts = [[3, 14], [3, 12], [4, 10], [6, 8], [8, 7]];            // 勾起來的追蹤弧
  for (let i = 0; i < pts.length - 1; i++) {
    p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], P.void);
    p.line(pts[i][0] + 1, pts[i][1], pts[i + 1][0] + 1, pts[i + 1][1],
      i < 2 ? withAlpha(P.astral, 0.75) : P.astralL);
  }
  p.ellipse(9, 7, 1.9, 1.9, P.astral);                                // 彈丸
  p.ellipse(9, 7, 1.1, 1.1, P.astralL); p.px(8, 6, P.white);
}, { kira: true });
// 巨型魂晶：一顆撐滿畫面的六角魂晶，四角外擴小箭頭講「變大」。
defineIcon('ability_bigshot', P.shardD, (p) => {
  p.glow(8, 8, 6, P.shard, 0.24, 3);
  for (let i = 0; i < 10; i++) {
    const y = 3 + i;
    const w = i < 3 ? 2 + i : (i < 7 ? 5 : 5 - (i - 6) * 1.7);
    p.hline(8 - w, 7 + w, y, P.shardD);
    p.hline(8 - w, 7, y, P.shard);                                    // 左受光面
    p.hline(8 - w, 8 - w + 1, y, P.shardL);
  }
  p.vline(3, 12, 8, withAlpha(P.shardD, 0.7));                        // 中脊
  p.px(6, 5, P.white); p.px(6, 6, P.shardL);
  const arrow = (x, y, dx, dy) => {                                   // 四角外擴箭頭
    p.px(x, y, P.holyL); p.px(x + dx, y, P.holyL); p.px(x, y + dy, P.holyL);
    p.px(x - dx, y - dy, withAlpha(P.holyL, 0.6));
  };
  arrow(3, 3, 1, 1); arrow(12, 3, -1, 1); arrow(3, 12, 1, -1); arrow(12, 12, -1, -1);
}, { kira: true });
// 玻璃大砲：一門帶輪砲架的野戰砲——玻璃砲管（管內透出紫色能量、殼上裂紋）＋
// 加寬砲口＋輻條木輪。輪子是「這是一門砲」最快被認出來的那個形。
defineIcon('ability_glasscannon', P.purpleD, (p) => {
  p.glow(13, 6, 4, P.magenta, 0.26, 3);
  p.rect(3, 4, 9, 4, P.gray2);                                        // 玻璃砲管
  p.hline(3, 11, 4, P.gray4); p.hline(3, 11, 7, P.gray1);
  p.rect(4, 5, 7, 2, withAlpha(P.magenta, 0.8));                      // 管內能量
  p.rect(11, 3, 3, 6, P.gray3);                                       // 砲口
  p.hline(11, 13, 3, P.white); p.hline(11, 13, 8, P.gray1);
  p.line(5, 4, 6, 7, P.white); p.line(9, 4, 8, 7, P.hiSky);           // 玻璃裂紋
  p.line(3, 8, 8, 12, P.woodD); p.line(4, 8, 9, 12, P.wood);          // 砲架
  p.ellipse(5, 11, 3, 3, P.woodD); p.ring(5, 11, 3, P.woodL);         // 輪
  p.hline(3, 7, 11, P.woodL); p.vline(9, 13, 5, P.woodL);             // 輪輻
  p.ellipse(5, 11, 1.1, 1.1, P.wood); p.px(4, 10, P.bone);
  p.px(14, 6, P.white); p.star4(14, 6, 2, withAlpha(P.magentaL, 0.9), P.white);
}, { kira: true });
// 環繞魂衛：核心＋兩條相互傾斜的橢圓軌道＋三顆大小不一的衛星（原子式）。
defineIcon('ability_orbit', P.shardD, (p) => {
  p.glow(8, 8, 4, P.shard, 0.2, 3);
  const orb = (rot, c) => {
    for (let a = 0; a < Math.PI * 2; a += 0.08) {
      const ex = Math.cos(a) * 6.1, ey = Math.sin(a) * 2.3;
      p.px(Math.round(8 + ex * Math.cos(rot) - ey * Math.sin(rot)),
        Math.round(8 + ex * Math.sin(rot) + ey * Math.cos(rot)), c);
    }
  };
  orb(-0.55, withAlpha(P.shardL, 0.8));
  orb(0.55, withAlpha(P.shard, 0.6));
  p.ellipse(8, 8, 2.1, 2.1, P.shardD);                                // 核心
  p.ellipse(8, 8, 1.4, 1.4, P.shardL); p.px(7, 7, P.white);
  p.ellipse(13, 4, 1.3, 1.3, P.neonL); p.px(13, 4, P.white);          // 衛星
  p.ellipse(3, 12, 1.3, 1.3, P.shardL);
  p.ellipse(12, 12, 1, 1, P.holyL);
}, { kira: true });
// 魂爆：蕈狀爆炸雲——上方三團翻滾煙火、中間火柱、底部白熱衝擊核。
// 刻意做成上重下亮的不對稱塊體，與「霜噬」的六角雪花完全不同。
defineIcon('ability_nova', '#5a2a1a', (p) => {
  p.glow(8, 10, 6, P.ember, 0.3, 3);
  p.ellipse(5, 6, 2.8, 2.3, P.ember); p.ellipse(11, 6, 2.6, 2.1, P.ember);
  p.ellipse(8, 4.5, 3.2, 2.5, P.ember);                               // 蕈傘
  p.ellipse(5, 5.2, 1.8, 1.3, P.emberL); p.ellipse(8, 3.6, 2, 1.4, P.emberL);
  p.ellipse(11, 5.4, 1.5, 1.1, P.emberL);
  p.rect(6, 7, 4, 5, P.ember); p.rect(7, 7, 2, 5, P.emberL);          // 火柱
  p.ellipse(8, 12, 3.4, 1.7, P.ember);                                // 衝擊核
  p.ellipse(8, 12, 2.2, 1.1, P.holy); p.px(8, 12, P.white);
  p.px(3, 9, P.emberL); p.px(13, 10, P.ember); p.px(4, 12, P.ember); p.px(13, 3, P.emberL);
}, { kira: true });
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
}, { kira: true });
// 瞬影：一個奔跑的人形，身後拖兩層遞淡的殘影。
defineIcon('ability_dash', P.blueD, (p) => {
  p.glow(8, 9, 5, P.ice, 0.18, 3);
  const runner = (ox, c) => {
    p.ellipse(8 + ox, 4, 1.7, 1.7, c);                                // 頭
    p.rect(6 + ox, 6, 4, 5, c);                                       // 軀幹
    p.line(7 + ox, 10, 5 + ox, 14, c); p.line(6 + ox, 10, 4 + ox, 13, c);  // 後腿
    p.line(9 + ox, 10, 11 + ox, 13, c); p.line(10 + ox, 11, 12 + ox, 13, c); // 前腿
    p.line(7 + ox, 7, 4 + ox, 5, c);                                  // 後臂
    p.line(9 + ox, 7, 12 + ox, 9, c);                                 // 前臂
  };
  runner(-4, withAlpha(P.blueL, 0.32));                               // 殘影
  runner(-1, P.ink2);                                                 // 暗描邊，把主體切出來
  runner(0, P.ice);
  p.px(8, 4, P.white); p.vline(6, 10, 7, P.hiSky);
});
// 幸運符：四葉草（四片心葉＋一根彎莖）。與「幸運星辰」的流星是不同輪廓。
defineIcon('ability_luck', P.greenD, (p) => {
  p.glow(8, 7, 4.5, P.toxic, 0.18, 3);
  const leaf = (cx, cy) => {
    p.ellipse(cx, cy, 2.3, 2.3, P.leafD);
    p.ellipse(cx, cy, 1.9, 1.9, P.leaf);
    p.ellipse(cx - 0.6, cy - 0.6, 1.2, 1.2, P.leafL);
  };
  leaf(5, 5); leaf(11, 5); leaf(5, 10); leaf(11, 10);
  p.ellipse(8, 7.5, 1.3, 1.3, P.leafD); p.px(8, 7, P.toxic);          // 葉心
  p.line(8, 9, 9, 12, P.leafD); p.line(9, 12, 11, 13, P.leafD);       // 莖
  p.px(4, 4, P.white); p.px(10, 9, P.toxic);
}, { kira: true });

// D6 status passives — dedicated glowing icons (no longer fall back to ability_power)
// 霜噬之觸：六臂帶側枝的雪花結晶。
defineIcon('ability_frostbite', P.blueD, (p) => {
  p.glow(8, 8, 5.5, P.ice, 0.26, 3);
  for (let k = 0; k < 6; k++) {
    const a = k * Math.PI / 3;
    const ex = 8 + Math.cos(a) * 5.8, ey = 8 + Math.sin(a) * 5.8;
    p.line(8, 8, ex, ey, P.iceD);
    p.line(8, 8, ex, ey, k % 2 ? P.ice : P.hiSky);
    const mx = 8 + Math.cos(a) * 3.3, my = 8 + Math.sin(a) * 3.3;
    p.line(mx, my, mx + Math.cos(a + 0.95) * 2.1, my + Math.sin(a + 0.95) * 2.1, P.ice);
    p.line(mx, my, mx + Math.cos(a - 0.95) * 2.1, my + Math.sin(a - 0.95) * 2.1, P.iceD);
    p.px(Math.round(ex), Math.round(ey), P.white);
  }
  p.ellipse(8, 8, 1.5, 1.5, P.hiSky); p.px(8, 8, P.white); p.px(7, 7, P.glint);
}, { kira: true });
// 裂創：三道由粗轉細的撕裂爪痕，傷口邊緣翻出亮色、下緣掛血珠。
defineIcon('ability_lacerate', P.blood, (p) => {
  p.glow(8, 8, 5, P.laser, 0.16, 3);
  const slash = (x0, y0, x1, y1, c) => {
    p.line(x0, y0, x1, y1, darken(c, 0.45));
    p.line(x0 + 1, y0, x1 + 1, y1, c);
    p.line(x0 + 1, y0, Math.round((x0 + x1) / 2) + 1, Math.round((y0 + y1) / 2), lighten(c, 0.3));
    p.px(x0 + 1, y0, P.white);
  };
  slash(2, 3, 6, 13, P.redL);
  slash(6, 2, 10, 12, P.red);
  slash(10, 3, 13, 11, P.redD);
  p.ellipse(4, 14, 1, 1, P.red); p.px(11, 13, P.redL);
}, { kira: true });
// 燃魂：一團有明確火舌尖端的火焰（外焰／中焰／白熱內焰三階）＋左側小分焰。
defineIcon('ability_ignite', '#5a2a1a', (p) => {
  p.glow(8, 10, 5.5, P.ember, 0.35, 3);
  p.ellipse(8, 10, 3.6, 3.3, P.ember);                                // 外焰
  p.line(8, 2, 5, 9, P.ember); p.line(8, 2, 11, 9, P.ember);
  p.rect(6, 6, 5, 5, P.ember);
  p.ellipse(8, 10.5, 2.3, 2.3, P.emberL);                             // 中焰
  p.line(8, 5, 7, 9, P.emberL); p.rect(7, 7, 3, 4, P.emberL);
  p.ellipse(8, 11, 1.3, 1.4, P.holyL); p.px(8, 11, P.white);          // 內焰
  p.ellipse(4.5, 11, 1.6, 2, withAlpha(P.ember, 0.85));               // 左側分焰
  p.px(4, 10, P.emberL); p.px(8, 3, P.gold);
}, { kira: true });
// 過載核心：直立的能量電池（上下端子＋能量窗＋內部閃電），外殼裂縫漏出過載光。
// 與「連鎖閃電」的裸閃電、「靜電力場」的線圈都不同：這是一個有殼的方形元件。
defineIcon('ability_overload', P.purpleD, (p) => {
  p.glow(8, 8, 5.5, P.mana, 0.28, 3);
  p.rect(6, 1, 4, 2, P.gray3); p.px(6, 1, P.gray4);                   // 上端子
  p.gradV(4, 3, 8, 10, lighten(P.gray1, 0.4), darken(P.gray1, 0.3));  // 殼
  p.rectLine(4, 3, 8, 10, P.ink2);
  p.hline(5, 10, 3, P.gray4);
  p.rect(5, 13, 6, 1, P.gray2);                                       // 下端子
  p.rect(6, 5, 4, 6, P.void);                                         // 能量窗
  p.line(9, 5, 7, 8, P.manaL); p.hline(6, 9, 8, P.manaL); p.line(9, 8, 7, 11, P.manaL);
  p.px(8, 8, P.white);
  p.line(4, 7, 2, 9, P.magentaL); p.line(11, 6, 13, 8, P.magentaL);   // 過載裂縫
  p.px(2, 9, P.white); p.px(13, 8, P.white);
}, { kira: true });

// cursed abilities — 共用暗紅底板（那是「詛咒」這件事的提示），但 glyph 各畫各的
// 具體物件：契約捲軸／瘋狂螺旋／砝碼／琉璃人像／錢袋。絕不是「同一個環＋換符號」。
defineIcon('ability_curse_bloodpact', '#2a0e16', (p) => {
  p.glow(8, 8, 5.5, P.blood, 0.26, 3);
  p.gradV(4, 3, 9, 10, P.bone, darken(P.bone, 0.34));                 // 羊皮紙
  p.vline(3, 12, 4, lighten(P.bone, 0.22));
  p.rect(3, 2, 10, 2, P.wood); p.hline(3, 12, 2, P.woodL);            // 上捲軸棒
  p.rect(3, 13, 10, 1, P.woodD);                                      // 下捲軸棒
  p.hline(6, 11, 5, darken(P.bone, 0.45)); p.hline(6, 10, 6, darken(P.bone, 0.45));
  p.ellipse(8, 10, 2, 1.7, P.redD);                                   // 血手印：掌
  p.px(6, 8, P.redD); p.px(7, 8, P.red); p.px(9, 8, P.red); p.px(10, 8, P.redD);
  p.vline(8, 9, 6, P.redD); p.vline(8, 9, 10, P.redD);                // 手指
  p.px(8, 11, P.laser); p.px(7, 10, P.red);
}, { kira: true });
defineIcon('ability_curse_frenzy', '#2a0e16', (p) => {
  p.glow(8, 8, 6, P.laser, 0.28, 3);
  let a = 0, r = 6.1;                                                 // 向內收束的瘋狂螺旋
  for (let i = 0; i < 150; i++) {
    p.px(Math.round(8 + Math.cos(a) * r), Math.round(8 + Math.sin(a) * r),
      i < 50 ? P.blood : (i < 105 ? P.red : P.laser));
    a += 0.16; r -= 0.038;
  }
  for (let k = 0; k < 3; k++) {                                       // 外圈三支尖角
    const t = -Math.PI / 2 + k * Math.PI * 2 / 3;
    p.line(8 + Math.cos(t) * 5.2, 8 + Math.sin(t) * 5.2, 8 + Math.cos(t) * 7, 8 + Math.sin(t) * 7, P.laser);
    p.px(Math.round(8 + Math.cos(t) * 7), Math.round(8 + Math.sin(t) * 7), P.redL);
  }
  p.px(8, 8, P.white);
}, { kira: true });
defineIcon('ability_curse_titan', '#2a0e16', (p) => {
  p.glow(8, 8, 5, P.blood, 0.22, 3);
  p.ring(8, 4, 2.2, P.gray2); p.hline(7, 8, 2, P.gray4);              // 提環
  for (let y = 5; y <= 11; y++) {                                     // 上窄下寬的砝碼
    const w = 1.8 + (y - 5) * 0.78;
    p.hline(8 - w, 7 + w, y, y < 7 ? P.gray4 : (y < 9 ? P.gray3 : P.gray2));
    p.px(Math.round(7 + w), y, P.gray1);                              // 右側暗邊
  }
  p.hline(6, 9, 5, P.white);                                          // 受光頂緣
  p.rect(2, 12, 12, 2, P.gray2); p.hline(2, 13, 12, P.gray3);         // 底盤
  p.hline(6, 9, 8, P.ink2); p.hline(6, 9, 9, P.ink);                  // 重量刻紋
  p.px(3, 13, P.laser); p.px(12, 13, P.laser); p.px(7, 13, P.redD);   // 壓裂

}, { kira: true });
defineIcon('ability_curse_glasssoul', '#2a0e16', (p) => {
  p.glow(8, 8, 5, P.shard, 0.22, 3);
  p.ellipse(8, 4, 2, 2.2, withAlpha(P.shardL, 0.85));                 // 琉璃人像：頭
  p.rect(6, 6, 5, 6, withAlpha(P.shard, 0.9));                        // 軀幹
  p.rect(4, 6, 2, 4, withAlpha(P.shard, 0.7));                        // 雙臂
  p.rect(11, 6, 2, 4, withAlpha(P.shard, 0.7));
  p.rect(6, 12, 2, 2, withAlpha(P.shard, 0.8));                       // 雙腿
  p.rect(9, 12, 2, 2, withAlpha(P.shard, 0.8));
  p.vline(6, 11, 6, P.shardL); p.px(7, 3, P.white); p.vline(6, 11, 10, withAlpha(P.shardD, 0.8));
  p.line(8, 7, 7, 9, P.laser); p.line(7, 9, 9, 11, P.laser);          // 胸口裂痕
  p.line(5, 7, 4, 9, withAlpha(P.laser, 0.7)); p.px(8, 8, P.white);
}, { kira: true });
defineIcon('ability_curse_greedpact', '#2a0e16', (p) => {
  p.glow(8, 9, 5.5, P.gold, 0.2, 3);
  p.ellipse(8, 10, 4.6, 3.6, darken(P.leather, 0.35));                // 錢袋
  p.ellipse(8, 10, 4, 3.1, P.leather);
  p.ellipse(6.6, 9, 2.2, 1.5, lighten(P.leather, 0.3));
  p.rect(6, 5, 5, 2, P.woodD); p.hline(6, 10, 5, P.wood);             // 束口
  p.px(7, 3, P.goldL); p.px(9, 3, P.gold); p.px(8, 2, P.goldL);       // 露出的幣
  p.hline(4, 11, 7, P.laser); p.px(4, 7, P.redL); p.px(11, 7, P.redL);// 詛咒束繩
  p.px(5, 12, P.gray3); p.px(8, 13, P.gray3); p.px(11, 12, P.gray3);
  p.vline(9, 11, 8, P.goldD); p.px(8, 9, P.goldL);                    // 袋上幣紋
}, { kira: true });

export const ICONS_READY = true;
