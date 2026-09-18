# PageRadar — Backend GraphQL Contract (frontend expectation)

> Repository inspection (2026-09-18): `C:\pageradar` was **empty** — no Next.js
> app and no NestJS backend existed. The frontend below was built from scratch
> against the contract described here. **No live backend was found to verify
> against.** If your NestJS backend differs, update `graphql/*.ts` to match;
> the UI already isolates all operations in `graphql/queries.ts` and
> `graphql/mutations.ts`.

## Endpoint

- `NEXT_PUBLIC_GRAPHQL_URL` (e.g. `http://localhost:3000/graphql`)

## Auth

Frontend stores the login token in `localStorage` (`pageradar_token`, mirrored
to a cookie of the same name for Next.js `middleware.ts`) and sends:

```text
Authorization: Bearer <token>
```

## Expected operations

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    accessToken   # also accepts access_token / token
    user { id name email }
  }
}

mutation Register($name: String!, $email: String!, $password: String!) {
  register(name: $name, email: $email, password: $password) {
    id name email
  }
}

query Me { me { id name email } }

query DashboardStats {
  dashboardStats { activeWatches recentChanges importantChanges }
}

query Watches {
  watches {
    id name url status checkIntervalMinutes interests
    lastCheckedAt createdAt
    latestChange { id changeType importance section before after oldValue newValue explanation detectedAt }
  }
}

query Watch($id: ID!) {
  watch(id: $id) {
    id name url status checkIntervalMinutes interests lastCheckedAt createdAt
    latestChange { ... }
    changes { id changeType importance section before after oldValue newValue explanation detectedAt }
  }
}

query RecentChanges($limit: Int) {
  changes(limit: $limit) {
    id changeType importance section before after oldValue newValue explanation detectedAt
    watch { id name url }
  }
}

query Change($id: ID!) {
  change(id: $id) {
    id changeType importance section before after oldValue newValue explanation detectedAt
    watch { id name url }
  }
}

mutation CreateWatch($input: CreateWatchInput!) {
  createWatch(input: $input) { id name url status checkIntervalMinutes interests lastCheckedAt }
}
# CreateWatchInput: { name: String!, url: String!, checkIntervalMinutes: Int!, interests: [String!]! }
# interests values: DEADLINE, ELIGIBILITY, STATUS, REQUIREMENT, PRICE, LINK

mutation PauseWatch($id: ID!) { pauseWatch(id: $id) { id status } }
mutation ResumeWatch($id: ID!) { resumeWatch(id: $id) { id status } }
mutation DeleteWatch($id: ID!) { deleteWatch(id: $id) }
mutation CheckWatchNow($id: ID!) { checkWatchNow(id: $id) { id status lastCheckedAt } }
mutation UpdateWatch($id: ID!, $input: UpdateWatchInput!) {
  updateWatch(id: $id, input: $input) { id name url status checkIntervalMinutes interests lastCheckedAt }
}
```

## Enums (as used by the UI)

- `Watch.status`: `ACTIVE` | `PAUSED`
- `Change.changeType`: `DEADLINE_CHANGED | ELIGIBILITY_CHANGED | STATUS_CHANGED | REQUIREMENT_CHANGED | PRICE_CHANGED | LINK_CHANGED | SECTION_CHANGED | CONTENT_CHANGED`
- `Change.importance`: `LOW | MEDIUM | HIGH | CRITICAL` (displayed as provided; never computed client-side)

## Missing-backend report

- [ ] No NestJS app / GraphQL schema was present in the repo to verify field names.
- [ ] If the backend names differ (e.g. `checkWatch` instead of `checkWatchNow`,
      `intervalMinutes` instead of `checkIntervalMinutes`, or `url` nested under
      a `target` object), the frontend queries above are the single place to fix.
- [ ] `dashboardStats` and `changes(limit:)` have documented fallbacks in the
      dashboard (derived from `watches` when the fields are absent), so the UI
      degrades gracefully rather than showing fake data.
