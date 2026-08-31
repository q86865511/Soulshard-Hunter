// Biome tilesets — procedurally generated floor/wall sprites per biome palette,
// plus per-biome decorations. Gives each big map a distinct look.
//
// ENHANCED EDITION (art_v2): the original 5 biomes (crypt/cavern/frost/inferno/void)
// keep their id + field shape unchanged, but their tilesets are enriched with depth,
// accent glints and livelier "floorx" feature tiles (some animated). Five NEW living
// biomes are appended (verdant / desert / swamp / abyss / celestial), each with the
// same field shape and the same floor_/floor2_/floorx_/wall_/walltop_ sprite naming
// produced by tileset(). New per-biome decor (bd_*) is added too. Tiles stay calm /
// low-noise (blocks + a few accents, seeded specks) so maps never strobe.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

export const BIOMES = [
  // ── original 5 (id + field shape UNCHANGED) ────────────────────────────────
  { id: 'crypt', name: '幽影地穴', floor: '#282b37', floor2: '#323642', line: '#15161e', wall: '#48548f', wallD: '#2d3563', wallL: '#7585cf', decor: 'torch', accent: P.shardL, fog: 'rgba(10,12,26,0.0)' },  // R26/B1: floor lifted (was #24262f); B1c: floor2 tightened for ≤8-step v1 mix (was #353a4d)
  { id: 'cavern', name: '水晶洞窟', floor: '#1c2a2e', floor2: '#243638', line: '#121e20', wall: '#2e4a4e', wallD: '#1f3236', wallL: '#4a7076', decor: 'crystal', accent: P.shard, fog: 'rgba(20,40,44,0.05)' },
  { id: 'frost', name: '霜寒冰原', floor: '#2b3d54', floor2: '#354862', line: '#16202e', wall: '#37506e', wallD: '#243a52', wallL: '#5f86b0', decor: 'ice', accent: P.ice, fog: 'rgba(160,220,255,0.05)' },  // R26/B1c: floor/floor2 lifted for snow feel (was #1e2a3a / #26344a — near-black, off-name)
  { id: 'inferno', name: '熔岩深淵', floor: '#2a1816', floor2: '#36201c', line: '#1c0e0c', wall: '#4a2a22', wallD: '#321c16', wallL: '#7a4030', decor: 'lava', accent: P.ember, fog: 'rgba(60,20,10,0.06)' },
  { id: 'void', name: '虛空裂界', floor: '#1c1430', floor2: '#241a40', line: '#120c20', wall: '#3a2a5a', wallD: '#261a40', wallL: '#5a4482', decor: 'voidcrystal', accent: P.purpleL, fog: 'rgba(40,20,70,0.06)' },

  // ── NEW 5 (same field shape) ───────────────────────────────────────────────
  { id: 'verdant', name: '翠林森境', floor: '#33482a', floor2: '#3d5533', line: '#192611', wall: '#3a5230', wallD: '#243a1e', wallL: '#5f8444', decor: 'bd_verdant_tree', accent: P.leafL, fog: 'rgba(120,200,120,0.05)' },  // R26/B1: floor brightened so grass isn't near-black + walltop skirt stops reading as a floating band (was #26361f / #2f4326)
  { id: 'desert', name: '流沙荒漠', floor: '#caa260', floor2: '#d8b46a', line: '#9c7a3e', wall: '#9a7334', wallD: '#634619', wallL: '#f0d188', decor: 'bd_desert_cactus', accent: P.sandL, fog: 'rgba(240,220,160,0.06)' },
  { id: 'swamp', name: '腐沼濕地', floor: '#2c3a26', floor2: '#37472d', line: '#1b2618', wall: '#3c4a2e', wallD: '#27331f', wallL: '#5e7240', decor: 'bd_swamp_willow', accent: P.slimeBog, fog: 'rgba(110,140,70,0.07)' },
  { id: 'abyss', name: '深淵海溝', floor: '#0f3046', floor2: '#143b54', line: '#0a2030', wall: '#16415c', wallD: '#0d2e44', wallL: '#2f6f96', decor: 'bd_abyss_coral', accent: P.oceanL, fog: 'rgba(20,80,120,0.08)' },
  { id: 'celestial', name: '天界雲海', floor: '#5a6fae', floor2: '#647aba', line: '#3e4f86', wall: '#7488c4', wallD: '#52639c', wallL: '#b9c8f0', decor: 'bd_cel_pillar', accent: P.astralL, fog: 'rgba(200,210,255,0.05)' },  // R26/B1c: floor2 tightened for ≤8-step v1 mix (was #6a80c4)
];

// Per-biome FLOOR painters. v0 = CLEAN base, v1 = subtle alt shade (both calm/flat to
// avoid eye-straining per-tile noise), v2 = a distinct FEATURE floor (lava/snow/crystal/
// rift) — a strong COLOUR BLOCK that maps.js paints in contiguous regions for clear
// visual separation (some cells are lava, some are rock, …), not uniform texture.
// ENHANCED: every base tile now carries a faint top-left light + bottom shade for depth,
// a couple of seeded accent glints, and the feature tiles are livelier / animated where
// it reads well at 16px. floorx painters accept an optional frame index `f`.
// R26/B1b — plain-floor skeleton. The old per-tile top/bottom hlines + a 16px
// vertical gradient tiled into regular HORIZONTAL BANDING across the map (glaring
// once floors were brightened). Fix: a FLAT base + seeded multi-tone speckle
// (unique seed per variant) for grain, and scattered pixels in the extreme rows
// so row 0 / row 15 never tile into a solid edge line. `accents(p)` paints the
// biome's interior details (kept OFF the tile edges so they don't re-band).
function plainFloor(p, base, grain, s, accents) {
  p.rect(0, 0, 16, 16, base);
  if (accents) accents(p);
  p.speckle(0, 0, 16, 16, grain, 13, s);
  p.speckle(0, 0, 16, 16, withAlpha(darken(base, 0.12), 0.6), 8, s + 17);
  p.speckle(0, 0, 16, 16, withAlpha(lighten(base, 0.12), 0.5), 6, s + 41);
  // Break the extreme rows. R29/D-3 (RE-06): R26 replaced the solid edge hlines with six
  // dots, but they sat on FIXED columns of rows 0 and 15 — and since every tile of a variant
  // is the same baked canvas, those dots re-printed a dotted rule along each 16 px tile seam.
  // Same fix as everywhere else: seeded speckle over the whole tile. The three layers above
  // already reach rows 0 and 15, so the edge rows still get grain (the original purpose) —
  // they just no longer get it at the SAME columns in every tile. Measured across all 10
  // biomes: frost v0 seam 1.177 -> 0.793, abyss v0 1.962 -> 1.143, celestial v0 2.101 -> 0.970.
  p.speckle(0, 0, 16, 16, withAlpha(darken(base, 0.11), 0.7), 4, s + 71);
  p.speckle(0, 0, 16, 16, withAlpha(lighten(base, 0.07), 0.65), 3, s + 97);
}

