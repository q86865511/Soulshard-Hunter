# 魂晶獵手 · Soulshard Hunter

一款以原生 HTML5 Canvas + ES Modules 製作的單機 roguelike 像素生存遊戲（Vampire-Survivors 風格）。
**所有美術都是程式即時生成的像素畫（無外部素材），所有音效/音樂都是 WebAudio 合成的。**

**只需走位、武器自動攻擊**；探索多種生態大地圖、敵人不斷湧出，升級選武器與被動、滿級進化合成；帶回的金幣在城鎮解鎖角色、天賦與設施。

## 執行方式

不需安裝套件，只要一個靜態伺服器（ES Modules）。專案附了一個無快取的 Node 伺服器：

```bash
# 在專案根目錄
node tools/serve.mjs
# 然後瀏覽器開 http://localhost:5173
```

（開發時也可用 Claude 預覽工具，設定已在 `.claude/launch.json`。）

## 操作

| 按鍵 | 動作 |
| --- | --- |
| `WASD` / 方向鍵 | 移動（武器自動瞄準開火，無需手動攻擊） |
| `Shift` | 衝刺（短暫無敵） |
| `1`~`4` | 使用道具欄物品 |
| `E` | 互動（商店購買 / 城鎮站點） |
| `Esc` | 暫停選單 / 設定 |
| `M` | 靜音切換 |
| 城鎮：`1` 天賦 / `2` 設施 / `空白` 出擊（選角色） |

## 遊戲循環

1. **城鎮（Hub）**：可走動的營地。用金幣在「天賦祭壇」買 4 系永久天賦、在「設施工坊」蓋設施；走向「傳送門」**選擇角色**出擊（角色用金幣或達成成就解鎖）。
2. **生存（局內）**：在大型生態地圖中走位求生 —— 敵人不斷從畫面外湧出且持續變強。撐過該區的存活計時（或擊敗首領）即開啟出口，前往**下一種生態**（地穴 / 水晶洞窟 / 冰原 / 熔岩 / 虛空…，每 5 區為首領關）。
3. 升級可三選一：**新武器 / 武器升級 / 被動**；武器滿級且擁有對應被動可**進化合成**。寶箱（含隱藏寶箱）與商店（魂晶）提供裝備與道具。首領有多階段招式（彈幕、召喚、狂暴）。
4. **死亡**：結算分數並進入排行榜，帶回的金幣存入金庫用於永久成長。越死越強。

## 內容規模

核心內容 + 多輪 **dynamic workflow（多代理工作流，生成→審查兩階段）並行生成**，全部含程序化像素美術：

| 類別 | 數量 |
| --- | --- |
| 敵人（含 **5 名多階段首領**） | **35** |
| 自動武器（含進化合成） | **24** |
| 可玩角色 | **12** |
| 被動能力 | 37 |
| 裝備 | 23 |
| 道具 | 14 |
| 天賦 | 20 |
| 設施 | 11 |
| 生態 tileset | 5 |

## 系統

- 走位自動攻擊、多武器同時開火、武器升級與進化合成
- 多角色（被動 + 起始武器 + 解鎖條件）
- 開放大地圖、多生態、持續出怪、生存計時、首領多階段
- 城鎮永久成長（天賦樹 + 設施）、金幣經濟、隱藏要素
- 設定（音量/震動/靜音）、暫停選單、分數排行榜、小地圖、武器/被動 HUD

## 架構

```
index.html                      Canvas + 載入畫面 + 全域錯誤攔截
src/
  main.js                       啟動：接線引擎/內容/場景，主迴圈
  engine/                       與遊戲無關的引擎層
    loop.js  math.js  input.js  renderer.js(相機/世界↔螢幕/UI)
    palette.js  sprites.js(程序化像素繪圖 API + 註冊表)
    particles.js  audio.js(WebAudio 合成音效/音樂)
  art/                          程序化美術（sprite 定義）
    core.js  icons.js  content_icons.js  hub.js
    gen/                        ← workflow 生成的美術（自動整合）
  game/
    state.js                    存檔/局外 META、局內 run 狀態、數值
    scene.js  scenes/           場景：title / hub / run（+ refs 解耦）
    world.js  floor.js          地城世界（磚塊碰撞/實體/戰鬥）與樓層生成
    player.js  enemy.js  projectile.js  pickup.js
    hud.js
    content/
      registry.js               ← 所有內容的註冊表（整合接縫）
      enemies/abilities/items/equipment/talents/facilities.js  核心內容
      gen/                      ← workflow 生成的內容（自動整合）
tools/integrate.mjs             把 workflow 輸出（JSON）寫成可載入的檔案
```

### 如何擴充內容

內容與美術完全資料驅動：

- **新敵人**：在 `src/art/...` 用 `defineAnim(name, w, h, frames, draw)` 畫 sprite，再到 `Enemies.register({ id, sprite, ai, hp, ... })`。AI 可選 `chase/flyer/shooter/charger/wander`。
- **新能力/道具/裝備/天賦/設施**：`Xxx.register({...})` 並用 `defineIcon('ability_'+id, bg, draw)` 等慣例命名圖示。

像素繪圖 API（`Painter`）：`px/rect/line/ellipse/ring/mirrorX/outline(...)` + 共用調色盤 `P` 與 `sym` 符號庫，確保風格一致。
