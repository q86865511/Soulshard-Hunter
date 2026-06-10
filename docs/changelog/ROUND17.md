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

## 批次 B5 — 稀有度四階色彩＋型別徽章（5.1）
- **範圍**：`progression.js`、`scenes/run.js`、`pickup.js`。
- **條目**：
  - 單一真相源 `RARITY={1:普通 白#e6e9f2, 2:稀有 藍#58a6ff, 3:史詩 紫P.purpleL, 4:傳說 黃P.goldL}`（各帶配套深色卡底）＋`rarityOf(def,kind)`（合成與 `exclusive` 裝備＝傳說）＋`CHOICE_TYPE` 型別徽章表 — 全部 export。
  - `choiceStyle()` 重寫：卡底＋頂條＋稀有度 pill 同一 RARITY 列；**升級卡稀有度跟隨武器本身 tier**（原強制稀有藍）；詛咒保留紅框紅底身分、稀有度 pill 仍顯真實 tier。
  - 升級三選一左上角**型別 pill**（`1·武器`／`2·被動`／升級／合成／詛咒）取代裸數字。
  - 一致化掃描：B 商店裝備卡與鐵砧三選一（原 ad-hoc 三色三元）、撿裝備覆蓋層名稱列、build/結算 tooltip 名稱色、`pickup.js RARITY_RING`（白/藍/紫/黃/紅，`exclusive`→傳說）。
- **驗證**（preview）：強制三卡（t1 武器/t2 被動/t3 被動）→ 白框普通＋「1·武器」、藍框稀有＋「2·被動」、紫框史詩＋「3·被動」，卡底同色系；舊式 tier 色彩三元 grep 歸零；零 console error。

## 批次 B6 — 隱藏房間專屬內容（6.1–6.5）
- **範圍**：新 `content/hidden_rewards.js`、`content/hidden.js`（獎勵重寫）、`content/unlocks.js`、`content/characters.js`、`scenes/run.js`。
- **條目**：
  - **四個隱藏房改贈他處拿不到的專屬內容**（玩家定案「加入全新內容」）：
    - 6.1 魂晶寶庫 → **傳說飾品「寶庫之印」**（`hr_vault_sigil`，tier4：金幣 +15%／幸運 +0.3／拾取範圍 +15%）＋1000 金（原 400）。
    - 6.2 遠古檔案室 → **專屬武器「禁書迴響」**（`hr_archive_codex`，tier3／7 級：cd 2.4−0.18l 放出 2+⌊l/2⌋ 發魔紫追蹤符文彈、單發 10+4l）＋300 金（原「解鎖一項封存內容+120」— 玩家點名看不懂的就是這條）。
    - 6.3 聖物密室 → **專屬被動「聖物之心」**（`hr_relic_heart`，3 疊：每殺 40/35/30 名自身聖光爆發 60+30lv 傷＋0.6s 無敵）＋300 金。
    - 6.4 彩蛋房 → **隱藏造型「開發者 · 小妖」**（`devkid`，全身 body override：圓滾小妖＋耳機＋飄浮游標；`exclusive+unlockFlag:'devEgg'` — 不進商店池、`ownsSkin` 全英雄共用）＋888 金。
  - 三個 id 加入 `LOCKED`（武器/被動/裝備）— claim 前任何池都不出現；claim 走 `META.unlocked` 正規閘道。
  - **6.5 揭示 UI**：`claim()` 改回傳 `{text, icon, name, kindLabel}`；`drawHidden()` 揭示卡（脈衝金框 44S 圖示＋金色名稱＋類別＋說明）＋金環粒子；coop 即時分支與 banner 相容字串/物件兩態。
  - 三個新 icon（`defineIcon`：禁書＋符文／聖光之心／金印鑰孔）。
- **驗證**（preview）：三內容註冊成功；fresh save 四房 claim → `META.unlocked` 各就各位＋devEgg 旗標、重複 claim 回 null（once-per-save）；`ownsSkin('hunter'/'pyro','devkid')` 皆 true、`char_hunter__devkid` 烘焙 4 幀；codex `addWeapon` 後 200 幀正常開火；寶庫之印裝備 goldMult=1.15、換裝後**精準回退**（JSON 比對相等）；揭示面板截圖（圖示＋名稱＋類別）。

