# Claude Code 執行 Prompt：Soulshard Hunter 第一批體驗與發布可信度改善

以下內容可整段貼給 Claude Code。它只授權執行第一個里程碑，不授權實作完整評估 backlog。

---

你正在維護 `Soulshard-Hunter`。請在目前工作樹完成「第一局安全＋前端 CI＋平台支援說明」里程碑。

## 目標

1. 第一局 story／教學覆蓋顯示時，世界、敵人、玩家傷害、AFK、事件、生成與局內計時必須真正暫停。
2. 將前端最重要的 boot／scene／registry／story pause／co-op 自測加入 GitHub Actions，並成為部署前 gate。
3. 在手機窄視窗或 coarse pointer 上顯示非阻擋的「目前建議使用實體鍵盤遊玩」提示；桌面不顯示。這一批不實作虛擬搖桿。
4. 將 `server/README.md` 的測試數量由舊的 18＋33 校正為 smoke 103＋social 65＝168。

## 開始前必讀與基準

依序完整閱讀：

1. `CLAUDE.md`
2. `docs/AI_PROJECT_REVIEW.md`
3. `docs/changelog/ROUND21.md`，以及執行時最新的 round changelog
4. `src/game/scenes/run/loop.js`
5. `src/engine/input.js`、`src/game/player.js`、`src/game/ui/settings.js`
6. `.github/workflows/ci.yml`、`.github/workflows/server-test.yml`、`.github/workflows/deploy.yml`

執行 `git status --short --branch` 與 `git rev-parse HEAD`。保留所有既有使用者變更，不要 reset、revert 或覆寫無關內容。若 HEAD 已不是報告基準 `03af175c08982135ea1cd0f2aa2a949a3dfaa111`，以當前實作為準重新確認問題是否仍存在，不要盲套舊行號。

## 實作順序

### 1. 先建立會失敗的前端回歸測試

使用 Playwright 的 dev/test-only Chromium 自動化；前端 runtime 仍須保持零依賴。建立以下明確結構：

- `test/package.json`：`type: module`，只放前端 smoke 所需的 dev dependency 與 `test:frontend` script。
- `test/package-lock.json`：讓 CI 使用 `npm ci --prefix test` 可重現安裝。
- `test/frontend-smoke.mjs`：啟動或連線 `node tools/serve.mjs`，完成下列斷言並在結束時清理 browser／server。
- `.github/workflows/frontend-test.yml`：可由 CI 與 deploy 共同呼叫的 `workflow_call`。

最少包含以下斷言：

- 頁面 boot 完成，`window.__GAME_ERROR__` 為空。
- `__DBG.reg()` 回傳目前 registry 基準：27 heroes、43 weapons、54 abilities、28 items、63 enemies、60 equipment、20 talents、11 facilities；欄位名稱以當前函式實際輸出為準。
- `__DBG.nav('hub')`、`__DBG.nav('run')` 加必要的 `pump` 後可 render，沒有 fatal error。
- fresh META／fresh run 的 story 存在時，pump 固定 frames 後 `run.time`、玩家 HP、擊殺數與敵人數不因戰鬥更新改變。
- story 自然結束或跳過後，下一批 frames 會恢復計時與世界更新。
- `__DBG.coopRoundTrip()` 的 `guestRendered` 與 `mvLiftRoundTrip` 成功。
- `__DBG.coopBossSyncTest()` 成功且 guest render 無錯誤。

測試要以狀態條件等待，不要用長時間固定 sleep 當成成功依據。測試不得寫入 repo tracked screenshot／snapshot。

先證明 story pause 測試在舊程式上會失敗，再開始改 gameplay。

### 2. 修正 blocking onboarding state

在 `run` update 的高優先級 modal/state 區處理 story，使其語意與 `hudTut` 一致：story 存在時只更新自身倒數與跳過輸入，然後 early return；不要執行 `run.time += dt`、`world.update(dt)`、spawn、events、AFK、傷害或 co-op snapshot。

