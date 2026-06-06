# 第九輪 · 美術全面美化 + 生態系擴充（Art Glow-up & Ecosystem Expansion）

> 一句話：把整套**程序化像素美術**重繪得更帥、更有**動漫感**，並把世界從 5 個生態系擴充到 **10 個**。
> 全程以 **dynamic workflow（多代理並行）** 生成與測試；對遊戲是 **drop-in**（所有 sprite 名稱／尺寸／錨點／匯出簽名完全保留），單機與連線行為不變。
> （承接第八輪的 26 項 bug/UX 修復；本輪純美術＋內容，不動 gameplay 邏輯。）

---

## 1. 為什麼

美術是程式即時生成的（`src/art/*` 用 `Painter` API 畫到小 canvas）。本輪在**不改任何遊戲邏輯**的前提下，把視覺質感拉高一個檔次，並補上更多「生態系」變化。

三個目標：
1. **更帥／更美化**：明確光源、3–4 階明暗、邊緣光（rim light）、接地陰影、鏡面高光，輪廓優先、避免雜訊。
2. **動漫元素**：會發光的大眼睛、飄逸／尖銳的剪影與光澤、能量光環、「kira」閃光、霓虹／櫻花／極光點綴；首領加戲劇化光暈與發光核心。
3. **生態系**：原 5 個生態系加強，並**新增 5 個**。

---

## 2. 引擎強化（`src/engine/`，純加法、向下相容的 superset）

### `palette.js`
- 原有所有色鍵 **1:1 保留**。
- 新增**動漫點綴色**：`rim/rimCool/glint/hiSky`、`neon/neonL/neonD`、`magenta/magentaL/magentaD/laser`、`sakura/sakuraL/sakuraD`、`aurora/auroraL`、`astral/astralL`、`holy/holyL`。
- 新增**生態系色族**：`leaf/leafL/leafD·bark/barkD·moss`（翠林）、`sand/sandL/sandD·clay·dune`（荒漠）、`bog/bogL·slimeBog·murk`（腐沼）、`ocean/oceanL/oceanD·abyss·coral`（深淵）、`sky/skyL·cloud·star`（天界）。
- 新增小工具 `tint(base, accent, t)`。

### `sprites.js`（`Painter` 新增繪圖工具，原方法不動）
| 方法 | 用途 |
| --- | --- |
| `gradV / gradH` | 垂直／水平漸層填色 |
| `glow(cx,cy,r,col,strength?,steps?)` | 柔光（法球、眼睛、熔岩、魔法） |
| `sparkle / star4` | 閃光 / 四芒「kira」星 |
| `softShadow` | 半透明接地陰影 |
| `rimLight(col?,amt?,dx?,dy?)` | 後處理：替朝光側邊緣補光（在 `outline()` 前呼叫） |
| `dither` | 雙色棋盤（在有限色票內偽造第三階） |
| `speckle(...,seed)` | **可重現**的雜點貼圖（種子化亂數，烘焙穩定） |
| `aura(cx,cy,r,col,phase,rings?)` | 脈動光環（傳每影格相位） |

> 因為引擎是**嚴格超集**，舊美術原封不動仍可正確顯示。

---

## 3. 美術重繪（`src/art/*`，28 個檔）

由 **28 個並行代理**各負責一個檔：讀原稿 → 逐一保留每個 `defineSprite/defineAnim/defineIcon` 的名稱／寬高／影格數／錨點與所有匯出 → 套上新光照與動漫風重畫 → 自跑 `node --check` 自我修復。

