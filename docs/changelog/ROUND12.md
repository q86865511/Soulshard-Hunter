# Round 12 — guest leaderboard, hidden-room rework, room-based maps, UI polish

A multi-part request done as one round (committed/deployed in pieces). Sections are added
as each part lands.

## Part A — 訪客模式排行榜 (guest leaderboard) ✅
Guests (not logged in) could already **view** the public leaderboard; now they can also
**upload** with a self-entered name.

- **Server** (`server/`): `runs.user_id` is nullable + a new `guest_name` column
  (`db.js`, with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to migrate live deployments).
  New `POST /api/runs/guest` (no auth, tight per-IP rate limit, same `runPlausibility`
  anti-cheat gate, server-recomputed score; sanitised 1–16-char name). The leaderboard
  query is now a `LEFT JOIN` that coalesces `username = COALESCE(u.username, guest_name)`,
  dedupes best-per-identity (user id OR lowercased guest name), and returns a `guest` flag.
- **Client**: `Net.postGuestRun()` (`net/api.js`); `state.bankRun()` stashes the finished
  run's components in `lastGuestRun` when logged out; the leaderboard overlay shows a
  「訪客模式 — 輸入暱稱上傳」 row (`net/ui.js`). Also fixed the overlay's stale `BIOME_LABELS`
  (5 → all 10 biomes).
- **Tests**: `server/test/smoke.mjs` 29/29 (+5: guest accept/score, no-name 400, anti-cheat
  422, guest row on board flagged `guest`, registered+guest coexist). Client verified
  in-browser: guest leaderboard overlay + named-upload row render (0 console errors).

## Part B — hidden-room rework + room-based maps (#6 + #8) — in progress
## Part C — UI/UX polish (#9) — pending
