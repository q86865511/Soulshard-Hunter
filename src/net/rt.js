// Realtime client for the Phase 2 co-op layer. A thin WebSocket connection manager
// + event bus over the server's /rt gateway. OFFLINE-FIRST: does nothing unless the
// player is logged in; never blocks boot or single-player. Auto-reconnects while
// logged in (so presence/friends stay live), with backoff.
//
// Incoming server messages are re-emitted verbatim by their `t` field, so the social
// UI and the co-op scenes just subscribe to the message types they care about:
//   friends · presence · room:state · room:closed · room:err · invite · start
//   input (host) · snap / runstart / runend / peer:left (guest) · chat
import { Net, wsBase } from './api.js';

const RECONNECT_MS = [800, 1500, 3000, 5000, 8000];   // backoff schedule

class RtClient {
  constructor() {
    this.ws = null;
    this.want = false;          // do we want to be connected? (logged in)
    this.tries = 0;
    this.selfCid = null;
    this.room = null;           // latest room:state.room
    this.inRun = false;         // true while a co-op run scene (host run.js or guest coop.js) is live — gates reconnect routing
    this.friends = []; this.incoming = []; this.outgoing = [];
    this.listeners = new Map(); // type -> Set<cb>
    this._timer = null;
  }

  // ---- event bus -------------------------------------------------------------
  on(type, cb) { let s = this.listeners.get(type); if (!s) { s = new Set(); this.listeners.set(type, s); } s.add(cb); return () => this.off(type, cb); }
  off(type, cb) { const s = this.listeners.get(type); if (s) s.delete(cb); }
  emit(type, msg) { const s = this.listeners.get(type); if (s) for (const cb of [...s]) { try { cb(msg); } catch (e) { if (typeof console !== 'undefined') console.error('[RT.emit ' + type + ']', e); } } }

  // ---- connection ------------------------------------------------------------
  isConnected() { return !!(this.ws && this.ws.readyState === 1); }
  isOnline() { return this.isConnected(); }

  ensure() {   // connect if logged in and not already connected
    if (!Net.isLoggedIn()) { this.close(); return; }
    this.want = true;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this._open();
  }

  _open() {
    const token = Net.authToken();
    if (!token) return;
    let ws;
    try { ws = new WebSocket(wsBase() + '/rt?token=' + encodeURIComponent(token)); }
    catch (e) { this._scheduleReconnect(); return; }
    this.ws = ws;
    ws.addEventListener('open', () => { this.tries = 0; this.emit('rt:open', {}); });
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      this._ingest(m);
      this.emit(m.t, m);
    });
    ws.addEventListener('close', () => { this.ws = null; this.emit('rt:close', {}); if (this.want && Net.isLoggedIn()) this._scheduleReconnect(); });
    ws.addEventListener('error', () => { try { ws.close(); } catch (e) { /* */ } });
  }

  _scheduleReconnect() {
    if (this._timer) return;
    const d = RECONNECT_MS[Math.min(this.tries, RECONNECT_MS.length - 1)]; this.tries++;
    this._timer = setTimeout(() => { this._timer = null; if (this.want && Net.isLoggedIn()) this._open(); }, d);
  }

  close() {
    this.want = false;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this.ws) { try { this.ws.close(); } catch (e) { /* */ } this.ws = null; }
    this.room = null; this.selfCid = null; this.friends = []; this.incoming = []; this.outgoing = [];
  }

  // keep local mirror of the bits the UI polls
  _ingest(m) {
    if (m.t === 'welcome') { this.uid = m.uid; this.selfCid = m.cid; }   // know our own conn id up-front (host detection in the lobby)
    else if (m.t === 'friends') { this.friends = m.friends || []; this.incoming = m.incoming || []; this.outgoing = m.outgoing || []; }
    else if (m.t === 'presence') { const f = this.friends.find((x) => String(x.id) === String(m.uid)); if (f) f.online = m.online; }
    else if (m.t === 'room:state') this.room = m.room;
    else if (m.t === 'room:closed') this.room = null;
    else if (m.t === 'start') { this.selfCid = m.you; if (m.room) this.room = m.room; }
    else if (m.t === 'resume') { this.selfCid = m.you; if (m.room) this.room = m.room; }   // reconnected into a held in-run slot (new cid)
    else if (m.t === 'room:host') { if (this.room) this.room.hostCid = m.hostCid; }          // host migrated/reconnected
  }

  // ---- outgoing --------------------------------------------------------------
  send(obj) { if (this.isConnected()) { try { this.ws.send(JSON.stringify(obj)); return true; } catch (e) { /* */ } } return false; }
  reloadFriends() { this.send({ t: 'friends:reload' }); }
  createRoom(cfg) { this.send({ t: 'room:create', cfg: cfg || {} }); }
  joinRoom(code) { this.send({ t: 'room:join', code }); }
  spectateRoom(code) { this.send({ t: 'room:spectate', code }); }   // 中途觀戰: watch a live (or lobby) room with no avatar
  leaveRoom() { this.send({ t: 'room:leave' }); this.room = null; }
  setReady(ready) { this.send({ t: 'room:ready', ready: !!ready }); }
  setBuild(charId, weaponId) { this.send({ t: 'room:build', charId, weaponId }); }
  setCfg(cfg) { this.send({ t: 'room:cfg', cfg }); }
  startRun() { this.send({ t: 'room:start' }); }
  invite(uid) { this.send({ t: 'invite', to: uid }); }
  chat(text) { this.send({ t: 'chat', text }); }
  // gameplay
  input(frame) { this.send({ t: 'input', ...frame }); }
  snap(obj) { return this.send({ t: 'snap', ...obj }); }
  runStart(obj) { this.send({ t: 'runstart', ...obj }); }
  runEnd(obj) { this.send({ t: 'runend', ...obj }); }
}

export const RT = new RtClient();