- **角色**：玩家＝發光青藍兜帽魂晶獵手；`heroes.js` 18 種英雄原型（騎士/法師/武士/狂戰士/死靈…）各具辨識度，發光眼＋武器特效＋邊緣光。
- **敵人／首領**：史萊姆/蝙蝠/幽靈/石巨人重畫；`gen/bosses.js` 虛空法王（晶體光環）、熔岩巨獸（爆亮熔核）；`reaper.js` 死神燃眼飄斗篷＋鐮刀光。
- **圖示**：技能/天賦/設施/道具/裝備/武器圖示加上漸層、金屬光澤、寶石發光與閃光（含第八輪新增的 frostbite/lacerate/ignite/overload 4 個技能圖示，已併入強化版）。
- **地塊／裝飾／城鎮**：地牢與城鎮地磚、biome 裝飾、城鎮建築與 NPC 全面打磨。
- 共**新增 ~71 個 sprite**（多為新生態系地塊與裝飾）。

---

## 4. 新增 5 大生態系（世界 5 → 10）

`biomes.js` 在原 5 個之後**附加**（原 5 個的 id 與欄位結構不動）：

| id | 名稱 | 特色 |
| --- | --- | --- |
| `verdant` | 翠林森境 | 苔土＋日照綠地；特徵地塊＝花田 |
| `desert` | 流沙荒漠 | 暖沙丘＋砂岩牆；特徵地塊＝乾裂綠洲/流沙 |
| `swamp` | 腐沼濕地 | 濁綠沼澤；特徵地塊＝冒泡毒水 |
| `abyss` | 深淵海溝 | 深海藍；特徵地塊＝發光海床噴口 |
| `celestial` | 天界雲海 | 雲＋星紋大理石；特徵地塊＝星光裂隙 |

每個生態系都註冊完整地塊（`floor_/floor2_/floorx_/wall_/walltop_<id>`）並在 `biome_decor.js` 補上 5 件專屬裝飾（會發光的花、螢火蟲、海帶、鮟鱇魚、氣泡、雲、羽毛…）與 `DECOR_SETS`/`DECOR_CLUSTERS` 條目。

因為 `maps.js` 以 `BIOMES[(stage-1)%length]`／隨機抽選並有 `DECOR_SETS[id]||['torch']` 後備，新增生態系會**自動成為可玩關卡**；成就系統也會自動新增對應的「征服／精通」成就。`net/social.js` 的 co-op 房間生態系清單也同步補上這 5 個。

---

## 5. 相容性保證（drop-in）

- 每個 sprite 名稱／寬高／錨點與每個匯出符號**完全保留**（新增 46 個註冊鍵，**0 個被刪除或改名**）。
- 引擎為**純加法 superset**：palette 色鍵 1:1，`Painter` 只新增方法。
- 單機行為不變；新增生態系僅延伸關卡進度與成就，不改既有邏輯。

---

## 6. 測試（4 維度測試工作流）

整合後以 workflow 並行測試，全數 **PASS**：

1. **Headless boot + 實機**：`window.__GAME_ERROR__` 全程為 null、`#fatal` 從未出現、零 console/page 錯誤；標題、城鎮、關卡與 5 個新生態系皆渲染強化美術、**無洋紅缺圖**。
2. **全 10 生態系地圖生成**：`generateWorld`/`generateStage` 對 10 個 biome 皆無例外、**零缺失地塊/裝飾 sprite**。
3. **Sprite 引用稽核**：507 註冊 vs 382 引用，**0 真缺失**（少數原始絕對引用為既有 fallback 行為，非本輪退化）。
4. **Diff 審查**：確認為**純加法**、無契約破壞。

另以瀏覽器畫廊烘焙全部 sprite（376 個獨立美術）零錯誤、逐組截圖目視驗收；以 `__DBG.nav/pump` 對 10 個生態系各自進關截圖確認。

---

## 7. 備註

- `src/art/gen/*` 標頭仍寫「AUTO-GENERATED」。本輪是**直接重繪**這些檔的畫法；若日後重跑 `tools/integrate.mjs` 由來源重生，會覆蓋本輪的美化，需重新套用。
- 開發預覽：`node tools/serve.mjs` → 開 `http://localhost:5173`（內建 `window.__DBG` 的 `nav/pump/gallery` 便於 headless 驗證）。
