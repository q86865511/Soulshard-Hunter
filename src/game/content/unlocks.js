// Content that starts LOCKED and is unlocked by achievements (A2). Anything not
// listed here is always available; a listed id is only offered once its id is in
// META.unlocked[kind]. Gameplay pools (level-up weapons/abilities, equipment rolls
// and the shop) consult isUnlocked() so achievement unlocks are actually meaningful.
export const LOCKED = {
  weapons: ['w_homing', 'w_lightning'],
  abilities: ['bigshot', 'glasscannon'],
  equipment: ['cannon_staff'],
};

export function isUnlocked(meta, kind, id) {
  const locked = LOCKED[kind] || [];
  if (!locked.includes(id)) return true;
  return !!(meta && meta.unlocked && Array.isArray(meta.unlocked[kind]) && meta.unlocked[kind].includes(id));
}
