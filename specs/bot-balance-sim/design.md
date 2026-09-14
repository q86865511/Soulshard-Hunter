# bot-balance-sim — 技術設計（design.md）

> 建立日期：2026-09-14｜狀態：已核可（2026-09-14）
> 對照 requirements.md 撰寫；每條 R# 都必須出現在需求對應表。

## 架構概述

新增 `tools/bot/`，不動 `src/`。三層：**純函式層**（`strategy/*.mjs`、`record.mjs`、`summarize.mjs`、`plan.mjs`）只用標準 JS，Node 與瀏覽器共用；**頁內驅動層**（`driver.mjs`）由 `tools/serve.mjs` 以靜態檔供給瀏覽器，`import('/src/game/…')` 直接操作既有模組（與 index.html 同一模組實例），負責建局、每格清暫停、餵 `world.inputFor`、收集結果；**Node CLI 層**（`run.mjs`）用 `test/node_modules` 的 Playwright 開 headless Chromium，維護工作佇列、每局一個乾淨 context、逐行 append `out/runs.jsonl`，最後 `summarize()` 產 `report.md`。資料流：CLI → `page.evaluate(driver.step)` 批次 → 結束回傳 record → 驗證 → JSONL → 彙整。

## 需求對應表

| 需求 | 設計元素 | 說明 |
|---|---|---|
| R1 | `run.mjs`（CLI）＋`plan.mjs`（`parseArgs`/`expandCombos`）＋`ids.json` | 參數解析、組合展開、`--dry-run` 只印數量與估時；未知 id／`--runs 0` → `UsageError` exit 1 |
| R2 | `driver.mjs`：`setup/startRun/step/collect/lastError` | `newRun`＋`setScene(refs.run)`＋`applyPending()`；每格 `clearPauses()`→`resolveChoices()`→`scene.update(1/60)`；終止 `scene.dead` 或超上限 |
| R3 | `strategy/move.mjs` → `decideMove(view)` | 純函式；斥力/引力/牆面取樣的候選方向評分 |
| R4 | `strategy/choice.mjs` → `decideChoice(kind, options, state, reg)` | 純函式；進化優先序＋滿級/滿槽過濾；tie-break 吃 seed |
| R5 | `record.mjs` → `makeRecord/validateRecord/TOOL_VERSION`；CLI `appendLine` | 欄位定義與驗證集中一處；一局一次 `appendFileSync(JSON.stringify(rec)+'\n')` |
| R6 | `summarize.mjs` → `summarize(records)` | 純函式產 Markdown；RNG 聲明段、格表、角色表、異常清單 |
| R7 | `run.mjs` `withCleanContext()`＋`driver.setup()` | 每局 `browser.newContext()`；`page.route('**/api/**', abort)` 計數；建局前 `META.settings.analytics=false` |
| R8 | `run.mjs` `pool(P)`＋`plan.mjs` `pendingCombos/shardOf/estimate` | P 個 worker 共用佇列；`simMs`/`ticks` 入紀錄；續跑與分片 |
| R9 | `strategy/rng.mjs` → `makeRng(seed)`＋`hashSeed(...)` | mulberry32；策略層唯一亂數源；報告開頭固定 RNG 聲明 |

## 介面與資料模型

### 純函式模組（零 Node API，瀏覽器可 `import('/tools/bot/…')`）

- `strategy/move.mjs`：`decideMove(view) → {move:{x,y}, dash}`。
  `view = { x, y, hpFrac, dashReady, ts, enemies:[{x,y,radius,boss,hpFrac,dist}], pickups:[{x,y,type}], blocked(wx,wy)→bool, seed }`。
- `strategy/choice.mjs`：`decideChoice(kind, options, state, reg) → number`（`-1`＝關閉/不買）。
  `state = { weapons:[{id,level,evolved,equipped}], passives:[id], passiveLevels:{}, equipment:{weapon,armor,trinket}, MAX_WEAPONS, MAX_PASSIVES, seed }`；`reg = { weapon(id)→{evolveReq,evolveInto,maxLevel}, equip(id)→{slot,tier,exclusive} }`。
