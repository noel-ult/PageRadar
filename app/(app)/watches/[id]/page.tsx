"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { WATCH_QUERY } from "@/graphql/queries";
import {
  DELETE_WATCH_MUTATION,
  PAUSE_WATCH_MUTATION,
  RESUME_WATCH_MUTATION,
  CHECK_WATCH_NOW_MUTATION,
} from "@/graphql/mutations";
import type { Watch } from "@/lib/types";
import {
  formatChangeType,
  formatDateTime,
  friendlyErrorMessage,
  getAfterValue,
  getBeforeValue,
} from "@/lib/format";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/states";
import { WatchStatusBadge } from "@/components/watches/WatchStatus";
import { ImportanceBadge } from "@/components/changes/ImportanceBadge";

export default function WatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(WATCH_QUERY, {
    variables: { id },
  });
  const [pauseWatch, pauseS] = useMutation(PAUSE_WATCH_MUTATION);
  const [resumeWatch, resumeS] = useMutation(RESUME_WATCH_MUTATION);
  const [deleteWatch, deleteS] = useMutation(DELETE_WATCH_MUTATION);
  const [checkWatch, checkS] = useMutation(CHECK_WATCH_NOW_MUTATION);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watch: Watch | undefined = (data as any)?.watch;
  const busy = pauseS.loading || resumeS.loading || deleteS.loading || checkS.loading;

  if (loading) return <LoadingState message="Loading watch..." />;
  if (error || !watch)
    return (
      <ErrorState
        message={`Unable to load this watch. ${error ? friendlyErrorMessage(error) : ""}`}
        onRetry={() => void refetch()}
      />
    );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = ((data as any)?.changes ?? watch.changes ?? []) as NonNullable<Watch["changes"]>;
  const latest = watch.latestChange ?? history[0] ?? null;

  async function wrap(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await refetch();
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
    }
  }

  async function onDelete() {
    setActionError(null);
    try {
      await deleteWatch({ variables: { id } });
      router.replace("/watches");
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/watches"
        className="w-fit text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
      >
        ← Back to watches
      </Link>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{watch.name}</h1>
            <a
              href={watch.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-xs text-zinc-400 hover:text-zinc-200 truncate max-w-xl transition"
            >
              {watch.url}
            </a>
          </div>
          <WatchStatusBadge isActive={watch.isActive} />
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-4 text-xs sm:grid-cols-3 pt-5 border-t border-zinc-800/60">
          <div>
            <dt className="text-zinc-500">Check interval</dt>
            <dd className="mt-1 font-medium text-zinc-200">{watch.checkIntervalMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Last checked</dt>
            <dd className="mt-1 font-medium text-zinc-200">{formatDateTime(watch.lastCheckedAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Monitored fields</dt>
            <dd className="mt-1 font-medium text-zinc-200">
              {watch.interests?.length ? watch.interests.join(", ") : "All"}
            </dd>
          </div>
        </dl>
        {actionError ? (
          <p role="alert" className="mt-4 text-xs text-red-400">
            {actionError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-zinc-800/60">
          <button
            type="button"
            disabled={busy}
            onClick={() => void wrap(() => checkWatch({ variables: { id } }))}
            className="rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-teal-300 transition disabled:opacity-50"
          >
            {checkS.loading ? "Checking..." : "Check now"}
          </button>
          {watch.isActive ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void wrap(() => pauseWatch({ variables: { id } }))}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition disabled:opacity-50"
            >
              {pauseS.loading ? "Pausing..." : "Pause"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void wrap(() => resumeWatch({ variables: { id } }))}
              className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition disabled:opacity-50"
            >
              {resumeS.loading ? "Resuming..." : "Resume"}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg border border-red-900/60 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 transition disabled:opacity-50"
          >
            Delete
          </button>
        </div>
        {confirmDelete ? (
          <div
            role="alertdialog"
            aria-label="Confirm delete"
            className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 p-4"
          >
            <p className="text-xs text-red-200">
              Are you sure you want to delete this watch? This cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteS.loading}
                onClick={() => void onDelete()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteS.loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <section aria-label="Latest change" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-200">Latest change</h2>
        {!latest ? (
          <EmptyState title="No changes detected yet." />
        ) : (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-200">
                {formatChangeType(latest.changeType)}
              </span>
              <ImportanceBadge importance={latest.importance} />
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <dt className="text-zinc-500">Previous</dt>
                <dd className="mt-1 text-zinc-300 line-through decoration-zinc-600">{getBeforeValue(latest)}</dd>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <dt className="text-zinc-500">Current</dt>
                <dd className="mt-1 font-medium text-zinc-100">{getAfterValue(latest)}</dd>
              </div>
            </dl>
            {latest.explanation ? (
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{latest.explanation}</p>
            ) : null}
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
              <span className="text-zinc-500">
                Detected {formatDateTime(latest.detectedAt)}
              </span>
              <Link
                href={`/changes/${latest.id}`}
                className="text-zinc-300 hover:text-zinc-100 underline transition"
              >
                View details →
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Change history" className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-200">Change history</h2>
        {history.length === 0 ? (
          <EmptyState title="No changes detected yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition hover:bg-zinc-900/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/changes/${c.id}`}
                    className="text-sm font-medium text-zinc-200 hover:text-white transition"
                  >
                    {formatChangeType(c.changeType)}
                  </Link>
                  <ImportanceBadge importance={c.importance} />
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">
                  <span className="line-through text-zinc-500">{getBeforeValue(c)}</span> → <span className="text-zinc-200">{getAfterValue(c)}</span>
                </p>
                <p className="mt-2 text-[11px] text-zinc-500">
                  Detected {formatDateTime(c.detectedAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
