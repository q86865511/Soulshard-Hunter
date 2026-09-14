# bot-balance-sim — 技術設計（design.md）

> 建立日期：2026-09-14｜狀態：已核可（2026-09-14；Codex 二審 10 條意見依 2026-09-14 裁決修訂：1–9 全修、10 改 R9）
> 對照 requirements.md 撰寫；每條 R# 都必須出現在需求對應表。

## 架構概述

新增 `tools/bot/`，不動 `src/`。三層：**純函式層**（`strategy/*.mjs`、`record.mjs`、`summarize.mjs`、`plan.mjs`）只用標準 JS，Node 與瀏覽器共用；**頁內驅動層**（`driver.mjs`）由 `tools/serve.mjs` 以靜態檔供給瀏覽器，`import('/src/game/…')` 直接操作既有模組（與 index.html 同一模組實例），負責建局、每格清暫停、餵 `world.inputFor`、收集結果；**Node CLI 層**（`run.mjs`）用 `test/node_modules` 的 Playwright 開 headless Chromium，維護工作佇列、每局一個乾淨 context、逐行 append `out/runs.jsonl`，最後 `summarize()` 產 `report.md`。資料流：CLI → `page.evaluate(driver.step)` 批次 → 結束回傳 record → 驗證 → JSONL → 彙整。

## 需求對應表

| 需求 | 設計元素 | 說明 |
|---|---|---|
| R1 | `run.mjs`（CLI）＋`plan.mjs`（`parseArgs`/`expandCombos`）＋`ids.json` | 參數解析、組合展開、`--dry-run` 只印數量與估時；未知 id／`--runs 0` → `UsageError` exit 1 |
| R2 | `driver.mjs`：`setup/startRun/step/collect/lastError`＋CLI 的 `page.addInitScript(stubRaf)` | 載入前把 `requestAnimationFrame` 換成空函式停用引擎迴圈（`src/engine/loop.js:31-33` 只靠 rAF 排程；`startLoop` 的 `stop()` 把手未被 `src/main.js:498` 保留，故不改 src/ 只能從 rAF 下手）；`newRun`＋`setScene(refs.run)`＋`applyPending()`；每格 `clearPauses()`→`resolveChoices()`→`scene.update(1/120)`；終止 `scene.dead`、超上限、或通關後死神逾時由驅動層 `finishRun(true)` |
| R3 | `strategy/move.mjs` → `decideMove(view)` | 純函式；斥力/引力/牆面取樣的候選方向評分 |
| R4 | `strategy/choice.mjs` → `decideChoice(kind, options, state, reg)` | 純函式；進化配對＞fuse＞持有升級＞新武器＞被動＞其他；滿級/滿槽/已進化犧牲過濾；tie-break 吃 seed；equip 的 -1 由 driver 走 `resolveEquip(false)` |
| R5 | `record.mjs` → `makeRecord/validateRecord/TOOL_VERSION`；CLI `appendLine` | 欄位定義與驗證集中一處（含 `cleared/endReason/gameVersion`）；一局一次 `appendFileSync(JSON.stringify(rec)+'\n')` |
| R6 | `summarize.mjs` → `summarize(records)` | 純函式產 Markdown；RNG 聲明段、格表（有效筆數 0 → N/A）、角色表、異常清單 |
| R7 | `run.mjs` `withCleanContext()`＋`driver.setup()` | 每局 `browser.newContext()`；`page.route('**/api/**', abort)` 計數；建局前 `META.settings.analytics=false` |
| R8 | `run.mjs` `pool(P)`＋`plan.mjs` `pendingCombos/shardOf/estimate/checkBatchHeader/readJsonlTolerant` | P 個 worker 共用佇列、各 worker 自管 browser 生命週期；`simMs`/`ticks` 入紀錄；續跑（批次識別＋尾行恢復）與分片 |
| R9 | `strategy/rng.mjs` → `makeRng(seed)`＋`hashSeed(...)` | mulberry32；策略層唯一亂數源；報告開頭固定 RNG 聲明（JSONL 不帶聲明欄位） |

## 介面與資料模型

### 純函式模組（零 Node API，瀏覽器可 `import('/tools/bot/…')`）

- `strategy/move.mjs`：`decideMove(view) → {move:{x,y}, dash}`。
  `view = { x, y, hpFrac, dashReady, ts, enemies:[{x,y,radius,boss,hpFrac,dist}], pickups:[{x,y,type}], blocked(wx,wy)→bool, seed }`。
