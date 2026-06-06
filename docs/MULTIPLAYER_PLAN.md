# 計畫:Soulshard Hunter → 線上多人(Oracle 雲端 / 共享排行榜 / 1~3 人即時合作)

> 狀態:**Phase 1 + Phase 2 已實作**(見 `docs/changelog/ROUND6.md`、`ROUND7.md`)。
> - **Phase 1(雲端地基)**:帳號 / 雲端存檔 / 共享排行榜 — 完成(Round 6)。
> - **Phase 2(即時合作同屏)**:1~3 人即時合作 + **好友 / 邀請 / 大廳** — 完成(Round 7)。
>   架構實作上採 **主機權威中繼**(host-authoritative relay,非本文最初規劃的伺服器權威):
>   其中一名玩家的瀏覽器跑既有 `run.js` 權威模擬並廣播世界快照,Node 伺服器只當房間/中繼。
>   此選擇在使用者確認下,以「重用 100% 既有遊戲邏輯、對單機零回歸、本回合可完整交付」換取
>   「主機端理論可作弊、無房主轉移」的取捨;後續若需更強防作弊可再把模擬搬上伺服器(本文 D 工作項)。
> 下方原始設計/評估內容保留作為參考。

## Context(背景與目標)

目前《Soulshard Hunter》是**純前端單機**遊戲:vanilla HTML5 Canvas + ES Modules、無 build step、無外部素材,存檔放瀏覽器 `localStorage`(key `soulshard.save.v1`)。

目標是把它改成**線上遊玩**:
- 部署到 **Oracle 雲端(OCI)** 伺服器
- **登入帳號 + 雲端存檔**(進度跨裝置)
- **共享排行榜**
- **1~3 人即時合作同屏**(真正一起打同一群怪、看得到彼此)
- 玩家端維持「用網頁連線」

**已確認的決策:**
1. 遊玩模式 = **即時合作同屏**(需要完整 netcode)
2. 開發範圍 = **先地基,後合作**(分兩階段)
3. 資料庫 = **PostgreSQL**
4. 登入 = **自建帳號密碼**

**可行性結論:可行。** 最大優勢:遊戲本身就是 JavaScript、120Hz 固定步長模擬、狀態集中在 `scene→world`、模擬與渲染乾淨分離。因此 Oracle 伺服器上用 **Node.js 能重用同一套遊戲程式碼**,在伺服器端跑「權威模擬(server-authoritative)」——這是連線遊戲最省事、最防作弊的架構,不必把遊戲邏輯用別的語言重寫。

**已驗證的關鍵技術風險(去風險完成):** 模擬模組(`world.js`/`enemy.js`/`player.js`/`projectile.js`)在 Node 載入時**不會崩潰**——所有 DOM/Audio 存取都在函式內(`initRenderer`/`initInput`/`ensure`/`makeCanvas`),非模組頂層,audio 還有 try/catch 自動降級。只要伺服器不 import 載入即 `defineSprite` 的 `art/*` 模組、且只跑 `update()` 不跑 `render()`,加一層極薄的 Node DOM shim 即可重用既有模擬碼。

---

## 建議架構

**Server-authoritative(伺服器權威)+ 用戶端預測/內插。** 伺服器是遊戲世界的唯一真相來源;玩家端只送「輸入」、收「狀態快照」並負責畫面。

```
玩家瀏覽器(沿用現有前端)                Oracle OCI VM (Ubuntu)
┌────────────────────────┐            ┌─────────────────────────────┐
│ 既有 Canvas 前端        │  HTTPS     │ Caddy(反向代理 + 自動 TLS)  │
│  + 登入/大廳 scene      │ ─REST───▶  │   ├─ Node API(Fastify)      │
│  + net 模組(fetch+WS)  │            │   │   登入/存檔/排行榜        │
│                        │  WSS       │   └─ Node 即時伺服器(ws)    │
│  Phase2: 預測+內插      │ ◀═快照═══▶ │       房間=大廳, 權威模擬     │
└────────────────────────┘            │       (重用 game/ 模擬碼)     │
                                       │ PostgreSQL(帳號/存檔/榜)      │
                                       └─────────────────────────────┘
```

為何 server-authoritative 勝過 deterministic lockstep:遊戲有 **72 處 `Math.random()`**,lockstep 需要全部改成種子 RNG 且任一處浮點不一致就 desync;server-authoritative 不要求決定性(伺服器算、客戶端顯示),可沿用現有 RNG,且天然防作弊、支援中途觀戰/重連。

---

## 需要的工具

