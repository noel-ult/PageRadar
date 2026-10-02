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
