# Bot 策略 A/B 實驗摘要（2026-09）

狀態：已完成（2026-09-16）。**保留 A，不採用 B 的優先序交換。**

本報告量的是系統性質，不代表真人退出與重試行為。遊戲 RNG 不受控，兩組是獨立抽樣；相同策略 seed 不是相同遊戲世界。
策略等級：固定走位＋懂進化的選擇；event/curse 固定第一項、shop 不買。A 保留 R30；B 僅交換一般被動與新武器優先序。

## 固定來源與預先判準

- 程式 commit：c08cefbca950457d94e697e90e58f815e703a874。
- 來源 SHA256：452f1587f096143e270898aa8e775dd261bdb3b38ebb66bb638e73a5155bd8fb。
- 規格：specs/bot-strategy-ab/；規格、判準與工具先 commit，之後才開始實驗。
- 採用需同時滿足：有效通關率 B−A ≥1pp、獨立分層 bootstrap 95% CI 下界 >0、全局通關率同方向、B 的 timeout/error 排除比例不增加。否則保留 A；未通過不等於證明等效。
- A 與 R30 原程式 10,000 個輸入完全一致；B 的 840 個差異均只有新武器改選一般被動（.pipeline/ab-equivalence.json）。

## 540 局先導

輸出 tools/bot/out/ab_pilot_2026-09-15/，分析 analysis.json／analysis.md；獨立驗算 .pipeline/ab-independent-pilot.json。
2026-09-15T15:10:28.794Z → 15:24:12.904Z；跨度 13.74 分鐘、session 累計 13.67 分鐘。
540 原始行＝540 唯一排程 key，兩組各 270；缺漏／額外／schema 錯誤／最終 error 皆 0，沒有重試。api_hits=562，browser_restarts=0（每子批次僅 27 局，未達每 worker 50 局重開門檻）。

| 策略 | clear | death | timeout | 有效通關率 | 全局通關率 | 存活中位秒 | level 中位 | abilities 空／全部 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| A | 5 | 259 | 6 | 5/264＝1.89% | 5/270＝1.85% | 128.19 | 5 | 116/270 |
| B | 4 | 266 | 0 | 4/270＝1.48% | 4/270＝1.48% | 132.68 | 3 | 53/270 |

實際選擇稽核：A 共 1701 次 level 選擇、646 次 A/B 分歧均選新武器；B 共 1013 次選擇、613 次分歧均選一般被動。無分派不符。通關 endReason：A finishRun 2／reaper_timeout 3；B finishRun 1／reaper_timeout 3。

先導顯示 B 的被動取得增加，並不表示通關改善；每組僅 4–5 次通關，不能在此判定勝負。確認階段使用全新目錄，先導不混入效果估計。
以 session 耗時線性推估 8100 局約 205 分鐘（3 小時 25 分鐘）；每 cell 更多局可能攤薄尾段等待，RNG／局長也會改變工時，這不是上限保證。

## 8100 局確認

確認資料 8103 原始行經 dedupeLatest 得 8100 唯一 key；A/B 各 4050，缺漏、額外 key、schema 錯誤、最終 error 皆 0。Node 與獨立 PowerShell 計數一致。跨度 109.30 分鐘（含停止與續跑），session 累計 107.21 分鐘。

### 採用判定

| 預先門檻 | 實際數字 | 結果 |
|---|---|---|
| 有效通關率 B−A ≥ +1pp | A 76/4024＝1.89%；B 11/4037＝0.27%；差 −1.62pp | 未達 |
| 95% CI 下界 >0 | 分層獨立 bootstrap 95% CI [−2.04, −1.19]pp | 未達 |
| 全局通關率同方向 | A 1.88%；B 0.27%；差 −1.60pp，CI [−2.02, −1.19]pp | 未達 |
| B 的 timeout/error 排除率不增加 | A 0.64%；B 0.32% | 通過 |

**保留預設 A，不採用 B。** B 在 10/10 生態的有效通關率皆低於 A（描述性比較，未對單格作顯著性宣稱）。B 的 abilities 空值由 A 的 1742/4050 降至 664/4050，存活中位由 129.45 增至 133.71 秒，但 level 中位從 5 降至 4、通關數從 76 降至 11。被動取得更多與短期存活略增，不能替代通關結果。B 保留為明確旗標下的實驗候選。

