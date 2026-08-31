# Round 29 — 美術複審續辦輪（進行中）

> 依據：`docs/reviews/art-improve-2026-08/ART_ROUND28_SUMMARY.md` 的 2026-08-30 複審下修判定
> （ART-03 / ART-05 部分通過）。本輪只處理複審點名的續辦項，不加內容、不動玩法／協定／存檔。

## 批次 B — UI 排版三件事（RE-02 / RE-03 / RE-04）

無玩法、數值、協定、存檔格式變更；`test:frontend` 59/59。

### RE-02 不可分割文字 token

**根因**：全案的自動換行都是**逐字元**貪婪迴圈。對 CJK 正確（中文無空格），但描述文字裡的
數字被攔腰切斷——`-10%` 斷成「-10 / %」、`+0.3` 斷成「+0. / 3」——而且發生在曝光最高的
決策點（出擊選角卡）。

- `src/engine/renderer.js`：`uiWrapText()` 改為 **token 感知**——正負號/小數/百分比/單位
  組成的數字、拉丁單字視為原子，其餘仍逐字元（CJK 行為與改前逐字一致）；加上禁則處理
  （`。，、）」%…` 等不得置於行首）與 `maxLines` 省略號參數。`uiClip1()` 與新的
  `trimTokensToWidth()` 同樣**以整個 token 為單位**裁切，避免省略號自己再切開一個數字。
- 呼叫端全部遷移到共用函式（原本各自手寫一份逐字元迴圈）：
  `hub/render_personal.js`（選角卡描述、`clip1`/`wrap` 兩個工具）、`hub/render_codex.js`
  （`codexDesc`）、`hub/menus.js`（NPC 對話換行）、`run/overlays.js`（`wrapText`）、
  `run/render.js`（世界提示、道具 tooltip）、`run/render_hud.js`（拾取／贊助者 tooltip）、
  `scenes/title.js`（更新日誌 `wrapNote`）。
- **量化驗證**：把 387 條內容描述（角色／武器含各等級／被動／道具／裝備）在三種實際欄寬下
  同時餵給舊演算法與新 `uiWrapText`——舊的切壞 **72** 個數字 token，新的 **0**；
  `maxLines` 省略號路徑另驗 0 例。最小實際字高 10.5×uiScale ≥ 11 px。

### RE-03 肖像高曝光整合

**根因**：27 張肖像資產全案只有 **1 個呼叫點**（出擊卡），個人頁主視覺仍是放大 sprite；
鎖定卡用 `alpha 0.3` 把角色壓到看不出是誰，等於沒有 teaser。

- `src/game/ui/portraits.js`：`drawPortrait()` 加 `mono`（去飽和＋壓暗，取代整體淡出；
  `ctx.filter` 不可用時退回 alpha）與 `focusY`（裁切錨點，半身像的臉在中線以上）。
- 個人小屋：肖像成為角色主視覺（150×150 框內滿版＋名牌底板），sprite 降級為框下的
  **「遊戲內預覽」**小圖（造型 skin 仍以 sprite 為準，所以資訊沒有損失）。
- 出擊卡鎖定態：`alpha 0.3` → `mono 0.85 / alpha 0.95`，看得出是誰、仍讀得出未解鎖。
- NPC 對話框：**第三個**肖像面（每次交談都會看到）。只在玩家沒穿造型時用肖像
  （肖像畫不出 skin，靜默換掉會誤報玩家買的東西）；同一個 64S 框，不產生位移。
- **版位固定驗證**：把 `assets/portraits/hunter.png` 移走後重跑截圖——框、名字、公會列、
  右側資料區塊全部在原座標，只是框內換回放大 sprite、預覽小圖不畫；檔案已還原。

### RE-04 三檔面板密度版型

**根因**：銀行（尤其未解鎖態）、圖鑑目標頁、個人小屋在 720p 下有 40–85% 的無功能留白，
R28 自評已列為延後項。

- 新檔 `src/game/scenes/hub/layout.js`：`DENSITY` 三檔（`compact` / `standard` / `showcase`，
  欄寬・行高・區塊間距・圓角・字級一組）＋ `dens()/contentRect()/columns()/blockHeight()`，
  全部是設計單位 ×S，呼叫端不再硬編絕對座標補洞。核心是 **`drawBlock()` 空狀態插槽**：
  一個區塊可同時承載 教學（icon＋標題＋說明）・進度（附標籤的進度條）・下一步 CTA；
  `minH` 撐高時內容**垂直置中**（撐高卻把內容擠在頂端只是把死區換個位置）。
