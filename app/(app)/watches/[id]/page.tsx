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

import { formatDateTime, friendlyErrorMessage } from "@/lib/format";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
import { WatchStatusBadge } from "@/components/watches/WatchStatus";
import { WatchTimeline } from "@/components/watches/WatchTimeline";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ChangeCard } from "@/components/changes/ChangeCard";

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
        className="w-fit text-sm font-medium text-muted hover:text-ink transition"
      >
        ← Back to watches
      </Link>

      <div className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-ink break-words">
              {watch.name}
            </h1>
            <a
              href={watch.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm text-muted hover:text-ink break-all max-w-xl transition"
            >
              {watch.url}
            </a>
          </div>
          <WatchStatusBadge isActive={watch.isActive} />
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4 pt-5 border-t border-line">
          <div>
            <dt className="text-muted">Check interval</dt>
            <dd className="mt-1 font-medium text-ink">
              {watch.checkIntervalMinutes} minutes
            </dd>
          </div>
          <div>
            <dt className="text-muted">Last checked</dt>
            <dd className="mt-1 font-medium text-ink">
              {formatDateTime(watch.lastCheckedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Next check</dt>
            <dd className="mt-1 text-ink">
              {watch.isActive ? formatDateTime(watch.nextCheckAt) : "Paused"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Monitored fields</dt>
            <dd className="mt-1 font-medium text-ink">
              {watch.interests?.length ? watch.interests.join(", ") : "All"}
            </dd>
          </div>
        </dl>
        {actionError ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {actionError}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-line">
          <Link href={`/watches/${id}/edit`} className="btn btn-sm">
            Edit watch
          </Link>
          <button
            type="button"
            disabled={busy || inProgress}
            aria-busy={inProgress}
            onClick={() => void wrap(() => checkWatch({ variables: { id } }))}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary hover:bg-primary transition disabled:opacity-50"
          >
            {checkS.loading || inProgress ? "Check in progress…" : "Check now"}
          </button>
          {watch.isActive ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void wrap(() => pauseWatch({ variables: { id } }))}
              className="btn btn-sm"
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
              className="btn btn-sm"
            >
              {resumeS.loading ? "Resuming..." : "Resume"}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
            className="btn btn-danger btn-sm"
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

      <section aria-label="Latest change" className="grid gap-4">
        <h2 className="text-lg font-bold">Latest change</h2>
        {!latest ? (
          <EmptyState
            title="No changes detected yet."
            description="Your first check captures a baseline. Future updates will appear here."
          />
        ) : (
          <div className="signal-feed">
            <ChangeCard
              change={latest}
              watchName={watch.name}
              watchUrl={watch.url}
            />
          </div>
        )}
      </section>

      <WatchTimeline id={id} />
    </div>
  );
}
