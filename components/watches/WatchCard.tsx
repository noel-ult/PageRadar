import Link from "next/link";
import type { Watch } from "@/lib/types";
import { formatChangeType, formatDateTime } from "@/lib/format";
import { WatchStatusBadge } from "./WatchStatus";

export function WatchCard({ watch }: { watch: Watch }) {
  const latest = watch.latestChange;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            <Link
              href={`/watches/${watch.id}`}
              className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              {watch.name}
            </Link>
          </h3>
          <a
            href={watch.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-slate-500 hover:text-slate-700"
          >
            {watch.url}
          </a>
        </div>
        <WatchStatusBadge isActive={watch.isActive} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">Interval</dt>
          <dd className="font-medium text-slate-800">
            {watch.checkIntervalMinutes} min
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Last checked</dt>
          <dd className="font-medium text-slate-800">
            {formatDateTime(watch.lastCheckedAt)}
          </dd>
        </div>
      </dl>
      {latest ? (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
          Latest:{" "}
          <Link
            href={`/changes/${latest.id}`}
            className="font-medium text-slate-900 hover:underline"
          >
            {formatChangeType(latest.changeType)}
          </Link>{" "}
          · {formatDateTime(latest.detectedAt)}
        </p>
      ) : (
        <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500">
          No changes detected yet.
        </p>
      )}
    </article>
  );
}
