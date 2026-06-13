# Soulshard Hunter — 系統測試報告(Round 21 後)

> 測試日期:2026-06-13 · 對外版本 V2.0 · 分支已 merge 進 `main`
> 方法:動態實機測試(主程序 · 單一瀏覽器序列執行)+ 靜態/後端/程式碼稽核(Workflow:6×Sonnet 掃描 → 6×Opus 對抗驗證 → Opus 彙整)

## 測試總覽

Round 21 建置整體健康良好,可發布。動態瀏覽器實機測試共 5 項全數通過(scene 渲染、10 生態地圖生成、D3 三分鐘實戰、co-op 來回封包、靜默測試),0 錯誤。靜態 / 後端 / 程式碼稽核共確認 **9 項問題**,嚴重度分布為:**中 1、低 5、資訊 3**;**無高嚴重度、無致命問題**。所有確認項目皆為「設定鍵孤兒」「dev-only 漂移」「美術鍵未掛載(但有 fallback 吸收)」「過時註解」等類別,均不影響正式環境執行,亦無崩潰或 NaN 風險。

## 動態測試(瀏覽器實機)

| 測試項目 | 結果 | 關鍵指標 |
|---|---|---|
| 內容註冊表計數 (`reg`) | PASS | 27 英雄 / 43 武器 / 54 技能 / 28 道具 / 63 敵人 / 60 裝備 / 20 天賦 / 11 設施 |
| co-op 封包來回 (`coopRoundTrip`) | PASS | guestRendered + mvLiftRoundTrip 皆為 true,0 錯誤 |
| co-op 靜默測試 (`coopSilenceTest`) | PASS | leftAfterSilence、!leftWhileActive、!runEnded、hostAlive |
| 10 生態地圖生成 (`mapGenAll10Biomes`) | PASS | crypt/ember/frost/ruin/astral/verdant/desert/swamp/abyss/celestial 全數生成,0 錯誤 |
| D3 地穴 3 分鐘實戰 (`smokeD3Crypt3min`) | PASS | 等級 1→7、71 擊殺、同屏最高 56 敵、投射物正常發射,0 錯誤 |
| 渲染煙霧測試 (`renderSmoke`) | PASS | title/hub/run + 建構頁 / 大地圖 / 出擊面板 全數渲染,0 錯誤 |

## 靜態 / 後端 / 程式碼稽核

**server-tests** — 大致乾淨;測試套件聲稱 103 smoke + 65 social/realtime 全綠(本次靜態稽核未重跑,info)。發現 1 項 dev-only 漂移:
- 🟡 低 — `fakepool.mjs` feedback INSERT 處理缺少 `image` 欄位(僅解構 4 參,server.js 送 5 參);因 matcher 以 SQL 前綴比對,額外參數被靜默忽略,圖片遭丟棄但**不崩潰**。僅影響 dev launcher,零正式環境影響。`server/test/fakepool.mjs:97`

**registry-integrity** — 乾淨,無功能性問題:
- ℹ️ 資訊 — `gen_heroes2.js` 標頭註解過時,聲稱 `survive_600` / `kills_5000` 解鎖條件未被處理;實際 `characters.js:199-200` 已支援,兩名隱藏英雄會正常自動解鎖。`src/game/content/gen/gen_heroes2.js:16`

**sprite-refs** — 無破損靜態引用;1 項低嚴重度美術 fallback + 1 項死美術:
- 🟡 低 — `item_heart` 圖示從未定義;co-op 訪客升級面板的「回復生命」fallback 選項經 `iconOr` 解析為 `weapon_w_soulbolt`,顯示靈彈圖示而非愛心。純外觀、罕見邊界、不崩潰。`src/game/scenes/run.js:114`
- ℹ️ 資訊 — R19 舊 `ruin_fc_*` 立面六個 sprite 已定義但無人引用(被 R20 `ruin_fc2_*` 取代),屬死美術,非破損引用。`src/art/town_ruin_facades.js`

**balance-stats** — 全部 BALANCE 鍵皆可解析、無 NaN 風險、無非法 stat 寫入;發現 3 個孤兒設定鍵:
- 🟠 中 — `BALANCE.BOSSMOVE_PILLAR_HP`(=60)為孤兒;`boss_pillar` 的 hp 在 `boss_moves.js:243` 硬編碼為字面量 60,該鍵從未被讀取。調整此設定無任何遊戲效果(單一真實來源原則被破壞)。`src/game/content/boss_moves.js:243`
- 🟡 低 — `BALANCE.BIGBOSS_TIME`(=20×60)為孤兒;最終 boss 生成實際以 `LEVEL_TIME` 別名閘控(`run.js:576`),該鍵從未被引用。`src/game/balance.js:13`
- 🟡 低 — `BALANCE.MOB_SHARD_BOSS`(=0.0)為孤兒;boss 魂晶掉落另走 `e.shard`,該鍵從未被讀取。`src/game/balance.js:78`