const FLOORS = {
  // ── crypt: aged flagstone, pale worn feature ────────────────────────────────
  crypt: (p, b, v) => {
    if (v === 2) { // worn flagstone — polished, foot-worn stone, ground down to grain
      // R28/W3-C2 (W2 遺留 #1, crypt's share): the four short grout runs still touched the
      // tile EDGES, so neighbouring tiles butted them into continuous lines and a worn-floor
      // district printed a ruled grid at exactly 16 px pitch — the same R26 鐵律 failure the
      // "offset joints" fix only softened. The three wear pixels repeated per tile on top of
      // it. Joints belong to the decal channel (decal_crypt_seam / _crack_a / _crack_b,
      // already pooled and clustered by maps.js); the tile keeps flat value + seeded wear.
      // FLAT base, not gradV — a per-tile ramp tiles into horizontal banding.
      const fb = lighten(b.floor, 0.1);
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, lighten(fb, 0.08), 18, 11);                             // polished high spots
      p.speckle(0, 0, 16, 16, withAlpha(mix(b.floor, b.line, 0.4), 0.55), 12, 17);     // grit ground into the stone
      p.speckle(0, 0, 16, 16, withAlpha(lighten(b.floor2, 0.2), 0.6), 6, 19);
      p.speckle(0, 0, 16, 16, withAlpha(P.shardL, 0.14), 4, 23);
      return;
    }
    // R28/W2-D: v1 is a REAL step now (damp, slightly lifted flagstone) instead of an
    // 8-value nudge. R26 kept it near-invisible because the variant was a per-tile coin
    // flip and any contrast turned to salt-and-pepper; maps.js now places v1 in 2-5 tile
    // value-noise CLUSTERS, so the contrast reads as damp DISTRICTS. Coupled change —
    // strengthening this without the clustering would bring the old noise straight back.
    plainFloor(p, v === 1 ? lighten(b.floor2, 0.04) : b.floor, withAlpha(P.ink, 0.22), v === 1 ? 113 : 211,
      v === 1 ? (q) => { q.speckle(1, 1, 14, 14, withAlpha(P.shardL, 0.1), 5, 283); } : null);
  },
  // ── cavern: damp rock, crystal-vein feature ────────────────────────────────
  cavern: (p, b, v) => {
    if (v === 2) { // crystal-vein ground — mineralised grit shot through with shard glitter
      // R28/W3-C2: the two glow centres at (4,5)/(11,12) and the three shard GLYPHS at
      // (4,6)/(11,13)/(8,9) landed on the same relative spot in every tile, so a vein
      // district printed a regular shard lattice (R26 鐵律). The gradV did the same thing
      // vertically — a 16 px ramp inside every tile tiles into horizontal stripes across a
      // patch. Flat base + layered seeded grain now; the shard SILHOUETTES live in the decal
      // channel (decal_cavern_shardbits / _glintdust), which maps.js places per-map.
      const fb = mix(b.floor, b.accent, 0.34);
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, mix(fb, b.accent, 0.35), 20, 401);
      p.speckle(0, 0, 16, 16, withAlpha(P.shardL, 0.42), 9, 409);
      p.speckle(0, 0, 16, 16, withAlpha(P.white, 0.35), 4, 419);
      p.speckle(0, 0, 16, 16, withAlpha(darken(fb, 0.16), 0.55), 8, 421);
      return;
    }
    // R28/W3-C2: v1 becomes a REAL step — 濕蝕岩床, damp rock the seep has darkened and
    // mineralised — instead of a mid-mix nudge, readable now that maps.js places variants
    // in 2-5 tile value-noise clusters. The two fixed accent pixels at (12,12)/(3,9) were
    // the same R26 鐵律 dot motif frost/void carried; they become seeded mineral grit.
    plainFloor(p, v === 1 ? mix(b.floor2, b.accent, 0.12) : b.floor, withAlpha(b.accent, 0.12), v === 1 ? 137 : 79,
      (q) => {
        q.speckle(1, 1, 14, 14, withAlpha(darken(b.floor, 0.14), 0.5), 5, v === 1 ? 283 : 293);   // damp mottling
        q.speckle(1, 1, 14, 14, withAlpha(P.shardL, v === 1 ? 0.22 : 0.14), v === 1 ? 4 : 2, v === 1 ? 307 : 311);
      });
  },
  // ── frost: dark ice, snow-field feature ────────────────────────────────────
  frost: (p, b, v) => {
    if (v === 2) { // snow-dusted ice sheet — anchored to the floor tone (was stark white/ice → read as a bright pasted tile)
      // R28/W3-C1: the p.dither() band at (2,9) and the sparkle at (4,4) landed on the SAME
      // spot in every tile, so a snow field printed a regular dotted grid (R26 鐵律 — caught
      // on the W3-C1 tiled-field sheet, and plainly visible in the W2-D-era frost opening).
      // Swapped for layered seeded speckle: it tiles as continuous snow, never as a motif.
      const fb = mix(b.floor, P.ice, 0.4);
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, mix(fb, P.white, 0.3), 22, 19);
      p.speckle(0, 0, 16, 16, withAlpha(P.white, 0.45), 10, 23);
      p.speckle(0, 0, 16, 16, withAlpha(P.ice, 0.35), 8, 29);
      p.speckle(0, 0, 16, 16, withAlpha(darken(fb, 0.12), 0.5), 7, 31);
      return;
    }
    // R28/W3-C1: the accent stamped the SAME crack line (3,11)-(9,5) and the SAME glint at
    // (12,6) on EVERY tile — the R26 鐵律 violation left open by W2-D. Cracks move to the
    // decal channel (decal_frost_crack_a/b, already in the pool and now clustered); the tile
    // keeps seeded rime grain only. v1 becomes a REAL step — wind-packed snow drift over
    // bare ice — readable now that maps.js places variants in 2-5 tile clusters. Coupled
    // change: raising this contrast without the clustering brings back salt-and-pepper.
    plainFloor(p, v === 1 ? mix(b.floor2, P.ice, 0.18) : b.floor, withAlpha(P.white, 0.14), v === 1 ? 151 : 97,
      (q) => {
        q.speckle(1, 1, 14, 14, withAlpha(P.ice, 0.2), 5, v === 1 ? 293 : 283);                              // rime grain
        q.speckle(1, 1, 14, 14, withAlpha(P.white, 0.28), v === 1 ? 4 : 2, v === 1 ? 311 : 307);             // wind-polished glints
      });
  },
  // ── inferno: scorched rock, molten lava feature (animated) ─────────────────
  inferno: (p, b, v, f = 0) => {
    if (v === 2) { // molten lava — a crawling magma surface, animated by re-seeding the grain
      // R28/W3-C1: three fixed flow lines + three fixed glow centres put an IDENTICAL molten
      // pattern in every tile, so a lava lake tiled into wallpaper (R26 鐵律), and the
      // shadeBottom() darkened the same bottom rows in every tile → horizontal banding.
      // Now: layered seeded grain whose seed rolls with the frame, so the lake crawls.
      // FLAT base, not gradV: a 16 px vertical ramp inside every tile tiles into horizontal
      // stripes across a lake (same root cause R26/B1b fixed for plainFloor).
      p.rect(0, 0, 16, 16, mix(darken(P.ember, 0.4), darken(P.red, 0.26), 0.5));
      p.speckle(0, 0, 16, 16, P.ember, 20, 353);
      p.speckle(0, 0, 16, 16, withAlpha(P.emberL, 0.7), 11, 359 + f * 43);
      p.speckle(0, 0, 16, 16, withAlpha(P.white, 0.5), 4, 367 + f * 47);
      p.speckle(0, 0, 16, 16, withAlpha(darken(P.red, 0.4), 0.65), 10, 373);
      return;
    }
    // R28/W3-C1: v1 becomes cooled ASH CRUST — a desaturated warm-grey step over the charred
    // rock, so the noise-clustered patches read as burnt-out districts instead of a 6-value
    // nudge. Ember density drops on the crust (the fire moved on) and the ash grain lifts.
    plainFloor(p, v === 1 ? mix(b.floor2, P.iron, 0.15) : b.floor, withAlpha(P.ink, 0.20), v === 1 ? 173 : 59,
      (q) => {
        q.speckle(0, 0, 16, 16, withAlpha(P.ember, v === 1 ? 0.18 : 0.32), 5, v === 1 ? 337 : 349);   // R26/B1d: embers scattered via seed (was fixed px → satin grid)
        if (v === 1) q.speckle(1, 1, 14, 14, withAlpha(P.gray3, 0.22), 6, 367);                       // wind-lifted ash
      });
  },
  // ── void: dark stone, rift feature (animated mana motes) ───────────────────
  void: (p, b, v, f = 0) => {
    if (v === 2) { // void rift — raw void grit, animated by re-seeding the shimmer
      // R28/W3-C1: the two star4 glyphs at (5,5)/(11,11) plus two fixed glow centres printed
      // an identical bright cross-pair on EVERY rift tile, so a rift district tiled into a
      // regular star lattice — the single loudest 鐵律 break in the biome (obvious in the
      // W3-C1 opening shot). Texture only now; the star GLYPHS live in the decal channel
      // (decal_void_stardust), which maps.js places per-map and cannot tile.
      // FLAT base, not gradV — a per-tile vertical ramp tiles into horizontal stripes.
      p.rect(0, 0, 16, 16, mix(mix(b.floor, P.purple, 0.32), mix(b.floor, P.void, 0.42), 0.5));   // R26/B1c: rift toned toward the floor
      p.speckle(0, 0, 16, 16, mix(b.floor, P.purpleL, 0.42), 18, 419);
      p.speckle(0, 0, 16, 16, withAlpha(P.manaL, 0.45), 9, 421 + f * 37);
      p.speckle(0, 0, 16, 16, withAlpha(P.star, 0.5), 5, 433 + f * 41);
      p.speckle(0, 0, 16, 16, withAlpha(P.void, 0.5), 8, 439);
      return;
    }
    // R28/W3-C1: the two accent pixels sat at (11,8)/(5,12) on EVERY tile and printed a
    // regular 2-dot motif across the field (R26 鐵律) — replaced by seeded star grit. v1
    // becomes 星屑沉積, a real violet step, readable now that maps.js clusters variants.
    plainFloor(p, v === 1 ? mix(b.floor2, P.astral, 0.16) : b.floor, withAlpha(P.purpleL, 0.14), v === 1 ? 191 : 31,
      (q) => {
        q.speckle(1, 1, 14, 14, withAlpha(P.manaL, 0.26), 4, v === 1 ? 379 : 373);
        q.speckle(1, 1, 14, 14, withAlpha(P.star, 0.32), v === 1 ? 3 : 2, v === 1 ? 389 : 383);
      });
  },

  // ═══ NEW BIOMES ════════════════════════════════════════════════════════════
  // ── verdant: mossy soil + sun-dappled greens; feature = flower meadow ──────
  verdant: (p, b, v) => {
    if (v === 2) { // flower meadow — a SUBTLE lift over the base soil (not a bright green patch), dotted with blooms
      // R28/W3-C2: the two 5-pixel blossom rosettes at (4,5)/(11,10) plus the two singles
      // were the loudest fixed-position motif left in the biome — a meadow region printed
      // two pink dots and two gold dots in the SAME corner of every tile (R26 鐵律; obvious
      // as soon as maps.js started painting meadows as contiguous blobs). Blossoms are now
      // seeded scatter at three densities, so a meadow reads as continuous flowering ground.
      const fb = mix(b.floor, P.leaf, 0.3);   // R26/B1: saturated green lift — plain lighten() washed toward white and isolated meadow tiles read as fog squares
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, withAlpha(P.moss, 0.28), 11, 71);
      p.speckle(0, 0, 16, 16, withAlpha(P.leafL, 0.16), 8, 89);
      p.speckle(0, 0, 16, 16, withAlpha(P.sakura, 0.85), 5, 97);                     // pink blooms
      p.speckle(1, 1, 14, 14, withAlpha(P.sakuraL, 0.7), 3, 101);                    // their lit petals
      p.speckle(0, 0, 16, 16, withAlpha(P.gold, 0.8), 4, 103);                       // gold blooms
      p.speckle(1, 1, 14, 14, withAlpha(P.holyL, 0.55), 2, 107);
      return;
    }
    // R28/W3-C2: v1 becomes a REAL step — 林蔭腐土, the shaded leaf-mould floor under the
    // canopy — instead of a mid-mix nudge, now that maps.js places variants in clusters:
    // the patches read as shade districts rather than pale confetti. The two fixed moss
    // tufts at (5,4)/(11,9) were a per-tile motif (R26 鐵律) → seeded.
    plainFloor(p, v === 1 ? mix(b.floor, P.barkD, 0.16) : b.floor, withAlpha(P.bark, 0.26), v === 1 ? 59 : 19,
      (q) => {
        q.speckle(0, 0, 16, 16, withAlpha(P.leafL, v === 1 ? 0.1 : 0.16), 8, v === 1 ? 313 : 307);   // grass blades (thinner in shade)
        q.speckle(0, 0, 16, 16, withAlpha(P.moss, 0.22), 6, v === 1 ? 331 : 317);                     // moss patches
        q.speckle(1, 1, 14, 14, withAlpha(v === 1 ? P.moss : P.leafL, 0.5), 4, v === 1 ? 337 : 347);  // tufts, seeded
        if (v === 1) q.speckle(1, 1, 14, 14, withAlpha(P.barkD, 0.35), 5, 349);                       // leaf mould
      });
  },
  // ── desert: warm sand dunes + sandstone; feature = cracked oasis/quicksand ─
  desert: (p, b, v) => {
    if (v === 2) { // shallow oasis water — noise-seeded ripple + scattered glints (R28/W2-D fix: this
      // R28/W3-C2 (W2 遺留 #1, desert's share): W2-D swapped the checkerboard for seeded
      // speckle but left the gradV — a 16 px vertical ramp inside every tile, which tiles
      // into a horizontal stripe every 16 rows across a pond (the same root cause R26/B1b
      // fixed for plainFloor and W3-C1 fixed for inferno/void v2). FLAT base now; the depth
      // read comes from the density split between the two ripple layers instead.
      // single static tile is placed in big contiguous pool blobs — a regular p.dither() checkerboard
      // + two fixed-position ripple ellipses + two fixed px highlights all landed on the SAME relative
      // spot in every tile, so a multi-tile pond read as an obvious repeating wallpaper (checkerboard +
      // a fixed "blue dot" glint in the same corner of every block). Swapped for plainFloor-style layered
      // speckle, which tiles as continuous noise instead of a discrete repeating landmark.
      p.rect(0, 0, 16, 16, mix(b.floor, mix(P.oceanL, P.ocean, 0.5), 0.36));               // R26/B1c: oasis anchored to sand floor
      p.speckle(0, 0, 16, 16, mix(b.floor, P.oceanL, 0.34), 20, 157);                      // rippling surface (was a regular 2px dither)
      p.speckle(0, 0, 16, 16, withAlpha(mix(b.floor, P.ocean, 0.5), 0.55), 14, 173);       // the darker troughs between ripples
      p.speckle(0, 0, 16, 16, withAlpha(P.clay, 0.3), 6, 181);                             // scattered silt/shore grit (was 2 fixed crack lines)
      p.speckle(0, 0, 16, 16, withAlpha(P.hiSky, 0.4), 3, 199);                            // sparse sun glints (was 2 fixed px dots)
      return;
    }
    // R28/W2-D: v1 becomes wind-PACKED coarse sand — a genuine darker step with its own
    // grit texture, so the noise-clustered patches read as scoured ground rather than a
    // 6-value nudge. v0 keeps the soft ripple lines (kept off the tile edges).
    plainFloor(p, v === 1 ? darken(b.floor, 0.1) : b.floor, withAlpha(P.sandL, 0.28), v === 1 ? 211 : 163,
      v === 1
        ? (q) => {   // packed grit: denser, coarser speckle instead of drift ripples
          q.speckle(1, 1, 14, 14, withAlpha(P.sandD, 0.42), 9, 293);
          q.speckle(1, 1, 14, 14, withAlpha(P.clay, 0.24), 5, 311);
        }
        : (q) => {   // R29/D-3 (RE-06): the two 8-9 px ripple LINES and the two accent pixels
          // were the last fixed-position feature on a v0 base floor, and v0 is most of the
          // map — 流沙荒漠 printed the same two diagonal strokes every 16 px. Wind ripple is
          // kept as a FEEL (short seeded 2 px dashes on a shallow diagonal, one tone) instead
          // of a drawn motif, so a dune field reads as grain at any distance.
          let sd = 337;
          const rn = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
          for (let i = 0; i < 6; i++) {
            const sx = 1 + Math.floor(rn() * 12), sy = 1 + Math.floor(rn() * 13);
            q.px(sx, sy, withAlpha(P.sandD, 0.26)); q.px(sx + 1, sy, withAlpha(P.sandD, 0.20));
          }
          q.speckle(1, 1, 14, 14, withAlpha(P.sandD, 0.22), 6, 331);
          q.speckle(1, 1, 14, 14, withAlpha(P.sandL, 0.5), 3, 347);
          q.speckle(1, 1, 14, 14, withAlpha(P.clay, 0.3), 2, 359);
        });
  },
  // ── swamp: murky bog greens; feature = bubbling toxic water ────────────────
  swamp: (p, b, v, f = 0) => {
    if (v === 2) { // bubbling toxic water — a live scum surface, animated by re-seeding the grain
      // R28/W3-C2: two fixed glow centres, a full-width p.dither() band at y=9 and three
      // bubbles on fixed columns (5 / 11 / 8) put an IDENTICAL pattern in every tile, so a
      // pool tiled into wallpaper with a hard scum stripe every 16 rows (R26 鐵律 + the
      // banding root cause R26/B1b fixed for plainFloor). Flat base + layered seeded grain,
      // the bubble layers rolling their seed with the frame so the pool churns in place.
      const fb = mix(b.floor, P.slimeBog, 0.3);
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, mix(fb, P.bog, 0.4), 19, 353);                          // sunken murk
      p.speckle(0, 0, 16, 16, withAlpha(mix(P.slimeBog, P.bogL, 0.4), 0.6), 12, 359);  // floating scum
      p.speckle(0, 0, 16, 16, withAlpha(P.toxic, 0.55), 6, 367 + f * 43);              // gas bubbles rising
      p.speckle(0, 0, 16, 16, withAlpha(P.poison, 0.4), 4, 373 + f * 47);
      p.speckle(0, 0, 16, 16, withAlpha(darken(P.murk, 0.1), 0.5), 8, 379);
      return;
    }
    // R28/W3-C2: v1 becomes a REAL step — 藻膜淺灘, standing water skinned over with algae —
    // instead of a mid-mix nudge, readable now that maps.js clusters variants into districts.
    plainFloor(p, v === 1 ? mix(b.floor2, P.slimeBog, 0.16) : b.floor, withAlpha(P.murk, 0.42), v === 1 ? 233 : 181,
      (q) => {   // R26/B1d: algae/slime flecks scattered via seed (was fixed px → regular grid)
        q.speckle(0, 0, 16, 16, withAlpha(P.slimeBog, v === 1 ? 0.5 : 0.42), v === 1 ? 6 : 4, v === 1 ? 353 : 359);
        q.speckle(0, 0, 16, 16, withAlpha(P.bogL, 0.42), 3, v === 1 ? 367 : 373);
        if (v === 1) q.speckle(1, 1, 14, 14, withAlpha(P.murk, 0.4), 5, 383);          // waterlogged mottling
      });
  },
  // ── abyss: sunken deep-sea blues; feature = glowing seabed vent ────────────
  abyss: (p, b, v, f = 0) => {
    if (v === 2) { // glowing vent field — hot mineral grit, animated by re-seeding the shimmer
      // R28/W3-C2: the two glow centres plus the two vent GLYPHS at (5,12)/(11,8) stamped an
      // identical bright cross-pair on every tile, so a vent field tiled into a lattice
      // (R26 鐵律 — the same break void's star4 pair had), and the gradV ramped every tile's
      // 16 rows into horizontal stripes across the field. Texture only now; the vent
      // silhouettes live in the decal channel (decal_abyss_crack / _motes).
      const fb = mix(mix(b.floor, P.abyss, 0.55), P.oceanD, 0.25);
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, mix(fb, P.oceanD, 0.5), 18, 401);
      p.speckle(0, 0, 16, 16, withAlpha(P.neon, 0.4), 8, 409 + f * 37);                // vent shimmer
      p.speckle(0, 0, 16, 16, withAlpha(P.neonL, 0.5), 4, 419 + f * 41);
      p.speckle(0, 0, 16, 16, withAlpha(P.abyss, 0.55), 9, 431);
      return;
    }
    // R28/W3-C2: v1 becomes a REAL step — 石灰沉積灘, pale carbonate silt drifted over the
    // trench floor — readable now that maps.js clusters variants. The two caustic LINES sat
    // at the same coordinates on every tile and printed a ruled diagonal across the seabed
    // (R26 鐵律), as did the two accent pixels → all seeded now.
    plainFloor(p, v === 1 ? mix(b.floor2, P.oceanL, 0.14) : b.floor, withAlpha(P.oceanL, 0.12), v === 1 ? 251 : 199,
      (q) => {
        q.speckle(1, 1, 14, 14, withAlpha(P.oceanL, v === 1 ? 0.24 : 0.16), v === 1 ? 6 : 4, v === 1 ? 283 : 293);   // caustic glitter
        q.speckle(1, 1, 14, 14, withAlpha(P.neon, 0.2), 2, v === 1 ? 307 : 311);                                      // stray biolight
        if (v === 1) q.speckle(1, 1, 14, 14, withAlpha(lighten(b.floor2, 0.14), 0.4), 5, 313);                        // silt grain
      });
  },
  // ── celestial: bright cloud + astral marble; feature = starlit rift ────────
  celestial: (p, b, v, f = 0) => {
    if (v === 2) { // starlit rift — a violet-tinted lift of the cloud floor (was a stark dark-purple tile)
      // R28/W3-C2 (W2 遺留 #1, celestial's share): W2-D moved the star OFF the tile centre
      // but kept it fixed — the glow/star4 pair at (5,6) and the glow/sparkle pair at
      // (12,11) still printed the SAME two bright glyphs in every rift tile, so a rift
      // region tiled into a two-star lattice (R26 鐵律; the exact failure W3-C1 had to fix
      // in void). Texture only now, in layers whose seed rolls with the frame so the rift
      // twinkles in place; the star GLYPH lives in the decal channel
      // (decal_celestial_stardust / _marblecrack), which maps.js places per-map.
      const fb = mix(b.floor, P.astral, 0.3);
      p.rect(0, 0, 16, 16, fb);
      p.speckle(0, 0, 16, 16, mix(fb, P.astralL, 0.35), 17, 293);                     // rift haze
      p.speckle(0, 0, 16, 16, withAlpha(P.holyL, 0.5), 7, 307 + f * 37);              // twinkling dust
      p.speckle(0, 0, 16, 16, withAlpha(P.white, 0.6), 3, 311 + f * 41);
      p.speckle(0, 0, 16, 16, withAlpha(mix(P.astral, P.ink, 0.4), 0.45), 8, 313);    // the dark between stars
      return;
    }
    // R28/W2-D: the fixed "V" marble vein sat at the SAME two coordinates on EVERY tile
    // and tiled into a printed chevron wallpaper across the whole biome (the R26 鐵律 —
    // caught in the W2-D opening shot). Veining moves to the decal channel
    // (decal_celestial_marblecrack), which maps.js places per-map and cannot tile; the
    // tile keeps seeded grain only. v1 becomes a real pale-marble step, readable now
    // that maps.js places variants in 2-5 tile clusters rather than per-tile.
    plainFloor(p, v === 1 ? lighten(b.floor2, 0.08) : b.floor, withAlpha(P.cloud, 0.26), v === 1 ? 271 : 217,
      (q) => {
        q.speckle(1, 1, 14, 14, withAlpha(P.cloud, 0.2), 5, v === 1 ? 283 : 293);   // marble grain
        q.speckle(0, 0, 16, 16, withAlpha(P.star, 0.8), 2, v === 1 ? 281 : 229);    // R26/B1d: star density −~30% (3→2)
      });
  },
};

