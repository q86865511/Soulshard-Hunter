# Round 16 UX 修正文件

## Context

本次更新根據玩家實際遊玩反應，針對 UI 跑版、字型、標點符號、對話框佈局、任務指示器樣式、城鎮地板視覺、新手引導缺失、難度說明、成就通知、武器進化隱性提示、離線快取等問題進行全面修正，並新增玩家回饋系統。

---

## 修改項目總覽

| # | 項目 | 主要異動檔案 |
|---|------|-------------|
| 1 | 全域字型改為標楷體 | `src/engine/renderer.js` |
| 2 | 全形標點符號統一 | `src/game/content/npcs.js`、各 UI 字串 |
| 3 | 對話框新增主角頭像（右側） | `src/game/scenes/hub.js` `drawDialogue()` |
| 4 | 任務驚嘆號改為黃色圓框圖示 | `src/game/scenes/hub.js` NPC name render |
| 5 | E 鍵互動提示文字優化 | `src/game/scenes/hub.js` 互動提示字串 |
| 6 | 城鎮地板藍色亮點調降 | `src/art/town_floor.js` `town_floor3` |
| 7 | ~~新手教學劇情（首次登入）~~ | 已重構為項目 10 |
| 8 | UI 自動縮放修正 | `src/engine/renderer.js` `uiScale()` + CSS |
| 9 | 玩家回饋系統 | `hub.js` + `api.js` + `ui.js` + `server.js` + `db.js` |
| 10 | 新手教學：城鎮引導（全玩家適用） | `src/game/scenes/hub.js` + `src/game/state.js` |
| 11 | 新手教學：首局戰鬥提示 | `src/game/scenes/run.js` |
| 12 | 難度選擇說明文字 | `src/game/scenes/hub.js` `drawSortie()` |
| 13 | 跑局中成就解鎖通知橫幅 | `src/game/hud.js` + `src/game/scenes/run.js` |
| 14 | 離開跑局確認彈窗 | `src/game/scenes/run.js`（返回大廳按鈕）|
| 15 | 武器進化隱性視覺提示 | `src/game/hud.js`（武器圖示渲染）|
| 16 | 對話框上一頁按鈕 | `src/game/scenes/hub.js` `drawDialogue()` |
| 17 | Service Worker 離線快取 | `sw.js`（新檔）+ `index.html` |

---

## 詳細修改規格

### 1. 全域字型改為標楷體

**檔案：** `src/engine/renderer.js`

**現況（約 L209）：**
```js
const FONT = '"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", system-ui, sans-serif';
```

**目標：**
```js
const FONT = '"標楷體", "DFKai-SB", "BiauKai", "Kaiti TC", "Kaiti SC", "STKaiti", "AR PL UKai CN", "Microsoft JhengHei", "PingFang TC", sans-serif';
```

- 前置列出所有常見平台的標楷體字型名稱，確保 Windows／macOS／Linux 均能正常顯示。
- `Microsoft JhengHei`（微軟正黑）作為降級備援（用戶若無楷體仍可讀）。
- 此單一改動影響所有呼叫 `uiText()`／`textWidth()` 的介面文字，包含對話框、HUD、面板標題等。

---

### 2. 全形標點符號統一

**規則：** 所有中文語境下，標點符號一律使用全形字元。

| 半形 | 全形 |
|------|------|
| `,` | `，` |
| `.` | `。` |
| `!` | `！` |
| `?` | `？` |
| `:` | `：` |
| `;` | `；` |
| `(` `)` | `（` `）` |

**主要異動檔案：** `src/game/content/npcs.js`

需全文搜尋替換，以下列出高頻問題行（僅示例，需全文掃描）：

- L28 `'只有一條:活著回來,把賞金花在刀口上。'` → `'只有一條：活著回來，把賞金花在刀口上。'`
- L33 `'要看看任務板嗎?'` → `'要看看任務板嗎？'`
- L52 `'才不是!'` → `'才不是！'`
- L66 `'初次來到魂晶之鎮嗎?'` → `'初次來到魂晶之鎮嗎？'`
- L66 `'出擊傳送門;四周…'` → `'出擊傳送門；四周…'`
- L91 `'你好強!'`、`'是在衣帽店買的嗎?'` → `'你好強！'`、`'是在衣帽店買的嗎？'`

