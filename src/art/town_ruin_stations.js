import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════════
//  Round-19 ruin-town INTERACTABLES — 末日遺跡 anime pixel style.
//  Desaturated ash-stone bases + two accent glows: ember-orange survivor fire
//  (P.ember/P.emberL) and soul-teal afterlife light (P.shard/P.neon).
//  All standing props anchor base-centre ('feet') like other tall town sprites.
//  Sprite names + sizes are FROZEN per docs/ROUND19_SPEC.md §A4.
// ════════════════════════════════════════════════════════════════════════════

// shared ruin-stone tones (derived from existing palette keys only)
const ST   = mix(P.gray2, P.bone, 0.18);          // mid ash-stone
const STL  = mix(P.gray3, P.bone, 0.28);          // lit stone
const STD  = darken(P.gray1, 0.10);               // shaded stone
const CRACK = darken(P.gray1, 0.35);              // deep crack ink

// small helper: cracked vertical stone block with per-row tonal jitter
function stoneCol(p, x, y, w, h, seed = 1) {
  p.gradV(x, y, w, h, STL, STD);
  // chiselled side shading
  p.vline(y, y + h - 1, x, darken(ST, 0.22));
  p.vline(y, y + h - 1, x + w - 1, darken(ST, 0.3));
  // block seams
  for (let j = y + 3 + (seed % 3); j < y + h - 2; j += 5) {
    p.hline(x + 1, x + w - 2, j, darken(ST, 0.26));
  }
  p.speckle(x, y, w, h, darken(ST, 0.4), Math.max(3, (h / 4) | 0), seed);
}

