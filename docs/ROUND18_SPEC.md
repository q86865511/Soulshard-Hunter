# Round 18 實作規格文件

> **狀態：📝 規格定稿 · 尚未實作（B0–B12 待開工）** — 本文件為 2026-06-11 經三路探索（核心系統／城鎮與長期進度／線上功能）＋逐項程式碼驗證後定稿的設計，可直接逐批實作。

> 本文件供 AI／開發者實作參考，**自含**：實作者只需本文件＋`CLAUDE.md` 即可動工，無需回溯設計對話。實作依批次（B0–B12）進行，**每批完成須在 `docs/changelog/ROUND18.md` 附條目**（內容＋驗證方式；B0 先建檔）。文中行號為定稿當下的參考值，以「函式名＋約略行號」為準——若行號漂移，認函式名。

> **協作約束（全程適用）**：
> - 除 **B6（伺服器 migration）** 外全為前端；B6 落地必須 `server/test` 全綠（CI push 即自動部署）。
> - **單人路徑不變式**：normal 模式的手感與數值不因本輪改變（無盡／每日是新分支）。
> - **co-op 零協定改動**：`src/game/net/protocol.js` 不動。詛咒只改 host 端純量（隨敵人 hp/dmg 自然流到 guest）；寵物僅本地玩家渲染；新增的暫停式選單一律照 `openEventChoice` 的 co-op 自動解決防衛模式。
> - **新內容一律手寫檔，不進 `src/game/content/gen/`／`src/art/gen/`**（re-integration 會還原 gen 檔——CLAUDE.md Gotchas）。
> - 所有數值旋鈕進 `src/game/balance.js`；新 stat 欄位必須先加進 `state.js makeBaseStats()`（否則 NaN）；新 META 形狀必須在 `DEFAULT_META` ＋ `loadMeta` 守衛回填（舊檔相容）。
> - sprite bake 是 **eager**：新藝術檔在 `main.js` 的 art import 區塊正常順序引入即可；角色註冊必須在 `characters.js` 的 eager bake 迴圈之前。

## Context

R1–R17 內容量已厚（15 英雄、31 武器、10 生態系、205 成就、多房城鎮、1–3 人共玩、雲端榜），但盤點出五個結構性缺口，玩家確認全部納入 R18：

1. **城鎮像在室內**——`world.js makeCamp()`（約 L585）是一個大牆箱內隔 3×3 房，玩家要求改成**真實戶外小鎮**（草地、樹木、水景、開闊感）。
2. **終局循環薄弱**——無盡模式只是「每 180s 刷一隻 Boss、威脅無上限」；無專屬機制、無里程碑、無排行榜（`bankRun` 甚至不上傳無盡場）。劇情＋公會階級約 150 小時後只剩刷金。
3. **5 個 R9 新生態系是半成品**——只有舊 5 生態有專屬最終 Boss；敵人池全域共用，10 個生態系打起來一樣。
4. **6 個孤兒英雄**——`art/heroes.js` 有完整身體美術（部分連專屬武器都映射好了）卻從未註冊可玩＝近乎零成本的新內容。
5. **無回流機制**——懸賞一次性領完即止、無每日／每週內容；NPC 純靜態、個人小屋空殼、後期金幣無沉沒處。

### 玩家定案決策

1. 五大方向**全部納入**本輪（戶外城鎮／無盡+賽季榜／生態補完+新英雄／每日每週挑戰／城鎮生活深化）。
2. 城鎮改**真實戶外風**：不必綁定地底/室內，要有自然環境（草樹水）；建築採**立面+門廊**制，不做室內場景。
3. 寵物採**最小裝飾版**（無戰力、僅跟隨視覺），不做養成。
4. 每日挑戰**不限次數、取最佳成績**上榜（無嘗試次數摩擦）。
5. NPC 好感獎勵**不給戰力**（只給金幣＋QoL）——遵守 R16/R17 的經濟紀律。

### 探索階段已驗證事實（設計依據）

- `FINAL_BOSS` 表（`scenes/run.js` L88）只含 crypt/cavern/frost/inferno/void；新 5 生態走 `spawnFinalBoss()`（約 L499）的隨機 fallback。
- `rotateTypes()`（約 L245）從 `Enemies.upTo(tierCap)` **全域池**抽敵，完全不看 `run.biomeId`；`evSurround`（約 L614）、`pickSpawnType`（約 L755）同理。
- 孤兒英雄為 `g_vanguard / g_arcanist / g_ranger / g_warden / g_revenant / g_stormcaller`（`art/heroes.js` L430 `HERO_MAP`：berserker/mage/scout/valkyrie/necromancer/stormpriest 六種身體）。
- `content/exclusives.js` L12-23 `CHAR_EXCLUSIVE`：g_vanguard→`x_bulwarkbreaker`、g_revenant→`x_soulleech` 已有專屬定義；**但 `g_arcanist→'x_starpiercer'` 是獵人(hunter)的武器**——g_arcanist 需新做，連同 g_ranger/g_warden/g_stormcaller 共 **4 把新專屬**。
- `src/game/content/gen/gen_characters.js` **本機存在但被 gitignore**（`.gitignore` L14），而 `gen/index.js` PACKS 仍列 `"gen_characters"`：部署上 import 靜默失敗（fault-isolated）＝15 英雄；本機卻會載入**舊 kit 並覆蓋**新註冊（registry 重複註冊＝覆蓋，`registry.js` L11）。B5 必須刪檔＋修 PACKS。
- 排行榜 UI **已有** 歷來/本週/今日 select（`net/ui.js openLeaderboard` L344），伺服器已支援 `?period=day|week`（`server.js` 約 L237）→ B8 只需加「模式」維度。
- `makeRng(seed)`（`engine/math.js` L35，mulberry32）可種子化 → 每日挑戰可決定論，**不必**把種子穿進 `maps.js`。
- 城鎮地塊：`FLOOR=0, WALL=1, VOID=2`；`solidTile = tile !== FLOOR` 且 **VOID 不渲染**（`world.js` L91、L508 一帶）→ 建築佔地＝VOID＋一張大型立面 decor 精靈，引擎零改動。`tileset.floor[]` 可超過 3 個變體（`floorVar` 直接索引）。
- `makeCamp()` 回傳 `{tw,th,tiles,floorVar,decor,rooms,tileset}`；`scenes/hub.js` 只消費 `rooms` 錨點（9 個 id：church/guild/blacksmith/clothing/achievements/personal/plaza/garden/market）＋地圖本體 → 戶外重寫只要**保住契約**就不動 hub 邏輯。
- `bankRun`（`state.js` 約 L355-369）目前**跳過上傳無盡場**；`run.js` 約 L1034 對所有模式把 `run.stage` 封頂在 `THREAT_CEIL=13`；伺服器 `runPlausibility` 拒絕 `stage>20`、`cleared && time<1000` → 三處都要 mode-aware 分支。
- 兩個 fake pool（`server/test/smoke.mjs` 內建＋`server/test/fakepool.mjs`）都靠字面 SQL 解析——**改 schema 兩邊都要教**，否則 dev launcher 直接 500。
- 核心英雄已有 `ranger`（疾風遊俠）與 `stormcaller`（風暴祭司）→ 孤兒 `g_ranger`/`g_stormcaller` 顯示名定為**翠林遊俠／雷霆喚使**以區隔。
- 起始武器 id 已驗證存在：`w_whip`（weapons.js L113）、`w_nova`（L129）、`w_soulbolt`/`w_orbit`/`w_aura`/`w_lightning`。
- co-op lobby 的 `newRun` 不帶 `mode` → 無盡/每日**到不了共玩**；新暫停選單仍照慣例加自動解決防衛。