- `strategy/rng.mjs`：`makeRng(seed)→()=>float`、`hashSeed(...parts)→uint32`。
- `record.mjs`：`TOOL_VERSION`、`makeRecord(cfg, raw)`、`validateRecord(obj)→string[]`。
- `summarize.mjs`：`summarize(records)→string`（Markdown）。
- `plan.mjs`：`parseArgs(argv)`、`expandCombos(opts)→Combo[]`、`keyOf(combo)`、`pendingCombos(all, doneKeys)`、`shardOf(list, i, n)`、`estimate(n, parallel, medianMs)`。

### JSONL 紀錄型別（一局一行；R5 全欄位）

`{biome, char, diff, mode, runIdx, seed, result:'clear'|'death'|'leave'|'timeout'|'error', time, level, kills, score, stage, deathSrc, dmgTakenBySrc:[[src,v]×5], dmgBySource:[[src,v]×5], weapons:[id], abilities:[id], bossKills, reaperSlain, hpTimeline:[0..1], simMs, ticks, error?, toolVersion}`

### 頁內驅動 `driver.mjs`

職責：建局、清暫停、解選擇、供輸入、取樣、收尾。
`setup(opts)`（等 `window.__DBG`、關遙測、`META.tutorialHUDDone=true`）、`startRun(cfg)`、`step(nTicks)→{time,dead,ticks}`、`collect()→raw`、`lastError()`。

### 程式接點（2026-09-14 查證）

- **(a) 升級三選一**：`scene.choice = { options, hover, bondHints }`（`src/game/scenes/run/combat.js:71`）；option＝`{kind:'weapon'|'weaponup'|'ability'|'fuse', id, def, weight, level?}`（`src/game/progression.js:23,26,31,46`）。選第 i 項＝`applyChoice(run, player, world, options[i])`（`progression.js:68`）後 `scene.choice=null; scene.peekBuild=false`（原生路徑 `combat.js:93-96`）。
- **(b) 其餘暫停選擇**：`equipChoice = { def }`（`combat.js:150`，另有 `equipQueue`），接受/丟棄＝`scene.resolveEquip(true|false)`（`combat.js:168-173`，自動接上佇列下一件）；`eventChoice` 是**陣列**（`modes.js:27`），選擇＝`scene.applyEvent(eventChoice[i])`（`modes.js:42`）；`curseChoice` 是陣列（`modes.js:79`），`scene.applyCurse(curseChoice[i])`（`modes.js:88`）；`shopChoice = { kind:'stat'|'gear', opts:[] }`（`shop_hidden.js:69,81`），關閉＝`scene.shopChoice=null`（對應 Esc 路徑 `shop_hidden.js:49`）。`anvilChoice` 在現行 `src/game/scenes/run/` 已不存在（0 命中；CLAUDE.md 該條過時，於文件關卡修正）；驅動層仍防禦性清空。
- **(c) 武器/持有物**：`Weapons` registry（`src/game/content/registry.js:33`），`Weapons.get(id)` 的 def 帶 `evolveInto`/`evolveReq`（示例 `content/weapons.js:58,109`；`evolveReq` 是被動 id）；上限用 `weaponMaxLevel(def)`／`isWeaponMaxed(inst)`（`src/game/balance.js:269-270`）。玩家武器＝`player.weapons = [{def, level, t, st}]`（`src/game/player.js:41`，`hasWeapon` :54）；被動存在 run 上：`run.abilities`（id 陣列，`content/abilities.js:144` 推入）與 `run.abilityLevels`（`state.js:331-332`）；上限 `MAX_WEAPONS=6`/`MAX_PASSIVES=14`（`progression.js:12-13`），signature（`def.equipped`）不佔槽（`progression.js:25`）。
- **(d) 世界查詢**：`world.enemies`（`src/game/world.js:115`；元素有 `x,y,radius,dead,spawnT,hp/maxHp`，boss 判定走 `e.def.boss`）、`world.pickups`（`world.js:117`，`addPickup` :314）、阻擋 `world.solidAt(wx,wy)`（世界座標，`world.js:235`）／`world.solidTile(tx,ty)`（格座標，:234），`TS=16`（`world.js:18`）。
- **(e) 玩家狀態**：`player.hp`（`player.js:35`）、`player.maxHp` 是 **getter**（`player.js:50`，禁止指派）、`player.dashCd`（遞減 `player.js:178`、重置 :208）→ `dashReady = player.dashCd <= 0`。netInput 的 dash 有效（`player.js:183-185,201`），`move` 會被 `clampAxis` 正規化到長度 ≤1（`player.js:12-18`）。
- **(f) 模組實例**：`index.html:135` 以 `<script type="module" src="./src/main.js">` 載入，其相依解析為 `/src/game/state.js`；頁內 `import('/src/game/state.js')` 是同一 URL ⇒ 同一模組實例（`META`/`refs` 為同一單例）。整合測試以 `(await import('/src/game/state.js')).META === __DBG.meta()` 於執行期再確認一次（`__DBG.meta` 即 `getMeta`，`src/main.js:99`）。