// ── 1. portal_grand 48×64 anim 3f — THE sortie portal, town centrepiece ──────
// Twin ruined pillars on a cracked dais; between them a swirling teal/violet
// soul-vortex with orbiting runes + kira sparkles. Frame index spins the swirl.
defineAnim('portal_grand', 48, 64, 3, (p, f) => {
  const ph = f / 3;                      // phase 0, 1/3, 2/3
  const cx = 24, cy = 33;                // vortex centre

  // ground shadow + cracked stone dais (two steps)
  p.softShadow(24, 61, 19, 3.2, 0.4);
  p.ellipse(24, 59, 18, 4, STD);
  p.ellipse(24, 58, 18, 3.4, ST);
  p.ellipse(24, 57, 14, 2.6, STL);
  p.ellipse(24, 57, 14, 1.6, mix(STL, P.shard, 0.12));   // soul-stained top
  // dais cracks radiating from the gate
  p.line(16, 58, 10, 61, CRACK); p.line(31, 58, 38, 61, CRACK);
  p.line(24, 56, 22, 60, CRACK); p.px(28, 59, CRACK); p.px(14, 59, CRACK);
  p.speckle(8, 55, 32, 6, darken(ST, 0.35), 10, 7);

  // ambient back-glow of the vortex bleeding onto everything behind it
  p.glow(cx, cy, 17, P.shard, 0.16, 5);

  // ── twin ruined pillars (left taller, right snapped lower — asymmetric ruin)
  // left pillar
  stoneCol(p, 5, 12, 8, 45, 3);
  // broken jagged top
  p.rect(5, 10, 8, 3, ST); p.px(5, 9, ST); p.px(7, 8, STL); p.px(10, 9, ST); p.px(12, 10, STD);
  p.px(8, 9, STL);
  // remnant capital ledge
  p.rect(4, 15, 10, 2, STL); p.hline(4, 13, 15, lighten(STL, 0.18));
  // base plinth
  p.rect(3, 53, 12, 4, ST); p.hline(3, 14, 53, STL); p.vline(53, 56, 3, darken(ST, 0.25));
  // cracks + moss
  p.line(8, 22, 10, 30, CRACK); p.line(10, 30, 9, 38, CRACK);
  p.px(6, 44, P.moss); p.px(7, 45, P.moss); p.px(11, 19, P.moss);
  // right pillar (snapped shorter)
  stoneCol(p, 35, 18, 8, 39, 11);
  p.rect(35, 16, 8, 3, ST); p.px(35, 15, STD); p.px(38, 14, STL); p.px(41, 15, ST); p.px(36, 15, STL);
  p.rect(34, 21, 10, 2, STL); p.hline(36, 43, 21, lighten(STL, 0.18));
  p.rect(33, 53, 12, 4, ST); p.hline(33, 44, 53, STL); p.vline(53, 56, 44, darken(ST, 0.25));
  p.line(38, 27, 36, 35, CRACK); p.line(36, 35, 38, 43, CRACK);
  p.px(42, 48, P.moss); p.px(41, 49, P.moss);
  // fallen lintel fragment leaning on the right pillar base
  p.rect(28, 50, 9, 4, ST); p.hline(28, 36, 50, STL);
  p.line(29, 51, 34, 52, darken(ST, 0.3));

  // glowing runes carved down each pillar's inner face (pulse with frame)
  const runeA = f === 0 ? P.shardL : P.shard;
  const runeB = f === 1 ? P.shardL : P.shard;
  [19, 26, 33, 40, 47].forEach((ry, i) => {
    const c = (i % 2 === f % 2) ? runeA : mix(P.shard, P.astral, 0.4);
    p.px(11, ry, c); p.px(12, ry + 1, c); p.px(11, ry + 2, c);
    p.glow(11, ry + 1, 2, P.shard, 0.18, 2);
  });
  [24, 31, 38, 45].forEach((ry, i) => {
    const c = (i % 2 === (f + 1) % 2) ? runeB : mix(P.shard, P.astral, 0.4);
    p.px(36, ry, c); p.px(35, ry + 1, c); p.px(36, ry + 2, c);
    p.glow(36, ry + 1, 2, P.shard, 0.18, 2);
  });

  // ── the soul-vortex between the pillars ────────────────────────────────────
  // layered translucent body: violet rim → teal core (tall ellipse)
  p.ellipse(cx, cy, 10, 16, withAlpha(P.void, 0.85));
  p.ellipse(cx, cy, 9, 15, withAlpha(P.purpleD, 0.7));
  p.ellipse(cx, cy, 8, 13, withAlpha(mix(P.astral, P.shardD, 0.45), 0.7));
  p.dither(cx - 6, cy - 10, 12, 20, withAlpha(P.shardD, 0.5), withAlpha(P.astral, 0.4));
  p.ellipse(cx, cy, 5, 9, withAlpha(P.shard, 0.55));

  // spiral arms — three arms, rotated by the frame phase
  for (let arm = 0; arm < 3; arm++) {
    const base = arm * (Math.PI * 2 / 3) + ph * Math.PI * 2;
    for (let t = 0; t < 1; t += 0.07) {
      const ang = base + t * 3.6;
      const rx = 1.5 + t * 8.5, ry = 2 + t * 13.5;
      const x = Math.round(cx + Math.cos(ang) * rx);
      const y = Math.round(cy + Math.sin(ang) * ry);
      const col = t < 0.35 ? P.shardL : (arm === 1 ? mix(P.magenta, P.astral, 0.5) : (t < 0.7 ? P.neon : P.astralL));
      p.px(x, y, col);
      if (t < 0.5 && arm !== 1) p.px(x, y + 1, withAlpha(P.neonL, 0.6));
    }
  }
  // blazing core + heartbeat glow
  p.glow(cx, cy, 5, P.neon, 0.5, 3);
  p.ellipse(cx, cy, 2, 3, P.shardL);
  p.px(cx, cy - 1, P.white); p.px(cx, cy, P.glint);
  // pulsing aura ring around the whole vortex
  p.aura(cx, cy, 12, P.shard, ph, 2);

  // orbiting rune-motes + kira sparkles (positions advance per frame)
  const orbit = [[0, -14], [11, -5], [9, 9], [-10, 8], [-12, -4], [3, 14]];
  orbit.forEach(([ox, oy], i) => {
    const k = (i + f) % orbit.length;
    const [mx, my] = orbit[k];
    const col = i % 2 ? P.magentaL : P.shardL;
    p.px(cx + mx, cy + my, col);
    if (i % 3 === 0) p.glow(cx + mx, cy + my, 1.6, i % 2 ? P.magenta : P.shard, 0.3, 2);
  });
  p.star4(cx - 7 + f * 2, cy - 11 + (f === 1 ? 2 : 0), 2, P.white, P.shardL);
  p.star4(cx + 8 - f, cy + 7 + f, 1, P.astralL);
  p.sparkle(cx + 5, cy - 6 - f, P.neonL, 1);
  p.sparkle(cx - 5, cy + 10 - f * 2, P.white, 1);

  // drifting ash + ember motes at the foot of the gate
  p.px(9 + f * 3, 51 - f, withAlpha(P.gray4, 0.7));
  p.px(38 - f * 2, 49 + f, withAlpha(P.gray4, 0.6));
  p.px(17 + f, 55, P.ember); p.px(31 - f, 54, P.emberL);

  // volume + light pass
  p.shadeBottom(0.16, 52);
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 5 });

