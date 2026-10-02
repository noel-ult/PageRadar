import { test, expect } from "@playwright/test";

test("public redesign, theme persistence, device changes and sample evidence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your internet. In focus." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const theme = page
    .getByLabel("Color theme")
    .filter({ visible: true })
    .first();
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    animations: "disabled",
    path: `/tmp/pageradar-redesign-home-dark-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByLabel("Color theme").filter({ visible: true }).first(),
  ).toHaveValue("dark");
  await page
    .getByLabel("Color theme")
    .filter({ visible: true })
    .first()
    .selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByLabel("Color theme")
    .filter({ visible: true })
    .first()
    .selectOption("light");
  await page.screenshot({
    animations: "disabled",
    path: `/tmp/pageradar-redesign-home-light-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Explore the demo" }).click();
  await expect(
    page.getByText("This demo uses sample data.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Price change Pro plan pricing/ })
    .click();
  await expect(
    page.getByRole("region", { name: "After", exact: true }),
  ).toContainText("$39");
  await expect(
    page.getByRole("button", { name: /Price change Pro plan pricing/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    animations: "disabled",
    path: `/tmp/pageradar-redesign-demo-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(
    page.getByRole("region", { name: "After", exact: true }),
  ).toContainText("$39");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("authentication masks passwords, supports keyboard and keeps theme", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/login");
  await page.getByLabel("Color theme").selectOption("dark");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("example-password");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("example-password");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.screenshot({
    animations: "disabled",
    path: `/tmp/pageradar-redesign-login-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Sign up", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByLabel("Password (at least 8 characters)"),
  ).toHaveAttribute("type", "password");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