主分析依 biome×char 分層，各組每層獨立抽 15 筆，5000 次、分析 seed=20260915，沒有同世界配對。獨立 PowerShell 計數另做未分層常態近似方向檢查，95% 區間約 [−2.07, −1.17]pp，方向一致；正式判定仍使用預先規定的分層 bootstrap。

### 原始分析輸出


本報告量的是系統性質，不代表真人退出與重試行為。遊戲 RNG 不受控，兩組是獨立抽樣。策略等級：固定走位、懂進化；A 優先新武器，B 優先一般被動；event/curse 固定第一項，shop 不買。

執行 commit：c08cefbca950457d94e697e90e58f815e703a874；來源 SHA256：452f1587f096143e270898aa8e775dd261bdb3b38ebb66bb638e73a5155bd8fb。

| 策略 | 全局 n | 有效 | clear | 通關率（有效） | 通關率（全局） | 排除比例 | time p25/p50/p75 秒 | level p25/p50/p75 | abilities 空（有效／全局） |
|---|---:|---:|---:|---:|---:|---:|---|---|---|
| A | 4050 | 4024 | 76 | 1.89% | 1.88% | 0.64% | 95.13 / 129.45 / 162.96 | 2.00 / 5.00 / 9.00 | 1742/4024；1742/4050 |
| B | 4050 | 4037 | 11 | 0.27% | 0.27% | 0.32% | 98.08 / 133.71 / 176.73 | 2.00 / 4.00 / 6.00 | 664/4037；664/4050 |

原始行 8103；唯一 key 8100；api_hits=≥8316；browser_restarts=≥18；起訖 2026-09-15T15:26:02.380Z → 2026-09-15T17:15:20.428Z；實際跨度 109.30 分鐘；session 累計 107.21 分鐘。

分析版本：51559bc42e2e8bc5476061185ea64a7319cefb59；分析來源 SHA256：acae38d6cd2011f31799af527c1276b1b14e98fcaa060deebde46674d3628d38。

計數限制：1 個 session 非零退出；其中 API／重開計數各有 1／1 個歷史失敗 session 未記錄。上列 ≥ 是已知下界，不是完整總數；未將未知值補成 0。所有最終 run 記錄仍須完整且無 error。

### 選擇稽核與 endReason

A：choiceAudit {"choices":23904,"divergences":9559,"selectedAbility":0,"selectedWeapon":9559}；result {"clear":76,"death":3948,"timeout":26}；endReason {"finishRun":3979,"reaper_timeout":25,"sim_cap":46}；clear endReason {"finishRun":31,"reaper_timeout":25,"sim_cap":20}。

B：choiceAudit {"choices":14748,"divergences":9473,"selectedAbility":9473,"selectedWeapon":0}；result {"clear":11,"death":4026,"timeout":13}；endReason {"finishRun":4031,"reaper_timeout":4,"sim_cap":15}；clear endReason {"finishRun":5,"reaper_timeout":4,"sim_cap":2}。

### 逐生態

