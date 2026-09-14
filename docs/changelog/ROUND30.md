# Round 30 — 維護與平衡測試基礎（進行中）

> 本輪不加內容、不動玩法／數值／協定／存檔。分兩段：(1) CI／Node 維護（本 PR）；(2) 機器人平衡測試工具 `bot-balance-sim`（規格與實作於後續 PR 進入，屆時追加到本檔）。

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

