"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client/react";
import { NOTIFICATIONS_PAGE_QUERY } from "@/graphql/queries";
import { MARK_NOTIFICATION_READ_MUTATION } from "@/graphql/mutations";
import { Icon } from "@/components/common/Icon";
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
      <div className="page-heading mb-0">
        <div>
          <p className="eyebrow mb-2">Your inbox</p>
          <h1>Notifications</h1>
          <p>Updates that match what you care about.</p>
        </div>
        <Link href="/notifications/settings" className="btn">
          <Icon name="settings" />
          Email notification settings
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
        <p role="alert" className="text-sm text-danger">
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
              className={`panel p-5 ${!item.readAt ? "border-l-4 border-l-primary" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon name="bell" className="text-primary size-4" />
                <span
                  className={`badge ${!item.readAt ? "badge-primary" : ""}`}
                >
                  {item.readAt ? "Read" : "Unread"}
                </span>
              </div>
              <p className="text-base leading-relaxed break-words">
                {item.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
                <time>{formatDateTime(item.createdAt)}</time>
                {item.changeId ? (
                  <Link
                    className="text-primary underline"
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
                    className="btn btn-sm"
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
            className="btn btn-sm"
          >
            Latest alerts
          </button>
        ) : null}
        {connection?.pageInfo.hasNextPage ? (
          <button
            type="button"
            onClick={() => setAfter(connection.pageInfo.endCursor ?? null)}
            className="btn btn-sm"
          >
            Older alerts
          </button>
        ) : null}
      </div>
    </div>
  );
}
