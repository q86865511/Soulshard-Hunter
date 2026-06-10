# Round 17 — UX 修正 + 造型商店重構 + 隱藏房專屬內容 + 經濟再平衡

> 規格：[`docs/ROUND17_SPEC.md`](../ROUND17_SPEC.md)。純前端回合 — `server/` 零變更（`server/test` 不在本回合範圍）。
> 批次依依賴排序 B0–B11，每批完成後追加本檔條目（範圍／條目／驗證）。

## 批次 B0 — 文件腳手架
- **範圍**：`docs/ROUND17_SPEC.md`（新）、本檔骨架。
- **條目**：23 項玩家回饋整理為 11 章規格；4 項玩家定案決策（魂爆機率 25/35/45%、無盡逐關解鎖、隱藏房全新專屬內容、混合制閘門）；3 個探索期驗證根因記入規格（hub.js:714 作用域 `S`、run.js:1034 通關 E 直接離場、goldStr 🪙 emoji 缺字）。
- **驗證**：n/a（純文件）。

## 批次 B1 — 快速修正批（1.1–1.9）
- **範圍**：`scenes/title.js`、`scenes/run.js`、`scenes/hub.js`、`pickup.js`、`content/abilities.js`、`balance.js`。
- **條目**：
  - **1.1 存檔畫面重疊**：slots 子狀態改畫縮小 logo（30S @0.085H＋副標 +22S）；「選擇存檔」固定副標下 +52S；`layoutSlots()` 卡片自 +76S 起、高度夾擠（<78S）時省略第三行統計（`title.js`）。
  - **1.2 衣帽間換裝 ReferenceError 熱修**：`updateWardrobe()` 補 `const S = L.f.S;` — 點列身不再拋錯（B3 重構時整段重寫）。
  - **1.3 磁吸**：範圍內吸附速度 `max(玩家speed×PICKUP_PULL_FACTOR+PICKUP_PULL_FLAT, 240−d*1.6)`（1.5／60，新 BALANCE knobs）；磁鐵道具 `max(420, ps×2)`；step 夾擠保留（`pickup.js`）。
  - **1.4 鑰匙橫幅**：`world.keys` 遞增偵測 → 「🔑 獲得鑰匙！可開啟封鎖的寶庫寶箱」橫幅 3.2s＋音效；遞減（開鎖）不觸發（`run.js update()`）。
  - **1.5 贊助者卡間距**：卡高 `cw×1.46→min(cw×1.62, 0.74H)`、肖像 46S→50S、稱號/名字/頭銜/敘述 offsets +44/+64/+84/+106S（原 +32/+50/+67/+86）。
  - **1.6 結算左欄等距**：節奏常數 `sz=26S, gap=6S, SEC_GAP=16S, HEAD_DROP=13S`，每節「標題→HEAD_DROP→圖示列→SEC_GAP」；裝備改獨立列（原本擠在標籤旁 +44S）；羈絆徽章移到標題下方；面板高 0.58H/404S→0.62H/430S。
  - **1.7 通關後離場確認**：通關後範圍外按 E 改開 `leaveConfirm` 確認框（確定離場/繼續戰鬥；E/Enter 確定、Esc/點外取消）；co-op 維持即時離場（共享世界不可凍結）；查明魂晶礦脈非商店 → 保留所有地圖互動物。
  - **1.8 隱藏成就**：完成前後皆紫羅蘭 `#d36bff` 邊框＋`★隱藏` 徽章＋紫星號；FILTERS 增第 4 頁籤「隱藏」（70S 寬 ×4）。
  - **1.9 魂爆機率化**：`BALANCE.NOVA_CHANCE=[0.25,0.35,0.45]` 按等級取用；引爆半徑 22+lv*6→26+lv*8、傷害 12+lv*7→30+lv*16（補償）；desc 同步。

## 批次 B2 — 金幣圖示系統（2.1）
- **範圍**：新 `src/game/ui/gold.js`、`engine/renderer.js`、`scenes/title.js`、`scenes/hub.js`、`content/guild.js`、`content/patchnotes.js`。
- **條目**：
  - 根因：`goldStr()` 的 🪙（U+1FA99）不在 CJK 字型堆疊中 → 全 UI 顯示 □。
  - 新 **`goldLabel(x,y,n,{size,align,baseline,color,weight,prefix}) `**：畫像素 `coin` sprite＋數字（支援 prefix、置中/右對齊預量寬、alphabetic/middle 基線），回傳總寬。
  - **`goldStr()` 改純文字「N 金幣」**（句子安全）：ask() 內文、feedback、銀行明細、結算「帶回 N 金幣」全自動通順。
  - 純繪製處改 `goldLabel`：確認框持有列、天賦節點價格、鍛造「強化等級」鈕＋特效價、設施卡價格、銀行借款鈕、公會領取鈕（主線＋支線）、衣帽間價格鈕（特賣底價改純數字）、出擊鎖定卡 🔒 價格。
  - title 兩處「金庫 🪙N」→「金庫 N」（金庫已是標籤，免重複「金幣」）；guild.js 六個 rank 獎勵 label「＋🪙N」→「＋N 金幣」；patchnotes 移除 🪙。