---

## 分類總覽

### 批次依賴與並行軌道

| # | 批次 | 依賴 | 規模 |
|---|------|------|------|
| B0 | changelog 腳手架（`docs/changelog/ROUND18.md`） | — | S |
| B1 | 城鎮戶外改版 A：開放地圖＋戶外 tileset＋建築立面 | — | L |
| B2 | 城鎮戶外改版 B：水景／自然／氛圍 polish | B1 | M |
| B3 | 5 個新生態系專屬最終 Boss | — | L |
| B4 | 生態系敵群偏好＋5 新雜兵 | B3 | M |
| B5 | 6 新英雄＋4 新專屬武器 | — | M |
| B6 | 伺服器 migration：`runs.mode` / `challenge_key` | — | M |
| B7 | 無盡深度改造：詛咒抉擇＋里程碑＋上傳 | B6 | L |
| B8 | 排行榜模式切換 UI（標準/無盡/每日） | B6 | S |
| B9 | 每日挑戰＋週常懸賞 | B6、B8 | L |
| B10 | 個人小屋裝飾＋迷你寵物 | B1 | M |
| B11 | NPC 好感度（Lv4 禮物送 B10 裝飾） | B10 | M |
| B12 | 整合 QA＋文件（CLAUDE.md 計數更新） | 全部 | M |

四條軌道互相獨立、可並行；軌道內順序必守：**城鎮**（B1→B2→B10→B11）、**生態**（B3→B4；B5 隨時）、**線上終局**（B6→B7/B8→B9）、收尾 B12。
B5 的 g_stormcaller 解鎖條件讀 `stats.bestEndlessTime||0`（B7 的新 stat）——順序安全：B7 未落地前該角色單純維持鎖定。

### 一、城鎮戶外大改版（批次 B1、B2）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 1.1 | `makeCamp()` 重寫為開放戶外鎮（契約與 9 room id 不變） | `game/world.js` |
| 1.2 | 戶外 tileset（7 變體地面）＋樹冠林線邊界＋建築立面精靈 | 新 `art/town_outdoor.js`、`main.js` |
| 1.3 | 互動站／NPC 座標調整至門廊 | `scenes/hub.js` |
| 1.4 | 溪流＋橋、自然 decor、城鎮氛圍粒子 | `art/town_outdoor.js`、`world.js`、`scenes/hub.js` |

### 二、生態系補完（批次 B3、B4）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 2.1 | 5 個新生態專屬最終 Boss（b3_*） | 新 `content/bosses_biome.js`、`scenes/run.js`、`main.js` |
| 2.2 | 生態敵群偏好權重（4.0/0.35/1.0） | 新 `content/biome_tags.js`、`scenes/run.js`、`balance.js` |
| 2.3 | 5 隻補貧乏生態的新雜兵 | 新 `content/enemies_biome.js`、`main.js` |

### 三、新英雄（批次 B5）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 3.1 | 6 孤兒英雄轉正（kit＋解鎖條件） | `content/characters.js` |
| 3.2 | 4 新專屬武器＋g_arcanist 重映射 | `content/exclusives.js` |
| 3.3 | 清除 stale `gen_characters`（刪檔＋PACKS） | `content/gen/index.js`、刪 `content/gen/gen_characters.js` |

### 四、伺服器與排行榜（批次 B6、B8）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 4.1 | `runs.mode`/`challenge_key` schema＋索引 | `server/src/db.js` |
| 4.2 | 分模式 plausibility／score／榜單查詢 | `server/src/server.js` |
| 4.3 | 測試：兩個 fake pool＋約 8 條新 inject | `server/test/smoke.mjs`、`server/test/fakepool.mjs` |
| 4.4 | 排行榜 UI 加「模式」切換 | `net/ui.js` |

### 五、無盡模式深度改造（批次 B7）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 5.1 | 詛咒抉擇（每 300s 三選一、無限疊加） | 新 `content/curses.js`、`scenes/run.js`、`balance.js`、`main.js` |
| 5.2 | 無盡里程碑＋`bestEndlessTime`＋成就 +5 | `scenes/run.js`、`state.js`、`content/achievements.js` |
| 5.3 | 無盡上傳（stage 上限 99、bankRun 解除排除） | `scenes/run.js`、`state.js` |

### 六、每日挑戰與週常懸賞（批次 B9）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 6.1 | 每日挑戰（種子決定論＋12 詞綴池＋出擊入口） | 新 `content/daily.js`、`scenes/hub.js`、`scenes/run.js`、`state.js`、`balance.js` |
| 6.2 | 週常懸賞（ISO 週 9 取 3、快照差值進度） | `content/quests.js`、`scenes/hub.js`、`state.js` |

### 七、小屋裝飾與寵物（批次 B10）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 7.1 | 個人小屋裝飾 10 件（後期金幣沉沒） | 新 `content/room_decor.js`、`scenes/hub.js`、`state.js`、`art/town_outdoor.js` |
| 7.2 | 迷你寵物 3 隻（純裝飾跟隨） | 新 `content/pets.js`、新 `art/pets.js`、`scenes/hub.js`、`scenes/run.js`、`state.js` |

