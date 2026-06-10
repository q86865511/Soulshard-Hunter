# Round 17 實作規格文件

> 本文件供 AI／開發者實作參考。彙整玩家實際遊玩 Round 16 成品後的 23 項回饋，依**主題分類**整理；同一區域或性質的修改集中在同一章。
> 編號採「章.項」格式，並附 `(原#N)` 對照玩家回饋清單順序。實作依批次（B0–B11）進行，每批附 `docs/changelog/ROUND17.md` 條目。

> **純前端回合 — `server/` 零變更。** 協作約束：所有模擬端改動（魂爆機率、磁吸、守護怪、寶庫確認）僅影響主機端 sim，`src/game/net/protocol.js` 不動，單人路徑位元級不變式維持。

## Context

Round 17 是一次 **UX 修正 + 造型商店重構 + 隱藏房專屬內容 + 經濟再平衡** 的綜合回合：
- **視覺修正**：存檔畫面標題重疊、金幣 emoji 破圖（□）全面改像素圖示、少數 UI 重疊與縮放問題。
- **衣帽間重構**：入口改「我的造型／造型商店」兩鍵；商店改 8 格隨機進貨（已解鎖角色 × 全造型配對池）、隱藏款 1% 機率、價格大幅調漲（普通 1000／豪華 3000／隱藏 20000–50000）、特賣只打非隱藏 8 折；並根除換裝點擊報錯。
- **出擊改版**：角色卡左圖示名稱、右起始武器與效果，移除底部介紹塊，單頁 9 位（3×3）；無盡挑戰併入難度步進器成為末階（該關通關過一次才解鎖）。
- **稀有度系統**：四階色彩（普通白／稀有藍／史詩紫／傳說黃）單一真相源，三選一卡底色與稀有度一致，並加上型別徽章（武器／被動／裝備…）。
- **隱藏房豐富化**：四種隱藏房各給**專屬新內容**（新武器「禁書迴響」、新被動「聖物之心」、新飾品「寶庫之印」、隱藏造型「開發者·小妖」）＋揭示 UI 顯示解鎖物圖示與名稱。
- **鑰匙節奏**：守護怪延遲 90–240 秒隨機甦醒（根除 20 秒拿鑰匙）、精英外觀與強度、寶庫改 E 鍵確認開鎖＋動畫提示、獲得鑰匙跳橫幅。
- **數值與經濟**：換裝精準回退稽核、鐵砧遞減收益、贊助者微調；城鎮價格 ×1.5、金幣收益砍半、局外成長值修剪 ~25-30%。
- **進度門檻**：城鎮系統以混合制（公會階級 × 生態通關數）分段解鎖。
- **教學**：ESC／暫停選單可重看新手指南與介面一覽；新增難度解鎖教學（蕾恩補頁＋出擊面板首開導覽）。
- **魂爆重做**：每殺必爆 → 機率引爆（25%/35%/45% 隨等級），傷害上調補償。

### 玩家定案決策
1. 魂爆（nova）：機率隨等級 25%/35%/45%，爆炸傷害略升。
2. 無盡挑戰：**逐關解鎖**（`META.levels.diff[bid] ≥ 1` 該生態才出現「無盡」階）。
3. 隱藏房：**加入全新專屬內容**（R17 最大批次）。
4. 系統閘門：**混合制**（公會階級 × 生態通關）。

### 探索階段已驗證的根因
- **#5 衣帽間換裝跳 UI**：`hub.js updateWardrobe()` L714 列命中矩形使用作用域不存在的 `S` → 點列身（非「裝備」鈕）拋 ReferenceError。修：`L.f.S`。
- **#16 通關後無法互動**：`run.js` L1034 互動鏈尾 `else if (this.cleared && pressed('interact')) finishRun(true)` — 互動範圍（22px）外按 E 直接無確認離場。另查明：地圖互動物 `well/soul/shard/forge` 中 `shard`＝魂晶礦脈（給魂晶，**非商店**），無需移除任何互動物。
- **#2 金幣破圖**：`engine/renderer.js goldStr()` 回傳 `'🪙'+n`，canvas 字型無此 emoji → □；共 22 個呼叫點。

