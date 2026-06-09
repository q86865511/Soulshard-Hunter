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
- **改版（玩家回饋）**：移除武器列下方「永遠顯示一行」的進化文字，改為**滑鼠移到武器圖示才在 tooltip 顯示**進化路線（`drawTooltip` 內，依該武器顯示「↓ 進化：…（需 …✓/✗）· 需滿級」或「（此武器無進化路線）」；tooltip 寬度自動加寬）。`/__shot` 確認 hover 魂晶彈時 tooltip 底部出現進化行。

---

## 批次 B1（第一批）— 全域 UI 基礎：標楷體字型 + UI 代幣（第一章 1.1 / 1.6 基礎）

- **1.1 全域字型改標楷體**：~~`FONT` 改為 KaiTi 優先鏈~~ → **依玩家回饋已回退為原無襯線字型**（標楷體外觀被認為不好看；保留其餘 round16 成果）。1.1 視為「不採用 KaiTi」結案。
- **1.6 UI 代幣（基礎）**：`renderer.js` 新增 `export const UI`（`FONT_TITLE/HEADING/BODY/CAPTION`、`BTN_H`、`ICON_SM/MD/LG`、`GAP_*`）作為後續一致化的設計基準（additive；各畫面逐步套用）。
- 驗證：`/__shot` 截圖確認標題（魂晶獵手／單人遊戲…）與城鎮（魂晶之鎮／任務追蹤／底欄）皆以標楷體渲染、版面完整、零錯誤。
- （1.2 全形標點、1.3 連續縮放、1.4 金幣圖示化、1.5 按鈕外框、1.8 像素數字、3.0 面板通則套用＝後續 B1 子批，因屬全 UI 大範圍套用，分批進行以降低破版風險。）

---

## 批次 B7c — 無盡模式（第六章 6.6）

- 新增 `run.mode = 'endless'`（`balance.js ENDLESS_BOSS_INTERVAL 180`）：`state.js newRun()` 帶 `mode`；`run.js` `enter()` 設 `this.endless`／`endlessWave`。
- **核心行為**：`finalTick()` 在 endless 不生最終首領、不通關、不出死神；改為每 `ENDLESS_BOSS_INTERVAL` 秒由 `spawnEndlessBoss()` 生一隻**跨生態系隨機首領**（隨 threat 縮放）；威脅持續攀升不封頂。
- **HUD**：`drawStageHud()` endless 顯示「無盡挑戰 · 威脅 N」+「第 N 波 · 距首領 mm:ss」。
- **入口**：`hub.js` 出擊面板難度列右側新增「♾ 無盡挑戰」切換 chip（**通關任一關卡後解鎖**，`META.stats.clears>0`），描述列說明「無時限、首領每 180 秒一波、不列入標準排行榜」；`newRun({mode})` 帶入。
- **排行榜**：`bankRun()` 對 `mode==='endless'` 的局**不上傳**標準排行榜（與劇情難度一致；專屬波次榜為後續伺服器工作）。
- 驗證：`newRun({mode:'endless'}).mode==='endless'`；endless 局 time=181 → `finalTick` 生第 1 波首領（`endlessWave===1`、`boss===true`）；time=1300（過 20 分）仍 `cleared===false`、`finalBoss===false`（永不通關/出死神）；HUD 與出擊面板（含 chip + 說明）`/__shot` 渲染零錯誤。
- （MVP 範圍：結算畫面沿用標準死亡頁，未特別顯示「波次 N」字樣——列為小幅後續。）

---

## 批次 B13a — 金幣獲取 nerf（第九章 9.1）

- **9.1 金幣太好賺**：`balance.js` `GOLD_DROP_MULT 0.5 → 0.35`（每殺金幣 −30%）；新增 `GOLD_MULT_CAP 3.0`，於 `world.js dropLoot()` 將 `goldMult` clamp 到上限（`Math.min(goldMult, GOLD_MULT_CAP)`），堆疊金幣 build 不再失控。
- 驗證：sim 設 `goldMult=10` 時，掉落金幣 ≈ 封頂值（×3.0×0.35），非未封頂（×10×0.35）——確認 clamp 生效；跑局零錯誤。
- （經濟另半部：9.2 城鎮消費調漲、9.3 動態定價、9.4 加法堆疊管線＝後續 B13 子批，需整體 sim 調校。）

