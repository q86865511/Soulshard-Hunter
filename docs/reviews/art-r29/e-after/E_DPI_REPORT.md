# R29 批次 E — DPI 一致性修正驗收報告

- 對象：`docs/reviews/art-r29/c-verify/RE05_VERIFY.md` §1.4 / §1.5 / §1.6 三項同源缺陷
  （渲染基準把「裝置像素」當「設計像素」，dpr 洩漏進玩法與 UI）。
- 改動檔：**`src/engine/renderer.js` 三處，無其他 src/test 檔改動**。
- 樹：`claude/r29-art-followup`，基底 `5e5ebb3`。未 commit／push。
- 日期：2026-09-01
- 方法：Playwright headless Chromium（`test/node_modules`）＋ `tools/_wf_serve.mjs` 專屬埠 5221；
  量測腳本 `tools/_wf_e1_*.{mjs,py}`（gitignored scratch）。

---

## 判定總表

| 項 | 驗收條件 | 判定 |
|---|---|---|
| E-1 | 四組（1280×720／1920×1080 × dpr1／dpr2）可視世界完全相等 | **通過**（並延伸到 dpr1.25/1.5/3 的 232 組全數相等，1 例外見 §1.3） |
| E-2 | FONT_BODY 物理字級 dpr1 = dpr2；1080p 組 81.9% → 100% | **通過**（16.90 → 20.65 CSS px，等於 dpr1） |
| E-3 | `lw:1` 亮度 ~0.489 → ≥0.9、寬度 1 裝置 px；無新縫隙 | **通過**（0.489 → 0.912，painted 2 → 1 device px） |
| 4 | dpr1 回歸：E-1/E-2 為 no-op | **通過（改用更強的證明方式，見 §4）**——全畫面逐位元比對只在 `title` 場景成立，hub/run 場景本工具鏈**無法**逐位元重現，已誠實記錄 |
| 5 | frontend smoke 59/59、co-op 三自測、`__DBG.reg()` | **通過** |

---

## 1. E-1 `camera.zoom` 公平性

### 1.1 修法

`src/engine/renderer.js` `resize()`：zoom 檔位改用 **CSS** 尺寸決定，再乘 `dpr` 回裝置座標。

```js
const zCss = Math.max(2, Math.min(6, Math.round(Math.min(cssW / 430, cssH / 280))));
camera.zoom = zCss * dpr;
```

`camera.zoom` 的語義**不變**（仍是「裝置像素 / 世界像素」），所以全案 `.zoom` 的 28 處出現（其中 `resize()` 的賦值與 `view.zoom` getter 各 1 處）中，26 處讀取端
（`worldToScreen` / `screenToWorld` / `cssToWorld` / 剔除框 / minimap / 相機夾限 / sprite 縮放）
一律不需要改——連動查核見 §5。

### 1.2 量測（`sweep-{before,after}.json`，同一支 `resize()` 實跑）

| 視窗 | dpr | 可視世界 before | 可視世界 after |
|---|---|---|---|
| 1280×720 | 1 | 426.67 × 240 | 426.67 × 240 |
| 1280×720 | 1.5 | 480 × 270 | **426.67 × 240** |
| 1280×720 | 2 | 512 × 288（+44% 面積） | **426.67 × 240** |
| 1920×1080 | 1 | 480 × 270 | 480 × 270 |
| 1920×1080 | 1.5 | 480 × 270 | 480 × 270 |
| 1920×1080 | 2 | 640 × 360（+78% 面積） | **480 × 270** |

四組驗收格（兩視窗 × dpr1/dpr2）**完全相等**。

**目視**：`e1-fairness-1920-dpr2.png`（1920×1080，同一格世界，三張都 LANCZOS 正規化到
960×540）。左＝before dpr1、中＝before dpr2、右＝after dpr2。中間那張的敵人明顯小一圈、
四周多露出一整圈地圖，HUD 與提示條也整體縮水；右邊那張與左邊在視野與 sprite 大小上一致。

