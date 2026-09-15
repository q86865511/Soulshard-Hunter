# R30 bot-balance-sim：2026-09 全量決策摘要

日期：2026-09-15（Asia/Taipei）。資料為 tools/bot/out/full_2026-09-15/ 的首份全量批次及同參數續跑；以 tools/bot/preflight.mjs 的 dedupeLatest 保留每個 key 最後一筆。

本報告量的是系統性質，不代表真人退出與重試行為。
遊戲 RNG 不受控，局間差異屬正常。
策略等級：走位＋懂進化的選擇（event/curse 固定第一項、shop 不買）；未做技能取捨最佳化。

## 批次完整性與耗時

~~~text
node tools/bot/run.mjs --biomes all --chars all --diffs 1,2,3,4,5 --runs 5 --parallel 4 --seed 1 --out tools/bot/out/full_2026-09-15
~~~

| 指標 | 實際結果 |
|---|---|
| 原始 JSONL 行數 | 6752（含被續跑取代的舊紀錄） |
| dedupeLatest 後唯一 key | 6750；10 生態 × 27 角色 × 5 難度 × 5 局 |
| 遺漏／額外 key／schema 錯誤 | 0／0／0 |
| 尾行截斷 | false |
| toolVersion／gameVersion／seed／mode | 0.1.0／V2.0／1／normal |
| 產出報告 | report.md 存在，逐字等於 summarize(dedupeLatest(records)) |
| 啟動時間 UTC（原 PID 27580） | 2026-09-15T08:00:00.1156331Z |
| 最終報告寫入 UTC | 2026-09-15T09:13:56.301Z |
| 起始至最終報告牆鐘耗時 | 4436186 ms，約 73.94 分鐘（1.232 小時） |
| api_hits 合計 | 6866（原批次與續跑 stdout 加總） |
| browser_restarts 合計 | 133（原批次與續跑 stdout 加總） |

耗時含原始批次、等待確認結束與續跑間隔，不是各局 simMs 的加總。原程序在交接前啟動，退出碼未取得；以程序已不存在、報告和尾端計數、完整組合與逐筆 schema 核對證明結果完整。續跑退出碼另留存於 closeout-sessions.json。

### 原始與續跑證據

| 執行 | PID | 結果 | 唯一 key | error |
|---|---:|---|---:|---:|
| 原始批次 | 27580 | 退出碼未取得；已確認程序結束 | 6750 | 2 |
| 續跑 1 | 31564 | exit 0 | 6750 | 0 |

原批次頁面載入逾時的 error 局以相同參數及原目錄重試；不重建目錄、不刪原 JSONL，舊 error 行保留供追溯，統計只採同 key 最後一筆。重跑是新的遊戲 RNG 實現，非同一世界的重播。

合併 stdout 原文（每次執行各印一組，不把最後一組誤當全批次總量）：

~~~text
api_hits=6864
browser_restarts=133
api_hits=2
browser_restarts=0
~~~

## 通關率總覽

有效分母排除 timeout/error；所有 result:clear 都計入通關，包含 reaper_timeout 或 sim_cap 結束。下表保留兩位小數，CLI report.md 的比例為整數四捨五入。

| 難度 | 全部 | 有效 | clear | death | timeout | error | 通關率 | 有效局存活中位秒 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1350 | 1342 | 27 | 1315 | 8 | 0 | 2.01% | 128.50 |
| 2 | 1350 | 1347 | 3 | 1344 | 3 | 0 | 0.22% | 125.57 |
| 3 | 1350 | 1350 | 1 | 1349 | 0 | 0 | 0.07% | 123.29 |
| 4 | 1350 | 1349 | 0 | 1349 | 1 | 0 | 0.00% | 119.10 |
| 5 | 1350 | 1350 | 0 | 1350 | 0 | 0 | 0.00% | 113.28 |
| 全部 | 6750 | 6738 | 31 | 6707 | 12 | 0 | 0.46% | 122.63 |

## diff1 合理性判讀與下一步