## 關鍵流程

### 單局（driver 內）

1. CLI 開 `browser.newContext()`（乾淨 localStorage）→ `page.route('**/api/**', r=>{apiHits++; r.abort();})` → `goto('http://127.0.0.1:5173/')`。
2. `page.evaluate(setup)`：等 `window.__DBG`；`META.settings.analytics=false`、`META.tutorialHUDDone=true`（避開 `hudTut` 重觸發）；不呼叫 `saveMeta`（context 用完即棄）。
3. 建局：`const run = newRun({biomeId, characterId, difficulty, mode:'normal'})`（`state.js:315`）→ `setScene(refs.run,{run}); applyPending();`（同 `__DBG.startRun`，`main.js:105`）→ 取 `getScene()`。掛 `scene.world.inputFor = (p) => p === scene.player ? lastInput : undefined`（`world.js:128,445`）。
4. pump 迴圈（每格）：
   a. `clearPauses()`：`paused/leaveConfirm/hudTut/showBuild/bigMap/shopOpen=false`、`story=null`、`hiddenPanel=null`、`shopChoice=null`、`anvilChoice=null`（防禦）；`settingsUI.open` 不會被開啟（無鍵盤事件），若為真則記警告。
   b. `resolveChoices()`：依 (a)(b) 的結構把 `choice/equipChoice/eventChoice/curseChoice` 交給 `decideChoice`，`-1` 則直接清空（放棄）。
   c. 建 `view` → `lastInput = decideMove(view)`；策略連續 120 格回零向量時，驅動層疊加一個緩慢環繞位移（防 anti-AFK 直寫 hp；策略層保持 R3 的零向量語義）。
   d. `scene.update(1/60)`；`ticks++`；每 1800 格取 `player.hp/player.maxHp` 進 `hpTimeline`。
   e. 終止：`scene.dead === true`（`finishRun` 寫 `run.result`，`modes.js:262-266`；`abandon` 寫 `'leave'`，`combat.js:229-236`）或 `ticks > (LEVEL_TIME+REAPER_DELAY+120)*60` → `result='timeout'`。
5. 批次回主程序：`step()` 每次跑 900 格回傳精簡狀態；`collect()` 回 raw（run 欄位＋`hpTimeline`/`simMs`/`ticks`）。
6. Node 端 `makeRecord()`→`validateRecord()`（非空即記 `error`）→ append 一行 → 關 context。

### 批次調度（run.mjs）

`parseArgs` → 讀/校驗 `ids.json`（有瀏覽器時與 live registry 比對，不符則覆寫並警告）→ `expandCombos` →（`--shard i/n`）`shardOf` →（讀既有 `runs.jsonl` 得 `doneKeys`）`pendingCombos` → 起（或沿用 5173 的）`tools/serve.mjs` → 開 1 個 browser、P 個 worker；每個 worker `while (job = queue.shift())` 各自開關 context。`page.on('pageerror')`／context 關閉／`evaluate` 逾時 → 該局記 `result:'error'`＋`error` 字串，worker 重開 context 續跑（連續 3 次失敗才讓該 worker 退出並回報）；每 50 局重開 browser。全部完成後寫 `report.md`＋印 `/api/` 攔截計數。

## 取捨與替代方案

