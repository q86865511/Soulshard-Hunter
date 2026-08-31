# R28 美術改善輪 · 最終驗收報告

> 審核基準：`430443c`（Codex 第一階段審核 `docs/reviews/ART_AUDIT_2026-08-26.md`，66/100）
> 本輪分支：`claude/soulshard-hunter-art-lead-5d399b`
> 權威規格：`docs/art/ART_SPEC.md`（本輪建立並經三次事故修訂）
> 逐輪細節：`docs/changelog/ROUND28.md`；回歸證據：`final/FINAL_REGRESSION.md`

## 一、Finding 逐項判定

| ID | 原級 | 判定 | 依據 |
|---|---|---|---|
| ART-01 角色/敵人尺度 | P1 | **部分通過**（2026-08-30 複審後由架構師自行下修，原判定為「通過」） | **尺度面達標**：27 角色＋63 敵人全部對齊尺度階梯、填充率 ≥55%（最低 s_gnat 41.7%→61.8%）、def 零變動。**輪廓面未達標**：僅 5 名角色整隻重建，17 名只做值階/陰影微調（墨水覆蓋率不變）、5 名完全未動——原審核的驗收條件含「無名稱輪廓辨認」，填充率達標不等於輪廓達標。續辦見 RE-01 |
| ART-02 密集戰鬥辨識 | P1 | **通過** | 八層 draw-order（pickup 脫離 actor y-sort、武器 VFX 獨立層）、beam 三族所有權（Boss 紅橙5px/事件琥珀4px/玩家冷色3px，零協定變更）、Boss 地面環＋暖描邊、elite 金描邊獨立於 def.tint、glow/粒子預算；61 敵壓力景玩家仍是唯一白環＋冷白光池 |
| ART-03 高資訊 UI 字級 | P1 | **部分通過**（同上下修） | token 化與下限 10.5 達標；但選角卡沿用**逐字元**貪婪換行（`render_personal.js` drawSortie），會把 `+0.3`／`-10%` 攔腰切斷，在第一個高曝光決策點反而最難讀。續辦見 RE-02 |
| ART-04 生態身份 | P1 | **通過** | 10/10 生態各有 4 類牆 variant＋2 大型地標＋環境動態＋vnoise 群聚地板＋地平線邊界；灰階 320×180 十格互辨 **10/10** |
| ART-05 角色肖像層 | P1 | **大致通過**（同上下修） | 27/27 肖像品質與載入層達標；但**全案只有一個呼叫點**（`render_personal.js:142` 出擊卡），個人頁主視覺仍是放大 sprite，最貴的資產只在一條流程發揮。續辦見 RE-03 |
| ART-06 圖示同質 | P1→實際 | **通過（曾整批退回一次）** | 219 圖示重繪為具體物件；四批各經「計畫表→查重→32px 並排自證」；kira 由 55% 收緊至 10% |
| ART-07 室內敘事 | P2 | **通過** | 六房放大至 ≥31×19 並修正**真根因（相機不 clamp）**；每房焦點動態設施＋≥3 敘事物件＋前景層＋專屬地磚；裸地板 30-40%、鏡像 0-16%；六門進出 BFS 可達性回歸全過 |
| ART-08 DOM 風格斷層 | P2 | **通過** | 兩份近親 CSS 合併為 `:root` token 表（實測 border 2px / radius 10-7px / font 13px 兩檔一致）、四態統一、emoji 全數改 inline SVG、區段標題改 Canvas 標題帶對應 |
| ART-09 色覺與明度 | P2 | **通過** | 三色覺模擬納入 gate 與最終回歸；本輪最後一個缺陷（亮背景光束 <3:1）已修至 **5.56-5.78:1**（三種色覺皆是） |
| ART-10 低資訊 overlay | P2 | **部分通過** | 字級/權重與按鈕已 token 化、過小字全數提級；**三檔密度 layout template 未實作**（見延後項） |
| ART-11 平鋪規律 | P2 | **通過** | 地板 variant 由均勻 rng 改 vnoise 群聚、decal 群聚化、run biome 首次取得牆 variant；v2 特徵磚以「種子顆粒＋滾動種子」解掉單張必成格的結構性問題（10 生態全數套用） |
| ART-12 標題拋光 | P3 | **通過** | 九人隊伍尺度/接地一致化、統一左上 rim light、底部資訊改安全區錨定；四解析度（含 2560×1440 真全高）皆在 5% safe area；構圖零改動 |

**延後項（明確不做，非遺漏）**
- ART-10 的「低/中/高三檔 layout template」：字級層面的病症已解，但版面重構牽涉每個面板的座標系統，風險與收益不成比例，建議獨立輪次處理。
- 其餘 7 生態的 v0 固定紋母題（frost 裂紋線、desert v0 風紋、abyss 焦散）：v2 已解，v0 屬同類但影響較小。
- `equip_leather_armor` 之外的個別圖示微調：已達可辨門檻，屬持續打磨範疇。

## 二、本輪的三次事故與修正（誠實記錄）