diff1 為 27／1342 個有效局通關（2.01%），中位存活 128.50 秒，距完整 20 分鐘局仍很遠。依 design.md 的合理性規則，這個接近零的結果應先懷疑策略能力，不能據此直接判定遊戲過難。**本工具現階段量到的是策略上限，不是玩家可達上限。** 此處「策略上限」是本次固定策略的觀測能力界線，不是經數學證明的最優上限。

| 生態（diff1） | 全部 | 有效 | clear | 通關率 |
|---|---:|---:|---:|---:|
| crypt | 135 | 132 | 2 | 1.52% |
| cavern | 135 | 135 | 5 | 3.70% |
| frost | 135 | 134 | 0 | 0.00% |
| inferno | 135 | 135 | 1 | 0.74% |
| void | 135 | 134 | 1 | 0.75% |
| verdant | 135 | 134 | 6 | 4.48% |
| desert | 135 | 135 | 3 | 2.22% |
| swamp | 135 | 134 | 3 | 2.24% |
| abyss | 135 | 135 | 4 | 2.96% |
| celestial | 135 | 134 | 2 | 1.49% |

全量 4515／6750 局的 abilities 為空。規格 R4 將一般被動排在持有升級與新武器之後；「被動取得太晚、低等級提前死亡」是待驗證假說，現有資料不足以證明因果。

下一步：另開策略改良對照，先只調整 choice 的一般被動優先序，保留走位、dt、遊戲數值與輸出 schema；用同一 biome/char/diff/runIdx 與策略 seed 比較 diff1 通關率、存活中位數、等級、abilities 空值比例，再決定是否擴至全量。遊戲 RNG 不受 seed 控制，因此同 seed 不是同世界配對實驗，需多批獨立重複並比較分布。此次只提出對照方案，不混入本基準批次。

## 角色極差

依未取整比例，最高為 h4_paladin（4／248，1.61%）；最低為 hunter、pyro、guardian、shadow、g_warden、g_stormcaller、h4_puppeteer、h4_bladedancer、h2_duelist、h2_warder、h3_spearmaiden、h3_plague、h3_dragoon（0.00%）。角色間通關率極差 **1.61 個百分點**，未達到規格的 ≥50pp 異常門檻。低通關樣本下，這個排序不等同真人角色強度排名。

| 角色 | 有效 | clear | 通關率 | 有效局存活中位秒 |
|---|---:|---:|---:|---:|
| h4_paladin | 248 | 4 | 1.61% | 152.44 |
| g_arcanist | 250 | 4 | 1.60% | 112.38 |
| g_revenant | 246 | 3 | 1.22% | 136.44 |
| stormcaller | 249 | 3 | 1.20% | 119.16 |
| g_ranger | 249 | 3 | 1.20% | 111.99 |
| h4_gravekeeper | 250 | 3 | 1.20% | 137.83 |
| h2_voidcaller | 250 | 3 | 1.20% | 121.41 |
| h4_chronomancer | 250 | 2 | 0.80% | 111.19 |
| ranger | 250 | 1 | 0.40% | 117.38 |
| g_vanguard | 250 | 1 | 0.40% | 173.23 |
| h4_starcaller | 250 | 1 | 0.40% | 102.98 |
| h2_warlock | 250 | 1 | 0.40% | 108.81 |
| h2_trapper | 250 | 1 | 0.40% | 117.39 |
| h3_beastfang | 250 | 1 | 0.40% | 116.27 |
| hunter | 250 | 0 | 0.00% | 116.07 |
| pyro | 250 | 0 | 0.00% | 100.96 |
| guardian | 250 | 0 | 0.00% | 131.17 |
| shadow | 249 | 0 | 0.00% | 123.39 |
| g_warden | 250 | 0 | 0.00% | 128.61 |
| g_stormcaller | 249 | 0 | 0.00% | 103.54 |
| h4_puppeteer | 250 | 0 | 0.00% | 109.65 |
| h4_bladedancer | 250 | 0 | 0.00% | 97.24 |
| h2_duelist | 250 | 0 | 0.00% | 111.56 |
| h2_warder | 249 | 0 | 0.00% | 137.42 |
| h3_spearmaiden | 250 | 0 | 0.00% | 121.39 |
| h3_plague | 250 | 0 | 0.00% | 103.17 |
| h3_dragoon | 249 | 0 | 0.00% | 139.27 |

