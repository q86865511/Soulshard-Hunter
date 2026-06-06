# 將《魂晶獵手》部署到 Oracle Cloud(OCI)

一份可直接複製貼上的完整教學,把遊戲上線並啟用 **帳號 + 雲端存檔 + 共享排行榜**(Phase 1)
以及 **即時多人合作 + 好友/大廳/邀請**(Phase 2)——詳見 [`MULTIPLAYER_PLAN.md`](MULTIPLAYER_PLAN.md)。

> English version: [`DEPLOY_ORACLE.md`](DEPLOY_ORACLE.md)

架構:瀏覽器載入靜態遊戲;一台 **Caddy** 反向代理用 HTTPS 提供這些靜態檔案,把 `/api/*`
轉送到 **Node(Fastify)** 伺服器(後者連 **PostgreSQL**),並把 `/rt` 的 **WebSocket**
轉送到同一個 Node 程序(即合作中繼)。全部都能輕鬆塞進 OCI 的 Always-Free 免費方案。

```
瀏覽器 ──HTTPS──▶ Caddy ──┬─ /            → 靜態遊戲檔案(index.html、src/、assets/)
                          ├─ /api/*       → Node API(:8787)──▶ PostgreSQL
                          └─ /rt  (WSS)   → Node 合作中繼(同一個 :8787 程序)
```

> **大家最常踩到的兩個坑**(下方會特別標註):OCI 有 **兩道防火牆**(雲端 Security List
> *以及* VM 內的 iptables);而且 `https://` 頁面的瀏覽器只能連 `https://`/`wss://`——
> 所以你 **一定要有 TLS**,也就代表你需要一個網域名稱(hostname)。

---

## 0. 事前準備

- 一個 Oracle Cloud 帳號(**Always Free** 免費方案就夠)。
- 一個指向該 VM 的網域名稱。可以用真實網域,或免費的:
  **DuckDNS**(`yourname.duckdns.org`)或 **nip.io**(`<你的-IP>.nip.io`)。
- 一組 SSH 金鑰(`ssh-keygen -t ed25519`)。

---

## 1. 建立 VM

1. OCI 主控台 → **Compute → Instances → Create Instance**。
2. **映像與規格(Image & shape):** Canonical **Ubuntu 22.04/24.04 LTS**,規格選
   **VM.Standard.A1.Flex**(Ampere/Arm — Always Free 最多 4 OCPU / 24 GB)。1 OCPU / 6 GB
   對 1–3 人綽綽有餘。
3. 貼上你的 SSH **公鑰(public key)**。
4. 開機後記下 **公網 IP(public IP)**。
5. 把你的網域指向該 IP(DuckDNS:在它的後台填入 IP;nip.io:不需做任何事)。

```bash
ssh ubuntu@<PUBLIC_IP>
```

---

## 2. 兩道防火牆都要開 ⚠️

### 2a. 雲端防火牆(Security List / NSG)
OCI 主控台 → 你 VM 的 **VCN → Security Lists → Default** → **Add Ingress Rules**:

| 來源 CIDR | 通訊協定 | 目的埠 | 用途 |
|-----------|----------|--------|------|
| `0.0.0.0/0` | TCP    | `80`   | HTTP(Caddy 用於 TLS 憑證驗證 + 轉址) |
| `0.0.0.0/0` | TCP    | `443`  | HTTPS / WSS |

(SSH 用的 22 埠預設已開啟。)

### 2b. VM 防火牆(iptables)——Ubuntu OCI 映像內建嚴格規則
```bash
sudo iptables -I INPUT 5 -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save        # 讓規則在重開機後仍生效
# (如果你改用 ufw:sudo ufw allow 80,443/tcp)
```

---

## 3. 把程式碼放到 VM 上

```bash
sudo apt update && sudo apt install -y git
git clone <你的_REPO_網址> soulshard && cd soulshard
```

---

## 4. 啟動後端

兩種做法——Docker 最不麻煩。

### 做法 A — Docker(推薦)
```bash
# 安裝 docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

cd ~/soulshard/server
# 產生一組真正的密鑰 + 你的公開來源網址,然後啟動 Postgres + API
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" 2>/dev/null || openssl rand -hex 48)
export CORS_ORIGIN="https://yourname.duckdns.org"
docker compose up -d --build
docker compose logs -f api      # 觀察開機過程;按 Ctrl-C 結束觀察
curl localhost:8787/api/health  # -> {"ok":true,...}
```
compose 檔會在開機時自動建立資料表。正式環境可以把 `server/docker-compose.yml` 裡的
`5432:5432` 連接埠對應移除,讓 Postgres 不會對外曝露。

