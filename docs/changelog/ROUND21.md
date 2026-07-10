# Round 21 — 後期英雄專屬武器 · 雙人連線同步稽核 · 已知問題修正

承接 R20 的兩項待辦 + 一項已知問題修正。全部 **frontend additive**;`server/`、save schema、單人模擬不變;co-op 協議僅在 enemy tuple **尾端附加一個欄位**(host/guest 同版部署故相容)。

---

## B1 — 9 把後期英雄專屬武器(需求:後期英雄專屬武器)

R20 只補上最終 6 英雄(`h4_*`)的專屬武器,5 個 `h2_*` + 4 個 `h3_*` 仍缺。本批補齊,**CHAR_EXCLUSIVE 18→27、Equipment 51→60**。

**改檔(僅一個,手寫、非 gen/):** `src/game/content/exclusives.js`

沿用既有 `X({...})` helper + `CHAR_EXCLUSIVE` map,武器用既有「signature 自動武器」扁平 stat 格式(透過 `equipItem`→`makeEquipWeaponDef` 在執行期套 `PLAYER_DAMAGE_MULT`/crit;**非** `weapons_r20.js` 的 `r20Roll`)。每把配合該英雄定位 + 色系,icon 由 `X()` 自動註冊為 `equip_x_<hero>`。

| 英雄 | 專屬武器 | 定位呼應 |
|---|---|---|
| h2_duelist 魂刃決鬥者 | 烈刃雙星 | 高速雙刃 + 流血(快攻決鬥) |
| h2_warlock 腐蝕巫師 | 腐朽瘴囊 | 緩飄大範圍毒彈(範圍消耗) |
| h2_trapper 陷阱師 | 裂地壓爆 | 沉重高擊退穿透彈(佈場) |
| h2_voidcaller 虛空喚者 | 寂滅奇點 | 緩行高傷虛空巨彈(玻璃大砲) |
| h2_warder 恆冬守望者 | 凜冬霜壁 | 扇形震波 + 緩速(防禦反制) |
| h3_spearmaiden 魂矛巫女 | 破穹魂矛 | 高速 6 穿透長矛(站樁穿透) |
| h3_plague 瘟疫醫師 | 疫癘藥瓶 | 三枚毒瓶散射 + 中毒(範圍消耗) |
| h3_beastfang 獸牙馴者 | 嗜血追爪 | 三道追蹤獸爪 + 流血(野性近戰) |
| h3_dragoon 龍騎先鋒 | 墜龍重矛 | 俯衝高傷重矛 + 擊退(裝甲先鋒) |

**注入路徑零改動**:`run.js rollGearChoice` 以 `exclusiveFor(characterId)` + 32% 機率注入,純 data-driven,進 map 即生效。

**驗證**(`node tools/serve.mjs` + preview_eval):boot 乾淨(`__GAME_ERROR__`=null);`__DBG.reg()` characters 27 / equipment 60;9 把全 `slot:'weapon'`+`exclusive:true`+`weapon` 定義齊備+icon sprite 已 bake;9 個 hero `exclusiveFor()` 對應正確;`CHAR_EXCLUSIVE` 鍵數 27;實機 `equipItem()` 裝上 6 把任一 → 自動開火、projectiles 生成、零 update 錯誤。

---

## B2 — 雙人連線 Boss/事件同步稽核 + 修 `mvLift`(需求:雙人連線 Boss 同步抽查)

**稽核結論(逐一核對程式碼):** R20 的新 Boss 招式與 4 局內事件**絕大多數已被既有架構正確涵蓋**,唯一確認的視覺缺口是 leap_slam 的滯空抬升。

| 稽核項 | 同步機制 | 結論 |
|---|---|---|
| 敵人/Boss 位置 | 主機權威 + guest 插值(`coop.js:182`) | OK,免改 |
| `wall_cage` 魂柱 | 普通敵人實體走 `en` 頻道;不在快照即被剔除(`protocol.js:150`) | OK,主機碎裂後 guest 正常消失 |
| 各招式 beam 預警(charge_combo / shock_lines / wall_cage 詠唱) | 全走 `bm` 頻道序列化(`protocol.js:113/165`) | OK,免改 |
| 事件 beam(evt_bomb 十字 / evt_boulder 車道) | 同上 `bm` 頻道 | OK,免改 |
| evt_boulder 移動 / evt_goblin 速度 / evt_bomber 引信 | 位置走主機權威快照;guest 僅渲染 | OK(speed/fuse 是主機側純量,guest 不需) |
| 魂柱推擠玩家 | guest 自身 avatar 本地預測 + 向主機權威位置 reconcile(`coop.js:207-209`) | OK,不會真的穿牆 |
| **leap_slam 滯空抬升 `e.mvLift`** | **只存於敵人實例,沒進 8 欄位 enemy tuple** | **NG → 本批修正** |