## 異常格清單

共 **37 個 0% 通關格**；沒有 100% 通關格或死因集中達 60% 的格。以下保留 report.md 的完整異常清單（生態×難度通關率 0%／100%、單一死因占比 ≥60%、角色極差 ≥50pp；比例採報表的整數四捨五入）。死因占比的分母僅含 death 且 deathSrc 非 null 的局。每一生態×角色×難度只有 5 局，適合作為後續檢查線索，不能單憑異常標記修改平衡。

- crypt×3：通關率 0%
- crypt×4：通關率 0%
- crypt×5：通關率 0%
- cavern×2：通關率 0%
- cavern×3：通關率 0%
- cavern×4：通關率 0%
- cavern×5：通關率 0%
- frost×1：通關率 0%
- frost×2：通關率 0%
- frost×3：通關率 0%
- frost×4：通關率 0%
- frost×5：通關率 0%
- inferno×3：通關率 0%
- inferno×4：通關率 0%
- inferno×5：通關率 0%
- void×2：通關率 0%
- void×3：通關率 0%
- void×4：通關率 0%
- void×5：通關率 0%
- verdant×2：通關率 0%
- verdant×3：通關率 0%
- verdant×4：通關率 0%
- verdant×5：通關率 0%
- desert×2：通關率 0%
- desert×3：通關率 0%
- desert×4：通關率 0%
- desert×5：通關率 0%
- swamp×3：通關率 0%
- swamp×4：通關率 0%
- swamp×5：通關率 0%
- abyss×2：通關率 0%
- abyss×4：通關率 0%
- abyss×5：通關率 0%
- celestial×2：通關率 0%
- celestial×3：通關率 0%
- celestial×4：通關率 0%
- celestial×5：通關率 0%

## 真通關路徑與 endReason（裁決 14）

| endReason（僅 result:clear） | 局數 |
|---|---:|
| finishRun | 9 |
| reaper_timeout | 16 |
| sim_cap | 6 |

這些是完整局長實跑資料，不是整合測試注入 cleared 的案例。driver.collect 讀取 run.cleared；遊戲 clearLevel 會設定該值與 reaperAt，driver 的 reaper_timeout 僅在已 cleared 且超過死神窗口後呼叫 finishRun(true)。因此通關局與 endReason 分布佐證真 clearLevel 路徑；reaper_timeout 表示由工具結束已通關的死神階段，不代表殺死死神，死神也不是通關條件。

## 跨 browser 重開不遺失（裁決 12）

本批未傳 --restartEvery，使用預設 50；累計 133 次重開後，仍取得 6750 個唯一 key，遺漏／額外均為 0，最終 error 為 0。這是跨重啟資料完整性的實跑證據；未採樣 RSS，不能宣稱已證明記憶體無洩漏。T8 的 270 局封頂測試另有 4 次重開、0 error、89.590 秒；simMs 中位 461 ms、並行倍率 2.92。

## 可追溯證據

- 原始資料、report.md、stdout.txt、stderr.txt、initial.stdout.txt、initial.stderr.txt、closeout-sessions.json：tools/bot/out/full_2026-09-15/（gitignored）。
- 完整性機讀核對：.pipeline/closeout-audit.json；使用既有 dedupeLatest、expandCombos、validateRecord 與 summarize。
- 原始 JSONL SHA-256：27a77c6d87b8267267544d27503dbfbf4559e6ea7c3b611d505ec4a94e5a09de。
- 本摘要與 ROUND30、BENCH、tasks、README、CLAUDE 納入本次文件 commit；原始批次及 .pipeline 保留本機，不強制加入 Git。
