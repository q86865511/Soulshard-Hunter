# Round 26 — 美術優化批次 1:戰鬥內場景合成層 + 10 生態 decal/裝飾量產

> 視覺審查結論:個體 sprite 品質足夠,但「場景層」(光影 / 地面豐富度 / 玩家辨識度)拖垮整體觀感。
> 本批次是引擎接縫部分——純 render-only、協定不變(不動 `src/game/net/` 與 `scenes/coop.js` 網路邏輯)。
> 所有數值旋鈕進 `BALANCE`;發光表與 decal 池屬「資料」,各自成檔以便之後 workflow 產出自我登記。

## 1. 局部光暈通道(`src/game/lights.js` + `world.draw`)

- 新檔 `lights.js` export `LIGHT_BY_SPRITE`:sprite 名 → `{ r, color, a, oy, flicker, speed }`。掛在 torch 與各生態的火盆 / 水晶 / 燈類 decor(清單見文末),非發光 decor 不列 → 不發光。
- `World.drawSceneLights(cb)`:在 decor 迴圈之後、actors 之前,對可視範圍內的發光 decor 疊加 `glowWorldCached` 貼地光池,`this.time`+`d.phase` 驅動 sin 閃爍(alpha 落在 `[a·(1-flicker), a]`)。
- **效能**:`renderer.js` 新增 `glowWorldCached`——每個 `(color, r)` 徑向漸層烘一次進 offscreen canvas 快取,之後 additive blit(縮放隨 zoom)。每幀可視光源約 5–30 個共用少數 `(color,r)` 對。

## 2. 玩家辨識度(`world.js` + `renderer.js`)

- **常駐冷白光圈**:本地玩家(`this.player`)腳下 `glowWorldCached` 冷白光池(`#cfeaff`,r=`SCENE_FX.PLAYER_RING_R`、alpha=`PLAYER_RING_A`),畫在 actors 之前,與敵方暖色調區隔。
- **被包覆高亮**:`drawSurroundBeacon()` 每幀數玩家半徑 `SURROUND_R` 內敵人數,≥`SURROUND_N` 時在全部 drawables+particles 之後,用 `renderer.js` 新增的 `drawSpriteTint`(複用既有 hit-flash tint 快取)把玩家當前幀以白色剪影再畫一次,alpha 隨 `this.time` 脈動 `SURROUND_A_MIN..MAX`。**僅 `this.player`**——co-op 遠端 avatar 不做(guest `coop.js` 自有 render,不走 `world.draw`)。

## 3. 牆腳 AO(`world.js drawTiles`)

- 程式內 `defineSprite('fx_wallao', 16, 6, …)`(一次烘焙,上深下透明,alpha=`SCENE_FX.WALL_AO_ALPHA`)。
- 南側為 FLOOR 的牆(`southFloor`),在其南側地板 tile 疊 AO 接地陰影。run(skirt 分支)與 town(faceSp 分支)共用同一條路——`drawTiles` 由 host/single 的 `draw()` 與 guest 的 `coop.js` 同時呼叫,兩者都受惠。

## 4. 地面重製:全生態去橫紋 + verdant / crypt 值階調修(`src/art/biomes.js`)

BIOMES hex 調修(wall/walltop 未動;minimap 用固定色不受影響):

| 生態 | floor 改前→改後 | floor2 改前→改後 |
|---|---|---|
| crypt | `#24262f` → `#282b37` | `#2c2f3b` → `#353a4d`(對比略增,現況近黑無變化) |
| verdant | `#26361f` → `#33482a` | `#2f4326` → `#3d5533`(明度略提,草地不再近黑) |

**截圖驗收後的三輪追修**(Fable 逐輪實機截圖退件):

1. **全生態地板去週期橫紋**:plain floor 分支原本「頂部亮 hline + 16px 垂直 gradV + 底部暗 hline」每 tile 固定位置的水平元素,平鋪成規律橫紋(提亮後極醒目)。新增 `plainFloor()` helper,**全 10 生態** v0/v1 改為平色基底 + 3 道 seeded 多色 speckle(每 variant 不同種子),生態特色紋樣離開 tile 邊緣。
2. **verdant 值階重整**:花田(v2)基底 `lighten()` 泛白讀成霧塊 → 改 `mix(b.floor, P.leaf, 0.3)` 飽和綠;v1 變體磚由 floor2 全值(比地板亮 19 階,散布單磚讀成浮方塊)→ `mix(floor, floor2, 0.45)`;牆改「樹籬量體」畫法且體色壓到明確暗於地板(烘焙均值 rgb(46,66,38) vs 地板 rgb(53,74,43));walltop skirt 移除亮綠實心列(平鋪成綠條)改暗色垂葉 fringe。
3. **亮色生態光暈調性**:`lights.js` verdant 花/螢火蟲由白色 `P.holy`(在亮草地上讀成霧)改暖金 `P.gold`、r/alpha 調低——規則:亮生態的光池要暖而淡。

