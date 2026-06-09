// Soulshard Hunter — cloud backend (Phase 1: accounts + cloud save + leaderboard).
// Server-authoritative score: the leaderboard score is RECOMPUTED from run
// components on the server; the client's claimed score is ignored. See
// docs/MULTIPLAYER_PLAN.md. Phase 2 (realtime co-op) reuses this same service.
//
// buildApp(pool) returns the Fastify app WITHOUT listening, so it can be driven by
// app.inject() in tests with an in-memory pool. The bottom self-boots in production.
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { registerSocial } from './social.js';
import { Realtime } from './realtime.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL = process.env.JWT_TTL || '30d';
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map((s) => s.trim()).filter(Boolean);
// admin dashboard allowlist: comma-separated usernames (set ADMIN_USERS in server/.env)
const ADMIN_USERS = (process.env.ADMIN_USERS || '').split(',').map((s) => s.trim()).filter(Boolean);
const isAdmin = (username) => !!username && ADMIN_USERS.includes(username);

// ---- helpers --------------------------------------------------------------
const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(v) || 0)));

function sign(user) {
  return jwt.sign({ uid: String(user.id), username: user.username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// preHandler: require a valid Bearer token; attaches req.user = { uid, username }
async function auth(req, reply) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/);
  if (!m) return reply.code(401).send({ error: 'missing token' });
  try { req.user = jwt.verify(m[1], JWT_SECRET, { algorithms: ['HS256'] }); }   // pin the algorithm (no 'none'/alg-confusion)
  catch { return reply.code(401).send({ error: 'invalid token' }); }
}

// preHandler: valid token AND an allowlisted admin username (else 403)
async function requireAdmin(req, reply) {
  await auth(req, reply);
  if (!req.user) return;   // auth already sent 401
  if (!isAdmin(req.user.username)) return reply.code(403).send({ error: 'admin only' });
}

// Server-authoritative score — mirrors run.js finishRun(), with per-field caps.
export function computeScore(c) {
  const kills = clampInt(c.kills, 0, 100000);
  const stage = clampInt(c.stage, 0, 50);
  const time = clampInt(c.time_s, 0, 36000);          // 10h hard ceiling
  const diff = clampInt(c.difficulty, 1, 5);
  const reaper = !!c.reaper;
  return Math.floor(kills * 12 + stage * 400 + time + diff * 600 + (reaper ? 5000 : 0));
}

// Anti-cheat plausibility gate: reject runs whose components are physically
// impossible for the engine, so the (server-recomputed) score can't be inflated
// with fabricated inputs. Returns a reason string when implausible, else null.
//   - kills: bounded by elapsed time (the on-screen swarm caps at ~260; this ceiling
//     is far above any real run) and scaled by party size for co-op.
//   - cleared: the biome final boss only spawns at 20:00 (BALANCE.LEVEL_TIME=1200),
//     so a clear cannot happen before then — a generous floor catches blatant fakes.
//   - reaper: only descends AFTER a clear, so reaper without cleared is impossible.
//   - stage: in run.js stage = the threat level reached (ceiling ~13), not a level
//     index. The client now report-caps it at the ceiling, but threat keeps climbing
//     while the player lingers on the Reaper past 20:00, so allow headroom (20) to avoid
//     false-rejecting legitimate clear+reaper runs from older/unpatched clients.
const ANTICHEAT = { KILL_BASE: 80, MAX_KPS: 30, MIN_CLEAR_TIME: 1000, MAX_STAGE: 20 };
export function runPlausibility(c) {
  const party = clampInt(c.coop_size || 1, 1, 3);
  if (c.kills > ANTICHEAT.KILL_BASE + c.time_s * ANTICHEAT.MAX_KPS * party) return 'kills implausible for elapsed time';
  if (c.stage > ANTICHEAT.MAX_STAGE) return 'stage out of plausible range';
  if (c.cleared && c.time_s < ANTICHEAT.MIN_CLEAR_TIME) return 'cleared flag with too little elapsed time';
  if (c.reaper && !c.cleared) return 'reaper flag without a clear';
  return null;
}

// ---- validation schemas ---------------------------------------------------
const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[A-Za-z0-9_]+$/, 'letters, digits, underscore only'),
  password: z.string().min(6).max(160).refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'password too long (max 72 bytes)'),   // bcrypt truncates at 72 BYTES — reject rather than silently cut multibyte
  email: z.string().email().max(160).optional().nullable(),
});
const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

