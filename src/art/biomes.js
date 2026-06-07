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
  { id: 'crypt', name: '幽影地穴', floor: '#24262f', floor2: '#2c2f3b', line: '#15161e', wall: '#48548f', wallD: '#2d3563', wallL: '#7585cf', decor: 'torch', accent: P.shardL, fog: 'rgba(10,12,26,0.0)' },
  { id: 'cavern', name: '水晶洞窟', floor: '#1c2a2e', floor2: '#243638', line: '#121e20', wall: '#2e4a4e', wallD: '#1f3236', wallL: '#4a7076', decor: 'crystal', accent: P.shard, fog: 'rgba(20,40,44,0.05)' },
  { id: 'frost', name: '霜寒冰原', floor: '#1e2a3a', floor2: '#26344a', line: '#16202e', wall: '#37506e', wallD: '#243a52', wallL: '#5f86b0', decor: 'ice', accent: P.ice, fog: 'rgba(160,220,255,0.05)' },
  { id: 'inferno', name: '熔岩深淵', floor: '#2a1816', floor2: '#36201c', line: '#1c0e0c', wall: '#4a2a22', wallD: '#321c16', wallL: '#7a4030', decor: 'lava', accent: P.ember, fog: 'rgba(60,20,10,0.06)' },
  { id: 'void', name: '虛空裂界', floor: '#1c1430', floor2: '#241a40', line: '#120c20', wall: '#3a2a5a', wallD: '#261a40', wallL: '#5a4482', decor: 'voidcrystal', accent: P.purpleL, fog: 'rgba(40,20,70,0.06)' },

  // ── NEW 5 (same field shape) ───────────────────────────────────────────────
  { id: 'verdant', name: '翠林森境', floor: '#26361f', floor2: '#2f4326', line: '#192611', wall: '#3a5230', wallD: '#243a1e', wallL: '#5f8444', decor: 'bd_verdant_tree', accent: P.leafL, fog: 'rgba(120,200,120,0.05)' },
  { id: 'desert', name: '流沙荒漠', floor: '#caa260', floor2: '#d8b46a', line: '#9c7a3e', wall: '#b6904f', wallD: '#8a6a36', wallL: '#e8c98a', decor: 'bd_desert_cactus', accent: P.sandL, fog: 'rgba(240,220,160,0.06)' },
  { id: 'swamp', name: '腐沼濕地', floor: '#2c3a26', floor2: '#37472d', line: '#1b2618', wall: '#3c4a2e', wallD: '#27331f', wallL: '#5e7240', decor: 'bd_swamp_willow', accent: P.slimeBog, fog: 'rgba(110,140,70,0.07)' },
  { id: 'abyss', name: '深淵海溝', floor: '#0f3046', floor2: '#143b54', line: '#0a2030', wall: '#16415c', wallD: '#0d2e44', wallL: '#2f6f96', decor: 'bd_abyss_coral', accent: P.oceanL, fog: 'rgba(20,80,120,0.08)' },
  { id: 'celestial', name: '天界雲海', floor: '#5a6fae', floor2: '#6a80c4', line: '#3e4f86', wall: '#7488c4', wallD: '#52639c', wallL: '#b9c8f0', decor: 'bd_cel_pillar', accent: P.astralL, fog: 'rgba(200,210,255,0.05)' },
];

