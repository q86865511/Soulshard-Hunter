// In-memory pool that interprets the exact queries server.js issues — used by the
// smoke test and the no-Postgres dev launcher. NOT for production.
export function makeFakePool() {
  const users = [];           // { id, username, email, password_hash, last_login }
  const saves = new Map();    // uid -> { meta, save_version }
  const runs = [];            // { user_id, score, ... }
  const edges = [];           // { user_id, friend_id, status }  (friend graph)
  let uid = 0, rid = 0;
  const findEdge = (a, b) => edges.find((e) => String(e.user_id) === String(a) && String(e.friend_id) === String(b));
  const uobj = (id) => { const u = users.find((x) => String(x.id) === String(id)); return u ? { id: u.id, username: u.username } : null; };
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
      if (s.startsWith('SELECT id, username FROM users WHERE username')) {
        const u = users.find((x) => x.username === args[0]);
        return { rows: u ? [{ id: u.id, username: u.username }] : [], rowCount: u ? 1 : 0 };
      }
      // ---- friend graph ----
      if (s.startsWith('SELECT status FROM friendships')) {
        const e = findEdge(args[0], args[1]); return { rows: e ? [{ status: e.status }] : [], rowCount: e ? 1 : 0 };
      }
      if (s.startsWith('SELECT u.id, u.username FROM friendships')) {
        const accepted = s.includes("'accepted'"); const byFriend = s.includes('ON u.id = f.user_id');
        let rows;
        if (byFriend) rows = edges.filter((e) => String(e.friend_id) === String(args[0]) && e.status === 'pending').map((e) => uobj(e.user_id));
        else rows = edges.filter((e) => String(e.user_id) === String(args[0]) && e.status === (accepted ? 'accepted' : 'pending')).map((e) => uobj(e.friend_id));
        rows = rows.filter(Boolean); return { rows, rowCount: rows.length };
      }
      if (s.startsWith('INSERT INTO friendships')) {
        const [a, b] = args; const status = s.includes("'accepted'") ? 'accepted' : 'pending';
        const ex = findEdge(a, b);
        if (ex) { if (s.includes('DO UPDATE')) ex.status = status; } else edges.push({ user_id: a, friend_id: b, status });
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('UPDATE friendships SET')) {
        const e = findEdge(args[0], args[1]); if (e) e.status = 'accepted'; return { rows: [], rowCount: e ? 1 : 0 };
      }
      if (s.startsWith('DELETE FROM friendships')) {
        const [a, b] = args;
        for (let i = edges.length - 1; i >= 0; i--) { const e = edges[i]; if ((String(e.user_id) === String(a) && String(e.friend_id) === String(b)) || (String(e.user_id) === String(b) && String(e.friend_id) === String(a))) edges.splice(i, 1); }
        return { rows: [], rowCount: 1 };
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
        const [user_id, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size] = args;
        const row = { id: ++rid, user_id, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size: coop_size || 1, created_at: new Date().toISOString() };
        runs.push(row);
        return { rows: [{ id: row.id, score: row.score, created_at: row.created_at }], rowCount: 1 };
      }
      if (s.includes('FROM runs r JOIN users u')) {
        let ai = 0; const filt = {};
        if (s.includes('r.biome = $')) filt.biome = args[ai++];
        if (s.includes('r.difficulty = $')) filt.difficulty = args[ai++];
        if (s.includes('r.character = $')) filt.character = args[ai++];
        const m = s.match(/LIMIT (\d+)/); const limit = m ? Number(m[1]) : 25;
        const rows = runs
          .filter((r) => (filt.biome == null || r.biome === filt.biome)
            && (filt.difficulty == null || Number(r.difficulty) === Number(filt.difficulty))
            && (filt.character == null || r.character === filt.character))
          .map((r) => ({ ...r, username: (users.find((u) => String(u.id) === String(r.user_id)) || {}).username }))
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
        return { rows, rowCount: rows.length };
      }
      throw new Error('unhandled query in fake pool: ' + s.slice(0, 80));
    },
  };
}
