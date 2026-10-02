"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@apollo/client/react";
import {
  CONFIRM_EMAIL_VERIFICATION,
  UNSUBSCRIBE_EMAIL_ALERTS,
} from "@/graphql/mutations";
import { friendlyErrorMessage } from "@/lib/format";
import { LoadingState } from "@/components/common/states";

export function EmailAction({ kind }: { kind: "verify" | "unsubscribe" }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [verify, verification] = useMutation(CONFIRM_EMAIL_VERIFICATION);
  const [unsubscribe, unsubscription] = useMutation(UNSUBSCRIBE_EMAIL_ALERTS);
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    // Keep action secrets out of request URLs, referrers, and browser history.
    window.history.replaceState(null, "", window.location.pathname);
    // This synchronizes browser-only fragment data after hydration.
    setToken(value);
  }, []);
  const busy = verification.loading || unsubscription.loading;
  async function confirm() {
    if (busy || !token) return;
    setError("");
    try {
      if (kind === "verify") await verify({ variables: { token } });
      else await unsubscribe({ variables: { token } });
      setCompleted(true);
    } catch (failure) {
      setError(friendlyErrorMessage(failure));
    }
  }
  return (
    <main className="mx-auto grid min-h-screen max-w-lg content-center gap-5 px-6 py-12">
      <Link href="/" className="w-fit text-sm font-semibold">
        PageRadar
      </Link>
      <h1 className="text-xl font-semibold">
        {kind === "verify"
          ? completed
            ? "Email address verified"
            : "Verify your email address"
          : completed
            ? "Email alerts turned off"
            : "Unsubscribe from email alerts"}
      </h1>
      {token === null ? (
        <LoadingState message="Loading email link…" />
      ) : completed ? (
        <>
          <p className="text-sm text-zinc-400">
            {kind === "verify"
              ? "Your address is verified. Enable alerts in notification settings to receive important changes."
              : "You will no longer receive change-alert emails. You can enable them again in notification settings."}
          </p>
          <Link
            href="/notifications/settings"
            className="w-fit text-sm text-teal-300 underline"
          >
            Notification settings
          </Link>
        </>
      ) : !/^[A-Za-z0-9_-]{43}$/.test(token) ? (
        <p role="alert" className="text-sm text-red-300">
          This link is invalid. Open the complete link from your email.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            {kind === "verify"
              ? "Confirm that this is your email address. Email alerts require a separate opt-in in settings."
              : "Turn off all PageRadar change-alert emails for this account. Queued alerts will be cancelled."}
          </p>
          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="rounded-lg bg-white px-4 py-3 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {busy
              ? "Confirming…"
              : kind === "verify"
                ? "Confirm email address"
                : "Turn off email alerts"}
          </button>
        </>
      )}
    </main>
  );
}
