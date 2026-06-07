// Smoke test for the Phase 2 social + realtime layer:
//   - friend REST (request / mutual-accept / list / remove, + error paths) via app.inject()
//   - the Realtime gateway logic (presence, rooms/lobby, invites, host<->guest relay)
//     driven directly with fake in-memory clients (no real sockets).
// In-memory pool interprets the exact queries social.js / server.js issue. No Postgres.
process.env.SOULSHARD_NO_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret';
const { buildApp } = await import('../src/server.js');
const { Realtime } = await import('../src/realtime.js');

// ---- in-memory pool (users + friendships + the auth queries) ----
function makeSocialPool() {
  const users = [];                 // { id, username, email, password_hash }
  const edges = [];                 // { user_id, friend_id, status }
  let uid = 0;
  const findEdge = (a, b) => edges.find((e) => String(e.user_id) === String(a) && String(e.friend_id) === String(b));
  return {
    _users: users, _edges: edges,
    async query(sql, args = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      // --- auth / users ---
      if (s.startsWith('INSERT INTO users')) {
        const [username, email, hash] = args;
        if (users.some((u) => u.username === username)) { const e = new Error('dup'); e.code = '23505'; throw e; }
        const u = { id: ++uid, username, email, password_hash: hash }; users.push(u);
        return { rows: [{ id: u.id, username: u.username }], rowCount: 1 };
      }
      if (s.startsWith('SELECT id, username, password_hash FROM users')) {
        const u = users.find((x) => x.username === args[0]); return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
      }
      if (s.startsWith('SELECT id, username FROM users WHERE username')) {
        const u = users.find((x) => x.username === args[0]); return { rows: u ? [{ id: u.id, username: u.username }] : [], rowCount: u ? 1 : 0 };
      }
      if (s.startsWith('UPDATE users SET last_login')) return { rows: [], rowCount: 1 };
      // --- friendships ---
      if (s.startsWith('SELECT status FROM friendships')) {
        const e = findEdge(args[0], args[1]); return { rows: e ? [{ status: e.status }] : [], rowCount: e ? 1 : 0 };
      }
      if (s.startsWith('SELECT u.id, u.username FROM friendships')) {
        const accepted = s.includes("'accepted'");
        const byFriend = s.includes('ON u.id = f.user_id');   // incoming: join on requester
        let rows;
        if (byFriend) rows = edges.filter((e) => String(e.friend_id) === String(args[0]) && e.status === 'pending').map((e) => uobj(e.user_id));
        else rows = edges.filter((e) => String(e.user_id) === String(args[0]) && e.status === (accepted ? 'accepted' : 'pending')).map((e) => uobj(e.friend_id));
        return { rows: rows.filter(Boolean), rowCount: rows.length };
      }
      if (s.startsWith('INSERT INTO friendships')) {
        const [a, b] = args; const status = s.includes("'accepted'") ? 'accepted' : 'pending';
        const ex = findEdge(a, b);
        if (ex) { if (s.includes('DO UPDATE')) ex.status = status; }      // ON CONFLICT DO UPDATE / DO NOTHING
        else edges.push({ user_id: a, friend_id: b, status });
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('UPDATE friendships SET')) {
        const e = findEdge(args[0], args[1]); if (e) e.status = 'accepted';
        return { rows: [], rowCount: e ? 1 : 0 };
      }
      if (s.startsWith('DELETE FROM friendships')) {
        const [a, b] = args;
        for (let i = edges.length - 1; i >= 0; i--) { const e = edges[i]; if ((String(e.user_id) === String(a) && String(e.friend_id) === String(b)) || (String(e.user_id) === String(b) && String(e.friend_id) === String(a))) edges.splice(i, 1); }
        return { rows: [], rowCount: 1 };
      }
      throw new Error('unhandled query: ' + s.slice(0, 90));
    },
  };
  function uobj(id) { const u = users.find((x) => String(x.id) === String(id)); return u ? { id: u.id, username: u.username } : null; }
}

// ---- assert harness ----
let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  ✓ ' + label); } else { fail++; console.error('  ✗ ' + label); } }
const flush = () => new Promise((r) => setTimeout(r, 5));

console.log('Soulshard social + realtime smoke test');

const pool = makeSocialPool();
const app = await buildApp(pool, { rateMax: 100000 });
const J = (method, url, payload, token) => app.inject({ method, url, headers: token ? { authorization: 'Bearer ' + token } : {}, payload });
const reg = async (name) => (await J('POST', '/api/register', { username: name, password: 'hunter123' })).json().token;

// ===== Friend REST =====
const tokA = await reg('alice'); const tokB = await reg('bob'); const tokC = await reg('carol');

