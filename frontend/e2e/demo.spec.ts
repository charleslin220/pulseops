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

test("service investigation follows a regional recovery across services", async ({
  page,
}) => {
  await page.goto("/demo/services");
  await expect(
    page.getByRole("heading", { name: "Know every service." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explore regional recovery" }).click();
  await expect(
    page.getByRole("heading", { name: "Identity Service", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("13 changes", { exact: true })).toBeVisible();
  await expect(page.getByText("Dashed line:", { exact: false })).toBeVisible();
  await page
    .getByRole("link", { name: "Follow related events" })
    .first()
    .click();
  await expect(page.getByText("26 events", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.locator("tbody")).toContainText("Identity Service");
  await expect(page.locator("tbody")).toContainText("Notifications");
  await page.reload();
  await expect(page.getByText("26 events", { exact: true })).toBeVisible();
});

test("comparison ranges persist and unavailable history is explicit", async ({
  page,
}) => {
  await page.goto("/demo/services/checkout");
  await expect(
    page.getByRole("heading", { name: "Checkout API", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Last 24h", exact: true }).click();
  await expect(
    page.getByText("The previous equal-length window extends", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByLabel("Window from (UTC)").fill("2026-10-19T03:30");
  await page.getByLabel("Window to (UTC)").fill("2026-10-19T06:00");
  await page.getByRole("button", { name: "Apply range" }).click();
  await expect(page.getByText("23 changes", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("23 changes", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Last 1h", exact: true }).click();
  await expect(page.getByText("10 changes", { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText("23 changes", { exact: true })).toBeVisible();
});

test("service API validates paths and keeps the public boundary read-only", async ({
  request,
}) => {
  expect((await request.get("/api/demo/services/not-real")).status()).toBe(404);
  expect(
    (
      await request.get("/api/demo/services/checkout?organisationId=private")
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/demo/services/checkout", {
        data: { status: "healthy" },
      })
    ).status(),
  ).toBe(405);
  expect(
    (
      await request.get("/api/demo/services/checkout?from=2026-10-19T11:01:00Z")
    ).status(),
  ).toBe(400);
  const r = await request.get(
    "/api/demo/services/checkout?from=2026-10-19T06:00:00Z",
  );
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data.current.samples).toBe(72);
  expect(data.previous.samples).toBe(72);
});

test("mobile investigation is accessible and chart brushing updates the URL", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/demo/services/checkout");
  await expect(
    page.getByRole("heading", { name: "Checkout API", exact: true }),
  ).toBeVisible();
  const chart = page.getByRole("img", {
    name: /^Operational latency time series/,
  });
  await expect(chart.locator("svg")).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  const box = await chart.boundingBox();
  if (!box) throw new Error("Missing chart");
  await page.mouse.move(box.x + box.width * 0.4, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + 100, { steps: 12 });
  await page.mouse.up();
  await expect(page).toHaveURL(/from=/);
  await expect(page.getByText("Dashed line:", { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
