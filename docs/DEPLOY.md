# 《魂晶獵手》從零到上線 —— 完整上手指南(Oracle 雲端 + 自動部署 + 連線實測)

這份是**唯一的部署文件**,給「**第一次自己架伺服器**」的人看的完整導覽:從開 Oracle 主機、
設網域、SSH、用 Docker 部署、設定 HTTPS、接 CI/CD 自動部署,一路到**真的從外面連進來玩一場
多人合作**。每一步都附「💡 為什麼」幫你理解,不是只照抄。

> 只想看架構/設計與分階段路線?見 [`MULTIPLAYER_PLAN.md`](MULTIPLAYER_PLAN.md)。

**預估時間:** 第一次大約 1～2 小時(多半卡在等 Oracle 配額/憑證)。之後更新只要 `git push`。
**你會得到:** 一個公開網址 `https://你的網域`,任何人都能連進來註冊、玩、上排行榜、跟朋友連線合作;而且你每次 push 到 GitHub 它會自動更新。

---

## 0. 先看懂整體架構(這樣後面才不會迷路)

```
            (你的玩家,在世界各地)
                   │  https / wss
                   ▼
┌──────────────────────────────────────────────┐
│  Oracle 免費主機 (一台 Ubuntu VM,有公網 IP)      │
│                                                │
│   Caddy  ← 反向代理 + 自動 HTTPS 憑證             │
│    ├─ /            → 靜態遊戲檔(前端,直接給檔)   │
│    ├─ /api/*       → Node 後端(帳號/存檔/排行榜) │
│    └─ /rt (WSS)    → Node 合作中繼(同一支程式)   │
│                          │                      │
│                          ▼                      │
│                     PostgreSQL(帳號/存檔資料庫)  │
└──────────────────────────────────────────────┘
```

- **前端**(遊戲畫面)是純靜態檔,Caddy 直接餵給瀏覽器,**不需要編譯**。
- **後端**是一支 Node 程式,同時負責 REST API(`/api/*`)與即時合作的 WebSocket 中繼(`/rt`)。
- **資料庫** PostgreSQL 存帳號與雲端存檔。
- **合作怎麼運作?** 採「**主機權威中繼**」:開房的那位玩家的瀏覽器跑真正的遊戲模擬,把世界畫面廣播出去;伺服器只負責把訊息**轉發**給其他人。所以伺服器很輕,一台免費機就夠 1～3 人玩。

> 💡 **為什麼一定要網域 + HTTPS?** 瀏覽器在 `https://` 的頁面,只允許連到加密的後端(`https://` 與 `wss://`)。要有 `https`/`wss` 就要有 **TLS 憑證**,而憑證一定要綁一個**主機名(網域)**,不能只用 IP。所以流程是:公網 IP → 綁一個網域 → Caddy 自動申請憑證 → 全站 HTTPS。

**名詞速懂**:**VM**=雲端上的一台虛擬電腦;**公網 IP**=這台機在網路上的門牌;**網域/DNS**=把好記的名字指到那個門牌;**SSH**=用金鑰安全地遠端登入這台機下指令;**反向代理(Caddy)**=站在最前面的接待員,依網址把請求分給後面不同服務並負責 HTTPS;**Docker/容器**=把程式跟它的環境打包成一個盒子,「在哪都一樣跑」;**CI/CD**=你 push 程式後自動部署的機制。

---

## 1. 開一台 Oracle 免費主機(公網 VM)