### 做法 B — 直接用 Node + Postgres(systemd)
```bash
# Node 20 + Postgres 16
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER soulshard WITH PASSWORD 'STRONGPW';"
sudo -u postgres psql -c "CREATE DATABASE soulshard OWNER soulshard;"

cd ~/soulshard/server
cp .env.example .env && nano .env     # 設定 DATABASE_URL、CORS_ORIGIN,以及一組強的 JWT_SECRET
# JWT_SECRET 必須 >=32 個隨機字元,否則伺服器會拒絕啟動(否則任何 token 都可被偽造)。產生方式:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm install --omit=dev
```
建立 `/etc/systemd/system/soulshard.service`:
```ini
[Unit]
Description=Soulshard API
After=network.target postgresql.service

[Service]
WorkingDirectory=/home/ubuntu/soulshard/server
EnvironmentFile=/home/ubuntu/soulshard/server/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now soulshard
curl localhost:8787/api/health
```
(用 `pm2 start src/server.js --name soulshard && pm2 startup && pm2 save` 也可以。)

---

## 5. Caddy —— HTTPS + 靜態前端 + API 代理

Caddy 會自動取得 TLS 憑證,並從同一處提供所有內容。

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

編輯 `/etc/caddy/Caddyfile`:
```caddy
yourname.duckdns.org {
    encode zstd gzip

    # API → Node。請用 `handle`(不要用 `handle_path`):Node 路由本身就含 /api 前綴
    # (例如 /api/health),所以前綴必須「保留」而不是被剝掉。
    handle /api/* {
        reverse_proxy localhost:8787
    }

    # 即時合作 WebSocket(Phase 2)。Caddy 會自動升級 WS 連線;
    # 前端會連到 wss://<host>/rt。
    handle /rt {
        reverse_proxy localhost:8787
    }

    # 靜態遊戲(直接從 repo 工作目錄提供)
    handle {
        root * /home/ubuntu/soulshard
        file_server
        try_files {path} /index.html
    }
}
```
```bash
sudo systemctl reload caddy
```
因為現在遊戲是從與 API **同源(same origin)** 的位置提供,前端的 `src/net/api.js` 在正式
環境會自動使用同源的 `/api/...`(無需任何設定);WebSocket 也會自動連到同源的 `wss://<host>/rt`。
請確認伺服器的 `CORS_ORIGIN` 與你的 `https://yourname...` 網址一致。

> 靜態目錄包含 `assets/music/`(配樂,約 60 MB)——請確認它有被 commit/clone 進來。
> `server/.env` 位於 `server/` 之下,**不會**被上面的 `root` 提供;請保持如此(絕不要曝露 `.env`)。

---

## 6. 端到端驗證

1. 開啟 `https://yourname.duckdns.org` —— 遊戲透過 HTTPS 載入,首次點擊後音樂播放。
2. 點右下角的 **☁ 登入 / 註冊** → 註冊 → 你應該會在列上看到自己的名稱。
3. 玩完一局 → 開 **🏆 排行榜** → 你的分數會出現。
4. **跨裝置驗證:** 用另一個瀏覽器開啟,用同一個帳號登入 →
   你的進度(金幣、解鎖)都在 → 確認雲端存檔成功。
5. **多人合作驗證:** 在兩台裝置/兩個帳號分別登入 → **👥 好友 / 連線** → 互加好友 →
   建立房間 / 用房號加入 → 準備 → 開始;你們應該會在同一局裡看到彼此。
6. 開 DevTools 的 Network 分頁:`PUT /api/save` 與 `POST /api/runs` 回傳 `200`;
   `/rt` 顯示為一條 `101 Switching Protocols`(WebSocket)連線。

---

## 7. 維運

- **記錄檔:** `docker compose logs -f api`(Docker)或 `journalctl -u soulshard -f`(systemd);`journalctl -u caddy -f`。
- **更新:** `git pull` 後 `docker compose up -d --build`(或 `sudo systemctl restart soulshard`)。
- **資料庫備份:** `docker compose exec db pg_dump -U soulshard soulshard > backup.sql`(或直接用 `pg_dump`)。
- **輪替 JWT 密鑰** 只在必要時做——它會讓所有現有登入失效。
- **即時連線(WS)健康度:** `GET /api/rt/stats` 回傳 `{users, conns, rooms}`(目前線上人數 / 連線數 / 房間數)。

---

## 8. Phase 2(即時合作)—— 已內建接好

Phase 2(1–3 人合作 + 好友/大廳/邀請)就跑在 **同一個 Node 程序**、同一台 VM 上——
不需要任何新基礎設施。它採 **主機權威中繼(host-authoritative relay)**:由其中一名玩家的
瀏覽器跑權威遊戲模擬,伺服器只負責轉發訊息,所以伺服器維持為一個輕量的 `ws` 閘道(它本身不模擬)。

所需設定上面都已涵蓋:
- Caddyfile(§5)裡的 `handle /rt { reverse_proxy localhost:8787 }` —— Caddy 會自動升級
  WebSocket,讓瀏覽器連到 `wss://<host>/rt`;
- **相同的 `JWT_SECRET`**(WS 握手會驗證以 `?token=` 帶入的 JWT);
- 相同的 `CORS_ORIGIN`。

`friendships`(好友)資料表會在開機時由 `initSchema` 自動建立(無需額外的 migration 步驟)。
驗證方式:在兩台裝置/兩個帳號登入 → **👥 好友 / 連線** → 互加好友 →
建立房間 / 用房號加入 → 準備 → 開始;你們應該會在同一局裡看到彼此。
