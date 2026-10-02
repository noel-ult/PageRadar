import { test, expect } from "@playwright/test";
const watchId = "11111111-1111-4111-8111-111111111111";
const changeId = "22222222-2222-4222-8222-222222222222";
const date = "2026-10-02T00:00:00.000Z";
test("watch preferences, async checks, edit, history, read state and delete", async ({
  page,
  context,
}) => {
  let exists = false;
  let changed = false;
  let read = false;
  let checking = 0;
  let deleteAttempts = 0;
  let watch = {
    __typename: "WatchModel",
    id: watchId,
    name: "Scholarship",
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
    latestChange: null as unknown,
  };
  const change = {
    __typename: "ChangeModel",
    id: changeId,
    watchId,
    changeType: "DEADLINE_CHANGED",
    importance: 85,
    severity: "CRITICAL",
    confidence: 0.92,
    isMeaningful: true,
    changePercentage: 12,
    affectedSections: ["Deadline"],
    section: "Deadline",
    before: "October 15",
    after: "November 2",
    oldValue: "October 15",
    newValue: "November 2",
    explanation: "The deadline was extended by 18 days.",
    detectedAt: date,
    watch: {
      __typename: "WatchModel",
      id: watchId,
      name: "Scholarship",
      url: watch.url,
    },
  };
  await page.route("**/graphql", async (route) => {
    const { query, variables = {} } = route.request().postDataJSON();
    let data: unknown = {};
    let headers: Record<string, string> = {};
    if (/mutation Login/.test(query)) {
      data = {
        login: {
          __typename: "AuthPayload",
          accessToken: "session-established",
          user: {
            __typename: "UserModel",
            id: "u1",
            name: "Test user",
            email: "a@example.com",
          },
        },
      };
      headers = {
        "set-cookie":
          "pageradar_session=test-session; Path=/; HttpOnly; SameSite=Lax",
      };
    } else if (/query Me/.test(query))
      data = {
        me: {
          __typename: "UserModel",
          id: "u1",
          name: "Test user",
          email: "a@example.com",
        },
      };
    else if (/query DashboardStats/.test(query))
      data = {
        dashboardStats: {
          __typename: "DashboardStatsModel",
          totalWatches: exists ? 1 : 0,
          activeWatches: exists && watch.isActive ? 1 : 0,
          recentChanges: changed ? 1 : 0,
          importantChanges: changed ? 1 : 0,
          failedChecks: 0,
        },
      };
    else if (/query Watches\(/.test(query))
      data = {
        watchesPage: {
          __typename: "WatchConnection",
          nodes: exists ? [watch] : [],
          pageInfo: {
            __typename: "PageInfo",
            hasNextPage: false,
            endCursor: null,
          },
        },
      };
    else if (/query RecentChanges/.test(query))
      data = {
        changesPage: {
          __typename: "ChangeConnection",
          nodes: changed ? [change] : [],
          pageInfo: {
            __typename: "PageInfo",
            hasNextPage: false,
            endCursor: null,
          },
        },
      };
    else if (/query Notifications/.test(query))
      data = {
        unreadNotificationCount: changed && !read ? 1 : 0,
        notifications: changed
          ? [
              {
                __typename: "NotificationModel",
                id: "n1",
                changeId,
                channel: "IN_APP",
                status: "SENT",
                message: change.explanation,
                readAt: read ? date : null,
                sentAt: date,
                createdAt: date,
              },
            ]
          : [],
      };
    else if (/mutation CreateWatch/.test(query)) {
      exists = true;
      expect(variables.input.interests).toEqual(["DEADLINE"]);
      expect(variables.input.minimumImportance).toBe(65);
      watch = { ...watch, name: variables.input.title };
      data = { createWatch: watch };
    } else if (/mutation UpdateWatch/.test(query)) {
      watch = {
        ...watch,
        name: variables.input.title,
        checkIntervalMinutes: variables.input.checkInterval,
      };
      data = { updateWatch: watch };
    } else if (/mutation PreviewWatch/.test(query))
      data = {
        previewWatch: {
          __typename: "ContentPreview",
          text: "Application deadline: October 15",
          sections: ["Deadline"],
        },
      };
    else if (/mutation CheckWatchNow/.test(query)) {
      checking = 1;
      data = {
        checkWatchNow: {
          __typename: "CheckRunModel",
          id: "r2",
          status: "QUEUED",
          completedAt: null,
          error: null,
        },
      };
    } else if (/query WatchHistory/.test(query)) {
      const active = checking === 1;
      if (checking) checking++;
      if (checking > 2) {
        changed = true;
        watch.latestChange = change;
      }
      data = {
        checkRuns: {
          __typename: "CheckRunConnection",
          nodes: [
            {
              __typename: "CheckRunModel",
              id: checking ? "r2" : "r1",
              status: active
                ? "RUNNING"
                : changed
                  ? "CHANGE_DETECTED"
                  : "SUCCESS",
              attempts: 1,
              startedAt: date,
              completedAt: active ? null : date,
              nextAttemptAt: date,
              error: null,
              changes: changed ? [change] : [],
            },
          ],
          pageInfo: {
            __typename: "PageInfo",
            hasNextPage: false,
            endCursor: null,
          },
        },
      };
    } else if (/query Watch\(/.test(query))
      data = {
        watch,
        changesPage: {
          __typename: "ChangeConnection",
          nodes: changed ? [change] : [],
          pageInfo: {
            __typename: "PageInfo",
            hasNextPage: false,
            endCursor: null,
          },
        },
      };
    else if (/query Change\(/.test(query)) data = { change };
    else if (/mutation PauseWatch/.test(query)) {
      watch.isActive = false;
      data = {
        toggleWatch: { __typename: "WatchModel", id: watchId, isActive: false },
      };
    } else if (/mutation ResumeWatch/.test(query)) {
      watch.isActive = true;
      data = {
        toggleWatch: { __typename: "WatchModel", id: watchId, isActive: true },
      };
    } else if (/mutation DeleteWatch/.test(query)) {
      if (++deleteAttempts === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            errors: [{ message: "Unable to delete the watch. Try again." }],
          }),
        });
        return;
      }
      exists = false;
      data = { deleteWatch: true };
    } else if (/mutation MarkAllNotificationsRead/.test(query)) {
      read = true;
      data = { markAllNotificationsRead: true };
    } else throw new Error(`Unexpected GraphQL operation: ${query}`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers,
      body: JSON.stringify({ data }),
    });
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("a@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("heading", {
      name: "Stay ahead of what changes.",
      exact: true,
    }),
  ).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) < 901) {
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();
    await expect(
      page.getByRole("dialog", { name: "Your workspace" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close navigation" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
  expect(
    (await context.cookies()).find((c) => c.name === "pageradar_session")
      ?.httpOnly,
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("pageradar_token")),
  ).toBeNull();
  await page.goto("/watches/new");
  await page.getByLabel("Watch name").fill("Scholarship");
  await page.getByLabel("Website URL").fill(watch.url);
  await page.getByLabel("Deadline", { exact: true }).check();
  await page.getByLabel("Minimum alert importance").fill("65");
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.getByLabel("Watch name")).toHaveValue("Scholarship");
  await page.getByRole("button", { name: "Preview content" }).click();
  await expect(
    page.getByRole("region", { name: "Content preview" }),
  ).toContainText("October 15");
  await page.getByRole("button", { name: "Create watch", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/watches/${watchId}$`));
  await expect(page.getByText("Baseline captured")).toBeVisible();
  await page.getByRole("button", { name: "Check now", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check in progress…" }),
  ).toBeDisabled();
  await expect(page.getByText("Changes detected")).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("link", { name: "Edit watch" }).click();
  await page.getByLabel("Watch name").fill("Scholarship updates");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "Scholarship updates", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("link", { name: "View change" }).click();
  await expect(
    page.getByRole("region", { name: "After", exact: true }),
  ).toContainText("November 2");
  await page.screenshot({
    path: `/tmp/pageradar-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "View notifications" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "Recent changes" }),
  ).toContainText("November 2");
  for (const theme of ["light", "dark"]) {
    const mobile = (page.viewportSize()?.width ?? 1280) < 901;
    if (mobile)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByLabel("Color theme")
      .filter({ visible: true })
      .first()
      .selectOption(theme);
    if (mobile)
      await page.getByRole("button", { name: "Close navigation" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.screenshot({
      path: `/tmp/pageradar-redesign-dashboard-${theme}-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto(`/watches/${watchId}`);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Unable to delete",
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page).toHaveURL(/\/watches$/);
  await expect(
    page.getByText("You are not monitoring any webpages yet."),
  ).toBeVisible();
});

test("login validation and API unavailable state preserve inputs", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator('form [role="alert"]')).toContainText("required");
  await page.route("**/graphql", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        errors: [{ message: "PageRadar API is temporarily unavailable." }],
      }),
    }),
  );
  await page.getByLabel("Email", { exact: true }).fill("a@example.com");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator('form [role="alert"]')).toContainText(
    "temporarily unavailable",
  );
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "a@example.com",
  );
});
