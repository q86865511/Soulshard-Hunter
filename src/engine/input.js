// Keyboard + mouse + light touch input. Screen-space; scenes convert to world.

const keys = new Set();
const justDown = new Set();
const justUp = new Set();

export const mouse = {
  x: 0, y: 0,        // CSS pixels relative to canvas
  sx: 0, sy: 0,      // internal (scaled) pixels
  down: false,
  justDown: false,
  justUp: false,
  rightDown: false,
  wheel: 0,          // accumulated wheel deltaY this frame (for scrollable panels)
};

let canvasEl = null;
let scaleX = 1, scaleY = 1, scale = 1;

// Map common synonyms to canonical action keys
const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'space', Enter: 'enter', Escape: 'escape',
  ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyE: 'interact', KeyQ: 'swap', KeyR: 'reload', KeyF: 'ability', KeyP: 'pause', Tab: 'map', KeyM: 'minimap', KeyB: 'shop',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4',
};

function code(e) { return KEYMAP[e.code] || e.code; }

export function initInput(canvas, getScale) {
  canvasEl = canvas;

  window.addEventListener('keydown', (e) => {
    const k = code(e);
    if (['up','down','left','right','space','dash','pause','map'].includes(k) || e.code === 'Tab') e.preventDefault();
    if (!keys.has(k)) justDown.add(k);
    keys.add(k);
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    const k = code(e);
    keys.delete(k);
    justUp.add(k);
  });

  const updateMouse = (e) => {
    const r = canvas.getBoundingClientRect();
    const s = getScale ? getScale() : { scale: 1, x: r.width / canvas.width };
    scale = s.scale || 1;
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.sx = mouse.x / (r.width / canvas.width);
    mouse.sy = mouse.y / (r.height / canvas.height);
  };

  canvas.addEventListener('mousemove', updateMouse);
  canvas.addEventListener('mousedown', (e) => {
    updateMouse(e);
    if (e.button === 0) { mouse.down = true; mouse.justDown = true; }
    if (e.button === 2) { mouse.rightDown = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) { mouse.down = false; mouse.justUp = true; }
    if (e.button === 2) { mouse.rightDown = false; }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { mouse.wheel += e.deltaY; e.preventDefault(); }, { passive: false });

  // Basic touch -> treat as movement + fire (mobile fallback).
  canvas.addEventListener('touchstart', (e) => { updateMouse(e.touches[0]); mouse.down = true; mouse.justDown = true; }, { passive: true });
  canvas.addEventListener('touchmove', (e) => updateMouse(e.touches[0]), { passive: true });
  canvas.addEventListener('touchend', () => { mouse.down = false; mouse.justUp = true; }, { passive: true });

  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });
}

export const isDown = (k) => keys.has(k);
export const pressed = (k) => justDown.has(k);
export const released = (k) => justUp.has(k);

// Movement vector from current keys (normalized).
export function moveAxis() {
  let x = 0, y = 0;
  if (keys.has('left')) x -= 1;
  if (keys.has('right')) x += 1;
  if (keys.has('up')) y -= 1;
  if (keys.has('down')) y += 1;
  if (x && y) { const inv = 0.70710678; x *= inv; y *= inv; }
  return { x, y };
}

// Call at the very end of each frame to clear edge-triggered state.
export function endFrameInput() {
  justDown.clear();
  justUp.clear();
  mouse.justDown = false;
  mouse.justUp = false;
  mouse.wheel = 0;
}
