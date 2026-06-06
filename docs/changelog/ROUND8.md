# Round 8 — Multi-agent bug / UX audit + fixes

A full-codebase quality pass: a **57-agent Workflow** swept 11 subsystem dimensions
(core loop · world/combat · player/progression · content data · content meta · gen
content · hub UX · engine · co-op client · server · state/balance), each finding
**adversarially re-verified** by an independent agent, plus a **live play-test** driving
the real game in-browser (full run lifecycle, finale → clear → reaper banking, every hub
panel, results screen, co-op snapshot round-trip).

Result: **44 candidate findings → 26 survived verification.** Each was then independently
re-confirmed against the source before fixing. **No fix touches `src/game/content/gen/*`**
(no re-integration revert risk). Every change was re-verified by reload + manual sim.

---

## Correctness / crash fixes

- **Weapon permanently lost on a missing evolution (CRITICAL)** — `player.js checkEvolve()`
  removed the source weapon from `this.weapons` *before* confirming `Weapons.get(d.evolveInto)`
  resolved. If the evolved def was missing, the original was never restored and the player
  silently lost a weapon slot for the rest of the run. Now guards `if (!evoDef) return;`
  before removing (mirrors the safe `fuseWeapons()` fallback).
- **`nearestPlayer` could return a DEAD avatar** — `world.js` fallback chain
  (`best || this.player || players[0]`) returned a corpse when no living player existed, so
  end-of-run lifesteal / on-hit hooks healed and credited a dead player. Fallback now only
  ever yields a living player (or `null`).
- **Co-op snapshot `defIdx` had no bounds check** — `protocol.js`/`coop.js makeEnemy(idx)`
  indexed `defList[idx]` unguarded; a corrupted or host/version-mismatched index silently
  dropped enemy updates (worst case: every enemy vanishing for a guest). Added an explicit
  range guard in `coop.js makeEnemy`.
- **Co-op level-up queue was unbounded** — rapid party level-ups could stack `coopPickQueue`
  without limit and trap the host in an endless menu chain. Capped at 3 (auto-pick still
  drains it).

## UX fixes

- **Shop + Esc opened the pause menu over the shop** — the `pressed('escape')` pause toggle
  in `run.js` ran *before* the shop's own Esc-to-close, so the shop's handler was unreachable.
  Esc now backs out of an open shop; `P` still pauses.
- **Silent talent / facility buy failures** — clicking an unaffordable / locked / maxed node
  in the church or blacksmith did nothing. Now shows `金幣不足` / `需先解鎖前置天賦` / `已達滿級`
  via the existing `feedback()` toast.
- **Midas patron banner was overwritten** — `applyEvent()` unconditionally replaced the
  banner, clobbering the calculated "點石成金：依現有金幣獲得 +X% 傷害" message a patron set.
  Now preserves a custom banner if the patron wrote one.
- **Co-op self-avatar facing flipped on pure-vertical input** — `predictSelf()` only updated
  `faceX` while `moving`; facing now updates immediately on any horizontal input.
- **Co-op remote avatars "popped" from the map entrance to their true position** on the first
  snapshot — remotes now init to a null position and render only once a snapshot arrives
  (self still spawns at the entrance for immediate local prediction).
- **Co-op level-up UI could strand a disconnected guest** — the `levelup` listener now also
  checks `!this.disconnected` so a late level-up after a socket drop can't soft-lock.
- **4 ability icons were missing** (`frostbite` / `lacerate` / `ignite` / `overload`) — they
  fell back to the generic `ability_power` sword; `overload` gates the `w_inferno` evolution,
  so it showed a wrong icon in the evolution flow. Added 4 themed pixel icons in `art/icons.js`.

## Content / balance / clarity

- **Potion descriptions lied** — `heal_potion` said "回復 45" but healed 36; `big_potion` said
  "回復 110" but healed 85 (round-6 balance trimmed the values, descriptions weren't updated).
  Descriptions corrected to match the actual heal (no balance change).
- **Forge crit not clamped** — `player.js updateWeapons` added `fm.crit` to `critChance`
  without the `BALANCE.CRIT_CAP` clamp the actual crit rolls use. Now clamped, consistent
  with the `FIRE_RATE_CAP` clamp beside it.
- **Dead enemy `accel` ternary** — `enemy.js` had `const accel = this.charging ? 1 : 1;`
  (both branches identical). Simplified to `const accel = 1;` (charge speed already comes from
  the `maxV` scaling); zero behaviour change.
- **`'map'` input action renamed to `'build'`** — `Tab` was mapped to an action called `map`,
  but it toggles the **build page** (the real minimap is `KeyM` → `minimap`). Renamed across
  `input.js` + all call sites for clarity; behaviour unchanged.
- **RT event-bus swallowed listener errors** — `rt.js emit()` discarded all exceptions; now
  logs them to the console in the browser (keeps the no-build-step constraint), so a throwing
  snapshot/level-up handler is visible instead of silently corrupting scene state.
- **Server invite race** — `realtime.js invite()` used a room reference captured *before* the
  async friend check; the room could disband in between. Now re-validates the room after the
  `assertFriend` promise resolves.
- **Dead code removed** — unused `scaleX/scaleY/scale` module vars and `mouse.sx/sy`
  (grep-confirmed never read) in `engine/input.js`.

## Documentation corrected

The content tallies in `CLAUDE.md` were re-counted against the **live registries** (the
audit's own doc-checker mis-counted several by missing `gen/*` files — `190+ achievements`
is in fact **193**, not "~49"). Genuine corrections:

- **heroes 21 → 15** — only 15 characters are registered playable
  (`hunter/pyro/guardian/ranger/stormcaller/shadow` + 5 `h2_*` + 4 `h3_*`). The 6 `g_*`
  archetypes in `art/heroes.js HERO_MAP` and their `CHAR_EXCLUSIVE` mappings are orphaned art
  from an abandoned plan — never wired as playable characters (this is why the old "21" count).
- **bonds 13 → 12** — `BONDS.length` is 12.

Everything else verified accurate: weapons 30 · passives (abilities) 53 · items 28 · enemies
48 · skins 15 (4 hidden) · patron events 16 · exclusive weapons 8 distinct (9 owner mappings,
`g_arcanist` reuses the hunter's `x_starpiercer`) · 193 achievements · 12 guild ranks.

## Verified NOT a bug (investigated, left unchanged)

- **Level-up / patron-event menus ignore Esc** — *intended*. These are mandatory beneficial
  reward picks (the world pauses until you choose one of three); adding Esc-to-dismiss would
  silently waste the level-up. Unlike the equipment menu, where "keep current gear" is a valid
  no-op, so it correctly allows Esc.
- **Wardrobe reroll button "overlaps" the close button** — false positive. Their x-ranges
  overlap but they sit on different rows (~48·S vertical gap: close at `f.y+10·S`, reroll at
  `bodyTop+6·S = f.y+86·S`), so there is no actual hit-test collision.
- **`cidSeq` connection-id overflow** — theoretical only (would require ~9×10¹⁵ connections);
  not worth churning the connection-id path.

## Method note

The takeaway reinforced this round: **multi-agent findings must be re-verified against the
source before acting** — the audit produced several confident-but-wrong claims (mis-counted
content, a layout "overlap" that wasn't, "menu soft-locks" that were intended design). The
adversarial-verify stage caught most, and an independent per-fix re-read caught the rest.
