# CLAUDE.md — Soulshard Hunter (魂晶獵手)

Dev guide for working on this repo. Read this before editing.

## What it is
A single-player (optionally cloud-connected) Vampire-Survivors-style pixel roguelike. **Vanilla HTML5 Canvas + ES Modules, no build step**; the only external assets are the **recorded MP3 soundtrack** in `assets/music/`. All pixel art is procedurally generated in code; SFX are WebAudio-synthesised; music is the recorded soundtrack (state-mapped + crossfaded) with a procedural-synth fallback. Walk-only control — weapons auto-target and fire.

## Current state (rounds 1–20 + R20.1 done; public version **V2.0**)
A run = one biome, **20 min**, at a chosen difficulty (or the **無盡/每日** modes). Threat ramps 1→~13; distinct mini-bosses at 5/10/15 min; biome final boss at 20:00 → clear unlocks the next biome + difficulty; a killable Reaper descends 30 s later.

**Content registry** (counts verified live via `__DBG.reg()`): **27 heroes · 43 weapons** (incl. 12 evolved) **· 54 passives · 28 items · 63 enemies** (incl. 10 biome final bosses + 5 R18 mobs + 4 R20 event mobs + boss_pillar) **· 16 skins** (5 hidden full-body) **· 12 bonds · 18 exclusive weapons · 16 patron events**, plus **219 achievements** (many gate unlocks) and a **12-rank guild reputation track**. All **10 biomes** have a dedicated final boss.

**Systems in place:** status effects · bonds/synergies · character-exclusive weapons · unique per-hero bodies · damage attribution + results ranking · B-key shop (before/after equip diffs) · 4-tier rarity · soul-jail must-clear surround · anti-AFK drain · achievement-gated unlocks · **multi-map ruin-town hub** (out-of-run forge / talents / facilities / guild quests / wardrobe / 魂晶銀行 / NPC 好感度 / pets / decor) · **cloud backend** (accounts · cloud save · leaderboards · admin + moderation suite) · **real-time co-op** (host-authoritative relay + friends/lobby) · **無盡 + 每日挑戰 + 週常懸賞** modes · **data-driven boss moves** + in-run events.

**Round history** — per-round detail lives ONLY in `docs/changelog/ROUNDx.md` (the single home for version notes). Deep-dive system sections for **R4–R7 and R18–R20** follow further down this file; the rest are a one-line index here:
- **R1–R3** core roguelike loop · content · balance (`OVERHAUL.md`).
- **R4** bonds · exclusives · unique hero bodies · patron events · damage attribution *(§below)*.
- **R5/5b** multi-room town hub · forge · guild ranks · skin shop · denser swarm *(§below)*.
- **R6** recorded soundtrack · cloud Phase 1 (accounts/save/leaderboard) · harder balance *(§below)*.
- **R7** online Phase 2 — real-time co-op + friends/lobby (host-authoritative relay) *(§below)*.
- **R8** 57-agent bug/UX audit (critical weapon-loss fix, co-op paper-cuts, icon/label fixes).
- **R9** procedural-art glow-up + **5 new biomes** (→10 biomes, `engine` additive glow helpers).
- **R10** co-op resilience (host migration · in-run reconnect · spectate · server score authority).
- **R11** UX batch (按鍵設定 rebinding · 返回大廳 · hub dev panel · window layering).
- **R12** 訪客排行榜 · 房間化地圖 + 隱藏房改版 (vault keys + once-per-save rewards).
- **R13/R14** admin dashboard → full moderation suite (bans · broadcast · match/leaderboard mod).
- **R15** account-UX overhaul (centred title menu · in-town Esc menu · real Chinese auth errors).
- **R16** big UX + 後台強化 round (feedback system · Service Worker · 7-tab admin console · core-sim bug fixes); spec `docs/ROUND16_SPEC.md`.
- **R17** UX-fix + wardrobe rework + 4-tier rarity + hidden-room exclusives + economy (frontend only); spec `docs/ROUND17_SPEC.md`.
- **R18** g_* heroes playable (→21) · 5 R9-biome final bosses · endless curses · 每日挑戰 + 週常懸賞 · NPC 好感度 · pets/decor *(§below)*; spec `docs/ROUND18_SPEC.md`.
- **R19** 末日遺跡城鎮改版 — multi-map ruin town (`makeCamp` + new `makeInterior`) *(§below)*; spec `docs/ROUND19_SPEC.md`.
- **R20** ruin-town 2.5D art + decor collision · 4 in-run events · data-driven boss moves · final 6 heroes (→27) *(§below)*.
- **R20.1** apocalyptic title-cover redesign (`art/title_scene.js`) + vertical menu; in-game patch-notes V-versioned (V1.0=R18 / V1.5=R19 / V2.0=R20, `content/patchnotes.js`).