// Per-biome WALL painters — CLEAN cut-stone (clear low-frequency block + light top edge,
// at most one small thematic accent) so walls read as solid structure, not busy texture.
// ENHANCED: a soft top-left light face + bottom shade for chunky volume, one accent glint.
// Round-16: shared wall "raised block" depth. A dark grounding base line + a bottom shade so
// every wall reads as a 3D block standing over the flat floor (matches the crypt fix). Call it
// LAST in a biome's wall painter. NOTE: floors and hazards/TRAPS deliberately do NOT use this —
// a trap must stay flat and obvious on the ground, never look like a wall.
function wallBase(p, b, shade = 0.15) { p.hline(0, 15, 15, darken(b.wallD, 0.3)); p.shadeBottom(shade); }

const WALLS = {
  crypt: (p, b) => {   // R26/B1c: pressed below the floor (was ~2× brighter → bright floating blue blocks)
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.62), darken(b.wall, 0.78));
    p.hline(0, 15, 0, b.wallL);                                        // single lit crown
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.46), 6, 11); p.speckle(0, 8, 16, 8, darken(b.wall, 0.76), 6, 37);
    // R26/B1d: faint low-contrast brick seams so the darkened body isn't near-black-empty (value unchanged)
    p.line(1, 6, 6, 6, withAlpha(lighten(b.wall, 0.05), 0.28)); p.line(9, 11, 15, 11, withAlpha(lighten(b.wall, 0.05), 0.24));
    p.vline(6, 11, 8, withAlpha(darken(b.wall, 0.85), 0.4)); p.px(11, 4, withAlpha(lighten(b.wall, 0.08), 0.3));
    p.px(2, 3, withAlpha(P.moss, 0.3)); // faint moss in a joint
    wallBase(p, b, 0.16);
  },
  // R26/B1c — walls pressed DARKER than the floor (baked mean ≥10% below) so they read as
  // solid mass, not bright floating blocks; the old 2px lit bevel + mid joint (fixed bright
  // rows → periodic bands) become ONE lit crown line + seeded catch-light / shade speckle.
  cavern: (p, b) => {
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.50), darken(b.wall, 0.64));
    p.hline(0, 15, 0, b.wallL);                                        // single lit crown
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.34), 6, 17); p.speckle(0, 8, 16, 8, darken(b.wall, 0.62), 6, 53);
    p.px(5, 5, withAlpha(b.accent, 0.5)); p.px(11, 10, withAlpha(b.accent, 0.35)); // embedded crystal flecks
    wallBase(p, b, 0.15);
  },
  frost: (p, b) => {
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.46), darken(b.wall, 0.60));
    p.hline(0, 15, 0, b.wallL);                                        // icy lit crown
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.30), 6, 29); p.speckle(0, 8, 16, 8, darken(b.wall, 0.58), 6, 61);
    p.px(4, 4, withAlpha(P.ice, 0.4)); p.px(11, 9, withAlpha(P.white, 0.3)); // frost glints
    p.line(3, 10, 8, 5, withAlpha(P.ice, 0.18));
    wallBase(p, b, 0.14);
  },
  inferno: (p, b) => {
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.52), darken(b.wall, 0.66));
    p.hline(0, 15, 0, b.wallL);
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.34), 6, 13); p.speckle(0, 8, 16, 8, darken(b.wall, 0.64), 6, 41);
    p.px(4, 11, P.ember); p.px(4, 10, withAlpha(P.emberL, 0.6)); // glowing crack ember
    p.px(11, 5, withAlpha(P.ember, 0.4));
    wallBase(p, b, 0.14);
  },
  void: (p, b) => {
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.56), darken(b.wall, 0.70));
    p.hline(0, 15, 0, b.wallL);
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.38), 6, 23); p.speckle(0, 8, 16, 8, darken(b.wall, 0.68), 6, 47);
    p.px(11, 4, P.manaL); p.px(11, 5, withAlpha(P.purpleL, 0.5)); p.px(4, 10, withAlpha(P.manaL, 0.35));
    wallBase(p, b, 0.15);
  },

  // ── NEW ──
  verdant: (p, b) => { // dense hedge mass — R26/B1: kept darker than the lifted grass floor so it reads solid, not floating
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.12), darken(b.wall, 0.32));
    p.hline(0, 15, 0, b.wallL); // single lit crown line
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.02), 7, 31);               // upper leaf clumps catch light
    p.speckle(0, 8, 16, 8, darken(b.wall, 0.4), 7, 73);                // shaded under-leaves
    p.px(3, 3, P.leafL); p.px(11, 5, withAlpha(P.leafL, 0.7)); p.px(7, 10, withAlpha(P.moss, 0.5));
    wallBase(p, b, 0.2);
  },
  desert: (p, b) => { // layered sandstone — already darker than the bright sand floor; only DE-BAND the strata
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.06), darken(b.wall, 0.20));
    p.hline(0, 15, 0, b.wallL);                                        // single lit crown
    p.speckle(0, 4, 16, 4, withAlpha(b.wallD, 0.7), 7, 19); p.speckle(0, 9, 16, 4, withAlpha(b.wallD, 0.6), 7, 37); // strata → seeded, not solid rows
    p.speckle(0, 1, 16, 14, withAlpha(P.sandL, 0.22), 6, 71);
    p.px(13, 3, withAlpha(P.sandL, 0.5));
    wallBase(p, b, 0.13);
  },
  swamp: (p, b) => { // dripping bog stone
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.34), darken(b.wall, 0.50));
    p.hline(0, 15, 0, b.wallL);
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.20), 6, 31); p.speckle(0, 8, 16, 8, darken(b.wall, 0.52), 6, 67);
    p.rect(1, 0, 5, 2, withAlpha(P.slimeBog, 0.45)); p.px(11, 1, withAlpha(P.bogL, 0.5)); // slime film
    p.vline(0, 5, 4, withAlpha(P.toxic, 0.28)); // drip
    p.px(12, 9, withAlpha(P.murk, 0.6));
    wallBase(p, b, 0.16);
  },
  abyss: (p, b) => { // dark reef rock
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.40), darken(b.wall, 0.56));
    p.hline(0, 15, 0, b.wallL);
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.26), 6, 43); p.speckle(0, 8, 16, 8, darken(b.wall, 0.58), 6, 79);
    p.px(4, 4, P.neonL); p.px(4, 3, withAlpha(P.neon, 0.5)); // bioluminescent spot
    p.px(11, 10, withAlpha(P.oceanL, 0.5)); p.px(11, 9, withAlpha(P.neon, 0.3));
    wallBase(p, b, 0.17);
  },
  celestial: (p, b) => { // astral marble — pressed below the bright cloud floor
    p.gradV(0, 0, 16, 16, darken(b.wall, 0.24), darken(b.wall, 0.40));
    p.hline(0, 15, 0, b.wallL);                                        // marble lit crown
    p.speckle(0, 1, 16, 7, darken(b.wall, 0.12), 6, 53); p.speckle(0, 8, 16, 8, darken(b.wall, 0.42), 6, 89);
    // R28/W2-D: the two vein lines met at (9,4) and printed an identical "Λ" chevron on
    // EVERY wall tile — a stacked wall field tiled it into a zigzag wallpaper (visible in
    // the W2-D celestial shot, same 鐵律 as the floor's V vein). Replaced with ONE short,
    // open, off-centre vein that can't close into a motif, plus grain.
    p.line(3, 12, 7, 6, withAlpha(P.cloud, 0.26));
    p.speckle(1, 1, 14, 14, withAlpha(P.cloud, 0.16), 5, 157);
    p.px(12, 3, P.star); p.px(4, 10, withAlpha(P.astralL, 0.5));
    wallBase(p, b, 0.1);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// R28/W2-D + W3-C1 + W3-C2 — biome IDENTITY wall set (ART_SPEC §6).
// Per-biome wall VARIANTS (≥2) + a BROKEN state + a deep-mass core tile + a
// per-biome FAR/horizon band for the out-of-bounds ring. W2-D opted in the three
// value-extreme biomes — crypt (darkest) / celestial (brightest) / desert
// (warmest); W3-C1 added the three elemental ones — frost / inferno / void;
// W3-C2 closes the set with the four ecology ones — cavern / verdant / swamp /
// abyss. All 10 biomes now carry the identity treatment.
//
// Rules honoured here:
//  • every variant reuses its biome's own `base` gradient + lit crown + wallBase()
//    so the VALUE matches the stock wall exactly — only the SURFACE pattern
//    changes. A wall field then reads as varied masonry, never as a brightness rash.
//  • no feature sits at a position shared by every tile (R26 鐵律): variants are
//    hash-selected per tile and their details are interior + asymmetric.
//  • `deep` is the depth-2 fill (interior of a rock outcrop) — flat mass, no crown,
//    no foot shade, two seed variants so a big core never repeats one speckle map.
//  • `far(k)` (k = 0..2) is the OOB horizon language, drawn faded with distance.
// ═══════════════════════════════════════════════════════════════════════════
const WALL_VARIANTS = {
  // ── 幽影地穴: cold ashlar masonry swallowed by fog ────────────────────────
  crypt: {
    foot: 0.16,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.62), darken(b.wall, 0.78)); p.hline(0, 15, 0, b.wallL); },
    // crypt is the darkest biome, so its variants need MORE internal contrast than the
    // other two or the surface pattern vanishes into the body (checked on the W2-D
    // contact sheet, where v1/v2 were indistinguishable from the base at 3×).
    v1: (p, b) => {   // large ashlar course + offset head joints + a shallow carved niche
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.4), 6, 101); p.speckle(0, 8, 16, 8, darken(b.wall, 0.74), 5, 131);
      p.line(2, 9, 14, 9, withAlpha(lighten(b.wall, 0.14), 0.5));
      p.vline(1, 8, 4, withAlpha(darken(b.wall, 0.92), 0.7));
      p.vline(10, 15, 11, withAlpha(darken(b.wall, 0.92), 0.6));
      p.rect(11, 2, 3, 4, withAlpha(darken(b.wall, 0.93), 0.65));
      p.px(11, 2, withAlpha(lighten(b.wall, 0.2), 0.55)); p.px(13, 5, withAlpha(P.bone, 0.22));
    },
    v2: (p, b) => {   // mortar loss: a fissure with a couple of dislodged bricks
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.46), 6, 109); p.speckle(0, 8, 16, 8, darken(b.wall, 0.78), 5, 127);
      p.line(6, 1, 8, 7, withAlpha(darken(b.wall, 0.94), 0.8));
      p.line(8, 7, 7, 14, withAlpha(darken(b.wall, 0.94), 0.7));
      p.px(7, 4, withAlpha(lighten(b.wall, 0.16), 0.4));                     // lit lip of the fissure
      p.px(3, 5, withAlpha(darken(b.wall, 0.94), 0.7)); p.px(12, 9, withAlpha(darken(b.wall, 0.94), 0.65));
      p.px(12, 8, withAlpha(lighten(b.wall, 0.18), 0.5)); p.px(3, 4, withAlpha(lighten(b.wall, 0.14), 0.4));
      p.px(2, 11, withAlpha(P.moss, 0.32)); p.px(13, 13, withAlpha(P.moss, 0.24));
    },
    bk: (p, b) => {   // BROKEN: crown sheared off, top-right corner collapsed away
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.62), darken(b.wall, 0.78));
      p.hline(0, 9, 0, b.wallL);
      for (let i = 0; i < 5; i++) p.hline(11 + (i > 2 ? 1 : 0), 15, i, withAlpha(darken(b.wall, 0.93), 0.92));
      p.px(10, 1, withAlpha(lighten(b.wall, 0.12), 0.4)); p.px(11, 3, withAlpha(lighten(b.wall, 0.08), 0.3));
      p.line(5, 4, 4, 11, withAlpha(darken(b.wall, 0.9), 0.5));
      p.px(3, 13, withAlpha(P.bone, 0.22)); p.px(7, 12, withAlpha(P.moss, 0.25));
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.5), 5, 167); p.speckle(0, 8, 16, 8, darken(b.wall, 0.8), 5, 181);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.84), darken(b.wall, 0.9));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.92), 7, 179 + s * 43);
      p.speckle(0, 0, 16, 16, withAlpha(lighten(b.wall, 0.06), 0.22), 4, 199 + s * 47);
    },
    far: (p, b, k) => {   // fog-drowned tomb field beyond the edge
      const fog = mix(darken(b.wall, 0.86), P.ink, 0.5);
      p.gradV(0, 0, 16, 16, lighten(fog, 0.06), fog);
      if (k === 0) {
        p.line(1, 12, 6, 6, withAlpha(darken(b.wall, 0.78), 0.9)); p.line(6, 6, 11, 12, withAlpha(darken(b.wall, 0.78), 0.9));
        p.rect(3, 10, 7, 6, withAlpha(darken(b.wall, 0.8), 0.85)); p.px(6, 5, withAlpha(b.wallL, 0.25));
      } else if (k === 1) {
        p.rect(2, 8, 3, 8, withAlpha(darken(b.wall, 0.8), 0.8)); p.rect(8, 10, 2, 6, withAlpha(darken(b.wall, 0.82), 0.75));
        p.line(12, 15, 13, 9, withAlpha(darken(b.wall, 0.8), 0.7)); p.px(9, 9, withAlpha(P.shardL, 0.18));
      } else {
        p.ellipse(9, 11, 7, 3, withAlpha(lighten(fog, 0.1), 0.5));
        p.glow(5, 6, 3, P.shardL, 0.1, 3); p.px(5, 6, withAlpha(P.shardL, 0.3));
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.3), 5, 269 + k * 11);
    },
  },

  // ── 天界雲海: astral marble over an open cloud sea ────────────────────────
  celestial: {
    foot: 0.1,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.24), darken(b.wall, 0.4)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // fluted pilaster — unevenly spaced channels (2/7/13, never a regular comb)
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.14), 5, 107); p.speckle(0, 8, 16, 8, darken(b.wall, 0.44), 5, 137);
      p.vline(2, 15, 2, withAlpha(P.white, 0.22)); p.vline(2, 15, 3, withAlpha(darken(b.wall, 0.5), 0.34));
      p.vline(1, 14, 7, withAlpha(P.cloud, 0.2)); p.vline(1, 14, 8, withAlpha(darken(b.wall, 0.5), 0.3));
      p.vline(3, 15, 13, withAlpha(P.white, 0.16)); p.vline(3, 15, 14, withAlpha(darken(b.wall, 0.5), 0.26));
      p.px(11, 4, withAlpha(P.star, 0.45));
    },
    v2: (p, b) => {   // gilt rosette medallion set off-centre in the marble
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.16), 5, 113); p.speckle(0, 8, 16, 8, darken(b.wall, 0.46), 5, 139);
      p.ring(5, 8, 3, withAlpha(P.gold, 0.24)); p.ring(5, 8, 2, withAlpha(P.goldL, 0.16));
      p.px(5, 8, withAlpha(P.holyL, 0.35));
      p.line(10, 3, 13, 7, withAlpha(P.cloud, 0.3)); p.line(13, 7, 12, 12, withAlpha(P.skyL, 0.24));
      p.px(12, 11, withAlpha(P.star, 0.4));
    },
    bk: (p, b) => {   // BROKEN: a wedge shattered out of the top-right, open sky behind
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.24), darken(b.wall, 0.4));
      p.hline(0, 8, 0, b.wallL);
      for (let i = 0; i < 6; i++) p.hline(10 + i, 15, i, withAlpha(mix(P.sky, P.ink, 0.45), 0.9));
      p.line(9, 0, 15, 6, withAlpha(mix(b.wall, P.ink, 0.5), 0.85));
      p.px(9, 1, withAlpha(P.white, 0.7)); p.px(11, 3, withAlpha(P.cloud, 0.5));
      p.line(4, 6, 6, 13, withAlpha(darken(b.wall, 0.55), 0.5));
      p.px(6, 9, withAlpha(P.gold, 0.35));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.44), 5, 149);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.46), darken(b.wall, 0.58));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.62), 7, 191 + s * 37);
      p.speckle(0, 0, 16, 16, withAlpha(P.cloud, 0.12), 4, 211 + s * 41);
    },
    far: (p, b, k) => {   // the cloud sea the sanctum floats on
      p.rect(0, 0, 16, 16, mix(P.sky, P.ink, 0.42));
      if (k === 0) {
        p.ellipse(5, 6, 6, 3.2, withAlpha(P.cloud, 0.55)); p.ellipse(11, 9, 5, 2.6, withAlpha(P.cloud, 0.4));
        p.ellipse(4, 5, 3, 1.6, withAlpha(P.white, 0.35)); p.px(13, 4, withAlpha(P.star, 0.5));
      } else if (k === 1) {
        p.ellipse(9, 11, 7, 3, withAlpha(P.cloud, 0.42));
        p.line(3, 12, 4, 4, withAlpha(mix(P.cloud, P.ink, 0.4), 0.85)); p.line(4, 4, 5, 12, withAlpha(mix(P.cloud, P.ink, 0.4), 0.85));
        p.px(4, 3, withAlpha(P.goldL, 0.6));
        p.speckle(0, 0, 16, 8, withAlpha(P.star, 0.35), 3, 233);
      } else {
        p.ellipse(12, 13, 5, 2.2, withAlpha(P.cloud, 0.28));
        p.speckle(0, 0, 16, 12, withAlpha(P.star, 0.45), 5, 239); p.px(6, 5, withAlpha(P.white, 0.5));
      }
    },
  },

  // ── 流沙荒漠: carved sandstone bleeding into dune haze ────────────────────
  desert: {
    foot: 0.13,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.06), darken(b.wall, 0.2)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // a recessed glyph register cut into the strata
      p.speckle(0, 4, 16, 4, withAlpha(b.wallD, 0.7), 6, 103); p.speckle(0, 10, 16, 4, withAlpha(b.wallD, 0.6), 6, 139);
      p.rect(2, 4, 11, 6, withAlpha(darken(b.wall, 0.28), 0.42));
      p.hline(2, 12, 4, withAlpha(P.sandL, 0.22));
      p.px(4, 6, withAlpha(darken(b.wall, 0.45), 0.7)); p.vline(6, 8, 4, withAlpha(darken(b.wall, 0.45), 0.6));
      p.px(7, 7, withAlpha(darken(b.wall, 0.45), 0.7)); p.hline(9, 11, 6, withAlpha(darken(b.wall, 0.45), 0.6));
      p.px(10, 8, withAlpha(P.sandL, 0.3));
    },
    v2: (p, b) => {   // tafoni — wind-scoured honeycomb pitting
      p.speckle(0, 1, 16, 14, withAlpha(b.wallD, 0.55), 8, 149);
      const pit = (x, y, r) => { p.ellipse(x, y, r, r * 0.8, withAlpha(darken(b.wall, 0.35), 0.55)); p.px(x, y - Math.round(r), withAlpha(P.sandL, 0.28)); };
      pit(4, 5, 2); pit(11, 4, 1.6); pit(7, 11, 2.2); pit(13, 10, 1.4); pit(2, 12, 1.3);
      p.px(9, 8, withAlpha(P.sandL, 0.35));
    },
    bk: (p, b) => {   // BROKEN: a breached block with sand pouring out of the cavity
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.06), darken(b.wall, 0.2));
      p.hline(0, 6, 0, b.wallL); p.hline(11, 15, 0, b.wallL);
      for (let i = 0; i < 4; i++) p.hline(7 - (i > 1 ? 1 : 0), 10 + (i > 2 ? 1 : 0), i, withAlpha(darken(b.wall, 0.55), 0.9));
      p.rect(7, 3, 3, 4, withAlpha(darken(b.wall, 0.62), 0.7));
      p.line(8, 6, 7, 13, withAlpha(P.sandL, 0.35)); p.line(9, 6, 11, 12, withAlpha(P.sand, 0.28));
      p.ellipse(9, 14, 4, 1.6, withAlpha(P.sandL, 0.3));
      p.speckle(0, 8, 16, 7, withAlpha(b.wallD, 0.5), 6, 157);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.34), darken(b.wall, 0.46));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.5), 7, 173 + s * 31);
      p.speckle(0, 0, 16, 16, withAlpha(P.sandD, 0.2), 4, 197 + s * 29);
    },
    far: (p, b, k) => {   // dune ridges dissolving into heat haze
      const haze = mix(P.sandD, P.clay, 0.5);
      p.gradV(0, 0, 16, 16, lighten(haze, 0.1), darken(haze, 0.22));
      if (k === 0) { p.line(0, 9, 7, 5, withAlpha(P.sandL, 0.45)); p.line(7, 5, 15, 10, withAlpha(P.sand, 0.35)); p.px(7, 5, withAlpha(P.sandL, 0.6)); }
      else if (k === 1) { p.line(0, 6, 9, 11, withAlpha(P.sand, 0.4)); p.line(9, 11, 15, 7, withAlpha(P.sandL, 0.3)); p.speckle(0, 0, 16, 6, withAlpha(P.sandL, 0.2), 4, 251); }
      else { p.line(0, 12, 6, 8, withAlpha(P.sandL, 0.3)); p.line(6, 8, 15, 12, withAlpha(P.sand, 0.26)); p.ellipse(11, 4, 5, 2, withAlpha(lighten(haze, 0.16), 0.4)); }
      p.speckle(0, 0, 16, 16, withAlpha(P.sandL, 0.12), 5, 263 + k * 7);
    },
  },

  // ── 霜寒冰原 (W3-C1): glacier ice, cut by meltwater and stacked in strata ───
  frost: {
    foot: 0.14,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.46), darken(b.wall, 0.6)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 冰蝕裂縫 — meltwater has cut runnels down the face, refrozen pale at the lip
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.2), 6, 103); p.speckle(0, 8, 16, 8, darken(b.wall, 0.54), 5, 133);
      p.line(4, 0, 6, 7, withAlpha(darken(b.wall, 0.78), 0.75));
      p.line(6, 7, 5, 15, withAlpha(darken(b.wall, 0.78), 0.6));
      p.px(5, 3, withAlpha(P.hiSky, 0.45)); p.px(6, 9, withAlpha(P.ice, 0.4));           // refrozen lit lip
      p.line(11, 2, 13, 8, withAlpha(darken(b.wall, 0.72), 0.55));                        // a second, shallower runnel
      p.px(12, 5, withAlpha(P.ice, 0.3)); p.px(2, 12, withAlpha(P.white, 0.25));
    },
    v2: (p, b) => {   // 凍層 — banded ice strata, each shelf lit on top and dark beneath
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.24), 7, 109);
      const shelf = (x0, x1, y) => { p.hline(x0, x1, y, withAlpha(P.ice, 0.3)); p.hline(x0, x1, y + 1, withAlpha(darken(b.wall, 0.72), 0.5)); };
      shelf(0, 9, 3); shelf(6, 15, 8); shelf(2, 11, 13);                                  // uneven spans/heights: never a comb
      p.px(3, 2, withAlpha(P.white, 0.35)); p.px(9, 7, withAlpha(P.hiSky, 0.3));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.5), 4, 139);
    },
    bk: (p, b) => {   // BROKEN: 雪簷崩角 — the cornice sheared off the left, snow spilled at the foot
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.46), darken(b.wall, 0.6));
      p.hline(6, 15, 0, b.wallL);
      for (let i = 0; i < 5; i++) p.hline(0, 4 - (i > 2 ? 2 : 0), i, withAlpha(darken(b.wall, 0.88), 0.92));
      p.px(5, 1, withAlpha(P.white, 0.5)); p.px(4, 3, withAlpha(P.ice, 0.4));             // fresh fracture face
      p.ellipse(4, 14, 5, 2.2, withAlpha(P.white, 0.35)); p.ellipse(3, 15, 3, 1.4, withAlpha(P.hiSky, 0.3));
      p.line(9, 4, 11, 12, withAlpha(darken(b.wall, 0.8), 0.5)); p.px(12, 6, withAlpha(P.ice, 0.3));
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.34), 5, 163); p.speckle(0, 8, 16, 8, darken(b.wall, 0.6), 5, 179);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.72), darken(b.wall, 0.8));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.86), 7, 181 + s * 41);
      p.speckle(0, 0, 16, 16, withAlpha(P.ice, 0.14), 4, 197 + s * 43);
    },
    far: (p, b, k) => {   // 雪霧稜線 — ridgelines dissolving into blowing snow
      const fog = mix(darken(b.wall, 0.5), P.hiSky, 0.22);
      p.gradV(0, 0, 16, 16, lighten(fog, 0.12), darken(fog, 0.18));
      if (k === 0) {
        p.line(0, 11, 6, 5, withAlpha(mix(fog, P.ink, 0.45), 0.85)); p.line(6, 5, 15, 12, withAlpha(mix(fog, P.ink, 0.45), 0.8));
        p.px(6, 5, withAlpha(P.white, 0.5)); p.line(7, 5, 12, 3, withAlpha(P.white, 0.22));   // snow torn off the crest
      } else if (k === 1) {
        p.line(0, 8, 8, 12, withAlpha(mix(fog, P.ink, 0.4), 0.75)); p.line(8, 12, 15, 8, withAlpha(mix(fog, P.ink, 0.4), 0.7));
        p.line(2, 14, 9, 15, withAlpha(mix(fog, P.ink, 0.55), 0.6));
        p.speckle(0, 0, 16, 7, withAlpha(P.white, 0.2), 4, 241);
      } else {
        p.ellipse(6, 12, 8, 3, withAlpha(lighten(fog, 0.16), 0.45));
        p.speckle(0, 0, 16, 16, withAlpha(P.white, 0.28), 6, 247); p.px(11, 4, withAlpha(P.hiSky, 0.4));
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.hiSky, 0.1), 5, 257 + k * 13);
    },
  },

  // ── 熔岩深淵 (W3-C1): columnar basalt still holding heat in its seams ──────
  inferno: {
    foot: 0.14,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.52), darken(b.wall, 0.66)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 玄武岩柱 — columnar jointing, column widths deliberately unequal
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.26), 6, 101); p.speckle(0, 8, 16, 8, darken(b.wall, 0.58), 5, 131);
      const col = (x) => { p.vline(0, 15, x, withAlpha(darken(b.wall, 0.84), 0.7)); p.vline(0, 15, x + 1, withAlpha(lighten(b.wall, 0.12), 0.3)); };
      col(3); col(9);
      p.vline(2, 15, 13, withAlpha(darken(b.wall, 0.8), 0.55)); p.px(14, 6, withAlpha(lighten(b.wall, 0.14), 0.35));
      p.hline(4, 8, 10, withAlpha(darken(b.wall, 0.82), 0.5));                            // one column snapped short
      p.px(6, 4, withAlpha(P.ember, 0.25));
    },
    v2: (p, b) => {   // 熔縫發光 — a seam of melt still live inside the rock
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.44), 8, 137);
      p.line(2, 15, 6, 8, withAlpha(darken(b.wall, 0.86), 0.8));
      p.line(6, 8, 5, 1, withAlpha(darken(b.wall, 0.86), 0.7));
      p.glow(6, 9, 3, P.ember, 0.2, 3);
      p.px(6, 9, P.emberL); p.px(5, 12, P.ember); p.px(6, 5, withAlpha(P.ember, 0.55));
      p.px(11, 6, withAlpha(P.ember, 0.3)); p.px(12, 11, withAlpha(P.emberL, 0.25));
    },
    bk: (p, b) => {   // BROKEN: 焦裂 — the face spalled off in the heat, embers in the wound
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.52), darken(b.wall, 0.66));
      p.hline(0, 10, 0, b.wallL);
      for (let i = 0; i < 5; i++) p.hline(12 - (i > 2 ? 1 : 0), 15, i, withAlpha(darken(b.wall, 0.9), 0.92));
      p.ellipse(7, 8, 4.5, 4, withAlpha(darken(b.wall, 0.8), 0.7));
      p.ellipse(7, 8, 3, 2.6, withAlpha(darken(b.wall, 0.88), 0.75));                     // spall cavity
      p.glow(7, 9, 3, P.ember, 0.18, 3); p.px(7, 9, P.ember); p.px(8, 11, withAlpha(P.emberL, 0.5));
      p.px(3, 3, withAlpha(lighten(b.wall, 0.16), 0.4)); p.px(11, 2, withAlpha(lighten(b.wall, 0.1), 0.3));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.66), 5, 167);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.76), darken(b.wall, 0.84));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.9), 7, 173 + s * 37);
      p.speckle(0, 0, 16, 16, withAlpha(P.ember, 0.16), 3, 193 + s * 39);
    },
    far: (p, b, k) => {   // 熔光地裂 — a burnt plain under smoke, fissures glowing far off
      const smoke = mix(darken(b.wall, 0.72), P.ink, 0.42);
      p.gradV(0, 0, 16, 16, lighten(smoke, 0.1), smoke);
      if (k === 0) {
        p.line(0, 10, 7, 8, withAlpha(P.ember, 0.5)); p.line(7, 8, 15, 11, withAlpha(P.ember, 0.35));
        p.glow(7, 8, 3, P.ember, 0.14, 3); p.px(7, 8, withAlpha(P.emberL, 0.6));
      } else if (k === 1) {
        p.line(2, 15, 5, 7, withAlpha(darken(b.wall, 0.4), 0.7)); p.line(5, 7, 8, 14, withAlpha(darken(b.wall, 0.4), 0.6));
        p.px(5, 7, withAlpha(P.ember, 0.4)); p.line(10, 12, 15, 10, withAlpha(P.ember, 0.28));
      } else {
        p.ellipse(9, 12, 7, 3, withAlpha(darken(smoke, 0.3), 0.6));
        p.glow(4, 6, 3, P.ember, 0.1, 3); p.px(4, 6, withAlpha(P.ember, 0.35));
        p.speckle(0, 0, 16, 10, withAlpha(P.ember, 0.18), 4, 251);
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.3), 5, 269 + k * 11);
    },
  },

  // ── 虛空裂界 (W3-C1): masonry being eaten by the void it borders ───────────
  void: {
    foot: 0.15,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.56), darken(b.wall, 0.7)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 虛空侵蝕 — bites eaten clean through, opening onto nothing
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.34), 6, 103); p.speckle(0, 8, 16, 8, darken(b.wall, 0.66), 5, 131);
      const bite = (x, y, r) => {
        p.ellipse(x, y, r, r * 0.85, withAlpha(P.void, 0.85));
        p.ellipse(x, y, r - 1, r * 0.5, withAlpha(P.ink, 0.8));
        p.px(x - Math.round(r), y - 1, withAlpha(P.purpleL, 0.3));                        // lit rim on the light side
      };
      bite(4, 6, 3); bite(11, 11, 2.2); bite(13, 4, 1.4);
      p.px(6, 12, withAlpha(P.manaL, 0.3));
    },
    v2: (p, b) => {   // 星屑嵌縫 — a seam packed with star grit, lit faintly from inside
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.42), 8, 137);
      p.line(1, 12, 7, 6, withAlpha(darken(b.wall, 0.82), 0.7)); p.line(7, 6, 14, 3, withAlpha(darken(b.wall, 0.82), 0.6));
      p.speckle(1, 3, 14, 10, withAlpha(P.star, 0.5), 6, 149);
      p.glow(7, 6, 3, P.astral, 0.12, 3);
      p.px(7, 6, withAlpha(P.manaL, 0.55)); p.px(4, 9, withAlpha(P.astralL, 0.4)); p.px(11, 4, withAlpha(P.star, 0.6));
    },
    bk: (p, b) => {   // BROKEN: 剝離浮塊 — a slab torn free and drifting, void showing in the tear
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.56), darken(b.wall, 0.7));
      p.hline(0, 15, 0, b.wallL);
      for (let x = 5; x < 16; x++) { const t = (x - 5) / 10; p.vline(3, 3 + Math.round(t * 5), x, withAlpha(P.void, 0.9)); }
      p.line(5, 3, 15, 9, withAlpha(P.ink, 0.8));
      p.px(6, 3, withAlpha(P.purpleL, 0.5)); p.px(10, 6, withAlpha(P.manaL, 0.35));       // torn edge catching light
      p.rect(9, 10, 5, 4, withAlpha(darken(b.wall, 0.46), 0.9));                          // the detached block, hanging off
      p.px(9, 10, withAlpha(lighten(b.wall, 0.2), 0.5)); p.px(13, 13, withAlpha(P.void, 0.6));
      p.line(3, 6, 4, 14, withAlpha(darken(b.wall, 0.86), 0.55));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.7), 5, 163);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.8), darken(b.wall, 0.88));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.92), 7, 179 + s * 43);
      p.speckle(0, 0, 16, 16, withAlpha(P.astralL, 0.14), 4, 199 + s * 47);
    },
    far: (p, b, k) => {   // 星淵消散 — past the edge the ground crumbles into the star abyss
      const deepv = mix(darken(b.wall, 0.8), P.void, 0.5);
      p.gradV(0, 0, 16, 16, lighten(deepv, 0.08), darken(deepv, 0.3));
      if (k === 0) {
        p.rect(2, 9, 5, 7, withAlpha(darken(b.wall, 0.6), 0.75));                          // the last stone, crumbling away
        p.px(2, 9, withAlpha(P.purpleL, 0.35));
        p.px(8, 12, withAlpha(darken(b.wall, 0.6), 0.5)); p.px(10, 14, withAlpha(darken(b.wall, 0.6), 0.4));
        p.speckle(6, 0, 10, 12, withAlpha(P.star, 0.5), 5, 233);
      } else if (k === 1) {
        p.line(4, 15, 6, 6, withAlpha(darken(b.wall, 0.62), 0.7)); p.line(6, 6, 9, 11, withAlpha(darken(b.wall, 0.62), 0.6));
        p.glow(11, 6, 4, P.astral, 0.12, 4); p.star4(11, 6, 2, P.astralL, P.white);
        p.speckle(0, 0, 16, 16, withAlpha(P.star, 0.4), 4, 239);
      } else {
        p.ellipse(8, 12, 7, 2.6, withAlpha(mix(P.void, P.ink, 0.4), 0.6));
        p.speckle(0, 0, 16, 14, withAlpha(P.star, 0.55), 7, 241);
        p.px(5, 4, withAlpha(P.manaL, 0.45)); p.px(12, 9, withAlpha(P.purpleL, 0.35));
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.26), 4, 271 + k * 7);
    },
  },

  // ── 水晶洞窟 (W3-C2): live dripstone rock with crystal growing out of the seams ──
  cavern: {
    foot: 0.15,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.5), darken(b.wall, 0.64)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 鐘乳石柱 — flowstone columns fused onto the face, widths deliberately unequal
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.34), 6, 101); p.speckle(0, 8, 16, 8, darken(b.wall, 0.6), 5, 131);
      const flow = (x, w, top) => {
        p.rect(x, top, w, 16 - top, darken(b.wall, 0.42));
        p.vline(top, 15, x, withAlpha(lighten(b.wall, 0.18), 0.45));                // wet lit edge
        p.vline(top, 15, x + w - 1, withAlpha(darken(b.wall, 0.72), 0.6));
        p.ellipse(x + (w - 1) / 2, top, w / 2, 1.2, darken(b.wall, 0.38));          // the bulbous shoulder
      };
      flow(2, 4, 3); flow(9, 3, 1); flow(13, 2, 6);
      p.px(3, 5, withAlpha(P.white, 0.28)); p.px(10, 3, withAlpha(P.hiSky, 0.3));   // drip highlights
      p.px(13, 11, withAlpha(b.accent, 0.3));
    },
    v2: (p, b) => {   // 晶簇嵌壁 — a druse pocket in the rock, packed with small shards
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.44), 8, 137);
      p.ellipse(5, 9, 4.4, 3.6, withAlpha(darken(b.wall, 0.78), 0.85));            // the hollow it grew in
      p.ellipse(5, 9, 3, 2.4, withAlpha(P.ink, 0.6));
      p.glow(5, 9, 3, b.accent, 0.1, 3);
      // shards kept dim: at 0.7/0.8 alpha the pocket read as a bright BADGE and the tiled
      // field stamped a grid of them. It is a glint inside dark rock, not a light source.
      const shard = (x, y, s) => { p.line(x, y, x - 1, y - s, withAlpha(b.accent, 0.42)); p.px(x - 1, y - s, withAlpha(P.shardL, 0.5)); };
      shard(4, 11, 3); shard(6, 11, 4); shard(7, 10, 2);
      p.px(12, 4, withAlpha(b.accent, 0.28)); p.px(11, 12, withAlpha(P.shardL, 0.2));
    },
    bk: (p, b) => {   // BROKEN: 塌落斷面 — the ceiling sheared away, a fresh rock scar under it
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.5), darken(b.wall, 0.64));
      p.hline(0, 8, 0, b.wallL);
      for (let i = 0; i < 6; i++) p.hline(10 + (i > 3 ? 1 : 0), 15, i, withAlpha(darken(b.wall, 0.88), 0.92));
      p.line(9, 1, 12, 7, withAlpha(lighten(b.wall, 0.14), 0.4));                   // fresh fracture plane catching light
      p.px(9, 2, withAlpha(P.white, 0.35));
      p.line(4, 5, 5, 12, withAlpha(darken(b.wall, 0.8), 0.55));
      p.ellipse(11, 14, 4, 1.8, withAlpha(darken(b.wall, 0.66), 0.7));              // rubble heaped at the foot
      p.px(10, 13, withAlpha(lighten(b.wall, 0.1), 0.4)); p.px(13, 14, withAlpha(b.accent, 0.25));
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.38), 5, 163); p.speckle(0, 8, 16, 8, darken(b.wall, 0.66), 5, 179);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.76), darken(b.wall, 0.85));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.9), 7, 181 + s * 41);
      p.speckle(0, 0, 16, 16, withAlpha(b.accent, 0.1), 4, 197 + s * 43);
    },
    far: (p, b, k) => {   // 洞窟深處 — the cavern keeps going: darkness, a far crystal glimmer
      const dark = mix(darken(b.wall, 0.82), P.ink, 0.45);
      p.gradV(0, 0, 16, 16, lighten(dark, 0.1), darken(dark, 0.25));
      if (k === 0) {
        for (let i = 0; i < 4; i++) p.vline(0, 2 + ((i * 5) % 4), 1 + i * 4, withAlpha(darken(b.wall, 0.7), 0.7));   // stalactites off the roof
        p.px(5, 5, withAlpha(P.hiSky, 0.25));
        p.ellipse(10, 13, 6, 2.4, withAlpha(darken(b.wall, 0.66), 0.55));
      } else if (k === 1) {
        p.line(1, 15, 4, 7, withAlpha(darken(b.wall, 0.68), 0.7)); p.line(4, 7, 7, 15, withAlpha(darken(b.wall, 0.68), 0.6));
        p.glow(11, 8, 3, b.accent, 0.12, 3); p.px(11, 8, withAlpha(P.shardL, 0.4)); p.px(12, 10, withAlpha(b.accent, 0.3));
      } else {
        p.ellipse(7, 12, 8, 3, withAlpha(mix(dark, b.accent, 0.12), 0.5));          // a still pool far below
        p.speckle(0, 0, 16, 10, withAlpha(P.shardL, 0.22), 4, 239);
        p.px(4, 6, withAlpha(P.hiSky, 0.3));
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.3), 5, 251 + k * 11);
    },
  },

  // ── 翠林森境 (W3-C2): old masonry losing to the forest that grew over it ────
  verdant: {
    foot: 0.2,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.12), darken(b.wall, 0.32)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 藤蔓纏石 — bare stone showing through, strangled by climbing vine
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.02), 6, 101); p.speckle(0, 8, 16, 8, darken(b.wall, 0.4), 5, 131);
      p.rect(2, 4, 9, 9, withAlpha(mix(P.gray1, b.wall, 0.6), 0.6));                // the stone face, off-centre —
      p.px(2, 4, withAlpha(P.gray3, 0.4)); p.hline(2, 10, 8, withAlpha(darken(P.gray1, 0.4), 0.4));   // kept dim, or the tiled field is a grid of pale plates
      p.line(4, 15, 6, 8, withAlpha(P.leafD, 0.85)); p.line(6, 8, 5, 1, withAlpha(P.leafD, 0.8));   // the runner
      p.px(6, 6, P.leaf); p.px(5, 11, P.leaf); p.px(5, 3, withAlpha(P.leafL, 0.7));
      p.line(9, 14, 12, 9, withAlpha(P.leafD, 0.6)); p.px(12, 9, withAlpha(P.leaf, 0.7));
    },
    v2: (p, b) => {   // 苔蝕磚 — old brick courses, mortar eaten out and packed with moss
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.16), 8, 137);
      // Courses are BROKEN into short runs at two heights: a full-width bed joint repeats at
      // 16 px and a wall field reads as ruled stripes (R26/B1b banding), which is exactly
      // what the tiled-field sheet showed on the first pass.
      const course = (y, off) => {
        p.hline(1, 6, y, withAlpha(darken(b.wall, 0.5), 0.45));
        p.hline(9, 14, y + (off ? 1 : -1), withAlpha(darken(b.wall, 0.5), 0.38));
        p.vline(y - 3, y - 1, (off + 4) & 15, withAlpha(darken(b.wall, 0.52), 0.45));
        p.vline(y - 3, y - 1, (off + 11) & 15, withAlpha(darken(b.wall, 0.52), 0.4));
      };
      course(5, 0); course(11, 6);                                                   // two courses, head joints offset
      p.px(3, 4, withAlpha(P.moss, 0.6)); p.px(12, 10, withAlpha(P.moss, 0.5)); p.px(8, 12, withAlpha(P.moss, 0.45));
      p.ellipse(6, 8, 2.6, 1.6, withAlpha(P.moss, 0.32));                            // a moss cushion on one brick
      p.px(6, 7, withAlpha(P.leafL, 0.3));
    },
    bk: (p, b) => {   // BROKEN: 樹根穿牆 — a root came through and took the corner with it
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.12), darken(b.wall, 0.32));
      p.hline(0, 5, 0, b.wallL); p.hline(12, 15, 0, b.wallL);
      for (let i = 0; i < 5; i++) p.hline(6 - (i > 2 ? 1 : 0), 11 + (i > 3 ? 1 : 0), i, withAlpha(darken(b.wall, 0.72), 0.9));
      p.line(8, 0, 7, 8, withAlpha(P.barkD, 0.9)); p.line(7, 8, 9, 15, withAlpha(P.barkD, 0.85));   // the root through the gap
      p.line(7, 6, 4, 10, withAlpha(P.barkD, 0.7)); p.line(8, 11, 12, 13, withAlpha(P.barkD, 0.6));
      p.px(7, 3, withAlpha(P.bark, 0.7)); p.px(8, 12, withAlpha(P.bark, 0.6));
      p.px(5, 9, withAlpha(P.moss, 0.5)); p.px(11, 13, withAlpha(P.leafD, 0.6));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.42), 5, 167);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.52), darken(b.wall, 0.64));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.7), 7, 173 + s * 37);
      p.speckle(0, 0, 16, 16, withAlpha(P.leafD, 0.2), 4, 193 + s * 39);
    },
    far: (p, b, k) => {   // 深林霧牆 — receding ranks of canopy dissolving into green mist
      const mist = mix(darken(b.wall, 0.42), P.leafD, 0.3);
      p.gradV(0, 0, 16, 16, lighten(mist, 0.14), darken(mist, 0.22));
      if (k === 0) {
        p.ellipse(4, 7, 5, 4, withAlpha(darken(P.leafD, 0.3), 0.75)); p.ellipse(11, 9, 6, 4, withAlpha(darken(P.leafD, 0.36), 0.7));
        p.vline(9, 15, 4, withAlpha(P.barkD, 0.6)); p.px(3, 4, withAlpha(P.leaf, 0.3));
      } else if (k === 1) {
        p.ellipse(8, 11, 8, 4, withAlpha(darken(P.leafD, 0.4), 0.7));
        p.vline(6, 15, 12, withAlpha(P.barkD, 0.55)); p.vline(10, 15, 2, withAlpha(P.barkD, 0.45));
        p.ellipse(12, 5, 4, 2.6, withAlpha(darken(P.leafD, 0.24), 0.6));
        p.speckle(0, 0, 16, 8, withAlpha(P.holyL, 0.16), 4, 233);
      } else {
        p.ellipse(6, 13, 9, 3.4, withAlpha(darken(P.leafD, 0.46), 0.6));
        p.speckle(0, 0, 16, 12, withAlpha(lighten(mist, 0.2), 0.4), 6, 239);
        p.px(11, 6, withAlpha(P.leafL, 0.3));
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.22), 5, 257 + k * 13);
    },
  },

  // ── 腐沼濕地 (W3-C2): a rotting bulwark the marsh is digesting ─────────────
  swamp: {
    foot: 0.16,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.34), darken(b.wall, 0.5)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 朽木樁牆 — a palisade of rotted piles, tops split at different heights
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.2), 6, 101); p.speckle(0, 8, 16, 8, darken(b.wall, 0.52), 5, 131);
      const pile = (x, w, top) => {
        p.rect(x, top, w, 16 - top, withAlpha(mix(P.barkD, b.wall, 0.4), 0.9));
        p.vline(top, 15, x, withAlpha(mix(P.bark, P.bogL, 0.3), 0.5));
        p.vline(top, 15, x + w - 1, withAlpha(darken(P.barkD, 0.4), 0.6));
        p.px(x, top, withAlpha(P.bogL, 0.4));                                        // splintered lit top
      };
      pile(1, 4, 2); pile(6, 3, 4); pile(10, 5, 1);
      p.px(2, 9, withAlpha(P.slimeBog, 0.35)); p.px(11, 6, withAlpha(P.moss, 0.4)); p.px(7, 12, withAlpha(P.murk, 0.5));
    },
    v2: (p, b) => {   // 泥沼滲層 — mud bleeding out of the joints and running down the face
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.28), 8, 137);
      // The first pass carried the weight on HORIZONTAL seep lines, and a wall field printed
      // a hard stripe every 16 rows however far they were inset (the R26/B1b banding failure
      // mode — a repeated feature ROW is the one that tiles worst). Mud runs DOWN a wall
      // anyway, so the energy moved to vertical run-off; the lips that remain are 4-5 px
      // whispers, too short and too faint to line up into a rule.
      const run = (x, y0, y1, a) => {
        p.vline(y0, y1, x, withAlpha(darken(P.murk, 0.18), a));
        p.px(x - 1, y0, withAlpha(lighten(b.wall, 0.1), a * 0.5));                    // the wet lip it started from
        p.px(x, y1, withAlpha(P.slimeBog, a * 0.5));                                  // where it pooled
      };
      run(3, 2, 11, 0.65); run(4, 3, 9, 0.4); run(9, 6, 15, 0.55); run(13, 1, 7, 0.45); run(12, 9, 14, 0.35);
      p.hline(2, 6, 2, withAlpha(darken(P.murk, 0.2), 0.35)); p.hline(8, 12, 6, withAlpha(darken(P.murk, 0.2), 0.28));
      p.px(12, 11, withAlpha(P.bogL, 0.35)); p.px(7, 3, withAlpha(P.slimeBog, 0.25));
    },
    bk: (p, b) => {   // BROKEN: 菌斑蝕面 — the face rotted through, bracket fungus in the wound
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.34), darken(b.wall, 0.5));
      p.hline(0, 9, 0, b.wallL);
      for (let i = 0; i < 5; i++) p.hline(11 + (i > 2 ? 1 : 0), 15, i, withAlpha(darken(b.wall, 0.84), 0.92));
      p.ellipse(6, 9, 4.4, 3.6, withAlpha(darken(P.murk, 0.25), 0.75));              // the rot cavity
      p.ellipse(6, 9, 2.8, 2.2, withAlpha(P.ink, 0.55));
      p.ellipse(4, 6, 2.6, 1.2, withAlpha(mix(P.bone, P.bog, 0.45), 0.8));           // bracket fungus shelves
      p.ellipse(8, 12, 2, 1, withAlpha(mix(P.bone, P.bog, 0.55), 0.7));
      p.px(3, 5, withAlpha(P.bone, 0.5)); p.px(9, 11, withAlpha(P.bogL, 0.5));
      p.px(12, 13, withAlpha(P.slimeBog, 0.35));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.54), 5, 167);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.66), darken(b.wall, 0.76));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.82), 7, 181 + s * 37);
      p.speckle(0, 0, 16, 16, withAlpha(P.murk, 0.3), 4, 197 + s * 41);
    },
    far: (p, b, k) => {   // 霧鎖枯林 — drowned deadwood standing in mist over flat water
      const haze = mix(darken(b.wall, 0.46), P.murk, 0.4);
      p.gradV(0, 0, 16, 16, lighten(haze, 0.16), darken(haze, 0.2));
      if (k === 0) {
        p.vline(2, 12, 3, withAlpha(darken(P.barkD, 0.2), 0.8)); p.line(3, 5, 1, 3, withAlpha(darken(P.barkD, 0.2), 0.6));
        p.vline(5, 12, 9, withAlpha(darken(P.barkD, 0.3), 0.7)); p.line(9, 6, 12, 4, withAlpha(darken(P.barkD, 0.3), 0.55));
        p.ellipse(8, 13, 8, 2.4, withAlpha(lighten(haze, 0.12), 0.6));               // the water line
      } else if (k === 1) {
        p.vline(4, 13, 12, withAlpha(darken(P.barkD, 0.25), 0.75)); p.line(12, 6, 14, 3, withAlpha(darken(P.barkD, 0.25), 0.5));
        p.ellipse(6, 12, 7, 3, withAlpha(lighten(haze, 0.1), 0.55));
        p.speckle(0, 0, 16, 9, withAlpha(P.slimeBog, 0.14), 4, 233);
      } else {
        p.ellipse(8, 11, 9, 3.6, withAlpha(lighten(haze, 0.18), 0.5));
        p.px(5, 8, withAlpha(P.bogL, 0.3)); p.px(11, 9, withAlpha(P.slimeBog, 0.22));
        p.speckle(0, 0, 16, 14, withAlpha(P.murk, 0.3), 6, 239);
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.24), 5, 251 + k * 7);
    },
  },

  // ── 深淵海溝 (W3-C2): trench rock under pressure, lit only by what lives on it ──
  abyss: {
    foot: 0.17,
    base: (p, b) => { p.gradV(0, 0, 16, 16, darken(b.wall, 0.4), darken(b.wall, 0.56)); p.hline(0, 15, 0, b.wallL); },
    v1: (p, b) => {   // 深海蝕岩 — dissolution pits, crusted with barnacle rings
      p.speckle(0, 1, 16, 7, darken(b.wall, 0.26), 6, 101); p.speckle(0, 8, 16, 8, darken(b.wall, 0.58), 5, 131);
      const pit = (x, y, r) => {
        p.ellipse(x, y, r, r * 0.85, withAlpha(darken(b.wall, 0.74), 0.7));
        p.px(x, y - Math.round(r), withAlpha(lighten(b.wall, 0.16), 0.4));           // lit upper lip
      };
      pit(4, 5, 2.4); pit(11, 9, 1.8); pit(7, 13, 1.4); pit(13, 3, 1.2);
      // the first pass ringed the big pit — a closed circle is the one shape that survives
      // tiling as an unmistakable motif (the tiled-field sheet printed a grid of "O"s).
      // Seeded crust instead: same barnacle read, no repeating glyph.
      p.speckle(1, 1, 14, 14, withAlpha(mix(P.sand, b.wall, 0.5), 0.3), 7, 139);
      p.px(2, 11, withAlpha(P.sandD, 0.3)); p.px(14, 7, withAlpha(P.sandD, 0.24));
    },
    v2: (p, b) => {   // 發光珊瑚縫 — a seam colonised by bioluminescent polyps
      p.speckle(0, 1, 16, 14, darken(b.wall, 0.44), 8, 137);
      p.line(2, 14, 6, 7, withAlpha(darken(b.wall, 0.8), 0.75)); p.line(6, 7, 12, 3, withAlpha(darken(b.wall, 0.8), 0.65));
      p.glow(6, 7, 3, P.neon, 0.16, 3);
      const polyp = (x, y, c, a) => { p.px(x, y, withAlpha(c, a)); p.px(x, y - 1, withAlpha(P.oceanL, a * 0.6)); };
      polyp(4, 11, P.neonL, 0.75); polyp(6, 7, P.white, 0.7); polyp(9, 5, P.neon, 0.6); polyp(11, 4, P.neonL, 0.5);
      p.px(13, 10, withAlpha(P.coral, 0.35)); p.px(3, 4, withAlpha(P.oceanL, 0.3));
    },
    bk: (p, b) => {   // BROKEN: 壓裂紋 — the face split under pressure, the trench showing through
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.4), darken(b.wall, 0.56));
      p.hline(0, 6, 0, b.wallL); p.hline(10, 15, 0, b.wallL);
      for (let i = 0; i < 6; i++) p.hline(7 - (i > 3 ? 1 : 0), 9 + (i > 1 ? 1 : 0) + (i > 4 ? 1 : 0), i, withAlpha(mix(P.abyss, P.ink, 0.4), 0.92));
      p.line(8, 5, 6, 15, withAlpha(mix(P.abyss, P.ink, 0.35), 0.8));                // the split running down
      p.line(9, 6, 12, 14, withAlpha(mix(P.abyss, P.ink, 0.35), 0.6));
      p.px(7, 7, withAlpha(lighten(b.wall, 0.2), 0.5)); p.px(10, 9, withAlpha(P.oceanL, 0.35));   // fresh edges catching light
      p.px(4, 12, withAlpha(P.neon, 0.3)); p.px(13, 4, withAlpha(P.sandD, 0.28));
      p.speckle(0, 8, 16, 8, darken(b.wall, 0.6), 5, 167);
    },
    deep: (p, b, s) => {
      p.gradV(0, 0, 16, 16, darken(b.wall, 0.74), darken(b.wall, 0.84));
      p.speckle(0, 0, 16, 16, darken(b.wall, 0.88), 7, 179 + s * 41);
      p.speckle(0, 0, 16, 16, withAlpha(P.oceanL, 0.1), 4, 199 + s * 43);
    },
    far: (p, b, k) => {   // 海溝消隱 — the trench wall falls away into unlit water
      const deepw = mix(darken(b.wall, 0.78), P.abyss, 0.55);
      p.gradV(0, 0, 16, 16, lighten(deepw, 0.12), darken(deepw, 0.3));
      if (k === 0) {
        p.line(0, 5, 6, 10, withAlpha(darken(b.wall, 0.6), 0.7)); p.line(6, 10, 15, 8, withAlpha(darken(b.wall, 0.62), 0.6));
        p.ellipse(9, 14, 7, 2.4, withAlpha(darken(deepw, 0.2), 0.6));                // silt settled on a shelf
        p.px(4, 7, withAlpha(P.neon, 0.3));
      } else if (k === 1) {
        p.line(3, 15, 5, 6, withAlpha(darken(b.wall, 0.6), 0.65)); p.line(5, 6, 9, 12, withAlpha(darken(b.wall, 0.6), 0.55));
        p.glow(12, 7, 3, P.neon, 0.12, 3); p.px(12, 7, withAlpha(P.neonL, 0.5)); p.px(11, 10, withAlpha(P.neon, 0.3));
        p.speckle(0, 0, 16, 16, withAlpha(P.oceanL, 0.16), 4, 233);
      } else {
        p.ellipse(7, 12, 8, 3, withAlpha(mix(P.abyss, P.ink, 0.35), 0.6));
        p.speckle(0, 0, 16, 13, withAlpha(P.oceanL, 0.2), 6, 239);
        p.px(10, 5, withAlpha(P.neonL, 0.35)); p.px(4, 9, withAlpha(P.neon, 0.25));
      }
      p.speckle(0, 0, 16, 16, withAlpha(P.ink, 0.28), 5, 263 + k * 11);
    },
  },
};

