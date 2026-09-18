import { formatImportance, importanceStyles } from "@/lib/format";

export function ImportanceBadge({ importance }: { importance?: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${importanceStyles(importance)}`}
    >
      {formatImportance(importance)}
    </span>
  );
}
