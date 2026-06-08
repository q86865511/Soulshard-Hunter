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
