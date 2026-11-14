import { expect, test } from "@playwright/test";
import { externalBaseUrl } from "../support/env";
import { clearToasts, expectToast, goTo, openDemoClock, closeDemoClock } from "../support/app";

test.skip(externalBaseUrl !== undefined, "fake chain only");

test("[F-001] YT accrual on the portfolio ticks as the demo clock advances, without any other action", async ({ page }) => {
  await page.goto("/strip");
  await clearToasts(page);
  await page.getByRole("button", { name: "Get test mstNEAR" }).click();
  await expectToast(page, "100 test mstNEAR received");
  await page.getByLabel("Amount to strip").fill("10");
  await clearToasts(page);
  await page.getByRole("button", { name: "Strip mstNEAR" }).click();
  await expectToast(page, "Stripped into PT and YT");
  await goTo(page, "Portfolio");
  const accrued = page.getByText("YT yield accrued").locator("xpath=following-sibling::p[1]");
  await expect(accrued).toBeVisible();
  const before = Number.parseFloat((await accrued.innerText()).replace("mstNEAR", ""));
  await openDemoClock(page);
  await page.getByRole("button", { name: "+5 minutes" }).click();
  await closeDemoClock(page);
  await page.waitForTimeout(6000);
  const after = Number.parseFloat((await accrued.innerText()).replace("mstNEAR", ""));
  expect(after, `accrued before ${before}, after +5 minutes ${after}`).toBeGreaterThan(before);
});
