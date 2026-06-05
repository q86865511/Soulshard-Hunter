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
      user_id     bigint REFERENCES users(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS runs_score_idx       ON runs (score DESC);
    CREATE INDEX IF NOT EXISTS runs_biome_diff_idx  ON runs (biome, difficulty, score DESC);
    CREATE INDEX IF NOT EXISTS runs_user_idx        ON runs (user_id, score DESC);
  `);
}
