// PostgreSQL pool + idempotent schema bootstrap.
// Save data is stored as a whole-blob JSONB (mirrors state.js META); the
// leaderboard is a normalised `runs` table. See docs/MULTIPLAYER_PLAN.md.
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://soulshard:soulshard@localhost:5432/soulshard',
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});

// Create tables + indexes if they don't exist (safe to run on every boot).
export async function initSchema(p = pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            bigserial PRIMARY KEY,
      username      text UNIQUE NOT NULL,
      email         text UNIQUE,
      password_hash text NOT NULL,
      created_at    timestamptz DEFAULT now(),
      last_login    timestamptz
    );

    CREATE TABLE IF NOT EXISTS saves (
      user_id      bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      meta         jsonb NOT NULL,
      save_version int  NOT NULL,
      updated_at   timestamptz DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS runs (
      id          bigserial PRIMARY KEY,
      user_id     bigint REFERENCES users(id) ON DELETE CASCADE,   -- NULL for anonymous guest submissions
      guest_name  text,                                            -- display name for a guest run (user_id NULL)
      score       int  NOT NULL,
      stage       int,
      kills       int,
      character   text,
      biome       text,
      difficulty  int,
      time_s      int,
      cleared     bool,
      reaper      bool,
      coop_size   int DEFAULT 1,
      created_at  timestamptz DEFAULT now()
    );
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS guest_name text;     -- migrate existing deployments
    -- R18/B6: run mode (standard / endless / daily). Existing rows take the DEFAULT 'normal'
    -- so old leaderboard queries (which now default to mode='normal') stay byte-identical.
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS mode          text NOT NULL DEFAULT 'normal';   -- 'normal' | 'endless' | 'daily'
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS challenge_key text;                              -- 'YYYYMMDD' for daily, else NULL

    CREATE INDEX IF NOT EXISTS runs_score_idx       ON runs (score DESC);
    CREATE INDEX IF NOT EXISTS runs_biome_diff_idx  ON runs (biome, difficulty, score DESC);
    CREATE INDEX IF NOT EXISTS runs_user_idx        ON runs (user_id, score DESC);
    CREATE INDEX IF NOT EXISTS runs_mode_score_idx  ON runs (mode, score DESC);
    CREATE INDEX IF NOT EXISTS runs_daily_idx       ON runs (challenge_key, score DESC) WHERE challenge_key IS NOT NULL;

    -- Friend graph (Phase 2 social layer). One directed row per edge:
    --   (user_id -> friend_id, 'pending')  = user_id sent a request to friend_id
    --   accepting writes the mirror row so an accepted friendship is two 'accepted' rows.
    -- "my friends"   = rows where user_id=me AND status='accepted'
    -- "my incoming"  = rows where friend_id=me AND status='pending'
    -- "my outgoing"  = rows where user_id=me  AND status='pending'
    CREATE TABLE IF NOT EXISTS friendships (
      user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status     text   NOT NULL DEFAULT 'pending',     -- 'pending' | 'accepted'
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (user_id, friend_id)
    );
    CREATE INDEX IF NOT EXISTS friendships_friend_idx ON friendships (friend_id, status);

    -- admin moderation: account + IP bans
    CREATE TABLE IF NOT EXISTS bans (
      id         bigserial PRIMARY KEY,
      kind       text NOT NULL,            -- 'user' (lowercased username) | 'ip'
      value      text NOT NULL,
      reason     text,
      created_at timestamptz DEFAULT now(),
      UNIQUE (kind, value)
    );

    -- player feedback (round 16 / 7.1): submitted from the in-town ESC menu; no login required
    CREATE TABLE IF NOT EXISTS feedback (
      id          bigserial PRIMARY KEY,
      user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
      guest_name  text,
      category    text NOT NULL,
      content     text NOT NULL,
      status      text NOT NULL DEFAULT 'pending',   -- 'pending' | 'reviewing' | 'fixed' | 'dismissed'
      admin_note  text,
      created_at  timestamptz DEFAULT now(),
      updated_at  timestamptz DEFAULT now()
    );
    ALTER TABLE feedback ADD COLUMN IF NOT EXISTS image text;   -- round16 #4: optional attached screenshot (data: URL), migrate existing deployments
    CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback (status, created_at DESC);

    -- admin audit log (round 16 / 7.6): every admin mutation leaves a trail
    CREATE TABLE IF NOT EXISTS admin_logs (
      id             bigserial PRIMARY KEY,
      admin_username text NOT NULL,
      action         text NOT NULL,        -- 'kick' | 'ban' | 'unban' | 'close-room' | 'broadcast' | 'delete-run' | 'feedback'
      target         text,                 -- affected object (uid / username / ip / room code / run id)
      detail         text,                 -- reason / truncated message / status change
      created_at     timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS admin_logs_time_idx ON admin_logs (created_at DESC);

    -- P1-3: anonymous product telemetry. A whitelist of gameplay-funnel events, batched
    -- from POST /api/metrics. NO user id / IP / UA / free text — sid is a client-random
    -- session token only; props is a whitelisted, capped JSONB blob. Purged after
    -- METRICS_RETENTION_DAYS (default 90) by server.js.
    CREATE TABLE IF NOT EXISTS events (
      id         bigserial PRIMARY KEY,
      sid        text NOT NULL,
      v          text NOT NULL,
      name       text NOT NULL,
      props      jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS events_name_time_idx ON events (name, created_at DESC);
    CREATE INDEX IF NOT EXISTS events_sid_idx       ON events (sid);
  `);
}