Cloud setup: `server/README.md`; Oracle deploy (single canonical guide): `docs/DEPLOY.md`; multiplayer design + status: `docs/MULTIPLAYER_PLAN.md`. **CI/CD:** every push to `main` auto-deploys to Oracle (`.github/workflows/deploy.yml`).

## Run / test
- **Serve:** `node tools/serve.mjs` → http://localhost:5173 (a no-cache static server — do NOT use `python -m http.server`; it serves STALE ES modules after edits and silently breaks testing). `.claude/launch.json` exposes it as preview server "game".
- **Self-test in the browser:** `window.__DBG` exposes `snap()`, `reg()` (registry counts), `startRun()`, `autoplay(secs)`, `gallery()`, `enemyIds()`, `scene()`, `meta()`, `music()` (soundtrack state), **`nav(name)`** (jump straight to `title`/`hub`/`run` — needed because throttled rAF makes input-driven scene swaps unreliable), and **`pump(n,dt)`** (manually tick N sim frames + one render, for screenshots under throttled rAF).
- **Headless screenshots:** the preview tab is background-throttled, so `preview_screenshot` stalls. `tools/serve.mjs` exposes a dev-only `POST /__shot` that writes a base64 canvas capture to `_shot.png`; capture via `fetch('/__shot',{method:'POST',body:canvas.toDataURL('image/png')})` then Read `_shot.png`.
- **IMPORTANT — headless preview throttles `requestAnimationFrame`**, so `__DBG.autoplay` barely ticks and screenshots can be stale. Instead drive the sim manually from `preview_eval`:
  ```js
  const s = __DBG.scene(); s.player.takeDamage = () => {};      // godmode for inspection
  for (let i = 0; i < 9000; i++) { if (s.choice) s.choice = null; s.update(1/60); }
  ```
  Then read `s.run` / `s.world`. Call `s.render()` **sparsely** — it's expensive; rendering every tick can exceed the eval timeout. To screenshot a panel, set the field (`s.showBuild=true`, `s.bigMap=true`, a hub `s.panel='sortie'`) then call `s.render()` once.
- `window.__GAME_ERROR__` + the `#fatal` overlay surface uncaught errors.
- **Headless sim-test traps (R20):** ① the first-battle `hudTut` walkthrough re-pauses the run ~2s in on a fresh save (`_hudTutShown` is per-scene) — clear `s.hudTut=false` INSIDE the pump loop or set `META.tutorialHUDDone=true`; ② anti-AFK drain writes `hp` directly (bypasses a `takeDamage` godmode stub) — a stationary godmode player still dies in ~4 min, so refill `s.player.hp` each frame; ③ `setScene()` queues — after calling it from `preview_eval`, run `__DBG.pump(1)` before `__DBG.scene()` or you read the OLD scene; ④ also null `s.equipChoice`/`s.eventChoice`/`s.curseChoice`/`s.anvilChoice` in pump loops (any of them freezes `run.update`).
- After editing, **reload the page** before testing — `preview_eval` runs the in-memory module, not your new file.

## Architecture
```
index.html                  Canvas + loader + global error trap
src/
  main.js                   boot: wire engine/content/scenes; 120Hz fixed-step loop
  engine/                   game-agnostic
    loop.js (fixed-step)  math.js  input.js (keys+mouse+wheel)
    renderer.js (camera / world<->screen / UI / shake)
    palette.js  sprites.js (Painter API + sprite registry)  particles.js  audio.js
  art/                      procedural sprites (defineSprite/defineAnim)
    core.js icons.js content_icons.js hub.js biomes.js biome_decor.js weapons.js heroes.js reaper.js lobby.js
    title_scene.js          R20.1 apocalyptic title cover
    town_floor.js town_church.js town_guildforge.js town_decor.js town_personal.js town_npcs_a/b.js town_outdoor.js town_pets_decor.js
    town_ruin_tiles/walls/facades/facades2/decor/interior/stations/stations2.js   ← R19/R20 ruin-town art
    gen/                    ← workflow-generated art (auto-loaded, fault-isolated)
  game/
    state.js                save/META, run lifecycle, base stats (makeBaseStats)
    scene.js  scenes/       title.js / hub.js / run.js / coop.js (+ refs.js decoupler)
    world.js                tilemap collision, entities, combat, hazards, loot; makeCamp (ruin town) + makeInterior (R19)
    player.js  enemy.js  projectile.js  pickup.js  hud.js  progression.js  maps.js  floor.js  toasts.js
    balance.js  status.js  cheats.js
    ui/                     settings.js (in-game settings/keybinds overlay) · gold.js (R17 goldLabel pixel-coin renderer)
    net/                    coophost.js · coopbridge.js · protocol.js (co-op netcode, round 7)
    content/
      registry.js           ← THE integration seam (Enemies/Items/Equipment/Abilities/Talents/Facilities/Weapons/Characters)
      enemies/abilities/items/equipment/talents/facilities/weapons/characters/achievements/quests.js
      bonds·forge·guild·exclusives·events·npcs·skinshop·bank·town_gates·hidden(_rewards).js   ← town / meta systems
      curses·daily·boss_moves·event_mobs·heroes_r20·weapons_r20·patchnotes·pets·room_decor·lore.js   ← R18–R20 systems
      biome_tags·enemies_biome·bosses_biome·status_tags.js   ← biome affinity / final-boss / status data
      gen/                  ← workflow-generated content (auto-loaded)
  net/                      ← cloud client (round 6): api.js (fetch+JWT, offline-first) · ui.js (account bar + login/leaderboard/admin overlays) · rt.js (realtime WS) · social.js (friends/lobby)
tools/  serve.mjs  integrate.mjs  (_wf_*/_*.mjs are gitignored scratch)
server/                     ← cloud backend (round 6, Node+Fastify+Postgres): src/server.js (buildApp factory + self-boot) · src/db.js · test/ (smoke.mjs + fakepool dev launcher)
assets/music/               ← the 12 recorded soundtrack MP3s (state-mapped in engine/audio.js)
```

