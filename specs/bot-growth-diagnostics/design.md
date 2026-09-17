# 設計：可稽核的成長診斷

## 接點
在工具 driver 的局內 world 實例包裝 addPickup／gainXp，對實際建立的拾取物包裝 collect／update。原方法使用 Reflect.apply 呼叫一次，回傳與例外不變；只讀取前後值。收集、逾期與其他消失採互斥終態。新局啟動前解除舊觀測器。
choice 由既有 driver 決策後，將已看到的候選與實際 index 交給觀測器；不額外產生隨機候選。移動情境以既有 view／輸出作每秒讀取，沒有額外 RNG。

## 聚合
每類拾取物保存 count／value 的 spawned、collected、expired、other、remaining；XP 以整數價值作守恆。
gainXp 按實際增量計入 credited；spent 為該呼叫前 XP＋增量−呼叫後 XP；outsideGainDelta = finalXP−initialXP−credited＋spent，保留例如竊取造成的局外變化，不硬湊零。
保留 level／choice 事件及 30 秒快照；高頻拾取事件採分桶延遲直方圖，避免每幀輸出。事件上限若觸發必須明記，診斷批次不能偷偷使用截斷資料。
共同窗口使用 0–30、30–60、60–90、90–120 秒，列每窗在險人數與實際暴露時間；全局數字另列，不能由幸存者資料推論一般玩家。

## 資料隔離
growth-v1 加入 manifest args 與記錄；普通 R31 行為預設不開診斷。拒絕以不同診斷版本續跑。
沿用既有單機循序子批次、parallel=4、fresh context、API abort、rAF stub 與 dt=1/120；新輸出目錄不混舊資料。

## 研究流程
第一批診斷 A/B 完整收集後再決定候選 C。候選、樣本數與判準先固定，再進行 A/C 先導及確認。
C 的具體規則尚未決定，不能用預期結論填入診斷報告。