// Per-biome FLOOR painters. v0 = CLEAN base, v1 = subtle alt shade (both calm/flat to
// avoid eye-straining per-tile noise), v2 = a distinct FEATURE floor (lava/snow/crystal/
// rift) — a strong COLOUR BLOCK that maps.js paints in contiguous regions for clear
// visual separation (some cells are lava, some are rock, …), not uniform texture.
// ENHANCED: every base tile now carries a faint top-left light + bottom shade for depth,
// a couple of seeded accent glints, and the feature tiles are livelier / animated where
// it reads well at 16px. floorx painters accept an optional frame index `f`.
const FLOORS = {
  // ── crypt: aged flagstone, pale worn feature ────────────────────────────────
  crypt: (p, b, v) => {
    if (v === 2) { // worn pale flagstone catching a shaft of light (kept a calm GREY so it never reads like the blue wall)
      p.gradV(0, 0, 16, 16, lighten(b.floor, 0.14), lighten(b.floor, 0.05));
      p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
      p.hline(0, 15, 7, mix(b.floor, b.line, 0.4)); p.vline(7, 15, 8, mix(b.floor, b.line, 0.4));
      p.px(5, 5, lighten(b.floor2, 0.2)); p.px(10, 10, b.floor2);
      p.speckle(1, 1, 14, 13, withAlpha(P.shardL, 0.18), 4, 17);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.04) : b.floor, v === 1 ? darken(b.floor2, 0.06) : darken(b.floor, 0.08));
    p.hline(0, 15, 0, lighten(b.floor, 0.06)); p.vline(0, 15, 0, lighten(b.floor, 0.06));
    p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
    p.speckle(2, 2, 12, 12, withAlpha(P.ink, 0.25), v === 1 ? 3 : 4, v === 1 ? 23 : 11);
  },
  // ── cavern: damp rock, crystal-vein feature ────────────────────────────────
  cavern: (p, b, v) => {
    if (v === 2) { // crystal-vein ground, faint inner glow
      p.gradV(0, 0, 16, 16, mix(b.floor, b.accent, 0.32), mix(b.floor, b.accent, 0.5));
      p.glow(8, 9, 5, b.accent, 0.22, 3);
      p.line(2, 13, 7, 6, lighten(b.accent, 0.1)); p.line(7, 6, 12, 10, b.accent);
      p.px(6, 6, lighten(b.accent, 0.35)); p.px(11, 10, b.accent); p.px(4, 11, darken(b.accent, 0.25));
      p.sparkle(7, 6, P.shardL, 1);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.03) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.1));
    p.hline(0, 15, 0, lighten(b.floor, 0.08));
    p.px(12, 12, darken(b.floor, 0.1)); p.px(3, 9, darken(b.floor, 0.08));
    p.speckle(2, 2, 12, 12, withAlpha(b.accent, 0.12), 3, v === 1 ? 31 : 7);
  },
  // ── frost: dark ice, snow-field feature ────────────────────────────────────
  frost: (p, b, v) => {
    if (v === 2) { // snow field with a cool sheen + sparkle
      p.gradV(0, 0, 16, 16, mix(P.white, P.ice, 0.22), mix(P.white, P.ice, 0.42));
      p.hline(0, 15, 15, P.iceD); p.vline(0, 15, 15, P.iceD);
      p.dither(2, 9, 12, 4, mix(P.white, P.ice, 0.3), mix(P.white, P.ice, 0.5));
      p.sparkle(4, 4, P.white, 1); p.px(11, 6, P.white);
      p.speckle(1, 1, 14, 8, withAlpha(P.white, 0.5), 4, 19);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.04) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.06));
    p.hline(0, 15, 0, lighten(b.wallL, 0.1));
    p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
    p.line(2, 11, 9, 4, withAlpha(P.ice, 0.18)); // frost crack
    p.px(12, 6, withAlpha(P.white, 0.4));
  },
  // ── inferno: scorched rock, molten lava feature (animated) ─────────────────
  inferno: (p, b, v, f = 0) => {
    if (v === 2) { // lava / magma — glowing cracks, slow flow
      p.gradV(0, 0, 16, 16, darken(P.ember, 0.35), darken(P.red, 0.2));
      p.glow(6 + f, 8, 4, P.emberL, 0.3, 3);
      p.line(1, 4, 7, 9, P.ember); p.line(7, 9, 14, 6, P.emberL);
      p.line(3, 13, 10, 11, darken(P.ember, 0.1));
      p.px(5 - f, 4, P.white); p.px(11, 7 + f, P.emberL); p.px(8, 10, lighten(P.ember, 0.3));
      p.shadeBottom(0.14);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.04) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.1));
    p.hline(0, 15, 0, lighten(b.floor, 0.08));
    p.hline(0, 15, 15, b.line); p.vline(0, 15, 15, b.line);
    p.px(11, 9, withAlpha(P.ember, 0.5)); p.px(4, 5, withAlpha(P.ember, 0.3)); // dim embers in cracks
    p.speckle(2, 2, 12, 12, withAlpha(P.ink, 0.22), 3, v === 1 ? 13 : 5);
  },
  // ── void: dark stone, rift feature (animated mana motes) ───────────────────
  void: (p, b, v, f = 0) => {
    if (v === 2) { // void rift — torn glow + drifting motes
      p.gradV(0, 0, 16, 16, mix(b.floor, P.purple, 0.42), mix(b.floor, P.void, 0.6));
      p.glow(8, 8, 6, P.purpleL, 0.26, 4);
      p.line(3, 12, 8, 4, P.purpleL); p.line(8, 4, 13, 11, P.manaL);
      p.px(6, 6 + f, P.manaL); p.px(10, 10 - f, P.purpleL); p.px(4, 12, P.manaL);
      p.star4(8, 6, 2, P.manaL, P.white);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.04) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.08));
    p.hline(0, 15, 0, lighten(b.floor, 0.07));
    p.px(11, 8, withAlpha(P.purpleL, 0.4)); p.px(5, 12, withAlpha(P.manaL, 0.3));
    p.speckle(2, 2, 12, 12, withAlpha(P.purpleL, 0.14), 3, v === 1 ? 29 : 3);
  },

  // ═══ NEW BIOMES ════════════════════════════════════════════════════════════
  // ── verdant: mossy soil + sun-dappled greens; feature = flower meadow ──────
  verdant: (p, b, v) => {
    if (v === 2) { // flower meadow
      p.gradV(0, 0, 16, 16, mix(P.leaf, P.moss, 0.4), darken(P.leafD, 0.05));
      p.speckle(1, 1, 14, 14, lighten(P.leaf, 0.12), 7, 41);
      // a few little blossoms
      p.px(4, 5, P.sakuraL); p.px(4, 4, P.sakura); p.px(5, 5, P.sakura); p.px(4, 6, P.sakura); p.px(3, 5, P.sakura);
      p.px(11, 10, P.holyL); p.px(11, 9, P.gold); p.px(12, 10, P.gold); p.px(11, 11, P.gold); p.px(10, 10, P.gold);
      p.px(8, 13, P.sakura); p.px(13, 4, P.gold);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.05) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.08));
    p.hline(0, 15, 0, mix(b.floor, P.leafL, 0.35)); // sun-dapple top
    p.hline(0, 15, 15, b.line);
    p.speckle(2, 2, 12, 12, withAlpha(P.bark, 0.3), 4, v === 1 ? 53 : 17); // soil flecks
    p.px(5, 4, withAlpha(P.leafL, 0.5)); p.px(11, 9, withAlpha(P.moss, 0.6)); // moss tufts
  },
  // ── desert: warm sand dunes + sandstone; feature = cracked oasis/quicksand ─
  desert: (p, b, v) => {
    if (v === 2) { // cracked oasis basin / quicksand swirl
      p.gradV(0, 0, 16, 16, mix(P.sand, P.ocean, 0.35), mix(P.sandD, P.oceanD, 0.4));
      p.ellipse(8, 9, 6, 4, withAlpha(P.oceanL, 0.5)); // shallow water sheen
      p.ellipse(8, 9, 4, 2.5, withAlpha(P.skyL, 0.4));
      p.line(1, 3, 6, 6, withAlpha(P.clay, 0.5)); p.line(10, 4, 15, 7, withAlpha(P.clay, 0.4)); // cracks
      p.px(8, 7, P.hiSky); p.px(6, 9, withAlpha(P.white, 0.6));
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.05) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.1));
    p.hline(0, 15, 0, P.sandL); // sunlit crest
    // wind-ripple lines (calm, low-frequency)
    p.line(0, 6, 10, 4, withAlpha(P.sandD, 0.35)); p.line(4, 12, 15, 10, withAlpha(P.sandD, 0.3));
    p.px(13, 5, P.sandL); p.px(3, 11, withAlpha(P.clay, 0.5));
    p.speckle(2, 2, 12, 12, withAlpha(P.sandL, 0.3), 3, v === 1 ? 61 : 23);
  },
  // ── swamp: murky bog greens; feature = bubbling toxic water ────────────────
  swamp: (p, b, v, f = 0) => {
    if (v === 2) { // bubbling toxic water (animated bubbles)
      p.gradV(0, 0, 16, 16, mix(P.bog, P.slimeBog, 0.45), darken(P.bog, 0.1));
      p.glow(8, 9, 5, P.slimeBog, 0.2, 3);
      p.dither(1, 9, 14, 5, mix(P.bog, P.slimeBog, 0.3), mix(P.bog, P.slimeBog, 0.55));
      // rising toxic bubbles
      p.circle(5, 11 - f, 1, P.toxic); p.circle(11, 8 + f, 1, lighten(P.slimeBog, 0.2));
      p.px(8, 5 + (f & 1), P.poison); p.px(8, 5 + (f & 1) - 1, withAlpha(P.toxic, 0.6));
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.04) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.1));
    p.hline(0, 15, 0, mix(b.floor, P.bogL, 0.4));
    p.hline(0, 15, 15, b.line);
    // algae / slime patches
    p.px(4, 5, withAlpha(P.slimeBog, 0.6)); p.px(5, 5, withAlpha(P.slimeBog, 0.4));
    p.px(11, 10, withAlpha(P.bogL, 0.6)); p.px(10, 11, withAlpha(P.bogL, 0.4));
    p.speckle(2, 2, 12, 12, withAlpha(P.murk, 0.5), 4, v === 1 ? 71 : 37);
  },
  // ── abyss: sunken deep-sea blues; feature = glowing seabed vent ────────────
  abyss: (p, b, v, f = 0) => {
    if (v === 2) { // glowing seabed vent (bioluminescent)
      p.gradV(0, 0, 16, 16, mix(b.floor, P.abyss, 0.5), P.abyss);
      p.glow(8, 11, 6, P.neon, 0.3, 4); // vent glow
      p.line(8, 14, 8, 8 - f, P.neonL); p.line(8, 14, 6, 9, withAlpha(P.neon, 0.6)); p.line(8, 14, 10, 9, withAlpha(P.neon, 0.6));
      p.px(8, 7 - f, P.white); p.px(6, 4, withAlpha(P.neonL, 0.6)); p.px(11, 5, withAlpha(P.neon, 0.5)); // drifting motes
      p.sparkle(8, 9, P.neonL, 1);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.05) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.14));
    p.hline(0, 15, 0, mix(b.floor, P.oceanL, 0.3)); // faint caustic light from above
    // soft caustic ripple
    p.line(1, 4, 8, 2, withAlpha(P.oceanL, 0.18)); p.line(8, 12, 15, 9, withAlpha(P.oceanL, 0.12));
    p.px(12, 6, withAlpha(P.oceanL, 0.4)); p.px(4, 11, withAlpha(P.neon, 0.2));
    p.speckle(2, 2, 12, 12, withAlpha(P.oceanL, 0.12), 3, v === 1 ? 83 : 43);
  },
  // ── celestial: bright cloud + astral marble; feature = starlit rift ────────
  celestial: (p, b, v, f = 0) => {
    if (v === 2) { // starlit rift in the clouds
      p.gradV(0, 0, 16, 16, mix(P.astral, P.void, 0.35), mix(P.astral, P.purpleD, 0.5));
      p.glow(8, 8, 7, P.astralL, 0.26, 4);
      p.star4(8, 8, 3, P.holyL, P.white);
      p.sparkle(4, 11, P.astralL, 1); p.sparkle(12, 4, P.holyL, 1);
      p.px(5 + f, 5, P.white); p.px(11 - f, 11, P.astralL);
      return;
    }
    p.gradV(0, 0, 16, 16, v === 1 ? lighten(b.floor2, 0.06) : b.floor, darken(v === 1 ? b.floor2 : b.floor, 0.08));
    p.hline(0, 15, 0, P.skyL); // bright top edge
    p.vline(0, 15, 0, mix(b.floor, P.skyL, 0.4));
    // marble veining + a tiny star
    p.line(2, 12, 9, 5, withAlpha(P.cloud, 0.35)); p.line(9, 5, 14, 9, withAlpha(P.skyL, 0.3));
    p.px(12, 4, P.star); p.sparkle(12, 4, withAlpha(P.holyL, 0.7), 1);
    p.speckle(2, 2, 12, 12, withAlpha(P.cloud, 0.3), 3, v === 1 ? 97 : 47);
  },
};

