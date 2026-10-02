"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import {
  WATCHES_QUERY,
  DASHBOARD_STATS_QUERY,
  RECENT_CHANGES_QUERY,
} from "@/graphql/queries";
import type { Watch, ChangeSummary } from "@/lib/types";
import {
  LoadingState,
  EmptyState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
import { Icon } from "@/components/common/Icon";
import { RadarScope } from "@/components/common/RadarScope";
import { WatchCard } from "@/components/watches/WatchCard";
import { ChangeCard } from "@/components/changes/ChangeCard";
import { friendlyErrorMessage } from "@/lib/format";

interface RawWatchItem {
  id: string;
  name?: string;
  title?: string;
  url: string;
  isActive: boolean;
  checkIntervalMinutes?: number;
  lastCheckedAt?: string | null;
  createdAt?: string;
  latestChange?: ChangeSummary | null;
}

interface RawChangeItem extends ChangeSummary {
  watchId?: string;
  watch?: { id?: string; name?: string; url?: string } | null;
}

export default function DashboardPage() {
  const statsQ = useQuery(DASHBOARD_STATS_QUERY, { pollInterval: 10_000 });
  const watchesQ = useQuery(WATCHES_QUERY, { pollInterval: 10_000 });
  const changesQ = useQuery(RECENT_CHANGES_QUERY, {
    pollInterval: 10_000,
  });

  const rawWatches: RawWatchItem[] = watchesQ.data?.watchesPage.nodes ?? [];
  const rawChanges: RawChangeItem[] = changesQ.data?.changesPage.nodes ?? [];

  const changes = rawChanges
    .map((c) => {
      const matchedWatch = rawWatches.find(
        (w) => w.id === c.watchId || w.id === c.watch?.id,
      );
      return {
        ...c,
        watch:
          c.watch && c.watch.name && c.watch.url
            ? { name: c.watch.name, url: c.watch.url }
            : matchedWatch
              ? {
                  name:
                    matchedWatch.name ?? matchedWatch.title ?? "Monitored Page",
                  url: matchedWatch.url,
                }
              : null,
      };
    })
    .sort((a, b) => Number(b.importance) - Number(a.importance));

  const watches: Watch[] = rawWatches.map((w) => ({
    ...w,
    latestChange:
      w.latestChange ??
      rawChanges.find((c) => c.watchId === w.id || c.watch?.id === w.id),
  })) as Watch[];

  const loading = watchesQ.loading || changesQ.loading;
  const error = watchesQ.error ?? changesQ.error ?? statsQ.error;

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
          void statsQ.refetch();
        }}
      />
    );
  }

  const activeWatches =
    statsQ.data?.dashboardStats.activeWatches ??
    watches.filter((w) => w.isActive).length;

  return (
    <div>
      {error ? (
        <RefreshError
          onRetry={() => {
            void Promise.allSettled([
              statsQ.refetch(),
              watchesQ.refetch(),
              changesQ.refetch(),
            ]);
          }}
        />
      ) : null}
      <div className="page-heading dashboard-heading">
        <div>
          <h1>
            Your internet. <span className="text-primary">In focus.</span>
          </h1>
          <p>Meaningful updates from the pages you follow, in one place.</p>
        </div>
        <Link href="/watches/new" className="btn btn-primary">
          <Icon name="plus" />
          Add page
        </Link>
      </div>
      <div className="briefing-grid">
        <section aria-label="Recent changes">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <h2 className="text-lg font-bold">Recent updates</h2>
              <p className="text-sm text-muted mt-1">
                Important changes appear first.
              </p>
            </div>
            <span className="badge">Latest {changes.length}</span>
          </div>
          {changesQ.loading && !changesQ.data ? (
            <LoadingState message="Loading changes..." />
          ) : changes.length === 0 ? (
            <EmptyState
              title="No changes detected yet."
              description="Once your first baseline is captured, meaningful updates will appear here."
            />
          ) : (
            <div className="signal-feed">
              {changes.map((c) => (
                <ChangeCard key={c.id} change={c} />
              ))}
            </div>
          )}
        </section>
        <aside className="grid gap-5">
          <section className="monitoring-summary" aria-label="Summary">
            <h2 className="text-xl font-bold">Your monitoring</h2>
            <div className="monitoring-visual">
              <RadarScope />
              <dl>
                {[
                  ["Active watches", statsQ.error ? "—" : activeWatches],
                  [
                    "Changes this week",
                    statsQ.error
                      ? "—"
                      : (statsQ.data?.dashboardStats.recentChanges ?? "—"),
                  ],
                  [
                    "Important changes",
                    statsQ.error
                      ? "—"
                      : (statsQ.data?.dashboardStats.importantChanges ?? "—"),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dd>{value}</dd>
                    <dt>{label}</dt>
                  </div>
                ))}
              </dl>
            </div>
            <p className="text-xs text-muted mt-4">
              Weekly changes cover the last 7 days. Important changes include
              all history.
            </p>
          </section>
          <section className="monitoring-health" aria-label="Monitoring health">
            <div className="flex justify-between items-center gap-4">
              <h2 className="font-bold">Failed checks</h2>
              <span className="text-xl font-bold">
                {statsQ.error
                  ? "—"
                  : (statsQ.data?.dashboardStats.failedChecks ?? "—")}
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              Across your monitoring history
            </p>
            <Link href="/watches" className="link text-sm block mt-3">
              Review monitored pages →
            </Link>
          </section>
          <Link href="/notifications/settings" className="email-shortcut">
            <Icon name="bell" />
            <span>
              <strong className="block">Take updates with you.</strong>
              <span className="text-sm text-muted">Set up email alerts →</span>
            </span>
          </Link>
        </aside>
      </div>
      <div className="dashboard-watches">
        {" "}
        <section aria-label="Recent watches" className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">On your radar</h2>
            <Link href="/watches" className="link text-sm">
              View all →
            </Link>
          </div>
          {watches.length === 0 ? (
            <EmptyState
              title="Your radar is ready."
              description="Add your first page to start monitoring."
              action={
                <Link href="/watches/new" className="btn btn-primary">
                  Add page
                </Link>
              }
            />
          ) : (
            <div className="watch-strip">
              {watches.slice(0, 3).map((w) => (
                <WatchCard key={w.id} watch={w} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
