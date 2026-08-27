# Round 28 — 美術輪(進行中)

> 權威規格:`docs/art/ART_SPEC.md`(ART_SPEC v1)。本輪所有批次以該檔為準,
> 實作與規格衝突時改實作;規格要改先過架構師。

## W0 基礎 token(零行為變更)

後續 UI codemod 與戰鬥分層批次共同依賴的地基。本批**只加不改**:新增的東西全部沒有消費者,
既有渲染路徑的輸出與 430443c 相同。

### 1. UI token 擴充(`src/engine/renderer.js` `UI`)

- 補 `WEIGHT_TITLE:'900'` / `WEIGHT_HEADING:'800'` / `WEIGHT_BODY:'600'`
  ——ART_SPEC 4.1 只允許這三檔權重,先給名字,W1 codemod 才換呼叫端。
- `GAP_SM/MD/LG` 由 6/10/16 改為 ART_SPEC 4.2 的 8 px grid **8/16/24**。
  改值安全的理由:全 repo 對這三個 key **零消費者**(`grep -rn "UI\.GAP_"` 僅命中定義處),
  所以改的是「未來的基準」而不是任何現有像素。
- `FONT_TITLE/HEADING/BODY` 本來就是 22/16/13,與規格一致,未動。
- **`FONT_CAPTION` 維持 10,規格值 10.5 暫放 `FONT_CAPTION_SPEC`。**
  規格 4.1 要求最小字級 10.5,但 `FONT_CAPTION` 現在有一個活消費者
  (`src/game/scenes/hub/render.js:194` 的面板副標),而該檔不在本批白名單、本批又是
  零行為變更批。W1 UI codemod 遷移該呼叫端時,把 `FONT_CAPTION` 改成 10.5 並刪掉這組配對。

### 2. 共用 UI helper(同檔,皆無呼叫端)

- `uiButton(x,y,w,h,label,opts)` — ART_SPEC 4.2 的唯一按鈕原語,內建 hover/focus/disabled
  三態,回傳含 `.hover`/`.disabled` 的 rect 供命中測試。視覺語彙抄自 `hub/panels.js:135`
  的銀行按鈕(圓角 8·框線 2·hover 換底色),所以 W1 遷移後外觀不變。
  hover 可由呼叫端給 `hover`,或傳 `mx/my` 讓 helper 自己命中測試;focus 環畫在框外,
  避免與 hover 底色互吃。
- `uiClip1(text,maxW,size,weight)` / `uiWrapText(text,maxW,size,weight)` — 純測量函式
  (回傳字串/行陣列,不畫),行為對齊樹上兩份手寫複本
  (`hub/render_personal.js:230 clip1()`、`run/overlays.js:222 wrapText()`),
  兩份複本本批**未動**。`uiWrapText` 另外支援顯式 `\n` 斷行;不含換行的字串與舊版逐字貪婪換行等價。

### 3. glow 亮度預算旋鈕(同檔)

- 新增模組級 `GLOW_CFG = { scale:1, decoCap:1, budget:Infinity }` + `setGlowCfg()`/`glowCfg()`。
  **預設即 identity**:scale 1、decoCap 1、budget 無限 → `glowWorld`/`glowWorldCached`
  的輸出與本批之前逐像素相同。
- 兩支 glow 各多一個可選參數 `{deco}`(目前沒有呼叫端傳):標記 ART_SPEC 2.2 要壓在 0.35 的
  「裝飾通道」;預警/警示 glow 不傳,永遠不受 cap。
- 每幀呼叫計數:`glowFrameCount()` / `glowOverBudget()` / `glowFrameReset()`;
  reset 掛在 `clear()`(`main.js:507` 每幀唯一呼叫點)。**本批只計數,不降級**——
  ART_SPEC 2.2 的「超過軟上限 48 次就把裝飾 glow 降級」留給後續批次接。

### 4. `BALANCE.ARTV`(`src/game/balance.js`)

僅定義、無消費者:`BEAM_FAM_BOSS`(紅橙 `#ff5a3c`/`#ff8a50`)、`BEAM_FAM_EVENT`
(琥珀 `#ffc23c`/`#ffd75a`)、`BOSS_RING_A:0.18`、`DECO_PARTICLE_ALPHA:0.5`、
`GLOW_DECO_ALPHA:0.35`。對應 ART_SPEC 第 3 節的 beam 所有權色族與 2.2/2.3 的亮度上限。

### 驗證

- `cd test && npm run test:frontend`(Playwright headless Chromium over `tools/serve.mjs`)全過
  ——涵蓋開機、`__DBG.reg()` 計數、nav/render、劇情暫停、圖鑑/目標層、三支 co-op 離線自測。
- 註冊表計數未動,`REG_BASELINE` 不需更新。
- 改動檔:`src/engine/renderer.js`、`src/game/balance.js`、本檔。

## W1-B 戰鬥分層與亮度預算(ART-02)

