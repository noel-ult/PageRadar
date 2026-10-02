"use client";
import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import Link from "next/link";
import { WATCH_HISTORY_QUERY } from "@/graphql/queries";
import { formatDateTime } from "@/lib/format";
import { ImportanceBadge } from "@/components/changes/ImportanceBadge";
import {
  EmptyState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
const labels: Record<string, string> = {
  QUEUED: "Check queued",
  RUNNING: "Checking page",
  RETRYING: "Retry scheduled",
  CANCELLED: "Check cancelled",
  SUCCESS: "Baseline captured",
  NO_CHANGE: "No changes",
  CHANGE_DETECTED: "Changes detected",
  FAILED: "Check failed",
};
export function WatchTimeline({ id }: { id: string }) {
  const [after, setAfter] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery(WATCH_HISTORY_QUERY, {
    variables: { id, after },
    pollInterval: after ? 0 : 5000,
  });
  if (error && !data)
    return (
      <ErrorState
        message="Unable to load check history."
        onRetry={() => void refetch()}
      />
    );
  const connection = data?.checkRuns;
  return (
    <section aria-label="Monitoring timeline" className="grid gap-3">
      <h2 className="text-sm font-medium">Monitoring timeline</h2>
      {error ? (
        <RefreshError
          onRetry={() => {
            void refetch().catch(() => {});
          }}
        />
      ) : null}
      {loading && !data ? (
        <p role="status" className="text-sm text-zinc-400">
          Loading history…
        </p>
      ) : !connection?.nodes.length ? (
        <EmptyState
          title="First check pending"
          description="PageRadar will capture a baseline before reporting changes."
        />
      ) : (
        <ol className="grid gap-3">
          {connection.nodes.map((run) => (
            <li
              key={run.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className="text-sm font-medium"
                  role={
                    ["QUEUED", "RUNNING", "RETRYING"].includes(run.status)
                      ? "status"
                      : undefined
                  }
                >
                  {labels[run.status]}
                  {run.attempts > 1 ? ` · attempt ${run.attempts}` : ""}
                </p>
                <time className="text-xs text-zinc-400">
                  {formatDateTime(run.completedAt ?? run.startedAt)}
                </time>
              </div>
              {run.error ? (
                <p className="mt-2 break-words text-xs text-amber-300">
                  {run.error}
                  {run.status === "RETRYING"
                    ? ` Next attempt: ${formatDateTime(run.nextAttemptAt)}`
                    : ""}
                </p>
              ) : null}
              {run.changes.map((change) => (
                <article
                  key={change.id}
                  className="mt-4 border-t border-zinc-800 pt-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/changes/${change.id}`}
                      className="text-sm text-teal-300 underline"
                    >
                      {change.section ?? "Page content"}
                    </Link>
                    <ImportanceBadge importance={change.importance} />
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">
                    {change.explanation}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="text-zinc-500">Previous</dt>
                      <dd className="whitespace-pre-wrap break-words text-zinc-400">
                        {change.before || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-500">Current</dt>
                      <dd className="whitespace-pre-wrap break-words text-zinc-200">
                        {change.after || "—"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </li>
          ))}
        </ol>
      )}
      <div className="flex gap-3">
        {after ? (
          <button
            type="button"
            onClick={() => setAfter(null)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs"
          >
            Latest checks
          </button>
        ) : null}
        {connection?.pageInfo.hasNextPage ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => setAfter(connection.pageInfo.endCursor ?? null)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs"
          >
            Older checks
          </button>
        ) : null}
      </div>
    </section>
  );
}