**修正(`src/game/net/protocol.js`,additive):**
- enemy 編碼 tuple 尾端附加 `t[8] = Math.round((e.mvLift||0)*10)`。
- guest 解碼加 `e.mvLift = t.length > 8 ? (t[8]||0)/10 : 0`(**每幀重設**,招式結束自動釋放抬升;舊的 `t.length < 8` 截斷保護不變)。
- `enemy.js:273` 的 `hopY` 早已用 `this.mvLift` 繪製,guest 端取得後即正確飛起(原本恆為 0 → 貼地滑行)。

**回歸測試(`src/main.js __DBG.coopRoundTrip()` 擴充):** 在送出快照前對一隻 live 敵人蓋上 `mvLift=4.6`,斷言 ① 編碼 tuple `t[8]≈46`、② guest 解碼後該敵人 `mvLift≈4.6`。`mvLiftRoundTrip:true`、`guestRendered:true`、零錯誤。

**驗證**:`coopRoundTrip()` 綠(含新 mvLift 斷言);reload 後單人 run 不受影響(tuple 尾欄位對單人無作用)。其餘稽核項依上表判定「已由主機權威涵蓋、無需改」。

---

## B3 — 閃避提示文案修正(需求:已知問題修正)

`run.js BATTLE_HINTS` 第 12 秒橫幅原硬寫「按【空白】或【右鍵】可緊急閃避」,與實際**預設衝刺鍵 Shift**(`input.js` `ShiftLeft/ShiftRight→'dash'`)不符,且衝刺鍵自 R11/R17 起可重綁。

**修正(`src/game/scenes/run.js`):**
- 該提示改為 `text: () => '按【' + keyLabel(currentKeyFor('dash')) + '】可緊急閃避（短暫無敵）。'`,沿用 `input.js` 既有的 `currentKeyFor`/`keyLabel`(無需新 export)。
- 橫幅啟動處(`updateBattleHints`)支援 `text` 為 function:`typeof bh.text === 'function' ? bh.text() : bh.text` —— 其他字串提示不受影響。

**順掃**:實作 B1/B2 過程未發現其他確認的小 bug;4 個 headless 測試陷阱屬 by-design(玩家無感),本輪不動。

**驗證**:`currentKeyFor('dash')`→`ShiftLeft`、`keyLabel`→「Shift」→ 橫幅「按【Shift】可緊急閃避（短暫無敵）。」;模擬 `applyKeybinds({dash:'KeyC'})` 後標籤即時變「C」,還原後回「Shift」。

---

## 相容性

- B1 純資料、零 gameplay 碼改動。
- B2 enemy tuple **只附加尾欄位**,其餘 `en`/`bm`/`pr`/`pk`/`pl` 格式不變;host/guest 隨 CI 同版上線故相容;單人路徑不讀此欄位。
- B3 僅 UI 文案 + 兩處既有 helper 取用。
- 全部 additive;`server/`、save schema、單人模擬 byte 不變。

---

## R21.1 — 維護批次(測試稽核後清理,8 項)

R21 完成後跑了一次全系統測試(動態實機 + Workflow 靜態/後端稽核,詳見 `docs/TEST_REPORT_R21.md`)。結論可發布、無高嚴重度問題;本批把確認的 8 項維護性清理一次補齊。低階修改交由 Sonnet 執行、Opus 逐項驗證 + 瀏覽器回歸。

