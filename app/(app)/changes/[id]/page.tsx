"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@apollo/client/react";
import { CHANGE_QUERY } from "@/graphql/queries";
import type { ChangeDetail } from "@/lib/types";
import {
  formatChangeType,
  formatDateTime,
  friendlyErrorMessage,
  getAfterValue,
  getBeforeValue,
} from "@/lib/format";
import { LoadingState, ErrorState } from "@/components/common/states";
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

  if (loading) return <LoadingState message="Loading change..." />;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const change: ChangeDetail | undefined = (data as any)?.change;
  if (error || !change)
    return (
      <ErrorState
        message={`Unable to load this change. ${error ? friendlyErrorMessage(error) : ""}`}
        onRetry={() => void refetch()}
      />
    );

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={change.watch?.id ? `/watches/${change.watch.id}` : "/dashboard"}
        className="w-fit text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
      >
        ← Back
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          PageRadar
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {formatChangeType(change.changeType)}
          </h1>
          <ImportanceBadge importance={change.importance} />
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Webpage</dt>
            <dd className="font-medium">{change.watch?.name ?? "Webpage"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Source URL</dt>
            <dd className="break-all font-medium">
              {change.watch?.url ? (
                <a
                  href={change.watch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {change.watch.url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Detected</dt>
            <dd className="font-medium">{formatDateTime(change.detectedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Section</dt>
            <dd className="font-medium">{change.section ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <BeforeAfter before={getBeforeValue(change)} after={getAfterValue(change)} />

      <section
        aria-label="Change"
        className="rounded-lg border border-slate-200 bg-white p-5 text-center"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Change
        </h2>
        <p className="mt-1 text-lg font-semibold text-slate-900">
          {formatChangeType(change.changeType)}
        </p>
      </section>

      <section
        aria-label="Explanation"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h2 className="text-sm font-semibold text-slate-900">Explanation</h2>
        <p className="mt-1 text-sm text-slate-700">
          {change.explanation ?? "No explanation provided."}
        </p>
      </section>
    </div>
  );
}
