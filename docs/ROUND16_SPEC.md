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
| 18 | 鐵匠鋪 UI 跑版與等級顯示修正 | `src/game/scenes/hub.js` 鍛造／營地 panel |
| 19 | 城鎮地圖外側視覺處理 | `src/game/world.js`、`src/game/scenes/hub.js` |
| 20 | 教堂天賦 UI 全面修正 | `src/game/scenes/hub.js` `drawTalents()` |
| 21 | 城鎮建築與物品加入碰撞體積 | `src/game/world.js` `makeCamp()` |
| 22 | 公會介面及全域 UI 圖層／排版修正 | `src/game/scenes/hub.js` 各 panel |
| 23 | 衣帽間重新進貨按鈕位置修正 | `src/game/scenes/hub.js` wardrobe panel |
| 24 | 選單按鍵視覺對比度提升 | `src/game/scenes/hub.js` ESC menu + 各 panel |
| 25 | 成就頁面黃色字體位置修正 | `src/game/scenes/hub.js` achievements panel |
| 26 | 出擊選角初始武器縮放重疊修正 | `src/game/scenes/hub.js` `drawSortie()` |
| 27 | 個人小屋標點與 ESC 說明排版 | `src/game/scenes/hub.js` personal panel |
| 28 | 升級選擇強化 Hover 圖層與間距修正 | `src/game/scenes/run.js` level-up choice |
| 29 | 探索結算頁面全面優化 | `src/game/scenes/run.js` results screen |
| 30 | 存活任務進度條邏輯 Bug 修正 | `src/game/content/quests.js`、`run.js` |
| 31 | 多任務同時追蹤 | `src/game/scenes/hub.js`、`src/game/hud.js` |
| 32 | 追蹤任務進度數值顯示 | `src/game/hud.js` quest tracker |
| 33 | 成就可領取提示 + 篩選分頁 | `src/game/scenes/hub.js` achievements panel |
| 34 | 借貸系統（魂晶銀行） | 新 content + hub panel + server |
| 35 | 統一金幣文字為圖示 | 全域 UI 字串替換 |
| 36 | 撿取道具提示停留時間 + 右側紀錄欄 | `src/game/hud.js`、`src/game/scenes/run.js` |
| 37 | 撿取裝備 UI 下方空白說明重疊修正 | `src/game/scenes/run.js` equip choice panel |
| 38 | 跑局 HUD 佈局全面修正（金幣對齊、地圖名、衝刺欄） | `src/game/hud.js` |
| 39 | 進入地圖「按空白開始」自動觸發 Bug 修正 | `src/game/scenes/run.js` intro screen |
| 40 | 新手跑局介面暫停說明 + 升級卡片外框 | `src/game/scenes/run.js`、`src/game/hud.js` |
| 41 | 地板掉落物顏色外框分類 + 寶箱鑰匙提醒 | `src/game/pickup.js`、`src/game/world.js` |

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

## 新增項目詳細規格（項目 18–35）

---

### 18. 鐵匠鋪 UI 跑版與等級顯示修正

**檔案：** `src/game/scenes/hub.js`，鍛造 panel 與營地設施 panel

**問題清單（截圖紅框區）：**
1. **底部截斷**：「疾速」等特效選項被面板底邊截斷，滾動條未觸及最後一項。
2. **字體與圖示排列**：鍛造特效行的名稱／說明文字與圖示對齊不一致，行高不統一。
3. **營地設施等級顯示**：目前以「Lv.x / max」文字顯示；改為與天賦／鍛造相同的**方格進度條**（每升一級填充一格，`■` 已升 / `□` 未升），視覺一致性更高。

**修正方向：**
- 鍛造特效清單的捲動容器需設定明確的最大高度與 `overflow: auto`，確保底部項目可捲到。
- 營地設施每行加入方格進度條渲染，格數 = 該設施 `maxLevel`。

---

### 19. 城鎮地圖外側視覺處理

**問題：** 地圖外側為純黑色，玩家可透過鏡頭看到硬邊界，視覺突兀。