### 1.3 全域掃描（比截圖更強的證明）

`_wf_e1_sweep.mjs` 覆寫 `window.innerWidth/innerHeight/devicePixelRatio` 後直接呼叫
**出貨的** `resize()`／`uiScale()`，掃 58 種視窗尺寸 × dpr {1, 1.25, 1.5, 2, 3} = 315 組：

- **可視世界的 DPR 不變性**：before 有 **182/232** 組偏離自己的 dpr1 基準（最糟 +100%）；
  after **1/232**，且那一組的偏差是 0.03%。
- 唯一例外：1366×768 @ dpr1.25 → backing store 是 `Math.floor(1366×1.25) = 1707`（不是 1707.5），
  455.33 → 455.20 world px，差 0.13 world px。這是既有的 `Math.floor(cssW*dpr)` 取整，
  與本次改動無關，**不修**。
- dpr=3 在 `resize()` 開頭就被 `Math.min(devicePixelRatio, 2)` 夾成 2，所以 dpr≥2 全部同行為。

### 1.4 已知取捨（依簡報記錄，不解）

非整數 DPR（Windows 縮放 125%／150%）會得到非整數的裝置 zoom，nearest-neighbor 的
像素寬度因此不均（有些來源像素放大成 4 個裝置像素、有些 5 個）。掃描量到的發生率：

| dpr | 非整數裝置 zoom 的視窗尺寸數 |
|---|---|
| 1 | 0 / 58 |
| 1.25 | **49 / 58** |
| 1.5 | 19 / 58（zCss 為偶數時仍是整數） |
| 2 | 0 / 58 |

**目視**：`e1-tradeoff-fractional-dpr.png`——同一塊世界區域在 dpr1（zoom 3）／dpr1.5（zoom 4.5）／
dpr2（zoom 6）下的裝置像素放大圖。三張的內容尺寸一致（＝公平性成立），
中間那張可以看到方塊寬度 4/5 交替的不均。這些使用者原本拿到的是「不公平的更大視野」，
現在換成「公平但縮放略不均」。

---

## 2. E-2 `uiScale()` 實體字級一致

### 2.1 修法

0.6／2.6 的夾限是「UI 看起來該多大」的 CSS 空間判斷，所以先在 CSS 空間夾，再乘 `dpr`：

```js
export function uiScale() {
  const cssS = Math.max(0.6, Math.min(2.6, Math.min(cssW / 1100, cssH / 680) * _uiScaleMul));
  return cssS * dpr;
}
```

回傳值語義不變（仍是裝置像素乘數），79 處 `uiScale()` 呼叫（其結果再被數百處當乘數用）語義照舊。

### 2.2 量測（`raw/{before,after}-probe.json`，用真正的 `uiText()` 畫 `Hnl 魂晶 0123`）

物理字級 = `token × uiScale() / dpr`（CSS px），與批次 C §1.4 同一算法：

| 視窗 | dpr | CAPTION before → after | BODY before → after | HEADING before → after |
|---|---|---|---|---|
| 1280×720 | 1 | 11.12 → 11.12 | 13.76 → 13.76 | 16.94 → 16.94 |
| 1280×720 | 2 | 11.12 → 11.12 | 13.76 → 13.76 | 16.94 → 16.94 |
| 1920×1080 | 1 | 16.68 → 16.68 | 20.65 → 20.65 | 25.41 → 25.41 |
| 1920×1080 | 2 | 13.65 → **16.68** | 16.90 → **20.65** | 20.80 → **25.41** |

1080p DPR2 的 BODY 從 dpr1 的 **81.8%** 回到 **100.0%**（16.90 / 20.65 = 0.8184 → 1.0000）。
1280×720 兩個 DPR 本來就沒撞上限，逐值不變。