---

## 批次 B4b — 離開跑局確認彈窗（第四章 4.8）

- `run.js` 暫停選單「放棄並返回城鎮」改為**先彈確認**：顯示「確定放棄本局？／本局進度將結算後返回城鎮」+「確定放棄（紅）／取消」；Esc 先取消確認再退出暫停。`confirmQuit` 旗標於 enter／開暫停時重置。
- 驗證：`/__shot` 確認確認框正確渲染、按「確定放棄」前 `dead` 不變（不誤觸）、零錯誤。

---

## 批次 B8x — 羈絆可見化（第八章 8.2，build 面板）

- `run.js drawBuildPanel()` 左下新增「羈絆 X / N」摘要：已觸發者列名稱＋`bonusDesc`，未觸發顯示「尚未觸發 — 湊齊特定武器／被動組合即可啟動」；單行 clip、限左欄寬，不與右欄數值重疊、不溢出。
- 驗證：`/__shot` 確認 build 面板顯示「羈絆 0/12」摘要、版面完整、零錯誤。
- （完整「已達成／接近／未達成」三態清單 + 城鎮羈絆圖鑑 = 後續 → 由 B8b 完成。）

---

## 批次 B8b — 多階羈絆系統（TFT 式）＋全面可見化（第八章 8.2）

依玩家回饋，將羈絆從「單階一次性小加成」改造為 **TFT 式多階羈絆**，並把整套系統可見化（事前知道、事中提示、事後回顧）。

- **`content/bonds.js` 全面改寫為多階模型**：每個羈絆有 `tiers:[{at,bonusDesc,bonus}]`（突破點），進度數 = 組合型羈絆滿足的 `parts` 件數，或數量型羈絆的計數（`count`/`feeds`）。跨越每個階級門檻時套用該階**增量**一次（沿用「一局 build 只增不減 → 每階套一次安全」原則）。12 個羈絆各 2–3 階；`bonusDesc` 描述「該階新增的增量」與 `bonus()` 完全一致（避免乘法漂移）。
  - 新增匯出 `bondProgress()`（UI 進度快照）、`bondAdvancedBy(b,choice,run,player)`（判定某升級選項是否會推進／湊成某羈絆、填上哪一件 part、是否跨階）、`bondLevel`/`bondMaxLevel`/`bondCtx`；`checkBonds()` 回傳 `{bond,fromTier,toTier,tier}`；`activeBonds()` 回傳含 `tier` 的物件（仍保留 `name/bonusDesc` 讓舊呼叫端可用）。`run.bondTiers{id->階}` 為新狀態欄位。