## 5. 密度旋鈕進 BALANCE + decal 通道 + 視口剔除

- **密度旋鈕**:`maps.js` `generateWorld` 的 34 / 9 / 14 移進 `BALANCE.DECOR`,經截圖驗收迭代後定為 `{ SINGLES:75, CLUSTERS:20, WALL:24, DECALS:360 }`(首版 55/14/20/90 實測可視範圍僅 ~8 decal、1 棵樹,不足以成立「森林感」;×k 不變)。
- **decal 通道**:新檔 `src/art/biome_decals.js` export `DECAL_SETS`(十生態池)+ `registerDecals(biomeId, names)`(append 去重,供 gen art 自我登記)。`generateWorld` **在最末尾**(所有既有 rng 消耗之後)依 `DECOR.DECALS × k` 從 `DECAL_SETS[biome.id]` 抽樣產生 `map.decals`(僅 FLOOR tile);**池為空則完全不消耗 rng → 佈局 rng 流不變、零行為變化**。`World.decals` + `drawDecals(cb)` 在 `drawTiles` 後、hazards 前繪製。
- **視口剔除**:`World._cullBounds()` 算相機可視 world-rect(+邊界含高瘦 prop);decor、decals、光暈迴圈都剔除,密度提升後不再全圖迭代。

## 6. 批次 1b — Workflow 量產:10 生態地面 decal + 裝飾(`src/art/gen/art_decals_*.js`)

- 多代理 Workflow(sonnet 生成 → Fable 逐包審查,未過審退回重生成一次)產出 **10 包共 125 sprites**:每生態 7-9 個地面 decal(`decal_<biome>_*`,6-14×4-10、低對比、無 outline、≤2 個微光、避開拾取物的亮綠/teal)+ 3-5 個站立裝飾(`bdx_<biome>_*`,沿用 `bd_*` 慣例);verdant 重點補樹/蕨/灌木變體。審查者實修:crypt 錨點 `[0.5,0.5]`→`'center'`(sprites.js 的陣列 anchor 是像素座標)、frost 兩處出界/接地修正。
- 整併:`tools/integrate.mjs` 的 gen-art header 新增 `registerDecals` / `DECOR_SETS` / `DECOR_CLUSTERS` import——decal pack 檔尾自我登記進 `DECAL_SETS`(decal 池)與 `DECOR_SETS`/`DECOR_CLUSTERS`(裝飾池),重跑整併不需手動接線。workflow 來源(scratchpad artcode)與 gen 檔一致,re-integrate 安全。
- 不進 registry → `reg()` 計數不變,`REG_BASELINE` 不動。

## 掛上光暈的 decor 清單

torch、dec_crystal、dec_ice、dec_lava、dec_voidcrystal、bd_crypt_candles、bd_cav_cluster、bd_cav_mushroom、bd_frost_pillar、bd_frost_spikes、bd_inf_brazier、bd_inf_obsidian、bd_void_monolith、bd_void_rune、bd_void_shards、bd_verdant_flowers、bd_verdant_fireflies、bd_desert_pylon、bd_swamp_bubbles、bd_swamp_lily、bd_abyss_vent、bd_abyss_anglerfish、bd_abyss_kelp、bd_cel_star、bd_cel_crystal、bd_cel_pillar。(樹 / 仙人掌 / 柳 / 珊瑚等非發光 emblem 刻意不掛。)

## 驗證

- **Fable 實機截圖驗收**(preview + `__DBG` 手動 pump + `POST /__shot`):verdant 2min(三輪退件後通過:無橫紋/無浮方塊/森林感成立/玩家白圈清晰)、crypt 1min 與 5min 小王戰(火把光池、牆腳 AO、Boss 與怪群清晰)、hub 完整性(佈局不變,營火因 light 通道自然獲得光池)。
- **效能**:同場景暖機三次取最小,render 3.67ms/幀 vs 改前基準 3.75ms/幀——無劣化(641 decals + 光暈 + AO 在視口剔除下攤平)。
- **前端 smoke**:整併後 `cd test && npm run test:frontend` **59/59 通過**(含 coop 自測、registry 計數、無 uncaught error)。
- 檔案清單:`balance.js`、`biomes.js`、`maps.js`、`world.js`、`renderer.js`、`tools/integrate.mjs`(改)+ `lights.js`、`biome_decals.js`、`art/gen/art_decals_*.js` ×10(新)。

## 遺留(批次 2/3 待辦)

- 其餘 8 生態的截圖逐一驗收(plainFloor 已全生態套用,但 frost/desert/celestial 等亮色生態的牆/光暈值階可能需要 verdant 同款調修)。
- 城鎮地面去噪 + 光池氛圍(批次 2);標題文字重疊、右側怪物接地陰影、`title.js` 負半徑防禦(批次 3)。