反鋸齒占比（越低越銳利）同步改善：1920 dpr2 的 BODY aaShare 0.293 → 0.270——字變大了但更銳利，
因為 dpr2 的裝置像素密度本來就夠。

§1.3 的全域掃描同樣覆蓋這項：**physical font 在 after 的 232 組 (cssSize, dpr) 中 0 組偏離
dpr1 基準**（before 是 136/232，最糟 −50%）。

---

## 3. E-3 奇數線寬的半像素對齊

### 3.1 修法

單點修在 `uiRect()`，不動 102 個 `lw:` 呼叫端：

```js
const off = (stroke && Math.round(lw) % 2 === 1) ? 0.5 : 0;
if (off) { x += off; y += off; }
```

fill 一起位移（0.5 裝置像素不可見），所以填色與描邊仍然貼合。

### 3.2 量測（`raw/{before,after}-probe.json` 的亮度剖面，1920×1080 dpr1）

| 指定 lw | peak before → after | 實際著色列數 (device px) before → after |
|---|---|---|
| **1** | **0.489 → 0.912** | **2 → 1** |
| 1.5 | 0.700 → 0.700 | 2 → 2 |
| 2 | 0.912 → 0.912 | 2 → 2 |
| **3** | 0.912 → 0.912 | **4 → 3**（原本 2 滿 + 2 半，現在 3 滿） |
| 1×S (1.59) | 0.700 → 0.700 | 2 → 2 |
| 1.5×S (2.38) | 0.912 → 0.912 | 4 → 4 |

驗收條件「亮度 ≥0.9、寬度 1 裝置 px」達成（0.912 / 1 px）。偶數與非奇數的線寬**逐值不變**，
六種 DPR/視窗組合的結果完全一致（`lw` 是裝置像素常數，不隨 DPR 變）。

### 3.3 縫隙檢查（新瑕疵）

- **程式化**：probe 畫面加了一組「兩張相鄰的 填色＋1px 描邊 卡片」，掃過它們中間的
  掃描列找背景色（`#101018`）的空隙。before 與 after 的六種視窗/DPR 組合**全部 0 段**
  ——沒有新增縫隙（`e-dpr1-regression.json` 的 `probe_frames`；原始列在 `*-probe.json` 的 `seamRow`）。
- **目視三張面板**（4× NEAREST，上＝before、下＝after）：
  - `e3-zoom-sortie-cardedge.png`——出擊面板選中卡的青色圓角框：before 是兩列半強度的糊邊，
    after 是一列滿強度的實線；卡片填色與框線之間沒有出現縫。
  - `e3-zoom-sortie-tabs.png`——每日挑戰金色橫幅的上下 1px 框線：同樣由「雙列灰」變「單列實線」，
    文字位置不變。
  - `e3-zoom-run-hud.png`——in-run HUD 外框與血條/經驗條：外框變銳利，三條 bar 與外框仍然貼齊，
    無位移、無縫。
- 未動 `uiClipRound()` 與 `portraits.js` 直接呼叫的 `roundRectPath()`（兩者都是 clip／fill，
  不描邊，依規格不對齊）。

---

## 4. dpr1 回歸（驗收條件 4）——做到什麼程度，與做不到的部分

### 4.1 做不到的部分（誠實記錄）

**本工具鏈無法逐位元重現 hub 與 run 場景。** 同一份程式碼、同一個 seed、同樣的 pump 次數，
兩次獨立頁面載入之間仍有約 **28–33% 的像素**不同：

| 視窗 | 場景 | 同碼重跑差異像素 |
|---|---|---|
| 1280×720 | title | **0**（逐位元相同） |
| 1280×720 | hub_sortie | 31.1% |
| 1280×720 | run_combat | 31.6% |
| 1920×1080 | title | **0** |
| 1920×1080 | hub_sortie | 32.9% |
| 1920×1080 | run_combat | 27.7% |

