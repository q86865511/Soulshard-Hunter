# bot-balance-sim — 需求規格（requirements.md）

> 建立日期：2026-09-14｜狀態：已核可（2026-09-14）
> 需求主體使用 EARS 句式（速查表見 C:\Users\q86865511\.claude\skills\spec\SKILL.md）。
> 驗收條件是 design.md 測試案例表與 TDD 測試的直接來源，務必寫成輸入/預期可程式判定的形式。

## 概述

離線的機器人平衡測試工具：在 headless Chromium 裡批次跑「生態×角色×難度」的完整 20 分鐘局，用可重現的純函式策略走位與做選擇，把每局結果寫成 JSONL，並彙整成可讀的 Markdown 報告（存活時間分布、死亡來源、通關率、異常格）。服務對象是設計者本人，用途是平衡調整與模式設計前的客觀底稿。

背景：正式站遙測查證（2026-09-14）7 週僅 10 筆事件、0 筆成績、1 個帳號——沒有玩家，真人資料不存在。機器人能替代的是「遊戲系統的客觀性質」，替代不了退出時間與重試意願（人的決定），這一點在報告裡明寫。

## 範圍（含明確不做）

- 包含：CLI 批次驅動、單局驅動、走位策略、懂進化的選擇策略、JSONL 紀錄、Markdown 彙整、隔離（不污染存檔/遙測/排行榜）、並行與效能基準、策略層可重現。
- 明確不做：不改 `src/` 任何遊戲行為（連接點也不加，既有 `world.inputFor`/`__DBG` 已足夠）；不模擬人的退出/重試決定；不寫入正式站或本機 fakedb 的 events 表；不跑 co-op、每日、週常；不做無盡模式（20 分鐘後的詛咒堆疊另案）；不做 UI。

## 需求

### R1 批次 CLI

系統應提供 `node tools/bot/run.mjs` 批次指令，接受 `--biomes all|<id,…>`、`--chars all|<id,…>`、`--diffs <n,…>`、`--runs <N>`、`--parallel <P>`、`--out <dir>`、`--seed <n>`、`--dry-run`，自行啟動 `tools/serve.mjs`（或沿用已在 5173 的實例），依 P 個 headless 頁面分配全部組合。

驗收條件:
- `--biomes crypt --chars hunter --diffs 1 --runs 1` → `<out>/runs.jsonl` 恰 1 行且通過 R5 schema。
- `--dry-run` → 印出組合數（生態數×角色數×難度數×N）與預估時間，不啟動瀏覽器、不建立輸出檔。
- 未知 biome/char id → 非零退出碼＋列出合法 id；`--runs 0` → 非零退出碼。
- `all` 展開來源＝`src/art/biomes.js` `BIOMES` 與 `Characters` registry，不得在工具內硬編 id 清單（已裁決：以工具生成、可自我校正、整合測試驗漂移的 `tools/bot/ids.json` 實現，見 design）。

### R2 單局驅動

當一個組合被指派給頁面時，系統應以 `newRun({biomeId, characterId, difficulty, mode:'normal'})` 建局、掛上 run scene，以與正式遊戲相同的固定步長 **dt = 1/120**（`src/main.js:499`）在 pump 迴圈中每格清除全部暫停來源、把各種選擇交給策略，直到 `scene.dead` 為真或模擬時間超過上限 `LEVEL_TIME + REAPER_DELAY + 120s`。驅動層必須是模擬的**唯一**更新來源：頁面原生的 rAF 引擎迴圈須在載入前停用（不改 `src/`）。

驗收條件:
- 一局結束時 `run.result ∈ {clear, death}`，或超過上限時工具記 `result:'timeout'`；`run.time` 對模擬上限單調遞增。
- 兩次驅動批次之間 `run.time` 不自行前進（批次 A 結束讀值、真實時間等待 500ms、批次 B 開始讀值相等）。
- 局開始後 `story`/`hudTut` 不使 `run.time` 停止前進（20 秒模擬內 `run.time ≥ 19`）。
- `choice`/`equipChoice`/`eventChoice`/`curseChoice`/`shopChoice` 出現後在下一格前被清除（不卡局）；`equipChoice` 被拒絕時走 `resolveEquip(false)` 推進佇列，佇列中後續裝備仍會交給策略（連續兩件裝備都被處理）。
- 擊敗尾王後（`run.cleared === true`）若局未結束，死神出現（`run.time ≥ reaperAt`）後再給 60 模擬秒；仍未結束則由驅動層呼叫 `scene.finishRun(true)` 結算，紀錄 `result:'clear'`、`endReason:'reaper_timeout'`。
- 頁面拋出 `__GAME_ERROR__` 或 pageerror → 該局結束並記 `error` 字串，批次繼續下一局。

