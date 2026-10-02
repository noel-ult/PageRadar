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

  const selected = watches.find((w) => w.id === confirmId);
  function actions(w: (typeof watches)[number]) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/watches/${w.id}`} className="btn btn-sm">
          View
        </Link>
        <button
          type="button"
          disabled={busy}
          className="btn btn-sm"
          onClick={() => void (w.isActive ? doPause(w.id) : doResume(w.id))}
        >
          {w.isActive
            ? pauseState.loading
              ? "Pausing..."
              : "Pause"
            : resumeState.loading
              ? "Resuming..."
              : "Resume"}
        </button>
        <button
          type="button"
          disabled={busy}
          className="btn btn-danger btn-sm"
          onClick={() => setConfirmId(w.id)}
        >
          Delete
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-2">Your sources</p>
          <h1>Monitored pages</h1>
          <p>Manage what’s on your radar and when it gets checked.</p>
        </div>
        <Link href="/watches/new" className="btn btn-primary">
          + Add page
        </Link>
      </div>
      {error ? (
        <RefreshError
          onRetry={() => {
            void refetch().catch(() => {});
          }}
        />
      ) : null}
      {actionError ? (
        <p
          role="alert"
          className="rounded-xl bg-danger-soft text-danger p-4 mb-4"
        >
          {actionError}
        </p>
      ) : null}
      {watches.length === 0 ? (
        <EmptyState
          title="You are not monitoring any webpages yet."
          description="Add a scholarship, product, announcement, or any public webpage you want to follow."
          action={
            <Link href="/watches/new" className="btn btn-primary">
              Add page
            </Link>
          }
        />
      ) : (
        <>
          <div className="panel overflow-hidden hidden min-[1100px]:block">
            <table className="data-table">
              <caption className="sr-only">
                Monitored pages and monitoring controls
              </caption>
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Monitoring</th>
                  <th scope="col">Last checked</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watches.map((w) => (
                  <tr key={w.id}>
                    <td className="max-w-[260px]">
                      <Link
                        href={`/watches/${w.id}`}
                        className="font-bold hover:text-primary block truncate"
                      >
                        {w.name}
                      </Link>
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted block truncate mt-1 hover:text-primary"
                        title={w.url}
                      >
                        {w.url}
                      </a>
                    </td>
                    <td>
                      <WatchStatusBadge isActive={w.isActive} />
                      <p className="text-xs text-muted mt-2">
                        Every {w.checkIntervalMinutes} min
                      </p>
                    </td>
                    <td className="text-xs text-muted tabular-nums">
                      {formatDateTime(w.lastCheckedAt)}
                    </td>
                    <td>{actions(w)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-4 min-[1100px]:hidden">
            {watches.map((w) => (
              <li key={w.id} className="panel p-5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold truncate">
                      <Link
                        href={`/watches/${w.id}`}
                        className="hover:text-primary"
                      >
                        {w.name}
                      </Link>
                    </h2>
                    <a
                      href={w.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-muted block truncate mt-1"
                      title={w.url}
                    >
                      {w.url}
                    </a>
                  </div>
                  <WatchStatusBadge isActive={w.isActive} />
                </div>
                <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted mt-4 mb-5">
                  <div>
                    <dt className="text-xs">Check frequency</dt>
                    <dd className="text-ink mt-1">
                      Every {w.checkIntervalMinutes} min
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs">Last checked</dt>
                    <dd className="text-ink mt-1">
                      {formatDateTime(w.lastCheckedAt)}
                    </dd>
                  </div>
                </dl>
                {actions(w)}
              </li>
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog
        open={Boolean(selected)}
        title={`Delete ${selected?.name ?? "page"}?`}
        description="This permanently deletes the watch and its monitoring history."
        busy={deleteState.loading}
        error={actionError}
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          if (confirmId) void doDelete(confirmId);
        }}
      />
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <span className="text-sm text-muted">
          {watches.length} pages on this view
        </span>
        {after ? (
          <button
            type="button"
            onClick={() => setAfter(null)}
            className="btn btn-sm"
          >
            Latest watches
          </button>
        ) : null}
        {data?.watchesPage.pageInfo.hasNextPage ? (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              setAfter(data.watchesPage.pageInfo.endCursor ?? null)
            }
            className="btn btn-sm"
          >
            More watches
          </button>
        ) : null}
      </div>
    </div>
  );
}
