# Round 20 — 末日遺鎮 2.5D 改版 × 局內事件/Boss 招式 × 最終 6 英雄

玩家回報的 7 個城鎮美術/體驗問題（置中/外圍單調/缺 2.5D/破圖黑底/元件太小/光圈進出/道路與碰撞）＋ 3 個遊戲內容需求（更多局內事件、Boss 招式多樣化、最後 6 名角色）。規劃見 plan 檔；批次 B1–B8。全 frontend；`server/` 不動；co-op 協議 byte 不變。

## B8 — 整合 QA＋計數收尾

- **20 分鐘 D3 全程通關模擬**（crypt、h4_bladedancer、4 把 L7 武器、godmode）：~78,000 幀分段 pump → `cleared:true`（t=1293s、威脅 14、9498 殺），**終 Boss 實戰施放 shock_lines＋wall_cage**（R20 招式在正式流程中觸發），全程零錯誤——R20 各批（事件/招式/英雄/城鎮）同場無互斥。
- `__DBG.coopRoundTrip()` 綠（snapshot 編解碼含新敵種照常）；既有存檔（SAVE_VERSION 2）正常載入。
- 計數：**27 角色 · 43 武器（31+6 初始+6 進化）· 51 裝備（18 專屬）· 63 敵人（+4 事件怪+魂晶巨柱）**；CLAUDE.md「Current state」同步更新。
- Headless 測試備忘（本輪三個「假陰性」根因，記入 CLAUDE.md gotchas）：①`hudTut` 首戰 2s 會重觸發暫停——測試迴圈內持續清；②反 AFK 直改 hp 繞過 takeDamage godmode——每幀回血；③`setScene` 是排隊制——之後要 `__DBG.pump(1)` 才能拿到新場景。

## B1 — 美術包：2.5D 牆、96px 門面、大型互動站、遺跡風室內道具

一個 5-agent Workflow（4 Fable 平行各產一檔 ＋ Sonnet 機械掃描）產出 **46 張新 sprite**，4 個新檔（手寫 `src/art/`，非 gen/；`main.js` 增 4 行 import）：

- **`town_ruin_walls.js`**（11）：`ruin_wall_face`/`face2` 16×24 南向牆面（2.5D 用）＋`ruin_wall_cap` 16×8；深度帶填充 `ruin_wall_trees`/`trees2`（枯林剪影）＋`ruin_wall_skyline`/`cliff`（遠景）；室內 `int_wall_face`/`int_wall_cap`；`ruin_void` 16×16（近黑裂淵磚，杜絕純黑破圖）；`ruin_doorglow` 16×16 三幀光圈貼花（B3 進出觸發格標記）。全為無 outline 可平鋪磚。
- **`town_ruin_facades2.js`**（6）：96×96 大門面 `ruin_fc2_church/guild/hall/smith/wardrobe/house`，anchor [48,95]、門一律置中於底邊（與門前光圈格對齊），取代 72×72 舊組（舊定義保留未刪）。
- **`town_ruin_stations2.js`**（7）：6 座大型室內互動站 `ruin_st_goddess`(40×52 2f)/`board`(44×48)/`furnace`(44×52 3f)/`mannequin`(44×50)/`trophy`(42×54)/`bed`(44×44)＋ **`boss_pillar`** 16×28 3f 魂石柱（B6 wall_cage 招式用，順帶產出）。
- **`town_ruin_interior.js`**（22）：`rint_*` 遺跡風室內道具，**尺寸/幀數/錨點與舊 `town_*` 逐一相同**（pew 18×12、stained 14×20、candles 10×14 3f、arch、desk、bench、lantern 2f、rack、mirror、weaponrack、grindstone、trophyshelf、bookshelf、rug、crate、barrel、mannequin、pillar、banner_gold、plant、chest2、lamp2 2f）——B2 在 makeInterior 換名即可 1:1 落位。

**驗證**：Sonnet 掃描 5 項全 PASS（4 檔 node --check 語法、全名稱零碰撞、規格清點逐張相符、import/Painter 方法/P.色票全存在、磚類零 outline）；reload 後零錯誤、動態 import `getSprite` 清點 46+4（B5 事件怪）張 **0 missing**。

## B2 — world.js：2.5D 渲染 + makeCamp v3 + makeInterior v2（問題 1,2,3,4,5,7）

全部以 **tileset 欄位 opt-in**——10 個戰鬥 biome 的 tileset 不含新欄位，渲染路徑逐 byte 走原分支。（本批前半由上個 session 的 Opus agent 完成、後半本 session 補齊。）

