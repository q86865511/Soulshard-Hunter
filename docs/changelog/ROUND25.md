# Round 25 — 結算教練（P1-4）

> 依 `docs/AI_PROJECT_REVIEW.md` P1-4：在結算畫面給玩家一段「由本局實際資料產生」的規則式回饋。
> 原則：不用隨機文案、無法判斷時不顯示武斷建議、不以單一死因武斷判定技術、結算不新增任何永久資源。
> 資料層在 R24 已備妥（`run.dmgTakenBySrc` / `run.deathSrc` 承傷來源標籤）。

## 1. 規則式建議產生器（`src/game/content/coach.js`）

- `coachFor(run, player) -> { lines: [{ icon, text, tone }] }`：純函式、不改任何狀態、所有欄位防禦 undefined、`tone` 為 `good|warn|info`、最多 5 行。
- 四條規則,全部資料驅動：
  1. **主力輸出**（勝敗都給,正向摘要）：`dmgBySource` 總和 >0 時取最大 key →「主力輸出:『X』佔 Y%」`good`。
  2. **死亡來源**（`result==='death'` 且 `deathSrc` 存在）：承傷標籤中文化 →「陣亡於:Z」`warn`。`contact:<id>` 以 `Enemies.get` 查敵名（查無用 id）；`proj/blast/hazard/boss/event(mine|explosion)/other` 各有固定譯名。
  3. **承傷最高來源＋建議**：`dmgTakenBySrc` 以冒號前綴聚類（contact/proj/hazard/boss/blast/event/other）。**總和 <30 視為資料不足,不顯示**；最大類別**佔比 ≥40% 才附建議**（否則只報佔比不下指導）。建議文案按類別對照 `CAT` 表。**建議獨立成「💡 建議:…」一行**——初版併在佔比同行,實測結算右欄寬度會裁掉建議尾巴（教練的核心價值）,故拆行。
  4. **融合提示**（≤1 條）：第一把「已滿級、未進化、有 `evolveInto`」的武器——**配方已發現**（`isSeen('rec', id)`）且有 `evolveReq` 才點名所需被動；否則只說「或許還有進化的可能…」（R22 裁決：未發現的配方永不預告被動/結果）。
- 一行都湊不出來時回 `{ lines: [] }` → 結算不畫教練區塊。

## 2. 結算 UI（`src/game/scenes/run/overlays.js` `drawResultSummary`）

- 右欄傷害排行下方新增「⚑ 教練筆記」小節：先算 `coachFor` 的 lines,依行數**反向預留空間**（`rankBottom`），傷害排行改最多 6 筆騰出空間；教練起點動態接在排行之後,`yLimit` 夾在「★ 本局解鎖」底條之上——兩欄不重疊、不蓋底條。
- 每行 icon＋text,以 `textWidth` 逐字裁切到欄寬（超出補「…」），tone 對色：good=`P.greenL`、warn=`P.redL`、info=`P.gray3`。
- `lines` 空時整個區塊（含標題）完全不畫。
- 勝利與死亡共用同一區塊（`drawWon`/`drawDeath` 都經 `drawResultSummary`）→ 兩者都有正向摘要；死亡另加「陣亡於」一行。
- coop guest 是另一場景（`coop.js`）無本局資料,不受影響；host 走同一路徑正常顯示。

## 驗證

- 前端：`cd test && npm run test:frontend` → **59/59 綠**（新增 phase 9 教練 7 條：主力輸出/死因中文化/承傷佔比/≥40% 才建議/資料不足不顯示/空 run 靜默/未發現配方不點名被動）。
- **實測截圖**（Playwright 1280×720、`__DBG` 驅動）：
  - 死亡路徑（`dmgBySource={魂晶彈:500,被動技能:120}`、`dmgTakenBySrc={contact:slime:80,proj:enemy:15}`、`deathSrc=contact:slime`、`result=death`）→ 三行齊：主力輸出 81%、陣亡於 近戰接觸(黏液史萊姆)、承傷最高 近戰接觸 **84%** ＋ contact 類建議；與左欄/底條無重疊。
  - 勝利路徑（`won/result=clear`）→ 主力輸出＋承傷最高兩行,無「陣亡於」,正向摘要仍在。
- **邊界自查**（純 `coachFor`）：承傷總和 20(<30) → 無承傷行；全空 run → `lines=[]`（不畫）；滿級未進化＋配方未發現 → 提示為「…或許還有進化的可能…」不含被動名。
