# R32 伺服器權威模擬：現況與遷移評估

狀態：S1 盤點完成；S2 原型／正式實作範圍待使用者裁決。原本不修改 src/、協定與存檔的限制仍有效。本文件不是已完成架構升級的宣告。

## 已查證現況

基準：R31 合併 61cc70b；R32 診斷執行版 cdb8d3a 未改 src/ 或 server/。

| 接點 | 實際責任 | 證據 |
|---|---|---|
| Realtime.onMessage | input/levelpick 交主機；snap/runstart/runend 等交訪客 | server/src/realtime.js:380 |
| relayToHost | 綁定連線 cid、排除觀戰者，轉送輸入 | server/src/realtime.js:356 |
| relayToGuests | 限目前主機發送；快照原字串轉送，沒有重算世界 | server/src/realtime.js:364 |
| CoopHost.setup | 主機瀏覽器建立其他玩家、掛 inputFor、套用升級 | src/game/net/coophost.js:28 |
| CoopHost.tick | 主機模擬後約 18Hz 發送快照 | src/game/net/coophost.js:132 |

記憶體測試直接呼叫實際 relay 方法，4/4 通過：訪客不能發布快照、主機資料原樣轉送、輸入 cid 由連線覆寫、觀戰者不能送輸入。沒有連外。這證明中繼的信任邊界；測試資料不是可玩的遊戲快照，也不宣稱任意形狀會被訪客接受。
證據：.pipeline/r32-relay-boundary-probe.mjs／.json。

## Node 重用前提的實測

1. Node v24.15.0 直接匯入 World 時，在 sprites.makeCanvas → Painter → defineAnim → art/core 的模組初始化階段發生 document is not defined。
2. 加入禁用網路的 no-op canvas／DOM 相容層後，World、Player、Enemy 可以匯入。
3. 但此時 registry 只有 Characters=12、Weapons=0、Abilities=0、Enemies=1；正式前端回歸的登錄數是 27／43／54／63。**匯入成功不等於內容完整，更不等於模擬語義一致。**

舊 MULTIPLAYER_PLAN 的 D 項已提到 DOM shim；本次確認 shim 有助於匯入，但目前 transitive art 依賴與完整內容啟動仍需處理。不能把舊計畫的可行性文字當成現成伺服器模擬器。
證據：.pipeline/r32-node-import-probe.json、r32-node-shim-probe.json。探針沒有執行正式遊戲局、沒有測量 Node 22／Oracle ARM 的容量，也沒有驗證 no-op 繪圖對所有遊戲行為無影響。

## 信任邊界與驗收

| 威脅／責任 | 目標 | 必須驗證 |
|---|---|---|
| 修改主機客戶端後偽造世界／結果 | 世界、傷害、XP、掉落與勝負由可信程序計算 | 客戶端 snap/runend/score 不得改動權威狀態 |
| 偽造 actor／跨房間輸入 | 連線身分綁定 room 與 actor | guest 無法驅動他人；spectator 輸入拒絕 |
| 重放／亂序／過量輸入 | 伺服器時鐘、序號與有界輸入佇列 | 重複、過期、未來與超頻輸入有明確策略；不能靠封包頻率增加速度 |
| 非有限值或越界控制 | 欄位驗證、向量限制、伺服器冷卻 | NaN/Infinity/超長封包不污染模擬、不拖垮房間 |
| 偽造結算或重複領取 | runId 與一次性權威結算紀錄 | 重放結算無重複獎勵；離線／舊客戶端路徑另定信任規則 |
| 雲存檔／初始能力 | 明確界定可信進度來源 | 登入成功不等於上傳的能力數值可信；此來源尚需進一步盤點 |
| 斷線、重連與主機離開 | 模擬不再依賴玩家瀏覽器生存 | 角色重新綁定不串號、不重複實體；中斷後可恢復或安全結算 |
| 多房間負載 | 房間隔離、tick 預算、回收與背壓 | 120Hz 每步預算約 8.33ms；目標平台的 p95/p99、記憶體與多房間容量需實測 |

伺服器權威能收回世界狀態控制權，但不能自動消除合法輸入形式的 bot、串通，或過量快照資訊造成的洩露；這些要另外定義威脅範圍。

## 路線選擇（尚未實作）

### 原生 Node 模擬核心
較適合長期多房間服務，但需要隔離畫面／音效／瀏覽器啟動依賴、完整內容 registry 啟動與狀態測試。no-op canvas 只能作探針，不能未經驗證就當正式相容層。遊戲與視覺共用 RNG 的影響也需釐清，不能用匯入成功代替物理／傷害／升級一致性。

### 可信 Headless Chromium 房間程序
既有 bot 已證明可以用完整前端內容與固定 dt 推進世界，可作隔離原型的候選。必須讓所有玩家（含原主機角色）都由伺服器收到的輸入驅動，而不是保留第一位玩家讀本機鍵盤的特例。仍需驗證記憶體、啟動成本、佇列、結算與多房間隔離；bot 單局效能不等於多人伺服器容量。

### 維持中繼，只加輸入檢查
可做部分強化，但無法消除對玩家主機的世界狀態信任，不能稱為完成伺服器權威模擬。

建議先用隔離原型驗證責任邊界與實際成本，再決定是否抽離原生模擬核心。正式變更 src/、現行 wire 協定、資料庫或部署前，仍需具體範圍裁決；本輪尚未獲得解除禁令的答覆。

## 原型與遷移關卡

1. 工具目錄隔離環境、禁用正式 API、使用測試身分；建立一個實際遊戲世界與至少兩個輸入來源。
2. 驗證只接受輸入，拒絕客戶端權威狀態；測 actor 綁定、序號、非有限值、過量輸入。
3. 比較內容數、固定情境的移動／碰撞／傷害／XP／升級／結算；需要可重播的測試夾具，但不把測試 RNG 控制冒充正式實驗的遊戲 RNG 可重現。
4. 測延遲、斷線／重連、房間回收與真實多人節奏；壓力測試需在目標平台另行授權執行。
5. 定義協定版本、結算責任、舊客戶端／離線進度相容與回復方案。現行存檔格式不在未授權狀態下變更。
6. 在以上證據完成前，S2 保持未完成，不以此設計稿或四個中繼測試取代可運作原型。

## 重跑唯讀探針

於 repo 根執行 node tools/authority-probes/node-import.mjs、node tools/authority-probes/node-shim-import.mjs、node tools/authority-probes/relay-boundary.mjs。結果寫入 .pipeline/r32-*-probe.json；不連外，也不啟動正式權威服務。