### 八、NPC 好感度（批次 B11）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 8.1 | 好感模型（每日首談 +1、等級 1/3/7/14/25） | `content/npcs.js`、`scenes/hub.js`、`state.js` |
| 8.2 | 好感獎勵（金幣＋Lv4 裝飾禮＋3 個 Lv5 QoL）＋成就 +3 | `content/npcs.js`、`content/achievements.js` |

### 九、整合 QA（批次 B12）
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 9.1 | 全面回歸＋舊檔 round-trip＋計數更新 | `CLAUDE.md`、`docs/ROUND18_SPEC.md`（狀態翻新） |

---

## 詳細規格

### B0 — changelog 腳手架（S）

建 `docs/changelog/ROUND18.md`：標題＋本輪一句話總覽＋批次條目骨架（B1–B12 待填）。之後每批落地補「做了什麼＋怎麼驗證」。

---

### B1 — 城鎮戶外改版 A：開放地圖＋戶外 tileset＋建築立面（L）

**目標**：把「大牆箱隔 9 房」換成真實戶外小鎮；**完整保留 `makeCamp()` 的回傳契約 `{tw,th,tiles,floorVar,decor,rooms,tileset}` 與全部 9 個 room id**，hub.js 的面板/NPC/出擊邏輯不動。

**檔案**：新 `src/art/town_outdoor.js`；`src/game/world.js`（重寫 `makeCamp()` 函式體，約 L574-653——簽名/export 不變）；`src/main.js`（art 區塊 +1 import，放 `art/town_floor.js` 之後）；`src/game/scenes/hub.js`（檔頭一帶的 station 座標區塊與 `NPC_POS` 微調至門廊）。

**設計決定**：
- **立面制，不做室內**。每個機能房＝一棟獨立建築外觀：碰撞佔地用 **VOID**（實心＋不渲染，已驗證 world.js L91/L508），視覺＝一張大型立面 decor 精靈（`town_fc_church / town_fc_guild / town_fc_smith / town_fc_wardrobe / town_fc_hall / town_fc_house` 約 64×64，底邊錨點）。互動站放**門廊**（立面前 1–2 格 FLOOR），E 開面板流程不變。decor 繪製在角色之下（既有城鎮行為），VOID 擋住走進精靈，深度排序永不破。
- **地面**：`tileset.floor` 擴為 7 變體 `[草, 草2, 花草, 土徑, 土徑2, 廣場石, 廣場石2]`，`floorVar` 0–6 直接索引（引擎迴圈零改動）。廣場＝石板圓盤（沿用 R6 石板語彙、暖色調）、土徑放射連到各建築地塊、其餘草地約 8% 開花變體。
- **邊界**：保留 1–2 格 WALL 環，但 `tileset.wall/wallTop` 重繪成**樹冠林線**（`town_treeline` / `town_treeline_top`）——R17 B14 的界外暗牆填充自動讀成漸遠森林。開闊感靠草色＋`hubScene.render` 一層 ~0.05 alpha 的暖日光 `uiRect` 疊色（免引擎改動）。
- **地圖放大到 60×46**（`CAMP` 常數）。`rooms` 錨點依新地塊佈局重算，**id 與 `{col,row,cx,cy,x0,y0,x1,y1}` 形狀不變**（hub.js 實際只讀 cx/cy，但保形以防萬一）。佈局建議：church 西北、guild 北、blacksmith 西、clothing 東、achievements 東北、personal 西南、plaza 正中、garden 南、market 東南。
- 既有道具精靈（`hub_lamp`/`hub_well`/`campfire`/`town_plant`/`town_barrel`/`town_gatepost`）在開放佈局中續用。

**Gotcha**：station 座標是 hub.js 內寫死的偏移——**必須同批**調到門廊，否則互動站漂在草地上；`town_outdoor.js` 的 eager bake 走 main.js 正常 import 順序即可（hub 進場才 makeCamp）；城鎮不走網路，零協定風險。

**驗證**：`__DBG.nav('hub')`＋`pump(60)`＋`POST /__shot` 截圖；`s.world.solidAt` 抽查（立面格 true／門廊 false）；迭代 `s.stations` 把英雄移到每站觸發 E、斷言 `s.panel` 逐一開啟；`camp.rooms` 9 個 id 齊全；`window.__GAME_ERROR__` 為 null。

### B2 — 城鎮戶外改版 B：水景／自然／氛圍（M）

**檔案**：`src/art/town_outdoor.js`、`src/game/world.js`（makeCamp 內）、`src/game/scenes/hub.js`。

**設計決定**：
- **溪流**沿南/東緣：VOID 地塊＋逐格 2 幀水面微光動畫 decor（`town_water`），**兩座 `town_bridge`** 過河（VOID＝真障礙，橋才有意義；若試玩嫌擋路，fallback 改可走的水色地面變體）。
- 散佈集：`town_tree`/`town_tree2`（沿邊界與花園 2–3 棵成簇）、`town_bush`、`town_fence_h/v` 框出建築地塊、`town_bench`、`town_flowerbed`、市集 `town_fc_stall` ×2＋木箱；花園加池畔＋既有 `hub_well`。
- 氛圍：hub 場景飄葉/花瓣粒子＋花園螢光點（hub 已持有 `world.particles`）。
- 每房間 hub 色調（R5b `ROOM_THEME`）錨點未變、自動沿用。

**Gotcha**：decor 迴圈**無視錐剔除**（world.js 約 L527）——decor 總量壓在 **250 以內**。

**驗證**：3 種 uiScale 截圖巡檢；decor 數量斷言；走過每座橋；`__GAME_ERROR__` null。

### B3 — 5 個新生態系專屬最終 Boss（L）

**目標**：verdant/desert/swamp/abyss/celestial 各得專屬多階段最終 Boss；`FINAL_BOSS` 補滿 10 生態。

**檔案**：新 `src/game/content/bosses_biome.js`（內容＋共置 `defineAnim` 美術，**手寫**——比照 `hidden_rewards.js` 模式）；`scenes/run.js` L88 `FINAL_BOSS` 表補 5 條；`main.js`（content 區塊 +1 import，放 `content/enemies.js` 之後）。

