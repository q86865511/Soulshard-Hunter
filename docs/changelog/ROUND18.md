# Round 18 — 戶外城鎮 × 終局玩法 × 生態補完 × 回流循環

> 規格：[`docs/ROUND18_SPEC.md`](../ROUND18_SPEC.md)（B0–B12，四條可並行軌道）。每批落地在本檔附「內容＋驗證」條目。

## B0 — 前置：規格定稿 + README 結構重整（2026-06-11）

**規格定稿**
- 經三路探索（局內核心系統／城鎮與長期進度／線上功能）＋逐項程式碼驗證後，定稿 `docs/ROUND18_SPEC.md`：13 個批次涵蓋玩家選定的五大方向（城鎮戶外大改版、無盡深度改造＋賽季榜、生態系補完＋6 新英雄、每日／每週挑戰、NPC 好感＋小屋裝飾＋寵物），含全部設計決策表格（詛咒池 12、詞綴池 12、英雄 kit 6、Boss 概念 5、伺服器 SQL 與防作弊分支）與逐批驗證計畫。
- 探索期抓到並寫入規格的陷阱：stale `gen/gen_characters.js`（gitignored 但仍在 PACKS，會在本機覆蓋新英雄 kit）、`g_arcanist` 專屬武器誤掛獵人的 `x_starpiercer`、排行榜 period 切換前後端皆已存在（只缺 mode 維度）、兩個 server fake pool 需同步更新。

**README 結構重整**
- 全檔重排：玩家導向（快速開始／操作／流程／特色／內容規模）與開發者導向（線上架構／專案結構／擴充／文件索引）分層，新增目錄與文件索引表。
- 「系統」巨型長句段落改為主題分組短句（局內戰鬥／城鎮與長期成長／體驗與品質）；散落各處的回合註記（「R17 新增…」「第六輪調硬」等）移除——細節歸 changelog。
- 操作表修正過時資訊：移除已不存在的城鎮數字鍵面板捷徑（hub 自 R5 起為走動＋E 互動）；衝刺鍵確認為 `Shift`（input.js 預設綁定、可重綁）；保留 `空白`＝城鎮快開出擊（hub.js 仍有效）。

**驗證**：純文件變更（README.md、docs/ROUND18_SPEC.md、本檔），`git diff --stat` 確認零遊戲程式異動；README 內部連結與錨點逐一檢查。

**已知待辦（非本批範圍）**：局內教學橫幅（run.js 戰鬥提示）寫「按【空白】或【右鍵】可緊急閃避」，與實際預設綁定 `Shift` 不符——建議在 R18 任一批次順手修正文案或補上 Space/右鍵的衝刺別名。

## B5 — 6 新英雄 + 4 新專屬武器（2026-06-11）

**6 孤兒英雄轉正**（`content/characters.js`，註冊於 eager bake 迴圈之前，映射 `art/heroes.js HERO_MAP` 既有身體 berserker/mage/scout/valkyrie/necromancer/stormpriest）：
- `g_vanguard` 鐵血先鋒（坦：HP+50/減傷+4/擊退+25%/移速−8%/回復+0.4，起手 w_whip，金幣 500）
- `g_arcanist` 奧術秘士（玻璃法師：傷害+18%/範圍+30%/XP+15%/HP−15，w_nova，金幣 650）
- `g_ranger` 翠林遊俠（暴擊射手：暴擊+12%/暴傷+0.3/射速+12%/HP−12，w_soulbolt，`survive_600`）
- `g_warden` 霜鋼守望（環刃守護：HP+20/閃避+12%/投射+1/傷害−10%，w_orbit，金幣 800）
- `g_revenant` 永夜亡魂（吸血光環：HP+25/吸血+6%/回復+0.6/範圍+15%，w_aura，`reach_stage_8`）
- `g_stormcaller` 雷霆喚使（雷暴彈幕：投射+1/彈速+20%/傷害+10%/HP−20，w_lightning，`endless_1200`）

