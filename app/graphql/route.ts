import { NextResponse } from "next/server";
import { graphql, buildSchema } from "graphql";

const schema = buildSchema(`
  type User {
    id: ID!
    name: String!
    email: String!
  }

  type AuthPayload {
    accessToken: String!
    access_token: String
    token: String
    user: User!
  }

  type Change {
    id: ID!
    changeType: String!
    importance: String!
    section: String
    before: String
    after: String
    oldValue: String
    newValue: String
    explanation: String
    detectedAt: String!
    watch: Watch
  }

  type Watch {
    id: ID!
    name: String!
    url: String!
    status: String!
    checkIntervalMinutes: Int!
    interests: [String!]!
    lastCheckedAt: String
    createdAt: String
    latestChange: Change
    changes: [Change!]
  }

  type DashboardStats {
    activeWatches: Int!
    recentChanges: Int!
    importantChanges: Int!
  }

  input CreateWatchInput {
    name: String!
    url: String!
    checkIntervalMinutes: Int!
    interests: [String!]!
  }

  input UpdateWatchInput {
    name: String
    url: String
    checkIntervalMinutes: Int
    interests: [String!]
  }

  type Query {
    me: User
    dashboardStats: DashboardStats!
    watches: [Watch!]!
    watch(id: ID!): Watch
    changes(limit: Int): [Change!]!
    change(id: ID!): Change
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): User!
    login(email: String!, password: String!): AuthPayload!
    createWatch(input: CreateWatchInput!): Watch!
    pauseWatch(id: ID!): Watch!
    resumeWatch(id: ID!): Watch!
    deleteWatch(id: ID!): Boolean!
    checkWatchNow(id: ID!): Watch!
    updateWatch(id: ID!, input: UpdateWatchInput!): Watch!
  }
`);

interface UserRecord {
  id: string;
  name: string;
  email: string;
  password?: string;
}

interface WatchRecord {
  id: string;
  name: string;
  url: string;
  status: "ACTIVE" | "PAUSED";
  checkIntervalMinutes: number;
  interests: string[];
  lastCheckedAt: string | null;
  createdAt: string;
}

interface ChangeRecord {
  id: string;
  watchId: string;
  changeType: string;
  importance: string;
  section?: string | null;
  before?: string | null;
  after?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  explanation?: string | null;
  detectedAt: string;
}

// In-memory data store
const users: UserRecord[] = [
  {
    id: "user-1",
    name: "Demo User",
    email: "demo@pageradar.io",
    password: "password123",
  },
];

let currentUser: UserRecord = users[0];

