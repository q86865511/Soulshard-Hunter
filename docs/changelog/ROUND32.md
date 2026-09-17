# ROUND32 — 成長診斷、A/C 實驗與伺服器權威合作

日期：2026-09-16～17。程式版本：V2.1。本地實作與實驗已驗證；使用者於 9/17 授權 push／PR／merge 及本次合併觸發自動部署。真人評估缺原始受測資料，保持未完成。

## 來源與工作界線

- 診斷程式：cdb8d3a；候選 C 預登記：5ccf809；實驗程式：f1aab7bf2f46a90ac1846e0f10201d1f908ae4bf。
- A/C 全程使用固定來源 SHA256 5038343934545d9500b12c05688f942c3099a74b123f5232f10718b0a5cacb5c、原輸出目錄與原參數。權威實作在另一 worktree 進行，未污染實驗來源。
- 使用者另行授權正式 src／連線協定實作與四個打包設定檔的本機驗證。BALANCE、內容定義、存檔程式與格式未改。
- 發布走 PR 測試與 main 部署關卡；發布結果以 GitHub Actions 實際紀錄為準。目標平台的 ARM 容量尚未量測。

## 成長診斷

growth-v1 明確 opt-in，記錄選項供給、實際選擇、XP 產生／拾取／逾期／剩餘、價值守恆、升級間隔及移動情境。包裝保留原方法 this、參數、回傳、例外與呼叫次數；不額外推進世界或消耗遊戲 RNG。終態拾取物鉤子即時釋放，共同早期窗口納入死亡前暴露時間。

A/B 各 270，共 540 唯一 key，最終 error 0、XP 守恆違例 0；跨度約 13.91 分鐘，api_hits=557、browser_restarts=0。90–120 秒的 A/B kills/分 110.00／61.80、XP 產生/分 429.68／237.54；B 新武器選擇 46 次，A 為 680 次。成長落差符合火力與 XP 供給的回饋不足，沒有把相關性當成因果。

摘要：[成長診斷](../reviews/bot-balance/2026-09_growth-diagnostic.md)。

## 候選 C 與確認結果

C 只把合格 XP 走位吸引權重 1→1.5，選擇規則仍是 A；其餘威脅、安全閘、牆壁、dash、dt 與選項優先序不變。profile／manifest 格式 2 與 moveAudit 驗證實際分派。先導 540 局另存，A/C 各通關 2 局。

確認批次：10 生態×27 角色×5 局×3 seed×2 策略＝8100 唯一 key，原始 8104 行，最終 error 0。

| 策略 | 通關／有效 | 有效通關率 | 全局通關率 | timeout |
|---|---:|---:|---:|---:|
| A | 65／4014 | 1.6193% | 1.6049% | 36 |
| C | 65／4018 | 1.6177% | 1.6049% | 32 |

C−A 為 −0.0016 pp；預登記分層獨立 bootstrap 5000 次、seed 20260915，95% CI 為 [−0.5232, +0.5201] pp。四個門檻中，僅「排除率不升高」通過。**保留 A，不採用 C 為新基準。**

C 的早期 XP 收集/分提高，但中位存活與通關沒有改善；終局等級中位兩組皆 5。C 的 707567 次移動取樣中，有 45630 次同輸入 A/C 方向分歧，處置確實觸發。

完整判讀、角色極差、endReason 與全格附表：[A/C 摘要](../reviews/bot-balance/2026-09_strategy-ac.md)、[540 列逐格資料](../reviews/bot-balance/2026-09_strategy-ac_cells.csv)。

### 人工暫停的證據與限制

使用者在 38/60 格完成時要求停止，次日以原參數續跑。中斷格已有 114 筆，沒有半行；這些位元與 R30 原始 SHA256、R31 統計和報告均經核對未改。

人工中止的一個 session 沒有 exitCode、endedAt、wallMs 與終態 counters。新增獨立的雜湊／PID／格位／暫停快照證據核對，保留原 session 不動；未為未知值補 0，未放寬任何 run、policy、守恆或採用門檻。R31 舊分析以 verify-only 重跑，stats／CI／decision 逐值一致，舊報告位元未改。

可確認 api_hits≥8423、browser_restarts≥36；精確總數仍未知。已知 session 累計≥165.38 分鐘；實際起訖 2026-09-16T12:00:02.126Z 至 2026-09-17T05:14:11.546Z，跨度 1034.16 分鐘，包含隔夜暫停。最多四個未寫入 C 世界的保守敏感度上界約 +0.10pp，仍無法達到 +1pp 採用門檻。

三句聲明：測量系統性質，非真人行為；遊戲 RNG 不受控；策略為固定規則啟發式。diff1 約 1.62%，在目前工具策略範圍解讀為「量到的是策略上限」。下一輪需另行預登記策略干預及取得真人資料，不能直接據此改遊戲數值。