**其他需掃描的檔案：**
- `src/game/scenes/hub.js`（面板標籤、Esc 選單）
- `src/net/ui.js`（登入 modal、排行榜欄位）
- `src/game/hud.js`（HUD 提示文字）

---

### 3. 對話框新增主角頭像（右側）

**檔案：** `src/game/scenes/hub.js`，函式 `drawDialogue()`（約 L246–265）

**現況：** 左側顯示 NPC 頭像 + NPC 名字 + 對話文字，右側空白。

**目標：** 右側新增「主角頭像 + 英雄名稱」欄位，鏡像對稱左側的 NPC 頭像。

**版面示意：**

```
┌──────────────────────────────────────────────────────┐
│ [NPC頭像] NPC名‧稱號                  英雄名  [主角頭像] │
│                                                      │
│   對話文字內容…（保留原有換行邏輯）                        │
│                                          ▸ 繼續 (E)  │
└──────────────────────────────────────────────────────┘
```

**程式異動：**
1. 在 `drawDialogue()` 取得目前選用英雄 id：`const charId = META.selectedChar || 'hunter'`
2. 取得英雄 sprite：`const heroSp = getSprite('char_' + charId)`（回退 `'player'`）
3. 在右側對稱位置繪製頭像框（`uiRect`）與 sprite（`drawSpriteUI`）。
4. 在頭像上方（或下方）繪製英雄名稱，顏色使用白色／淺金色（不使用 NPC 顏色）。
5. 英雄名稱來源：`Characters.get(charId)?.name` 或 `META.selectedCharName`。
6. 對話文字區的右側留白需相應縮短，避免被頭像遮蓋（計算 `textMaxW` 時扣除右側頭像欄寬度）。

**頭像框尺寸：** 與左側 NPC 頭像框等大（`64 * S`），右對齊於對話框右邊緣 `x + w - 12*S - 64*S`。

---

### 4. 任務驚嘆號改為黃色圓框圖示

**檔案：** `src/game/scenes/hub.js`，NPC 名稱渲染段（約 L619–624）

**現況：**
```js
const isNew = !(META.npc && META.npc.met && META.npc.met[n.def.id]);
uiText((isNew ? '❗' : '') + n.def.name, ss.x, ss.y, { size: 11 * S, align: 'center', color: n.def.color, weight: '800' });
```

**目標：** 驚嘆號不再前置於名字文字，改為在**名字正上方**獨立繪製一個黃色圓形背景 + 白色 `!` 的徽章。名字本身顏色不變。

**實作規格：**

```js
// 名字文字（不變）
uiText(n.def.name, ss.x, ss.y, { size: 11 * S, align: 'center', color: n.def.color, weight: '800' });

// 驚嘆號圓框徽章（isNew 才繪製，位置在名字上方）
if (isNew) {
  const bx = ss.x, by = ss.y - 14 * S;   // 名字上方 14px（scaled）
  const r = 7 * S;
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c518'; ctx.fill();
  ctx.lineWidth = 1.5 * S; ctx.strokeStyle = '#7a5c00'; ctx.stroke();
  uiText('!', bx, by + 1, { size: 10 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900', shadow: false });
}
```

- 圓框顏色：`#f5c518`（明黃），邊框 `#7a5c00`（深琥珀）
- 徽章位置：名字文字的 y 座標往上偏移 `14 * S` px
- **名字顏色完全不動**（`n.def.color` 保留）

---

### 5. E 鍵互動提示文字優化

**檔案：** `src/game/scenes/hub.js`（約 L617、L623、L633）

| 位置 | 現況 | 修改後 |
|------|------|--------|
| 建築正下方（靠近時顯示） | `按 E` | `【E】進入` |
| NPC 正下方（靠近時顯示） | `交談 E` | `【E】交談` |
| 底欄左側固定說明 | `走近建築/居民按 E` | `靠近 NPC 或建築，按【E】互動` |

- `【E】` 使用全形方括號，使按鍵更視覺突出。
- 底欄其他快捷鍵說明的標點符號也一併改為全形。

---

### 6. 城鎮地板藍色亮點調降

