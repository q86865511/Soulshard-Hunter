// R18/B4 — biome enemy affinity. The swarm director (run.js rotateTypes / evSurround)
// multiplies each candidate enemy's spawn weight by biomeWeight(): enemies TAGGED to the
// current biome are boosted, enemies tagged to OTHER biomes are damped (but never to 0, so
// no threat band ever empties the pool), and UNTAGGED enemies (slimes/bats/wisps + all the
// s_*/s2_* special monsters) stay global at weight x1. An enemy may belong to several biomes.
// Hand-written (must live OUTSIDE gen/ — re-integration clobbers gen/).
import { BALANCE } from '../balance.js';

// enemyId -> [biomeId, ...]   (verified against __DBG.enemyIds(); ~28/39 mobs tagged)
export const ENEMY_BIOMES = {
  // crypt — undead host (mummies also fit the desert tombs → cross-tagged)
  g_skeleton: ['crypt', 'desert'], g_bonearcher: ['crypt', 'desert'], g_ghoul: ['crypt', 'desert'],
  g_necromancer: ['crypt', 'void'], g_wraith: ['crypt', 'void'], g_deathknight: ['crypt', 'void'],
  // cavern — spiders & crystal
  g_spider: ['cavern'], g_crystalcrab: ['cavern', 'abyss'], g_crystalsentry: ['cavern'], g_crystalgolem: ['cavern', 'frost'],
  // frost — ice (cold-water & sky-birds bleed into abyss/celestial)
  g_frostwisp: ['frost'], g_frostbat: ['frost', 'celestial'], g_iciclewisp: ['frost', 'abyss'],
  g_glacierslime: ['frost', 'abyss'], g_frostwolf: ['frost'], g_snowraven: ['frost', 'celestial'], g_frostlord: ['frost'],
  // inferno — ember/lava
  g_emberslime: ['inferno'], g_infernobrute: ['inferno'],
  // verdant — beasts & spores
  g_wolf: ['verdant'], g_boar: ['verdant'], g_venommoth: ['verdant', 'swamp'],
  // desert — scorpion (+ shared mummies above)
  g_scorpion: ['desert'],
  // swamp — toads & toxins
  g_toad: ['swamp'], g_venombrute: ['swamp'],
  // celestial — storm/sky
  g_stormwisp: ['celestial'],
  // R18/B4 new biome mobs
  vr_thornling: ['verdant'], ds_duneburrower: ['desert'], sw_mireleech: ['swamp'],
  ab_voltjelly: ['abyss'], ce_cherubim: ['celestial'],
  // (untagged & global on purpose: slime/bat/wisp/brute + every s_*/s2_* special monster)
};

// spawn-weight multiplier for `def` in `biomeId`. Untagged = global (x1).
export function biomeWeight(def, biomeId) {
  const tags = ENEMY_BIOMES[def.id];
  if (!tags || !biomeId) return 1;
  return tags.includes(biomeId) ? BALANCE.BIOME_AFFINITY_BOOST : BALANCE.BIOME_FOREIGN_DAMP;
}
