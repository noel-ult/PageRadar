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
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">
            <Link
              href={`/changes/${change.id}`}
              className="hover:underline focus:outline-none"
            >
              {formatChangeType(change.changeType)}
            </Link>
          </h3>
          <p className="truncate text-xs text-zinc-400 mt-0.5">
            {name}
            {url ? ` · ${url}` : ""}
          </p>
        </div>
        <ImportanceBadge importance={change.importance} />
      </div>
      <dl className="mt-3.5 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
          <dt className="text-zinc-500 font-medium">Previous</dt>
          <dd className="mt-1 line-through text-zinc-400">{getBeforeValue(change)}</dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
          <dt className="text-zinc-500 font-medium">New</dt>
          <dd className="mt-1 font-medium text-zinc-100">{getAfterValue(change)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        Detected {formatDateTime(change.detectedAt)}
      </p>
    </article>
  );
}

export function ChangeSummaryBlock({ change }: { change: ChangeSummary }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-semibold text-white">
          {formatChangeType(change.changeType)}
        </span>
        <ImportanceBadge importance={change.importance} />
      </div>
      {change.explanation ? (
        <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{change.explanation}</p>
      ) : null}
      <p className="mt-2 text-xs text-zinc-500">
        Detected {formatDateTime(change.detectedAt)}
      </p>
    </div>
  );
}