// Turn the first zod issue into a human-readable Chinese message so the client can show
// the REAL reason (was a generic "invalid input"). Falls back gracefully for any field.
function zodMsg(err) {
  const i = err && err.issues && err.issues[0];
  if (!i) return '輸入格式不正確';
  const f = i.path && i.path[0];
  if (f === 'username') {
    if (i.code === 'too_small') return '帳號至少需要 3 個字元';
    if (i.code === 'too_big') return '帳號最多 24 個字元';
    if (i.code === 'invalid_string') return '帳號只能使用英文字母、數字與底線（_）';
    return '帳號格式不正確（3–24 字元，英數與底線）';
  }
  if (f === 'password') {
    if (i.code === 'too_small') return '密碼至少需要 6 個字元';
    if (i.code === 'too_big') return '密碼太長（最多 160 個字元）';
    if (i.code === 'custom') return '密碼太長（UTF-8 上限 72 位元組，請改短一點）';
    return '密碼格式不正確（至少 6 個字元）';
  }
  if (f === 'email') return '電子郵件格式不正確';
  return '輸入格式不正確';
}
const saveSchema = z.object({ meta: z.record(z.any()), saveVersion: z.number().int().nonnegative() });
const runSchema = z.object({
  kills: z.number().int().nonnegative().max(100000),
  stage: z.number().int().nonnegative().max(50),
  time_s: z.number().int().nonnegative().max(36000),
  difficulty: z.number().int().min(1).max(5),
  cleared: z.boolean().optional(),
  reaper: z.boolean().optional(),
  character: z.string().max(40).optional().nullable(),
  biome: z.string().max(40).optional().nullable(),
  coop_size: z.number().int().min(1).max(3).optional(),   // Phase 2 co-op party size
});
// round16/7.1: player feedback (no login required; JWT, if present, attaches user_id)
const feedbackSchema = z.object({
  category: z.enum(['ui', 'gameplay', 'bug', 'content', 'other']),
  content:  z.string().trim().min(5).max(1000),
  name:     z.string().trim().max(24).optional().nullable(),
  // round16 #4: optional attached screenshot — a base64 image data: URL, capped ~2.6MB of
  // text (~1.9MB binary). The regex rejects any non-image / non-data payload.
  image:    z.string().max(2_600_000).regex(/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/]+={0,2}$/).optional().nullable(),   // QA: anchor + base64-charset (defense-in-depth)
});

const strictLimit = { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } };          // auth
const saveLimit = { preHandler: auth, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };   // cloud save (client debounces at ~24/min)
const runLimit = { preHandler: auth, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };    // leaderboard upload