**兩種方案（選其一）：**

**方案 A — 漸層霧化遮罩（推薦）：**
- 在 `hub.js` 的 `draw()` 最後一層，於畫面四邊繪製向內漸層消失的半透明黑色矩形（`radialGradient` 或四邊各一條 `linearGradient`）。
- 遮罩寬度約 3–4 格 tile，透明度由外（0.9）→ 內（0.0）。
- 效果：地圖邊緣自然淡入黑暗，不露出硬切邊。

**方案 B — 鏡頭限制：**
- 修改 `hub.js` 的 `updateCamera()` 或 `renderer.js` 的 `worldToScreen()`，限制鏡頭範圍使地圖外側永遠不進入可視區域。
- 需計算地圖實際邊界（`world.tw * TS`、`world.th * TS`）並 clamp 鏡頭位置。

---

### 20. 教堂天賦 UI 全面修正

**檔案：** `src/game/scenes/hub.js`，`drawTalents()` 函式

**問題清單：**

1. **升級進度條高度 vs 金幣價格高度不一致**：進度條（方格）與右側金幣標價應在同一水平基線對齊。
2. **標題、圖示、名稱、說明字體偏小**：各元素尺寸均可放大 10–20%（依 `uiScale()` 倍率）。
3. **底部「點擊節點花費金幣升級 · Esc 關閉」說明被遮擋**：改為浮動顯示於 panel 頂部標題列右側（小字），或移入 panel 外上方，避免遮擋列表。
4. **分類區塊缺乏視覺框線**：「攻勢」「守備」「機動」「財富」各欄加入細邊框或背景色塊，使分類更明確。
5. **標題也需加框**：panel 標題列（「教堂‧天賦」）加入底部分隔線或背景框。
6. **說明文字過長截斷**：每個天賦節點的說明若超過單行，目前截斷不顯示。改為：
   - 停留（hover）時在節點旁浮出完整說明卡片（`drawTooltip()`）。
   - 或點擊時展開卡片。
7. **滾動條與內容重疊（全域問題）**：所有有滾動條的 panel（天賦、成就、公會任務等），右側滾動條應在內容區域**外部**，不能覆蓋最右欄內容。解法：內容區域寬度計算時扣除捲動條寬度（約 `8 * S`）。

---

### 21. 城鎮建築與物品加入碰撞體積

**問題：** 玩家可以走進建築、燈柱、雕像等裝飾物體內部，破壞沉浸感。

**檔案：** `src/game/world.js`，`makeCamp()` 函式

**實作方式：**
- 現有 `makeCamp()` 已有 `WALL` 格子阻擋（tile-based collision）。
- 對每個站台（station）和大型裝飾物件，在其 sprite 佔用的 tile 範圍內設置 `WALL` 或新增 `SOLID` 標記。
- 小型裝飾（燈、旗幟）可用玩家中心距離判定（`dist < obj.radius` 時推開），不必整塊 tile 封鎖。
- 注意不要封鎖互動觸發點（E 鍵範圍），只阻擋穿越。

---

### 22. 公會介面及全域 UI 圖層／排版修正

**檔案：** `src/game/scenes/hub.js`，各 panel 渲染函式

**問題清單（截圖紅框區，適用多數 city panel）：**

1. **分頁按鈕圖層錯誤（任務委託／公會等級 tab）**：分頁按鈕繪製於 panel 內容層**之上**，造成視覺上分頁按鈕「浮在最前」但背景不連貫。確保分頁按鈕的 z-order 正確，與 panel 背景同層或略高一層（但不高於內容）。
2. **小按鈕比分頁按鈕還大**：「領取」「進行中」等行內按鈕高度／字號應小於頂部分頁按鈕，視覺層級需一致（頁籤 > 操作按鈕）。
3. **空的 XP 欄不顯示**：公會等級 XP 欄在 `guild.xp === 0` 時應顯示空條（0 填充），而非完全隱藏（目前截圖顯示欄位消失）。
4. **「進行中」框格溢出底層外框**：右側「進行中」按鈕的邊框超出 panel 外框。改為讓每行右側按鈕的 x 上限為 `panelX + panelW - padding`。
5. **UI 不置中（解析度相關）**：公會 panel 及其他 panel 在非標準解析度下位置偏移。確認所有 panel 的 x、y 起點使用 `view.W / 2 - w / 2`、`view.H / 2 - h / 2` 計算，而非硬編碼偏移。

