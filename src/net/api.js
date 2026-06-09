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

// WebSocket base for the realtime co-op gateway (Phase 2). Derived from apiBase:
// http->ws, https->wss; '' (same-origin prod) -> location.origin with ws(s).
export function wsBase() {
  let b = apiBase();
  if (!b) { try { b = location.origin; } catch (e) { b = 'http://localhost:8787'; } }
  return b.replace(/^http/, 'ws');
}

let token = null, user = null, saveTimer = null;

// Stable per-browser session id for the "playing now" heartbeat (round16/7.3).
// Persisted so reloads don't spawn a new live-player row; survives logout (guest reuse).
let _sid = null;
export function clientSid() {
  if (_sid) return _sid;
  try { _sid = localStorage.getItem('soulshard.sid'); } catch (e) { /* */ }
  if (!_sid) {
    _sid = 's' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem('soulshard.sid', _sid); } catch (e) { /* */ }
  }
  return _sid;
}

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
  isAdmin: () => !!(tokenAlive(token) && user && user.admin),
  authToken: () => (tokenAlive(token) ? token : null),   // rt.js needs the raw JWT for the ws URL
  apiBase,
  wsBase,
  health() { return req('/health'); },
  // ---- friends (Phase 2 social layer) ----
  friends() { return req('/friends', { authed: true }); },
  addFriend(username) { return req('/friends/request', { method: 'POST', authed: true, body: { username } }); },
  acceptFriend(id) { return req('/friends/accept', { method: 'POST', authed: true, body: { id } }); },
  declineFriend(id) { return req('/friends/decline', { method: 'POST', authed: true, body: { id } }); },
  removeFriend(id) { return req('/friends/remove', { method: 'POST', authed: true, body: { id } }); },
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
  postGuestRun(run) { return req('/runs/guest', { method: 'POST', body: run }); },   // 訪客模式: no token, body carries a self-entered name
  leaderboard(params = {}) {
    const clean = {}; for (const k in params) if (params[k] != null && params[k] !== '') clean[k] = params[k];
    const qs = new URLSearchParams(clean).toString();
    return req('/leaderboard' + (qs ? '?' + qs : ''));
  },
  // refresh the cached user (incl. admin flag) for a returning session
  async refreshMe() { const d = await req('/me', { authed: true }); if (d && d.user) { user = { ...(user || {}), ...d.user }; try { localStorage.setItem(LS_USER, JSON.stringify(user)); } catch (e) { /* */ } } return d; },
  // ---- admin dashboard (ADMIN_USERS allowlist; 403 otherwise) ----
  adminOverview() { return req('/admin/overview', { authed: true }); },
  adminKick(uid) { return req('/admin/kick', { method: 'POST', authed: true, body: { uid } }); },
  adminCloseRoom(code) { return req('/admin/close-room', { method: 'POST', authed: true, body: { code } }); },
  adminBans() { return req('/admin/bans', { authed: true }); },
  adminBan(kind, value, reason) { return req('/admin/ban', { method: 'POST', authed: true, body: { kind, value, reason } }); },
  adminUnban(kind, value) { return req('/admin/unban', { method: 'POST', authed: true, body: { kind, value } }); },
  adminBroadcast(text) { return req('/admin/broadcast', { method: 'POST', authed: true, body: { text } }); },
  adminRuns(limit) { return req('/admin/runs' + (limit ? '?limit=' + limit : ''), { authed: true }); },
  adminDeleteRun(id) { return req('/admin/delete-run', { method: 'POST', authed: true, body: { id } }); },
  // ---- round16/7.1 player feedback ----
  submitFeedback(category, content, name, image) { return req('/feedback', { method: 'POST', authed: tokenAlive(token), body: { category, content, name, image: image || undefined } }); },
  adminFeedback(params = {}) { const qs = new URLSearchParams(params).toString(); return req('/admin/feedback' + (qs ? '?' + qs : ''), { authed: true }); },
  adminUpdateFeedback(id, patch) { return req('/admin/feedback/' + id, { method: 'PATCH', authed: true, body: patch }); },
  // ---- round16/7.6-7.8 admin (audit log / stats / player inspect) ----
  adminLogs(params = {}) { const qs = new URLSearchParams(params).toString(); return req('/admin/logs' + (qs ? '?' + qs : ''), { authed: true }); },
  adminStats() { return req('/admin/stats', { authed: true }); },
  adminPlayer(uid) { return req('/admin/player/' + uid, { authed: true }); },
  // ---- round16/7.3 "playing now" heartbeat (offline-first: swallow errors) ----
  pingPlaying(info = {}) { return req('/presence/play', { method: 'POST', authed: tokenAlive(token), body: { ...info, sid: clientSid() } }).catch(() => {}); },
  stopPlayingBeat() { return req('/presence/stop', { method: 'POST', body: { sid: clientSid() } }).catch(() => {}); },
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
