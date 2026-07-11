# Round 22 — 內容圖鑑・推薦目標・成就聚焦（P1-1）

> 依 `docs/AI_PROJECT_REVIEW.md` P1-1「把大量內容轉成可理解的目標」四子項全做。
> 設計原則：未發現的內容保持隱藏（剪影/？？？），已經歷過的永久登錄；不新增任何 registry 內容。

## 1. 內容圖鑑資料層（`content/codex.js`＋`META.codex`）

- `META.codex = { w:{}, a:{}, boss:{}, rec:{} }`（object-map，同 `hidden.claimed` 慣例）；`DEFAULT_META` 加預設、`loadMeta` 補 guard——舊存檔載入自動補全，實測 gold 等原欄位不丟、面板不 crash。
- 發現 hooks（全部 `if (!this.netInput)` guard，host 不代 coop guest 記錄；guest 端為快照傀儡不模擬，**coop guest 不記錄圖鑑**為已知限制）：
  - `player.addWeapon` → `codex.w`；`checkEvolve`／`fuseWeapons` 進化成功 → `codex.rec[baseId]`＋`codex.w[evoId]`。
  - `abilities.applyAbility` 首次取得 → `codex.a`。
  - `onBossDead`／`onBigBossDead`／`onReaperDead` → `codex.boss`（**擊殺後**解鎖，使用者裁決）。
- 直寫 META、不逐次 saveMeta（沿 `bondsSeen` 慣例，靠 bankRun/clearLevel/hub 既有存檔時點持久化）。
- API：`markSeen/isSeen/codexCounts/allRecipes/unlockHintFor`；`unlockHintFor` 由 `achievements.js` 的 `U(kind,id)` helper 標記（新增 `.kind`/`.id` 屬性）lazy 建反查表——鎖定內容顯示「成就『X』解鎖」。

## 2. 圖鑑石碑站點＋五分頁面板（hub）

- plaza 東北緣新戶外站點 `ruin_st_codex`（44×48 新 sprite，石碑＋懸浮魂晶頁，與公會告示板區隔），按 E 開 `codex` 面板。
- 五分頁【目標｜武器 n/43｜被動 n/54｜Boss n/14｜配方 n/10】（計數動態取自 registry）：
  - 武器/被動/Boss：格狀圖示＋底部詳情帶；未發現＝tint 剪影＋`unlockHintFor` 提示（icon 含背景色者剪影為實心色塊——「未發現即不可辨識」是刻意設計）；已發現＝名稱/desc/rarity 色框。
  - 配方：未發現＝`？？？ → ？？？`，僅當基底武器已登錄才揭示左側基底名；**需求被動與進化結果在發現前永不顯示**（保留首次融合探索感）。
- `drawSpriteUI` 加 opt-in `tint`（重用 `tintedFrame` WeakMap 快取）；未傳 tint 的既有呼叫路徑不變。
- 順手修復：`hub/panels.js` 使用 `clamp` 卻未 import 的既有 ReferenceError（長面板滾輪路徑）。

## 3. 推薦目標（`content/goals.js`）

- `goalsFor(meta)` 純函式回 ≤3 條 `{icon,title,desc,frac}`，優先序：可領公會獎 → 下一步關卡（首個未通關生態，全通則最低難度 +1）→ 最接近完成且有實質獎勵的成就 → 未開 town gate 提示。
- 主顯示＝圖鑑面板「目標」分頁（預設分頁，含進度條）；輔助顯示＝城鎮 quest tracker 底部附掛第一條。

## 4. 成就「聚焦」分頁（預設）

- 成就殿堂 filter 改五分頁：聚焦｜全部｜已達成｜未達成｜隱藏。聚焦＝未達成、非隱藏、(有進度 0<pct<1 或有實質獎勵)，pct 降冪、上限 12；空清單顯示引導文字。其餘分頁行為不變，219 項一鍵可回「全部」。

## 5. 升級卡「◆ 已知進化」標記

- 三選一卡片：武器卡的配方已發現、或被動卡是「持有中且配方已發現」武器的進化需求 → 紫色 pill「◆ 已知進化」（rarity pill 下方）；任一卡帶標記時說明列補「◆＝已知進化路線」。coop 小卡僅角落 ◆ 符號。未發現配方不做任何暗示；fuse 卡不標記。

## 相容性

存檔向後相容（loadMeta guard 實測）；co-op 協定 byte 未變（離線三自測全綠）；後端未動；不動 gen/*；registry 計數不變（REG_BASELINE 免更新）。

## 驗證

- `npm run test:frontend`：**39/39 綠**（新增 phase 5 codex＋goals 8 條、phase 6 補 coop 污染雙向回歸 2 條）。
- 瀏覽器實測（截圖驗證）：五分頁 render 無錯；fresh save 武器 0/43 全剪影＋？？？提示；標記後配方列完整揭示「魂晶彈＋力量結晶→魂晶風暴」；目標分頁 3 條卡片＋進度條；成就聚焦預設 12 條依進度排序；run 內三選一卡片 ◆ pill 與說明列正確顯示（未發現時正確不顯示）。
- 舊檔相容：手工構造無 codex 的存檔 reload → gold 保留、codex 補全、面板正常。
- `cd server && npm test`：168 綠（後端未動）。