**檔案：** `src/art/town_floor.js`，sprite `town_floor3`（約 L140–160）

**問題：** `town_floor3` 的靈晶紋路使用 `P.shard`（青藍色）+ `glow` 效果過亮，玩家會誤以為是可撿取的地板道具。

**調整方向：**
1. **降低 glow 透明度**：`p.glow(8, 8, 5, P.shard, 0.30, 4)` → 透明度從 `0.30` 降至 `0.12`
2. **降低 star4 亮度**：`p.star4(8, 8, 3, withAlpha(P.shardL, 0.85), P.white)` → shardL 透明度從 `0.85` 降至 `0.40`，`P.white` 改為 `withAlpha(P.white, 0.5)`
3. **可選：改色**：將部分線條由 `P.shard` 改為 `P.stone`（灰色系），使其更像刻紋而非發光寶石
4. **出現率不變**（`floorVar` 機率邏輯無需異動）

**目標效果：** 紋路仍可見（作為裝飾），但不再像「發光物品」吸引玩家點擊。

---

### 8. UI 自動縮放修正

**檔案：** `src/engine/renderer.js`（約 L43）

**現況：**
```js
export function uiScale() {
  return Math.max(1, Math.min(3, Math.round(Math.min(W, H * 1.2) / 640)));
}
```

**目標：** 改為連續縮放（非整數取整），讓 UI 在各種解析度下均勻縮放。

```js
export function uiScale() {
  const base = Math.min(W / 960, H / 600);   // 以 960×600 為設計基準
  return Math.max(0.75, Math.min(2.5, base));  // 允許 0.75x–2.5x 連續縮放
}
```

- 設計基準從 640 提升至 960×600（更接近目前的 UI 實際設計尺寸）。
- 移除 `Math.round()`，讓面板在中間尺寸不會突然跳格。
- 下限 0.75 讓小螢幕仍可顯示完整 UI；上限 2.5 避免 4K 螢幕 UI 過大。

**其他關聯：** 確認 `index.html` 的 `<meta name="viewport">` 設定包含 `width=device-width, initial-scale=1`。

---

### 9. 玩家回饋系統

#### 功能概述

玩家可在城鎮 ESC 選單中點選「回報問題」，填寫問題類別與描述後送出。管理員可於管理介面查看所有回饋、更新狀態、以及下載為 JSON 文件。

#### 9-A. 資料庫（`server/src/db.js`）

在 `initSchema()` 的 SQL 字串中新增 `feedback` 表（緊接 `bans` 表後）：

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

- `user_id` 可為 NULL（未登入玩家的回饋）
- `status` 預設 `'pending'`，可改為 `'reviewing'`、`'fixed'`、`'dismissed'`
- `admin_note` 供管理員記錄處理備註

#### 9-B. 後端 API（`server/src/server.js`）

**`POST /api/feedback`（玩家提交，不需登入）：**
```js
const feedbackSchema = z.object({
  category: z.enum(['ui', 'gameplay', 'bug', 'content', 'other']),
  content:  z.string().min(5).max(1000),
  name:     z.string().max(24).optional(),
});

app.post('/api/feedback', async (req, reply) => {
  const parsed = feedbackSchema.safeParse(req.body || {});
  if (!parsed.success) return reply.code(400).send({ error: zodMsg(parsed.error) });
  const { category, content, name } = parsed.data;
  let userId = null;
  try { await auth(req, {}); userId = req.user?.id ?? null; } catch {}
  await pool.query(
    `INSERT INTO feedback (user_id, guest_name, category, content) VALUES ($1, $2, $3, $4)`,
    [userId, name || null, category, content]
  );
  return { ok: true };
});
```

**`GET /api/admin/feedback`（管理員查詢，支援 `status`／`limit`／`offset`）：**
```js
app.get('/api/admin/feedback', { preHandler: requireAdmin }, async (req) => {
  const { status, limit = 100, offset = 0 } = req.query || {};
  const where = status ? `WHERE f.status = $3` : '';
  const params = status
    ? [clampInt(limit,1,500), clampInt(offset,0,1e6), status]
    : [clampInt(limit,1,500), clampInt(offset,0,1e6)];
  const r = await pool.query(
    `SELECT f.id, COALESCE(u.username, f.guest_name, '訪客') AS author,
            f.category, f.content, f.status, f.admin_note, f.created_at
     FROM feedback f LEFT JOIN users u ON u.id = f.user_id
     ${where}
     ORDER BY f.created_at DESC LIMIT $1 OFFSET $2`,
    params
  );
  return { rows: r.rows };
});
```

