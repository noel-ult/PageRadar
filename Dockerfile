# syntax=docker/dockerfile:1

# --- Base ---
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl curl

# --- Builder ---
FROM base AS builder
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG NEXT_PUBLIC_GRAPHQL_URL=/graphql
ENV NEXT_PUBLIC_GRAPHQL_URL=${NEXT_PUBLIC_GRAPHQL_URL}

# Generate Prisma client and compile API and Web
RUN npm --prefix apps/api run prisma:generate
RUN npm run build:api
RUN npm run build:web

# --- Runner ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Copy API build output & Prisma
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=appuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=appuser:nodejs /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder --chown=appuser:nodejs /app/apps/api/package.json ./apps/api/package.json

# Copy Web standalone build output & static assets
COPY --from=builder --chown=appuser:nodejs /app/public ./public
COPY --from=builder --chown=appuser:nodejs /app/.next/standalone ./
COPY --from=builder --chown=appuser:nodejs /app/.next/static ./.next/static

# Copy startup script
COPY --chown=appuser:nodejs start.sh ./start.sh
RUN chmod +x ./start.sh

USER appuser

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["./start.sh"]
