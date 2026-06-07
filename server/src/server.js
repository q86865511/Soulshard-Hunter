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
    if (!p.success) return reply.code(400).send({ error: 'invalid input', detail: p.error.issues });
    const { username, password, email } = p.data;
    const hash = await bcrypt.hash(password, 10);
    try {
      const r = await pool.query(
        'INSERT INTO users(username, email, password_hash) VALUES($1,$2,$3) RETURNING id, username',
        [username, email || null, hash]);
      const user = r.rows[0];
      return { token: sign(user), user: { id: user.id, username: user.username } };
    } catch (e) {
      if (e.code === '23505') return reply.code(409).send({ error: 'username or email already taken' });
      throw e;
    }
  });

  app.post('/api/login', strictLimit, async (req, reply) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid input' });
    const r = await pool.query('SELECT id, username, password_hash FROM users WHERE username=$1', [p.data.username]);
    const u = r.rows[0];
    if (!u || !(await bcrypt.compare(p.data.password, u.password_hash))) {
      return reply.code(401).send({ error: 'bad username or password' });
    }
    await pool.query('UPDATE users SET last_login=now() WHERE id=$1', [u.id]);
    return { token: sign(u), user: { id: u.id, username: u.username } };
  });

  app.get('/api/me', { preHandler: auth }, async (req) => ({ user: req.user }));

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
    const sql = `
      SELECT t.username, t.score, t.stage, t.kills, t.character, t.biome, t.difficulty, t.time_s, t.cleared, t.reaper, t.coop_size, t.created_at FROM (
        SELECT DISTINCT ON (r.user_id) u.username, r.score, r.stage, r.kills, r.character, r.biome,
               r.difficulty, r.time_s, r.cleared, r.reaper, r.coop_size, r.created_at, r.user_id
        FROM runs r JOIN users u ON u.id = r.user_id
        ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
        ORDER BY r.user_id, r.score DESC
      ) t
      ORDER BY t.score DESC
      LIMIT ${limit}`;
    const r = await pool.query(sql, args);
    return { rows: r.rows };
  });

  // ---- Phase 2: social (friends) + realtime co-op gateway -------------------
  // The friend REST routes are testable via inject(); the realtime gateway is a
  // socket-less object here (attached to the live HTTP server post-listen, below).
  const realtime = new Realtime(pool);
  registerSocial(app, pool, auth, { onFriendChange: (a, b) => realtime.onFriendChange(a, b) });
  app.realtime = realtime;
  app.get('/api/rt/stats', async () => realtime.stats());

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