**`PATCH /api/admin/feedback/:id`（管理員更新狀態／備註）：**
```js
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

#### 9-C. 前端 API 用戶端（`src/net/api.js`）

```js
submitFeedback(category, content, name) {
  return req('/feedback', { method: 'POST', body: { category, content, name } });
}
adminFeedback(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return req('/admin/feedback' + (qs ? '?' + qs : ''), { authed: true });
}
adminUpdateFeedback(id, patch) {
  return req('/admin/feedback/' + id, { method: 'PATCH', authed: true, body: patch });
}
```

#### 9-D. 城鎮 ESC 選單入口（`src/game/scenes/hub.js`）

```js
// escMenuItems() 中插入（放在「⚙ 設定」之前）
items.push({ id: 'feedback', label: '⚑ 回報問題', col: P.goldL });

// onEsc(id) 中新增
else if (id === 'feedback') openFeedback();
```

#### 9-E. 回饋表單 Modal（`src/net/ui.js`）

新增 `openFeedback()` 函式，使用現有 DOM 幫手（`$`、`closeModal`、`bindBackdropClose`、`toast`）。

**表單版面：**
```
┌────────────────────────────────────────┐
│  ⚑ 回報問題                           │
│                                        │
│  問題類別  [下拉選單]                  │
│                                        │
│  問題描述（最多 1000 字）              │
│  ┌──────────────────────────────────┐  │
│  │  請描述你遇到的問題…              │  │
│  └──────────────────────────────────┘  │
│                                        │
│  暱稱（選填）  [___________]           │
│                                        │
│        [取消]          [送出回饋]       │
└────────────────────────────────────────┘
```

**類別選項：**

| value | 顯示文字 |
|-------|---------|
| `ui` | UI／介面問題 |
| `gameplay` | 遊戲機制問題 |
| `bug` | 程式錯誤 |
| `content` | 內容或劇情問題 |
| `other` | 其他 |

- 未登入玩家也可送出（`name` 欄位為選填）
- 送出成功顯示 `toast('回饋已送出，感謝你的回報！')`
- `content` 字元數即時顯示計數器（最大 1000 字）

#### 9-F. 管理介面新增「回饋」分頁（`src/net/ui.js`）

在 `openAdmin()` 的 `tabDefs` 陣列新增第五個 tab：
```js
const tabDefs = [['overview','總覽'], ['players','玩家'], ['runs','對局'], ['cast','廣播'], ['feedback','回饋']];
```

**回饋 tab 功能：**

```
篩選列：[全部] [待處理] [處理中] [已修正] [忽略]   [下載 JSON]
─────────────────────────────────────────────────────────────
 ID │ 時間       │ 類別    │ 玩家     │ 內容摘要        │ 狀態  │ 操作
────┼────────────┼─────────┼──────────┼─────────────────┼───────┼──────
123 │ 2026-06-08 │ UI 問題 │ player1  │ 對話框右側跑版… │ 待處理│ [展開][修改狀態▼]
```

- **展開**：顯示完整 `content` + 可編輯 `admin_note`（有「儲存備註」按鈕）
- **修改狀態**：下拉選單，選擇後立即呼叫 `adminUpdateFeedback(id, { status })` 並重繪
- **下載 JSON**：抓取 `adminFeedback({ limit: 500 })`，以 `<a download>` 觸發下載，檔名 `feedback_YYYY-MM-DD.json`

**狀態色碼：**

| status | 顯示文字 | 顏色 |
|--------|---------|------|
| `pending` | 待處理 | `#f5c518`（黃）|
| `reviewing` | 處理中 | `#4fc3f7`（水藍）|
| `fixed` | 已修正 | `#66bb6a`（綠）|
| `dismissed` | 忽略 | `#78909c`（灰）|

---

### 10. 新手教學：城鎮引導（全玩家適用）

**觸發條件：** 僅檢查 `!META.tutorialDone`，**不限制** `totalRuns`。

