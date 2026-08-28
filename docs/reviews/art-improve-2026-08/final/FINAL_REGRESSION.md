# R28 美術輪 W5-1 — 最終回歸取證報告

- 取證對象：`claude/soulshard-hunter-art-lead-5d399b` @ `c5b7b78`（W0–W4 全部完成後的狀態）
- 取證者：W5-1 代理。**未修改任何 `src/`、`tools/`、`test/` 檔案**（`git status --short src/ tools/ test/` 為空）；未 commit / push。
- 所有截圖與模擬圖在本目錄（`docs/reviews/art-improve-2026-08/final/`），共 98 張：
  `stress/`10 · `stress2/`10 · `res/`12 · `cvd/`29 · `sheets/`3 · `cmp/`6 · `grey/`1 · `bossmoves/`8 · `panels/`5 · `occl/`8 · `zoom/`6
- 取證工具：`tools/_wf_evidence.mjs`（sheets / stress，原樣使用未改）＋本輪自寫的 scratchpad 腳本
  （多解析度、CVD、Boss 招式、銀行/結算、遮擋量測；全部寫在 session scratchpad，未落專案目錄）。

## 判定總表

| # | 項目 | 判定 | 主要證據 |
|---|---|---|---|
| 1 | 10 生態壓力景（50+ 敵 · 彈幕 · Boss 預警） | **通過（附 2 項觀察）** | `stress2/`（10 張，61 敵/9 精英/真 Boss/26 拾取物/3 家族光束）＋`stress/`（工具原樣 10 張） |
| 2 | 四解析度 UI（含 2560×1440 全高） | **通過** | `res/`（12 張；2560×1440 canvas 實測 2560×1440） |
| 3 | 三色覺模擬（protan/deutan/tritan） | **通過（1 項邊際、1 項生態例外）** | `cvd/`（29 張）＋光束/血條對比度量測 |
| 4 | contact sheets 全部重產、missing 全 [] | **通過** | `sheets/`：characters 27 / enemies 63 / icons 219，`missing: []` ×3 |
| 5 | 灰階十格互辨 ≥8/10 | **通過（10/10）** | `grey/greyscale-10biomes-320x180.png` |
| 6 | frontend smoke 全過 | **通過** | 59/59 assertions，exit 0，無 `__GAME_ERROR__` |
| 7 | co-op 三自測全過 | **通過** | `coopRoundTrip` / `coopSilenceTest` / `coopBossSyncTest` 全綠 |
| 8 | 原審核未能驗證的三項補做 | **通過（附 1 項可讀性缺陷）** | `bossmoves/`（4 招 ×2 幀）·`panels/bank-*`·`panels/result-clear-*`/`result-death-*` |
| 9 | contact sheet 前後對照 | **通過（附 ART-01 未收口說明）** | `cmp/`（3 張並排 ＋ 3 張 3× 放大條） |

---

## 1. 10 生態壓力景 — 通過（附 2 項觀察）

**證據**：`stress2/stress2-<biome>-1280x720.png`（10 張）。每張場景組成（腳本回報值，10 張全同）：
存活敵人 **61**（其中 9 隻 elite）＋該生態**真·終 Boss** 1 隻＋地面拾取物 26 ＋飛行彈幕 20
＋三條同長度平行光束（boss `#ff5a3c` / event `#ffc23c` / player `#9adcff`），全部 `__GAME_ERROR__` 為 null。

> 註：工具版 `stress/`（`tools/_wf_evidence.mjs stress`）在 `spawnEnemy` 後只跑 1 幀就截圖，
> 60 隻敵人全部停在 spawn-in telegraph（畫面上是紅色小光點而非敵人身體），**不足以驗證密集可讀性**。
> 兩批都保留：`stress/` 是工具原樣輸出，`stress2/` 是補跑 45 幀讓群體成形後的版本，逐項目視以 `stress2/` 為準。

**玩家可定位**：通過。玩家腳下是唯一的冷白地面光池＋白色橢圓 ring（`drawPlayerTopRing`，畫在光束層之上），
10 個生態全部是畫面中最亮的單點。`zoom/zoom-player-in-swarm-3x.png` 可見在 61 隻怪包夾下玩家仍是唯一有
「白環＋冷白光池」的單位；精英則是金色描邊，兩種識別語彙不衝突。
- 觀察 1-a（低）：**cavern / frost / celestial** 的生態底色本身偏冷藍白，玩家冷白光池的相對優勢最小
  （celestial 場上還有白色雲朵 decal 與玩家光池近似）；仍可定位，靠的是「白環」這個形狀而非顏色。