- 遷移：
  - `hub/render.js drawLockedPanel`（銀行未解鎖／鍛造未解鎖）：鎖頭＋兩行字 → 標題列
    ＋「這是什麼／解鎖後」雙欄 ＋ 解鎖進度雙進度條 ＋「前往公會接任務」CTA。
    每個 gate 的文案集中在同檔的 `LOCKED_INFO` 表，未知面板走 `_default`。
  - `hub/render_codex.js drawCodexGoals`：目標卡後方接圖鑑收集帳（4 條進度條＋說明）
    ＋「出擊狩獵以發現更多」CTA；`goals` 為空時標題自動改寫成空狀態文案。
  - `hub/render_personal.js drawPersonal`：生涯戰績／收藏兩組加卡片底板（文字座標未動），
    下方接「接下來的目標」（`goalsFor`）＋公會進度條＋「查看圖鑑石碑」CTA。
- CTA 是**真的可按**：`this.panelCta` 由 draw 發布、`hub/panels.js updatePanel` 在分派前
  處理（gated 面板本來就沒有其他互動元件），`render.js` 每幀先清空。
- **量化驗證**（`tools/_wf_evidence.mjs` 截圖 ＋ 佔用率探針）：把面板內容區切成 16×16
  裝置像素格，任一像素與面板底色（取自面板左側必空的溝槽像素，確定性參照）差 >10 即算佔用。
  空溝槽對照組偽陽性 0%。1280×720：出擊 71.8% / 個人 81.6% / 銀行 74.7% / 圖鑑 78.9%，
  四面板皆落在 60–85% 目標帶；1920×1080、2560×1440、1366×768 同樣在帶內
  （最低 66.3%，最高 81.6%）。

### 驗證

- `cd test && npm run test:frontend` → **59/59**。
- 命中測試回歸探針（11 條）：三個新 CTA 各自開對面板；圖鑑分頁、出擊角色卡（選取／鎖定）、
  個人小屋分頁列全部維持原行為；`__GAME_ERROR__` 為 null。
- 截圖：`docs/reviews/art-r29/b-after/`（sortie／personal／bank／codex × 1280×720、2560×1440，
  另有 in-run build 疊層與 `fallback-probe/` 缺圖對照）。

## 批次 A1 — 角色 sprite 輪廓收斂（RE-01／ART-01 續辦）

無玩法、數值、協定、存檔格式變更；只動 3 個美術檔的 body 繪製；`test:frontend` 59/59。

### 根因（R28 為何「填充率達標但輪廓沒達標」）

`Painter.outline()` 把 **alpha > 0** 一律視為實心。因此 `glow/aura/ring/star4/softShadow`
灑出的極低 alpha 光暈也會被描邊——描出來的墨線是全不透明的，於是整個畫布被一圈墨框住，
外輪廓變成「發光半徑」而不是身體。R28 為了拉高填充率再往裡塞量體，結果 27 名幾乎都收斂成
同一個圓頂矩形（複審實測填充率最高的 5 名，正好就是 R28 重建的那 5 名）。

第二個結構性限制：**outline() 會把 1–2 px 的縫隙填死**。武器／盾牌想在剪影上「分離」，
與軀幹之間至少要留 3 個空白欄，否則兩側描邊會接在一起。

### 做法

先產 27 人純黑剪影對照表當基準線（`tools/_wf_sil.mjs`，gitignored），標出撞形群組，
再逐角以 `assets/portraits/<id>.png` 的識別特徵為依據重畫**外輪廓**（頭肩比／持械方向與型制／
披風、角、盾的外突／站姿重心），不再只調明暗與填充率。硬約束全數維持：16×18 畫布、
anchor feet `[8,17]`、4 frames、填充率 ≥55%（實測最低 0.556）、3–4 階明暗＋左上 rimLight＋
`shadeBottom`、結尾 `p.outline(P.ink)`。

- `src/art/heroes.js` — 13 個 archetype body 重切輪廓（knight／mage／pyromancer／warlock／
  ranger／samurai／berserker／gunner／monk／shaman／valkyrie／scout／stormpriest）。
- `src/game/content/gen/gen_heroes3.js` — h3_spearmaiden／h3_beastfang／h3_dragoon
  （標 `R29 A1 … HAND-EDIT`；重跑 `integrate.mjs` 會覆蓋，需重貼）。dragoon 一併補上
  它原本就缺的 `softShadow`／`shadeBottom`／`rimLight`。
- `src/game/content/heroes_r20.js` — h4_paladin／h4_chronomancer／h4_puppeteer／
  h4_gravekeeper／h4_starcaller／h4_bladedancer。
- 未動：R28 已重建的 hunter／shadow／g_revenant／h2_voidcaller／h3_plague（畫風基準）。

### 驗證

- `cd test && npm run test:frontend` → **59/59**。
- `node tools/_wf_evidence.mjs sheets` → characters 27、missing `[]`。
- 剪影前後對照：`docs/reviews/art-r29/sil-before-a128-big.png` ／ `sil-after-a128-big.png`
  （另有 32 px 實尺寸版與逐角填充率 `*-stats.json`）。

