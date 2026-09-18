import { test, expect } from "@playwright/test";

/**
 * Main E2E user flow (frontend only, GraphQL mocked at the network layer):
 * Register -> Login -> Dashboard -> Add Watch -> Open Watch ->
 * View Latest Change -> Open Change Details -> See Before/After -> Logout.
 *
 * Note: mocked payloads include `__typename` because Apollo Client adds
 * `__typename` to every selection set and drops fragment fields it cannot
 * normalize — exactly as a real NestJS GraphQL backend would return.
 */
test("pageradar main flow", async ({ page }) => {
  const watchId = "watch-1";
  const changeId = "change-1";
  const now = new Date().toISOString();

  const changeCore = {
    __typename: "Change",
    id: changeId,
    changeType: "DEADLINE_CHANGED",
    importance: "HIGH",
    section: "Admissions",
    before: "17 September 2026",
    after: "20 September 2026",
    oldValue: null,
    newValue: null,
    explanation:
      "Registration deadline changed from 17 September 2026 to 20 September 2026.",
    detectedAt: now,
  };

  const change = {
    ...changeCore,
    watch: {
      __typename: "Watch",
      id: watchId,
      name: "Admissions",
      url: "https://example.com/admissions",
    },
  };

  const watch = {
    __typename: "Watch",
    id: watchId,
    name: "Admissions",
    url: "https://example.com/admissions",
    status: "ACTIVE",
    checkIntervalMinutes: 60,
    interests: ["DEADLINE", "STATUS"],
    lastCheckedAt: now,
    createdAt: now,
    latestChange: changeCore,
  };

  await page.route("**/graphql**", async (route) => {
    const req = route.request();
    let operationName: string | undefined;
    try {
      operationName = req.postDataJSON?.()?.operationName as string | undefined;
    } catch {
      operationName = undefined;
    }

    switch (operationName) {
      case "Register":
        return route.fulfill({
          json: {
            data: {
              register: {
                __typename: "User",
                id: "u1",
                name: "Test",
                email: "t@e.com",
              },
            },
          },
        });
      case "Login":
        return route.fulfill({
          json: {
            data: {
              login: {
                __typename: "AuthPayload",
                accessToken: "test-token",
                access_token: null,
                token: null,
                user: {
                  __typename: "User",
                  id: "u1",
                  name: "Test",
                  email: "t@e.com",
                },
              },
            },
          },
        });
      case "Me":
        return route.fulfill({
          json: {
            data: {
              me: { __typename: "User", id: "u1", name: "Test", email: "t@e.com" },
            },
          },
        });
      case "DashboardStats":
        return route.fulfill({
          json: {
            data: {
              dashboardStats: {
                __typename: "DashboardStats",
                activeWatches: 1,
                recentChanges: 1,
                importantChanges: 1,
              },
            },
          },
        });
      case "Watches":
        return route.fulfill({ json: { data: { watches: [watch] } } });
      case "Watch":
        return route.fulfill({
          json: {
            data: {
              watch: { ...watch, changes: [changeCore] },
            },
          },
        });
      case "RecentChanges":
        return route.fulfill({ json: { data: { changes: [change] } } });
      case "Change":
        return route.fulfill({ json: { data: { change } } });
      case "CreateWatch":
        return route.fulfill({ json: { data: { createWatch: watch } } });
      default:
        return route.continue();
    }
  });

  // Register
  await page.goto("/register");
  await page.getByLabel("Name").fill("Test");
  await page.getByLabel("Email").fill("t@e.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create Account" }).click();
  await expect(page).toHaveURL(/\/login/);

  // Login
  await page.getByLabel("Email").fill("t@e.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Active Watches")).toBeVisible();

  // Add watch
  await page.getByRole("link", { name: "Add Watch" }).first().click();
  await expect(page).toHaveURL(/\/watches\/new/);
  await page.getByLabel("Watch Name").fill("Admissions");
  await page.getByLabel("Website URL").fill("https://example.com/admissions");
  await page.getByRole("button", { name: "Create Watch" }).click();
  await expect(page).toHaveURL(new RegExp(`/watches/${watchId}`));
  await expect(page.getByText("Deadline Changed").first()).toBeVisible();

  // Open change details, see before/after
  await page.getByRole("link", { name: "View change details" }).click();
  await expect(page).toHaveURL(new RegExp(`/changes/${changeId}`));
  await expect(page.getByText("17 September 2026").first()).toBeVisible();
  await expect(page.getByText("20 September 2026").first()).toBeVisible();
  await expect(page.getByText(/Registration deadline changed/)).toBeVisible();

  // Logout via sidebar
  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login/);
});

test("auth validation blocks empty login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(
    page.getByText("Email and password are required.")
  ).toBeVisible();
});
