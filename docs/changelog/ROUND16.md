# Round 16 — UX 大修 + 新手引導 + 玩家回饋 + 後台強化（實作中）

> 設計規格見 [`docs/ROUND16_SPEC.md`](../ROUND16_SPEC.md)（已整併、合併進 main，PR #43）。
> 本回依「依賴排序分批 PR、每批測試」推進；以下依**已完成批次**記錄實際落地內容與驗證方式。

---

## 批次 B8 — 新系統與後端（第七章）+ 後台三新模組

**範圍：** 第七章 7.1–7.8 全部落地（additive；單人離線路徑不受影響）。伺服器為權威驗證面，前端 offline-first。

### 伺服器（`server/src/`）
- **7.1 玩家回饋系統**：`db.js` 新增 `feedback` 表（`feedback_status_idx`）。`server.js` 新增 `POST /api/feedback`（公開，帶 JWT 則附 `user_id`，封鎖 IP 擋下）、`GET /api/admin/feedback`（可 `?status` 篩選）、`PATCH /api/admin/feedback/:id`（改狀態／備註）。
- **7.3 後台「遊玩中」即時可見**：`realtime.js` 新增記憶體 `livePlayers` + `touchPlaying/stopPlaying/activePlaying`（60s 視窗、lazy-expire、上限 400），`adminOverview()` 增加 `playing[]` 與 `totals.playing`。`server.js` 新增 `POST /api/presence/play`（登入者用 JWT username 覆蓋名稱防冒名；訪客也記）+ `/api/presence/stop`（皆獨立限流）。
- **7.6 後台稽核日誌**：`db.js` 新增 `admin_logs` 表（`admin_logs_time_idx`）。`server.js` 新增集中 `logAdmin(req, action, target, detail)`（自身 try/catch——記錄失敗不阻斷管理動作），於 **kick / close-room / ban / unban / broadcast / delete-run / feedback** 每個 requireAdmin 變更後呼叫；新增 `GET /api/admin/logs`。
- **7.7 後台數據統計儀表板**：`GET /api/admin/stats`——`Promise.all` 廉價 COUNT（總帳號／24h 活躍／總對局／今日／訪客局／生效封鎖／待處理回饋）+ 即時（線上／遊玩中／房間）+ Top5；缺表（漸進部署）以 `.catch(()=>0)` 降級不 500。
- **7.8 後台玩家詳情**：`GET /api/admin/player/:uid`——帳號（建立／最後登入）+ 生涯（對局數／最高分）+ 近 10 局 + 帳號封鎖狀態；未知 uid → 404。

### 前端（`src/net/`、`index.html`、`scenes/`）
- **`api.js`**：新增 `submitFeedback / adminFeedback / adminUpdateFeedback / adminLogs / adminStats / adminPlayer / pingPlaying / stopPlayingBeat`，及穩定 `clientSid()`（存 `localStorage 'soulshard.sid'`，跨重載與登出共用）。presence 與 feedback 皆 offline-first（無伺服器則靜默 no-op）。
- **`ui.js`**：
  - **7.1** `openFeedback()` 表單 Modal（類別下拉＋描述 textarea＋即時字數＋暱稱；未登入可送）。
  - **7.5 廣播改中央走馬燈**：`showBroadcast()` 取代舊靜態 toast——訊息從右滾入、橫跨畫面垂直中央、重複 3 段後 `animationend` 自動移除；`pointer-events:none` 不擋操作（hover 可點擊提早關閉）；>80 字截斷；同時僅一條。`RT.on('broadcast')` 改呼叫它。
  - **後台主控台**：分頁由 4 → 7（總覽／玩家／對局／廣播／**回饋／稽核／統計**）。總覽新增「🟢 遊玩中」清單＋狀態列遊玩中計數；玩家列新增「詳情」鈕 → **7.8 玩家詳情抽屜** `openPlayerInspect(uid)`（帳號＋近 10 局＋封鎖狀態＋快捷踢出／封鎖）；回饋分頁（狀態篩選＋即時改狀態＋備註＋下載 JSON）；稽核分頁（動作色碼時間軸）；統計分頁（卡片格＋Top5）。
