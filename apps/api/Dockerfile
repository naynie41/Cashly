# ─── Dev stage: hot reload via bind mount (selected by docker-compose.override.yml)
FROM node:20-alpine AS dev

RUN npm install -g pnpm

# Native runtime deps (Puppeteer + Prisma OpenSSL) — same as runner stage
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# tsx --watch uses chokidar — needs polling for bind-mounted volumes on Win/macOS
ENV CHOKIDAR_USEPOLLING=true

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# Generate Prisma client at image build time. Schema is also bind-mounted at
# runtime, so re-run `pnpm --filter api exec prisma generate` after schema edits.
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm --filter api exec prisma generate

EXPOSE 3001

CMD ["pnpm", "--filter", "api", "dev"]


# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types
COPY apps/api ./apps/api

# Generate Prisma client (writes into /app/node_modules/.pnpm/@prisma+client@*/.../.prisma)
RUN pnpm --filter api exec prisma generate

# Compile TypeScript
RUN pnpm --filter api exec tsc --project tsconfig.json

# Bundle production deps into /app/pruned
RUN pnpm --filter api --prod deploy --legacy /app/pruned

# pnpm deploy doesn't carry the generated Prisma client (.prisma folder).
# Copy it from the builder install into the matching pnpm store path in pruned.
# The glob keeps this resilient to Prisma version bumps.
RUN set -e; \
    SRC=$(ls -d /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma); \
    DEST=$(ls -d /app/pruned/node_modules/.pnpm/@prisma+client@*/node_modules); \
    cp -r "$SRC" "$DEST/.prisma"


# ─── Stage 2: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN npm install -g pnpm

# Security: run as non-root
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 fastify

WORKDIR /app

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./dist

# Copy Prisma schema + generated client (needed at runtime)
COPY --from=builder /app/apps/api/prisma ./prisma

# Copy package.json (needed by some runtime resolvers)
COPY --from=builder /app/apps/api/package.json ./package.json

# Copy production node_modules from the pruned bundle
COPY --from=builder /app/pruned/node_modules ./node_modules

# Native deps:
#   - chromium + fonts/libs: Puppeteer runtime
#   - openssl: required by Prisma's libquery_engine on Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    openssl

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

USER fastify

EXPOSE 3001

# Entrypoint: run the compiled server
CMD ["node", "dist/index.js"]