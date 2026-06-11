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
