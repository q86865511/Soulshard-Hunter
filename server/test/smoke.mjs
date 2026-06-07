// End-to-end smoke test for the cloud backend — real Fastify + auth + zod + bcrypt,
// driven by app.inject() against an in-memory pool that interprets the exact queries
// server.js issues. No Postgres, no network, no open port. Run: node test/smoke.mjs
process.env.SOULSHARD_NO_LISTEN = '1';
process.env.JWT_SECRET = 'test-secret';
const { buildApp, runPlausibility } = await import('../src/server.js');

// ---- in-memory pool emulating the few queries server.js uses ----
function makeFakePool() {
  const users = [];           // { id, username, email, password_hash, last_login }
  const saves = new Map();    // uid -> { meta, save_version }
  const runs = [];            // { user_id, score, ... }
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

// login
ok((await J('POST', '/api/login', { username: 'tester', password: 'wrong' })).statusCode === 401, 'wrong password → 401');
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

console.log(`\n${pass} passed, ${fail} failed`);
await app.close();
process.exit(fail ? 1 : 0);