- 新帳號：觸發。
- 舊版本升級的現有玩家（`META.tutorialDone` 不存在或為 false）：**同樣觸發**。
- 已看過教學（`META.tutorialDone === true`）：不觸發。

**觸發時機：** `hub.js` 的 `init()` 末尾，場景載入後 1 秒延遲。

```js
// hub.js init()
if (!META.tutorialDone) {
  setTimeout(() => this.triggerTutorial(), 1000);
}
```

新增 `triggerTutorial()` 方法：找到 `id='guide'` 的 NPC → 呼叫 `openDialogue(guideNpc)`，對話結束回呼設定 `META.tutorialDone = true; saveMeta()`。

**劇情腳本（蕾恩，共 5 頁）：**

```
第 1 頁：「你醒了……終於。我是蕾恩，城鎮的嚮導。」
第 2 頁：「這裡是魂晶之鎮，獵手們在戰場闖蕩後回來的避風港。」
第 3 頁：「傳送門就在廣場中央——走進去，選好英雄和生態，出發狩獵！」
第 4 頁：「回來後，把賺來的金幣花在各個房間，讓自己越來越強。」
第 5 頁：「其他居民也可以交談，他們各有各的故事……準備好了嗎？」
```

**`state.js` 異動：** `META.tutorialDone` 直接存於 META root，無需新欄位（不存在視為 false）。

---

### 11. 新手教學：首局戰鬥提示

**觸發條件：** `!META.tutorialBattleDone`（不限 totalRuns，舊玩家同樣適用）。

**觸發時機：** `run.js` 的 `init()` 末尾，依序計時顯示提示，全部顯示完後設定 `META.tutorialBattleDone = true; saveMeta()`。

**提示陣列（`run.js` 新增 `_battleHints`）：**

```js
_battleHints = [
  { t: 3,  text: '武器自動瞄準並射擊，無需手動操作。' },
  { t: 12, text: '按【空白】或【滑鼠右鍵】可緊急閃避。' },
  { t: 22, text: '按【B】隨時開啟商店，花費魂晶強化裝備。' },
  { t: 33, text: '按【M】查看小地圖，按【Tab】查看目前配裝。' },
  { t: 45, text: '升級時停止時間，從三個選項中選擇強化。' },
];
```

**渲染方式：** 在畫面下方中央繪製半透明橫幅（淡入 0.5s → 停留 3s → 淡出 0.5s），深藍底色 + 白字，不阻擋遊玩。

---

### 12. 難度選擇說明文字

**檔案：** `src/game/scenes/hub.js`，`drawSortie()` 難度選擇區段。

**選中某難度時，於下方說明欄位顯示：**

| 難度 | 說明文字 |
|------|---------|
| D1 | 適合初次體驗，敵人血量與傷害較低。 |
| D2 | 敵人有機會形成包圍圈，需注意走位。 |
| D3 | 敵人持續砲擊，高壓戰場，挑戰中級。 |
| D4 | 敵人射程增加，建議熟悉各英雄再挑戰。 |
| D5 | 極限壓力，敵人傷害大幅提升，魂晶高手限定。 |

**實作方式：** 說明文字區塊以淺灰色小字顯示在難度按鈕下方，不佔用按鈕空間（簡單的 `selectedDiff` 條件判斷）。

---

### 13. 跑局中成就解鎖通知橫幅

**檔案：** `src/game/scenes/run.js` + `src/game/hud.js`

**觸發點：** `content/achievements.js` 的 `checkAchievements()` 解鎖成就時，額外呼叫 `run.queueAchievementToast(ach)`（若 `run` 存在）。

**`run.js` 新增：**
```js
_achToasts = [];   // { name, endT }

queueAchievementToast(ach) {
  this._achToasts.push({ name: ach.name, endT: this.elapsed + 4 });
}
```

**`hud.js` 渲染（右上角，最多 2 條堆疊）：**

```
┌─────────────────────┐
│  🏆 成就解鎖         │
│  初次通關！          │
└─────────────────────┘
```

- 深金色底（`#2a1f00`）+ 金色邊框（`P.gold`）+ 白字
- 淡入 0.3s → 停留 3s → 淡出 0.5s，之後從 `_achToasts` 移除

