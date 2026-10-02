"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client/react";
import { WATCH_QUERY, WATCH_HISTORY_QUERY } from "@/graphql/queries";
import {
  DELETE_WATCH_MUTATION,
  PAUSE_WATCH_MUTATION,
  RESUME_WATCH_MUTATION,
  CHECK_WATCH_NOW_MUTATION,
} from "@/graphql/mutations";

import {
  formatChangeType,
  formatDateTime,
  friendlyErrorMessage,
  getAfterValue,
  getBeforeValue,
} from "@/lib/format";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
import { WatchStatusBadge } from "@/components/watches/WatchStatus";
import { WatchTimeline } from "@/components/watches/WatchTimeline";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
    pollInterval: 10_000,
  });

  const historyQ = useQuery(WATCH_HISTORY_QUERY, {
    variables: { id },
    pollInterval: 5000,
  });
  const inProgress =
    historyQ.data?.checkRuns.nodes.some((run) =>
      ["QUEUED", "RUNNING", "RETRYING"].includes(run.status),
    ) ?? false;
  const [pauseWatch, pauseS] = useMutation(PAUSE_WATCH_MUTATION);
  const [resumeWatch, resumeS] = useMutation(RESUME_WATCH_MUTATION);
  const [deleteWatch, deleteS] = useMutation(DELETE_WATCH_MUTATION);
  const [checkWatch, checkS] = useMutation(CHECK_WATCH_NOW_MUTATION);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const watch = data?.watch;
  const busy =
    pauseS.loading || resumeS.loading || deleteS.loading || checkS.loading;

  if (loading && !data) return <LoadingState message="Loading watch..." />;
  if (!watch)
    return (
      <ErrorState
        message={`Unable to load this watch. ${error ? friendlyErrorMessage(error) : ""}`}
        onRetry={() => void refetch()}
      />
    );

  const latest = watch.latestChange ?? data?.changesPage.nodes[0] ?? null;

  async function wrap(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
      await Promise.all([refetch(), historyQ.refetch()]);
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
      {error ? (
        <RefreshError
          onRetry={() => {
            void Promise.allSettled([refetch(), historyQ.refetch()]);
          }}
        />
      ) : null}
      <Link
        href="/watches"
        className="w-fit text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
      >
        ← Back to watches
      </Link>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
              {watch.name}
            </h1>
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
            <dd className="mt-1 font-medium text-zinc-200">
              {watch.checkIntervalMinutes} minutes
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Last checked</dt>
            <dd className="mt-1 font-medium text-zinc-200">
              {formatDateTime(watch.lastCheckedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Next check</dt>
            <dd className="mt-1 text-zinc-200">
              {watch.isActive ? formatDateTime(watch.nextCheckAt) : "Paused"}
            </dd>
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
          <Link
            href={`/watches/${id}/edit`}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs"
          >
            Edit watch
          </Link>
          <button
            type="button"
            disabled={busy || inProgress}
            aria-busy={inProgress}
            onClick={() => void wrap(() => checkWatch({ variables: { id } }))}
            className="rounded-lg bg-teal-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-teal-300 transition disabled:opacity-50"
          >
            {checkS.loading || inProgress ? "Check in progress…" : "Check now"}
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
              onClick={() =>
                void wrap(() => resumeWatch({ variables: { id } }))
              }
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
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete ${watch.name}?`}
          description="This permanently deletes the watch and its monitoring history."
          busy={deleteS.loading}
          error={actionError}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => void onDelete()}
        />
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
                <dd className="mt-1 text-zinc-300 line-through decoration-zinc-600">
                  {getBeforeValue(latest)}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                <dt className="text-zinc-500">Current</dt>
                <dd className="mt-1 font-medium text-zinc-100">
                  {getAfterValue(latest)}
                </dd>
              </div>
            </dl>
            {latest.explanation ? (
              <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                {latest.explanation}
              </p>
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

      <WatchTimeline id={id} />
    </div>
  );
}
