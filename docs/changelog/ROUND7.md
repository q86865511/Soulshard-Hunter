# 第七輪 — 線上多人「共視窗」即時合作（Phase 2）

> 完成 `docs/MULTIPLAYER_PLAN.md` 的 **Phase 2：1~3 人即時合作同屏**，外加使用者要求的**大廳 / 邀請 / 好友**三大系統。
> 架構決策（與使用者確認）：採 **主機權威中繼（host-authoritative relay）**——其中一名玩家的瀏覽器跑現有 `run.js` 權威模擬並廣播世界快照；Node 伺服器只當**房間 / 中繼**，不跑模擬。鏡頭為**各自跟隨自己**。

## 一句話總結
登入後可加好友、看線上狀態、互相邀請、開房（4~5 碼房號）1~3 人即時合作打同一群怪、看得到彼此；單機玩法 100% 不受影響。

---

## 後端（`server/`，Node + Fastify + ws）

伺服器維持「**笨中繼**」：只管帳號、好友、房間、在線狀態、邀請、訊息轉發，**完全不模擬遊戲**（防作弊與工程量都用主機權威換取）。

- **WebSocket 閘道** `src/wsgw.js`：用 `ws` 套件掛在既有 HTTP server 的 `upgrade` 事件上（路徑 `/rt`）。瀏覽器無法在 WS 帶 Authorization header，故 **JWT 走 `?token=` 查詢字串**並在升級前驗證；含 30s 心跳 ping/pong 清掉半開連線。
- **即時閘道** `src/realtime.js`：`class Realtime`（socket 無關、可單元測試）。負責
  - **在線狀態（presence）**：`uid -> Set<conn>`，上/下線時通知該玩家的好友。
  - **房間 / 大廳**：4~5 碼房號建立 / 加入（上限 3 人）、準備、選角、房主設定生態/難度、開始；房主離線 → 整房關閉（v1 不做房主轉移）。
  - **邀請**：只能邀請**已是好友且在線**的對象；對方收到含房號的邀請。
  - **遊戲中繼**：`input`（訪客→主機，加上 sender cid）、`snap`/`runstart`/`runend`（主機→訪客，原樣轉發）。
- **好友系統** `src/social.js` + `db.js` 的 `friendships` 表（單向邊：`pending`/`accepted`；互相加好友會自動成立）。REST：`/api/friends`（列出好友/收到/送出）、`/request`、`/accept`、`/decline`、`/remove`/`cancel`。任何變動會透過 in-process hook 讓 realtime 即時推播給雙方。
- **排行榜**：`runs` 多帶 `coop_size`（合作人數），`POST /api/runs` 接受並寫入。
- **測試**：`test/social.smoke.mjs`（**30 項**，好友 REST + realtime 房間/邀請/中繼，含 fake clients）＋ 既有 `test/smoke.mjs`（18 項）全綠；`test/dev-fakedb.mjs` 無 Postgres 也能起整套（含 WS 閘道）供本地兩分頁測試。

## 前端（`src/net/`）

- **即時用戶端** `rt.js`：WebSocket 連線管理 + 事件匯流排（離線優先；登入才連、斷線自動重連 backoff）。`RT.on(type, cb)` 訂閱伺服器訊息。
- **好友/大廳 UI** `social.js`：右下角「👥 好友 / 連線」開啟。**好友頁**（加好友、收到/送出邀請、線上小綠點、邀請合作、刪除）＋**連線房間頁**（建房/輸房號加入、隊員列表、選角、房主選生態/難度+開始、複製房號、邀請線上好友、離開）。含**收到邀請的彈窗**（一鍵加入）。
- `api.js` 加好友 REST + `wsBase()`；`ui.js` 串接（登入即連線、登出即斷線）。

## 遊戲核心（**加法式改動，單機零回歸**）

把寫死的單一玩家改成玩家集合，但**單機路徑完全不變**（只有一名玩家時 `world.players` 退化為 `[world.player]`，所有輔助函式行為相同）。

- `world.js`：新增 `players[]` / `localPlayer` / `inputFor`，輔助 `nearestPlayer` / `eachPlayer` / `anyPlayerAlive` / `randomPlayer`；`spawnRing`（繞隨機玩家刷怪）、`dropLoot`（依最近玩家加成）、`resolveCombat`（敵彈可命中任一玩家、吸血歸最近射手）、`hazardStrike` / `bombBlast`（打到所有玩家）、`collect(...,collector)`（紅心治療撿取者）、`draw`（深度排序畫所有玩家）、`update`（逐玩家以各自 InputFrame 更新）。
- `player.js`：`update(dt, world, input)`——傳入 InputFrame 則用之（合作遠端玩家），否則讀鍵盤（單機 + 主機自己）；衝刺改邊緣觸發、移動向量做防作弊裁切。
- `enemy.js` / `pickup.js`：鎖定 / 接觸傷害 / 磁吸 / 撿取改為「最近的玩家」。

## 合作場景