| # | 嚴重度 | 修正 | 檔案 |
|---|---|---|---|
| 1 | 中 | `boss_pillar` 的 `hp` 硬編碼 60 → 改讀 `BALANCE.BOSSMOVE_PILLAR_HP`(恢復單一真實來源;值不變) | `content/boss_moves.js:243` |
| 2 | 低 | dev launcher `fakepool.mjs` feedback INSERT 補上 `image` 第 5 欄(解構 + push + admin-list map),比照 `smoke.mjs`;正式環境本就正常 | `server/test/fakepool.mjs` |
| 3 | 低 | 升級「回復生命」fallback 的未定義 icon `item_heart` → 改用既有的 `ability_vitality`(`sym.heart`),co-op 訪客升級不再顯示靈彈圖示 | `scenes/run.js:114` |
| 4 | 低 | 移除孤兒鍵 `BIGBOSS_TIME`(全庫零引用;終 Boss 實走 `LEVEL_TIME`) | `balance.js` |
| 5 | 低 | 移除孤兒鍵 `MOB_SHARD_BOSS`(全庫零引用;boss 掉落走 `e.shard`) | `balance.js` |
| 6 | 低 | guest `makeEnemy` 初始化 `e.mvLift = 0`,消除 R21 滯空欄位在 `applySnapshot` 前的 undefined 視窗(原靠 `||0` 防護) | `scenes/coop.js:98` |
| 7 | 資訊 | `gen_heroes2.js` 標頭過時註解改正:`kills_5000`/`survive_600` 已由 `characters.js` 的 `meetsCondition`(`kills_N`/`survive_N` 泛用比對)支援,兩名隱藏英雄會正常自動解鎖 | `gen/gen_heroes2.js:16` |
| 8 | 資訊 | 刪除 R19 死美術 `ruin_fc_*` 六個 facade sprite(已由 R20 `ruin_fc2_*` 取代,全庫零引用),`town_ruin_facades.js` 留為 stub 以免 `main.js` import 404 | `art/town_ruin_facades.js` |

**安全確認**:① 刪鍵/刪美術前皆 grep 全庫確認零引用(僅自身定義 + 測試報告文字命中);② `meetsCondition` 的 `kills_N`/`survive_N` 泛用比對 + `META.stats.bestTime`(state.js 初始化於 :44、結算寫入於 :342)實證為真,故 #7 是改正而非掩蓋 bug。

**驗證**:reload 後 boot 乾淨、`reg()` 計數不變;`ability_vitality`/`ruin_fc2_0` sprite 解析正常、`boss_pillar.hp===BALANCE.BOSSMOVE_PILLAR_HP`(60)、`BIGBOSS_TIME`/`MOB_SHARD_BOSS` 已成 undefined;`coopRoundTrip()` + mvLift 仍綠;hub 渲染正常;ruin D2 一分鐘 run smoke 正常;**`server/test` smoke 103/0 + social 65/0 全綠**。

---

## R21.2 — co-op Boss/事件同步:自動深度測試(待辦結案)

R20 的 Boss 招式 + 4 局內事件先前只有人工「兩分頁實機抽查」這條待辦。co-op 是 host-authoritative relay(伺服器僅轉發),真正會壞的是 **encode→decode→render** 路徑——這條可在單一分頁內離線完整重現,毋須兩個真實瀏覽器端。本批新增一個**確定性**自測 `__DBG.coopBossSyncTest()`,把待辦從「人工抽查」升級成可回歸的自動測試。

**新增(`src/main.js`,僅一檔 +269 行):**
- top import `{ BOSS_MOVES, bossMoveTick }`;`__DBG.coopBossSyncTest()` 置於 `coopSilenceTest` 之後。
- 流程:建 host coop run → 生成一隻已註冊 WIRE 終 Boss(`b3_leviathan`)+ 4 個事件怪 → **逐一強制**四招式(`boss.mv = {id, ...BOSS_MOVES[id].start()}` 直接驅動 `bossMoveTick`,繞過隨機排程器,確定性)→ 每幀 `encodeSnapshot` 收集快照陣列 → 切到 guest 場景一次 → 重播所有快照、斷言 guest 端重建狀態 → `guest.render()`。
- 因 `run.js exit()` 會在切場景時清掉 `host.coop`(`encodeSnapshot` 需要它),採「先在 host 端收齊各招式快照陣列、最後切 guest 一次重播」策略;warm-up 迴圈內清 `hudTut`/各 `*Choice` 並回血(headless 陷阱)。

**結果(連跑 3 次,完全一致、0 錯誤):**

| 招式/項目 | host | guest 重建 |
|---|---|---|
| leap_slam 滯空 | maxMvLift = 46 | **mvLift>0 ✓**(R21 修正端到端驗證) |
| wall_cage 魂柱 | 8 根 boss_pillar | **guest 出現 boss_pillar ✓** + beam ✓ |
| charge_combo | beam 預警 | **guest.beams 同步 ✓** |
| shock_lines | beam 預警 | **guest.beams 同步 ✓** |
| 4 事件怪(自爆/詭雷/滾岩/寶藏哥布林) | 全生成 | **4/4 在 guest 重建 ✓** |
| guest 渲染 | — | **0 錯誤 ✓** |