// ---- app factory ----------------------------------------------------------
export async function buildApp(pool, { logger = false, rateMax = 120 } = {}) {
  const app = Fastify({ logger, bodyLimit: 1_500_000, trustProxy: 'loopback' });   // trustProxy: see the real client IP behind Caddy so rate limits are per-IP (not one global bucket)
  await app.register(cors, { origin: CORS_ORIGIN, credentials: true });
  await app.register(rateLimit, { max: rateMax, timeWindow: '1 minute' });

  app.get('/api/health', async () => ({ ok: true, time: Date.now() }));

  app.post('/api/register', strictLimit, async (req, reply) => {
    const p = registerSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: zodMsg(p.error) });
    if (realtime.isBannedIp(req.ip)) return reply.code(403).send({ error: '此 IP 已被封鎖' });
    const { username, password, email } = p.data;
    const hash = await bcrypt.hash(password, 10);
    try {
      const r = await pool.query(
        'INSERT INTO users(username, email, password_hash) VALUES($1,$2,$3) RETURNING id, username',
        [username, email || null, hash]);
      const user = r.rows[0];
      return { token: sign(user), user: { id: user.id, username: user.username, admin: isAdmin(user.username) } };
    } catch (e) {
      if (e.code === '23505') return reply.code(409).send({ error: '此帳號或電子郵件已被註冊' });
      throw e;
    }
  });

  app.post('/api/login', strictLimit, async (req, reply) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: '請輸入帳號與密碼' });
    const r = await pool.query('SELECT id, username, password_hash FROM users WHERE username=$1', [p.data.username]);
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(p.data.password, u.password_hash))) {
      return reply.code(401).send({ error: '帳號或密碼錯誤' });
    }
    if (realtime.isBannedUser(u.username)) return reply.code(403).send({ error: '此帳號已被封鎖' });
    await pool.query('UPDATE users SET last_login=now() WHERE id=$1', [u.id]);
    return { token: sign(u), user: { id: u.id, username: u.username, admin: isAdmin(u.username) } };
  });

  app.get('/api/me', { preHandler: auth }, async (req) => ({ user: { ...req.user, admin: isAdmin(req.user.username) } }));

  // cloud save: whole META blob (JSONB)
  app.get('/api/save', { preHandler: auth }, async (req) => {
    const r = await pool.query('SELECT meta, save_version FROM saves WHERE user_id=$1', [req.user.uid]);
    if (!r.rows[0]) return { meta: null };
    return { meta: r.rows[0].meta, saveVersion: r.rows[0].save_version };
  });

  app.put('/api/save', saveLimit, async (req, reply) => {
    const p = saveSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid save payload' });
    // reject an older write clobbering a newer one (compare the client's monotonic savedAt marker)
    const r = await pool.query(
      `INSERT INTO saves(user_id, meta, save_version, updated_at) VALUES($1,$2,$3,now())
       ON CONFLICT (user_id) DO UPDATE SET meta=$2, save_version=$3, updated_at=now()
       WHERE COALESCE((saves.meta->>'saveSeq')::bigint, 0) <= COALESCE(($2->>'saveSeq')::bigint, 0)`,
      [req.user.uid, p.data.meta, p.data.saveVersion]);
    return { ok: true, applied: r.rowCount > 0 };
  });

  // leaderboard upload — score recomputed server-side (claimed score ignored)
  app.post('/api/runs', runLimit, async (req, reply) => {
    const p = runSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid run payload', detail: p.error.issues });
    const c = p.data;
    const bad = runPlausibility(c);
    if (bad) return reply.code(422).send({ error: 'implausible run rejected', detail: bad });   // anti-cheat: fabricated components
    const score = computeScore(c);
    const r = await pool.query(
      `INSERT INTO runs(user_id, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, score, created_at`,
      [req.user.uid, score, c.stage, c.kills, c.character || null, c.biome || null, c.difficulty, c.time_s, !!c.cleared, !!c.reaper, c.coop_size || 1]);
    return { ok: true, run: r.rows[0] };
  });

  // guest leaderboard upload — no account, a self-entered display name. Same anti-cheat gate;
  // tighter per-IP rate limit (anonymous → can't be tied to an account).
  const guestRunSchema = runSchema.extend({ name: z.string().trim().min(1).max(16) });
  const guestRunLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };
  app.post('/api/runs/guest', guestRunLimit, async (req, reply) => {
    const p = guestRunSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid run payload', detail: p.error.issues });
    if (realtime.isBannedIp(req.ip)) return reply.code(403).send({ error: '此 IP 已被封鎖' });
    const c = p.data;
    const bad = runPlausibility(c);
    if (bad) return reply.code(422).send({ error: 'implausible run rejected', detail: bad });
    const name = String(c.name).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16) || '訪客';
    realtime.touchGuest(req.ip, name);   // surface this not-logged-in player in the admin console (bannable by IP)
    const score = computeScore(c);
    const r = await pool.query(
      `INSERT INTO runs(user_id, guest_name, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper, coop_size)
       VALUES(NULL,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, score, created_at`,
      [name, score, c.stage, c.kills, c.character || null, c.biome || null, c.difficulty, c.time_s, !!c.cleared, !!c.reaper, c.coop_size || 1]);
    return { ok: true, run: r.rows[0] };
  });

  app.get('/api/leaderboard', async (req) => {
    const q = req.query || {};
    const where = []; const args = [];
    if (q.biome) { args.push(String(q.biome).slice(0, 40)); where.push(`r.biome = $${args.length}`); }
    if (q.difficulty) { args.push(clampInt(q.difficulty, 1, 5)); where.push(`r.difficulty = $${args.length}`); }
    if (q.character) { args.push(String(q.character).slice(0, 40)); where.push(`r.character = $${args.length}`); }
    if (q.period === 'week') where.push(`r.created_at >= now() - interval '7 days'`);
    else if (q.period === 'day') where.push(`r.created_at >= now() - interval '1 day'`);
    const limit = clampInt(q.limit || 25, 1, 100);
    // best-per-player board: DISTINCT ON keeps each user's single best row (within the
    // active filters), so one player can't flood the visible leaderboard with dupes.
    // identity = the user id, or (for anonymous guests) the lowercased guest name — so each
    // registered player AND each guest name keeps only their single best row (no dupe flooding).
    const idExpr = `COALESCE(u.id::text, 'g:' || lower(r.guest_name))`;
    const sql = `
      SELECT t.username, t.guest, t.score, t.stage, t.kills, t.character, t.biome, t.difficulty, t.time_s, t.cleared, t.reaper, t.coop_size, t.created_at FROM (
        SELECT DISTINCT ON (${idExpr}) COALESCE(u.username, r.guest_name) AS username, (u.id IS NULL) AS guest,
               r.score, r.stage, r.kills, r.character, r.biome, r.difficulty, r.time_s, r.cleared, r.reaper, r.coop_size, r.created_at
        FROM runs r LEFT JOIN users u ON u.id = r.user_id
        WHERE (u.id IS NOT NULL OR r.guest_name IS NOT NULL)${where.length ? ' AND ' + where.join(' AND ') : ''}
        ORDER BY ${idExpr}, r.score DESC
      ) t
      ORDER BY t.score DESC
      LIMIT ${limit}`;
    const r = await pool.query(sql, args);
    return { rows: r.rows };
  });

  // round16/7.1: submit player feedback (public; an optional Bearer token attaches user_id)
  // bodyLimit raised (#4) so an attached screenshot (~≤1.9MB base64) isn't rejected with 413
  // before zod can validate it; the schema still caps the image field at ~2.6MB of text.
  app.post('/api/feedback', { bodyLimit: 3_200_000, config: { rateLimit: { max: 8, timeWindow: '1 minute' } } }, async (req, reply) => {
    const p = feedbackSchema.safeParse(req.body || {});
    if (!p.success) return reply.code(400).send({ error: zodMsg(p.error) });
    if (realtime.isBannedIp(req.ip)) return reply.code(403).send({ error: '此 IP 已被封鎖' });
    let userId = null;
    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (m) { try { userId = jwt.verify(m[1], JWT_SECRET, { algorithms: ['HS256'] }).uid; } catch (e) { /* anonymous */ } }
    const { category, content, name, image } = p.data;
    await pool.query('INSERT INTO feedback (user_id, guest_name, category, content, image) VALUES ($1,$2,$3,$4,$5)',
      [userId, userId ? null : (name || null), category, content, image || null]);
    return { ok: true };
  });

  // round16/7.3: "playing now" heartbeat — works for logged-in users AND offline guests.
  // High-frequency (~every 30s/client): keep its own modest per-IP rate bucket.
  app.post('/api/presence/play', { config: { rateLimit: { max: 40, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { sid, name, biome, difficulty } = req.body || {};
    if (!sid) return reply.code(400).send({ error: 'sid required' });
    if (realtime.isBannedIp(req.ip)) return reply.code(403).send({ error: '此 IP 已被封鎖' });   // QA: keep banned IPs out of the live-players list
    let nm = String(name || '訪客').slice(0, 24), isGuest = true;
    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (m) { try { const u = jwt.verify(m[1], JWT_SECRET, { algorithms: ['HS256'] }); if (u.username) { nm = u.username; isGuest = false; } } catch (e) { /* treat as guest */ } }
    if (!isGuest && realtime.isBannedUser(nm)) return reply.code(403).send({ error: '此帳號已被封鎖' });   // QA: banned account can't appear as "playing now"
    realtime.touchPlaying({ sid: String(sid).slice(0, 64), name: nm, guest: isGuest, biome, difficulty });
    return { ok: true };
  });
  app.post('/api/presence/stop', { config: { rateLimit: { max: 40, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (realtime.isBannedIp(req.ip)) return reply.code(403).send({ error: '此 IP 已被封鎖' });
    const sid = req.body && req.body.sid; if (sid) realtime.stopPlaying(String(sid).slice(0, 64));
    return { ok: true };
  });

  // ---- Phase 2: social (friends) + realtime co-op gateway -------------------
  // The friend REST routes are testable via inject(); the realtime gateway is a
  // socket-less object here (attached to the live HTTP server post-listen, below).
  const realtime = new Realtime(pool);
  registerSocial(app, pool, auth, { onFriendChange: (a, b) => realtime.onFriendChange(a, b) });
  app.realtime = realtime;
  await realtime.loadBans().catch(() => {});   // load account/IP ban list into memory
  app.get('/api/rt/stats', async () => realtime.stats());

  // round16/7.6: central audit-log writer — called by every admin mutation. Self-catches:
  // a logging failure must NEVER block the moderation action it is recording.
  async function logAdmin(req, action, target, detail) {
    try {
      await pool.query('INSERT INTO admin_logs (admin_username, action, target, detail) VALUES ($1,$2,$3,$4)',
        [(req.user && req.user.username) || '?', action,
         target == null ? null : String(target).slice(0, 200),
         detail == null ? null : String(detail).slice(0, 500)]);
    } catch (e) { try { req.log && req.log.warn({ err: String(e) }, 'audit log failed'); } catch (_) { /* */ } }
  }

  // ---- admin dashboard (gated by the ADMIN_USERS allowlist) ----------------
  app.get('/api/admin/overview', { preHandler: requireAdmin }, async () => ({
    health: { ok: true, uptime: Math.floor(process.uptime()), now: Date.now() },
    ...realtime.adminOverview(),
  }));
  app.post('/api/admin/kick', { preHandler: requireAdmin }, async (req, reply) => {
    const uid = req.body && req.body.uid;
    if (uid == null) return reply.code(400).send({ error: 'uid required' });
    const closed = realtime.kickUser(uid);
    await logAdmin(req, 'kick', uid, 'closed ' + closed);
    return { ok: true, closed };
  });
  app.post('/api/admin/close-room', { preHandler: requireAdmin }, async (req, reply) => {
    const code = req.body && req.body.code;
    if (!code) return reply.code(400).send({ error: 'code required' });
    const closed = realtime.adminCloseRoom(code);
    await logAdmin(req, 'close-room', code);
    return { ok: true, closed };
  });
  // moderation: account + IP bans
  app.get('/api/admin/bans', { preHandler: requireAdmin }, async () => ({ bans: await realtime.listBans() }));
  app.post('/api/admin/ban', { preHandler: requireAdmin }, async (req, reply) => {
    const { kind, value, reason } = req.body || {};
    if ((kind !== 'user' && kind !== 'ip') || !value) return reply.code(400).send({ error: 'kind (user|ip) + value required' });
    await realtime.ban(kind, value, reason);
    await logAdmin(req, 'ban', kind + ':' + value, reason);
    return { ok: true };
  });
  app.post('/api/admin/unban', { preHandler: requireAdmin }, async (req, reply) => {
    const { kind, value } = req.body || {};
    if (!kind || !value) return reply.code(400).send({ error: 'kind + value required' });
    await realtime.unban(kind, value);
    await logAdmin(req, 'unban', kind + ':' + value);
    return { ok: true };
  });
  // broadcast a banner to every connected client
  app.post('/api/admin/broadcast', { preHandler: requireAdmin }, async (req, reply) => {
    const text = req.body && req.body.text;
    if (!text || !String(text).trim()) return reply.code(400).send({ error: 'text required' });
    const msg = String(text).trim().slice(0, 280);
    const sent = realtime.broadcast(msg);
    await logAdmin(req, 'broadcast', 'all(' + sent + ')', msg);
    return { ok: true, sent };
  });
  // match history / leaderboard moderation
  app.get('/api/admin/runs', { preHandler: requireAdmin }, async (req) => {
    const limit = clampInt((req.query && req.query.limit) || 40, 1, 200);
    const r = await pool.query(
      `SELECT r.id, COALESCE(u.username, r.guest_name) AS username, (u.id IS NULL) AS guest,
              r.score, r.stage, r.kills, r.character, r.biome, r.difficulty, r.time_s, r.cleared, r.reaper, r.coop_size, r.created_at
       FROM runs r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT ${limit}`);
    return { rows: r.rows };
  });
  app.post('/api/admin/delete-run', { preHandler: requireAdmin }, async (req, reply) => {
    const id = req.body && req.body.id;
    if (id == null) return reply.code(400).send({ error: 'id required' });
    const rid = clampInt(id, 0, 1e15);
    const r = await pool.query('DELETE FROM runs WHERE id=$1', [rid]);
    await logAdmin(req, 'delete-run', rid);
    return { ok: true, deleted: r.rowCount };
  });

  // round16/7.1: admin feedback inbox (optional ?status filter) + status/note update
  app.get('/api/admin/feedback', { preHandler: requireAdmin }, async (req) => {
    const q = req.query || {};
    const params = [clampInt(q.limit || 100, 1, 500), clampInt(q.offset || 0, 0, 1e6)];
    let where = '';
    if (q.status) { params.push(String(q.status)); where = `WHERE f.status = $3`; }
    const r = await pool.query(
      `SELECT f.id, COALESCE(u.username, f.guest_name, '訪客') AS author, f.category, f.content,
              f.status, f.admin_note, f.created_at, f.image
       FROM feedback f LEFT JOIN users u ON u.id = f.user_id ${where}
       ORDER BY f.created_at DESC LIMIT $1 OFFSET $2`, params);
    return { rows: r.rows };
  });
  app.patch('/api/admin/feedback/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const schema = z.object({
      status: z.enum(['pending', 'reviewing', 'fixed', 'dismissed']).optional(),
      admin_note: z.string().max(500).optional(),
    });
    const p = schema.safeParse(req.body || {});
    if (!p.success) return reply.code(400).send({ error: zodMsg(p.error) });
    const id = parseInt(req.params.id);
    if (!id) return reply.code(400).send({ error: 'invalid id' });
    const sets = [], vals = [id];
    if (p.data.status !== undefined) sets.push(`status = $${vals.push(p.data.status)}`);
    if (p.data.admin_note !== undefined) sets.push(`admin_note = $${vals.push(p.data.admin_note)}`);
    if (!sets.length) return reply.code(400).send({ error: 'nothing to update' });
    sets.push(`updated_at = now()`);
    await pool.query(`UPDATE feedback SET ${sets.join(', ')} WHERE id = $1`, vals);
    await logAdmin(req, 'feedback', id, p.data.status || (p.data.admin_note != null ? 'note' : ''));
    return { ok: true };
  });

  // round16/7.6: admin audit log (newest first, paginated)
  app.get('/api/admin/logs', { preHandler: requireAdmin }, async (req) => {
    const q = req.query || {};
    const r = await pool.query(
      `SELECT id, admin_username, action, target, detail, created_at
       FROM admin_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [clampInt(q.limit || 100, 1, 500), clampInt(q.offset || 0, 0, 1e6)]);
    return { rows: r.rows };
  });

  // round16/7.7: stats dashboard — cheap COUNT aggregates + live numbers. A missing table
  // (e.g. feedback on a pre-migration deploy) degrades that field to 0 rather than 500-ing.
  app.get('/api/admin/stats', { preHandler: requireAdmin }, async () => {
    const count = (sql) => pool.query(sql).then((r) => Number((r.rows[0] && r.rows[0].n) || 0)).catch(() => 0);
    const [users, active24h, runs, runsToday, guestRuns, bans, feedbackPending] = await Promise.all([
      count(`SELECT count(*) n FROM users`),
      count(`SELECT count(*) n FROM users WHERE last_login > now() - interval '24 hours'`),
      count(`SELECT count(*) n FROM runs`),
      count(`SELECT count(*) n FROM runs WHERE created_at >= date_trunc('day', now())`),
      count(`SELECT count(*) n FROM runs WHERE user_id IS NULL`),
      count(`SELECT count(*) n FROM bans`),
      count(`SELECT count(*) n FROM feedback WHERE status = 'pending'`),
    ]);
    const top = await pool.query(
      `SELECT COALESCE(u.username, r.guest_name, '訪客') AS name, max(r.score) AS score
       FROM runs r LEFT JOIN users u ON u.id = r.user_id
       WHERE (u.id IS NOT NULL OR r.guest_name IS NOT NULL)
       GROUP BY 1 ORDER BY score DESC LIMIT 5`).then((r) => r.rows).catch(() => []);
    const ov = realtime.adminOverview();
    return {
      accounts: { total: users, active24h },
      runs: { total: runs, today: runsToday, guest: guestRuns },
      moderation: { activeBans: bans, pendingFeedback: feedbackPending },
      live: { online: ov.totals.users, playing: ov.totals.playing || 0, rooms: ov.totals.rooms },
      topPlayers: top,
    };
  });

  // round16/7.8: single-player inspect (account + lifetime stats + recent runs + ban state)
  app.get('/api/admin/player/:uid', { preHandler: requireAdmin }, async (req, reply) => {
    const uid = parseInt(req.params.uid);
    if (!uid) return reply.code(400).send({ error: 'invalid uid' });
    const u = (await pool.query('SELECT id, username, email, created_at, last_login FROM users WHERE id=$1', [uid])).rows[0];
    if (!u) return reply.code(404).send({ error: 'not found' });
    const agg = (await pool.query('SELECT count(*) AS runs, COALESCE(max(score),0) AS best FROM runs WHERE user_id=$1', [uid])).rows[0] || {};
    const recent = (await pool.query(
      `SELECT id, score, stage, kills, character, biome, difficulty, time_s, cleared, created_at
       FROM runs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [uid])).rows;
    return {
      account: { id: u.id, username: u.username, email: u.email, created_at: u.created_at, last_login: u.last_login },
      stats: { runCount: Number(agg.runs || 0), bestScore: Number(agg.best || 0) },
      recentRuns: recent,
      ban: { user: realtime.isBannedUser(u.username) },
    };
  });

  return app;
}

