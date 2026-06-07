// Keyboard + mouse + light touch input. Screen-space; scenes convert to world.

const keys = new Set();
const justDown = new Set();
const justUp = new Set();

export const mouse = {
  x: 0, y: 0,        // CSS pixels relative to canvas
  down: false,
  justDown: false,
  justUp: false,
  rightDown: false,
  wheel: 0,          // accumulated wheel deltaY this frame (for scrollable panels)
};

let canvasEl = null;

// Map common synonyms to canonical action keys
const DEFAULT_KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'space', Enter: 'enter', Escape: 'escape',
  ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyE: 'interact', KeyQ: 'swap', KeyR: 'reload', KeyF: 'ability', KeyP: 'pause', Tab: 'build', KeyM: 'minimap', KeyB: 'shop',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4',
};
let KEYMAP = { ...DEFAULT_KEYMAP };

// Actions the player may rebind from Settings (movement stays WASD+arrows). A binding in
// META.settings.keybinds (action -> physical code) is applied over the defaults at boot.
export const REBINDABLE = [
  { action: 'dash', label: '衝刺' }, { action: 'interact', label: '互動 / 拾取' },
  { action: 'ability', label: '主動技能' }, { action: 'pause', label: '暫停選單' },
  { action: 'build', label: '查看 Build' }, { action: 'minimap', label: '小地圖' },
  { action: 'shop', label: '商店' }, { action: 'swap', label: '切換武器' },
];
// rebuild KEYMAP = defaults + per-action overrides (an override replaces ALL default codes for that action)
export function applyKeybinds(overrides) {
  KEYMAP = { ...DEFAULT_KEYMAP };
  if (overrides && typeof overrides === 'object') {
    for (const action in overrides) {
      const codeStr = overrides[action];
      if (!codeStr) continue;
      for (const c of Object.keys(KEYMAP)) if (KEYMAP[c] === action) delete KEYMAP[c];
      KEYMAP[codeStr] = action;
    }
  }
}
export function currentKeyFor(action) { for (const c of Object.keys(KEYMAP)) if (KEYMAP[c] === action) return c; return null; }
export function keyLabel(codeStr) {
  if (!codeStr) return '—';
  const m = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: '空白', ShiftLeft: 'Shift', ShiftRight: 'Shift', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab' };
  return m[codeStr] || String(codeStr).replace(/^Key/, '').replace(/^Digit/, '');
}

let captureCb = null;
export function captureNextKey(cb) { captureCb = cb; }   // grab the next raw e.code (for rebinding)

function code(e) { return KEYMAP[e.code] || e.code; }

// Is the keystroke aimed at a DOM text field (login/register inputs, leaderboard name…)?
// When so we must NOT preventDefault or register it as a game key — otherwise WASD/Space
// never reach the <input> (and instead drive the hidden game behind the overlay).
function typingInField(e) {
  const t = e && e.target;
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable === true;
}

export function initInput(canvas, getScale) {
  canvasEl = canvas;

  window.addEventListener('keydown', (e) => {
    if (typingInField(e)) return;   // let the focused DOM field receive the key untouched
    if (captureCb) { const cb = captureCb; captureCb = null; e.preventDefault(); if (e.code !== 'Escape') cb(e.code); return; }   // rebind capture (Esc cancels)
    const k = code(e);
    if (['up','down','left','right','space','dash','pause','build'].includes(k) || e.code === 'Tab') e.preventDefault();
    if (!keys.has(k)) justDown.add(k);
    keys.add(k);
  }, { passive: false });

  window.addEventListener('keyup', (e) => {
    if (typingInField(e)) return;   // mirror the keydown guard so a field keyup never leaks into the game
    const k = code(e);
    keys.delete(k);
    justUp.add(k);
  });

  const updateMouse = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
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
