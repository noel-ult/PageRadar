import { test, expect } from "@playwright/test";
test("real browser registration, session, watch, deadline and notification", async ({
  page,
  context,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `browser-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill("Browser verification");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password (at least 8 characters)", { exact: true })
    .fill("browser-test-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser-test-password-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  const cookie = (await context.cookies()).find(
    (c) => c.name === "pageradar_session",
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("pageradar_token")),
  ).toBeNull();
  await page.goto("/watches/new");
  await page.getByLabel("Watch name").fill("Browser scholarship");
  await page.getByLabel("Website URL").fill(process.env.PAGERADAR_FIXTURE_URL!);
  await page.getByLabel("Deadline", { exact: true }).check();
  await page.getByRole("button", { name: "Create watch", exact: true }).click();
  await expect(page.getByText("Baseline captured")).toBeVisible({
    timeout: 20000,
  });
  await request.get(process.env.PAGERADAR_FIXTURE_UPDATE_URL!);
  await page.getByRole("button", { name: "Check now", exact: true }).click();
  await expect(page.getByText("Changes detected")).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("link", { name: "View change" }).click();
  await expect(
    page.getByRole("region", { name: "After", exact: true }),
  ).toContainText("December 1");
  await expect(page.getByRole("region", { name: "Explanation" })).toContainText(
    "extended",
  );
  await page.getByRole("button", { name: "View notifications" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(
    page.getByRole("button", { name: "Mark all read" }),
  ).toBeDisabled();
  const csrf = await context.request.post("/graphql", {
    headers: {
      Origin: "https://attacker.example",
      "Content-Type": "application/json",
    },
    data: { query: "mutation {markAllNotificationsRead}" },
  });
  expect(csrf.status()).toBe(403);
  const aliasedLogin = await context.request.post("/graphql", {
    data: {
      query:
        "mutation($email:String!,$password:String!){signin:login(input:{email:$email,password:$password}){secret:accessToken ...Session}} fragment Session on AuthPayload { secret:accessToken }",
      variables: { email, password: "browser-test-password-123" },
    },
  });
  expect((await aliasedLogin.json()).data.signin.secret).toBe(
    "session-established",
  );
  expect(
    (await context.cookies()).find((c) => c.name === "pageradar_session")
      ?.httpOnly,
  ).toBe(true);
  const oversized = await context.request.post("/graphql", {
    data: { query: "{me{id}}", padding: "x".repeat(66000) },
  });
  expect(oversized.status()).toBe(413);
  const invalid = await context.request.post("/graphql", {
    data: { query: "{" },
  });
  expect(invalid.status()).toBe(400);
  await page.screenshot({
    path: "/tmp/pageradar-verified-change.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
});
