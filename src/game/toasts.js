// Global achievement-unlock toast queue (round16/4.9-B). Pushed from anywhere
// (bankRun, future hub claims) and drawn by BOTH the hub and the run scene, so an
// unlock is visible regardless of which scene is active. Pure data — no imports
// (keeps it free of import cycles with state.js / hud.js).
const NOW = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

export const AchievementToasts = {
  _q: [],
  push(name) { if (name) this._q.push({ name: String(name), born: NOW(), until: NOW() + 4.2 }); },
  // active toasts (auto-expired), newest few only
  list() { const now = NOW(); this._q = this._q.filter((t) => t.until > now); return this._q.slice(-3); },
  now: NOW,
};
