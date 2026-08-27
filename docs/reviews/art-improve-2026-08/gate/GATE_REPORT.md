# R28 美術輪 vertical slice — 獨立 gate 審查報告

- 審查對象：`claude/soulshard-hunter-art-lead-5d399b`，`430443c..4392542`（7 commit）
- 權威規格：`docs/art/ART_SPEC.md`（v1）；原始審核：`docs/reviews/ART_AUDIT_2026-08-26.md`
- 審查者：獨立 reviewer（只審不改）。**未修改任何 `src/`、`tools/`、`test/` 檔案**（`git status --short src/ tools/ test/` 為空）。
- 本報告所有截圖／模擬圖產物在 `docs/reviews/art-improve-2026-08/gate/`。

## 判定總表

| # | Gate 項 | 判定 | 關鍵證據 |
|---|---|---|---|
| 1 | 無名角色輪廓辨認（27 角色，含 5 重建） | **縮小範圍通過** | `cmp-chars-rebuilt-5.png`、`cmp-batch-consistency.png`、`silhouette-chars-after.png` |
| 2 | normal/elite/boss 排序＋玩家/Boss 一秒定位＋Boss 來源 | **部分退回** | `gate-stress-crypt-boss-elites.png`、`zoom-gate-player-buried.png`、`gate-tier-lineup-crypt.png` |
| 3 | 圖示隱藏文字分類＋base/evo 區別 | **縮小範圍通過** | `gate-icon-frame-masks.png`、`zoom-icon-grammar-corners.png`、`gate-evo-pairs-32px.png` |
| 4 | 灰階測試（三生態 320×180＋icons 灰階） | **通過** | `gate-greyscale-320x180-6biomes.png`、`zoom-icon-grammar-grey.png` |
| 5 | 三色覺模擬（protan/deutan/tritan） | **通過（附 W5 待辦）** | `cvd/`（12 張）＋beam 家族色度計算 |
| 6 | 四解析度（含 2560×1440 全高） | **通過** | `res/`（8 張）＋安全區量測 |
| 7 | sprite missing count | **通過** | `sheets/`：27/63/219，missing 全為 `[]` |
| 8 | frontend smoke | **通過** | `npm run test:frontend` 59/59，exit 0，無 `__GAME_ERROR__` |
| 9 | before/after ART-01..06 總評 | **4 成立／2 部分成立** | 見下節逐項 |
| 10 | 回歸抽查（frost/verdant/void 未動生態） | **通過（強證據）** | 固定種子地圖雜湊比對＋`gate-biome-before-after-seed11.png` |

---

## Gate 1 — 角色輪廓辨認：縮小範圍通過

**客觀量測**：以 contact sheet 逐格像素比對，確認**恰好 5 格**改變，就是審核點名的 5 名：
`hunter / shadow / g_revenant / h2_voidcaller / h3_plague`，其餘 22 名逐位元不變。
墨水覆蓋率（cell 內非背景像素比例）：

| 角色 | before | after |
|---|---|---|
| hunter | 0.322 | 0.537 |
| shadow | 0.297 | 0.443 |
| g_revenant | 0.340 | 0.561 |
| h2_voidcaller | 0.249 | 0.478 |
| h3_plague | 0.240 | 0.531 |

以 ART_SPEC §1 的自身判準（畫布實心像素 ≥55%）量測 27 名角色：**全部通過**（最低 pyro 0.573，最高 h3_plague 0.892）；
可視高度 17–18 px，同級距偏差 **1 px ≤ 2 px** 符合。

附帶（低）：ART_SPEC §1 表中「英雄可視高度 14–16 px」與實測 17–18 px 不符——27 名全部落在表定範圍外。
這是規格表寫錯而非實作錯，建議下次改規格時修正，否則後續輪次會拿一條無法通過的判準做驗收。

**判斷標準**：看 `cmp-chars-rebuilt-5.png`（4× 並排）與 `cmp-batch-consistency.png`，以「臉部可辨、武器/職業符號進入輪廓層、3 階以上明暗」三點目視。
5 名重建角色三點全中；baseline 版本三點全缺（h2_voidcaller 甚至不是完整人形）。

