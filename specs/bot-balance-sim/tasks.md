# bot-balance-sim — 任務清單（tasks.md）

> 建立日期：2026-09-14｜狀態：已核可（2026-09-14；Codex 二審依裁決修訂 1–9、R9 改報告聲明）
> 本檔為 /pipeline 任務清單來源：pipeline 第 1 步直接採用本清單與 HARD/NORMAL 標記，不重新拆解。
> 勾選（`- [x]`）只由 pipeline 第 5 步收尾回寫，其他階段不動。

## 任務

- [x] T0 [NORMAL][免TDD:框架先於測試存在] 建 `tools/bot/` 骨架：目錄（`strategy/`、`test/`、`out/`）、`.gitignore` 加 `tools/bot/out/`、`test/package.json` 加 `test:bot`（`node --test ../tools/bot/test/`）與 `bot`（`node ../tools/bot/run.mjs`）指令、一個冒煙測試證明 runner 可跑（對應 非功能；驗收：於 `test/` 執行 `npm run test:bot` exit 0 且列出 1 個通過；依賴：無）
- [x] T1 [NORMAL][TDD] `tools/bot/strategy/rng.mjs`：`makeRng(seed)`（mulberry32）、`hashSeed(...parts)`（對應 R9；驗收：同 seed 序列深相等、不同 seed 前 10 值不同、hashSeed 對同 parts 穩定；依賴：T0）
- [x] T2 [HARD][TDD] `tools/bot/strategy/move.mjs` `decideMove(view)`：候選方向評分（威脅斥力／pickup 引力／`blocked` 取樣斥力／dash 條件）（對應 R3、R9；驗收：design 測試表 R3 六列＋R9 可重現列全綠；依賴：T1）
- [x] T3 [HARD][TDD] `tools/bot/strategy/choice.mjs` `decideChoice(kind, options, state, reg)`：進化配對＞fuse＞持有升級＞新武器＞被動＞其他；滿級/滿槽過濾、fuse 不犧牲已進化滿級武器；equip 同槽比 tier、signature 不選；event/curse 0、shop -1；未知 kind -1（對應 R4、R9；驗收：R4 七列＋R9 列全綠；依賴：T1）
- [x] T4 [NORMAL][TDD] `tools/bot/record.mjs`：`TOOL_VERSION`、`makeRecord(cfg, raw)`（含 `cleared/endReason/gameVersion`、result 推導、timeout/error raw）、`validateRecord`（對應 R5；驗收：R5「validateRecord」「result 推導」「timeout/error 局也成行」三列全綠；依賴：T0）
- [x] T5 [NORMAL][TDD] `tools/bot/summarize.mjs` `summarize(records)`：RNG 聲明段、生態×難度格表（n（有效 m）/通關率/p25/p50/p75（nearest-rank）/死因 top3）、角色表、異常清單、timeout/error 不計分母與分位數、有效 0 → N/A 且不列異常（對應 R6、R9；驗收：R6 三列（fixture F6、空輸入、全格 N/A）＋R9「RNG 聲明」列全綠；依賴：T4）
- [x] T6 [NORMAL][TDD] `tools/bot/plan.mjs`：`parseArgs`（含 UsageError 與合法 id 清單）、`expandCombos`、`keyOf`（不含 seed）、`pendingCombos`、`shardOf`、`estimate`、`checkBatchHeader`、`readJsonlTolerant`（尾行截斷／中段 `CorruptError`）（對應 R1、R8；驗收：R1「parseArgs 展開與錯誤」列＋R8「續跑與分片」「批次識別不符」「尾行截斷恢復」「中段損壞停止」的單元部分全綠；依賴：T0）
- [x] T7 [HARD][TDD] 驅動層與 CLI：`tools/bot/driver.mjs`（setup/startRun/step/collect/lastError；每格清暫停→解選擇（equip 的 -1 走 `resolveEquip(false)`）→inputFor→`scene.update(1/120)`、1800 格一批、每 3600 格 hpTimeline、防 AFK 環繞、通關後 `scene.reaperAt+60` 逾時 `finishRun(true)`、`cleared/endReason/gameVersion` 收集）、`tools/bot/run.mjs`（`context.addInitScript` 置換 rAF、佇列並行、每 worker 自有 browser 且每 50 局自行重開、每局新 context、`page.route` 攔截計數、pageerror/逾時記 error 重開、續跑（`readJsonlTolerant`＋`checkBatchHeader`）、shard、append JSONL、產 report.md）、`tools/bot/gen-ids.mjs`＋`tools/bot/ids.json`（有瀏覽器時自我校正）。測試＝`tools/bot/test/integration.mjs`（Playwright，`--maxSimSec 60`）（對應 R1 dry-run／ids 列、R2 七列、R5 單行原子性、R7 API 攔截／context 隔離、R8 並行／批次識別／尾行恢復／跨 50 局重開列；驗收：`node tools/bot/test/integration.mjs` 全綠且 `npm run test:bot` 仍全綠；依賴：T2、T3、T4、T5、T6）
- [x] T8 [NORMAL][免TDD:驗收為實跑證據無法自動化] 基準與隔離實跑：`--parallel 1 --runs 1` hunter/crypt/diff1 取 simMs 中位數、`--parallel 4` 4 局量膨脹倍率，寫入 `specs/bot-balance-sim/BENCH.md`；跑完 `git status --porcelain src/` 為空（對應 R7、R8；驗收：BENCH.md 含兩個實測數字與換算後的 6750 局預估；src/ 無變更；依賴：T7）
- [x] T9 [NORMAL][免TDD:純文件] 文件關卡：README 工具用法段、CLAUDE.md（Run/test 加 `tools/bot` 一行；修正 gotcha 中已不存在的 `anvilChoice` → `shopChoice`）、`docs/changelog/ROUND30.md`、PROGRESS.md（對應 全域文件規則；驗收：三檔 diff 存在且 changelog 含驗證方式；依賴：T8）
- [ ] T10 [NORMAL][免TDD:實跑產出] 首份全量批次：`--biomes all --chars all --diffs 1,2,3,4,5 --runs 5 --parallel 4`（可分片、可續跑），完成後把 report.md 的決策摘要（異常格、角色極差、diff1 合理性檢查）寫進 `docs/reviews/bot-balance/2026-09_summary.md`（對應 R6、R8；驗收：`runs.jsonl` 行數＝6750（或分片聯集）、摘要檔存在；依賴：T8）

覆蓋檢查：R1←T6,T7；R2←T7；R3←T2；R4←T3；R5←T4,T7；R6←T5,T10；R7←T7,T8；R8←T6,T7,T8,T10；R9←T1,T2,T3,T5。每任務皆對應至少一個 R#（T0/T9 對應非功能與全域文件規則）。

<!-- HARD＝架構設計、複雜邏輯、跨模組（pipeline 派 architect）；NORMAL＝規格明確照做（派 implementer）。
     TDD＝預設（顯式標，pipeline 讀清單零歧義）：先派測試代理產紅燈證據，測試鎖定後再派實作代理轉綠。
     免TDD 限：建測試框架本身、純文件/設定、驗收無法自動化——理由必寫。
     每條任務必須對應至少一個 R#；requirements 的每條 R# 必須被至少一條任務覆蓋。 -->

## 完成定義

- 全部任務勾選完成，且各任務驗收條件有實跑證據。
- TDD 任務的紅綠證據（專案 `.pipeline/tdd/`）經 pipeline Verify 查驗。
- requirements.md 每條 R# 的驗收條件通過 pipeline 雙審對照。
- 相關文件（PROGRESS.md、README、CLAUDE.md、changelog）依全域規則更新。
