"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import {
  DASHBOARD_STATS_QUERY,
  WATCHES_QUERY,
  RECENT_CHANGES_QUERY,
} from "@/graphql/queries";
import type { DashboardStats, Watch } from "@/lib/types";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/states";
import { WatchCard } from "@/components/watches/WatchCard";
import { ChangeCard } from "@/components/changes/ChangeCard";
import { friendlyErrorMessage } from "@/lib/format";

export default function DashboardPage() {
  const stats = useQuery(DASHBOARD_STATS_QUERY);
  const watchesQ = useQuery(WATCHES_QUERY);
  const changesQ = useQuery(RECENT_CHANGES_QUERY, {
    variables: { limit: 10 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: DashboardStats | undefined = (stats.data as any)?.dashboardStats;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watches: Watch[] = ((watchesQ.data as any)?.watches ?? []) as Watch[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const changes = (((changesQ.data as any)?.changes ?? []) as any[]).slice(0, 5);

  const loading = stats.loading || watchesQ.loading || changesQ.loading;
  const error = stats.error ?? watchesQ.error ?? changesQ.error;

  if (loading && !stats.data && !watchesQ.data && !changesQ.data) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (error && !stats.data && !watchesQ.data && !changesQ.data) {
    return (
      <ErrorState
        message={`Unable to load the dashboard. ${friendlyErrorMessage(error)}`}
        onRetry={() => {
          void stats.refetch();
          void watchesQ.refetch();
          void changesQ.refetch();
        }}
      />
    );
  }

  const activeWatches =
    s?.activeWatches ?? watches.filter((w) => w.status === "ACTIVE").length;
  const important = changes.filter((c) =>
    ["HIGH", "CRITICAL"].includes(c.importance)
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <Link
          href="/watches/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
        >
          Add Watch
        </Link>
      </div>

      <section aria-label="Summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Active Watches", value: activeWatches },
          { label: "Recent Changes", value: s?.recentChanges ?? changes.length },
          {
            label: "Important Changes",
            value: s?.importantChanges ?? important.length,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Recent watches" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Recent Watches</h2>
        {watchesQ.loading && watches.length === 0 ? (
          <LoadingState message="Loading watches..." />
        ) : watches.length === 0 ? (
          <EmptyState
            title="You are not monitoring any webpages yet."
            description="Add a webpage and choose what matters — PageRadar will watch it for meaningful changes."
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {watches.slice(0, 4).map((w) => (
              <WatchCard key={w.id} watch={w} />
            ))}
          </div>
        )}
      </section>

      <section aria-label="Recent changes" className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Recent Changes</h2>
        {changesQ.loading && changes.length === 0 ? (
          <LoadingState message="Loading changes..." />
        ) : changes.length === 0 ? (
          <EmptyState
            title="No changes detected yet."
            description="When PageRadar detects a meaningful change, it will appear here with before/after details."
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
