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
- **驗證**（preview 驅動，零 console error / `__GAME_ERROR__` null）：slots 畫面截圖無重疊（493×374 小視窗）；衣帽間列身點擊（先前必拋處）`threw:null`；4000 殺統計 nova 引爆率 **24.4%**（目標 25%）；speed=200 玩家逃跑下範圍內金幣 120 幀內收斂吸附（finalDist 0.4）；keys+1 → 橫幅正確、keys−1 不觸發；離場確認框／贊助者三選一／結算左欄截圖確認新版面。