// ── 2. ruin_lamp 12×26 anim 2f — broken lamppost re-lit with a soul-flame ───
defineAnim('ruin_lamp', 12, 26, 2, (p, f) => {
  p.softShadow(6, 25, 4, 1.3, 0.32);
  // cracked stone footing
  p.rect(3, 22, 6, 3, ST); p.hline(3, 8, 22, STL);
  p.px(4, 24, CRACK); p.px(7, 23, darken(ST, 0.3));
  // bent iron post (kinked at mid-height — the apocalypse bent it)
  p.vline(12, 21, 5, P.iron); p.vline(12, 21, 6, darken(P.iron, 0.25));
  p.px(5, 11, P.iron); p.px(4, 10, P.iron); p.px(4, 9, darken(P.iron, 0.2));
  p.vline(6, 8, 4, P.iron); p.vline(6, 8, 5, darken(P.iron, 0.3));
  p.px(5, 14, lighten(P.iron, 0.25));            // worn glint
  p.px(6, 18, darken(P.ember, 0.45));            // rust fleck
  // shattered lantern cage at the top — half the glass gone
  p.rect(2, 3, 7, 4, darken(P.iron, 0.15));
  p.hline(2, 8, 2, P.iron); p.px(5, 1, P.iron);  // cap + finial
  p.px(2, 7, P.iron); p.px(8, 7, P.iron);        // cage feet
  p.px(9, 4, darken(P.iron, 0.35));              // snapped bar stub
  // the soul-flame inside (teal, flicker between frames)
  const fy = f ? 4 : 5;
  p.glow(5, 5, 4.5, P.shard, 0.4, 3);
  p.px(5, fy, P.shardL); p.px(4, 5, P.shard); p.px(6, 5, P.shard);
  p.px(5, fy - 1, f ? P.white : P.shardL);
  p.px(5, 6, P.shardD);
  // stray soul-mote drifting up
  p.px(f ? 8 : 7, f ? 0 : 1, withAlpha(P.shardL, 0.8));
  p.sparkle(3, 4, P.neonL, 0);
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 3 });

// ── 3. ruin_well 22×22 — crumbled stone well, dark soul-lit shaft ────────────
defineSprite('ruin_well', 22, 22, (p) => {
  p.softShadow(11, 21, 8.5, 2, 0.34);
  // collapsed crossbeam: one post still stands, the other snapped
  p.vline(4, 12, 3, P.woodD); p.vline(4, 12, 4, P.wood);
  p.px(4, 4, P.woodL);
  p.px(17, 10, P.woodD); p.px(18, 11, P.woodD);          // snapped stub
  p.line(5, 4, 12, 6, P.woodD); p.line(5, 3, 11, 5, P.wood); // fallen beam leaning across
  // frayed rope dangling from the beam into the shaft
  p.vline(6, 11, 9, mix(P.bone, P.wood, 0.45));
  p.px(9, 12, darken(P.bone, 0.3)); p.px(10, 13, darken(P.bone, 0.35));
  // stone ring (broken on the right side)
  p.ellipse(11, 15, 9, 5, ST);
  p.ellipse(11, 14, 8, 4, STL);
  p.ellipse(11, 15, 6, 3, STD);                           // inner lip
  // the dark shaft with a faint soul glow rising
  p.ellipse(11, 15, 5, 2.4, P.shadow);
  p.glow(11, 15, 3, P.shard, 0.22, 2);
  p.px(10, 15, withAlpha(P.shardL, 0.7)); p.px(12, 16, withAlpha(P.shard, 0.6));
  // crumbled gap in the ring + scattered fallen blocks
  p.rect(17, 13, 4, 3, 'rgba(0,0,0,0)');                  // (notch kept subtle)
  p.px(18, 13, STD); p.px(19, 14, ST);
  p.rect(18, 17, 3, 2, ST); p.px(18, 17, STL);            // fallen block
  p.px(2, 18, ST); p.px(1, 19, STD);                      // rubble crumbs
  // cracks + moss on the ring
  p.line(5, 13, 4, 16, CRACK); p.px(14, 18, CRACK);
  p.px(6, 12, P.moss); p.px(7, 18, P.moss); p.px(15, 11, P.moss);
  p.hline(8, 13, 11, lighten(STL, 0.2));                  // rim highlight
  p.shadeBottom(0.18, 17);
  p.rimLight(P.rimCool, 0.3);
  p.outline(P.ink);
}, { anchor: 'feet' });

