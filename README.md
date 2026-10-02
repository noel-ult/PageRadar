# PageRadar

PageRadar watches important webpages and explains what changed, why it matters, and the previous and current values. This repository implements a reliable beta using its existing Next.js, NestJS/GraphQL, Prisma/PostgreSQL and BullMQ/Redis architecture.

## What works

- Register, sign in and sign out using a server-managed HttpOnly session cookie.
- Create and edit watches with an interval, interest categories, minimum alert importance, email preference, and optional include/exclude CSS selectors. Preview extracted content before saving.
- Schedule checks in bounded batches. “Check now” returns a durable check record immediately. Duplicate requests coalesce.
- Fetch public HTML with DNS-pinned connections, redirect validation, timeouts, streamed size limits, retries, and shared domain pacing.
- Extract headings, ordinary text, links and document destinations; suppress boilerplate, tracking parameters, copyright and rendering-clock noise.
- Establish a baseline, detect section changes and multiple events, classify deadlines, eligibility, status, prices, requirements, announcements, documents and links. Exact dates with a year can produce factual extension summaries.
- View paginated check history, failures/retries, before/after evidence, severity, confidence and affected sections.
- Create in-app alerts and maintain unread state. Email alerts require verified recipients and explicit account opt-in. Qualifying changes from one check share one message. Delivery uses durable queues, retries, escaped content and provider idempotency keys; signed callbacks track delivery, bounces and complaints.

## Local development

Use Node.js 22 or newer and npm. Start from the example environment and replace `JWT_SECRET` with a random secret of at least 32 characters:

```bash
cp .env.example .env
npm install
npm --workspace @pageradar/api run prisma:generate
npm run dev:local
```

`dev:local` starts persistent local PostgreSQL and Redis, applies migrations, starts the API, and starts the frontend (or reuses a frontend already on port 3000). Local data and downloaded binaries live in `.local/`, which is ignored by Git. The first Redis startup downloads and compiles Redis; network access and a C build toolchain are required. PostgreSQL ships with the development dependency. The helper supports a **local** database URL; it does not replace an externally configured database. Stop it with Ctrl+C.

Open **http://localhost:3000**. Register an account in the selected database before signing in. An account from another database will not exist in a fresh local database.

### Using existing PostgreSQL and Redis

Configure `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL` and `JWT_SECRET` in `.env`. Use the direct database connection for migrations, especially with a pooled runtime connection. Then run:

```bash
npm run prisma:migrate
npm run dev:api
# In another terminal:
npm run dev
```

The API runs on port 3001. The browser uses `/graphql`; the Next.js server forwards to `INTERNAL_API_URL`. `NEXT_PUBLIC_GRAPHQL_URL` is retained for compatibility but browser traffic always uses the same-origin proxy. Set `APP_ORIGIN` to the exact public origin behind a reverse proxy.

### Login troubleshooting

A network error generally means the GraphQL API is unavailable, often because PostgreSQL or Redis was not started. Check **http://localhost:3001/health** and **http://localhost:3000/api/health**. `npm run dev:local` starts the dependencies together. The login form preserves entered values and reports when the API is unavailable. Authentication errors from a running API indicate account or password problems instead.

## Runtime and reliability

```text
Browser → Next.js cookie proxy → GraphQL API → PostgreSQL
Scheduler → durable CheckRun records → Redis/BullMQ → workers
Worker → safe fetch → normalize → classify → atomic snapshot/change/alerts
Scheduler → pending email deliveries → Redis/BullMQ → email worker
```

- `RUNTIME_ROLE=api`, `scheduler`, or `worker` separates production processes; `all` is intended for local development.
- PostgreSQL `CheckRun` records are the enqueue outbox. Pending records survive Redis outages. Stable queue IDs, a database partial unique index and expiring execution leases prevent concurrent duplicate checks and allow recovery.
- Snapshot, change, completion and notification records commit in one transaction. Editing URLs/selectors establishes a new baseline and cancels stale checks. Pausing cancels scheduled work; a manual check remains available.
- Transient fetch and email failures have up to three persisted attempts with backoff. Fetches respect bounded `Retry-After` values.
- Redis is required in production. `QUEUE_MODE=memory` is an explicitly selected development option, with reduced durability.
- Default limits: 100 watches per user, 60 manual checks per hour, 20 content previews per hour, and worker concurrency 5. Authentication and GraphQL calls also have shared rate limits; query depth/complexity and pagination are bounded.
- `/health` checks PostgreSQL, Redis/queue counts and recent scheduler/worker heartbeats. A missing runtime returns 503. Observe failed runs, queue failures, retry counts and pending email status during operation.
- `HISTORY_RETENTION_DAYS` defaults to 90 for terminal check runs and unreferenced old snapshots. Change records and their referenced snapshots remain available; this setting is not a blanket deletion policy for all history.