- **`scenes/hub.js`**：城鎮 Esc 選單新增「⚑ 回報問題」→ `openFeedback()`。
- **`scenes/run.js`**：`enter()` 起跳 presence 心跳（即時＋每 30s），`exit()` 停止＋通知伺服器（offline-first）。
- **7.4 Service Worker**：新增 `sw.js`（同源、`/api` 走網路；**程式碼 network-first**（部署後不殘留舊模組）／靜態資產 cache-first），`index.html` **僅在非 localhost** 註冊（保護開發用無快取伺服器、避免測試讀到舊模組）。

### 驗證
- **伺服器單元/整合測試全綠**：`server/test/smoke.mjs` **86/86**（含新增 43 條：feedback CRUD＋權限、presence playing 顯示/防冒名/停止、稽核每動作留痕＋非 admin 403、stats 欄位、player inspect 含 404）、`server/test/social.smoke.mjs` **65/65**（adminOverview 變更未破壞 realtime）。`fakepool.mjs`（dev 後端）同步補齊全部 admin 查詢攔截。
- **前端**：`node tools/serve.mjs` 載入無錯（`window.__GAME_ERROR__` 為 null，registry 計數不變）；走馬燈、回饋 Modal、`clientSid` 即時驗證通過；mock 後台回應驅動七個分頁＋玩家詳情抽屜，全部渲染無誤（截圖：統計儀表板＋中央走馬燈）。

---

## 批次 B11 — 核心模擬 Bug 群（第十章，independent track）

**範圍：** 與 UI keystone 無依賴、可 sim 驗證的後期關卡 Bug。

- **10.1 進化後基礎武器仍入升級池（BUG）**：`player.js` `checkEvolve()`／`fuseWeapons()` 在移除被消耗的基礎武器前，記錄 `run.evolvedWeaponIds.add(baseId)`（lazy-init Set）；`progression.js getRunChoices()` 的新武器池排除 `run.evolvedWeaponIds` 內的 id——進化／合成後不再把基礎武器當「新武器」重複提供。
- **10.5 裝備掉落機率降低**：新增 `BALANCE.GEAR_DROP_MULT = 0.7`，**僅**乘在 `world.js dropLoot()` 的「一般敵人裝備掉落」那一行；Boss 的保證裝備掉落（上方無條件分支）不受影響——減少戰鬥中頻繁被裝備三選一打斷。
- **10.6 金幣／道具被磁鐵彈走（排斥 BUG）**：`pickup.js` 吸附速度改為恆正（舊式 `220 - d*2` 在 pickupRange > ~110 時變負 → 道具反向逃離玩家）；並把每幀位移 clamp 到剩餘距離，避免越過玩家後反覆抖動。
- **10.2 最終 Boss 死後仍生怪（BUG）**：對照原始碼確認 `spawnTick`／`miniBossTick`／`eventsTick` 皆已 gate 於 `this.cleared`，`clearLevel()` 設 `this.cleared`／`this.run.cleared`——**已實作，本批僅驗證**。

### 驗證
- 單元（`preview_eval` 直接驅動模組）：`getRunChoices` 在 `evolvedWeaponIds` 含 `w_soulbolt` 時不提供該武器；`Pickup.update` 下遠距金幣（pickupRange 200、d=150）向玩家移動（150→100）且無方向翻轉（排斥已消除）。
- 整合：`__DBG.startRun()` 連跑 3600 幀（60s）零錯誤（`__GAME_ERROR__` null）、33 擊殺、地面掉落物正常流動、玩家存活——`dropLoot`（含新 gear mult）與磁鐵在真實跑局中運作正常。

---

## 批次 B10a — 死神（第十章 10.3 / 10.9）

- **10.3 死神移速大幅加強**：`content/enemies.js` reaper `speed 56 → 104`（接近玩家移速，charger 衝刺再加成）——靜止或慢速無法擺脫。
- **10.9 死神出現誤觸 Game Over（BUG）**：`clearLevel()` 給玩家 `invuln = BALANCE.REAPER_GRACE (0.6)` 緩衝，避免 Boss 死亡爆炸／殘留 AoE 在「通關→死神」過渡幀誤殺玩家而跳結束畫面；通關以布林 `this.cleared`/`this.run.cleared`、死神以 `this.reaperSpawned` 表示（不動整數 `run.stage`）。（完整流場尋路 10.7/10.8 屬另一批 B10b。）
- 驗證：`spawnReaper()` 產生的死神 `speed === 104`；`clearLevel()` 後 `player.invuln === 0.6`、`cleared`/`run.cleared` 為 true、`reaperSpawned` 為 true；零錯誤。

---

## 批次 B6 — 任務系統（第五章）