- **3 選一升級卡（`run.js drawChoice`，使用者主要訴求）**：每張卡計算 `bondHintsFor()`，會推進羈絆者→卡片**金框＋★標記**，底部新增**羈絆明細區**：羈絆名＋`第 N / M 階`、組合件逐項 `✓ / ▶(此選項填上) / ·`（數量型則顯示「進度 X→X+1（下一階需 Y）」）、邁向的階級效果（`解鎖`／`推進` 前綴）、多羈絆時「＋另推進 N 個羈絆」。小卡（`r.h<190*S`）退化為單行精簡提示避免重疊。標題列加「★ 金框＝可推進羈絆」說明。
- **Tab build 面板（`drawBuildPanel`）**：底部改為**全寬三態總覽**——12 個羈絆 3 欄排列，金=已達成（`✓第N/M階`）、白=接近（`◐ X/門檻`）、灰=未達成；保留「羈絆 X/N」標頭。數值欄改為在三態帶上方止繪，互不重疊。
- **達成橫幅升級（`run.js` update）**：跨第 1 階顯示「★ 羈絆達成 · 名稱（效果）」，跨更高階顯示「★ 羈絆升階 · 名稱 第 N 階（效果）」；金色 ring 粒子保留；首次達成即時寫入 `META.bondsSeen`。
- **結算頁（`drawResultSummary`）**：羈絆列加註達成階級「名稱（第 N / M 階）」。
- **城鎮羈絆圖鑑（`hub.js`，個人小屋新分頁 8.2-D）**：個人小屋標頭加「生涯戰績 / 羈絆圖鑑」兩分頁（`personalTab`，`openPanel` 重置）。圖鑑列出全部 12 羈絆＋每階需求門檻與效果，可捲動；曾達成過的（`META.bondsSeen`）以金色標亮並標「✓ 已解鎖」，未達成灰底「未解鎖」供事前規劃。標頭顯示「已解鎖 X / 12」。
- **`state.js`**：`DEFAULT_META` 新增 `bondsSeen:[]` + loadMeta 回填；`bankRun` 把該局觸發過的羈絆併入 `META.bondsSeen`。
- 驗證（`/__shot` 實機）：建構含 ignite/haste/velocity/crit/pierce/swift/dash + 火焰武器的 build → 3 選一卡正確顯示金框＋★＋各羈絆 `第N/M階`＋件數 ✓/▶/· ＋效果（萬法通曉/武器庫/環繞軍團 多羈絆「＋另推進」皆正確）；推進 40 frame 後 `run.bondTiers` = {assassin:2,swift:2,inferno:1,scholar:1,storm:1}，build 面板三態帶正確（金/白/灰）；橫幅顯示「羈絆達成 · 烈焰之心（傷害 +6%）」；圖鑑分頁正確標亮 5/12、可捲動全 12 列、數量型 6/9/12 需求正確；切回生涯戰績分頁版面無回歸；全程 `__GAME_ERROR__` 為 null、console 零錯誤。

---

## 批次 B1d — 金幣文字統一為圖示（第一章 1.4）

把全遊戲混用的「金 / 金幣 / 無圖示」金幣**金額**統一為單一金幣圖示前綴，解決可讀性與一致性問題。

- **`engine/renderer.js` 新增 `goldStr(n)`**：回傳 `'🪙' + Math.round(n)`（金幣 emoji 在 canvas 以金色硬幣呈現，與面板標頭既有 `coin` sprite 視覺一致；經 22px/12px 實測皆清晰不破圖）。所有顯示**金額**處改用之。
- **`scenes/hub.js`（18 處金額）**：天賦／設施升級確認與按鈕標價、鍛造等級＋特效鑲嵌價（確認框＋按鈕＋特效列）、衣帽店重新進貨價（確認＋按鈕）、造型購買價（確認＋商店按鈕）、任務委託領取獎勵、角色解鎖售價、重置返還 toast（天賦／設施／鍛造）、個人小屋「持有」金幣 → 全部 `goldStr()`。**描述性**字串（「金幣不足」「以金幣永久強化」「點擊節點花費金幣升級」「已花費金幣」、開發者面板）刻意保留不加圖示。
- **`scenes/run.js`**：結算頁（通關／死亡）「帶回金幣 X」→「帶回 🪙X」。in-run HUD 金幣本就用 `iconCounter('coin', …)` 硬幣 sprite，無須改。
- **`scenes/title.js`**：主畫面與存檔槽摘要「金庫 X」金額 → `goldStr()`。
- **`content/guild.js`**：公會等級獎勵 `label` 的「+X 金」→「＋🪙X」（6 處，手寫內容檔非 gen）。
- **未改**：`src/game/content/gen/*`／`src/art/gen/*`（會被 `integrate.mjs` 覆寫）；以及內容檔中「金幣 +X%」這類**敘述性加成文字**（句中插圖示反而怪，且非金額顯示）。
- 驗證（reload 後 `/__shot` 實機）：鐵匠鋪「強化等級 🪙180」「特效 🪙260」、主畫面「金庫 🪙398」皆正確渲染金色硬幣；hub/run/title 重新載入 `__GAME_ERROR__` 為 null、console 零錯誤；殘留 `金` 字串經 grep 確認皆為敘述性（非金額）。