- `strategy/choice.mjs`：`decideChoice(kind, options, state, reg) → number`（`-1`＝關閉/不買）。
  `state = { weapons:[{id,level,evolved,equipped}], passives:[id], passiveLevels:{}, equipment:{weapon,armor,trinket}, MAX_WEAPONS, MAX_PASSIVES, seed }`；`reg = { weapon(id)→{evolveReq,evolveInto,maxLevel}, equip(id)→{slot,tier,exclusive} }`。
- `strategy/rng.mjs`：`makeRng(seed)→()=>float`、`hashSeed(...parts)→uint32`。
- `record.mjs`：`TOOL_VERSION`、`makeRecord(cfg, raw)`、`validateRecord(obj)→string[]`。
- `summarize.mjs`：`summarize(records)→string`（Markdown）。
- `plan.mjs`：`parseArgs(argv)`、`expandCombos(opts)→Combo[]`、`keyOf(combo)`（＝`biome|char|diff|runIdx`，不含 seed——seed 屬批次識別）、`pendingCombos(all, doneKeys)`、`shardOf(list, i, n)`、`estimate(n, parallel, medianMs)`、`checkBatchHeader(firstRecord, {toolVersion, seed, gameVersion})→string|null`（不符回原因字串）、`readJsonlTolerant(text)→{records, truncatedTail:boolean}`（尾行不可解析即丟棄並回報；中段不可解析拋 `CorruptError` 含行號）。

### JSONL 紀錄型別（一局一行；R5 全欄位）

`{biome, char, diff, mode, runIdx, seed, result:'clear'|'death'|'leave'|'timeout'|'error', cleared:boolean, endReason:'finishRun'|'abandon'|'reaper_timeout'|'sim_cap'|'error', time, level, kills, score, stage, deathSrc, dmgTakenBySrc:[[src,v]×5], dmgBySource:[[src,v]×5], weapons:[id], abilities:[id], bossKills, reaperSlain, hpTimeline:[0..1], simMs, ticks, error?, toolVersion, gameVersion}`

`result` 推導：`endReason==='error'` → `'error'`；`cleared` 為真 → `'clear'`（不論 `reaper_timeout`/`sim_cap`）；`run.result` 為 `'death'|'leave'` → 照抄；其餘 `sim_cap` → `'timeout'`。`gameVersion` 取 `GAME_VERSION`（`src/game/content/patchnotes.js`，頁內 import）。

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

1. CLI 開 `browser.newContext()`（乾淨 localStorage）→ `context.addInitScript(stubRaf)`（`window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}`，在任何頁面腳本前生效，引擎迴圈 `src/engine/loop.js:33` 的第一次排程即失效；驅動層成為唯一更新來源）→ `page.route('**/api/**', r=>{apiHits++; r.abort();})` → `goto('http://127.0.0.1:5173/')`。
2. `page.evaluate(setup)`：等 `window.__DBG`；`META.settings.analytics=false`、`META.tutorialHUDDone=true`（避開 `hudTut` 重觸發）；不呼叫 `saveMeta`（context 用完即棄）；讀 `GAME_VERSION`。
3. 建局：`const run = newRun({biomeId, characterId, difficulty, mode:'normal'})`（`state.js:315`）→ `setScene(refs.run,{run}); applyPending();`（同 `__DBG.startRun`，`main.js:105`）→ 取 `getScene()`。掛 `scene.world.inputFor = (p) => p === scene.player ? lastInput : undefined`（`world.js:128,445`）。
4. pump 迴圈（每格，**dt = 1/120**，與 `src/main.js:499` 的 `fixed: 1/120` 一致）：
   a. `clearPauses()`：`paused/leaveConfirm/hudTut/showBuild/bigMap/shopOpen=false`、`story=null`、`hiddenPanel=null`、`shopChoice=null`、`anvilChoice=null`（防禦）；`settingsUI.open` 不會被開啟（無鍵盤事件），若為真則記警告。
   b. `resolveChoices()`：`choice` → `decideChoice('level')`，index ≥0 走 `applyChoice`，-1 直接清空；`equipChoice` → `decideChoice('equip')`，0 走 `resolveEquip(true)`，**-1 走 `resolveEquip(false)`**（推進 `equipQueue`，下一件在下一格再交策略；不得直接 `equipChoice=null`）；`eventChoice`/`curseChoice` → `applyEvent/applyCurse(list[idx])`。
   c. 建 `view` → `lastInput = decideMove(view)`；策略連續 240 格（2 秒）回零向量時，驅動層疊加一個緩慢環繞位移（防 anti-AFK 直寫 hp；策略層保持 R3 的零向量語義）。
   d. `scene.update(1/120)`；`ticks++`；每 3600 格（30 秒）取 `player.hp/player.maxHp` 進 `hpTimeline`。
   e. 終止：
      - `scene.dead === true` → `endReason='finishRun'`（或 `run.result==='leave'` 時 `'abandon'`）；
      - `run.cleared === true` 且 `run.time ≥ scene.reaperAt + 60`（`scene.reaperAt` 由 `modes.js:232` 於尾王死亡時設為 `run.time + REAPER_DELAY`）→ 驅動層呼叫 `scene.finishRun(true)`，`endReason='reaper_timeout'`；
      - `ticks > (LEVEL_TIME+REAPER_DELAY+120)*120` → `endReason='sim_cap'`（`cleared` 為真仍算 clear）。