1. **圖示批整批退回**：W3-B1/B2 把「類別 silhouette 文法」執行成「同類別＝同一輪廓」，把 baseline 原本各異的皇冠/沙漏/瓶罐壓成單一模板，只剩顏色區分——比改之前更糟。根因是 ART_SPEC 第 5 節措辭。處置：B2 捨棄、B1 檔案層回退、規格補鐵律方框＋強制「先列具體物件計畫表並查重」流程，四批重做後通過。
2. **主迴圈操作失誤**：還原 B2 時誤用目錄層級 `git checkout -- src/game/content/gen/`，連帶抹掉 A3 未提交的 11 敵人＋2 角色微調。已照原自檢紀錄重做補回。教訓：混合批次的工作樹只能用精確檔案路徑還原。
3. **Codex stdin 卡死**：heredoc 與 `codex exec` 同條指令會耗盡 stdin 使其永久等待（任務不退出也不報錯，浪費約 4 小時）。已寫回 `~/.claude/docs/codex-notes.md`。

## 二之二、設計檢查工具（impeccable）三則發現的處置

| 發現 | 處置 | 理由 |
|---|---|---|
| `social.js` 區段標題 3px 左側強調條 | **修正** | 早於本輪，但 ART-08 範圍含「統一標題帶」；改為 Canvas `drawPanelFrame` 的 DOM 對應（全寬填色帶＋底線＋上圓角） |
| `.net-card h2`／`.sl-card h2` 鏤空漸層標題 | **修正** | 早於本輪，但 Canvas 面板標題是純白實色（`hub/render.js` `color:'#fff'`），漸層使 DOM 讀起來像另一個產品——正好違反 ART-08 的驗收條件本身。改純白，保留魂晶輝光 |
| `index.html` 載入進度條 `transition: width` | **判定誤報，保留原樣** | 寬度是進度條的語義屬性；該元素獨處 fixed 覆蓋層、頁面尚無其他內容，無 layout thrash 成本；背景為橫向漸層，改 `transform:scaleX` 會拉伸變形。未加抑制註解 |

## 三、驗證狀態

- `npm run test:frontend`：**59/59**（每批次與最終皆跑）
- co-op 三自測（`coopRoundTrip`/`coopSilenceTest`/`coopBossSyncTest`）：全過
- sprite registry：characters 27／enemies 63／icons 219，**missing 全為 `[]`**
- `__GAME_ERROR__` 空、無 uncaught page error
- 協定 `src/game/net/protocol.js`：**diff 為空**（Codex 第二審以 SHA 獨立驗證）
- gameplay 數值：enemy/weapon def 的 hp/speed/damage/radius/scale/tier 等逐檔 grep 證明零變動
- Git：31 commit，經 PR [#83](https://github.com/q86865511/Soulshard-Hunter/pull/83) 合併進 `main`；CI 兩項全過（frontend 58s／server 6m38s），合併觸發 Oracle 自動部署

## 四、未能驗證項（不宣稱通過）

- ART-02 驗收條件中的「5 位真人測試者 10 秒錄影」：以遮擋計數與可見墨水比例的客觀量測替代。
- 動態時間感（動畫節奏是否好看）：靜態證據無法涵蓋。
- `boss_pillar` 三階裂損：僅確認 `frames=3` 存在，未逐幀目視。
- 商店稀有度框：庫存為 0，改以自然升級三選一驗證。
- 高 DPI 分支未測。

## 五、交接注意

1. **證據體積**：`docs/reviews/art-improve-2026-08/` 約 144MB，`.git` 已達 228MB。肖像原稿與概念圖已降採（72MB→7.8MB），但**歷史中仍留有原尺寸物件**——若要真正縮小倉庫，需在合併前 squash 本分支（屬改寫歷史，留待決策）。
2. **手改 gen 檔清單**已更新於專案 `CLAUDE.md`：重跑 `tools/integrate.mjs` 會覆蓋 R28 的 beam 色族、h3_plague 重繪、三生態地標、圖示重繪等，必須重套。
3. **`tools/_wf_evidence.mjs` 的 stress 模式只跑 1 幀**（回歸批發現），敵人停在 spawn telegraph，不足以驗證密集可讀性；後續輪次應補 pump 幀數再截圖。
4. 新增的美術慣例已寫入 `CLAUDE.md`：rgba 字串不可餵 `glow/aura/star4`（NaN→墨塊）、`lighten/darken` 吃 0-1 非百分比。


## 六、2026-08-30 複審後的判定校正（架構師自述）

外部複審（`docs/reviews/ART_REAUDIT_2026-08-30.md`，66→79/100、無 P0/P1）指出本報告三項判定過於寬鬆，
我逐項查證後**全部接受並已於上表下修**：

- **ART-01**：我把「尺度階梯達標」當成整個 Finding 達標，但原審核的驗收條件寫的是「無名稱角色輪廓辨認」。
  本報告第四節其實已誠實列出 5 重建／17 微調／5 未動的事實，**但仍在判定欄寫「通過」——標籤與事實不符，
  這是我的判斷失誤**，不是紀錄不實。
- **ART-03**：逐字元換行切斷數字 token 是實際缺陷（已定位到 `render_personal.js` drawSortie 的
  `line + rest[0]` 貪婪迴圈），當時未納入驗收。
- **ART-05**：`grep` 證實 `drawPortrait` 全案僅 1 個呼叫點，「出擊卡整合」不等於「高曝光介面整合」。

後續工作依複審建議拆為四批（角色展示系統／UI 密度與排版／獨立驗證／末端拋光），於 R29 進行。
