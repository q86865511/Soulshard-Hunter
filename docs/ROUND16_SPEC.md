# Round 16 實作規格文件

> 本文件供 AI／開發者實作參考。彙整玩家實際遊玩回饋，依**主題分類**整理；同一區域或性質的修改集中在同一章。
> 編號採「章.項」格式，並附 `(原#N)` 對照早期討論順序。

## Context

Round 16 是一次以**玩家回饋為核心的 UX 大修**，不改動核心戰鬥數值平衡，聚焦於：
- **可讀性**：字型（標楷體）、全形標點、金幣圖示統一。
- **版面正確性**：UI 縮放、面板圖層／置中／捲軸重疊、HUD 佈局、各種文字重疊與跑版。
- **新手友善**：城鎮引導、戰鬥提示、HUD 暫停說明、難度說明、新增「劇情難度」。
- **資訊呈現**：任務多重追蹤與數值化、成就可領提示與篩選、撿取紀錄、掉落物分類外框。
- **新系統**：玩家回饋系統、魂晶銀行借貸、後台「遊玩中」即時可見。
- **戰鬥數值與 build**：拾取範圍／武器射程／作用範圍三者分離且可升級、羈絆系統可見化、局內顯示已遊玩時間、撿取裝備對比目前裝備效果。
- **經濟平衡**：金幣獲取 nerf（加上限並調降各加成，解決太好賺）。
- **基礎建設**：Service Worker 離線快取。
- **Bug 修正與後期關卡調整**：進化後基礎武器不再出現升級池、最終 Boss 死後停止生怪、死神移速大幅加強、武器進化路徑顯示、裝備掉落率微調、結算傷害來源說明＋羈絆圖示＋標題黃色。

---

## 分類總覽

