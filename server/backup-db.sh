#!/usr/bin/env bash
# 每日備份 Soulshard Postgres(docker compose 服務 db)→ 保留 KEEP_DAYS 天。
# 用法:cron 每日跑,或手動:bash backup-db.sh
set -euo pipefail
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/soulshard-db}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE_DIR="${COMPOSE_DIR:-$HOME/soulshard/server}"
mkdir -p "$BACKUP_DIR"
ts="$(date +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/soulshard-$ts.sql.gz"
cd "$COMPOSE_DIR"
sudo docker compose exec -T db pg_dump -U soulshard soulshard | gzip > "$out"
echo "backup -> $out ($(du -h "$out" | cut -f1))"
find "$BACKUP_DIR" -name 'soulshard-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
echo "pruned backups older than ${KEEP_DAYS}d"
