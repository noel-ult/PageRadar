"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { CHANGE_QUERY } from "@/graphql/queries";

import {
  formatChangeType,
  formatDateTime,
  friendlyErrorMessage,
  getAfterValue,
  getBeforeValue,
} from "@/lib/format";
import {
  LoadingState,
  ErrorState,
  RefreshError,
} from "@/components/common/states";
import { ImportanceBadge } from "@/components/changes/ImportanceBadge";
import { BeforeAfter } from "@/components/changes/BeforeAfter";

export default function ChangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useQuery(CHANGE_QUERY, {
    variables: { id },
  });

  if (loading && !data) return <LoadingState message="Loading change..." />;
  const change = data?.change;
  if (!change)
    return (
      <ErrorState
        message={`Unable to load this change. ${error ? friendlyErrorMessage(error) : ""}`}
        onRetry={() => void refetch()}
      />
    );

  return (
    <div className="max-w-5xl mx-auto grid gap-6">
      {error ? (
        <RefreshError
          onRetry={() => {
            void refetch().catch(() => {});
          }}
        />
      ) : null}
      <Link
        href={change.watch?.id ? `/watches/${change.watch.id}` : "/dashboard"}
        className="link text-sm w-fit"
      >
        ← Back to {change.watch?.name ?? "overview"}
      </Link>
      <div className="page-heading mb-0">
        <div>
          <p className="eyebrow mb-3">Change intelligence</p>
          <h1>{formatChangeType(change.changeType)}</h1>
          <p>
            {change.watch?.name ?? "Webpage"} ·{" "}
            {formatDateTime(change.detectedAt)}
          </p>
        </div>
        <ImportanceBadge importance={change.importance} />
      </div>
      {change.explanation ? (
        <section
          aria-label="Explanation"
          className="panel p-6 border-l-4 border-l-primary"
        >
          <p className="eyebrow text-primary mb-2">Why it matters</p>
          <h2 className="sr-only">Explanation</h2>
          <p className="text-lg leading-relaxed break-words">
            {change.explanation}
          </p>
        </section>
      ) : null}
      <section aria-label="Change evidence" className="grid gap-4">
        <h2 className="text-lg font-bold">What changed</h2>
        <BeforeAfter
          before={getBeforeValue(change)}
          after={getAfterValue(change)}
        />
      </section>
      <section aria-label="Source details" className="panel p-6">
        <h2 className="text-lg font-bold mb-5">Source & detection details</h2>
        <dl className="grid gap-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted">Webpage</dt>
            <dd className="mt-1 font-semibold">
              {change.watch?.name ?? "Webpage"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Source URL</dt>
            <dd className="mt-1 break-all">
              {change.watch?.url ? (
                <a
                  href={change.watch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  {change.watch.url} ↗
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Section</dt>
            <dd className="mt-1 font-semibold">{change.section ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Severity</dt>
            <dd className="mt-1 font-semibold">{change.severity}</dd>
          </div>
          <div>
            <dt className="text-muted">Page changed</dt>
            <dd className="mt-1 font-semibold">{change.changePercentage}%</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted">Affected sections</dt>
            <dd className="mt-1 font-semibold break-words">
              {change.affectedSections.join(", ") || "—"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
