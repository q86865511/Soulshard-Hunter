# R31 — Bot 選擇策略 A/B 實驗

## 範圍與預先判準
本輪只修改 tools/bot/ 與文件。A 保留 R30 策略；B 只交換「一般被動／新武器」優先序。遊戲 src/、數值、協定及存檔不變。需求與設計：specs/bot-strategy-ab/。

先導 540 局；確認 8100 局 diff1（每策略 4050）。固定採用門檻為有效通關率至少 +1pp、95% CI 下界 >0、全局通關率同方向、B 的 timeout/error 排除比例不得上升。判準在看實驗結果前固定。遊戲 RNG 不受控，分析使用獨立分層 bootstrap，不假設同 seed 代表同世界。

## 工具
- --strategy A|B 明確啟用實驗，預設仍是 R30 A。
- manifest 格式 1 記錄策略、完整 commit 與來源 SHA256、schema toolVersion、遊戲版本及完整參數；每行策略標籤、choices/divergences 與實際選擇計數。
- record schema 的 TOOL_VERSION 保留 0.1.0；實驗差異由 experimentVersion=1、commit、sourceHash 與策略共同識別，原 R30 斷言不放寬。
- ab-run.mjs 依生態交替 AB/BA，單一子批次 parallel=4；同參數續跑保留失敗，兩次續跑失敗／Chromium 啟動失敗／5173 佔用即停。
- ab-analyze.mjs 核對全部預期 key、資料識別、session 與逐 cell report，再計算效果與信賴區間。

## 實作驗證
紅燈：新策略 8 項中 3 失敗；新真頁面／CLI 整合 3 失敗；缺少 experiment 模組時測試失敗。
綠燈：單元 142/142（原 127＋新增 15）、原整合 27/27、新 A/B 整合 3/3、server check exit 0、server 120＋65、frontend 59/59。詳細日誌 .pipeline/ab-*.txt。
新整合測試使用遊戲原生 ability 選項 def；驗證 A/B 真正取得不同內容，並驗證末筆 error 重新執行與錯組／缺策略／錯 seed 拒絕。

## 實驗結果
先導 540/540 唯一 key、0 error／0 缺漏、13.74 分鐘；A 5/264＝1.89%，B 4/270＝1.48%。分歧稽核 A 646／B 613 次皆符合策略；api_hits=562、browser_restarts=0。獨立 PowerShell 驗算一致。確認 8100 局已完成（詳下節）；先導不作效果判定。摘要：docs/reviews/bot-balance/2026-09_strategy-ab.md。

## 全量確認與最終裁決（2026-09-16）

8103 原始行／8100 唯一 key，兩策略各 4050；缺漏、額外、schema 錯誤、最終 error 皆 0。跨度 109.30 分鐘，session 累計 107.21 分鐘。A 76/4024＝1.89%；B 11/4037＝0.27%；B−A −1.62pp，5000 次獨立分層 bootstrap 95% CI [−2.04, −1.19]pp。全局差 −1.60pp，CI [−2.02, −1.19]pp。四項預先門檻僅排除率不增加通過，裁決：保留 A、不採用 B。

B 被動空值 664/4050（A 1742/4050），存活中位 133.71 秒（A 129.45），但 level 中位 4（A 5），且 10 生態通關率皆較低。這是固定策略下的系統實驗，遊戲 RNG 不受控，不能當真人行為。

三筆局次載頁錯誤均原參數補跑成功；最後 cell preflight 另逾時一次，原目錄／原 c08cefb 續跑成功。此舊失敗 session 未輸出 API／重開計數，JSON 保留 null；已知下界 api_hits≥8316、browser_restarts≥18，不偽造完整總數。資料完成後修正失敗計數保存與歷史稽核，新增測試先紅後綠。

最終輸出：單元 tests 145/pass 145/fail 0；原整合 27/27；A/B 整合 4/4；server check exit 0、120 passed/0 failed＋65 passed/0 failed；frontend 59/59 assertions passed。PowerShell 獨立 key/結果計數與 CI 方向檢查一致，src/ 與 server/ 無差異。

文件關卡：requirements.md 補歷史可觀測性限制（門檻未變）、design.md 補 session 稽核、tasks.md 全勾選、本 ROUND31、README、CLAUDE、docs/reviews/bot-balance/2026-09_strategy-ab.md。PROGRESS.md 不存在，未另建。原 R30 JSONL SHA256 未變。本輪只本機 commit，沒有 push／PR／merge／部署。