**雲端/基礎設施**
- **Oracle Cloud Infrastructure (OCI) Always Free**:Compute VM(Ampere A1 Arm,最多 4 OCPU / 24GB RAM 免費,1~3 人綽綽有餘)。OS 用 **Ubuntu 22.04/24.04 LTS**。
- **網域名稱**(選用但建議):給 `wss://` 的 TLS 憑證用;沒有的話可用 **DuckDNS / nip.io** + 公網 IP。
- ⚠️ **OCI 兩層防火牆**(常見坑):除了 OCI 主控台的 **Security List/NSG** 要開 port,VM 內的 **iptables/ufw** 預設極嚴也要開(OCI Ubuntu image 內建 iptables 規則會擋掉非 22 port)。

**後端執行環境**
- **Node.js LTS(v20/v22)** — 重用遊戲 JS 碼的關鍵。
- **pm2** 或 **systemd** — 常駐、開機自啟、崩潰重啟。
- **Caddy**(建議,設定一行自動 HTTPS)或 Nginx + Certbot — 反向代理 + TLS(瀏覽器在 https 頁面只能連 `wss://`,必須有 TLS)。

**後端框架/函式庫**
- REST API:**Fastify**(建議,快、現代)或 Express。
- 即時連線(Phase 2):**ws**(輕量、二進位友善,建議)或 Socket.IO(內建房間/重連,「房間=大廳」很方便,但較重)。1~3 人選 `ws` + 精簡協定即可。
- 資料庫驅動:**pg**(node-postgres)。
- 密碼雜湊:**bcryptjs**(純 JS、免原生編譯,跨 Windows 開發 + Arm OCI 最省事)或 bcrypt/argon2。
- 登入憑證:**jsonwebtoken (JWT)** 或 session cookie。
- API 輸入驗證:**zod**(防作弊第一道防線)。
- DB schema:啟動時跑 `CREATE TABLE IF NOT EXISTS`(最省事),或用 **node-pg-migrate**(選用)。

**資料庫**
- **PostgreSQL 16**(VM 上 apt 安裝,或用 Docker 容器)。

**前端(沿用現有網頁,維持 no-build)**
- 不需要 bundler;維持 vanilla ES modules。
- 新增:登入/註冊 scene、大廳 scene(Phase 2)、一個薄薄的 `src/net/` 模組(fetch + WebSocket client)。
- 本地開發續用既有 `node tools/serve.mjs`(5173)。

**開發工具(選用)**
- **Docker / docker-compose** — 把 Node + Postgres 容器化,本地與雲端環境一致。
- Git(已有)。

---

## 資料庫 Schema(PostgreSQL)

最省事的做法:**存檔直接存整包 `META` 為 JSONB**(完全對應現有結構,免逐欄拆解);排行榜另開正規化表。

```sql
-- 帳號
users(
  id            bigserial PRIMARY KEY,
  username      text UNIQUE NOT NULL,
  email         text UNIQUE,                 -- 選填
  password_hash text NOT NULL,
  created_at    timestamptz DEFAULT now(),
  last_login    timestamptz
)

-- 雲端存檔:整包 META(對應 state.js 的 DEFAULT_META)
saves(
  user_id      bigint PRIMARY KEY REFERENCES users(id),
  meta         jsonb NOT NULL,               -- 整個 META blob
  save_version int  NOT NULL,                -- 對應 SAVE_VERSION
  updated_at   timestamptz DEFAULT now()
)

-- 排行榜:每次完局一筆(對應 run 結果欄位)
runs(
  id          bigserial PRIMARY KEY,
  user_id     bigint REFERENCES users(id),
  score       int  NOT NULL,                 -- run.js 既有公式:kills*12 + stage*400 + time + diff*600 + (reaper?5000)
  stage       int, kills int, character text, biome text,
  difficulty  int, time_s int,
  cleared     bool, reaper bool,
  coop_size   int DEFAULT 1,                 -- Phase 2:合作人數
  created_at  timestamptz DEFAULT now()
)
CREATE INDEX ON runs (score DESC);
CREATE INDEX ON runs (biome, difficulty, score DESC);
```

排行榜查詢:`SELECT ... ORDER BY score DESC LIMIT N`;可加 biome/difficulty/character 篩選;週榜用 `created_at >= now()-interval '7 days'`。大廳(房間)是**伺服器記憶體內**狀態,不入庫。

---

## Phase 1:雲端地基(帳號 + 存檔 + 排行榜,**不含即時合作**)

目標:玩家登入 → 進度存雲端(跨裝置)→ 完局上傳分數 → 看共享排行榜。**單機玩法維持本地執行**,零 netcode,最快可上線。

