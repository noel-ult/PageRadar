"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import {
  WATCHES_QUERY,
  RECENT_CHANGES_QUERY,
} from "@/graphql/queries";
import type { DashboardStats, Watch } from "@/lib/types";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/states";
import { WatchCard } from "@/components/watches/WatchCard";
import { ChangeCard } from "@/components/changes/ChangeCard";
import { friendlyErrorMessage } from "@/lib/format";

export default function DashboardPage() {
  const watchesQ = useQuery(WATCHES_QUERY);
  const changesQ = useQuery(RECENT_CHANGES_QUERY, {
    variables: { limit: 10 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watches: Watch[] = ((watchesQ.data as any)?.watches ?? []) as Watch[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changes = (((changesQ.data as any)?.changes ?? []) as any[]).slice(0, 5);

  const loading = watchesQ.loading || changesQ.loading;
  const error = watchesQ.error ?? changesQ.error;

  if (loading && !watchesQ.data && !changesQ.data) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error && !watchesQ.data && !changesQ.data) {
    return (
      <ErrorState
        message={`Unable to load the dashboard. ${friendlyErrorMessage(error)}`}
        onRetry={() => {
          void watchesQ.refetch();
          void changesQ.refetch();
        }}
      />
    );
  }

  const activeWatches =
    watches.filter((w) => w.isActive).length;
  const important = changes.filter((c) =>
    typeof c.importance === "number"
      ? c.importance >= 75
      : ["HIGH", "CRITICAL"].includes(c.importance)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          <p className="mt-0.5 text-xs text-zinc-400">Overview of your monitored pages and recent changes.</p>
        </div>
        <Link
          href="/watches/new"
          className="rounded-lg bg-white px-3.5 py-2 text-xs font-medium text-zinc-950 hover:bg-zinc-200 transition focus:outline-none"
        >
          + Add watch
        </Link>
      </div>

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Active Watches", value: activeWatches },
          { label: "Recent Changes", value: changes.length },
          { label: "Important Changes", value: important.length },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5"
          >
            <p className="text-xs font-medium text-zinc-400">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Recent watches" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Recent Watches</h2>
          <Link href="/watches" className="text-xs text-zinc-400 hover:text-white transition">
            View all →
          </Link>
        </div>
        {watchesQ.loading && watches.length === 0 ? (
          <LoadingState message="Loading watches..." />
        ) : watches.length === 0 ? (
          <EmptyState
            title="No active watches."
            description="Add a webpage to monitor it for meaningful updates."
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {watches.slice(0, 4).map((w) => (
              <WatchCard key={w.id} watch={w} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Recent changes" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white">Recent Changes</h2>
        {changesQ.loading && changes.length === 0 ? (
          <LoadingState message="Loading changes..." />
        ) : changes.length === 0 ? (
          <EmptyState
            title="No changes detected yet."
            description="When meaningful changes are detected, they will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {changes.map((c) => (
              <ChangeCard key={c.id} change={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
