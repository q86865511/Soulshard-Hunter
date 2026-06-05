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

// ---- validation schemas ---------------------------------------------------
const registerSchema = z.object({
  username: z.string().min(3).max(24).regex(/^[A-Za-z0-9_]+$/, 'letters, digits, underscore only'),
  password: z.string().min(6).max(72),   // bcrypt silently truncates beyond 72 bytes — cap so the whole password counts
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
});

const strictLimit = { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } };          // auth
const saveLimit = { preHandler: auth, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };   // cloud save (client debounces at ~24/min)
const runLimit = { preHandler: auth, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };    // leaderboard upload

// ---- app factory ----------------------------------------------------------
export async function buildApp(pool, { logger = false, rateMax = 120 } = {}) {
  const app = Fastify({ logger, bodyLimit: 1_500_000 });   // save blobs can be ~100KB+
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
       WHERE COALESCE((saves.meta->>'savedAt')::bigint, 0) <= COALESCE(($2->>'savedAt')::bigint, 0)`,
      [req.user.uid, p.data.meta, p.data.saveVersion]);
    return { ok: true, applied: r.rowCount > 0 };
  });

  // leaderboard upload — score recomputed server-side (claimed score ignored)
  app.post('/api/runs', runLimit, async (req, reply) => {
    const p = runSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid run payload', detail: p.error.issues });
    const c = p.data;
    const score = computeScore(c);
    const r = await pool.query(
      `INSERT INTO runs(user_id, score, stage, kills, character, biome, difficulty, time_s, cleared, reaper)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, score, created_at`,
      [req.user.uid, score, c.stage, c.kills, c.character || null, c.biome || null, c.difficulty, c.time_s, !!c.cleared, !!c.reaper]);
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
    const sql = `
      SELECT u.username, r.score, r.stage, r.kills, r.character, r.biome,
             r.difficulty, r.time_s, r.cleared, r.reaper, r.coop_size, r.created_at
      FROM runs r JOIN users u ON u.id = r.user_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY r.score DESC
      LIMIT ${limit}`;
    const r = await pool.query(sql, args);
    return { rows: r.rows };
  });

  return app;
}

// ---- production self-boot --------------------------------------------------
if (!process.env.SOULSHARD_NO_LISTEN) {
  const PORT = Number(process.env.PORT || 8787);
  const HOST = process.env.HOST || '0.0.0.0';
  const insecure = JWT_SECRET === 'dev-insecure-secret-change-me' || JWT_SECRET.length < 32;
  if (insecure) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_INSECURE_JWT !== '1') {
      console.error('[fatal] JWT_SECRET is unset/insecure in production. Set a strong secret (>=32 chars), or ALLOW_INSECURE_JWT=1 to override.');
      process.exit(1);
    }
    console.warn('[warn] JWT_SECRET is insecure — OK for local dev, NEVER for production.');
  }
  const { pool, initSchema } = await import('./db.js');
  try {
    await initSchema(pool);
    const app = await buildApp(pool, { logger: true });
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Soulshard server on ${HOST}:${PORT} (CORS: ${CORS_ORIGIN.join(', ')})`);
  } catch (err) {
    console.error('[fatal] server failed to start:', err);
    process.exit(1);
  }
}