**結論**:guest 端能正確收到並重建 R20 全部 Boss 招式視覺狀態(含 R21 修的 mvLift)、魂柱實體、全部 beam 預警與 4 事件怪。功能正確性給出綠燈;唯一仍適合人工的是「兩真人端、真實網路延遲下的主觀手感」,屬錦上添花。低階測試實作由 Sonnet 撰寫、Opus 覆核 diff + 瀏覽器執行驗證。

---

## R21.3 — CI 測試關卡(工程)

作品集稽查補強。`deploy.yml`(self-hosted runner 部署)原本在 push 到 main 時**無測試關卡**就部署,壞 commit 會先上線才被發現。

- 新增可重用 workflow `.github/workflows/server-test.yml`(`workflow_call`):`npm ci` → `npm run check` → `npm test`(168 個 smoke/social 測試,in-memory fakepool,免 DB/port)。
- 新增 `.github/workflows/ci.yml`:PR 與 main push 時跑上述測試。
- `deploy.yml` 的 deploy job 改為 `needs: test`,**測試紅燈就不部署**。

驗證:GitHub Actions 上 server-test job 綠燈。

---

## R21.4 — run.js 巨型場景檔 mixin 拆分(工程,零行為變更)

作品集稽查補強。`src/game/scenes/run.js` 長到 **2619 行**(全作品集最大單檔),不利閱讀與導覽。本批以
**`Object.assign` mixin 機械式切分**把它拆成領域模組,**呼叫端零變更、執行行為零變更**(方法本體逐字搬移,
僅多了各檔的 import header 與 `export const xxxMixin`)。場景仍是單一 `this`-bound 物件,經 `refs.run` 暴露。

**結構:** `run.js` 收斂成 19 行組裝層(`Object.assign({}, …mixins)` + `refs.run`),方法搬到 `src/game/scenes/run/`:

| 檔 | 內容 | 檔 | 內容 |
|---|---|---|---|
| `shared.js` | 檔案層 helper/常數(`inside`/`FINAL_BOSS`/`fmtStat`/`ANVIL_POOL`/`BATTLE_HINTS`/`buildWeaponChoices`…) | `loop.js` | 主迴圈 `update(dt)` |
| `lifecycle.js` | enter/exit/buildWorld/threat/NPC/interactables/mini-boss | `coop.js` | 連線升級選單/同步輔助 |
| `modes.js` | 贊助者事件/無盡詛咒/挑戰/終局 Boss·死神/finishRun | `render_hud.js` | minimap/HUD/拾取/bond/patron 渲染 |
| `events.js` | 局內特殊事件(蘑菇/魂牢/Higgs/R20 四事件) | `shop_hidden.js` | B 商店 + 隱藏房/守護者/金庫 |
| `combat.js` | spawn/升級三選一/裝備選單/死亡·暫停 | `render.js` | 主 render + 世界/商店/tooltip/build 面板 |
| | | `overlays.js` | 開發者作弊面板 + 勝利/死亡結算 + 卡片繪製 |

> 同名 `exit()`(原物件字面值有兩個,後者勝)拆分後分居 `lifecycle`(前)與 `modes`(後);`Object.assign`
> 套用順序即檔案順序,`modes.exit` 仍覆蓋 `lifecycle.exit`,精確保留原「後鍵勝」語意。

**驗證(重構前後逐欄一致):** 以 headless Playwright 煙霧測試(scratch 工具,未提交)開遊戲、title→hub→run、
跑 `coopRoundTrip`/`coopBossSyncTest`,並**逐一驅動所有冷路徑**(每個面板/選單/事件/詛咒/挑戰/勝利死亡/作弊
面板各 render 一次)以揪出搬移後漏 import。重構前後皆綠:`reg` 計數不變(63 敵/43 武/27 英雄…)、
`runBooted`、`gameError=null`、`coopRT.guestRendered`+`mvLiftRoundTrip`、`coopBoss.ok`、冷路徑 0 錯誤。

---

## R21.5 — hub.js 巨型場景檔 mixin 拆分(工程,零行為變更)