// biomeId -> { bands, oob } consumed by maps.js (tileset) and world.js (drawTiles).
// A biome with no WALL_VARIANTS entry never opts into wallBands, so `_buildWallDepth`
// stays skipped and drawTiles takes the old path. As of W3-C2 all 10 run biomes opt
// in; the town/interior tilesets supply their own bands and are untouched by this.
// bands[0] is never reached for WALL tiles (the depth BFS seeds on FLOOR, so a
// floor-adjacent wall is depth 1) — it mirrors bands[1] so the array is total.
export const BIOME_MACRO = {};

const WALLTOPS = {
  crypt: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.12), darken(b.wallD, 0.26)); p.rect(0, 0, 16, 2, b.wallL); p.rect(0, 2, 16, 1, b.wall); },
  // R26/B1c — dark FRINGE skirt (like verdant): the old solid bright wallL/sandL/star rows
  // tiled into glowing horizontal bars when drawn below south walls. Now a seeded dark
  // fringe + a single dim biome accent, reading as a contact shadow at the wall foot.
  cavern: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.14), darken(b.wallD, 0.30)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.22), 0.8), 10, 43); p.px(5, 4, withAlpha(b.accent, 0.5)); },
  frost: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.10), darken(b.wallD, 0.28)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.18), 0.8), 10, 47); p.px(11, 2, withAlpha(P.ice, 0.4)); },
  inferno: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.20), darken(b.wallD, 0.34)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.28), 0.8), 10, 51); p.px(8, 1, withAlpha(P.ember, 0.6)); },
  void: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.14), darken(b.wallD, 0.30)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.22), 0.8), 10, 59); p.px(8, 2, withAlpha(P.manaL, 0.5)); },

  // ── NEW ──
  verdant: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.08), darken(b.wallD, 0.26)); p.speckle(0, 0, 16, 3, withAlpha(P.leafD, 0.8), 10, 43); p.px(4, 1, withAlpha(P.leaf, 0.6)); p.px(11, 2, withAlpha(P.leafD, 0.6)); }, // R26/B1: dark hanging-foliage skirt (the old solid wallL rows tiled into bright green bars)
  desert: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.06), darken(b.wallD, 0.22)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.12), 0.8), 10, 61); p.px(12, 2, withAlpha(P.sand, 0.5)); },
  swamp: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.1), darken(b.wallD, 0.28)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.18), 0.8), 10, 67); p.px(6, 2, withAlpha(P.slimeBog, 0.45)); },
  abyss: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.16), darken(b.wallD, 0.34)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.24), 0.8), 10, 73); p.px(5, 3, withAlpha(P.neon, 0.5)); },
  celestial: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.10), darken(b.wallD, 0.26)); p.speckle(0, 0, 16, 3, withAlpha(darken(b.wallD, 0.16), 0.8), 10, 83); p.px(3, 3, withAlpha(P.astralL, 0.5)); },
};

