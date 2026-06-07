// Realtime gateway for Phase 2: presence, lobby rooms, invites, and host<->guest
// message relay. Host-authoritative model — the server is a DUMB RELAY for gameplay:
// it never simulates. It only tracks who is online, who is in which room, and forwards
// `input` (guest->host) and `snap`/`runstart`/`runend` (host->guests).
//
// This class is socket-agnostic so it is unit-testable with fake clients. A "client"
// is any object with: `.cid` (unique conn id), `.user = {uid, username}`, `.send(obj)`
// (obj is JSON-serialised by the caller's adapter or here), and `.close()`.
import crypto from 'crypto';
import { friendGraph } from './social.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // unambiguous (no 0/O/1/I)
function defaultGenCode() {
  const b = crypto.randomBytes(5); let s = '';
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return s;
}

const MAX_ROOM = 3;     // 1~3 player co-op
const MAX_SPECTATORS = 4;      // extra watchers beyond the players (中途觀戰) — don't count toward MAX_ROOM
const MAX_CONNS_PER_UID = 5;   // a single account can't open unbounded sockets
const MAX_ROOMS = 5000;        // global backstop against room-spam memory growth
const FG_CACHE_MS = 1500;      // briefly cache a user's friend graph so reload-spam can't hammer the DB
const REJOIN_GRACE_MS = 20000; // hold a disconnected member's slot this long so a blip can reconnect (host or guest)

// per-connection token buckets, keyed by message class. Tight on DB- / room-touching
// control messages; generous on gameplay (input ~33Hz, snap ~18Hz * guests).
const RL = {
  db:   { cap: 6,   refill: 1 },     // hello / friends:reload (each = 3 DB queries) — ~1/s sustained, burst 6
  room: { cap: 20,  refill: 6 },     // room:* / invite — burst 20, ~6/s
  chat: { cap: 12,  refill: 3 },
  game: { cap: 300, refill: 150 },   // input / snap / runstart / runend / fx
};
const MSG_CLASS = {
  hello: 'db', 'friends:reload': 'db',
  'room:create': 'room', 'room:join': 'room', 'room:spectate': 'room', 'room:leave': 'room', 'room:ready': 'room',
  'room:build': 'room', 'room:cfg': 'room', 'room:start': 'room', invite: 'room',
  chat: 'chat',
  input: 'game', snap: 'game', runstart: 'game', runend: 'game', fx: 'game', ping: 'game',
  levelup: 'game', levelpick: 'game',   // co-op level-up menu (host->guest options, guest->host pick)
};

export class Realtime {
  constructor(pool, { genCode } = {}) {
    this.pool = pool;
    this.genCode = genCode || defaultGenCode;
    this.byUid = new Map();     // uid -> Set<client>  (presence; one user may have several tabs)
    this.byCid = new Map();     // cid -> client
    this.rooms = new Map();     // code -> room
    this.roomOf = new Map();    // cid -> code
    this.pendingRejoin = new Map();   // prevCid -> { code, uid }  in-run disconnect held for reconnect (PER-SLOT: one account may hold >1 slot)
    this.bannedUsers = new Set();     // lowercased usernames (admin moderation)
    this.bannedIps = new Set();       // banned client IPs
    this._rl = new Map();       // cid -> { [class]: {t, ts} } token buckets
    this._fg = new Map();       // uid -> { at, g } friend-graph cache
    this._now = () => Date.now();
  }

  // ---- per-connection rate limiting -----------------------------------------
  _allow(cid, cls) {
    const spec = RL[cls]; if (!spec) return true;
    let buckets = this._rl.get(cid); if (!buckets) { buckets = {}; this._rl.set(cid, buckets); }
    let b = buckets[cls]; const now = this._now();
    if (!b) { b = buckets[cls] = { t: spec.cap, ts: now }; }
    b.t = Math.min(spec.cap, b.t + (now - b.ts) / 1000 * spec.refill); b.ts = now;
    if (b.t < 1) return false;
    b.t -= 1; return true;
  }

