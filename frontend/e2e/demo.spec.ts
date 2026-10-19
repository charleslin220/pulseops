import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("anonymous dashboard and investigation", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Operations at a glance" }),
  ).toBeVisible();
  await expect(page.locator(".event-total")).toBeVisible();
  await page.getByRole("link", { name: "Investigate checkout spike" }).click();
  await expect(page.getByText("31 events", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: /Details for/ })
    .first()
    .click();
  await expect(page.getByText("EVENT DETAILS", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByLabel("Search events").fill("nonexistent-message");
  await expect(page.getByText("No matching events")).toBeVisible();
  await page.reload();
  await expect(page.getByText("No matching events")).toBeVisible();
});
test("private API remains protected; public writes rejected", async ({
  request,
}) => {
  expect((await request.get("/api/events")).status()).toBe(401);
  expect((await request.post("/api/demo/events", { data: {} })).status()).toBe(
    405,
  );
  expect(
    (await request.get("/api/demo/events?organisationId=private")).status(),
  ).toBe(400);
});
test("responsive dashboard and accessible structure", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".event-total")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("link", { name: "Event Explorer", exact: false })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Event Explorer" }),
  ).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("loading and API failure remain accessible and recoverable", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/demo/dashboard*", async (route) => {
    await gate;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Demo temporarily unavailable" }),
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("status", { name: "Loading operational data" }),
  ).toBeVisible();
  const loading = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  release();
  expect(loading.violations).toEqual([]);
  await expect(page.getByRole("alert")).toContainText(
    "Demo temporarily unavailable",
  );
  await page.unroute("**/api/demo/dashboard*");
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator(".event-total")).toBeVisible();
});
