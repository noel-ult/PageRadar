import Link from "next/link";
import type { ChangeSummary } from "@/lib/types";
import {
  formatChangeType,
  formatDateTime,
  getAfterValue,
  getBeforeValue,
} from "@/lib/format";
import { ImportanceBadge } from "./ImportanceBadge";

export function ChangeCard({
  change,
  watchName,
  watchUrl,
}: {
  change: ChangeSummary & { watch?: { name: string; url: string } | null };
  watchName?: string;
  watchUrl?: string;
}) {
  const name = change.watch?.name ?? watchName ?? "Webpage";
  const url = change.watch?.url ?? watchUrl;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">
            <Link
              href={`/changes/${change.id}`}
              className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              {formatChangeType(change.changeType)}
            </Link>
          </h3>
          <p className="truncate text-sm text-slate-500">
            {name}
            {url ? ` · ${url}` : ""}
          </p>
        </div>
        <ImportanceBadge importance={change.importance} />
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">Old value</dt>
          <dd className="text-slate-800">{getBeforeValue(change)}</dd>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">New value</dt>
          <dd className="font-medium text-slate-900">{getAfterValue(change)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-500">
        Detected {formatDateTime(change.detectedAt)}
      </p>
    </article>
  );
}

export function ChangeSummaryBlock({ change }: { change: ChangeSummary }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-slate-900">
          {formatChangeType(change.changeType)}
        </span>
        <ImportanceBadge importance={change.importance} />
      </div>
      {change.explanation ? (
        <p className="mt-2 text-sm text-slate-700">{change.explanation}</p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">
        Detected {formatDateTime(change.detectedAt)}
      </p>
    </div>
  );
}
