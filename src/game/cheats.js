// Hidden developer cheat mode (F2 / 原#10). Toggled by entering the Konami code
// (↑↑↓↓←→←→ B A); then an in-run dev panel exposes godmode / time-warp / spawn /
// gold / unlock-all / force-clear. Deliberately obscure so normal players won't
// stumble into it. Also reachable from the console via window.__CHEATS.
// `eatShop` (task 1): the Konami code ends in ...←→ B A, but KeyB also opens the
// in-run shop. When the B keypress arrives AS PART of the code, we flag it so the
// run scene swallows that one shop toggle instead of popping the shop mid-cheat.
export const Cheats = { enabled: false, godmode: false, fast: false, toast: 0, eatShop: false };

const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
const PREFIX_B = SEQ.slice(0, 9);   // ↑↑↓↓←→←→B — the tail that must precede the swallowed B
let buf = [];

// does the END of buf equal `need`?
const tailMatches = (need) => buf.length >= need.length && need.every((k, i) => k === buf[buf.length - need.length + i]);

export function initCheats() {
  if (typeof window === 'undefined') return;
  window.addEventListener('keydown', (e) => {
    Cheats.eatShop = false;   // reset every keypress; re-armed below only for an in-sequence B
    buf.push(e.code);
    if (buf.length > SEQ.length) buf.shift();
    // arm the swallow only when THIS B completes the ↑↑↓↓←→←→B prefix
    if (e.code === 'KeyB' && tailMatches(PREFIX_B)) Cheats.eatShop = true;
    if (buf.length === SEQ.length && SEQ.every((k, i) => k === buf[i])) {
      Cheats.enabled = !Cheats.enabled;
      Cheats.toast = 2.5;
      buf = [];
    }
  });
  window.__CHEATS = Cheats;   // console access: __CHEATS.enabled = true
}
