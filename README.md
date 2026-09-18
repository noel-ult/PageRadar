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