- 採用：**自寫 tick 迴圈**而非 `__DBG.autoplay`——autoplay 走真實時間 `setInterval`、只處理升級三選一，headless 下 rAF 被節流會卡死，且 20 分鐘局必須比實時快數十倍。
- 採用：**`world.inputFor` 注入**而非合成鍵盤事件——`inputFor` 是既有的 co-op 注入點（`world.js:445`、消費 `player.js:174-210`），支援 `{move,dash}` 且不必碰 `input.js`，也不受瀏覽器焦點/節流影響；鍵盤事件還得自己處理 `justDown` 的每格清除。
- 採用：**Node 22 內建 `node --test`** 而非引入 vitest——非功能需求要求零新 runtime 依賴，CI 的 Node 已升 22（commit 57010d5），`test/` 只保留既有 Playwright。
- 採用：**dt = 1/60 固定步**、批次 900 格（＝15 模擬秒）——dt 與遊戲預設步長一致，避免 dt 放大改變命中/狀態 tick 行為（放大到 1/30 會改變平衡結論，等於量錯東西）；批次太小則每局上百次 `evaluate` 往返，太大則單次 evaluate 可能逼近 Playwright 預設 30 s 逾時且崩潰時損失整段進度。900 格在推估 ~40× 實時下約 0.4 s/批、84 批/局，兩端都安全（BENCH 任務校正）。
- 採用：**`ids.json` 由工具生成並自我校正**——直接解析 `src/art/biomes.js`/角色分散多檔的 regex 太脆，Node 端靜態 import 又會碰到 canvas；生成式清單同時滿足「不硬編」與「dry-run 不開瀏覽器」。已核可為進 git 的生成檔。
- 捨棄：把 `scene.coop` 設為真值讓事件/詛咒自動解（`modes.js:26,78`）——會連帶開啟廣播與 host 分支，污染基準。
- 補充（需求核可後因 6750 局規模推導）：`--shard i/n` 與續跑（讀 `runs.jsonl` 跳過已完成 key）列為 R8 的設計元素；單機全量估計 15–40 小時，必須能中斷續跑與跨機分片。

## 風險

- **長跑記憶體/頁面崩潰**：每局換 context 是主要緩解；另每 50 局重開 browser、worker 遇 `pageerror`/closed 記 `error` 後重開 context；`evaluate` 逾時視為崩潰。
- **遊戲 RNG 不可控**：`Math.random` 直接散布在生成/掉落/選項池（如 `progression.js:53` 的 `rng.weighted`），無法以 seed 固定；緩解＝每格 5 局並在報告與紀錄中明記（R9 聲明字串），分析只看分布不看單局。
- **CPU 成本估不準**：估算法＝先在目標機跑 `--parallel 1 --runs 1` 的 hunter/crypt/diff1 取 `simMs` 中位數寫入 `BENCH.md`，再跑 `--parallel 4` 的 4 局量**每局實際 simMs 的膨脹倍率**（Chromium 每頁一個 renderer 行程，CPU-bound 時會互相排擠），總時 ≈ `局數 × 中位 simMs × 膨脹倍率 / P`；`--dry-run` 用 `BENCH.md` 的中位數換算並印出。
- **策略太弱導致「難度過高」的偽結論**：報告固定註明策略等級（走位＋懂進化的選擇，不含技能取捨最佳化），並以 diff1 的通關率當合理性下限；若 diff1 通關率接近 0%，先懷疑策略而非平衡。
- **頁內外模組不同實例**（(f) 若未來 index.html 改帶 query）：整合測試以 `META === __DBG.meta()` 斷言，改動即紅。

## 測試策略

測試框架與指令：純函式＝Node 22 內建 `node --test tools/bot/test/`（於 `test/` 目錄以 `npm run test:bot` 執行）；驅動層整合＝`node tools/bot/test/integration.mjs`（用 `test/node_modules` 的 Playwright，`createRequire` 取用，範式同 `test/frontend-smoke.mjs:43-51,79-97`），以 `--maxSimSec 60` 覆寫模擬上限跑短局。全案 TDD：先紅後綠。