**bossmoves-events** — 乾淨。全部 13 個 WIRE boss id 解析至已註冊敵人、4 個 BOSS_MOVES 定義完整、`boss_pillar` 與 4 個事件怪皆 tier 9 / weight 0 正確排除於生成池、7 個 `EVENT_WEIGHTS` 鍵全數對應到 `triggerEvent` 中的實作 handler。無確認問題。

**coop-protocol** — 乾淨(R21 mvLift 正確)。敵人 tuple 9 欄、玩家 tuple 7 欄、投射物 6 欄、拾取物 4 欄、光束 5 欄、PF 4 bit、EF 8 bit 全數對稱來回;`mvLift` 經 `enemy.draw()` 的 `hopY` 正確消費。發現 1 項潛在但安全的依賴:
- 🟡 低 — `mvLift` 未在訪客 `makeEnemy` / `Enemy` 建構子初始化;靠 `enemy.js:273` 的 `(this.mvLift || 0)` fallback 防護。實務上 `applySnapshot` 在同一迴圈先建立再寫入 `mvLift`,undefined 視窗為零幀,非實際 bug。`src/game/scenes/coop.js:97-99`

## 確認問題清單

| 嚴重度 | 維度 | 問題 | 檔案 | 建議 |
|---|---|---|---|---|
| 🟠 中 | balance-stats | `BOSSMOVE_PILLAR_HP` 孤兒,pillar hp 硬編碼 60 | `boss_moves.js:243` | 將 `hp:60` 改讀 `BALANCE.BOSSMOVE_PILLAR_HP`,恢復單一真實來源 |
| 🟡 低 | server-tests | `fakepool.mjs` feedback INSERT 缺 `image` 欄位(dev-only,圖片靜默丟棄) | `fakepool.mjs:97` | 比照 smoke.mjs:73-74,81,於解構、push 物件、admin-list map 補上 `image` |
| 🟡 低 | sprite-refs | `item_heart` 未定義,co-op 訪客升級愛心顯示靈彈圖示 | `run.js:114` | icon 改為既有的 `heart`,或新增 `defineIcon('item_heart', ...)` |
| 🟡 低 | balance-stats | `BIGBOSS_TIME` 孤兒(改用 `LEVEL_TIME` 別名) | `balance.js:13` | 移除該死鍵,或讓 `run.js:576` 改讀此鍵 |
| 🟡 低 | balance-stats | `MOB_SHARD_BOSS` 孤兒(boss 掉落另走 `e.shard`) | `balance.js:78` | 移除該死鍵以免誤導 |
| 🟡 低 | coop-protocol | 訪客 `makeEnemy` 未初始化 `mvLift`(靠 `||0` fallback) | `coop.js:97-99` | 於 `makeEnemy` 加 `e.mvLift = 0` 消除潛在依賴 |
| ℹ️ 資訊 | registry-integrity | `gen_heroes2.js` 標頭註解過時(條件其實已處理) | `gen_heroes2.js:16` | 更新或刪除過時註解 |
| ℹ️ 資訊 | sprite-refs | `ruin_fc_*` 舊立面為死美術(被 `ruin_fc2_*` 取代) | `town_ruin_facades.js` | 視情況清除以減少體積 |

> 注:server 測試套件 103+65 全綠、5 核心檔通過 `node --check` 為 INFO 級別聲明,本次靜態稽核未獨立重跑(結構事實已抽查無異議)。

## 結論與建議

**可發布(shippable)。** Round 21 無高嚴重度與致命問題;動態實機 5 項全通過、0 錯誤,co-op 協定 R21 `mvLift` 全欄位對稱來回正確,balance/sprite/事件/boss 招式所有引用皆可解析。唯一中嚴重度項是 `BOSSMOVE_PILLAR_HP` 孤兒鍵——目前字面量與設定值同為 60,**無實際遊戲差異**,但破壞了「BALANCE 為唯一真實來源」的維護原則,建議在下個維護批次優先修正。

下一步建議(皆非阻擋發布):
1. 修 `boss_moves.js:243` 讀回 `BALANCE.BOSSMOVE_PILLAR_HP`(恢復可調性)。
2. 順手清理 3 個孤兒設定鍵與過時註解,並補 `item_heart` / `mvLift` 兩個低風險防護(co-op 體驗一致性)。
3. dev-only 的 `fakepool.mjs` image 漂移可隨手補齊,正式環境不受影響。