---

### 23. 衣帽間重新進貨按鈕位置修正

**問題：** 「重新進貨」按鈕與商品列表或其他元素重疊，且按鈕偏小不易點擊。

**修正方向：**
- 將「重新進貨」按鈕移至 panel 頂部右側工具列（與「重置鍛造」「重置天賦」等按鈕同一區域），與 panel 標題列齊高。
- 按鈕最小寬度 `80 * S`，高度 `28 * S`，顯示「↺ 重新進貨」。
- 旁邊顯示重新進貨所需金幣（若需付費）或倒數計時（若為免費刷新）。

---

### 24. 選單按鍵視覺對比度提升

**問題：** 城鎮 ESC 選單及各 panel 按鍵與背景色差太小，難以辨識邊界。

**修正方向（全域適用）：**
- ESC 選單按鈕：現有深藍底色，加入 1–2px 外框（顏色比背景亮 20–30%），hover 時外框加亮。
- panel 內「確認」「取消」「升級」等次要按鈕：加入圓角外框（stroke），底色與 panel 背景有明確色差。
- 分頁按鈕（tab）：未選中時底色更暗（透明度降低），選中時底色亮且加底部強調線。
- 可參考現有 `net/ui.js` 的 `net-primary`／`net-ghost` 按鈕樣式，統一套用至 Canvas UI 渲染。

---

### 25. 成就頁面黃色字體位置修正

**問題：** 成就 panel 底部的「已解鎖 xx / 總計 xx」黃色統計文字浮在成就列表上方，遮蓋最後幾行成就項目。

**修正方向：**
- 將統計文字固定在 panel **內部底部留白區**（panel 底邊向上 `24 * S` px），並確保成就列表的捲動範圍不延伸到統計文字區域（底部 padding 留足）。
- 或改為固定在 panel 標題列右側（小字），不佔用列表空間。

---

### 26. 出擊選角初始武器縮放重疊修正

**問題：** 在某些視窗比例下，角色卡片展開的「起始武器：XXX」說明文字與角色名稱或鎖定提示重疊。

**修正方向（`drawSortie()` 函式）：**
- 角色卡片展開時的初始武器文字應在角色名稱**下方固定行**渲染，不與名稱行共用 y 座標。
- 確認文字 y 起點計算使用 `cardY + nameH + gapH` 而非固定 offset。
- 在極小 `uiScale` 下，若卡片高度不足，應省略初始武器行（不截斷，直接不渲染）。

---

### 27. 個人小屋標點與 ESC 說明排版

**問題：**
1. 個人小屋 panel 內有半形標點符號（如括號、逗號）。
2. 某處 ESC 說明（如「ESC 關閉」）與前面的介紹文字擠在同一行，難以閱讀。

**修正方向：**
- 掃描 `hub.js` personal panel 所有字串，改為全形標點。
- ESC 說明與介紹文字改為上下兩行，說明文字（ESC 關閉）作為副行，字號縮小 10–20%，顏色使用淺灰色（`withAlpha('#fff', 0.5)`）。

---

### 28. 升級選擇強化 Hover 圖層與間距修正

**問題（run.js 升級選項 panel）：**
1. **圖層問題**：滑鼠移到選項上時，hover 高亮層繪製順序錯誤，導致部分元素破圖（圖示被覆蓋）。
2. **遮蓋上方提示**：hover 效果蓋住頂部「點擊選擇強化」說明文字。
3. **元素間距過密**：圖示、名稱、說明文字之間留白不足。
4. **武器／被動／裝備無顏色區分**：難以快速辨識選項類型。