5. 批次回主程序：`step()` 每次跑 **1800 格（15 模擬秒）** 回傳精簡狀態；`collect()` 回 raw（run 欄位＋`cleared/endReason/hpTimeline/simMs/ticks/gameVersion`）。
6. Node 端 `makeRecord()`→`validateRecord()`（非空即記 `error`）→ append 一行 → 關 context。

### 批次調度（run.mjs）

`parseArgs` → 讀/校驗 `ids.json`（有瀏覽器時與 live registry 比對，不符則覆寫並警告）→ `expandCombos` →（`--shard i/n`）`shardOf` → 若 `runs.jsonl` 已存在：`readJsonlTolerant`（尾行截斷→警告續跑；中段損壞→`CorruptError` 非零退出）→ `checkBatchHeader(首行, {toolVersion, seed, gameVersion})` 不符→非零退出並提示改 `--out` → 得 `doneKeys` → `pendingCombos` → 起（或沿用 5173 的）`tools/serve.mjs` → 開 P 個 worker，**每個 worker 擁有自己的 browser**（`chromium.launch()` 各一），`while (job = queue.shift())` 各自開關 context；該 worker 每完成 50 局就關閉並重開**自己的** browser（在兩局之間，不影響其他 worker 的在途局）。`page.on('pageerror')`／context 關閉／`evaluate` 逾時 → 該局記 `result:'error'`＋`error` 字串，worker 重開 context 續跑（連續 3 次失敗才讓該 worker 退出並回報）。全部完成後寫 `report.md`＋印 `/api/` 攔截計數。

## 取捨與替代方案

- 採用：**自寫 tick 迴圈**而非 `__DBG.autoplay`——autoplay 走真實時間 `setInterval`、只處理升級三選一，headless 下 rAF 被節流會卡死，且 20 分鐘局必須比實時快數十倍。
- 採用：**`world.inputFor` 注入**而非合成鍵盤事件——`inputFor` 是既有的 co-op 注入點（`world.js:445`、消費 `player.js:174-210`），支援 `{move,dash}` 且不必碰 `input.js`，也不受瀏覽器焦點/節流影響；鍵盤事件還得自己處理 `justDown` 的每格清除。
- 採用：**Node 22 內建 `node --test`** 而非引入 vitest——非功能需求要求零新 runtime 依賴，CI 的 Node 已升 22（commit 57010d5），`test/` 只保留既有 Playwright。
- 採用：**dt = 1/120 固定步**、批次 1800 格（＝15 模擬秒）——與正式迴圈 `src/main.js:499` 的 `fixed: 1/120` 完全一致（二審指出原稿誤寫 1/60；`__DBG.pump` 的預設 1/60 是截圖用途，不是正式步長），避免步長差異改變碰撞/攻擊時序而讓平衡結論偏離正式遊戲；批次太小則每局上百次 `evaluate` 往返，太大則單次 evaluate 可能逼近 Playwright 預設 30 s 逾時且崩潰時損失整段進度。1800 格在推估 ~40× 實時下約 0.4 s/批、84 批/局，兩端都安全（BENCH 任務校正）。
- 採用：**以 `addInitScript` 置換 `requestAnimationFrame` 停用引擎迴圈**——`startLoop` 的 `stop()` 把手（`src/engine/loop.js:36`）未被 `src/main.js:498` 保留，不改 src/ 就只能在排程源頭下手；rAF 在本專案只被引擎迴圈使用，置換不影響模擬本身。捨棄 CDP 虛擬時間（`Emulation.setVirtualTimePolicy`）：機制較重且與 Playwright 版本耦合。
- 採用：**`ids.json` 由工具生成並自我校正**——直接解析 `src/art/biomes.js`/角色分散多檔的 regex 太脆，Node 端靜態 import 又會碰到 canvas；生成式清單同時滿足「不硬編」與「dry-run 不開瀏覽器」。已核可為進 git 的生成檔。
- 捨棄：把 `scene.coop` 設為真值讓事件/詛咒自動解（`modes.js:26,78`）——會連帶開啟廣播與 host 分支，污染基準。
- 補充（需求核可後因 6750 局規模推導）：`--shard i/n` 與續跑（讀 `runs.jsonl` 跳過已完成 key）列為 R8 的設計元素；單機全量估計 15–40 小時，必須能中斷續跑與跨機分片。