所有 passive 只寫 `makeBaseStats()` 既有欄位（maxHp/defense/knockbackMult/speed/hpRegen/damageMult/area/xpMult/critChance/critMult/fireRateMult/projCountAdd/dodge/lifesteal/projSpeedMult）。`meetsCondition` 新增 `endless_N` regex → `(s.bestEndlessTime||0)>=N`（B7 stat；B7 前 g_stormcaller 單純保持鎖定，零錯誤）。

**4 新專屬武器**（`content/exclusives.js`，`X()` 模式 tier 3 / weight 0 / exclusive:true）：`x_arcrift` 奧術裂隙（緩重穿透法彈 g_arcanist）、`x_galeshot` 疾風連弩（極速雙連 g_ranger）、`x_bastionwave` 堡壘震波（4 投射扇形緩速 g_warden）、`x_stormheart` 雷暴核心（3 高速雷彈 g_stormcaller）。`CHAR_EXCLUSIVE` 修正 `g_arcanist: x_starpiercer→x_arcrift`（原誤掛獵人的武器）、新增 g_ranger/g_warden/g_stormcaller 三條；專屬武器 8→**12**。

**剷除 stale gen 檔**：刪除本機 untracked 的 `content/gen/gen_characters.js`（舊 kit，會在 characters.js 之後載入並靜默覆蓋新註冊——只在本機發生，部署正常更難察覺）＋從 `gen/index.js` PACKS 移除 `"gen_characters"`。roster 成就家族補 `[21]` 階（+1 成就）。

**驗證**：reload 後 `__GAME_ERROR__` null；`__DBG.reg()` 角色 15→**21**；6 個 `char_g_*` sprite 全 baked（非兜帽 fallback，出擊面板 3×3 第 2 頁截圖確認身體各異）；4 把新專屬 `Equipment.get` 全 reg:true、`exclusiveFor` 映射正確（g_arcanist→x_arcrift）；身體經 HERO_MAP 映射至 berserker/mage/scout/valkyrie/necromancer/stormpriest。

## B3 — 5 個新生態系專屬最終 Boss（2026-06-11）