延續 R21.4,把第二大的 `src/game/scenes/hub.js`(**1860 行**)以相同 `Object.assign` mixin 手法拆成領域模組。
**方法逐字搬移、呼叫端與執行行為零變更**(場景仍是單一 `this`-bound 物件,經 `refs.hub` 暴露)。

**結構:** `hub.js` 收斂成 16 行組裝層,方法搬到 `src/game/scenes/hub/`:

| 檔 | 內容 | 檔 | 內容 |
|---|---|---|---|
| `shared.js` | 檔案層 helper/常數(`inside`/`BUILDINGS`/`AREA_TITLE`/`ROOM_THEME`/`NPC_POS`…) | `render.js` | 主 render + 開發者面板 + 任務追蹤 + 框架 |
| `lifecycle.js` | enter/區域切換(`loadArea`)/站點·NPC 建置/update/門/環境特效 | `render_smith.js` | 鐵匠(鍛造+設施)/公會(任務+階級)繪製 |
| `menus.js` | Esc 選單/確認框/重置/對話/`openPanel` | `render_wardrobe.js` | 成就 + 衣帽店家族繪製 |
| `panels.js` | 面板派發/魂晶銀行/個人小屋/捲軸·分頁工具/天賦·設施狀態 | `render_personal.js` | 個人小屋 + bond 圖鑑 + 出擊繪製 |
| `upgrades.js` | 天賦/設施/鍛造/公會/出擊/任務/衣帽店的版面與輸入邏輯 | | |

**驗證(重構前後逐欄一致):** 在 R21.4 的煙霧測試上**新增 hub 冷路徑掃描**——`nav('hub')` 後逐一驅動
8 個面板(天賦/出擊/成就/衣帽/鐵匠/公會/小屋/銀行)+ Esc 選單 + 確認框 + 對話 + 開發者面板各 render
一次(canary 負控已驗證能抓漏 import)。run + hub 全綠:`reg` 計數不變、`runBooted`、`gameError=null`、
`coopRT`/`coopBoss` OK、run 冷路徑 + hub 冷路徑皆 0 錯誤。

---

## R21.6 — server 依賴安全升級:Fastify v4 → v5(維護)

`npm audit --omit=dev` 顯示 **5 個 high**,全在 Fastify 鏈(`fastify` / `fast-uri` / `fast-json-stringify` /
`@fastify/ajv-compiler` / `@fastify/fast-json-stringify-compiler`),修復需升 Fastify 5(semver major)。

**變更(`server/`):**
- `fastify` `^4.28.1` → `^5.9.0`、`@fastify/cors` `^9` → `^11`、`@fastify/rate-limit` `^9` → `^10`(對應 Fastify 5 的 plugin major)。
- `engines.node` `>=18` → `>=20`(Fastify 5 需 Node 20+;CI server-test 已是 Node 20)。
- `docker-compose.yml`:DB 密碼參數化 `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-soulshard}`(本地 demo 維持預設、正式部署由 `.env` 覆寫),`DATABASE_URL` 一併套用;`.env.example` 補 `POSTGRES_PASSWORD`;`server/README.md` Deployment 補 production env 提醒。

**為何乾淨:** 本服務只用到 `@fastify/cors`、`@fastify/rate-limit`、路由與 `app.listen({…})`,**未使用 v5 移除/變更的 API**
(`getResponseTime`/`routerPath`/positional `listen` 等皆無);`logger` 與 `app.server`(自管 `/rt` WS gateway)在 v5 仍相容。

**驗證:** `npm audit --omit=dev` **5 high → 0**;`npm run check` 綠;`npm test`(smoke 103 + social 65 = **168 passed**)綠。

---

## R21.7 — AI 專案評估與 Claude Code 執行 Prompt（文件-only）

新增兩份不影響 runtime、存檔、API 或部署行為的交接文件：

- `docs/AI_PROJECT_REVIEW.md`：以 main commit `03af175c08982135ea1cd0f2aa2a949a3dfaa111`、正式站桌面／手機視窗短測、repo 程式碼與 R21 測試文件為依據，整理專案優勢、九維度評分、證據分級、P0／P1／P2 backlog、競品基準與三階段 roadmap。
- `docs/CLAUDE_CODE_IMPROVEMENT_PROMPT.md`：可直接交給 Claude Code 的第一里程碑指令，範圍鎖定教學期間凍結模擬、前端 CI／deploy gate、桌面優先平台提示與測試文件校正，並明訂測試優先、相容性與禁止 commit／push／部署。