已排除的假設（都試過、都沒解決）：① 覆寫 `Math.random` 成固定 seed；
② 在每個同步區塊前重新 seed（因為 `await` 期間別的 timer 也會抽 random）；
③ 開場後切斷 `requestAnimationFrame` 讓只有 `__DBG.pump()` 推進模擬；
④ 凍結 `Date.now`／`performance.now`；⑤ 清空並停用粒子系統。

已定位的事實：**玩法狀態是決定性的，變動的是世界背景的繪製**。診斷腳本
（`_wf_e1_det.mjs`）在兩次載入間比對，`player.x/y`、`enemies`、`run.time`、`threat`、
`playerTempo`、`weapons` **全部逐值相同**；差異像素的空間分佈（`mask_hub.png`）集中在
地板磚、樹與遺跡裝飾上，**面板本身（UI）是全黑＝完全相同**。最可能的成因是 gen 美術的
fault-isolated 動態 import 完成時機，本批不追。

因此「hub/run 各一張 dpr1 截圖逐位元 diff=0」這條**沒有達成，也不宣稱達成**。

### 4.2 改用的三項證據（合起來比三張截圖強）

**(a) 全域數值等價（E-1/E-2 的完整證明）**——`_wf_e1_sweep.mjs` 對出貨的 `resize()`／
`uiScale()` 掃 58 種視窗尺寸，在 dpr=1 下：

```
1) dpr=1 no-op: 58/58 window sizes identical in BOTH zoom and uiScale (0 mismatches)
```

這是對整個輸入定義域的窮舉，不是三個抽樣點。

**(b) title 場景全畫面逐位元**——唯一決定性的場景，before vs after（含 E-3）在
1280×720 與 1920×1080 的 dpr1 下 **diff = 0 像素、SHA-256 相同**。

**(c) UI probe 畫面逐位元**——probe 是純同步繪製，完全可重現（同碼重跑 SHA 相同）：

| 視窗 | probe 可重現 | before == (E-1+E-2) | (E-1+E-2) == (全部三項) |
|---|---|---|---|
| 1280×720 dpr1 | ✔ | **✔ 逐位元相同** | ✘（E-3 的描邊差異，預期） |
| 1920×1080 dpr1 | ✔ | **✔ 逐位元相同** | ✘（同上） |

(b)+(c) 是**實際渲染**的端到端證據：E-1/E-2 在 dpr1 產出逐位元相同的畫面，
唯一的差異來自 E-3。

**(d) 有噪音遮罩的 hub/run 差異**（參考值，不作為判準）——每個變體各跑兩次，把「同碼重跑
也會變的像素」聯集成噪音遮罩 N，再看遮罩外的差異（`e-dpr1-regression.json`）：

| 視窗 | 場景 | 噪音佔比 | E-1+E-2 遮罩外差異 | E-3 遮罩外差異 |
|---|---|---|---|---|
| 1280×720 | title | 0.00% | 0 | 0 |
| 1280×720 | hub_sortie | 31.1% | 20 267 | 12 520 (1.36%) |
| 1280×720 | run_combat | 31.6% | 96 | 96 (0.01%) |
| 1920×1080 | title | 0.00% | 0 | 0 |
| 1920×1080 | hub_sortie | 32.9% | 35 181 | 36 642 (1.77%) |
| 1920×1080 | run_combat | 27.7% | 281 | 2 901 (0.14%) |

「E-1+E-2 遮罩外差異」在 hub 上是 20k–35k，而該欄理論值必須是 0——這證明的是
**兩次取樣的噪音遮罩仍然低估了背景噪音**，不是 E-1/E-2 有作用（(a)(b)(c) 已排除）。
run_combat 的殘差已降到 96–281 像素（0.01–0.03%），同樣是殘餘噪音。
本表列出只為完整揭露，**不要拿它當判準**。