// Which floorx tiles are animated (and how many frames). Static biomes bake a single
// frame via defineSprite; animated ones bake a short loop via defineAnim. Animation is
// kept slow + subtle so contiguous feature regions shimmer, never strobe.
const FLOORX_ANIM = { inferno: [3, 5], void: [2, 2], swamp: [3, 3], abyss: [2, 2], celestial: [2, 2] };

function tileset(b) {
  const id = b.id;
  const F = FLOORS[id] || FLOORS.crypt, Wd = WALLS[id] || WALLS.crypt, Wt = WALLTOPS[id] || WALLTOPS.crypt;
  defineSprite('floor_' + id, 16, 16, (p) => F(p, b, 0), { anchor: [0, 0] });
  defineSprite('floor2_' + id, 16, 16, (p) => F(p, b, 1), { anchor: [0, 0] });
  const anim = FLOORX_ANIM[id];
  if (anim) {
    defineAnim('floorx_' + id, 16, 16, anim[0], (p, f) => F(p, b, 2, f), { anchor: [0, 0], fps: anim[1] });
  } else {
    defineSprite('floorx_' + id, 16, 16, (p) => F(p, b, 2), { anchor: [0, 0] });
  }
  defineSprite('wall_' + id, 16, 16, (p) => Wd(p, b), { anchor: [0, 0] });
  defineSprite('walltop_' + id, 16, 8, (p) => Wt(p, b), { anchor: [0, 0] });
  // R28/W2-D — opt-in wall variants / broken state / deep mass / horizon band.
  const wv = WALL_VARIANTS[id];
  if (!wv) return;
  const tile = (n, fn) => defineSprite(n, 16, 16, fn, { anchor: [0, 0] });
  tile('wallv1_' + id, (p) => { wv.base(p, b); wv.v1(p, b); wallBase(p, b, wv.foot); });
  tile('wallv2_' + id, (p) => { wv.base(p, b); wv.v2(p, b); wallBase(p, b, wv.foot); });
  tile('wallbk_' + id, (p) => { wv.bk(p, b); wallBase(p, b, wv.foot); });
  tile('walldeep_' + id, (p) => wv.deep(p, b, 0));
  tile('walldeep2_' + id, (p) => wv.deep(p, b, 1));
  tile('wallfar_' + id, (p) => wv.far(p, b, 0));
  tile('wallfar2_' + id, (p) => wv.far(p, b, 1));
  tile('wallfar3_' + id, (p) => wv.far(p, b, 2));
  // hash5 (world.js drawTiles) buckets 0..4 → a 5-slot face array gives an exact
  // 40 / 20 / 20 / 20 mix of stock wall / variant A / variant B / broken.
  const face = ['wall_' + id, 'wall_' + id, 'wallv1_' + id, 'wallv2_' + id, 'wallbk_' + id];
  BIOME_MACRO[id] = {
    bands: [face, face, ['walldeep_' + id, 'walldeep2_' + id]],
    oob: ['wallfar_' + id, 'wallfar2_' + id, 'wallfar3_' + id],
  };
}
BIOMES.forEach(tileset);

