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
      <div className="page-heading">
        <div>
          <p className="eyebrow mb-2">Your web briefing</p>
          <h1>Stay ahead of what changes.</h1>
          <p>Meaningful updates from the pages you follow, in one place.</p>
        </div>
        <Link href="/watches/new" className="btn btn-primary">
          <Icon name="plus" />
          Add page
        </Link>
      </div>
      <section
        aria-label="Summary"
        className="panel grid grid-cols-3 mb-8 divide-x divide-line"
      >
        {[
          {
            label: "Active watches",
            value: statsQ.error ? "—" : activeWatches,
            icon: "pages" as const,
            note: "Pages being monitored",
          },
          {
            label: "Changes this week",
            value: statsQ.error
              ? "—"
              : (statsQ.data?.dashboardStats.recentChanges ?? "—"),
            icon: "signal" as const,
            note: "Updates detected in the last 7 days",
          },
          {
            label: "Important changes",
            value: statsQ.error
              ? "—"
              : (statsQ.data?.dashboardStats.importantChanges ?? "—"),
            icon: "bell" as const,
            note: "High importance updates across your history",
          },
        ].map((item) => (
          <div key={item.label} className="p-3 sm:p-6">
            <div className="flex justify-between items-center gap-3">
              <p className="text-xs sm:text-sm text-muted min-h-9 sm:min-h-0">
                {item.label}
              </p>
              <Icon
                name={item.icon}
                className="text-primary size-4 hidden sm:block"
              />
            </div>
            <p className="display text-2xl sm:text-3xl font-bold mt-2 tabular-nums">
              {item.value}
            </p>
            <p className="hidden sm:block text-xs text-muted mt-1">
              {item.note}
            </p>
          </div>
        ))}
      </section>
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
          <section className="panel p-5" aria-label="Monitoring health">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="signal" className="text-primary" />
              <h2 className="font-bold">Monitoring health</h2>
            </div>
            <p className="text-sm text-muted">
              Failed checks across your history
            </p>
            <p className="display text-3xl font-bold mt-2">
              {statsQ.error
                ? "—"
                : (statsQ.data?.dashboardStats.failedChecks ?? "—")}
            </p>
            <p className="text-sm text-muted mt-2">
              Open a page’s history to review failures and retry attempts.
            </p>
            <Link href="/watches" className="link text-sm block mt-4">
              View monitored pages →
            </Link>
          </section>
          <section aria-label="Recent watches" className="grid gap-3">
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
              watches.slice(0, 3).map((w) => <WatchCard key={w.id} watch={w} />)
            )}
          </section>
          <div className="rounded-xl bg-accent-soft p-5">
            <Icon name="bell" className="text-primary mb-3" />
            <h2 className="font-bold">Updates in your inbox</h2>
            <p className="text-sm text-muted mt-2">
              Get important changes by email, even when you’re away.
            </p>
            <Link
              href="/notifications/settings"
              className="link text-sm block mt-3"
            >
              Set up email alerts →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