## Balance config (src/game/balance.js)
ALL difficulty / economy / pacing / status / map magic numbers live in `BALANCE` (one object) — tune there, not in gameplay code. Also exports `weaponMaxLevel`/`isWeaponMaxed` (weapons cap at **level 7**; character level is uncapped). Status effects live in `src/game/status.js` (`applyStatus`/`tickStatus`), enemy→player status tags in `content/status_tags.js`, achievement-gated unlocks in `content/unlocks.js`, the hidden dev cheat in `src/game/cheats.js` (Konami code → in-run dev panel; `window.__CHEATS`).

## Core loop (run.js)
A run = **one biome, 20 minutes** (`BALANCE.LEVEL_TIME`) at a chosen **difficulty** (`run.difficulty`/`diffMul`).
- **Threat** `this.threat` ramps 1→~13 over 20 min (`BALANCE.THREAT_PERIOD`) and drives enemy tier + scaling. Only **1-3 enemy types** active at once (`rotateTypes`, ranged biased down per D4).
- **Mini-bosses:** a DISTINCT boss at 5/10/15 min (`miniBossTick`/`spawnMiniBoss`, `BALANCE.MINIBOSS_TIMES`), never the biome final boss, never repeated.
- **Hazards** = `world.hazards` (HAZ table, dmg ×`TRAP_DMG_MULT`). **Special events** (`eventsTick`/`updateEvents`/`drawEvents`): mushrooms / **surround ring (D2, tanky chasers)** / **persistent Higgs bombard (D3)**.
- **Status effects (D6):** slow/bleed/burn/poison (DoT) + stun/knockup (CC) on player & enemies via `status.js`.
- **Finale:** at 20:00 the biome's `FINAL_BOSS` spawns; killing it → `clearLevel` (unlock next biome + difficulty). 30s later (`REAPER_DELAY`) the killable **Reaper** (`spawnReaper`, core enemy `reaper`) descends; slay it or press E to leave. `finishRun` banks once.
- **Caps (no infinite pile-up):** weapons 6 / passives 14 (`MAX_WEAPONS`/`MAX_PASSIVES` in progression.js); weapon level 7; enemy hp/dmg + hazard/event damage scaling are clamped.
- Attack **tempo** ramps slow→fast (`world.playerTempo`/`enemyTempo`). Screen shake is dampened (`setShakeScale`, full only <25% HP).
- **Items/equip:** ground items auto-use on pickup (no inventory); equipment drops open a paused choose-to-equip menu (`equipChoice`). Anvils open a paused 3-choice (`anvilChoice`).