**修正方向：**
- 繪製順序：背景 → 卡片底色 → 圖示 → 文字 → hover 高亮框（僅描邊，不填色），確保 hover 層永遠在最上層但只用 stroke，不遮擋內容。
- 頂部提示文字的 y 座標固定在 panel 外上方，不受 hover 影響。
- 行間距：圖示與名稱間隔 `6 * S`，名稱與說明間隔 `4 * S`，卡片上下 padding `10 * S`。
- **顏色區分方案**：
  - 武器：左側色條使用 `P.shard`（青藍）
  - 被動：左側色條使用 `P.greenL`（綠）
  - 裝備：左側色條使用 `P.gold`（金）
  - 色條為卡片左邊緣 `3 * S` 寬的矩形，不影響文字區域。

---

### 29. 探索結算頁面全面優化

**檔案：** `src/game/scenes/run.js`，results screen 渲染

**問題與修正方向：**

1. **被動圖示與文字距離過近**：圖示右側至文字左側間隔加大至 `8 * S`。
2. **裝備文字與圖示同行**：裝備名稱應換至圖示正下方（另起一行），不與圖示並排在同一 y。
3. **傷害排行簡化**：
   - 色塊只顯示傷害數值，移除「占比 XX%」文字。
   - 整體縮小，單行高度降低，排列更緊湊。
4. **本局成就只顯示圖示**：
   - 若本局解鎖了成就，僅顯示成就圖示（`iconOr(ach.icon, 'star')`），小圖示橫列排列。
   - 滑鼠移至圖示上，顯示 tooltip（成就名稱 + 說明）。
   - 節省空間，可顯示更多成就。
5. **抵達威脅／存活時間呈現改善**：
   - 目前頂部數個數字橫排顯示，視覺混亂。
   - 改為卡片式佈局（每個指標一個小卡片：icon + 標籤 + 數值），水平排列，卡片間有分隔線。
   - 例如：`⚡ 最高威脅 13`、`⏱ 存活 12:34`、`💀 擊殺 430`，各自一張卡片。

---

### 30. 存活任務進度條邏輯 Bug 修正

**問題（截圖）：** 存活 2:57，距離「單局存活 3 分鐘」差 3 秒未達成，但左上角任務追蹤仍顯示經驗條（如同達成）。

**根因：** 任務進度計算邏輯在判斷「是否顯示進度條」時，可能使用了錯誤的條件（例如 `progress >= 0` 而非 `progress >= target`）。

**修正方向：**
- 在 `quests.js` 或 `hud.js` 的任務進度渲染中，**只在任務已達成（progress >= target）時才顯示進度條填滿效果**。
- 進行中的進度（0 < progress < target）正確顯示為部分填充，**不顯示為完整填充**。
- 任務未達成時，「追蹤」按鈕旁不應出現綠色完成樣式。

---

### 31. 多任務同時追蹤

**問題：** 目前只能追蹤一個任務，進度顯示在左上角。

**修正方向：**
- `META.quest.tracked` 從單一字串改為陣列（最多追蹤 **3 條**）。
- 左上 HUD 的任務追蹤區顯示最多 3 條，各自一行（標題 + 進度條 + 數值）。
- 公會任務委託 panel 的「追蹤」按鈕行為改為切換（已追蹤 → 點擊取消追蹤；未追蹤且未滿 3 條 → 加入追蹤；已滿 3 條 → toast 提示「最多同時追蹤 3 項」）。
- 主線任務固定為第一條，不佔追蹤欄位。

---

### 32. 追蹤任務進度數值顯示

**問題：** 左上角追蹤任務只顯示名稱和進度條，無具體數值，玩家不清楚距離目標還差多少。

**修正方向：**
- 每條追蹤任務在進度條旁顯示 `(當前值/目標值)` 格式：
  - 時間類：`(2:57 / 3:00)`
  - 計數類：`(148 / 300)`
  - 百分比類：`49%`（hover 顯示詳細數值）
