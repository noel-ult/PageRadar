# PageRadar backend foundation

The PageRadar API is a NestJS, code-first GraphQL application backed by Prisma and an existing Supabase PostgreSQL project. It deliberately does not contain a frontend, job queue, webpage fetching, monitoring engine, or notification delivery.

## Requirements

- Node.js 22+ and npm
- An existing Supabase account/project with Postgres access

## Setup

```bash
git switch feature/backend-foundation
cp .env.example .env
npm install
npm run prisma:generate
```

Set these variables in the root `.env`; do not commit it or expose them to a frontend:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime Supabase Postgres URI (use the pooler URI where appropriate) |
| `DIRECT_URL` | Direct Supabase Postgres URI for Prisma migrations |
| `JWT_SECRET` | A random secret of at least 32 characters |
| `JWT_EXPIRES_IN` | JWT lifetime, e.g. `7d` |
| `PORT` | API port, default `3001` |

In the Supabase dashboard, open **Connect** for your project to obtain the Postgres connection strings. Use the transaction pooler connection for application runtime if your deployment uses many connections; retain a direct connection for Prisma migrations. The API uses Prisma directly and does not use the Supabase JavaScript client.

## Database safety and Prisma

First inspect an existing database before applying the included initial migration:

```bash
cd apps/api
npx prisma db pull --print
npm run prisma:validate
npm run prisma:db:check
```

If the PageRadar tables have not been created and the database is controlled for this project, deploy the additive migration:

```bash
npm run prisma:migrate
```

Never run `prisma migrate reset` against the existing Supabase project. The migration creates only PageRadar tables and enables RLS so those tables are not inadvertently exposed through Supabase's Data API. NestJS owns authorization using the Prisma connection.

## Run and verify

From the repository root:

```bash
npm run start:dev
npm run lint
npm run typecheck
npm test
npm run build
```

The health endpoint is `GET /health`. It returns `status: ok` only after a safe database `SELECT 1` succeeds. GraphQL is available at `/graphql`; Playground is enabled outside production.

## GraphQL examples

```graphql
mutation {
  register(input: { name: "Ada", email: "ada@example.com", password: "password1" }) {
    accessToken
    user { id name email }
  }
}
```

Send later protected requests with `Authorization: Bearer <accessToken>`:

```graphql
mutation {
  createWatch(input: { url: "https://example.com", title: "Example", checkInterval: 3600 }) {
    id title isActive
  }
}
```

Important operations include `login`, `me`, `watches`, `watch`, `changes`, `snapshots`, `userInterests`, and `notifications`; mutations include `register`, `createWatch`, `updateWatch`, `deleteWatch`, `toggleWatch`, and `updateInterests`.

## Schema

`User` owns `Watch`, `UserInterest`, and `Notification` rows. A watch owns immutable `Snapshot`, `Change`, and `CheckRun` history. Changes can refer to old and new snapshots. Foreign keys and cascading deletion prevent orphaned records; every protected resolver additionally checks application-level ownership.
