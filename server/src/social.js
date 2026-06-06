// Friend graph for the Phase 2 social layer (add / accept / remove + list).
// Mutations go through REST (testable, simple); the realtime gateway pushes live
// friend+presence updates over WS after any change via the `hooks.onFriendChange`
// callback (wired in server.js so the other party sees it instantly if online).
//
// Edge model (see db.js): one directed row per edge. An accepted friendship is the
// pair of 'accepted' rows (A->B, B->A); a request is a single 'pending' row.
import { z } from 'zod';

// ---- queries (exported so the realtime gateway can read the same graph) ------
export async function friendGraph(pool, uid) {
  const [friends, incoming, outgoing] = await Promise.all([
    pool.query(`SELECT u.id, u.username FROM friendships f JOIN users u ON u.id = f.friend_id
                WHERE f.user_id = $1 AND f.status = 'accepted' ORDER BY u.username`, [uid]),
    pool.query(`SELECT u.id, u.username FROM friendships f JOIN users u ON u.id = f.user_id
                WHERE f.friend_id = $1 AND f.status = 'pending' ORDER BY u.username`, [uid]),
    pool.query(`SELECT u.id, u.username FROM friendships f JOIN users u ON u.id = f.friend_id
                WHERE f.user_id = $1 AND f.status = 'pending' ORDER BY u.username`, [uid]),
  ]);
  const map = (r) => r.rows.map((x) => ({ id: String(x.id), username: x.username }));
  return { friends: map(friends), incoming: map(incoming), outgoing: map(outgoing) };
}

async function edgeStatus(pool, a, b) {
  const r = await pool.query('SELECT status FROM friendships WHERE user_id=$1 AND friend_id=$2', [a, b]);
  return r.rows[0] ? r.rows[0].status : null;
}

// ---- mutations -------------------------------------------------------------
// request(me, username): returns { status:'pending'|'accepted', friend } or throws {code}
export async function requestFriend(pool, me, username) {
  const ur = await pool.query('SELECT id, username FROM users WHERE username=$1', [username]);
  const target = ur.rows[0];
  if (!target) { const e = new Error('no such user'); e.code = 404; throw e; }
  const tid = String(target.id);
  if (tid === String(me)) { const e = new Error('cannot add yourself'); e.code = 400; throw e; }
  const mine = await edgeStatus(pool, me, tid);
  if (mine === 'accepted') { const e = new Error('already friends'); e.code = 409; throw e; }
  const theirs = await edgeStatus(pool, tid, me);
  if (theirs === 'accepted') {   // they already list me (shouldn't happen w/o mine) — normalise
    await acceptInternal(pool, me, tid);
    return { status: 'accepted', friend: { id: tid, username: target.username } };
  }
  if (theirs === 'pending') {    // they invited me first → accept mutually
    await acceptInternal(pool, me, tid);
    return { status: 'accepted', friend: { id: tid, username: target.username } };
  }
  // create / keep my pending request
  await pool.query(`INSERT INTO friendships(user_id, friend_id, status) VALUES($1,$2,'pending')
                    ON CONFLICT (user_id, friend_id) DO NOTHING`, [me, tid]);
  return { status: 'pending', friend: { id: tid, username: target.username } };
}

// accept(me, requesterId): promote the requester->me pending row + mirror it.
async function acceptInternal(pool, me, requesterId) {
  await pool.query(`UPDATE friendships SET status='accepted' WHERE user_id=$1 AND friend_id=$2`, [requesterId, me]);
  await pool.query(`INSERT INTO friendships(user_id, friend_id, status) VALUES($1,$2,'accepted')
                    ON CONFLICT (user_id, friend_id) DO UPDATE SET status='accepted'`, [me, requesterId]);
}
export async function acceptFriend(pool, me, requesterId) {
  const st = await edgeStatus(pool, requesterId, me);
  if (st !== 'pending' && st !== 'accepted') { const e = new Error('no pending request'); e.code = 404; throw e; }
  await acceptInternal(pool, me, requesterId);
  return { ok: true };
}

// remove(me, other): drop both directed rows — covers unfriend, decline, cancel.
export async function removeFriend(pool, me, otherId) {
  await pool.query('DELETE FROM friendships WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)', [me, otherId]);
  return { ok: true };
}

// ---- REST wiring -----------------------------------------------------------
const nameSchema = z.object({ username: z.string().min(1).max(40) });
const idSchema = z.object({ id: z.union([z.string(), z.number()]).transform((v) => String(v)) });

// hooks.onFriendChange(uidA, uidB) is invoked after every successful mutation so the
// realtime gateway can re-push friend lists to whichever party is online.
export function registerSocial(app, pool, auth, hooks = {}) {
  const fire = (a, b) => { try { hooks.onFriendChange && hooks.onFriendChange(String(a), String(b)); } catch (e) { /* */ } };
  const rl = { preHandler: auth, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

  app.get('/api/friends', { preHandler: auth }, async (req) => friendGraph(pool, req.user.uid));

  app.post('/api/friends/request', rl, async (req, reply) => {
    const p = nameSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid input' });
    try {
      const r = await requestFriend(pool, req.user.uid, p.data.username);
      fire(req.user.uid, r.friend.id);
      return r;
    } catch (e) { return reply.code(e.code >= 400 && e.code < 500 ? e.code : 500).send({ error: e.message }); }
  });

  app.post('/api/friends/accept', rl, async (req, reply) => {
    const p = idSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid input' });
    try { const r = await acceptFriend(pool, req.user.uid, p.data.id); fire(req.user.uid, p.data.id); return r; }
    catch (e) { return reply.code(e.code >= 400 && e.code < 500 ? e.code : 500).send({ error: e.message }); }
  });

  // decline an incoming request / cancel an outgoing one / unfriend — all are "drop the edge"
  const drop = async (req, reply) => {
    const p = idSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: 'invalid input' });
    await removeFriend(pool, req.user.uid, p.data.id);
    fire(req.user.uid, p.data.id);
    return { ok: true };
  };
  app.post('/api/friends/remove', rl, drop);
  app.post('/api/friends/decline', rl, drop);
  app.post('/api/friends/cancel', rl, drop);
}
