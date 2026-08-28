#!/usr/bin/env bash
set -euo pipefail

# Daily Postgres backup with 7-day rotation.
# Install via crontab (run as the deploy user, from anywhere):
#   0 3 * * * /path/to/agency-website/deploy/pg-backup.sh >> /var/log/agency-website-backup.log 2>&1

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="/var/backups/agency-website"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cd "$PROJECT_DIR"
set -a
source .env
set +a

mkdir -p "$BACKUP_DIR"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > "$BACKUP_DIR/agency-website-$TIMESTAMP.sql.gz"

find "$BACKUP_DIR" -name "agency-website-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
