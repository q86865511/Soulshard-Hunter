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

## 540 局診斷完成

原始／唯一 key 皆 540，缺漏與最終 error 0，XP 守恆違例 0。跨度約 13.91 分鐘；api_hits=557、browser_restarts=0。共同 90–120 秒窗口：A/B kills 每分 110.00／61.80，XP 掉落每分 429.68／237.54；B 新武器取得顯著較少，成長落差與火力／XP 供給不足相符，尚未證明中介因果。A 前 120 秒 XP 過期15.43%，因此預登記 C：保留 A 選擇規則，只把 XP 走位吸引權重1→1.5，尚未實作／實驗。摘要 docs/reviews/bot-balance/2026-09_growth-diagnostic.md。

真人流程已備於 docs/research/r32-human-evaluation/，目前沒有資料，H2 不勾選。架構 S1 評估及唯讀探針完成：原生匯入需 DOM shim，shim 後 registry 尚不完整；中繼信任邊界測試4/4。S2 範圍待裁決，未改 src、協定或存檔。

## 候選 C 實作（實驗待執行）

C 僅把 XP 拾取物走位權重1→1.5；A/B/C profile 固定，C 選擇規則仍為 A。新增每秒 A/C 影子方向稽核，只有正式策略驅動世界。manifest 格式2鎖定 profile；pilot-c／confirm-c 採 AC/CA 交替且兩組都開 growth-v1。分析器沿用原 bootstrap 與門檻，新增次要成長診斷和 --verify-only，舊 A/B 資料可讀且不覆寫。

紅→綠：C 單元與真頁面分派先失敗後通過。最終單元168/168；C 整合4/4；原整合27/27、A/B整合4/4、growth整合3/3、frontend59/59。伺服器仍沿用本輪同源的 check exit0＋120/120＋65/65（server無變更）。10,000組輸入A差異0，無XP的4187組C差異0，C共824組方向不同、dash不變；R31正式統計、CI、判定逐值一致且舊報告位元未改。

一次分析測試與會暫改 ids.json 的整合案例重疊，導致臨時26角色的測試資料；改為序列重跑後全綠，未放寬每組270/4050的驗收。日誌 .pipeline/r32-c-*.txt、r32-c-equivalence.json。