- 數值字串以淺色小字顯示於進度條右側或下方。
- 滑鼠移至追蹤列上時，顯示完整任務說明的 tooltip。

---

### 33. 成就可領取提示 + 篩選分頁

**問題：** 玩家不知道何時有成就可以領獎，需主動進成就殿堂查看；成就清單缺乏篩選功能。

**修正方向：**

**A. 成就建築上方驚嘆號：**
- 在 `hub.js` 的 station 渲染中，若 `hasClaimableAchievements(META)` 為 true，在成就殿堂建築名稱上方繪製與 NPC 相同的**黃色圓框驚嘆號徽章**（項目 4 的相同實作）。

**B. 成就 panel 篩選分頁：**
- 新增 3 個 tab：**全部**、**已達成**、**未達成**。
- tab 切換影響清單過濾，不影響其他 panel 邏輯。
- 實作為 panel 頂部 tab 列（類似公會的「任務委託 / 公會等級」）。

**C. 成就分類擴充（可延後至 Round 17）：**
- 現有成就新增 `category` 欄位：`'combat'`（戰鬥）、`'collection'`（收集）、`'progress'`（累積遊玩）、`'story'`（劇情）等。
- 篩選 tab 可選擇分類，清單僅顯示該分類。

---

### 34. 借貸系統（魂晶銀行）

**設計概念：** 玩家在城鎮可向「魂晶銀行」（新 NPC 或新房間互動點）借取金幣，用於提前購買強化或裝備；借款需在後續跑局中還清（自動扣除），利息作為平衡機制。

**功能規格：**

**借款規則：**
- 初始可借：**50 金幣**
- 利率：每次跑局結算時自動還款 = 借款本金 × 1.2（一次還清）
- 解鎖更高額度：隨公會等級提升，解鎖 100 / 200 / 500 金幣上限
- 同時只能有一筆借款（未還清時無法再借）

**存檔欄位（`META.bank`）：**
```js
META.bank = {
  debt: 0,          // 目前欠款金額（本金 × 利率後的還款額）
  borrowed: 0,      // 本金（顯示用）
};
```

**還款觸發：** `bankRun(run, meta)` 結算時，若 `META.bank.debt > 0`：
- 若 `meta.gold >= debt`：直接扣除，清空 `debt`。
- 若 `meta.gold < debt`：扣除現有全部金幣，剩餘 debt 保留（累積到下一局）。
- 結算畫面顯示「還款 XX 金幣（含利息）」。

**城鎮 UI：**
- 互動點：廣場或市場區放置「魂晶銀行」小招牌（新 station 或現有老潘 NPC 擴充）。
- 開啟 panel 顯示：目前欠款、可借額度、借款按鈕（帶確認對話）、還款說明。
- 有欠款時按鈕改為「已有借款（剩餘 XX 金幣待還）」，不可再借。

---

### 35. 統一金幣文字為圖示

**問題：** 全遊戲混用「金」「金幣」兩種文字，且部分地方無圖示，視覺不一致。

**修正方向：**
- 定義一個輔助函式 `goldStr(amount)` → 回傳帶圖示前綴的字串，例如 `🪙 180` 或使用現有金幣 sprite 繪製於文字前。
- 將所有 `'XXX 金'`、`'XXX 金幣'`、`'花費 XX 金'` 等格式統一改為呼叫 `goldStr(amount)` 或直接在渲染時先繪製金幣圖示再接數字。
- 優先替換頻率最高的區域：鍛造特效價格、天賦升級、任務獎勵、ESC 選單（目前已有金幣圖示，確認一致）。
- 搜尋關鍵字：`'金'`、`'金幣'`、`+ ' 金'`、`+ '金'`，逐一確認替換。

---

### 36. 撿取道具提示停留時間 + 右側紀錄欄

**問題：** 撿到道具（血瓶、魂晶等）的提示文字消失太快，玩家視覺忙於躲避敵人時完全看不清楚。

**修正方向：**