// ════════════════════════════════════════════════════════════════════════════
//  per-biome decorations (original 4 — UPGRADED, same name/size/frames/anchor/fps)
// ════════════════════════════════════════════════════════════════════════════
defineAnim('dec_crystal', 12, 16, 2, (p, f) => {
  p.softShadow(6, 14, 4, 1.6, 0.4);
  // clustered crystal shards with inner glow
  p.line(6, 14, 4, 6, P.shardD); p.line(6, 14, 3, 8, darken(P.shard, 0.2));
  p.line(6, 14, 6, 3, P.shard); p.line(6, 14, 8, 7, P.shardD); p.line(6, 14, 9, 9, darken(P.shard, 0.15));
  p.line(6, 13, 6, 5, P.shardL); // central core highlight
  p.glow(6, 7, 3, P.shard, 0.25, 3);
  p.rimLight(P.shardL, 0.5);
  p.outline(P.ink);
  p.px(6, 3 + f, P.shardL); p.px(4, 7, P.shardL);
  if (f === 1) p.sparkle(6, 4, P.white, 1); else p.sparkle(9, 8, withAlpha(P.shardL, 0.7), 1);
}, { anchor: [6, 14], fps: 2 });

defineAnim('dec_ice', 12, 14, 2, (p, f) => {
  p.softShadow(6, 12, 4, 1.6, 0.4);
  p.ellipse(6, 8, 3, 5, P.iceD); p.ellipse(6, 8, 2, 4, P.ice); p.ellipse(5, 7, 1.2, 3, lighten(P.ice, 0.3));
  p.vline(3, 11, 6, P.white);
  p.glow(6, 8, 3, P.ice, 0.2, 3);
  p.rimLight(P.rimCool, 0.5);
  p.outline(P.ink);
  p.px(5, 5 + f, P.white);
  if (f === 0) p.sparkle(8, 5, P.white, 1); else p.star4(6, 3, 2, P.rimCool, P.white);
}, { anchor: [6, 12], fps: 2 });