**渲染器（drawTiles/loadMap）**：
- **2.5D 牆（問題 3）**：`ts.wallFace/wallFace2/wallCap` 存在時，南鄰為 FLOOR 的 WALL 改畫 16×24 直立牆面（底對齊牆格底邊、上插 8px cap），hash 挑 face/face2 變體；其餘 WALL 畫平頂。室內亦同（`int_wall_face/cap`）。
- **外圍分層（問題 2）**：`ts.wallBands=[[band0],[band1],[band2]]` → loadMap 對 WALL 做多源 BFS 算 `wallDepth`（距 FLOOR 0/1/2 步、深處 clamp 2）；band0=瓦礫牆+牆面、band1=枯林剪影、band2=遠景天際/崖壁；出界帶沿用 band2＋隨距離遞減 alpha。**色調回調**：B1 原版 band 色（GLOOM/FARSKY/ABYSS）壓太黑、實機讀起來就是整片黑（正是問題 #2/#4）——`town_ruin_walls.js` 提亮為可讀的暮紫底＋更深一階的剪影，且修正 skyline 原本「天空比剪影更暗」的反置。
- **VOID 修黑（問題 4）**：`ts.voidTile` → VOID 磚畫 `ruin_void`（原本完全不畫 = 黑底主因）。
- **裝飾碰撞（問題 7）**：decor 支援 `solid:1|2`（錨格／錨格+左右各一）→ loadMap 建 `this.block` Uint8Array，`solidTile` 併入判定——**只擋玩家**（敵人 moveActor 走 phaseWalls 分支不受影響）；無 solid decor 的地圖 `block=null`，戰鬥/co-op 零變化。
- 回傳契約為**超集**：`{...原欄位, triggers:[{tx,ty,target}]}`，9 個 room id 不變；loadMap 存 `this.triggers`。

**makeCamp v3**：地圖 64×48→**72×54**（錨點按比例攤開）；道路 corridor 寬 2→3、repath 改 5 格寬戳記（外圈低機率＝毛邊）；門面換 **96×96 `ruin_fc2_*`**、footprint 拓為 5×4（cols cx±2 × rows cy-7..-4）＋門前通道（cx±1 × cy-3..cy）強制開通；每個門廊產生 **trigger 格＋`ruin_doorglow` 光圈貼花**（cy-1）；大型 prop 依 `SOLID_PROPS` 表上碰撞（樹/巨石/柱/雕像/噴泉/井/貨車/攤位/營火/圍欄；小型瓦礫/水晶/燈柱不擋）＋傳送門環/出生點/門廊/trigger 周邊保護區強制除旗＋**含 block 的 BFS 連通自檢**（不通則就近撤旗重試，最多 24 輪——美術保留、只掉碰撞）；tileset 補 wallFace/cap/voidTile/wallBands。

**makeInterior v2（問題 1,5）**：寬度全改**奇數**（church 21×18 / guild 23×16 / smith 19×14 / clothing 19×14 / hall 25×14 / personal 17×13）→ `cx=tw>>1` 成為真中軸，站點/地毯/門口/鏡像對完美置中（偶數寬時置中物永遠偏半格——問題 1 root cause）；門口改 **3 格**置中缺口；地毯改單欄置中（教堂 3 欄）；火把四角 **cx±3 全對稱**（原 cx-3/cx+2 不對稱）；`stationRow` 2→3（給 44-56px 大型站頭部空間）；擺飾全換 **`rint_*` 遺跡風**（尺寸/錨點與舊 town_* 1:1，位置照搬＋逐對鏡像校正）；家具依 `SOLID_INT` 上碰撞（南瓜椅/桌/架/櫃/柱…；蠟燭/燈籠/地毯/壁窗不擋）＋站點↔出口連通自檢；出口 trigger＋光圈；tileset 補 int_wall_face/cap/voidTile。

**驗證**：preview_eval 100×makeCamp 全過（9 錨點 FLOOR、6 trigger 皆 FLOOR、含 block 的 BFS 全連通）；6×makeInterior 全過（奇數寬、站點/出口真置中、含家具碰撞站點仍可達）；城鎮全景/牆緣特寫/教堂室內 `/__shot` 截圖目視驗收（外圍暮紫層次、2.5D 牆面、地毯置中、光圈到位）。

## B3 — hub.js：光圈進出門 + 大型互動站（問題 5,6）