## Conventions when extending
- **Always add a changelog** — EVERY update/PR must add or extend a `docs/changelog/ROUNDx.md` entry (newest round) describing what changed + how it was verified. This is the single home for version notes; don't scatter changelog `.md` files in the repo root, and don't ship a change without one.
- **Content is data-driven** — register via `registry.js`. Never hard-code content in gameplay code; read from the registries.
- **New enemy:** `defineAnim('<sprite>', w, h, frames, (p,f)=>{ ...; p.outline(P.ink); }, {anchor:[ax,ay],fps})` then `Enemies.register({ id, sprite, ai:'chase|flyer|shooter|charger|wander', hp, speed, damage, radius, xp, gold, attack?, boss?, ... })`. Bosses (`boss:true`) auto-run the multi-phase system in enemy.js.
- **New weapon (auto-fire):** `Weapons.register({ id, icon:'weapon_<id>', tier, weight, maxLevel, cooldown(l), fire(world,p,inst), update?, draw?, levelDesc?, evolveInto?, evolveReq? })`. Evolves at maxLevel when the player owns `evolveReq` passive.
- **Icons:** `defineIcon('weapon_<id>'|'item_<id>'|'equip_<id>'|'ability_<id>', bgHex, (p)=>{...})`. **Character sprite:** `defineAnim('char_<id>',16,18,4,(p,f)=>{ drawHunter(p,f,art); p.outline(P.ink); },...)`.
- **Pixel API (`Painter`):** `px/rect/hline/vline/line/circle/ellipse/ring/mirrorX/outline/shadeBottom/replace`, plus **Round-9 polish helpers** `glow/gradV/gradH/sparkle/star4/rimLight/softShadow/dither/speckle/aura` (rim light + soft shadow run AFTER the body, BEFORE `outline()`); shared palette `P` (now incl. anime accents `neon/magenta/sakura/aurora/astral/holy/rim` + ecosystem families `leaf/sand/bog/ocean/sky`), `sym` icon primitives. Missing sprites render a magenta placeholder (no crash); use `iconOr(name, fallback)`.
- **Stats** live in `makeBaseStats()` (state.js). Only write stat fields that exist there, or you'll get `NaN`.
- Equipment slots: `armor`/`trinket` apply stat mods; `weapon`-slot equips become a real **signature auto-weapon** via `makeEquipWeaponDef` (equipItem). Weapon-slot equips are sold in the in-run shop, not dropped.

## Workflow content pipeline
Content was mass-produced by multi-agent Workflows (generate → adversarial review). A workflow returns `{result:{packs:[{key,code,ids,spriteNames,ok}]}}`; normalize to `{result:packs}` then run **`node tools/integrate.mjs <file.json>`** — it decodes HTML entities, prepends the import header, writes `src/art/gen/*` + `src/game/content/gen/*`, and rebuilds the fault-isolated dynamic-import indexes by scanning the dirs. Re-run to integrate new output.