**已知限制:** 本次評估未完成登入、真人雙端合作、20 分鐘完整通關、長期留存、控制器與真人觸控測試；報告已將這些項目標示為未驗證，不以推論冒充實測。

**驗證:** 回讀兩份文件與本節；檢查 repo 相對路徑／外部競品連結；交叉核對 registry 數量、touch→mouse／keyboard `moveAxis`、story update 順序、server 103+65 測試與 CI 僅含 server gate 等證據；執行 `git diff --check`。本批無 runtime 程式碼，因此未宣稱遊戲或後端測試結果發生變化。

---

## R21.8 — 第一局安全＋前端 CI gate＋平台提示（P0 批次）

依 `docs/AI_PROJECT_REVIEW.md` 的四項 P0 執行（宣稱先逐條對照程式碼驗證屬實再動工）。

### 1. 首局章節文字改為 blocking onboarding state（P0-1）
- `src/game/scenes/run/loop.js`:在 `curseChoice` gate 之後、coop 分支之前新增 `if (this.story && !this.coop) { this.storyTick(dt); return; }` — story 顯示期間世界、局內計時(`run.time`)、生成、事件與 anti-AFK 全部凍結,語意與 `hudTut` 等既有 modal gate 一致。
- 倒數＋「空白鍵須先放開再按才跳過」的 armed 防誤觸邏輯抽成 `storyTick()` 共用;coop 沿用原本的非阻擋倒數(共享世界不可凍結,`!this.coop` 守門),協定與 guest 行為零變更。
- 連帶修正:hudTut 現在於「實際戰鬥 2 秒」彈出(修正前 story 期間計時偷跑,hudTut 實際在 story 結束瞬間彈出)。

### 2. 前端 smoke 測試＋CI/deploy gate(P0-2)
- 新增 `test/`(獨立 npm 套件,devDependency 只有 Playwright;遊戲 runtime 維持零依賴):`frontend-smoke.mjs` 自行啟停 `tools/serve.mjs`,headless Chromium 執行 29 條斷言 — boot 無 `__GAME_ERROR__`、`reg()` 八欄位基準(63/28/60/54/20/11/43/27)、`nav('hub')`/`nav('run')`＋pump 可 render、fresh save 的 story 暫停與自然結束恢復、hudTut 時序鏈、`coopRoundTrip()`(含 mvLift round-trip)與 `coopBossSyncTest()`。全部狀態條件等待、無固定 sleep、不寫 tracked snapshot;5173 被占用時 fail-fast。
- 新增 `.github/workflows/frontend-test.yml`(workflow_call);`ci.yml` 加 `frontend` job;`deploy.yml` 的 deploy 改 `needs: [test, frontend]` — server 與前端任一紅燈不部署(`test/` 原本就在部署 rsync 排除清單)。
- **測試優先流程**:story pause 斷言先在修正前的程式上證明會紅(`run.time` 於 story 期間 0→2.0),修正後 29/29 綠。

### 3. 平台支援誠實標示(P0-3)
- `src/game/scenes/title.js`:視窗窄於 720 CSS px 或 `pointer: coarse` 時,主選單頁尾上方顯示非阻擋提示「📱 目前建議使用實體鍵盤遊玩 · 完整觸控操作尚未支援」;桌面不顯示。不實作虛擬搖桿、不動桌面按鍵。
- `README.md` 新增「已知限制:平台支援」小節(觸控僅映射滑鼠指標、無法只靠觸控移動)。

### 4. 文件校正(P0-4)
- `server/README.md` Tests 由過時的 18＋33 校正為 smoke 103＋social 65＝168。
- `README.md` CI 段補 frontend gate 與前端 smoke 命令;`CLAUDE.md` Run/test 補前端 smoke(含「內容 round 改 registry 計數時同步更新 `REG_BASELINE`」義務)、headless 陷阱①補 story 凍結。

**相容性:** 存檔格式、co-op 協定、後端 API 皆未變;coop 路徑零行為變更(離線自測全綠佐證)。

**驗證:** `npm run test:frontend` 29/29 綠(修正前 story pause 紅、其餘 28 綠);瀏覽器實測 390×844 顯示提示且不遮主按鈕、1280×720 不顯示;`cd server && npm run check && npm test` 168 綠;`git diff --check` 乾淨。GitHub-hosted runner 上的 workflow 實跑屬未驗證項(需 push 後觀察)。