**為何是「縮小範圍」而非「通過」**：ART-01 驗收原文是「**27 名角色**可僅靠輪廓／主色辨認」。
`cmp-batch-consistency.png` 下排顯示未處理的 `ranger / g_ranger / h4_gravekeeper / h3_dragoon / h2_warlock`
仍是 2 階平塗、武器不在輪廓層（`ranger` 是純綠色塊、單眼、弓只是浮在旁邊的一根棒）。
本輪把 5 名從最薄的一端拉到最厚的一端（0.443–0.561 vs 未處理者 0.315–0.355），**批次差異方向反轉但沒有消失**。
27/27 尚未達成，屬後續批次範圍，不是本 slice 的失敗。

## Gate 2 — 密集戰鬥可讀性：部分退回

我重跑了自己的壓力景（`gate-stress-*`），因為既有 `w1b-after` / `w2d-after` 證據都**沒有 elite、也沒有真 Boss**
（`tools/_wf_evidence.mjs` 的 stress 只 spawn `!d.boss` 的一般敵人）。
我的版本放 54 一般＋6 elite＋真·生態終 Boss（`g_plagueheart`）並讓它跑出真實 boss_move telegraph（108 幀有 beam）。

**通過的部分**：
- **Boss 一秒定位**：`gate-stress-crypt-boss-elites.png` 右上，最大體積＋橘色 1px rim＋地面接觸環，60 隻雜兵中毫無爭議。
- **Boss 攻擊來源／所有權**：程式層確認 `#ff5a3c/#ff8a50` 只由 `src/game/content/boss_moves.js` 使用、
  `#ffc23c/#ffd75a` 只由 `src/game/scenes/run/events.js` 使用、武器一律冷色（`P.ice/iceD/shardL`）；
  `BEAM_STYLE` 另給 5/4/3 px 與 10/8.5/7 箭頭三檔。`w1b-after/w1b-boss-ring-rim-detail.png` 目視三族同框可分。
- **關閉粒子仍見警示**：`gate-stress-crypt-p-off.png` 與 `w1b-particles-off-warnings.png` 中，
  boss beam、event beam、地面環、拾取物全在；程式層 `world.js draw()` 也確認這些不在 particle layer。

**退回的部分（附具體失敗情境）**：

**2-1｜高｜`src/game/world.js:795-808` + `src/game/balance.js:203-205` — 60 隻敵人時玩家完全消失。**
量測：玩家在螢幕 (640,360)，`SURROUND_R=14` 內有 **19** 隻敵人（門檻 `SURROUND_N=4`，beacon 確實觸發），
且有 **18** 隻敵人 y 大於玩家、在 y-sort 中畫在玩家之後並直接蓋住玩家身體。
beacon 是 `alpha 0.25–0.45` 的白色 tint 疊在同一位置，疊在彩度雜亂的怪堆上讀不出來；
`PLAYER_RING_A=0.12` 的地面環半徑 20px，被站在上面的敵人完全遮蔽。
失敗情境：魂牢／surround ring 事件或高威脅波次，玩家被 15 隻以上敵人貼身包圍時，畫面上找不到自己的角色。
證據：`zoom-gate-player-buried.png`（3× 放大，玩家在正中央）、`gate-stress-crypt-ANNOTATED.png`（洋紅圈標出玩家位置）。
ART-02 驗收「1 秒內指出玩家」不成立。
誠實補充：這是 54 隻在 48px 環內同時收斂的人為極端，比自然節奏密；但「50+ 敵人」正是審核指定的驗收情境。

**2-2｜中｜`src/game/enemy.js:42` — 41/63 敵人的 elite 拿不到金色 tint。**
`this.tint = def.tint ?? (this.elite ? P.gold : null)`；實測 63 個敵人 def 中 **41 個自帶 `tint`**，
這 41 種的 elite 只剩 1.35× 體積＋同色 glow 由 0.18 提到 0.32；沒有 crown（crown 只給 `guardian`）。
失敗情境：`s_gnat`（tint `#7ee787`）的 elite 與一般個體在怪潮中只差 35% 體積與微幅光暈，
玩家無法在不看血條的情況下完成 normal/elite/boss 三階排序。
證據：`gate-tier-lineup-crypt.png`（`wisp` 無 tint，elite 金光可辨，屬 22/63 的少數情形）、`zoom-gate-elite-vs-normal.png`。
ART-02 驗收「三階排序」對 41/63 敵人不成立。
範圍註：此為 R28 前既有行為，本輪未觸碰；列此是因為 gate 清單要求判定該驗收條件，不是指控本輪造成。