**設計**：全部 `boss:true`（enemy.js 自動三階段：66%/33% 換階徑向彈幕＋召喚），**weight: 0**（避免進雜兵池——run.js L361 註解慣例），36–40px 4 幀＋各 1–2 顆專屬彈幕精靈，數值以 `g_plagueheart`（hp 2200 / dmg 24 / scale 2.6，`gen_bosses_extra.js`）為基準微調：

| 生態 | id | 名稱／概念 | ai | 招牌設計 |
|---|---|---|---|---|
| verdant | `b3_thornking` | 百木之王·荊棘攝政（樹冠巨人） | charger | 衝撞（attack.range≈160）＋葉刃彈 `b3_leafblade`；hitStatus **bleed** |
| desert | `b3_sandpharaoh` | 流沙法老·安卡之影（黃金死靈王） | shooter | 寬扇砂彈 burst 10 / spread 0.5；hitStatus **slow**（流沙）；金色 tint、金幣掉落偏高 |
| swamp | `b3_bogmaw` | 腐沼之喉·巨蟾母（鼓脹毒蟾） | shooter | 高拋慢速毒涎 `b3_bogspit`（projLife 長 / projSpeed 慢 / burst 8）；hitStatus **poison** |
| abyss | `b3_leviathan` | 深淵利維坦（海溝巨蛇） | charger | 高速貫場衝鋒（attack.range≈220 / cooldown≈2.0）＋水壓彈環；knockbackResist 0.85 |
| celestial | `b3_seraphjudge` | 墮天審判·熾羽座天使（三對殘翼） | shooter | 聖羽飛鏢 burst 12 / projSpeed≈150；hitStatus **stun**（機率 0.25）；白金 tint |

附帶效益（零程式）：新 Boss 自動加入其他生態的小王池（`spawnMiniBoss` 過濾邏輯）與無盡 Boss 池。

**Gotcha**：精靈最後 `p.outline(P.ink)`；錨點 `[w/2, h-1]` 腳底對齊；tier 不超過 4（tier 5 是死神專屬慣例）。

**驗證**：逐生態 `newRun({biomeId})`、`s.run.time=1199` pump 到 `s.finalBoss` 出現，斷言 def id；強制血量驗 66%/33% 換階；擊殺觸發 `clearLevel`；`__DBG.gallery()` 檢視 5 隻精靈；挑一個新生態跑 D1 全 20 分模擬通關。

### B4 — 生態系敵群偏好＋5 新雜兵（M）

**目標**：每個生態的雜兵陣容向主題傾斜；任何生態任何威脅段**不空池**。

**檔案**：新 `src/game/content/biome_tags.js`（標籤表＋權重 helper——**必須在 gen/ 外**）；新 `src/game/content/enemies_biome.js`（5 新雜兵＋美術）；`scenes/run.js`（`rotateTypes` 約 L245、`evSurround` 約 L614 乘上權重）；`balance.js`（`BIOME_AFFINITY_BOOST: 4.0`、`BIOME_FOREIGN_DAMP: 0.35`）；`main.js` +1 import。

**權重公式**（biome_tags.js）：

```js
export const ENEMY_BIOMES = { /* enemyId: ['biomeId', ...] — 約 36/53 隻貼標 */ };
export function biomeWeight(def, biomeId) {
  const tags = ENEMY_BIOMES[def.id];
  if (!tags) return 1;                                  // 無標籤＝全域常駐（史萊姆/蝙蝠/s_* 特殊怪等）
  return tags.includes(biomeId) ? BALANCE.BIOME_AFFINITY_BOOST   // 4.0 同生態
                                : BALANCE.BIOME_FOREIGN_DAMP;    // 0.35 外來——永不為 0，池不會空
}
```

`rotateTypes` 把它乘進既有的權重函式（與遠程壓低係數並存），用 `this.run.biomeId`。

**貼標原則**（實作時掃描 `__DBG.enemyIds()` 逐隻定案）：crypt＝骷髏/食屍/死靈/亡靈騎士系；cavern＝蜘蛛/水晶系；frost＝`g_frost*`/冰系全套；inferno＝餘燼/熔岩系；void＝虛空/幽魂系；verdant＝狼/野豬/毒蛾＋新；desert＝蠍＋新；swamp＝毒蟾/毒蠻＋s_spitter 類＋新；abyss/celestial＝以新雜兵為核心＋少量水系/光系既有怪。史萊姆、蝙蝠、光靈、`s_*` 特殊怪維持無標籤全域。

**5 新雜兵**（tier 1–3，各補一個貧乏生態）：

| id | 名稱 | 生態 | ai | 特色 |
|---|---|---|---|---|
| `vr_thornling` | 荊棘妖精 | verdant | flyer | 小型快速騷擾 |
| `ds_duneburrower` | 沙行掘者 | desert | charger | 鑽沙突進 |
| `sw_mireleech` | 沼澤巨蛭 | swamp | chase | hitStatus poison |
| `ab_voltjelly` | 深淵電水母 | abyss | flyer | hitStatus slow |
| `ce_cherubim` | 雲端守靈 | celestial | shooter | 光彈 |

敵人 48→**53**。

**驗證**：逐生態開局後呼叫 `s.rotateTypes()` ×200 做 `activeTypes` 直方圖——同生態占比 ≥55%、外來 ≤15%；threat 1 與 13 均不空池；`world.spawnEnemy` 逐隻生成新怪＋渲染一次。

### B5 — 6 新英雄＋4 新專屬武器（M）

**目標**：孤兒身體轉正為可玩角色；剷除 stale gen 檔。

**檔案**：`content/characters.js`（在 eager bake 迴圈（約 L46）**之前**註冊——該檔已 self-import `art/heroes.js`，bake 順序已解）；`content/exclusives.js`（+4 個 `X({...})` 定義＋重映射）；`content/gen/index.js`（PACKS 移除 `"gen_characters"`）；**刪除**本機 `content/gen/gen_characters.js`（untracked，直接刪）；`content/achievements.js`（roster 家族補 `[21]` 階＝+1 成就）；`characters.js meetsCondition`（約 L167）支援 `bestEndlessTime` 條件。

**英雄 kit**（解鎖價對齊 R17 經濟；stat 欄位全部存在於 `makeBaseStats`）：