**Boss 預警為紅橙族且線寬有別**：通過，且**可量測**。在 `stress2-crypt` 上以像素列量測三條光束
（背景中位亮度 41.8）：
| 家族 | 顏色 | 高於背景的像素列數 | 白熱核心 | 箭頭 |
|---|---|---|---|---|
| boss | `#ff5a3c` | **6 列**（y69–74） | 2 列 | 最大 |
| event | `#ffc23c` | 4 列（y124–127） | 2 列 | 中 |
| player | `#9adcff` | 4 列（y178–181） | 2 列 | 最小 |
`zoom/zoom-beam-ladder-arrowheads-4x.png`（4× 放大）目視即可分辨三級線寬與三級箭頭大小；
boss 線明顯最粗、箭頭最大。event 與 player 的 4 px vs 3 px 在單一靜態幀的像素量測上被反鋸齒抹平
（同為 4 列），實際靠**顏色＋箭頭尺寸**分辨——這在色覺模擬下仍成立（見第 3 節）。

**拾取物不被吞**：通過（依 ART_SPEC 的分層設計判定），但附客觀數字。
`world.js:893` 明文把 pickups 移到 layer 3（**所有 actor 之下**），註解寫「loot 不是你必須先讀的東西，讓給身體」。
我用同一幀渲染四次（有/無拾取物 × 有/無敵人）差分量測每個拾取物的**可見墨水比例**
（證據 `occl/crypt-*.png`、`occl/desert-*.png`）：

| 生態 | 完全可見(≥93%) | 部分遮蔽 | 完全被吞(≤1%) | 總可見墨水 |
|---|---|---|---|---|
| crypt | 6/12 | 2/12（18%、68%） | 4/12 | 59.8% |
| desert | 6/12 | 3/12（21%、39%、69%） | 3/12 | 61.0% |

即「61 隻怪擠在半徑 34–110 px 內」這種人工極端密度下，約 1/3 的地面掉落會被身體完全蓋住。
判定為**通過**而非退回，理由有三：(a) 這是 ART_SPEC 2.1 明示的分層取捨，非退化；
(b) 拾取物有磁吸（`pickup.js:85` `pickupRange` + ≥240 px/s 吸附），不需被看見也會進袋；
(c) 敵人在動，遮蔽是瞬時的。若之後要改判準，本節數字可當基線。

**無大面積規律紋**：通過，且可量測。地磚在螢幕上的週期是 16 px × zoom 4 = **64 px**。
對每張圖的地板帶（y560–700, x180–640）算自相關：
| 生態 | r@64px(x) | r@32px | r@17px |
|---|---|---|---|
| crypt | 0.215 | 0.353 | 0.445 |
| desert | 0.515 | 0.687 | 0.777 |
| celestial | 0.537 | 0.630 | 0.652 |
（完整 10 生態見下方附錄）**10 個生態全部沒有在 64 px 出現峰值**——r@64 一律**低於** r@32 與 r@17，
代表相關性來自「地面平滑」而不是「每格重複」。desert / celestial 的整體相關最高（地板本身最平、細節最少），
但同樣沒有 tile-lock 峰值。目視亦無帶狀重複；`frost` 的兩塊亮綠方塊是**危害地磚（hazard）**，
足跡必須與 tile 對齊，屬機能性硬邊，非裝飾平鋪（`zoom/zoom-frost-green-blocks-3x.png`）。
- 觀察 1-b（低）：**verdant** 是敵我對比最弱的生態（大量綠色敵人站在綠地上），
  靠的是深色 outline 與 rim；在 10 張裡最吃力，但沒有到讀不出來。

## 2. 四解析度 UI — 通過

**證據**：`res/{title,sortie,hud}-{1280x720,1366x768,1920x1080,2560x1440}.png`（12 張）。
每次都在 headless 顯式呼叫 `renderer.resize()`（避開 `view.W=0` 坑），腳本回報：