| R# | 測試案例名 | 輸入/前置 | 預期結果 | 層級 |
|---|---|---|---|---|
| R1 | parseArgs 展開與錯誤 | `--biomes crypt --chars hunter --diffs 1 --runs 1`／未知 id／`--runs 0` | 1 組合；未知 id 與 runs 0 各拋 `UsageError` 含合法 id 清單 | 單元 |
| R1 | dry-run 不開瀏覽器 | `--dry-run --biomes all --diffs 1,3 --runs 2` | stdout 含組合數與估時；`out/` 未建立；無 Playwright 呼叫 | 整合 |
| R1 | ids.json 與 live registry 一致 | 開一頁讀 `BIOMES`/`Characters.ids()` | 與 `ids.json` 深相等（10 / 27） | 整合 |
| R2 | 短局可終止且時間前進 | `--maxSimSec 60`、hunter/crypt/diff1 | `result ∈ {death,timeout}`；20 模擬秒時 `run.time ≥ 19`（story/hudTut 未凍結） | 整合 |
| R2 | 選擇不卡局 | 同上，強制注入一次 `scene.choice` | 下一格前 `scene.choice === null`，且持有物有變 | 整合 |
| R2 | pageerror 記錄 | 注入 `throw` | 該局 `result:'error'` 且 `error` 非空，程序續跑 | 整合 |
| R3 | 逃離右方敵人 | 單敵正右 | `move.x < 0` | 單元 |
| R3 | 三面包圍走東側 | 北西南各一敵 | `move.x > 0 且 |move.y| < |move.x|` | 單元 |
| R3 | 無敵人撿拾物 | 右上 pickup | `move.x>0 && move.y<0` | 單元 |
| R3 | 不撞牆 | 敵在右、左側 blocked | `|move.x| < 0.2` 或改走 y | 單元 |
| R3 | 低血近敵閃避 | `hpFrac 0.3`、敵距 20、`dashReady` true/false | 各為 `dash:true` / `false` | 單元 |
| R3 | 空場零向量 | 無敵無拾 | `move` 為 `{x:0,y:0}`、`dash:false` | 單元 |
| R4 | 優先拿進化被動 | 持 A（`evolveReq:'power'`）未進化、options 含 power | 回 power 的 index | 單元 |
| R4 | 不選滿級升級/滿槽新武器 | A 已滿級；weapons 已 6 | 不回該 index；全滿級時回第一個非武器項 | 單元 |
| R4 | 一般優先序與 tie-break | 多選項同分 | 升級＞新武器＞被動＞其他；同 seed 連跑 2 次同結果 | 單元 |
| R4 | equip 只換高 tier、不動 signature | 同槽 tier 高／weapon 槽／空陣列 | 回 0／`-1`／`-1` | 單元 |
| R4 | event/curse/shop 與未知 kind | 各 kind | `0`／`0`／`-1`；未知 kind `-1` 不拋例外 | 單元 |
| R5 | validateRecord | 合法紀錄／缺 `result`／`time` 為字串 | `[]`／`['result']`／`['time']` | 單元 |
| R5 | timeout/error 局也成行 | 兩種 raw | 各產一行合法 JSON，`time` 為當時模擬秒數 | 單元 |
| R5 | 單行原子性 | append 一筆 | 檔尾恰多一行且 `JSON.parse` 可還原 | 整合 |
| R6 | 固定 fixture 報表 | 6 筆／2 生態 2 角色 | 含指定格列字串與異常項（0%/100%、單一死因≥60%、角色極差≥50pp） | 單元 |
| R6 | 空輸入與不計分母 | `[]`；含 timeout/error | 含「無資料」不拋例外；通關率分母排除且註明筆數 | 單元 |
| R7 | API 全攔截 | 跑 1 短局 | 攔截計數 ≥0 且全部 abort，輸出印出計數 | 整合 |
| R7 | context 隔離 | 連跑 2 局 | 第二局 `META.stats.history` 不含第一局 | 整合 |
| R7 | src/ 未被修改 | 跑完批次 | `git status --porcelain src/` 為空 | 實跑 |
| R8 | 並行 4 組合各 1 行 | `--parallel 2 --runs 1`、4 組合 | `runs.jsonl` 恰 4 行、key 不重複 | 整合 |
| R8 | 續跑與分片 | 既有 2 行 + 同參數重跑；`--shard 1/2`+`2/2` | 只補未完成的 2 行；兩分片聯集＝全集、交集為空 | 單元 |
| R8 | 單局基準 | hunter/crypt/diff1、`--parallel 1` | `simMs` 中位數寫入 `specs/bot-balance-sim/BENCH.md` | 實跑 |
| R9 | 策略可重現 | 同 seed 同輸入 ×100 | `decideMove`/`decideChoice` 輸出深相等 | 單元 |
| R9 | RNG 聲明 | `summarize(fixture)` | 開頭含「遊戲 RNG 不受控」字串 | 單元 |

<!-- 免TDD 任務（見 tasks.md）的替代驗證：T0 以 `npm run test:bot` 實跑 exit 0；T8 以 BENCH.md 實測數字＋`git status --porcelain src/` 為空；T9 以三檔 diff 存在；T10 以 runs.jsonl 行數＝6750 與摘要檔存在。 -->
