# Round 10 — Co-op resilience (host transfer · reconnect · spectate) + server score authority

Builds on the Round-7 **host-authoritative relay** co-op. The sim still runs only in the
host's browser; the server stays a dumb relay. These four features make a live session
survive disconnects and let outsiders watch, and harden the leaderboard against fabricated
runs. All additive — **single-player (`this.coop` null) is unchanged**.

## 1. 房主轉移 (pragmatic host transfer)
The authoritative sim lives only in the host browser, so *seamless* mid-run takeover would
need a full combat save/restore (deferred — that's work-item D). Instead: **the room no
longer dies when the host leaves.**
- `realtime.js _migrateHost()` promotes the oldest still-connected **player** (never a
  spectator); the dead run ends (`started=false`) and the party drops to a **shared lobby**
  under the new host to restart immediately. Lobby host-leave migrates too (stays in lobby).
- If only spectators/husks remain, the room is closed (`_closeRoom`, clears held rejoins).
- Client: `coop.js` shows a "房主已離線 / 已指派新房主" overlay → returns to the same room's
  lobby (`_keepRoom` so `exit()` doesn't release the room).

## 2. 局中斷線重連 (in-run reconnect)
- On an in-run drop, `onClose` → `_holdForRejoin` keeps the member slot for
  `REJOIN_GRACE_MS` (20s), **keyed per-slot by the socket cid** (one account can hold >1
  slot — the self-coop two-tabs case), carrying the uid.
- A reconnecting socket (`onConnect` → `_tryRejoin`) scans for that uid's held slot,
  re-keys it to the new cid, and sends a lightweight **`resume`** (the scene is still alive
  across a WS blip — no fresh `runstart`). Host re-attaches the avatar via `peer:rejoin`
  (`coophost.reattach`, preserving combat-death vs disconnect-freeze).
- **房主重連**: a host blip sends players `host:waiting` (they pause the snap-silence bail);
  host reconnect → `host:back` + broadcasting resumes. `wsgw.js` calls `realtime.sweep()` on
  the heartbeat to expire grace windows (→ migration).

## 3. 中途觀戰 (spectator)
- `room:spectate` joins even a **started** room as a no-avatar watcher (capped, excluded
  from the player count and the avatar roster). The server caches the `runstart` map blob
  and replays it; snapshots already flow to all non-host members. Spectator input is
  dropped at the relay. Client: free camera (Tab cycles target), spectator HUD, no input.

## 4. solo 分數搬伺服器算 (server score authority + anti-cheat)
The leaderboard score was already recomputed server-side (claimed score ignored). Added
`runPlausibility()` on `/api/runs` (HTTP **422** on fail): rejects impossible kill counts
(scaled by party size), clears before the 20:00 boss, reaper-without-clear, and
out-of-range stage. `run.js` now **report-caps `run.stage` at `BALANCE.THREAT_CEIL` (13)**
so legit clear+reaper runs (threat keeps climbing on the Reaper past 20:00) aren't
false-rejected; the server gate keeps headroom (`MAX_STAGE` 20).

## Verification
- Server: `server/test/smoke.mjs` **24/24** (+ anti-cheat + stage-clamp regression),
  `server/test/social.smoke.mjs` **65/65** (+ spectator, reconnect grace, host migration,
  per-slot rejoin, migrate-to-lobby resume).
- Built server-first (the `Realtime` class is socket-agnostic / unit-tested), then a
  **4-dimension adversarial review workflow** (server lifecycle · protocol consistency ·
  guest state-machine · host + single-player regression) → **12 confirmed fixes applied**
  (per-slot rejoin keying, spectator-not-host, migrate-to-lobby resume, stage clamp, …).
- Frontend: boots clean (0 errors) and `__DBG.coopRoundTrip()` passes on the new code.

## New wire messages (server → client)
`resume {you,hostCid,started,role,room}` · `host:waiting` · `host:back` ·
`host:migrated {hostCid,reason,wasStarted}` · `room:host {hostCid}` ·
`peer:rejoin {cid,prevCid,uid}`. Client → server: `room:spectate {code}`.