ok((await J('POST', '/api/friends/request', { username: 'nobody' }, tokA)).statusCode === 404, 'request unknown user → 404');
ok((await J('POST', '/api/friends/request', { username: 'alice' }, tokA)).statusCode === 400, 'request self → 400');

let r = await J('POST', '/api/friends/request', { username: 'bob' }, tokA);
ok(r.statusCode === 200 && r.json().status === 'pending', 'alice → bob request pending');

r = await J('GET', '/api/friends', undefined, tokB);
ok(r.json().incoming.length === 1 && r.json().incoming[0].username === 'alice', 'bob sees incoming request from alice');
r = await J('GET', '/api/friends', undefined, tokA);
ok(r.json().outgoing.length === 1 && r.json().outgoing[0].username === 'bob', 'alice sees outgoing request to bob');

// bob accepts
const bobId = JSON.parse(Buffer.from((tokB.split('.')[1]), 'base64url').toString()).uid;
const aliceId = JSON.parse(Buffer.from((tokA.split('.')[1]), 'base64url').toString()).uid;
r = await J('POST', '/api/friends/accept', { id: aliceId }, tokB);
ok(r.statusCode === 200, 'bob accepts alice');
r = await J('GET', '/api/friends', undefined, tokA);
ok(r.json().friends.length === 1 && r.json().friends[0].username === 'bob', 'alice now friends with bob');
r = await J('GET', '/api/friends', undefined, tokB);
ok(r.json().friends.length === 1 && r.json().friends[0].username === 'alice', 'bob now friends with alice (symmetric)');

// mutual auto-accept: carol requests alice, then alice requests carol → instantly friends
await J('POST', '/api/friends/request', { username: 'alice' }, tokC);
r = await J('POST', '/api/friends/request', { username: 'carol' }, tokA);
ok(r.json().status === 'accepted', 'alice requesting carol (who already asked) auto-accepts');
r = await J('GET', '/api/friends', undefined, tokA);
ok(r.json().friends.length === 2, 'alice has 2 friends');

// remove
const carolId = JSON.parse(Buffer.from((tokC.split('.')[1]), 'base64url').toString()).uid;
await J('POST', '/api/friends/remove', { id: carolId }, tokA);
r = await J('GET', '/api/friends', undefined, tokA);
ok(r.json().friends.length === 1, 'after remove, alice has 1 friend');
r = await J('GET', '/api/friends', undefined, tokC);
ok(r.json().friends.length === 0, 'remove is symmetric (carol has 0)');

// ===== Realtime gateway (fake clients) =====
const rt = new Realtime(pool, { genCode: (() => { let n = 0; const codes = ['ROOM01', 'ROOM02', 'ROOM03']; return () => codes[n++] || ('X' + n); })() });
let cid = 0;
const mkClient = (uid, username) => ({ cid: 'c' + (++cid), user: { uid: String(uid), username }, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() { this.closed = true; } });
const last = (c, t) => [...c.sent].reverse().find((m) => m.t === t);

const A = mkClient(aliceId, 'alice'); const B = mkClient(bobId, 'bob'); const C = mkClient(carolId, 'carol');
await rt.onConnect(A);
ok(last(A, 'welcome') && last(A, 'friends'), 'connect → welcome + friends snapshot');
const af = last(A, 'friends'); ok(af.friends.some((f) => f.username === 'bob' && f.online === false), 'alice friends list shows bob offline');

await rt.onConnect(B);
await flush();
ok(last(A, 'presence') && last(A, 'presence').online === true, 'bob connecting notifies alice (presence online)');
const af2 = last(A, 'friends'); // pushFriends not re-sent to A on B connect; presence covers it

// rooms
await rt.onMessage(A, JSON.stringify({ t: 'room:create', cfg: { difficulty: 3, biomeId: 'crypt' } }));
const rs = last(A, 'room:state'); ok(rs && rs.room.code === 'ROOM01' && rs.room.hostCid === A.cid, 'alice creates room ROOM01 as host');
ok(rs.room.cfg.difficulty === 3 && rs.room.cfg.biomeId === 'crypt', 'room carries cfg');

await rt.onMessage(B, JSON.stringify({ t: 'room:join', code: 'ROOM01' }));
ok(last(B, 'room:state').room.members.length === 2, 'bob joins → 2 members');
ok(last(A, 'room:state').room.members.length === 2, 'alice sees bob join');

