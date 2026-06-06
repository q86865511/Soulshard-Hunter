# Deploying Soulshard Hunter to Oracle Cloud (OCI)

A complete, copy-paste walkthrough for putting the game online with **accounts +
cloud save + shared leaderboard** (Phase 1) **and real-time co-op + friends/lobby**
(Phase 2) — see [`MULTIPLAYER_PLAN.md`](MULTIPLAYER_PLAN.md).

> 繁體中文版:[`DEPLOY_ORACLE.zh-TW.md`](DEPLOY_ORACLE.zh-TW.md)

Architecture: the browser loads the static game; a **Caddy** reverse proxy serves
those static files over HTTPS, forwards `/api/*` to the **Node (Fastify)** server
(which talks to **PostgreSQL**), and forwards the `/rt` **WebSocket** to the same Node
process (the co-op relay). Everything fits comfortably in OCI's Always-Free tier.

```
Browser ──HTTPS──▶ Caddy ──┬─ /            → static game files (index.html, src/, assets/)
                           ├─ /api/*       → Node API (:8787) ──▶ PostgreSQL
                           └─ /rt  (WSS)   → Node co-op relay (same :8787 process)
```

> **Two things people always trip on** (call-outs below): OCI has **two firewalls**
> (cloud Security List *and* the VM's iptables), and browsers on `https://` can only
> talk to `https://`/`wss://` — so you **need TLS**, which means a hostname.

---

## 0. Prerequisites

- An Oracle Cloud account (the **Always Free** tier is enough).
- A hostname pointing at the VM. Either a real domain, or a free one:
  **DuckDNS** (`yourname.duckdns.org`) or **nip.io** (`<your-ip>.nip.io`).
- An SSH keypair (`ssh-keygen -t ed25519`).

---

## 1. Create the VM

1. OCI Console → **Compute → Instances → Create Instance**.
2. **Image & shape:** Canonical **Ubuntu 22.04/24.04 LTS**, shape **VM.Standard.A1.Flex**
   (Ampere/Arm — Always Free up to 4 OCPU / 24 GB). 1 OCPU / 6 GB is plenty for 1–3 players.
3. Paste your SSH **public** key.
4. Note the **public IP** after it boots.
5. Point your hostname at that IP (DuckDNS: set the IP in its dashboard; nip.io: nothing to do).

```bash
ssh ubuntu@<PUBLIC_IP>
```

---

## 2. Open BOTH firewalls ⚠️

### 2a. Cloud firewall (Security List / NSG)
OCI Console → your VM's **VCN → Security Lists → Default** → **Add Ingress Rules**:

| Source CIDR | Protocol | Dest port | Why |
|-------------|----------|-----------|-----|
| `0.0.0.0/0` | TCP      | `80`      | HTTP (Caddy uses it for the TLS challenge + redirect) |
| `0.0.0.0/0` | TCP      | `443`     | HTTPS / WSS |

(Port 22 for SSH is open by default.)

### 2b. VM firewall (iptables) — the Ubuntu OCI image ships with strict rules
```bash
sudo iptables -I INPUT 5 -p tcp --dport 80  -j ACCEPT
sudo iptables -I INPUT 5 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save        # persist across reboots
# (if you use ufw instead: sudo ufw allow 80,443/tcp)
```

---

## 3. Get the code onto the VM

```bash
sudo apt update && sudo apt install -y git
git clone <YOUR_REPO_URL> soulshard && cd soulshard
```

---

## 4. Bring up the backend

Two options — Docker is the least fiddly.

### Option A — Docker (recommended)
```bash
# install docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

cd ~/soulshard/server
# generate a real secret + your public origin, then launch Postgres + API
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" 2>/dev/null || openssl rand -hex 48)
export CORS_ORIGIN="https://yourname.duckdns.org"
docker compose up -d --build
docker compose logs -f api      # watch it boot; Ctrl-C to stop watching
curl localhost:8787/api/health  # -> {"ok":true,...}
```
The compose file auto-creates the schema on boot. For production you may remove the
`5432:5432` port mapping in `server/docker-compose.yml` so Postgres isn't world-exposed.

### Option B — Node + Postgres directly (systemd)
```bash
# Node 20 + Postgres 16
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER soulshard WITH PASSWORD 'STRONGPW';"
sudo -u postgres psql -c "CREATE DATABASE soulshard OWNER soulshard;"

cd ~/soulshard/server
cp .env.example .env && nano .env     # set DATABASE_URL, CORS_ORIGIN, and a STRONG JWT_SECRET
# JWT_SECRET must be >=32 random chars or the server REFUSES to boot (every token would be forgeable). Generate one:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm install --omit=dev
```
Create `/etc/systemd/system/soulshard.service`:
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
(`pm2 start src/server.js --name soulshard && pm2 startup && pm2 save` works too.)

---

## 5. Caddy — HTTPS + static frontend + API proxy

Caddy gets a TLS cert automatically and serves everything from one place.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:
```caddy
yourname.duckdns.org {
    encode zstd gzip

    # API → Node. Use `handle` (NOT `handle_path`): the Node routes include the
    # /api prefix (e.g. /api/health), so the prefix must be PRESERVED, not stripped.
    handle /api/* {
        reverse_proxy localhost:8787
    }

    # realtime co-op WebSocket (Phase 2). Caddy upgrades the WS connection
    # automatically; the frontend connects to wss://<host>/rt.
    handle /rt {
        reverse_proxy localhost:8787
    }

    # static game (served straight from the repo working tree)
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
Because the game is now served from the **same origin** as the API, the frontend's
`src/net/api.js` automatically uses same-origin `/api/...` in production (no config
needed). Make sure the server's `CORS_ORIGIN` matches your `https://yourname...` URL.

> The static tree includes `assets/music/` (the soundtrack, ~60 MB) — make sure it's
> committed/cloned. `server/.env` lives under `server/` and is **not** served by the
> `root` above; keep it that way (never expose `.env`).

---

## 6. Verify end-to-end

1. Open `https://yourname.duckdns.org` — game loads over HTTPS, music plays after first click.
2. Click **☁ 登入 / 註冊** (bottom-right) → register → you should see your name in the bar.
3. Play and finish a run → open **🏆 排行榜** → your score appears.
4. **Cross-device proof:** open in a different browser, log in with the same account →
   your progress (gold, unlocks) is there → cloud save confirmed.
5. DevTools Network tab: `PUT /api/save` and `POST /api/runs` return `200`.

---

## 7. Operations

- **Logs:** `docker compose logs -f api` (Docker) or `journalctl -u soulshard -f` (systemd); `journalctl -u caddy -f`.
- **Update:** `git pull` then `docker compose up -d --build` (or `sudo systemctl restart soulshard`).
- **DB backup:** `docker compose exec db pg_dump -U soulshard soulshard > backup.sql` (or `pg_dump` directly).
- **Rotate the JWT secret** only when needed — it invalidates all existing logins.

---

## 8. Phase 2 (realtime co-op) — already wired

Phase 2 (1–3 player co-op + friends/lobby/invites) ships in the **same Node process**
on the same VM — no new infrastructure. It is **host-authoritative relay**: one
player's browser runs the authoritative game sim and the server just relays messages,
so the server stays a lightweight `ws` gateway (it never simulates).

What's needed is already covered above:
- the `handle /rt { reverse_proxy localhost:8787 }` block in the Caddyfile (§5) — Caddy
  upgrades the WebSocket automatically, so the browser reaches `wss://<host>/rt`;
- the **same `JWT_SECRET`** (the WS handshake verifies the JWT passed as `?token=`);
- the same `CORS_ORIGIN`.

The `friendships` table is auto-created by `initSchema` on boot (no migration step).
To verify: log in on two devices/accounts → **👥 好友 / 連線** → add each other →
create a room / join by code → ready → start; you should see each other in the run.
