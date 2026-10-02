import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const watchId = "11111111-1111-4111-8111-111111111111";
const date = "2026-10-02T00:00:00.000Z";

async function fixture(page: Page, context: BrowserContext) {
  await context.addCookies([
    {
      name: "pageradar_session",
      value: "test-session",
      url: "http://localhost:3100",
      httpOnly: true,
    },
  ]);
  const state = {
    name: "Scholarship",
    fail: false,
    empty: false,
    listRequests: 0,
    watchRequests: 0,
    notificationRequests: 0,
    hold: undefined as Promise<void> | undefined,
  };
  const pageInfo = {
    __typename: "PageInfo",
    hasNextPage: false,
    endCursor: null,
  };
  await page.route("**/graphql", async (route) => {
    const { query } = route.request().postDataJSON();
    const watch = {
      __typename: "WatchModel",
      id: watchId,
      name: state.name,
      url: "https://example.com/scholarship",
      isActive: true,
      checkIntervalMinutes: 360,
      interests: ["DEADLINE"],
      minimumImportance: 65,
      emailEnabled: true,
      includeSelector: null,
      excludeSelector: null,
      nextCheckAt: date,
      lastCheckedAt: date,
      createdAt: date,
      latestChange: null,
    };
    let data: unknown;
    if (/query Watches\(/.test(query)) {
      state.listRequests++;
      await state.hold;
      if (state.fail) {
        await route.abort("failed");
        return;
      }
      data = {
        watchesPage: {
          __typename: "WatchConnection",
          nodes: state.empty ? [] : [watch],
          pageInfo,
        },
      };
    } else if (/query Watch\(/.test(query)) {
      state.watchRequests++;
      data = {
        watch,
        changesPage: { __typename: "ChangeConnection", nodes: [], pageInfo },
      };
    } else if (/query Me/.test(query)) {
      data = {
        me: {
          __typename: "UserModel",
          id: "u1",
          name: "Test user",
          email: "a@example.com",
        },
      };
    } else if (/query NotificationsPage/.test(query)) {
      data = {
        notificationsPage: {
          __typename: "NotificationConnection",
          nodes: [],
          pageInfo,
        },
      };
    } else if (/query Notifications/.test(query)) {
      state.notificationRequests++;
      data = { unreadNotificationCount: 0, notifications: [] };
    } else if (/query DashboardStats/.test(query)) {
      data = {
        dashboardStats: {
          __typename: "DashboardStatsModel",
          totalWatches: 0,
          activeWatches: 0,
          recentChanges: 0,
          importantChanges: 0,
          failedChecks: 0,
        },
      };
    } else if (/query RecentChanges/.test(query)) {
      data = {
        changesPage: { __typename: "ChangeConnection", nodes: [], pageInfo },
      };
    } else throw new Error(`Unexpected operation: ${query}`);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data }),
    });
  });
  return state;
}

test("polling retains visible data and recovers after a failed refresh", async ({
  page,
  context,
}) => {
  const state = await fixture(page, context);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/watches");
  await expect(
    page.getByRole("heading", { name: "Scholarship", exact: true }),
  ).toBeVisible();

  let release!: () => void;
  state.hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.name = "Extended deadline";
  await expect.poll(() => state.listRequests, { timeout: 15_000 }).toBe(2);
  await expect(
    page.getByRole("heading", { name: "Scholarship", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading watches...")).not.toBeVisible();
  release();
  state.hold = undefined;
  await expect(
    page.getByRole("heading", { name: "Extended deadline", exact: true }),
  ).toBeVisible();

  state.fail = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText(/Showing the last loaded data/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Extended deadline", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/pageradar-refresh-${test.info().project.name}.png`,
    fullPage: true,
  });

  state.fail = false;
  state.name = "Recovered update";
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    page.getByRole("heading", { name: "Recovered update", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/Showing the last loaded data/),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("cached navigation refreshes immediately and settings preserve unsaved edits", async ({
  page,
  context,
}) => {
  const state = await fixture(page, context);
  await page.goto("/watches");
  await expect(
    page.getByRole("heading", { name: "Scholarship", exact: true }),
  ).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Primary" });
  await navigation
    .getByRole("link", { name: "Notifications", exact: true })
    .click();
  await expect(page.getByText("No alerts yet")).toBeVisible();

  let release!: () => void;
  state.hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  state.name = "Latest scholarship";
  const requests = state.listRequests;
  await navigation.getByRole("link", { name: "Watches", exact: true }).click();
  await expect.poll(() => state.listRequests).toBeGreaterThan(requests);
  await expect(
    page.getByRole("heading", { name: "Scholarship", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Loading watches...")).not.toBeVisible();
  release();
  state.hold = undefined;
  await expect(
    page.getByRole("heading", { name: "Latest scholarship", exact: true }),
  ).toBeVisible();

  await page.goto(`/watches/${watchId}/edit`);
  await expect(page.getByLabel("Watch name")).toHaveValue("Latest scholarship");
  await page.getByLabel("Watch name").fill("My unsaved draft");
  const settingsRequests = state.watchRequests;
  state.name = "Changed in another tab";
  const listBeforeReturn = state.listRequests;
  const notificationsBeforeReturn = state.notificationRequests;
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // Wait for another active query to prove the return refresh has completed.
  await page.getByRole("button", { name: "View notifications" }).click();
  await expect(
    page.getByText("No notifications yet.", { exact: false }),
  ).toBeVisible();
  await expect
    .poll(() => state.notificationRequests)
    .toBeGreaterThan(notificationsBeforeReturn);
  expect(state.watchRequests).toBe(settingsRequests);
  expect(state.listRequests).toBe(listBeforeReturn);
  await expect(page.getByLabel("Watch name")).toHaveValue("My unsaved draft");
});

test("refreshing an already loaded empty dashboard does not flash a loader", async ({
  page,
  context,
}) => {
  const state = await fixture(page, context);
  state.empty = true;
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No active watches.")).toBeVisible();
  await expect(page.getByText("No changes detected yet.")).toBeVisible();
  let release!: () => void;
  state.hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requests = state.listRequests;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => state.listRequests).toBeGreaterThan(requests);
  await expect(page.getByText("Loading watches...")).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  release();
  state.hold = undefined;
});

test("hidden and offline tabs pause polling and refresh when available again", async ({
  page,
  context,
}) => {
  test.setTimeout(45_000);
  const state = await fixture(page, context);
  await page.goto("/watches");
  await expect(
    page.getByRole("heading", { name: "Scholarship", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const beforeHidden = state.listRequests;
  // A negative polling assertion must span the actual 10-second interval.
  await page.waitForTimeout(11_000);
  expect(state.listRequests).toBe(beforeHidden);
  state.name = "Back in view";
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("heading", { name: "Back in view", exact: true }),
  ).toBeVisible();

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  const beforeOffline = state.listRequests;
  await page.waitForTimeout(11_000);
  expect(state.listRequests).toBe(beforeOffline);
  await expect(
    page.getByRole("heading", { name: "Back in view", exact: true }),
  ).toBeVisible();
  state.name = "Reconnected";
  await context.setOffline(false);
  await expect(
    page.getByRole("heading", { name: "Reconnected", exact: true }),
  ).toBeVisible();
});
