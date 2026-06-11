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
