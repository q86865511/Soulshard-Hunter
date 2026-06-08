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
- **造型商店大改版**：兩層 UI（選角色→選造型）、全角色造型隨機池、隱藏造型大幅漲價。
- **城鎮 UX 補齊**：成就一鍵領取、城鎮成就通知、所有消費點補齊重置功能、城鎮消費全面調漲。
- **任務系統 Bug**：隱藏任務／傳奇之證等無法領取問題修正。

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
| 3.8 | **造型商店 UI 大改版：兩層選擇 + 全角色池 + 隱藏造型高價（新）** | `content/skinshop.js`、`hub.js` wardrobe panel |
| 3.9 | **城鎮消費重置功能完整化（新）** | `hub.js` 各 panel |

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
| 4.13 | **大地圖（M鍵）玩家標示醒目化（角色頭貼）（新）** | `run.js` minimap 渲染 |
| 4.14 | **祝福神（贊助者）新效果觸發提示（新）** | `run.js` patron event UI |
| 4.15 | **anvilChoice 三選一卡片對齊 + 替換失去效果顯示（新）** | `run.js` `drawAnvilChoice()` |
| 4.16 | **隱藏房間揭示 Modal 改版：UI 框 + 具體道具名稱（新）** | `run.js` hidden room reveal |
| 4.17 | **裝備更換後舊效果未清除（BUG）** | `src/game/player.js` `equipItem()` |
| 4.18 | **鍛造砧三選一：跳過 + 圖示 + 縮小卡片 + 豐富選項種類（新）** | `run.js` `drawAnvilChoice()` |
| 4.19 | **三選一面板中可按 TAB 查看個人 build（新）** | `run.js` `handleKeys()`、`drawBuildPage()` |

