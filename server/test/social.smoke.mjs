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

// host leaving closes the room for guests
await rt.onClose(A);
ok(last(B, 'room:closed'), 'host disconnect closes the room (guest notified)');
ok(rt.rooms.size === 0, 'room cleaned up after host left');

console.log(`\n${pass} passed, ${fail} failed`);
await app.close();
process.exit(fail ? 1 : 0);