### 後端(新增獨立資料夾,例如 `server/`)
1. 建 Fastify app + pg 連線池;啟動時建表(idempotent)。
2. **Auth**:`POST /api/register`、`POST /api/login`(bcryptjs 比對 → 發 JWT)、JWT 驗證 middleware。
3. **雲端存檔**:`GET /api/save`(回該帳號 `META`)、`PUT /api/save`(整包覆寫,做 `save_version` 檢查 + 基本欄位驗證)。
4. **排行榜**:`POST /api/runs`(完局上傳,zod 驗證 + 合理性檢查:伺服器用 components 重算 score、忽略客戶端宣稱值、限制各欄位上限)、`GET /api/leaderboard?biome=&diff=&period=`。
5. 加 CORS(本地 5173)、rate-limit、zod 輸入驗證。

### 前端改動(以「最小侵入」接上現有存檔層)
現有存檔層集中在 `src/game/state.js` — 這是最佳接點:
- `loadMeta()`(state.js:40):登入後改為先 `GET /api/save`,把回傳 META 灌入記憶體;離線/未登入則 fallback 現有 `localStorage`。
- `saveMeta()`(state.js:69):本地寫入後,**debounce** 呼叫 `PUT /api/save` 同步上雲(沿用既有所有呼叫點,不必改散落各處的 `saveMeta()`)。
- `bankRun()`(state.js:143):完局時除了現有本地 stats,額外 `POST /api/runs` 上傳分數(分數欄位在 run.js 的 `finishRun()` 已算好,約 score 公式處)。
- 登入流程接點:boot 在 `src/main.js:53` `setScene(refs.title)`。新增 `src/game/scenes/login.js`,在 title 前(或以 overlay)要求登入;成功後再 `loadMeta()`。可選「訪客=純本地」維持現狀。
- 新增薄 `src/net/api.js`(fetch 包裝 + 存 JWT)。新增 `src/game/scenes/leaderboard.js` 或在 hub 加排行榜面板(`src/game/scenes/hub.js` 的 station 模式)。

**Phase 1 不需要動模擬碼**,風險低,可獨立驗收。

---

## Phase 2:即時合作同屏(1~3 人,server-authoritative)

這是工作量主體。分以下工作項(由低風險到高風險):

### A. 單人 → 多人重構(`world.player` → `world.players[]`)
全程式有多處寫死「只有一個玩家」,需改為陣列 + 「對最近玩家」邏輯:
- world.js:42 `this.player` → `this.players[]`;`spawnRing`(world.js:131)、`dropLoot`(world.js:148)、`gainXp`(world.js:234)以「最近/全體玩家」計算。
- 怪物 AI 鎖定:enemy.js:113 用 `world.player` → 改為挑最近玩家。
- 撿取:pickup.js:44 偵測單一玩家 → 改為偵測全體。
- 進度設計決策:**每人各自武器/等級**(建議,各撿各的)還是共享;升級選單需 per-player。

### B. 輸入解耦(讓伺服器能餵遠端玩家輸入)
- 現在 player.js:134 直接呼叫 `moveAxis()`/`pressed()` 讀全域鍵盤。改成 `player.update(dt, world, inputFrame)`,把輸入封裝成每幀 `InputFrame { move:{x,y}, dash, interact, ... }` 從外層傳入。
- 玩家端:每幀把本地輸入打包送伺服器(僅需移動向量 + 幾個動作鍵,頻寬極小)。

### C. 序列化/快照層(`game/net/snapshot.js`)
實體含**函式參考與 `Set`,不能直接 JSON 化**(已查證):`enemy.def`/`pickup.def` 是 registry 物件 → 用 `id` 字串代替;`projectile.hitSet`(Set)→ 轉陣列;`player.hooks`/`projectile.onHit`(函式)→ 不傳,客戶端用 `id` 自行重建表現。
- 寫 `serializeWorld(world)`(輸出純資料快照)與客戶端 `applySnapshot(snap)`(用 id 還原顯示)。
- 全量快照約 ~100KB,**不可每幀全傳**:伺服器以 **15~20Hz** 廣播,並用 **delta(只送變動實體)+ 興趣管理**(離玩家遠的省略)。

### D. 伺服器端 headless 模擬(重用 `game/` 模擬碼)
- 已驗證可行:在伺服器入口先掛**極薄 DOM shim**(`globalThis.window = { addEventListener(){}, ... }`、`globalThis.document = { createElement: () => fakeCanvas }`、`requestAnimationFrame` no-op),即可 `import` `world.js` 等而不崩潰。
- 伺服器**只跑 `update(dt)`,不跑 `render()/draw()`**;`Sfx.*` 呼叫已被 try/catch 包住會自動 no-op。
- **不要** import 載入即 `defineSprite` 的 `art/*` 模組(只 import `sprites.js` 的查詢函式即可)。`getSprite` 查不到回 placeholder,不影響伺服器(伺服器不畫)。
- 模擬迴圈用既有定步長 `loop.js` 概念,以固定 dt 推進。