## 批次 B7 — 鑰匙與守護怪（7.1–7.3）
- **範圍**：`scenes/run.js`、`pickup.js`、`world.js`、`enemy.js`、`art/core.js`、`balance.js`。
- **條目**：
  - **7.1 延遲隨機甦醒**：守護怪不再開局即在（玩家 20 秒拿鑰匙的根因）— `guardianPlan` 每隻在 `[GUARDIAN_DELAY_MIN=90, MAX=240]` 秒隨機甦醒，甦醒橫幅「⚔ 寶庫守護怪甦醒了——擊敗牠奪取鑰匙！」＋金環粒子；`cleared` 後不再生成。
  - **7.2 精英化**：改以 `opts.elite` 正規路徑生成（**修正既有 bug**：原本 spawn 後才設 `elite`，建構子的金 tint／韌性／精英倍率全沒吃到）；`GUARDIAN_HP_SCALE=2.4`/`DMG_SCALE=1.0`（×3.2/×1.5 精英倍率 → 實效 ~7.7×HP、1.5×傷，原 6×/1.3×）；新 `crown_elite` sprite（9×7 雙幀金冠＋微光）懸浮頭頂＋金色脈衝 glow。協作備註：guardian 旗標不入網路位元，但 elite 金 tint 會同步。
  - **7.3 開鎖確認**：鎖箱碰觸不再自動吞鑰匙 — pickup 改舉 `world.vaultNear`（world 每幀重置），run.js 互動鏈最高優先；頭頂脈衝提示「【E】使用鑰匙開啟寶庫」→ `openVault()` 扣鑰匙、雙金環、橫幅「🔑 寶庫開啟！」；無鑰匙維持「🔒 需要鑰匙」浮字。替代鑰匙來源（機關）本回合範圍外。
- **驗證**（preview）：開局零守護怪、plan=[199.9s, 113.8s] ∈ [90,240]；快轉後 2 隻甦醒（hp 869、elite、金 tint）；皇冠渲染零錯誤；鑰匙在手碰鎖箱 → `vaultNear` 舉起且**鑰匙未扣**；`openVault` → 開箱＋鑰匙-1＋正確橫幅。

## 批次 B8 — 數值稽核＋微 nerf＋城鎮經濟（8.1–8.3）
- **範圍**：`balance.js`、`content/talents.js`、`content/facilities.js`、`content/abilities.js`、`content/events.js`＋ **6 個 gen 手改**（`gen/talents.js`、`gen/facilities.js`、`gen_items_anvils.js`、`abilities_utility.js`、`gen_abilities_c.js`、`equipment_gear.js` — 已記入 CLAUDE.md gotcha，重跑 integrate.mjs 會還原）。
- **條目**：
  - **8.1 換裝精準回退稽核**：200 次隨機護甲/飾品換裝＋全卸下 → 玩家 stats 與初始 **byte-exact**（零漂移）— R16/9.4 不變量成立，「近乎無敵」非換裝殘留所致 → 依玩家指示施以全面微 nerf。
  - **8.2 局內微 nerf**：鐵砧遞減 `ANVIL_DIMINISH=0.85`（同類重複購買 8%→6.8%→5.78%…，desc 註明；浮字顯示實際增益）；贊助者修剪 ~20%：berserker 1.35→1.28、midas 1.25→1.12＋傷害上限 0.30→0.24、gambler 1.12→1.10（並修 desc「10%」→「5%」文不符碼）、mage 1.12→1.10、pyro 1.05→1.04、engineer 1.06→1.05；**不加** DAMAGE_MULT 軟頂（讀點分散、會破壞精準回退不變量）。
  - **8.3 城鎮經濟**（玩家給定數字）：四個 `*_COST_MUL` 2.0→**3.0**（價格 ×1.5）；**順手修正既有漏洞：gen 天賦/設施成本原本寫死、R16 的 ×2 從未套用** — 現已接上 MUL（gen 天賦 L0 55→165）。金幣收益砍半：t_gold 6→3%/級、f_bank 5→2.5%/級、greed 1.25→1.12、貪婪之約金幣 1.4→1.2（魂晶不動）、p_midas 1.25→1.12、p_merchant +1200→+600、尋寶直覺 1.18→1.09、幸運星辰 1.15→1.08、貪婪之戒 1.30→1.15、拾荒者 8→4%/級。局外成長值修剪 ~25-30%：核心天賦（t_damage 2.5→2%、t_firerate 3.5→2.5%、t_crit 1.5→1.2%、t_hp 10→7、t_regen 0.2→0.15、t_speed 3→2%、t_pickup 12→9%、t_dash 5→4%、t_luck 0.07→0.05、t_xp 6→4%）＋gen 天賦（利刃 3.5→2.5%、暴擊精通 2.5/8→2/6%、鐵骨 12→9、壁壘 2/2→1/1.5%、疾風步 4→3%、磁吸 30→22%、賭徒之心 5/5→4/4%）＋設施（f_shrine 7→5、f_altar 6→4、戰利寶庫 25→15、神諭 0.6→0.4、汲泉 8%/4→5%/3、補給營回復 0.2→0.15、圖桌 2/1.5→1.5/1%）；所有 desc 同步。重置退款走 `def.cost(i)` 自動一致。
