export const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "/graphql";


export type ChangeType =
  | "DEADLINE_CHANGED"
  | "ELIGIBILITY_CHANGED"
  | "STATUS_CHANGED"
  | "REQUIREMENT_CHANGED"
  | "PRICE_CHANGED"
  | "LINK_CHANGED"
  | "SECTION_CHANGED"
  | "CONTENT_CHANGED";

export type Importance = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ChangeSummary {
  id: string;
  changeType: ChangeType;
  importance: Importance;
  section?: string | null;
  before?: string | null;
  after?: string | null;
  explanation?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  detectedAt: string;
}

export interface Watch {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  checkIntervalMinutes: number;
  interests?: string[];
  lastCheckedAt?: string | null;
  createdAt?: string | null;
  latestChange?: ChangeSummary | null;
  changes?: ChangeSummary[];
}

export interface ChangeDetail extends ChangeSummary {
  watch?: {
    id: string;
    name: string;
    url: string;
  } | null;
}

export interface DashboardStats {
  activeWatches: number;
  recentChanges: number;
  importantChanges: number;
}

export const INTEREST_OPTIONS = [
  { value: "DEADLINE", label: "Deadline" },
  { value: "ELIGIBILITY", label: "Eligibility" },
  { value: "STATUS", label: "Status" },
  { value: "REQUIREMENT", label: "Requirement" },
  { value: "PRICE", label: "Price" },
  { value: "LINK", label: "Link" },
] as const;
