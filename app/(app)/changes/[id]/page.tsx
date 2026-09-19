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
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link
        href={change.watch?.id ? `/watches/${change.watch.id}` : "/dashboard"}
        className="w-fit text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
      >
        ← Back
      </Link>

      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            {formatChangeType(change.changeType)}
          </h1>
          <ImportanceBadge importance={change.importance} />
        </div>
        <dl className="mt-5 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 pt-5 border-t border-zinc-800/60">
          <div>
            <dt className="text-zinc-500">Webpage</dt>
            <dd className="mt-1 font-medium text-zinc-200">{change.watch?.name ?? "Webpage"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Source URL</dt>
            <dd className="mt-1 break-all font-medium text-zinc-200">
              {change.watch?.url ? (
                <a
                  href={change.watch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-400 hover:text-zinc-200 underline transition"
                >
                  {change.watch.url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Detected</dt>
            <dd className="mt-1 font-medium text-zinc-200">{formatDateTime(change.detectedAt)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Section</dt>
            <dd className="mt-1 font-medium text-zinc-200">{change.section ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <BeforeAfter before={getBeforeValue(change)} after={getAfterValue(change)} />

      {change.explanation ? (
        <section
          aria-label="Explanation"
          className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Explanation</h2>
          <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
            {change.explanation}
          </p>
        </section>
      ) : null}
    </div>
  );
}