// Per-biome WALL painters — CLEAN cut-stone (clear low-frequency block + light top edge,
// at most one small thematic accent) so walls read as solid structure, not busy texture.
// ENHANCED: a soft top-left light face + bottom shade for chunky volume, one accent glint.
const WALLS = {
  crypt: (p, b) => {
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.08), darken(b.wall, 0.10));
    p.hline(0, 15, 7, b.wallD); p.vline(0, 6, 8, b.wallD); p.vline(8, 15, 12, b.wallD);
    p.hline(0, 15, 0, lighten(b.wallL, 0.08)); p.hline(0, 15, 1, b.wallL); p.vline(0, 6, 0, lighten(b.wallL, 0.06)); // bright 2px lit top → reads as a raised block
    p.hline(0, 15, 15, darken(b.wallD, 0.32)); // dark base line grounds the wall above the floor
    p.px(2, 3, withAlpha(P.moss, 0.3)); // faint moss in a joint
    p.shadeBottom(0.16);
  },
  cavern: (p, b) => {
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.05), darken(b.wall, 0.08));
    p.rect(2, 3, 5, 4, darken(b.wall, 0.14)); p.rect(9, 8, 4, 4, darken(b.wall, 0.12));
    p.hline(0, 15, 0, b.wallL);
    p.px(5, 5, withAlpha(b.accent, 0.5)); p.px(11, 10, withAlpha(b.accent, 0.35)); // embedded crystal flecks
    p.shadeBottom(0.12);
  },
  frost: (p, b) => {
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.06), darken(b.wall, 0.05));
    p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, lighten(b.wallL, 0.1)); p.hline(0, 15, 1, b.wallL);
    p.px(4, 4, withAlpha(P.ice, 0.4)); p.px(11, 9, withAlpha(P.white, 0.35)); // frost glints
    p.line(3, 10, 8, 5, withAlpha(P.ice, 0.2));
    p.shadeBottom(0.12);
  },
  inferno: (p, b) => {
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.06), darken(b.wall, 0.08));
    p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL);
    p.px(4, 11, P.ember); p.px(4, 10, withAlpha(P.emberL, 0.6)); // glowing crack ember
    p.px(11, 5, withAlpha(P.ember, 0.4));
    p.shadeBottom(0.1);
  },
  void: (p, b) => {
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.05), darken(b.wall, 0.08));
    p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL);
    p.px(11, 4, P.manaL); p.px(11, 5, withAlpha(P.purpleL, 0.5)); p.px(4, 10, withAlpha(P.manaL, 0.35));
    p.shadeBottom(0.12);
  },

  // ── NEW ──
  verdant: (p, b) => { // mossy stone
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.05), darken(b.wall, 0.08));
    p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL);
    p.rect(2, 1, 6, 2, withAlpha(P.moss, 0.6)); p.rect(9, 5, 4, 2, withAlpha(P.leafD, 0.6)); // moss caps
    p.px(3, 3, P.leafL); p.px(11, 9, withAlpha(P.moss, 0.5));
    p.shadeBottom(0.12);
  },
  desert: (p, b) => { // layered sandstone
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.06), darken(b.wall, 0.06));
    p.hline(0, 15, 5, withAlpha(b.wallD, 0.7)); p.hline(0, 15, 10, withAlpha(b.wallD, 0.7)); // strata
    p.hline(0, 15, 0, b.wallL); p.hline(0, 15, 6, withAlpha(P.sandL, 0.25)); p.hline(0, 15, 11, withAlpha(P.sandL, 0.2));
    p.px(13, 3, withAlpha(P.sandL, 0.5));
    p.shadeBottom(0.1);
  },
  swamp: (p, b) => { // dripping bog stone
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.05), darken(b.wall, 0.1));
    p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL);
    p.rect(1, 0, 5, 3, withAlpha(P.slimeBog, 0.5)); p.rect(10, 0, 4, 2, withAlpha(P.bogL, 0.5)); // slime film
    p.vline(0, 6, 4, withAlpha(P.toxic, 0.3)); // drip
    p.px(12, 9, withAlpha(P.murk, 0.6));
    p.shadeBottom(0.14);
  },
  abyss: (p, b) => { // dark reef rock
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.05), darken(b.wall, 0.12));
    p.hline(0, 15, 7, b.wallD); p.hline(0, 15, 0, b.wallL);
    p.px(4, 4, P.neonL); p.px(4, 3, withAlpha(P.neon, 0.5)); // bioluminescent spot
    p.px(11, 10, withAlpha(P.oceanL, 0.5)); p.px(11, 9, withAlpha(P.neon, 0.3));
    p.shadeBottom(0.16);
  },
  celestial: (p, b) => { // astral marble
    p.gradV(0, 0, 16, 16, lighten(b.wall, 0.08), darken(b.wall, 0.05));
    p.hline(0, 15, 0, lighten(b.wallL, 0.12)); p.hline(0, 15, 1, b.wallL);
    p.line(2, 13, 9, 4, withAlpha(P.cloud, 0.4)); p.line(9, 4, 14, 9, withAlpha(P.skyL, 0.35)); // veins
    p.px(12, 3, P.star); p.px(4, 10, withAlpha(P.astralL, 0.5));
    p.shadeBottom(0.08);
  },
};

