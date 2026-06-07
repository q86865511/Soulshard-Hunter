# Round 13 — admin dashboard (server status · online players · ops)

A management console for the operator: live server status, who's online, and moderation
operations (kick a player, close a room). Gated by an account allowlist.

## Server (`server/`)
- **Admin role** = an env allowlist, no DB change: `ADMIN_USERS` (comma-separated usernames).
  `isAdmin(username)` is checked against the **JWT-verified** username, so it can't be spoofed.
  `requireAdmin` preHandler = valid token AND allowlisted (else 403). `/api/login`,
  `/api/register` and `/api/me` now return `user.admin`.
- **Endpoints** (all `requireAdmin`):
  - `GET /api/admin/overview` → `{ health:{uptime}, totals:{users,conns,rooms}, online:[{uid,username,conns,rooms}], rooms:[roomPublic + runEnded] }`.
  - `POST /api/admin/kick {uid}` → disconnect all of that account's sockets (`realtime.kickUser`).
  - `POST /api/admin/close-room {code}` → force-close a room (`realtime.adminCloseRoom` → `_closeRoom`).
- `realtime.js` gains `adminOverview()` / `kickUser()` / `adminCloseRoom()` (read from the
  existing `byUid`/`byCid`/`rooms` maps — the relay already tracks everything).

## Client (`src/net/`)
- `api.js`: `Net.isAdmin()`, `Net.refreshMe()` (refreshes the admin flag for a returning
  session), `adminOverview/adminKick/adminCloseRoom`.
- `ui.js`: a **🛠 管理** button in the account bar (only when `Net.isAdmin()`), opening the
  **管理者主控台** overlay — live status line, an online-players table (with 踢出), a rooms
  table (status / members / host♛ / spectator觀, with 關閉), auto-refreshing every 4s. Uses
  the round-12 polished theme.

## Setup
Set `ADMIN_USERS=yourname` in `server/.env` (see `.env.example` / `docs/DEPLOY.md` §5b),
log in with that account → the 🛠 管理 button appears bottom-right.

## Verification
- `server/test/smoke.mjs` **37/37** (+8: `/api/me` admin flag for admin vs normal, overview
  401/403/200 + shape, kick offline → 0, close missing → false, kick as non-admin → 403);
  `social.smoke.mjs` 65/65.
- Client verified in-browser: the overlay renders the status line + both tables + kick/close
  buttons (mocked admin session); game boots with 0 console errors.