- **驗證**（preview）：8.1 稽核 200 次零漂移；鐵砧遞減 0.08→0.068→0.0578；`t_gold.cost(0)=165`、`g_scavenger.cost(0)=165`（gen 已接 MUL）；patron desc spot-check；D1 fresh-save 模擬（智慧走位）8 分鐘滿血存活（threat 5）— B8 對新存檔局內生存面零接觸（僅動 meta/贊助者/鐵砧/金流），開局可玩性不受影響。

## 批次 B9 — 城鎮進度門檻（9.1，混合制）
- **範圍**：新 `content/town_gates.js`、`scenes/hub.js`。
- **條目**：
  - `TOWN_GATES`＋`gate()`／`facilityGate()`／`gateProgress()`；`clearedBiomes()`＝`diff ≥ 1` 的生態數。
  - 閘門表（玩家定案混合制）：**鍛造**＝通關 1 生態（smith 頁籤 0 → 鎖定面板＋updateForge 擋輸入）；**魂晶銀行**＝公會 Rank 2（面板開啟但顯示鎖定畫面）；**天賦第 3 排（row≥2）**＝公會 Rank 3（新 `gated` 狀態：節點顯示「🔒 進度解鎖」、點擊 feedback 顯示條件）；**f_dojo Lv2**＝通關 3 生態、**f_arsenal Lv3**＝通關 4 生態（僅鎖下一級，永不剝奪已購等級）。
  - 共用 `drawLockedPanel(f,hint)`：🔒 大圖示＋條件文＋「目前進度：通關 X 個生態系 · 公會 Rank Y」footer。
- **驗證**（preview）：fresh save（0 通關/Rank 0）四閘門全鎖、dojoL1 開放；通關 1 生態＋Rank 2 → 鍛造/銀行開、row2 仍鎖；Rank 3 → row2 開；3 生態 → dojoL2 開、arsenalL3 仍鎖；鍛造鎖定面板截圖正常；舊存檔（已通關多生態）無感。

## 批次 B10 — 教學批（10.1–10.2）
- **範圍**：`scenes/hub.js`、`scenes/run.js`、`state.js`。
- **條目**：
  - **10.1 重看教學**：hub ESC 選單新增「📖 新手指南」→ `triggerTutorial(force=true)` 無視 tutorialDone 隨時重播蕾恩；run 暫停選單改 4 鈕（繼續/設定/**📖 介面一覽**/放棄）— 介面一覽即時重開 hudTut 介面導覽。
  - **10.2 難度解鎖教學**：新旗標 `META.tutorialSortieDone`（DEFAULT_META＋loadMeta 預設掃描）；蕾恩第 5 頁新增「每通關一個生態與難度，就會解鎖下一個生態、更高難度——通關過的生態還能挑戰『無盡』！」（5→6 頁）；**出擊面板首開導覽** `drawSortieTut()`：三個金色 callout 指向關卡列（通關生態→解鎖下一個）、難度步進器（通關難度→更高難度與無盡）、出擊鈕，任意點擊/按鍵關閉、once-per-save、輸入全攔截（updatePanel 最高優先）；通關畫面文案「解鎖難度 N」→「難度 N 已解鎖」。
