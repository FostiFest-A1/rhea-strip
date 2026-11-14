import { expect, test } from "@playwright/test";
import { horizontalOverflow, routes, viewports } from "../support/app";

for (const width of viewports) {
  test.describe(`viewport ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const route of routes) {
      test(`${route.path} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const overflow = await horizontalOverflow(page);
        expect(overflow.scrollWidth, `scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}; offenders: ${overflow.offenders.join(" | ")}`).toBeLessThanOrEqual(overflow.clientWidth);
        expect(overflow.offenders, `unclipped elements wider than the viewport: ${overflow.offenders.join(" | ")}`).toEqual([]);
        await page.screenshot({
          path: `artifacts/viewport-${width}-${route.path === "/" ? "landing" : route.path.slice(1)}.png`,
          fullPage: false,
          caret: "initial",
        });
      });
    }
  });
}

test.describe("mobile navigation at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu button opens the link list and a link navigates", async ({ page }) => {
    await page.goto("/strip");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await page.locator("#mobile-menu").getByRole("link", { name: "Trade" }).click();
    await expect(page).toHaveURL(/\/trade$/);
  });
});