## Optional providers

Email configuration is optional: missing configuration leaves in-app alerts working and shows email as unavailable. See [email setup and operations](docs/email-notifications.md) for Resend, DNS, Dokploy environment variables, webhook setup, verification and rollout. Existing users start with email alerts off; old queued alerts are disabled during migration. No backlog is sent on activation.

Semantic classification is opt-in: set `LLM_ENABLED=true`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` and optionally `LLM_DAILY_CALL_LIMIT` (default 100). Only ambiguous meaningful changes use it; deterministic changes do not. Webpage text is isolated as untrusted user data with fixed system instructions, bounded samples, a timeout, output validation and a shared daily budget. Classification cannot execute webpage instructions or use tools. Failure falls back to heuristics.

## Docker Compose

Compose starts PostgreSQL, Redis, a one-shot migration process, API, scheduler, worker and frontend. Use a dedicated environment file with `POSTGRES_PASSWORD`, `JWT_SECRET` and `FRONTEND_URL`; **omit local `DATABASE_URL`/`DIRECT_URL`** to use the Compose PostgreSQL service. If providing external URLs, they must be reachable from inside containers. URL-encode password characters when using connection strings.

```bash
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker logs --tail 100 api scheduler worker
```

The frontend is published on port 3000. PostgreSQL, Redis and the API use the internal container network. Put the frontend behind HTTPS in production so its secure session cookie is sent. Increase worker capacity using replicas and `WORKER_CONCURRENCY`; monitor target-domain pacing and database connection capacity.

## Backups, migrations and recovery

Stop legacy scheduler/worker processes before upgrading, apply migrations, then start the new runtime processes. Take a PostgreSQL backup before production migrations; never use `prisma migrate reset` against production. Beta migrations preserve existing watches and changes, preserve enabled account interests on legacy watches and add execution/delivery state, rebaseline legacy extraction formats, and label legacy notifications as in-app history. Legacy incomplete jobs become failed history before the new concurrency constraint is installed.

For the Compose database:

```bash
docker compose --env-file .env.docker exec -T postgres pg_dump -U pageradar -d pageradar -Fc > pageradar-backup.dump
```

Restore into an **empty, separate database** and verify it before switching production traffic:

```bash
docker compose --env-file .env.docker exec -T postgres createdb -U pageradar pageradar_restore
docker compose --env-file .env.docker exec -T postgres pg_restore -U pageradar -d pageradar_restore --no-owner < pageradar-backup.dump
```

Verify user/watch/change counts, run migration status, and point an isolated application at the restored database. Redis uses append-only persistence. If its queue data is lost, the scheduler republishes pending database outbox records; completed work remains in PostgreSQL. Stop scheduler and workers during a restore to avoid creating alerts or making checks from the restored copy.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run graphql:generate
npm run build
npx playwright install chromium
npm run test:e2e           # desktop/mobile interaction and failure paths
PLAYWRIGHT_PRODUCTION=1 npm run test:e2e # after build:web; standalone production UI
npm run test:integration   # isolated real PostgreSQL, Redis, HTTP fixture, API and worker
npm run test:full          # integration plus real browser login/monitoring/alert flow
npm run test:runtime       # independent API/scheduler/worker readiness
npm run test:load          # 1,000 distinct-domain watches, five-worker fixture test
```

Integration tests use isolated temporary databases and ports 55432/56379; browser servers use 3100/3200. They require local process/network permissions. The email provider is mocked, so no real email is sent. Fixture URL validation is overridden only inside the test application. Generated GraphQL schema/documents are checked for drift in CI. A fixture load test validates bounded scheduling and processing; it does not establish capacity for arbitrary internet sites or hundreds of thousands of watches.

## Scope after the beta

JavaScript browser rendering, full-page PDF/file monitoring, signed user webhooks, account recovery, billing and high-scale capacity tuning remain future work. Pages requiring login or browser challenges produce an explicit failure and preserve their baseline. Ambiguous dates are shown as evidence without inventing a time interval.
