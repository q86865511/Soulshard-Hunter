# bot-balance-sim T8：基準與隔離實跑

日期：2026-09-15（Asia/Taipei）

## 機器資訊

| 項目 | 實際查詢結果 |
|---|---|
| CPU | 13th Gen Intel(R) Core(TM) i5-13600K |
| 核心數 | 14 實體核心、20 邏輯處理器（Get-CimInstance Win32_Processor） |
| 記憶體 | 34088361984 bytes，約 31.75 GiB（Get-CimInstance Win32_ComputerSystem） |
| Node | 24.15.0（node -p "process.versions.node"） |
| Playwright | 1.61.1（node -p 讀取專案 test/node_modules/playwright/package.json） |
| Chromium | 149.0.7827.55（實際啟動後 browser.version()）；套件 revision 1228 |

## 機讀校正欄位

median_ms: 461
inflation: 2.92

本次無沙盒重跑取代前次 EPERM 失敗結果；三批皆從沒有 runs.jsonl 的指定目錄開始，依序執行並等待程序自然結束。p1、p4 未指定 --maxSimSec，使用正式步長 1/120、預設上限 1200 + 30 + 120 = 1350 模擬秒。

## p1：單局基準（三局）

~~~text
node tools/bot/run.mjs --biomes crypt --chars hunter --diffs 1 --runs 3 --parallel 1 --out tools/bot/out/bench_p1
~~~

| runIdx | result | endReason | time（模擬秒） | ticks | simMs（毫秒） |
|---|---|---|---:|---:|---:|
| 1 | death | finishRun | 97.2583333333568 | 11671 | 401 |
| 2 | death | finishRun | 138.2833333333719 | 16594 | 675 |
| 3 | death | finishRun | 122.53333333337692 | 14704 | 461 |

程序起訖（UTC）：2026-09-15T07:55:32.340Z → 2026-09-15T07:55:37.580Z。整批耗時 5239 ms，exit code 0，api_hits=3，browser_restarts=0。

## p4：並行膨脹（四局）

~~~text
node tools/bot/run.mjs --biomes crypt --chars hunter --diffs 1 --runs 4 --parallel 4 --out tools/bot/out/bench_p4
~~~

| runIdx | result | endReason | time（模擬秒） | ticks | simMs（毫秒） |
|---|---|---|---:|---:|---:|
| 1 | death | finishRun | 137.20833333337288 | 16465 | 1294 |
| 2 | death | finishRun | 83.49166666667918 | 10019 | 588 |
| 3 | death | finishRun | 169.90833333334314 | 20389 | 1501 |
| 4 | death | finishRun | 175.8500000000044 | 21102 | 1398 |

程序起訖（UTC）：2026-09-15T07:55:46.834Z → 2026-09-15T07:55:50.992Z。整批耗時 4157 ms，exit code 0，api_hits=4，browser_restarts=0。

p1 simMs 排序：401、461、675；中位數 461 ms。p4 simMs 排序：588、1294、1398、1501；中位數 1346 ms。膨脹倍率 = 1346 / 461 = 2.91973970，四捨五入至小數點後兩位為 2.92（未觸發 1.0 下限）。

**適用限制：**七局基準均提前死亡，存活約 83–176 模擬秒；完整局長設定不代表已存活滿 20 分鐘。simMs 未涵蓋整批啟動、每局建立 context、載入頁面及結束整理的全部成本。遊戲 RNG 不固定，p1 與 p4 的局長不同，倍率也混入局況差異；本次僅依指定方法校正，6750 局預估不代表全量實際工時，T10 應再以全量局長與整批耗時核對。

## 裁決 12：預設 restartEvery=50 跨重啟不遺失

~~~text
node tools/bot/run.mjs --biomes all --chars all --diffs 1 --runs 1 --parallel 2 --maxSimSec 5 --out tools/bot/out/bench_restart
~~~

未傳 --restartEvery，沿用預設值 50；10 生態 × 27 角色 × 1 難度 × 1 局 = 270 局，parallel=2，每局上限 5 模擬秒。

| 指標 | 實測 | 驗收 |
|---|---:|---|
| runs.jsonl 行數 | 270 | 恰 270 |
| result:error 行數 | 0 | 0 |
| browser_restarts | 4 | ≥ 4 |
| exit code | 0 | 0 |
| 唯一組合數 | 270 | 270 |
| 遺漏／額外組合 | 0／0 | 0／0 |
| api_hits（CLI 攔截計數） | 270 | 留存隔離證據 |
| 整批實際耗時 | 89590 ms | 約 89.590 秒 |

程序起訖（UTC）：2026-09-15T07:55:57.675Z → 2026-09-15T07:57:27.266Z。裁決 12：**達標**。

## 裁決 14：真通關路徑證據狀態

統計範圍：p1 3 筆 + p4 4 筆 + restart 270 筆，共 277 筆；result === 'clear' 共 **0 筆**。

| endReason（僅 result:clear） | 筆數 |
|---|---:|
| 無 | 0 |

基準局未出現通關，真 clearLevel 路徑證據延後至 T10 全量資料（以 result:clear 的 endReason 分布佐證）

## 異常

三批 CLI 均 exit 0，stderr 均為空；本次未再出現 Chromium spawn EPERM。

## 證據檔案與範圍驗證

原始逐局資料及報告分別位於 tools/bot/out/bench_p1/、bench_p4/、bench_restart/；各批未加工 stdout、stderr 與起訖／退出碼存於 tools/bot/out/bench_evidence/。

以執行前後 SHA-256 比對 1025 個 tracked 檔案，內容變更數：0。git status --porcelain src/ 為空。既有 CLAUDE.md、README.md、docs/changelog/ROUND30.md 修改屬另一任務。

git status --porcelain 原文：

~~~text
 M CLAUDE.md
 M README.md
 M docs/changelog/ROUND30.md
?? specs/bot-balance-sim/BENCH.md
~~~

## 6750 局 dry-run 校正後預估

~~~text
node tools/bot/run.mjs --dry-run --biomes all --chars all --diffs 1,2,3,4,5 --runs 5 --parallel 4
~~~

完整 stdout：

~~~text
組合數: 6750
預估: 0.63 小時（中位 461 ms/局 · 並行膨脹 2.92 · parallel 4）
~~~

換算：6750 × 461 × 2.92 / 4 / 3600000 = 0.630994 小時（約 37.86 分鐘，CLI 顯示 0.63 小時）；dry-run exit code 0。