### R3 走位策略（純函式）

系統應提供純函式 `decideMove(view)`，`view` 含玩家座標與 hp 比例、敵人列表（x,y,radius,boss,hpFrac）、pickup 列表、`blocked(x,y)` 查詢、`dashReady`；回傳 `{move:{x,y}, dash:boolean}`，`move` 長度 ≤1。

驗收條件:
- 單一敵人在正右方 → `move.x < 0`。
- 敵人三面包圍、東側無敵 → `move.x > 0` 且 |move.y| < |move.x|。
- 無敵人、右上有 pickup → 朝 pickup（`move.x>0 && move.y<0`）。
- 敵人在右、左側 `blocked` 為真 → 不朝被擋方向（|move.x| < 0.2 或改走 y）。
- hp ≤ 0.35 且最近敵距 ≤ 24 且 `dashReady` → `dash:true`；`dashReady:false` → `dash:false`。
- 空敵人空 pickup → `move` 為零向量、`dash:false`。
- 同輸入兩次呼叫回傳深相等。

### R4 選擇策略（純函式，懂進化）

系統應提供純函式 `decideChoice(kind, options, state, reg)`，`kind ∈ {level, equip, event, curse, shop}`；`state` 含持有武器（id,level）、被動 id、`MAX_WEAPONS/MAX_PASSIVES`；`reg` 提供 `weapon(id) → {evolveReq, evolveInto, maxLevel}`；回傳選項 index（`-1`＝關閉/不買）。

驗收條件:
- level：持有武器 A（`evolveReq` 為被動 P）、A 未進化、options 含 P → 選 P。
- level：持有 A 已達 `maxLevel` → 不選 A 的升級項；若 options 全為滿級升級 → 選第一個非武器項。
- level：武器槽已滿（6）且 options 含新武器與被動 → 不選新武器。
- level：合成選項（`kind:'fuse'`）優先於一般升級：options 同時含 fuse 與被動/升級 → 選 fuse；fuse 會犧牲的兩把武器若任一為滿級且已進化則不選該 fuse。
- level：其餘情況優先序＝進化配對被動 ＞ fuse ＞ 已持有武器升級（等級低者先）＞ 新武器 ＞ 被動 ＞ 其他；同序以 `seed` 決定 tie-break，同 seed 同結果。
- equip：同槽比 tier 高者；武器槽裝備（signature）一律不選（避免改變基準武器）；options 空 → `-1`。回傳 `-1` 時驅動層須以 `resolveEquip(false)` 拒絕（推進佇列），不得直接清空 `equipChoice`。
- event / curse：回傳 `0`（固定第一項，報告中註明）；shop：回傳 `-1`。
- options 空或 kind 未知 → `-1`，不拋例外。

### R5 每局紀錄

當一局結束時，系統應在 `runs.jsonl` 追加一行 JSON，欄位：`biome, char, diff, mode, runIdx, seed, result, cleared(bool), endReason('finishRun'|'abandon'|'reaper_timeout'|'sim_cap'|'error'), time, level, kills, score, stage, deathSrc, dmgTakenBySrc(前 5)、dmgBySource(前 5)、weapons[], abilities[], bossKills, reaperSlain, hpTimeline(每 30s 的 hp 比例陣列), simMs, ticks, error(選填), toolVersion, gameVersion(GAME_VERSION)`。`result` 與 `cleared` 分開：`cleared` 只看尾王是否被擊敗，`result` 是結算結果。

驗收條件:
- `validateRecord(obj)` 對合法紀錄回 `[]`；缺 `result`、`time` 非數字、缺 `cleared`/`endReason`/`gameVersion` → 回錯誤欄位名陣列。
- `result:'timeout'`/`error` 局也寫一行，`time` 為當時模擬秒數；`cleared` 為真但 `endReason:'sim_cap'` 的局 `result` 仍記 `'clear'`（通關不因終止原因流失）。
- 一局寫入為原子單行（無換行、`JSON.parse` 可還原）。

### R6 彙整報告（純函式）

系統應提供 `summarize(records) → markdown`：每「生態×難度」格列 n、通關率、存活秒數 p25/p50/p75、死亡來源 top3；每角色列通關率、中位存活秒、名次；異常清單：通關率 0% 或 100% 的格、死亡集中於單一來源 ≥60% 的格、角色間通關率極差 ≥50 個百分點；報告開頭固定一段「本報告量的是系統性質，不代表真人退出與重試行為」。

驗收條件:
- 固定 fixture（6 筆，含 2 生態 2 角色；具體數值與預期字串定義於 design.md 測試策略）→ 輸出含指定的表格列字串與異常項。
- 空陣列 → 輸出含「無資料」且不拋例外。
- `timeout`/`error` 局計入 n，但不計入通關率分母、也不進存活分位數（報告以「n（有效 m）」註明筆數）；`result:'clear'` 的局不論 `endReason` 都計為通關。
- 某格有效筆數為 0 → 通關率與分位數顯示「N/A」，該格不列入任何異常判定；不得出現 `NaN`。