**(e) E-3 的視覺差異**（允許的 0.5px 描邊位移，單獨列出）——
`diff-e3only-*.png` 是遮罩外的 (E-1+E-2) vs (全部三項) 差異圖，可以看到差異全部落在
面板／卡片／HUD 的框線上，最大差值 121–239（描邊由半強度變滿強度的幅度）。
run_combat 遮罩外只有 96 / 2901 個像素受影響，因為戰鬥畫面 UI 佔比小。

---

## 5. 連動查核清單

| 查核項 | 結果 |
|---|---|
| 全案讀 `camera.zoom` / `view.zoom` 的 26 處（`grep "\.zoom" src` 共 28 行，扣掉 1 賦值 + 1 getter）| **無影響**。全部是 `world→device`（`× zoom`）或 `device→world`（`view.W / zoom`）兩種用法；`zoom` 的語義（裝置px/世界px）未變 |
| `worldToScreen` / `screenToWorld` / `cssToWorld` | **無影響**。`cssToWorld` 是 `mx * dpr` 再除 `zoom`，dpr 兩邊各出現一次仍相消 |
| world 剔除框 `world.js:303` | **有影響、正確**。`max(view.W,view.H)/2/zoom + 24` 在 dpr2 變小＝與 dpr1 相同的世界半徑，本來就該相同 |
| minimap 視野框 `render_hud.js:267`、`coop.js:217` | 同上，數值改為與 dpr1 一致 |
| hub 相機夾限 `hub/lifecycle.js:77`、ambient 生成範圍 `:203` | 同上；R28 的 hub 相機夾限在 dpr2 下現在與 dpr1 行為一致 |
| `enemy.js:298` `o = 1 / camera.zoom`（描邊世界單位） | **無影響**，非整數 zoom（4.5）下實跑無誤 |
| `updateCamera` 的 shake 幅度 `× camera.zoom` | **有影響、正確**：震動幅度以世界單位定義，dpr2 下裝置位移放大＝物理位移與 dpr1 相同 |
| 有沒有人把 zoom 當「CSS 縮放」用 | **沒有**（grep `\.zoom\b` 全案 26 處逐一看過） |
| 有沒有人假設 zoom ≤ 6 或必為整數 | **沒有**（唯一的 clamp 就在 `resize()`）。dpr2/1080p 現在 zoom=8、dpr1.5 現在 zoom=4.5，三支 co-op 自測與 smoke 全綠 |
| 有沒有人把 `uiScale()` 與 2.6 上限比較或反推 dpr | **沒有**（grep `uiScale()` 的比較式與 `view.dpr` 全案 62 處：`view.dpr` 全部用於 `mouse.x * view.dpr` 的 CSS→device 滑鼠換算，與 `uiScale()` 互不相干） |
| `test/frontend-smoke.mjs` 是否硬編 zoom/uiScale/dpr | **沒有**（grep `zoom|uiScale|dpr|devicePixelRatio` → 0 命中）。**本批未改任何測試檔** |
| `uiClipRound()` 與 `portraits.js` 共用 `roundRectPath()` | **不需要對齊**（clip／fill，不描邊），依規格未動 |
| `uiRect` 的 `radius > 0` 路徑 | 一併位移；`r = min(r, w/2, h/2)` 用的仍是原始 w/h，圓角半徑不變 |
| 相鄰 fill 之間的 1px 縫 | 程式化掃描 0 段 + 三張面板目視無縫（§3.3） |

---

## 6. 測試輸出

**frontend smoke（CI gate）**

```
$ cd test && npm run test:frontend
…
59/59 assertions passed
```

**co-op 三自測 + `__DBG.reg()`**（`_wf_e1_selftest.mjs`，dpr1 / dpr2 / dpr1.5 各跑一輪）

