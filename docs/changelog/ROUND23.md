# Round 23 — 無障礙設定・輔助模式・預警強化（P1-2）

> 依 `docs/AI_PROJECT_REVIEW.md` P1-2「無障礙與難度個人化」三子塊全做。
> 原則：資訊不因關特效而消失（低血改靜態框、預警不靠粒子）；輔助不污染競賽（單一上傳 gate）。

## 1. 無障礙設定（`ui/settings.js`＋`META.settings`）

- **畫面震動 bool → 0-100% 滑桿**：renderer 新增獨立 `shakeUserScale`（`setShakeUserScale`），與 run 場景每幀動態設定的近死增幅 `shakeScale` 正交相乘——兩者互不覆寫。舊存檔 bool `shake` 於 loadMeta 自動遷移（true→1、false→0）。
- **螢幕閃光開關**（`flash`，預設開）：關閉時低血警示由脈動全螢幕紅閃改為**靜態細紅框**——資訊保留、不閃爍。
- **粒子密度滑桿**（`particles` 0-100%）：`particles.js` 模組級 density，集中稀釋 `burst`/`ring`/`trail` 三個發射源；`text` 浮字不受影響。
- **傷害數字開關**（`dmgNums`，預設開）：只攔敵人受擊與玩家受傷浮字，閃避/拾取/升級字照常。
- 設定面板改游標式排版＋分區標題，全部選項即時生效、存檔、重載保持。

## 2. 輔助模式（`META.assist`＝敵人生命/傷害/速度 50-100%）

- 倍率於**開局鎖定**到 run（`run.assistHpMul/DmgMul/SpeedMul`，改設定下一局生效）；HP/速度乘在 `enemy.js` 建構子一處，傷害乘在 `player.takeDamage`（涵蓋接觸/彈道/boss 招/陷阱全部來源）。
- **coop 強制關閉**（host 的輔助不會影響共享世界）；任一倍率 <1 時 `run.assist=true`，開局 banner 追加「・輔助」。
- **排行榜公平**：上傳 gate 統一為 `difficulty>=1 && !run.assist`——輔助局不上傳任何模式的榜（normal/endless/daily/weekly），**金幣與成就照常結算**（在 gate 之前、互相獨立）。設定面板明示「低於 100% 時該局不計入排行榜・下一局生效・多人連線不適用」。

## 3. 危險預警強化（形狀/輪廓/動畫，不只靠顏色）

- **beam 預警**（`world.addBeam` 繪製處，一處改、boss 四招全受益）：沿線流動斜紋（方向＋動畫）＋起點圓點/終點三角箭頭（形狀）。
- **periodic 陷阱**：觸發前 ~0.5s 收縮警戒圈（1.6r→1.0r）＋中心「!」記號。
- **炸彈雨落點**：十字準星＋隨倒數收縮的白色外框——粒子密度 0 時仍完整可辨（不依賴 ember 粒子）。
- 魂牢縮圈已有脈動＋文字，未動；配色未變（本輪加形狀/動畫，不改色彩語言）。

## 相容性

存檔向後相容（bool shake 遷移＋新欄位 backfill，smoke 實測）；co-op 協定 byte 未變、coop 下輔助恆關（離線自測全綠）；後端未動（gate 在 client 結算層）；不動 gen/*；registry 計數不變。

## 驗證

- `npm run test:frontend`：**46/46 綠**（新增 phase 7：設定預設/assist 開局鎖定與旗標/舊檔遷移 backfill 共 7 條）。
- 實測：輔助 0.5/0.5/0.8 開局 → slime maxHp 35→17、speed 30→24、`run.assist=true`；coopRoundTrip 中 host 倍率被強制 1；dmgNums 開關浮字 1↔0；設定面板 14 rows 截圖驗版面；beam 箭頭/準星/警戒圈截圖驗可辨識。
- `cd server && npm test`：168 綠（後端未動）。
