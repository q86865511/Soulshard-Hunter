// R26/B1 — ground-DECAL channel. A render-only, high-density scatter of FLAT
// ground marks (cracks / scorch / moss / pebbles) that maps.js samples onto FLOOR
// tiles. Kept SEPARATE from decor: decals never collide, never gate the sim, and
// carry no gameplay. Pools start EMPTY per biome — workflow-generated gen art
// self-registers via registerDecals(), so until that art ships this is a pure
// no-op (generateWorld skips an empty pool → identical rng stream, zero change).
export const DECAL_SETS = {
  crypt: [], cavern: [], frost: [], inferno: [], void: [],
  verdant: [], desert: [], swamp: [], abyss: [], celestial: [],
};

// Append sprite name(s) to a biome's decal pool (de-duped). Called by gen art
// files at module load so re-integration can add decals without editing this file.
export function registerDecals(biomeId, names) {
  const pool = DECAL_SETS[biomeId] || (DECAL_SETS[biomeId] = []);
  for (const n of (Array.isArray(names) ? names : [names])) if (n && !pool.includes(n)) pool.push(n);
  return pool;
}

// ── R28/W2-D — biome IDENTITY registries (ART_SPEC §6) ─────────────────────
// LANDMARK_SETS[biome] = ordered list of large (≥3×3 tile) landmark sprite names.
// maps.js places entry [0] inside the opening viewport and entry [1] a short walk
// away. Landmark sprites are named `lmk_*` — world.js keys its wider cull box off
// that prefix, and the prefix survives the co-op map wire format (which carries
// decor sprite names but drops every other decor field).
// AMBIENT_SETS[biome] = the biome's signature ANIMATED decor (its "environment
// motion"); maps.js scatters a handful per map.
// Both start EMPTY: a biome with no entry keeps the pre-R28 placement path exactly.
export const LANDMARK_SETS = {};
export const AMBIENT_SETS = {};
export function registerLandmarks(biomeId, names) {
  const pool = LANDMARK_SETS[biomeId] || (LANDMARK_SETS[biomeId] = []);
  for (const n of (Array.isArray(names) ? names : [names])) if (n && !pool.includes(n)) pool.push(n);
  return pool;
}
export function registerAmbient(biomeId, names) {
  const pool = AMBIENT_SETS[biomeId] || (AMBIENT_SETS[biomeId] = []);
  for (const n of (Array.isArray(names) ? names : [names])) if (n && !pool.includes(n)) pool.push(n);
  return pool;
}