### R7 隔離與不污染

於批次執行期間，系統應讓每局使用新的 browser context（乾淨 localStorage）、在建局前設 `META.settings.analytics=false`、不持有 JWT，並以 `page.route('**/api/**')` 攔截記錄任何 API 請求；工具不修改 `src/` 任何檔案。

驗收條件:
- 跑 1 局後攔截計數器記錄的 `/api/` 請求全部被 abort，且工具輸出印出該計數。
- 跑完後 `git status --porcelain src/` 為空（實跑驗證列入 tasks）。
- 第二局的 `META.stats.history` 不含第一局（context 隔離）。

### R8 效能與並行

系統應以 `--parallel P` 同時驅動 P 個頁面，各頁面依序取下一個未跑組合；每局記錄 `simMs`（實際耗時）與 `ticks`；`--dry-run` 的預估時間以 `specs/bot-balance-sim/BENCH.md` 記錄的基準（單局 simMs 中位數）計算。因全量規模（6750 局）補充的設計元素：續跑（重啟時讀既有 `runs.jsonl` 跳過已完成組合）與分片（`--shard i/n`）。長跑的資源回收以 **worker 為單位**（各 worker 每 50 局重開自己的 browser context 池），不得關閉其他 worker 進行中的局。

續跑相容性：`runs.jsonl` 的每行都帶 `toolVersion`、`seed`、`gameVersion`；續跑時以檔案首行的這三個值為批次識別，與本次參數不符即拒絕執行並提示改用新的 `--out`。續跑讀檔時尾行無法 `JSON.parse`（寫到一半中斷）→ 截掉該行並印警告後續跑；中段出現無法解析的行 → 報錯停止（資料損壞，不可自動修）。

驗收條件:
- `--parallel 2 --runs 1` 對 4 個組合 → `runs.jsonl` 恰 4 行、每組合各 1 行。
- 基準任務實跑：單局 hunter/crypt/diff1 的 `simMs` 實測值寫入 `specs/bot-balance-sim/BENCH.md`（免自動化，實跑證據）。
- 一頁面崩潰（pageerror/closed）不中止批次，其他頁面續跑，該局記 `error`。
- 既有 2 行＋同參數重跑 → 只補未完成的組合；`--shard 1/2` 與 `2/2` 的聯集＝全集、交集為空。
- 既有檔首行 `seed` 與本次 `--seed` 不同 → 非零退出碼並提示；`gameVersion` 不同亦同。
- 既有檔尾行為半行 JSON → 續跑成功、印出「截掉 1 行」警告、該組合重跑；中段損壞行 → 非零退出碼。
- 以 `--parallel 2` 跑 ≥ 102 局（小組合、`--maxSimSec` 短局）→ 行數與組合數相等、無 `error` 行（跨越每 worker 第 50 局的重開不遺失）。

### R9 可重現性（策略層）

系統應讓策略層在同一 `seed` 下對同輸入產生同輸出；遊戲本身的 `Math.random` 不可控，工具在**報告開頭**明記「遊戲 RNG 不受控，局間差異屬正常」（JSONL 不需要此聲明欄位；2026-09-14 二審裁決）。

驗收條件:
- `decideMove`/`decideChoice` 在同 seed 同輸入下連續 100 次輸出深相等。
- 報告開頭含該 RNG 聲明字串。

## 非功能需求

- 零新 runtime 依賴：只用 `test/` 既有 Playwright 與 Node 22 內建 `node --test`；遊戲 runtime 保持零依賴。
- `tools/bot/` 內的策略與彙整模組必須是同時能被 Node 測試與瀏覽器 `import('/tools/bot/…')` 載入的純 ESM（不用 `fs`/`path` 等 Node 專屬 API；驅動層才用）。
- 輸出目錄（預設 `tools/bot/out/`）gitignored；不落任何暫存檔到 repo 根。
- 全案 TDD（使用者裁決）：純函式單元測試＋驅動層的整合測試（Playwright 實跑 1 短局）都先紅後綠。

## 開放問題

無。原開放問題已於 2026-09-14 裁決：
- 難度集合＝`1,2,3,4,5`。
- 每格局數＝5（全量 10 生態×27 角色×5 難度×5 局＝6750 局）。
- 報告落點＝輸出 gitignored（`tools/bot/out/`），決策摘要另寫進 `docs/reviews/bot-balance/`。
- `tools/bot/ids.json` 生成檔進 git（R1 的「不硬編」與「dry-run 不開瀏覽器」以此解）。
