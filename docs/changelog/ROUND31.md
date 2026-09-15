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
待完成先導與確認批次後填入；不以實作通過宣稱策略有效。
