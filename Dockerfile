# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- dependensi (butuh package-lock.json yang di-commit)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- alat sekali jalan: migrasi dan seed (docker compose run --rm tools ...)
FROM deps AS tools
COPY . .
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- build aplikasi
# `next build` membaca database untuk merender beranda dan halaman indeks. Berikan DATABASE_URL yang
# sudah dimigrasi dan berisi data yang SAMA dengan produksi (lihat DEPLOYMENT.md). ARG ini tidak masuk image akhir.
FROM deps AS builder
COPY . .
ARG DATABASE_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- image akhir, tanpa devDependencies dan tanpa kode sumber
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system app && useradd --system --gid app --home-dir /app app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
# Mesin Prisma ikut disalin secara eksplisit agar tidak bergantung pada pelacakan berkas otomatis.
COPY --from=builder --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=app:app /app/node_modules/@prisma/client ./node_modules/@prisma/client
RUN mkdir -p public/uploads && chown -R app:app public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
