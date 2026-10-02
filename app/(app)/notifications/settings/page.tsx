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
  const button =
    "rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400";
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link
        href="/notifications"
        className="w-fit text-sm text-zinc-400 hover:text-white"
      >
        ← Notifications
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Notification settings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Receive important webpage updates in your inbox, even when PageRadar
          is closed.
        </p>
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
          className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}
      {feedback ? (
        <p
          role="status"
          className="rounded-lg border border-zinc-700 p-4 text-sm text-teal-300"
        >
          {feedback}
        </p>
      ) : null}
      {!data.available ? (
        <p
          role="status"
          className="rounded-lg border border-zinc-700 p-4 text-sm text-zinc-300"
        >
          Email delivery is not available yet. Your watches continue collecting
          changes.
        </p>
      ) : null}
      {data.suppressed ? (
        <p
          role="alert"
          className="rounded-lg border border-red-900/50 p-4 text-sm text-red-300"
        >
          {data.suppressionReason} Contact support to restore email delivery.
        </p>
      ) : null}
      <section
        aria-label="Email address"
        className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5"
      >
        <div>
          <h2 className="text-sm font-semibold">Email address</h2>
          <p className="mt-2 break-words text-sm text-zinc-300">{data.email}</p>
          <p className="mt-2 text-xs text-zinc-400">
            {data.verifiedAt ? "Verified" : "Verification required"}
          </p>
        </div>
        {!data.verifiedAt ? (
          <button
            type="button"
            disabled={busy || !data.available || data.suppressed || cooldown}
            onClick={() => void action("verify")}
            className={button}
          >
            {verification.loading
              ? "Queuing email…"
              : cooldown
                ? "Verification requested — wait one minute"
                : "Send verification email"}
          </button>
        ) : null}
      </section>
      <section
        aria-label="Email alerts"
        className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5"
      >
        <h2 className="text-sm font-semibold">Important change alerts</h2>
        <p className="text-sm text-zinc-400">
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
          <p className="text-xs text-zinc-400">
            Verify your address to enable alerts and send a test email.
          </p>
        ) : null}
        <Link href="/watches" className="w-fit text-sm text-teal-300 underline">
          Manage email preferences for each watch
        </Link>
      </section>
      <section aria-label="Email delivery history" className="grid gap-3">
        <h2 className="text-sm font-semibold">Email delivery history</h2>
        <p className="text-xs text-zinc-400">
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
              <li
                key={item.id}
                className="rounded-xl border border-zinc-800 p-4"
              >
                <p className="text-sm break-words">{item.message}</p>
                <p className="mt-2 text-xs text-zinc-300">
                  {deliveryLabels[item.status] ?? item.status}
                </p>
                <time className="mt-2 block text-xs text-zinc-500">
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