---

### 14. 離開跑局確認彈窗

**觸發點：** 跑局 Esc 選單「🏠 返回大廳」及設定頁面的「返回大廳」。

**顯示內容：**
```
確定要放棄本次跑局嗎？

本次進度不會被記錄，已取得的強化將全數清除。

      [繼續遊戲]          [放棄並返回]
```

- 「繼續遊戲」：關閉 modal，回到遊戲。
- 「放棄並返回」：執行原本的 `setScene(refs.hub)`。
- **Reaper 時段或已通關時不顯示確認**（此時返回大廳屬正常流程）。

實作使用現有的 `ask(text, detail, onYes)` 機制（類似 hub.js 的確認 modal）。

---

### 15. 武器進化隱性視覺提示

**設計原則：** 不明說「可進化」，讓玩家透過觀察發現。

**觸發條件：** 武器已達滿級（`level >= maxLevel`）且玩家持有 `evolveReq` 被動武器。

**視覺效果（`hud.js` 武器圖示渲染）：**

```js
// canEvolve(inst, player) 為 true 時，在武器圖示繪製完後追加：
ctx.save();
ctx.globalAlpha = 0.35 + Math.sin(run.elapsed * 2.5) * 0.15;  // 緩慢脈動
ctx.shadowColor = '#ffe88a';
ctx.shadowBlur = 8 * S;
ctx.strokeStyle = withAlpha('#ffe88a', 0.6);
ctx.lineWidth = 1.5 * S;
ctx.strokeRect(iconX - 1, iconY - 1, iconW + 2, iconH + 2);
ctx.restore();
```

**效果描述：** 圖示邊框微微發出緩慢脈動的白金色光暈，沒有任何文字提示。

**輔助函式：**
```js
function canEvolve(inst, player) {
  const def = Weapons.get(inst.id);
  if (!def?.evolveInto || !def?.evolveReq) return false;
  if (inst.level < (def.maxLevel ?? 7)) return false;
  return player.passives.some(p => p.id === def.evolveReq);
}
```

---

### 16. 對話框上一頁按鈕

**檔案：** `src/game/scenes/hub.js`，`drawDialogue()` 與 `updateDialogue()`

**`drawDialogue()` 新增：**
- 在對話框**左下角**新增「◀ 上一頁」按鈕。
- `d.page === 0` 時隱藏（第一頁無上一頁）。
- 樣式與現有「▸ 繼續 (E)」右下角按鈕對稱。

**`updateDialogue()` 新增輸入處理：**
```js
// 鍵盤：左方向鍵往回
if (pressed('left') && d.page > 0) d.page--;

// 滑鼠點擊「◀」按鈕區域
if (mouse.justDown && inside(mx, my, prevBtnRect) && d.page > 0) d.page--;
```

- 往回翻頁不觸發任何特殊邏輯（僅減少 `d.page`）。
- 往前翻頁（E／空白／點擊）邏輯不變。
- 最後一頁的「結束」行為不受影響。

---

### 17. Service Worker 離線快取

**新增檔案：** `sw.js`（專案根目錄）

**快取策略：** Cache-First（先查快取，無則網路取得並存入快取）。

**快取範圍：**
- `index.html`
- `src/` 下的所有 `.js` 模組
- `assets/music/*.mp3`（12 首 MP3）

**`sw.js` 結構：**
```js
const CACHE = 'soulshard-v1';
const PRECACHE = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.startsWith('/api')) return;  // API 請求直接走網路
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
```

**`index.html` 新增（`<script>` 區塊末尾）：**
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

**注意：**
- 版本更新時需修改 `CACHE` 常數（如 `'soulshard-v2'`）以強制清除舊快取。
- 開發測試時可在 DevTools → Application → Service Workers 點「Unregister」暫時停用。

---

## 不修改的項目

- 對話框 NPC 名字顏色（`n.def.color`）— 維持原設計，僅異動驚嘆號徽章。
- 城鎮地板的**出現率**（`floorVar` 機率）— 不變，只調低視覺亮度。
- 現有 NPC 對話內容的語意 — 只改標點，不改劇情文字。
- 音樂／音效音量分離 — 已於舊版本實作，**無需修改**。
- 武器進化條件 — 不以任何文字提示說明，保留玩家自行探索的樂趣。

