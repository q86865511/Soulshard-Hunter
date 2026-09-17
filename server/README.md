# Soulshard Hunter — Cloud Backend (Phase 1 + Phase 2)

Backend for *Soulshard Hunter*. One API process manages REST, WebSocket rooms and isolated authoritative simulation children. R32 remains local implementation work; no deployment has been performed.

- **Phase 1 — cloud foundation** (REST `/api/*`): accounts, cross-device cloud save, shared leaderboard.
- **Realtime co-op** (WebSocket /rt, protocol 2): friends, lobbies, invites, spectators and server-owned simulation for 2–3 players.

Stack: **Node + Fastify + PostgreSQL**, JWT auth (bcryptjs), zod validation, `ws` for the realtime gateway.

> Each room runs the shared game in a separate Node process at 120Hz. Every player, including the lobby owner, is a snapshot client. The original owner retains the existing progression/reward rules; uploaded offline history is not independently verified. See [architecture](../docs/architecture/SERVER_AUTHORITY_R32.md).

## REST endpoints (`/api/*`)

| Method | Path                | Auth | Body / Query                                            |
|--------|---------------------|------|---------------------------------------------------------|
| GET    | `/api/health`       | –    | → `{ ok, time }`                                        |
| POST   | `/api/register`     | –    | `{ username, password, email? }` → `{ token, user }`    |
| POST   | `/api/login`        | –    | `{ username, password }` → `{ token, user }`            |
| GET    | `/api/me`           | ✓    | → `{ user }`                                            |
| GET    | `/api/save`         | ✓    | → `{ meta, saveVersion }` (or `{ meta: null }`)         |
| PUT    | `/api/save`         | ✓    | `{ meta, saveVersion }` (rejects clobbering a newer save)|
| POST   | `/api/runs`         | ✓    | run components → score **recomputed server-side**       |
| GET    | `/api/authority/results` | ✓ | current account’s latest ten cooperative results and save status |
| GET    | `/api/leaderboard`  | –    | `?biome=&difficulty=&character=&period=day\|week&limit=`|
| GET    | `/api/friends`      | ✓    | → `{ friends, incoming, outgoing }`                     |
| POST   | `/api/friends/request` | ✓ | `{ username }` (mutual requests auto-accept)            |
| POST   | `/api/friends/accept`  | ✓ | `{ id }`                                                |
| POST   | `/api/friends/remove` / `decline` / `cancel` | ✓ | `{ id }` (drop the edge)           |
| GET    | `/api/rt/stats`     | –    | → `{ users, conns, rooms }` (realtime liveness)         |

Auth is a Bearer JWT: `Authorization: Bearer <token>`.

**Authority:** cooperative results come only from the server simulation and carry a unique receipt. Client cooperative score uploads are rejected. Solo uploads keep plausibility checks and remain unverified; leaderboard rows expose an authority flag.

## Realtime gateway (`/rt`, WebSocket)