- `world.js draw()` 重排為 ART_SPEC 2.1 八層:pickups 脫離 actor y-sort 先於 actors;武器持續型
  VFX(beam/aura/turret 的 `inst.def.draw`)從 player draw 尾端移到 projectiles 層之後,不再被
  y 較大的敵人蓋掉。
- beam 所有權色族(零協定變更,以 raw hex 當簽名):`beamFamily()`/`BEAM_STYLE` 查表——
  Boss 紅橙 5px、事件琥珀 4px、玩家冷色 3px;底/芯對調為「族色底線+白熱芯」。
  呼叫端換色:boss_moves 5 處、run/events 4 處、`w_lightning`→P.ice、
  `gen_weapons_b.js` g_laserbeam 紅→冷青(**gen 檔含 HAND-EDIT 註記,re-integration 前需重套**)。
- Boss 可讀性:暗紅橙地面環(world 第 2 層 `drawBossRings`)+1px 暖色描邊(enemy.js,
  tintedFrame 快取)。
- 裝飾粒子 alpha/飽和上限+`warn` 豁免旗標(particles.js);glow 預算啟用
  (run 進場 `setGlowCfg({decoCap,budget:48})`,超算時裝飾 glow 降級 cached 低半徑)。
- 驗證:smoke 59/59;coopRoundTrip/coopSilenceTest/coopBossSyncTest 全過;73 敵壓力景
  glowOverBudget 實際觸發;關粒子後 beam/Boss 環/描邊/拾取全保留。
  證據:`docs/reviews/art-improve-2026-08/w1b-after/`。

## W1-B2 co-op guest 渲染對齊

- `scenes/coop.js drawField()` 對齊八層與 beam 色族:pickups 先於 actors、beam 走
  `BEAM_STYLE[beamFamily()]`+`world.drawBeamCues`、boss 經 `world.drawBossRings(cb, guest敵人)`。
- 複用而非複製:`BEAM_STYLE` export、`drawBossRings` 加來源參數(預設原行為);guest 用真
  Enemy 實例故 boss 描邊自動生效。零協定變更。
- 驗證:三支 co-op 自測全過(核心路徑);beam 族別分類程式化驗證;smoke 59/59。

## W1-C1 UI 字級/權重 token 遷移(ART-03,run+hub 兩路)

- `FONT_CAPTION` 定案 10.5(刪 `FONT_CAPTION_SPEC`),全案字級下限 10.5;權重收斂 900/800/600。
- run 路(Codex exec):render_hud/render/overlays/combat/shop_hidden/coop/settings/hud 共 403 處
  字面量→token、88 處過小帶提級、4 個區域 btn 改 `uiButton()`;grep 殘留 0。
- hub 路:panels/render/render_smith/render_wardrobe/render_personal/render_codex/menus 共 186 處
  遷移+46 處權重正規化+7 處量測呼叫同步;銀行 +/- 按鈕改 `uiButton()`。
- 裁決:emoji/pictogram 圖示級用途豁免字體階(ART_SPEC 4.1 補記),🔒 40px/衣櫃卡 34px/
  圖鑑目標卡 26px 維持原尺寸並註記。
- 驗證:兩路各自 smoke 59/59;sortie/talents/smith 1280×720 截圖無溢框
  (`docs/reviews/art-improve-2026-08/w1c-hub-after/`)。

## W2-F 圖示類別文法 slice(ART-06)

- `art/icons.js` 框體引擎改版:六類框角語法(武器斜切/被動圓徽/道具底座/裝備方肩/天賦尖飾/
  設施梯形)由每列 span 表+侵蝕推導,`catFromName()` 前綴推斷、234 呼叫端向後相容;
  `clipTo()` 全域裁掉溢框像素(類別剪影完整性,設計行為)。
- 底板統一 `darken(bg,0.34)`(架構師核准的全域值階修正——同色系 glyph 才有明度空間)。
- kira 星降級為 opt-in(`defineIcon` 第 4 參數;rarityOf 在 eager bake 時取不到,由呼叫端
  依 tier 標注;本批示範 12 處,tier1 不標)。
- 21 個代表 glyph 重繪(含 soulbolt/soulstorm、aura/inferno 兩對 base/evo 二層形狀差異)。
- 已知事項:`equip_leather_armor` 16px 讀形仍不穩,W3 批量時重審;灰階下六類框可辨
  (`docs/reviews/art-improve-2026-08/w2f-after/sheet-icon-grammar*.png`)。
- 驗證:smoke 59/59;187 icon sheet `missing:[]`。

## 本輪決策紀錄

- 肖像=assets/portraits/ 本地 PNG、方向 A 厚塗暗黑奇幻(使用者 2026-08-27 定案);
  slice 6 角色原稿已生成(`docs/reviews/art-improve-2026-08/portraits-raw/`),整合批待 W2-E。