### 未收口（已由批次 A2 關閉）

R28 重建的那 5 名本身就是本輪填充率最高、輪廓最無特徵的 5 個（hunter 0.833／g_revenant 0.865／
h3_plague 0.892／h2_voidcaller 0.816／shadow 0.778），彼此仍只能靠顏色分辨。
RE-01 的「27／27」驗收在這 5 名解鎖重畫前無法關閉——見下方批次 A2。

---

## 批次 A2 — R28 已重建的 5 名輪廓專項收斂（關閉 RE-01）

A1 解除限制後，對 hunter／shadow／g_revenant／h2_voidcaller／h3_plague 做同一套剖面重切。
根因與 A1 相同（`Painter.outline()` 對 alpha>0 一律描邊），但這 5 名額外有兩個病因：
（a）R28 為了拉填充率，把肊甲／大衆／武器都推到畫布邊緣且**落在同一批 row**，
outline() 一跑就焊成一塊；（b）voidmage 結尾 `aura(8,3,5)`、plague 與 necromancer 的 `glow(...,r=3)`
把發光半徑變成外輪廓。做法是**只搬質量、不改畫風**：把躯幹收窄、把肢體或武器推出去形成
真空白欄，光暈半徑一律降到 1.4～1.6。每名以 `assets/portraits/<id>.png` 的辨識特徵為依據，
並先對照 A1 已定案的 22 名剖面避免撞形。

| 角色 | 輪廓簽名（胖體處＝新增） | 與誰拉開距離 |
|---|---|---|
| hunter | 低平頂兵帽（不尖）＋**十字弩橫桿在腰線端到端**，下方外套只有 10 px，弓臂尖勾到 row13-14 成兩點島 | ranger（尖帽＋右緣全高弓柱）、g_ranger（寬帶在肩線、頂部空）——hunter 的最寬點在**腰**且帽頂是實心平頂 |
| shadow | 4 px 全表最窄的直筒头巾＋單一寬肩披＋**雙短刃倒換手垂於兩側畫布邊緣**，腰部損成沙漏 | h2_duelist／h4_bladedancer（刃在右上斜插）——shadow 的刃**向下**且兩側各留 2 空欄 |
| g_revenant | 身體整體左移到 x1-9，**魂燈籠挂在右上角、杖身只到 row11「舉起來」**，右下四分之一全空 | ranger（弓柱從地到天，且 row9 下全焊死）、h4_gravekeeper（左上實心方塊） |
| h2_voidcaller | 結尾 aura 移除；4 px 窄連帽＋**左高右低兩道觸鬚臂**（絕不同排，因此永遠不會融成一條寬帶） | h2_warlock（row3-8 整條寬帶）、g_ranger（對稱平舉） |
| h3_plague | **窄帽冠→全寬帽簷的硬階梯（6px→16px，row2 刻意留白）**＋鳥喙前伸過左頰成鼻形；帽簷下兩側是真空氣 | stormcaller（同為寬帽，但是 7→11→14→16 的**斜坡**且無窄冠） |

副作用修正：necromancer 接觸陰影改跟著左移的身體（不再靠畫布中心）；h3_plague 面具壳拉亮一階
使臉在帽簷陰影下還讀得出來；R28 的 h3_plague 手杖移除（它把左側翼焊死，且股像上本來就沒有手杖）。
飛出去的肢體一律補上前臂／骸手／觸鬚根部，這些連接只占 1 row，不會把空欄填回去。

### 填充率（alpha>128）

| 角色 | A1 後（＝A2 前） | A2 後 |
|---|---|---|
| hunter | 0.833 | **0.674** |
| shadow | 0.778 | **0.601** |
| g_revenant | 0.865 | **0.719** |
| h2_voidcaller | 0.816 | **0.625** |
| h3_plague | 0.892 | **0.681** |

27 名全體最低填充率 0.556（h4_chronomancer，未動），均 ≥ 0.55 底線。

### 驗證

- `cd test && npm run test:frontend` → **59/59**。
- `node tools/_wf_evidence.mjs sheets --out docs/reviews/art-r29/a2-after` → characters 27／
  enemies 63／icons 219，均 missing `[]`。
- 剖影前後對照：`docs/reviews/art-r29/a2-after/sil-before-a128-big.png`（＝A1 結果）與
  `sil-after-a128-big.png`，另有 32 px 實尺寸版與逐角填充率 `*-stats.json`。
- 改動檔：`src/art/heroes.js`（hunter／rogue／necromancer／voidmage 四個 archetype，分別對應
  hunter／shadow／g_revenant／h2_voidcaller）、`src/game/content/gen/gen_heroes3.js`
  （h3_plague，已標 `// R29 A2:` 行內註解，重跑 integrate.mjs 會覆蓋）。
- def／stats／股像檔／敵人 sprite／圖示／UI 場景檔均未動。