### 一、全域視覺與排版基礎
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 1.1 | 全域字型改為標楷體 (原#1) | `src/engine/renderer.js` |
| 1.2 | 全形標點符號統一 (原#2) | `npcs.js`、`hub.js`、`ui.js`、`hud.js` |
| 1.3 | UI 自動縮放修正 (原#8) | `src/engine/renderer.js`、`index.html` |
| 1.4 | 金幣文字統一為圖示 (原#35) | 全域 UI 字串 |
| 1.5 | 選單／按鈕對比與外框 (原#24) | `hub.js` ESC menu + 各 panel |

### 二、城鎮：對話與場景
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 2.1 | 對話框新增主角頭像（右側）(原#3) | `hub.js` `drawDialogue()` |
| 2.2 | 對話框上一頁按鈕 (原#16) | `hub.js` `drawDialogue()`／`updateDialogue()` |
| 2.3 | 「新」徽章元件：NPC 驚嘆號 (原#4) | `hub.js` NPC name render |
| 2.4 | E 鍵互動提示文字優化 (原#5) | `hub.js` 互動提示字串 |
| 2.5 | 城鎮地板藍色亮點調降 (原#6) | `src/art/town_floor.js` |
| 2.6 | 城鎮地圖外側視覺處理 (原#19) | `world.js`、`hub.js` |
| 2.7 | 建築與物品加入碰撞體積 (原#21) | `world.js` `makeCamp()` |

### 三、城鎮：功能面板
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 3.0 | **全域面板通則**（圖層／置中／捲軸／按鈕層級）(原#22 抽出) | `hub.js` 各 panel |
| 3.1 | 鐵匠鋪 UI 跑版與等級顯示 (原#18) | `hub.js` 鍛造／營地 panel |
| 3.2 | 教堂天賦 UI 全面修正 (原#20) | `hub.js` `drawTalents()` |
| 3.3 | 獵人公會介面修正 (原#22) | `hub.js` guild panel |
| 3.4 | 衣帽間重新進貨按鈕位置 (原#23) | `hub.js` wardrobe panel |
| 3.5 | 成就殿堂：黃字位置 + 篩選分頁 + 可領提示 (原#25+#33) | `hub.js` achievements panel |
| 3.6 | 出擊選角初始武器縮放重疊 (原#26) | `hub.js` `drawSortie()` |
| 3.7 | 個人小屋標點與 ESC 說明排版 (原#27) | `hub.js` personal panel |

### 四、跑局內 HUD 與互動
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 4.1 | 跑局 HUD 佈局全面修正 (原#38) | `src/game/hud.js` |
| 4.2 | 撿取道具持久紀錄欄 (原#36) | `hud.js`、`run.js` |
| 4.3 | 撿取裝備 panel 下方重疊 (原#37) | `run.js` equip choice panel |
| 4.4 | 掉落物外框分類 + 寶箱鑰匙提示 (原#41) | `pickup.js`、`world.js` |
| 4.5 | 升級選擇強化 Hover／間距／顏色 (原#28) | `run.js` level-up choice |
| 4.6 | 武器進化隱性視覺提示 (原#15) | `hud.js` 武器圖示 |
| 4.7 | 進入地圖「按空白開始」自動觸發 Bug (原#39) | `run.js` intro |
| 4.8 | 離開跑局確認彈窗 (原#14) | `run.js` 返回大廳 |
| 4.9 | 跑局中成就解鎖通知橫幅 (原#13) | `run.js`、`hud.js` |
| 4.10 | 探索結算頁面全面優化（含傷害來源說明、羈絆圖示、標題黃色）(原#29) | `run.js` results |
| 4.11 | **局內顯示已遊玩時間（新）** | `run.js` `drawStageHud()` |
| 4.12 | **撿取裝備時對比顯示目前裝備效果（新）** | `run.js` `openEquipChoice`／`drawEquipDiff` |

### 五、任務與成就系統
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 5.1 | 存活任務進度條邏輯 Bug 修正 (原#30) | `content/quests.js`、`run.js`、`hud.js` |
| 5.2 | 多任務同時追蹤 (原#31) | `hub.js`、`hud.js` |
| 5.3 | 追蹤任務進度數值顯示 (原#32) | `hud.js` quest tracker |

### 六、新手引導與難度
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 6.1 | 新手教學：城鎮引導（全玩家適用）(原#10) | `hub.js`、`state.js` |
| 6.2 | 新手教學：首局戰鬥提示 (原#11) | `run.js` |
| 6.3 | 首局 HUD 暫停說明 + 升級卡片外框 (原#40) | `run.js`、`hud.js` |
| 6.4 | 難度選擇說明文字 (原#12) | `hub.js` `drawSortie()` |
| 6.5 | **新增「劇情難度」（新）** | `balance.js`、`run.js`、`hub.js`、`world.js`、`server` |

### 七、新系統與後端
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 7.1 | 玩家回饋系統 (原#9) | `hub.js`、`api.js`、`ui.js`、`server.js`、`db.js` |
| 7.2 | 魂晶銀行借貸系統 (原#34) | 新 content + hub panel + server |
| 7.3 | **後台「遊玩中」即時可見（新）** | `api.js`、`realtime.js`、`server.js`、`ui.js`、`run.js` |
| 7.4 | Service Worker 離線快取 (原#17) | `sw.js`（新檔）、`index.html` |

### 八、戰鬥數值與 build 系統
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 8.1 | **拾取範圍與武器範圍分離且皆可升級（新）** | `state.js`、`balance.js`、`player.js`、`talents.js`、`abilities.js` |
| 8.2 | **羈絆系統可見化（新）** | `run.js` build 面板、升級選項、`hub.js` 圖鑑 |

### 九、經濟平衡
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 9.1 | **金幣獲取 nerf（太好賺）（新）** | `balance.js`、`talents.js`、`abilities.js`、`facilities.js`、`events.js`、gen 檔 |

### 十、Bug 修正與後期關卡調整
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 10.1 | **進化後基礎武器仍出現升級選項（BUG）** | `src/game/progression.js` |
| 10.2 | **最終 Boss 死後仍繼續生怪（BUG）** | `src/game/scenes/run.js` |
| 10.3 | **死神移速大幅加強** | `src/game/content/enemies.js` |
| 10.4 | **武器進化路徑顯示（build 面板）** | `run.js`、`hud.js` |
| 10.5 | **裝備掉落機率降低** | `balance.js` |

---

# 一、全域視覺與排版基礎

## 1.1 全域字型改為標楷體 (原#1)

**檔案：** `src/engine/renderer.js`

**現況（約 L209）：**
```js
const FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", system-ui, sans-serif';
```

**目標：**
```js
const FONT = '"標楷體", "DFKai-SB", "BiauKai", "Kaiti TC", "Kaiti SC", "STKaiti", "AR PL UKai CN", "Microsoft JhengHei", "PingFang TC", sans-serif';
```

- 前置列出各平台標楷體字型名（Windows `DFKai-SB`／macOS `BiauKai`／Linux `AR PL UKai CN`）。
- `Microsoft JhengHei` 作為降級備援。
- 此單一改動影響所有 `uiText()`／`textWidth()` 呼叫。

## 1.2 全形標點符號統一 (原#2)

**規則：** 中文語境下標點一律全形。

| 半形 | 全形 |
|------|------|
| `,` `.` `!` `?` `:` `;` `()` | `，` `。` `！` `？` `：` `；` `（）` |

**主要異動：** `src/game/content/npcs.js`（需全文掃描），高頻問題行：
- L28 `'只有一條:活著回來,…'` → `'只有一條：活著回來，…'`
- L33 `'要看看任務板嗎?'` → `'要看看任務板嗎？'`
- L52 `'才不是!'` → `'才不是！'`
- L66 `'初次來到魂晶之鎮嗎?'`／`'出擊傳送門;…'` → `？`／`；`
- L91 `'你好強!'`、`'…買的嗎?'` → `！`、`？`

**其他掃描檔案：** `hub.js`（面板標籤、Esc 選單）、`net/ui.js`（登入 modal、排行榜）、`hud.js`（提示文字）、個人小屋（見 3.7）。

## 1.3 UI 自動縮放修正 (原#8)

**檔案：** `src/engine/renderer.js`（約 L43）

**現況：**
```js
export function uiScale() {
  return Math.max(1, Math.min(3, Math.round(Math.min(W, H * 1.2) / 640)));
}
```

**目標（連續縮放，消除跳格與跑版）：**
```js
export function uiScale() {
  const base = Math.min(W / 960, H / 600);   // 以 960×600 為設計基準
  return Math.max(0.75, Math.min(2.5, base));  // 0.75x–2.5x 連續縮放
}
```

- 移除 `Math.round()`；下限 0.75 讓小螢幕完整顯示，上限 2.5 避免 4K 過大。
- 確認 `index.html` 的 `<meta name="viewport">` 含 `width=device-width, initial-scale=1`。
- **這是多數面板跑版／不置中問題的根因之一**，搭配 3.0 一起處理。

## 1.4 金幣文字統一為圖示 (原#35)

**問題：** 全遊戲混用「金」「金幣」，部分無圖示。

**修正方向：**
- 定義輔助函式 `goldStr(amount)` → 帶金幣圖示前綴（或在渲染時先畫金幣 sprite 再接數字）。
- 將 `'XXX 金'`、`'XXX 金幣'`、`'花費 XX 金'` 全部改用 `goldStr()`。
- 搜尋關鍵字：`'金'`、`'金幣'`、`+ ' 金'`、`+ '金'` 逐一替換。
- 優先區域：鍛造特效價格、天賦升級、任務獎勵、出擊金幣、結算（與 4.1 的 HUD 金幣對齊一併處理）。

## 1.5 選單／按鈕對比與外框 (原#24)

**問題：** 城鎮 ESC 選單與各 panel 按鍵與背景色差太小，難辨邊界。

**修正方向（全域適用）：**
- ESC 選單按鈕：深藍底加 1–2px 外框（比背景亮 20–30%），hover 時外框加亮。
- panel 內「確認／取消／升級」次要按鈕：加圓角 stroke 外框，底色與背景明確色差。
- 分頁按鈕（tab）：未選中底色更暗，選中底色亮且加底部強調線。
- 可參考 `net/ui.js` 的 `net-primary`／`net-ghost` 樣式，統一套到 Canvas UI。

---

# 二、城鎮：對話與場景

## 2.1 對話框新增主角頭像（右側）(原#3)

**檔案：** `hub.js` `drawDialogue()`（約 L246–265）

**目標：** 右側鏡像新增「主角頭像 + 英雄名稱」。

```
┌──────────────────────────────────────────────────────┐
│ [NPC頭像] NPC名‧稱號                  英雄名  [主角頭像] │
│   對話文字內容…（保留原有換行邏輯）                        │
│                                          ▸ 繼續 (E)  │
└──────────────────────────────────────────────────────┘
```

**程式異動：**
1. `const charId = META.selectedChar || 'hunter'`
2. `const heroSp = getSprite('char_' + charId)`（回退 `'player'`）
3. 右側對稱位置繪製頭像框（`uiRect`）+ sprite（`drawSpriteUI`）。
4. 頭像上方繪英雄名稱，顏色用白色／淺金色（**不**用 NPC 顏色）。名稱來源 `Characters.get(charId)?.name`。
5. 對話文字 `textMaxW` 計算需扣除右側頭像欄寬度，避免被遮。

**頭像框尺寸：** `64 * S`，右對齊 `x + w - 12*S - 64*S`。

## 2.2 對話框上一頁按鈕 (原#16)

**檔案：** `hub.js` `drawDialogue()`／`updateDialogue()`

- `drawDialogue()`：左下角新增「◀ 上一頁」按鈕，`d.page === 0` 時隱藏，樣式與右下「▸ 繼續 (E)」對稱。
- `updateDialogue()` 新增：
```js
if (pressed('left') && d.page > 0) d.page--;                          // 左方向鍵
if (mouse.justDown && inside(mx, my, prevBtnRect) && d.page > 0) d.page--;  // 點擊
```
- 往回只減 `d.page`，不觸發特殊邏輯；往前與結束邏輯不變。

## 2.3 「新」徽章元件：NPC 驚嘆號 (原#4)

> **此處定義一個可重用的徽章繪製，3.5 的成就建築可領提示沿用同一元件。**

**檔案：** `hub.js` NPC 名稱渲染段（約 L619–624）

**現況：** `uiText((isNew ? '❗' : '') + n.def.name, …)` — 驚嘆號前置混排於名字。

**目標：** 名字**正上方**獨立繪製黃色圓框 + 白色 `!`；名字本身顏色不變。

```js
// 共用徽章元件（建議抽成 hub.js 內部 helper）
function drawNewBadge(bx, by, S) {
  const r = 7 * S;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c518'; ctx.fill();                 // 明黃
  ctx.lineWidth = 1.5 * S; ctx.strokeStyle = '#7a5c00'; ctx.stroke();  // 深琥珀邊
  uiText('!', bx, by + 1, { size: 10 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900', shadow: false });
}

// NPC 名稱渲染：
uiText(n.def.name, ss.x, ss.y, { size: 11 * S, align: 'center', color: n.def.color, weight: '800' });  // 名字（顏色不變）
if (isNew) drawNewBadge(ss.x, ss.y - 14 * S, S);   // 名字上方 14px
```

## 2.4 E 鍵互動提示文字優化 (原#5)

**檔案：** `hub.js`（約 L617、L623、L633）

| 位置 | 現況 | 修改後 |
|------|------|--------|
| 建築正下方（靠近時） | `按 E` | `【E】進入` |
| NPC 正下方（靠近時） | `交談 E` | `【E】交談` |
| 底欄左側固定說明 | `走近建築/居民按 E` | `靠近 NPC 或建築，按【E】互動` |

- `【E】` 全形方括號，使按鍵視覺突出；底欄其他快捷鍵說明標點一併改全形。

## 2.5 城鎮地板藍色亮點調降 (原#6)

**檔案：** `src/art/town_floor.js`，sprite `town_floor3`（約 L140–160）

**問題：** 靈晶紋路 `P.shard` + `glow` 過亮，玩家誤以為可撿取。

1. `p.glow(8, 8, 5, P.shard, 0.30, 4)` → 透明度 `0.30` 降至 `0.12`
2. `p.star4(8, 8, 3, withAlpha(P.shardL, 0.85), P.white)` → shardL `0.85`→`0.40`，`P.white`→`withAlpha(P.white, 0.5)`
3. 可選：部分線條 `P.shard`→`P.stone`（灰），更像刻紋而非寶石
4. **出現率不變**（`floorVar` 機率邏輯不動）

## 2.6 城鎮地圖外側視覺處理 (原#19)

**問題：** 地圖外為純黑硬邊界，視覺突兀。

**方案 A — 漸層霧化遮罩（推薦）：** `hub.js` `draw()` 最後一層，四邊繪製向內漸層消失的半透明黑（`linearGradient`），寬約 3–4 tile，外 0.9 → 內 0.0。

**方案 B — 鏡頭限制：** clamp 鏡頭範圍使外側不入視窗，需依 `world.tw*TS`／`world.th*TS` 計算邊界。

## 2.7 建築與物品加入碰撞體積 (原#21)

**檔案：** `world.js` `makeCamp()`

- 大型站台／建築：在其 sprite 佔用 tile 範圍設 `WALL`／新增 `SOLID` 標記。
- 小型裝飾（燈、旗）：用玩家中心距離判定（`dist < obj.radius` 推開），不整塊封鎖。
- **不可封鎖互動觸發點（E 鍵範圍）**，只阻擋穿越。

---

# 三、城鎮：功能面板

## 3.0 全域面板通則（先讀這節）(原#22 抽出)

以下規則**適用所有城鎮 panel**（鐵匠鋪／天賦／公會／衣帽間／成就／個人小屋／出擊），各小節不再重複：

1. **置中**：所有 panel 的 x、y 起點用 `view.W/2 - w/2`、`view.H/2 - h/2`，**不可**硬編碼偏移（這是不同解析度下 UI 偏移的主因，與 1.3 一起解）。
2. **捲軸不重疊**：有捲動條的清單，內容區寬度需扣除捲軸寬（約 `8 * S`），捲軸畫在內容**外側**。
3. **按鈕層級**：頂部分頁按鈕（tab）視覺權重 > 行內操作按鈕（領取／進行中）。行內按鈕高度與字號需**小於** tab。
4. **圖層順序**：背景 → 內容 → tab/標題列 → modal/tooltip。tab 不可「浮在最前但背景斷裂」。
5. **框格包覆**：行內元素（右側按鈕等）x 上限 = `panelX + panelW - padding`，不得溢出外框。

## 3.1 鐵匠鋪 UI 跑版與等級顯示 (原#18)

**檔案：** `hub.js` 鍛造 panel + 營地設施 panel

1. **底部截斷**：「疾速」等特效被面板底邊截斷 → 捲動容器設明確最大高度與可捲到底。
2. **字體與圖示排列**：特效行名稱／說明與圖示對齊、行高統一。
3. **營地設施等級**：由「Lv.x / max」文字 → 改為與天賦／鍛造一致的**方格進度條**（`■` 已升／`□` 未升，格數 = `maxLevel`）。

## 3.2 教堂天賦 UI 全面修正 (原#20)

**檔案：** `hub.js` `drawTalents()`

1. 升級方格進度條與右側金幣標價**同水平基線**對齊。
2. 標題／圖示／名稱／說明字體放大 10–20%。
3. 底部「點擊節點花費金幣升級 · Esc 關閉」被遮 → 移到標題列右側小字或 panel 外上方。
4. 「攻勢／守備／機動／財富」各欄加細邊框或背景色塊（呼應 1.5）。
5. 標題列加底部分隔線或背景框。
6. 說明過長截斷 → hover 時浮出完整 tooltip（`drawTooltip()`）或點擊展開卡片。
7. 捲軸不重疊（見 3.0 第 2 條）。

## 3.3 獵人公會介面修正 (原#22)

**檔案：** `hub.js` guild panel。除套用 3.0 通則外，公會專屬：
1. 分頁按鈕（任務委託／公會等級）圖層正確（3.0 第 4 條）。
2. 「領取／進行中」行內按鈕縮小（3.0 第 3 條）。
3. **XP 欄空時仍顯示空條**：`guild.xp === 0` 時畫 0 填充空條，**不可**隱藏整條。
4. 右側「進行中」框格不溢出外框（3.0 第 5 條）。
5. panel 置中（3.0 第 1 條）。

## 3.4 衣帽間重新進貨按鈕位置 (原#23)

**問題：** 「重新進貨」按鈕與商品列表重疊且偏小。

- 移至 panel 頂部右側工具列（與「重置鍛造／重置天賦」同區），與標題列齊高。
- 最小寬 `80 * S`、高 `28 * S`，文字「↺ 重新進貨」。
- 旁顯示所需金幣（付費刷新）或倒數計時（免費刷新）。

## 3.5 成就殿堂：黃字位置 + 篩選分頁 + 可領提示 (原#25 + #33)

**檔案：** `hub.js` achievements panel + station 渲染

**A. 黃色統計文字位置 (原#25)：** 「已解鎖 xx / 總計 xx」目前浮在列表上遮擋末行 → 固定在 panel 內部底部留白區（底邊上 `24 * S`），列表捲動範圍不延伸到此區；或移到標題列右側小字。

**B. 篩選分頁 (原#33B)：** panel 頂部新增 3 tab：**全部 / 已達成 / 未達成**，切換僅過濾清單。

**C. 成就建築可領提示 (原#33A)：** station 渲染中若 `hasClaimableAchievements(META)`，在成就殿堂建築名稱上方呼叫 **2.3 的 `drawNewBadge()`**（共用同一黃色圓框徽章）。

**D. 成就分類擴充（可延後 Round 17）：** 成就新增 `category`（`combat`／`collection`／`progress`／`story`），篩選 tab 可選分類。

## 3.6 出擊選角初始武器縮放重疊 (原#26)

**檔案：** `hub.js` `drawSortie()`

- 角色卡片展開的「起始武器：XXX」文字應在角色名稱**下方固定行**，y 起點用 `cardY + nameH + gapH`，不與名稱共用 y。
- 極小 `uiScale` 下若卡片高度不足，省略初始武器行（不截斷）。

## 3.7 個人小屋標點與 ESC 說明排版 (原#27)

- 掃描 personal panel 所有字串，半形標點改全形（併入 1.2）。
- ESC 說明與介紹文字改上下兩行；說明（如「ESC 關閉」）作副行，字號縮 10–20%，顏色 `withAlpha('#fff', 0.5)`。

---

# 四、跑局內 HUD 與互動

## 4.1 跑局 HUD 佈局全面修正 (原#38)

**檔案：** `src/game/hud.js`

1. **右上角金幣圖示與數字垂直置中對齊**（目前一高一低）。
2. **擊殺數與金幣呈現統一**為「圖示 + 數字」格式。
3. **地圖名稱獨立一行且放大**：移到畫面頂部中央獨立行，字號 +20%，可加淺色底框。
4. **衝刺冷卻欄與上一行間距**：加 `gapY = 8 * S`。
5. **左側元素對齊**：HP 欄／等級／XP 條／衝刺欄統一以 `leftX = 12 * S` 起始。

**原則：** HUD 座標改用具名常數 `leftX`／`rightX`／`topY` 計算，取代分散硬編碼 offset。

## 4.2 撿取道具持久紀錄欄 (原#36)

**問題：** 撿取提示消失太快，玩家忙於閃避看不清。

**方案 A — 右側持久紀錄欄（推薦）：**
- HUD 右側顯示最近 **5 筆**：圖示 + 名稱 + 效果（如 `🧪 血瓶 +30 HP`）。
- 最新一筆高亮（白），舊紀錄透明度 0.8→0.4→0.2，超過 5 筆移除最舊。
- 每筆停留 **8 秒**後淡出（淡出 2 秒）。
- `run._pickupLog = []`，撿取時 push `{ icon, text, t }`；`hud.js draw()` 取最後 5 筆依時間算透明度渲染。

**方案 B — 浮動文字加長（最小改動）：** 停留 1s→3s，字號 +10%，加半透明底框。

## 4.3 撿取裝備 panel 下方重疊 (原#37)

- 裝備選擇 panel 固定尺寸，底部留 padding，說明文字（按 E 確認／Esc 放棄）畫在 panel **內部底部**（`y = panelY + panelH - 20*S`），不超出邊界。
- panel 背景不透明度 `alpha ≥ 0.92`，蓋住底層 HUD。
- 高度不足時優先縮短說明文字，不壓縮屬性列表。

## 4.4 掉落物外框分類 + 寶箱鑰匙提示 (原#41)

**檔案：** `pickup.js`（掉落物渲染）、`world.js`（寶箱）

**A. 掉落物外框分類**（sprite 外 `1.5px` 圓框 + 輕微 `shadowBlur=3`，遠距離降透明度）：

| 類型 | 外框顏色 |
|------|---------|
| 裝備 equipment | `#f5c518`（金）|
| 道具 item | `#4fc3f7`（藍）|
| 能力／被動 passive | `#66bb6a`（綠）|
| 魂晶／貨幣 | 無外框 |

**B. 寶箱鑰匙提示**（`chest.requireKey`）：
- 無鑰匙靠近：上方浮動 `🔑 需要鑰匙`（紅，脈動）。
- 有鑰匙靠近：`🔑 按 E 開啟`（綠）。
- 「靠近提示」邏輯需區分兩種狀態。

## 4.5 升級選擇強化 Hover／間距／顏色 (原#28)

**檔案：** `run.js` 升級選項 panel

1. **圖層**：繪製順序 背景 → 卡片底 → 圖示 → 文字 → hover 框（僅 stroke 不填色），hover 永遠最上但不遮內容（解決破圖）。
2. 頂部「點擊選擇強化」提示 y 固定在 panel 外上方，不受 hover 影響。
3. **間距**：圖示↔名稱 `6*S`，名稱↔說明 `4*S`，卡片上下 padding `10*S`。
4. **類型顏色**（左邊緣 `3*S` 寬色條，不影響文字區）：武器 `P.shard`（青藍）／被動 `P.greenL`（綠）／裝備 `P.gold`（金）。**與 4.4、6.3B 的顏色約定一致。**

## 4.6 武器進化隱性視覺提示 (原#15)

**設計原則：** 不明說，讓玩家自行發現。

**觸發：** 武器滿級（`level >= maxLevel`）且持有 `evolveReq` 被動。

```js
function canEvolve(inst, player) {
  const def = Weapons.get(inst.id);
  if (!def?.evolveInto || !def?.evolveReq) return false;
  if (inst.level < (def.maxLevel ?? 7)) return false;
  return player.passives.some(p => p.id === def.evolveReq);
}

// hud.js 武器圖示繪製後：canEvolve 為真時追加緩慢脈動白金光暈邊框
ctx.save();
ctx.globalAlpha = 0.35 + Math.sin(run.elapsed * 2.5) * 0.15;
ctx.shadowColor = '#ffe88a'; ctx.shadowBlur = 8 * S;
ctx.strokeStyle = withAlpha('#ffe88a', 0.6); ctx.lineWidth = 1.5 * S;
ctx.strokeRect(iconX - 1, iconY - 1, iconW + 2, iconH + 2);
ctx.restore();
```

## 4.7 進入地圖「按空白開始」自動觸發 Bug (原#39)

**問題：** intro 顯示「按空白開始」但未按鍵就自動開始。

**根因推測：** 用 `pressed()` 而非 `justPressed()`（上一場景殘留按鍵）／倒數計時誤觸／場景切換未清除按鍵狀態。

**修正：**
- `run.js init()` 末尾呼叫 `input.clearAll()` 清殘留按鍵。
- intro 觸發條件改 `input.justPressed('space') || mouse.justDown`（只認本場景新輸入）。
- 若有自動倒數，顯示秒數（3…2…1…）。

## 4.8 離開跑局確認彈窗 (原#14)

**觸發點：** Esc 選單「🏠 返回大廳」與設定頁「返回大廳」。

```
確定要放棄本次跑局嗎？
本次進度不會被記錄，已取得的強化將全數清除。
      [繼續遊戲]          [放棄並返回]
```
- 用現有 `ask(text, detail, onYes)` 機制。
- **Reaper 時段或已通關時不彈窗**（正常流程）。

## 4.9 跑局中成就解鎖通知橫幅 (原#13)

**觸發點：** `checkAchievements()` 解鎖時額外呼叫 `run.queueAchievementToast(ach)`。

```js
_achToasts = [];   // { name, endT }
queueAchievementToast(ach) { this._achToasts.push({ name: ach.name, endT: this.elapsed + 4 }); }
```
- `hud.js` 右上角繪製，最多 2 條堆疊；深金底 `#2a1f00` + 金邊 `P.gold` + 白字；淡入 0.3s → 停留 3s → 淡出 0.5s。

## 4.10 探索結算頁面全面優化 (原#29)

**檔案：** `run.js` results screen

1. **被動圖示↔文字** 間隔加大至 `8*S`。
2. **裝備文字換行**：裝備名稱移到圖示**正下方**，不與圖示同 y。
3. **傷害排行簡化**：色塊只留傷害數值，移除「占比 XX%」，整體縮小、行高降低。
4. **本局成就只顯示圖示**：`iconOr(ach.icon, 'star')` 橫列小圖示，hover 顯示 tooltip（名稱+說明），可顯示更多。
5. **威脅／存活改卡片式**：每指標一張小卡（icon+標籤+數值）水平排列，如 `⚡ 最高威脅 13`、`⏱ 存活 12:34`、`💀 擊殺 430`。

**4.10-D 傷害來源說明（新增）：**

**問題：** 傷害排行末位出現「持續傷害」和「被動技能」兩個 bucket，玩家不知道這些標籤包含哪些具體機制（見截圖：持續傷害 16.8k、被動技能 528）。

**各 bucket 代表的機制（根源於 `world.attributeDamage` 的 src 字串）：**

| bucket 名稱 | 實際來源 |
|-------------|---------|
| 持續傷害 | 毒（poison DoT）、流血（bleed DoT）、灼燒（burn DoT） — 狀態效果的每 tick 傷害。`status.js` `tickStatus()` 呼叫 `world.attributeDamage('dot', dmg)` |
| 被動技能 | 特定被動能力觸發的主動傷害（如傷害反射、部分觸發型被動）。非武器主動射出的 projectile/aura，`attributeDamage('passive', dmg)` |

**修正方向：**
1. **Hover tooltip**：滑鼠移到傷害排行某行時（或 Tab build 面板），浮出小框說明來源：
   - 「持續傷害：毒、流血、灼燒等狀態效果的每 tick 傷害」
   - 「被動技能：傷害反射、觸發型被動等非武器直接傷害」
2. **可選進階**（Round 17）：`attributeDamage('dot:poison')` 等子 key，讓「持續傷害」拆成毒／流血／灼燒個別條。

**4.10-E 羈絆顯示改圖示 + 效果說明（新增）：**

**現況：** 結算頁「本局配置」底部僅顯示純文字列表 `羈絆：鑑藏家、萬法通曉、鋼鐵壁壘、武器庫、血色君王`，玩家不知道各羈絆做什麼。

**目標：** 每個已觸發羈絆顯示為一個小卡：`[圖示] 羈絆名稱` + 第二行灰色小字（`bonusDesc` — 羈絆效果說明，如「攻速 +30%、所有武器傷害 +15%」）。

**版面（示意）：**
```
━━ 觸發的羈絆 ━━━━━━━━━━━━━━━━━━━━━━
  [⚔] 武器庫           [❄] 鑑藏家
  所有武器傷害 +20%     撿取範圍 +40%

  [🌀] 萬法通曉
  技能冷卻 -25%、爆擊 +15%
```

**實作要點：**
- 來源：`bonds.js` 的 `bonusDesc` 欄位（每個 bond def 已有此字串）。
- 圖示：`iconOr(bond.icon || 'bond_' + bond.id, 'star')`；bond 若無 icon 定義則用預設星形圖示。
- 每行 2 個，超過 4 個自動換行；每個小卡寬 `~(W/2 - 20)*S`，高 `44*S`。
- 標題「觸發的羈絆」與前方大標題字色同步（見 4.10-F）。

**4.10-F 結算頁大標題改金黃色（新增）：**

**現況：** 結算頁「本局配置」「傷害排行」「本局解鎖」等區塊大標題為白色。

**目標：** 所有區塊標題改為金黃色 `#f5c518`，與 HUD 金幣、成就建築提示等一致，視覺分層更清楚。

**受影響標題（`run.js` results 渲染）：**
- 「本局配置」、「武器」、「被動」、「裝備」子標題
- 「傷害排行」、「來源 · 估比」欄頭
- 「本局解鎖」、「觸發的羈絆」

**實作：** 在 `drawResults()` 各 `uiText('...標題...', ...)` 呼叫中加 `color: '#f5c518'`（或定義 `COL_HEADING = '#f5c518'` 常數統一套用）。

## 4.11 局內顯示已遊玩時間（新）

**問題：** 局內 HUD 只顯示「距下個事件倒數」（`drawStageHud()` 的 `距小王 5:32`／`距最終首領 2:15`），玩家不知道**自己已經玩了多久**。

**現況（探索結果）：** `run.time` 已逐幀累加（秒），但未顯示為「已遊玩時間」；結算後存入 `META.stats.playTime`。

**修正方向（`run.js` `drawStageHud()`）：**
- 在既有倒數標籤**下方或旁邊**新增一行已遊玩時間：
```js
const el = Math.floor(this.run.time);
const emm = Math.floor(el / 60), ess = el % 60;
uiText(`⏱ ${emm}:${ess.toString().padStart(2, '0')}`, x, y, { size: 13 * S, color: withAlpha('#fff', 0.7), weight: '700' });
```
- 位置：頂部中央倒數標籤下方一行，字號略小、淺色，避免與倒數搶眼。
- 與 4.1 HUD 佈局一併調整對齊（地圖名／倒數／已遊玩時間 三行垂直排列、置中）。
- 滿 20 分鐘（`LEVEL_TIME`）後可改顯示總時長，不再往上加（已進入最終決戰／死神階段）。

## 4.12 撿取裝備時對比顯示目前裝備效果（新）

**現況（探索結果）：** `openEquipChoice(def)` 的面板（`run.js` L816–844）目前顯示：
- 新裝備的圖示／名稱／欄位（專武／護甲／飾品）／`desc`。
- 三格已裝備**圖示**（weapon/armor/trinket，目標欄位加金框 ◀）。
- `drawEquipDiff()` 的「替換後變化」**淨差值**（只列有變動的屬性 `before → after`）。

**問題：** 玩家看得到「淨差值」與目前裝備的**圖示**，但看不到**目前該欄位裝備的效果文字**（它的 `desc`／屬性），無法直接對比「現在這件給我什麼 vs 換上去給我什麼」。

**目標：左右並排「目前裝備 ↔ 新裝備」的效果文字，下方保留既有差值。**

**版面：**
```
┌──────────────────────────────────────────────┐
│            撿到裝備 · [護甲]                    │
│  ┌─ 目前裝備 ─────┐   ┌─ 新裝備 ─────────┐   │
│  │ [圖示] 皮革護甲 │   │ [圖示] 鋼鐵護甲   │   │
│  │ 生命上限 +18    │ → │ 生命上限 +30      │   │
│  │ 減傷 +2         │   │ 減傷 +4、反傷 +1  │   │
│  └────────────────┘   └──────────────────┘   │
│  替換後變化： 生命上限 200 → 212  減傷 3 → 5   │
│         [空白/E 裝備]      [Esc 放棄]          │
└──────────────────────────────────────────────┘
```

**實作要點：**
- 取目前該欄位裝備 id：`run.equipment[def.slot]`；用 `Equipment.get(id)` 取得其 `name`／`desc`。
- 左欄渲染目前裝備（圖示 + 名稱 + `desc` 逐行）；右欄渲染新裝備（同格式）；中間 `→`。
- 欄位**空**時左欄顯示「（此欄位目前無裝備）」。
- 武器欄（`weapon`）目前裝備為簽名武器：顯示其武器名稱與關鍵屬性（傷害／射速／穿透／彈數），對應既有 `equipDiffRows` 的武器分支資料。
- 下方保留現有 `drawEquipDiff()`「替換後變化」淨差值，不移除（兩者互補：左右=各自效果，下方=合計差值）。
- 與 4.3 一併確保面板高度足夠、說明文字在 panel 內部底部、不與 HUD 重疊。

---

# 五、任務與成就系統

## 5.1 存活任務進度條邏輯 Bug 修正 (原#30)

**問題：** 存活 2:57、距「存活 3 分鐘」差 3 秒未達成，但左上任務追蹤已顯示經驗條（如同達成）。

**根因：** 判斷「是否顯示完成樣式」用了錯條件（如 `progress >= 0` 而非 `progress >= target`）。

**修正（`quests.js`／`hud.js`）：**
- **只在 `progress >= target` 才顯示完成填滿樣式**。
- 進行中（`0 < progress < target`）顯示部分填充，**不**滿格。
- 未達成時不出現綠色完成樣式。

## 5.2 多任務同時追蹤 (原#31)

- `META.quest.tracked` 由單一字串 → **陣列（最多 3 條）**。
- 左上 HUD 顯示最多 3 條（標題 + 進度條 + 數值，見 5.3）。
- 公會「追蹤」按鈕改切換：已追蹤→取消；未滿 3→加入；已滿 3→toast「最多同時追蹤 3 項」。
- 主線任務固定第一條，不佔追蹤欄位。

## 5.3 追蹤任務進度數值顯示 (原#32)

- 每條追蹤在進度條旁顯示 `(當前/目標)`：時間 `(2:57 / 3:00)`、計數 `(148 / 300)`、百分比 `49%`。
- 數值以淺色小字顯示於進度條右側／下方；hover 顯示完整任務說明 tooltip。

---

# 六、新手引導與難度

## 6.1 新手教學：城鎮引導（全玩家適用）(原#10)

**觸發條件：** 僅檢查 `!META.tutorialDone`，**不限 `totalRuns`**（新帳號與舊版升級玩家皆觸發；看過則不再）。

**觸發時機：** `hub.js init()` 末尾，載入後 1 秒延遲。
```js
if (!META.tutorialDone) setTimeout(() => this.triggerTutorial(), 1000);
```
新增 `triggerTutorial()`：找 `id='guide'` NPC → `openDialogue(guideNpc)`，結束回呼 `META.tutorialDone = true; saveMeta()`。

**腳本（蕾恩，5 頁）：**
```
1：「你醒了……終於。我是蕾恩，城鎮的嚮導。」
2：「這裡是魂晶之鎮，獵手們在戰場闖蕩後回來的避風港。」
3：「傳送門就在廣場中央——走進去，選好英雄和生態，出發狩獵！」
4：「回來後，把賺來的金幣花在各個房間，讓自己越來越強。」
5：「其他居民也可以交談，他們各有各的故事……準備好了嗎？」
```
`state.js`：`META.tutorialDone` 存於 META root（不存在視為 false）。

## 6.2 新手教學：首局戰鬥提示 (原#11)

**觸發：** `!META.tutorialBattleDone`（不限 totalRuns）；全部顯示完後 `META.tutorialBattleDone = true; saveMeta()`。

```js
_battleHints = [
  { t: 3,  text: '武器自動瞄準並射擊，無需手動操作。' },
  { t: 12, text: '按【空白】或【滑鼠右鍵】可緊急閃避。' },
  { t: 22, text: '按【B】隨時開啟商店，花費魂晶強化裝備。' },
  { t: 33, text: '按【M】查看小地圖，按【Tab】查看目前配裝。' },
  { t: 45, text: '升級時停止時間，從三個選項中選擇強化。' },
];
```
- 畫面下方中央半透明橫幅，淡入 0.5s → 停留 3s → 淡出 0.5s，深藍底白字，不阻擋遊玩。

## 6.3 首局 HUD 暫停說明 + 升級卡片外框 (原#40)

**A. 首局 HUD 暫停（比 6.2 更主動）：**
- 觸發 `!META.tutorialHUDDone`（不限 totalRuns）；正式開始後 **2 秒**。
- `run.paused = true`，顯示 overlay：各 HUD 元素旁白色指示線 + 標注文字框（HP／等級／武器／被動／任務追蹤／衝刺），底部「按任意鍵繼續」。
- 按鍵後取消暫停，`META.tutorialHUDDone = true; saveMeta()`。

**B. 升級卡片外框：** 每張卡片加 `2*S` 圓角外框，顏色依類型（武器青藍／被動綠／裝備金，**與 4.5 一致**），hover 加亮。

## 6.4 難度選擇說明文字 (原#12)

**檔案：** `hub.js` `drawSortie()` 難度區段。選中某難度時下方說明欄顯示：

| 難度 | 說明文字 |
|------|---------|
| D1 | 適合初次體驗，敵人血量與傷害較低。 |
| D2 | 敵人有機會形成包圍圈，需注意走位。 |
| D3 | 敵人持續砲擊，高壓戰場，挑戰中級。 |
| D4 | 敵人射程增加，建議熟悉各英雄再挑戰。 |
| D5 | 極限壓力，敵人傷害大幅提升，魂晶高手限定。 |

- 淺灰小字顯示於難度按鈕下方，不佔按鈕空間。**劇情難度說明見 6.5。**

## 6.5 新增「劇情難度」（新）

**設計概念：** 一個比 D1 更低的「劇情」難度，主打**輕鬆體驗劇情**——只要別完全掛機，幾乎必過關，且運氣（掉落）比一般難度更好。內部 `difficulty = 0`。

**現有難度機制（探索結果）：**
- `run.js` L188：`this.diffMul = 1 + (Math.max(1, this.run.difficulty || 1) - 1) * 0.35;`（D1=1.0 … D5=2.4）。`diffMul` 乘到所有敵人／boss／魂牢 hp/dmg。
- 運氣由 `world.js` 的 `luck` 與 `DROP_CHANCE_MULT` 決定，**目前與難度無關**。
- 難度為整數，多處硬編碼（見下方清單）。

**A. 平衡參數（`balance.js` 新增）：**
```js
STORY_DIFF_MUL:   0.5,   // 敵人 hp/dmg 僅一般的一半
STORY_LUCK_BONUS: 0.5,   // 額外 luck（疊加在玩家既有 luck 上）
STORY_DROP_MULT:  1.6,   // 掉落率倍率（運氣更好）
STORY_SCORE_MULT: 0.3,   // 結算分數倍率（避免污染排行榜，見 D）
```

**B. `run.js` 難度倍率特例（L188）：**
```js
const d = this.run.difficulty ?? 1;
this.diffMul = (d <= 0)
  ? BALANCE.STORY_DIFF_MUL
  : 1 + (d - 1) * 0.35;
this.storyMode = (d <= 0);
```
- 將 `world.storyMode = this.storyMode`，供掉落運算讀取。
- `world.js` 掉落處：`storyMode` 時 `luck += BALANCE.STORY_LUCK_BONUS`、`dropM *= BALANCE.STORY_DROP_MULT`。

**C. 出擊選擇器（`hub.js` `drawSortie()` / `maxDiff()`）：**
- 允許 `selDiff` 下探到 `0`；`0` 顯示為「劇情」而非「難度 0」。
- 劇情難度**永遠可選**（不需解鎖），固定排在 D1 左側。
- 難度說明（6.4 表）新增一列：**劇情 — 輕鬆體驗劇情，敵人極弱、掉落更佳；不列入排行榜競爭。**
- 涉及的 clamp：`hub.js` L502/L1065 的 `Math.max(1, …)` → `Math.max(0, …)`。

**D. 排行榜公平性：**
- 劇情難度結算分數乘 `STORY_SCORE_MULT`（或標記 `storyMode` 後**排行榜查詢排除**）。建議後端 `/api/runs` 對 `difficulty <= 0` 的成績照常入庫但排行榜 SQL 加 `WHERE difficulty >= 1` 過濾。

**E. 需同步放寬整數下限的位置（探索清單）：**
| 檔案 | 位置 | 動作 |
|------|------|------|
| `server/src/realtime.js` | `clampDiff()` `Math.max(1, Math.min(5, d))` | → `Math.max(0, …)` |
| `src/net/social.js` | 房間難度下拉 `['1'..'5']` | 加 `'0'`（顯示「劇情」）|
| `src/game/scenes/hub.js` | `drawSortie()` clamp / `maxDiff()` | 允許 0 |
| `src/game/scenes/run.js` | `diffMul` 計算（見 B）、難度橫幅顯示字串 | 0 顯示「劇情」 |
| `src/net/ui.js` | 排行榜／admin 對局表 `'D'+(difficulty||1)` | 0 顯示「劇情」 |

---

# 七、新系統與後端

## 7.1 玩家回饋系統 (原#9)

玩家可在城鎮 ESC 選單點「回報問題」，填類別與描述送出；管理員於後台查看、改狀態、下載 JSON。

**7.1-A 資料庫（`server/src/db.js`，`initSchema()` 接在 `bans` 表後）：**
```sql
CREATE TABLE IF NOT EXISTS feedback (
  id          bigserial PRIMARY KEY,
  user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
  guest_name  text,
  category    text NOT NULL,
  content     text NOT NULL,
  status      text NOT NULL DEFAULT 'pending',
  admin_note  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback (status, created_at DESC);
```

**7.1-B 後端 API（`server/src/server.js`）：**
```js
const feedbackSchema = z.object({
  category: z.enum(['ui', 'gameplay', 'bug', 'content', 'other']),
  content:  z.string().min(5).max(1000),
  name:     z.string().max(24).optional(),
});

// 玩家提交（不需登入；有 JWT 就附 user_id）
app.post('/api/feedback', async (req, reply) => {
  const parsed = feedbackSchema.safeParse(req.body || {});
  if (!parsed.success) return reply.code(400).send({ error: zodMsg(parsed.error) });
  const { category, content, name } = parsed.data;
  let userId = null;
  try { await auth(req, {}); userId = req.user?.id ?? null; } catch {}
  await pool.query(
    `INSERT INTO feedback (user_id, guest_name, category, content) VALUES ($1, $2, $3, $4)`,
    [userId, name || null, category, content]);
  return { ok: true };
});

// 管理員查詢（status/limit/offset）
app.get('/api/admin/feedback', { preHandler: requireAdmin }, async (req) => {
  const { status, limit = 100, offset = 0 } = req.query || {};
  const where = status ? `WHERE f.status = $3` : '';
  const params = status
    ? [clampInt(limit,1,500), clampInt(offset,0,1e6), status]
    : [clampInt(limit,1,500), clampInt(offset,0,1e6)];
  const r = await pool.query(
    `SELECT f.id, COALESCE(u.username, f.guest_name, '訪客') AS author,
            f.category, f.content, f.status, f.admin_note, f.created_at
     FROM feedback f LEFT JOIN users u ON u.id = f.user_id ${where}
     ORDER BY f.created_at DESC LIMIT $1 OFFSET $2`, params);
  return { rows: r.rows };
});

// 管理員更新狀態／備註
app.patch('/api/admin/feedback/:id', { preHandler: requireAdmin }, async (req, reply) => {
  const schema = z.object({
    status:     z.enum(['pending','reviewing','fixed','dismissed']).optional(),
    admin_note: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) return reply.code(400).send({ error: zodMsg(parsed.error) });
  const { status, admin_note } = parsed.data;
  const id = parseInt(req.params.id);
  if (!id) return reply.code(400).send({ error: 'invalid id' });
  const sets = [], vals = [id];
  if (status !== undefined)     sets.push(`status = $${vals.push(status)}`);
  if (admin_note !== undefined) sets.push(`admin_note = $${vals.push(admin_note)}`);
  if (!sets.length)             return reply.code(400).send({ error: 'nothing to update' });
  sets.push(`updated_at = now()`);
  await pool.query(`UPDATE feedback SET ${sets.join(', ')} WHERE id = $1`, vals);
  return { ok: true };
});
```

**7.1-C 前端 API（`src/net/api.js`）：**
```js
submitFeedback(category, content, name) { return req('/feedback', { method: 'POST', body: { category, content, name } }); }
adminFeedback(params = {}) { const qs = new URLSearchParams(params).toString(); return req('/admin/feedback' + (qs ? '?' + qs : ''), { authed: true }); }
adminUpdateFeedback(id, patch) { return req('/admin/feedback/' + id, { method: 'PATCH', authed: true, body: patch }); }
```

**7.1-D 城鎮入口（`hub.js`）：**
```js
items.push({ id: 'feedback', label: '⚑ 回報問題', col: P.goldL });   // escMenuItems()，放「⚙ 設定」前
else if (id === 'feedback') openFeedback();                          // onEsc(id)
```

**7.1-E 回饋表單 Modal（`src/net/ui.js` 新增 `openFeedback()`）：** 類別下拉（`ui`/`gameplay`/`bug`/`content`/`other`）+ 描述 textarea（即時字數，≤1000）+ 暱稱（選填）；未登入也可送出；成功 `toast('回饋已送出，感謝你的回報！')`。

**7.1-F 管理介面分頁（`src/net/ui.js openAdmin()`）：**
```js
const tabDefs = [['overview','總覽'], ['players','玩家'], ['runs','對局'], ['cast','廣播'], ['feedback','回饋']];
```
- 篩選列（全部／待處理／處理中／已修正／忽略）+「下載 JSON」（抓 `adminFeedback({limit:500})` → `<a download>`，檔名 `feedback_YYYY-MM-DD.json`）。
- 列表每行：展開（看完整內容 + 可編輯 `admin_note`，含「儲存備註」）／修改狀態下拉（即時 `adminUpdateFeedback`）。
- 狀態色碼：待處理 `#f5c518`／處理中 `#4fc3f7`／已修正 `#66bb6a`／忽略 `#78909c`。

## 7.2 魂晶銀行借貸系統 (原#34)

**概念：** 城鎮可向「魂晶銀行」借金幣提前強化，下一局結算自動還款（含利息）。

**規則：**
- 初始可借 **50 金幣**；隨公會等級解鎖 100／200／500 上限。
- 還款額 = 本金 × 1.2；同時僅能有一筆借款（未還清不可再借）。

**存檔（`META.bank`）：** `{ debt: 0, borrowed: 0 }`（debt = 含息應還，borrowed = 本金顯示用）。

**還款（`bankRun(run, meta)` 結算時，`debt > 0`）：**
- `meta.gold >= debt`：扣除、清空 debt。
- `meta.gold < debt`：扣光現有金幣，剩餘 debt 留到下一局。
- 結算畫面顯示「還款 XX 金幣（含利息）」。

**城鎮 UI：** 廣場／市場放「魂晶銀行」招牌（新 station 或老潘 NPC 擴充）；panel 顯示欠款／可借額度／借款按鈕（帶確認）；有欠款時按鈕改「已有借款（剩餘 XX 待還）」不可再借。

## 7.3 後台「遊玩中」即時可見（新）

**問題（玩家回報「看不到訪客遊玩中」）的根因（探索結果）：**
- 單人跑局**完全離線**；WS 閘道需 JWT，訪客根本沒有連線。
- 訪客只在**跑局結束上傳成績**（`/api/runs/guest`）後，才經 `touchGuest()` 進入 `recentGuests`，顯示於後台「最近 15 分鐘訪客」。
- 因此**正在遊玩中的人（尤其訪客單人局）對管理員是隱形的**——後台只知道「打完的人」，不知道「正在打的人」。

**方案：輕量 REST 心跳（同時涵蓋登入者與訪客）**

後端只是 relay、單人不連 WS，故用 REST 心跳最簡單、且登入／訪客通用。

**7.3-A 後端（`server/src/realtime.js` + `server/src/server.js`）：**
- `realtime.js` 新增記憶體 `livePlayers = new Map()`，key 為 client 產生的 `sessionId`（或登入者 uid／訪客 IP+暱稱），value `{ name, guest, biome, difficulty, startedAt, lastBeat }`。
- 新增方法：
```js
touchPlaying({ sid, name, guest, biome, difficulty }) {
  this.livePlayers.set(sid, { name, guest: !!guest, biome, difficulty, startedAt: (this.livePlayers.get(sid)?.startedAt) ?? Date.now(), lastBeat: Date.now() });
}
stopPlaying(sid) { this.livePlayers.delete(sid); }
activePlaying() {   // 只回最近 60 秒有心跳的
  const now = Date.now(), out = [];
  for (const [sid, p] of this.livePlayers) { if (now - p.lastBeat > 60000) this.livePlayers.delete(sid); else out.push({ ...p, elapsed: Math.floor((now - p.startedAt)/1000) }); }
  return out.sort((a,b) => b.startedAt - a.startedAt).slice(0, 80);
}
```
- `adminOverview()` 回傳值增加 `playing: this.activePlaying()`，`totals.playing = playing.length`。
- `server.js` 新增（公開、限流）：
```js
app.post('/api/presence/play', async (req, reply) => {
  const { sid, name, guest, biome, difficulty } = req.body || {};
  if (!sid) return reply.code(400).send({ error: 'sid required' });
  // 登入者用 JWT 的 username 覆蓋 name，避免冒名
  let nm = String(name || '訪客').slice(0, 24);
  try { await auth(req, {}); if (req.user?.username) nm = req.user.username; } catch {}
  realtime.touchPlaying({ sid: String(sid).slice(0,64), name: nm, guest: !req.user, biome, difficulty });
  return { ok: true };
});
app.post('/api/presence/stop', async (req, reply) => {
  const { sid } = req.body || {}; if (sid) realtime.stopPlaying(String(sid).slice(0,64));
  return { ok: true };
});
```
> 註：心跳屬高頻，務必納入既有限流策略（IP 級），避免被濫用。

**7.3-B 前端（`src/net/api.js` + `run.js`）：**
- `api.js`：`pingPlaying(info)` → `req('/presence/play', { method:'POST', authed: Net.isLoggedIn(), body: info })`；`stopPlaying(sid)` → `req('/presence/stop', …)`。皆 offline-first（無伺服器則 no-op，不可影響單人）。
- 產生穩定 `sid`：存於 `localStorage`（`soulshard.sid`），不存在則隨機產生。
- `run.js`：`init()` 與每 30 秒呼叫 `Net.pingPlaying({ sid, name: META.name||'訪客', guest: !Net.isLoggedIn(), biome: run.biomeId, difficulty: run.difficulty })`；`finishRun()`／離開大廳時呼叫 `Net.stopPlaying(sid)`。

**7.3-C 管理介面（`src/net/ui.js openAdmin()`）：**
- 「總覽」tab 增加「🟢 遊玩中（N）」清單，或「玩家」tab 內新增子區塊；每列：暱稱（訪客標 🔓）、生態、難度、已遊玩時間（`elapsed`）。
- 既有 5s 自動 `render()`（overview/players）已會帶出最新 `playing`。

## 7.4 Service Worker 離線快取 (原#17)

**新增檔案：** `sw.js`（專案根目錄）。**策略：** Cache-First。**範圍：** `index.html`、`src/**.js`、`assets/music/*.mp3`。

```js
const CACHE = 'soulshard-v1';
const PRECACHE = ['/', '/index.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith('/api')) return;   // API 走網路
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return res;
  })));
});
```
```html
<!-- index.html <script> 末尾 -->
<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');</script>
```
- 更新版本改 `CACHE` 常數（`soulshard-v2`）強制清舊快取；開發測試可於 DevTools → Application → Service Workers 點 Unregister 暫停用。

---

# 八、戰鬥數值與 build 系統

## 8.1 拾取範圍與武器範圍分離且皆可升級（新）

**現況（探索結果）：**
| 概念 | 欄位／常數 | 預設 | 是否可升級 |
|------|-----------|------|-----------|
| 拾取磁吸半徑 | `stats.pickupRange`（`state.js`）| 26 | ✅ 天賦 `t_pickup`(感知)、被動 `magnet`、裝備 |
| AoE 範圍倍率 | `stats.area`（`state.js`）| 1 | ✅ 被動 `orbit_aura`、羈絆、鐵砧 |
| **武器自動瞄準距離** | `BALANCE.AIM_RANGE`（全域常數）| 300 | ❌ **無法升級**（寫死） |

**問題：** 玩家分不清「拾取範圍」與「武器範圍」，且「武器射程」其實是寫死的全域常數，完全不能升級。

**目標：三者明確分離、且「武器範圍」可升級。**

**A. 新增 `aimRange` stat（把全域常數改成可成長的 stat）：**
- `state.js makeBaseStats()` 新增：`aimRange: BALANCE.AIM_RANGE`（預設 300，沿用現值）。
- 自動瞄準程式碼（搜尋 `AIM_RANGE` 的使用點，主要在 `player.js`／武器 `fire()` 的選敵）改讀 `player.stats.aimRange ?? BALANCE.AIM_RANGE`。
- `BALANCE.AIM_RANGE` 保留為**預設基準值**（fallback），不刪除。

**B. 三條清楚分離的升級路線（命名須讓玩家一眼分辨）：**
| stat | 顯示名稱 | 升級來源（範例） |
|------|---------|-----------------|
| `pickupRange` | **拾取範圍** | 天賦「感知」（已有，`+12%/級`）、被動「拾取磁石」 |
| `aimRange` | **武器射程** | 新增天賦「鷹眼」`aimRange +8%/級`、新增被動「遠視符文」`aimRange +20%` |
| `area` | **作用範圍** | 既有被動「環繞光環」、鐵砧「增幅」（AoE 大小，與射程不同）|

- **新增天賦「鷹眼」**（`talents.js`，攻勢或機動分類）：每級 `aimRange ×(1+0.08*level)`，maxLevel 5。
- **新增被動「遠視符文」**（`abilities.js`）：`aimRange ×1.20`，maxStacks 4。
- 既有「感知（拾取範圍）」與「環繞光環（作用範圍）」維持不動，僅確保**三者文案用詞不同**（拾取範圍／武器射程／作用範圍），不再混用「範圍」一詞造成混淆。

**C. UI 呈現：**
- 升級選項（4.5）與天賦面板（3.2）中，三種 range 用各自固定名稱顯示。
- Tab build 面板（與 8.2 同一面板）的數值區，分行列出「拾取範圍 / 武器射程 / 作用範圍」三個獨立數值，讓玩家確認當前各自大小。

> 平衡備註：`aimRange` 升級會讓自動選敵更遠、體感更強，屬於正向 QoL；上限可加 clamp（如 `aimRange ≤ 600`）避免全屏鎖定。寫入 `BALANCE.AIM_RANGE_CAP`。

## 8.2 羈絆系統可見化（新）

**現況（探索結果）：**
- `content/bonds.js` 定義羈絆：`{ id, name, tag, desc, bonusDesc, need(ctx), bonus(stats,player) }`。
- `run.js` 每 0.5s 呼叫 `checkBonds(run, player)`；達成時跳橫幅 `★ 羈絆達成 · 烈焰之心（傷害 +6%）`，結算頁列出已達成羈絆。
- **完全沒有探索 UI**：玩家事前看不到有哪些羈絆、需要什麼組合，升級時也不知道「選哪個會湊成羈絆」。

**範例羈絆（來自 `bonds.js`）：**
| 名稱 | 需求 | 效果 |
|------|------|------|
| 烈焰之心 | 燃魂 ＋ 任一火焰武器 | 傷害 +6% |
| 雷霆網絡 | 連鎖閃電 ＋ 迅捷符文 | 射速 +8% |
| 血色君王 | 吸血 ＋ 任一詛咒被動 | 吸血 +2% |

**目標：讓玩家「事前知道、事中提示、事後回顧」。**

**A. Tab build 面板新增「羈絆」區（`run.js` `drawBuildPanel()`）：**
- 列出**所有羈絆**，分三種狀態：
  - **已達成**（亮金、打勾）：`✓ 烈焰之心 — 傷害 +6%`
  - **接近達成**（白字 + 高亮缺口）：已滿足部分需求，標示還差什麼，如 `烈焰之心 — 已有🔥火焰武器，尚缺「燃魂」被動`
  - **未達成**（灰字）：完整顯示需求 `desc`，如 `雷霆網絡 — 連鎖閃電 ＋ 迅捷符文`
- 需求拆解：`bonds.js` 的 `need(ctx)` 是純函式不易拆解，建議**為每個羈絆補上結構化 `req` 欄位**（如 `req: { weapons:['w_fan','w_aura','w_inferno'], abilities:['ignite'] }`），UI 依 `req` 逐項比對玩家當前 build 顯示「已具備／缺少」。`need()` 維持為實際判定（兩者並存，`req` 僅供 UI 顯示）。

**B. 升級選項標記（`run.js` 升級三選一）：**
- 若某個升級選項**會湊成或推進**一個尚未達成的羈絆，在卡片角落加一個醒目小標 `★ 羈絆`（金色），呼應 4.5 的卡片外框。
- 判定：對每個候選選項，模擬「加入後」是否讓某羈絆的 `req` 更接近滿足（缺口減少）。
- 不劇透完整效果，只標「★ 羈絆」吊玩家胃口（與武器進化隱性提示 4.6 的精神一致，但羈絆給明確標記因為玩家**主動詢問要看得到**）。

**C. 達成橫幅強化（沿用現有 banner）：**
- 現有 `★ 羈絆達成 · 名稱（效果）` 橫幅保留，加上 `world.particles.ring` 金色粒子（已有），維持醒目。

**D. 城鎮羈絆圖鑑（`hub.js`，個人小屋收藏頁或新分頁）：**
- 列出所有羈絆與需求（`name` + `desc` + `bonusDesc`），**曾達成過的**標亮（存 `META.bondsSeen[]`），未達成的顯示需求供玩家規劃 build。
- 對應現有 `stats.bondsTriggered` 統計；新增 `META.bondsSeen` 記錄首次達成的羈絆 id 集合。

---

# 九、經濟平衡

## 9.1 金幣獲取 nerf（太好賺）（新）

**問題：** 金幣太容易賺，後期金幣溢出、城鎮升級失去取捨。

**現況（探索結果）—— 金幣來源與加成：**

| 來源 | 公式／數值 | 受 `goldMult` 影響 |
|------|-----------|-------------------|
| 雜兵掉金（`world.js dropLoot`）| `round(e.gold × (1 + floor×0.08) × goldMult × GOLD_DROP_MULT)`，`GOLD_DROP_MULT = 0.5` | ✅ |
| 最終王（`run.js` L474）| `220 + 難度×160 + 威脅×18`（固定）| ❌ |
| 死神（`run.js` L498）| `600 + 難度×200`（固定）| ❌ |
| 迷途之魂 NPC（L266）| `30 + 威脅×6`（固定）| ❌ |
| 結算入庫（`state.js bankRun`）| `META.gold += run.gold`（1:1，無倍率）| — |

**`goldMult` 加成來源（目前無上限，可疊乘到極高）：**

| 來源 | 檔案 | 現值 | 建議 nerf |
|------|------|------|-----------|
| 天賦 `t_gold`（財運）| `talents.js`（手寫）| +6%/級 ×6 = 1.36× | **+4%/級** |
| 設施 `f_bank`（金庫）| `facilities.js`（手寫）| +5%/級 ×5 = 1.25× | **+3%/級** |
| 被動 `greed`（貪婪之觸）| `abilities.js`（手寫）| ×1.25/層 ×5 = **3.05×** | **×1.15/層**（5 層 ≈1.99×）|
| 贊助 `p_midas`（麥達斯）| `events.js`（手寫）| +25% | **+15%** |
| 天賦 `g_scavenger`（拾荒者）| **`gen/talents.js`** | +8%/級 ×5 = 1.40× | **+5%/級** |
| 裝備 `g_greed_ring`（貪婪之戒）| **`gen/equipment_gear.js`** | +30% | **+20%** |

**修正方向：**

1. **全域底數**：`balance.js` `GOLD_DROP_MULT` `0.5 → 0.35`（雜兵掉金 −30%）。
2. **加上限**：`balance.js` 新增 `GOLD_MULT_CAP: 3.0`，在計算掉金時 clamp `goldMult`（目前無任何天花板，這是失控主因）。
3. **逐項調降**：依上表「建議 nerf」欄調整各加成的每級／每層數值。
4. **固定獎勵微調（可選）**：最終王 `難度×160 → ×120`、死神 `難度×200 → ×150`，避免高難度速刷王塞金。

**⚠️ Gen 檔注意事項（CLAUDE.md gotcha）：** `g_scavenger`（`gen/talents.js`）、`g_greed_ring`（`gen/equipment_gear.js`）屬 workflow 生成檔，**`integrate.mjs` 會覆蓋手改**。修改後須**同步改 workflow 來源**或記錄為再整合時重套的 patch（與 round6 的 gen 手改處置一致）。`GOLD_DROP_MULT`、`t_gold`、`f_bank`、`greed`、`p_midas` 為手寫檔，安全。

**驗證基準（sim）：** 以 D3、20 分鐘完整局，比較 nerf 前後單局入庫金幣；目標為**中後期不再金幣溢出、城鎮升級需取捨**，但開局前 5 分鐘金幣節奏不致過慢（避免傷害新手體驗）。建議用 `__DBG` 跑幾局取平均。

---

# 不修改的項目

- 對話框 NPC 名字顏色（`n.def.color`）— 維持原設計，僅異動驚嘆號徽章。
- 城鎮地板**出現率**（`floorVar` 機率）— 不變，只調低視覺亮度。
- 現有 NPC 對話**語意** — 只改標點，不改劇情文字。
- 音樂／音效音量分離 — 已於舊版本實作，無需修改。
- 武器進化條件 — 不以文字提示，保留玩家自行探索。
- 核心戰鬥數值平衡（D1–D5 既有曲線）— 不動；劇情難度為**額外低檔**，不影響既有難度。

---

# 十、Bug 修正與後期關卡調整

## 10.1 進化後基礎武器仍出現升級選項（BUG）

**檔案：** `src/game/progression.js`（`rollLevelUpChoices()` 或等效函式）

**問題（截圖可見）：** 武器進化後（如「魂晶彈」→「魂晶風暴」），升級選項仍出現「魂晶彈 — 新武器」，玩家可再次取得已演化掉的基礎武器，白白佔用武器欄槽位。

**根因：** 武器升級池篩選時只排除**玩家身上已擁有**的武器，但進化會把基礎武器從裝備列表刪除（或替換），導致篩選後該 id 重新可取。

**修正：**
1. `run.js`（或 `world.js`）在武器進化時記錄基礎武器 id：
```js
// 進化時（player 的武器演化邏輯觸發後）：
run.evolvedWeaponIds = run.evolvedWeaponIds || new Set();
run.evolvedWeaponIds.add(baseWeaponId);
```
2. `progression.js` `rollLevelUpChoices()` 篩選武器 pool 時排除已演化的基礎 id：
```js
const pool = allWeapons.filter(w =>
  !player.hasWeapon(w.id) &&
  !(run.evolvedWeaponIds?.has(w.id))   // ← 新增：不顯示已演化的基礎武器
);
```
3. 若同一基礎武器可再次取得有設計意圖，應改為「升級」而非「新武器」呈現，但預設行為應為**不重複提供**。

## 10.2 最終 Boss 死後仍繼續生怪（BUG）

**檔案：** `src/game/scenes/run.js`

**問題：** 擊殺最終 Boss 觸發 `clearLevel()` 後，敵人生成（`spawnTick`）與事件系統（`eventsTick`）仍繼續運作，玩家在勝利動畫期間持續被追殺。

**修正：** `clearLevel()` 設旗標，生成邏輯以此 gate：

```js
clearLevel() {
  if (this.cleared) return;
  this.cleared = true;
  // … 既有勝利邏輯（動畫、解鎖、bankRun 等）
}

spawnTick(dt) {
  if (this.cleared) return;       // ← 新增：已通關不繼續生怪
  // … 原邏輯
}

eventsTick(dt) {
  if (this.cleared) return;       // ← 新增：已通關停止事件（包括魂牢）
  // … 原邏輯
}
```

- **現有敵人**：不強制清除（讓玩家自行解決或等待 Reaper 登場），只停止**新生成**。
- Reaper 仍照原定時 `REAPER_DELAY` 秒後登場（Reaper 的生成不走 `spawnTick`，不受影響）。

## 10.3 死神移速大幅加強

**問題：** 目前 Reaper（死神）移速過慢，玩家可輕鬆沿地圖邊緣跑圈無限規避，緊迫感不足。

**檔案：** `src/game/content/enemies.js`（Reaper 定義段）

**現況：** 查找 `id: 'reaper'` 的 enemy def，目前 speed 約為 `50–70`（接近一般追擊型敵人）。

**目標：**
- **基礎移速提高至 ~130–150**（約為玩家基礎速度 `200` 的 65–75%）；既有「玩家越慢 Reaper 越快」的追逐縮放邏輯**維持**。
- **加速度（追及機制）**：若玩家移動速度 ≥ Reaper 當前速度，Reaper 額外加速 `+20 /s`（每秒加 20 速度），讓無限繞圈策略失效。
- **限制跑圈**：可選在 `enemy.js` Reaper AI 加入「切角預測」— Reaper 朝玩家移動向量的前方投影點靠近，而非直線追尾。

```js
// enemies.js Reaper 定義建議調整（速度欄位）：
{ id: 'reaper', ..., speed: 140, ... }

// enemy.js Reaper AI（加速追趕邏輯）：
if (isReaper && world.player.speed >= this.speed) {
  this.speed = Math.min(this.speed + 20 * dt, 220);  // 上限 220，不超過玩家最速
}
```

## 10.4 武器進化路徑顯示（build 面板）

**問題：** 遊戲有武器進化系統（`evolveInto`／`evolveReq`），但玩家在 build 面板（Tab 鍵）看不到「這把武器可以進化成什麼」，也不知道還差哪個被動，**實質上進化系統是隱形的**（與 8.2 羈絆可見化同類問題）。

**注意：** 現有只有「進化」（一武器 + 指定被動 → 更強版本）；如未來有兩武器合成（fusion）則另行設計，本項僅覆蓋現有 evolveInto 路徑。

**目標：** Tab build 面板「武器」欄，每把可進化的武器下方顯示進化路徑提示。

**版面（示意）：**
```
[魂晶彈] Lv.7  ← 已達進化等級
  ↓ 進化：魂晶風暴（需要：[圖示] 聚能石 被動）
  已持有「聚能石」✓  → 按【Tab 進化】  ← 僅當條件全滿
```
或（尚未達到條件時）：
```
[魂晶彈] Lv.3
  ↓ 進化路徑：魂晶風暴（Lv.7 + 聚能石被動）
  條件：等級 7/7  聚能石 ✗（尚未取得）
```

**實作要點（`run.js` `drawBuildPanel()` 或 `hud.js`）：**
1. 對 `player.weapons` 每把 `inst`，查 `def.evolveInto`（若有）。
2. 取 `Weapons.get(def.evolveInto)` 與 `def.evolveReq`（被動 id）。
3. 判斷 `inst.level >= def.maxLevel`（等級條件）及 `player.hasPassive(def.evolveReq)`（被動條件）。
4. 顯示：「↓ 進化：{evolvedName}」 + 條件圖示（等級條綠／灰 + 被動圖示 ✓／✗）。
5. 兩條件皆滿足：加「即將進化！」提示（金色），或直接說明下次升滿自動觸發。
6. 無 `evolveInto` 的武器不顯示此欄。

## 10.5 裝備掉落機率降低

**問題：** 裝備（護甲、飾品、武器槽裝備）掉落過於頻繁，玩家在戰況激烈時頻繁被「撿取裝備」選擇面板打斷，體驗不佳。

**檔案：** `src/game/balance.js`

**現況（需確認欄位名稱）：** 裝備掉落相關欄位可能為 `GEAR_DROP_CHANCE`、`EQUIP_DROP_CHANCE`，或在 `world.js` `dropLoot()` 中硬編碼。

**目標：** 整體裝備掉落率降低 **20–30%**。建議值（探索後確認實際欄位再調整）：

| 調整對象 | 建議方向 |
|---------|---------|
| 一般敵人裝備掉落 | ×0.7（降 30%） |
| 精英敵人裝備掉落 | ×0.8（降 20%，精英仍比一般更多） |
| boss 裝備掉落 | 不動（保持每 boss 至少 1 件）|

**附加調整：** 裝備撿取面板顯示時，同時更新 `_pickupLog`（見 4.2），讓玩家即使 Esc 拒絕也有記錄可查。

---

# 驗證方式（依分類）

**一、全域視覺**
1. 字型：DevTools → Computed → font-family 確認楷體；中文帶楷書筆觸。
2. 標點：逐一對話 NPC + 巡視各 panel，無半形標點。
3. UI 縮放：視窗 800×500 與 2560×1440，面板不截斷、不過大、置中。
4. 金幣圖示：全遊戲「金／金幣」皆為圖示，無混用。
5. 按鈕對比：ESC 選單與各 panel 按鈕邊框清晰，hover 高亮。

**二、城鎮對話與場景**
6. 對話框右側出現英雄頭像 + 名字；換角色後正確；左下「◀ 上一頁」第 2 頁起出現、可往回。
7. 清 `META.npc.met` 後 NPC 名字**上方**出現黃圓框 `!`，交談後消失，名字顏色不變。
8. E 鍵提示為「【E】進入／【E】交談」；底欄文字正確。
9. 城鎮地板靈晶紋路不刺眼、不像可撿物。
10. 地圖外側漸層霧化，無硬黑邊。
11. 玩家無法穿過建築與大型裝飾。

**三、城鎮面板**（套用 3.0 通則）
12. 各 panel 置中、捲軸不遮內容、tab 權重>行內按鈕、框格不溢出。
13. 鐵匠鋪底部可捲到底；營地設施為方格等級條。
14. 天賦：進度條與金幣同高；分類有框；說明 hover tooltip；底部說明不被遮。
15. 公會：分頁圖層正確；XP 空時顯示空條；「進行中」框不溢出。
16. 衣帽間「重新進貨」在標題列右側，不重疊。
17. 成就：黃字在列表下方不遮擋；有 全部／已達成／未達成 tab；可領時建築上方有黃圓框 `!`。
18. 出擊選角縮放後初始武器不與名稱重疊。
19. 個人小屋無半形標點；ESC 說明獨立一行。

**四、跑局 HUD 與互動**
20. HUD：金幣圖示與數字對齊；地圖名獨立放大；衝刺欄間距正確；左側對齊。
21. 撿取道具右側持久紀錄欄，最新高亮、舊的半透明。
22. 撿取裝備彈窗下方說明不壓其他 UI。
23. 掉落物彩色外框（裝備金／道具藍／能力綠）；寶箱無鑰匙顯示紅「🔑 需要鑰匙」、有鑰匙顯示綠「按 E 開啟」。
24. 升級選項：hover 無破圖、不遮頂部提示；三類型有顏色條；間距寬鬆；卡片有外框。
25. 滿足進化條件的武器圖示邊框緩慢脈動白金光暈，無文字。
26. 未按空白不自動開始跑局。
27. Esc「返回大廳」彈確認；通關／Reaper 段不彈。
28. 出擊中解鎖成就，右上金色橫幅（淡入→停留→淡出），最多 2 條堆疊。
29. 結算：被動圖示間距、裝備換行、傷害排行無占比、成就僅圖示+hover、指標卡片化。
29b. 結算傷害排行「持續傷害」列 hover 顯示 tooltip「毒、流血、灼燒等狀態效果的每 tick 傷害」；「被動技能」列同樣有說明 tooltip。
29c. 結算頁羈絆以小卡格式呈現：圖示 + 羈絆名稱 + 灰色一行效果說明（`bonusDesc`）；每行 2 個，超過換行。
29d. 結算頁「本局配置」「傷害排行」「本局解鎖」「觸發的羈絆」等大標題為金黃色 `#f5c518`。
29e. 局內 HUD 頂部顯示已遊玩時間 `⏱ mm:ss`，隨遊戲累加。
29f. 撿取裝備面板左右並排「目前裝備效果 ↔ 新裝備效果」，下方保留替換後差值；空欄位顯示「（此欄位目前無裝備）」。

**五、任務與成就**
30. 存活 2:57 時任務追蹤**不**顯示滿格／完成樣式。
31. 左上 HUD 可同時顯示最多 3 條追蹤；公會「追蹤」切換邏輯正確。
32. 追蹤列顯示 `(當前/目標)`；hover 顯示完整說明。

**六、新手引導與難度**
33. 重置 `META.tutorialDone` → 進城鎮 1 秒後蕾恩自動對話；舊存檔（`totalRuns>0` 無 `tutorialDone`）同樣觸發。
34. 重置 `META.tutorialBattleDone` → 出擊第 3／12／22／33／45 秒依序浮動提示。
35. 重置 `META.tutorialHUDDone` → 首局開始 2 秒後暫停顯示 HUD 標注，按鍵繼續。
36. 出擊各難度下方顯示說明文字。
37. **劇情難度**：出擊可選「劇情」（在 D1 左、永遠可選）；該局敵人明顯極弱、掉落變多；幾乎不會死；結算分數打折／排行榜不顯示該局。

**七、新系統與後端**
38. 玩家回饋：ESC「⚑ 回報問題」→ 送出 → toast；後台「回饋」tab 可查看／篩選／改狀態／存備註／下載 JSON；未登入可送。
39. 魂晶銀行：可借款；下一局結算正確扣還（含息）；有欠款不可再借；額度隨公會等級解鎖。
40. **後台遊玩中**：開一局（登入或訪客）後，管理員後台「遊玩中」清單即時出現該玩家（暱稱／生態／難度／已遊玩秒數）；結束後約 60 秒內消失。
41. Service Worker：DevTools → Application 顯示已啟動；斷網重整仍可進入；MP3 正常播放。

**八、戰鬥數值與 build 系統**
42. 三種範圍分離：天賦／升級面板用「拾取範圍／武器射程／作用範圍」三個不同名稱，互不混用。
43. 武器射程可升級：升級「鷹眼」天賦或「遠視符文」被動後，武器自動鎖敵距離明顯變遠（`aimRange` 成長，受上限 clamp）。
44. 拾取範圍可升級：升「感知」天賦後魂晶吸取半徑變大；與武器射程互不影響。
45. 羈絆可見化：Tab build 面板列出全部羈絆（已達成／接近／未達成三態並標出缺口）；升級選項對可推進羈絆的選項標「★ 羈絆」；城鎮圖鑑可回顧。

**九、經濟平衡**
46. 金幣 nerf：`GOLD_DROP_MULT 0.35`、`goldMult` 受 `GOLD_MULT_CAP 3.0` 封頂；各加成（財運／拾荒者／貪婪之觸／金庫／貪婪之戒／麥達斯）依表調降。
47. sim 驗證：D3 完整 20 分鐘局，nerf 後單局入庫金幣明顯降低、中後期不再溢出；開局 5 分鐘節奏仍可接受。gen 檔改動已同步 workflow 來源或記錄重套。

**十、Bug 修正與後期關卡調整**
48. 武器進化後（如魂晶彈→魂晶風暴），升級選項**不再**出現已演化的基礎武器（魂晶彈不在池中）。
49. 擊殺最終 Boss 後，地圖**不再**生出新敵人；Reaper 仍依原定時序登場。
50. 死神移速明顯比舊版更快，玩家若靜止或速度不足無法擺脫；高速跑圈時死神仍能逐漸縮短距離。
51. Tab build 面板：可進化武器（有 `evolveInto`）下方顯示進化路徑 + 所需被動 ✓／✗；全條件滿足時顯示「即將進化！」。
52. 裝備掉落頻率明顯降低，一般敵人不再頻繁中斷戰鬥；精英與 Boss 掉落不受影響。

---

# changelog 條目

檔案：`docs/changelog/ROUND16.md`

```
## Round 16 — UX 大修 + 新手引導 + 玩家回饋 + 劇情難度

【全域視覺】
- 字型改標楷體（含 fallback 鏈）；半形標點全面改全形；金幣文字統一為圖示。
- UI 縮放改連續值，修正小視窗跑版與大螢幕過大；選單／按鈕加外框與色差。

【城鎮對話與場景】
- 對話框右側新增主角頭像與名稱、左下新增上一頁按鈕。
- NPC 任務驚嘆號改名字上方黃色圓框徽章（可重用元件）。
- E 鍵提示改【E】進入／【E】交談；地板靈晶亮點調降。
- 地圖外側加漸層霧化；建築與物品補上碰撞體積。

【城鎮面板】
- 訂定面板通則（置中／捲軸不重疊／按鈕層級／圖層／框格包覆）並套用全部 panel。
- 鐵匠鋪跑版修正 + 營地設施改方格等級條；教堂天賦全面修正（對齊／分類框／hover 說明）。
- 公會圖層與 XP 空條修正；衣帽間進貨按鈕移位；成就黃字下移 + 篩選分頁 + 可領提示徽章。
- 出擊選角初始武器縮放不重疊；個人小屋標點與 ESC 排版。

【跑局 HUD 與互動】
- HUD 佈局全面修正（金幣對齊／地圖名放大／衝刺間距／左側對齊）。
- 撿取道具改右側持久紀錄欄；撿取裝備彈窗重疊修正；掉落物彩色外框分類 + 寶箱鑰匙提示。
- 升級選項 hover 圖層／間距／類型顏色 + 卡片外框；武器進化隱性白金光暈。
- 修正「按空白開始」自動觸發 Bug；離開跑局確認彈窗；成就解鎖橫幅；結算頁面全面優化。
- 局內 HUD 新增已遊玩時間顯示。
- 撿取裝備面板新增「目前裝備 ↔ 新裝備」效果並排對比。

【任務與成就】
- 修正存活任務未達成卻顯示完成的 Bug；支援多任務（最多 3）同時追蹤 + 數值化進度。

【戰鬥數值與 build 系統】
- 拾取範圍／武器射程／作用範圍三者明確分離；武器射程改為可成長 stat（新天賦「鷹眼」、新被動「遠視符文」），拾取範圍維持可升級。
- 羈絆系統可見化：Tab build 面板列出全部羈絆（已達成／接近／未達成 + 缺口提示），升級選項標「★ 羈絆」，城鎮新增羈絆圖鑑。

【經濟平衡】
- 金幣獲取 nerf：GOLD_DROP_MULT 0.5→0.35、新增 goldMult 上限 3.0，並調降財運／拾荒者／貪婪之觸／金庫／貪婪之戒／麥達斯各加成，解決後期金幣溢出。

【Bug 修正與後期關卡調整】
- 修正武器進化後基礎武器仍出現升級池的 Bug（progression.js 篩選已演化 id）。
- 修正最終 Boss 死後仍繼續生怪的 Bug（clearLevel 設旗 gate spawnTick）。
- 死神（Reaper）基礎移速大幅提高（~140），加入追及加速機制，跑圈規避不再有效。
- 武器進化路徑在 Tab build 面板可見：顯示目標武器圖示、所需被動 ✓／✗，條件全滿時高亮「即將進化！」。
- 裝備掉落機率降低（一般敵人 ×0.7），減少戰況中頻繁被選擇面板中斷。
- 結算傷害排行：「持續傷害」「被動技能」bucket 加 hover tooltip 說明具體來源。
- 結算羈絆列表改為圖示小卡 + 效果說明（bonusDesc），每行 2 個。
- 結算頁所有大標題改為金黃色（#f5c518），視覺層級更清晰。

【新手引導與難度】
- 城鎮引導劇情（全玩家適用）+ 首局戰鬥提示 + 首局 HUD 暫停說明。
- 難度選擇說明文字；新增「劇情難度」（敵人極弱、掉落更佳、幾乎必過、不列入排行榜）。

【新系統與後端】
- 玩家回饋系統（ESC 入口 + feedback 資料表 + REST API + 後台「回饋」分頁，可篩選／改狀態／下載 JSON）。
- 魂晶銀行借貸系統（隨公會等級解鎖額度，下一局自動還款含息）。
- 後台「遊玩中」即時可見（REST 心跳，登入者與訪客通用，解決遊玩中玩家隱形問題）。
- Service Worker 離線快取（靜態資源 + MP3）。
```
