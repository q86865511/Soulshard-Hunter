// Content that starts LOCKED and is unlocked by achievements (A2) or guild ranks
// (5-3). Anything not listed here is always available; a listed id is only offered
// once its id is in META.unlocked[kind]. Gameplay pools (level-up weapons/abilities,
// equipment rolls, ground items and the shop) consult isUnlocked() so unlocks are
// actually meaningful. Round-5 (task 2) greatly widened this set so progression has
// teeth and there's a long unlock chain across achievements + the guild.
export const LOCKED = {
  weapons: [
    'w_homing', 'w_lightning', 'wc_turret', 'wc_beam',                 // 原#6
    'g_laserbeam', 'g_blackhole',                                      // round-5 (evolved w_soulstorm/w_inferno dropped — they never consult isUnlocked)
    'g_halo', 'g_ricochet', 'g_dartfan', 'wc_cone', 'wc_ricochet',
  ],
  abilities: [
    'bigshot', 'glasscannon', 'ac_volatile_rounds', 'ac_soul_harvest', 'ac_riposte',  // 原#6
    'overload', 'g_executioner', 'g_chainlight', 'g_detonate',         // round-5
    'ac_static_field', 'ac_warbanner', 'curse_titan', 'g_blink_master',
  ],
  equipment: [
    'cannon_staff',                                                    // 原#6
    'g_dragon_scale', 'g_machinegun', 'g_laser', 'g_sniper',           // round-5
    'ep_chromatic_core', 'ep_void_mantle', 'ep_starfall_orb', 'ep_doom_scatter', 'ep_prism_lance',
  ],
  items: [
    'it_timeslow_burst', 'it_shock_nova', 'ic_coin_cache',             // round-5 (ground-item gating)
    'g_inferno_bomb', 'g_purge_wave', 'ic_toxic_flask',
  ],
};

export function isUnlocked(meta, kind, id) {
  const locked = LOCKED[kind] || [];
  if (!locked.includes(id)) return true;
  return !!(meta && meta.unlocked && Array.isArray(meta.unlocked[kind]) && meta.unlocked[kind].includes(id));
}

// Dev cheat "解鎖全部": unlock ALL content AND every biome/difficulty (the previous version
// only touched content, leaving the levels locked). Shared by the run + hub dev panels.
import { Weapons, Abilities, Equipment, Characters, Items } from './registry.js';
import { BIOMES } from '../../art/biomes.js';
export function cheatUnlockAll(meta) {
  if (!meta) return;
  meta.unlocked = meta.unlocked || {};
  meta.unlocked.weapons = Weapons.ids();
  meta.unlocked.abilities = Abilities.ids();
  meta.unlocked.equipment = Equipment.ids();
  meta.unlocked.characters = Characters.ids();
  meta.unlocked.items = Items.ids();
  meta.levels = meta.levels || { unlocked: 1, diff: {} };
  meta.levels.unlocked = BIOMES.length;                 // every biome
  meta.levels.diff = meta.levels.diff || {};
  for (const b of BIOMES) meta.levels.diff[b.id] = 5;   // every difficulty
}
