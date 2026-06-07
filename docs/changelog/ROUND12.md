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

## Part B — room-based maps + hidden-room rework (#8 + #6) ✅
The core loop is VS-style **open-arena survival**, so this is an *additive* layer (no dungeon
rewrite that would break swarm/boss/spawn) — verified by a 3000-frame headless autoplay (no
crash, swarm + threat ramp intact).

- **More rooms (#8)**: `maps.js generateWorld` now carves **many more, size-varied enclosure
  chambers** (≈16–20, doorways kept; `sealUnreachable` still guarantees connectivity) so the
  map reads as a warren of large/small rooms with higher randomness.
- **Guardians + keys + locked vault (#8)**: each map spawns ~2 **room guardians** (beefy
  elites, weaker than a mini-boss; `e.guardian`) that drop a **🔑 key + chest** on death
  (`world.dropLoot`). A **locked vault chest** (`{locked:true}`) needs a key to open
  (`world.keys`, spent in `pickup.js`). New `key` pickup type + `pickup_key` sprite (art/core.js).
- **Hidden rooms reworked (#6)**: now **genuinely hidden** — ≤1 per map (~55%), the marker is
  **invisible until you walk up to it** ("✦ 發現隱藏房間"), and the reward is **SAVE-PERMANENT,
  once per save** (permanent gold / content unlock / 開發者彩蛋), tracked in `META.hidden.claimed`
  — no more per-run buffs. `content/hidden.js` rewritten (vault/archive/relic/egg).
- Verified in-browser: guardian death → key dropped → collected (`keys` 1) → locked vault
  opens (`keys` 0); hidden room discovered on approach → claim banks +gold permanently →
  second claim refused (once-per-save). 0 console errors.

## Part C — UI/UX polish (#9) — pending
