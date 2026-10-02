import { formatImportance } from "@/lib/format";
export function ImportanceBadge({
  importance,
}: {
  importance?: string | number | null;
}) {
  const label = formatImportance(importance);
  const tone =
    label === "Critical"
      ? "badge-danger"
      : label === "High"
        ? "badge-warning"
        : label === "Medium"
          ? "badge-primary"
          : "";
  return (
    <span className={`badge ${tone}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