- **驗證**（preview）：首開出擊 → 導覽出現＋截圖（標題移至面板上緣外，不壓標題列）；點擊關閉＋旗標寫入＋再開不出現；ESC 選單含新手指南、`tutorialDone=true` 下重播成功（6 頁）；暫停選單 4 鈕截圖正常。

## 批次 B11 — 全遊戲 QA＋收尾（11.1）
- **範圍**：QA 流程＋確認修復（`scenes/hub.js`、`scenes/run.js`、`content/skinshop.js`、`state.js`）＋最終文件。
- **QA 流程**：
  - **15 代理對抗審查工作流**（6 維度 opus 審查員 × 輸入圖層/存檔相容/經濟數學/稀有度渲染/模擬正確性/衣帽間流程 → 每項發現由獨立 opus 驗證員以「預設駁回」立場溯源驗證）→ **6/9 項確認**（1 major、5 minor）、3 項駁回（理論性/非缺陷）。
  - **Inline 回歸矩陣**：`__DBG.coopRoundTrip()` 協作快照全綠（2 玩家編解碼/渲染）；registry 計數正確成長（武器 30→31、被動 53→54、裝備 +1）；**24/24 面板渲染零例外**（hub 16 面板態 × run 8 覆蓋層，1280×720）；舊存檔 round-trip（字串 offers 遷移／新旗標補預設／隱藏房 claim 保留）；無盡模式 400 秒煙霧（第 1 波首領 180s 準時、威脅爬升、無誤觸通關/死神）；D1 智慧走位模擬 8 分鐘滿血（B8）。
- **確認缺陷與修復**：
  - **[major] 舊存檔永久錯失隱藏房專屬內容**：R17 前已 claim 過 vault/archive/relic 的存檔，once-per-save 守衛使其永遠拿不到新專屬獎勵 → `loadMeta` 增加回填（claimed 但缺 unlock → 補發 `hr_vault_sigil`/`hr_archive_codex`/`hr_relic_heart`＋devEgg 旗標；字面 id 映射避免 import 循環，涵蓋開機/換 slot/雲端同步全路徑）。
  - **[minor] 鎖定鍛造面板上殘留可點的「重置鍛造」鈕**：`resetTarget()` 在 forge gated 時回傳 null。
  - **[minor] 低公會等級下已購第 3 排天賦顯示「🔒 進度解鎖」**：gate 改僅對未持有（cur=0）節點生效 — 既得等級永遠可見可續升。
  - **[minor] 重置退款少於實付（動態加價未退）但確認框承諾全額**：確認框文案改誠實「以基準價返還金幣（不含動態加價部分）」（基準價退款為 R16 既定設計）。
  - **[minor] 跨局殘留 `_lastKeys` 抑制第二局鑰匙橫幅**：`enter()` 重設 `_lastKeys=0`＋`leaveConfirm=false`（singleton scene 旗標清掃）。
  - **[minor] 造型全收集後商店每幀重 roll（倒數凍結＋CPU 浪費）**：`rollOffers` 記錄 `_poolDry`；`ensureSkinOffers` 僅 due 或（空且非 dry）才 roll，非 due roll 不重設 30 分期限。
- **驗證**（preview，逐項）：回填 — 模擬 pre-R17 claimed 存檔 `loadMeta` 後四項全補發；dry pool — 3 次 ensure 僅 1 roll、`_poolDry=true`、倒數完好；gated forge `resetTarget()===null`、解鎖後恢復；已購 t_crit 不顯 gated、未購 t_regen 仍 gated；最終 boot＋30 秒戰鬥＋hub 返回零錯誤。
- **Server**：本回合零變更（`server/` 未動，`server/test` 不在範圍）。

