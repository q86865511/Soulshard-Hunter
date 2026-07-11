// P1-3 telemetry — privacy-friendly product analytics: BATCHED, ANONYMOUS, OPT-OUT,
// OFFLINE no-op. Six whitelisted event names only; no account id, no player input is ever
// recorded. Every transmit is best-effort (`.catch(()=>{})`) so a missing/unreachable
// backend can never throw, spam the console, or block gameplay.
//
// Imports are function-scoped at use time (never at module eval) so the state.js ↔
// telemetry.js circular import resolves cleanly — `META` is only read inside Tele.ev.
import { META } from '../game/state.js';
import { clientSid, apiBase } from './api.js';
import { GAME_VERSION } from '../game/content/patchnotes.js';

// The ONLY names that are ever queued/sent. Anything else is silently ignored — the
// whitelist is enforced client-side too so a stray call can't leak an ad-hoc event.
const WHITELIST = new Set(['save_created', 'tutorial_step', 'run_started', 'level_choice', 'run_ended', 'unlock_seen']);
const FLUSH_AT = 20;        // queue length that forces an immediate flush
const FLUSH_MS = 15000;     // idle-flush timer (armed by the FIRST queued event)
const QUEUE_MAX = 200;      // hard cap — a long offline session drops the OLDEST beyond this
const SEND_MAX = 50;        // events per POST (a flush sends at most one batch)
const STR_MAX = 40;         // per-string clamp (whitelist spirit on the client)
const ARR_MAX = 24;         // per-array clamp

let queue = [];
let timer = null;
let sent = 0, dropped = 0;

// Shallow-copy props, clamping strings/arrays and dropping nested objects. Numbers /
// booleans / null pass through untouched.
function sanitize(props) {
  const out = {};
  if (!props || typeof props !== 'object') return out;
  for (const k in props) {
    let v = props[k];
    if (typeof v === 'string') { if (v.length > STR_MAX) v = v.slice(0, STR_MAX); }
    else if (Array.isArray(v)) { v = v.slice(0, ARR_MAX).map((x) => (typeof x === 'string' && x.length > STR_MAX ? x.slice(0, STR_MAX) : x)); }
    else if (v != null && typeof v === 'object') continue;   // drop nested structures
    out[k] = v;
  }
  return out;
}

function analyticsOff() {
  try { return !!(META && META.settings && META.settings.analytics === false); } catch (e) { return false; }
}

function scheduleFlush() {
  if (timer) return;
  try { timer = setTimeout(() => { timer = null; flush(); }, FLUSH_MS); } catch (e) { timer = null; }
}

// Best-effort POST (no Authorization header — anonymous). Never throws; failures are
// dropped, never retried. `beacon` uses sendBeacon (page-hide path), else fetch keepalive.
function post(events, beacon) {
  if (!events.length) return;
  let url;
  try { url = apiBase() + '/api/metrics'; } catch (e) { url = '/api/metrics'; }
  let sid = '';
  try { sid = clientSid(); } catch (e) { /* */ }
  const json = JSON.stringify({ sid, v: GAME_VERSION, events });
  try {
    if (beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const ok = navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }));
      if (ok) { sent += events.length; return; }
      // sendBeacon refused (payload too big / disabled) → fall through to fetch keepalive
    }
    if (typeof fetch === 'function') {
      fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: json, keepalive: true })
        .then(() => { sent += events.length; })
        .catch(() => { /* offline / no backend — silently drop */ });
    }
  } catch (e) { /* never let telemetry surface an error */ }
}

// Drain up to one batch from the head of the queue.
function flush() {
  if (timer) { try { clearTimeout(timer); } catch (e) { /* */ } timer = null; }
  if (!queue.length) return;
  const batch = queue.slice(0, SEND_MAX);
  queue = queue.slice(batch.length);
  post(batch, false);
}

// Page-hide / tab-hidden: flush the residual queue with sendBeacon so it isn't lost.
function flushBeacon() {
  if (!queue.length) return;
  if (analyticsOff()) { queue = []; return; }
  const batch = queue.slice(0, SEND_MAX);
  queue = queue.slice(batch.length);
  post(batch, true);
}

export const Tele = {
  // Queue one whitelisted event. No-op when the name isn't whitelisted or analytics is
  // opted out. Never throws.
  ev(name, props) {
    try {
      if (!WHITELIST.has(name)) return;
      if (analyticsOff()) return;
      queue.push({ n: name, p: sanitize(props), t: Date.now() });
      if (queue.length > QUEUE_MAX) { const over = queue.length - QUEUE_MAX; queue.splice(0, over); dropped += over; }
      if (queue.length >= FLUSH_AT) flush();
      else scheduleFlush();
    } catch (e) { /* telemetry must never break a caller */ }
  },
  // Manual flush (called once after run_ended). Best-effort.
  flush() { try { flush(); } catch (e) { /* */ } },
  // Read-only window for tests/debugging — never mutate through this.
  _debug() { return { queued: queue.length, names: queue.map((e) => e.n), sent, dropped, off: analyticsOff() }; },
};

if (typeof window !== 'undefined') {
  try {
    window.addEventListener('pagehide', flushBeacon);
    window.addEventListener('visibilitychange', () => { try { if (document.visibilityState === 'hidden') flushBeacon(); } catch (e) { /* */ } });
  } catch (e) { /* */ }
}
