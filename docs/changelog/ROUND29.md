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

### 未收口

R28 重建的那 5 名本身就是本輪填充率最高、輪廓最無特徵的 5 個（hunter 0.833／g_revenant 0.865／
h3_plague 0.892／h2_voidcaller 0.816／shadow 0.778），彼此仍只能靠顏色分辨。
RE-01 的「27／27」驗收在這 5 名解鎖重畫前無法關閉。