**2-3｜中｜`tools/_wf_evidence.mjs:213` — 證據工具會產生偽陽性。**
註解寫「a boss-style telegraph beam」，但傳入 `P.emberL` = `#ffd479`，
依 ART_SPEC §3 那是**事件/場地琥珀族**（與 `BEAM_FAM_EVENT[1] #ffd75a` 幾乎同色），不是 Boss 紅橙族。
失敗情境：後續輪次用 `stress` 產圖來「驗收 Boss telegraph 所有權」會得到一張其實是事件族 beam 的圖，誤判為通過。
`w2d-after/stress-*.png`、`baseline/stress-crypt-*.png` 中那條米黃色線都是此問題。

## Gate 3 — 圖示文法：縮小範圍通過

**六類框（機械驗證，非目視）**：對全部 219 個圖示取 16×16 alpha mask 並分組雜湊：

| 類別 | 圖示數 | 相異 mask 數 |
|---|---:|---:|
| weapon | 43 | 1 |
| ability(passive) | 56 | 1 |
| item | 28 | 1 |
| equip | 60 | 1 |
| talent | 20 | 1 |
| facility | 12 | 2 |

六個 mask **兩兩互異**（Hamming 26–72 / 256）。`defineIcon` 以名稱前綴自動推斷類別，
因此 219 個全部帶類別框，不是只有重繪的 21 個。
16×16 縮圖仍可辨（`zoom-icon-grammar-corners.png` 右側小圖、`gate-icon-frame-masks.png`）。
灰階下同樣可辨（`zoom-icon-grammar-grey.png`）。**這一項通過。**

**base/evo**：gate 指定的兩對（`w_soulbolt→w_soulstorm`、`w_aura→w_inferno`）在 32×32 一眼可分，
且都加了第二層形狀（環／裂變爆形），符合 ART_SPEC §5「禁止只換光效或框色」。

**3-1｜中｜10 對 evo 中有 2 對只換色。** 見 `gate-evo-pairs-32px.png`：
- `w_h4_gravescythe → _evo`：同一把鐮刀，綠→紫，只多兩顆藍方塊。
- `g_scatter → g_scatter_evo`：同一個槍管，灰→黃。

失敗情境：玩家在升級卡上看到 `g_scatter_evo`，會以為是同一把武器的變色版而非進化；
ART-06 驗收「所有進化對在 32×32 下可一眼區分」不成立。

**3-2｜低｜kira 稀有度冗餘尚未建立。** kira 星改 opt-in 後只有 **13 個** call site 帶 `kira: true`
（commit 訊息自陳「示範 12 處」），ART_SPEC §5「rare 以上保留 kira」目前只覆蓋極少數稀有圖示。

## Gate 4 — 灰階：通過

`gate-greyscale-320x180-6biomes.png`（真灰階 L 通道 → LANCZOS 縮至 320×180）。
判斷標準：只看明度與形狀、不看色相，問「這三張互相能不能分」。
- crypt：全場最暗、方塊化石造牆、可見陵墓地標與墓碑 → 可辨
- celestial：全場最亮、十字/星點紋、雲階地標 → 可辨
- desert：中明度、階梯狀砂岩台地、獅身像地標、仙人掌 → 可辨

三張互辨無爭議，且每張都有 ≥3×3 tile 的非色彩地標落在開場視野內（ART-04 驗收要求）。
對照組 frost / verdant / void 也一併轉灰放進同一張供比例尺。
（ART-04 的「10 生態 ≥8/10」是 W5 全生態驗收項，不在本 slice 範圍。）
icons 灰階版複核見 Gate 3。

## Gate 5 — 三色覺模擬：通過（附 W5 待辦）

方法：sRGB → 線性光 → Machado(2009) severity 1.0 矩陣 → 回 sRGB（不是簡易 RGB 通道混合）。
輸出 12 張於 `gate/cvd/`（stress-crypt / stress-desert / sortie × protan/deutan/tritan ＋ 灰階）。

通過依據：
- **Boss**：三種模擬下都靠「最大體積＋rim 輪廓＋地面環形狀」可辨，不依賴紅橙色相。
- **Beam 所有權**：Boss 族與 Event 族在三種模擬下的分離度**不低於正常視覺**：

| 對比 | normal | protan | deutan | tritan |
|---|---:|---:|---:|---:|
| BOSS_A vs EVT_A（平均通道差 /255） | 34.7 | 57.3 | 40.0 | 72.0 |

  主要載體是**明度**（BOSS_A 相對亮度 0.289 vs EVT_A 0.602，約 2×），再加上 `BEAM_STYLE` 的 5/4 px 線寬差。
