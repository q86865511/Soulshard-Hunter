// In-memory pool that interprets the exact queries server.js issues — used by the
// smoke test and the no-Postgres dev launcher. NOT for production.
export function makeFakePool() {
  const users = [];           // { id, username, email, password_hash, last_login }
  const saves = new Map();    // uid -> { meta, save_version }
  const runs = [];            // { user_id, score, ... }
  const edges = [];           // { user_id, friend_id, status }  (friend graph)
  const bans = [];            // { kind, value, reason, created_at }
  const feedback = [];        // round16/7.1
  const adminLogs = [];       // round16/7.6
  let uid = 0, rid = 0, fid = 0, lid = 0;
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
        let row;
        if (s.includes('guest_name')) {   // guest submission: VALUES(NULL, name, score, ...)
          const [guest_name, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size, mode, challenge_key] = args;
          row = { id: ++rid, user_id: null, guest_name, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size: coop_size || 1, mode: mode || 'normal', challenge_key: challenge_key || null, created_at: new Date().toISOString() };
        } else {
          const [user_id, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size, mode, challenge_key] = args;
          row = { id: ++rid, user_id, guest_name: null, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size: coop_size || 1, mode: mode || 'normal', challenge_key: challenge_key || null, created_at: new Date().toISOString() };
        }
        runs.push(row);
        return { rows: [{ id: row.id, score: row.score, created_at: row.created_at }], rowCount: 1 };
      }
      // ---- bans (admin moderation) ----
      if (s.startsWith('SELECT kind, value FROM bans')) return { rows: bans.map((b) => ({ kind: b.kind, value: b.value })), rowCount: bans.length };
      if (s.startsWith('SELECT kind, value, reason, created_at FROM bans')) return { rows: bans.slice().reverse(), rowCount: bans.length };
      if (s.startsWith('INSERT INTO bans')) { const [kind, value, reason] = args; const ex = bans.find((b) => b.kind === kind && b.value === value); if (ex) ex.reason = reason; else bans.push({ kind, value, reason, created_at: new Date().toISOString() }); return { rows: [], rowCount: 1 }; }
      if (s.startsWith('DELETE FROM bans')) { const [kind, value] = args; const i = bans.findIndex((b) => b.kind === kind && b.value === value); if (i >= 0) bans.splice(i, 1); return { rows: [], rowCount: i >= 0 ? 1 : 0 }; }
      // ---- admin run history + deletion ----
      if (s.startsWith('SELECT r.id, COALESCE')) {
        const m = s.match(/LIMIT (\d+)/); const limit = m ? Number(m[1]) : 40;
        const rows = runs.slice().reverse().slice(0, limit).map((r) => ({ ...r, username: r.user_id != null ? (users.find((u) => String(u.id) === String(r.user_id)) || {}).username : r.guest_name, guest: r.user_id == null }));
        return { rows, rowCount: rows.length };
      }
      if (s.startsWith('DELETE FROM runs')) { const id = args[0]; const i = runs.findIndex((r) => String(r.id) === String(id)); if (i >= 0) runs.splice(i, 1); return { rows: [], rowCount: i >= 0 ? 1 : 0 }; }
      // ---- round16/7.1 feedback ----
      if (s.startsWith('INSERT INTO feedback')) {
        const [user_id, guest_name, category, content] = args;
        feedback.push({ id: ++fid, user_id, guest_name, category, content, status: 'pending', admin_note: null, created_at: new Date().toISOString() });
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('SELECT f.id, COALESCE(u.username, f.guest_name')) {
        let rows = feedback.slice();
        if (s.includes('WHERE f.status = $3')) rows = rows.filter((f) => f.status === args[2]);
        rows = rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, args[0])
          .map((f) => ({ id: f.id, author: (f.user_id != null ? (users.find((u) => String(u.id) === String(f.user_id)) || {}).username : null) || f.guest_name || '訪客', category: f.category, content: f.content, status: f.status, admin_note: f.admin_note, created_at: f.created_at }));
        return { rows, rowCount: rows.length };
      }
      if (s.startsWith('UPDATE feedback SET')) {
        const f = feedback.find((x) => String(x.id) === String(args[0]));
        if (f) { const ms = s.match(/status = \$(\d)/), mn = s.match(/admin_note = \$(\d)/); if (ms) f.status = args[Number(ms[1]) - 1]; if (mn) f.admin_note = args[Number(mn[1]) - 1]; }
        return { rows: [], rowCount: f ? 1 : 0 };
      }
      // ---- round16/7.6 admin audit log ----
      if (s.startsWith('INSERT INTO admin_logs')) {
        const [admin_username, action, target, detail] = args;
        adminLogs.push({ id: ++lid, admin_username, action, target, detail, created_at: new Date().toISOString() });
        return { rows: [], rowCount: 1 };
      }
      if (s.startsWith('SELECT id, admin_username, action')) {
        const rows = adminLogs.slice().reverse().slice(0, args[0]);
        return { rows, rowCount: rows.length };
      }
      // ---- round16/7.7 stats counts + top players ----
      if (s === 'SELECT count(*) n FROM users') return { rows: [{ n: users.length }], rowCount: 1 };
      if (s.startsWith('SELECT count(*) n FROM users WHERE last_login')) return { rows: [{ n: users.filter((u) => u.last_login).length }], rowCount: 1 };
      if (s === 'SELECT count(*) n FROM runs') return { rows: [{ n: runs.length }], rowCount: 1 };
      if (s.startsWith('SELECT count(*) n FROM runs WHERE created_at')) return { rows: [{ n: runs.length }], rowCount: 1 };
      if (s.startsWith('SELECT count(*) n FROM runs WHERE user_id IS NULL')) return { rows: [{ n: runs.filter((r) => r.user_id == null).length }], rowCount: 1 };
      if (s === 'SELECT count(*) n FROM bans') return { rows: [{ n: bans.length }], rowCount: 1 };
      if (s.startsWith('SELECT count(*) n FROM feedback')) return { rows: [{ n: feedback.filter((f) => f.status === 'pending').length }], rowCount: 1 };
      if (s.startsWith("SELECT COALESCE(u.username, r.guest_name, '訪客') AS name, max(r.score)")) {
        const best = new Map();
        for (const r of runs) {
          if (r.user_id == null && !r.guest_name) continue;
          const name = r.user_id != null ? (users.find((u) => String(u.id) === String(r.user_id)) || {}).username : r.guest_name;
          const cur = best.get(name); if (cur == null || r.score > cur) best.set(name, r.score);
        }
        const rows = [...best.entries()].map(([name, score]) => ({ name, score })).sort((a, b) => b.score - a.score).slice(0, 5);
        return { rows, rowCount: rows.length };
      }
      // ---- round16/7.8 player inspect ----
      if (s.startsWith('SELECT id, username, email, created_at, last_login FROM users WHERE id')) {
        const u = users.find((x) => String(x.id) === String(args[0]));
        return { rows: u ? [{ id: u.id, username: u.username, email: u.email || null, created_at: u.created_at || null, last_login: u.last_login || null }] : [], rowCount: u ? 1 : 0 };
      }
      if (s.startsWith('SELECT count(*) AS runs, COALESCE(max(score),0) AS best FROM runs WHERE user_id')) {
        const rs = runs.filter((r) => String(r.user_id) === String(args[0]));
        return { rows: [{ runs: rs.length, best: rs.reduce((m, r) => Math.max(m, r.score), 0) }], rowCount: 1 };
      }
      if (s.startsWith('SELECT id, score, stage, kills, character, biome, difficulty, time_s, cleared, created_at FROM runs WHERE user_id')) {
        const rs = runs.filter((r) => String(r.user_id) === String(args[0])).slice().reverse().slice(0, 10);
        return { rows: rs, rowCount: rs.length };
      }
      // ---- leaderboard (best-per-identity, guest-aware) ----
      if (s.includes('FROM runs r LEFT JOIN users u') || s.includes('FROM runs r JOIN users u')) {
        let ai = 0; const filt = {};
        if (s.includes('r.biome = $')) filt.biome = args[ai++];
        if (s.includes('r.difficulty = $')) filt.difficulty = args[ai++];
        if (s.includes('r.character = $')) filt.character = args[ai++];
        if (s.includes('r.mode = $')) filt.mode = args[ai++];               // R18/B6 (always present)
        if (s.includes('r.challenge_key = $')) filt.key = args[ai++];       // R18/B6 (daily only)
        const m = s.match(/LIMIT (\d+)/); const limit = m ? Number(m[1]) : 25;
        const ident = (r) => (r.user_id != null ? 'u' + r.user_id : 'g:' + String(r.guest_name || '').toLowerCase());
        const best = new Map();
        for (const r of runs) {
          if (r.user_id == null && !r.guest_name) continue;
          if (filt.biome != null && r.biome !== filt.biome) continue;
          if (filt.difficulty != null && Number(r.difficulty) !== Number(filt.difficulty)) continue;
          if (filt.character != null && r.character !== filt.character) continue;
          if (filt.mode != null && (r.mode || 'normal') !== filt.mode) continue;
          if (filt.key != null && r.challenge_key !== filt.key) continue;
          const k = ident(r); const cur = best.get(k); if (!cur || r.score > cur.score) best.set(k, r);
        }
        const rows = [...best.values()]
          .map((r) => ({ ...r, username: r.user_id != null ? (users.find((u) => String(u.id) === String(r.user_id)) || {}).username : r.guest_name, guest: r.user_id == null }))
          .sort((a, b) => b.score - a.score).slice(0, limit);
        return { rows, rowCount: rows.length };
      }
      throw new Error('unhandled query in fake pool: ' + s.slice(0, 80));
    },
  };
}