### E. 即時連線傳輸 + 大廳
- `ws` server:`房間 = 大廳`,以 4~6 碼房號建立/加入;1~3 人 ready 後開局,伺服器 `newRun()` 並開始廣播快照。
- 訊息:client→server `input`、`join`、`ready`;server→client `snapshot`(delta)、`spawn/despawn`、`runEnd`。
- 玩家端新增 `src/game/scenes/lobby.js`(建/加房、看成員、ready)。

### F. 玩家端預測 + 內插(手感)
- **自己**的移動做 client-side prediction(本地先動,收到伺服器校正再 reconcile)。
- **其他玩家/怪物/子彈**做 entity interpolation(在兩個快照間插值),掩蓋 15~20Hz 廣播與延遲。
- 鏡頭:合作同屏需決定「共享鏡頭(框住所有玩家)」或「各自跟隨」;run.js 的 `camera.target` 目前跟單一玩家。

### G. 完局結算
- 伺服器是真相 → 合作完局由**伺服器** `POST /api/runs`(`coop_size`>1),分數可信、天然防作弊。

---

## OCI 部署步驟(摘要)

1. OCI 開 **Always Free Ampere A1 VM**(Ubuntu),設定 SSH 金鑰。
2. **防火牆兩處都要開**:Security List/NSG 開 443(及測試用埠)+ VM 內 `ufw allow`/調整 iptables。
3. 裝 Node LTS、PostgreSQL 16(或用 docker-compose 一次拉起 node+postgres)。
4. 部署 `server/`;`pm2 start`(或 systemd unit)常駐 + 開機自啟。
5. 設網域(或 DuckDNS)指向公網 IP;**Caddy** 反向代理 + 自動 TLS,把 `/api/*` 與 WS 升級代理到 Node;靜態前端也由 Caddy/Node 提供。
6. 前端 `API_BASE` 指向正式網域(`https://` + `wss://`)。

---

## 風險與緩解

| 風險 | 緩解 |
|---|---|
| Phase 2 序列化(函式/Set 不可 JSON) | 已查證;以 id 代 def、Set 轉陣列、函式不傳改用 id 重建(工作項 C) |
| 全量快照 ~100KB 過大 | 15~20Hz 廣播 + delta + 興趣管理(C/E) |
| 單人寫死處眾多 | 集中重構 `players[]`(工作項 A),先以 1 人跑通再擴 2~3 人 |
| Phase 1 solo 分數客戶端可偽造 | 伺服器合理性檢查(分數 vs kills/stage/time 上限)、rate-limit;Phase 2 合作分數因 server-authoritative 天然可信。可日後把 solo 也搬伺服器算 |
| OCI 防火牆雙層 / iptables 預設嚴 | 部署清單明列(常見坑) |
| 瀏覽器 https 只能連 wss | Caddy 自動 TLS,必備網域或 DuckDNS |

---

## 驗證方式(end-to-end)

**Phase 1**
1. 本地用 docker-compose 起 Postgres + Node API;前端 `node tools/serve.mjs`(5173)指向 `http://localhost`。
2. 註冊→登入→玩一局→完局;**清掉瀏覽器 localStorage 後重新登入**,確認進度仍在(證明真的存雲端,非本地)。
3. 用瀏覽器 devtools 確認 `PUT /api/save`、`POST /api/runs` 有送出且 200;排行榜面板顯示剛上傳的分數。
4. 部署到 OCI 後,對正式 `https://`/`wss://` 重跑 2~3。

**Phase 2**
1. 伺服器端寫 headless 測試:掛 DOM shim、import 模擬碼、用 CLAUDE.md 既有「手動 pump」法(`for(...) s.update(1/60)`)跑數千 tick,確認不崩、世界推進正常。
2. 開 2~3 個瀏覽器分頁/裝置加入同一房號,確認**三方看到同一群怪、彼此位置一致**;觀察延遲手感(預測/內插是否平順)。
3. 故意關掉一個分頁,確認伺服器房間正確處理離線。
4. 合作完局確認伺服器寫入 `runs`(`coop_size`>1)且排行榜出現。

---

## 建議里程碑順序

1. **M1**:OCI VM + Postgres + Caddy + 空 Fastify(`/health` 通)。
2. **M2**:Auth(註冊/登入/JWT)。
3. **M3**:雲端存檔(接 `state.js` 的 load/save/bankRun)+ 登入 scene。
4. **M4**:排行榜(上傳 + 顯示面板)。→ **Phase 1 完成,可上線**。
5. **M5**:輸入解耦 + `players[]` 重構(本地先支援 2 人分屏驗證)。
6. **M6**:序列化/快照 + headless 伺服器模擬。
7. **M7**:ws 大廳 + 廣播 + 預測/內插。→ **Phase 2 完成**。