const WALLTOPS = {
  crypt: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.12), darken(b.wallD, 0.26)); p.rect(0, 0, 16, 2, b.wallL); p.rect(0, 2, 16, 1, b.wall); },
  cavern: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.12), darken(b.wallD, 0.26)); p.rect(0, 0, 16, 2, b.wallL); p.px(5, 4, b.accent); p.px(10, 5, withAlpha(b.accent, 0.5)); },
  frost: (p, b) => { p.gradV(0, 0, 16, 8, lighten(b.wallL, 0.12), darken(b.wallD, 0.18)); p.rect(0, 0, 16, 3, lighten(b.wallL, 0.12)); p.px(11, 5, withAlpha(P.white, 0.5)); },
  inferno: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.18), darken(b.wallD, 0.3)); p.rect(0, 0, 16, 2, P.ember); p.rect(0, 2, 16, 1, darken(P.ember, 0.4)); p.px(8, 1, P.emberL); },
  void: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.12), darken(b.wallD, 0.26)); p.rect(0, 0, 16, 2, P.purpleL); p.px(8, 3, withAlpha(P.manaL, 0.6)); },

  // ── NEW ──
  verdant: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.1), darken(b.wallD, 0.24)); p.rect(0, 0, 16, 2, b.wallL); p.rect(0, 0, 16, 1, withAlpha(P.moss, 0.6)); p.px(4, 1, P.leafL); p.px(11, 2, withAlpha(P.leafD, 0.6)); },
  desert: (p, b) => { p.gradV(0, 0, 16, 8, lighten(b.wallL, 0.06), darken(b.wallD, 0.16)); p.rect(0, 0, 16, 2, P.sandL); p.rect(0, 2, 16, 1, withAlpha(b.wallD, 0.6)); p.px(12, 4, withAlpha(P.sand, 0.6)); },
  swamp: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.1), darken(b.wallD, 0.26)); p.rect(0, 0, 16, 2, b.wallL); p.rect(0, 0, 16, 1, withAlpha(P.slimeBog, 0.5)); p.px(6, 2, withAlpha(P.toxic, 0.5)); },
  abyss: (p, b) => { p.gradV(0, 0, 16, 8, darken(b.wallD, 0.16), darken(b.wallD, 0.32)); p.rect(0, 0, 16, 2, b.wallL); p.px(5, 3, P.neonL); p.px(11, 4, withAlpha(P.neon, 0.5)); },
  celestial: (p, b) => { p.gradV(0, 0, 16, 8, lighten(b.wallL, 0.14), darken(b.wallD, 0.12)); p.rect(0, 0, 16, 3, lighten(b.wallL, 0.14)); p.px(8, 1, P.star); p.px(3, 4, withAlpha(P.astralL, 0.6)); },
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