**A. 右側持久紀錄欄（推薦）：**
- 在 HUD 右側新增「拾取紀錄」區塊，固定顯示最近 **5 筆**撿取紀錄。
- 每筆格式：圖示 + 名稱 + 效果（如 `🧪 血瓶 +30 HP`、`⭐ 魂晶 +1`）。
- 最新一筆高亮（白字），舊紀錄逐漸淡化（透明度 0.8 → 0.4 → 0.2），超過 5 筆從頭移除。
- 每筆紀錄在畫面停留 **8 秒**後才開始淡出，淡出時間 2 秒。

**B. 現有浮動文字加長停留（最小改動）：**
- 現有浮動文字停留時間從約 1s 延長至 3s，字體放大 10%，加半透明底色框使其在任何背景下可讀。

**`run.js` / `hud.js` 異動：**
- 新增 `run._pickupLog = []`，每次撿取追加 `{ icon, text, t }`。
- `hud.js` 的 `draw()` 從 `run._pickupLog` 取最後 5 筆，依時間計算透明度後渲染。

---

### 37. 撿取裝備 panel 下方重疊修正

**問題：** 玩家靠近裝備拾取物並觸發選擇 panel 時，panel 下方的空白／說明文字（如「按 E 確認」「按 Esc 放棄」）與地圖上其他 UI 元素（HUD、任務追蹤）重疊。

**修正方向：**
- 裝備選擇 panel 應有固定尺寸，底部留 padding，說明文字在 panel **內部底部**渲染，而非 panel 外。
- 說明文字 y 座標 = `panelY + panelH - 20 * S`，不得超出 panel 邊界。
- Panel 本身需蓋住底層 HUD（確保 panel 背景有足夠不透明度，`alpha ≥ 0.92`）。
- 若 panel 高度不足以容納所有內容，優先縮短說明文字，不壓縮裝備屬性列表。

---

### 38. 跑局 HUD 佈局全面修正

**檔案：** `src/game/hud.js`

**問題清單（截圖）：**
1. **右上角金幣圖示與數字未對齊**：金幣 icon 與數值的垂直中心線不一致（一高一低）。
2. **擊殺數與金幣呈現方式不同**：擊殺數有文字標籤，金幣只有數字；建議統一為「圖示 + 數字」格式。
3. **地圖名稱需獨立一行且放大**：目前地圖名稱字號偏小且與其他元素同行；改為畫面頂部中央獨立一行，字號加大 20%，可加淺色底框使其不被背景淹沒。
4. **衝刺冷卻欄與上一行太近**：衝刺 icon 與上方 HP 條或武器欄間距不足；加入 `gapY = 8 * S` 的垂直間距。
5. **左側元素未對齊**：HP 欄、等級標記、XP 條、衝刺欄的左側起點不統一；統一使用 `leftX = 12 * S` 為所有左側元素的起始 x。

**修正原則：** HUD 所有元素座標改為基於 `leftX`、`rightX`、`topY` 等具名常數計算，而非分散的硬編碼 offset，便於日後統一調整。

---

### 39. 進入地圖「按空白開始」自動觸發 Bug 修正

**問題：** 進入跑局時畫面顯示「按空白建開始」的介紹說明，但玩家未按任何鍵，遊戲卻自動開始。

**根因推測（`run.js` intro 流程）：**
- intro 畫面的「等待輸入」判斷可能存在以下問題之一：
  - 使用了 `pressed('interact')` 而非 `justPressed('space')`，導致上一個場景殘留的按鍵狀態觸發。
  - intro 倒數計時（若有）到期後自動跳過，但計時器值不正確。
  - `input.js` 的按鍵狀態在場景切換時未清除（`clearKeys()` 未呼叫）。

**修正方向：**
- 在 `run.js` `init()` 末尾呼叫 `input.clearAll()`（或等效函式），清除所有殘留按鍵狀態。
- intro 畫面的觸發條件改為 `input.justPressed('space') || mouse.justDown`，確保只有**本場景內的新輸入**才能觸發。
- 若有自動倒數，顯示倒數秒數（如「3… 2… 1…」）讓玩家知道。

---