| id | 顯示名 | 定位／被動 | 起始武器 | 解鎖 |
|---|---|---|---|---|
| `g_vanguard` | 鐵血先鋒 | 坦：HP+50、減傷+4、擊退+25%、移速−8%、回復+0.4 | `w_whip` | 金幣 500 |
| `g_arcanist` | 奧術秘士 | 玻璃法師：HP−15、傷害+18%、範圍+30%、XP+15% | `w_nova` | 金幣 650 |
| `g_ranger` | 翠林遊俠 | 暴擊射手：暴擊率+12%、暴傷+0.3、射速+12%、HP−12 | `w_soulbolt` | `stats.bestTime ≥ 600`（單局存活 10 分） |
| `g_warden` | 霜鋼守望 | 環刃守護：HP+20、閃避+12%、投射+1、傷害−10% | `w_orbit` | 金幣 800 |
| `g_revenant` | 永夜亡魂 | 吸血光環：HP+25、吸血+6%、回復+0.6、範圍+15% | `w_aura` | `stats.bestStage ≥ 8`（威脅 8 級） |
| `g_stormcaller` | 雷霆喚使 | 雷暴彈幕：HP−20、投射+1、彈速+20%、傷害+10% | `w_lightning` | `stats.bestEndlessTime ≥ 1200`（無盡存活 20 分，B7 stat；條件式寫 `(s.bestEndlessTime||0) ≥ 1200` 保證 B7 前安全） |

顯示名已驗證不與核心英雄撞名（核心 ranger＝疾風遊俠、核心 stormcaller＝風暴祭司）。

**新專屬武器**（exclusives.js `X()` 模式，tier 3 / weight 0 / exclusive:true）：

| id | 名稱 | 主人 | weapon 概要 |
|---|---|---|---|
| `x_arcrift` | 奧術裂隙 | g_arcanist | dmg 24 / fireRate 1.5 / pierce 3 / projRadius 6——緩重穿透法彈 |
| `x_galeshot` | 疾風連弩 | g_ranger | dmg 7 / fireRate 7.0 / projCount 2——極速雙連射 |
| `x_bastionwave` | 堡壘震波 | g_warden | dmg 22 / fireRate 1.2 / projCount 4 / spread 0.8 / knockback 80 / status slow |
| `x_stormheart` | 雷暴核心 | g_stormcaller | dmg 12 / fireRate 3.0 / projCount 3 / projSpeed 330 |

`CHAR_EXCLUSIVE` 更新：`g_arcanist: 'x_arcrift'`（脫離獵人的 x_starpiercer）；保留 `g_vanguard: 'x_bulwarkbreaker'`、`g_revenant: 'x_soulleech'`；新增 g_ranger/g_warden/g_stormcaller 三條。專屬武器 8→**12**。

**相容自查（同批驗）**：造型以 `drawHeroBody` 重上色——6 隻身體都已註冊；隱藏全身造型本來就覆蓋；造型商店配對池自動納入新角；出擊 3×3 分頁承載 21 人（3 頁）。

**Gotcha（最重要）**：不刪 stale gen 檔＋不修 PACKS，gen pack 會在 characters.js 之後載入並**靜默覆蓋**新 kit（只在本機發生，部署正常——更難察覺）。`integrate.mjs` 重建 PACKS 時掃目錄，刪檔即永久。

**驗證**：`__DBG.reg()` 角色 15→21；新檔買 g_vanguard 出擊，斷言身體精靈≠兜帽 fallback；專屬只進本人鐵砧（強制 `rollGearChoice` 機率驗證）、不進獵人的；g_warden 換造型上色正常；舊檔載入後 roster 成就 reconcile 正確。

### B6 — 伺服器 migration（一次涵蓋無盡＋每日）（M）

**目標**：`runs` 表與 API 認得三種模式；舊 client／舊資料行為**位元級不變**。

**檔案**：`server/src/db.js`（`initSchema` 冪等 ALTER，比照既有 `guest_name` migration 模式）；`server/src/server.js`；`server/test/smoke.mjs` **與** `server/test/fakepool.mjs`（兩個 fake pool 都要教新 INSERT 參數數與新 WHERE 形狀）。

**Schema**：

```sql
ALTER TABLE runs ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'normal';  -- 'normal' | 'endless' | 'daily'
ALTER TABLE runs ADD COLUMN IF NOT EXISTS challenge_key text;                   -- 'YYYYMMDD'，僅 daily
CREATE INDEX IF NOT EXISTS runs_mode_score_idx ON runs (mode, score DESC);
CREATE INDEX IF NOT EXISTS runs_daily_idx ON runs (challenge_key, score DESC) WHERE challenge_key IS NOT NULL;
```

**`runSchema`（zod）**：加 `mode: z.enum(['normal','endless','daily']).optional()`（預設 normal）、`challenge_key: z.string().regex(/^\d{8}$/).optional().nullable()`；`stage` 上限 50→**99**（normal 的 20 上限由 plausibility 把守）。

**`computeScore`**：stage clamp 改 mode-aware——`clampInt(c.stage, 0, c.mode==='endless' ? 99 : 50)`；公式不變（kills×12 + stage×400 + time + diff×600 + reaper×5000）——無盡自然由 stage+time 主導。

**`runPlausibility` 分模式**：

```js
const ANTICHEAT = { /* 既有 */ KILL_BASE:80, MAX_KPS:30, MIN_CLEAR_TIME:1000, MAX_STAGE:20,
                    ENDLESS_MAX_TIME:14400, ENDLESS_MAX_STAGE:99 };
// kills 閘：全模式沿用（kills ≤ 80 + time_s*30*party）
if (mode === 'endless') {
  cleared 或 reaper → 422 'endless run cannot clear or reaper'
  time_s > 14400 → 422（4 小時硬上限）
  stage > min(99, 1 + ceil(time_s/90) + 2) → 422（THREAT_PERIOD=99，取 90 留餘裕）
} else if (mode === 'daily') {
  沿用 normal 全部閘（stage≤20、cleared&&time<1000 拒絕、reaper 須先 cleared）
  challenge_key 不在 {今天, 昨天}（Asia/Taipei）→ 422 'stale challenge key'
} else { /* normal：既有邏輯一字不動 */ }
```

`/api/runs` 與 `/api/runs/guest` 的 INSERT 補 `mode, challenge_key` 欄（challenge_key 僅 daily 寫入，餘 NULL）。

