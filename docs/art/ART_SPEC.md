# Soulshard Hunter 視覺規範（ART_SPEC v1，R28 美術輪）

> 依據：`docs/reviews/ART_AUDIT_2026-08-26.md`（基準 430443c）架構師複核。
> 本檔是 R28 起所有美術批次的**唯一權威規格**。實作與規格衝突時，改實作；規格要改，先過架構師。
> 既有鐵律沿用：**任何元素不得出現在固定的 per-tile 位置**（R26：固定位置平鋪必成紋）；所有 sprite 結尾 `p.outline(P.ink)`；缺圖以 magenta placeholder 呈現、不 crash。

---

## 1. 尺度階梯（ART-01）

畫布＝`defineAnim` 的 (w,h)。**gameplay 的 `def.scale`／`radius` 一律不動**——視覺量體只透過畫布內的填充率與輪廓密度調整。

| 級距 | 畫布 | 可視高度（實心像素） | 適用 |
|---|---|---|---|
| 英雄 | 16×18，anchor feet `[8,17]`，4 frames | 14–16 px | 全部 27 角色（現制不變） |
| 雜兵·小 | 12×12～14×14 | 9–12 px | swarm 型（gnat/wisp/slime 級） |
| 雜兵·中 | 16×14～16×16 | 12–14 px | 標準近戰/遠程 |
| 雜兵·大 | 18×16～20×18 | 14–17 px | brute/golem 級 |
| 菁英 | 與 base 同畫布 | 與 base 差 ≤1 px | 靠 glow＋crown＋色偏標示，不改輪廓 |
| Mini-boss 級 | 28×28～32×32 | 24–30 px | 5/10/15 分 mini-boss、reaper |
| Final boss 級 | 36×38～40×40 | 32–38 px | 10 生態終 Boss |

規則：
- **同級距內可視高度偏差 ≤2 px**（contact sheet 同尺度並排驗收）。
- 頭身：英雄約 40% 頭、60% 身（Q 版三頭身內），臉部至少 2 階明暗＋1 px 眼位；武器/職業符號必須出現在輪廓層（不只在配色層）。
- 輪廓密度：實心像素佔畫布 ≥55%（避免「薄」——hunter/shadow/g_revenant 病因）；禁止單像素寬的肢體超過 2 節。
- 明暗：每 sprite 3–4 階＋`rimLight`（光源統一**左上**）＋`shadeBottom`；地面接觸點必有 `softShadow` 或引擎 drawShadow。
- reaper 重製至 Mini-boss 級：提高明度對比（現況過暗融背景）、鐮刀輪廓進 silhouette。
- boss_pillar：道具級重畫（16×20，發光魂晶紋理＋裂損 3 階段），不升級距。

## 2. 戰鬥繪製分層與亮度預算（ART-02）

### 2.1 世界層 draw-order（world.js `draw()` 重排目標）
1. 地面：tiles → decals → hazards → decor
2. 地面光池：scene lights、玩家定位環、**Boss 地面環（新增）**
3. **拾取物層（pickups 脫離 actor y-sort，先於所有 actor 繪製）**
4. Actors：enemies＋players y-sort（維持現制）
5. 投射物＋武器持續 VFX（beam/aura/turret 類武器的 draw 移到此層，不再掛在 player draw 尾端被敵人蓋掉）
6. 預警 beams＋cues（永遠在 actors 之上）
7. 粒子（裝飾性）
8. Surrounded beacon／致命警示（最上層）

### 2.2 亮度預算
- `glowWorld`/`glowWorldCached` 增加全域 `GLOW_SCALE` 旋鈕與單次 alpha clamp；裝飾用途 alpha ≤0.35，警示用途上限 1.0。
- 裝飾粒子（非傷害、非警示）：飽和度上限 70%、alpha ≤0.5、壽命內線性衰減；傷害/警示粒子不受限。
- 每幀 glow 呼叫超出預算（軟上限 48 次）時，裝飾 glow 靜默降級為 cached 低半徑版。
- 關閉粒子（settings）後：預警 beam、Boss 環、surrounded beacon、拾取閃爍必須全部仍可見（歸屬第 2/3/6/8 層，不歸粒子層）。

### 2.3 Boss 可讀性（render-only）
- `boss:true` 敵人：常駐地面環（暗紅橙、半徑 ≈ radius×scale×1.4、alpha 0.18 脈動）＋1 px 暖色描邊（tintedFrame 快取路徑）。
- 菁英維持現有 glow；normal 不加新光效（保持三階對比）。

## 3. Beam／預警所有權色族（ART-02，零協定變更）

beam 走 co-op `bm` 快照通道，**禁止擴欄位**。所有權以「顏色家族」為簽名，呼叫端只改傳入色；render 端以色→族查表決定線寬/樣式。

| 族 | 色域 | 專屬用途 | 樣式 |
|---|---|---|---|
| Boss 預警 | 紅橙 `#ff5a3c`～`#ff8a50` | 只有 boss_moves 可用 | 底線 5 px＋白熱芯 2 px＋箭頭 |
| 事件/場地 | 琥珀 `#ffc23c`～`#ffd75a` | run events、event mobs | 底線 4 px＋箭頭 |
| 玩家武器 | 冷色 青/藍/白/紫 | weapons、gen_weapons | 現制 3 px；**禁用紅橙與琥珀** |

驗收：desert/crypt 壓力景中，遮住 Boss 本體仍能由 beam 顏色判斷「這是 Boss 招式」。

## 4. UI 字體階與密度模板（ART-03／10）