| 生態 | 策略 | n／有效 | clear | 有效率／全局率 | time p25/p50/p75 | level p25/p50/p75 | abilities 空／有效 | endReason |
|---|---|---:|---:|---|---|---|---|---|
| crypt | A | 405/398 | 2 | 0.50% / 0.49% | 95.14 / 128.08 / 156.06 | 2.00 / 5.00 / 8.00 | 169/398 | {"finishRun":397,"sim_cap":8} |
| crypt | B | 405/405 | 0 | 0.00% / 0.00% | 97.96 / 133.57 / 175.30 | 2.00 / 4.00 / 6.00 | 54/405 | {"finishRun":405} |
| cavern | A | 405/402 | 14 | 3.48% / 3.46% | 94.91 / 129.15 / 174.41 | 2.00 / 5.00 / 9.75 | 186/402 | {"finishRun":391,"reaper_timeout":6,"sim_cap":8} |
| cavern | B | 405/404 | 2 | 0.50% / 0.49% | 98.15 / 134.01 / 169.99 | 2.00 / 3.00 / 6.00 | 87/404 | {"finishRun":404,"sim_cap":1} |
| frost | A | 405/403 | 3 | 0.74% / 0.74% | 109.87 / 133.11 / 163.83 | 3.00 / 6.00 / 9.00 | 158/403 | {"finishRun":402,"sim_cap":3} |
| frost | B | 405/405 | 2 | 0.49% / 0.49% | 96.94 / 130.23 / 171.64 | 2.00 / 4.00 / 6.00 | 66/405 | {"finishRun":404,"sim_cap":1} |
| inferno | A | 405/405 | 10 | 2.47% / 2.47% | 94.44 / 132.79 / 167.78 | 2.00 / 5.00 / 9.00 | 175/405 | {"finishRun":402,"reaper_timeout":2,"sim_cap":1} |
| inferno | B | 405/403 | 1 | 0.25% / 0.25% | 103.88 / 136.63 / 182.47 | 2.00 / 4.00 / 6.00 | 54/403 | {"finishRun":402,"reaper_timeout":1,"sim_cap":2} |
| void | A | 405/404 | 4 | 0.99% / 0.99% | 93.36 / 125.34 / 158.48 | 3.00 / 5.00 / 9.00 | 166/404 | {"finishRun":403,"reaper_timeout":1,"sim_cap":1} |
| void | B | 405/402 | 1 | 0.25% / 0.25% | 100.10 / 133.10 / 172.52 | 2.00 / 4.00 / 6.00 | 69/402 | {"finishRun":401,"sim_cap":4} |
| verdant | A | 405/402 | 12 | 2.99% / 2.96% | 99.40 / 133.28 / 172.70 | 3.00 / 6.00 / 10.00 | 150/402 | {"finishRun":394,"reaper_timeout":6,"sim_cap":5} |
| verdant | B | 405/403 | 2 | 0.50% / 0.49% | 105.28 / 137.11 / 178.29 | 2.00 / 4.00 / 7.00 | 64/403 | {"finishRun":403,"sim_cap":2} |
| desert | A | 405/401 | 4 | 1.00% / 0.99% | 93.25 / 127.84 / 150.91 | 2.00 / 5.00 / 8.00 | 181/401 | {"finishRun":399,"reaper_timeout":1,"sim_cap":5} |
| desert | B | 405/404 | 0 | 0.00% / 0.00% | 94.77 / 132.61 / 177.71 | 2.00 / 4.00 / 6.00 | 64/404 | {"finishRun":404,"sim_cap":1} |
| swamp | A | 405/404 | 11 | 2.72% / 2.72% | 98.76 / 132.60 / 172.50 | 2.00 / 6.00 / 10.00 | 157/404 | {"finishRun":397,"reaper_timeout":4,"sim_cap":4} |
| swamp | B | 405/403 | 2 | 0.50% / 0.49% | 98.35 / 137.42 / 179.23 | 2.00 / 4.00 / 6.00 | 56/403 | {"finishRun":401,"reaper_timeout":2,"sim_cap":2} |
| abyss | A | 405/403 | 10 | 2.48% / 2.47% | 96.89 / 130.82 / 161.15 | 2.00 / 5.00 / 9.00 | 187/403 | {"finishRun":398,"reaper_timeout":4,"sim_cap":3} |
| abyss | B | 405/405 | 1 | 0.25% / 0.25% | 96.28 / 133.35 / 188.47 | 2.00 / 3.00 / 6.00 | 68/405 | {"finishRun":404,"reaper_timeout":1} |
| celestial | A | 405/402 | 6 | 1.49% / 1.48% | 87.32 / 120.20 / 155.61 | 2.00 / 4.00 / 7.00 | 213/402 | {"finishRun":396,"reaper_timeout":1,"sim_cap":8} |
| celestial | B | 405/403 | 0 | 0.00% / 0.00% | 91.90 / 128.95 / 171.60 | 2.00 / 3.00 / 5.00 | 82/403 | {"finishRun":403,"sim_cap":2} |

### 判定

B−A 有效局通關率差：-1.62 pp；95% CI -2.04 / -1.19 pp。全局差 -1.60 pp；95% CI -2.02 / -1.19 pp。

生態×角色分層、兩組分別重抽樣，5000 次，分析 seed=20260915。遊戲 RNG 不受控，不能當作同世界配對或真人成效。

預先固定門檻：有效率至少 +1pp、CI 下界 >0、全局方向一致、B 排除率不增加。逐門檻：{"gainAtLeastOnePoint":false,"confidenceAboveZero":false,"allRunsAgree":false,"noExtraExclusions":true}。結論：保留 A；本次 B 未通過全部採用門檻，這不代表已證明等效。