## 風險

- **長跑記憶體/頁面崩潰**：每局換 context 是主要緩解；另每 50 局重開 browser、worker 遇 `pageerror`/closed 記 `error` 後重開 context；`evaluate` 逾時視為崩潰。
- **遊戲 RNG 不可控**：`Math.random` 直接散布在生成/掉落/選項池（如 `progression.js:53` 的 `rng.weighted`），無法以 seed 固定；緩解＝每格 5 局並在報告與紀錄中明記（R9 聲明字串），分析只看分布不看單局。
- **CPU 成本估不準**：估算法＝先在目標機跑 `--parallel 1 --runs 1` 的 hunter/crypt/diff1 取 `simMs` 中位數寫入 `BENCH.md`，再跑 `--parallel 4` 的 4 局量**每局實際 simMs 的膨脹倍率**（Chromium 每頁一個 renderer 行程，CPU-bound 時會互相排擠），總時 ≈ `局數 × 中位 simMs × 膨脹倍率 / P`；`--dry-run` 用 `BENCH.md` 的中位數換算並印出。
- **策略太弱導致「難度過高」的偽結論**：報告固定註明策略等級（走位＋懂進化的選擇，不含技能取捨最佳化），並以 diff1 的通關率當合理性下限；若 diff1 通關率接近 0%，先懷疑策略而非平衡。
- **頁內外模組不同實例**（(f) 若未來 index.html 改帶 query）：整合測試以 `META === __DBG.meta()` 斷言，改動即紅。
- **rAF 置換的副作用**：2026-09-14 查證 `requestAnimationFrame` 在 `src/`＋`index.html` 只有 `src/engine/loop.js` 使用，置換不影響其他子系統；若未來有人把 rAF 用在別處（例如 DOM 動畫），整合測試「兩批之間時間不前進」仍守住模擬正確性，但該功能在機器人頁面會不動——屬可接受。
- **通關後死神階段**：機器人不會按 E 離場，靠「死神出現後 60 秒未結束即 `finishRun(true)`」收斂；`reaperSlain` 欄位保留死神是否被殺的資訊，報告不把死神視為通關條件。

## 測試策略

測試框架與指令：純函式＝Node 22 內建 `node --test tools/bot/test/`（於 `test/` 目錄以 `npm run test:bot` 執行）；驅動層整合＝`node tools/bot/test/integration.mjs`（用 `test/node_modules` 的 Playwright，`createRequire` 取用，範式同 `test/frontend-smoke.mjs:43-51,79-97`），以 `--maxSimSec 60` 覆寫模擬上限跑短局。全案 TDD：先紅後綠。