保留既有「空白鍵必須先放開，再按一次才跳過」的 armed 防誤觸設計。story 關閉後，下一幀恢復正常模擬。不要藉此調整劇情文字、敵人數值或教學頁數。

若 co-op 不會顯示該 blocking story，保持現況；若會顯示，不得讓 host 的共享世界被 guest UI 意外永久暫停。用實際呼叫路徑確認，不要猜測。

### 3. 加入前端 CI 與部署 gate

新增可重用的 frontend workflow，使用 GitHub-hosted Ubuntu：

1. checkout
2. 安裝純測試用 Node／Chromium 依賴
3. 啟動 `node tools/serve.mjs`
4. 執行前端 smoke
5. 無論成功失敗都清理背景 server

更新 `.github/workflows/ci.yml`，讓 PR 與 `main` push 同時跑 server 與 frontend jobs。更新 `.github/workflows/deploy.yml`，讓 deploy 同時 `needs` 兩個 gate；任一失敗不得部署。不要移除既有 server reusable workflow。

### 4. 明確標示目前的平台支援

在標題頁或其外層加入小型、非阻擋提示：當 viewport 窄於 720 CSS px 或 `pointer: coarse` 時顯示「目前建議使用實體鍵盤遊玩」；桌面一般 viewport 不顯示。提示不得遮住單人、多人的主要操作，也不得讓玩家誤以為已有完整觸控控制。

更新 `README.md` 的操作／已知限制，明確寫出目前正式支援為鍵盤＋滑鼠；手機畫面會縮放，但完整觸控移動與動作控制尚未支援。

不要在本里程碑新增虛擬搖桿、手動瞄準、控制器抽象層或重新設計 HUD。

### 5. 文件與 changelog

- 將 `server/README.md` 測試說明更新為 smoke 103＋social 65＝168。
- 依 `CLAUDE.md` 規範新增或追加執行時最新 round changelog，記錄行為、檔案與實際驗證證據。
- 若測試命令或專案結構有變，更新 `README.md`／`CLAUDE.md` 的 Run/Test 區，避免文件再次漂移。

## Repo 約束

- 不直接修改 `src/game/content/gen/*` 或 `src/art/gen/*`；它們會被整合工具覆寫。
- 新數值必須進 `src/game/balance.js` 的 `BALANCE`；本批原則上不需要新平衡數值。
- 新內容必須走 registry；本批不得新增角色、武器、被動、裝備或生態。
- 維持離線優先、現有存檔向後相容、單機與合作協定相容。
- 前端可以有 dev/test dependency，但瀏覽器 runtime 不得新增 production dependency 或 build step。
- 不降低、跳過或刪除既有測試以換取綠燈。
- 不 commit、push、開 PR、merge 或部署。

## 必跑驗證

1. 新增的 frontend smoke：完整通過。
2. 瀏覽器重載後：title→fresh save→hub→run；story 閱讀期間 HP 與計時不變，關閉後恢復。
3. `__DBG.reg()`、`__DBG.coopRoundTrip()`、`__DBG.coopSilenceTest()`、`__DBG.coopBossSyncTest()`。
4. `cd server && npm ci && npm run check && npm test`，預期 smoke 103＋social 65 全綠。
5. `git diff --check`。
6. 回讀 workflow，確認 deploy 同時依賴 server 與 frontend gate。

若因環境限制無法跑任一項，明確列出未驗證項目與原因，不得寫「應該沒問題」。

## 完成回報格式

1. 結果摘要：玩家可觀察到什麼改變。
2. 修改檔案與設計決策。
3. 測試命令與實際通過數量／輸出。
4. 未驗證項目與剩餘風險。
5. 後續建議只能引用 `docs/AI_PROJECT_REVIEW.md` 的 P1／P2，不得在本批順手實作。

---