defineAnim('dec_lava', 14, 10, 3, (p, f) => {
  p.softShadow(7, 8, 6, 1.6, 0.35);
  p.ellipse(7, 7, 6, 3, darken(P.ember, 0.5));
  p.ellipse(7, 7, 5, 2.4, '#3a1410');
  p.ellipse(7, 7, 4, 1.8, darken(P.ember, 0.1)); // molten centre
  p.glow(7, 7, 4, P.emberL, 0.3, 3);
  const b = [0, 1, 0][f];
  p.ellipse(4, 6 - b, 1.5, 1, P.ember); p.ellipse(9, 7 + b, 1.5, 1, P.emberL);
  p.px(4, 5 - b, P.white); p.px(6, 6, P.white); // bubble highlights
  if (f === 1) p.sparkle(7, 4, P.emberL, 1);
}, { anchor: [7, 8], fps: 5 });

defineAnim('dec_voidcrystal', 12, 16, 2, (p, f) => {
  p.softShadow(6, 14, 4, 1.6, 0.4);
  p.ellipse(6, 8, 3, 6, P.purpleD); p.ellipse(6, 8, 1.8, 4.5, P.purple); p.ellipse(5, 7, 1, 3.5, lighten(P.purple, 0.25));
  p.vline(3, 12, 6, P.purpleL);
  p.glow(6, 7, 3.5, P.purple, 0.28, 3);
  p.aura(6, 7, 4, P.manaL, f * 0.5, 1);
  p.rimLight(P.astralL, 0.5);
  p.outline(P.ink);
  p.px(6, 4 + f, P.manaL);
  if (f === 1) p.star4(6, 5, 2, P.manaL, P.white); else p.sparkle(8, 9, withAlpha(P.purpleL, 0.7), 1);
}, { anchor: [6, 14], fps: 2 });