| viewport | canvas | view.W×H | window.inner | zoom | uiScale | `__GAME_ERROR__` |
|---|---|---|---|---:|---:|---|
| 1280×720 | 1280×720 | 1280×720 | 1280×720 | 4 | 1.059 | null |
| 1366×768 | 1366×768 | 1366×768 | 1366×768 | 4 | 1.129 | null |
| 1920×1080 | 1920×1080 | 1920×1080 | 1920×1080 | 4 | 1.588 | null |
| **2560×1440** | **2560×1440** | **2560×1440** | **2560×1440** | 5 | 2.118 | null |

2560×1440 是**真正的全高**（`canvas.height == window.innerHeight == 1440`，deviceScaleFactor 1），
不是裁切或縮放後的近似；`res/title-2560x1440.png` / `sortie-2560x1440.png` / `hud-2560x1440.png` 三張都完整到底邊。

**安全區**（中央 60% 欄帶內、亮度 >190 的內容距各邊距離，佔該邊比例）：

| 畫面 | 1280×720 | 1366×768 | 1920×1080 | 2560×1440 |
|---|---|---|---|---|
| title 上 / 下 | 12.08% / 10.97% | 11.98% / 10.94% | 12.04% / 10.93% | 12.01% / **11.04%** |
| sortie 上 / 下 | 3.61% / 5.69% | 3.52% / 5.60% | 3.52% / 5.65% | 3.54% / **5.62%** |

四段數值到小數點後兩位幾乎相同 → 版面是**純比例縮放**，不存在只在某解析度破版的路徑。
無溢框、無截斷。字級：1280×720 下角色卡內文最小（約 8–9 px 等寬），仍可讀（`res/sortie-1280x720.png`）。
- 觀察 2-a（低）：sortie 上緣 3.5% 是**新手引導標題**（「出擊指南」浮層）而非面板本體，
  面板本體標題在 ~11%。桌面瀏覽器無 overscan，實務上不成問題，但若日後要對 5% 安全區做硬性判準，這行會踩線。
- 觀察 2-b（低，沿用 gate 6-b，**仍未修**）：角色卡描述以單字元推進換行，
  在四個解析度都會把數字拆行——2560×1440 下可見「但移速 -10 / %」與「暴傷 +0. / 3」
  （`res/sortie-2560x1440.png` 右上、右下卡）。失敗情境：掃視時把「暴傷 +0.3」誤讀成「+0」。

## 3. 三色覺模擬 — 通過（1 項邊際、1 項生態例外）

**方法**：Viénot–Brettel–Mollon (1999) 標準 LMS 二色覺矩陣，於**線性 RGB**空間運算
（sRGB 解碼 → RGB→LMS → 二色覺投影 → LMS→RGB → sRGB 編碼），非近似的 sRGB 直接矩陣。
**來源**：`stress2-crypt`、`stress2-celestial`（題目指定）＋`sortie`、`run HUD`（題目指定），
另補 `stress2-desert`（最亮生態，最壞情況）、`panels/choice`（稀有度真正出現的介面）、`panels/result-clear`。
輸出 `cvd/`（每張 protan/deutan/tritan/greyscale 四版，共 29 檔）。

**玩家**：三種色覺下都仍是畫面最亮的單點（冷白光池在 protan/deutan 下退成白、在 tritan 下退成白偏藍），
加上白色橢圓 ring 這個**形狀**線索 → 通過。最壞情況是 `cvd/stress-celestial-protanopia.png`
（亮生態＋白雲 decal），此時靠 ring 的形狀而非亮度。

**Boss 預警**：通過，但**顏色線索在 protan/deutan 下實質消失**——
`cvd/stress-crypt-deuteranopia.png` 裡 boss 的紅橙與 event 的琥珀塌縮成同一族黃，
**只剩線寬與箭頭大小可分**。這正是 ART_SPEC §3 線寬階梯存在的理由，設計成立。
量測（光束彩色肩部 vs 地板的亮度對比）：

| 場景 | boss | event | player |
|---|---|---|---|
| crypt 正常 | 4.02:1 | 6.41:1 | 3.28:1 |
| crypt protan | **2.90:1** | 5.85:1 | 3.40:1 |
| crypt tritan | 6.46:1 | 7.53:1 | 3.24:1 |
| celestial 正常 | 1.48:1 | 2.67:1 | 1.72:1 |
| celestial protan | **1.05:1** | 2.39:1 | 1.76:1 |