---

## 驗證方式

1. **字型**：DevTools → Computed → font-family 確認楷體套用；中文字應帶楷書筆觸。
2. **標點**：逐一對話所有 NPC，確認無半形標點。
3. **對話框頭像**：與 NPC 交談，右側應出現英雄頭像 + 名字；換角色後重新確認。
4. **驚嘆號徽章**：清除 `META.npc.met`，進城鎮，NPC 名字**上方**應出現黃色圓框 `!`；交談後消失；名字顏色不變。
5. **E 鍵提示**：靠近建築看到 `【E】進入`；靠近 NPC 看到 `【E】交談`；底欄文字正確。
6. **地板藍光**：城鎮地板有靈晶紋路但不刺眼，不像可撿取道具。
7. **城鎮教學**：重置 `META.tutorialDone`，進入城鎮 1 秒後蕾恩自動開始對話；走完全部頁面後 `META.tutorialDone === true`；以舊存檔（`totalRuns > 0` 但 `tutorialDone` 不存在）測試，應同樣觸發。
8. **UI 縮放**：視窗調至 800×500 和 2560×1440，面板不應截斷或過大。
9. **玩家回饋**：ESC 選單出現「⚑ 回報問題」→ 填寫送出 → toast 顯示；管理介面「回饋」tab 可查看、篩選、修改狀態、下載 JSON。
10. **戰鬥提示**：重置 `META.tutorialBattleDone`，出擊後第 3／12／22／33／45 秒依序出現浮動提示；全部顯示完後 `tutorialBattleDone === true`。
11. **難度說明**：出擊介面選擇各難度時，下方顯示對應說明文字。
12. **成就通知**：出擊中解鎖成就，右上角出現金色橫幅（淡入→停留→淡出）；多條時垂直堆疊。
13. **離開確認**：Esc 選單點「返回大廳」出現確認 modal；通關後或 Reaper 段直接返回不彈窗。
14. **武器進化提示**：持有滿足進化條件的武器，HUD 武器圖示邊框出現緩慢脈動白金色光暈；無任何文字說明。
15. **對話框上一頁**：NPC 對話第 2 頁以後，左下角顯示「◀ 上一頁」；左方向鍵或點擊可往回翻頁。
16. **Service Worker**：DevTools → Application → Service Workers 顯示已啟動；斷網重整仍可進入遊戲；MP3 正常播放。

---

## changelog 條目

檔案：`docs/changelog/ROUND16.md`

```
## Round 16 — UX 精修 + 新手引導 + 玩家回饋

- 全域字型改為標楷體（含 fallback 鏈），提升中文可讀性。
- 所有 NPC 對話、UI 面板、提示文字的半形標點符號統一改為全形。
- 對話框右側新增主角英雄頭像與名稱，強化「對話感」；新增上一頁按鈕（左下角）。
- NPC 任務驚嘆號改為名字正上方的黃色圓框徽章，更直覺、不與名字混排。
- E 鍵互動提示改為【E】進入／【E】交談，語意更清晰。
- 城鎮地板靈晶紋路調降亮度，不再誤導玩家以為是可撿取道具。
- 新手教學全玩家適用：進城鎮自動播放蕾恩嚮導引導劇情，首局出擊依序顯示 5 條戰鬥提示橫幅；舊版本升級的玩家若未看過同樣觸發。
- 出擊介面各難度新增說明文字，幫助玩家做出有意識的選擇。
- 跑局中成就解鎖即時顯示右上角金色橫幅通知。
- 離開跑局前出現確認彈窗，防止誤觸。
- 武器滿足進化條件時，圖示邊框出現隱性白金脈動光暈，讓玩家自行探索。
- UI 縮放公式改為連續值，解決小視窗跑版與大螢幕 UI 過大問題。
- 玩家回饋系統：ESC 城鎮選單新增「⚑ 回報問題」入口；後端新增 `feedback` 資料表 + REST API；管理介面新增「回饋」tab，可篩選、更新狀態、儲存備註、一鍵下載 JSON。
- Service Worker 離線快取：靜態資源與 MP3 快取至 Cache Storage，弱網或斷網仍可遊玩。
```
