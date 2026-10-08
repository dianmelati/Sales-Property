#!/usr/bin/env bash
# Deploy pertama kali dan pembaruan berikutnya di satu server dengan Docker Compose.
# Pakai: ./scripts/deploy.sh [--seed]   (--seed hanya untuk instalasi pertama)
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Buat .env dari .env.docker.example dulu."; exit 1; }
[ -f package-lock.json ] || { echo "package-lock.json belum ada. Jalankan 'npm install' lalu commit file itu."; exit 1; }
[ -d prisma/migrations ] || { echo "prisma/migrations belum ada. Buat migrasi awal: npx prisma migrate dev --name init, lalu commit."; exit 1; }

echo "==> Database"
docker compose up -d db

echo "==> Cadangan sebelum migrasi (jika database sudah berisi)"
if docker compose exec -T db psql -U estate -d estate -tAc "select to_regclass('public.\"Property\"')" | grep -q Property; then
  mkdir -p backups
  docker compose exec -T db pg_dump -U estate -Fc estate > "backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
fi

echo "==> Migrasi"
docker compose --profile tools build tools
docker compose --profile tools run --rm tools npx prisma migrate deploy
if [ "${1:-}" = "--seed" ]; then docker compose --profile tools run --rm tools npm run db:seed; fi

echo "==> Build dan jalankan aplikasi"
docker compose build app
docker compose up -d

echo "==> Uji asap"
sleep 5
node scripts/smoke.mjs "$(grep -E '^NEXT_PUBLIC_SITE_URL=' .env | cut -d= -f2-)"
