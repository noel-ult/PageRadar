# PageRadar

Next.js frontend with a NestJS, Apollo GraphQL, Prisma, and Supabase PostgreSQL backend.

```bash
cp .env.example .env
npm install
npm run prisma:migrate
npm run dev:api
# another terminal
npm run dev
```

Frontend: `http://localhost:3000`; GraphQL API: `http://localhost:3001/graphql`.

## Docker Deployment

Build and run both the API and Web services using Docker Compose:

```bash
# Ensure .env is populated with your Supabase credentials
docker compose up --build
```

Or build individual containers:

```bash
# Frontend
docker build -f Dockerfile.web -t pageradar-web .

# API
docker build -f Dockerfile.api -t pageradar-api .
```

## Dokploy deployment

Deploy this repository as a **Docker Compose** application from the `main`
branch, using `docker-compose.yml`. Configure the domain on the `web` service
with container port `3000`; do not point the public domain at the API service.

Set these variables in Dokploy's environment-variable screen (not in Git):

```text
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
NEXT_PUBLIC_GRAPHQL_URL=/graphql
INTERNAL_API_URL=http://api:3001/graphql
FRONTEND_URL=https://your-domain.example
```

`DATABASE_URL` is the Supabase pooled connection string used by the API at
runtime. `DIRECT_URL` is the direct Supabase PostgreSQL connection string used
by Prisma migrations. Both remain server-side secrets. The public frontend
talks to `/graphql`, which Next.js securely proxies to the internal `api`
container.

After deployment, verify these URLs before enabling the public domain:

```text
https://your-domain.example/
https://your-domain.example/demo
https://your-domain.example/api/health
```

The final health endpoint returns HTTP 200 only when both the web service and
the NestJS API can reach Supabase. A 503 indicates the API logs should be
checked for missing environment variables, an unreachable Supabase host, or a
failed Prisma migration.
