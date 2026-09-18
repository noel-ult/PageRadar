"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { WATCH_QUERY } from "@/graphql/queries";
import {
  CHECK_WATCH_NOW_MUTATION,
  DELETE_WATCH_MUTATION,
  PAUSE_WATCH_MUTATION,
  RESUME_WATCH_MUTATION,
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
  const [checkNow, checkS] = useMutation(CHECK_WATCH_NOW_MUTATION);
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

  const history = watch.changes ?? [];
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
        className="w-fit text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
      >
        ← Back to watches
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{watch.name}</h1>
            <a
              href={watch.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              {watch.url}
            </a>
          </div>
          <WatchStatusBadge status={watch.status} />
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Monitoring interval</dt>
            <dd className="font-medium">{watch.checkIntervalMinutes} minutes</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Last checked</dt>
            <dd className="font-medium">{formatDateTime(watch.lastCheckedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Monitoring</dt>
            <dd className="font-medium">
              {watch.interests.length > 0 ? watch.interests.join(", ") : "—"}
            </dd>
          </div>
        </dl>
        {actionError ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {actionError}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void wrap(() => checkNow({ variables: { id } }))}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {checkS.loading ? "Checking webpage..." : "Check Now"}
          </button>
          {watch.status === "ACTIVE" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void wrap(() => pauseWatch({ variables: { id } }))}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {pauseS.loading ? "Pausing..." : "Pause"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void wrap(() => resumeWatch({ variables: { id } }))}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {resumeS.loading ? "Resuming..." : "Resume"}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
        {confirmDelete ? (
          <div
            role="alertdialog"
            aria-label="Confirm delete"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm text-red-800">
              Are you sure you want to delete this watch?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteS.loading}
                onClick={() => void onDelete()}
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleteS.loading ? "Deleting watch..." : "Delete"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <section aria-label="Latest change" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Latest Change</h2>
        {!latest ? (
          <EmptyState title="No changes detected yet." />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">
                {formatChangeType(latest.changeType)}
              </span>
              <ImportanceBadge importance={latest.importance} />
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Before</dt>
                <dd className="mt-1">{getBeforeValue(latest)}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">After</dt>
                <dd className="mt-1 font-medium">{getAfterValue(latest)}</dd>
              </div>
            </dl>
            {latest.explanation ? (
              <p className="mt-3 text-sm text-slate-700">{latest.explanation}</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">
              Detected {formatDateTime(latest.detectedAt)}
            </p>
            <Link
              href={`/changes/${latest.id}`}
              className="mt-3 inline-block text-sm font-medium text-slate-900 underline"
            >
              View change details
            </Link>
          </div>
        )}
      </section>

      <section aria-label="Change history" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Change History</h2>
        {history.length === 0 ? (
          <EmptyState title="No changes detected yet." />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/changes/${c.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {formatChangeType(c.changeType)}
                  </Link>
                  <ImportanceBadge importance={c.importance} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {getBeforeValue(c)} → {getAfterValue(c)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
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