---

## 批次 B8b/B1d — 對抗式審查修正（25 agent、5 維度 × 驗證）

對 B8b＋B1d 跑了一輪多 agent 對抗式審查（5 維度審查 → 逐項對抗驗證）：**12 項核心正確性檢查全數通過**（階級增量不重複套用／無 NaN／所有 weapon・ability id 存在／`bondAdvancedBy` 加入判定正確／`activeBonds` 向後相容／調色盤色鍵齊全／三態帶幾何無 off-by-one／`goldStr` 匯入匯出完整／未動 gen 檔／無雙圖示）。確認 8 項皆 **low**，其中 4 項已就地修掉：

- **(1.4 漏網) `hub.js` 懸賞委託領取按鈕**：`'領 +' + q.reward` → `'領 ' + goldStr(q.reward)`（與同面板主線任務按鈕一致加上 🪙）。
- **(效能) 3 選一羈絆提示快取**：`bondHintsFor` 原本每 render frame 對 3 卡 ×12 羈絆重算（選擇期間世界已暫停、build 不變）→ 改於 `openChoice` 算一次存入 `this.choice.bondHints`，`drawChoice` 讀快取。
- **(一致性) build 面板羈絆標頭**：標頭計數原讀節流的 `activeBonds`，與逐列即時 `bondProgress` 在面板開啟期間可不一致 → 改為兩者同源（`pgList` 即時計算、共用於標頭與格線）。
- **(死碼) `hub.js`** 移除未使用的 `bondProgress` 匯入。
- 不需改（皆設計使然且已記錄）：`bond_collector` 因裝備非升級池來源故 3 選一不顯示其卡片提示（羈絆本身仍正常由 `run.equipment` 觸發）；collector 首階改 1 件裝備觸發＝刻意的 TFT 階級化（每階數值已減半）；co-op 羈絆為房主端套用（與改版前一致、非本次回歸，避免 guest 重複套用）。
- 驗證：reload 後 `s.choice.bondHints` 已快取、仍正確標出可推進卡；build 面板標頭「羈絆 3/12」與格線金色 ✓ 數一致；全程零錯誤。

---

## 批次 B8c — 羈絆圖示徽章＋hover＋局內側欄（8.2 延伸）＋ B4-eq（4.17 裝備 BUG）

依玩家回饋，羈絆在 Tab／結算改用「圖示徽章＋hover 看效果」，並於遊玩中於左側任務欄下方新增即時羈絆區；同時清掉 4.17 裝備更換舊效果未清除的真 bug。