celestial 的彩色肩部幾乎沒有亮度差，但**白熱核心**把它救回來：celestial 四種色覺下核心對比
**3.53–4.05:1**（≥3:1），所以亮生態的預警是靠「白核心＋箭頭」而非顏色在工作。
- **3-a（中）｜生態例外：desert**。`stress2-desert` 上三家族光束的**肩部 1.07–1.59:1、核心僅 1.89–2.31:1**，
  正常視覺與三種色覺**全部低於 3:1**。目視 `cvd/stress-desert-protanopia.png`：三條線都成了沙色上的淺灰帶，
  boss 線與 player 線僅剩線寬/箭頭可分。失敗情境：在流沙荒漠打 Boss，玩家（尤其紅綠色覺異常者）
  可能漏看 `charge_combo` 的衝撞線。建議（非本輪範圍）：亮生態的光束加深色描邊或降低核心亮度改用暗色核心。
- **3-b（低）｜邊際通過：血條**。`cvd/hpbar-normal-vs-3cvd-3x.png`（正常/protan/deutan/tritan 四段 3× 疊圖）
  ＋量測（填充 vs 空槽）：正常 4.46:1、protan **3.29:1**、deutan 5.05:1、tritan 6.80:1。
  protanopia 是最壞情況（紅退成暗橄欖）但仍 ≥3:1，且血條上永遠疊著白色數字「71 / 114」作為文字冗餘 → 通過。
- **稀有度**：`panels/choice-1280x720.png` 是**自然升級三選一**（跑 5235 幀後自然觸發，非構造）。
  稀有度不只用顏色：每張卡右上有**文字膠囊**（普通/稀有/史詩/傳說，`progression.js:79 RARITY.tag`）、
  左上有類型徽章（1·武器 / 2·被動）。文字在任何色覺下都成立 → 通過。
  結算畫面的武器框只用顏色，但那是回顧資訊、非決策點。

## 4. contact sheets — 通過

`node tools/_wf_evidence.mjs sheets --out .../final/sheets`（工具原樣）：

| 類別 | 數量 | missing | 檔案 |
|---|---:|---|---|
| characters | 27 | `[]` | `sheets/sheet-characters-768x220.png` |
| enemies | 63 | `[]` | `sheets/sheet-enemies-768x412.png` |
| icons | 219 | `[]` | `sheets/sheet-icons-768x1244.png` |

三者 missing 皆為空陣列 → 無 magenta placeholder、無漏 sprite。數量與 CLAUDE.md 記載的 27/63/219 一致。

## 5. 灰階十格 — 通過（我判定 10/10 可互辨）

`grey/greyscale-10biomes-320x180.png`（10 格 320×180 並排，來源為 `stress2/`，線性亮度轉灰）。
我的盲辨結果與依據（各寫我實際看到的形狀）：

| # | 生態 | 我看到什麼 |
|---|---|---|
| 1 | crypt | 矩形石造遺構＋方形神龕，地面暗、幾何規整 |
| 2 | cavern | 右下一叢尖銳結晶柱（唯一的針狀群） |
| 3 | frost | 全圖第二亮、雪堆條斑＋圓形冰潭 |
| 4 | inferno | 暗底＋數處孤立高亮光池（熔岩），Boss 為放射狀骨架 |
| 5 | void | 暗底＋兩道破碎圓弧構造（唯一的弧形） |
| 6 | verdant | 成排圓形樹冠（唯一的圓頂群） |
| 7 | desert | 全圖最亮、階梯狀方台 |
| 8 | swamp | 巨大骷髏頭石像＋垂枝樹，中暗調 |
| 9 | abyss | 魚骨骸＋珊瑚扇葉 |
| 10 | celestial | 棋盤格 Boss ＋直立石柱，中亮調、地面點狀星屑 |

