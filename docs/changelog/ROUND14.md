# Round 14 — admin suite: bans (account + IP) · broadcast · match-history / leaderboard moderation

Expands the round-13 admin dashboard into a full moderation console, and fixes a deploy
gotcha (browsers serving stale JS after an update).

## Stale-JS fix (why the 🛠 button "didn't appear")
The admin button + `refreshMe()` shipped in round 13, but browsers cache the no-build ES
modules, so players keep running the old `.js` until the cache expires (a hard refresh shows
it). Fixed at the source: the Caddyfile static `handle` now sends `Cache-Control "no-cache"`
(`docs/DEPLOY.md`), so every future deploy is picked up on the next load without a hard refresh.
*(Existing deployments: update the Caddyfile once + `sudo systemctl reload caddy`.)*

## Player management — bans (#2)
- DB: new `bans` table (`kind 'user'|'ip'`, `value`, `reason`); `db.js` creates it.
- `realtime.js`: in-memory `bannedUsers`/`bannedIps` (loaded at boot via `loadBans()`),
  `ban()/unban()/listBans()/isBannedUser()/isBannedIp()` + `kickUserByName()/kickByIp()`.
  Banning a live target also disconnects their sockets. The WS gateway (`wsgw.js`) captures
  the real client IP (X-Forwarded-For behind Caddy) onto each connection.
- Enforcement: banned **account** → `/api/login` 403; banned **IP** → `/api/register`,
  `/api/runs/guest`, and the WS upgrade all 403/reject.
- Endpoints (`requireAdmin`): `GET /api/admin/bans`, `POST /api/admin/ban {kind,value,reason}`,
  `POST /api/admin/unban {kind,value}`.

## Broadcast (#3)
`POST /api/admin/broadcast {text}` → `realtime.broadcast()` pushes a `{t:'broadcast'}` to every
connected client; clients show it as a 📢 公告 banner (`net/ui.js` `RT.on('broadcast')`).

## Match history / leaderboard moderation (#3)
`GET /api/admin/runs?limit=` (recent runs incl. guests) + `POST /api/admin/delete-run {id}`
(remove cheated/garbage entries from the shared leaderboard).

## Admin UI (`net/ui.js`)
The 🛠 management overlay is now **tabbed**: **總覽** (status + online + rooms) · **玩家**
(online players with 踢出 / 封帳號 / 封IP, rooms with 關閉, a 封鎖名單 with 解除, and a manual
ban row) · **對局** (recent runs with 刪除) · **廣播** (send a server-wide announcement).
`api.js` gains `adminBans/adminBan/adminUnban/adminBroadcast/adminRuns/adminDeleteRun`.

## Verification
- `server/test/smoke.mjs` **48/48** (+11: ban add/list/unban + login-enforcement, invalid-kind
  400, broadcast accept/400, run history rows, delete-run, non-admin 403s); `social.smoke.mjs` 65/65.
- Client verified in-browser: all 4 tabs render; players tab shows kick/ban/IP-ban + ban list +
  manual ban; 0 console errors.

## Deploy robustness
`.github/workflows/deploy.yml` health check now **retries for ~30s** (was a single `curl` after
`sleep 4`) and dumps `docker compose logs api` on failure — a `--build` rebuild + db-healthcheck
wait can exceed 4s and falsely fail an otherwise-good deploy (it flaked once this round).

