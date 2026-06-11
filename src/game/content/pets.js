// R18/B10 — 迷你寵物 (mini pets). Purely cosmetic followers: no stats, no combat. The
// equipped pet (META.pet) trails the LOCAL player with a critically-damped lerp + idle bob,
// in town AND in-run. Rendered for the local avatar only → snapshot/protocol unchanged
// (a known co-op limitation, per the spec).
import { BIOMES } from '../../art/biomes.js';

function allBiomesCleared(meta) {
  const diff = (meta.levels && meta.levels.diff) || {};
  return BIOMES.every((b) => (diff[b.id] || 0) >= 1);
}

export const PETS = [
  { id: 'pet_slime', name: '史萊姆寶寶', sprite: 'pet_slime', hint: '累計擊殺 10000 名敵人',
    cond: (m) => (m.stats.kills || 0) >= 10000 },
  { id: 'pet_ghostcat', name: '幽靈小貓', sprite: 'pet_ghostcat', hint: '通關全 10 個生態',
    cond: (m) => allBiomesCleared(m) },
  { id: 'pet_imp', name: '小小妖', sprite: 'pet_imp', hint: '隱藏', req: 'devEgg',
    cond: (m) => !!(m.flags && m.flags.devEgg) },
];

export function petById(id) { return PETS.find((p) => p.id === id) || null; }
export function petUnlocked(meta, p) { try { return !!p && p.cond(meta); } catch (e) { return false; } }
export function ownedPetCount(meta) { return PETS.filter((p) => petUnlocked(meta, p)).length; }

// Drive a follower state {x,y,t,bob} toward (tx,ty), trailing ~18px behind the facing.
// Pure math; the caller renders with the sprite. dt-scaled critically-damped lerp.
export function updatePetFollow(st, tx, ty, faceX, dt) {
  if (st.x == null) { st.x = tx; st.y = ty; }
  const behind = 18 * (faceX < 0 ? 1 : -1);
  const gx = tx + behind, gy = ty + 4;
  const k = Math.min(1, 8 * dt);
  st.x += (gx - st.x) * k; st.y += (gy - st.y) * k;
  st.t = (st.t || 0) + dt;
  st.bob = Math.sin(st.t * 5) * 1.5;
}