  // ---- low-level send --------------------------------------------------------
  send(client, obj) { try { client.send(JSON.stringify(obj)); } catch (e) { /* dead socket */ } }
  sendRaw(client, raw) { try { client.send(raw); } catch (e) { /* */ } }
  sendToUid(uid, obj) { const set = this.byUid.get(String(uid)); if (set) for (const c of set) this.send(c, obj); }
  isOnline(uid) { const s = this.byUid.get(String(uid)); return !!(s && s.size); }

  // ---- connection lifecycle --------------------------------------------------
  async onConnect(client) {
    const uid = String(client.user.uid);
    let set = this.byUid.get(uid); if (!set) { set = new Set(); this.byUid.set(uid, set); }
    if (set.size >= MAX_CONNS_PER_UID) { try { client.close(); } catch (e) { /* */ } return; }   // cap sockets per account (leaked-token / abuse containment)
    this.byCid.set(client.cid, client);
    const firstTab = set.size === 0;
    set.add(client);
    this.send(client, { t: 'welcome', uid, cid: client.cid, username: client.user.username });   // cid lets the client identify itself (host detection) before a run starts
    await this.pushFriends(uid).catch(() => {});
    if (firstTab) await this.broadcastPresence(uid, true, client.user.username).catch(() => {});   // tell my friends I'm online
    this._tryRejoin(client);   // a reconnect within the grace window resumes the in-run slot (host or guest)
  }

  async onClose(client) {
    const uid = String(client.user.uid);
    const code = this.roomOf.get(client.cid);
    const room = code && this.rooms.get(code);
    if (room && room.started && !room.runEnded) this._holdForRejoin(client, room);   // in-run drop → keep the slot for a brief reconnect window
    else this.leaveRoom(client, 'disconnect');                                        // lobby / finished → release now (lobby host migration handled inside)
    this.byCid.delete(client.cid);
    this._rl.delete(client.cid);
    const set = this.byUid.get(uid);
    if (set) {
      set.delete(client);
      if (set.size === 0) { this.byUid.delete(uid); await this.broadcastPresence(uid, false, client.user.username).catch(() => {}); }
    }
  }

  // ---- friends / presence ----------------------------------------------------
  async friendGraphCached(uid) {
    const c = this._fg.get(uid);
    if (c && (this._now() - c.at) < FG_CACHE_MS) return c.g;   // absorb reload-spam without re-querying the DB
    const g = await friendGraph(this.pool, uid);
    this._fg.set(uid, { at: this._now(), g });
    return g;
  }
  async friendListWithPresence(uid) {
    const base = await this.friendGraphCached(uid);
    // shallow-copy so live presence flags don't mutate the cached graph
    const g = { friends: base.friends.map((f) => ({ ...f, online: this.isOnline(f.id) })), incoming: base.incoming, outgoing: base.outgoing };
    return g;
  }
  async pushFriends(uid) {
    if (!this.isOnline(uid)) return;
    const g = await this.friendListWithPresence(uid);
    this.sendToUid(uid, { t: 'friends', ...g });
  }
  // notify my online friends that my presence flipped
  async broadcastPresence(uid, online, username) {
    const g = await friendGraph(this.pool, uid);
    for (const f of g.friends) if (this.isOnline(f.id)) this.sendToUid(f.id, { t: 'presence', uid: String(uid), username, online });
  }
  // called by the REST friend handlers (server.js wires hooks.onFriendChange -> here)
  async onFriendChange(a, b) {
    this._fg.delete(String(a)); this._fg.delete(String(b));   // bust the cache so both parties get the fresh graph
    await this.pushFriends(a).catch(() => {}); await this.pushFriends(b).catch(() => {});
  }

  // ---- rooms (lobby) ---------------------------------------------------------
  roomPublic(room) {
    return {
      code: room.code, hostCid: room.hostCid, started: room.started, cfg: room.cfg,
      members: [...room.members.values()].map((m) => ({
        cid: m.cid, uid: m.uid, username: m.username, ready: m.ready,
        charId: m.charId, weaponId: m.weaponId, host: m.cid === room.hostCid,
        spectator: !!m.spectator, disconnected: !!m.disconnected,
      })),
    };
  }
  broadcastRoom(room) { const pub = { t: 'room:state', room: this.roomPublic(room) }; for (const m of room.members.values()) { const c = this.byCid.get(m.cid); if (c) this.send(c, pub); } }