**ROUND17 完成** — 23 項玩家回饋全數落地（B0–B11），含 QA 確認修復。
- **驗證**（preview 驅動，零 console error / `__GAME_ERROR__` null）：slots 畫面截圖無重疊（493×374 小視窗）；衣帽間列身點擊（先前必拋處）`threw:null`；4000 殺統計 nova 引爆率 **24.4%**（目標 25%）；speed=200 玩家逃跑下範圍內金幣 120 幀內收斂吸附（finalDist 0.4）；keys+1 → 橫幅正確、keys−1 不觸發；離場確認框／贊助者三選一／結算左欄截圖確認新版面。

## 批次 B12–B15 — 上線版全面測試回合（測試員模式，21 代理 opus 工作流＋玩家回報）
- **QA 流程**：6 維度測試（UI 重疊／系統功能／遊玩 Bug／程式架構／文件完整性）— 3 靜態分析並行＋3 實機遊玩測試序列（獨佔瀏覽器分頁）＋逐項對抗驗證；8/15 項確認（6 項驗證因 session limit 中斷 → 本機逐項複核，其中 2 項屬實已修）。
- **玩家回報修復**：
  - **B12 出擊卡「起始武器」重複兩行**：英雄 desc 自帶「起始武器：X。」結尾句，卡片已有專屬行 → 渲染端以 regex 剝除重複句。
  - **B13 遊戲內更新日誌全面改版**：`patchnotes.js` 改為**一回合一條目**（對應 `docs/changelog/ROUND<N>.md` 分類，共 15 個版本 Round 1–3…Round 17）＋補上 **Round 17 完整條目**、`GAME_VERSION` → 'Round 17'；title.js 更新日誌改**兩視圖** — 版本一覽（一版本一列：版號／標題／日期／條數，最新金框）→ 點列進入該版詳情頁（◀ 返回／Esc 逐層退出）。
  - **B14 地圖邊界外不再全黑**：`world.drawTiles()` 以可視範圍（不夾擠）掃描，界外格以**暗化生態牆磚**填充（per-tile hash 微變 alpha 0.30–0.40，讀作後退的岩壁）— 跑局與城鎮通用。
- **測試確認修復**（對抗驗證 8 項＋本機複核 2 項）：
  - [major] `patchnotes.js` 無 R17 條目＋版號停在 Round 16（隨 B13 解決）。
  - **B 商店能力鐵砧完全繞過 B8 遞減 nerf**（B8 只改到 gen 地面道具鐵砧；主力 B 鍵商店 `ANVIL_POOL` 原價全額疊加）→ `apply(s,p,f)` 接遞減因子、依**同名購買次數** `run._anvN` 遞減（×0.85^n，整數型 +1 減傷/穿透豁免 `flat`），卡片 desc 顯示「重複鍛造 · 效益 ×0.85」誠實標示；實測 1→0.85→0.7225。
  - **高縮放 3×3 出擊格壓過頁碼/關卡列**（56S 硬地板溢位）→ 地板降至 34S＋**緊湊模式**（card.h <70S 砍至 1 行敘述、<52S 全砍只留武器行）；1.5× 實測 gridBottom 361 < pgY 386。
  - 結算左欄極端縮放可能壓過「★ 本局解鎖」條 → 左欄加裁切矩形保護；衣帽間 ◀ 返回鈕騎在標題分隔線上 → +2S 下移。
  - 無盡首戰首領誤標「第 2 波」（wave+1 跳號）→ 改顯自然波次「第 1 波首領」；難度步進器 ♾（U+267E 被 emoji 字型渲染成色塊）→ 改 ∞（U+221E，CJK 字型內建數學符號）。
  - 文件五處：CLAUDE.md 標題「rounds 1–15 done」→ 1–17、架構樹補 `game/ui/`（settings.js＋gold.js）；README 衣帽店描述更新為 R17 流程、內容表校正（31 武器／54 被動／41 裝備／205 成就／16 造型含 5 隱藏）；run.js 三階稀有度舊註解更正。
