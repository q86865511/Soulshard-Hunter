# CLAUDE.md — Soulshard Hunter (魂晶獵手)

Dev guide for working on this repo. Read this before editing.

## What it is
A single-player, Vampire-Survivors-style pixel roguelike. **Vanilla HTML5 Canvas + ES Modules, no build step, no external assets.** All pixel art is procedurally generated in code; all SFX/music are WebAudio-synthesised. Walk-only control — weapons auto-target and fire.

## Current state (rounds 1–5 done)
A run = one biome, **20 min**, at a chosen difficulty. Threat ramps 1→~13; distinct mini-bosses at 5/10/15 min; biome final boss at 20:00 → clear unlocks the next biome + difficulty; a killable Reaper descends 30 s later. Content registry now holds **21 heroes · 30 weapons · 53 passives · 28 items · 48 enemies · 15 skins (4 hidden full-body) · 13 bonds · 8 exclusive weapons · 16 patron events**, plus **180+ achievements** (many gate content unlocks) and a **12-rank guild reputation track**.
Systems in place: status effects, bonds/synergies, character-exclusive weapons, unique per-hero body art, damage attribution + results ranking, B-key shop with before/after equip diffs, refreshing map interactables + hover tooltips, "soul-jail" must-clear surround, anti-AFK drain, achievement-gated unlocks, hub scrollbars. **Round 5** rebuilt the hub into a **multi-room town** (church · guild · blacksmith · clothing store · achievement hall · personal room + central plaza) with **10 talkable NPCs**, a guild-reputation rank track with claimable rewards, out-of-run weapon **forging** (level + up to 3 effects), and a rotating **clothing store**; skins now add unique accessories, not just recolours. **Round 5b** then made the swarm far denser (up to **~230 on-screen**, "being chased" feel), gave the clothing store **two tabs** (owned-browser + a shop that refreshes every 30 real minutes) with **hidden full-body skins**, added **buy-confirm + per-category reset** to all hub spends, and **per-room hub colour**. Balance is **sim-tuned**; flows verified across 5 biomes × difficulties 1–5 (full 20-min clears, zero errors). Per-round detail lives in **`docs/changelog/`** (newest = `ROUND5.md`, which has a Round-5b section); keep that the single home for version notes — don't scatter changelog `.md` files in the repo root.

## Run / test
- **Serve:** `node tools/serve.mjs` → http://localhost:5173 (a no-cache static server — do NOT use `python -m http.server`; it serves STALE ES modules after edits and silently breaks testing). `.claude/launch.json` exposes it as preview server "game".
- **Self-test in the browser:** `window.__DBG` exposes `snap()`, `reg()` (registry counts), `startRun()`, `autoplay(secs)`, `gallery()`, `enemyIds()`, `scene()`, `meta()`.
- **IMPORTANT — headless preview throttles `requestAnimationFrame`**, so `__DBG.autoplay` barely ticks and screenshots can be stale. Instead drive the sim manually from `preview_eval`:
  ```js
  const s = __DBG.scene(); s.player.takeDamage = () => {};      // godmode for inspection
  for (let i = 0; i < 9000; i++) { if (s.choice) s.choice = null; s.update(1/60); }
  ```
  Then read `s.run` / `s.world`. Call `s.render()` **sparsely** — it's expensive; rendering every tick can exceed the eval timeout. To screenshot a panel, set the field (`s.showBuild=true`, `s.bigMap=true`, a hub `s.panel='sortie'`) then call `s.render()` once.
- `window.__GAME_ERROR__` + the `#fatal` overlay surface uncaught errors.
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
    core.js icons.js content_icons.js hub.js biomes.js weapons.js
    gen/                    ← workflow-generated art (auto-loaded, fault-isolated)
  game/
    state.js                save/META, run lifecycle, base stats (makeBaseStats)
    scene.js  scenes/       title / hub / run (+ refs.js decoupler)
    world.js                tilemap collision, entities, combat, hazards, loot
    player.js  enemy.js  projectile.js  pickup.js  hud.js  progression.js  maps.js
    content/
      registry.js           ← THE integration seam (Enemies/Items/Equipment/Abilities/Talents/Facilities/Weapons/Characters)
      enemies/abilities/items/equipment/talents/facilities/weapons/characters/achievements/quests.js
      gen/                  ← workflow-generated content (auto-loaded)
tools/  serve.mjs  integrate.mjs  (_wf_*/_*.mjs are gitignored scratch)
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
- **Content is data-driven** — register via `registry.js`. Never hard-code content in gameplay code; read from the registries.
- **New enemy:** `defineAnim('<sprite>', w, h, frames, (p,f)=>{ ...; p.outline(P.ink); }, {anchor:[ax,ay],fps})` then `Enemies.register({ id, sprite, ai:'chase|flyer|shooter|charger|wander', hp, speed, damage, radius, xp, gold, attack?, boss?, ... })`. Bosses (`boss:true`) auto-run the multi-phase system in enemy.js.
- **New weapon (auto-fire):** `Weapons.register({ id, icon:'weapon_<id>', tier, weight, maxLevel, cooldown(l), fire(world,p,inst), update?, draw?, levelDesc?, evolveInto?, evolveReq? })`. Evolves at maxLevel when the player owns `evolveReq` passive.
- **Icons:** `defineIcon('weapon_<id>'|'item_<id>'|'equip_<id>'|'ability_<id>', bgHex, (p)=>{...})`. **Character sprite:** `defineAnim('char_<id>',16,18,4,(p,f)=>{ drawHunter(p,f,art); p.outline(P.ink); },...)`.
- **Pixel API (`Painter`):** `px/rect/hline/vline/line/circle/ellipse/ring/mirrorX/outline/shadeBottom/replace`, shared palette `P`, `sym` icon primitives. Missing sprites render a magenta placeholder (no crash); use `iconOr(name, fallback)`.
- **Stats** live in `makeBaseStats()` (state.js). Only write stat fields that exist there, or you'll get `NaN`.
- Equipment slots: `armor`/`trinket` apply stat mods; `weapon`-slot equips become a real **signature auto-weapon** via `makeEquipWeaponDef` (equipItem). Weapon-slot equips are sold in the in-run shop, not dropped.

