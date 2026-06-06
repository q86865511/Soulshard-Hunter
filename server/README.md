# Soulshard Hunter — Cloud Backend (Phase 1 + Phase 2)

Backend for *Soulshard Hunter*. **One Node process** serves both:

- **Phase 1 — cloud foundation** (REST `/api/*`): accounts, cross-device cloud save, shared leaderboard.
- **Phase 2 — realtime co-op** (WebSocket `/rt`): friends, lobby/rooms, invites, and a **dumb message relay** for 1–3-player co-op.

Stack: **Node + Fastify + PostgreSQL**, JWT auth (bcryptjs), zod validation, `ws` for the realtime gateway.

> **Co-op is host-authoritative relay**, not server-authoritative: one player's *browser* runs the real game sim and broadcasts world snapshots; this server only relays `input` (guest→host) and `snap`/`runstart`/`runend` (host→guests). The server never simulates — so it stays light enough for the OCI free tier.

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
| GET    | `/api/leaderboard`  | –    | `?biome=&difficulty=&character=&period=day\|week&limit=`|
| GET    | `/api/friends`      | ✓    | → `{ friends, incoming, outgoing }`                     |
| POST   | `/api/friends/request` | ✓ | `{ username }` (mutual requests auto-accept)            |
| POST   | `/api/friends/accept`  | ✓ | `{ id }`                                                |
| POST   | `/api/friends/remove` / `decline` / `cancel` | ✓ | `{ id }` (drop the edge)           |
| GET    | `/api/rt/stats`     | –    | → `{ users, conns, rooms }` (realtime liveness)         |

Auth is a Bearer JWT: `Authorization: Bearer <token>`.

**Anti-cheat:** `/api/runs` ignores any client-claimed score and recomputes it from `kills/stage/time_s/difficulty/reaper` (same formula as the game), with per-field caps. Co-op uploads carry `coop_size`.

## Realtime gateway (`/rt`, WebSocket)

- **Auth on upgrade** via `?token=<JWT>` (browsers can't set headers on a WebSocket). Verified before the socket is accepted.
- Tracks **presence** (online friends), **rooms/lobby** (≤3 players, host-leaves-closes), **invites** (friend-gated), and relays gameplay messages. The server holds **no game state** beyond room membership.
- **Hardened:** per-connection token-bucket rate limiting (DB/room/chat tight, gameplay generous), a friend-graph cache, a per-account connection cap, and a global room cap. (`@fastify/rate-limit` only guards HTTP — the WS path has its own limiter.)

Message types (client↔server, JSON): `room:create|join|leave|ready|build|cfg|start` · `invite` · `chat` · `input` (guest→host) · `snap`/`runstart`/`runend`/`levelup` (host→guests) · `levelpick` (guest→host) · `friends`/`presence`/`room:state`/`start`/`peer:left`.

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
npm test          # test/smoke.mjs (18: accounts/save/leaderboard) + test/social.smoke.mjs (33: friends/rooms/relay/rate-limit)
npm run check     # node --check all server/src/*.js
```

## How the frontend connects (offline-first)

`src/net/api.js` resolves the backend automatically: **dev** → `http://localhost:8787` (+ `ws://…/rt`); **production** (served same-origin behind Caddy) → relative `/api/...` (+ `wss://<host>/rt`). The JWT is stored in `localStorage`; REST sends it as `Authorization: Bearer`, the WebSocket as `/rt?token=`. Set `CORS_ORIGIN` to your site's URL in production. If the player isn't logged in or the server is unreachable, every cloud call no-ops and the game keeps using local `localStorage` — nothing blocks boot or single-player.

## Deployment

- 🚀 **First-time, explained walkthrough (zh-TW):** [`../docs/DEPLOY_GUIDE.zh-TW.md`](../docs/DEPLOY_GUIDE.zh-TW.md) — Oracle VM, domain, SSH, firewalls, Docker, Caddy (`/api` + `/rt`), CI/CD, and an external two-player test.
- **Reference steps:** [`../docs/DEPLOY_ORACLE.md`](../docs/DEPLOY_ORACLE.md) ([中文](../docs/DEPLOY_ORACLE.zh-TW.md)).
- **Caddy must proxy BOTH** `handle /api/* { reverse_proxy localhost:8787 }` **and** `handle /rt { reverse_proxy localhost:8787 }` — the WS path is separate from `/api`.
- Pushing to `main` auto-deploys via GitHub Actions ([`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)).
