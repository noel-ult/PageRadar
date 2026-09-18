#!/bin/sh
set -e

echo "=========================================="
echo " Starting PageRadar Fullstack Application"
echo "=========================================="

# Graceful shutdown handler
cleanup() {
  echo "Received shutdown signal. Stopping services..."
  if [ -n "$API_PID" ]; then
    kill -TERM "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$WEB_PID" ]; then
    kill -TERM "$WEB_PID" 2>/dev/null || true
  fi
  wait
  exit 0
}

trap cleanup INT TERM

# The public Dokploy service is always the Next.js app on port 3000. Keep this
# separate from the internal NestJS port even when Dokploy provides a PORT
# environment variable for the application.
API_PORT="${API_PORT:-3001}"
WEB_PORT="${WEB_PORT:-3000}"

# Run database migrations if DATABASE_URL is present
if [ -n "$DATABASE_URL" ]; then
  echo "==> [Database] Running Prisma migrations..."
  if [ -f "apps/api/prisma/schema.prisma" ]; then
    apps/api/node_modules/.bin/prisma migrate deploy --schema=apps/api/prisma/schema.prisma || echo "[Warning] Migration deploy failed or database unreachable; continuing startup..."
  elif [ -f "prisma/schema.prisma" ]; then
    npx prisma migrate deploy --schema=prisma/schema.prisma || echo "[Warning] Migration deploy failed or database unreachable; continuing startup..."
  fi
fi

# Start Backend API
echo "==> [Backend] Starting NestJS API..."
if [ -f "apps/api/dist/src/main.js" ]; then
  PORT="$API_PORT" node apps/api/dist/src/main.js &
  API_PID=$!
elif [ -f "dist/src/main.js" ]; then
  PORT="$API_PORT" node dist/src/main.js &
  API_PID=$!
elif [ -d "apps/api" ]; then
  PORT="$API_PORT" npm --workspace=@pageradar/api run start &
  API_PID=$!
else
  echo "[Error] Could not find API entrypoint"
  exit 1
fi

echo "==> [Backend] NestJS API started (PID $API_PID) on port $API_PORT"

# Start Frontend
echo "==> [Frontend] Starting Next.js Web application on port $WEB_PORT..."
export HOSTNAME="0.0.0.0"
export PORT="$WEB_PORT"
export INTERNAL_API_URL="http://127.0.0.1:3001/graphql"

if [ -f "server.js" ]; then
  node server.js &
  WEB_PID=$!
elif [ -f ".next/standalone/server.js" ]; then
  node .next/standalone/server.js &
  WEB_PID=$!
else
  npm run start &
  WEB_PID=$!
fi

echo "==> [Frontend] Next.js started (PID $WEB_PID) on port $WEB_PORT"
echo "==> PageRadar is ready and listening."

# Wait for processes
wait $API_PID $WEB_PID
cleanup