- beam 不擴欄位(co-op bm 快照通道),所有權以顏色家族簽名——架構師修正審核建議。
- 敵人視覺量體不動 def.scale(連動碰撞),以 sprite 畫布填充率解決(W3)。

## W2-D 三生態身份 slice(ART-04+11;crypt/celestial/desert)

- 地板 variant 由 per-tile 均勻 rng 改 value-noise 群聚(2-5 tile 連續片+留白區),v1 對比度
  同步提升(與群聚耦合,單做一半會退回胡椒鹽雜訊);decal 70% 預算群聚化,總量守 BALANCE.DECOR。
- run biome 首次牆 variant:每生態 wallv1/wallv2/wallbk+深層岩心,走既有 wallBands hash 路徑。
- 每生態 2 大型地標(crypt 塌陷靈廟+魂晶碑/celestial 斷裂天梯+聖環殘骸/desert 半埋巨像+龍骨)
  +1 環境動態(魂焰/光塵/沙塵捲);地標不帶 solid(protocol serializeMap 不傳 solid,guest 會
  回彈)改以 7×5 開放空地保證走位;`lmk_` 前綴加寬剔除框。
- 邊界語法:`ts.oobBand`+地圖外圈牆環改地平線 sprite(霧鎖墓野/雲海/沙丘熱霾)。
- 順手修掉 celestial 三處既有固定紋違規(V 形地磚紋/Λ 牆紋/中央星格陣)與 desert 綠洲水面
  v2 的固定圖騰壁紙(棋盤格+定位藍點→分層 speckle,保留水色機能)。
- 其餘 7 生態逐位元不變證明:固定種子生成雜湊 before/after 相同(cavern/frost/inferno/void/
  verdant/swamp/abyss);渲染新分支全部 gate 在新資料存在與否。
- 驗證:smoke 59/59;截圖 docs/reviews/art-improve-2026-08/w2d-after/(開場/壓力/邊界/灰階/
  sprite 對照表/控制組)。

## W2-E 角色商品層 slice(ART-01+05)

- **sprite 重建**(heroes.js 4 archetype+gen_heroes3 h3_plague):hunter/shadow/g_revenant/
  h2_voidcaller/h3_plague 依 ART_SPEC 尺度階梯重建——填充率全數 ≥76%、頭身/眼位/武器入
  輪廓/3-4 階明暗逐項自檢通過;關鍵發現:病因除填充率外是值階分離(collar 分離線/臉腔 2 階/
  武器暗隙)。
- **reaper**:38×40 Final-boss 級重繪(架構師裁決:戲劇地位+程式無 28-32 檔;def.scale 2.2
  不動,場上 ≈84×88px)。並修掉兩個既有 bug:glow/aura/star4 被餵 rgba 字串→NaN fillStyle
  →墨色圓盤蓋頭;lighten/darken 傳 22/26/30(應為 0-1)→亮階夾白暗階夾黑——此二者才是
  「reaper 過暗」主因。**美術慣例新增:不要把 rgba 字串餵給 glow/aura/star4/softShadow。**
- **boss_pillar**:16×20 重繪(魂晶脈絡+裂損+符文環,靜態階段2,未動邏輯)。
- **肖像層**(ART-05):方向 A 厚塗 6 張(hunter/pyro/guardian/ranger/stormcaller/shadow)
  後製 128×128(LANCZOS+80 色 MEDIANCUT+FS 抖動,每張 ~10-11KB)進 assets/portraits/;
  新增 src/game/ui/portraits.js 惰性載入(失敗 fallback 原 sprite);出擊角色卡接入
  (render_personal.js drawSortie);sw.js 動態 cache-first 自動涵蓋、未改;零第三方請求不變。
- 驗證:smoke 59/59(含刪檔 fallback 測試);三張 sheet 零缺圖;sortie 截圖
  docs/reviews/art-improve-2026-08/w2e-portraits-after/、w2e-sprites-after/。

## W2 結構性遺留(W3+ 決策清單)

1. v2 特徵地磚單張必然成規則格——需 floorVar 多變體或特徵全交 decal 通道(全 10 生態通用問題)。
2. 其餘 7 生態的固定紋母題(frost 裂紋線/desert v0 風紋/abyss 焦散)未處理(本輪只准動三生態)。
3. 城鎮 ts.wallFace/wallCap 是死碼(_buildWallDepth 以 FLOOR 為種子,貼地牆深度為 1)——
   修深度起算或移除路徑,影響城鎮外觀,待裁決。
4. 大型地標 decor 不參與 actor y-sort,角色可走到地標「後方」仍被蓋——正解需把大型 decor
   併入 y-sort,渲染層改動待排。
5. equip_leather_armor 16px 讀形不穩(W2-F 遺留),W3 圖示批量時重審。
6. 手改 gen 檔清單新增:gen_weapons_b.js(beam 色族)、gen_heroes3.js(h3_plague 重繪)、
   art_decals_{crypt,celestial,desert}.js(地標/動態/註冊)——re-integration 前必須重套。
