# Round 11 — menus, settings, cheats & UX fixes (batch 1 of a larger request)

A grab-bag of UX fixes and small features. All single-player / client-side; verified
in-browser (0 console errors). Larger items from the same request (guest leaderboard,
hidden-room rework, room-based map generation, UI art polish) are tracked at the bottom.

## Shipped
1. **Changelog is now mandatory** — added to CLAUDE.md "Conventions when extending": every
   update/PR must add or extend a `docs/changelog/ROUNDx.md` entry. (This file is the proof.)
2. **返回大廳 in the in-game menu** — the settings overlay now shows a **🏠 返回大廳** button
   when opened in-run (the pause→設定 path passes a `returnHub` callback → `abandon()`). The
   pause menu's existing 放棄並返回城鎮 stays.
3. **Key-binding page** — Settings → **⌨ 按鍵設定**: rebind dash / interact / ability / pause /
   build / minimap / shop / swap (movement stays WASD+arrows). Click an action → "按任意鍵…"
   captures the next key (Esc cancels); "恢復預設按鍵" resets. Bindings persist in
   `META.settings.keybinds` and apply at boot via `applySettings()`. New input layer:
   `applyKeybinds/currentKeyFor/keyLabel/captureNextKey/REBINDABLE` (`engine/input.js`).
5. **Dev mode (Konami ↑↑↓↓←→←→ B A) now works in the hub** — the toggle was always global, but
   the dev panel only existed in-run; added a hub dev panel (解鎖全部內容＋關卡 / 金幣 +9999 /
   公會聲望 +5000). And **"解鎖全部" now also unlocks every biome + difficulty** (it previously
   only touched content, leaving levels locked) — shared `cheatUnlockAll()` in `content/unlocks.js`
   sets `META.levels.unlocked = BIOMES.length` and every `levels.diff[id] = 5`.
7. **Level-up vs equip window layering** — when a level-up and an equip choice were queued at
   once, `update()` gave the level-up input priority but `render()` drew the equip window on
   top, so clicks hit the hidden level-up. Fixed: only the input-active panel draws (`run.js`
   render uses `if (choice) drawChoice() else if (equipChoice) drawEquipChoice()`).

## Verified
- Hub dev panel renders; a real click on 解鎖全部 took `levels.unlocked` 1 → 10 (all biomes),
  all difficulties set, 30 weapons unlocked.
- Settings main page shows 按鍵設定 + 返回大廳 (in-run) + 重置存檔 + 關閉; keybind page lists all
  8 actions with their keys; rebind dash → J persisted and 恢復預設 reverted it.
- All touched files parse-clean as ES modules; game boots with 0 console errors.

## Deferred (next batches — from the same request)
- **訪客模式排行榜** (#4): view + submit the leaderboard while not logged in, with a
  self-entered name (needs a server-side anonymous-submit path + anti-spam).
- **Hidden-room rework** (#6): make them genuinely hidden (discover/solve to enter), a real
  room on the map, **save-permanent once-per-save rewards** (achievements / hidden quests /
  unlocks / eggs) rather than per-run buffs. Folded into ↓.
- **Room-based map generation** (#8): split each map into many large/small rooms with doors +
  keys, optional sub-mini-bosses that drop keys/chests, NPC/scenery/mechanism rooms — higher
  generation variety. (Hidden rooms #6 become part of this.)
- **UI/UX art polish** (#9): more anime/pixel styling across menus & HUD.