- **踩格即進出**（玩家已確認方案）：update() 在 moveActor 後查 `world.triggers` 命中 → `enterDoor`；`loadArea` 設 `doorCd=0.7` 防回彈（入內出生於出口上一格、回鎮出生於門廊下方，皆不在光圈上）；對話/面板/選單開啟時已提前 return、不會誤傳送。**靠近大門按 E 照舊可用**（備援）。光圈上加脈動 glow＋靠近時「踏入光圈 進入/離開」提示；底部操作列文案同步更新。
- 室內站點 sprite 換 `ruin_st_*` 大型件（BUILDINGS 表）；互動半徑 34→40、點擊半徑 46→56、站名標籤錨點隨 sprite 高度自動上移（原邏輯吃 sprite.h）。
- `NPC_POS_INT` 對照新奇數寬室內與 solid 家具逐一覆核（全部落在空地）。

**驗證**：實測踩光圈 town→church→town 雙向切換、落點皆 FLOOR、冷卻期 50 幀站著不回彈；站點 sprite 確認為 ruin_st_goddess 等。

## B7 — 最終 6 英雄＋6 初始＋6 進化＋6 專屬（需求 10）

R18 式 Workflow（**3 Fable 平行創作 → Opus 對抗驗證**；中途因 session 額度中斷、以 `resumeFromRunId` 續跑——已完成的 agent 吃快取）。產出（手寫 content 檔，非 gen/，re-integrate 不會洗掉）：

- **`content/heroes_r20.js`**：6 名 `h4_*`（21→27），各含獨立 16×18×4f inline 身體（不撞 18 既有 archetype 剪影）＋C() 註冊：**聖盾騎士**（坦：+45HP/+4防/×0.9速；金幣 700）、**時詠術士**（×1.18 攻速/×1.12 彈速/−24HP；reach_stage_12）、**傀儡師**（+1 彈/+0.15 導引/×0.85 傷；bosses_50）、**守墓人**（5% 吸血/+0.5 回復；kills_20000）、**星喚少女**（×1.25 範圍/×1.15 傷/×0.85 攻速；endless_1800）、**劍舞者**（×1.12 速/+10% 閃避/+10% 暴擊/−24HP；金幣 900）。
- **`content/weapons_r20.js`**：6 把初始（tier2、入升級池）＋6 進化（weight0/evolved）＋12 icon＋3 fx sprite：審判戰錘→黎明聖印（迴旋重砸→三連砸+擊飛）、迴時刃→永劫迴環（迴力鐮月→四刃緩速）、提線傀儡→千絲傀儡王（佈署砲塔→4 傀儡穿透，update-driven 含 fmHaste）、掘魂鐮→萬魂收割（扇形斬+流血→360°）、星隕呼喚→隕星審判（預警天降→4 連隕石+燃燒）、劍刃圓舞→千刃輪舞（環刃→雙環反轉，fmHaste）。evolveReq＝vitality/velocity/overload/lifesteal/bigshot/haste（6 個皆既有且相異）。全傷害走 `r20Roll()`（吃 `PLAYER_DAMAGE_MULT`＋`CRIT_CAP` clamp——歷史 gen_weapons 漏洞點全堵）。
- **`exclusives.js`**：+6 把 `x_h4_*` 專屬（聖壁誓盾/時砂漏刻/傀儡心匣/亡者名冊/墜星羅盤/無影劍匣）＋CHAR_EXCLUSIVE 映射（12→18 把）；功率帶 30–92 dmg/s、落在既有 12 把的 30–104 帶內。
- Opus 驗證 8 項全 PASS（契約/stat 欄位安全/傷害公式/進化 req/解鎖條件（meetsCondition 原生支援全部 4 種、零擴充）/sprite-icon 零碰撞/數值帶/語法），唯一 blocker＝main.js import 接線（驗證者權限外）→ 本 session 補上 2 行。

**驗證**：`__DBG.reg()` → **27 角色 / 43 武器 / 51 裝備（18 專屬）/ 63 敵人**；6 名新英雄各實跑 15s——正確持有專屬初始武器、有輸出、stat 零 NaN；6 把進化型各實跑 7s 全部正常開火；出擊面板第 3 頁（27=整 3 頁）截圖正常。測試備忘：`setScene` 後場景切換是排隊制——headless 下要 `__DBG.pump(1)` 讓主迴圈套用，否則讀到舊場景（本批兩次「假陰性」皆此因）。

## B4 — 城鎮 QA 閘（問題 1–7 驗收）