- **主機**：沿用 `run.js`（整套關卡導演：刷怪/威脅/小王/最終王/死神/事件/平衡全部重用），新增 `CoopHost`（`net/coophost.js`）：依大廳名單造遠端 avatar、餵入網路輸入、~18Hz 廣播快照。合作時**世界不可暫停**，故升級/裝備/事件選單一律自動結算（`coopLevelUp` 全員武器升級、事件自動選、撿裝即穿）；Esc 開**非阻塞**離開選單；玩家全滅才結束；結算上傳帶 `coop_size`。
- **訪客**：`net/protocol.js` 定義精簡線格式（量化座標/255 血量/旗標位元、調色盤去重彈幕與撿取物、base64 地圖一次性），`scenes/coop.js` 用 puppet world 重建實體、**內插**敵人/隊友、**本地預測+校正**自己的 avatar，鏡頭跟自己；含觀戰、房間關閉、房主離線的處理。
- **橋接** `net/coopbridge.js`：把大廳 `start` / `runstart` 事件轉成切場景（主機進 `run`、訪客進 `coop`）。

## 驗證（本輪）

- 伺服器測試 **48 項全綠**（18 + 30）；五個新後端檔 `node --check` 通過。
- 真實 WebSocket 端到端（兩個 Node 用戶端）：建房/加入/準備/開始/輸入轉發/快照轉發、**5000 實體大快照**完整送達，7/7。
- 瀏覽器內 **encode→decode→render 往返自測**（`__DBG.coopRoundTrip`）：主機 2 名玩家、遠端 avatar 受網路輸入位移、快照含敵人/彈幕/玩家，訪客場景解碼並渲染無誤。
- **真機端到端**：瀏覽器主機跑真實模擬 → 即時 WS → Node 訪客，訪客收到 `runstart`（地圖 18,768B、48 敵種、2 玩家）＋ **569 張即時快照**（玩家/敵人/彈幕/撿取/HUD），零錯誤；訪客輸入驅動主機 avatar。
- 單機冒煙：刷新後跑數百模擬幀無錯、玩家存活、刷怪正常 → 單機零回歸。

## 多代理 QA workflow + 修正（20 代理，確認 13 項）

對抗式審查（安全 / 網路正確性 / 單機回歸 / 生命週期 / 合作整合五維，每項由獨立代理覆核），15 項原始發現確認 13 項，全部已修：

- **[高] WS 通道無限流（含 DB 放大）**：`realtime.js` 加**每連線 token-bucket**（依訊息類別:DB 類最緊、房間/聊天適中、遊戲類寬鬆），`friends:reload` 等 DB 觸發訊息限速，並加**好友圖 1.5s 快取**（變動時失效）→ 洪水攻擊無法打爆 PG 連線池。已驗證正常遊戲流量（639 快照 / 33Hz 輸入）不受影響。
- **[高] 最後一名訪客離線使該局永遠卡住**：`coophost.js` 的 `peer:left` 退場後**重新檢查 game-over**（全員陣亡才結束）。
- **[中] 單帳號連線數 / 房間數無上限**：每 uid 最多 5 連線（超過即關閉新 socket）、全域房間上限。
- **[中] 訪客瞬斷被誤判為房主離線**：`coop.js` 把 `rt:close`（自己斷線）與 `room:closed`（房主離線）分開處理，顯示不同訊息。
- **[中] 主機正常結束未離房 → 殘留房間**：`finishRun` 加 `RT.leaveRoom()` + 新增 `runScene.exit()` 保險。
- **[中] 訪客結束後未離房**：`coopScene.exit()` 永遠 `leaveRoom`（冪等）。
- **[中] 背景 401 未關閉 RT**：`ui.js` 的 `onSessionExpired` 加 `RT.close()`。
- **[低] 房號可暴力猜（join 未限速）**：併入 WS 限流的 room 類。
- **[低] `cfg.biomeId` 未驗證**：`cleanBiome()` 比照其他欄位裁切。
- **[低] 快照覆寫自己 avatar 的朝向/走路動畫**：`protocol.js` 以 `!isSelf` 守住，本地預測獨佔。
- **[低] 訪客自我預測速度凍結在開局值**：快照玩家元組多帶**即時速度**（第 7 欄），中途加減速不再漂移。
- **[低] 遠端 avatar 撿裝覆蓋主機 run 紀錄**：`equipItem` 加 `recordRun` 旗標，遠端只拿裝備不動共享紀錄。
- **[低] 合作升級只給武器**：`coopLevelUp` 改為主機拿真正的自動選擇（含被動，連帶開放全隊武器進化），其餘 avatar 升自己的武器；清掉死碼、改用 `weaponMaxLevel`。

修正後伺服器測試 **33 項全綠**（含新增的限流 / 連線上限斷言），單機與合作往返自測、真機端到端（423 快照、7 欄元組）皆通過。

## 已知限制（v1，已記錄於 plan）

- 主機權威：主機端理論上可作弊（合作分數仍因伺服器重算 score 而可信）；主機離線該局即結束（無房主轉移）。
- 局中斷線不重連（回大廳重開）；合作採「全員自動 build」（不開暫停選單，因共享世界無法為單人暫停）。
- 快照為全量廣播（小隊規模足夠）；未做興趣管理 / delta（plan 的後續優化項）。