**榜單查詢**（`GET /api/leaderboard`）：加 `mode` 過濾、**預設 `'normal'`**（舊榜 byte-identical——舊資料行吃欄位 DEFAULT）；`mode==='daily'` 時再過濾 `challenge_key = $n`（參數 `q.key` 驗 `/^\d{8}$/`，預設今天）且忽略 difficulty 過濾；DISTINCT-ON 識別式不變 → 各模式天然「每人取最佳」。

**測試（新 inject 約 8 條）**：無盡合法上傳 200（`{mode:'endless',stage:40,time_s:3600,kills:9000,cleared:false}`）；無盡帶 cleared → 422；無盡 stage 60 / time 600 → 422；normal stage 40 仍 422（回歸）；daily 今日 key → 200；3 天前 key → 422；daily 缺 key → 422；榜單預設只回 normal、`?mode=endless` 只回無盡行、`?mode=daily&key=` 按 key 過濾。

**Gotcha**：兩個 fake pool 都要更新；CI push 即部署——本批必須 `node server/test/smoke.mjs`（92＋新）與 `social.smoke.mjs`（65）全綠才能上。

### B7 — 無盡模式深度改造（L）

**目標**：無盡變成可疊加的風險換報酬遞增局＋持久里程碑＋真排行榜資料源。

**檔案**：新 `src/game/content/curses.js`；`scenes/run.js`；`state.js`；`balance.js`；`content/achievements.js`；`main.js` +1 import。

**詛咒抉擇**：
- 節奏：每 **300s**（`BALANCE.CURSE_INTERVAL`，首次 5:00），僅無盡；若 Boss 在場（180s 倍數會撞 15:00）延後到 `!this.boss`。
- UI：暫停式 3 卡選單，複刻 `eventCardRects/drawEventChoice`（run.js 約 L393-435）改紫紅「詛咒」皮；新狀態 `this.curseChoice` 插入 `update()` 模態鏈、位置在 `eventChoice` 之後、**`this.choice`（升級）之前**——避免暫停期間排隊的升級選單雙開。
- **Co-op 防衛**：`if (this.coop) { 套用隨機一張; return; }`（照 `openEventChoice` 模式；lobby 實際到不了無盡，仍防衛）。
- 疊加模型：`run.curses[]` 記錄；場景持乘法累積器 `curseHpMul / curseDmgMul / curseSpdMul / curseCapAdd`，消費點＝`spawnTick` 的 hpScale/dmgScale（約 L744）、`spawnEndlessBoss`（約 L489）、`evSurround`。**零協定改動**（host 端純量，經敵人數值自然流到 guest）。
- HUD：無盡波次讀數旁加骷髏疊層小條（每層一顆），hover 列出已選詛咒名。

**詛咒池（12 條，三選一、詛咒與報酬成對生效、無限疊加）**：

| id | 名稱 | 詛咒 | 報酬 |
|---|---|---|---|
| `c_bloodtide` | 嗜血潮 | 敵人傷害 +15% | 立得 350 金幣 |
| `c_ironhide` | 鐵骨 | 敵人生命 +20% | +120 魂晶 |
| `c_gale` | 疾風群 | 敵人移速 +12% | 你的移速 +6% |
| `c_legion` | 增援 | 刷怪上限 +25% | 經驗獲取 +15% |
| `c_dull` | 鈍刃 | 你的傷害 −10% | 幸運 +0.25、拾取範圍 +40 |
| `c_brittle` | 脆甲 | 減傷 −2 | 每波 Boss 擊殺後回復 30% 生命 |
| `c_gamble` | 賭命 | 受到傷害 +20% | 金幣獲取 +25% |
| `c_tyrant` | 巨王 | Boss 生命 +30% | Boss 額外掉落一個寶箱 |
| `c_seal` | 禁療 | 治療效果 −50% | 生命上限 +40（立即回滿差額） |
| `c_blur` | 失準 | 暴擊率 −8% | 射速 +10% |
| `c_anchor` | 重壓 | 衝刺冷卻 +30% | 投射物 +1 |
| `c_soultax` | 蝕魂 | 每 30 秒失去 5% 當前生命 | 每次擊殺 +1 金幣 |

**里程碑**：`BALANCE.ENDLESS_MILESTONES = [900, 1200, 1500, 1800, 2400]`（秒）——橫幅＋局內獎勵金幣 300/500/800/1200/2000、魂晶 30/50/80/120/200。

**持久化**：新終身統計 `META.stats.bestEndlessTime`（`DEFAULT_META().stats` ＋ `loadMeta` 的數值欄回填清單，state.js 約 L142）；`bankRun` 在 `run.mode==='endless'` 時記錄。

**成就 +5**：`endless` 家族（無盡存活）門檻 `[600, 1200, 1800, 2400]` ＋ 隱藏 `endless_3600`（60 分）。`endless_1200` 同時是 g_stormcaller 的解鎖讀數來源（B5）。

**上傳**：run.js 約 L1034 的 stage 封頂改 `this.endless ? BALANCE.ENDLESS_STAGE_CAP(=99) : BALANCE.THREAT_CEIL`；`bankRun`（state.js 約 L355-369）payload 加 `mode: run.mode||'normal'`，**解除無盡不上傳的排除**（劇情難度 D0 維持排除）；訪客上傳路徑（`lastGuestRun`）自動帶 mode。

**驗證**：無盡 godmode pump 36000 幀（自動選 `curseChoice` 第 0 張）——每 5 分 ≥1 次詛咒、里程碑全觸發、`run.stage > 13`；`finishRun(false)` 後 `bestEndlessTime` 寫入、上傳 payload 含 mode；渲染一次驗 HUD 疊層條；`__DBG.coopRoundTrip()` 綠。

### B8 — 排行榜模式切換 UI（S）

**檔案**：`src/net/ui.js openLeaderboard`（約 L340）；`src/net/api.js`（`leaderboard()` 已透傳任意參數，免改）。

**設計**：在既有 biome/diff/period select 旁加 `mode` select `[['','標準'],['endless','無盡'],['daily','每日']]`；選每日時隱藏 diff＋period、顯示今日 key 日期標籤；選無盡時表頭「層」改顯示為波次/威脅語意。訪客上傳區塊不動（payload 由 B7/B9 自帶 mode）。

**驗證**：開 `tools/serve.mjs` ＋ `server/test/dev-fakedb.mjs`；以 fetch 各塞一筆 normal/endless 行；切換 mode select 行列互換；預設視圖只見 normal。

