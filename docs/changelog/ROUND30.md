# Round 30 — 維護與平衡測試基礎（進行中）

> 本輪不加內容、不動玩法／數值／協定／存檔。分兩段：(1) CI／Node 維護（PR #85，已上線）；(2) 機器人平衡測試工具 `bot-balance-sim`（規格三件套＋三波實作＋基準與全量報告，見下方各段）。

## 維護 — CI actions v5、Node 20 → 22

**背景**：CI 每次跑都出現「Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/checkout@v4, actions/setup-node@v4」。警告來源是這兩個 action 本身的執行環境，不是專案的 `node-version`。另外 Node 20 的 LTS 維護已於 2026 年 4 月結束，Docker 基底 `node:20-alpine` 也到期。

**變更**（不影響遊戲 runtime；前端零依賴不變）：
- `.github/workflows/frontend-test.yml`、`server-test.yml`：`actions/checkout@v4 → v5`、`actions/setup-node@v4 → v5`、`node-version: 20 → 22`。
- `.github/workflows/deploy.yml`：`actions/checkout@v4 → v5`。
- `server/Dockerfile`：`FROM node:20-alpine → node:22-alpine`（multi-arch，Oracle Ampere 與 x86 同一份）。
- `server/package.json` `engines.node`：`>=20 → >=22`；README Node 徽章同步為 ≥22。

**驗證**：
- `server/`：`npm run check` 通過；`npm test` → smoke **120/120**、social **65/65**（本機 Node 24；CI 以 Node 22 執行）。
- `test/`：`npm run test:frontend` → **59/59**。
- 部署：merge 後由 `deploy.yml` 重建容器，`/api/health` 健康檢查為關卡。

## 決策紀錄 — 正式站遙測查證（2026-09-14）

以唯讀 SQL 查正式站 Postgres（`events`／`runs`／`users`）：**7 週僅 10 筆遙測事件（2 個 sid，皆為部署後驗證）、0 筆成績上傳、1 個帳號**。遙測管線本身正常（預設開啟、事件確實入庫）。結論：目前沒有玩家，`docs/AI_PROJECT_REVIEW.md` 留下的三個 P2 實驗項（短局模式／手動瞄準／真人 co-op UX）無法用真人資料決策。改以機器人批次量「系統性質」（各生態×角色×難度的存活時間、死亡來源、通關率）作為平衡與模式設計的底稿；退出時間與重試意願仍只能靠真人測試。

## bot-balance-sim — 機器人平衡測試工具

**背景**：正式站沒有玩家資料（見上方決策紀錄），因此以 headless Chromium 批次跑完整局，量各生態×角色×難度的存活時間、死亡來源與通關率，作為平衡與模式設計的底稿；不代表真人退出／重試行為。

**規格與二審**：`specs/bot-balance-sim/` 的 `requirements.md`、`design.md`、`tasks.md` 三件套已核可；Codex `$spec-review` 的 10 條意見已依使用者裁決修訂（1–9 全修，第 10 條改 R9：遊戲 RNG 不受控的聲明放在報告）。可重現性限策略層，同 seed、同輸入得到同輸出，完整局的遊戲 RNG 仍不受控。

**三波實作**（各波均經 reviewer（Opus）＋Codex 雙審＋使用者裁決修正）：

- 第 1 波（T0／T1／T4／T6，`11b1e48`）：建立骨架與純函式層 `rng`、`record`、`plan`，涵蓋策略亂數、紀錄驗證、CLI 參數、續跑與分片；雙審＋裁決修正後提交。
- 第 2 波（T2／T3／T5，`b7f7649`）：完成走位、懂進化的選擇策略與 Markdown 彙整，含無效局排除與異常格判定；雙審＋裁決修正後提交。
- 第 3 波（T7，`b64a060`）：完成頁內驅動層、批次 CLI、ids 生成、前置檢查與 evaluate 逾時工具，以及 Playwright 整合測試；雙審＋裁決修正後提交。

**關鍵設計**：

- 不改 `src/`，以正式步長 `dt=1/120` 手動驅動；不用依賴真實時間且未處理全部暫停來源的 `__DBG.autoplay`，避免 headless 節流卡局。
- 以 `context.addInitScript` 在頁面腳本載入前置換 rAF，確保驅動層是唯一更新來源；沿用既有 `world.inputFor` 注入走位與 dash，不依賴焦點或合成鍵盤事件。
- 每局新 context，建局前關閉遙測、不持有 JWT；`/api/` 請求全攔截並 abort，各 worker 每 50 局重開自己的 browser。
- 支援續跑與 `--shard i/n` 分片；批次識別不符拒跑、JSONL 尾行截斷可恢復、中段損壞停止，`error` 局於續跑時重跑。
- `evaluate` 有獨立逾時護欄（`--evalTimeoutMs`，預設 60000 毫秒），逾時關閉頁面並記為 `error`，避免單次求值卡住批次。

**文件同步（T9）**：README 補工具前置、指令與輸出；CLAUDE.md 補目前工具接點，並將兩處已不存在的 `anvilChoice` 修正為 `shopChoice`。

**驗證**：

- 單元 **127/127**：`node --test "tools/bot/test/*.test.mjs"`（T9 文件同步時重新執行通過）。
- 整合 **27/27**：`node tools/bot/test/integration.mjs`（既有 T7 驗證紀錄，headless Chromium 短局；T9 未重跑，以免干擾並行效能基準）。
- `git status --porcelain src/` 為空；T9 僅修改 README、CLAUDE.md 與本檔。

**基準與全量結果**：見 `specs/bot-balance-sim/BENCH.md` 與 `docs/reviews/bot-balance/`（T8/T10 完成後補）。