---

## 分類總覽

### 一、快速 UI／操作修正（批次 B1）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 1.1 | 選擇存檔畫面與標題重疊 (原#1) | `scenes/title.js` |
| 1.2 | 衣帽間換裝 ReferenceError 熱修 (原#5) | `scenes/hub.js` |
| 1.3 | 拾取範圍內吸附速度大幅提升 (原#12) | `pickup.js`、`balance.js` |
| 1.4 | 獲得鑰匙跳橫幅提示 (原#13) | `scenes/run.js` |
| 1.5 | 小王（贊助者）三選一圖文間距放寬 (原#14) | `scenes/run.js` |
| 1.6 | 結算左欄圖示等距分節 (原#15) | `scenes/run.js` |
| 1.7 | 通關後 E 鍵誤離場 → 確認框 (原#16) | `scenes/run.js` |
| 1.8 | 隱藏成就特別顯示＋「隱藏」篩選 (原#17) | `scenes/hub.js` |
| 1.9 | 魂爆改機率引爆 (原#9) | `content/abilities.js`、`balance.js` |

### 二、金幣圖示系統（批次 B2）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 2.1 | `goldLabel` 像素金幣圖示＋`goldStr` 文字安全化 (原#2) | 新 `ui/gold.js`、`engine/renderer.js`、`title.js`、`hub.js`、`run.js` |

### 三、衣帽間與造型商店（批次 B3）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 3.1 | 入口兩鍵：我的造型／造型商店 (原#3) | `scenes/hub.js` |
| 3.2 | 造型商店 8 格隨機進貨＋1% 隱藏＋新價格表＋特賣規則 (原#4) | `content/skinshop.js`、`scenes/hub.js`、`state.js` |
| 3.3 | 換裝點擊正修（隨重構根除） (原#5) | `scenes/hub.js` |

### 四、出擊與難度（批次 B4）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 4.1 | 角色卡改版：左圖示名稱／右武器效果、單頁 9 位、移除底部介紹 (原#6) | `scenes/hub.js` |
| 4.2 | 無盡挑戰併入難度步進器末階（逐關解鎖） (原#7) | `scenes/hub.js` |

### 五、稀有度色彩系統（批次 B5）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 5.1 | 四階稀有度色彩＋型別徽章＋卡底同色 (原#10) | `progression.js`、`scenes/run.js`、`pickup.js` |

### 六、隱藏房間專屬內容（批次 B6）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 6.1 | 魂晶寶庫 → 專屬飾品「寶庫之印」 (原#11) | 新 `content/hidden_rewards.js`、`content/hidden.js`、`content/unlocks.js` |
| 6.2 | 遠古檔案室 → 專屬武器「禁書迴響」 (原#11) | 同上 |
| 6.3 | 聖物密室 → 專屬被動「聖物之心」 (原#11) | 同上 |
| 6.4 | 彩蛋房 → 隱藏造型「開發者·小妖」 (原#11) | `content/characters.js` SKINS |
| 6.5 | 隱藏房揭示 UI：解鎖物圖示＋名稱＋粒子 (原#11) | `scenes/run.js` `drawHidden()` |

### 七、鑰匙與守護怪（批次 B7）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 7.1 | 守護怪 90–240s 隨機甦醒＋橫幅 (原#19) | `scenes/run.js`、`balance.js` |
| 7.2 | 守護怪精英外觀（皇冠／金光）＋強度 (原#19) | `enemy.js`、`art/core.js`、`balance.js` |
| 7.3 | 寶庫 E 鍵確認開鎖＋開箱動畫 (原#19) | `pickup.js`、`scenes/run.js` |

### 八、數值平衡（批次 B8）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 8.1 | 換裝／武器／被動 stat 精準回退稽核 (原#20) | 驗證腳本（changelog 記錄） |
| 8.2 | 鐵砧遞減收益＋贊助者修剪 (原#20) | `gen_items_anvils.js`(手改)、`content/events.js`、`balance.js` |
| 8.3 | 城鎮價格 ×1.5＋金幣收益砍半＋成長值修剪 (原#21) | `balance.js`、`talents.js`、`facilities.js`、`abilities.js`、gen 手改 |

### 九、城鎮進度門檻（批次 B9）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 9.1 | 混合制閘門：鍛造／銀行／天賦高排／設施高級 (原#18) | 新 `content/town_gates.js`、`scenes/hub.js` |

### 十、教學（批次 B10）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 10.1 | ESC「新手指南」／暫停「介面一覽」重看 (原#8) | `scenes/hub.js`、`scenes/run.js` |
| 10.2 | 難度解鎖教學（蕾恩補頁＋出擊首開導覽＋通關文案） (原#22) | `scenes/hub.js`、`scenes/run.js`、`state.js` |

### 十一、QA（批次 B11）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 11.1 | 全面板縮放×視窗矩陣掃描＋回歸（原#23） | 全 UI 面 |

---

## 詳細規格

### 1.1 選擇存檔畫面重疊 (原#1)
- **檔案**：`src/game/scenes/title.js`（`render()`、`drawSlots()` L204-229、`layoutSlots()` L47-53）
- **現況**：slots 子狀態沿用完整 logo（魂晶獵手 @0.16H＋SOULSHARD HUNTER @0.16H+34S），「選擇存檔」@0.23H、卡片自 0.26H 起 — 視窗較矮時三者相疊。
- **目標**：`mode==='slots'` 時改畫縮小版 logo（標題 30S @0.085H、副標 +22S）；「選擇存檔」固定副標下 +52S；卡片自 +76S 起，高度夾擠（<78S）時省略卡內第三行統計。
- **驗證**：800×500 與 1920×1080 截圖，無重疊。

### 1.2／3.3 衣帽間換裝 ReferenceError (原#5)
- **檔案**：`src/game/scenes/hub.js` `updateWardrobe()` L714
- **現況**：列命中矩形 `{x: L.f.x + 16 * S, …}` 的 `S` 不在作用域 → 點列身拋 ReferocenceError，UI「跳掉」。
- **目標**：B1 熱修補 `const S = L.f.S;`；B3 重構時整段重寫根除。
- **驗證**：點擊列身與「裝備」鈕皆能套用造型，`window.__GAME_ERROR__` 為 null。

### 1.3 拾取吸附速度 (原#12)
- **檔案**：`src/game/pickup.js` L79-90、`src/game/balance.js`
- **現況**：`speed = max(70, 240 − d*1.6)` — 範圍邊緣僅 ~70px/s，後期玩家跑速可超過而「甩開」金幣。
- **目標**：新 knob `PICKUP_PULL_FACTOR=1.5`、`PICKUP_PULL_FLAT=60`；範圍內 `speed = max(player.stats.speed*1.5+60, 240−d*1.6)`；磁鐵道具 `max(420, ps*2)`；保留 R16/10.6 的 step 夾擠（不過衝、不反彈）。
- **驗證**：eval 設 `player.stats.speed=160` 後，邊緣拾取物收斂到位。

### 1.4 鑰匙獲得橫幅 (原#13)
- **檔案**：`src/game/scenes/run.js`
- **現況**：僅 `world.particles.text` 小字浮動，易錯過。
- **目標**：`update()` 中偵測 `world.keys` 遞增 → `this.banner='🔑 獲得鑰匙！可開啟封鎖的寶庫寶箱'`（3.2s）＋音效。只用 banner（R16 已有拾取紀錄 chips）。
- **驗證**：擊殺守護怪 → 橫幅出現；用鑰匙（keys 遞減）不誤觸發。

### 1.5 贊助者卡間距 (原#14)
- **檔案**：`src/game/scenes/run.js` `eventCardRects()` L392-396、`drawEventChoice()` L414-434
- **現況**：卡高 `cw*1.46`，肖像 46S 後 +32/+50/+67/+86S 排版過擠。
- **目標**：卡高 `min(cw*1.62, view.H*0.74)`；肖像 50S @y+18S；稱號 +44S、名字 +64S（16S）、頭銜 +84S、敘述自 +106S 起（行高 15S）。
- **驗證**：小王三選一截圖，圖文呼吸感明顯。

### 1.6 結算左欄等距 (原#15)
- **檔案**：`src/game/scenes/run.js` `drawResultSummary()` L2034-2104
- **現況**：`sz=26S, gap=5S`，各節（武器／被動×N／裝備／羈絆）間距不一、裝備擠在標籤旁。
- **目標**：節奏常數 `sz=26S, gap=6S, SEC_GAP=16S, HEAD_DROP=13S`；每節統一「標題 → HEAD_DROP → 圖示列 → SEC_GAP」；裝備改獨立列；面板高度放大至 `min(view.H*0.62, 430S)`。
- **驗證**：結算截圖，五節等距。

### 1.7 通關後 E 鍵誤離場 (原#16)
- **檔案**：`src/game/scenes/run.js` L1034
- **現況**：`else if (this.cleared && pressed('interact')) finishRun(true)` — 神龕等互動物在範圍內優先，但範圍外按 E 直接離場結算。
- **目標**：改開 `leaveConfirm` 確認框：「離開戰場並結算勝利？」副行「死神仍會降臨——留下迎戰可得傳說獎勵」，確定離場／繼續戰鬥；Esc／點外取消。互動物優先序不變。**魂晶礦脈確認非商店，保留**（規格記載，原#16 的移除条件不成立）。
- **驗證**：通關後遠處按 E → 確認框而非直接結算；神龕仍可祈福。

### 1.8 隱藏成就顯示 (原#17)
- **檔案**：`src/game/scenes/hub.js` achievements panel L1047-1086
- **現況**：隱藏成就未完成顯示 ???，完成後與普通成就無異。
- **目標**：隱藏成就完成前後皆帶紫羅蘭 `#d36bff` 邊框＋`★隱藏` 小徽章；FILTERS 增至 4 頁籤（全部／已達成／未達成／隱藏）。
- **驗證**：篩選「隱藏」列出全部 hidden 成就；完成的隱藏成就仍可辨識。

### 1.9 魂爆機率化 (原#9)
- **檔案**：`src/game/content/abilities.js` nova L98-105、`src/game/balance.js`
- **現況**：kill hook 每殺必爆（半徑 22+lv*6、傷害 12+lv*7）。
- **目標**：`BALANCE.NOVA_CHANCE=[0.25,0.35,0.45]`；引爆時半徑 `26+lv*8`、傷害 `30+lv*16`（上調補償）；desc「擊殺敵人時有機率（25%/35%/45%）引發強力魂晶爆炸」。
- **驗證**：eval 統計 500 殺引爆率 ≈ 設定值 ±5%。

### 2.1 金幣圖示系統 (原#2)
- **檔案**：新 `src/game/ui/gold.js`、`src/engine/renderer.js` L257、`title.js`、`hub.js`、`run.js`
- **現況**：`goldStr()='🪙'+n`，canvas 字型缺字 → □（存檔格、鐵匠鋪、確認框、公會、衣帽間…22 處）。
- **目標**：`goldLabel(x,y,n,{size,align,color,…})` 畫 `coin` sprite（art/core.js 8×9）＋數字，基線對齊、align 預量寬、回傳總寬；`goldStr()` 改回傳 `'N 金幣'`（句子內串接安全）；純繪製處改用 `goldLabel`（價格標、按鈕、持有列），句子類維持字串。
- **驗證**：全面板截圖零 □；`grep 🪙` 歸零。

### 3.1／3.2 衣帽間重構＋造型商店 (原#3、#4)
- **檔案**：`src/game/scenes/hub.js`、`src/game/content/skinshop.js`（重寫）、`content/characters.js`、`state.js`
- **現況**：入口直接英雄格 → 單英雄兩頁籤（我的造型／造型商店全列表）；4 格 30 分進貨、隱藏 45%、價格 450/900/3000、週特賣 0.8/0.9 含隱藏。
- **目標**：
  - 入口兩大鈕「👤 我的造型」／「🛍 造型商店」（`wardrobeView: null|'mine'|'shop'`，Esc 逐層返回）。
  - mine：英雄格 → 單英雄**僅已擁有**造型，點列＝套用。
  - shop：8 格（2×4 卡），池＝已解鎖角色 × 全 SKINS 的 (char,skin) 配對，排除已擁有與 `exclusive`；每格 1% 機率抽隱藏池；30 分刷新、重 roll 200 金。
  - 價格：`SKIN_TIER_PRICE={normal:1000, premium:3000}`；隱藏 `hiddenSkinPrice(id)`＝id 雜湊 → 20000–50000（5000 級距，穩定）；特賣每週 2 普通＋1 豪華 ×0.8，**隱藏永不打折**。
  - 存檔遷移：`META.skinShop.offers` 字串陣列 → `[{c,s}]`，loadMeta／ensure 加形狀防衛（舊形狀清空重 roll），不升 SAVE_VERSION。
  - `ownsSkin(meta,cid,skinId)` 助手（含 `META.flags.devEgg` 前向掛鉤給 6.4）。
- **驗證**：購買 1000／特賣 ×0.8 數學正確；stub 隨機驗 1% 隱藏卡（金框 + 2 萬+ 價格）；舊 offers 載入不炸、自動重 roll。

### 4.1 出擊角色卡 3×3 (原#6)
- **檔案**：`src/game/scenes/hub.js` `sortieLayout()` L610-634、`drawSortie()` L1239-1317
- **現況**：6 位/頁（2×3），卡內 sprite＋名稱＋起始武器字擠在一起，底部另有介紹塊。
- **目標**：9 位/頁（3×3）；刪除底部介紹塊；卡片左 38%＝sprite＋名稱、右 62%＝「起始武器：…」（金）＋效果敘述 ≤2 行（clip 防爆框）；鎖定（🔒＋價格／成就）與已選狀態保留；頁數重算。
- **驗證**：兩頁 × 3 種 uiScale 截圖無溢出。

### 4.2 無盡＝難度末階 (原#7)
- **檔案**：`src/game/scenes/hub.js`
- **現況**：右側獨立「模式」切換鈕；`endlessUnlocked = META.stats.clears > 0`（全域）。
- **目標**：移除 `modeBtn`/`selMode`；難度步進域＝`0(劇情)…maxDiff`，且 `META.levels.diff[bid] ≥ 1`（**該生態**通關過）時尾端多一階「♾ 無盡」（金字）；選中時敘述顯示無盡文案；出擊 `mode='endless'`、difficulty＝該關最高解鎖難度。排行榜排除註記沿用 R16。
- **驗證**：未通關生態無「無盡」階；通關過的生態步進到底出現；開局 `run.endless===true`。

### 5.1 稀有度四階色彩 (原#10)
- **檔案**：`src/game/progression.js` RARITY L75-93、`scenes/run.js` `drawChoice()` L2176-2205、`pickup.js` RARITY_RING
- **現況**：三階（普通灰／稀有紫／史詩金），卡底 TIERBG 與稀有度不對應，型別只有小字 sub。
- **目標**：單一真相源 `RARITY={1:普通 白#e6e9f2, 2:稀有 藍#58a6ff, 3:史詩 紫P.purpleL, 4:傳說 黃P.goldL}` 各帶深色卡底；`rarityOf(def,kind)`：合成／進化與 `exclusive` 裝備＝傳說；左上**型別 pill**（1·武器／2·被動／升級／合成／裝備／詛咒）取代裸數字、右上稀有度 pill；卡底＋頂條＋pill 同色系；詛咒保留紅框紅型別 pill。掃描一致化：升級三選一、鐵砧三選一、撿裝備、B 商店、結算 tooltip、地面光圈（白/藍/紫/黃/紅）。
- **驗證**：強制三卡（t1 武器/t2 被動/合成）截圖：白/藍/金卡底與 pill 一致；地面光圈同色系。

### 6.1–6.5 隱藏房專屬內容 (原#11)
- **檔案**：新 `src/game/content/hidden_rewards.js`、`content/hidden.js`、`content/unlocks.js`、`content/characters.js`、`scenes/run.js`
- **現況**：vault +400 金／archive 解鎖一項封存內容+120（不顯示是什麼）／relic 解鎖裝備+150／egg 88 金＋devEgg 旗標。
- **目標**：
  - vault → 飾品 **`hr_vault_sigil`「寶庫之印」**（tier4：goldMult×1.15、luck+0.3、pickupRange×1.15）＋1000 金。
  - archive → 武器 **`hr_archive_codex`「禁書迴響」**（tier3、cd 2.4−l*0.18s、2+⌊l/2⌋ 發追蹤符文彈、dmg 10+l*4、魔紫）＋300 金。
  - relic → 被動 **`hr_relic_heart`「聖物之心」**（每 40/35/30 殺自爆聖光 70 半徑、60+lv*30 傷、0.6s 無敵）＋300 金。
  - egg → 隱藏造型 **`devkid`「開發者·小妖」**（SKINS 全身 body override、`exclusive:true` 不進商店池、`ownsSkin` 讀 devEgg）＋888 金。
  - 三 id 入 `unlocks.js LOCKED`；`claim()` 回傳 `{text,icon,name}`；`drawHidden()` 揭示 UI 畫 48S 圖示＋名稱（金 18S）＋粒子爆光。
- **驗證**：fresh save claim archive → 升級池出現禁書迴響；寶庫之印穿脫精準回退；egg → 全英雄可裝開發者·小妖。

### 7.1–7.3 鑰匙與守護怪 (原#19)
- **檔案**：`scenes/run.js`、`pickup.js`、`enemy.js`、`art/core.js`、`balance.js`
- **現況**：2 隻守護怪開局即在 → 20 秒可拿鑰匙；鎖箱碰觸自動開。
- **目標**：
  - `GUARDIAN_DELAY_MIN=90`/`MAX=240`：`guardianPlan` 每隻隨機甦醒＋橫幅「⚔ 寶庫守護怪甦醒了——擊敗牠奪取鑰匙！」；`cleared` 後不再生成。
  - `GUARDIAN_HP_SCALE=7.5`/`GUARDIAN_DMG_SCALE=1.5`；`crown_elite` 皇冠 sprite＋金 glow＋金環脈衝（協作：guardian 旗標不入網路位元，同步金 tint 讓訪客見精英色）。
  - 鎖箱改 `world.vaultNear`＋互動鏈最高優先「【E】使用鑰匙開啟寶庫」脈衝提示 → E 開鎖（扣鑰匙、震屏、金環、橫幅「🔑 寶庫開啟！」）；無鑰匙維持「🔒 需要鑰匙」。
  - 替代鑰匙來源（機關）**本回合不做**。
- **驗證**：eval 跑 240s 守護怪皆於 [90,240] 甦醒；E 確認流全程動畫；20 秒拿鑰匙不再重現。

### 8.1–8.3 數值平衡 (原#20、#21)
- **檔案**：`balance.js`、`talents.js`、`facilities.js`、`abilities.js`、`events.js`、gen 手改 6 檔
- **現況**：換裝已精準回退（R16 9.4）；未封頂堆疊路徑＝鐵砧無限購、贊助者每隻獨立乘、被動 14 上限內無個別 cap；城鎮 `*_COST_MUL=2.0`、金收益 t_gold 6%/f_bank 5%/greed 1.25/midas 1.25…
- **目標**：
  - **8.1 稽核**：eval 腳本隨機 200 次穿脫斷言 stats byte-equal、forge 50 輪復原 — 結果記 changelog。
  - **8.2 微 nerf**：鐵砧遞減 `ANVIL_DIMINISH=0.85`（每類按本局已購次數遞減，desc 註明）；贊助者修剪 ~20%（berserker 1.35→1.28、midas 1.25→1.12、gambler 1.12→1.10 並修 desc 10%→5% 文不符碼、mage 1.12→1.10…）；**不加** DAMAGE_MULT 軟頂（讀點太散、破壞精準回退不變量）。
  - **8.3 經濟**：`TALENT/FACILITY/FORGE_LEVEL/FORGE_EFFECT_COST_MUL` 2.0→**3.0**（價格 ×1.5）；金收益砍半（t_gold 6→3%、f_bank 5→2.5%、greed 1.25→1.12、curse_greedpact 1.4→1.2、p_merchant +1200→+600、gen 4 處同比）；成長值修剪 ~25-30%（t_damage 2.5→2.0%、t_hp 10→7、t_xp 6→4%、f_shrine 7→5、f_altar 6→4、gen 同比）；desc 全同步；gen 手改列 changelog＋CLAUDE.md gotcha。
- **驗證**：D1/D3 全程 sim 仍可通關；天賦滿級總價 ≈ ×1.5；稽核綠。

### 9.1 城鎮進度門檻 (原#18)
- **檔案**：新 `src/game/content/town_gates.js`、`scenes/hub.js`
- **目標**：`TOWN_GATES`＋`gate(meta,key)`；閘門表（保守）：鍛造＝通關 1 生態／魂晶銀行＝公會 Rank 2／天賦第 3 排起＝公會 Rank 3／f_dojo Lv2＝通關 3 生態／f_arsenal Lv3＝通關 4 生態。共用 `drawLockedPanel(f,hint)`（🔒＋條件文＋目前進度 footer）；**只鎖新購買，永不剝奪已購等級**。
- **驗證**：fresh save 鍛造/銀行鎖定顯示條件；eval 調 guild.xp/diff 後解鎖；舊存檔無感。

### 10.1–10.2 教學 (原#8、#22)
- **檔案**：`scenes/hub.js`、`scenes/run.js`、`state.js`
- **目標**：
  - hub ESC 選單加「📖 新手指南」→ `triggerTutorial(force)` 重播蕾恩；run 暫停選單加「📖 介面一覽」→ 重開 hudTut。
  - 新旗標 `META.tutorialSortieDone`；蕾恩第 6 頁（通關解鎖下一生態／更高難度／無盡）；出擊面板首開 callout 導覽（關卡列／難度步進器／出擊鈕，點擊消失存旗標）；通關畫面文案補「下一難度已解鎖」。
- **驗證**：ESC 重播不受 tutorialDone 影響；首開出擊見導覽、once-only。

### 11.1 全面板 QA (原#23)
- `uiScale {0.6,1.0,1.5}` × 視窗 `{800×500,1280×720,1920×1080}` 矩陣截圖掃描全部 R17 觸及面板＋回歸面；檢查：無裁切/重疊、命中=繪製矩形、零 □、零 console error；加 D1 全程通關 sim＋無盡 10 分＋`__DBG.coopRoundTrip()`＋舊存檔 round-trip。
