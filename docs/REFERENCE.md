# PageRadar source reference

Source reviewed: [`aff652d9bb4c`](https://github.com/noel-ult/PageRadar/commit/aff652d9bb4c08a1d86fa79afe43e17c34df3800).

This reference records the checked-in source, scripts, configuration names, and route declarations. It is a navigation aid; service availability and successful test execution require separate verification.

## Package commands

Run each command in the directory containing its package manifest. A declared script is not necessarily a passing check; guides call out placeholders and known mismatches.

### apps/api/package.json

| Script | Shell command |
| --- | --- |
| `build` | `nest build` |
| `start` | `node dist/src/main` |
| `start:dev` | `nest start --watch` |
| `lint` | `eslint "src/**/*.ts"` |
| `typecheck` | `tsc --noEmit` |
| `test` | `jest --runInBand` |
| `prisma:generate` | `prisma generate` |
| `prisma:validate` | `prisma validate` |
| `prisma:migrate` | `prisma migrate deploy` |
| `prisma:db:check` | `tsx prisma/check-connection.ts` |
| `schema:generate` | `ts-node scripts/generate-schema.ts` |
| `start:worker` | `RUNTIME_ROLE=worker node dist/src/runtime.js` |
| `start:scheduler` | `RUNTIME_ROLE=scheduler node dist/src/runtime.js` |

Manifest: [apps/api/package.json](../apps/api/package.json).

### package.json

| Script | Shell command |
| --- | --- |
| `dev` | `next dev` |
| `dev:api` | `npm --workspace @pageradar/api run start:dev` |
| `build` | `npm run build:web && npm run build:api` |
| `build:web` | `next build` |
| `build:api` | `npm --workspace @pageradar/api run build` |
| `start` | `next start` |
| `start:api` | `npm --workspace @pageradar/api run start` |
| `start:all` | `./start.sh` |
| `lint` | `npm run lint:web && npm run lint:api` |
| `lint:web` | `eslint` |
| `lint:api` | `npm --workspace @pageradar/api run lint` |
| `typecheck` | `npm run typecheck:web && npm run typecheck:api` |
| `typecheck:web` | `next typegen && tsc --noEmit --incremental false` |
| `typecheck:api` | `npm --workspace @pageradar/api run typecheck` |
| `test` | `npm --workspace @pageradar/api run test` |
| `test:e2e` | `playwright test` |
| `prisma:db:check` | `npm --workspace @pageradar/api run prisma:db:check` |
| `prisma:migrate` | `npm --workspace @pageradar/api run prisma:migrate` |
| `graphql:generate` | `npm --workspace @pageradar/api run schema:generate && graphql-codegen --config codegen.ts` |
| `dev:local` | `node scripts/dev-local.mjs` |
| `test:integration` | `npm run build:api && node apps/api/test/integration.cjs` |
| `test:load` | `PAGERADAR_LOAD_TEST=true npm run test:integration` |
| `test:full` | `PAGERADAR_BROWSER_TEST=true npm run test:integration` |
| `test:e2e:real` | `playwright test --config playwright.real.config.ts` |
| `test:runtime` | `npm run build:api && node apps/api/test/runtime.cjs` |

Manifest: [package.json](../package.json).

## Configuration names

Names below are declared by source or example files. Example-only entries may be stale; consult the linked reader and project guide before relying on them. Secret values are intentionally omitted.

| Name | Declared/read in |
| --- | --- |
| `API_PORT` | [.env.example](../.env.example) |
| `APP_ORIGIN` | [.env.example](../.env.example), [app/api/session/route.ts](../app/api/session/route.ts), [app/graphql/route.ts](../app/graphql/route.ts) |
| `CI` | [playwright.config.ts](../playwright.config.ts) |
| `DATABASE_URL` | [.env.example](../.env.example) |
| `DIRECT_URL` | [.env.example](../.env.example) |
| `EMAIL_FROM` | [.env.example](../.env.example), [apps/api/src/notifications/email.config.ts](../apps/api/src/notifications/email.config.ts) |
| `FRONTEND_URL` | [.env.example](../.env.example), [apps/api/src/main.ts](../apps/api/src/main.ts), [apps/api/src/notifications/email.config.ts](../apps/api/src/notifications/email.config.ts), [apps/api/src/notifications/email.service.spec.ts](../apps/api/src/notifications/email.service.spec.ts) |
| `HISTORY_RETENTION_DAYS` | [.env.example](../.env.example), [apps/api/src/monitoring/monitoring.service.ts](../apps/api/src/monitoring/monitoring.service.ts) |
| `INTERNAL_API_URL` | [.env.example](../.env.example), [app/api/health/route.ts](../app/api/health/route.ts), [app/graphql/route.ts](../app/graphql/route.ts), [lib/server/email-proxy.ts](../lib/server/email-proxy.ts), [playwright.real.config.ts](../playwright.real.config.ts) |
| `JWT_EXPIRES_IN` | [.env.example](../.env.example) |
| `JWT_SECRET` | [.env.example](../.env.example) |
| `LLM_API_KEY` | [.env.example](../.env.example), [apps/api/src/monitoring/classification/semantic-analyzer.spec.ts](../apps/api/src/monitoring/classification/semantic-analyzer.spec.ts), [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts) |
| `LLM_BASE_URL` | [.env.example](../.env.example), [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts) |
| `LLM_DAILY_CALL_LIMIT` | [.env.example](../.env.example), [apps/api/src/monitoring/classification/semantic-analyzer.spec.ts](../apps/api/src/monitoring/classification/semantic-analyzer.spec.ts), [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts) |
| `LLM_ENABLED` | [.env.example](../.env.example), [apps/api/src/monitoring/classification/semantic-analyzer.spec.ts](../apps/api/src/monitoring/classification/semantic-analyzer.spec.ts), [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts) |
| `LLM_MODEL` | [.env.example](../.env.example), [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts) |
| `MANUAL_CHECKS_PER_HOUR` | [.env.example](../.env.example), [apps/api/src/monitoring/monitoring.service.ts](../apps/api/src/monitoring/monitoring.service.ts) |
| `MAX_WATCHES_PER_USER` | [.env.example](../.env.example), [apps/api/src/watches/watches.service.ts](../apps/api/src/watches/watches.service.ts) |
| `NEXT_PUBLIC_GRAPHQL_URL` | [.env.example](../.env.example), [lib/types.ts](../lib/types.ts) |
| `NODE_ENV` | [.env.example](../.env.example), [app/api/session/route.ts](../app/api/session/route.ts), [app/graphql/route.ts](../app/graphql/route.ts), [apps/api/src/monitoring/queue/monitoring-queue.service.ts](../apps/api/src/monitoring/queue/monitoring-queue.service.ts), [apps/api/src/notifications/email.config.ts](../apps/api/src/notifications/email.config.ts), [apps/api/src/notifications/email.service.spec.ts](../apps/api/src/notifications/email.service.spec.ts) |
| `OPENAI_API_KEY` | [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts) |
| `PAGERADAR_DIST_DIR` | [next.config.ts](../next.config.ts) |
| `PAGERADAR_FIXTURE_UPDATE_URL` | [tests/e2e/real.spec.ts](../tests/e2e/real.spec.ts) |
| `PAGERADAR_FIXTURE_URL` | [tests/e2e/real.spec.ts](../tests/e2e/real.spec.ts) |
| `PLAYWRIGHT_BASE_URL` | [playwright.config.ts](../playwright.config.ts) |
| `PLAYWRIGHT_PRODUCTION` | [playwright.config.ts](../playwright.config.ts) |
| `PORT` | [.env.example](../.env.example), [apps/api/src/main.ts](../apps/api/src/main.ts) |
| `POSTGRES_PASSWORD` | [.env.example](../.env.example) |
| `QUEUE_MODE` | [.env.example](../.env.example), [apps/api/src/monitoring/queue/monitoring-queue.service.ts](../apps/api/src/monitoring/queue/monitoring-queue.service.ts) |
| `REDIS_URL` | [.env.example](../.env.example), [apps/api/src/monitoring/queue/monitoring-queue.service.ts](../apps/api/src/monitoring/queue/monitoring-queue.service.ts) |
| `RESEND_API_KEY` | [.env.example](../.env.example), [apps/api/src/notifications/email.config.ts](../apps/api/src/notifications/email.config.ts) |
| `RESEND_WEBHOOK_SECRET` | [.env.example](../.env.example), [apps/api/src/notifications/email.config.ts](../apps/api/src/notifications/email.config.ts), [apps/api/src/notifications/email.service.spec.ts](../apps/api/src/notifications/email.service.spec.ts) |
| `RUNTIME_ROLE` | [.env.example](../.env.example), [apps/api/src/monitoring/queue/monitoring-queue.service.ts](../apps/api/src/monitoring/queue/monitoring-queue.service.ts), [apps/api/src/runtime.ts](../apps/api/src/runtime.ts) |
| `WEB_PORT` | [.env.example](../.env.example) |
| `WORKER_CONCURRENCY` | [.env.example](../.env.example), [apps/api/src/monitoring/queue/monitoring-queue.service.ts](../apps/api/src/monitoring/queue/monitoring-queue.service.ts) |

## GraphQL contract

Complete types, input fields, and nullability: [apps/api/src/schema.gql](../apps/api/src/schema.gql). Authentication and ownership are enforced in resolvers/services.

### Query

```graphql
type Query {
  me: UserModel!
  watches: [WatchModel!]!
  watch(id: ID!): WatchModel
  watchesPage(first: Int! = 25, after: String): WatchConnection!
  dashboardStats: DashboardStatsModel!
  changes(filter: ChangeFilterInput): [ChangeModel!]!
  changesPage(first: Int! = 25, after: String, filter: ChangeFilterInput): ChangeConnection!
  change(id: ID!): ChangeModel
  snapshots(watchId: ID!): [SnapshotModel!]!
  snapshotsPage(first: Int! = 25, after: String, watchId: ID!): SnapshotConnection!
  userInterests: [UserInterestModel!]!
  notifications: [NotificationModel!]!
  emailSettings: EmailSettings!
  emailDeliveriesPage(first: Int! = 25, after: String): NotificationConnection!
  unreadNotificationCount: Int!
  notificationsPage(first: Int! = 25, after: String): NotificationConnection!
  checkRun(id: ID!): CheckRunModel!
  checkRuns(first: Int! = 25, after: String, watchId: ID!): CheckRunConnection!
}
```

### Mutation

```graphql
type Mutation {
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  createWatch(input: CreateWatchInput!): WatchModel!
  updateWatch(id: ID!, input: UpdateWatchInput!): WatchModel!
  deleteWatch(id: ID!): Boolean!
  toggleWatch(id: ID!, isActive: Boolean!): WatchModel!
  updateInterests(inputs: [InterestInput!]!): [UserInterestModel!]!
  requestEmailVerification: Boolean!
  setEmailAlertsEnabled(enabled: Boolean!): EmailSettings!
  sendTestEmail: NotificationModel!
  markNotificationRead(id: ID!): Boolean!
  markAllNotificationsRead: Boolean!
  confirmEmailVerification(token: String!): Boolean!
  unsubscribeEmailAlerts(token: String!): Boolean!
  checkWatchNow(id: ID!): CheckRunModel!
  previewWatch(input: CreateWatchInput!): ContentPreview!
}
```

## File-based pages and handlers

- [app/(app)/changes/[id]/page.tsx](../app/%28app%29/changes/%5Bid%5D/page.tsx)
- [app/(app)/dashboard/page.tsx](../app/%28app%29/dashboard/page.tsx)
- [app/(app)/notifications/page.tsx](../app/%28app%29/notifications/page.tsx)
- [app/(app)/notifications/settings/page.tsx](../app/%28app%29/notifications/settings/page.tsx)
- [app/(app)/watches/[id]/edit/page.tsx](../app/%28app%29/watches/%5Bid%5D/edit/page.tsx)
- [app/(app)/watches/[id]/page.tsx](../app/%28app%29/watches/%5Bid%5D/page.tsx)
- [app/(app)/watches/new/page.tsx](../app/%28app%29/watches/new/page.tsx)
- [app/(app)/watches/page.tsx](../app/%28app%29/watches/page.tsx)
- [app/api/email/unsubscribe/route.ts](../app/api/email/unsubscribe/route.ts)
- [app/api/health/route.ts](../app/api/health/route.ts)
- [app/api/session/route.ts](../app/api/session/route.ts)
- [app/api/webhooks/resend/route.ts](../app/api/webhooks/resend/route.ts)
- [app/demo/page.tsx](../app/demo/page.tsx)
- [app/email/unsubscribe/page.tsx](../app/email/unsubscribe/page.tsx)
- [app/email/verify/page.tsx](../app/email/verify/page.tsx)
- [app/graphql/route.ts](../app/graphql/route.ts)
- [app/login/page.tsx](../app/login/page.tsx)
- [app/page.tsx](../app/page.tsx)
- [app/register/page.tsx](../app/register/page.tsx)

## Existing documentation

Historical plans/reports describe their own revision; use current source when they disagree.

- [AGENTS.md](../AGENTS.md)
- [BACKEND_CONTRACT.md](../BACKEND_CONTRACT.md)
- [CLAUDE.md](../CLAUDE.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [DESIGN.md](../DESIGN.md)
- [README.md](../README.md)
- [UX-CONTRACT.md](../UX-CONTRACT.md)
- [docs/PROJECT_GUIDE.md](../docs/PROJECT_GUIDE.md)
- [docs/REFERENCE.md](../docs/REFERENCE.md)
- [docs/email-notifications.md](../docs/email-notifications.md)

## Source and configuration map

Generated lockfiles, binary assets, compiled output, vendored dependencies, and cached bytecode are omitted. Test files remain listed so coverage can be located.

- [.env.example](../.env.example)
- [.github/workflows/ci.yml](../.github/workflows/ci.yml)
- [Dockerfile](../Dockerfile)
- [app/(app)/changes/[id]/page.tsx](../app/%28app%29/changes/%5Bid%5D/page.tsx)
- [app/(app)/dashboard/page.tsx](../app/%28app%29/dashboard/page.tsx)
- [app/(app)/layout.tsx](../app/%28app%29/layout.tsx)
- [app/(app)/notifications/page.tsx](../app/%28app%29/notifications/page.tsx)
- [app/(app)/notifications/settings/page.tsx](../app/%28app%29/notifications/settings/page.tsx)
- [app/(app)/watches/[id]/edit/page.tsx](../app/%28app%29/watches/%5Bid%5D/edit/page.tsx)
- [app/(app)/watches/[id]/page.tsx](../app/%28app%29/watches/%5Bid%5D/page.tsx)
- [app/(app)/watches/new/page.tsx](../app/%28app%29/watches/new/page.tsx)
- [app/(app)/watches/page.tsx](../app/%28app%29/watches/page.tsx)
- [app/api/email/unsubscribe/route.ts](../app/api/email/unsubscribe/route.ts)
- [app/api/health/route.ts](../app/api/health/route.ts)
- [app/api/session/route.ts](../app/api/session/route.ts)
- [app/api/webhooks/resend/route.ts](../app/api/webhooks/resend/route.ts)
- [app/demo/page.tsx](../app/demo/page.tsx)
- [app/email/unsubscribe/page.tsx](../app/email/unsubscribe/page.tsx)
- [app/email/verify/page.tsx](../app/email/verify/page.tsx)
- [app/error.tsx](../app/error.tsx)
- [app/globals.css](../app/globals.css)
- [app/graphql/route.ts](../app/graphql/route.ts)
- [app/layout.tsx](../app/layout.tsx)
- [app/login/page.tsx](../app/login/page.tsx)
- [app/not-found.tsx](../app/not-found.tsx)
- [app/page.tsx](../app/page.tsx)
- [app/providers.tsx](../app/providers.tsx)
- [app/register/page.tsx](../app/register/page.tsx)
- [apps/api/Dockerfile](../apps/api/Dockerfile)
- [apps/api/eslint.config.mjs](../apps/api/eslint.config.mjs)
- [apps/api/nest-cli.json](../apps/api/nest-cli.json)
- [apps/api/package.json](../apps/api/package.json)
- [apps/api/prisma/check-connection.ts](../apps/api/prisma/check-connection.ts)
- [apps/api/prisma/migrations/20260918000000_init/migration.sql](../apps/api/prisma/migrations/20260918000000_init/migration.sql)
- [apps/api/prisma/migrations/20261002000000_reliable_beta/migration.sql](../apps/api/prisma/migrations/20261002000000_reliable_beta/migration.sql)
- [apps/api/prisma/migrations/20261002000001_beta_backfill/migration.sql](../apps/api/prisma/migrations/20261002000001_beta_backfill/migration.sql)
- [apps/api/prisma/migrations/20261002000002_runtime_security_and_preferences/migration.sql](../apps/api/prisma/migrations/20261002000002_runtime_security_and_preferences/migration.sql)
- [apps/api/prisma/migrations/20261002123000_email_alerts/migration.sql](../apps/api/prisma/migrations/20261002123000_email_alerts/migration.sql)
- [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma)
- [apps/api/scripts/generate-schema.ts](../apps/api/scripts/generate-schema.ts)
- [apps/api/src/app.module.ts](../apps/api/src/app.module.ts)
- [apps/api/src/auth/auth.module.ts](../apps/api/src/auth/auth.module.ts)
- [apps/api/src/auth/auth.resolver.ts](../apps/api/src/auth/auth.resolver.ts)
- [apps/api/src/auth/auth.service.spec.ts](../apps/api/src/auth/auth.service.spec.ts)
- [apps/api/src/auth/auth.service.ts](../apps/api/src/auth/auth.service.ts)
- [apps/api/src/auth/dto/auth.input.ts](../apps/api/src/auth/dto/auth.input.ts)
- [apps/api/src/auth/guards/gql-auth.guard.ts](../apps/api/src/auth/guards/gql-auth.guard.ts)
- [apps/api/src/auth/models/auth.model.ts](../apps/api/src/auth/models/auth.model.ts)
- [apps/api/src/auth/strategies/jwt.strategy.ts](../apps/api/src/auth/strategies/jwt.strategy.ts)
- [apps/api/src/changes/changes.module.ts](../apps/api/src/changes/changes.module.ts)
- [apps/api/src/changes/changes.resolver.ts](../apps/api/src/changes/changes.resolver.ts)
- [apps/api/src/changes/changes.service.ts](../apps/api/src/changes/changes.service.ts)
- [apps/api/src/changes/dto/change-filter.input.ts](../apps/api/src/changes/dto/change-filter.input.ts)
- [apps/api/src/changes/models/change.model.ts](../apps/api/src/changes/models/change.model.ts)
- [apps/api/src/common/decorators/current-user.decorator.ts](../apps/api/src/common/decorators/current-user.decorator.ts)
- [apps/api/src/common/filters/prisma-exception.filter.ts](../apps/api/src/common/filters/prisma-exception.filter.ts)
- [apps/api/src/common/graphql-limits.ts](../apps/api/src/common/graphql-limits.ts)
- [apps/api/src/common/pagination/pagination.ts](../apps/api/src/common/pagination/pagination.ts)
- [apps/api/src/common/request-loaders.ts](../apps/api/src/common/request-loaders.ts)
- [apps/api/src/health.controller.ts](../apps/api/src/health.controller.ts)
- [apps/api/src/interests/dto/interest.input.ts](../apps/api/src/interests/dto/interest.input.ts)
- [apps/api/src/interests/interests.module.ts](../apps/api/src/interests/interests.module.ts)
- [apps/api/src/interests/interests.resolver.ts](../apps/api/src/interests/interests.resolver.ts)
- [apps/api/src/interests/interests.service.ts](../apps/api/src/interests/interests.service.ts)
- [apps/api/src/interests/models/interest.model.ts](../apps/api/src/interests/models/interest.model.ts)
- [apps/api/src/main.ts](../apps/api/src/main.ts)
- [apps/api/src/monitoring/classification/change-classifier.spec.ts](../apps/api/src/monitoring/classification/change-classifier.spec.ts)
- [apps/api/src/monitoring/classification/change-classifier.ts](../apps/api/src/monitoring/classification/change-classifier.ts)
- [apps/api/src/monitoring/classification/semantic-analyzer.spec.ts](../apps/api/src/monitoring/classification/semantic-analyzer.spec.ts)
- [apps/api/src/monitoring/classification/semantic-analyzer.ts](../apps/api/src/monitoring/classification/semantic-analyzer.ts)
- [apps/api/src/monitoring/diff/diff-engine.spec.ts](../apps/api/src/monitoring/diff/diff-engine.spec.ts)
- [apps/api/src/monitoring/diff/diff-engine.ts](../apps/api/src/monitoring/diff/diff-engine.ts)
- [apps/api/src/monitoring/fetch/safe-fetcher.spec.ts](../apps/api/src/monitoring/fetch/safe-fetcher.spec.ts)
- [apps/api/src/monitoring/fetch/safe-fetcher.ts](../apps/api/src/monitoring/fetch/safe-fetcher.ts)
- [apps/api/src/monitoring/models/check-run.model.ts](../apps/api/src/monitoring/models/check-run.model.ts)
- [apps/api/src/monitoring/monitoring.module.ts](../apps/api/src/monitoring/monitoring.module.ts)
- [apps/api/src/monitoring/monitoring.resolver.ts](../apps/api/src/monitoring/monitoring.resolver.ts)
- [apps/api/src/monitoring/monitoring.service.spec.ts](../apps/api/src/monitoring/monitoring.service.spec.ts)
- [apps/api/src/monitoring/monitoring.service.ts](../apps/api/src/monitoring/monitoring.service.ts)
- [apps/api/src/monitoring/normalization/content-normalizer.spec.ts](../apps/api/src/monitoring/normalization/content-normalizer.spec.ts)
- [apps/api/src/monitoring/normalization/content-normalizer.ts](../apps/api/src/monitoring/normalization/content-normalizer.ts)
- [apps/api/src/monitoring/queue/monitoring-queue.service.ts](../apps/api/src/monitoring/queue/monitoring-queue.service.ts)
- [apps/api/src/monitoring/queue/queue.module.ts](../apps/api/src/monitoring/queue/queue.module.ts)
- [apps/api/src/monitoring/security/url-validator.spec.ts](../apps/api/src/monitoring/security/url-validator.spec.ts)
- [apps/api/src/monitoring/security/url-validator.ts](../apps/api/src/monitoring/security/url-validator.ts)
- [apps/api/src/notifications/email-actions.resolver.ts](../apps/api/src/notifications/email-actions.resolver.ts)
- [apps/api/src/notifications/email.config.ts](../apps/api/src/notifications/email.config.ts)
- [apps/api/src/notifications/email.controller.ts](../apps/api/src/notifications/email.controller.ts)
- [apps/api/src/notifications/email.service.spec.ts](../apps/api/src/notifications/email.service.spec.ts)
- [apps/api/src/notifications/email.service.ts](../apps/api/src/notifications/email.service.ts)
- [apps/api/src/notifications/models/email.model.ts](../apps/api/src/notifications/models/email.model.ts)
- [apps/api/src/notifications/models/notification.model.ts](../apps/api/src/notifications/models/notification.model.ts)
- [apps/api/src/notifications/notifications.module.ts](../apps/api/src/notifications/notifications.module.ts)
- [apps/api/src/notifications/notifications.resolver.ts](../apps/api/src/notifications/notifications.resolver.ts)
- [apps/api/src/notifications/notifications.service.spec.ts](../apps/api/src/notifications/notifications.service.spec.ts)
- [apps/api/src/notifications/notifications.service.ts](../apps/api/src/notifications/notifications.service.ts)
- [apps/api/src/prisma/prisma.module.ts](../apps/api/src/prisma/prisma.module.ts)
- [apps/api/src/prisma/prisma.service.ts](../apps/api/src/prisma/prisma.service.ts)
- [apps/api/src/runtime.ts](../apps/api/src/runtime.ts)
- [apps/api/src/schema.gql](../apps/api/src/schema.gql)
- [apps/api/src/snapshots/models/snapshot.model.ts](../apps/api/src/snapshots/models/snapshot.model.ts)
- [apps/api/src/snapshots/snapshots.module.ts](../apps/api/src/snapshots/snapshots.module.ts)
- [apps/api/src/snapshots/snapshots.resolver.ts](../apps/api/src/snapshots/snapshots.resolver.ts)
- [apps/api/src/snapshots/snapshots.service.ts](../apps/api/src/snapshots/snapshots.service.ts)
- [apps/api/src/users/models/user.model.ts](../apps/api/src/users/models/user.model.ts)
- [apps/api/src/users/users.module.ts](../apps/api/src/users/users.module.ts)
- [apps/api/src/users/users.resolver.ts](../apps/api/src/users/users.resolver.ts)
- [apps/api/src/users/users.service.ts](../apps/api/src/users/users.service.ts)
- [apps/api/src/watches/dto/watch.input.spec.ts](../apps/api/src/watches/dto/watch.input.spec.ts)
- [apps/api/src/watches/dto/watch.input.ts](../apps/api/src/watches/dto/watch.input.ts)
- [apps/api/src/watches/models/dashboard-stats.model.ts](../apps/api/src/watches/models/dashboard-stats.model.ts)
- [apps/api/src/watches/models/watch.model.ts](../apps/api/src/watches/models/watch.model.ts)
- [apps/api/src/watches/watches.module.ts](../apps/api/src/watches/watches.module.ts)
- [apps/api/src/watches/watches.resolver.ts](../apps/api/src/watches/watches.resolver.ts)
- [apps/api/src/watches/watches.service.spec.ts](../apps/api/src/watches/watches.service.spec.ts)
- [apps/api/src/watches/watches.service.ts](../apps/api/src/watches/watches.service.ts)
- [apps/api/tsconfig.build.json](../apps/api/tsconfig.build.json)
- [apps/api/tsconfig.json](../apps/api/tsconfig.json)
- [codegen.ts](../codegen.ts)
- [components/auth/AuthLayout.tsx](../components/auth/AuthLayout.tsx)
- [components/auth/LoginForm.tsx](../components/auth/LoginForm.tsx)
- [components/auth/PasswordInput.tsx](../components/auth/PasswordInput.tsx)
- [components/auth/RegisterForm.tsx](../components/auth/RegisterForm.tsx)
- [components/changes/BeforeAfter.tsx](../components/changes/BeforeAfter.tsx)
- [components/changes/BriefPreview.tsx](../components/changes/BriefPreview.tsx)
- [components/changes/ChangeCard.tsx](../components/changes/ChangeCard.tsx)
- [components/changes/ImportanceBadge.tsx](../components/changes/ImportanceBadge.tsx)
- [components/common/Brand.tsx](../components/common/Brand.tsx)
- [components/common/ConfirmDialog.tsx](../components/common/ConfirmDialog.tsx)
- [components/common/Icon.tsx](../components/common/Icon.tsx)
- [components/common/RadarScope.tsx](../components/common/RadarScope.tsx)
- [components/common/ThemeControl.tsx](../components/common/ThemeControl.tsx)
- [components/common/states.tsx](../components/common/states.tsx)
- [components/common/useUnsavedChanges.tsx](../components/common/useUnsavedChanges.tsx)
- [components/layout/PublicHeader.tsx](../components/layout/PublicHeader.tsx)
- [components/layout/chrome.tsx](../components/layout/chrome.tsx)
- [components/notifications/EmailAction.tsx](../components/notifications/EmailAction.tsx)
- [components/watches/InterestSelector.tsx](../components/watches/InterestSelector.tsx)
- [components/watches/WatchCard.tsx](../components/watches/WatchCard.tsx)
- [components/watches/WatchForm.tsx](../components/watches/WatchForm.tsx)
- [components/watches/WatchStatus.tsx](../components/watches/WatchStatus.tsx)
- [components/watches/WatchTimeline.tsx](../components/watches/WatchTimeline.tsx)
- [docker-compose.yml](../docker-compose.yml)
- [eslint.config.mjs](../eslint.config.mjs)
- [graphql/fragments.ts](../graphql/fragments.ts)
- [graphql/generated.ts](../graphql/generated.ts)
- [graphql/mutations.ts](../graphql/mutations.ts)
- [graphql/queries.ts](../graphql/queries.ts)
- [lib/apollo/client.ts](../lib/apollo/client.ts)
- [lib/auth.ts](../lib/auth.ts)
- [lib/format.ts](../lib/format.ts)
- [lib/server/email-proxy.ts](../lib/server/email-proxy.ts)
- [lib/types.ts](../lib/types.ts)
- [lib/useHydrated.ts](../lib/useHydrated.ts)
- [next.config.ts](../next.config.ts)
- [package.json](../package.json)
- [playwright.config.ts](../playwright.config.ts)
- [playwright.real.config.ts](../playwright.real.config.ts)
- [postcss.config.mjs](../postcss.config.mjs)
- [premium-ui.json](../premium-ui.json)
- [proxy.ts](../proxy.ts)
- [scripts/dev-local.mjs](../scripts/dev-local.mjs)
- [scripts/local-services.mjs](../scripts/local-services.mjs)
- [scripts/start-browser-test.mjs](../scripts/start-browser-test.mjs)
- [tests/e2e/design.spec.ts](../tests/e2e/design.spec.ts)
- [tests/e2e/email.spec.ts](../tests/e2e/email.spec.ts)
- [tests/e2e/main.spec.ts](../tests/e2e/main.spec.ts)
- [tests/e2e/real.spec.ts](../tests/e2e/real.spec.ts)
- [tests/e2e/refresh.spec.ts](../tests/e2e/refresh.spec.ts)
- [tsconfig.json](../tsconfig.json)
