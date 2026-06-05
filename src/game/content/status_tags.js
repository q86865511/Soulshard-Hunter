// Maps enemy/boss ids to the status they inflict on the PLAYER on hit (D6).
// Looked up at Enemy construction time so it works regardless of when the
// fault-isolated gen content finishes registering. An id that doesn't exist
// is simply never matched — harmless.
//
// These values are tuned for being inflicted ON THE PLAYER: chance-gated and
// gentler than the player's own offensive versions, so contact doesn't snowball
// into an unrecoverable slow/DoT death-spiral. Spec D6: "avoid stacking too lethal".
const SLOW = { type: 'slow', mult: 0.72, dur: 0.6, chance: 0.5 };   // round-6: shorter than the 0.7s hit i-frame so swarm contact can't pin the player permanently
const POISON = { type: 'poison', dps: 4, dur: 3, chance: 0.5 };
const BURN = { type: 'burn', dps: 5, dur: 2, chance: 0.5 };
// bosses: a bit stronger DoT and more reliable
const B_SLOW = { type: 'slow', mult: 0.65, dur: 0.8, chance: 0.7 };   // round-6: shorter so it can't stack into a permanent pin
const B_POISON = { type: 'poison', dps: 6, dur: 3.5, chance: 0.7 };
const B_BURN = { type: 'burn', dps: 7, dur: 2.5, chance: 0.7 };

export const ENEMY_STATUS = {
  // frost / ice themes -> slow
  g_frostwisp: SLOW, g_iciclewisp: SLOW, g_frostwolf: SLOW, g_glacierslime: SLOW, g_frostbat: SLOW,
  g_crystalcrab: SLOW, g_snowraven: SLOW, g_frostlord: SLOW, g_crystalgolem: SLOW, g_crystalsentry: SLOW, g_stormwisp: SLOW,
  // venom / plague themes -> poison
  g_venommoth: POISON, g_scorpion: POISON, g_toad: POISON, g_spitter: POISON, s_spitter: POISON,
  g_venombrute: POISON, g_spider: POISON, s_sapper: POISON,
  // ember / inferno themes -> burn
  g_emberslime: BURN, g_infernobrute: BURN,
  // bosses inflict their themed DoT/slow (hard CC comes from phase shifts)
  b2_glacierseer: B_SLOW, b2_emberlord: B_BURN, g_plagueheart: B_POISON, b2_voidweaver: B_SLOW,
  g_stormtyrant: B_SLOW, g_frostmonarch: B_SLOW, g_magmacolossus: B_BURN, g_voidsovereign: B_POISON,
};
