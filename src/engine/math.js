// Math & utility helpers for the game engine.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b - a === 0 ? 0 : (v - a) / (b - a));
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
export const approach = (v, target, step) => {
  if (v < target) return Math.min(v + step, target);
  if (v > target) return Math.max(v - step, target);
  return v;
};

export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
export const angleBetween = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
export const lenAngle = (a, len) => ({ x: Math.cos(a) * len, y: Math.sin(a) * len });

export const normalize = (x, y) => {
  const m = Math.hypot(x, y) || 1;
  return { x: x / m, y: y / m };
};

// Axis-aligned bounding box overlap (cx,cy = center, hw,hh = half extents)
export const aabb = (ax, ay, ahw, ahh, bx, by, bhw, bhh) =>
  Math.abs(ax - bx) < ahw + bhw && Math.abs(ay - by) < ahh + bhh;

export const circleHit = (ax, ay, ar, bx, by, br) => dist2(ax, ay, bx, by) < (ar + br) * (ar + br);

// Seedable PRNG (mulberry32) — deterministic runs/floors.
export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)), // inclusive
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    shuffle: (arr) => {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    // weighted pick: items = [{w, ...}], returns one item
    weighted: (items, weightFn = (x) => x.w ?? 1) => {
      let total = 0;
      for (const it of items) total += weightFn(it);
      let r = next() * total;
      for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
      return items[items.length - 1];
    },
  };
}

// A convenient global rng using Math.random for non-deterministic UI bits.
export const rng = {
  next: Math.random,
  range: (lo, hi) => lo + Math.random() * (hi - lo),
  int: (lo, hi) => Math.floor(lo + Math.random() * (hi - lo + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  shuffle: (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a2[i], a2[j]] = [a2[j], a2[i]];
    }
    return a2;
  },
  weighted: (items, weightFn = (x) => x.w ?? 1) => {
    let total = 0;
    for (const it of items) total += weightFn(it);
    let r = Math.random() * total;
    for (const it of items) { r -= weightFn(it); if (r <= 0) return it; }
    return items[items.length - 1];
  },
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
