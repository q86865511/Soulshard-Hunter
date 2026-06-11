# ROUND 19 — 末日遺跡城鎮改版（多地圖 × 殘破風格 × 互動升級）

玩家回報 R18 城鎮 6 項改造需求：① 末日/殘破/遺跡風格 ② 城鎮拆成多張地圖（建築互動進入室內）③ 減少方正格局 ④ 大量遺跡環境裝飾 ⑤ 出擊傳送門等互動體變大、置中、對稱 ⑥ 整體美化。
規格凍結於 [`docs/ROUND19_SPEC.md`](../ROUND19_SPEC.md)；以單一 Workflow 編排（10 agents）：**Fable ×4 美術包 ∥ Opus world.js 重寫 → Opus hub.js 多地圖 → Sonnet 接線＋sprite 稽核 → Opus 對抗驗證 ×2 ＋修復**，最後由主迴圈（Fable）實機美化驗證。全前端 additive；`server/` 未動；單人/co-op 協定 byte 不變（城鎮為離線場景）；無存檔 schema 變更。

## 內容

### 美術（4 個新檔，46 sprites，全部 main.js 接線）
- `src/art/town_ruin_tiles.js`（17）：戶外遺跡地表 `ruin_grass/grass2/ashgrass/path/path2/plaza/plaza2` ＋ 邊界 `ruin_wallline(_top)`（崩塌壁壘＋枯樹剪影、橫向無縫）；室內 `int_wood(2)/int_stone(2)/int_carpet(2)` ＋ `int_wall(_top)`（暗磚體、餘燼暖光頂緣）。
- `src/art/town_ruin_facades.js`（6）：72×72 殘破建築門面 `ruin_fc_church/guild/hall/smith/wardrobe/house` —— 底緣置中大門透出暖光（可進入的視覺語言）；教堂斷塔尖＋碎魂青玫瑰窗、公會裂紋徽記＋告示燈籠、殿堂傾倒柱＋金飾、鐵匠鋪活餘燼煙囪、衣帽店破條紋雨棚＋櫥窗人偶剪影、小屋最完好的溫暖小宅。
- `src/art/town_ruin_decor.js`（18）：斷柱/柱墩/破拱門/瓦礫×2/巨石×2/裂紋女神像/枯樹×2/破車/墓碑/破籬笆＋動畫 殘旗/營火/魂晶/裂隙磚/斷石橋。
- `src/art/town_ruin_stations.js`（5）：**`portal_grand` 48×64 三幀大型出擊傳送門**（雙殘柱＋青紫漩渦＋符文＋kira）、魂火路燈、殘井、破噴泉、火炬柱。

### `world.js`
- **`makeCamp()` 重寫**：64×48 全 WALL 起手、以 9 街區錨點橢圓 blob ＋蜿蜒抖動廊道**有機雕刻**（邊界不再是矩形）；街區散落不成格；裂紋廣場圓盤；**魂裂隙**（VOID 裂縫＋`ruin_rift` 魂光＋3 格斷石橋）取代小溪；遺跡裝飾鋪滿（決定性灑點迴圈補密度至 ~200，porch/廣場中心/出生點/裂隙保留區與 8 鄰最小間距防堆疊）；**回傳契約與 9 個 room id 不變**；步驟 6 連通性保證（BFS 補刻廊道、跨裂隙走橋柱）。
- **新增 `makeInterior(id)`**：6 張非矩形室內圖（教堂十字中殿 20×18、公會 L 形 22×16、鐵匠鋪鍛造凹間 18×14、衣帽店展示灣 18×14、殿堂長廊＋雙壁龕 24×14、小屋切角 16×12）；南側 2 格門洞＝出口；`rooms={[id], exit}` 同形錨點；對稱擺設重用既有 town_* 室內 sprite ＋火炬柱側翼；station/exit 保留格不落裝飾。

### `hub.js`
- **多地圖系統**：`this.area`＋`this.maps` 惰性快取＋`loadArea()`（rng 地圖只生成一次，重訪不跳動）；城鎮 6 個門站台（E→進入室內）＋廣場中央 `portal_grand` 出擊站台；室內＝面板站台＋離開門；進出落點互相對應（porch ↔ 門洞內側）。
- NPC 分流：看守 NPC（莉雅/鐵爺/小鈴/戈登/薇拉/奧德）搬進各自室內；蕾恩/小米（廣場）、老潘（市集）、賈克（花園）留在戶外。快捷鍵 1/2/3/4/空白 直接 `openPanel`（任何區域可用）。
- 氛圍：城鎮飄灰燼＋餘燼粒子（取代櫻花）、花園魂火螢；室內暖塵埃。標題依區域（魂晶遺鎮/建築名）；頁腳提示更新。
- `injectRoomDecor()` 僅在個人小屋室內生效、錨點改至房中段（row 5.5）＋ FLOOR 防護 → 10 件付費裝飾全數正確入房。

## 驗證
- Workflow 內：每檔 ESM `node --check`；world.js 幾何 harness（300 次外圖：9 錨點皆 FLOOR＋BFS 互通；600 次內圖：station/exit 連通）；Sonnet sprite 稽核 **0 缺失 / 0 撞名**；Opus 對抗審查 2 項確認問題已修（injectRoomDecor FLOOR 防護、外圖裝飾密度補至規格 180–240）。
- 實機（Fable 美化驗證）：開機零錯誤；鳥瞰確認非矩形有機邊界；6 間室內逐間截圖（修正：去除鎮店道具重複定義、室內擺設加密對稱化、`int_stone` 去 8px 條紋、火炬柱側翼對稱欄位）；門進出往返落點皆 FLOOR；8 面板全開；教學重播、寵物跨地圖跟隨、9 件小屋裝飾注入正常；`__DBG.coopRoundTrip()` 通過；出擊 run smoke 10 秒零錯誤；console 無 warning。
