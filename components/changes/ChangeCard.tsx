import Link from "next/link";
import type { ChangeSummary } from "@/lib/types";
import {
  formatChangeType,
  formatDateTime,
  getAfterValue,
  getBeforeValue,
} from "@/lib/format";
import { ImportanceBadge } from "./ImportanceBadge";
import { Icon } from "@/components/common/Icon";
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
    <article className="panel signal-card">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm text-muted flex items-center gap-2 min-w-0">
          <Icon name="globe" />
          <span className="truncate" title={url}>
            {name}
          </span>
        </p>
        <ImportanceBadge importance={change.importance} />
      </div>
      <h3 className="text-lg font-bold">
        <Link href={`/changes/${change.id}`} className="hover:text-primary">
          {formatChangeType(change.changeType)}
        </Link>
      </h3>
      {change.explanation ? (
        <p className="text-muted text-sm mt-2 leading-relaxed break-words">
          {change.explanation}
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
        <div className="evidence evidence-before">
          <dt className="eyebrow mb-2">Previous</dt>
          <dd className="text-muted break-words line-clamp-3">
            {getBeforeValue(change)}
          </dd>
        </div>
        <div className="evidence evidence-after">
          <dt className="eyebrow mb-2 text-success">Current</dt>
          <dd className="font-semibold break-words line-clamp-3">
            {getAfterValue(change)}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <time
          dateTime={change.detectedAt}
          className="text-xs text-muted tabular-nums"
        >
          {formatDateTime(change.detectedAt)}
        </time>
        <Link
          href={`/changes/${change.id}`}
          className="link text-sm inline-flex items-center gap-1"
        >
          View change
          <Icon name="arrow" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
export function ChangeSummaryBlock({ change }: { change: ChangeSummary }) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap gap-3 items-center">
        <h2 className="text-lg font-bold">
          {formatChangeType(change.changeType)}
        </h2>
        <ImportanceBadge importance={change.importance} />
      </div>
      {change.explanation ? (
        <p className="mt-3 text-muted">{change.explanation}</p>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        Detected {formatDateTime(change.detectedAt)}
      </p>
    </section>
  );
}