// ════════════════════════════════════════════════════════════════════════════
//  NEW per-biome decorations (bd_*) — each new biome's default 'decor' sprite
// ════════════════════════════════════════════════════════════════════════════

// 翠林 — broad-leaf tree with sun-dappled canopy + a drifting blossom
defineAnim('bd_verdant_tree', 16, 22, 2, (p, f) => {
  p.softShadow(8, 20, 5, 2, 0.4);
  // trunk
  p.rect(7, 12, 3, 9, P.barkD); p.rect(7, 12, 1, 9, P.bark); p.px(7, 12, P.woodL);
  p.line(8, 14, 5, 11, P.barkD); p.line(8, 15, 11, 12, P.barkD); // roots/branch
  // layered canopy (3 tonal steps)
  p.ellipse(8, 7, 7, 5, P.leafD);
  p.ellipse(7, 6, 6, 4, P.leaf);
  p.ellipse(6, 5, 3.5, 2.5, P.leafL);
  p.speckle(3, 2, 11, 8, withAlpha(P.holyL, 0.4), 5, 7); // sun dapples
  p.glow(5, 4, 2, P.leafL, 0.2, 2);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
  // drifting blossom
  if (f === 0) { p.px(12, 9, P.sakura); p.px(12, 8, P.sakuraL); }
  else { p.px(13, 12, P.sakura); p.px(2, 6, P.sakuraL); }
  p.sparkle(6, 4, withAlpha(P.holyL, 0.7), 1);
}, { anchor: [8, 20], fps: 2 });

// 流沙荒漠 — saguaro cactus with a tiny bloom + sun glint
defineAnim('bd_desert_cactus', 14, 20, 2, (p, f) => {
  p.softShadow(7, 18, 5, 1.8, 0.35);
  // main stem
  p.rect(6, 4, 3, 15, P.greenD);
  p.rect(6, 4, 1, 15, P.green); p.px(6, 4, P.greenL); // lit left edge
  p.rect(8, 4, 1, 15, darken(P.greenD, 0.15)); // shaded right edge
  // arms
  p.rect(3, 9, 2, 5, P.greenD); p.rect(3, 9, 2, 1, P.greenD); p.line(5, 9, 5, 12, P.greenD);
  p.px(3, 9, P.green); p.vline(9, 13, 3, P.green);
  p.rect(10, 7, 2, 4, P.greenD); p.line(9, 7, 9, 10, P.greenD); p.px(11, 7, darken(P.greenD, 0.15));
  // ridges / spines (calm)
  p.vline(5, 18, 7, withAlpha(P.greenL, 0.4));
  p.px(7, 7, P.white); p.px(7, 12, withAlpha(P.white, 0.5)); // spine glints
  p.rimLight(P.rim, 0.4, -1, -1);
  p.outline(P.ink);
  // bloom on top
  if (f === 0) { p.px(7, 3, P.sakura); p.px(7, 2, P.sakuraL); p.px(6, 3, P.sakura); p.px(8, 3, P.sakura); }
  else { p.px(7, 3, P.magentaL); p.px(7, 2, P.sakuraL); p.sparkle(11, 6, withAlpha(P.holyL, 0.7), 1); }
}, { anchor: [7, 18], fps: 1.5 });

// 腐沼 — weeping willow with hanging vines over toxic water + bubbles
defineAnim('bd_swamp_willow', 16, 22, 2, (p, f) => {
  p.softShadow(8, 20, 6, 2, 0.4);
  // gnarled trunk
  p.rect(7, 11, 3, 10, P.barkD); p.rect(7, 11, 1, 10, mix(P.bark, P.bog, 0.4)); p.px(7, 11, P.bogL);
  p.line(8, 13, 11, 10, P.barkD); p.line(8, 14, 5, 11, P.barkD);
  // drooping canopy (murky greens)
  p.ellipse(8, 7, 7, 4, darken(P.bog, 0.05));
  p.ellipse(7, 6, 6, 3.5, P.bogL);
  p.ellipse(6, 5, 3, 2, mix(P.bogL, P.slimeBog, 0.5));
  // hanging vines
  for (let i = 0; i < 5; i++) { const x = 3 + i * 3; p.vline(9, 13 + ((i + f) & 1) + (i % 2), x, withAlpha(P.bogL, 0.8)); p.px(x, 9, P.slimeBog); }
  p.speckle(3, 3, 11, 6, withAlpha(P.slimeBog, 0.4), 4, 13); // moss flecks
  p.rimLight(P.slimeBog, 0.4);
  p.outline(P.ink);
  // toxic bubble at base
  if (f === 0) { p.px(4, 19, P.toxic); p.px(12, 18, withAlpha(P.toxic, 0.6)); }
  else { p.px(4, 18, withAlpha(P.toxic, 0.6)); p.px(12, 19, P.toxic); }
}, { anchor: [8, 20], fps: 2 });

// 深淵海溝 — branching coral with bioluminescent glow + drifting motes
defineAnim('bd_abyss_coral', 14, 18, 2, (p, f) => {
  p.softShadow(7, 16, 5, 1.8, 0.45);
  // coral base
  p.rect(5, 13, 4, 3, darken(P.coral, 0.4)); p.px(5, 13, mix(P.coral, P.oceanD, 0.3));
  // branching fans (3 prongs)
  p.line(7, 15, 4, 6, darken(P.coral, 0.2)); p.line(4, 6, 3, 3, P.coral);
  p.line(7, 15, 7, 4, P.coral); p.line(7, 4, 7, 2, P.magentaL);
  p.line(7, 15, 10, 6, darken(P.coral, 0.2)); p.line(10, 6, 12, 3, P.coral);
  p.line(7, 11, 9, 9, P.coral); p.line(7, 9, 5, 8, darken(P.coral, 0.2));
  // bioluminescent tips
  p.glow(3, 3, 2, P.neon, 0.3, 2); p.glow(7, 3, 2, P.neonL, 0.3, 2); p.glow(12, 3, 2, P.neon, 0.3, 2);
  p.px(3, 3, P.neonL); p.px(7, 3, P.white); p.px(12, 3, P.neonL);
  p.rimLight(P.rimCool, 0.45);
  p.outline(P.ink);
  // drifting motes (bubbles)
  if (f === 0) { p.px(10, 8, withAlpha(P.neonL, 0.7)); p.px(4, 10, withAlpha(P.oceanL, 0.6)); }
  else { p.px(10, 6, withAlpha(P.neonL, 0.7)); p.px(4, 8, withAlpha(P.oceanL, 0.6)); p.sparkle(7, 3, P.white, 1); }
}, { anchor: [7, 16], fps: 2 });

// 天界雲海 — radiant astral pillar wreathed in soft cloud + kira stars
defineAnim('bd_cel_pillar', 14, 22, 2, (p, f) => {
  p.softShadow(7, 20, 5, 1.8, 0.3);
  // marble pillar (3 tonal steps + capital/base)
  p.gradH(5, 4, 5, 15, lighten(P.steelL, 0.06), darken(P.steel, 0.05));
  p.vline(4, 19, 5, P.white); // lit edge
  p.vline(4, 19, 9, darken(P.steel, 0.12)); // shade edge
  p.rect(4, 2, 7, 2, P.steelL); p.rect(4, 19, 7, 2, P.steel); // capital + base
  p.rect(4, 18, 7, 1, darken(P.steel, 0.1));
  // astral glow + halo
  p.glow(7, 5, 4, P.astralL, 0.3, 3);
  p.aura(7, 5, 5, P.holyL, f * 0.5, 1);
  p.rimLight(P.holyL, 0.5);
  p.outline(P.ink);
  // soft clouds at base + kira stars
  p.ellipse(4, 20, 3, 1.4, withAlpha(P.cloud, 0.7)); p.ellipse(11, 20, 2.5, 1.2, withAlpha(P.cloud, 0.6));
  if (f === 0) { p.star4(7, 4, 3, P.holyL, P.white); p.sparkle(11, 8, P.astralL, 1); }
  else { p.star4(7, 4, 2, P.holyL, P.white); p.sparkle(3, 7, P.holyL, 1); p.px(11, 10, P.star); }
}, { anchor: [7, 20], fps: 2 });

export const BIOME_ART_READY = true;
