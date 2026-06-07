// End-to-end smoke test for the cloud backend — real Fastify + auth + zod + bcrypt,
// driven by app.inject() against an in-memory pool that interprets the exact queries
// server.js issues. No Postgres, no network, no open port. Run: node test/smoke.mjs
process.env.SOULSHARD_NO_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_USERS = 'tester';   // make 'tester' an admin for the admin-endpoint tests
const { buildApp, runPlausibility } = await import('../src/server.js');

// ---- in-memory pool emulating the few queries server.js uses ----
function makeFakePool() {
  const users = [];           // { id, username, email, password_hash, last_login }
  const saves = new Map();    // uid -> { meta, save_version }
  const runs = [];            // { user_id, score, ... }
  const bans = [];            // { kind, value, reason, created_at }
  let uid = 0, rid = 0;
  return {
    async query(sql, args = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('INSERT INTO users')) {
        const [username, email, hash] = args;
        if (users.some((u) => u.username === username) || (email && users.some((u) => u.email === email))) {
          const e = new Error('dup'); e.code = '23505'; throw e;
        }
        const u = { id: ++uid, username, email, password_hash: hash, last_login: null };
        users.push(u);
        return { rows: [{ id: u.id, username: u.username }], rowCount: 1 };
      }
      if (s.startsWith('SELECT id, username, password_hash FROM users')) {
        const u = users.find((x) => x.username === args[0]);
        return { rows: u ? [u] : [], rowCount: u ? 1 : 0 };
      }
      if (s.startsWith('UPDATE users SET last_login')) {
        const u = users.find((x) => String(x.id) === String(args[0])); if (u) u.last_login = Date.now();
        return { rows: [], rowCount: u ? 1 : 0 };
      }
      if (s.startsWith('SELECT meta, save_version FROM saves')) {
        const sv = saves.get(String(args[0]));
        return { rows: sv ? [{ meta: sv.meta, save_version: sv.save_version }] : [], rowCount: sv ? 1 : 0 };
      }
      if (s.startsWith('INSERT INTO saves')) {
        saves.set(String(args[0]), { meta: args[1], save_version: args[2] });
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('INSERT INTO runs')) {
        let row;
        if (s.includes('guest_name')) {   // guest submission: VALUES(NULL, name, score, ...)
          const [guest_name, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper] = args;
          row = { id: ++rid, user_id: null, guest_name, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size: 1, created_at: new Date().toISOString() };
        } else {
          const [user_id, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper] = args;
          row = { id: ++rid, user_id, guest_name: null, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size: 1, created_at: new Date().toISOString() };
        }
        runs.push(row);
        return { rows: [{ id: row.id, score: row.score, created_at: row.created_at }], rowCount: 1 };
      }
      // --- bans (admin moderation) ---
      if (s.startsWith('SELECT kind, value FROM bans')) return { rows: bans.map((b) => ({ kind: b.kind, value: b.value })), rowCount: bans.length };
      if (s.startsWith('SELECT kind, value, reason, created_at FROM bans')) return { rows: bans.slice().reverse(), rowCount: bans.length };
      if (s.startsWith('INSERT INTO bans')) { const [kind, value, reason] = args; const ex = bans.find((b) => b.kind === kind && b.value === value); if (ex) ex.reason = reason; else bans.push({ kind, value, reason, created_at: new Date().toISOString() }); return { rows: [], rowCount: 1 }; }
      if (s.startsWith('DELETE FROM bans')) { const [kind, value] = args; const i = bans.findIndex((b) => b.kind === kind && b.value === value); if (i >= 0) bans.splice(i, 1); return { rows: [], rowCount: i >= 0 ? 1 : 0 }; }
      // --- admin run history + deletion (must precede the leaderboard matcher below) ---
      if (s.startsWith('SELECT r.id, COALESCE')) {
        const m = s.match(/LIMIT (\d+)/); const limit = m ? Number(m[1]) : 40;
        const rows = runs.slice().reverse().slice(0, limit).map((r) => ({ ...r, username: r.user_id != null ? (users.find((u) => String(u.id) === String(r.user_id)) || {}).username : r.guest_name, guest: r.user_id == null }));
        return { rows, rowCount: rows.length };
      }
      if (s.startsWith('DELETE FROM runs')) { const id = args[0]; const i = runs.findIndex((r) => String(r.id) === String(id)); if (i >= 0) runs.splice(i, 1); return { rows: [], rowCount: i >= 0 ? 1 : 0 }; }
      if (s.includes('FROM runs r LEFT JOIN users u')) {
        // map positional args to the filters in the order server.js appends them
        let ai = 0; const filt = {};
        if (s.includes('r.biome = $')) filt.biome = args[ai++];
        if (s.includes('r.difficulty = $')) filt.difficulty = args[ai++];
        if (s.includes('r.character = $')) filt.character = args[ai++];
        const m = s.match(/LIMIT (\d+)/); const limit = m ? Number(m[1]) : 25;
        const ident = (r) => (r.user_id != null ? 'u' + r.user_id : 'g:' + String(r.guest_name || '').toLowerCase());
        const best = new Map();   // identity -> best row (mirror DISTINCT ON best-per-identity)
        for (const r of runs) {
          if (r.user_id == null && !r.guest_name) continue;
          if (filt.biome != null && r.biome !== filt.biome) continue;
          if (filt.difficulty != null && r.difficulty !== filt.difficulty) continue;
          if (filt.character != null && r.character !== filt.character) continue;
          const k = ident(r); const cur = best.get(k);
          if (!cur || r.score > cur.score) best.set(k, r);
        }
        const rows = [...best.values()]
          .map((r) => ({ ...r, username: r.user_id != null ? (users.find((u) => String(u.id) === String(r.user_id)) || {}).username : r.guest_name, guest: r.user_id == null }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        return { rows, rowCount: rows.length };
      }
      throw new Error('unhandled query in fake pool: ' + s.slice(0, 80));
    },
  };
}

// ---- tiny assert harness ----
let pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  ✓ ' + label); } else { fail++; console.error('  ✗ ' + label); } }

const app = await buildApp(makeFakePool(), { rateMax: 100000 });   // high limit so the test isn't rate-capped
const J = (method, url, payload, token) => app.inject({ method, url,
  headers: token ? { authorization: 'Bearer ' + token } : {}, payload });

console.log('Soulshard backend smoke test');

// health
let r = await J('GET', '/api/health');
ok(r.statusCode === 200 && r.json().ok === true, 'GET /api/health');

// register
r = await J('POST', '/api/register', { username: 'tester', password: 'hunter123' });
ok(r.statusCode === 200 && !!r.json().token, 'register tester → token');
const token = r.json().token;

ok((await J('POST', '/api/register', { username: 'tester', password: 'hunter123' })).statusCode === 409, 'duplicate username → 409');
ok((await J('POST', '/api/register', { username: 'ab', password: 'hunter123' })).statusCode === 400, 'short username → 400 (zod)');
ok((await J('POST', '/api/register', { username: 'goodname', password: '123' })).statusCode === 400, 'short password → 400 (zod)');
// errors are human-readable Chinese (not "invalid input")
ok((await J('POST', '/api/register', { username: 'goodname', password: '123' })).json().error.includes('密碼'), 'short password → Chinese reason (密碼…)');
ok((await J('POST', '/api/register', { username: 'ab', password: 'hunter123' })).json().error.includes('帳號'), 'short username → Chinese reason (帳號…)');

// login
ok((await J('POST', '/api/login', { username: 'tester', password: 'wrong' })).statusCode === 401, 'wrong password → 401');
ok((await J('POST', '/api/login', { username: 'tester', password: 'wrong' })).json().error.includes('帳號或密碼'), 'wrong password → Chinese reason');
r = await J('POST', '/api/login', { username: 'tester', password: 'hunter123' });
ok(r.statusCode === 200 && !!r.json().token, 'login correct → token');

// auth gate
ok((await J('GET', '/api/save')).statusCode === 401, 'GET /api/save without token → 401');
ok((await J('GET', '/api/save', undefined, 'garbage.token.x')).statusCode === 401, 'GET /api/save bad token → 401');

// save round-trip
r = await J('GET', '/api/save', undefined, token);
ok(r.statusCode === 200 && r.json().meta === null, 'fresh account → meta null');
ok((await J('PUT', '/api/save', { meta: { gold: 5, stats: { kills: 9 } }, saveVersion: 2 }, token)).statusCode === 200, 'PUT /api/save → ok');
r = await J('GET', '/api/save', undefined, token);
ok(r.statusCode === 200 && r.json().meta.gold === 5 && r.json().saveVersion === 2, 'GET /api/save round-trips the blob');

// runs: score recomputed server-side, claimed score ignored
r = await J('POST', '/api/runs', { kills: 100, stage: 3, time_s: 1200, difficulty: 5, reaper: true, cleared: true, character: 'hunter', biome: 'crypt', score: 999999999 }, token);
const expected = 100 * 12 + 3 * 400 + 1200 + 5 * 600 + 5000; // = 11600
ok(r.statusCode === 200 && r.json().run.score === expected, `POST /api/runs recomputes score (= ${expected}, claimed 999999999 ignored)`);
ok((await J('POST', '/api/runs', { kills: 1, stage: 1, time_s: 10, difficulty: 9 }, token)).statusCode === 400, 'difficulty 9 → 400 (zod)');

// anti-cheat plausibility gate — fabricated component combos → 422 (distinct from zod 400)
ok((await J('POST', '/api/runs', { kills: 1, stage: 1, time_s: 30, difficulty: 1, cleared: true }, token)).statusCode === 422, 'cleared at 30s → 422 (clear impossible before 20:00 boss)');
ok((await J('POST', '/api/runs', { kills: 1, stage: 1, time_s: 1200, difficulty: 1, reaper: true }, token)).statusCode === 422, 'reaper without a clear → 422');
ok((await J('POST', '/api/runs', { kills: 100000, stage: 1, time_s: 60, difficulty: 1 }, token)).statusCode === 422, 'absurd kills for elapsed time → 422');
ok((await J('POST', '/api/runs', { kills: 1, stage: 40, time_s: 1200, difficulty: 1 }, token)).statusCode === 422, 'stage 40 (> threat ceiling) → 422');
// regression (review): threat keeps climbing on the Reaper past 20:00, so a legit clear+reaper reports a high stage — must NOT be rejected
ok(runPlausibility({ kills: 4000, stage: 16, time_s: 1500, difficulty: 5, cleared: true, reaper: true }) === null, 'legit clear+reaper at stage 16 / ~25min passes the anti-cheat gate');
ok(runPlausibility({ kills: 1, stage: 21, time_s: 1500, difficulty: 1, cleared: true }) !== null, 'stage 21 (beyond the headroom) is still rejected');

// second player, lower score
const t2 = (await J('POST', '/api/register', { username: 'rival', password: 'hunter123' })).json().token;
await J('POST', '/api/runs', { kills: 10, stage: 1, time_s: 120, difficulty: 2, biome: 'frost' }, t2);

// leaderboard
r = await J('GET', '/api/leaderboard');
const rows = r.json().rows;
ok(r.statusCode === 200 && rows.length === 2, 'leaderboard returns both runs');
ok(rows[0].score >= rows[1].score && rows[0].username === 'tester', 'leaderboard sorted desc, top = tester');
ok(rows[0].username != null, 'leaderboard joins username');
r = await J('GET', '/api/leaderboard?biome=frost');
ok(r.json().rows.length === 1 && r.json().rows[0].username === 'rival', 'leaderboard biome filter works');

// guest leaderboard upload — no account, self-entered name (訪客模式)
r = await J('POST', '/api/runs/guest', { name: 'WanderingZ', kills: 200, stage: 5, time_s: 700, difficulty: 3, biome: 'crypt', score: 1 });
ok(r.statusCode === 200 && r.json().run.score === (200 * 12 + 5 * 400 + 700 + 3 * 600), 'guest run accepted + scored server-side');
ok((await J('POST', '/api/runs/guest', { kills: 1, stage: 1, time_s: 100, difficulty: 1 })).statusCode === 400, 'guest run without a name → 400');
ok((await J('POST', '/api/runs/guest', { name: 'Cheater', kills: 100000, stage: 1, time_s: 30, difficulty: 1 })).statusCode === 422, 'guest run hits the anti-cheat gate → 422');
const lb = (await J('GET', '/api/leaderboard')).json().rows;
const guestRow = lb.find((x) => x.username === 'WanderingZ');
ok(guestRow && guestRow.guest === true, 'guest run appears on the leaderboard, flagged as guest');
ok(lb.some((x) => x.username === 'tester' && !x.guest), 'registered + guest runs coexist on the board');

// admin dashboard (ADMIN_USERS=tester; t2/rival is a normal user)
ok((await J('GET', '/api/me', undefined, token)).json().user.admin === true, '/api/me flags the allowlisted user as admin');
ok((await J('GET', '/api/me', undefined, t2)).json().user.admin === false, '/api/me: a normal user is not admin');
ok((await J('GET', '/api/admin/overview')).statusCode === 401, 'admin overview without a token → 401');
ok((await J('GET', '/api/admin/overview', undefined, t2)).statusCode === 403, 'admin overview as a non-admin → 403');
r = await J('GET', '/api/admin/overview', undefined, token);
ok(r.statusCode === 200 && r.json().totals && Array.isArray(r.json().online) && Array.isArray(r.json().rooms), 'admin overview (admin) → totals + online[] + rooms[]');
ok((await J('POST', '/api/admin/kick', { uid: 999999 }, token)).json().closed === 0, 'admin kick of an offline uid → closed 0');
ok((await J('POST', '/api/admin/close-room', { code: 'NOPE1' }, token)).json().closed === false, 'admin close of a missing room → false');
ok((await J('POST', '/api/admin/kick', { uid: 1 }, t2)).statusCode === 403, 'admin kick as a non-admin → 403');

// admin moderation — account bans (+ login enforcement)
ok((await J('POST', '/api/admin/ban', { kind: 'user', value: 'rival', reason: 'cheating' }, token)).statusCode === 200, 'admin bans an account');
ok((await J('GET', '/api/admin/bans', undefined, token)).json().bans.some((b) => b.kind === 'user' && b.value === 'rival'), 'ban shows in the ban list');
ok((await J('POST', '/api/login', { username: 'rival', password: 'hunter123' })).statusCode === 403, 'banned account → login 403');
ok((await J('POST', '/api/admin/unban', { kind: 'user', value: 'rival' }, token)).statusCode === 200, 'admin unbans the account');
ok((await J('POST', '/api/login', { username: 'rival', password: 'hunter123' })).statusCode === 200, 'unbanned account logs in again');
ok((await J('POST', '/api/admin/ban', { kind: 'x', value: 'y' }, token)).statusCode === 400, 'invalid ban kind → 400');
// admin broadcast
ok((await J('POST', '/api/admin/broadcast', { text: '伺服器將於 5 分鐘後維護' }, token)).json().ok === true, 'admin broadcast accepted');
ok((await J('POST', '/api/admin/broadcast', {}, token)).statusCode === 400, 'broadcast without text → 400');
// admin match history + leaderboard moderation
const ar = await J('GET', '/api/admin/runs', undefined, token);
ok(ar.statusCode === 200 && Array.isArray(ar.json().rows) && ar.json().rows.length > 0, 'admin run history returns rows');
const delId = ar.json().rows[0].id;
ok((await J('POST', '/api/admin/delete-run', { id: delId }, token)).json().deleted === 1, 'admin deletes a run from the leaderboard');
ok((await J('POST', '/api/admin/delete-run', { id: delId }, t2)).statusCode === 403, 'delete-run as a non-admin → 403');

console.log(`\n${pass} passed, ${fail} failed`);
await app.close();
process.exit(fail ? 1 : 0);
