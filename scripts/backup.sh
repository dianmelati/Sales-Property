#!/usr/bin/env bash
# Cadangan database (format custom pg_dump) dan unggahan lokal. Jadwalkan lewat cron, dan SALIN HASILNYA KE LUAR SERVER.
# Pakai: DATABASE_URL=postgresql://... ./scripts/backup.sh [folder-tujuan]
# Dengan Docker Compose: docker compose exec -T db pg_dump -U estate -Fc estate > backups/db-$(date -u +%F).dump
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL belum diisi}"
OUT="${1:-backups}"; KEEP="${KEEP:-14}"
mkdir -p "$OUT"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump --format=custom --no-owner "$DATABASE_URL" --file "$OUT/db-$TS.dump"
if [ -d public/uploads ]; then tar -czf "$OUT/uploads-$TS.tar.gz" -C public uploads; fi
ls -1t "$OUT"/db-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$OUT"/uploads-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "Selesai: $OUT/db-$TS.dump"