原始失敗與各 cell SHA256／執行次數見 analysis.json evidence；先導與確認資料未合併。


### 錯誤、恢復與計數限制

| 範圍 | 錯誤 | 恢復與證據 |
|---|---|---|
| seed 1／swamp A／h4_paladin／run 2 | page.waitForFunction 60 秒逾時 | 同參數補跑成功，原始 error 行保留 |
| seed 2／frost B／h2_trapper／run 3 | page.goto ERR_NO_BUFFER_SPACE | 同參數補跑成功，原始 error 行保留 |
| seed 2／desert B／h4_paladin／run 2 | page.waitForFunction 60 秒逾時 | 同參數補跑成功，原始 error 行保留 |
| seed 3／celestial A 的 preflight | 讀取 live registry 的頁面就緒等待逾時，尚未指派局次 | 確認程序終止、5173 空閒後，以原 c08cefb／原目錄／原參數續跑一次，補完最後 135 局 |

前三筆形成 8103 原始行；第四筆是開局前失敗 session，不是額外遊戲局。沒有連續兩次續跑失敗，也沒有 Chromium launch 失敗。第一輪結束狀態與錯誤保存在 .pipeline/ab-confirm-first-execution.json、ab-confirm.stderr.txt；成功續跑保存在 ab-confirm-resume1.* 與各 cell launcher/session 檔案。

舊版 preflight 失敗跳過 finishUp，該 session 未印出 API／browser restart 計數，無法從已結束程序回溯。分析 JSON 明列總數 null、已知下界 8316/18、各缺 1 個 session；**不把未知當成 0，也不宣稱下界是完整總數**。這不影響每局結果、唯一 key、策略分派或通關率分母。後續工具已修正為非零退出也保存實際計數；新增真 CLI 失敗案例先紅後綠。修正發生於全部實驗資料完成之後，數學方法與預先門檻均未改動。

### 驗證與文件關卡

| 項目 | 實際輸出／證據 |
|---|---|
| 原單元＋新增測試 | tests 145；pass 145；fail 0（.pipeline/ab-final-unit.txt） |
| 原 Chromium 整合 | tests 27；pass 27；fail 0（ab-final-original-integration.txt） |
| A/B Chromium／CLI 整合 | tests 4；pass 4；fail 0（ab-final-ab-integration.txt） |
| server 語法檢查 | exit 0（ab-final-server-check.txt） |
| server smoke＋social | 120 passed, 0 failed；65 passed, 0 failed（ab-final-server-test.txt） |
| frontend | 59/59 assertions passed（ab-final-frontend.txt） |
| 原策略獨立核對 | 10,000 fixtures，A 差異 0；B 的 840 個差異均只有新武器改選一般被動（ab-equivalence.json） |
| 確認資料獨立核對 | raw 8103、unique 8100、missing 0、final error 0（ab-independent-confirm.json） |
| CI 方向獨立核對 | 差 −1.616pp，近似區間 [−2.066, −1.166]pp（ab-ci-independent-check.json） |
| 原 R30 原始資料 | SHA256 27a77c6d87b8267267544d27503dbfbf4559e6ea7c3b611d505ec4a94e5a09de，未變動 |
| 文件 | requirements/design/tasks、ROUND31、README、CLAUDE 與本摘要更新；沒有 PROGRESS.md，不另建 |
| src/、server/ | 本輪無差異；批次與最終測試已結束，5173 空閒 |

實驗程式 c08cefbca950457d94e697e90e58f815e703a874；失敗 session 修正 5e71910965c23d51eb91d326a509e25672d9bea9；正式報告版本 51559bc42e2e8bc5476061185ea64a7319cefb59。本輪沒有 push、PR、merge 或部署。

### 下一步

1. 保留 A 作後續基準，不再擴大 B 到全難度。
2. 下一個候選先蒐集選項供給、升級／拾取節奏及武器／被動選擇分布，確認是否存在經驗取得或傷害成長瓶頸。level 降低只是線索，目前未量得其因果機制。
3. 再提出單一變因策略與獨立實驗，不調整遊戲數值；真人退出、重試、短局模式與 co-op UX 仍需真人資料。
