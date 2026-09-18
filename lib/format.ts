import type { ChangeType } from "./types";

const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  DEADLINE_CHANGED: "Deadline Changed",
  ELIGIBILITY_CHANGED: "Eligibility Changed",
  STATUS_CHANGED: "Status Changed",
  REQUIREMENT_CHANGED: "Requirement Changed",
  PRICE_CHANGED: "Price Changed",
  LINK_CHANGED: "Link Changed",
  SECTION_CHANGED: "Section Changed",
  CONTENT_CHANGED: "Content Changed",
};

export function formatChangeType(value?: string | null): string {
  if (!value) return "Changed";
  if (value in CHANGE_TYPE_LABELS)
    return CHANGE_TYPE_LABELS[value as ChangeType];
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatImportance(value?: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getBeforeValue(c: {
  before?: string | null;
  oldValue?: string | null;
}): string {
  return c.before ?? c.oldValue ?? "—";
}

export function getAfterValue(c: {
  after?: string | null;
  newValue?: string | null;
}): string {
  return c.after ?? c.newValue ?? "—";
}

export function importanceStyles(importance?: string | null): string {
  switch (importance) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 ring-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 ring-yellow-200";
    case "LOW":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

/** User-friendly message for Apollo/GraphQL errors. Never leaks stack traces. */
export function friendlyErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const msg = err.message.replace(/^ApolloError:\s*/, "");
    // Strip common technical prefixes but keep useful backend validation text.
    if (/failed to fetch|networkerror|load failed/i.test(msg))
      return "Network error. Check your connection and try again.";
    if (msg.length > 300) return "Something went wrong. Please try again.";
    return msg;
  }
  return "Something went wrong. Please try again.";
}
