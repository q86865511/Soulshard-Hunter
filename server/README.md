# Soulshard Hunter — Cloud Backend (Phase 1)

Accounts + cloud save + a shared leaderboard for *Soulshard Hunter*. This is
**Phase 1** of [`../docs/MULTIPLAYER_PLAN.md`](../docs/MULTIPLAYER_PLAN.md) — the
cloud foundation. Realtime co-op (Phase 2) reuses this same service.

Stack: **Node + Fastify + PostgreSQL**, JWT auth (bcryptjs), zod input
validation, server-authoritative leaderboard scoring.

## Endpoints

| Method | Path                | Auth | Body / Query                                            |
|--------|---------------------|------|---------------------------------------------------------|
| GET    | `/api/health`       | –    | –                                                       |
| POST   | `/api/register`     | –    | `{ username, password, email? }` → `{ token, user }`    |
| POST   | `/api/login`        | –    | `{ username, password }` → `{ token, user }`            |
| GET    | `/api/me`           | ✓    | → `{ user }`                                            |
| GET    | `/api/save`         | ✓    | → `{ meta, saveVersion }` (or `{ meta: null }`)         |
| PUT    | `/api/save`         | ✓    | `{ meta, saveVersion }`                                 |
| POST   | `/api/runs`         | ✓    | run components → score is **recomputed server-side**    |
| GET    | `/api/leaderboard`  | –    | `?biome=&difficulty=&character=&period=day|week&limit=` |

Auth is a Bearer JWT: `Authorization: Bearer <token>`.

**Anti-cheat:** `/api/runs` ignores any client-claimed score and recomputes it
from `kills/stage/time_s/difficulty/reaper` (same formula as the game), with
per-field caps. Solo scores are still client-reported components, so caps + rate
limits apply; Phase 2 co-op scores come straight from the authoritative server.

## Run locally (Docker — easiest)

```bash
cd server
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  docker compose up --build
# API → http://localhost:8787 ,  Postgres → localhost:5432
```

Then start the game frontend as usual (`node tools/serve.mjs`, port 5173). The
frontend auto-targets `http://localhost:8787` in dev (see `src/net/api.js`).

## Run locally (without Docker)

```bash
# 1) have a Postgres running and a database created
createdb soulshard
# 2) configure + start
cd server
cp .env.example .env        # edit DATABASE_URL + JWT_SECRET
npm install
npm start                    # schema auto-creates on boot
```

## Smoke test

```bash
curl localhost:8787/api/health
curl -X POST localhost:8787/api/register -H 'content-type: application/json' \
  -d '{"username":"tester","password":"hunter123"}'
# → {"token":"...","user":{...}}  — use the token as Bearer for /api/save and /api/runs
```

Cloud deployment (Oracle OCI) is documented in
[`../docs/DEPLOY_ORACLE.md`](../docs/DEPLOY_ORACLE.md).