| R# | 測試案例名 | 輸入/前置 | 預期結果 | 層級 |
|---|---|---|---|---|
| R1 | parseArgs 展開與錯誤 | `--biomes crypt --chars hunter --diffs 1 --runs 1`／未知 id／`--runs 0` | 1 組合；未知 id 與 runs 0 各拋 `UsageError` 含合法 id 清單 | 單元 |
| R1 | dry-run 不開瀏覽器 | `--dry-run --biomes all --diffs 1,3 --runs 2` | stdout 含組合數與估時；`out/` 未建立；無 Playwright 呼叫 | 整合 |
| R1 | ids.json 與 live registry 一致 | 開一頁讀 `BIOMES`/`Characters.ids()` | 與 `ids.json` 深相等（10 / 27） | 整合 |
| R2 | 短局可終止且時間前進 | `--maxSimSec 60`、hunter/crypt/diff1 | `result ∈ {death,timeout}`；20 模擬秒時 `run.time ≥ 19`（story/hudTut 未凍結） | 整合 |
| R2 | 兩批之間時間不前進 | `step(1800)` 後讀 `run.time`，Node 端 `setTimeout 500ms`，再讀一次 | 兩值相等（rAF 已停用） | 整合 |
| R2 | 步長為正式值 | 跑 `step(1200)` | `run.time` 增量 ≈ 10 秒（±0.05；證明 dt=1/120） | 整合 |
| R2 | 選擇不卡局 | 同上，強制注入一次 `scene.choice` | 下一格前 `scene.choice === null`，且持有物有變 | 整合 |
| R2 | 連續兩件裝備 | 注入 `equipChoice`（signature）＋`equipQueue` 一件護甲 | 第一件被 `resolveEquip(false)` 拒絕、第二件在下一格交策略並被接受；`equipQueue` 清空 | 整合 |
| R2 | 通關後死神逾時 | 注入 `run.cleared=true`、`scene.reaperAt=run.time+30`，不殺死神 | 60 秒後 `endReason:'reaper_timeout'`、`result:'clear'`、`cleared:true` | 整合 |
| R2 | pageerror 記錄 | 注入 `throw` | 該局 `result:'error'` 且 `error` 非空，程序續跑 | 整合 |
| R3 | 逃離右方敵人 | 單敵正右 | `move.x < 0` | 單元 |
| R3 | 三面包圍走東側 | 北西南各一敵 | `move.x > 0 且 |move.y| < |move.x|` | 單元 |
| R3 | 無敵人撿拾物 | 右上 pickup | `move.x>0 && move.y<0` | 單元 |
| R3 | 不撞牆 | 敵在右、左側 blocked | `|move.x| < 0.2` 或改走 y | 單元 |
| R3 | 低血近敵閃避 | `hpFrac 0.3`、敵距 20、`dashReady` true/false | 各為 `dash:true` / `false` | 單元 |
| R3 | 空場零向量 | 無敵無拾 | `move` 為 `{x:0,y:0}`、`dash:false` | 單元 |
| R4 | 優先拿進化被動 | 持 A（`evolveReq:'power'`）未進化、options 含 power | 回 power 的 index | 單元 |
| R4 | fuse 優先於升級與被動 | options＝[被動, `{kind:'fuse'}`, 持有武器升級] | 回 fuse 的 index | 單元 |
| R4 | fuse 不犧牲已進化滿級武器 | fuse 的兩把來源武器之一 `evolved:true` 且滿級 | 不回該 fuse；退而選持有升級 | 單元 |
| R4 | 不選滿級升級/滿槽新武器 | A 已滿級；weapons 已 6 | 不回該 index；全滿級時回第一個非武器項 | 單元 |
| R4 | 一般優先序與 tie-break | 多選項同分 | 進化被動＞fuse＞升級＞新武器＞被動＞其他；同 seed 連跑 2 次同結果 | 單元 |
| R4 | equip 只換高 tier、不動 signature | 同槽 tier 高／weapon 槽／空陣列 | 回 0／`-1`／`-1` | 單元 |
| R4 | event/curse/shop 與未知 kind | 各 kind | `0`／`0`／`-1`；未知 kind `-1` 不拋例外 | 單元 |
| R5 | validateRecord | 合法紀錄／缺 `result`／`time` 為字串／缺 `cleared`／缺 `endReason`／缺 `gameVersion` | `[]`／`['result']`／`['time']`／`['cleared']`／`['endReason']`／`['gameVersion']` | 單元 |
| R5 | result 推導 | raw：`cleared:true, endReason:'sim_cap'`／`cleared:false, endReason:'sim_cap'`／`endReason:'error'` | `'clear'`／`'timeout'`／`'error'` | 單元 |
| R5 | timeout/error 局也成行 | 兩種 raw | 各產一行合法 JSON，`time` 為當時模擬秒數 | 單元 |
| R5 | 單行原子性 | append 一筆 | 檔尾恰多一行且 `JSON.parse` 可還原 | 整合 |
| R6 | 固定 fixture 報表 | 下方「fixture F6」 | 含 `| crypt | 1 | 3（有效 3） | 33% | 300 | 420 | 1230 |`、含 `| desert | 3 | 3（有效 2） | 0% |`、異常清單含「desert×3：通關率 0%」與「desert×3：死因 scorpion 100%」、**不含**「角色極差」項（33pp < 50pp）、角色表 hunter 名次 1、ranger 名次 2 | 單元 |
| R6 | 空輸入與不計分母 | `[]`；含 timeout/error | 含「無資料」不拋例外；通關率分母排除且註明「n（有效 m）」 | 單元 |
| R6 | 全格無效 → N/A | 3 筆同格全為 `timeout` | 該格列 `| … | 3（有效 0） | N/A | N/A | N/A | N/A |`，異常清單不含該格，輸出不含 `NaN` | 單元 |
| R7 | API 全攔截 | 跑 1 短局 | 攔截計數 ≥0 且全部 abort，輸出印出計數 | 整合 |
| R7 | context 隔離 | 連跑 2 局 | 第二局 `META.stats.history` 不含第一局 | 整合 |
| R7 | src/ 未被修改 | 跑完批次 | `git status --porcelain src/` 為空 | 實跑 |
| R8 | 並行 4 組合各 1 行 | `--parallel 2 --runs 1`、4 組合 | `runs.jsonl` 恰 4 行、key 不重複 | 整合 |
| R8 | 續跑與分片 | 既有 2 行 + 同參數重跑；`--shard 1/2`+`2/2` | 只補未完成的 2 行；兩分片聯集＝全集、交集為空 | 單元 |
| R8 | 批次識別不符即拒絕 | 首行 `seed:1`，本次 `--seed 2`；首行 `gameVersion:'V2.0'`，本次 `'V2.1'` | `checkBatchHeader` 回非 null 原因；CLI 非零退出並含「--out」提示 | 單元＋整合 |
| R8 | 尾行截斷恢復 | 檔尾為 `{"biome":"cr` | `readJsonlTolerant` 回 `truncatedTail:true`、records 不含該行；CLI 印「截掉 1 行」並重跑該組合 | 單元＋整合 |
| R8 | 中段損壞停止 | 第 2 行為 `garbage`、第 3 行合法 | 拋 `CorruptError` 含行號 2；CLI 非零退出 | 單元 |
| R8 | 跨 50 局重開不遺失 | `--parallel 2`、小組合共 104 局、`--maxSimSec 5` | 恰 104 行、無 `error` 行、每 worker 的 browser 至少重開 1 次（stdout 計數） | 整合 |
| R8 | 單局基準 | hunter/crypt/diff1、`--parallel 1` | `simMs` 中位數寫入 `specs/bot-balance-sim/BENCH.md` | 實跑 |
| R9 | 策略可重現 | 同 seed 同輸入 ×100 | `decideMove`/`decideChoice` 輸出深相等 | 單元 |
| R9 | RNG 聲明 | `summarize(fixture)` | 開頭含「遊戲 RNG 不受控」字串 | 單元 |

