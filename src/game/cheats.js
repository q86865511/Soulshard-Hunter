// Hidden developer cheat mode (F2 / 原#10). Toggled by entering the Konami code
// (↑↑↓↓←→←→ B A); then an in-run dev panel exposes godmode / time-warp / spawn /
// gold / unlock-all / force-clear. Deliberately obscure so normal players won't
// stumble into it. Also reachable from the console via window.__CHEATS.
export const Cheats = { enabled: false, godmode: false, fast: false, toast: 0 };

const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let buf = [];

export function initCheats() {
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', (e) => {
    buf.push(e.code);
    if (buf.length > SEQ.length) buf.shift();
    if (buf.length === SEQ.length && SEQ.every((k, i) => k === buf[i])) {
      Cheats.enabled = !Cheats.enabled;
      Cheats.toast = 2.5;
      buf = [];
    }
  });
  window.__CHEATS = Cheats;   // console access: __CHEATS.enabled = true
}