1. 註冊 [Oracle Cloud](https://www.oracle.com/cloud/free/) 的 **Always Free** 帳號(要信用卡驗證,但免費額度不扣款)。
2. 主控台 → **Compute → Instances → Create Instance**:
   - **Image**:Canonical **Ubuntu 22.04** 或 24.04 LTS。
   - **Shape**:**VM.Standard.A1.Flex**(Ampere/Arm,Always Free 最多 4 OCPU / 24GB)。給 **1 OCPU / 6GB** 就很夠 1～3 人。
   - **SSH keys**:選「Paste public key」,貼上你的**公鑰**(下一段教你產生)。
3. 建立後,在 instance 詳情頁記下 **Public IP address**(例如 `140.83.x.x`)。

> 💡 **公網 IP 是什麼?** 它是這台機在整個網際網路上的唯一門牌,別人靠它才找得到你的伺服器。免費機的 IP 通常不會變(屬於你的帳號),但建議還是綁網域,日後換機只要改 DNS。
> ⚠️ 若 A1 Arm 顯示「out of capacity」,換個可用區(Availability Domain)再試,或晚點再試——免費 Arm 機很搶手。

### 1a. 產生 SSH 金鑰(在你自己的 Windows 電腦上)

打開 **PowerShell** 或 **Git Bash**:
```bash
ssh-keygen -t ed25519 -C "soulshard-admin"
# 一路按 Enter(預設存到 ~/.ssh/id_ed25519,密碼可留空或自設)
```
這會產生兩個檔:
- `~/.ssh/id_ed25519`(**私鑰**,留在你電腦,絕不外流)
- `~/.ssh/id_ed25519.pub`(**公鑰**,貼到 Oracle 建立 VM 的那一欄)

> 💡 **金鑰原理:** 公鑰像一把「只有對應私鑰才打得開的鎖」。你把鎖(公鑰)裝在伺服器上,登入時用手上的鑰匙(私鑰)證明身分——比密碼安全且免打密碼。

---

## 2. 設一個網域(讓別人連得到、也給 HTTPS 用)

沒有自己的網域沒關係,用免費的:

### 選項 A — nip.io(零設定,最快)
直接用 `你的IP.nip.io`,例如公網 IP 是 `140.83.1.2`,網域就是 **`140.83.1.2.nip.io`**(它會自動解析回那個 IP,什麼都不用設)。適合先跑通。

### 選項 B — DuckDNS(較穩,推薦長期用)
1. 上 [duckdns.org](https://www.duckdns.org) 用 Google/GitHub 登入。
2. 申請一個名字,例如 `mysoulshard` → 得到 `mysoulshard.duckdns.org`。
3. 在它後台把該名字的 IP 填成你的**公網 IP**,存檔。

之後文件裡看到 `yourname.duckdns.org` 就換成你的網域(nip.io 或 DuckDNS 都行)。

> 💡 **為什麼需要 DNS?** 憑證機構(Let's Encrypt)只發給「主機名」,不發給純 IP。網域就是把一個名字指到你的 IP,讓 Caddy 能申請憑證、玩家也好記。

---

## 3. SSH 連進主機

在 PowerShell / Git Bash:
```bash
ssh ubuntu@<你的公網IP>
# 第一次會問 "Are you sure...?" 打 yes
```
**設個別名好連(建議):** 編輯 `~/.ssh/config`(沒有就新建),加上:
```
Host oracle
    HostName 140.83.1.2          # 換成你的公網 IP
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
```
之後直接 `ssh oracle` 就能連。**接下來第 4～6 章的指令,都是在 `ssh oracle` 進去之後、在那台機上執行。**

---

## 4. 開「兩道」防火牆(最多人卡在這)

OCI 有兩層防火牆,**兩層都要開 80 / 443**,缺一個就連不進來。

### 4a. 雲端防火牆(在 Oracle 網頁主控台做)
主控台 → 你 VM 的 **VCN → Security Lists → Default Security List → Add Ingress Rules**,新增兩條:

| Source CIDR | IP Protocol | Destination Port |
|-------------|-------------|------------------|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

(22 埠 SSH 預設已開。)

### 4b. 主機內防火牆(SSH 進去後執行)
```bash
sudo iptables -I INPUT 5 -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save     # 讓規則重開機後還在
```

> 💡 **為什麼有兩道?** 雲端那層(Security List)是 Oracle 機房入口的閘門;主機那層(iptables)是這台機自己的防火牆。Ubuntu 的 OCI 映像預設 iptables 很嚴(只放 22),所以即使機房閘門開了,封包還是會被機器自己擋掉。

> **80 與 443 各做什麼:** 443 是正式的 HTTPS/WSS;80 是讓 Caddy 自動申請憑證用的(驗證你真的擁有這個網域)+ 把 http 轉到 https。

---

## 5. 用 Docker 起後端(API + 資料庫)

### 5a. 裝 Docker、把程式拉下來
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker      # 讓你不用 sudo 也能用 docker
sudo apt update && sudo apt install -y git
git clone https://github.com/q86865511/Soulshard-Hunter.git soulshard
cd soulshard/server
```

### 5b. 設定密鑰與來源(寫進 `server/.env`)
```bash
cp .env.example .env
# 產生一把強的 JWT 密鑰並寫進 .env:
echo "JWT_SECRET=$(openssl rand -hex 48)" >> .env
echo "CORS_ORIGIN=https://yourname.duckdns.org" >> .env   # 換成你的網域
```
> 💡 **為什麼用 `.env` 檔而不是手動 export?** 因為等一下接了自動部署(第 8 章),GitHub 會用一個**全新的登入工作階段**來重啟服務,那個 session 沒有你手動 export 的環境變數。把密鑰寫進 `server/.env`(這個檔被 git 忽略、不會上傳、`git reset` 也不會動它),Docker Compose 會**自動讀它**,手動跟自動部署就都能用。
>
> 💡 **`JWT_SECRET` 是什麼?** 它是伺服器簽發/驗證登入憑證(token)的祕密鑰匙。一定要夠長夠隨機(≥32 字),否則別人能偽造任何人的登入——所以程式設計成密鑰太弱就**拒絕啟動**。
> 💡 **`CORS_ORIGIN`?** 白名單,只允許你這個網址的網頁呼叫 API,擋掉別的網站盜用。

### 5c. 啟動
```bash
docker compose up -d --build      # 第一次會 build,稍等幾分鐘
docker compose logs -f api        # 看它啟動,看到 "listening" 就 Ctrl-C 離開
curl localhost:8787/api/health    # 應回 {"ok":true,...}
```
> 💡 這會起兩個容器:`db`(PostgreSQL,資料存在名為 `pgdata` 的 Docker volume)和 `api`(Node 後端)。資料表會在啟動時自動建立,**不需要手動跑 migration**。
> 🔒 **正式環境建議**:把 `docker-compose.yml` 裡 `db` 那段的 `ports: - "5432:5432"` 刪掉,別讓資料庫對外曝露(API 在容器內部用 `db` 連得到,不需要對外開埠)。

---

## 6. 設定 Caddy(HTTPS + 前端 + API + 合作 WebSocket)

Caddy 會自動跟 Let's Encrypt 申請憑證,並把前端、API、`/rt` 都從同一個網址提供。

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```
編輯設定檔 `sudo nano /etc/caddy/Caddyfile`,整份內容換成(網域改成你的):
```caddy
yourname.duckdns.org {
    encode zstd gzip

    # API → Node(用 handle,不要 handle_path:後端路由含 /api 前綴,前綴必須保留)
    handle /api/* {
        reverse_proxy localhost:8787
    }

    # 即時合作 WebSocket(Caddy 會自動升級連線;前端連 wss://<網域>/rt)
    handle /rt {
        reverse_proxy localhost:8787
    }

    # 靜態遊戲(直接餵 repo 工作目錄裡的檔)
    handle {
        root * /home/ubuntu/soulshard
        file_server
        try_files {path} /index.html
    }
}
```
存檔後重新載入:
```bash
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager     # 確認 active (running)
```
> ⚠️ **裝完後若開站回 403(憑證正常卻說無權限):** apt 版 Caddy 是以 `caddy` 使用者執行,而 Ubuntu 家目錄 `/home/ubuntu` 預設權限 `750`,others 進不去 → Caddy 讀不到靜態檔。一次修好:
> ```bash
> sudo chmod o+x /home/ubuntu
> sudo chmod -R o+rX /home/ubuntu/soulshard
> sudo systemctl reload caddy
> ```
> 💡 **反向代理在做什麼?** Caddy 站在 443 接所有請求,看網址前綴決定轉給誰:`/api/*` 和 `/rt` 轉給後端 Node,其餘給靜態檔。同時它幫你把整站變 HTTPS(憑證自動申請、自動續期)。
> 💡 **為什麼 `/rt` 要單獨寫一條?** 合作用的 WebSocket 不在 `/api` 底下,沒這條的話它會被當成靜態檔處理而連不上。Caddy 的 `reverse_proxy` 會自動處理 WebSocket 升級,不用額外設定。
> 💡 **前端不用任何設定**:因為遊戲和 API 同一個網域,前端的 `src/net/api.js` 在正式站會自動用同源的 `/api/...` 和 `wss://<網域>/rt`。

---

## 7. 第一次人為測試(單人 + 驗證雲端存檔)

打開瀏覽器進 `https://yourname.duckdns.org`:

1. 遊戲用 HTTPS 載入(網址列有鎖頭),第一次點擊後音樂響起。
2. 點右下角 **☁ 登入 / 註冊** → 註冊一個帳號 → 右下角出現你的名字。
3. 玩完一局 → 開 **🏆 排行榜** → 看到自己的分數。
4. **驗證雲端存檔(關鍵):** 換另一個瀏覽器(或無痕視窗)進同一網址,用**同一帳號**登入 → 你的金幣、解鎖都在 → 證明存檔真的在雲端、能跨裝置。
5. (可選)開 F12 → Network,確認 `PUT /api/save`、`POST /api/runs` 回 `200`。

> ✅ 到這裡「Phase 1(帳號/雲端存檔/排行榜)」就上線了。
> 💡 **存檔持久性:** 本機 localStorage 一直都在(綁瀏覽器);雲端因為用的是帶 `pgdata` volume 的 PostgreSQL,**重啟容器、重開機都不會掉**,而且跨裝置。

---

## 8. 接上 CI/CD —— 之後 `git push` 就自動部署

repo 裡已經放好 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):每次 push 到 `main`,GitHub 會 SSH 進你的 VM,把程式更新到最新並重啟、做健康檢查。你只要設定一次。

### 8a. 產生一把「專用部署金鑰」(別用你個人的)
在**本機**:
```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/soulshard_deploy
```
把**公鑰**裝到 VM(讓 GitHub 能登入這台機):
```bash
ssh-copy-id -i ~/.ssh/soulshard_deploy.pub oracle
# 沒有 ssh-copy-id 的話:把 ~/.ssh/soulshard_deploy.pub 的內容貼到 VM 的 ~/.ssh/authorized_keys
```

### 8b. 在 GitHub 設 3 個 Secret
到 repo 網頁 → **Settings → Secrets and variables → Actions → New repository secret**,新增:

| Secret 名稱 | 值 |
|------------|----|
| `OCI_HOST` | 你的公網 IP 或網域 |
| `OCI_USER` | `ubuntu` |
| `OCI_SSH_KEY` | **私鑰**全文(`cat ~/.ssh/soulshard_deploy` 的整段內容,含開頭/結尾那兩行) |

> 💡 私鑰只存在 GitHub 的加密 Secret 裡,不會出現在程式碼或 log。

### 8c. 確認 deploy.yml 的重啟方式是 Docker
打開 `.github/workflows/deploy.yml`,確認重啟區塊是 **Docker** 那行沒被註解(預設就是):
```yaml
            docker compose up -d --build
            # sudo systemctl restart soulshard
            # pm2 ...
```
> 💡 因為密鑰寫在 VM 的 `server/.env`(第 5b 步),GitHub 自動跑 `docker compose up` 時會自動讀到,不用再傳密鑰。
> ⚠️ 部署用的 `OCI_USER`(ubuntu)要能用 docker——第 5a 已 `usermod -aG docker`,沒問題。

### 8d. 測一次自動部署
隨便改個小東西(例如 README 加一行),`git push` 到 `main` → 到 GitHub repo 的 **Actions** 分頁看「Deploy to Oracle」這個 workflow 跑綠勾 → 重新整理你的遊戲網址,改動已上線。

> 💡 **CI/CD 流程白話版:** 你 push → GitHub 偵測到 main 有新 commit → 啟動 deploy.yml → 它 SSH 進 VM → `git reset --hard origin/main`(前端立刻更新,因為是直接給檔)→ `docker compose up -d --build`(重建並重啟後端)→ `curl /api/health` 確認活著。整個約 1 分鐘。

---

## 9. 多人合作實測(從外面,兩個人真的連一場)

這是最終驗收——確認「外對內」連線與合作都正常。

**準備:** 兩個裝置(或同一台開兩個瀏覽器/無痕視窗),各自連 `https://yourname.duckdns.org`。

1. 兩邊各自 **註冊不同帳號**(例如 `alice`、`bob`)並登入。
2. 點右下角 **👥 好友 / 連線** → 「好友」頁 → alice 輸入 `bob` 送出好友邀請 → bob 在好友頁按**接受**(兩邊互看到綠點=在線)。
3. alice → 「連線房間」頁 → **建立房間** → 得到一個房號(例如 `7RL6B`),選自己的角色。
4. 邀 bob:alice 在好友列對 bob 按 **邀請合作**(bob 右下會跳邀請彈窗,按加入);或 bob 自己用房號加入。
5. bob 選角色 → 按 **準備**;alice(房主)按 **開始遊戲**。
6. **確認這些都正常**:
   - 兩人都進到同一張地圖、**看得到彼此的角色與名字血條**、打的是同一群怪。
   - 升級時**會跳出選強化的選單**(各自選各自的)。
   - 中央橫幅(敵潮更替、小王出現…)兩邊**同步**顯示。
   - 叫其中一人**關掉分頁(模擬斷線)**→ 幾秒後另一人畫面上那個角色**會消失**(不會卡著不動)。

> ✅ 全部正常,代表 Phase 2 即時合作正式上線、能對外服務了。
> 💡 想看目前線上狀況:瀏覽器開 `https://你的網域/api/rt/stats`,會回 `{users, conns, rooms}`(在線人數/連線數/房間數)。

---

## 10. 日常維運 & 疑難排解

**看記錄檔**
```bash
docker compose logs -f api          # 後端(在 ~/soulshard/server 下)
journalctl -u caddy -f              # Caddy(憑證/代理問題看這)
```
**手動更新**(平常交給 push 自動做,這是備援)
```bash
cd ~/soulshard && git pull && cd server && docker compose up -d --build
```
**備份資料庫**
```bash
cd ~/soulshard/server
docker compose exec db pg_dump -U soulshard soulshard > ~/backup_$(date +%F).sql
```

**常見問題**

| 症狀 | 多半原因 / 解法 |
|------|----------------|
| 網址打不開 / 一直轉圈 | 防火牆沒開齊(第 4 章兩道都要);或 DNS 還沒生效(等幾分鐘) |
| 開得了但顯示憑證錯誤 | 80 埠沒開(Caddy 要靠它申請憑證);`journalctl -u caddy -f` 看錯誤 |
| 開得了但回 **403 Forbidden**(憑證正常) | Caddy 以 `caddy` 使用者執行,讀不到家目錄裡的靜態檔(`/home/ubuntu` 預設 `750`,others 無權限)。修:`sudo chmod o+x /home/ubuntu && sudo chmod -R o+rX /home/ubuntu/soulshard && sudo systemctl reload caddy`。決定性測試:`sudo -u caddy cat /home/ubuntu/soulshard/index.html`(報 Permission denied 就是這個) |
| 能登入但合作連不上 | Caddyfile 少了 `/rt` 那條;或前端不是走 https(必須 https 才能 wss) |
| 後端起不來、log 說 JWT_SECRET | `.env` 沒設或太短(要 ≥32 隨機字元,見 5b) |
| 自動部署失敗 | Actions log 看是哪步;多半是 3 個 Secret 填錯,或部署用戶沒 docker 權限 |
| 排行榜/存檔 500 | 資料庫沒起來:`docker compose ps` 看 `db` 是否 healthy |

---

## 附錄:一頁速查

**首次部署順序**:開 VM(§1)→ 設網域(§2)→ SSH(§3)→ 開兩道防火牆(§4)→ Docker 起後端(§5)→ Caddy(§6)→ 單人測試(§7)→ 接 CI/CD(§8)→ 多人實測(§9)。

**之後更新**:本機 `git push origin main` → GitHub Actions 自動部署完成。

**只有你(在 Oracle 網頁主控台)能做的**:建 VM、開雲端 Security List 的 80/443、設 GitHub Secrets。
**其餘(SSH 進 VM 的安裝/設定)** 都可照本文逐步複製貼上,或請我透過你的本機 SSH 代為執行。

---

## 附錄:用 nip.io 免費網域(不想買網域時)

不想買網域也行。**nip.io** 是免費公共 DNS:任何 `<IP>.nip.io` 形式的名稱都會自動解析回那個 IP——免註冊、免設定、即時生效。VM 公網 IP 是 `140.238.1.2`,網域就是 `140.238.1.2.nip.io`。

> 💡 **為什麼用得上?** OCI 給你公網 IP 但沒有主機名,而 Let's Encrypt **不發憑證給純 IP**(一定要一個名字)。nip.io 免費從你的 IP 生一個名字,於是你就有真正的 HTTPS + WSS。

**用法**:把本文所有寫 `yourname.duckdns.org` 的地方換成 `<你的IP>.nip.io` 即可——`CORS_ORIGIN`(§5b)、Caddyfile 第一行的網域(§6)、開遊戲的網址(§7)。第一次載入會等幾秒簽憑證,之後即時。

**⚠️ 兩個要注意的點:**
- **把 IP 固定下來**:nip.io 名稱「就是」你的 IP,IP 一變名稱就變。OCI 預設公網 IP 可能是臨時的(VM 停掉/重建會換)。到主控台幫實例綁一個 **Reserved Public IP**(Always-Free 內含),名稱才不會變,否則每次都要改 `CORS_ORIGIN`、Caddyfile、再重新告訴玩家網址。
- **Let's Encrypt 共享額度**:`*.nip.io` 的憑證都算在 `nip.io` **同一個**速率限制桶裡(Let's Encrypt 有給它放寬,業餘用幾乎不會中)。萬一遇到「too many certificates for: nip.io」,稍後再試,或改用會跟著你更新紀錄的 **DuckDNS** / 自有網域(= 你自己的私有額度)。

**其他**:橫線形式 `140-238-1-2.nip.io` 也行;可加前綴 `soulshard.140.238.1.2.nip.io`;備援可用 `sslip.io`(行為相同)。