// start gating: bob not ready
await rt.onMessage(A, JSON.stringify({ t: 'room:start' }));
ok(last(A, 'room:err'), 'cannot start while a guest is unready');
await rt.onMessage(B, JSON.stringify({ t: 'room:ready', ready: true }));
await rt.onMessage(B, JSON.stringify({ t: 'room:build', charId: 'hunter', weaponId: 'w_soulbolt' }));
ok(last(A, 'room:state').room.members.find((m) => m.cid === B.cid).ready === true, 'bob ready propagates to host');

await rt.onMessage(A, JSON.stringify({ t: 'room:start' }));
const sA = last(A, 'start'); const sB = last(B, 'start');
ok(sA && sA.role === 'host' && sB && sB.role === 'guest', 'host start → host/guest start messages');
ok(sB.hostCid === A.cid && sB.you === B.cid, 'guest knows host cid + its own cid');

// gameplay relay
B.sent.length = 0; A.sent.length = 0;
await rt.onMessage(B, JSON.stringify({ t: 'input', seq: 1, mv: [1, 0], dash: false }));
ok(last(A, 'input') && last(A, 'input').cid === B.cid && last(A, 'input').mv[0] === 1, 'guest input relays to host tagged with cid');
await rt.onMessage(A, JSON.stringify({ t: 'snap', f: 42, e: [] }));
ok(last(B, 'snap') && last(B, 'snap').f === 42, 'host snapshot relays to guest');
// a guest must NOT be able to push snapshots
B.sent.length = 0; A.sent.length = 0;
await rt.onMessage(B, JSON.stringify({ t: 'snap', f: 99 }));
ok(!last(A, 'snap'), 'guest snapshot is ignored (only host broadcasts)');

// invites: only friends, only online
await rt.onConnect(C); await flush();
await rt.onMessage(A, JSON.stringify({ t: 'invite', to: carolId }));   // alice+carol not friends anymore
await flush();   // assertFriend() resolves on a microtask after the friendGraph query
ok(last(A, 'room:err'), 'inviting a non-friend is rejected');
// re-friend carol, then invite works
rt.pool._edges.push({ user_id: aliceId, friend_id: carolId, status: 'accepted' }, { user_id: carolId, friend_id: aliceId, status: 'accepted' });
await rt.onMessage(A, JSON.stringify({ t: 'invite', to: carolId }));
await flush();
ok(last(C, 'invite') && last(C, 'invite').code === 'ROOM01', 'invite delivered to online friend with room code');

// ===== rate limiting + connection cap (QA hardening) =====
const D = mkClient(bobId, 'bob'); await rt.onConnect(D);
D.sent.length = 0;
for (let i = 0; i < 20; i++) await rt.onMessage(D, JSON.stringify({ t: 'friends:reload' }));   // db class cap = 6
const friendPushes = D.sent.filter((m) => m.t === 'friends').length;
ok(friendPushes > 0 && friendPushes <= 6, `db-class flood is rate-limited (${friendPushes} friends pushes of 20 reloads, cap 6)`);

const caps = []; for (let i = 0; i < 6; i++) { const c = mkClient(carolId, 'carol'); caps.push(c); await rt.onConnect(c); }
ok(caps[5].closed === true, '6th concurrent socket for one account is rejected (cap 5)');
ok(!rt.byCid.has(caps[5].cid), 'rejected socket is not registered');

// ===== Phase 2.5: spectator + reconnect grace + host migration =====
// state here: ROOM01 is started, A = host, B = guest, C = carol (connected, not in a room)

// --- 中途觀戰: a spectator joins a live run ---
C.sent.length = 0;
await rt.onMessage(C, JSON.stringify({ t: 'room:spectate', code: 'ROOM01' }));
const cStart = last(C, 'start');
ok(cStart && cStart.role === 'spectator' && cStart.you === C.cid, 'spectator joins a live run → spectator start');
ok(rt.rooms.get('ROOM01').members.get(C.cid).spectator === true, 'spectator recorded as non-player');
A.sent.length = 0; C.sent.length = 0;
await rt.onMessage(A, JSON.stringify({ t: 'runstart', map: { tw: 1 } }));   // host emits the map once
ok(rt.rooms.get('ROOM01').lastRunStart, 'server caches the runstart map blob for late joiners');
await rt.onMessage(A, JSON.stringify({ t: 'snap', f: 7 }));
ok(last(C, 'snap') && last(C, 'snap').f === 7, 'spectator receives host snapshots');

