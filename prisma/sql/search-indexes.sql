-- Indeks pencarian teks (opsional, sangat disarankan di atas beberapa ratus properti).
-- Pencarian "contains" tanpa indeks memindai seluruh tabel; trigram membuatnya memakai indeks.
-- Jalankan sekali: psql "$DATABASE_URL" -f prisma/sql/search-indexes.sql
-- (atau salin ke migrasi: npx prisma migrate dev --create-only --name search_indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS property_title_trgm   ON "Property" USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS property_address_trgm ON "Property" USING gin (address gin_trgm_ops);
CREATE INDEX IF NOT EXISTS property_code_trgm    ON "Property" USING gin (code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS media_name_trgm       ON "Media"    USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lead_name_trgm        ON "Lead"     USING gin (name gin_trgm_ops);