## Round-4 systems (原#1–19 follow-up — see docs/changelog/ROUND4.md)
- **B key = shop** (`input.js KeyB→'shop'`): the soulshard/anvil shop opens anywhere, not via a map shrine (the shrine is now a one-time blessing altar). Equip pickups + anvil gear show a **before/after stat diff** (`run.js equipDiffRows`/`drawEquipDiff`; `equipment.js` records each slot's stat delta).
- **Bonds (羈絆)** `content/bonds.js`: build-combo synergies, one-shot applied via `checkBonds(run, player)` (throttled in `run.update`); shown in build/results panels.
- **Exclusive weapons** `content/exclusives.js`: `{exclusive:true}` weapon-slot gear injected only into the owner's anvil (`CHAR_EXCLUSIVE`, `rollGearChoice`).
- **Unique hero bodies** `art/heroes.js`: 14 archetype draw fns (R4 count — grew to **18** by R5, see below) registered per char id via `registerHeroBody`; `characters.js`/gen hero packs call `drawHeroBody(p,f,id,art)` (falls back to `drawHunter`). Skins recolour the unique body.
- **Patron events** `content/events.js`: mini-boss 3-choice are named characters with `patron_*` portrait icons + persistent hook-based effects.
- **Damage attribution**: `world._curSrc` is set around weapon/ability/DoT calls; `enemy.hurt`/status DoT call `world.attributeDamage(src,dmg)` → `run.dmgBySource` (results ranking).
- **Special monsters**: `enemy.steal{gold,xp}` (grab+flee, dropped back on death) + `def.deathBlast` (hurts the player); see `gen/gen_special2.js`.
- **Anti-AFK**: idle past `BALANCE.AFK_GRACE` drains a little HP (`player.update`).
- New `BALANCE` knobs: `AIM_RANGE`/`AIM_LOS` (shorter LOS auto-aim), `AFK_*`, `SPAWN_*`, `EARLY_GRACE`/`EARLY_DMG_GRACE` (opening softener), `SURROUND_*` (must-clear 魂牢). Sim-tuned (`docs/changelog/ROUND4.md`).

## Round-5 systems (multi-room town hub — see docs/changelog/ROUND5.md)
- **Town map** `world.js makeCamp()`: a 3×3 grid of walled rooms joined by 4-tile doorways around a central plaza. Returns `rooms` (named pixel anchors: church/guild/blacksmith/clothing/achievements/personal + plaza/garden/market) so `hub.js` places interactive **stations** (building + sortie portal) and **NPCs** by room. Themed background decor per room (`town_*` sprites).
- **Hub scene** `scenes/hub.js`: walk between rooms; press E near a building → its panel, near an NPC → dialogue. Panels: `sortie` (pick hero/biome/difficulty — **`drawSortie` was the missing method that crashed this; now restored**), `talents` (教堂), `smith` (鐵匠鋪: forge + facilities tabs), `guild` (公會: quests + rank tabs), `wardrobe` (衣帽店), `achievements` (殿堂), `personal` (小屋: career stats + collection).
- **NPCs** `content/npcs.js`: 10 townsfolk, each `{id,name,title,room,station,sprite,color,greet[],topics[]}`. Lines may be `fn(meta)` for save-aware dialogue. "Keeper" NPCs set `station:'<panelId>'` (must be a **panel id** like `talents`, not a room id) to route into a building's panel on dialogue end. `markMet` bumps `stats.npcTalks`.
- **Guild** `content/guild.js`: `GUILD_RANKS` (12 tiers); `bankRun` accrues `meta.guild.xp` per sortie; crossing a threshold lets you `claimGuildRank` a one-time reward (gold + content unlock via the same `U(kind,id)` helper as achievements).
- **Forge** `content/forge.js`: out-of-run, per-weapon `meta.forge[id] = {level, effects[]}` (level ≤5, ≤3 effects). `computeForgeMods(id)` is attached to each weapon **instance** in `player.addWeapon`; `player.updateWeapons` applies it **only while that weapon fires** then restores stats. Evolved/fused weapons **inherit the base instance's `forge`** (only base weapons are forgeable).
- **Clothing store (5-6 / task-10)** `content/skinshop.js` + hub `wardrobe` panel = **2 tabs**: **我的造型** browses every hero's owned skins (click a chip to equip) and **造型商店** rolls **4 random offers refreshed every 30 real minutes** (`meta.skinShop.nextRoll` wall-clock timer) + paid reroll + countdown. Skins (`characters.js SKINS`) recolour the unique hero body + a `deco(p,oy)` accessory; **hidden skins** instead carry a full `body(p,f,art)` override (a completely different silhouette — golem/wraith/mecha/seraph), ~45% chance on the rack, marked ★隱藏.
- **Hero bodies** `art/heroes.js`: **18 archetypes**; `HERO_MAP` maps 17 hero ids (6 core + 6 orphaned `g_*` + 5 `h2_*`) onto those bodies, while the 4 `h3_*` heroes register their own bodies in `gen_heroes3.js` — so every hero has a unique body, no two share an archetype. **Load order matters:** `characters.js` imports `art/heroes.js` itself so `HERO_ART` is populated before its eager sprite-bake loop — `state.js` pulls `characters.js` in early (before main.js's own heroes.js import), so without that self-import the core heroes bake as generic hooded recolours.
- **Buy-confirm + reset (task-8)** `scenes/hub.js`: every hub gold-spend routes through `ask(text, detail, onYes)` → a confirm modal; each upgrade panel has a top-right **reset** button (`resetTalents`/`resetFacilities`/`resetForge`) that refunds all spent gold.
- **Swarm (task-11)** `balance.js`: `SPAWN_CAP_BASE/PER_THREAT/MAX` 14/7/260, `SPAWN_INTERVAL` 1.25→0.30, `ENEMY_HP_MULT` 1.45, `ENEMY_DMG_MULT` 1.08, `EARLY_GRACE` 140 (the last two are R5 values — R6 retuned them to 1.15 / 120, see Round-6 §below); `run.js` spawns groups of `2 + threat/1.5` from **2–4 concurrent types**. Difficulty comes from COUNT (D1 stays clearable); `diffMul` adds per-hit bite on D2–D5.
- **Achievements** `content/achievements.js`: expanded to 150+ across many tier families + per-biome clears + hidden goals; ~25 are unlock-tied (push ids into `meta.unlocked.*`). New lifetime stats live in `state.js makeBaseStats`/`bankRun` (`charClears`, `noDmgClears`, `bestCharLevel`, `bondsTriggered`, `forgeUpgrades`, `npcTalks`).
- **Konami vs B-shop** `cheats.js`: the Konami tail `…←→ B A` — when that `B` completes the prefix it sets `Cheats.eatShop`; `run.js` swallows exactly that one shop toggle so the cheat code never pops the shop. A normal B still opens it.

## Round-6 systems (soundtrack + online Phase 1 + harder balance — see docs/changelog/ROUND6.md)
- **Recorded soundtrack** `engine/audio.js`: a streaming-`HTMLAudio` layer (`TRACK_FILES` maps state→`assets/music/*.mp3`, `encodeURI` for the CJK+space names) with crossfade + a **per-track failure Set** (one bad file falls back to synth, not all). `Music.setMode('title'|'hub'|'<biome>'|'miniboss'|'boss'|'reaper'|'victory'|'death')`; volume/mute go through `Audio.apply()`. `victory`/`death` are no-loop. Procedural synth (`startProc`) is the fallback. **Gotcha:** the module's `export const Audio` shadows the global `Audio` constructor — use `document.createElement('audio')`.
- **Cloud Phase 1 — frontend** `src/net/`: `api.js` is offline-first (no-ops unless a live JWT is present; dev→`:8787`, prod→same-origin `/api`). `ui.js` mounts a bottom-right account bar + login/leaderboard DOM overlays. Wired into `state.js`: `saveMeta` stamps `META.savedAt` (monotonic) + debounced `queueCloudSave`; `bankRun` → `postRunResult`; `importMeta`/`syncFromCloud` reconcile cloud-vs-local by `savedAt` and write a `.precloud.bak` before any overwrite.
- **Cloud Phase 1 — backend** `server/`: `buildApp(pool)` factory (testable via Fastify `inject()`); `server/test/smoke.mjs` = 18/18, `server/test/dev-fakedb.mjs` runs the real app on an in-memory pool (no Postgres). Score is **recomputed server-side** in `/api/runs`. Production refuses to boot on a weak `JWT_SECRET`.
- **Harder balance** — the big lever was **fixing bugs**: gen_weapons_a/b roll helpers were missing `PLAYER_DAMAGE_MULT` (`GA_BAL`/`GB_BAL` resilient refs now apply it), crit was uncapped (`BALANCE.CRIT_CAP` 0.6, clamp every crit roll), and `shardMult` was inert (now applied to the shard payload). Then: `ENEMY_DMG_MULT` 1.08→1.15, boss `dmgScale` per-threat 0.05→0.10, `THREAT_PERIOD` 112→99 (ceiling 13), surround harder, `ANVIL_PRICE_GROWTH` 1.2→1.35, meta talent/facility per-level values trimmed. `EARLY_GRACE` 140→120 keeps the opening survivable. **`ABILITY_DAMAGE_MULT` is a RESERVED (un-applied) knob** — activating it on top of the weapon-leak fix over-nerfed D1.
- **6.1 — plaza gates + map art** (see ROUND6.md §5): the 4 plaza doorways now use paired `town_gatepost`s (in `art/town_floor.js`) placed at the ACTUAL opening edges in `world.js makeCamp()` (N/S flank cols 22.5/27.5; W/E flank rows 17.5/22.5), replacing the undersized 16px arch. **Biome art is no longer a recolor:** `art/biomes.js tileset()` now has per-biome floor/wall *shapes* (FLOORS/WALLS/WALLTOPS dispatch by id), and `art/biome_decor.js` adds 5 distinct props per biome (`DECOR_SETS`/`DECOR_CLUSTERS`); `maps.js` places them as scattered singles + tight clusters + wall-lined (`placeCluster`/`nearWallFloor`), ~150 props/map across 5 kinds (was 30 of 1).

## Round-7 systems (online Phase 2 — real-time co-op + friends/lobby — see docs/changelog/ROUND7.md)
- **Architecture = host-authoritative relay** (NOT the plan's original server-authoritative): one player's browser runs the unmodified `run.js` authoritative sim; the Node server only relays. This reuses 100% of the game director (spawn/threat/boss/events/balance) with **zero headless porting** and keeps single-player a no-op path.
- **Server** (`server/`, `ws` lib, no Postgres needed for dev via `test/dev-fakedb.mjs`): `realtime.js` = `class Realtime` (socket-agnostic, unit-tested) — presence (`byUid`), rooms/lobby (`rooms`/`roomOf`, ≤3, host-leaves-closes), invites (friend-gated), and **dumb relay** of `input` (guest→host, tagged with sender `cid`) + `snap`/`runstart`/`runend` (host→guests). `wsgw.js` binds it to the HTTP `upgrade` event at path `/rt` with **JWT in `?token=`** (browsers can't set WS headers). `social.js` = friend graph (`friendships` table, single directed edges; mutual-accept) + REST; a REST mutation pings `realtime.onFriendChange` to live-push both parties. **WS is rate-limited per-connection** (`_allow`, token buckets by message class: db/room/chat tight, game generous) + friend-graph 1.5s cache + per-uid connection cap (5) + global room cap — the HTTP `@fastify/rate-limit` does NOT cover the WS path.
- **Client net** (`src/net/`): `rt.js` = realtime WebSocket client + event bus (`RT.on(type,cb)`), offline-first, auto-reconnect; `social.js` = friends/lobby DOM UI (mirrors `ui.js` pattern) + invite popups; `api.js` adds friend REST + `wsBase()`.
- **Co-op netcode** (`src/game/net/`): `protocol.js` owns the wire format BOTH ways (quantised tuples, flag bits `PF`/`EF`, palette-deduped projectiles/pickups, base64 map sent once at `runstart`; **player tuple `[x,y,faceX,hp,maxHp,flags,speed]`** — speed feeds guest self-prediction). `coophost.js` = `CoopHost` (builds remote avatars from the lobby roster, feeds them net input, broadcasts at 18Hz; `peer:left` re-checks game-over). `coopbridge.js` turns lobby `start`/`runstart` into scene switches.
- **Guest scene** `scenes/coop.js`: a **puppet World** (tiles/hazards for draw only) + reused `Enemy`/`Player` instances driven by snapshots (interpolated), with **local prediction + reconciliation** for the player's own avatar; camera follows self. Does NOT simulate.
- **Multi-player core (additive, single-player-identical):** `world.players[]` (falls back to `[world.player]`), helpers `nearestPlayer`/`eachPlayer`/`anyPlayerAlive`/`randomPlayer`; enemy/pickup target the nearest player; `player.update(dt,world,input)` uses a net InputFrame when passed else the keyboard. Co-op **can't pause the shared world**, so the host auto-resolves all menus (`coopLevelUp`, auto-event, auto-equip via `onEquipPickup=null` + `equipItem(...,recordRun=false)` for remotes) and `Esc` is a non-blocking leave menu.

## Round 18–20 systems (town rework · endgame modes · boss moves — see docs/changelog/ROUND18–20.md)
- **Multi-map ruin-town hub** `world.js` + `scenes/hub.js`: `makeCamp()` builds the irregular apocalyptic **exterior** (R20: 72×54, ruin tilesets, width-3 streets, `triggers[]` walk-in door tiles, decor `solid:1|2` **player-only** collision via `world.block`/`solidTile`); `makeInterior(id)` builds the **6 building interiors** (R20: odd widths so `cx` is the true centre column). `hub.js` `this.area`/`this.maps`/`loadArea()` swap exterior↔interior; **step-on glow-circle doors** (R20; E-near-door kept as fallback). Both keep the **same `rooms{}` return contract + 9 room ids** — and **run biomes opt OUT**: they leave the new tileset fields (`wallFace/wallCap/wallBands/voidTile`) unset and render byte-identically.
- **Endgame modes** `content/{curses,daily}.js`: **無盡** stacks 12 curses past 20:00 (`bestEndlessTime`); **每日挑戰** = deterministic biome+hero+3 mutators from the date key (progress-isolated); **週常懸賞** = 9-of-3 ISO-week bounties (snapshot-delta progress). Server has **mode-aware boards** (`runs.mode`/`challenge_key`) + per-mode plausibility (R18/B6 migration). Curses/mutators are **host-side scalars** → co-op protocol byte-unchanged.
- **Data-driven boss moves** `content/boss_moves.js`: `BOSS_MOVES` registry + `bossMoveTick()` hook in `enemy.js` (an active move owns the body for the frame). Moves: `leap_slam` / `wall_cage` / `charge_combo` / `shock_lines`. Wiring lives in a central `WIRE` map keyed by boss id so **gen boss files stay untouched** (survives re-integration). `wall_cage` spawns destructible `boss_pillar` **ENTITIES** (no tile mutation) so co-op guests stay correct; `phaseShift` cancels the active move.
- **In-run events as enemy entities** `content/event_mobs.js`: **tier-9, weight-0** defs (never in normal pools), gated by `BALANCE.EVENT_WEIGHTS` + threat — 自爆狂徒 (kamikaze) · 魂晶詭雷 (lattice mines) · 滾岩魔 (beam-telegraphed lane crusher) · 寶藏哥布林 (catch-in-12s). Protocol byte-unchanged. (enemy.js gained a generic `this.damage>0` contact gate so a 0-dmg toucher can't feed free i-frames.)
- **Town meta** `content/{bank,town_gates,npcs,pets,room_decor,skinshop}.js`: 魂晶銀行 (borrow ≤ guild-rank limit, auto-repaid ×1.2), **town feature gates** (forge/bank/talents/dojo tied to biome+guild progress; owned levels never stripped), NPC 好感度 (daily +1, Lv1-5 rewards), local-only mini-pets, personal-room decor (gold sink).
- **Final 6 heroes (R20)** `content/{heroes_r20,weapons_r20}.js`: hand-written `h4_*` (聖盾騎士/時詠術士/傀儡師/守墓人/星喚少女/劍舞者) — each a unique inline body + start weapon + evolved form + anvil exclusive (`x_h4_*`), all damage routed through `r20Roll()` (= `PLAYER_DAMAGE_MULT` + `CRIT_CAP`).

## Gotchas
- `KeyM` = **minimap**, `KeyB` = **shop** (not mute — mute lives in the settings menu). `Tab` = build page. Mouse `wheel` is wired (`mouse.wheel`); hub long panels have a draggable scrollbar.
- Save: key `soulshard.save.v1`, `SAVE_VERSION` + migration in `loadMeta`; reset backs up to `…v1.bak`.
- `node --check <file>` only checks syntax (won't resolve imports) — and treats the no-`package.json` frontend `.js` as CJS, so it **errors on `import`/`export`**; for frontend ESM, validate by reloading + the manual-pump test. (`server/` has `type:module`, so `node --check` works there.)
- **Gen-file edits get reverted by re-integration.** `src/game/content/gen/*` + `src/art/gen/*` are workflow-generated; round-6 hand-edited a few (gen_weapons_a/b `BALANCE`/`PLAYER_DAMAGE_MULT`/crit fixes, talent/facility value trims, and round6.4 forge-swift `/(inst.fmHaste||1)` divisors in gen_weapons_a/b/c). **Round-17 (B8) hand-edited six more:** `gen/talents.js` + `gen/facilities.js` (costs now ×`BALANCE.TALENT/FACILITY_COST_MUL` — they were hardcoded and skipped the R16/R17 town-price hikes — plus ~25-30% value trims), `gen_items_anvils.js` (anvil diminishing returns via `anvN()`/`BALANCE.ANVIL_DIMINISH`), and halved gold sources in `abilities_utility.js`/`gen_abilities_c.js`/`equipment_gear.js`. Re-running `integrate.mjs` overwrites them — re-apply, or patch the workflow source.
- **Sprite bake is EAGER** (`defineAnim` runs the draw fn + caches frames at definition time). Any art a sprite depends on (e.g. `HERO_ART` bodies) must be registered BEFORE that sprite is defined; remember `state.js` transitively imports `content/characters.js` very early in boot, so character sprites bake before main.js's later art imports unless the dep is made explicit.
- Forge/grid rows that stash a non-rect payload in `r.w` must hit-test with a separate width field (e.g. `r.wd`) — `inside(mx,my,r)` reads `r.w` AS the width.
- **Forge 疾速/swift now covers update-driven weapons** (round6.4, ROUND6.md §6-4): `player.updateWeapons` stashes the effective haste on `inst.fmHaste` before calling `update()`, and each update-driven weapon (beams/auras/turrets in `weapons.js` + `gen_weapons_a/b/c.js`) divides its self-gating re-arm timers and per-enemy hit cooldowns by `(inst.fmHaste || 1)` — so swift speeds them up too, not just the cooldown branch.
- **Enemy proximity queries use a uniform spatial grid** (round6.4, ROUND6.md §6-4): `world.rebuildGrid()` runs once per update; `world.forEachNear(x,y,r,cb)` replaces the old O(n²) scans in enemy separation, `nearestEnemy` (finite range), `dealAreaDamage`, and projectile→enemy combat. Grid cell = `TS*4`; verified clean at the 260-enemy cap.
- **Co-op (round 7):** `Player.maxHp` is a **getter** (`return this.stats.maxHp`) — never assign it; the guest stores the networked max as `pl.nmax`. `world.player` stays the LOCAL avatar; `world.players` is the full set (`inputFor(p)` returns a net InputFrame for remotes, `undefined`/keyboard for the local one). The WS path has its **own** rate limiter (`realtime._allow`) — `@fastify/rate-limit` only guards HTTP. Re-running `integrate.mjs` does NOT touch the co-op files (they're hand-written, not in `gen/`).
- **Co-op testing gotcha:** a **backgrounded/headless browser tab queues WebSocket `onmessage` until JS next runs** — so `RT.room` lags between `preview_eval` calls. Poll `RT.room.members.length` inside an active eval (its `setTimeout` loop drains the queue) before asserting; don't read it cold. Also **only run ONE dev server on :8787** — `pkill node` (Cygwin) doesn't map Windows PIDs, so kill zombies via `taskkill //F //PID <netstat-pid>` or two instances cause split-brain. Headless host snapshots only flow when you manually pump the host scene (`s.update(1/60)` in a real `setInterval`, since rAF is throttled); `__DBG.coopRoundTrip()` self-tests the whole encode→decode→render path offline.
- Git: commit messages via `git commit -F <file>` (PowerShell here-strings mangle `->`/parens). End commits with the Co-Authored-By trailer.
