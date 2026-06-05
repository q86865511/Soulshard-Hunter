// Fixed-timestep game loop with a render callback.
export function startLoop({ update, render, fixed = 1 / 60, maxFrame = 0.2 }) {
  let last = performance.now() / 1000;
  let acc = 0;
  let running = true;
  let raf = 0;

  function frame(nowMs) {
    if (!running) return;
    // FAULT ISOLATION: a single uncaught throw in update/render must NOT kill the rAF
    // chain forever. Catch, record, resync the clock, and keep ticking so a transient
    // one-frame glitch self-recovers (mirrors the content layer's per-callback guards).
    try {
      const now = nowMs / 1000;
      let dt = now - last;
      last = now;
      if (dt > maxFrame) dt = maxFrame; // avoid spiral of death after tab switch
      acc += dt;
      let steps = 0;
      while (acc >= fixed) {
        update(fixed);
        acc -= fixed;
        if (++steps >= 6) { acc = 0; break; }
      }
      render(dt, acc / fixed);
    } catch (e) {
      window.__GAME_ERROR__ = (e && (e.stack || e.message)) || String(e);
      console.error('[loop] frame error (recovering)', e);
      last = nowMs / 1000; acc = 0;   // resync so recovery isn't a huge dt spike
    }
    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);

  return {
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
