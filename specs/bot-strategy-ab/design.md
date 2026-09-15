# bot-strategy-ab — 設計

## 策略與可稽核性
choice.mjs 的 decideChoice 增加第五個參數 strategy（預設 A），只切換兩項數字優先序。driver.startRun 傳入策略；每個 level 面板計算 A/B 決策作稽核，僅把指定組的決策交給 applyChoice。每局輸出 choices、divergences、selectedAbility、selectedWeapon（後兩項只算分歧場合）。
運算兩次不改遊戲 RNG；純策略每次重新使用相同 seed。不加入遊戲內容，也不注入勝利。

## 批次識別
experiment.mjs 提供純函式 manifest 比對、排程與資料稽核。
run.mjs 僅在明確 --strategy 時啟用實驗 manifest；舊無旗標 CLI 保留 R30 使用方式，但不得接續有 manifest 的目錄。
來源指紋涵蓋 git 列出的 src/、tools/bot/ 的 JS/MJS/JSON、tools/serve.mjs 與 index.html；新實驗程式須先 commit 才長跑。manifest 比對在任何 runs.jsonl 修復或追加前完成；每行策略一致也必須核對。
每次 session 用獨立 JSON/日誌保存；launcher 額外保存每個 child 的 PID、參數、起訖和 exit code。實驗一次一個 orchestrator；啟動前確認 5173 空閒，不沿用不明服務。

## 排程與恢復
ab-run.mjs pilot|confirm 指定 out；生成固定排程，biome 偶數 AB、奇數 BA，各 seed 依序執行。pilot 每個 cell 27 局，confirm 135 局。以子程序呼叫既有 run.mjs，parallel=4；每組獨立 out。
成功也驗算 records 和 report，exit 0 不等於沒有 error；error 或缺漏以相同參數續跑，最多連續兩次失敗即停止。launch/relaunch Chromium 失敗立即停止，不靠其他 worker 遮掩。
已完成 cell 從原檔驗證後跳過，不重跑；本階段 manifest 鎖定排程及程式來源。completed 索引只作便利，原始結果才是依據。

## 統計
ab-analyze.mjs 嚴格收集指定階段各 cell；先 dedupeLatest，再驗證預期 key、策略、seed、版本、schema；先導與確認分開。
以 biome×char 為分層，每組每層獨立有放回抽 15 個樣本；5000 次 bootstrap，固定分析 RNG seed=20260915。每次重新算 clear/有效與 clear/全部差，取 percentile 2.5%／97.5%。不進行同世界配對，也不以顯著的單格挑選策略。
使用 multinomial 類別（clear/death/timeout/error）與逐筆抽樣等價；零有效分母時 CI 為 null，不能採用。CI 描述這套系統與策略下的獨立樣本，不控制遊戲 RNG，也不保證能代表真人。
判定門檻在看先導結果前固定於 requirements R4；即使未達也完成 8100 局並保留 A。

## 測試
1. 純策略兩項交換與其餘優先關係、滿槽／signature／fuse／seed 不變。
2. manifest 每項漂移、缺少標記、混合策略／seed、重複與失敗最後一筆。
3. 排程數量、交替順序、不同階段目錄隔離、bootstrap 已知分布與採用門檻。
4. 真 Chromium：注入一個一般被動＋新武器面板，看 driver A/B 實際取得內容不同，確認稽核紀錄；CLI 兩組短局 manifest 及拒絕錯組續跑。
5. 原測試全部執行；最後獨立 PowerShell key/結果計數交叉核對。

## 實跑後的 session 稽核修正
資料於執行版本 c08cefb 全部完成後，新增 session-audit.mjs：成功 session 缺計數仍拒絕；已終止且非零退出的歷史 session 可明列未知計數，總數為 null、已知部分標下界。未終止、無合法退出碼或負數計數仍拒絕。每個 session identity 與 cell manifest 全欄位比對。run.mjs 最外層收尾直接擷取 live counter，preflight 失敗也保存。分析與執行版本分別記錄；數學方法和採用門檻未改動。
