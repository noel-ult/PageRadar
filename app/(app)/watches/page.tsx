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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Watches</h1>
        <Link
          href="/watches/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
        >
          Add Watch
        </Link>
      </div>

      {actionError ? (
        <p role="alert" className="text-sm text-red-700">
          {actionError}
        </p>
      ) : null}

      {watches.length === 0 ? (
        <EmptyState
          title="You are not monitoring any webpages yet."
          description="Add a webpage and choose what matters."
          action={
            <Link
              href="/watches/new"
              className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    {w.name}
                  </h2>
                  <a
                    href={w.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-slate-500 hover:text-slate-700"
                  >
                    {w.url}
                  </a>
                  <p className="mt-2 text-sm text-slate-600">
                    Interval: {w.checkIntervalMinutes} min · Last checked:{" "}
                    {formatDateTime(w.lastCheckedAt)}
                  </p>
                </div>
                <WatchStatusBadge status={w.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/watches/${w.id}`}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  View
                </Link>
                {w.status === "ACTIVE" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void doPause(w.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {pauseState.loading ? "Pausing..." : "Pause"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void doResume(w.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {resumeState.loading ? "Resuming..." : "Resume"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmId(w.id)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
              {confirmId === w.id ? (
                <div
                  role="alertdialog"
                  aria-label="Confirm delete"
                  className="mt-3 rounded-md border border-red-200 bg-red-50 p-3"
                >
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete this watch?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleteState.loading}
                      onClick={() => void doDelete(w.id)}
                      className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      {deleteState.loading ? "Deleting watch..." : "Delete"}
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