- **選取狀態**：`sortie` 面板已選卡同時用青色外框＋較亮底色雙重編碼，deuteranopia 下仍可指認。

**列入 W5 的待辦（不擋本 gate，因 ART_SPEC §9 已明訂 ART-09 殘部留到最終回歸）**：
- **5-a｜中**：protanopia/deuteranopia 下玩家的青色與 `ice` 系敵人同時退為藍白（`#aee9ff → #dce5fe`）。
  失敗情境：frost/crypt 有冰系雜兵時，玩家原本靠「全場唯一青色」定位的線索失效——與 2-1 疊加成雙重失效。
- **5-b｜中**：沙漠地板 vs 綠色魂晶拾取物對比 **1.61:1（正常）→ 1.52:1（deuteranopia）**，
  遠低於非文字圖形的 3:1。失敗情境：流沙荒漠掉落的魂晶被沙地吃掉，玩家漏撿。（正常視覺已偏低，不是 CVD 才發生。）
- **5-c｜低**：血條紅色在 protanopia 下退為暗橄欖，與空槽底色明度接近；靠填充邊界仍能讀出比例，但對比偏弱。

## Gate 6 — 四解析度：通過（並補上審核未驗證的 2560×1440 全高）

自寫 Playwright 腳本，四個 viewport 各截 `title` 與 `sortie`，
**headless 下顯式呼叫 `renderer.resize()`**（W1 代理踩過的 `view.W=0` 坑）。輸出 `gate/res/`（8 張）。

| viewport | canvas | view.W×H | uiScale | 錯誤 |
|---|---|---|---:|---|
| 1280×720 | 1280×720 | 1280×720 | 1.059 | 無 |
| 1366×768 | 1366×768 | 1366×768 | 1.129 | 無 |
| 1920×1080 | 1920×1080 | 1920×1080 | 1.588 | 無 |
| **2560×1440** | 2560×1440 | 2560×1440 | 2.118 | 無 |

5% 安全區量測（中央 60% 欄帶內最低一列 UI 文字距底距離）：

| 畫面 | 1280×720 | 1366×768 | 1920×1080 | 2560×1440 |
|---|---|---|---|---|
| title | 6.81% | 6.90% | 6.94% | **6.94%** |
| sortie | 5.69% | 5.60% | 5.56% | **5.62%** |

四段全部 ≥5%，**含審核因瀏覽器 chrome 限制而未能宣稱的 2560×1440 全高**。
無溢框、無文字截斷、無破版；`canvas.width == viewport width`（1:1 device pixel，結構上不可能整體模糊）。

低嚴重度觀察（非本輪造成，`src/game/scenes/title.js` 本輪未被修改）：
- **6-a｜低**：標題 sprite 的橫向像素 run 長度在 2560 下為 `10,10,10,11`、1280 下為 `6,5,5,5`
  ——非整數倍縮放造成 1px 不等寬像素塊。無中間色（不是模糊），只是像素格不齊。ART-12 屬 P3。
- **6-b｜低**：角色卡描述換行以單字元推進（`src/game/scenes/hub/render_personal.js:166`），
  會把 `+30` 與 `%` 拆到兩行（奧術秘士卡在四個解析度都會發生）。失敗情境：掃視時誤讀為「範圍 +30」。

## Gate 7 — sprite missing：通過

`node tools/_wf_evidence.mjs sheets` → `gate/sheets/`：
`characters 27 / enemies 63 / icons 219`，三者 `missing` 皆為 `[]`。

## Gate 8 — smoke：通過

`cd test && npm run test:frontend` → **59/59 assertions passed，exit code 0**，
各階段結尾皆斷言 `no __GAME_ERROR__`。
registry 計數未變（27/63/…），故 `test/frontend-smoke.mjs` 的 `REG_BASELINE` 無需更新，符合 CLAUDE.md 規定。

## Gate 9 — before/after ART-01..06 總評