- **駁回／不修**（對抗驗證確認非缺陷）：gen 手改 integrate.mjs 還原風險（既有 gotcha 已記載）、隱藏造型舊 `price` 欄位閒置（雜湊定價刻意取代）、商店 offer 不重驗角色解鎖（角色不可被收回，不可達）。
- **驗證**（preview）：更新日誌兩視圖截圖（15 版本列＋R17 詳情）；出擊卡無重複行；跑局地圖角落截圖 — 界外為暗磚紋理；B 商店連鍛三次力量鐵砧 f=1/0.85/0.7225＋desc 正確；無盡 180s 橫幅「第 1 波首領」；1.5× 出擊無重疊斷言；零 console error。

## 批次 B16 — 玩家回報 UI 收尾（公會溢出＋卡片間距）
- **範圍**：`scenes/hub.js`。
- **條目**：
  - **公會等級頁籤列表溢出面板底部**：根因 — 裁切矩形高度沿用 `f.h − 96S` 卻從階級表頭（`t0+56S`）起算，裁切底落在面板底 **+40S** → 末列（傳奇·公會之柱）整列漏出框外。改為顯式底邊 `(f.y + f.h − 24S)`（與成就／衣帽間裁切同模式）。順帶體檢全部 8 處面板裁切式 — 僅此一處算錯。
  - **營地設施卡敘述與圖示/名稱過近**：敘述起點 `y+42S` 距 30S 圖示底僅 4S → 改 `y+50S`；同步巡檢天賦節點（敘述在圖示右側欄、間距足）、成就卡（18S 間距）、鍛造列／詳情、衣帽間列、出擊卡（B12 後）— 其餘版面皆有足夠呼吸空間，無需調整。
- **驗證**（preview）：公會等級捲至最底截圖 — 末列完整收在面板內（maxScroll 59）；營地設施截圖 — 敘述與圖示名稱間距明顯；零 console error。
- **追修：更新日誌詳情頁日期與內文重疊** — 日期原與第一行條目同基線右對齊（全寬換行文字直接撞上）→ 移至標題列 ✕ 鈕左側，並加窄面板防護（與置中標題淨空不足 6S 時略過 — 版本一覽列本就顯示日期）。驗證：幾何斷言 dateLeft(898) > titleRight(875) 淨空 23px；各版本詳情頁渲染零錯誤。

## 批次 B17 — 全 UI 掃蕩（重疊／縮放／裁切＋美化，22 代理 opus 工作流）
- **QA 流程**：2 靜態版面數學分析（hub／run+title 全面板最壞情況算式）＋3 實機視覺測試（uiScale {0.6,1.0,1.5} × 視窗 {1280×720, 850×520} 矩陣截圖）＋逐項對抗驗證（純程式碼複算）＋美化建議策展 — 16 項缺陷確認 10 項、6 項駁回；美化 5 項保留。首輪驗證因 session limit 中斷，以 `resumeFromRunId` 快取續跑（前 5 個昂貴代理零重算）。
- **確認缺陷修復（10）**：
  - **[major] 城鎮 Esc 選單高縮放爆出視窗**（1.5× 時 8 項選單 766px > 720 — 標題切頂、末鈕出底）→ `escMenuLayout` 加 fit-to-viewport 有效縮放（預算含標題字箱 58S），字型跟隨 `items.eS`；實測 1.5× 標題頂 11px、末鈕底 698 全收納。
  - **[major] 公會「任務委託」列無裁切無捲動**（1.5× 時後 3 列畫出面板 145px 直壓城鎮景）→ 比照 B16 階級頁修法：裁切＋`panelScroll` 捲動＋捲軸＋滾出列不可點擊；實測 maxScroll 183。
  - **[major] 鍛造詳情窗特效列畫出面板**（1.5× 時 廣域/疾速 越界 84px）→ 詳情窗自身裁切＋特效列距自適應壓縮（38S→最低 26S）；實測末列 642 ≤ 窗底 650、五列全可見可點。
  - **[major] 結算滿配 build 高縮放下羈絆標籤壓「★ 本局解鎖」**→ 空間不足時整節略過（標籤＋一列徽章放不下就不畫）。
  - 結算標題行被面板遮蓋（0.28H 固定頂 vs 4+1 行標題）→ 面板頂錨定於標題區塊之下、高度增加 `0.93H − topY` 上限；勝利/死亡兩版同修。
  - 標題畫面「更新日誌」鈕與小鈕列相撞（固定 0.845H vs 0.58H+126S）→ 新 `menuScale()` fitted scale＋鈕改錨定於小鈕列下方；實測 1.5× 淨空（607→617）且不撞 footer（662 < 670）。
  - TAB build 面板 1.5× 默默丟掉吸血/幸運兩列 → 數值列距自適應（15S→最低 11S、字型跟隨）；十列全顯。
  - 右上金幣計數 6 位數出界（左錨定 +70S 保留位不足）→ `iconCounter` 改右錨定（數字右對齊、圖示貼左）；123456 完整顯示。
  - 跑局大橫幅與首領血條/贊助者列相撞 → 橫幅 Y 改 `max(0.2H, 118S)` 讓開 HUD 區。
  - 無盡波次標籤（前批已修，本輪覆核）。