### B9 — 每日挑戰＋週常懸賞（L）

**檔案**：新 `src/game/content/daily.js`；`scenes/hub.js`（出擊面板入口＋公會週常區）；`scenes/run.js`（詞綴套用＋daily 防衛＋結算文案）；`state.js`（`META.daily`/`META.weekly`/`stats.dailyClears` 預設＋上傳）；`content/quests.js`（`WEEKLY_QUESTS`）；`balance.js`（`DAILY_*` 數值）；`content/achievements.js`（每日家族 +3）。

**每日挑戰**：
- **決定論**：`dateKey()`＝本地 `YYYYMMDD` → 字串 hash（FNV/xmur3 級即可）→ `makeRng(seed)` 依序決定：1 生態（**10 選 1、無視解鎖**——封閉展示局）、1 英雄（**全名單暫借**，`newRun({characterId})` 已接受任意 id）、3 詞綴（洗牌取 3、同類去重）。地圖佈局/掉落**刻意維持非決定論**——每日契約＝生態+英雄+詞綴（`makeRng` 能保證的部分），不把種子穿進 `maps.js`（侵入大、co-op 風險）。
- **次數**：不限次、**取最佳**（榜單 DISTINCT-ON 天然支援）。
- **計分**：固定以 `difficulty: 3` 上傳 `{mode:'daily', challenge_key: dateKey()}`，公平同條件。
- **進度隔離**：`clearLevel`（run.js 約 L518）在 `mode==='daily'` 時**跳過 `META.levels` 解鎖寫入**（橫幅改「每日挑戰完成！」）；暫借英雄不寫入 `META.unlocked`。本地紀錄 `META.daily = {key, best, plays}`；通關時 `stats.dailyClears++`。
- **入口**：出擊面板的出擊鈕上方一列金邊「📅 每日挑戰」（顯示今日生態/英雄/詞綴 icon＋個人最佳），點擊跳過選角選難直接開局。不開新建築（最低摩擦）。
- **成就 +3**：`daily` 家族以 `stats.dailyClears` 計，門檻 `[1, 7, 30]`。

**詞綴池（12 條，數值入 `BALANCE.DAILY_*`）**：

| id | 名稱 | 效果 |
|---|---|---|
| `m_swift` | 敵潮加速 | 敵人移速 +20% |
| `m_anemic` | 禁療領域 | 全治療效果 ×0.25 |
| `m_twin` | 雙生小王 | 每個小王時點生成 2 隻 |
| `m_greed` | 黃金狂潮 | 金幣 +50% |
| `m_glass` | 玻璃獵手 | 造成傷害 +30%、受到傷害 +30% |
| `m_horde` | 蜂群 | 刷怪上限 +40%、敵人生命 −15% |
| `m_elite` | 精英橫行 | 精英機率 ×3 |
| `m_fog` | 迷霧戰場 | 自動瞄準距離 −30%、暗角加深 |
| `m_tempo` | 急速戰場 | 玩家與敵人攻擊節奏 +15% |
| `m_volatile` | 自爆潮 | 12% 雜兵帶死亡爆炸 |
| `m_tax` | 戰場稅 | 商店價格 +50%、金幣 +80% |
| `m_frenzy` | 狂亂之王 | Boss 傷害 +25%、Boss 掉落翻倍 |

詞綴的玩家側在 `buildWorld` 套一次；敵側走與 B7 詛咒**共用**的場景累積器欄位（同一套消費點，實作共享）。

**週常懸賞**：
- `weekKey()`＝ISO 週（如 `'2026-W24'`）；`content/quests.js` 加 `WEEKLY_QUESTS` 池 **9 取 3**（`makeRng(hash(weekKey))`）。
- **進度＝終身統計差值**：`META.weekly = { key, base: {kills, bossKills, miniBossKills, clears, totalGold}, claims: {} }`——hub 進場或 `bankRun` 時若 `key !== weekKey()` 就以當前終身統計**重拍快照**並清空 claims；任務進度 `prog = stats[k] − base[k]`。
- 範例任務（獎勵 250–500 金＋公會聲望，走既有 `addGuildXp`）：週殺 800／週通關 2 場／週小王 6 隻／週賺 3000 金。
- `claimQuest` 分支：週常領取寫 `claims[id]=key`（非永久 `questClaims`）。公會面板加「本週懸賞」段（置於一般懸賞上方）＋重置倒數。
- **Gotcha**：週常 id 要通過 HUD 追蹤的 `isValidTrackId`（擴充之），跨週時循 loadMeta 的 prune 模式把已追蹤的過期週常清掉。

**驗證**：同日兩次 `dailyChallenge()` 結果全等、stub 跨日後不同；打完一場 daily 斷言 `META.levels` 未動、payload mode/key 正確、詞綴生效（如敵速抽查）；stub `weekKey` 驗跨週重拍快照＋claims 清空；舊檔載入 `META.daily/weekly` 守衛生成。

### B10 — 個人小屋裝飾＋迷你寵物（M）

**檔案**：新 `src/game/content/room_decor.js`（清單＋購買/擁有 helper）；新 `src/game/content/pets.js`（3 定義＋解鎖判定）；裝飾精靈附在 `art/town_outdoor.js`、新 `src/art/pets.js`；`scenes/hub.js`（personal 面板第三分頁「裝飾」格狀購買＋寵物裝備列；進房把已購裝飾注入 `this.world.decor`、購買當下即時注入）；`scenes/run.js`（寵物跟隨**僅本地玩家**、純渲染層）；`state.js`（`META.room={decor:{}}`、`META.pet=null` 預設＋守衛）。

**裝飾清單（10 件，固定 1:1 槽位於 B1 新小屋院落/室前，買了就出現）**：

| 名稱 | 價格 | 備註 |
|---|---|---|
| 盆栽花架 | 600 | |
| 絨毛地毯 | 800 | |
| 風景掛畫 | 1,000 | |
| 暖爐 | 1,200 | |
| 書牆 | 1,500 | |
| 獎盃櫃 | 2,000 | |
| 水晶吊燈 | 2,800 | |
| 魂晶魚缸 | 3,500 | |
| 小妖玩偶 | 1,888 | 需 `META.flags.devEgg` |
| 黃金王座 | 8,888 | |

