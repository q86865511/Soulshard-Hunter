// Minimal scene manager. A scene is an object with optional
// enter(payload)/update(dt)/render(alpha)/exit()/onResize() methods.
let active = null;
let pending = null;

export function setScene(scene, payload = {}) {
  // defer the swap to the next update to avoid mutating mid-frame
  pending = { scene, payload };
}

export function applyPending() {
  if (!pending) return;
  const { scene, payload } = pending;
  pending = null;
  if (active && active.exit) active.exit();
  active = scene;
  if (active && active.enter) active.enter(payload);
}

export function getScene() { return active; }
export function updateActive(dt) { applyPending(); if (active && active.update) active.update(dt); }
export function renderActive(alpha) { if (active && active.render) active.render(alpha); }
