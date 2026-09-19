import Link from "next/link";
import type { Watch } from "@/lib/types";
import { formatChangeType, formatDateTime } from "@/lib/format";
import { WatchStatusBadge } from "./WatchStatus";

export function WatchCard({ watch }: { watch: Watch }) {
  const latest = watch.latestChange;
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">
            <Link
              href={`/watches/${watch.id}`}
              className="hover:underline focus:outline-none"
            >
              {watch.name}
            </Link>
          </h3>
          <a
            href={watch.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-xs text-zinc-400 hover:text-zinc-300 mt-0.5"
          >
            {watch.url}
          </a>
        </div>
        <WatchStatusBadge isActive={watch.isActive} />
      </div>
      <dl className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5">
          <dt className="text-zinc-500">Interval</dt>
          <dd className="mt-0.5 font-medium text-zinc-200">
            Every {watch.checkIntervalMinutes} min
          </dd>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2.5">
          <dt className="text-zinc-500">Last checked</dt>
          <dd className="mt-0.5 font-medium text-zinc-200 truncate">
            {formatDateTime(watch.lastCheckedAt)}
          </dd>
        </div>
      </dl>
      {latest ? (
        <p className="mt-3.5 border-t border-zinc-800/80 pt-3 text-xs text-zinc-400">
          Latest:{" "}
          <Link
            href={`/changes/${latest.id}`}
            className="font-medium text-white hover:underline"
          >
            {formatChangeType(latest.changeType)}
          </Link>{" "}
          · {formatDateTime(latest.detectedAt)}
        </p>
      ) : (
        <p className="mt-3.5 border-t border-zinc-800/80 pt-3 text-xs text-zinc-500">
          No changes detected yet.
        </p>
      )}
    </article>
  );
}