### 40. 新手首局 HUD 說明暫停 + 升級卡片外框

**A. 首局 HUD 說明暫停（與項目 11 戰鬥提示互補）：**

項目 11 是「依序出現浮動提示橫幅」，本項是更主動的**暫停說明**：

- **觸發條件：** `!META.tutorialHUDDone`（不限 totalRuns，舊玩家同樣適用）。
- **觸發時機：** 首局進入跑局、遊戲正式開始後 **2 秒**（玩家有時間環顧四周）。
- **做法：** 暫停遊戲（`run.paused = true`），顯示 HUD 說明 overlay：
  - 各 HUD 元素旁出現白色指示線 + 標注文字框，說明各區域功能（HP、等級、武器、被動、任務追蹤、衝刺等）。
  - 底部顯示「按任意鍵繼續」。
  - 玩家按下後取消暫停，設定 `META.tutorialHUDDone = true; saveMeta()`。

**B. 升級卡片外框：**

- 目前升級選項卡片缺乏明確邊界，視覺上卡片間無分隔感。
- 每張卡片加入 `2 * S` px 圓角外框，顏色與卡片類型對應（武器青藍／被動綠／裝備金），hover 時外框加亮。

---

### 41. 地板掉落物顏色外框分類 + 寶箱鑰匙醒目提示

**檔案：** `src/game/pickup.js`（掉落物渲染）、`src/game/world.js`（寶箱渲染）

**A. 地板掉落物外框分類：**

- 每個地板掉落物在其 sprite 外加一個 `2px` 圓框，顏色依類型：

| 類型 | 外框顏色 | 範例 |
|------|---------|------|
| 裝備（equipment） | `#f5c518`（金） | 武器裝備、戒指 |
| 道具（item） | `#4fc3f7`（藍） | 血瓶、炸彈 |
| 能力／被動（passive） | `#66bb6a`（綠） | 被動圖書、符文 |
| 魂晶／貨幣 | 無外框（保持原樣） | 魂晶、金幣 |

- 外框以 `ctx.strokeRect` 或 `p.ring()` 繪製，寬度 `1.5px`，有輕微發光（`shadowBlur = 3`）。
- 外框在遠距離（縮放小）時可降低透明度，避免雜亂。

**B. 寶箱需鑰匙時醒目提示：**

- 玩家靠近需鑰匙的寶箱（`chest.requireKey = true`）但未持有鑰匙時：
  - 寶箱上方顯示浮動文字 `🔑 需要鑰匙`（紅色，脈動透明度效果）。
  - 若持有鑰匙，顯示 `🔑 按 E 開啟`（綠色）。
