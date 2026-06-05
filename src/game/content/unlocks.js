// Content that starts LOCKED and is unlocked by achievements (A2). Anything not
// listed here is always available; a listed id is only offered once its id is in
// META.unlocked[kind]. Gameplay pools (level-up weapons/abilities, equipment rolls
// and the shop) consult isUnlocked() so achievement unlocks are actually meaningful.
export const LOCKED = {
  weapons: ['w_homing', 'w_lightning', 'wc_turret', 'wc_beam'],                       // 原#6: more achievement-gated weapons
  abilities: ['bigshot', 'glasscannon', 'ac_volatile_rounds', 'ac_soul_harvest', 'ac_riposte'],  // 原#6: gate the strong new passives
  equipment: ['cannon_staff'],
};

export function isUnlocked(meta, kind, id) {
  const locked = LOCKED[kind] || [];
  if (!locked.includes(id)) return true;
  return !!(meta && meta.unlocked && Array.isArray(meta.unlocked[kind]) && meta.unlocked[kind].includes(id));
}