### 4.1 字體 token（renderer.js `UI` 為唯一來源，全部乘 `uiScale()`）
| Token | px | 權重 | 用途 |
|---|---|---|---|
| FONT_TITLE | 22 | 900 | 面板標題 |
| FONT_HEADING | 16 | 800 | 區塊標題/主數值 |
| FONT_BODY | 13 | 600 | 內文/列表主文 |
| FONT_CAPTION | 10.5 | 600 | 輔助說明（**全案最小字級，禁止 <10.5**） |

- 權重只允許 900/800/600 三檔；同一畫面最多 3 個主要視覺權重。
- **豁免**：以字型繪製的 emoji/pictogram「圖示級」用途（如 🔒 大鎖、卡片圖示）不受字體階約束，保留原尺寸並註記 `/* pictogram, exempt from type ramp */`。
- 次要資訊用**降低對比**（灰階 token）表達，不用縮字級表達。
- 數值比較（裝備 diff、升級差值）：增=P 系綠、減=P 系紅、且必附 +/− 符號（色覺冗餘）。

### 4.2 spacing 與模板
- 8 px grid（GAP_SM 8 / GAP_MD 16 / GAP_LG 24，×uiScale）。
- 三檔密度模板：**低資訊**（Build/地圖/暫停/衣櫃入口）＝內容寬度上限 60% 安全區、核心元素放大至 FONT_HEADING 以上、主資訊佔安全區 35–65%；**中資訊**（出擊/設定/結算）；**高資訊**（天賦/鐵匠/成就）＝分組標題＋組間 GAP_LG＋每列固定「名稱(BODY)→數值(HEADING)→成本/狀態(CAPTION)」順序。
- 按鈕統一走新 `uiButton()`（消 5 份 btn 複本）；focus/hover/disabled 三態必備。

## 5. Icon 文法（ART-06）

框體（`icons.js` panel 集中改）依類別區分**角語法**，glyph 依類別區分 silhouette：

| 類別 | 框角 | Silhouette 文法 |
|---|---|---|
| 武器 | 左上/右下斜切 | 對角方向性、有「射出/揮擊」動勢線 |
| 被動 | 圓角徽章 | 中心對稱符號/身體部位 |
| 道具 | 直角＋底座線 | 容器（瓶/袋/卷軸）可消耗感 |
| 裝備 | 方肩框 | 可穿戴輪廓（完整物件非符號） |
| 天賦 | 上尖飾 | 星/樹/紋章 |
| 設施 | 底寬梯形飾 | 建築剪影＋地基 |

- 左上 kira 星：**僅 rare 以上稀有度**保留，common 移除（現況全員 kira＝同質主因之一）。
- 進化版：必須增加第二層形狀（翼/角/光環/裂變幾何），禁止只換光效或框色。
- 32×32 下 base/evo 可一眼區分；灰階下類別仍可由框角+silhouette 判別。

## 6. 生態身份與 macro variation（ART-04／11）

- 地板 variant 選擇由 per-tile 均勻 rng 改為 **value-noise 群聚**（搬 town 的 vnoise 範例，尺度 2.6–3.0），形成 2–5 tile 連續片；保留 10–15% 純淨留白區。
- run biome 補**牆 variant**（每生態 ≥2 種牆面＋1 種破損態，hash 選擇、鏡像/旋轉受限）。
- decal 放置由均勻撒點改群聚（cluster 中心 vnoise 峰值、密度守 `BALANCE.DECOR`）。
- 每生態必備：1 個地平線/邊界語法、2 個大型地標（≥3×3 tile，開場 10 秒內可遇）、3 個材質形狀、1 個專屬環境動態（粒子或動畫 decor）。
- 驗收：灰階 320×180 縮圖 10 生態辨識 ≥8/10；任取相距 1 viewport 的三張截圖，2 秒內指不出相同 3×3 重複。

## 7. 室內規格（ART-07）

- 房間尺寸下限 **29×17 tile**（大於 1280×720@zoom3 可視 26.7×15）；保持奇數寬（cx 置中慣例）與 `rooms{}` 契約/triggers 不變。
- OOB：室外暗牆帶加層次（漸暗 2 階＋輪廓剪影），不得大片純色。
- 每房：1 個「工作中」焦點設施（有動態）、≥3 個非共用敘事物件、1 段前景遮擋、1 種專屬地面材質；鏡像擺設 ≤40%；空地 ≤40% 可視地板。

## 8. 肖像層（ART-05，使用者已裁決）

- 形式：`assets/portraits/<charId>.png`（本地資產，同 font/music 級；零第三方請求不變）。
- 規格：128×128 半身像、統一左上光源、統一裁切（頭頂留 8%、胸線裁底）、色盤對齊該角 sprite 主色、武器/職業符號入畫、每張帶 1 個性格動作。方向 A（厚塗，2026-08-27 使用者定案）保留深色畫面背景——由顯示端以像素卡框裁切呈現，不做透明去背。
- 管線：ImageGen 概念（2–3 方向 → **使用者挑選**）→ 批量生成 → 人工修正＋像素化（pixel-asset-pipeline）→ 整合。
- runtime：新增輕量 portrait 載入模組（lazy、載入失敗 fallback 至現有 char sprite 放大格），出擊角色卡/Codex 用；不改存檔/協定/API。

## 9. 色覺與形狀冗餘（ART-09 殘部，最終回歸執行）

- 必要資訊（玩家、Boss、危險區、可拾取、稀有度、增減值）一律「形狀/節奏＋顏色」雙編碼。
- DOM 與大段 Canvas 文字對比 ≥ WCAG AA（以實際背景抽樣）。
- protanopia/deuteranopia/tritanopia 模擬為 gate 與 W5 必跑項。