// ── 4. ruin_fountain 34×28 anim 2f — broken fountain, thin soul-water trickle
defineAnim('ruin_fountain', 34, 28, 2, (p, f) => {
  p.softShadow(17, 27, 14, 2.4, 0.36);
  // wide lower basin — cracked, one chunk missing on the left
  p.ellipse(17, 23, 14, 4.5, ST);
  p.ellipse(17, 22, 13, 4, STL);
  p.ellipse(17, 23, 11, 3.2, STD);                        // inner wall
  // basin pool: shallow soul-tinted water with drift shimmer
  p.ellipse(17, 23, 10, 2.6, mix(P.shardD, P.void, 0.45));
  p.ellipse(17, 23, 8, 2, mix(P.shard, P.void, 0.35));
  p.px(13 + f * 2, 23, P.shardL); p.px(21 - f * 3, 24, withAlpha(P.shardL, 0.8));
  p.px(17 + f, 22, withAlpha(P.neonL, 0.7));
  // missing chunk + fallen rim piece
  p.px(4, 21, P.shadow); p.px(5, 21, STD);
  p.rect(2, 24, 4, 2, ST); p.px(2, 24, STL);
  // cracks on the rim
  p.line(9, 21, 7, 24, CRACK); p.line(26, 21, 28, 24, CRACK); p.px(22, 25, CRACK);
  p.px(8, 20, P.moss); p.px(27, 25, P.moss);
  // central column — snapped, upper bowl gone but for a tilted shard
  stoneCol(p, 14, 8, 6, 13, 5);
  p.px(14, 7, ST); p.px(16, 6, STL); p.px(18, 7, STD);    // jagged break
  p.rect(12, 4, 7, 3, ST); p.hline(12, 18, 4, STL);       // tilted bowl shard
  p.px(19, 5, STD); p.line(13, 6, 17, 6, darken(ST, 0.3));
  p.line(16, 11, 15, 16, CRACK);
  // the thin trickle: soul-water leaking from a crack in the column
  const tx = 19, drift = f ? 1 : 0;
  p.vline(9, 20, tx, withAlpha(P.shardL, 0.85));
  p.px(tx, 9 + drift, P.white);
  p.px(tx + (f ? 1 : 0), 14, P.shardL);
  p.px(tx, 20 + drift, P.neonL);
  p.glow(tx, 21, 2.5, P.shard, 0.3, 2);                   // splash glow
  p.px(tx - 1, 21, withAlpha(P.shardL, 0.8)); p.px(tx + 1, 22 - drift, withAlpha(P.shardL, 0.7));
  // faint rising mote + kira
  p.px(21 + f, 2 - f, withAlpha(P.shardL, 0.75));
  p.star4(11, 3 + f, 1, P.white, P.shardL);
  p.sparkle(25, 19 - f, P.neonL, 0);
  p.shadeBottom(0.15, 22);
  p.rimLight(P.rimCool, 0.32);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 3 });

// ── 5. ruin_torchpost 10×24 anim 3f — standing torch (interior/door flanking)
defineAnim('ruin_torchpost', 10, 24, 3, (p, f) => {
  p.softShadow(5, 23, 3.5, 1.2, 0.3);
  // stone foot + iron-banded wooden post
  p.rect(3, 21, 4, 2, ST); p.hline(3, 6, 21, STL);
  p.vline(8, 20, 4, P.woodD); p.vline(8, 20, 5, P.wood);
  p.px(4, 12, lighten(P.woodL, 0.15));                   // grain glint
  p.hline(4, 5, 17, P.iron); p.hline(4, 5, 10, P.iron);  // bands
  p.px(5, 9, darken(P.ember, 0.5));                      // rust
  // iron torch cup
  p.rect(2, 7, 6, 2, darken(P.iron, 0.1));
  p.hline(2, 7, 7, P.steelD); p.px(2, 6, P.iron); p.px(7, 6, P.iron);
  // ember flame — 3-frame flicker (lean left / tall / lean right)
  const lean = f === 0 ? -1 : (f === 2 ? 1 : 0);
  const tall = f === 1 ? 1 : 0;
  p.glow(5, 4, 4.5, P.ember, 0.45, 3);
  p.px(4, 5, P.ember); p.px(5, 5, P.emberL); p.px(6, 5, P.ember);
  p.px(5 + lean, 4, P.emberL); p.px(5, 4, P.emberL);
  p.px(5 + lean, 3 - tall, P.emberL);
  p.px(5 + lean, 2 - tall, P.white);
  p.px(4 - (lean < 0 ? 1 : 0), 4, mix(P.ember, P.red, 0.4));
  // rising ember spark
  p.px(6 + lean, 1 - tall, withAlpha(P.emberL, 0.85));
  p.px(3, 0 + (f === 1 ? 0 : 1), withAlpha(P.ember, 0.5));
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
}, { anchor: 'feet', fps: 6 });