### 五、任務與成就系統
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 5.1 | 存活任務進度條邏輯 Bug 修正 (原#30) | `content/quests.js`、`run.js`、`hud.js` |
| 5.2 | 多任務同時追蹤 (原#31) | `hub.js`、`hud.js` |
| 5.3 | 追蹤任務進度數值顯示 (原#32) | `hud.js` quest tracker |
| 5.4 | **隱藏任務／傳奇之證等特殊任務無法領取（BUG）（新）** | `content/quests.js`、`hub.js` guild panel |
| 5.5 | **任務循序解鎖（前置任務）（新）** | `content/quests.js`、`hub.js` guild panel |

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
| 8.3 | **詛咒效果與負面效果強化（新）** | `content/equipment.js`、`content/abilities.js`、`status.js` |

### 九、經濟平衡
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 9.1 | **金幣獲取 nerf（太好賺）（新）** | `balance.js`、`talents.js`、`abilities.js`、`facilities.js`、`events.js`、gen 檔 |
| 9.2 | **城鎮消費全面調漲（天賦、設施、鍛造太便宜）（新）** | `balance.js`、`talents.js`、`facilities.js`、`content/forge.js` |
| 9.3 | **城鎮升級動態定價（VS 式：每次升級後其餘漲價）（新）** | `balance.js`、`hub.js` 各 panel、`state.js` |
| 9.4 | **裝備百分比加成改為加法堆疊（新）** | `player.js`、`balance.js`、`content/equipment.js` |

### 十、Bug 修正與後期關卡調整
| 編號 | 項目 | 主要異動檔案 |
|------|------|-------------|
| 10.1 | **進化後基礎武器仍出現升級選項（BUG）** | `src/game/progression.js` |
| 10.2 | **最終 Boss 死後仍繼續生怪（BUG）** | `src/game/scenes/run.js` |
| 10.3 | **死神移速大幅加強** | `src/game/content/enemies.js` |
| 10.4 | **武器進化路徑顯示（build 面板）** | `run.js`、`hud.js` |
| 10.5 | **裝備掉落機率降低** | `balance.js` |
| 10.6 | **金幣／道具被磁鐵彈走（排斥 Bug）** | `src/game/pickup.js`（或 `player.js` 吸附邏輯） |
| 10.7 | **Boss 被卡在地圖牆壁／走廊（BUG）** | `src/game/maps.js`、`src/game/enemy.js` Boss AI |

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

**E. 一鍵領取全部可領獎勵（新增）：**

**問題：** 成就多、可領獎勵分散各列，需一一點擊「領取」，操作繁瑣。

**修正：** panel 頂部右側加「全部領取」按鈕（`hub.js` achievements panel）：
```js
// 判斷是否有任何可領取成就
function hasAnyClaimable(META) {
  return Achievements.all().some(a =>
    a.claimable && isUnlocked(a.id, META) && !isClaimed(a.id, META)
  );
}
// 按鈕行為：迴圈呼叫 claimAchievement(id) 逐一領取
function claimAll(META) {
  Achievements.all().forEach(a => {
    if (a.claimable && isUnlocked(a.id, META) && !isClaimed(a.id, META))
      claimAchievement(a.id, META);
  });
  saveMeta();
}
```
- 按鈕只在 `hasAnyClaimable()` 為真時啟用（否則灰色禁用）。
- 按鈕觸發後 toast「已領取 X 筆成就獎勵！」。
- 同樣適用「獵人公會等級獎勵」的批次領取：若公會面板也有多個未領取等級獎勵，在公會 panel 加同樣的「全部領取」按鈕。

## 3.6 出擊選角初始武器縮放重疊 (原#26)

**檔案：** `hub.js` `drawSortie()`

- 角色卡片展開的「起始武器：XXX」文字應在角色名稱**下方固定行**，y 起點用 `cardY + nameH + gapH`，不與名稱共用 y。
- 極小 `uiScale` 下若卡片高度不足，省略初始武器行（不截斷）。

## 3.7 個人小屋標點與 ESC 說明排版 (原#27)

- 掃描 personal panel 所有字串，半形標點改全形（併入 1.2）。
- ESC 說明與介紹文字改上下兩行；說明（如「ESC 關閉」）作副行，字號縮 10–20%，顏色 `withAlpha('#fff', 0.5)`。

## 3.8 造型商店 UI 大改版（新增）

**問題：**
1. 商店只顯示 4 個隨機選項，造型多時大多數造型永遠不會出現。
2. 造型數量龐大（15+ 角色 × 多套），單層平鋪清單難以瀏覽。
3. 隱藏造型（完整不同體型）售價與普通造型相同，吸引力不足。

**A. 兩層 UI（`hub.js` wardrobe panel 整體改版）：**

**第一層 — 角色選擇（預設顯示）：**
```
┌─ 衣帽間 ─────────────────────────────────┐
│  選擇角色                                 │
│  [🗡 獵手] [🧊 冰靈] [💥 爆破者] …       │
│  各角色格：角色圖示＋名稱，角下方顯示          │
│            「已持有 2 / 5」               │
└───────────────────────────────────────────┘
```

**第二層 — 造型列表（點選角色後進入）：**
```
┌─ 衣帽間 > [獵手] ◀返回 ──────────────────┐
│ [我的造型] [商店購買]                      │
│                                          │
│  ◉ 預設          已裝備                  │
│  ○ 暗夜之刃       800 金幣   [購買]       │
│  ★ 死靈傀儡（隱）  3,500 金幣  [購買]     │  ← 捲動
│  ○ 烈焰          750 金幣   [購買]       │
│  ✓ 極光          已擁有    [裝備]        │
│                                          │
└───────────────────────────────────────────┘
```

- 返回按鈕（左上「◀ 返回」）回到第一層角色清單。
- 「我的造型」tab：只顯示該角色已擁有的造型，點擊「裝備」。
- 「商店購買」tab：顯示該角色**全部**造型，已持有標 `✓`，未持有顯示金幣價格與「購買」按鈕；隱藏造型標 `★` + 金色邊框。

**B. 商店刷新機制改版（`content/skinshop.js`）：**

**現況：** 4 個固定亂數槽位，每 30 分鐘刷一次（`meta.skinShop.nextRoll`）。

**新機制：** 廢除固定槽位；直接改成「每個角色的每個造型單獨可購買，無需等刷新」。
- 「商店購買」tab = 所有未擁有的造型清單，按角色分類（第二層顯示）。
- 廢除「重新進貨」按鈕（因為不再需要刷新），但保留「特賣」機制：
  - `meta.skinShop.sale` = 每週隨機 2 個普通造型打 8 折、1 個隱藏造型打 9 折。
  - 特賣造型在清單中顯示打折後價格 + 「特賣！」標籤（計時顯示剩餘時間）。
- 若保留 3.4 進貨按鈕（舊機制），應改為僅刷新「特賣品」，不再刷新整體池。

**C. 造型定價分層（`content/characters.js` SKINS + `skinshop.js`）：**

| 造型等級 | 說明 | 建議定價 |
|---------|------|---------|
| 普通（recolor） | 角色換色 + 小飾件 | 400–600 金幣 |
| 豪華（recolor+）| 精緻換色 + 顯眼飾件 | 800–1,200 金幣 |
| 隱藏（full body）| 完整不同體型（傀儡／幽靈／機甲／天使） | **3,000–5,000 金幣** |

- `SKIN.tier: 'normal' | 'premium' | 'hidden'` 欄位（現有 `hidden:true`）。
- `SKIN.price` 欄位用 tier 查表，取代現有統一硬編碼價格。

**D. 「我的造型」tab（第一層的子功能）：**
- 第一層角色卡右下角顯示「當前裝備造型縮圖」，無需進入第二層也能快速看到當前外觀。

## 3.9 城鎮消費重置功能完整化（新增）

**問題：** Round 5 已為「天賦」「設施」「鍛造」各加了重置按鈕，但其他消費場所（衣帽間造型、公會兌換）沒有重置；且玩家反映有時重置按鈕找不到或消失。

**盤點城鎮所有消費場所的重置現狀：**

| 場所 | 目前重置 | 所需動作 |
|------|---------|---------|
| 教堂天賦 | ✅ 已有（`resetTalents`） | 確認按鈕位置明顯、彈確認框 |
| 鐵匠設施 | ✅ 已有（`resetFacilities`） | 同上 |
| 鍛造特效 | ✅ 已有（`resetForge`） | 同上 |
| 衣帽間造型購買 | ❌ 無（造型是外觀，不退款） | 標注「造型購買無法退款」提示 |
| 公會等級兌換 | ❌ 無（一次性里程碑，無需重置） | 不必加 |
| 魂晶銀行借款 | ❌ 無（借款是負債，無法重置） | 不必加 |

**需補齊的操作：**
1. **確保三個重置按鈕在所有解析度下可見**：套用 3.0 通則，按鈕固定在 panel 右上角工具列，不被 panel 內容覆蓋。
2. **重置前彈確認框**（使用 `ask()` 機制）：
   - 天賦：「確定重置所有天賦？將退還已花費的全部金幣。」
   - 設施：「確定重置所有設施升級？將退還已花費的全部金幣。」
   - 鍛造：「確定重置 {武器名} 的鍛造特效？將退還鍛造花費。」
3. **衣帽間加購買不退款說明**：`drawWardrobe()` 頂部顯示小字「造型購買後不可退款。」（灰字）。
4. **按鈕標準樣式**：`↺ 重置天賦`、`↺ 重置設施`、`↺ 重置鍛造`，三處樣式統一（字號、顏色、位置）。

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

**4.5-B 稀有度顏色區分（新增）：**

**問題（截圖可見）：** 升級選項卡片右上角的 `普通`／`稀有`／`史詩` 等稀有度標籤全為同色（灰底白字），視覺上難以區分高低稀有度，不知道哪個選項比較「珍貴」。

**目標：** 稀有度標籤與卡片外框均採對應顏色，第一眼即區分高低。

**稀有度色碼定義（`balance.js` 或 `run.js` 頂部常數，供 `4.5` 主框和本 4.5-B 共同引用）：**

| 稀有度 | 顯示名 | tag 底色 | 卡片外框色 | 說明 |
|------|-------|---------|---------|------|
| `common` | 普通 | `#4a5568`（深灰） | `#718096`（中灰） | 一般補強 |
| `rare` | 稀有 | `#1a365d`（深藍） | `#4299e1`（水藍） | 比普通更稀少 |
| `epic` | 史詩 | `#44337a`（深紫） | `#9f7aea`（亮紫） | 高影響力 |
| `legendary` | 傳說 | `#744210`（深金棕） | `#f6ad55`（橙金） | 進化武器 / 特殊選項 |

**現況探索（需確認）：**
- 武器 def 已有 `tier` 欄位（`Weapons.register` 中的 `tier`，整數 1–5）。
- 若 `tier` 映射到上表稀有度，無需新欄位；若無，在 `rollLevelUpChoices()` 傳回結果中加 `rarity` 字串標籤即可。
- 映射建議：`tier 1 = common`、`tier 2–3 = rare`、`tier 4 = epic`、`tier 5 = legendary`。被動／裝備依 weight 反向估算（weight 低 = 稀有）。

**渲染修改（`run.js` 升級卡片）：**
```js
const RARITY_COLORS = {
  common:    { tag: '#4a5568', border: '#718096' },
  rare:      { tag: '#1a365d', border: '#4299e1' },
  epic:      { tag: '#44337a', border: '#9f7aea' },
  legendary: { tag: '#744210', border: '#f6ad55' },
};
const rc = RARITY_COLORS[choice.rarity] ?? RARITY_COLORS.common;
// 卡片外框 stroke → rc.border（取代原先固定顏色）
// 右上角稀有度 tag 底色 → rc.tag
```

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

**4.9-B 城鎮（hub）成就通知（新增）：**

**問題：** `checkAchievements()` 可能在任何場景觸發（含城鎮），但目前通知橫幅只在 `run.js` 有實作，城鎮解鎖成就毫無反饋（只能進成就殿堂才看到）。

**修正：** 將 toast 機制移至**全域**，不依附於 run scene：

```js
// state.js 或 main.js — 全域 toast 佇列
export const AchievementToasts = {
  _queue: [],
  push(name) { this._queue.push({ name, endT: performance.now() / 1000 + 4 }); },
  draw(ctx, W, H, S) {
    const now = performance.now() / 1000;
    this._queue = this._queue.filter(t => t.endT > now);
    this._queue.slice(-2).forEach((t, i) => { /* 同 run.js 橫幅渲染邏輯 */ });
  }
};
```

- `hub.js draw()` 末尾呼叫 `AchievementToasts.draw(ctx, W, H, S)`。
- `run.js draw()` 同樣呼叫（替換原本的 `_achToasts` 渲染），保持跑局通知不變。
- `checkAchievements()` 無論在哪個 scene 觸發，都 push 到 `AchievementToasts`。
- **注意：** 城鎮中通知橫幅應畫在**所有 panel 之上**（draw 呼叫放最後）。

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

## 4.13 大地圖（M鍵）玩家標示醒目化（新增）

**問題：** M 鍵開啟大地圖時，玩家角色只是一個小圓點，在大量敵人紅點的包圍下難以辨認自己位置。

**目標：** 以角色頭貼（或大型醒目標示）取代小圓點，讓玩家一眼定位。

**修正方向（`run.js` `drawBigMap()`）：**

1. **取得角色 sprite：** `getSprite('char_' + (run.char || 'hunter'))`，取第一幀裁切。
2. **繪製方式（二選一）：**
   - **A — 角色圖示（推薦）：** 在地圖上玩家座標位置，繪製 `24×24 px`（乘 S）的角色頭像框（圓形遮罩），外圈白色描邊 `2px`，下方加 `▼` 指向箭頭。
   - **B — 大型亮點 + 描邊：** 半徑 `6*S` 的亮白圓點，外圈 `3px` 金色描邊，讓玩家點永遠蓋在敵人點上方（zOrder 最高）。
3. **共同要求：**
   - 玩家標示永遠 **zOrder 最高**（最後繪製，蓋過敵人點）。
   - 多人模式（`world.players`）：其他玩家也各自顯示對應角色頭像框，加上該玩家暱稱標籤。
   - 敵人點維持小圓點（紅色，半徑 `2*S`），視覺層級明確低於玩家。

```js
// drawBigMap() 最後繪製玩家（確保 zOrder 最高）
world.players.forEach((pl, i) => {
  const mx = mapX + (pl.x / world.tw / TS) * mapW;
  const my = mapY + (pl.y / world.th / TS) * mapH;
  // 選項 A：繪製角色小頭像
  const charSp = getSprite('char_' + (pl.charId || 'hunter'));
  if (charSp) {
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, 12 * S, 0, Math.PI * 2); ctx.clip();
    drawSprite(charSp, mx - 12 * S, my - 12 * S, 24 * S, 24 * S, 0);
    ctx.restore();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.arc(mx, my, 12 * S, 0, Math.PI * 2); ctx.stroke();
  }
});
```

## 4.14 祝福神（贊助者）新效果觸發提示（新增）

**問題：** 小王事件（patron event）選擇贊助者後，玩家取得持久 hook 效果（如麥達斯 +25% 金幣、各贊助者的 buff）。但選擇後沒有任何提示說明「效果已生效」及「效果是什麼」，玩家容易忘記或不知道自己有哪些 buff。

**修正方向（`run.js` patron 選擇邏輯 + `hud.js`）：**

**A. 選擇後即時通知 Toast：**
```js
// run.js：選擇贊助者後（現有 applyPatronChoice 或等效位置）
queuePatronToast(patron) {
  // 沿用 AchievementToasts 機制，或獨立橫幅
  this._patronToast = { name: patron.name, desc: patron.effectDesc, endT: this.elapsed + 6 };
}
```
- 畫面中央上方橫幅（比成就通知更顯眼，因為這是主動選擇的重要 buff）：
  - 贊助者頭像（`patron_*` 圖示）＋「{贊助者名} 的祝福已生效！」
  - 第二行：效果說明文字（`patron.effectDesc`，如「金幣獲取 +25%，直到本局結束」）
  - 停留 **5 秒**，淡出 1 秒。
- `patron.effectDesc` 欄位：在 `content/events.js` 每個 patron 定義中補齊此欄位（目前可能只有 `name` 和 hook function）。

**B. HUD 持久贊助者圖示列（新增）：**
```
┌── HUD 右下角（或左下角） ──────────────────────┐
│  [麥達斯圖示]  [鐵面圖示]  …                  │
│  (hover 顯示效果說明)                         │
└──────────────────────────────────────────────┘
```
- 每個已觸發贊助者的小圖示橫排，最多 4 個（多餘以 `+N` 顯示）。
- Hover 浮出 tooltip：贊助者名 + 效果描述（`effectDesc`）。
- 來源：`run.activePatrons = []`（陣列，push 每次選擇的贊助者 id），HUD 讀此陣列渲染。

**C. `content/events.js` patron 定義補齊 `effectDesc`：**
每個 patron 加 `effectDesc: '...'` 欄位，中文描述實際效果（如「每局金幣獲取 +15%」「受到暴擊傷害時額外觸發衝刺」），供 A/B 兩處顯示。

## 4.15 anvilChoice 三選一卡片對齊 + 替換失去效果顯示（新增）

**此節適用兩個裝備選擇面板：**
- `anvilChoice`（鍛造砧三選一，如截圖「選擇一件裝備」）
- `equipChoice`（地面撿取裝備，同 4.12，合併補齊）

---

**A. 三張卡片「替換後」文字統一高度（版面對齊問題）**

**問題（截圖可見）：** 三張卡片因說明文字（`desc`）長短不同，「替換後」標頭出現在不同 Y 位置，看起來凌亂，數字對比也難以左右掃讀。

**根因：** `替換後` 的 Y = `cardY + descEndY`（依內容動態增長）。

**修正：** 固定卡片版面分區，description 區塊有最大高度，超出以 tooltip/截斷處理，「替換後」永遠從固定 Y 起始：

```
┌─ 卡片固定高度 ──────────────────────┐
│  [圖示]  名稱 · 欄位          ← 固定行
│  ┌─ desc 區 max 3 行 ────────────┐  │
│  │ 說明文字（超出 → 末行「…」）   │  │
│  └────────────────────────────┘  │
│  ─────── 替換後 ─────────────────── │  ← 固定 Y（所有卡片同高）
│  屬性  現值 → 新值                   │
│  ……                                 │
│  ─── 失去效果 ───────────────────── │  ← 固定在統計末尾（見 B）
│  ✕ {目前裝備效果說明}               │
└─────────────────────────────────────┘
```

**實作要點（`run.js` `drawAnvilChoice()` / `drawEquipCard()`）：**
```js
const DESC_MAX_LINES = 3;           // desc 最多 3 行
const DESC_ZONE_H    = DESC_MAX_LINES * lineH;   // 固定 desc 區高度
const STAT_Y_START   = cardY + iconH + nameH + gapH + DESC_ZONE_H + labelH;
// 所有卡片的「替換後」均從 STAT_Y_START 開始
```
- desc 超過 3 行時在第 3 行末加「…」，hover 顯示完整 tooltip。
- **卡片總高度固定**（`cardH` 常數），不依內容伸縮。

---

**B. 替換後顯示「失去效果」（即將消失的目前裝備文字效果）**

**問題：** 面板的「替換後」區塊只顯示**數字屬性**的變化（生命 497→457 等），但**不顯示目前裝備的文字特效**（如「暴擊觸發閃電鏈」「受擊反彈」等 `desc` 中描述的機制性效果）——替換後這些效果消失，玩家完全看不到。

**目標：** 「替換後」區塊末尾加一個「失去效果」子區，明確告知將失去哪些文字效果：

```
替換後
生命上限  497  →  457  ↓（紅）
暴擊率     42%  →  62%  ↑（綠）
…

━━ 失去效果 ━━━━━━━━━━━━━━━━━━━
✕ 移速 +30%、閃避 +20%（玻璃疾風）  ← 目前飾品的 desc 全文，橙色
```

**顯示規則：**
- 只在**該 slot 已裝備某件裝備**時顯示（空欄位不顯示此區）。
- 取目前裝備 `Equipment.get(run.equipment[slot])?.desc`。
- 若目前裝備 desc 與新裝備 desc **完全相同**，省略失去效果區（沒有意義）。
- 顏色：橙色 `#f6ad55`（比紅色醒目但不如紅色緊張，屬「提醒」而非「警告」）；前置 `✕` 圖示。
- 文字超過 2 行時，第 2 行末「…」，hover 顯示完整。
- **武器欄（signature weapon）** 特例：`run.equipment.weapon` 的目前裝備是簽名武器，失去效果區顯示其武器名稱 + 關鍵屬性（傷害/射速），而非 desc。

**實作要點（`run.js`）：**
```js
function drawLostEffect(slot, cardX, cardY, S) {
  const curId = run.equipment?.[slot];
  if (!curId) return 0;   // 空欄位，不顯示，回傳高度 0
  const curDef = Equipment.get(curId);
  if (!curDef?.desc) return 0;
  const newDef = /* 本卡片的裝備 def */;
  if (curDef.desc === newDef.desc) return 0;  // 同 desc 省略

  // 繪製「失去效果」分隔線 + desc 文字（橙色，最多 2 行）
  uiText('✕ ' + curDef.desc, cardX + pad, curY, { color: '#f6ad55', size: 10*S, maxWidth: cardW - pad*2 });
  return usedH;  // 回傳佔用高度，讓呼叫方調整 cardH
}
```

## 4.16 隱藏房間揭示 Modal 改版：UI 框 + 具體道具名稱（新增）

**問題（截圖可見）：**
1. 頂部橫幅「隱藏房間 · 永久解鎖了一件聖物！（+150 金幣）」是純文字覆蓋層，無邊框、無底色，在戰場背景下難辨。
2. Modal 主體只說「一件遠古聖物在祭壇上靜靜發光」，沒有告訴玩家具體解鎖了**哪一件**聖物（名稱、圖示、說明）。

**目標 UI 改版（`run.js` hidden room reveal）：**

```
╔═══════════════════════════════════════╗
║       🗝 隱藏房間 · 聖物密室           ║  ← 金色標題列 + 圓角外框
╠═══════════════════════════════════════╣
║  一件遠古聖物在祭壇上靜靜發光。         ║
║                                       ║
║  [圖示 48×48]  魂晶砲艦（史詩·武器）  ║  ← 具體道具圖示 + 名稱 + 稀有度
║               彈如星雨，穿透一切。     ║  ← desc 第一行
║                                       ║
║  ✨ 永久解鎖！下次出擊可選用此武器。   ║
║                                       ║
║         ＋ 150 金幣                   ║  ← 金幣獎勵（金色數字 + 圖示）
║                                       ║
║         [ 點擊 / 按 E 關閉 ]          ║
╚═══════════════════════════════════════╝
```

**A. Modal 外框樣式（統一用已有 `drawPanel()` 或等效 canvas 函式）：**
- 圓角矩形深藍底 `#0d1b2a`（透明度 0.95），金色 `#f5c518` 邊框（`2*S` 線寬）。
- 標題列單獨區塊：`#1a2a3a` 底 + 底部細金色分隔線。
- 寬 `min(W * 0.6, 500 * S)`，高自動依內容適配。

**B. 具體道具顯示（修正「不知道解鎖了什麼」問題）：**
- 取出解鎖道具的定義：`item.id` 已存於 `META.hidden.claimed[roomId]` 或作為 reveal 回傳值。
- 顯示：`iconOr(item.icon || 'item_' + item.id, 'star')` 圖示 + `item.name` + 稀有度 badge + `item.desc`（最多 2 行）。
- 若為被動能力（passive）顯示綠色稀有度；若為武器顯示青藍；若為聖物/特殊道具顯示金色。

**C. 頂部橫幅改版：**
- 舊：純文字疊加。
- 新：半透明黑底白框的橫幅條（`height 28*S`，圓角），文字「🗝 隱藏房間已解鎖」，點擊後出現 B 的 Modal。
- 橫幅與 Modal 分離：橫幅先閃爍 2 秒，消失後若玩家進入隱藏房間觸發 Modal。

## 4.17 裝備更換後舊效果未清除（BUG）

**問題：** 玩家替換裝備（如把護甲 A 換成護甲 B）後，**護甲 A 給予的屬性加成仍然殘留在玩家身上**（例如舊護甲 +30 HP 換掉後，HP 沒有扣回 30）。

**根因（`src/game/player.js` `equipItem()`）：**

裝備加成的應用方式有兩種常見模式：
- **模式 1（增量）：** `equipItem` 讀 `def.statDelta` → `player.stats.hp += delta.hp`；卸下時需反向 `player.stats.hp -= delta.hp`。若卸下邏輯缺失，則舊效果永遠殘留。
- **模式 2（重算）：** `player.stats` 每幀從 `makeBaseStats()` 重算，疊加所有當前裝備 delta。若換裝後舊裝備 id 仍在計算池中（例如 `run.equipment[slot]` 沒有正確清空），會重算時仍包含舊效果。

**修正步驟：**
1. 確認 `equipItem(slot, newId)` 中「解除舊裝備」邏輯的存在：
```js
function equipItem(slot, newDef, ...) {
  // 先移除舊裝備效果
  const oldId = run.equipment[slot];
  if (oldId) {
    const oldDef = Equipment.get(oldId);
    if (oldDef?.statDelta) {
      for (const [k, v] of Object.entries(oldDef.statDelta))
        player.stats[k] = (player.stats[k] ?? 0) - v;   // ← 必須有此步驟
    }
    // 舊的 weapon-slot 簽名武器：player.removeWeapon(oldWeaponId)
  }
  // 再套用新裝備
  run.equipment[slot] = newDef.id;
  if (newDef?.statDelta) { ... apply ... }
}
```
2. 若使用模式 2（完整重算），確認每次換裝後呼叫 `player.recalcStats()` 並且其中只迭代 `run.equipment` 的**當前**欄位，不包含已移除的裝備。
3. **weapon 欄特例**：簽名武器用 `player.addWeapon`／`player.removeWeapon`（帶 forge mods），確認換武器時舊簽名武器被 `removeWeapon` 刪除，不留在 `player.weapons[]` 中。

**驗證：** 裝備一件 +50 HP 護甲，記錄 HP；換裝後 HP 應明確下降（回到基礎值）；再換回，HP 回升。用 `__DBG.scene().player.stats.maxHp` 確認每次換裝後數值正確。

---

## 4.18 鍛造砧三選一：跳過 + 圖示 + 縮小卡片 + 豐富選項種類（新增）

此節針對截圖中的 `anvilChoice` 面板（「選擇一項能力值強化」）提出四項改善。

---

### 4.18-A 新增「都不要 / 跳過」按鈕

**問題：** 玩家若三個選項都不滿意，目前無法跳過，被迫選一個。

**改動（`run.js` `drawAnvilChoice()` + `handleAnvilInput()`）：**

- 在三張卡片**下方**新增一個「⟳ 都不要（消耗本次機會）」按鈕，點擊後直接關閉面板，不套用任何加成
- 按鈕樣式：灰色半透明底框，字色 `#aaa`，hover 時白字 + 橙邊（暗示「真的確定？」）
- 按 `Escape` 鍵同樣觸發跳過（與點擊效果等同）

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 迅捷鐵砧  │  │ 吸血鐵砧  │  │ 力量鐵砧  │
│  射速×1.07│  │  吸血+2%  │  │  傷害×1.08│
└──────────┘  └──────────┘  └──────────┘
        [ ⟳ 都不要（消耗本次機會）]   ← 新增
```

**注意：** 跳過視為「已消耗鐵砧次機會」，不可撤銷；`run.anvilChoice = null` 同樣清除。

---

### 4.18-B 每張卡片加入圖示

**問題（截圖可見）：** 三張卡片只有文字，無視覺差異，難以快速辨識。

**改動：**

- 每張卡片左上角顯示 `icon`（大小 `32×32 * S`），圖示來源依選項類型：
  - 裝備（`equipment`）：`Equipment.get(id).icon` 或 `equip_<id>`
  - 被動技能（`passive`）：`ability_<id>` 或對應 `passive` icon
  - 武器升級（`weapon_upgrade`）：`weapon_<id>` 圖示
  - 屬性強化（`stat_upgrade`，即截圖中的鐵砧系列）：使用對應的 `item_<stat>` 圖示，若無則顯示 ⬆ 箭頭圖示
- 圖示缺失時（`iconOr`）fallback 為底色方塊 + 首字母，不崩潰

卡片佈局（修改後）：
```
┌─────────────────────┐
│ [icon] 迅捷鐵砧      │  ← 圖示 + 名稱同行
│         射速 ×1.07   │  ← 加成說明
│   [已裝備效果差異]   │  ← 若有裝備替換
└─────────────────────┘
```

---

### 4.18-C 縮小卡片高度（格子太大）

**問題：** 截圖中卡片佔滿大半螢幕，三張卡又窄又高，下半部大量空白浪費空間。

**改動（`run.js` `drawAnvilChoice()`）：**

- `cardH` 從動態計算改為**固定上限**：`Math.min(contentH + padding*2, 220 * S)`
- 三張卡片水平排列時，寬度調整為 `(canvasW * 0.75) / 3`（整體不超過畫面 75%）
- 若選項有圖示，`cardH` 最小 `120 * S`；若無圖示，`最小 90 * S`
- 面板整體在螢幕**垂直置中偏上**（`offsetY = H * 0.35`，而非 `H * 0.5`），讓畫面下方仍能看到戰況

---

### 4.18-D 豐富選項種類

**現況（截圖）：** 鐵砧選項大多是「攻速×1.07」「吸血+2%」「傷害×1.08」等乘法係數，種類單一。

**目標：** 增加多樣性，讓每次鐵砧都有「選擇感」，而非只是哪個倍數更高。

**新增選項類型（在 `run.js` `rollAnvilChoices()` 中增加池子）：**

| 類型 | 範例 | 機率權重 |
|---|---|---|
| 屬性乘數（現有） | 傷害 ×1.08、攻速 ×1.07 | 40% |
| 固定加成 | 最大 HP +20、護甲 +5 | 20% |
| 武器特效（目前持有武器） | 「{武器名}」冷卻 -10% | 15% |
| 被動技能補強 | 「{已持有被動}」效果 +15% | 15% |
| 特殊效果（稀有） | 撿取魂晶時 2% 機率觸發暴走 3 秒 | 10% |

**實作要點：**
- `rollAnvilChoices()` 根據玩家目前裝備的武器 / 被動動態生成個人化選項
- 「武器特效」類型選項需引用 `world.player.weapons` 清單，確保至少持有 1 把武器才會出現
- 「特殊效果」類別保留 `onPickupSoul`/`onKill` hook 欄位，避免與武器系統衝突
- 加成描述字串統一用 `「{name}」…` 格式，說明作用對象

---

**驗證：**
- 三選一面板底部出現「都不要」按鈕；點擊後面板關閉，無任何 stat 改變
- 按 `Escape` 同樣可跳過
- 每張卡片左上角顯示對應圖示；圖示缺失時 fallback 不崩潰
- 卡片高度 ≤ `220 * S`；整體面板不超過畫面 75% 寬
- 連開 5 次鐵砧，出現至少 2 種不同類型的選項（乘數以外的類型）

---

## 4.19 三選一面板中可按 TAB 查看個人 build（新增）

**問題：** 玩家在面對鐵砧三選一（`anvilChoice`）、裝備選擇（`equipChoice`）、升級選項（`choice`）時，無法查看目前武器 / 被動配置，只能憑記憶決策。

**設計：** 在任意**選擇暫停面板**開啟時，按 `Tab` 鍵在三選一卡片與個人 build 頁面之間**切換疊層**，不離開選擇流程。

---

**A. 狀態機擴充（`run.js`）：**

新增 `run._buildPeek = false`（布林旗），在選擇面板期間按 `Tab` 切換：

```js
// run.js handleKeys()
if (e.code === 'Tab' && (this.anvilChoice || this.choice || this.equipChoice)) {
  e.preventDefault();
  this._buildPeek = !this._buildPeek;
}
```

---

**B. 渲染邏輯（`run.js` `render()`）：**

- `_buildPeek === false`（預設）：正常渲染三選一面板
- `_buildPeek === true`：以半透明黑底遮住背後戰場，**在同一 canvas 上渲染 `drawBuildPage()`**（即現有 Tab build 頁的內容），同時在畫面頂部顯示提示條：

```
 ┌──────────────────────────────────────────┐
 │  📋 目前配置一覽  [Tab] 返回選擇          │  ← 頂部提示條（半透明底）
 └──────────────────────────────────────────┘
```

- `drawBuildPage()` 已有羈絆、武器、被動的完整繪製；確認它能在「選擇暫停中」被獨立呼叫（不依賴其他 run state）

---

**C. 清除時機：**

- 選擇確認後（點擊任一卡片或「都不要」）：`_buildPeek = false`
- 場景切換時：`_buildPeek = false`

---

**D. 適用面板範圍：**

| 面板 | Tab peek 支援 |
|---|---|
| `anvilChoice`（鐵砧三選一） | ✅ |
| `choice`（升級三選一） | ✅ |
| `equipChoice`（裝備撿取） | ✅ |
| `bigMap`（M 鍵大地圖） | ❌（已有專屬 UI） |
| `showBuild`（Tab 本身） | ❌（本身就是 build 頁） |

---

**E. 多人局（co-op）注意：**

- Host 側面板行為不變；`_buildPeek` 只影響本地渲染，不廣播
- Guest 端無自己的 `anvilChoice`（host auto-resolve），此功能在 guest 端無作用（不需特別處理）

---

**驗證：**
- 升級三選一開啟後按 `Tab`，畫面切至 build 頁（顯示武器 / 被動 / 羈絆）；再按 `Tab` 返回選擇面板
- 按 `Tab` 期間無法誤觸選擇（選擇卡片的 click/keyboard 在 `_buildPeek = true` 時被過濾）
- 點擊任一選項後 `_buildPeek` 自動清除，下次開啟鐵砧面板從正常視圖開始
- co-op host 端操作不影響 guest 渲染

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

## 5.5 任務循序解鎖（前置任務）（新增）

**問題：** 目前所有任務同時可接，玩家可能跳過主線直接做後期任務，導致劇情／系統引導斷裂，也讓任務清單顯得龐雜。

**目標：** 同一「任務系列」中，必須完成前一個任務才能解鎖下一個。

**A. Quest def 新增 `requires` 欄位（`content/quests.js`）：**
```js
// 任務定義範例
{ id: 'story_2', name: '第一次出擊', requires: 'story_1', ... }
{ id: 'story_3', name: '斬殺首領',  requires: 'story_2', ... }
{ id: 'legend_1', name: '傳奇初章', requires: null, ... }  // null = 無前置，直接可接
```
- 非系列任務（支線、每日）`requires: null`，行為不變。
- 一個任務最多一個前置（線性鏈）；若需分支，由設計時排列 id 控制。

**B. `hub.js` guild panel 顯示狀態：**

| 狀態 | 判斷條件 | 顯示 |
|------|---------|------|
| 可接 | `requires` 已完成（或 null） | 正常顯示，可點「接受」 |
| 鎖定 | `requires` 未完成 | 灰色半透明行，右側「🔒 需先完成：{前置名}」|
| 進行中 | 已接受、未完成 | 正常追蹤 |
| 已完成 | `progress >= target` | 「領取」按鈕啟用 |

- 鎖定任務**仍顯示**（不隱藏），讓玩家知道前方有更多任務等待，形成引導感。
- hover 鎖定行時 tooltip 顯示完整前置任務名與進度。

**C. HUD 追蹤（`hud.js`）：** 鎖定任務不加入追蹤清單（`META.quest.tracked` 過濾掉 locked 的 id）。

## 5.4 隱藏任務／傳奇之證等特殊任務無法領取（BUG）

**問題：** 公會委託面板中，「隱藏任務」（以 `hidden:true` 標記的 quest def）和「傳奇之證」等特定類型任務，明明已完成（`progress >= target`），但「領取」按鈕點下去無反應，或按鈕直接不出現。

**根因（待確認，兩個可能路徑）：**

**路徑 A — 領取條件判斷錯誤：**
`content/quests.js` 或 `hub.js` guild panel 的 `canClaim(q, META)` 邏輯可能對 `hidden` 類任務多加了一層額外判斷（如要求 `q.revealed === true`），導致即使完成也無法領取。
```js
// 可能的 bug 寫法：
function canClaim(q, META) {
  return q.revealed && q.isCompleted(META);  // ← hidden 任務若 revealed 從未被設為 true
}
// 修正：
function canClaim(q, META) {
  return q.isCompleted(META);  // revealed 只影響是否「顯示」，不影響領取
}
```

**路徑 B — 任務完成判斷 target 欄位不同步：**
「傳奇之證」類任務的完成條件用 `target` 欄位，但 `isCompleted()` 讀取了不同欄位（如 `quest.goal`），導致永遠 `false`。
```js
// 統一使用 target 欄位，或加 fallback：
isCompleted(META) {
  const target = this.target ?? this.goal ?? 1;
  return (META.quest?.progress?.[this.id] ?? 0) >= target;
}
```

**修正步驟：**
1. 找出 `hub.js` guild panel 的 `canClaim` 或等效判斷函式。
2. 找出 `content/quests.js` 每個特殊類型任務的 `isCompleted()` / `progress()` 實作，確認讀取的欄位名稱一致。
3. 加 console 日誌或 `__DBG` 工具輸出所有未領取任務的 `{id, progress, target, hidden, revealed, canClaim}` 確認哪個欄位造成 false。
4. 修正後確認「傳奇之證」「隱藏任務」「特殊系列任務」均可正常領取。

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

## 8.3 詛咒效果與負面效果強化（新增）

### 設計目標

強化遊戲中的「高風險高報酬」設計維度：
1. 新增裝備詛咒（`curse`）稀有度等級——有強力加成但附帶強制缺點
2. 強化現有負面狀態效果（bleed / poison / burn / slow）數值，讓它們對玩家構成真正威脅
3. 新增「詛咒」敵人技能（透過 `status_tags.js`），使部分精英/Boss 能對玩家施加詛咒狀態

---

### 8.3-A 詛咒裝備等級（新稀有度）

**現況：** `content/equipment.js` 裝備僅有普通/稀有/史詩三個等級，無內建缺點裝備。

**設計：** 新增 `curse` 稀有度，視覺上以紫紅邊框 + 紅色骷髏圖示標識。詛咒裝備提供**強於史詩等級**的加成，但強制附帶一條 `penalty` 負面效果。

**裝備定義結構（`content/equipment.js`）：**
```js
Equipment.register({
  id: 'cursed_bloodring',
  name: '血契戒指',
  rarity: 'curse',          // ← 新稀有度
  slot: 'trinket',
  statDelta: { critChance: 0.30, attackSpeed: 0.25 },
  penalty: { maxHp: -0.25 }, // 最大 HP -25%（相對乘數）
  desc: '暴擊率 +30%、攻速 +25%，但最大 HP 降低 25%',
  penaltyDesc: '最大 HP -25%',
});
```

**`penalty` 欄位語意：**
- 正負數值均為**相對基礎值的百分比修正**（additive，符合 9.4 的加法堆疊原則）
- `penalty` 在 `equipItem()` 裡與 `statDelta` 一起套用（合併成一個 `finalDelta`）
- 解除裝備時需同步還原 `penalty` 部分

**視覺表示（`run.js` equipChoice / `hud.js` 裝備欄）：**
```
┌─────────────────────────────────────┐  ← 紫紅邊框 (#9b59b6)
│ ☠ [詛咒] 血契戒指                    │
│ 暴擊率 +30%  攻速 +25%              │  ← 正加成（綠色）
│ ─────────────────────────────────── │
│ ⚠ 最大 HP -25%                     │  ← 負面警示（紅色）
└─────────────────────────────────────┘
```

在 `RARITY_COLORS`（`4.5-B` 已新增）加入詛咒色：
```js
const RARITY_COLORS = {
  // ...existing...
  curse: { tag: '#4a0e1a', border: '#9b59b6', icon: '☠' },
};
```

**掉落機率：** 詛咒裝備不在普通掉落池；僅在以下情況出現：
- 20 分鐘 FINAL_BOSS 擊殺後掉落箱（固定 1 件詛咒）
- 隱藏房間聖物（`4.16` 已有 UI 框，新增詛咒聖物種類）
- D4/D5 難度下的精英怪掉落（機率 5%）

**初始詛咒裝備列表（5 件，橫跨三槽）：**

| ID | 名稱 | 加成 | 詛咒懲罰 |
|---|---|---|---|
| `cursed_bloodring` | 血契戒指 | 暴擊 +30%、攻速 +25% | 最大 HP -25% |
| `cursed_glassmantle` | 玻璃披風 | 全傷害 +40%、移動 +20% | 防禦 -50%、受傷閃爍更強 |
| `cursed_soulbrand` | 魂烙印記 | 技能冷卻 -35%、射程 +40% | 每 5 秒扣 5 HP（DoT 不可中斷） |
| `cursed_greedmark` | 貪婪烙印 | 金幣獲取 +100%、XP +50% | 無法撿取治療物品 |
| `cursed_voidplate` | 虛空甲 | 最大 HP +60%、護甲 +30% | 移速 -35%、無法使用衝刺 |

---

### 8.3-B 強化負面狀態效果數值（`status.js`）

**現況：** `status.js` 的 bleed/poison/burn 對玩家實際傷害相對低，不構成戰術威脅。

**調整目標：** 對玩家施加的負面狀態在 D3+ 應能**顯著縮短生存窗口**，讓玩家需要主動閃避/治療。

**數值調整表：**

| 效果 | 現況（估） | 調整後 | `status.js` 欄位 |
|---|---|---|---|
| `bleed` DoT / 秒 | 3–5 | `8 + threat*0.8` | `BLEED_DPS` |
| `poison` DoT / 秒 | 2–4 | `5 + threat*0.6`，疊加上限 3 層 | `POISON_DPS`、`POISON_STACKS` |
| `burn` DoT / 秒 | 4–6 | `12 + threat*1.0`，持續 3 秒 | `BURN_DPS` |
| `slow` 減速比例 | 30% | 40%（D3+）/ 30%（D1–2） | `SLOW_FACTOR` |
| `stun` 持續時間 | 0.8 s | 0.6 s（防止卡死，已有 boss 豁免） | `STUN_DUR` |
| `curse`（新） | 無 | 技能冷卻 +50%、治療效果 -60%，持續 8 s | — |

**`balance.js` 新增常數：**
```js
BLEED_DPS: 8,              // 玩家受到流血 DoT 基礎值
POISON_DPS: 5,             // 中毒基礎值（可疊加）
POISON_STACKS: 3,          // 中毒最大疊加層
BURN_DPS: 12,              // 燃燒基礎值
CURSE_COOLDOWN_MUL: 1.5,   // 詛咒狀態：冷卻時間乘數
CURSE_HEAL_MUL: 0.4,       // 詛咒狀態：治療效果乘數（-60%）
CURSE_DURATION: 8,         // 詛咒狀態持續秒數
```

**`status.js` `applyStatus` / `tickStatus` 修改要點：**
```js
// tickStatus 中 player 受 curse 時：
if (tag === 'curse') {
  player.stats.cooldownMul = (player.stats.cooldownMul || 1) * BALANCE.CURSE_COOLDOWN_MUL;
  player.stats.healMul     = (player.stats.healMul || 1)    * BALANCE.CURSE_HEAL_MUL;
  // 在 status 到期時還原（記錄 applyTime，tickStatus 比對）
}
```

---

### 8.3-C 敵人詛咒技能（`content/status_tags.js`）

部分精英敵人（threat ≥ 8）與所有 FINAL_BOSS 可對玩家施加 `curse` 狀態：

```js
// content/status_tags.js
export const ENEMY_STATUS_CHANCE = {
  // ...existing bleed/poison/slow...
  curse: { chance: 0.12, minThreat: 8, duration: BALANCE.CURSE_DURATION },
};
```

HUD 狀態圖示列（`4.14` 已有 patron 圖示行）新增 `curse` 骷髏圖示（紫色，含倒數圓弧）。

---

### 8.3-D 詛咒裝備的 UI 整合

- **equipChoice 卡片**（`run.js`）：詛咒裝備卡片底部紅色警示區顯示 `⚠ {penaltyDesc}`，字色 `#e74c3c`
- **裝備欄 HUD**（`hud.js`）：已裝備詛咒裝備的槽位邊框改為紫紅色脈衝動畫
- **成就解鎖條件（新增）：**
  - 「詛咒鑑賞家」：在同一局中裝備 2 件詛咒裝備並通關
  - 「鐵石心腸」：攜帶 `cursed_greedmark` 通關且金幣 ≥ 5,000

---

**驗證：**
- 詛咒裝備 `rarity: 'curse'` 正確顯示紫紅邊框、☠ 圖示、紅色 penaltyDesc
- `equipItem()` 同時套用 `statDelta` + `penalty`；解除時正確還原
- D3 局玩家受 bleed+poison 同時存在時，DPS ≈ `13 + threat*1.4`，大約 30 秒可讓玩家從滿血到半血
- `curse` 狀態施加後冷卻欄位 ×1.5 / 治療 ×0.4 正確作用，8 秒後還原
- 詛咒裝備不在普通掉落池，僅 FINAL_BOSS / 隱藏房間 / D4–5 精英觸發

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

## 9.2 城鎮消費全面調漲（天賦、設施、鍛造太便宜）（新增）

**問題：** 玩家反映城鎮升級成本過低，幾局後便可全滿，失去長期目標與取捨。天賦、設施、鍛造費用調漲應與 9.1 金幣 nerf **搭配實施**——先降收入，再讓消費更有意義。

**現況（待確認精確數值，以下為估算基準）：**

| 消費類型 | 當前費用結構（估）| 問題 |
|---------|---------------|------|
| 天賦升級（教堂） | 第 1 級 ~80 金，後每級 ×1.2 | 最終全升約 1,000–1,500 金，4–5 局即全滿 |
| 設施升級（鐵匠） | 與天賦相近 | 同上 |
| 鍛造（武器特效） | 第 1 特效 ~100 金，疊加 ~200、~400 | 全一把武器鍛滿約 700–900 金 |

**調整目標（`balance.js` + 各手寫內容檔）：**

```
整體費用基準 × 2.0–2.5
```

| 消費類型 | 調整方向 |
|---------|---------|
| 天賦（`talents.js` cost 欄位） | 基礎起始費用 × 2；`TALENT_COST_GROWTH`（或等效欄位）維持原增長率，起點拉高 |
| 設施（`facilities.js` cost）| 同天賦 |
| 鍛造等級費用（`forge.js`）| 鍛造升 1 級：×2；`FORGE_LEVEL_COST` 基礎調高 |
| 鍛造特效費用（`forge.js`）| 第 1 個特效：×2；第 2 個：×2.5；第 3 個：×3 |
| 公會等級兌換（`guild.js`）| 現有 XP 成本不動（XP 不是金幣），金幣獎勵可略降 |

**`balance.js` 建議新增常數（集中管理）：**
```js
TALENT_COST_MUL:    2.0,   // 天賦費用倍數
FACILITY_COST_MUL:  2.0,   // 設施費用倍數
FORGE_LEVEL_MUL:    2.0,   // 鍛造等級費用倍數
FORGE_EFFECT_MUL:   2.0,   // 鍛造特效費用倍數
```
各手寫內容檔讀取這些 BALANCE 常數計算費用，而非硬編碼絕對值（方便之後繼續微調）。

**驗證：** 完整通關一次（D1 / 約 2,000–3,000 金幣），天賦最多升到 40–50% 滿；需 3–4 局才能全滿某一欄位。與 9.1 金幣 nerf 搭配後玩家面臨**明確取捨**（升天賦 vs 升設施 vs 鍛造）。

## 9.3 城鎮升級動態定價（VS 式：每次升級後其餘漲價）（新增）

**設計靈感（Vampire Survivors）：** 在 VS 中，每次購買任何升級後，下次購買的成本都會等比提高，形成「早買便宜、越買越貴」的取捨感，而不是固定價格。

**目標：** 同一面板（如設施鋪、教堂天賦）內，升級 A 後，同面板內其他項目的當前顯示價格也會**微幅上漲**，讓每次選擇都有意義。

**A. 機制設計：**
- 每個消費面板（`talents`／`facilities`／`forge`）各維護一個 `purchaseCount` 計數器（存入 `META`）。
- 當前面板的所有項目顯示費用 = `baseCost × HUB_COST_GROWTH ^ purchaseCount`。
- `purchaseCount` 在**同面板內**共享（不跨面板）：升了天賦 A 後，天賦 B/C/D 的顯示費用都漲；但設施費用不受影響。

**B. `balance.js` 新增常數：**
```js
HUB_COST_GROWTH: 1.08,  // 每次購買同面板其他項目漲 8%
```

**C. `state.js` `META` 新增：**
```js
META.hub = META.hub || {};
META.hub.talentPurchases   = 0;   // 教堂天賦總購買次數
META.hub.facilityPurchases = 0;   // 設施升級總購買次數
META.hub.forgePurchases    = 0;   // 鍛造總購買次數
```

**D. 費用計算（`hub.js` 各 panel cost render）：**
```js
function scaledCost(baseCost, purchases) {
  return Math.round(baseCost * Math.pow(BALANCE.HUB_COST_GROWTH, purchases));
}
// 顯示費用時：
const displayCost = scaledCost(item.baseCost, META.hub.talentPurchases);
```
- 每次成功購買：`META.hub.talentPurchases++`（對應面板計數器）。
- 重置（`resetTalents`）時：退還金幣、`META.hub.talentPurchases = 0`（計數器歸零，費用也恢復）。

**E. 顯示提示：**
- 面板頂部加灰色小字：「已升級 {N} 次 · 後續費用已提升 {%}」，讓玩家知道為何越來越貴。
- `N` = `META.hub.talentPurchases`，`%` = `Math.round((BALANCE.HUB_COST_GROWTH^N - 1) * 100)`。

**平衡建議：** `HUB_COST_GROWTH = 1.08`（每次 +8%）搭配 9.2 的基礎費用 ×2.0，玩家前 5 次升級成本可接受，後期需明顯取捨。可用 `__DBG.meta().hub` 查看目前計數器值驗證。

---

## 9.4 裝備百分比加成改為加法堆疊（新增）

### 問題

目前遊戲中多個百分比加成（金幣倍率、暴擊率、移動速度加成、傷害加成等）採用**乘法疊加**，導致多件裝備/天賦/設施同時作用時加成翻倍爆炸（「複利效應」）。

例如：
- 天賦 `t_gold` 財運 +36% + 設施 `f_bank` 金庫 +25% + 裝備 `ring_greed` +30%
- 乘法：`1.36 × 1.25 × 1.30 = 2.21×`（221%），比任何單項都強得多
- 加法：`1 + 0.36 + 0.25 + 0.30 = 1.91×`，仍然強，但更線性、可預測

### 設計原則

所有**百分比加法補正**（bonus%）改為在計算前**加總後乘一次基礎值**：

```
final = base × (1 + Σ all_bonus_pct)   // 加法堆疊，封頂由各項 CAP 控制
```

相對地，以下**保持乘法**（語意是「獨立乘數」而非累積加成）：
- `diffMul`（難度倍率）× `ENEMY_HP_MULT` 等系統性乘數
- Patron 祝福的一次性「本局 ×1.5 傷害」類特殊效果

### 受影響的 stat 欄位（`ADDITIVE_STATS`）

```js
// balance.js
export const ADDITIVE_STATS = [
  'goldMult',        // 金幣獲取倍率
  'critChance',      // 暴擊機率
  'moveSpeedMult',   // 移動速度加成
  'damageMult',      // 傷害加成
  'xpMult',          // 經驗值倍率
  'healMult',        // 治療效果
  'cooldownMult',    // 冷卻縮短（值越小越快，所以為減法堆疊：1 - Σ reduction）
  'pickupRadius',    // 拾取半徑（絕對值加法，非倍率）
];
```

各項上限常數（`balance.js`）：

| stat | 上限常數 | 值 |
|---|---|---|
| `goldMult` | `GOLD_MULT_CAP` | 3.0（已有，確認套用） |
| `critChance` | `CRIT_CAP` | 0.6（已有，確認套用） |
| `moveSpeedMult` | `MOVE_SPEED_CAP` | 2.5 |
| `damageMult` | `DAMAGE_MULT_CAP` | 4.0 |
| `xpMult` | `XP_MULT_CAP` | 3.0 |
| `healMult` | `HEAL_MULT_CAP` | 2.0 |
| `cooldownMult`（縮減）| `COOLDOWN_RED_CAP` | 0.65（最多縮 35%） |

### 實作位置（`player.js`）

`player.computeStats()` 或等效的 stat 重算函式中，加法堆疊計算方式：

```js
// player.js computeStats() 或 applyStatSources()
function sumAdditive(sources, key) {
  // sources = [talent_deltas, facility_deltas, equipment_statDelta, bond_bonus, ...]
  let total = 0;
  for (const src of sources) total += (src[key] ?? 0);
  return total;
}

// 範例：goldMult
const goldBonuses = sumAdditive(allSources, 'goldMult');
player.stats.goldMult = Math.min(1 + goldBonuses, BALANCE.GOLD_MULT_CAP);

// 範例：cooldownMult（縮減型，反向）
const cooldownReduction = sumAdditive(allSources, 'cooldownReduction');
player.stats.cooldownMult = Math.max(1 - cooldownReduction, BALANCE.COOLDOWN_RED_CAP);
```

### 與現有系統整合

| 現有機制 | 處理方式 |
|---|---|
| `makeBaseStats()` 的基礎值 | 不變，基礎值為 0 加成（goldMult 基礎 = 1） |
| 天賦 `t_gold`、設施 `f_bank` | 改存 `statDelta.goldMult: 0.04 * level`（加法貢獻） |
| 裝備 `statDelta` | 直接是加法貢獻值（如 `goldMult: 0.30` = +30%） |
| Bond bonus | 加入 `allSources` 列表，不再 `*=` 原值 |
| 8.3 的詛咒 `penalty` | 同樣以加法貢獻（負值）計算，如 `maxHp: -0.25` |

### 影響評估

- **金幣：** 9.1 + 9.2 + 9.3 + 9.4 四者合力，「滿裝金幣流」上限從約 4× 降至約 2.5×（仍有意義但不溢出）
- **暴擊：** 多暴擊 build 上限 60%（`CRIT_CAP`），不再可超過（舊版乘法可達 80%+）
- **傷害：** `damageMult` 上限 4.0，防止一刀秒 boss
- **玩家感受：** 各項加成的邊際效益更線性，玩家更容易預測成長曲線

**驗證：**
- 同時裝備三件金幣相關道具，`player.stats.goldMult` ≤ 3.0
- 移除一件後 goldMult 下降（加法：線性下降；乘法：下降更多 — 確認是線性）
- `critChance` 全堆暴擊 build 上限停在 0.6
- `__DBG.scene().player.stats` 即時查看堆疊結果

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

## 10.6 金幣／道具被磁鐵彈走（排斥 Bug）

**問題：** 玩家反映金幣有時會被「彈走」——道具本來靠近，卻在接近時突然反方向飛離，類似磁鐵排斥。懷疑與「拾取範圍 +60%」被動有關（`pickupRange` 從 ~26 提高到 ~42）。

**根因分析（`pickup.js` 或 `player.js` 磁鐵吸附邏輯）：**

**路徑 A — 速度過衝（最可能）：**
若吸附公式為 `速度 = ATTRACT_SPEED`（固定值，不依距離縮減），道具在最後一幀可能飛過玩家位置，下一幀方向反轉，形成振盪：
```js
// Bug 寫法（固定速度，不感知距離）：
const dx = px - cx, dy = py - cy;
const dist = Math.sqrt(dx * dx + dy * dy);
vx = dx / dist * ATTRACT_SPEED;   // 距離 1px 時速度仍是 ATTRACT_SPEED
vy = dy / dist * ATTRACT_SPEED;
```
→ 修正：速度上限 clamp 到「不超過剩餘距離」，確保永遠不會過衝：
```js
const speed = Math.min(ATTRACT_SPEED, dist);   // ← 加上 dist 上限
vx = dx / dist * speed;
vy = dy / dist * speed;
```

**路徑 B — 大半徑時 overlap 觸發碰撞推力：**
`pickupRange +60%` 使吸附半徑超過某些物理碰撞半徑（如其他掉落物、玩家碰撞體），道具在途中被推力打亂方向。
→ 修正：道具進入「吸附狀態」（`attracting = true`）後**停用碰撞推力**（跳過 entity-to-entity separation），只保留世界邊界碰撞。

**路徑 C — 範圍圓超出地圖邊界的反彈：**
`pickupRange +60%` 讓吸附判定圓觸及地圖邊界，邊界反射邏輯給道具加了反向速度。
→ 修正：道具吸附時 bypass 邊界反彈，只做 clamp（停在邊界，不反彈）。

**修正優先序：** 先試 A（最簡單），確認是否解決 85% 案例；B/C 再觀察。

**驗證：** 用 `遠視符文` 被動（`aimRange ×1.20`）或直接在 `balance.js` 調高 `pickupRange` 到 50+，在密集掉金幣的情況下跑 1–2 分鐘，確認無排斥飛走現象。

## 10.7 Boss 被卡在地圖牆壁／走廊（BUG）

**問題：** Boss（及大型精英）在房間式地圖中會卡在走廊角落或窄牆之間，無法追擊玩家，白白被 kite 到死。

**根因分析（`src/game/maps.js` + `src/game/enemy.js`）：**

**路徑 A — 走廊寬度不足（最可能）：**
目前走廊寬 `4 tile`（Round 12 加入房間系統時設定）。Boss 的碰撞半徑（`enemy.radius`）可能達 `24–32px`，換算為 `1.5–2 tile`，直徑 `3–4 tile`——剛好卡在走廊最窄處。
```js
// maps.js 走廊寬度建議調整：
CORRIDOR_WIDTH: 4 → 6   // 6 tile = 96px，足夠 Boss 直徑 64px + 緩衝
```

**路徑 B — Boss AI 直線追擊撞牆：**
`enemy.js` Boss AI 可能直接 `vx = sign(dx)`、`vy = sign(dy)` 向玩家衝刺，遇到牆壁後持續頂牆（碰撞解析後速度歸零但每幀重新設定），形成「貼牆卡住」現象。
→ 修正：Boss 頂牆超過 `0.5 秒` 時觸發**繞路行為**——往左或往右走 `0.3–0.5 秒` 後再重新鎖定玩家。

**路徑 C — 地圖生成在 Boss 出生點附近有小隔間：**
Boss 生成時若出生點鄰近窄柱或房間角落，初始碰撞就讓 Boss「嵌入」牆內，後續移動永遠卡住。
→ 修正：Boss 出生點驗證函式，確保以 `boss.radius * 2 + 8px` 為半徑的圓形內無 WALL tile。

**修正方案（三路並行）：**

**A. `maps.js` 走廊加寬（最根本）：**
```js
// 房間式地圖生成時，連接走廊的清空範圍：
// 舊：clearHallway(x, y, 4)
// 新：clearHallway(x, y, 6)   ← 6 tile 寬
```
- 同步調整 `DOOR_WIDTH`（門洞寬）：由 `4 → 6 tile`。
- **確認** `makeCamp()` 城鎮地圖的門洞也更新（Round 6 加的 `town_gatepost` 間距需配合）。

**B. `enemy.js` Boss 繞路 AI：**
```js
// Boss 頂牆偵測（每幀）：
if (isLargeEnemy && !moved && this._stuckTimer > 0.5) {
  this._bypassDir = this._bypassDir || (Math.random() < 0.5 ? 1 : -1);
  // 暫時往垂直於主追蹤方向的側邊移動
  const perpX = -normalY * this._bypassDir;
  const perpY =  normalX * this._bypassDir;
  vx = perpX * this.speed; vy = perpY * this.speed;
  if (this._stuckTimer > 1.0) this._stuckTimer = 0; // 重置，重試
} else if (moved) {
  this._stuckTimer = 0; this._bypassDir = null;
} else {
  this._stuckTimer += dt;
}
```

**C. Boss 出生點驗證（`run.js` `spawnBoss()` / `spawnMiniBoss()`）：**
```js
function safeSpawnPos(world, minClear) {
  for (let tries = 0; tries < 50; tries++) {
    const x = randomInRange(), y = randomInRange();
    if (world.circleFreeClear(x, y, minClear)) return { x, y };
  }
  return fallbackCenter(world);
}
// Boss spawn 呼叫：
const pos = safeSpawnPos(world, bossRadius * 2 + 8);
```

**地圖間格整體原則（新增到 `maps.js` 注解）：**
- 普通房間最小尺寸：`12 × 10 tile`（走動空間）。
- Boss 房（最終 Boss 生成區）最小尺寸：`20 × 18 tile`（確保充分走位）。
- 走廊最小寬：`6 tile`（涵蓋最大 Boss 直徑 `~48px` + `2 tile` 緩衝）。

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
16. 衣帽間：第一層顯示角色卡（持有造型數 / 總數）；點角色進入第二層（我的造型 + 商店購買）；隱藏造型標 ★ + 金框 + 高價格（3,000–5,000 金）。
17. 成就：黃字在列表下方不遮擋；有 全部／已達成／未達成 tab；可領時建築上方有黃圓框 `!`；「全部領取」按鈕在有可領成就時啟用，點後 toast「已領取 X 筆」。
18. 出擊選角縮放後初始武器不與名稱重疊。
19. 個人小屋無半形標點；ESC 說明獨立一行。
19b. 天賦/設施/鍛造重置按鈕在所有解析度下均可見（panel 右上角）；點擊彈確認框；衣帽間顯示「造型購買不可退款」說明。

**四、跑局 HUD 與互動**
20. HUD：金幣圖示與數字對齊；地圖名獨立放大；衝刺欄間距正確；左側對齊。
21. 撿取道具右側持久紀錄欄，最新高亮、舊的半透明。
22. 撿取裝備彈窗下方說明不壓其他 UI。
23. 掉落物彩色外框（裝備金／道具藍／能力綠）；寶箱無鑰匙顯示紅「🔑 需要鑰匙」、有鑰匙顯示綠「按 E 開啟」。
24. 升級選項：hover 無破圖、不遮頂部提示；三類型有顏色條；間距寬鬆；卡片有外框。
24b. 升級選項稀有度標籤顏色正確：普通=深灰框、稀有=水藍框、史詩=亮紫框、傳說=橙金框，同稀有度視覺統一。
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
30. 大地圖（M）玩家位置顯示角色頭像框（圓形遮罩 + 白邊），zOrder 最高蓋過敵人點；多人局各玩家各自頭像。
31. 祝福神選擇後中央上方橫幅顯示「{贊助者名} 的祝福已生效！+ 效果說明」停留 5 秒；HUD 右下角持久顯示已觸發贊助者小圖示，hover 有 tooltip。
32. anvilChoice 三選一裝備卡片：「替換後」標頭在三張卡中**同一高度**（desc 區固定 3 行最大，超出截斷 tooltip）；有目前裝備的 slot 在「替換後」末尾顯示橙色「✕ {目前裝備效果}」；空欄位不顯示失去效果區。
33. 金幣不再被排斥彈走；`pickupRange +60%` 大範圍情況下仍正常吸附，無振盪反彈。
34. Boss 及大型精英不再卡牆：走廊寬度 ≥ 6 tile；Boss 頂牆 0.5 秒後自動繞路；Boss 出生點確認周圍有足夠空地。
35. 隱藏房間揭示 Modal 有金框底色；顯示具體解鎖道具的圖示 + 名稱 + 稀有度 + 一行說明；頂部橫幅有半透明底框。
36. 替換裝備後舊效果完全清除：換裝前後 `__DBG.scene().player.stats.maxHp` 等屬性數值正確反映新裝備（舊加成不殘留）。
37. 鍛造砧三選一底部「都不要」按鈕存在；點擊 / 按 Escape 後面板關閉且無任何 stat 變動；每張卡片左上有對應圖示；卡片高度 ≤ 220×S；連開 5 次鐵砧出現至少 2 種非乘法類型選項。
38. 升級 / 鐵砧 / 裝備三選一面板開啟後按 Tab 切換至 build 頁（武器 / 被動 / 羈絆）；再按 Tab 返回選擇面板；`_buildPeek = true` 時無法觸發卡片選擇。

**五、任務與成就**
30. 存活 2:57 時任務追蹤**不**顯示滿格／完成樣式。
31. 左上 HUD 可同時顯示最多 3 條追蹤；公會「追蹤」切換邏輯正確。
32. 追蹤列顯示 `(當前/目標)`；hover 顯示完整說明。
33. 隱藏任務和「傳奇之證」完成後「領取」按鈕可用、點擊有效（不再無反應）。
34. 任務系列有前置任務（requires）的，未完成前置時顯示灰色鎖定行 + 「🔒 需先完成：{前置名}」；完成前置後自動解鎖。

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
46. 詛咒裝備：`rarity: 'curse'` 呈現紫紅邊框 + ☠ 圖示 + 紅色 penaltyDesc；`equipItem()` 同時套用 `statDelta` + `penalty`；解除時正確還原；詛咒裝備不在普通掉落池。
47. 負面狀態增強：D3 局玩家同時受 bleed+poison 時 DPS ≈ `13 + threat×1.4`；`curse` 狀態使冷卻 ×1.5 / 治療 ×0.4，8 秒後還原；HUD 狀態圖示行顯示骷髏圖示（紫色）。

**九、經濟平衡**
48. 金幣 nerf：`GOLD_DROP_MULT 0.35`、`goldMult` 受 `GOLD_MULT_CAP 3.0` 封頂；各加成（財運／拾荒者／貪婪之觸／金庫／貪婪之戒／麥達斯）依表調降。
49. sim 驗證：D3 完整 20 分鐘局，nerf 後單局入庫金幣明顯降低、中後期不再溢出；開局 5 分鐘節奏仍可接受。gen 檔改動已同步 workflow 來源或記錄重套。
50. 天賦費用調漲 ×2.0、設施費用調漲 ×2.0、鍛造費用調漲（等級 ×2.0 / 特效依 slot 遞增）；一次完整 D1 通關後天賦最多升至 40–50% 滿；`TALENT_COST_MUL` 等常數在 `balance.js` 集中管理。
51. 動態定價（VS 式）：同面板內升級 N 次後，顯示費用為 `baseCost × 1.08^N`；panel 頂部小字提示已升次數與費用漲幅；重置清零計數器。
52. 加法堆疊：同時裝備三件金幣道具 `player.stats.goldMult ≤ 3.0`（線性下降驗證）；`critChance` 全堆 build 上限停在 0.6；`__DBG.scene().player.stats` 即時查看。

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
- 修正隱藏任務／傳奇之證等特殊任務完成後無法領取的 Bug（canClaim 條件修正）。
- 死神（Reaper）基礎移速大幅提高（~140），加入追及加速機制，跑圈規避不再有效。
- 武器進化路徑在 Tab build 面板可見：顯示目標武器圖示、所需被動 ✓／✗，條件全滿時高亮「即將進化！」。
- 裝備掉落機率降低（一般敵人 ×0.7），減少戰況中頻繁被選擇面板中斷。
- 結算傷害排行：「持續傷害」「被動技能」bucket 加 hover tooltip 說明具體來源。
- 結算羈絆列表改為圖示小卡 + 效果說明（bonusDesc），每行 2 個。
- 結算頁所有大標題改為金黃色（#f5c518），視覺層級更清晰。

【造型商店大改版】
- 兩層 UI：第一層選角色（含持有數 / 總造型數）→ 第二層選造型（我的造型 / 商店購買兩 tab）。
- 全角色全造型隨機可購買，不再限定 4 個刷新槽；保留「每週特賣」打折機制。
- 造型定價分層：普通 400–600 金、豪華 800–1,200 金、隱藏全身造型 3,000–5,000 金。

【城鎮 UX 補齊】
- 成就殿堂新增「全部領取」按鈕（批次領取全部可領成就獎勵，含公會等級獎勵）。
- 成就通知橫幅全域化：城鎮中解鎖成就也顯示金色橫幅（AchievementToasts 全域佇列）。
- 天賦／設施／鍛造重置按鈕確保在所有解析度可見、點擊彈確認框；衣帽間加「購買不可退款」說明。

【跑局 HUD 補充】
- 升級卡片稀有度顏色：普通深灰框、稀有水藍框、史詩亮紫框、傳說橙金框，與 tag 底色統一。
- 大地圖（M）玩家以角色頭像圓框顯示（zOrder 最高），多人各自頭像。
- 祝福神選擇後：中央橫幅 Toast（5 秒）＋ HUD 持久贊助者圖示列（hover tooltip）；events.js 補齊 effectDesc 欄位。
- anvilChoice 三選一卡片固定版面：「替換後」同高對齊（desc 固定 3 行）；末尾顯示橙色「✕ 失去效果」，揭示替換後消失的目前裝備文字效果。
- 修正金幣排斥 Bug：吸附速度 clamp 到 min(ATTRACT_SPEED, dist)，避免過衝反向；進入吸附狀態後停用 entity-to-entity 推力。
- 修正 Boss 卡牆：走廊寬 4→6 tile（地圖生成）；Boss AI 頂牆 0.5s 觸發繞路；Boss spawn 前驗證出生點空地。
- 修正裝備更換舊效果殘留：equipItem 確保先移除舊裝備 statDelta，weapon 欄確保舊簽名武器 removeWeapon。
- 隱藏房間揭示改版：金框 Modal + 具體道具圖示 / 名稱 / 稀有度 / 說明；頂部橫幅加半透明底框。
- 鍛造砧三選一新增「都不要（跳過）」按鈕（底部灰框，Esc 同效）；每張卡片加圖示；卡片高度封頂 220×S；選項池擴充至 5 種類型（乘數 / 固定加成 / 武器特效 / 被動補強 / 特殊效果）。
- 所有三選一面板（鐵砧 / 升級 / 裝備撿取）中按 Tab 可疊層查看 build 頁；再按 Tab 返回；`_buildPeek` 旗確保 build 頁顯示期間無法誤觸選項。

【任務系統補充】
- 任務 def 新增 `requires` 欄位，系列任務循序解鎖；鎖定任務顯示 🔒 灰色行 + 前置名稱。

【戰鬥數值與 build 系統補充】
- 詛咒裝備（新稀有度）：紫紅邊框 + ☠ 圖示；有強加成但附帶 penalty（最大 HP 降低 / DoT / 道具撿取限制等）；5 件初始詛咒裝備；僅 FINAL_BOSS / 隱藏房間 / D4–5 精英掉落。
- 負面狀態數值強化：bleed/poison/burn DoT 值依 threat 動態提升；新增 curse 狀態（冷卻 +50%、治療 -60%，8 秒）；部分精英 / 所有 FINAL_BOSS 可施咒；新增對應 HUD 狀態圖示。

【經濟平衡補充】
- 天賦費用 ×2.0、設施費用 ×2.0、鍛造費用 ×2.0（等級）至 ×3.0（第 3 特效）；搭配金幣 nerf，城鎮升級需跨多局取捨；費用倍數集中至 balance.js 管理。
- 動態定價（VS 式）：同面板每次升級後其餘項目費用 ×1.08；META.hub.{panel}Purchases 記錄次數；重置清零；面板頂部顯示已升次數與漲幅說明。
- 百分比加成改加法堆疊：goldMult / critChance / moveSpeedMult / damageMult / xpMult / healMult / cooldownMult 全部改為 `1 + Σ bonuses`；各項設上限常數（GOLD_MULT_CAP 3.0、CRIT_CAP 0.6、DAMAGE_MULT_CAP 4.0 等）；防止多件裝備疊乘爆炸。

【新手引導與難度】
- 城鎮引導劇情（全玩家適用）+ 首局戰鬥提示 + 首局 HUD 暫停說明。
- 難度選擇說明文字；新增「劇情難度」（敵人極弱、掉落更佳、幾乎必過、不列入排行榜）。

【新系統與後端】
- 玩家回饋系統（ESC 入口 + feedback 資料表 + REST API + 後台「回饋」分頁，可篩選／改狀態／下載 JSON）。
- 魂晶銀行借貸系統（隨公會等級解鎖額度，下一局自動還款含息）。
- 後台「遊玩中」即時可見（REST 心跳，登入者與訪客通用，解決遊玩中玩家隱形問題）。
- Service Worker 離線快取（靜態資源 + MP3）。
```
