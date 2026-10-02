"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  EMAIL_DELIVERIES_QUERY,
  EMAIL_SETTINGS_QUERY,
} from "@/graphql/queries";
import {
  REQUEST_EMAIL_VERIFICATION,
  SEND_TEST_EMAIL,
  SET_EMAIL_ALERTS,
} from "@/graphql/mutations";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  RefreshError,
} from "@/components/common/states";
import { Icon } from "@/components/common/Icon";
import { formatDateTime, friendlyErrorMessage } from "@/lib/format";

const deliveryLabels: Record<string, string> = {
  PENDING: "Queued",
  ACCEPTED: "Accepted for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
  DISABLED: "Not sent",
  BOUNCED: "Address could not receive email",
  COMPLAINED: "Reported as unwanted",
  SENT: "Sent",
};
export default function NotificationSettingsPage() {
  const [after, setAfter] = useState<string | null>(null);
  const settings = useQuery(EMAIL_SETTINGS_QUERY);
  const history = useQuery(EMAIL_DELIVERIES_QUERY, { variables: { after } });
  const [requestVerification, verification] = useMutation(
    REQUEST_EMAIL_VERIFICATION,
  );
  const [setEnabled, preference] = useMutation(SET_EMAIL_ALERTS);
  const [sendTest, testEmail] = useMutation(SEND_TEST_EMAIL);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(false);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(false), 60000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const busy = verification.loading || preference.loading || testEmail.loading;
  const data = settings.data?.emailSettings;
  if (settings.loading && !data)
    return <LoadingState message="Loading notification settings…" />;
  if (!data)
    return (
      <ErrorState
        message="Unable to load notification settings."
        onRetry={() => {
          void settings.refetch().catch(() => {});
        }}
      />
    );
  async function action(kind: "verify" | "toggle" | "test") {
    if (busy || !data) return;
    setError("");
    setFeedback("");
    try {
      if (kind === "verify") {
        await requestVerification();
        setCooldown(true);
        setFeedback(
          "Verification email queued. Check your inbox and spam folder, then follow the confirmation link.",
        );
      } else if (kind === "toggle") {
        await setEnabled({ variables: { enabled: !data.enabled } });
        setFeedback(
          data.enabled
            ? "Email alerts are turned off. Queued alerts have been cancelled."
            : "Email alerts are enabled for watches with email delivery turned on.",
        );
      } else {
        await sendTest();
        setFeedback("Test email queued. Delivery progress appears below.");
      }
      await Promise.all([settings.refetch(), history.refetch()]);
    } catch (failure) {
      setError(friendlyErrorMessage(failure));
    }
  }
  const button = "btn";
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <Link
        href="/notifications"
        className="w-fit text-sm text-muted hover:text-ink"
      >
        ← Notifications
      </Link>
      <div className="page-heading mb-0">
        <div>
          <p className="eyebrow mb-2">Stay informed</p>
          <h1>Notification settings</h1>
          <p className="mt-2 text-sm text-muted">
            Receive important webpage updates in your inbox, even when PageRadar
            is closed.
          </p>
        </div>
      </div>
      {settings.error ? (
        <RefreshError
          onRetry={() => {
            void settings.refetch().catch(() => {});
          }}
        />
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/50 bg-danger-soft/20 p-4 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p
          role="status"
          className="rounded-lg border border-line p-4 text-sm text-primary"
        >
          {feedback}
        </p>
      ) : null}
      {!data.available ? (
        <p
          role="status"
          className="rounded-lg border border-line p-4 text-sm text-muted"
        >
          Email delivery is not available yet. Your watches continue collecting
          changes.
        </p>
      ) : null}
      {data.suppressed ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/50 p-4 text-sm text-danger"
        >
          {data.suppressionReason} Contact support to restore email delivery.
        </p>
      ) : null}
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <section aria-label="Email address" className="panel grid gap-4 p-6">
          <div>
            <div className="flex gap-3 items-center">
              <Icon name="globe" className="text-primary" />
              <h2 className="text-lg font-bold">Email address</h2>
            </div>
            <p className="mt-2 break-words text-sm text-muted">{data.email}</p>
            <p
              className={`badge mt-3 ${data.verifiedAt ? "badge-success" : "badge-warning"}`}
            >
              {data.verifiedAt ? "Verified" : "Verification required"}
            </p>
            <p className="text-sm text-muted mt-4">
              Verify ownership of your address before enabling email delivery.
            </p>
          </div>
          {!data.verifiedAt ? (
            <button
              type="button"
              disabled={busy || !data.available || data.suppressed || cooldown}
              onClick={() => void action("verify")}
              className={`${button} btn-wrap`}
            >
              {verification.loading
                ? "Queuing email…"
                : cooldown
                  ? "Verification requested — wait one minute"
                  : "Send verification email"}
            </button>
          ) : null}
        </section>
        <section aria-label="Email alerts" className="panel grid gap-4 p-6">
          <div className="flex gap-3 items-center">
            <Icon name="bell" className="text-primary" />
            <h2 className="text-lg font-bold">Important change alerts</h2>
          </div>
          <p className="text-sm text-muted">
            Alerts use each watch’s categories and minimum importance. Changes
            from one page check arrive together. Detection follows your watch’s
            check interval.
          </p>
          <p className="text-sm">
            Email alerts: <strong>{data.enabled ? "On" : "Off"}</strong>
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={
                busy ||
                (!data.enabled &&
                  (!data.available || !data.verifiedAt || data.suppressed))
              }
              onClick={() => void action("toggle")}
              className={button}
            >
              {preference.loading
                ? "Saving…"
                : data.enabled
                  ? "Turn off email alerts"
                  : "Enable email alerts"}
            </button>
            <button
              type="button"
              disabled={
                busy || !data.available || !data.verifiedAt || data.suppressed
              }
              onClick={() => void action("test")}
              className={button}
            >
              {testEmail.loading ? "Queuing test…" : "Send test email"}
            </button>
          </div>
          {!data.verifiedAt ? (
            <p className="text-sm text-muted">
              Verify your address to enable alerts and send a test email.
            </p>
          ) : null}
          <Link
            href="/watches"
            className="w-fit text-sm text-primary underline"
          >
            Manage email preferences for each watch
          </Link>
        </section>
      </div>
      <section aria-label="Email delivery history" className="grid gap-3">
        <h2 className="text-lg font-bold mt-3">Email delivery history</h2>
        <p className="text-sm text-muted">
          Accepted means the email service received the message. Delivered means
          the receiving mail server accepted it.
        </p>
        {history.error ? (
          history.data ? (
            <RefreshError
              onRetry={() => {
                void history.refetch().catch(() => {});
              }}
            />
          ) : (
            <ErrorState
              message="Unable to load email history."
              onRetry={() => {
                void history.refetch().catch(() => {});
              }}
            />
          )
        ) : null}
        {history.loading && !history.data ? (
          <LoadingState message="Loading email history…" />
        ) : history.data?.emailDeliveriesPage.nodes.length ? (
          <ul className="grid gap-3">
            {history.data.emailDeliveriesPage.nodes.map((item) => (
              <li key={item.id} className="panel p-5">
                <p className="text-sm break-words">{item.message}</p>
                <p
                  className={`badge mt-3 ${item.status === "DELIVERED" ? "badge-success" : ["FAILED", "BOUNCED", "COMPLAINED"].includes(item.status) ? "badge-danger" : "badge-primary"}`}
                >
                  {deliveryLabels[item.status] ?? item.status}
                </p>
                <time className="mt-2 block text-sm text-muted">
                  {formatDateTime(
                    item.deliveredAt ?? item.sentAt ?? item.createdAt,
                  )}
                </time>
              </li>
            ))}
          </ul>
        ) : !history.error && history.data ? (
          <EmptyState
            title="No emails yet"
            description="Verification messages, test emails, and important change alerts will appear here."
          />
        ) : null}
        <div className="flex gap-3">
          {after ? (
            <button
              type="button"
              className={button}
              onClick={() => setAfter(null)}
            >
              Latest emails
            </button>
          ) : null}
          {history.data?.emailDeliveriesPage.pageInfo.hasNextPage ? (
            <button
              type="button"
              disabled={history.loading}
              className={button}
              onClick={() =>
                setAfter(
                  history.data?.emailDeliveriesPage.pageInfo.endCursor ?? null,
                )
              }
            >
              Older emails
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