- **驗證**：preview 截圖確認框／天賦／鍛造／設施／銀行全部出現像素金幣、零 □；`grep 🪙` 僅剩註解；零 console error。

## 批次 B3 — 衣帽間重構＋造型商店改版（3.1–3.3）
- **範圍**：`content/skinshop.js`（重寫）、`scenes/hub.js`、`content/characters.js`。
- **條目**：
  - **3.1 分層入口**：`wardrobeView: null|'mine'|'shop'` — 入口兩大門（👤 我的造型／🛍 造型商店）；我的造型 → 英雄格（含 ◀ 返回）→ 單英雄**僅已擁有**清單（點列＝套用，`pickSkin` 改純裝備）；Esc 逐層返回（updatePanel 分層處理）；衣帽間頁籤移除（tabRects 還原雙頁籤面板專用）。
  - **3.2 造型商店**：池 = 已解鎖角色 × 全 SKINS 的 **(char,skin) 配對**（排除已擁有與 `exclusive`）；8 格（2×4 卡：造型 sprite、名稱、角色·階級、價格）；每格 **1% 隱藏池機率**（普通池耗盡時 10% 安慰機率）；30 分免費進貨＋重 roll 200 金（原 70）；價格 `SKIN_TIER_PRICE={normal:1000, premium:3000}`（原 450/900），隱藏款 `hiddenSkinPrice(id)`＝id 雜湊 → **20000–50000**（5000 級距、跨存檔穩定）；特賣每週 2 普通＋1 豪華 **×0.8**，**隱藏永不打折**（skinPrice 直接短路）。
  - **3.3 換裝正修**：列命中矩形以重構根除（搭配 B1 熱修）；新增 `ownsSkin(meta,cid,skinId)`（characters.js）統一擁有判定，支援 B6 `exclusive+unlockFlag` 帳號全英雄共用造型。
  - **存檔遷移**：`guardShape()` — 舊字串陣列 offers 載入即清空重 roll（不升 SAVE_VERSION）；無效配對過濾。
  - 順手修：hub.js 缺 `uiClipRound` import（隱藏卡頂部金條觸發 ReferenceError — 僅在隱藏款上架時才會炸，靠 1% 強制測試抓到）。
- **驗證**（preview 全流程模擬點擊）：入口→我的造型→英雄→點列身套用原色（舊崩潰點，零錯誤）→返回×2→商店→購買（確認框→金幣 -800 特賣價、`hunter:bone` 入 ownedSkins）；舊 offers 形狀遷移自動重 roll；`hiddenSkinPrice` 確定性（golem=45000 穩定）；stub Math.random 強制 1% 路徑 → 4 隱藏款金框＋25k/40k/45k/50k 價位、池耗盡回落普通款；倒數計時移入面板內。

## 批次 B4 — 出擊面板 3×3＋無盡末階（4.1–4.2）
- **範圍**：`scenes/hub.js`（sortieLayout／updateSortie／drawSortie）。
- **條目**：
  - **4.1 角色卡改版**：`perPage 6→9`（3×3）；移除底部英雄介紹塊（▸ 名稱／起始武器／敘述）；卡片自帶資訊 — 左 36%＝sprite＋名稱＋狀態（已選／🔒金幣或成就解鎖），右 64%＝「起始武器：…」（金）＋效果敘述 ≤2 行（CJK 逐字斷行＋第二行省略號裁切）；卡高 `max(56S, min(86S, 可用高/3−8S))`。
  - **4.2 無盡＝難度末階**：移除獨立 `modeBtn`／`selMode`（原全域 `META.stats.clears>0` 解鎖）；新 `biomeCleared(bid)`＝`META.levels.diff[bid] ≥ 1`（**逐關**，玩家定案）；步進域 `0(劇情)…maxDiff(+1 無盡，僅已通關生態)`；選中末階顯示「♾ 無盡挑戰」（金）＋無盡說明、最高難度時提示「再按＋進入無盡」；出擊時 `mode='endless'`、difficulty＝該關最高解鎖難度；切換生態重設 selDiff=1。
- **驗證**（preview）：3×3 兩頁渲染正常；未通關生態 selDiff=99 → 夾至 1（無無盡階）、已通關生態 → 夾至 maxDiff+1 並顯示 ♾ 金標；模擬點擊出擊 → `run.mode='endless'`、`difficulty=3`（該關最高）、場景切至 run（rAF 節流下需 pump 一幀觀察 — 既有 gotcha）；`grep selMode/modeBtn` 歸零。
- **驗證**（preview 驅動，零 console error / `__GAME_ERROR__` null）：slots 畫面截圖無重疊（493×374 小視窗）；衣帽間列身點擊（先前必拋處）`threw:null`；4000 殺統計 nova 引爆率 **24.4%**（目標 25%）；speed=200 玩家逃跑下範圍內金幣 120 幀內收斂吸附（finalDist 0.4）；keys+1 → 橫幅正確、keys−1 不觸發；離場確認框／贊助者三選一／結算左欄截圖確認新版面。
