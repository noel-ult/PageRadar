# PageRadar interaction contract

| Capability         | Canonical owner                                                       | Source of truth                          | Allowed variants                                                 | Verification                  |
| ------------------ | --------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| Form               | components/watches/WatchForm.tsx; components/auth                     | GraphQL input validation; DESIGN.md      | create / edit / authentication                                   | tests/e2e/main.spec.ts        |
| Scrollbar          | app/globals.css                                                       | DESIGN.md                                | document / content preview                                       | browser checks                |
| CRUD               | WatchForm and watches routes                                          | watch ownership; revision baseline rules | return to detail after save, list after delete                   | integration and browser tests |
| Dialog             | components/common/ConfirmDialog.tsx                                   | DESIGN.md                                | delete watch                                                     | keyboard and recovery tests   |
| Async status       | components/common/states.tsx; WatchTimeline                           | durable CheckRun status                  | queued / retry / terminal                                        | integration tests             |
| Background refresh | lib/apollo/client.ts; app/providers.tsx; components/common/states.tsx | persisted GraphQL data                   | cached display / periodic refresh / return and reconnect refresh | tests/e2e/refresh.spec.ts     |
| Notifications      | NotificationBell and notifications route                              | persisted read state                     | popover / paginated list                                         | browser tests                 |

Login creates a server-managed HttpOnly session. API authorization is the permission boundary. Backend outage errors explain service availability without blaming the user's internet connection.

Pause cancels scheduled work; manual checks remain available while paused. URL or selector changes create a new baseline and preserve previous history. Category and importance choices are stored per watch. Empty categories mean all meaningful changes.

Deletion confirms the named watch and loss of monitoring history. Cancel is initially focused; Escape dismisses only while idle. Failures keep the confirmation open and entered form values intact.

Page content and summaries are untrusted plain text. External email is queued transactionally; provider acceptance is separate from delivery. No global webhook is used for private user alerts.

Read views revalidate on navigation and refresh in the background every 5–15 seconds. Hidden or offline tabs pause polling; returning to the tab or reconnecting revalidates active queries. Refresh failures keep the last loaded data visible with a retry notice. Settings load fresh before opening the form and never refresh away unsaved input. These refreshes read monitoring results; webpage checks still follow each watch’s configured schedule.

## Email alerts

`app/(app)/notifications/settings/page.tsx` owns global email opt-in, verification requests, test messages and paginated delivery history. GraphQL ownership and persisted User/Notification records are authoritative. Existing watch forms own category, importance and per-watch email preferences. Read queries use the established background refresh; settings mutations explicitly refetch related records.

`components/notifications/EmailAction.tsx` owns public verification and unsubscribe confirmation. Tokens arrive in URL fragments, are removed from history after hydration, and require an explicit button press. Opening a link does not change account preferences. Verification never enables email alerts. One-click unsubscribe is a POST endpoint for email providers.

The address, verification, opt-in and suppression states remain separate. Unavailable providers have an explicit state with disabled send actions. Turning alerts off remains available during a provider outage. Queued means waiting for submission; accepted means provider acceptance; delivered means recipient server acceptance. No state claims inbox placement. Send failures preserve settings and show a recoverable message.

Verification: `apps/api/src/notifications/email.service.spec.ts`, isolated PostgreSQL/Redis integration, and `tests/e2e/email.spec.ts` on desktop and mobile.

## Intelligence workspace redesign

The approved design in DESIGN.md replaces the previous appearance across all existing routes. Routes, permission checks, monitoring schedules, stored preferences, and notification delivery semantics retain their existing owners.

| Capability | Canonical owner                                   | Source of truth                                  | Allowed variants                                                     | Verification                           |
| ---------- | ------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- | -------------------------------------- |
| Theme      | ThemeControl.tsx; app/layout.tsx; app/globals.css | Device preference and pageradar-theme-v1         | light / dark / system                                                | tests/e2e/design.spec.ts               |
| Navigation | components/layout/chrome.tsx                      | Existing application routes                      | Desktop sidebar / mobile modal drawer                                | tests/e2e/design.spec.ts; main.spec.ts |
| Evidence   | BeforeAfter.tsx; ChangeCard.tsx                   | Persisted change values, explanation, importance | Full evidence / capped feed excerpt / clearly labeled public example | main.spec.ts; design.spec.ts           |
| Password   | components/auth/PasswordInput.tsx                 | Login/register form values                       | Hidden by default / explicit show                                    | tests/e2e/design.spec.ts               |

Monitored pages use server cursor pagination. Desktop tables and mobile cards show the same page records and actions; no search or filtering of a partial dataset is represented as a global search. Overview prioritizes importance within the latest ten changes and labels the view as recent updates. Important-change and failed-check counts are across history; changes-this-week reflects the existing seven-day API count.

The mobile navigation uses a native modal dialog: focus remains inside, Escape closes, and closing restores the navigation trigger. Theme selects deliberately retain native platform popup behavior. Global theme initialization precedes paint; changing the device preference updates System mode only. Theme preference is independent of authentication.

WatchForm tracks unsaved preferences. In-app links open the shared confirmation dialog with a Discard changes action; Cancel keeps all values. Successful saves permit their established destination. A beforeunload guard covers tab close/reload. Browser history navigation is not intercepted by this link guard. Native browser lifecycle confirmation is used only for actual unload.

Radar studio visual revision: RadarScope is decorative and aria-hidden. It never implies a running job, health status, or actual page position. Summary totals retain their original API meaning. Existing form, theme, pagination, notification, and unsaved-change contracts are preserved.