- **5.5 任務循序解鎖（前置任務）**：`content/quests.js` 委託新增 `requires` 欄位（鏈：清剿→獵首→屠戮小王、堅守→深入）；新增 `questUnlocked()`／`questLockedBy()`；`claimQuest()`／`trackQuest()` 對未解鎖的委託回 false；`hub.js` 公會面板鎖定列改灰底並顯示「🔒 需先完成：{前置名}」，點擊提示前置、不顯示追蹤／領取鈕。
- **5.1／5.3 對照確認已實作**：左側任務追蹤（`run.js drawQuestTracker`／`hub.js`）已顯示 `(當前/目標)` 數值（`fmtQuestVal`），且進度條只在 `done`（prog≥goal）時轉綠——非未達成即滿。
- **5.4 對照確認非 Bug**：`claimQuest()` 僅以 `bountyState.done`（prog≥goal）判定，無 `revealed` 額外閘；隱藏／傳奇委託達標即可領取。
- （5.2 多任務同時追蹤＝單追蹤改陣列＋HUD 多列，屬較大 UI 重構，列入後續批次。）
- 驗證：`questUnlocked(b_boss)` 在 `b_hunt` 未領取時為 false、領取後為 true；鎖定時 `claimQuest('b_boss')` 即使達標仍回 false，解鎖後可領；公會面板實機 render 零錯誤。

---

## 批次 B7a — 難度說明文字（第六章 6.4）

- **6.4 難度選擇說明文字**：`hub.js drawSortie()` 在難度列下方新增一行各難度說明（D1 入門～D5 夢魘），協助新手判斷選擇。
- 驗證：出擊面板實機 render 零錯誤，難度說明位於難度數字與「出擊狩獵」按鈕之間、不重疊（截圖確認）。

---

## 批次 B9 — 全域成就解鎖橫幅（4.9 / 4.9-B 統一）

- 新增 `src/game/toasts.js` 全域 `AchievementToasts` 佇列（純資料、無 import 避免循環）。
- `hud.js` 新增 `drawAchievementToasts()`（右上金色橫幅、淡入 0.3s→停留→淡出 0.5s、最多 3 條堆疊）。
- `state.js bankRun()` 解鎖成就時 push 名稱；`hub.js draw()` 與 `run.js render()` 末端皆呼叫 `drawAchievementToasts()`——城鎮與跑局都會顯示，不再只在成就殿堂可見。
- 驗證：push 後 `list()` 回傳數正確、兩場景 render 零錯誤；`/__shot` 精確截圖確認右上三條金色橫幅堆疊（throttled rAF 的 preview 截圖為舊幀，故改用 `/__shot`）。

---

## 批次 B7b — 劇情難度（第六章 6.5）

- 新增**難度 0「劇情」**：`balance.js` `STORY_DIFF_MUL 0.5` / `STORY_LUCK_BONUS 0.5` / `STORY_DROP_QUALITY 2`；`run.js` 偵測 `difficulty<=0`→`storyMode`，套低 `diffMul` + 加 `dropQuality`/`luck`（敵弱、掉落豐、近乎必過），開場橫幅顯示「劇情」。
- `state.js newRun()` 改 `opts.difficulty == null ? 1 : opts.difficulty`（修 `0 || 1` 被強制成 1）；`bankRun()` 對 `difficulty < 1` 的局**不上傳排行榜**（劇情不列榜）。
- `hub.js` 出擊面板難度可調到 0，顯示「劇情」+ 說明「敵人極弱、掉落豐厚，幾乎必過（不列入排行榜）」，`−` 在 0 停用、`+` 仍可上調。
- 驗證：`newRun({difficulty:0}).difficulty===0`、難度 3 仍為 3；劇情局 `storyMode===true`、`diffMul===0.5`；出擊面板 `/__shot` 截圖確認「劇情」標籤與說明；零錯誤。

---

## 批次 B4a — 武器進化路徑顯示（第十章 10.4）

- `run.js drawBuildPanel()` 在武器列下方，為每把可進化（`evolveInto`、未進化）武器顯示「↓ {基礎} → {進化}（需 {被動} ✓/✗）」；條件全滿時金色「★ 即將進化！」、未滿級顯示「· 需滿級」。
- 驗證：開 build 面板（Tab）實機 `/__shot` 確認顯示「↓ 魂晶彈 → 魂晶風暴（需 力量結晶 ✗）· 需滿級」；零錯誤。