僅靠**亮度**分群只能分出 4 群（desert 131 / celestial 111 / frost 78 / 其餘 49–73 擠成一團），
但每個生態的**裝飾剪影**都是唯一的，所以逐格可辨 10/10。各生態灰階平均/標準差：
crypt 61.0/47.8 · cavern 66.8/48.3 · frost 78.2/48.3 · inferno 52.0/47.4 · void 49.2/48.8 ·
verdant 73.2/42.4 · desert 131.1/47.7 · swamp 66.2/44.1 · abyss 61.3/45.6 · celestial 111.4/42.5。

## 6. frontend smoke — 通過

`cd test && npm run test:frontend` → **59/59 assertions passed，exit code 0**。
9 個 phase 全綠（boot / registry / nav+render / story pause / codex+goals / co-op 自測 / 無障礙+輔助 / 遙測 / 教練），
結尾斷言 `no uncaught page errors ([])`。registry 計數未變（27/63/…），故 `REG_BASELINE` 無需更新。
另外本輪所有取證腳本（共 16 次獨立開頁）都讀了 `window.__GAME_ERROR__`，**全部為 null**，
Playwright `pageerror` 監聽也一次都沒觸發。

## 7. co-op 三自測 — 通過

同一頁面連續執行三個離線自測（`__DBG`），完整輸出見下：
- `coopRoundTrip()`：`rsPlayers 2 / snapPlayers 2 / snapEnemies 4 / snapProjectiles 3 / hostPlayers 2`，
  remote 位移 186.5 px（netInput 有效），**guestRendered true**、guestEnemies 4、guestPlayers 2、
  **mvLiftRoundTrip true**（R21 的 t[8] 欄位仍正確往返）。
- `coopSilenceTest()`：`leftWhileActive false → leftAfterSilence true`，guestDead true、
  **runEnded false、hostAlive true**（沉默的遠端被退場、主機的局不受影響）。
- `coopBossSyncTest()`：boss `b3_leviathan` 生成成功；四招 **leap_slam / wall_cage / charge_combo / shock_lines
  全部 started true**，guest 端 `guestBeamsSeen` 四招皆 true、leap_slam 的 `guestMvLiftSeen` true、
  wall_cage 的 `guestPillarsSeen` true（8 根）；4 種事件怪 `evt_bomber/evt_bomb/evt_boulder/evt_goblin`
  host 生成與 guest 重建**一一對上**；`guestRenderedOk true`、`errors []`。

## 8. 原審核未能驗證的三項 — 通過（附 1 項可讀性缺陷）

### 8a. 自然 Boss 招式時間軸 — 通過
方法：進真 run、生成該招式的**專屬 Boss**，之後**完全不碰 addBeam**，讓 `bossMoveTick()` 自己
按冷卻（`BOSSMOVE_FIRST_CD 5s`）與階段條件選招，腳本輪詢 `boss.mv.id / boss.mv.ph` 到指定階段才截圖。
wall_cage 的 `minPhase 1` 以「把 boss.hp 壓在 50% 讓它自然進二階」達成，不是直接呼叫招式。

| 招式 | Boss / 生態 | 觸發幀數 | 截到的畫面 | 檔案 |
|---|---|---:|---|---|
| leap_slam | g_magmacolossus / inferno | 自然 | 蓄力 crouch（warn ring）＋**滯空 air**（mvLift>2） | `bossmoves/bossmove-leap_slam-{telegraph,payoff}-*.png` |
| shock_lines | g_voidsovereign / void | 自然 | cast 放射預警＋**wave 前緣行進**（d=90.7） | `bossmoves/bossmove-shock_lines-*.png` |
| wall_cage | g_frostmonarch / frost | 155 幀 | cast **10 段光束環**（beams=10）＋**8 根魂晶巨柱成形**（spawnT 全 0） | `bossmoves/bossmove-wall_cage-*.png` |
| charge_combo | g_stormtyrant / crypt | 339 幀 | tel 瞄準＋**dash 衝撞中**（beams=2） | `bossmoves/bossmove-charge_combo-*.png` |

