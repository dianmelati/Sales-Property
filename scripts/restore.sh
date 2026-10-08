#!/usr/bin/env bash
# Memulihkan database dari cadangan. MENGHAPUS data yang ada. Uji dulu di database kosong, bukan di produksi.
# Pakai: DATABASE_URL=postgresql://... ./scripts/restore.sh backups/db-XXXX.dump
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL belum diisi}"
FILE="${1:?Sebutkan berkas .dump}"
[ -f "$FILE" ] || { echo "Berkas tidak ditemukan: $FILE"; exit 1; }
echo "Ini akan MENGGANTI isi database di: ${DATABASE_URL%%\?*}"
read -r -p "Ketik RESTORE untuk melanjutkan: " ANSWER
[ "$ANSWER" = "RESTORE" ] || { echo "Dibatalkan."; exit 1; }
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" "$FILE"
echo "Selesai. Jalankan scripts/smoke.mjs untuk memeriksa situs."