## Workflow content pipeline
Content was mass-produced by multi-agent Workflows (generate → adversarial review). A workflow returns `{result:{packs:[{key,code,ids,spriteNames,ok}]}}`; normalize to `{result:packs}` then run **`node tools/integrate.mjs <file.json>`** — it decodes HTML entities, prepends the import header, writes `src/art/gen/*` + `src/game/content/gen/*`, and rebuilds the fault-isolated dynamic-import indexes by scanning the dirs. Re-run to integrate new output.

## Round-4 systems (原#1–19 follow-up — see docs/changelog/ROUND4.md)
- **B key = shop** (`input.js KeyB→'shop'`): the soulshard/anvil shop opens anywhere, not via a map shrine (the shrine is now a one-time blessing altar). Equip pickups + anvil gear show a **before/after stat diff** (`run.js equipDiffRows`/`drawEquipDiff`; `equipment.js` records each slot's stat delta).
- **Bonds (羈絆)** `content/bonds.js`: build-combo synergies, one-shot applied via `checkBonds(run, player)` (throttled in `run.update`); shown in build/results panels.
- **Exclusive weapons** `content/exclusives.js`: `{exclusive:true}` weapon-slot gear injected only into the owner's anvil (`CHAR_EXCLUSIVE`, `rollGearChoice`).
- **Unique hero bodies** `art/heroes.js`: 14 archetype draw fns registered per char id via `registerHeroBody`; `characters.js`/gen hero packs call `drawHeroBody(p,f,id,art)` (falls back to `drawHunter`). Skins recolour the unique body.
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
- **Hero bodies** `art/heroes.js`: **18 archetypes**; `HERO_MAP` maps all 21 hero ids so no two share an archetype. **Load order matters:** `characters.js` imports `art/heroes.js` itself so `HERO_ART` is populated before its eager sprite-bake loop — `state.js` pulls `characters.js` in early (before main.js's own heroes.js import), so without that self-import the core heroes bake as generic hooded recolours.
- **Buy-confirm + reset (task-8)** `scenes/hub.js`: every hub gold-spend routes through `ask(text, detail, onYes)` → a confirm modal; each upgrade panel has a top-right **reset** button (`resetTalents`/`resetFacilities`/`resetForge`) that refunds all spent gold.
- **Swarm (task-11)** `balance.js`: `SPAWN_CAP_BASE/PER_THREAT/MAX` 14/7/260, `SPAWN_INTERVAL` 1.25→0.30, `ENEMY_HP_MULT` 1.45, `ENEMY_DMG_MULT` 1.08, `EARLY_GRACE` 140; `run.js` spawns groups of `2 + threat/1.5` from **2–4 concurrent types**. Difficulty comes from COUNT (D1 stays clearable); `diffMul` adds per-hit bite on D2–D5.
- **Achievements** `content/achievements.js`: expanded to 150+ across many tier families + per-biome clears + hidden goals; ~25 are unlock-tied (push ids into `meta.unlocked.*`). New lifetime stats live in `state.js makeBaseStats`/`bankRun` (`charClears`, `noDmgClears`, `bestCharLevel`, `bondsTriggered`, `forgeUpgrades`, `npcTalks`).
- **Konami vs B-shop** `cheats.js`: the Konami tail `…←→ B A` — when that `B` completes the prefix it sets `Cheats.eatShop`; `run.js` swallows exactly that one shop toggle so the cheat code never pops the shop. A normal B still opens it.

## Gotchas
- `KeyM` = **minimap**, `KeyB` = **shop** (not mute — mute lives in the settings menu). `Tab` = build page. Mouse `wheel` is wired (`mouse.wheel`); hub long panels have a draggable scrollbar.
- Save: key `soulshard.save.v1`, `SAVE_VERSION` + migration in `loadMeta`; reset backs up to `…v1.bak`.
- `node --check <file>` only checks syntax (won't resolve imports) — fine for a quick parse check; real validation = reload + the manual-pump test above.
- **Sprite bake is EAGER** (`defineAnim` runs the draw fn + caches frames at definition time). Any art a sprite depends on (e.g. `HERO_ART` bodies) must be registered BEFORE that sprite is defined; remember `state.js` transitively imports `content/characters.js` very early in boot, so character sprites bake before main.js's later art imports unless the dep is made explicit.
- Forge/grid rows that stash a non-rect payload in `r.w` must hit-test with a separate width field (e.g. `r.wd`) — `inside(mx,my,r)` reads `r.w` AS the width.
- Git: commit messages via `git commit -F <file>` (PowerShell here-strings mangle `->`/parens). End commits with the Co-Authored-By trailer.
