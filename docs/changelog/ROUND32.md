# R32 — 成長診斷、下一個策略實驗與後續研究
狀態：進行中，2026-09-16。基準 61cc70b；新分支 codex/bot-growth-diagnostics。

## 範圍
1. 工具端量測 XP 產生／拾取、選項供給、升級節奏。
2. 依診斷選出單一變因候選 C，保留 A 作對照，先導與確認分開。
3. 真人評估目前沒有資料；先準備研究流程，實際結論待受測資料。
4. 伺服器權威模擬的範圍待裁決；原 src／協定／存檔禁令仍有效。

規格：specs/bot-growth-diagnostics/。不改遊戲數值，不自動發布或部署。

## 診斷工具實作
透過 tools/bot/growth-diagnostics.mjs 包裝局內方法，原方法 this／參數／回傳／例外與呼叫次數不變。即時釋放終態拾取物鉤子，記錄 XP 守恆、升級時間、選項供給及移動取樣。growth-stats.mjs 以共同早期窗口與實際暴露時間計算，保留早死局；修正浮點邊界與最近快照選擇。

CLI 明確 --diagnostics growth-v1，需要 --strategy 與來源 manifest；ab-run.mjs diagnose 固定 A/B 各 270 局。growth-analyze.mjs 驗證全量、守恆及檔案指紋後產生診斷報告。

TDD：核心、資料缺漏、窗口邊界與真頁面接入先紅後綠；單元 159/159、原整合 27/27、A/B 整合 4/4、成長診斷整合 3/3、server check exit 0＋120/120＋65/65、frontend 59/59。日誌 .pipeline/r32-*.txt。尚未產生診斷結論或選定 C。
