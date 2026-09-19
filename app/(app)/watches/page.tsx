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
import type { Watch } from "@/lib/types";
import { formatDateTime, friendlyErrorMessage } from "@/lib/format";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/states";
import { WatchStatusBadge } from "@/components/watches/WatchStatus";

export default function WatchesPage() {
  const { data, loading, error, refetch } = useQuery(WATCHES_QUERY);
  const [pauseWatch, pauseState] = useMutation(PAUSE_WATCH_MUTATION);
  const [resumeWatch, resumeState] = useMutation(RESUME_WATCH_MUTATION);
  const [deleteWatch, deleteState] = useMutation(DELETE_WATCH_MUTATION);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watches: Watch[] = (((data as any)?.watches ?? []) as Watch[]);
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

  if (loading) return <LoadingState message="Loading watches..." />;
  if (error)
    return (
      <ErrorState
        message={`Unable to load watches. ${friendlyErrorMessage(error)}`}
        onRetry={() => void refetch()}
      />
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Monitored Webpages</h1>
          <p className="mt-0.5 text-xs text-zinc-400">All configured targets and check frequencies.</p>
        </div>
        <Link
          href="/watches/new"
          className="rounded-lg bg-white px-3.5 py-2 text-xs font-medium text-zinc-950 hover:bg-zinc-200 transition focus:outline-none"
        >
          + Add watch
        </Link>
      </div>

      {actionError ? (
        <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/30 p-2.5 text-xs text-red-300">
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
                  <h2 className="text-sm font-semibold text-white">
                    {w.name}
                  </h2>
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
              {confirmId === w.id ? (
                <div
                  role="alertdialog"
                  aria-label="Confirm delete"
                  className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3"
                >
                  <p className="text-xs text-red-200">
                    Are you sure you want to delete this watch?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteState.loading}
                      onClick={() => void doDelete(w.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      {deleteState.loading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
