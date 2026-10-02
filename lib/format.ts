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
  ANNOUNCEMENT_ADDED: "New Announcement",
  DOCUMENT_ADDED: "Document Added",
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

export function formatImportance(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "number") {
    if (value >= 75) return "High";
    if (value >= 40) return "Medium";
    return "Low";
  }
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

/** User-friendly message for Apollo/GraphQL errors. Never leaks stack traces. */
export function friendlyErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const msg = err.message.replace(/^ApolloError:\s*/, "");
    if (/received status code 50[234]|temporarily unavailable/i.test(msg))
      return "PageRadar API is temporarily unavailable. Please try again shortly.";
    // Strip common technical prefixes but keep useful backend validation text.
    if (/failed to fetch|networkerror|load failed/i.test(msg))
      return "Network error. Check your connection and try again.";
    if (msg.length > 300) return "Something went wrong. Please try again.";
    return msg;
  }
  return "Something went wrong. Please try again.";
}
