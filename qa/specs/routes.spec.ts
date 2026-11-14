import { expect, test } from "@playwright/test";
import { routes, watchConsole } from "../support/app";

for (const route of routes) {
  test(`route ${route.path} responds 200 with a heading and no console errors`, async ({ page }) => {
    const consoleWatch = watchConsole(page);
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(route.heading);
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `artifacts/route-${route.path === "/" ? "landing" : route.path.slice(1)}.png`, fullPage: true, caret: "initial" });
    expect(consoleWatch.errors, `console errors on ${route.path}`).toEqual([]);
  });
}

test("landing positioning copy makes no first-or-only claim and states what is mocked", async ({ page }) => {
  await page.goto("/");
  const text = (await page.locator("body").innerText()).toLowerCase();
  expect(text).not.toMatch(/\bthe first\b/);
  expect(text).not.toMatch(/\bthe only\b/);
  expect(text).not.toMatch(/\bfirst (pt|yield|protocol)/);
  expect(text).toContain("mock");
  expect(text).toContain("demo clock");
  expect(text).toMatch(/not (been )?audited/);
});

test("landing lists the series card, the asset cards and the FAQ", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pick an asset to strip." })).toBeVisible();
  for (const symbol of ["mstNEAR", "LiNEAR", "RHEA LP", "USDY", "BUIDL"]) {
    await expect(page.getByRole("heading", { name: symbol, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /PT-mstNEAR-/ })).toBeVisible();
  const faq = page.locator("#faq").getByRole("button").first();
  await expect(faq).toHaveAttribute("aria-expanded", "false");
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");
});

test("unknown route returns the 404 page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
});