- **Auth on upgrade** via `?token=<JWT>` (browsers can't set headers on a WebSocket). Verified before the socket is accepted.
- Tracks presence, rooms, invites and simulation lifecycle. Owner departure preserves the world. Disconnected avatars remain vulnerable; rejoin within the grace window retains actual health/death state.
- **Hardened:** per-connection token-bucket rate limiting (DB/room/chat tight, gameplay generous), a friend-graph cache, a per-account connection cap, and a global room cap. (`@fastify/rate-limit` only guards HTTP — the WS path has its own limiter.)

Gameplay: client → server input / levelpick with protocol, runId, seq / choiceId; server → clients runstart / snap / levelup / runend / settlement. Authenticated connections bind actor IDs; client world-state messages are ignored. Connect with /rt?protocol=2&token=...&resumeCid=...; old clients receive an update prompt.

## Run locally — Docker (easiest)

```bash
cd server
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))") \
  docker compose up --build
# API + /rt → http://localhost:8787 ,  Postgres → localhost:5432 (persistent `pgdata` volume)
```

Then start the game frontend (`node tools/serve.mjs`, port 5173). The frontend **auto-targets** `http://localhost:8787` for REST and `ws://localhost:8787/rt` for co-op in dev — no config (see `../src/net/api.js` `apiBase()`/`wsBase()`).

## Run locally — without Docker

```bash
createdb soulshard                 # have Postgres running + a DB created
cd server
cp .env.example .env               # edit DATABASE_URL + a STRONG JWT_SECRET (>=32 random chars)
npm install
npm start                          # schema (incl. friendships) auto-creates on boot
```

No Postgres at all? `npm run dev:fakedb` runs the **real** app on an in-memory pool (accounts/friends/saves wiped on restart — **not persistent**, testing only).

## Tests

```bash
npm test          # existing 120 + 65 checks, plus test:authority
npm run check     # node --check all server/src/*.js
```

## How the frontend connects (offline-first)

`src/net/api.js` resolves the backend automatically: **dev** → `http://localhost:8787` (+ `ws://…/rt`); **production** (served same-origin behind Caddy) → relative `/api/...` (+ `wss://<host>/rt`). The JWT is stored in `localStorage`; REST sends it as `Authorization: Bearer`, the WebSocket as `/rt?token=`. Set `CORS_ORIGIN` to your site's URL in production. If the player isn't logged in or the server is unreachable, every cloud call no-ops and the game keeps using local `localStorage` — nothing blocks boot or single-player.

## Deployment

- 🚀 **Full deploy guide (zh-TW):** [`../docs/DEPLOY.md`](../docs/DEPLOY.md) — Oracle VM, domain, SSH, firewalls, Docker, Caddy (`/api` + `/rt`), CI/CD, and an external two-player test.
- **Caddy must proxy BOTH** `handle /api/* { reverse_proxy localhost:8787 }` **and** `handle /rt { reverse_proxy localhost:8787 }` — the WS path is separate from `/api`.
- Pushing to `main` auto-deploys via GitHub Actions ([`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)).
- **Production env(部署前務必設定 `.env`):**
  - `JWT_SECRET` — ≥32 隨機字元,未設定/過弱會拒絕啟動(forgeable-token guard)。
  - `POSTGRES_PASSWORD` — 正式部署設強密碼;docker-compose 的 db 與 `DATABASE_URL` 會一起套用(本地 demo 預設 `soulshard`,僅 compose 內網可達)。
  - `CORS_ORIGIN` — 設成你的站點網域(勿用萬用字元),`ADMIN_USERS` 視需要設定。
- **Runtime:** Node ≥ 22. Keep repository src/ beside server/ for native simulation imports.

## R32 operation and verification

- Sync the owner’s cloud save through the existing account UI before starting; no new automatic pre-start upload is added.
- AUTHORITY_MAX_ROOMS defaults to 2 (range 1–16), with a 256MB heap cap per child. Oracle ARM capacity is unmeasured; lobby count differs from active simulation count.
- Child failure, >2s update backlog or 10s without child messages ends the room. No extra fixed gameplay duration limit is added. Server restarts do not restore in-memory worlds.
- Game results arrive before storage confirmation. A separate settlement message reports the outcome; a 30s timeout releases resources and reports uncertainty, preserving the game result.
- During cooperation, client PUT /api/save returns 409. Settlement uses save CAS and a unique receipt; conflicting results are retained without overwriting or automatically merging newer progress.
- Build from the repo root: `docker build -f server/Dockerfile .`. `cd server && docker compose up --build` uses this context automatically. The image includes server/src and shared src, with production dependencies only.
- Native suite: `npm run test:authority` in server/. SQL tests use dev-only PGlite, not a multi-connection PostgreSQL load test.
- Browser suite: `npm --prefix test run test:authority` from the root after installing both test and server dependencies. It uses ephemeral loopback ports and isolated test accounts.
- Wait for bot batches to finish before running original 5173 integration tests; keep their source worktrees frozen.