  createRoom(client, cfg = {}) {
    if (this.rooms.size >= MAX_ROOMS) return this.send(client, { t: 'room:err', msg: '伺服器房間已滿，請稍後再試' });   // global memory backstop
    if (this.roomOf.has(client.cid)) this.leaveRoom(client, 'switch');
    let code; let tries = 0; do { code = this.genCode(); } while (this.rooms.has(code) && ++tries < 20);
    const room = {
      code, hostCid: client.cid, started: false, runEnded: false, lastRunStart: null, createdAt: this._now(),
      cfg: { biomeId: cleanBiome(cfg.biomeId), difficulty: clampDiff(cfg.difficulty) },
      members: new Map(), _seq: 0,
    };
    room.members.set(client.cid, member(client, { ready: true, charId: cfg.charId, weaponId: cfg.weaponId, seq: ++room._seq }));
    this.rooms.set(code, room);
    this.roomOf.set(client.cid, code);
    this.broadcastRoom(room);
    return room;
  }

  joinRoom(client, code) {
    code = String(code || '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return this.send(client, { t: 'room:err', msg: '房間不存在' });
    if (room.started) return this.send(client, { t: 'room:err', msg: '該房間已開始遊戲' });
    if (room.members.size >= MAX_ROOM) return this.send(client, { t: 'room:err', msg: '房間已滿（最多 ' + MAX_ROOM + ' 人）' });
    if (this.roomOf.get(client.cid) === code) { this.broadcastRoom(room); return; }
    if (this.roomOf.has(client.cid)) this.leaveRoom(client, 'switch');
    room.members.set(client.cid, member(client, { ready: false, seq: ++room._seq }));
    this.roomOf.set(client.cid, code);
    this.broadcastRoom(room);
  }

  // join an in-progress (or lobby) room as a no-avatar spectator (中途觀戰)
  spectateRoom(client, code) {
    code = String(code || '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) return this.send(client, { t: 'room:err', msg: '房間不存在' });
    const specs = [...room.members.values()].filter((m) => m.spectator).length;
    if (specs >= MAX_SPECTATORS) return this.send(client, { t: 'room:err', msg: '觀戰人數已滿' });
    if (this.roomOf.get(client.cid) === code) { this.broadcastRoom(room); return; }
    if (this.roomOf.has(client.cid)) this.leaveRoom(client, 'switch');
    room.members.set(client.cid, member(client, { ready: true, spectator: true, seq: ++room._seq }));
    this.roomOf.set(client.cid, code);
    if (room.started && !room.runEnded) {   // late join into a live run: hand it the entry + cached map; snaps then flow via relayToGuests
      this.send(client, { t: 'start', role: 'spectator', you: client.cid, hostCid: room.hostCid, room: this.roomPublic(room) });
      if (room.lastRunStart) this.sendRaw(client, room.lastRunStart);
    }
    this.broadcastRoom(room);
  }

  leaveRoom(client, reason = 'leave') {
    const code = this.roomOf.get(client.cid);
    if (!code) return;
    this.roomOf.delete(client.cid);
    this.pendingRejoin.delete(client.cid);   // only THIS socket's own held slot (per-slot keying — never a sibling tab's)
    const room = this.rooms.get(code);
    if (!room) return;
    const wasHost = room.hostCid === client.cid;
    const m = room.members.get(client.cid);
    const wasSpectator = m && m.spectator;
    room.members.delete(client.cid);
    if (room.members.size === 0) { this.rooms.delete(code); return; }
    if (wasHost) {
      if (room.runEnded) { this._closeRoom(room, 'host-left'); return; }   // run finished → clean close (also clears held rejoins)
      this._migrateHost(room, 'host-left');   // lobby OR mid-run: keep the party alive under a new host (pragmatic host transfer)
      return;
    }
    if (room.started && !room.runEnded && !wasSpectator) {   // a player dropped mid-run → host despawns the avatar
      const host = this.byCid.get(room.hostCid);
      if (host) this.send(host, { t: 'peer:left', cid: client.cid });
    }
    this.broadcastRoom(room);
  }

  // ---- host migration + reconnect grace (pragmatic host transfer) ------------
  broadcastHost(room) { for (const m of room.members.values()) { const c = this.byCid.get(m.cid); if (c) this.send(c, { t: 'room:host', hostCid: room.hostCid }); } }

  // promote the oldest still-connected player to host; the authoritative sim died with the
  // old host, so an in-progress run is ended and the party drops back to a shared lobby.
  _migrateHost(room, reason) {
    const next = [...room.members.values()].filter((m) => !m.disconnected && !m.spectator).sort((a, b) => a.seq - b.seq)[0];
    if (!next) { this._closeRoom(room, reason); return; }   // no host-capable PLAYER left (only spectators / disconnected husks) → close
    const wasStarted = room.started && !room.runEnded;
    room.hostCid = next.cid;
    room.started = false; room.runEnded = false; room.lastRunStart = null;   // the sim is gone; back to lobby
    for (const m of room.members.values()) m.ready = (m.cid === next.cid);    // fresh ready state for a restart
    for (const m of room.members.values()) { const c = this.byCid.get(m.cid); if (c) this.send(c, { t: 'host:migrated', hostCid: next.cid, reason, wasStarted }); }
    this.broadcastHost(room);
    this.broadcastRoom(room);
  }

  // an in-run socket dropped: keep its member slot for REJOIN_GRACE_MS instead of removing it
  _holdForRejoin(client, room) {
    const m = room.members.get(client.cid);
    if (!m) { this.leaveRoom(client, 'disconnect'); return; }
    m.disconnected = true; m.dcAt = this._now();
    this.roomOf.delete(client.cid);
    this.pendingRejoin.set(client.cid, { code: room.code, uid: String(client.user.uid) });   // per-slot key (prevCid), carries uid
    if (room.hostCid === client.cid) {   // host blipped — tell players to hold; the sim may resume on reconnect
      for (const mm of room.members.values()) if (!mm.disconnected) { const c = this.byCid.get(mm.cid); if (c) this.send(c, { t: 'host:waiting' }); }
    } else {                              // player blipped — host freezes the avatar, but the slot is retained
      const host = this.byCid.get(room.hostCid); if (host) this.send(host, { t: 'peer:left', cid: client.cid });
      this.broadcastRoom(room);
    }
  }

  // a fresh socket for a uid that has an in-run slot held → re-key the slot to the new socket and resume
  _tryRejoin(client) {
    const uid = String(client.user.uid);
    // find a held slot for THIS uid whose member is still disconnected (an account may hold >1 slot — match per-slot)
    let prevCid = null, pend = null;
    for (const [pc, e] of this.pendingRejoin) {
      if (e.uid !== uid) continue;
      const r = this.rooms.get(e.code); const mm = r && r.members.get(pc);
      if (r && mm && mm.disconnected) { prevCid = pc; pend = e; break; }
    }
    if (!pend) return;
    this.pendingRejoin.delete(prevCid);
    const room = this.rooms.get(pend.code);
    const m = room && room.members.get(prevCid);
    if (!room || !m || !m.disconnected) { this.send(client, { t: 'room:closed', reason: 'expired' }); return; }   // slot finalized/raced → tell the client to bail
    room.members.delete(prevCid);
    const wasHost = room.hostCid === prevCid;
    m.cid = client.cid; m.disconnected = false; m.dcAt = 0;
    room.members.set(client.cid, m);
    this.roomOf.set(client.cid, pend.code);
    if (wasHost) room.hostCid = client.cid;
    const live = !!(room.started && !room.runEnded);   // false ⇒ the run ended / host migrated to a lobby while we were gone
    // resume carries `started` so the client knows whether to resume the field or drop to the shared lobby
    this.send(client, { t: 'resume', role: m.spectator ? 'spectator' : (wasHost ? 'host' : 'guest'), you: client.cid, hostCid: room.hostCid, started: live, room: this.roomPublic(room) });
    if (live) {
      if (wasHost) {
        for (const mm of room.members.values()) if (mm.cid !== client.cid) { const c = this.byCid.get(mm.cid); if (c) this.send(c, { t: 'host:back', hostCid: client.cid }); }
        this.broadcastHost(room);
      } else if (!m.spectator) {
        const host = this.byCid.get(room.hostCid); if (host) this.send(host, { t: 'peer:rejoin', cid: client.cid, prevCid, uid });
      }
    }
    this.broadcastRoom(room);
  }

  // periodic: expire held slots whose grace ran out (called from wsgw on an interval; tests call it directly)
  sweep(now = this._now()) {
    for (const room of [...this.rooms.values()]) {
      for (const m of [...room.members.values()]) {
        if (m.disconnected && (now - m.dcAt) > REJOIN_GRACE_MS) this._finalizeDeparture(room, m);
      }
    }
  }
  _finalizeDeparture(room, m) {
    const wasHost = room.hostCid === m.cid;
    room.members.delete(m.cid);
    this.pendingRejoin.delete(m.cid);   // this husk's own held slot
    if (room.members.size === 0) { this.rooms.delete(room.code); return; }
    if (wasHost) this._migrateHost(room, 'host-left');
    else this.broadcastRoom(room);   // avatar was already frozen at hold time
  }

  // tear a room down: notify connected members, clear any held rejoin pointers into it, delete it
  _closeRoom(room, reason) {
    for (const m of room.members.values()) {
      this.pendingRejoin.delete(m.cid);
      const c = this.byCid.get(m.cid); if (c) { this.roomOf.delete(m.cid); this.send(c, { t: 'room:closed', reason }); }
    }
    this.rooms.delete(room.code);
  }

  setReady(client, ready) { const r = this.myRoom(client); if (!r) return; const m = r.members.get(client.cid); if (m) { m.ready = !!ready; this.broadcastRoom(r); } }
  setBuild(client, charId, weaponId) {
    const r = this.myRoom(client); if (!r) return; const m = r.members.get(client.cid);
    if (m) { if (typeof charId === 'string') m.charId = charId.slice(0, 40); if (typeof weaponId === 'string') m.weaponId = weaponId.slice(0, 40); this.broadcastRoom(r); }
  }
  setCfg(client, cfg) {   // host tweaks biome/difficulty in the lobby
    const r = this.myRoom(client); if (!r || r.hostCid !== client.cid) return;
    if (cfg && typeof cfg === 'object') { if ('biomeId' in cfg) r.cfg.biomeId = cleanBiome(cfg.biomeId); if ('difficulty' in cfg) r.cfg.difficulty = clampDiff(cfg.difficulty); this.broadcastRoom(r); }
  }

  startRoom(client) {
    const r = this.myRoom(client);
    if (!r) return this.send(client, { t: 'room:err', msg: '你不在房間中' });
    if (r.hostCid !== client.cid) return this.send(client, { t: 'room:err', msg: '只有房主能開始' });
    const players = [...r.members.values()].filter((m) => !m.spectator);   // spectators don't count toward the player minimum / ready gate
    if (players.length < 2) return this.send(client, { t: 'room:err', msg: '需要至少 2 名玩家才能開始連線合作' });
    for (const m of players) if (m.cid !== r.hostCid && !m.ready) return this.send(client, { t: 'room:err', msg: '尚有玩家未準備' });
    r.started = true; r.runEnded = false; r.lastRunStart = null;
    const pub = this.roomPublic(r);
    for (const m of r.members.values()) {
      const c = this.byCid.get(m.cid); if (!c) continue;
      this.send(c, { t: 'start', role: m.spectator ? 'spectator' : (m.cid === r.hostCid ? 'host' : 'guest'), you: m.cid, hostCid: r.hostCid, room: pub });
    }
  }

  invite(client, toUid) {
    const r = this.myRoom(client);
    if (!r) return this.send(client, { t: 'room:err', msg: '先建立或加入房間再邀請' });
    toUid = String(toUid);
    if (!this.isOnline(toUid)) return this.send(client, { t: 'room:err', msg: '對方目前不在線上' });
    // only invite accepted friends (avoid invite spam to strangers)
    this.assertFriend(client.user.uid, toUid).then((ok) => {
      if (!ok) return this.send(client, { t: 'room:err', msg: '只能邀請好友' });
      const r2 = this.myRoom(client);   // re-validate: the async friend check could have outlived the room (host left / disbanded)
      if (!r2 || r2.code !== r.code) return this.send(client, { t: 'room:err', msg: '房間已不存在' });
      this.sendToUid(toUid, { t: 'invite', from: { uid: String(client.user.uid), username: client.user.username }, code: r2.code, cfg: r2.cfg });
      this.send(client, { t: 'invite:sent', to: toUid });
    }).catch(() => {});
  }
  async assertFriend(a, b) { const g = await friendGraph(this.pool, a); return g.friends.some((f) => String(f.id) === String(b)); }

  // ---- gameplay relay (raw passthrough; server never parses snapshots) --------
  relayToHost(client, raw, parsed) {
    const code = this.roomOf.get(client.cid); const room = code && this.rooms.get(code);
    if (!room || !room.started || room.hostCid === client.cid) return;
    const me = room.members.get(client.cid); if (me && me.spectator) return;   // spectators never drive the host sim
    const host = this.byCid.get(room.hostCid); if (!host) return;
    // tag the sender so the host knows which avatar this input drives
    this.send(host, { ...parsed, cid: client.cid });
  }
  relayToGuests(client, raw, parsed) {
    const code = this.roomOf.get(client.cid); const room = code && this.rooms.get(code);
    if (!room || !room.started || room.hostCid !== client.cid) return;
    if (parsed.t === 'runstart') room.lastRunStart = raw;        // cache the map blob so late joiners / reconnects can be handed it
    else if (parsed.t === 'runend') { room.runEnded = true; room.lastRunStart = null; }   // run finished → a host leave now closes cleanly (not a migration)
    for (const m of room.members.values()) if (m.cid !== room.hostCid && !m.disconnected) { const c = this.byCid.get(m.cid); if (c) this.sendRaw(c, raw); }
  }
  relayChat(client, text) {
    const r = this.myRoom(client); if (!r) return;
    const msg = { t: 'chat', from: client.user.username, cid: client.cid, text: String(text || '').slice(0, 280) };
    for (const m of r.members.values()) { const c = this.byCid.get(m.cid); if (c) this.send(c, msg); }
  }

  myRoom(client) { const code = this.roomOf.get(client.cid); return code ? this.rooms.get(code) : null; }

  // ---- message dispatch ------------------------------------------------------
  async onMessage(client, raw) {
    let m; try { m = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (!this._allow(client.cid, MSG_CLASS[m.t] || 'room')) return;   // drop messages over the per-connection rate
    try {
      switch (m.t) {
        case 'hello': case 'friends:reload': await this.pushFriends(client.user.uid); break;
        case 'room:create': this.createRoom(client, m.cfg || {}); break;
        case 'room:join': this.joinRoom(client, m.code); break;
        case 'room:spectate': this.spectateRoom(client, m.code); break;
        case 'room:leave': this.leaveRoom(client, 'leave'); break;
        case 'room:ready': this.setReady(client, m.ready); break;
        case 'room:build': this.setBuild(client, m.charId, m.weaponId); break;
        case 'room:cfg': this.setCfg(client, m.cfg); break;
        case 'room:start': this.startRoom(client); break;
        case 'invite': this.invite(client, m.to); break;
        case 'chat': this.relayChat(client, m.text); break;
        case 'input': case 'levelpick': this.relayToHost(client, raw, m); break;
        case 'snap': case 'runstart': case 'runend': case 'fx': case 'levelup': this.relayToGuests(client, raw, m); break;
        case 'ping': this.send(client, { t: 'pong', ts: m.ts }); break;
        default: break;
      }
    } catch (e) { /* a malformed message must never crash the gateway */ }
  }

  stats() { return { users: this.byUid.size, conns: this.byCid.size, rooms: this.rooms.size }; }

  // ---- admin dashboard ------------------------------------------------------
  adminOverview() {
    const online = [];
    for (const [uid, set] of this.byUid) {
      const conns = [...set];
      const rooms = [...new Set(conns.map((c) => this.roomOf.get(c.cid)).filter(Boolean))];
      online.push({ uid, username: conns[0] ? conns[0].user.username : '?', conns: conns.length, rooms, ip: conns[0] ? (conns[0].ip || null) : null });
    }
    online.sort((a, b) => String(a.username).localeCompare(String(b.username)));
    const rooms = [...this.rooms.values()].map((r) => ({ ...this.roomPublic(r), runEnded: !!r.runEnded }));
    return { totals: { users: this.byUid.size, conns: this.byCid.size, rooms: this.rooms.size }, online, rooms };
  }
  kickUser(uid) {
    const set = this.byUid.get(String(uid));
    if (!set) return 0;
    let n = 0; for (const c of [...set]) { try { c.close(); n++; } catch (e) { /* */ } }
    return n;
  }
  adminCloseRoom(code) {
    const room = this.rooms.get(String(code || '').toUpperCase());
    if (!room) return false;
    this._closeRoom(room, 'admin');
    return true;
  }

  // ---- moderation (account / IP bans) + broadcast ---------------------------
  async loadBans() {
    try {
      const r = await this.pool.query('SELECT kind, value FROM bans');
      this.bannedUsers = new Set(); this.bannedIps = new Set();
      for (const b of r.rows) { if (b.kind === 'user') this.bannedUsers.add(String(b.value).toLowerCase()); else if (b.kind === 'ip') this.bannedIps.add(String(b.value)); }
    } catch (e) { /* bans table absent on very first boot (initSchema runs before buildApp in prod) */ }
  }
  isBannedUser(username) { return this.bannedUsers.has(String(username || '').toLowerCase()); }
  isBannedIp(ip) { return !!ip && this.bannedIps.has(String(ip)); }
  async ban(kind, value, reason) {
    value = kind === 'user' ? String(value || '').toLowerCase() : String(value || '');
    if (!value || (kind !== 'user' && kind !== 'ip')) return false;
    await this.pool.query('INSERT INTO bans(kind, value, reason) VALUES($1,$2,$3) ON CONFLICT (kind, value) DO UPDATE SET reason=$3', [kind, value, reason || null]);
    if (kind === 'user') { this.bannedUsers.add(value); this.kickUserByName(value); } else { this.bannedIps.add(value); this.kickByIp(value); }
    return true;
  }
  async unban(kind, value) {
    value = kind === 'user' ? String(value || '').toLowerCase() : String(value || '');
    await this.pool.query('DELETE FROM bans WHERE kind=$1 AND value=$2', [kind, value]);
    if (kind === 'user') this.bannedUsers.delete(value); else this.bannedIps.delete(value);
    return true;
  }
  async listBans() { const r = await this.pool.query('SELECT kind, value, reason, created_at FROM bans ORDER BY created_at DESC'); return r.rows; }
  kickUserByName(nameLower) { let n = 0; for (const c of this.byCid.values()) if (String(c.user.username).toLowerCase() === nameLower) { try { c.close(); n++; } catch (e) { /* */ } } return n; }
  kickByIp(ip) { let n = 0; for (const c of this.byCid.values()) if (c.ip === ip) { try { c.close(); n++; } catch (e) { /* */ } } return n; }
  broadcast(text) { const msg = { t: 'broadcast', text: String(text || '').slice(0, 280) }; for (const c of this.byCid.values()) this.send(c, msg); return this.byCid.size; }
}

// ---- helpers ----------------------------------------------------------------
function clampDiff(d) { d = Math.floor(Number(d) || 1); return Math.max(1, Math.min(5, d)); }
function cleanBiome(b) { return typeof b === 'string' && b ? b.slice(0, 40) : null; }   // bound the only free-form cfg field (validated like charId/weaponId/chat)
function member(client, extra = {}) {
  return { cid: client.cid, uid: String(client.user.uid), username: client.user.username, ready: false, charId: null, weaponId: null, spectator: false, disconnected: false, dcAt: 0, seq: 0, ...extra };
}
