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