- 現有「靠近提示」邏輯（`world.js` 或 `hud.js`）需區分「有鑰匙」與「沒有鑰匙」兩種狀態，給出不同提示。

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
17. **鐵匠鋪**：底部特效項目可滾動至底；營地設施等級顯示為方格進度條；字體與圖示對齊正確。
18. **地圖外側**：城鎮邊界四周出現漸層霧化，不見硬切黑邊。
19. **天賦 UI**：進度條與金幣標價同高；分類有外框；說明 hover 顯示完整 tooltip；捲動條不遮擋內容。
20. **碰撞體積**：玩家無法穿過建築與大型裝飾物。
21. **公會及各 panel**：分頁按鈕圖層正確；行內按鈕比分頁按鈕小；XP 空時顯示空條；框格不溢出；panel 置中。
22. **衣帽間**：重新進貨按鈕在標題列右側，不重疊任何內容。
23. **選單按鍵**：按鈕邊框清晰可見，hover 時有高亮效果，與背景有明確色差。
24. **成就黃字**：統計文字在列表下方，不遮擋任何成就項目。
25. **出擊選角**：縮放視窗後初始武器說明不與角色名稱重疊。
26. **個人小屋**：無半形標點；ESC 說明獨立一行顯示。
27. **升級選擇**：hover 時所有元素層次正確、無破圖；三種類型（武器／被動／裝備）有顏色區分；元素間距寬鬆。
28. **結算頁面**：各元素對齊正確；傷害排行無占比；成就僅圖示 + hover tooltip；指標卡片排列清晰。
29. **存活任務 Bug**：2:57 時任務追蹤不顯示滿格進度，正確顯示未達成狀態。
30. **多任務追蹤**：左上 HUD 可同時顯示最多 3 條追蹤進度；公會 UI 切換追蹤邏輯正確。
31. **任務進度數值**：追蹤列顯示 `(當前/目標)` 格式；hover 顯示完整說明。
32. **成就提示**：有可領成就時，成就建築顯示黃色圓框驚嘆號；成就 panel 有已達成／未達成／全部 tab。
33. **借貸系統**：可在城鎮借款；借款金額正確從下一局結算中扣除；有欠款時無法再借。
34. **金幣文字**：全遊戲「金」「金幣」已改為金幣圖示前綴，無混用。
35. **道具提示紀錄**：撿取道具後右側欄位有持久紀錄，最新一筆有高亮，舊紀錄半透明。
36. **裝備 panel 重疊**：撿取裝備彈窗下方空白說明不再壓到其他 UI。
37. **HUD 佈局**：金幣圖示與數字水平對齊；地圖名稱獨立一行且放大；衝刺欄與上行間距正確；左側元素對齊。
38. **按空白開始 Bug**：未按空白鍵時跑局不自動啟動；倒數或操作前正確等待輸入。
39. **新手 HUD 說明**：首局進入後自動暫停並顯示各 HUD 元素標注說明；升級卡片有明顯外框。
40. **掉落物外框**：地板道具有彩色外框（裝備金／道具藍／能力綠）；寶箱需鑰匙時顯示醒目 🔑 需要鑰匙提示。

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
- 鐵匠鋪 UI 跑版修正：字體排列、營地設施等級改為方格進度條。
- 城鎮地圖外側加入漸層霧化遮罩，避免玩家看到全黑邊界。
- 教堂天賦 UI 全面修正：進度條高度、分類外框、說明 hover 展開、捲軸不重疊。
- 城鎮建築與物品補上碰撞體積，不允許玩家穿過。
- 公會介面及各 panel 修正圖層、按鈕大小一致、XP 欄空時隱藏、框格正確包覆、UI 置中。
- 衣帽間重新進貨按鈕位置重疊修正。
- 選單按鍵加入外框與背景色差，提升視覺辨識度。
- 成就頁面黃色已解鎖文字下移，不遮擋成就列表。
- 出擊選角初始武器資訊在縮放時不再重疊。
- 個人小屋半形標點修正，ESC 說明換行顯示。
- 升級選擇強化 hover 圖層修正、間距放寬、武器／被動／裝備顏色區分。
- 結算頁面優化：被動圖示間距、裝備換行、傷害排行簡化、成就圖示 hover 展開、威脅／存活呈現改善。
- 修正存活任務進度條在未達成條件時顯示的邏輯 Bug。
- 支援多任務同時追蹤，左上 HUD 顯示多條進度。
- 追蹤任務顯示具體數值進度（如 0:00/3:00、1/10）。
- 成就可領取時，成就建築上方顯示驚嘆號提示；新增已完成／未完成／全部篩選分頁。
- 新增魂晶銀行借貸系統，隨遊戲進度解鎖更高借貸額度。
- 全域「金」「金幣」文字統一改為金幣圖示。
- 撿取道具提示改為右側持久紀錄欄，不再瞬間消失。
- 撿取裝備 panel 下方空白說明重疊修正。
- 跑局 HUD 佈局修正：金幣圖示與數字對齊、地圖名獨立放大、衝刺欄與上行間距修正、左側元素對齊。
- 修正進入地圖「按空白開始」未按即自動進入的 Bug。
- 新手首局暫停顯示 HUD 介面說明；升級選項卡片加入外框。
- 地板掉落物加入彩色外框分類（裝備金／道具藍／能力綠）；寶箱需鑰匙時顯示醒目提示文字。
```
