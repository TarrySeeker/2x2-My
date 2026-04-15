# Multi-stage Dockerfile для 2x2-shop (Next.js 16 + pnpm + Node 20).
# Опциональная альтернатива PM2-деплою — используется если пользователь предпочтёт Docker Compose.
# Использование:
#   docker build -t 2x2-shop .
#   docker run --env-file .env.production -p 3000:3000 2x2-shop
# Для прод: docker-compose.yml в deploy/docker/

ARG NODE_VERSION=20.18.0

# ---------- deps ----------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm install --frozen-lockfile

# ---------- builder ----------
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm build

# ---------- runner ----------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Если включён output: "standalone" в next.config.ts — копируем только standalone.
# Иначе копируем весь .next + node_modules (больше размер, но проще).
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:3000/api/health | grep -q '"status":"healthy"' || exit 1

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