| ID | 改善是否成立 | 一句話判定 |
|---|---|---|
| ART-01 | **部分成立** | 審核點名的 5 名角色 + reaper + boss_pillar 確實重建且明顯變厚變可辨（`cmp-chars-rebuilt-5.png`、`cmp-enemies-changed.png`），但「27 人收斂」未達成，批次落差方向反轉。 |
| ART-02 | **部分成立** | 分層／beam 色族／Boss 環與 rim 都真的落地且關粒子仍可見；但「一秒定位玩家」與「三階排序」兩條驗收仍不成立（見 Gate 2）。 |
| ART-03 | **成立但未收尾** | 見 9-1。 |
| ART-04 | **成立** | 固定種子 before/after 對照（`gate-biome-before-after-seed11.png`）顯示三生態各得地標、牆 variant、群聚地板；灰階 320×180 互辨通過。 |
| ART-05 | **成立（品質好，覆蓋率低）** | 6 張肖像風格、光源、裁切、性格動作統一，品質是本輪最強產出（`gate-portraits-6.png`）。見 9-2 / 9-3。 |
| ART-06 | **成立** | `gate-icons-before-after.png` 對比極明顯：before 219 個全是同一個圓角方框＋左上 kira，after 六類框各有語法且 common 的 kira 已移除。 |

**9-1｜中｜UI 字級 token 遷移未涵蓋 `title.js` 與 `coop.js`。**
`UI.FONT_*` 已有 **416** 處採用，天賦/鐵匠等高資訊面板確實走 token；
但 `src/game/scenes/title.js`（0 處）與 `src/game/scenes/coop.js`（0 處）未遷移，
仍有 7 處低於 ART_SPEC §4.1 自訂的 10.5 下限：
`title.js:570`（size 9）、`title.js:584`、`title.js:603`（size 10）、
`coop.js:257`、`coop.js:344`、`coop.js:356`（size 10）、`coop.js:351`（size 9.5）。
失敗情境：標題畫面更新日誌 overlay 的「最新」徽章在 1280×720 實際約 9.5 device px，
低於全案最小字級，而那是曝光最高的首屏。

**9-2｜中｜`assets/portraits/ranger.png` 與 `ranger` 的 sprite 配不起來。**
主色相差 **76.6°**（sprite 綠 114.6° vs 肖像棕橙 38.0°），且造型不同
（肖像是戴寬邊帽的人類獵人，sprite 是無臉綠色塊狀生物）。見 `gate-portrait-vs-sprite.png`。
失敗情境：ART-05 驗收「無名稱的 portrait 與 sprite 可正確配對 ≥80%」——
盲測 6 張中 5 張可配（83%，剛過線），`ranger` 是唯一且不邊際的失敗；
違反 ART_SPEC §8「色盤對齊該角 sprite 主色」。
（`stormcaller` 量測出 166.6° 是度量假影：肖像藍＋金、sprite 藍袍＋金杖，目視可配，不算失敗。）

**9-3｜低（範圍）｜出擊面板同頁混排兩種卡型。**
`zoom-sortie-cards.png` 第三列：同一頁 3×3 內同時有「厚塗肖像卡」與「16×18 小 sprite 卡」。
失敗情境：玩家一眼看到 6 張精緻卡與 3 張看似未完成的卡，21 名無肖像英雄被襯托成佔位圖。
這是 6-of-27 切片的預期副作用，屬範圍問題不是缺陷，但發佈前不應停在此狀態。

**9-4｜中｜證據完整性：checked-in 的 baseline 圖示 contact sheet 不可比對。**
`docs/reviews/art-improve-2026-08/baseline/sheet-icons-768x1052.png` 表頭自述 **187 entries**，
但以現行工具重跑同一 commit `430443c` 得到 **219**（`gate/sheets-baseline/`）。差額 32 = talent 20 + facility 12。
失敗情境：用這張 baseline 做 ART-06 before/after 比較，會**恰好漏掉 W2-F 新增框型的兩個類別**
（天賦上尖飾、設施梯形），使「改善成立」的證據鏈斷裂。已重拍可比對版本置於 `gate/sheets-baseline/`。
同理，`baseline/` 只有 crypt 一張 in-run 截圖，desert / celestial 完全沒有 before，
已用臨時 worktree（430443c）補齊 `gate/seeded-before/`。

## Gate 10 — 未動生態回歸：通過（強證據）

不只目視。以**固定種子**在兩個 worktree 各跑 `generateWorld()` 並分欄雜湊。
（關鍵：必須同時覆寫 `Math.random` **與** `rng.next`——後者在 `src/engine/math.js:70` 於模組載入時
捕獲了原始 `Math.random`，只改前者會失效，我第一次量測就是被這個坑污染成「全部 DIFF」的假結論。）

