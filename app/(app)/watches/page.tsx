"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@apollo/client/react";
import { WATCHES_QUERY } from "@/graphql/queries";
import {
  DELETE_WATCH_MUTATION,
  PAUSE_WATCH_MUTATION,
  RESUME_WATCH_MUTATION,
} from "@/graphql/mutations";

import { formatDateTime, friendlyErrorMessage } from "@/lib/format";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { WatchStatusBadge } from "@/components/watches/WatchStatus";

export default function WatchesPage() {
  const [after, setAfter] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery(WATCHES_QUERY, {
    variables: { after },
    pollInterval: 10_000,
  });

  const [pauseWatch, pauseState] = useMutation(PAUSE_WATCH_MUTATION);
  const [resumeWatch, resumeState] = useMutation(RESUME_WATCH_MUTATION);
  const [deleteWatch, deleteState] = useMutation(DELETE_WATCH_MUTATION);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const watches = data?.watchesPage.nodes ?? [];
  const busy = pauseState.loading || resumeState.loading || deleteState.loading;

  async function doPause(id: string) {
    setActionError(null);
    try {
      await pauseWatch({ variables: { id } });
      await refetch();
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
    }
  }

  async function doResume(id: string) {
    setActionError(null);
    try {
      await resumeWatch({ variables: { id } });
      await refetch();
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
    }
  }

  async function doDelete(id: string) {
    setActionError(null);
    try {
      await deleteWatch({ variables: { id } });
      setConfirmId(null);
      await refetch();
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
    }
  }

  if (loading && !data) return <LoadingState message="Loading watches..." />;
  if (error && !data)
    return (
      <ErrorState
        message={`Unable to load watches. ${friendlyErrorMessage(error)}`}
        onRetry={() => void refetch()}
      />
    );

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <RefreshError
          onRetry={() => {
            void refetch().catch(() => {});
          }}
        />
      ) : null}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Monitored Webpages
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            All configured targets and check frequencies.
          </p>
        </div>
        <Link
          href="/watches/new"
          className="rounded-lg bg-white px-3.5 py-2 text-xs font-medium text-zinc-950 hover:bg-zinc-200 transition focus:outline-none"
        >
          + Add watch
        </Link>
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-300"
        >
          {actionError}
        </div>
      ) : null}

      {watches.length === 0 ? (
        <EmptyState
          title="You are not monitoring any webpages yet."
          description="Add a webpage to start watching for meaningful changes."
          action={
            <Link
              href="/watches/new"
              className="inline-block rounded-lg bg-white px-3.5 py-2 text-xs font-medium text-zinc-950 hover:bg-zinc-200"
            >
              Add a Watch
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {watches.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-white">{w.name}</h2>
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-zinc-400 hover:text-zinc-300 mt-0.5"
                  >
                    {w.url}
                  </a>
                  <p className="mt-2 text-xs text-zinc-500">
                    Interval: Every {w.checkIntervalMinutes} min · Last checked:{" "}
                    {formatDateTime(w.lastCheckedAt)}
                  </p>
                </div>
                <WatchStatusBadge isActive={w.isActive} />
              </div>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <Link
                  href={`/watches/${w.id}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition focus:outline-none"
                >
                  View
                </Link>
                {w.isActive ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void doPause(w.id)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 transition"
                  >
                    {pauseState.loading ? "Pausing..." : "Pause"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void doResume(w.id)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50 transition"
                  >
                    {resumeState.loading ? "Resuming..." : "Resume"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmId(w.id)}
                  className="rounded-lg border border-red-950 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-50 transition"
                >
                  Delete
                </button>
              </div>
              <ConfirmDialog
                open={confirmId === w.id}
                title={`Delete ${w.name}?`}
                description="This permanently deletes the watch and its monitoring history."
                busy={deleteState.loading}
                error={actionError}
                onCancel={() => setConfirmId(null)}
                onConfirm={() => void doDelete(w.id)}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-3">
        {after ? (
          <button
            type="button"
            onClick={() => setAfter(null)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs"
          >
            Latest watches
          </button>
        ) : null}
        {data?.watchesPage.pageInfo.hasNextPage ? (
          <button
            type="button"
            onClick={() =>
              setAfter(data.watchesPage.pageInfo.endCursor ?? null)
            }
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs"
          >
            More watches
          </button>
        ) : null}
      </div>
    </div>
  );
}