// ---- production self-boot --------------------------------------------------
if (!process.env.SOULSHARD_NO_LISTEN) {
  const PORT = Number(process.env.PORT || 8787);
  const HOST = process.env.HOST || '0.0.0.0';
  // Fail CLOSED on a weak/placeholder secret regardless of NODE_ENV (a forgotten
  // NODE_ENV must never let a deploy run with forgeable tokens). Local dev opts out
  // explicitly with ALLOW_INSECURE_JWT=1.
  const KNOWN_BAD = new Set(['dev-insecure-secret-change-me', 'change-me-to-a-long-random-string', '']);
  const insecure = KNOWN_BAD.has(JWT_SECRET) || JWT_SECRET.length < 32;
  if (insecure) {
    if (process.env.ALLOW_INSECURE_JWT === '1') {
      console.warn('[warn] JWT_SECRET is insecure — DEV ONLY; every token is forgeable. Never use this in production.');
    } else {
      console.error('[fatal] JWT_SECRET is unset/insecure. Set a strong secret (>=32 random chars), or ALLOW_INSECURE_JWT=1 for local dev only.');
      process.exit(1);
    }
  }
  const { pool, initSchema } = await import('./db.js');
  try {
    await initSchema(pool);
    const app = await buildApp(pool, { logger: true });
    await app.listen({ port: PORT, host: HOST });
    const { attachRealtime } = await import('./wsgw.js');
    attachRealtime(app.server, app.realtime, { jwtSecret: JWT_SECRET, logger: app.log });   // WebSocket co-op gateway on the same port (/rt)
    app.log.info(`Soulshard server on ${HOST}:${PORT} (CORS: ${CORS_ORIGIN.join(', ')}) — realtime co-op at ws path /rt`);
  } catch (err) {
    console.error('[fatal] server failed to start:', err);
    process.exit(1);
  }
}
