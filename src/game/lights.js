// R26/B1 — local light-emitter table for the in-run scene glow channel.
// Maps a decor sprite name → a soft additive ground light-pool that world.draw()
// blits (cached radial gradient + sin flicker) AFTER decor, BEFORE actors, so
// torches / braziers / crystals / lamps cast a pool instead of reading as flat
// props. Render-only: no gameplay, protocol-neutral (decor is host/local decor).
// Fields: r/oy in world px (oy lifts the pool off the anchored base toward the
// glowing part), color hex, a = base additive alpha, flicker 0..1 = alpha wobble
// amplitude, speed = wobble rad/s. Non-emissive decor is simply absent → no glow.
import { P } from '../engine/palette.js';

export const LIGHT_BY_SPRITE = {
  // ── universal ──
  torch:               { r: 42, color: P.ember,   a: 0.34, oy: 4,  flicker: 0.35, speed: 8 },
  // ── pre-existing single decor (biomes.js) ──
  dec_crystal:         { r: 30, color: P.shard,   a: 0.24, oy: 6,  flicker: 0.12, speed: 3 },
  dec_ice:             { r: 26, color: P.ice,     a: 0.18, oy: 5,  flicker: 0.10, speed: 2.4 },
  dec_lava:            { r: 34, color: P.emberL,  a: 0.30, oy: 3,  flicker: 0.28, speed: 6 },
  dec_voidcrystal:     { r: 30, color: P.purpleL, a: 0.26, oy: 6,  flicker: 0.16, speed: 3.2 },
  // ── crypt ──
  bd_crypt_candles:    { r: 30, color: P.ember,   a: 0.30, oy: 8,  flicker: 0.34, speed: 7 },
  // ── cavern ──
  bd_cav_cluster:      { r: 30, color: P.shard,   a: 0.24, oy: 8,  flicker: 0.12, speed: 2.6 },
  bd_cav_mushroom:     { r: 24, color: P.toxic,   a: 0.22, oy: 5,  flicker: 0.16, speed: 3.4 },
  // ── frost (subtle cool sheen) ──
  bd_frost_pillar:     { r: 26, color: P.ice,     a: 0.16, oy: 9,  flicker: 0.10, speed: 2.2 },
  bd_frost_spikes:     { r: 20, color: P.ice,     a: 0.14, oy: 5,  flicker: 0.10, speed: 2.2 },
  // ── inferno ──
  bd_inf_brazier:      { r: 40, color: P.ember,   a: 0.34, oy: 8,  flicker: 0.34, speed: 8 },
  bd_inf_obsidian:     { r: 22, color: P.ember,   a: 0.20, oy: 6,  flicker: 0.22, speed: 5 },
  // ── void ──
  bd_void_monolith:    { r: 30, color: P.astral,  a: 0.24, oy: 10, flicker: 0.14, speed: 2.6 },
  bd_void_rune:        { r: 28, color: P.astralL, a: 0.26, oy: 6,  flicker: 0.18, speed: 3.4 },
  bd_void_shards:      { r: 22, color: P.astral,  a: 0.20, oy: 6,  flicker: 0.14, speed: 3 },
  // ── verdant (bright biome — keep pools warm + faint or they read as fog) ──
  bd_verdant_flowers:  { r: 18, color: P.gold,    a: 0.12, oy: 4,  flicker: 0.16, speed: 3 },
  bd_verdant_fireflies:{ r: 18, color: P.gold,    a: 0.16, oy: 6,  flicker: 0.40, speed: 5 },
  // ── desert ──
  bd_desert_pylon:     { r: 28, color: P.neon,    a: 0.24, oy: 9,  flicker: 0.16, speed: 3.2 },
  // ── swamp ──
  bd_swamp_bubbles:    { r: 24, color: P.toxic,   a: 0.22, oy: 4,  flicker: 0.20, speed: 3.6 },
  bd_swamp_lily:       { r: 20, color: P.sakura,  a: 0.18, oy: 3,  flicker: 0.14, speed: 2.8 },
  // ── abyss ──
  bd_abyss_vent:       { r: 32, color: P.ember,   a: 0.28, oy: 7,  flicker: 0.26, speed: 5 },
  bd_abyss_anglerfish: { r: 24, color: P.aurora,  a: 0.24, oy: 5,  flicker: 0.22, speed: 4 },
  bd_abyss_kelp:       { r: 22, color: P.aurora,  a: 0.18, oy: 9,  flicker: 0.16, speed: 3 },
  // ── celestial ──
  bd_cel_star:         { r: 30, color: P.holyL,   a: 0.30, oy: 5,  flicker: 0.24, speed: 4 },
  bd_cel_crystal:      { r: 28, color: P.astral,  a: 0.24, oy: 7,  flicker: 0.16, speed: 3 },
  bd_cel_pillar:       { r: 30, color: P.holy,    a: 0.26, oy: 10, flicker: 0.14, speed: 2.6 },
};