新 `content/bosses_biome.js`（手寫 content + 共置程序美術，**非 gen/**）：verdant/desert/swamp/abyss/celestial 五個 R9 生態各得專屬多階段最終 Boss，補滿 `run.js FINAL_BOSS` 10/10 生態（先前這 5 個走 `spawnFinalBoss()` 隨機 fallback）。

| 生態 | id | 名稱 | ai | 招牌 |
|---|---|---|---|---|
| verdant | `b3_thornking` | 百木之王·荊棘攝政 | charger | 衝撞（range 160）+ 接觸流血（chance 0.4） |
| desert | `b3_sandpharaoh` | 流沙法老·安卡之影 | shooter | 寬扇砂彈（burst 10/spread 0.5/`b3_sandbolt`）+ 緩速；金幣偏高 440 |
| swamp | `b3_bogmaw` | 腐沼之喉·巨蟾母 | shooter | 高拋慢速毒涎（projSpeed 72/projLife 5/`b3_bogspit`）+ 中毒 |
| abyss | `b3_leviathan` | 深淵利維坦 | charger | 高速貫場衝鋒（range 220）+ knockbackResist 0.85 |
| celestial | `b3_seraphjudge` | 墮天審判·熾羽座天使 | shooter | 聖羽飛鏢（burst 12/`b3_holyfeather`）+ 暈眩（chance 0.25） |

全部 `boss:true`（enemy.js 自動 66%/33% 三階段徑向彈幕 + 召喚）、`weight:0`（不進雜兵/小王池抽選）、tier 4、數值以 g_plagueheart（hp 2200/dmg 24/scale 2.6）為基準微調（hp 2300–2700）。`hitStatus:{type,chance}` 同時涵蓋接觸（charger）與彈幕（shooter，經 enemy.js `statusOnHit`）——**零協定改動**，純量隨敵人數值流到 co-op guest。charger boss 的階段彈幕沿用引擎 `radialBurst`（硬編 `bolt_enemy` 但以 boss `tint` 上色，自動得主題色），故僅 shooter 需專屬彈幕精靈。附帶效益：新 Boss 自動加入其他生態小王池與無盡 Boss 池（零程式）。

**美術製程**：5 隻 ~40px 4 幀 boss body + 3 顆專屬彈幕 + 5 顆 icon 由 **22-agent 等級的 Fable workflow**（`tools/_wf_b3_bosses.mjs`：5 Fable 平行繪製 → 5 Opus 對抗驗證每塊美術的 palette/Painter/anchor/outline 正確性）產出，`tools/_b3_integrate.mjs` splice 進 `__B3_ART__` 標記區。敵人總數仍 48（boss `weight:0` 不計入雜兵；含 boss 的 `Enemies.all()` 為 53）。

**驗證**：reload `__GAME_ERROR__` null；`Enemies.all()` 48→**53**（5 新 boss boss:true/tier:4/weight:0）；verdant 局 `spawnFinalBoss()` 生成 `b3_thornking`、強制掉血觸發 phase 1→2、`radialBurst` 噴出 42 projectiles；5 隻 body sprite 全 4 幀正確尺寸、gallery 截圖每隻清晰可辨概念、3 顆彈幕精靈清楚、零 magenta fallback。`main.js` content 區 +1 import（enemies.js 之後）。

## B4 — 生態系敵群偏好 + 5 新雜兵（2026-06-11）

**生態敵群偏好**：新 `content/biome_tags.js`（`ENEMY_BIOMES` 把 28/39 雜兵貼上 1+ 生態標籤，可多生態；`biomeWeight(def,biomeId)` helper）。`run.js rotateTypes` 的權重函式與 `evSurround` 的選怪改用 `rng.weighted(..., biomeWeight)` 乘上生態係數（與 D4 遠程壓低係數並存），讀 `this.run.biomeId`。`balance.js`：`BIOME_AFFINITY_BOOST 5.5`（同生態 ×5.5）、`BIOME_FOREIGN_DAMP 0.2`（外來 ×0.2，**永不為 0 → 池不空**）；史萊姆/蝙蝠/鬼火/石像 + 全 `s_*/s2_*` 特殊怪維持無標籤全域 ×1。**零協定改動**（純 host 端選池）。跨標範例：木乃伊系 `g_skeleton/bonearcher/ghoul` 同掛 crypt+desert；冷水系 `g_iciclewisp/glacierslime` 掛 frost+abyss；天空系 `g_frostbat/snowraven` 掛 frost+celestial。

**5 新雜兵**（敵人 48→**53**，配貧乏生態；新 `content/enemies_biome.js` 手寫 content+art）：`vr_thornling` 荊棘妖精（verdant flyer t1）、`ds_duneburrower` 沙行掘者（desert charger t2）、`sw_mireleech` 沼澤巨蛭（swamp chase t2，hitStatus poison）、`ab_voltjelly` 深淵電水母（abyss flyer t2，hitStatus slow）、`ce_cherubim` 雲端守靈（celestial shooter t1，光彈）。`main.js` +1 import。

**驗證**：reload `__GAME_ERROR__` null、`Enemies.all()` 53→**58**、5 新 sprite 全 baked + gallery 截圖清晰；`rotateTypes` ×300/生態 直方圖（威脅 13）——**所有生態 empty=0**（不空池），同生態占比：充足生態 50–65%（frost 65 / crypt 59 / cavern 54 / desert 53 / verdant 53 / abyss 51 / swamp 50），遠程偏多的 inferno 29 / void 32 / celestial 40（受 D4 遠程壓低與該生態雜兵數少所限，仍為明顯主題色＋專屬 Boss＋生態美術）；外來占比 ≤19%。威脅 1 時 tierCap=1，crypt/desert/inferno/void 無 tier-1 主題雜兵故開局以全域雜兵為主（設計如此，主題隨威脅爬升浮現）。

## B6 — 伺服器 migration（runs.mode / challenge_key）（2026-06-11）

**Schema**（`server/src/db.js`，冪等 ALTER 比照 guest_name migration）：`runs` 加 `mode text NOT NULL DEFAULT 'normal'`（'normal'|'endless'|'daily'）+ `challenge_key text`（daily 的 'YYYYMMDD'，餘 NULL）+ 兩索引（`runs_mode_score_idx`、partial `runs_daily_idx`）。舊資料行吃 DEFAULT 'normal'，舊榜查詢（現預設 `mode='normal'`）**byte-identical**。

**API**（`server/src/server.js`）：
- `runSchema`：加 `mode: z.enum(['normal','endless','daily']).optional()`、`challenge_key: z.string().regex(/^\d{8}$/).optional().nullable()`；`stage` 上限 50→**99**（normal 仍由 plausibility 把守 20）。
- `computeScore`：stage clamp 改 mode-aware（endless 99 / 餘 50）；公式不變。
- `runPlausibility` 分模式：**endless**（不可 cleared/reaper、time ≤ 14400s、stage ≤ min(99, 1+ceil(time/90)+2)）、**daily**（沿用 normal 全部閘 + challenge_key 必須是今天或昨天 Asia/Taipei，否則 'stale or missing challenge key'）、**normal**（一字不動）。新 helper `taipeiDateKey(offsetDays)`（UTC+8 無 DST）。
- 兩個 INSERT（`/api/runs`、`/api/runs/guest`）補 `mode, challenge_key` 欄（challenge_key 僅 daily 寫入）。
- `/api/leaderboard` 加 `mode` 維度（**預設 'normal'** → 舊榜不變）；daily 再過濾 `challenge_key`（參數 `key` 驗 `^\d{8}$`，預設今天）且忽略 difficulty 過濾；SELECT 補回 `mode, challenge_key` 欄供 UI/測試辨識；DISTINCT-ON 識別式不變 → 各模式天然「每人取最佳」。

**測試**：兩個 fake pool（`smoke.mjs` 內建 + `fakepool.mjs` dev launcher）的 runs INSERT destructure + leaderboard 過濾都教了 `mode`/`challenge_key`（trailing 欄 + 新 WHERE）。新增 11 條 inject（endless 合法 200／endless cleared→422／endless 過快 stage→422／normal stage40 仍 422 回歸／daily 今日 key→200／daily 3 天前 key→422／daily 缺 key→422／預設榜只回 normal／?mode=endless 只回 endless／?mode=daily&key 過濾／空日→0 列）。`server/test/smoke.mjs` 92→**103 passed, 0 failed**；`social.smoke.mjs` **65 passed**。CI push 即部署，全綠才上。

## B8 — 排行榜模式切換 UI（2026-06-11）

`net/ui.js openLeaderboard`：在既有 biome/diff/period select 前加 `mode` select `[標準/無盡/每日]`。選**每日**時隱藏 biome+diff+period、改顯示今日 key 標籤「📅 YYYYMMDD 每日挑戰」（新 client `dailyKey()` UTC+8，與伺服器一致），查詢帶 `mode=daily&key=今日`；選**無盡/每日**時「層」表頭改顯示「波次」語意。標準模式 `mode=''` 被 `api.js leaderboard()` 的 null/空值清理略過 → 伺服器預設 normal（舊行為不變）。訪客上傳區塊不動。

**驗證**：reload `__GAME_ERROR__` null；eval 開啟排行榜 → mode select 三選項齊全；切每日 → biome/diff/period 全隱藏、keyLabel 顯示「📅 20260611 每日挑戰」（=今日）；切無盡/每日 → 查詢 params 含對應 mode；preview 截圖確認 overlay 樣式一致（離線顯示「無法載入」屬預期）。

## B7 — 無盡模式深度改造（詛咒 + 里程碑 + 上傳）（2026-06-11）

**詛咒系統**（新 `content/curses.js` 手寫，12 條）：無盡每 `BALANCE.CURSE_INTERVAL`（300s，首次 5:00）暫停式三選一，詛咒與報酬成對生效、**無限疊加**。每張 `apply(s)` 就地改 run 場景——敵側乘法累積器（`curseHpMul/curseDmgMul/curseSpdMul/curseCapAdd/curseBossHpMul`）、玩家一次性 stat（皆為 makeBaseStats 既有欄位）、旗標（`curseBossHeal/curseBossChest/curseDrain`）、或即時經濟（run.gold/shards）。詛咒池：嗜血潮/鐵骨/疾風群/增援/鈍刃/脆甲/賭命/巨王/禁療/失準/重壓/蝕魂。

**接線**（`scenes/run.js`）：`curseChoice` 插入 update() 模態鏈（eventChoice 之後；模態鏈一律 `return` → 暫停期間 level-up 不會雙開）。`openCurseChoice/updateCurseChoice/applyCurse/drawCurseChoice`（複刻 event 卡片、紫紅詛咒皮、詛咒/報酬雙區）。**co-op 防衛**：`if (this.coop) 套用隨機一張; return;`（照 openEventChoice）。消費點：`spawnTick`（hpScale×curseHpMul、dmgScale×curseDmgMul、speedScale=curseSpdMul、cap×(1+curseCapAdd)）、`spawnEndlessBoss`（×curseHpMul×curseBossHpMul / ×curseDmgMul）、`evSurround`、`onBossDead`（脆甲回 30%、巨王額外掉落金幣+魂晶）。`endlessTick(dt)`：詛咒觸發（!boss 時）、蝕魂每 30s 失 5% 當前生命（永不致死）、里程碑。新增 `world.js` 擊殺 +curseGoldPerKill（蝕魂）、`player.heal` 乘 `healMult`（禁療 c_seal，B9 m_anemic 共用）。**零協定改動**——全為 host 端純量。

**里程碑**：`BALANCE.ENDLESS_MILESTONES`[900,1200,1500,1800,2400]s → 橫幅 + 金幣[300,500,800,1200,2000]/魂晶[30,50,80,120,200]。**HUD**：無盡波次列加 `☠×N` 詛咒疊層數。

**持久化 + 上傳**：`state.js` `bestEndlessTime` stat（DEFAULT_META + loadMeta 數值回填）；`bankRun` 在 mode==='endless' 記錄。upload：`run.js` stage 封頂改 `endless ? ENDLESS_STAGE_CAP(99) : THREAT_CEIL`；payload 加 `mode`/`challenge_key`，**解除無盡不上傳的排除**（只剩劇情 D0 排除）。成就 +5：`endless` 家族[600,1200,1800,2400,3600]（`endless_1200` 同時是 g_stormcaller 解鎖讀數）。

**驗證**：reload `__GAME_ERROR__` null；模擬無盡 115000 幀（每幀復活+清模態）→ 時間 1916s、stage **20（>THREAT_CEIL 13，封頂解除）**、4 里程碑觸發（gold 3513/shard 323）、bestEndlessTime 寫入 1916；直接套用全 12 詛咒 → 累積器精確（curseDmgMul 1.38=1.15×1.20、curseHpMul 1.2、curseBossHpMul 1.3…）、玩家 stat 精確（maxHp+40、dash×1.3、crit 夾 0、healMult 0.5、proj+1、pickup+40、def−2）；co-op `openCurseChoice` 自動解決（curseChoice 不開）；詛咒三選一渲染截圖確認（紫紅皮、詛咒紅/報酬綠雙區）；normal 模式累積器恆 ×1 → 手感 byte-identical。

## B9 — 每日挑戰 + 週常懸賞（2026-06-11）

**每日挑戰**（新 `content/daily.js` 手寫）：`dateKey()`（本地 YYYYMMDD）→ `xmur3` hash → `makeRng` 決定論挑出 **1 生態（10 選 1、無視解鎖）+ 1 英雄（全名單暫借）+ 3 詞綴（洗牌、依 group 去重）**。地圖/掉落刻意維持非決定論（不把種子穿進 maps.js → 零 co-op 風險）。固定難度 3 上傳 `{mode:'daily', challenge_key}`（公平同條件）；**不限次、取最佳**（伺服器 DISTINCT-ON 天然支援）。**進度隔離**：`clearLevel` 在 `mode==='daily'` 時跳過 `META.levels` 解鎖寫入（橫幅改「每日挑戰完成！」）、暫借英雄不寫 `META.unlocked`；`bankRun` 記 `META.daily={key,best,plays}` + `stats.dailyClears`。**入口**：出擊面板頂部金邊「📅 每日挑戰」列（顯示今日生態/英雄/詞綴 + 個人最佳），點擊直接開局（`hubScene.launchDaily`）。

**12 詞綴**（`DAILY_MUTATORS`，`apply(s)` 與 B7 詛咒**共用場景累積器**，buildWorld 套一次）：m_swift 敵速+20%（curseSpdMul）· m_anemic 治療×0.25（player.healMult）· m_twin 雙生小王（dailyTwinBoss → spawnMiniBoss 生第二隻）· m_greed 金幣+50%（goldMult）· m_glass 造成/受到傷害+30%（damageMult+curseDmgMul）· m_horde 上限+40%/敵血−15%（curseCapAdd+curseHpMul）· m_elite 精英×3（dailyEliteMul，spawnTick elite 機率）· m_fog 瞄準−30%/暗角（world.aimMul，`aimTarget` 讀）· m_tempo 攻速+15%（dailyTempoMul，world.update 後乘 playerTempo/enemyTempo）· m_volatile 12% 雜兵死亡爆炸（spawnEnemy 設 `e.deathBlast` 實例欄，world 死亡檢查改讀 `e.deathBlast||e.def.deathBlast`）· m_tax 商店+50%/金幣+80%（dailyShopMul，anvil/gearPrice）· m_frenzy Boss傷害+25%/掉落翻倍（dailyBossDmgMul × 各 boss spawn dmgScale、dailyBossDropMul × onBossDead 掉落）。**零協定改動**（全 host 端純量/玩家 stat）。

**週常懸賞**（`content/quests.js`）：`weekKey()`（ISO 週，Thursday-anchored）；`WEEKLY_QUESTS` 池 **9 取 3**（`makeRng(hash('weekly:'+weekKey))`）。**進度＝終身統計差值**：`META.weekly={key, base:{kills,clears,miniBossKills,totalGold,bossKills}, claims:{}}`——hub 進場 `ensureWeekly()` 在跨週時以當前統計重拍快照 + 清空 claims；`prog = stats[k] − base[k]`。任務獎勵 250–500 金 + 公會聲望（`addGuildXp(reward/3)`）。公會委託面板的捲動清單頂部插入「📅 本週懸賞」段（3 行 claim）+「一般懸賞」子標題，沿用既有 clip/scroll。（週常**不**進 HUD 追蹤——避免跨週 prune 複雜度，刻意 scope 取捨。）

**檔案**：新 `content/daily.js`；`content/quests.js`（+WEEKLY_QUESTS/weeklyQuests/weeklyState/claimWeekly/ensureWeekly）；`state.js`（DEFAULT_META `daily`/`weekly`/`room`/`pet`/`npcAff` + `stats.dailyClears` + loadMeta 守衛 + newRun `challengeKey`/`dailyMutators` + bankRun daily 記錄）；`scenes/run.js`（buildWorld 套詞綴 + 8 消費點 + clearLevel 隔離）；`world.js`（volatile 死亡爆炸 + aimMul）；`scenes/hub.js`（sortie daily bar/launchDaily + guild 週常段）；`content/achievements.js`（daily 家族 +3 `[1,7,30]`）。

**驗證**：reload `__GAME_ERROR__` null；`dailyChallenge('20260611')` 同日全等、跨日不同（biome void / hero stormcaller / m_anemic·m_tempo·m_greed）；週常 9 取 3 決定論、weekKey `2026-W24`；實跑 daily run → mode='daily'、healMult 0.25 / goldMult 1.5 / tempoMul 1.15、400 幀 godmode 無錯；`clearLevel` 後 `META.levels` **未變**（隔離成功）、橫幅「每日挑戰完成！」；sortie/guild 面板 render 零錯、daily bar 截圖確認（虛空獵境·雷暴喚使·三詞綴·未挑戰）、weeklyRows=3。reg 計數 characters 21 / enemies 58。