// --- 局中斷線重連: a player blips and reconnects within the grace window ---
A.sent.length = 0;
await rt.onClose(B);
ok(rt.rooms.get('ROOM01').members.get(B.cid).disconnected === true, 'dropped player slot is HELD, not removed');
ok(last(A, 'peer:left') && last(A, 'peer:left').cid === B.cid, 'host told to freeze the dropped avatar');
ok(rt.pendingRejoin.has(B.cid), 'dropped player queued for rejoin (held by slot cid)');
const B2 = mkClient(bobId, 'bob');
await rt.onConnect(B2);
ok(last(B2, 'resume') && last(B2, 'resume').role === 'guest' && last(B2, 'resume').you === B2.cid, 'reconnecting player gets a resume with its new cid');
ok(last(A, 'peer:rejoin') && last(A, 'peer:rejoin').cid === B2.cid && last(A, 'peer:rejoin').prevCid === B.cid, 'host told to re-attach the avatar under the new cid');
ok(rt.rooms.get('ROOM01').members.has(B2.cid) && !rt.rooms.get('ROOM01').members.has(B.cid), 'slot re-keyed to the new socket');
ok(!rt.pendingRejoin.has(String(bobId)), 'rejoin consumed');

// --- 房主重連: the host blips, players hold, host reconnects, broadcast resumes ---
B2.sent.length = 0;
await rt.onClose(A);
ok(last(B2, 'host:waiting'), 'host blip → players told to hold');
ok(rt.rooms.has('ROOM01'), 'room is NOT closed during the host grace window');
ok(rt.pendingRejoin.has(A.cid), 'host queued for rejoin (held by slot cid)');
const A2 = mkClient(aliceId, 'alice');
await rt.onConnect(A2);
ok(last(A2, 'resume') && last(A2, 'resume').role === 'host', 'reconnecting host gets a host resume');
ok(rt.rooms.get('ROOM01').hostCid === A2.cid, 'host cid re-bound to the new socket');
ok(last(B2, 'host:back'), 'players told the host is back');
B2.sent.length = 0;
await rt.onMessage(A2, JSON.stringify({ t: 'snap', f: 11 }));
ok(last(B2, 'snap') && last(B2, 'snap').f === 11, 'host snapshots flow again from the new socket');

// --- 房主轉移 (務實版): host truly leaves mid-run → migrate, room survives, party to a shared lobby ---
B2.sent.length = 0;
await rt.onClose(A2);                  // host drops again...
rt._now = () => Date.now() + 999999;   // ...and never comes back: jump past the grace window
rt.sweep();
rt._now = () => Date.now();
ok(rt.rooms.has('ROOM01'), 'room SURVIVES the host leaving (pragmatic host transfer)');
ok(rt.rooms.get('ROOM01').hostCid === B2.cid, 'a remaining player is promoted to host');
const mig = last(B2, 'host:migrated');
ok(mig && mig.hostCid === B2.cid && mig.wasStarted === true, 'new host told it inherited a mid-run room (→ back to lobby)');
ok(rt.rooms.get('ROOM01').started === false, 'the in-progress run ends on migration (sim died with the old host)');

// --- host migration in the LOBBY (before any run) closes nothing either ---
const E = mkClient(aliceId, 'alice'); const F = mkClient(bobId, 'bob');
await rt.onConnect(E); await rt.onConnect(F);
await rt.onMessage(E, JSON.stringify({ t: 'room:create', cfg: {} }));   // ROOM02
await rt.onMessage(F, JSON.stringify({ t: 'room:join', code: 'ROOM02' }));
F.sent.length = 0;
await rt.onClose(E);   // lobby host leaves
ok(rt.rooms.has('ROOM02'), 'lobby room survives the host leaving');
ok(rt.rooms.get('ROOM02').hostCid === F.cid && (last(F, 'host:migrated') || {}).wasStarted === false, 'lobby host migrates to the remaining member (stays in lobby)');

// ===== regression (review fixes) — fresh gateway for clean isolation =====
const rt2 = new Realtime(pool, { genCode: (() => { let n = 0; const codes = ['RG01', 'RG02', 'RG03']; return () => codes[n++] || ('Y' + n); })() });
let cid2 = 0;
const mk2 = (uid, name) => ({ cid: 'r' + (++cid2), user: { uid: String(uid), username: name }, sent: [], send(s) { this.sent.push(JSON.parse(s)); }, close() { this.closed = true; } });

