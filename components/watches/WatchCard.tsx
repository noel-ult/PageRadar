import Link from "next/link";
import type { Watch } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { WatchStatusBadge } from "./WatchStatus";
import { Icon } from "@/components/common/Icon";
export function WatchCard({ watch }: { watch: Watch }) {
  return (
    <article className="panel p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <Icon name="globe" className="text-muted" />
        <WatchStatusBadge isActive={watch.isActive} />
      </div>
      <h3 className="font-bold text-sm truncate">
        <Link href={`/watches/${watch.id}`} className="hover:text-primary">
          {watch.name}
        </Link>
      </h3>
      <p className="text-xs text-muted truncate mt-1" title={watch.url}>
        {watch.url}
      </p>
      <p className="text-xs text-muted mt-3">
        Last check: {formatDateTime(watch.lastCheckedAt)}
      </p>
    </article>
  );
}