目視判斷：四招的**危險區都畫在正確的地方**——leap_slam 的落點在玩家腳下且 Boss 明顯抬升；
wall_cage 的環先畫出來、8 根柱子事後落在同一個環上、缺口清楚可辨（`payoff` 圖右上角就是那個缺口）；
charge_combo 的紅橙線從 Boss 穿過玩家、箭頭指向終點；shock_lines 的 4 道琥珀前緣呈放射狀外推，
其中一道正壓在玩家身上。
- **8a-1（中）｜招式名稱標語會被 Boss 身體吃掉。** `boss_moves.js` 用
  `world.particles.text(e.x, e.y - r*scale - 10, '蓄力跳躍！', {color: P.emberL})` 把招式名畫在 Boss 頭頂，
  但大型 Boss 的 sprite 高度遠超過那個偏移，字直接落在**身體上**。實測
  `zoom/zoom-leapslam-calltext-3x.png`：琥珀色字壓在 magmacolossus 的橘色胸甲上，
  對比僅 **2.69:1**（文字建議 4.5:1、非文字元件 3:1，兩者都不到）。
  同類：`bossmove-wall_cage-telegraph` 的紫色「魂柱囚籠！」壓在藍色 Boss 身上。
  失敗情境：玩家看不出現在是哪一招，只能靠光束形狀猜。建議（非本輪）：標語改畫在 Boss **外框上緣之外**
  或加暗底 pill。

### 8b. 完整（已解鎖）魂晶銀行 — 通過
`panels/bank-1280x720.png`。以 `META.guild.xp = GUILD_RANKS[4].xp` 讓 `guildRank ≥ 2` 過閘
（腳本回報 `gate(META,'bank') === null`，即**閘門確實開了**），`bankLimit 200`、`META.gold 1800`。
畫面元素齊全：標題列＋金幣數、規則說明條（利率 ×1.2 / 同時一筆 / 額度隨公會等級）、可借額度、
自訂金額 −/+/全額 三鍵、金額條（滿格）、到期應還試算「240 = 本金 200 + 利息 40」、借款按鈕、底部操作提示。
數字自洽（200×1.2=240）。
- 觀察 8b-1（低）：面板高約 590 px 但內容只用到上方 ~360 px，下半部整片留白；
  `panels/shop-1280x720.png`（順手截到的局內商店）有同樣的下半空曠問題。不是破版，是版面重心偏高。

### 8c. 完整結算畫面 — 通過
`panels/result-clear-1280x720.png`（通關）與 `panels/result-death-1280x720.png`（死亡）。
不是空殼構造：先跑滿 **90 秒真實戰鬥**（clear 場 356 kills、death 場 348 kills，4 個傷害來源、
6 類承傷來源），再呼叫 `finishRun()`、跑 90 幀讓 `deathT` 過 0.3 門檻才截圖。畫面含：
標題（關卡通關！/ 探索結束）→ 三行摘要（生態·難度·擊殺·分數 / 死神狀態 / 解鎖與帶回金幣）→
**本局配置**（武器 4 ＋被動 ×6 ＋裝備 3 空槽＋羈絆 5）→ **傷害排行**（追魂彈 2848·31% / 震爆波 2380·26% /
魂晶彈 2368·26% / 環衛刃 1576·17%，百分比條長度與數字一致）→ **⚑ 教練筆記**三行
（主力輸出「追魂彈」佔 31% / 承傷最高:事件危害 佔 55% / 建議:與自爆單位和爆裂物保持距離）→
**★ 本局解鎖**（兩行 ＋「…等 26 項」）→ 底部返回提示。右側同時疊了 3 張成就解鎖 toast，未與面板重疊。
R25 教練在真實資料下確實吐出三段而非靜默，且建議與最高承傷來源（event:explosion 55%）一致。

## 9. contact sheet 前後對照 — 通過（附 ART-01 未收口說明）

`cmp/cmp-{characters,enemies,icons}-before-after.png`（左 = W0 baseline `gate/sheets-baseline/`，
右 = 本輪 final），另附 3× 放大條 `cmp/cmp-*-row1-zoom3x.png`。幾何相同，可逐格差分：

| 類別 | 有變動的格 | 說明 |
|---|---:|---|
| characters | 22 / 36 | 見下 |
| enemies | 51 / 72 | 63 隻中大多數被動過（W2/W3 批次） |
| icons | 219 / 228 | 219 個圖示**全部**重繪（W3-B glyph 重畫） |