- **羈絆徽章元件（`run.js drawBondBadge`）**：以 `tag` 字（焰雷血暴環速武識守脆藏導）配色塊作為羈絆圖示——金=已達成（角落帶當前階數）、藍=接近、灰=未達成。Tab build 面板、結算頁、局內側欄共用同一視覺。
- **hover 詳情（`run.js drawBondTooltip`，併入 `drawTooltip` 的 `kind:'bond'` 分支）**：滑鼠移到任一羈絆徽章 → 浮出 tooltip：羈絆名＋`第 N / M 階`、`需求`、**每一階的門檻與效果**（已達成的階亮、未達成灰）。
- **Tab build 面板**：底部羈絆區**只列「已達成」**的羈絆（徽章＋名稱＋`N/M階`，依玩家回饋從原本列全部 12 個改為僅達成；標頭仍顯示 `已達成/總數` 並提示「完整圖鑑見城鎮個人小屋」），每格註冊進 `buildIcons`（`kind:'bond'`）沿用 hover→tooltip。無達成時顯示提示句。
- **結算頁**：原本單行會截斷的「羈絆 · 名稱（第N階）…」改為 **一排徽章**（達成的羈絆），註冊進 `resultIcons` 供 hover；金額沿用 `goldStr`（「帶回 🪙X」）。
- **局內左側羈絆區（`run.js drawBondTracker`，新）**：任務追蹤框下方（無任務時退回原位）顯示**已達成（金徽章＋`第N階`）＋快達成（藍徽章＋「快達成」，離下一階只差 1 件需求者）**，達成在前排序、最多 6 列、超出顯「＋N 個…」；標頭「羈絆 · {已達成數}」。與三選一/暫停/大地圖/商店等狀態互斥隱藏；`draw()` 於 `drawQuestTracker()` 後呼叫。
- **4.17 裝備更換舊效果未清除（BUG）（`content/equipment.js equipItem`）**：護甲／飾品換裝時原本只套新裝 `apply()`、未還原舊裝貢獻 → 每次換裝堆疊殘留數值。修正為**套新裝前先依 `run.equipDelta[slot]` 還原該欄舊貢獻**（僅本地權威玩家 `recordRun=true`；co-op 遠端的欄位屬房主共享 run 故不動），並在 maxHp 下降型換裝後 clamp `hp`。
- 驗證（reload 後實機）：4.17 動態 import 測試——裝皮甲（maxHp 132/減傷 2）後換法師袍 → maxHp **99**、減傷 **0**、傷害 ×1.2（修正前會殘留為 117／減傷 2）；Tab 面板 12 徽章＋hover 烈焰之心顯示雙階效果（第1階✓）；局內左側「羈絆 · 5」框 5 列徽章＋階數正確；結算頁 5 徽章＋hover 雷霆網絡顯示雙階✓；console 全程零錯誤。

---

## 批次 B8d — 羈絆顯示回饋修正 ＋ HUD 生命列重整（4.1）＋ ESC 置中（1.7）

依玩家回饋再修一輪 UI：

- **TAB build 面板（修重疊＋只列已達成）**：原本徽章列起點過高、與「羈絆」標頭重疊 → 格線下移（`gy = bandTop+36*S`），不再重疊；移除標頭「· 滑鼠看效果 · 完整圖鑑見城鎮個人小屋」贅字（標頭只留「羈絆 X/12」）；TAB **只列已達成**羈絆（先前列全部 12 個），無達成顯示提示句。
- **局內左側羈絆欄改 TFT 式（`run.js drawBondTracker` 重寫）**：每列改為**六角徽章**，依階級套 TFT 銅/銀/金配色（第1階銅、第2階銀、第3階金；快達成＝灰藍），徽章內為羈絆 `tag` 字，右側顯示 `階/總階` 或「快達成」。顯示**已達成＋快達成**（離下一階只差 1 件需求）、達成在前排序、最多 7 列。（六角形以 `ctxRaw()` path 繪製，run.js 新增 `ctxRaw` import。）
- **HUD 左上生命列重整（4.1）（`hud.js drawHud`）**：生命／經驗／衝刺收進**單一圓角面板**；三個左側圖示大小一致（`iconSz`，愛心／經驗寶石／**衝刺改用 `ability_dash` 圖示**取代「衝刺」文字）；三條量條**最長長度一致**（共用 `vbarW`、同一起點 `bx`）；等級整合進經驗條右端（`Lv N`），衝刺就緒時量條脈動＋「衝刺就緒」；狀態 chips 移到面板下方避免重疊。
- **Hub ESC 選單垂直置中（1.7）（`hub.js escMenuLayout`）**：原本只置中按鈕群、標題「選 單」浮在其上使整體偏高 → 改為置中「標題＋按鈕」整組（`y0 = H/2 − (titleH+total)/2 + titleH`）。
- 驗證（reload 後 `/__shot` 實機）：HUD 面板三圖示等大、三量條等長、衝刺為圖示、`24/114` 置中於血條、`Lv 2`／`衝刺就緒` 就位；TFT 側欄烈焰之心為銅色六角「1/2」、快達成者灰藍六角；TAB 標頭無贅字且徽章不重疊、僅列已達成；ESC 選單標題＋7 按鈕整組置中；300 frame 模擬零 NaN、boot／console 全程零錯誤。
