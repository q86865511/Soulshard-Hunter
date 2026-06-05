# Soulshard Hunter — Overhaul Change Log

This document records the overhaul implemented against the development spec, mapped
to the original requirement IDs (`[原#N]` / A–G). Every difficulty / economy / pacing
value now lives in **`src/game/balance.js`** so it can be tuned without hunting through
gameplay code (per the spec's "centralise the magic numbers" instruction).

> Decisions confirmed up-front: **run length switched 30 → 20 min**; **weapon level cap = 7**
> (character level is uncapped); fusion gates on **2+ maxed weapons OR 1 maxed weapon + a
> passive**. The spec's "-300%" was treated as "scale player power down + enemy power up via
> coefficients, then playtest" (a literal -300% is a negative/inverted value).

## A. Lobby / progression
- **A1** — Quests (`任務公會`) and achievements (`成就殿堂`) are now walkable **buildings** in the
  hub (new sprites in `src/art/lobby.js`); walk up + `E`, click, or `3`/`4` opens their panels.
- **A2** — Achievements are an **unlock source**. `reward()` hooks unlock content into
  `META.unlocked.*`; gameplay pools (level-up weapons/abilities, equipment drops + shop) consult
  `src/game/content/unlocks.js`, so locked content (`追魂彈/連鎖閃電/巨型魂晶/玻璃大砲/加農法杖`)
  only appears once earned. The panel shows each unlock target + **live progress**; `reconcileUnlocks`
  re-grants on load.
- **A3** — Icons/sprites are freely reused across categories via `iconOr` (NPCs reuse `hub_well`/`wisp`).

## B. Items / equipment
- **B1** — Equipment drops open a **paused choose-to-equip menu** (categorised by 專武/護甲/飾品, the
  target slot highlighted; replace or discard; multiple drops queue). Shop-bought gear still equips directly.
- **B2** — The four stored-item slots are **removed**; ground items are **used the instant they're
  picked up** with a floating name + effect.

## C. Shop / economy
- **C1** — Buying a stat anvil opens a **paused 3-of-10 random pick** (modal shop keeps the field frozen).
- **C2** — A **"can-fuse" hint** (rising-edge banner + `✦可合成` marker) appears without revealing the
  recipe; fusion occupies a level-up slot.
- **C3** — Soulshard prices cut: anvil base 26 (was 40–55), growth ×1.2 (was ×1.3), gear markup ×1.3
  (was ×1.6); gold drops ×0.5.

## D. Combat / balance (core)
- **D1** — Player weapon damage ×0.78, lifesteal ×0.45 (cap 0.20), dodge ×0.5 (cap 0.35); trash-mob
  HP ×1.35 / damage ×1.3; gold ×0.5, drop chance ×0.6. Base HP 85 → 100 for a fair early game.
- **D2** — The shrink-zone is replaced by a **surround event**: a clump of very tanky monsters rings the
  player and closes in (killable — carve a gap and dash out).
- **D3** — The Higgs bomb now **lingers**, lobbing delayed blasts every ~1.5 s to zone the player; special
  (`s_*`) monsters are injected into the spawn stream more often.
- **D4** — Ranged enemies fire ×1.55 slower and are far less likely in the active roster; enemies speed up
  over time (+up to 60%); more melee.
- **D5** — Shooter bursts capped at 3; evolved Soulstorm 12 → 8 shots; fire-fan pellet count cut.
- **D6** — New **status-effect system** (`src/game/status.js`): slow / bleed / burn / poison (DoT) and
  stun / knockup (CC). Player weapons (fire→burn, lightning→stun, nova→knockup) and 3 new passives
  (`霜噬/裂創/燃魂`) apply them to enemies; themed enemies + bosses apply them to the player
  (chance-gated, gentler) and bosses knock the player up on phase shifts (E3 control).

## E. Levels / boss / map
- **E1** — Map grows to **138×102** (was 104×76) with more obstacles, walled rooms, hazards and chests;
  trap damage ×1.7; interactive **NPCs** (祈願水井 boon, 迷途之魂 resources).
- **E2** — Run is **20 min**: a **distinct mini-boss at 5/10/15 min** (never the biome final boss, never
  repeated), the **final boss at 20:00**, then 30 s after it dies a **killable Reaper (死神)** descends
  (new boss + sprite). Slaying it grants a legend bonus; press `E` to leave as a win during the window.
- **E3** — Bosses buffed (HP ×1.3 / dmg ×1.35 on top of per-boss scaling) and gain control (phase-shift
  knock-up + themed DoT).

## F. Technical
- **F1** — Improved enemy wall-avoidance: pick the smallest clear course change (double-probe) and slide
  along walls when boxed in.
- **F2** — Hidden **developer mode** (`src/game/cheats.js`): the Konami code (↑↑↓↓←→←→ B A) toggles an
  in-run panel — godmode / time-warp ×3 / +gold / level-up / spawn / kill / unlock-all / force-clear.
  Also reachable via `window.__CHEATS`.

## G. UI / UX / narrative
- **G1** — HP bar gains a gloss highlight; level shows as a rounded `Lv N` badge (uncapped); a player
  **status-effect chip row** (D6 feedback); the **minimap moved to the top-right, left of the gold
  counter**, with a rounded frame + boss/NPC dots.
- **G2** — Character art gets palette-derived shading (belt / stud / rim light); the panel/menu system
  is consistently styled (shop 3-choice, equip menu, achievements).
- **G3** — A **cinematic letterbox** plays the current story chapter at run start (typewriter text,
  skippable with Space).

## Verification
All phases were validated headlessly via the `window.__DBG` manual-pump harness: the status system, the
20-min timeline (mini-bosses at 300/600/900 s → final boss at 1200 s → Reaper at 1230 s), the unlock
gating, the shop/equip/anvil flows, and the cheat panel were all exercised without runtime errors.
Balance was simulated with bot "players"; a hazard-aware kiting build holds full HP through minute one,
confirming combat intake is fair and that the raised traps are the main early threat to respect. Tune
further in `src/game/balance.js`.