## 伺服器權威合作

- API 管理每房間獨立 Node 子程序，共用完整 bootstrap、runScene／World／Player／Enemy；120Hz 更新、約 18Hz 快照。所有瀏覽器都是輸入及呈現端。
- protocol 2、JWT/cid 綁定、runId／遞增 seq／choiceId、有限向量與限流；客戶端世界、結果與合作成績上傳不被採信。
- 原房主保有既有完整升級及 meta 規則，隊員保留原基礎能力／武器選擇；原房主存檔仍是永久進度結算歸屬。已有雲端進度經範圍驗證後使用，不新增開局前自動上傳。
- 重連綁定分頁與身分，角色保留當前血量與死亡狀態；斷線仍受傷、世界繼續。原房主離開不終止隊伍；最後離房先結算再回收程序。
- 移除會額外限制玩法的 45 分鐘中止條件；保留容量、256MB heap、啟動／心跳／積壓與背壓保護。預設 crypt 與原放棄計分／聲望公式保留。
- authority_results 唯一收據、存檔 CAS 與排行榜寫入使用單一 SQL；衝突不覆蓋較新進度。runend 先回報勝負，settlement 另回報儲存；30 秒未確認會回報不確定性並釋放資源。
- 修正舊連線延遲回呼、房號重用、僅剩暫時斷線隊友的管理權移轉，以及結算讀取覆蓋新進度／新帳號的競態。
- 保留原房主 Esc 非暫停選單、選項圖示與已知進化提示，補足隊伍等級／經驗顯示。
- 離線歷史進度、單機紀錄、合法輸入型 bot 與完整快照資訊仍有各自的信任界線，不能宣稱全面防作弊。

打包包含 server/src 與共用 src，僅安裝正式依賴；Docker context 改為 repo 根目錄。設定檔已按使用者授權修改，沒有執行部署。最新 Linux x64／Node 22.23.2 無網路容器驗證 API、房間、快照及結算；測完已關閉 Docker。

本機 Windows x64 開局負載：兩間三人房、12 秒、每房 1405 個取樣；p95 0.386／0.376ms，p99 0.592／0.609ms，RSS 約 87.8／87.9MB。此數據不代表晚期怪潮或 Oracle ARM 容量。

架構與操作：[SERVER_AUTHORITY_R32](../architecture/SERVER_AUTHORITY_R32.md)、[server README](../../server/README.md)。

## 驗證

實際輸出摘要：

~~~text
node --test "tools/bot/test/*.test.mjs": tests 171, pass 171, fail 0
node tools/bot/test/integration.mjs: tests 27, pass 27, fail 0
ab-integration: tests 4, pass 4, fail 0
growth-integration: tests 3, pass 3, fail 0
c-integration: tests 4, pass 4, fail 0
server npm run check: exit 0
server smoke: 120 passed, 0 failed
server social: 65 passed, 0 failed
authority unit: tests 20, pass 20, fail 0, cancelled 0
authority simulation: 22 checks
authority content: 270 worlds, 32400 ticks
authority gateway / SQL / API / validation / abandon / disconnect: 12 / 10 / 11 / 10 / 3 / 5 checks
frontend: 59/59 assertions passed
Chromium / Node parity: 10 checkpoints matched
two-browser authority flow: 13 checks, errors []
npm audit: 0 vulnerabilities
~~~

所有預設 5173 的整合測試均在批次終了後依序執行，避免會暫改 ids.json 的案例與分析重疊。對照測試兩邊靜音，敵人索引先依各自 runstart.defs 還原；未把測試固定 RNG 當成正式遊戲可重播的證據。

## 真人評估及後續

流程、空白表與分析規則位於 docs/research/r32-human-evaluation/。目前尚無真人原始資料，H2 不勾選。退出／重試意願、短局、手動瞄準及 co-op UX 仍未形成實測結論；自動化帳號不計入受測者。

剩餘研究工作：取得真人原始資料及目標平台容量驗證。push／PR／merge 與本次自動部署已於 9/17 另行獲得使用者授權。

## V2.1 發布文件

README 更新目前版本、A/C 裁決、合作行為與待辦；遊戲標題版本升為 V2.1，補齊 R21–R32 玩家更新日誌。CLAUDE 同步版本索引。舊批次仍固定原始 V2.0 來源，不以新版續跑。

發布前追加驗證：前端 59/59；Node 22 瀏覽器／原生模擬 10 個 checkpoint 一致、雙瀏覽器合作 13 checks 且 errors=[]；版本日誌 30 筆唯一版本、V2.1 詳頁可正常顯示，瀏覽器無未捕捉錯誤；git diff --check 通過。