**fixture F6**（R6 單元測試的固定輸入；欄位以外一律合法預設值）：

| # | biome | char | diff | result | cleared | endReason | time | deathSrc |
|---|---|---|---|---|---|---|---|---|
| 1 | crypt | hunter | 1 | clear | true | finishRun | 1230 | null |
| 2 | crypt | hunter | 1 | death | false | finishRun | 300 | slime |
| 3 | crypt | hunter | 1 | death | false | finishRun | 420 | slime |
| 4 | desert | ranger | 3 | death | false | finishRun | 200 | scorpion |
| 5 | desert | ranger | 3 | death | false | finishRun | 250 | scorpion |
| 6 | desert | ranger | 3 | timeout | false | sim_cap | 1350 | null |

預期：crypt×1 有效 3、通關 1/3＝33%、存活 p25/p50/p75＝300/420/1230（3 筆取最近秩，實作以 nearest-rank 定義）；desert×3 有效 2（timeout 排除）、通關 0%、死因 scorpion 2/2＝100%；角色通關率 hunter 33% vs ranger 0% → 極差 33pp 不達 50pp。

<!-- 免TDD 任務（見 tasks.md）的替代驗證：T0 以 `npm run test:bot` 實跑 exit 0；T8 以 BENCH.md 實測數字＋`git status --porcelain src/` 為空；T9 以三檔 diff 存在；T10 以 runs.jsonl 行數＝6750 與摘要檔存在。 -->
