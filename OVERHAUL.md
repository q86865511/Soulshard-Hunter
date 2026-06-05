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

---

# 第二輪改動（Round 2）

依使用者追加需求，沿用同樣的逐項實作流程：

1. **結算畫面 UI 優化**：死亡 / 通關結算頁呈現本局的**武器（含等級）、被動、裝備**，並標示它們造成的**實際數值/效果**（武器傷害、吸血、回復、減傷…）供玩家參考；同時列出**本局解鎖的成就 / 推進的任務 / 解鎖的內容**。
2. **死神大幅強化**：死神血量/數值調到非常高，需長時間堆疊（高 DPS + 生存）才打得贏，定位為「打到後期高難度回頭才能擊殺」的隱藏終極王，而非運氣硬拚的秒殺戰。數值收進 `balance.js` 的 `REAPER_*`。
3. **小王事件三選一**：5/10/15 分的三隻小王擊殺後，掉落**事件選擇**（仿 LoL 競技場，由不同「非英雄角色」提供）——**完全隨機三選一**，效果多樣：如「移除一件裝備/武器換取更高一階的隨機三選一」、限時挑戰小任務（時間內不受傷 → 給裝備/能力）、各種風險/收益取捨等。事件池需夠多種。
4. **成就 / 任務擴充**：成就 + 任務種類增加到**至少 100 種**（多維度里程碑 + 更多故事章節 + 新追蹤統計）。

完成後更新 README 並上傳 GitHub。

**實作完成（已 headless 驗證）：**
- 結算頁 `drawResultSummary`（src/game/scenes/run.js）：配置 + 數值效果 + 本局解鎖；`bankRun` 回傳新解鎖供顯示（state.js）。
- 死神數值 `BALANCE.REAPER_*`（balance.js）：威脅 13 時血量約 17 萬，定位終極 DPS 試煉。
- 小王事件：事件池 `src/game/content/events.js`（22 種，含增益/風險/犧牲/限時挑戰），`onBossDead` 掉落三選一 + 計時挑戰系統。
- 成就 114 種（`achievements.js` 以分層家族生成 + 5 個解鎖獎勵 + 隱藏）、故事任務 15 章（`quests.js`）；新增追蹤 `reaperKills/miniBossKills/clears`。

---

# 第三輪改動（Round 3）

修正一個回歸並追加六項：

1. **結算/選角資訊**：選角頁顯示游標所指英雄的**能力差異與起始武器**（讀 `desc`/`startWeapon`/`passive`）。
2. **死神大幅強化**：`BALANCE.REAPER_*` 拉高——威脅 13 時血量約 **17 萬**，定位需長期堆疊 DPS 才能擊殺的終極王。
3. **裝備鐵砧三選一**：魂晶商店改為兩種鐵砧——**裝備鐵砧（史詩/稜彩三選一）**與能力值鐵砧，皆隨機三選一（`shopChoice`，移除舊的直購裝備卡）。
4. **小地圖**：移到**血量/衝刺 UI 下方（左上）**並放大；大地圖與小地圖共用 `plotMinimap`，圖示一致（敵人/首領/NPC/包圍怪/寶箱/商店/玩家）。
5. **大廳造型坊**：新增 `造型坊` 站點，可用金幣購買並套用同一英雄的**替換造型（5 種重染色）**；造型 sprite **延遲生成**（gen 英雄在本模組載入後才註冊，故不能在載入時就批次生成，否則顯示洋紅色佔位）。存於 `META.skins / ownedSkins`，套用後城鎮與局內皆生效。
6. **任務系統**：主線**常駐顯示於螢幕左側**（城鎮左上、局內小地圖下方）；**任務公會**可接取/領取**一般任務**，達成條件後**隱藏任務**現身；任意公會任務可**點選追蹤**同步到左側（`META.trackedQuest`）。
7. **修正**：成就頁崩潰（家族成就的 `prog(stats)` 未帶入 `meta` → 讀 `m.levels` 報錯）；改為傳入 META 並加防護。

新增資料：`content/events.js`（Round 2 小王事件 22 種）、`SKINS` 造型 5 種、`SIDE_QUESTS` 6 + `HIDDEN_QUESTS` 3。完整 20 分鐘流程已 headless 跑通（小王→事件、最終王、死神 17 萬血、通關結算、解鎖），全程無錯誤。

## Round 4（原#1–19 後續）

第四輪針對 19 點需求逐項修正，並以**約 270 場無頭模擬**（21 英雄 × D1–3）平衡數值。完整對照、
模擬方法與結果見 **[`ROUND4.md`](ROUND4.md)**。重點：

- **#1/#4** 裝備/鐵砧三選一顯示**替換前後屬性差異**；商店改 **B 鍵**開啟（離開地圖），小怪也掉魂晶。
- **#5** 自動瞄準縮短到 300 並加**視線判定**（隔牆不鎖）。**#3** 生成更密但加開局緩衝。
- **#2/#8** 互動物（水井/迷途之魂/魂晶礦脈/流浪鐵匠）**定時刷新**＋滑鼠懸停看名稱與效果。
- **#9** 包圍改「**魂牢**」：更多極慢厚血怪＋結界鎖，必須清空才能脫身。**#15** 防掛機緩慢扣血。
- **#10** 美化血量/經驗/衝刺 HUD。**#19** 城鎮長頁面加可拖曳縱向捲軸。
- **#11** 特殊怪：金甲竊賊/噬識魅影/引爆魔偶/黑市掮客（偷錢偷經驗、死亡爆炸的引擎掛鉤）。
- **#13** 新增 **羈絆系統**（13 種）。**#14** 小王三選一改為**自創角色贊助者**（頭像＋持續效果）。
- **#16** 結算頁**傷害排行表**＋圖示懸停看效果（`run.dmgBySource` 全程歸戶）。
- **#17** 全英雄**差異化體型**（`art/heroes.js` 14 原型，非換色）。**#18** **角色專屬武器**（只在該角鐵砧）。
- **#6/#7** 內容擴充：英雄 17→21、武器 24→30、被動 45→53、道具 22→28、造型 5→11（武器/被動/道具/英雄
  由多代理 **Workflow** 並行產生）。**#12** 吸血/回血/減傷/投射物全面下修。
- **平衡**：開局過於致命 → 下修敵方傷害/血量、加 110s 開局緩衝、續戰流與金幣暴走（賭徒）修正；
  難度梯度成立、20 分通關可達成、全程 0 runtime error。
