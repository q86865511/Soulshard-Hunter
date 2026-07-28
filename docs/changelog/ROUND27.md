# Round 27 — 外部審查修正批次:排行榜誠信 · 雲端存檔資料遺失 · 隱私與相依衛生

> 本輪不含新玩法內容,全部來自一次外部程式碼審查(2026-07-28)的高/中級問題與順手項。
> 目標是把「宣稱」與「實作」對齊:過度承諾的措辭收斂、擋不住的東西真的擋住、
> 唯一會造成玩家資料遺失的路徑補上測試。

## 1. 排行榜誠信閘門(高)

問題:`state.js` 的上傳閘門只看輔助模式,完全不看作弊旗標——用 Konami 開 F2 開發者面板
(無敵 / 加速×3 / 強制通關 / 解鎖全部)跑完的對局照常上傳,伺服器重算只擋「分數公式竄改」,
擋不住「成分偽造」。

- `src/game/scenes/run/overlays.js` `doCheat()`:面板任一功能一經使用即 `this.run.cheated = true`
  (整場黏著,不可撤銷);面板底部加一行「※ 使用後本局不計排行榜」。
- `src/game/state.js` 新增 `runCheated(run)`:`run.cheated` 為真,**或**結算當下 `Cheats.godmode`/
  `Cheats.fast` 仍開著(主控台 `window.__CHEATS` 路徑)→ 視為作弊局。
- `bankRun` 的上傳條件併入同一個 single gate:`難度 ≥1 && !run.assist && !runCheated(run)`。
  金幣、成就、公會聲望照常結算(與輔助模式的處理一致),只是不上傳任何排行榜,
  也不留 `lastGuestRun`(訪客具名上傳同樣擋掉)。

## 2. 訪客端點防濫用(高)

`POST /api/runs/guest` 免登入即可進主榜,而合理性門檻寬到可以直接偽造登頂成績。

- `server/src/server.js` `ANTICHEAT.MAX_KPS` 30 → **12**,並把推導寫進註解:畫面同時存在的敵人
  硬上限 260,持續 12 kills/s 等於整個上限每 ~22 秒清空一次、一局 20 分鐘 ~14.4k 擊殺,
  已遠高於真實通關局。**這不是遙測 P99 推導的數字**(目前沒有該資料集),仍偏寬鬆;
  待 P1-3 的 `run_ended` 累積足夠樣本後應再收一次。
- 訪客上傳頻率限制 10 次/分鐘 → **5 次/10 分鐘**(每 IP;`trustProxy` 已開,Caddy 後面拿得到真實 IP)。
  一局至少 20 分鐘,誠實玩家不可能撞到。

## 3. 多存檔槽 × 單一雲端 blob 的資料遺失(中)

`saveSeq` 是**每個存檔槽各自遞增**的,但雲端一個帳號只有一列 blob,而 `ON CONFLICT … WHERE`
拿 saveSeq 直接比大小:slot0 練到 seq=500 後切到 slot1(seq=30),推送被守衛擋下回
`{ok:true, applied:false}`,而前端全域搜尋 `applied` 是零引用——玩家看到「☁ 已登入」,
該槽卻永遠不同步,換裝置登入拿到的是別槽的資料。

- **伺服器**(`server/src/server.js` PUT `/api/save`):`WHERE` 條件納入 slot 語意——
  **不同槽 = 不同世系,一律套用**(切槽等於改由該槽接管雲端列);**同槽**才做 saveSeq 比較
  (`<=`,允許等值重推)。取捨:選了不改 schema、不做 per-slot 列的低風險方案,
  代價是雲端仍然一次只保存一個槽;拉取前的 `.precloud.bak` 備份機制不變。
- **前端**:`src/net/api.js` 的 `putSave` 串上 `noteApplied()`,`applied === false` 時呼叫新的
  `Net.onSaveConflict` hook(與既有的 `Net.onSessionExpired` 同一種寫法);`src/net/ui.js`
  `mountNetBar()` 把它接成 toast:「雲端存檔未套用:此存檔槽在雲端有更新的版本,
  本次進度僅存在本機」。`state.js` 的 `syncFromCloud` 也把 `applied` 一併回傳給呼叫端。

## 4. 雲端存檔守衛的測試覆蓋(中)

原本兩個 fakepool 對 `INSERT INTO saves` 一律 `saves.set()` + `rowCount:1`,完全不模擬
`ON CONFLICT … WHERE`,所以唯一會造成資料遺失的路徑在 179 項全綠的測試中一條都沒測到。

- `server/test/fakepool.mjs` 與 `server/test/smoke.mjs` 的內嵌 fakepool **都**補上守衛語意
  (兩份必須同步,見 `CLAUDE.md` 的 TWO fakepools 註記)。
