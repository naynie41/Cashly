FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

COPY packages/types ./packages/types

COPY apps/api ./apps/api

RUN pnpm --filter api exec prisma generate

RUN pnpm --filter api exec tsc --project tsconfig.json

RUN pnpm --filter api --prod deploy /app/pruned


FROM node:20-alpine AS runner 

RUN npm install -g pnpm

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 fastify

WORKDIR /app

# Copy pruned production node_modules
COPY --from=builder /app/pruned/node_modules ./node_modules

# Copy compiled output
COPY --from=builder /app/apps/api/dist ./dist

# Copy Prisma schema + generated client (needed at runtime)
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/apps/api/package.json ./package.json


 && echo "Chromium installed for Puppeteer"



USER fastify

EXPOSE 3001

CMD ["node", "dist/index.js"]
