# Round 24 — 隱私友善遙測（P1-3）

> 依 `docs/AI_PROJECT_REVIEW.md` P1-3：最小、白名單、可停用的產品遙測，
> 回答「首局漏斗、通關率、死亡時間、選卡率」。原則：匿名、批次、離線不阻擋、明訂保存期限。

## 1. 後端（`server/`）

- **events 表**（`initSchema` 可重入建立）：`sid / v / name / props jsonb / created_at`＋(name,created_at)、(sid) 索引。
- **POST /api/metrics**（匿名，30/min）：批次 ≤50 筆；六種事件白名單（`save_created / tutorial_step / run_started / level_choice / run_ended / unlock_seen`），props 逐欄 sanitize（字串 cap 40、陣列 cap 24、strip 多餘 key、非法 name 個別丟棄），回 `{ok, accepted}`。**不讀 JWT、不存 user id/IP/UA、無自由文字欄位。**
- **保存期限**：`METRICS_RETENTION_DAYS`（預設 90，env 可調，已補 `.env.example`／docker-compose）——開機清一次＋每 24h `setInterval().unref()`。
- **GET /api/admin/metrics**（requireAdmin）：近 14 天五聚合——事件總量、首局漏斗（distinct sid：save→start→end）、通關率 by (biome,diff)、死亡時間分鐘直方圖（0-20 桶）、選卡榜前 15。
- 兩份 fakepool（smoke 內建＋`test/fakepool.mjs` 供 `dev:fakedb`）都補了 events stubs——後者是端到端驗證時抓到的缺口（dev 模式原本 500）。

## 2. 前端（`src/net/telemetry.js`＋hooks）

- `Tele.ev(name, props)`：白名單外忽略；`META.settings.analytics === false` 時 no-op；記憶體佇列（上限 200、滿 20 或 15 秒 flush、`pagehide` 用 `sendBeacon` 收尾）；POST 不帶 Authorization、`.catch` 靜默——**離線/後端不在完全不影響遊戲**。
- 六 hook：`save_created`（空槽首次進入）、`tutorial_step`（story_shown/story_skipped/story_done/hud_done）、`run_started`（biome/char/mode/diff/assist）、`level_choice`（picked/offered/t）、`run_ended`（result/time/score/stage/diff/charLevel/biome/char/mode/deathSrc/assist/weapons/abilities，發完即 flush）、`unlock_seen`（本局新成就 ids）。
- **承傷來源 plumbing**（兼作 P1-4 結算教練地基）：`player.takeDamage(dmg, ang, world, src)` 新增 src 標籤（contact:/proj:/hazard:/boss:/event:），記 `lastHitSrc`、累加 `run.dmgTakenBySrc`，死亡時 `run.deathSrc`。
- 設定選單新「隱私」區：「匿名遊玩統計」開關（預設開）＋說明小字。
- coop guest（快照傀儡）天然不發 run 事件；**已知限制**：coop host 的選卡走 coopPick 路徑，不發 `level_choice`（單機已涵蓋主要產品問題）。

## 3. 管理後台「數據」分頁

- 第 8 個 admin tab：首局漏斗卡（含轉換率）、事件總量表、通關率表（生態/難度/場次/通關率）、死亡時間 bar 分布、選卡榜前 15；頂部標示「匿名遊玩事件・近 14 天・保留 90 天」。

## 隱私聲明（明訂）

收集：匿名安裝識別碼（本機隨機字串）、版本、上述六種遊玩事件。**不收集**：帳號連結、IP、裝置指紋/UA、聊天或任何輸入內容、逐幀位置。保存 90 天後自動刪除；設定選單一鍵停用。

## 驗證

- server：`npm run check`＋`npm test` → smoke **103→114**＋social 65 全綠。
- 前端：`npm run test:frontend` → **52/52 綠**（新增 phase 8：analytics 預設、run_started 佇列、白名單忽略、承傷來源、停用即停收，共 6 條）。
- **端到端實測**（dev:fakedb＋真瀏覽器）：匿名 POST 兩個 sid 共 8 事件 → admin 登入 → 「數據」分頁 DOM 渲染漏斗 2→2→2、通關率 幽影地穴 D1 50%、死亡 5 分鐘桶、選卡榜——全鏈路正確。
- coop 離線自測全綠；`git diff --check` 乾淨。