- `smoke.mjs` 新增 6 條斷言:slot0 seq10 套用 → 同槽 seq4 回 `applied:false` 且雲端 blob 未被覆寫
  → 換槽即使 saveSeq 較小仍套用 → 雲端列跟著切到新槽 → 同槽等值 saveSeq 仍套用。
- 後端測試數:smoke 114 → **120**,合計 179 → **185**。

## 5. co-op guest 輸入的有限性檢查(中)

`player.js` `clampAxis` 只用 `+x || 0` 處理 NaN,不處理 Infinity;JSON 數值溢位
(`{"t":"input","mv":[1e999,0]}`)即為 Infinity → `Math.hypot(Inf,0)=Inf` → `x/m = NaN` →
host 端該 avatar 座標永久 NaN(脫離 broadphase 網格、快照序列化成 null 傳給所有 guest)。

- 改用 `Number.isFinite` 逐軸清洗,非有限數一律歸 0,再做原本的 magnitude clamp。
- 這是 host 端唯一吃 `netInput.move` 的地方(`player.js:184`),補在這裡即覆蓋全部路徑。

## 6. 零外部請求:字型自架(中)

`index.html` 引入 Google Fonts CDN(preconnect ×2 + stylesheet),與「零依賴 / 不收集 IP 與
裝置指紋」的敘述衝突——自家遙測確實不收,但每次開頁都把玩家 IP 與 UA 送給第三方。

- 字型改為自架:`assets/font/PressStart2P-latin.woff2`(12.5 KB,latin 子集——`PIXEL_FONT`
  依設計只用於 ASCII 數值,見 `engine/renderer.js`),`index.html` 內以 `@font-face` +
  `font-display: swap` 宣告,三行 CDN `<link>` 全部移除。
- 授權:SIL Open Font License 1.1,全文置於 `assets/font/OFL.txt`,README 授權節已註明。
- `sw.js` 對同源字型本來就是 cache-first,離線可用;`tools/serve.mjs` 補 `.woff2` MIME。
- 遊戲執行期現在**對第三方主機零請求**。

## 7. 相依衛生(中)

`server/` 的 2 條 high 級告警(fast-uri `GHSA-v2hh-gcrm-f6hx` / `GHSA-4c8g-83qw-93j6`、
find-my-way `GHSA-c96f-x56v-gq3h`,皆由 fastify 5.9.0 傳遞)以 `npm audit fix` 清除:
只動 `package-lock.json`(6 insertions / 6 deletions),`package.json` 不變,
`npm audit` 現為 `found 0 vulnerabilities`。

## 8. 開發伺服器(低)

`tools/serve.mjs` 兩處:

- 路徑前綴比對補 `path.sep`(`fp !== root && !fp.startsWith(root + path.sep)` → 403),
  避免兄弟目錄(`…/Soulshard-Hunter-bak`)被前綴比對誤判為合法。
  註:實測 Node 的 `path.normalize` 會把絕對路徑開頭的 `..` 夾除,審查報告描述的
  具體 payload 在 Windows 上並未重現;此修正屬正確性補強而非已證實漏洞的修補。
- `listen(port)` → `listen(port, '127.0.0.1')`:此伺服器有會寫檔的 `POST /__shot`
  且回 `Access-Control-Allow-Origin: *`,不該對整個區網開放。

## 9. 文件同步

`README.md`:徽章 Node ≥18 → ≥20、Fastify 4.x → 5.x;進度 Round 21 → Round 26;
前端 smoke 52 → 59 條;後端測試 179 → 185;頂部補「▶ 立即遊玩」正式站連結,
並明說 `deploy.yml` 的 `needs: [test, frontend]` 是真正的部署雙關卡;
「杜絕前端竄改」改為「排行榜分數由伺服器重算並做合理性檢查(不採信客戶端分數)」;
已知限制補上「雲端存檔為一個帳號一份 blob」的取捨說明。
`CLAUDE.md` 同步外部資產描述、smoke 測試數與 fakepool 守衛註記。

## 驗證

- `cd server && npm ci && npm run check && npm test` → smoke **120 passed, 0 failed**、
  social **65 passed, 0 failed**;`npm audit` → **found 0 vulnerabilities**。
- `cd test && npm ci && npm run test:frontend` → **59/59 assertions passed**(含自架字型後的 boot)。
- `tools/serve.mjs` 實跑:`/assets/font/PressStart2P-latin.woff2` → 200 `font/woff2` 12512 bytes;
  raw TCP 送 `/../Soulshard-Hunter-bak/secret.txt` → 未取得兄弟目錄檔案。

## 未做(留待後續)

- `.github/workflows/server-test.yml` 尚未加 `npm audit --audit-level=high` 關卡
  (本輪只清掉現有告警,沒有把相依掃描做成部署關卡)。
- 決定論回放驗證(seed + 輸入序列)——真正能擋 host 端偽造的做法,本輪未觸碰。
- `realtime.js` 的 raw 轉發仍不做欄位檢查;本輪只在 host 的模擬入口 `clampAxis` 收斂。