| 視窗 / dpr | zoom | uiScale | 可視世界 | coopRoundTrip | coopSilenceTest | coopBossSyncTest | `__GAME_ERROR__` |
|---|---|---|---|---|---|---|---|
| 1280×720 dpr1 | 3 | 1.0588 | 426.667×240 | mvLiftRoundTrip **true**、guestRendered true | leftAfterSilence true、hostAlive true | 4 招全 started、`errors: []` | null |
| 1920×1080 dpr2 | **8** | 3.1765 | 480×270 | 同上 | 同上 | 同上 | null |
| 1280×720 dpr1.5 | **4.5** | 1.5882 | 426.667×240 | 同上 | 同上 | 同上 | null |

`__DBG.reg()` 三輪皆為
`{enemies:63, items:28, equipment:60, abilities:54, talents:20, facilities:11, weapons:43, characters:27}`
——與 CLAUDE.md 的登記數字一致，**未變動**（本批不碰內容）。

zoom = 8（超過舊的 6 上限）與 zoom = 4.5（非整數）都實跑無誤，是上表最要緊的一列。

---

## 7. 證據索引（相對於 repo 根目錄，全部在 `docs/reviews/art-r29/e-after/`）

- `sweep-before.json` / `sweep-after.json` — 58 視窗 × 5 DPR = 315 組的 `resize()`／`uiScale()`
  實跑輸出（zoom / uiScale / backing / 可視世界 / 物理字級）。**§1.3、§2.2、§4.2(a) 的原始數據。**
- `e-dpr1-regression.json` — dpr1 回歸：噪音佔比、E-1+E-2 與 E-3 的遮罩外差異、probe 畫面的 SHA 比對。
- `raw/{before,after,ab}-metrics.json` — 場景擷取當下的 dpr / backing / zoom / uiScale / 可視世界。
- `raw/{before,after}-probe.json` — 線寬亮度剖面（含 `seamRow` 原始列）與三級字體的
  物理字級／AA 占比。**§2.2、§3.2、§3.3 的原始數據。**
- `e1-fairness-1920-dpr2.png` — before dpr1 / before dpr2 / after dpr2 三聯圖（CSS 正規化）。
- `e1-tradeoff-fractional-dpr.png` — dpr1 / 1.5 / 2 同一世界區域的裝置像素放大圖（縮放不均的取捨）。
- `e3-zoom-{sortie-cardedge,sortie-tabs,run-hud}.png` — E-3 前後 4× NEAREST 對照（上 before／下 after）。
- `diff-e3only-*.png` — 噪音遮罩外的 E-3 差異圖（差異全部落在框線上）。
- `raw/*.png` — 報告引用到的原始擷取（其餘擷取已刪，可由腳本重跑重現）。
- 產生證據的腳本（`tools/_wf_e1_*`，gitignored，不進版控）：
  `_wf_e1_dpi.mjs`（場景擷取＋probe）、`_wf_e1_sweep.mjs`＋`_wf_e1_sweepan.py`（全域掃描）、
  `_wf_e1_reg.py`（噪音遮罩回歸）、`_wf_e1_selftest.mjs`（reg + co-op 三自測）、
  `_wf_e1_det.mjs`（非決定性診斷）、`_wf_e1_diff.py`（初版 diff，已被 `_wf_e1_reg.py` 取代）。

## 8. 方法限制

1. **hub/run 場景無法逐位元重現**（§4.1）。dpr1 的 no-op 由全域數值掃描 + title 全畫面
   + probe 畫面三者共同支撐，不是由 hub/run 截圖支撐。
2. 全域掃描是覆寫 `window.innerWidth/innerHeight/devicePixelRatio` 後呼叫 `resize()`，
   量的是 `resize()` 與 `uiScale()` 的行為；**沒有**在每個尺寸下真的重繪整個畫面。
3. 非整數 DPR 的「縮放不均」只有靜態放大圖，沒有在真實 125%／150% 縮放的 Windows 桌面上
   目視過（本環境是 headless）。
4. `Math.floor(cssW * dpr)` 造成的 0.03% 可視世界偏差（§1.3）屬既有行為，本批未處理。