- **Sprite 引用稽核**：50×makeCamp＋6×makeInterior 產出的全部 decor/tileset sprite 名（52 個唯一）對 registry 清點 → **0 missing**；`putXY('town_*'` 殘留 grep → 0。
- **10 biome 渲染掃描**：每個 biome 實開一局 pump 60 幀＋render → 全綠，且 `world.triggers=0 / block=null / wallDepth=null`（城鎮欄位零洩漏）。
- **Opus 對抗審查**（10 個探測方向，git diff 全讀）：**零確認 bug**。CLEAN 確認：戰鬥 biome 像素級不變（wallSprite/oob/skirt 路徑逐一比對）、無欄位名碰撞（decor.solid/triggers 全 codebase 唯一）、co-op `serializeMap` 不帶 solid/triggers（城鎮本就不過線）、6 棟 trigger 格經所有 pass 後恆為 FLOOR（rift 重切/footprint 還原範圍皆驗算）、6 室內以新奇數寬手算 carve mask 全部成立、keeper NPC 落點全避開 solid 家具、wallDepth BFS 與 VOID 互斥、hash5 `>>>0` 處理負座標、效能（BFS 僅 loadMap、sprite 查找每幀一次）。2 處過時註解已修。
- **驗收截圖**：城鎮全景（外圍暮紫分層、無黑洞）、牆緣特寫（2.5D 牆面+頂蓋）、教堂（3 寬地毯真置中＋對稱）、鐵匠舖（大型爐站置中）、門廊（96px 門面＋光圈＋提示）。
- 玩家問題 1–7 對照：1 置中（奇數寬+鏡像審核）✓ 2 外圍分層（3 深度帶+色調回調）✓ 3 2.5D（牆面+頂蓋）✓ 4 破圖黑底（voidTile+band 提亮+0 missing）✓ 5 加大（96px 門面+44-56px 站+半徑放大）✓ 6 光圈進出（踩格傳送+E 備援）✓ 7 寬路+裝飾碰撞（3 寬 carve+5 寬鋪面+solid 系統）✓

## B6 — 資料驅動 Boss 招式（需求 9）

Boss 原本幾乎只有彈幕。新增 **4 個具名招式**（`src/game/content/boss_moves.js` 的 `BOSS_MOVES` 註冊表），`enemy.js` 在 boss 更新中呼叫 `bossMoveTick()`——招式進行中**接管身體**（移動＋自帶命中判定），一般 AI/接觸傷害跳過；冷卻排程＋階段閘（minPhase）都在註冊表。

1. **`leap_slam` 跳躍重砸**（cd 9, P0）：0.5s 蓄力 → 0.9s 滯空（無敵、落點於**起跳瞬間鎖定**＝滯空期是閃避窗）→ 落地 AoE＋擊飛。滯空以新 `e.mvLift` 像素抬升繪製（影子留在地面；原 `hop` 是 0.6s 擊飛計時器、振幅僅 7px，不可重用）。
2. **`wall_cage` 魂柱囚籠**（cd 13, P1+）：0.8s 詠唱（追蹤玩家）→ 在玩家周圍 86px 環生成 **9-1 根 `boss_pillar`**（隨機留 1 缺口）。**不改 tile**（guest 地圖來自 runstart 一次性快照）——柱子是普通敵人實體（`en` 頻道原生同步、可擊破＝反制），其 `def.tick` 做壽命衰減（8s 後靜默碎裂，無掉落）＋**只擋玩家**的圓形推出（經 `moveActor`，不會被推進牆；敵人本就 phaseWalls，與 R16 設計一致）。
3. **`charge_combo` 三連衝撞**（cd 11, P0）：每段 0.35s beam 直線預警（瞄準持續追蹤）→ 0.42s 衝刺（每段每玩家至多命中一次）×3 → 0.7s 硬直懲罰窗。
4. **`shock_lines` 地裂衝擊波**（cd 10, P0）：0.6s 詠唱 → 4+phase 條放射傷害前沿以 230px/s 外推至 260px（beam 段＋ember 粒子；每條每玩家至多一次）。

**接線**：`WIRE` 映射**集中在 boss_moves.js**、由 `bossMoveTick` 以 boss id 懶查——gen 檔 boss 定義**零改動**（re-run integrate.mjs 不會洗掉接線）。10 隻終 Boss 各 2 招（主題配對）；3 隻 miniboss 池專屬（voidsovereign/magmacolossus/frostmonarch）各 1 招。終 Boss 在他鄉客串 miniboss 時保留全套（feature）。`phaseShift` 會**中斷進行中的招式**（含滯空，`mvLift` 歸零）＋至少 1.5s 喘息。全部數值在 `BALANCE.BOSSMOVE_*`（17 個旋鈕）。

**`enemy.js` 連帶**：新通用 `def.tick(e,world,dt)` 鉤（目前僅 boss_pillar 用）；繪製抬升 `mvLift` 併入 hopY。

