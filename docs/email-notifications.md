# Email alerts

## Provider setup

1. Create a Resend account at https://resend.com/signup and a Full access API key for domain/webhook setup. Keep keys out of chat and Git. A sending-only key scoped to the verified domain can replace it for runtime after setup.
2. Add `notify.noelbiju.in` as a sending domain in Resend. Copy the **exact records Resend generates** into the authoritative DNS service for `noelbiju.in`. Values vary by region and domain; do not invent them. In Cloudflare these records must be DNS-only. Leave the existing website/mail records intact.
3. Verify the domain in Resend. Disable open and click tracking. Set a DMARC TXT record for `_dmarc.notify` (for example `v=DMARC1; p=none`) if none exists; do not create two records at the same name. Review alignment and aggregate reports before increasing enforcement.
4. Add a webhook targeting `https://pageradar.noelbiju.in/api/webhooks/resend`, subscribed to `email.delivered`, `email.bounced`, `email.complained`, and `email.failed`. Save its signing secret.
5. In Dokploy, open the **PageRadar application → Environment**, preserve existing database/JWT/Redis settings, add these runtime values, save and redeploy:

```dotenv
RESEND_API_KEY=<private runtime key>
EMAIL_FROM="PageRadar <alerts@notify.noelbiju.in>"
RESEND_WEBHOOK_SECRET=<private webhook signing secret>
FRONTEND_URL=https://pageradar.noelbiju.in
```

Use the values without placeholder brackets. Keep `NEXT_PUBLIC_GRAPHQL_URL=/graphql`; email credentials are server-only. All API, scheduler and worker instances need the same email configuration. The existing durable Redis connection remains required. No new Redis service is necessary.

## User setup

Open **Notifications → Email notification settings**. Send a verification message, open the full link from the inbox, and explicitly confirm the address. Return to settings and enable email alerts, then send a test message. Select email delivery, interests and minimum importance on each watch. Existing users must verify and opt in; verification alone does not enable alerts. Check frequency determines when changes can be detected.

## Delivery behavior

- Meaningful changes must pass existing watch category/importance preferences. Changes from one completed check are grouped into one email. The email includes watch title, priority, detection time, previous/current excerpts, details links and unsubscribe links.
- Untrusted text is escaped. Up to 2,000 characters of each previous/current value appear in email; full evidence remains in change history.
- Messages and recipient are persisted before submission. A stable idempotency key is reused across retries. Three persisted attempts use backoff and bounded Retry-After. Uncertain submissions stop after 23 hours, before Resend’s 24-hour idempotency expiration; an operator must inspect provider logs before any manual recovery.
- Status is queued → accepted → delivered, or failed/not sent/bounced/complained. Delivery is recipient-server acceptance, not a guarantee of inbox placement.
- Signed raw-body callbacks are persisted/deduplicated. Early callbacks are reconciled against accepted submissions. Unknown provider IDs expire after 24 hours. Concurrent and out-of-order delivery callbacks cannot undo bounce/complaint suppression.
- Bounces and complaints disable account alerts and pending messages. Restore only after support verifies recipient availability and consent; there is deliberately no public unsuppress button. Provider 4xx submission failures do not trigger endless retries.
- Manual unsubscribe requires confirmation; RFC 8058 one-click unsubscribe uses POST. GET link scanners cannot opt in, verify or unsubscribe. Unsubscribe cancels pending change alerts; a message already submitted to a provider cannot be recalled.
- Missing provider configuration records disabled alerts, without accumulating a backlog to send later. Provider failure does not stop page monitoring or in-app alerts.

## Operations and privacy

Apply Prisma migrations through normal deployment. The additive email migration starts all account preferences off and disables legacy pending email records. Token hashes and callback records have RLS enabled and Data API privileges revoked for Supabase anon/authenticated roles. Application JWT ownership is enforced in NestJS. Raw token links exist in private queued provider messages; keep database backups/access restricted and never log message bodies or secrets.

Public routes: POST `/api/webhooks/resend` and POST `/api/email/unsubscribe?token=...`. Only the signature-verified callback can report delivery. A missing/invalid signature returns 400. Apply host request limits and log redaction to public unsubscribe URLs, which carry capability tokens. Ordinary email links use fragments to avoid HTTP/referrer logging.

Monitor failed deliveries, expired leases, retries, pending age and webhook failures. A provider key or webhook rotation requires updating runtime secrets across roles. No automated job deletes reusable unsubscribe tokens; retain them to honor old emails. Verification tokens expire after 24 hours. Deleting an account cascades its email records. The existing snapshot/check retention does not delete email audit history; establish an email retention policy before high-volume rollout.

## Validation and rollout

`npm test` covers consent checks, message escaping, idempotency, retry limits and signature verification. `npm run test:integration` uses temporary PostgreSQL/Redis and mocked provider submissions to exercise verification, single-use tokens, signed/duplicate/early/out-of-order callbacks, owner isolation, unsubscribe and suppression. `PLAYWRIGHT_PRODUCTION=1 npm run test:e2e` after building checks settings and public confirmations on desktop/mobile.

Before declaring production email active, verify DNS, send an own-account verification/test email, confirm a delivered callback, and generate one controlled important watch change. Confirm the grouped email and unsubscribe cancellation. These tests require a configured Resend account and a recipient you control; mock-provider success is not proof of real delivery.

Provider references: [domain setup](https://resend.com/docs/api-reference/domains/create-domain), [webhooks](https://resend.com/docs/api-reference/webhooks/create-webhook), [idempotency retention](https://resend.com/changelog/idempotency-keys).