**角色變動分兩級**（以像素最大差與墨水覆蓋率量測）：
- **整隻重建 5 名**：hunter（墨水 0.291→0.452）、shadow（0.273→0.382）、g_revenant（0.304→0.469）、
  h2_voidcaller（0.239→0.410）、h3_plague（0.230→0.445），maxdiff 220–239。
  `cmp/cmp-characters-row1-zoom3x.png` 上可見 hunter 從「平塗青色團塊＋一根浮在旁邊的弓」
  變成有頭盔陰影、臉、背帶、橫抱弩機、靴子的可辨人形；shadow 從紫色兜帽團塊變成有角、面具與雙匕。
- **僅微調 17 名**：pyro / ranger / stormcaller / g_vanguard / g_arcanist / g_ranger / g_warden / g_stormcaller
  等，maxdiff 僅 14–34、墨水覆蓋率**完全不變**（例：ranger 0.315→0.315）——是明暗/rim 的值階微調，
  剪影沒動。
- **完全未動 5 名**：guardian、h4_paladin、h4_starcaller、h4_bladedancer、h3_dragoon（差分 0）。

→ 這證實 gate 報告的 ART-01 判定（「縮小範圍通過」）在 W5 收官時**仍然成立**：
「27 名角色可僅靠輪廓辨認」尚未 27/27，`ranger` 之類仍是兩階平塗、武器不在輪廓層。
本項判定為「通過」是就**對照證據本身**（前後圖已產出、變動可量化）而言，不是宣告 ART-01 達成。

---

## 環境限制／未能驗證

1. **ART-02 的「5 位未看說明的測試者 · 10 秒錄影」無法代替**：本報告的「一秒定位玩家」是靜態單幀
   ＋遮擋/對比度量測的推論，不是真人測試。
2. **動態時間感（動畫、粒子流向、螢幕震動）未驗**：全部證據都是單幀 PNG。
   例如光束的「虛線由起點流向終點」這個動態線索，在靜態圖上只能看到虛線本身。
3. **`boss_pillar` 三階段裂損**未逐幀目視（本輪 `wall_cage` payoff 只拍到完好階段）。
4. **局內商店庫存**：`panels/shop-1280x720.png` 是 1:27 時開啟，只有 2 個鐵砧選項、無裝備庫存，
   因此**沒有驗到商店的稀有度框**；稀有度改以自然升級三選一（`panels/choice`）驗證。
5. **不同 DPI**：全部截圖都在 `deviceScaleFactor 1` 下拍攝；高 DPI（dpr 2）的 `resize()` 分支未驗。

## ⚠ 本輪未由我造成的工作樹變動（請主迴圈裁決）

`git status --short docs/` 顯示 **33 個既有 PNG 被修改**
（`portrait-concepts/` 6 張、`portraits-raw/` 27 張），檔案時間戳 2026-08-27 23:09，
體積由 ~2.2 MB 縮成 ~0.23 MB（例：`dirA-painterly-guardian.png` 2224888 → 232513 bytes）。
**本輪所有腳本只讀 `gate/sheets-baseline/` 與 `final/`，只寫 `final/` 與 session scratchpad，
沒有任何一行會碰到那兩個目錄**；`src/ tools/ test/` 則完全乾淨。
研判是同工作樹的並行程序（疑似圖片壓縮批次）所為，依「並行產物異常只記錄不診斷」的規則
在此如實記錄，未做任何處置（未 restore、未 commit）。

## 附錄 — 10 生態地板自相關（tile 週期 = 64 px）

| 生態 | r@64px(x) | r@64px(y) | r@32px | r@17px |
|---|---|---|---|---|
| crypt | 0.215 | 0.033 | 0.353 | 0.445 |
| cavern | 0.369 | 0.069 | 0.508 | 0.544 |
| frost | 0.330 | 0.160 | 0.457 | 0.542 |
| inferno | 0.317 | 0.052 | 0.482 | 0.564 |
| void | 0.326 | -0.041 | 0.471 | 0.503 |
| verdant | 0.392 | -0.009 | 0.502 | 0.511 |
| desert | 0.515 | 0.090 | 0.687 | 0.777 |
| swamp | 0.423 | 0.018 | 0.538 | 0.550 |
| abyss | 0.393 | 0.023 | 0.509 | 0.560 |
| celestial | 0.537 | -0.076 | 0.630 | 0.652 |