// --- per-slot rejoin: one ACCOUNT holding two in-run slots (the self-coop two-tabs case) ---
const H = mk2(aliceId, 'alice'); const T1 = mk2(bobId, 'bob'); const T2 = mk2(bobId, 'bob');
await rt2.onConnect(H); await rt2.onConnect(T1); await rt2.onConnect(T2);
await rt2.onMessage(H, JSON.stringify({ t: 'room:create', cfg: {} }));
await rt2.onMessage(T1, JSON.stringify({ t: 'room:join', code: 'RG01' }));
await rt2.onMessage(T2, JSON.stringify({ t: 'room:join', code: 'RG01' }));
await rt2.onMessage(T1, JSON.stringify({ t: 'room:ready', ready: true }));
await rt2.onMessage(T2, JSON.stringify({ t: 'room:ready', ready: true }));
await rt2.onMessage(H, JSON.stringify({ t: 'room:start' }));
await rt2.onClose(T1); await rt2.onClose(T2);
ok(rt2.pendingRejoin.size === 2, 'both same-account in-run slots are held INDEPENDENTLY (per-slot keying, not overwritten)');
ok([...rt2.rooms.get('RG01').members.values()].filter((m) => m.disconnected).length === 2, 'both slots disconnected, neither removed');
const T1b = mk2(bobId, 'bob'); const T2b = mk2(bobId, 'bob');
await rt2.onConnect(T1b); await rt2.onConnect(T2b);
const rg = rt2.rooms.get('RG01');
ok(last(T1b, 'resume') && last(T2b, 'resume'), 'both reconnecting tabs each get a resume');
ok(rg.members.has(T1b.cid) && rg.members.has(T2b.cid) && !rg.members.has(T1.cid) && !rg.members.has(T2.cid), 'each tab reclaims a DISTINCT slot (re-keyed to new sockets)');
ok(rt2.pendingRejoin.size === 0 && [...rg.members.values()].filter((m) => m.disconnected).length === 0, 'no orphaned husk left behind');

// --- host leaves with only a spectator remaining → room closes (no spectator-as-host) ---
const H2 = mk2(aliceId, 'alice'); const P2 = mk2(bobId, 'bob'); const S2 = mk2(carolId, 'carol');
await rt2.onConnect(H2); await rt2.onConnect(P2); await rt2.onConnect(S2);
await rt2.onMessage(H2, JSON.stringify({ t: 'room:create', cfg: {} }));
await rt2.onMessage(P2, JSON.stringify({ t: 'room:join', code: 'RG02' }));
await rt2.onMessage(P2, JSON.stringify({ t: 'room:ready', ready: true }));
await rt2.onMessage(S2, JSON.stringify({ t: 'room:spectate', code: 'RG02' }));
await rt2.onMessage(H2, JSON.stringify({ t: 'room:start' }));
await rt2.onMessage(P2, JSON.stringify({ t: 'room:leave' }));   // the only other player leaves
S2.sent.length = 0;
await rt2.onMessage(H2, JSON.stringify({ t: 'room:leave' }));   // host leaves → only a spectator left
ok(!rt2.rooms.has('RG02'), 'room with only a spectator is CLOSED (spectator never promoted to host)');
ok(last(S2, 'room:closed'), 'the remaining spectator is told the room closed');

// --- guest held through a host migration → resume routes it to the lobby, not a dead field ---
const H3 = mk2(aliceId, 'alice'); const G3 = mk2(bobId, 'bob'); const W3 = mk2(carolId, 'carol');
await rt2.onConnect(H3); await rt2.onConnect(G3); await rt2.onConnect(W3);
await rt2.onMessage(H3, JSON.stringify({ t: 'room:create', cfg: {} }));
await rt2.onMessage(G3, JSON.stringify({ t: 'room:join', code: 'RG03' }));
await rt2.onMessage(W3, JSON.stringify({ t: 'room:join', code: 'RG03' }));
await rt2.onMessage(G3, JSON.stringify({ t: 'room:ready', ready: true }));
await rt2.onMessage(W3, JSON.stringify({ t: 'room:ready', ready: true }));
await rt2.onMessage(H3, JSON.stringify({ t: 'room:start' }));
await rt2.onClose(W3);                                          // carol drops (held)
await rt2.onMessage(H3, JSON.stringify({ t: 'room:leave' }));   // host leaves mid-run → migrate to bob, room → lobby
ok(rt2.rooms.get('RG03') && rt2.rooms.get('RG03').started === false && rt2.rooms.get('RG03').hostCid === G3.cid, 'host-left mid-run → room migrated to a lobby under the remaining player');
const W3b = mk2(carolId, 'carol');
await rt2.onConnect(W3b);
const rz = last(W3b, 'resume');
ok(rz && rz.started === false, 'reconnecting into a migrated room → resume reports started:false (client drops to lobby)');
ok(rt2.rooms.get('RG03').members.has(W3b.cid), 'reconnected guest re-keyed into the lobby room');

console.log(`\n${pass} passed, ${fail} failed`);
await app.close();
process.exit(fail ? 1 : 0);
