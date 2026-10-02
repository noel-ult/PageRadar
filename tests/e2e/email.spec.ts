import { test, expect, type Page } from "@playwright/test";

const date = "2026-10-02T12:00:00.000Z";
const token = "a".repeat(43);
async function mockEmail(page: Page, available = true) {
  const settings = {
    __typename: "EmailSettings",
    email: "a@example.com",
    verifiedAt: null as string | null,
    enabled: false,
    available,
    suppressed: false,
    suppressionReason: null as string | null,
  };
  let confirmationCount = 0;
  let failToggle = false;
  let deliveryStatus = "PENDING";
  const messages: {
    __typename: string;
    id: string;
    message: string;
    purpose: string;
    status: string;
    createdAt: string;
    sentAt: string | null;
    deliveredAt: string | null;
  }[] = [];
  await page.route("**/graphql", async (route) => {
    const { query, variables = {} } = route.request().postDataJSON();
    let data: object;
    if (/query Me/.test(query))
      data = {
        me: {
          __typename: "UserModel",
          id: "u1",
          name: "Test user",
          email: settings.email,
        },
      };
    else if (/query Notifications/.test(query))
      data = { notifications: [], unreadNotificationCount: 0 };
    else if (/query EmailSettings/.test(query))
      data = { emailSettings: settings };
    else if (/query EmailDeliveries/.test(query))
      data = {
        emailDeliveriesPage: {
          __typename: "NotificationConnection",
          nodes: messages.map((item) => ({
            ...item,
            status: deliveryStatus,
            deliveredAt: deliveryStatus === "DELIVERED" ? date : null,
          })),
          pageInfo: {
            __typename: "PageInfo",
            hasNextPage: false,
            endCursor: null,
          },
        },
      };
    else if (/mutation RequestEmailVerification/.test(query))
      data = { requestEmailVerification: true };
    else if (/mutation ConfirmEmailVerification/.test(query)) {
      expect(variables.token).toBe(token);
      confirmationCount++;
      settings.verifiedAt = date;
      data = { confirmEmailVerification: true };
    } else if (/mutation UnsubscribeEmailAlerts/.test(query)) {
      settings.enabled = false;
      data = { unsubscribeEmailAlerts: true };
    } else if (/mutation SetEmailAlerts/.test(query)) {
      if (failToggle) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            errors: [
              { message: "Email settings could not be saved. Try again." },
            ],
          }),
        });
        return;
      }
      settings.enabled = variables.enabled;
      data = { setEmailAlertsEnabled: settings };
    } else if (/mutation SendTestEmail/.test(query)) {
      messages.push({
        __typename: "NotificationModel",
        id: "test-email-1",
        message: "Test email",
        purpose: "TEST",
        status: "PENDING",
        createdAt: date,
        sentAt: null,
        deliveredAt: null,
      });
      data = {
        sendTestEmail: {
          __typename: "NotificationModel",
          id: "test-email-1",
          status: "PENDING",
        },
      };
    } else throw new Error(`Unexpected operation: ${query}`);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data }),
    });
  });
  return {
    settings,
    confirmations: () => confirmationCount,
    failToggle: () => {
      failToggle = true;
    },
    markDelivered: () => {
      deliveryStatus = "DELIVERED";
    },
  };
}

test("verification requires confirmation, opt-in stays separate, and delivery refreshes", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "pageradar_session",
      value: "test-session",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const state = await mockEmail(page);
  await page.goto("/notifications/settings");
  await expect(
    page.getByRole("button", { name: "Enable email alerts" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Send verification email" }).click();
  await expect(page.locator("main p[role=status]")).toContainText(
    "Verification email queued",
  );
  await expect(
    page.getByRole("button", { name: /Verification requested/ }),
  ).toBeDisabled();
  await page.goto(`/email/verify#token=${token}`);
  await expect(
    page.getByRole("button", { name: "Confirm email address" }),
  ).toBeVisible();
  expect(state.confirmations()).toBe(0);
  await expect(page).toHaveURL(/\/email\/verify$/);
  await page.getByRole("button", { name: "Confirm email address" }).click();
  await expect(
    page.getByRole("heading", { name: "Email address verified" }),
  ).toBeVisible();
  expect(state.settings.enabled).toBe(false);
  await page.getByRole("link", { name: "Notification settings" }).click();
  await page.getByRole("button", { name: "Enable email alerts" }).click();
  await expect(
    page.getByRole("button", { name: "Turn off email alerts" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Send test email" }).click();
  await expect(
    page.getByRole("region", { name: "Email delivery history" }),
  ).toContainText("Queued");
  state.markDelivered();
  await expect(
    page
      .getByRole("region", { name: "Email delivery history" })
      .getByText("Delivered", { exact: true }),
  ).toBeVisible({ timeout: 16000 });
  await page.screenshot({
    path: `/tmp/pageradar-email-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Turn off email alerts" }).click();
  await expect(page.locator("main p[role=status]")).toContainText(
    "Queued alerts have been cancelled",
  );
});

test("provider availability and mutation failure stay explicit", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "pageradar_session",
      value: "test-session",
      url: "http://localhost:3100",
    },
  ]);
  const state = await mockEmail(page, false);
  state.settings.verifiedAt = date;
  state.settings.enabled = true;
  await page.goto("/notifications/settings");
  await expect(page.locator("main p[role=status]")).toContainText(
    "not available yet",
  );
  await expect(
    page.getByRole("button", { name: "Send test email" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Turn off email alerts" }),
  ).toBeEnabled();
  state.failToggle();
  await page.getByRole("button", { name: "Turn off email alerts" }).click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "could not be saved",
  );
  await expect(
    page.getByRole("button", { name: "Turn off email alerts" }),
  ).toBeEnabled();
});

test("public unsubscribe waits for a click and invalid links are recoverable", async ({
  page,
}) => {
  const state = await mockEmail(page);
  state.settings.enabled = true;
  await page.goto(`/email/unsubscribe#token=${token}`);
  const button = page.getByRole("button", { name: "Turn off email alerts" });
  await expect(button).toBeVisible();
  expect(state.settings.enabled).toBe(true);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Email alerts turned off" }),
  ).toBeVisible();
  expect(state.settings.enabled).toBe(false);
  await page.goto("/email/verify#token=invalid");
  await expect(page.locator("main [role=alert]")).toContainText("invalid");
  await expect(
    page.getByRole("button", { name: "Confirm email address" }),
  ).not.toBeVisible();
});