- **美化（策展保留 5 項全數實施）**：能力鐵砧三選一卡 ×1.62→×1.0（原下半 65% 空白）、贊助者卡 ×1.62→×1.45；鎖定面板改以「頁籤下方身體區」置中（原 0.42·f.h 在鐵匠鋪留 ~180px 死帶）；設定面板無「返回大廳」時收合預留槽（按鍵設定下移補位）；造型商店工具列下移 50S 脫離標題分隔線；個人小屋公會階級字幕移至肖像框下方（原跨壓框線）。
- **駁回（驗證確認非缺陷／不可達）**：設施卡敘述兩行擠價格、隱藏成就長名壓徽章、升級卡敘述壓羈絆提示、撿裝備差異表貼按鈕、任務追蹤器 2.6px 淨空、成就 toast 長名 — 各於可達範圍內經複算不成立或淨空足夠。
- **驗證**（preview，1.5× 為主）：上述每項皆附幾何斷言或截圖；最終 9/9 面板渲染冒煙零例外、`__GAME_ERROR__` null；uiScale 復原 1.0。

## 補修 B11.3 — 造型商店收藏全滿後「重新進貨」白扣金幣
- **範圍**：`content/skinshop.js`、`scenes/hub.js`。
- **問題**：玩家擁有所有可購 (角色, 造型) 配對後，offer 池耗盡（`_poolDry`），但 `rerollSkinShop` 只檢查金幣就扣 200、再 roll 出 0 件商品 — 淨效果扣錢無貨（實測 100000→99800、offers=0）；且 dry 狀態下重新進貨鈕照畫照可點（toolbar 繪製在空池 early-return 之前，hit-test 也不分池態）。
- **結果**：
  - **`rerollSkinShop` 永不為空 roll 收費**：新 export `skinPoolDry(meta)`（normal＋hidden 池皆空）；池全乾 → 直接回 false 不扣款；僅剩隱藏款時的「全槓龜」roll（1%/10% 機率全 miss）→ 還原原貨架＋**全額退款**回 false。
  - **hub UI**：`skinPoolDry` 時隱藏重新進貨鈕＋免費進貨倒數（皆為 no-op），點擊 hit-test 同步忽略；空貨架訊息分流 — 池乾「已蒐集所有上架造型！」、僅剩隱藏「本輪沒有進到新貨——重新進貨試試手氣」；reroll 失敗 feedback 分流（金幣不足 vs 未進到新貨，金幣已退還）。
- **驗證**（preview）：全收集存檔（hunter＋pyro × 全非專屬造型 30 對）連按 21 次 reroll → 金幣 100000 不變、回傳 false、`skinPoolDry=true`；僅剩隱藏款存檔 200 次 reroll → 103 次扣 200 且必有貨、97 次槓龜全退款、**0 次異常組合**；正常存檔 reroll 照常扣 200 補滿 8 件；dry 商店截圖 — 只剩返回鈕＋「已蒐集所有上架造型！」；正常商店截圖 — 8 卡＋倒數＋進貨鈕如舊；零 console error。
