"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client/react";
import { NOTIFICATIONS_PAGE_QUERY } from "@/graphql/queries";
import { MARK_NOTIFICATION_READ_MUTATION } from "@/graphql/mutations";
import { formatDateTime } from "@/lib/format";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
export default function NotificationsPage() {
  const [after, setAfter] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery(NOTIFICATIONS_PAGE_QUERY, {
    variables: { after },
    pollInterval: 15000,
  });
  const [markRead, markState] = useMutation(MARK_NOTIFICATION_READ_MUTATION);
  if (loading && !data)
    return <LoadingState message="Loading notifications…" />;
  if (error && !data)
    return (
      <ErrorState
        message="Unable to load notifications."
        onRetry={() => void refetch()}
      />
    );
  const connection = data?.notificationsPage;
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <Link
        href="/notifications/settings"
        className="w-fit text-sm text-teal-300 underline"
      >
        Email notification settings
      </Link>
      {error ? (
        <RefreshError
          onRetry={() => {
            void refetch().catch(() => {});
          }}
        />
      ) : null}
      {actionError ? (
        <p role="alert" className="text-sm text-red-300">
          {actionError}
        </p>
      ) : null}
      {!connection?.nodes.length ? (
        <EmptyState
          title="No alerts yet"
          description="Meaningful changes that match your watch preferences will appear here."
        />
      ) : (
        <ul className="grid gap-3">
          {connection.nodes.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <p className="text-sm">
                {!item.readAt ? "Unread · " : ""}
                {item.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <time>{formatDateTime(item.createdAt)}</time>
                {item.changeId ? (
                  <Link
                    className="text-teal-300 underline"
                    href={`/changes/${item.changeId}`}
                  >
                    View details
                  </Link>
                ) : null}
                {!item.readAt ? (
                  <button
                    type="button"
                    disabled={markState.loading}
                    onClick={() =>
                      void markRead({ variables: { id: item.id } })
                        .then(() => refetch())
                        .catch(() =>
                          setActionError(
                            "Unable to mark alert read. Try again.",
                          ),
                        )
                    }
                    className="rounded border border-zinc-700 px-3 py-1.5"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-3">
        {after ? (
          <button
            type="button"
            onClick={() => setAfter(null)}
            className="rounded border border-zinc-700 px-3 py-2 text-xs"
          >
            Latest alerts
          </button>
        ) : null}
        {connection?.pageInfo.hasNextPage ? (
          <button
            type="button"
            onClick={() => setAfter(connection.pageInfo.endCursor ?? null)}
            className="rounded border border-zinc-700 px-3 py-2 text-xs"
          >
            Older alerts
          </button>
        ) : null}
      </div>
    </div>
  );
}