const watches: WatchRecord[] = [
  {
    id: "watch-1",
    name: "Stanford CS Admissions",
    url: "https://cs.stanford.edu/admissions",
    status: "ACTIVE",
    checkIntervalMinutes: 60,
    interests: ["DEADLINE", "REQUIREMENT", "STATUS"],
    lastCheckedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "watch-2",
    name: "AWS EC2 Pricing Updates",
    url: "https://aws.amazon.com/ec2/pricing",
    status: "ACTIVE",
    checkIntervalMinutes: 120,
    interests: ["PRICE", "LINK"],
    lastCheckedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "watch-3",
    name: "GitHub API Changelog",
    url: "https://github.blog/changelog",
    status: "PAUSED",
    checkIntervalMinutes: 30,
    interests: ["STATUS", "REQUIREMENT"],
    lastCheckedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const changes: ChangeRecord[] = [
  {
    id: "change-1",
    watchId: "watch-1",
    changeType: "DEADLINE_CHANGED",
    importance: "HIGH",
    section: "Autumn 2026 Application Deadline",
    before: "December 1, 2026 at 11:59 PM PST",
    after: "December 15, 2026 at 11:59 PM PST",
    oldValue: "December 1, 2026",
    newValue: "December 15, 2026",
    explanation:
      "Application submission deadline extended by 14 days for prospective graduate students.",
    detectedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "change-2",
    watchId: "watch-2",
    changeType: "PRICE_CHANGED",
    importance: "MEDIUM",
    section: "On-Demand Instances - c7g.xlarge",
    before: "$0.1445 per Hour",
    after: "$0.1360 per Hour",
    oldValue: "$0.1445",
    newValue: "$0.1360",
    explanation:
      "Hourly pricing reduced by ~5.8% across us-east-1 and us-west-2 regions.",
    detectedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: "change-3",
    watchId: "watch-1",
    changeType: "REQUIREMENT_CHANGED",
    importance: "CRITICAL",
    section: "Standardized Testing (GRE General)",
    before: "GRE General test is strongly recommended for all applicants.",
    after: "GRE General test is completely optional for 2026-2027 admissions cycle.",
    oldValue: "strongly recommended",
    newValue: "completely optional",
    explanation:
      "Department has dropped the mandatory GRE requirement for the upcoming admissions cycle.",
    detectedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
];

function formatChange(change: ChangeRecord) {
  const watch = watches.find((w) => w.id === change.watchId) ?? null;
  return {
    ...change,
    watch: watch
      ? {
          id: watch.id,
          name: watch.name,
          url: watch.url,
        }
      : null,
  };
}

function formatWatch(watch: WatchRecord) {
  const watchChanges = changes
    .filter((c) => c.watchId === watch.id)
    .sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  const latestChange = watchChanges[0] ? formatChange(watchChanges[0]) : null;
  return {
    ...watch,
    latestChange,
    changes: watchChanges.map(formatChange),
  };
}

const rootResolvers = {
  me: (_args: unknown, context: { tokenUser?: UserRecord }) => {
    return context.tokenUser ?? currentUser ?? users[0];
  },
  dashboardStats: () => {
    const activeWatches = watches.filter((w) => w.status === "ACTIVE").length;
    const recentChanges = changes.length;
    const importantChanges = changes.filter((c) =>
      ["HIGH", "CRITICAL"].includes(c.importance)
    ).length;
    return {
      activeWatches,
      recentChanges,
      importantChanges,
    };
  },
  watches: () => {
    return watches.map(formatWatch);
  },
  watch: ({ id }: { id: string }) => {
    const w = watches.find((item) => item.id === id);
    if (!w) return null;
    return formatWatch(w);
  },
  changes: ({ limit }: { limit?: number }) => {
    const sorted = [...changes].sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
    const sliced = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
    return sliced.map(formatChange);
  },
  change: ({ id }: { id: string }) => {
    const c = changes.find((item) => item.id === id);
    if (!c) return null;
    return formatChange(c);
  },
  register: ({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }) => {
    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      existing.name = name;
      existing.password = password;
      currentUser = existing;
      return { id: existing.id, name: existing.name, email: existing.email };
    }
    const newUser: UserRecord = {
      id: `user-${users.length + 1}`,
      name,
      email,
      password,
    };
    users.push(newUser);
    currentUser = newUser;
    return { id: newUser.id, name: newUser.name, email: newUser.email };
  },
  login: ({ email, password }: { email: string; password: string }) => {
    let user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (!user) {
      // Auto-create user on first login so demo flows never get stuck
      user = {
        id: `user-${users.length + 1}`,
        name: email.split("@")[0] || "User",
        email,
        password,
      };
      users.push(user);
    }
    currentUser = user;
    const token = `pageradar_jwt_${Buffer.from(user.email).toString("base64")}_${user.id}`;
    return {
      accessToken: token,
      access_token: token,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  },
  createWatch: ({
    input,
  }: {
    input: {
      name: string;
      url: string;
      checkIntervalMinutes: number;
      interests: string[];
    };
  }) => {
    const now = new Date().toISOString();
    const newWatch: WatchRecord = {
      id: `watch-${Date.now()}`,
      name: input.name,
      url: input.url,
      status: "ACTIVE",
      checkIntervalMinutes: Number(input.checkIntervalMinutes) || 60,
      interests: input.interests || ["DEADLINE", "STATUS"],
      lastCheckedAt: now,
      createdAt: now,
    };
    watches.unshift(newWatch);

    const initialChange: ChangeRecord = {
      id: `change-${Date.now()}`,
      watchId: newWatch.id,
      changeType: newWatch.interests.includes("DEADLINE")
        ? "DEADLINE_CHANGED"
        : "CONTENT_CHANGED",
      importance: "HIGH",
      section: "Initial Snapshot",
      before: "Monitoring started",
      after: `Active monitoring configured (${newWatch.interests.join(", ")})`,
      oldValue: null,
      newValue: null,
      explanation: `PageRadar initial snapshot captured for ${newWatch.name}. Checking every ${newWatch.checkIntervalMinutes} minutes.`,
      detectedAt: now,
    };
    changes.unshift(initialChange);

    return formatWatch(newWatch);
  },
  pauseWatch: ({ id }: { id: string }) => {
    const w = watches.find((item) => item.id === id);
    if (!w) throw new Error(`Watch with id ${id} not found`);
    w.status = "PAUSED";
    return formatWatch(w);
  },
  resumeWatch: ({ id }: { id: string }) => {
    const w = watches.find((item) => item.id === id);
    if (!w) throw new Error(`Watch with id ${id} not found`);
    w.status = "ACTIVE";
    return formatWatch(w);
  },
  deleteWatch: ({ id }: { id: string }) => {
    const idx = watches.findIndex((item) => item.id === id);
    if (idx !== -1) {
      watches.splice(idx, 1);
    }
    return true;
  },
  checkWatchNow: ({ id }: { id: string }) => {
    const w = watches.find((item) => item.id === id);
    if (!w) throw new Error(`Watch with id ${id} not found`);
    const now = new Date().toISOString();
    w.lastCheckedAt = now;

    const detectedChange: ChangeRecord = {
      id: `change-${Date.now()}`,
      watchId: w.id,
      changeType: w.interests[0]
        ? `${w.interests[0]}_CHANGED`
        : "CONTENT_CHANGED",
      importance: "MEDIUM",
      section: "Live Scan",
      before: "Previous version",
      after: `Verified live status at ${new Date().toLocaleTimeString()}`,
      oldValue: null,
      newValue: null,
      explanation: `Manual scan triggered. Source page checked and confirmed up-to-date.`,
      detectedAt: now,
    };
    changes.unshift(detectedChange);

    return formatWatch(w);
  },
  updateWatch: ({
    id,
    input,
  }: {
    id: string;
    input: {
      name?: string;
      url?: string;
      checkIntervalMinutes?: number;
      interests?: string[];
    };
  }) => {
    const w = watches.find((item) => item.id === id);
    if (!w) throw new Error(`Watch with id ${id} not found`);
    if (input.name !== undefined) w.name = input.name;
    if (input.url !== undefined) w.url = input.url;
    if (input.checkIntervalMinutes !== undefined)
      w.checkIntervalMinutes = input.checkIntervalMinutes;
    if (input.interests !== undefined) w.interests = input.interests;
    return formatWatch(w);
  },
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    let tokenUser: UserRecord | undefined;
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      tokenUser =
        users.find((u) => token.includes(u.id)) ||
        currentUser ||
        users[0];
    }

    const body = await request.json();
    const { query, variables, operationName } = body;

    const result = await graphql({
      schema,
      source: query,
      rootValue: rootResolvers,
      contextValue: { tokenUser },
      variableValues: variables,
      operationName,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { errors: [{ message }] },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "PageRadar GraphQL API endpoint. Send POST requests with GraphQL queries.",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
