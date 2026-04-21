# =============================================================
# 2x2-shop — production Dockerfile (Next.js 16 standalone)
# =============================================================
# Multi-stage build:
#   1. builder   — устанавливает все зависимости и собирает Next.js
#   2. runner    — минимальный образ только с .next/standalone + static
#
# Архитектура (см. brief цепочки 3):
#   * `output: "standalone"` уже включён в next.config.ts → финальный
#     образ копирует только то, что реально нужно для запуска
#     (`server.js` + минимальный node_modules + public + .next/static).
#   * USER nextjs (UID 1001) — non-root для безопасности.
#   * HEALTHCHECK через wget (curl нет в node:20-alpine по умолчанию).
#
# Замечание: мёртвый stage `deps` (P2 из Chain 1 review) удалён —
# он устанавливал --prod зависимости, но их никто не использовал
# (standalone сам собирает свой node_modules).
#
# Размер итогового образа: ~180 MB (Next.js + Node.js + tini).
# =============================================================

# ---- Stage 1: builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm через corepack (без глобальной установки)
RUN corepack enable pnpm

# Зависимости — в отдельном слое, чтобы переиспользовать кэш Docker
# при изменениях кода (но не lockfile).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Копируем исходники и собираем
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm build

# ---- Stage 2: runner ----
FROM node:20-alpine AS runner
WORKDIR /app

# Безопасность: non-root user (UID/GID 1001).
# В alpine стандартные команды addgroup/adduser, не useradd.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# wget нужен для HEALTHCHECK; tini — корректный PID 1 для node-процесса
# (правильно проксирует SIGTERM, без него graceful shutdown не работает).
RUN apk add --no-cache wget tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Копируем артефакты сборки (standalone уже включает минимальный
# node_modules для server.js).
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static

# Миграции и seed копируем явно — нужны для apply-migrations.sh
# (запускается из этого же контейнера через `docker compose exec`).
COPY --from=builder --chown=nextjs:nodejs /app/db ./db

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
