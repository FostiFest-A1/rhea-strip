import { expect, test } from "@playwright/test";
import { externalBaseUrl } from "../support/env";
import { routes, watchConsole } from "../support/app";

test.skip(externalBaseUrl === undefined, "set RHEA_BASE_URL to run the checks against a deployed site");

test.describe("deployed site", () => {
  for (const route of routes) {
    test(`${route.path} loads over the network without console errors`, async ({ page }) => {
      const consoleWatch = watchConsole(page);
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(route.heading);
      await page.waitForLoadState("networkidle");
      expect(consoleWatch.errors).toEqual([]);
    });
  }

  test("landing states what is mocked and shows the live series", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Mock stNEAR, demo clock").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /PT-mstNEAR-/ })).toBeVisible();
    await expect(page.getByText("Mainnet stNEAR price").first()).toBeVisible();
    await expect(page.getByText(/Maturity in|Matured/).first()).toBeVisible();
  });

  test("the app asks for a wallet in testnet mode or offers the account switcher in fake mode", async ({ page }) => {
    await page.goto("/strip");
    const connect = page.getByRole("heading", { name: "Connect to get started" });
    const switcher = page.getByLabel("Acting as");
    await expect(connect.or(switcher)).toBeVisible();
  });
});