**驗證**：13 隻接線 Boss 各以 hpScale 500 召喚、強推三階段——每隻的每招都觸發且完成（柱環 8 根、lift 46px、連衝/震波命中），零錯誤；柱子推出測試（玩家被解析到柱體外 14.1px）＋壽命碎裂（dead+processed 靜默）；`__DBG.coopRoundTrip()` 綠。測試備忘：headless 連續模擬要同時清 `hudTut`（會在首戰 2s 重觸發）並每幀回血（**反 AFK 流失直改 hp、繞過 takeDamage godmode**，靜止 4 分鐘會死）。

## B5 — 局內新事件 ×4（需求 8）

現有事件僅蘑菇雷／Higgs 轟炸／魂牢三種。本批加入四種，全部以**敵人實體**實作（經既有 `en` 快照頻道原生同步給 co-op guest；預警線走 `world.addBeam` 的 `bm` 頻道）——協議零變更。

**新檔 `src/game/content/event_mobs.js`**（手寫，非 gen/；`main.js` 增 import）：4 個敵人定義＋inline 像素動畫。全部註冊為 **tier 9 + weight 0**，而 rotateTypes／魂牢池／boss 小怪池都經 `Enemies.upTo(≤4)` 選取 → 事件怪**永不**漏入一般刷怪池，只由事件碼點名生成。

1. **自爆狂徒 (evt_bomber)** — 自爆小隊：6+threat/2 隻快速衝鋒，**逐實例** `deathBlast`（隨難度/威脅縮放，def 上不掛、避免與 m_volatile 疊加）＋ 6s±20% 強制引信；引信 <2s 加速閃白警告。
2. **魂晶詭雷 (evt_bomb)** — 炸彈人式：5–8 顆**格點對齊**定點雷（永不出現在腳下 24px 內），2.5s 引信後爆出**十字衝擊波**（4 臂 × 3 格步進 AoE，傷敵也傷玩家——軸線半格內判定）；最後 1 秒以 beam 畫十字預警；**可射爆提前引爆**（打掉的正常掉落＋十字照炸，可當工具用）。
3. **滾岩魔 (evt_boulder)** — 滾石突進：3–5 條直線車道，1s beam 預警後巨岩以 150px/s 定軌輾過（run.js 手動積分位置、清零 AI/擊退漂移），接觸傷害 26 基底；6s 或出界自動碎裂（**靜默消散**：dead+processed 同設 → 不掉落、不計擊殺）。tanky（hp 400）但可擊碎換掉落。
4. **寶藏哥布林 (evt_goblin)** — 生成即 `fleeing`（沿用竊賊 ×1.7 逃逸 AI），12s 內攔截 → `dropLoot` 金幣雨（def gold 150）＋**保底裝備**（`rollEquipment(2+dropQuality)`）；逾時遁走（靜默消散，無掉落）。

**`run.js`**：`triggerEvent` 改為 `BALANCE.EVENT_WEIGHTS` 權重表（mushrooms 24／higgs 20／surround 16／bombers 12／bombs 12／boulders 10／goblin 6；威脅閘 bombers≥2、bombs≥3、boulders≥4；進行中的 higgs/surround/goblin 權重歸零防疊加）；新事件狀態於 init 與終 Boss 降臨時重置（與舊事件同步清空追蹤）。`updateEvents`/`drawEvents` 各加對應分支。

**`balance.js`**：新增 `EVENT_WEIGHTS` ＋ `EVT_BOMBER_*`／`EVT_BOMB_*`／`EVT_BOULDER_*`／`EVT_GOBLIN_LIFE` 旋鈕（全數值集中於此）。

**`enemy.js` 連帶修正**：接觸傷害增加 `this.damage > 0` 閘——0 傷害實體（evt_bomb）原本會以 `takeDamage(0)` 觸發保底 1 傷＋ **0.7s 無敵幀**，站在雷上可刷出近乎永動的 i-frame（exploit），現在 0 傷害敵人完全不觸發接觸。

**驗證**（`node tools/serve.mjs` ＋ preview_eval 手動 pump）：威脅 3/8/13 各強制觸發四事件 → 生成數正確、25s 後全部追蹤陣列歸零、零錯誤；射爆詭雷 → 提前移除＋十字 beam 出現；擊殺哥布林 → 保底裝備落地；滾岩接觸 → 實際扣血；`__DBG.coopRoundTrip()` 全綠（snapshot 編解碼含事件怪照常）。註：headless 測試時 R16 的 `hudTut` 首次教學會凍結 run.update——測試前設 `s.hudTut=false`（非本批 bug）。