| biome | tiles | floorVar | decor | decals | 範圍 |
|---|---|---|---|---|---|
| crypt / desert / celestial | SAME | DIFF | DIFF | DIFF | W2-D 目標（預期變） |
| cavern / frost / inferno / void / verdant / swamp / abyss | SAME | **SAME** | **SAME** | **SAME** | 對照（逐位元不變） |

commit `efc7f84` 自稱「其餘 7 生態逐位元不變」——**獨立複驗成立**。

平鋪規律量化（1-tile 位移自相關 dip%，同種子 4 seeds 平均，越低越無 per-tile 重複）：

| biome | before | after | Δ | 範圍 |
|---|---:|---:|---:|---|
| crypt | 15.2% | 10.6% | -4.6pp | W2-D |
| celestial | 45.6% | 27.8% | **-17.8pp** | W2-D |
| desert | 19.3% | 14.8% | -4.6pp | W2-D |
| frost | 28.8% | 28.9% | +0.2pp | 對照 |
| verdant | 30.3% | 30.6% | +0.3pp | 對照 |
| void | 31.4% | 31.7% | +0.3pp | 對照 |

對照組的 ±0.3pp 就是量測雜訊底線；三個目標生態的改善遠超雜訊，ART-11 改善為真且對照組零回歸。
目視複核 `gate-biome-before-after-seed11.png` 右三格：frost / verdant / void 的 before/after 版面一致。

**10-1｜低（存疑）｜celestial 殘留最多。**
celestial 改善幅度最大，但 after 的 27.8% 仍與**未處理**的 frost/verdant/void（29–32%）同一量級。
目視在 `zoom-celestial-floor-patches.png` 可見星點紋在 tile 邊界附近有重複感
（不是逐位元平鋪：1-tile 位移下僅 52.5% 像素相同）。
失敗情境：天界雲海長時間跑圖時，地板星點的 tile 節奏仍可能被察覺；
ART-11「2 秒內指不出相同 3×3 重複」在 celestial 上信心最低。標「存疑」而非斷言。

## 附帶的程式面審查（非 gate 項，順帶查證）

- **已查證非問題**：`src/game/player.js:250` 移除 `Player.draw` 尾端的 `this.drawWeapons(world)`，
  改由 `src/game/world.js:841` 在 layer 5 呼叫。co-op guest 場景 `src/game/scenes/coop.js:302`
  直接呼叫 `pl.draw(this.world)` 且**不**呼叫 `drawWeapons`——但 `coop.js:50` 把每個 guest 端 avatar 的
  `weapons` 設為 `[]`，故無回歸。
- **低**：`src/game/enemy.js:290` Boss rim 條件為 `this.boss && this.flash <= 0`：
  Boss 受擊閃白的 0.3 秒內 rim 消失。影響輕微（白閃本身是更強訊號）。
  `boss_pillar` 無 `boss:true`，不會被 rim 的 4 次額外 blit 放大成效能問題。
- **低（潛在陷阱）**：`src/game/world.js:271` `addBeam(..., color = P.emberL)` 的**預設值**是琥珀 `#ffd479`，落在事件族。
  目前 13 個呼叫端全部顯式傳色，無現行違規；但未來新增武器若漏傳顏色，
  會靜默取得事件族的 4px 樣式與琥珀色，違反 ART_SPEC §3「武器禁用紅橙與琥珀」。建議預設改冷色或改必填。
- **低**：`src/game/ui/portraits.js:19` 對未提供肖像的 21 名英雄各觸發一次 404。
  同源請求，不破壞「零第三方請求」不變式，也不會 crash（`onerror` 有快取旗標，不重試）。
  建議改用明確的 id allowlist，避免出擊面板首次開啟時噴 21 個 404。

## 環境限制／未能驗證

- ART-02 驗收原文要求「5 位未看說明的測試者、10 秒錄影」。我只能提供單幀靜態證據與可量化的遮擋統計
  （18 隻敵人畫在玩家之後），**無法代替真人測試**；Gate 2 的「一秒定位玩家」判定是基於靜態畫面與遮擋計數的推論。
- `boss_pillar` 的三階段裂損只能從 `frames=3` 確認存在，contact sheet 僅顯示第 0 幀，未逐幀目視。
- 室內（ART-07）、DOM/Canvas 語彙（ART-08）不在本 slice 範圍，未審。
