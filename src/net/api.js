// Thin client for the Soulshard cloud backend (Phase 1 of docs/MULTIPLAYER_PLAN.md).
// OFFLINE-FIRST: if the player isn't logged in (or the server is unreachable),
// every call no-ops/throws quietly and the game keeps using localStorage. Nothing
// here blocks boot or gameplay.
//
// API base resolution:
//   1. localStorage 'soulshard.api' override (handy for testing / non-standard ports), else
//   2. dev (frontend on any localhost port except the API's own 8787) -> http://localhost:8787
//   3. production (served same-origin) -> '' (requests hit /api/... ; a reverse
//      proxy such as Caddy forwards them to the Node server).

const LS_TOKEN = 'soulshard.jwt';
const LS_USER = 'soulshard.user';

export function apiBase() {
  let o = null;
  try { o = localStorage.getItem('soulshard.api'); } catch (e) { /* */ }
  if (o) return o.replace(/\/+$/, '');
  if (typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.port !== '8787') {
    return 'http://localhost:8787';
  }
  return '';
}

let token = null, user = null, saveTimer = null;

// Is the JWT present AND not expired? (decode the exp claim without a library)
function tokenAlive(t) {
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !p.exp || p.exp * 1000 > Date.now();
  } catch (e) { return false; }
}

try {
  token = localStorage.getItem(LS_TOKEN);
  user = JSON.parse(localStorage.getItem(LS_USER) || 'null');
} catch (e) { /* */ }

function setSession(t, u) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }   // never let a queued save land on a different account
  token = t || null; user = u || null;
  try {
    if (t) localStorage.setItem(LS_TOKEN, t); else localStorage.removeItem(LS_TOKEN);
    if (u) localStorage.setItem(LS_USER, JSON.stringify(u)); else localStorage.removeItem(LS_USER);
  } catch (e) { /* */ }
}

// drop a stale/expired token at boot before any UI reads the login state
if (token && !tokenAlive(token)) setSession(null, null);

async function req(path, { method = 'GET', body, authed = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (authed && token) headers.authorization = 'Bearer ' + token;
  const res = await fetch(apiBase() + '/api' + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || ('HTTP ' + res.status));
    err.status = res.status; err.data = data;
    if (res.status === 401) { setSession(null, null); if (Net.onSessionExpired) try { Net.onSessionExpired(); } catch (e) {} }
    throw err;
  }
  return data;
}

export const Net = {
  onSessionExpired: null,   // ui.js sets this to flip the bar + toast on a 401
  isLoggedIn: () => tokenAlive(token),
  currentUser: () => user,
  apiBase,
  health() { return req('/health'); },
  async register(username, password, email) {
    const d = await req('/register', { method: 'POST', body: { username, password, email: email || undefined } });
    setSession(d.token, d.user); return d;
  },
  async login(username, password) {
    const d = await req('/login', { method: 'POST', body: { username, password } });
    setSession(d.token, d.user); return d;
  },
  logout() { setSession(null, null); },
  getSave() { return req('/save', { authed: true }); },
  putSave(meta, saveVersion) { return req('/save', { method: 'PUT', authed: true, body: { meta, saveVersion } }); },
  postRun(run) { return req('/runs', { method: 'POST', authed: true, body: run }); },
  leaderboard(params = {}) {
    const clean = {}; for (const k in params) if (params[k] != null && params[k] !== '') clean[k] = params[k];
    const qs = new URLSearchParams(clean).toString();
    return req('/leaderboard' + (qs ? '?' + qs : ''));
  },
};

// Debounced best-effort cloud-save push (called from state.saveMeta()).
export function queueCloudSave(getMeta, saveVersion) {
  if (!tokenAlive(token)) return;
  if (saveTimer) clearTimeout(saveTimer);
  const t = token;   // bind to the account that scheduled this save
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (token !== t) return;   // session changed before the flush → drop it
    Net.putSave(getMeta(), saveVersion).catch(() => { /* offline / transient — local save still holds */ });
  }, 2500);
}

// Best-effort leaderboard upload (called from state.bankRun()).
export function postRunResult(run) {
  if (!tokenAlive(token)) return;
  Net.postRun(run).catch(() => { /* offline — score simply isn't uploaded */ });
}