合計約 24k 後期金幣沉沒；4 件可由 B11 好感 Lv4 免費贈送。購買走既有 `ask()` 確認模式。

**寵物（3 隻，純裝飾、無任何數值）**：

| 名稱 | 解鎖 |
|---|---|
| 史萊姆寶寶 | `stats.kills ≥ 10000` |
| 幽靈小貓 | 通關全 10 生態 |
| 小小妖 | `META.flags.devEgg` |

跟隨＝臨界阻尼 lerp 至主人身後約 18px＋上下浮動 bob；城鎮＋局內都跟；**僅本地玩家渲染**（snapshot/協定零改動，記為已知限制）。成就 +2（擁有第一隻寵物／集滿全部裝飾）。

**驗證**：eval 購買一件裝飾 → 本次進房與重進房都出現、金幣差額精準；裝備寵物 → 城鎮與局內跟隨；`coopRoundTrip` 不變；舊檔載入預設生成。

### B11 — NPC 好感度（M）

**檔案**：`content/npcs.js`（好感模型＋helper＋全 10 NPC 各 +2 條 `aff` 門檻話題）；`scenes/hub.js`（`openDialogue` 約 L258：加點＋升級禮包發放＋對話框標題愛心＋NPC 頭頂小徽記）；`state.js`（`META.npc.affinity = {}` 守衛）；`content/achievements.js`（+3）。

**模型**：`META.npc.affinity[id] = { pts, lastDay }`——**每 NPC 每日（本地日 key）首次對話 +1 pt**；等級門檻 **Lv1=1 / Lv2=3 / Lv3=7 / Lv4=14 / Lv5=25**。`npcScript(npc, meta)`（已 meta-aware）按 `t.aff ≤ level` 過濾話題；每 NPC 新增 2 條話題（`aff:2`、`aff:4`），盡量寫存檔感知的動態行。

**獎勵（升級自動發放＋toast；純金幣＋QoL，零戰力）**：

| 等級 | 獎勵 |
|---|---|
| Lv2 | 150 金幣 |
| Lv3 | 400 金幣 |
| Lv4 | 800 金幣＋**免費送一件對應裝飾**（每 NPC 固定一件，吃 B10 註冊表——如 小米→小妖玩偶、賈克→風景掛畫、莉雅→暖爐、奧德→獎盃櫃） |
| Lv5 | 1,500 金幣＋❤徽章＋專屬對話 |

僅 3 個 NPC 帶 Lv5 QoL 特典：**薇拉**＝造型商店重抽 200→100、**老潘**＝銀行額度 +200、**小鈴**＝每週可免費重抽一次週常懸賞（吃 B9）。

**成就 +3**：`bond_npc`「摯友」家族，以「最高好感等級」計，門檻 `[2, 4, 5]`。

**驗證**：同日對同一 NPC 講兩次只 +1；stub 跨日再 +1；強制 pts=14 → Lv4 toast＋裝飾到帳＋金幣差額精準；Lv2 後話題清單變多；舊檔載入 affinity 守衛生成。

### B12 — 整合 QA＋文件（M）

- **CLAUDE.md 計數與現況段更新**：英雄 15→**21**、敵人 48→**53**、專屬武器 8→**12**、成就 205→**219**（+5 無盡 +1 roster +3 好感 +2 寵物裝飾 +3 每日）、最終 Boss **10/10 生態專屬**；補一段 R18 摘要（沿用既有「Round N」段落格式）。
- 本文件狀態行翻成 ✅；`docs/changelog/ROUND18.md` 收尾總覽。
- 全面回歸（見下節驗證計畫的 B12 段）。

---

## 驗證計畫

**通用（每批）**：改完 reload（`preview_eval` 跑的是記憶體內模組——CLAUDE.md 慣例）→ `window.__GAME_ERROR__` 為 null；`__DBG.reg()` 計數符合預期；動到 `server/` 的批次跑 `node server/test/smoke.mjs` ＋ `node server/test/social.smoke.mjs` 全綠。headless 截圖走 `POST /__shot` → 讀 `_shot.png`；模擬用 godmode＋`s.update(1/60)` 手動 pump（rAF 受節流）。

**逐批重點**（細節已寫入各批）：
- B1/B2：站點/NPC 互動全開、碰撞抽查、9 room id、橋可走、decor < 250、3 種 uiScale 截圖。
- B3：5 生態最終 Boss id 斷言＋換階＋擊殺通關；1 場新生態 D1 全模擬。
- B4：`rotateTypes` ×200 直方圖（同生態 ≥55%／外來 ≤15%／不空池）。
- B5：角色 21、身體非 fallback、專屬武器歸屬正確、造型上色、舊檔 reconcile。
- B6：約 8 條新 inject 全綠＋預設榜 byte-identical 回歸。
- B7：36000 幀無盡模擬（詛咒節奏/里程碑/stage>13/bestEndlessTime/上傳 payload）＋`coopRoundTrip`。
- B8：fake-db 起服、塞行、mode 切換行列互換。
- B9：每日決定論（同日全等/跨日不同）、進度隔離（`META.levels` 不動）、週常跨週重置。
- B10/B11：購買/贈送金幣差額精準、重進房持久、寵物跟隨、好感日計數。
- **B12 總回歸**：R17 舊檔 round-trip（載入→所有新 META 形狀就位、無欄位被剝→存回）；fresh save 開機；`__DBG.coopRoundTrip()`＋`coopSilenceTest()`；D1＋D3 normal 全 20 分模擬通關＋20 分無盡（自動選詛咒）＋1 場每日；面板截圖矩陣（sortie/guild/personal/wardrobe/leaderboard × uiScale 0.6/1.0/1.5）；`git status` 確認 **gen/ 檔零異動**（B5 的刪檔除外）。

---

## 附錄：本輪不做（明確出界）

- **4+ 人共玩／PvP 競速**：與 host-authoritative relay 架構衝突，需伺服器端模擬（MULTIPLAYER_PLAN.md 工作項 D），另開回合評估。
- **幽靈重播／run trace**：需要決策日誌儲存層，成本高；先以無盡/每日榜滿足競技需求。
- **賽季重置／戰鬥通行證**：等每日/週常上線後觀察黏著再議。
- **寵物養成**（餵食/升級/技能）：本輪只做裝飾跟隨。
- **城鎮室內場景**：立面制已滿足需求，不加場景切換。
