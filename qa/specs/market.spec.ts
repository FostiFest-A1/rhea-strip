import { expect, test, type Page } from "@playwright/test";
import { externalBaseUrl } from "../support/env";
import { clearToasts, expectStat, expectToast, goTo, readStat, selectAccount, watchConsole } from "../support/app";

test.skip(externalBaseUrl !== undefined, "fake chain only");

async function faucetAndStrip(page: Page, amount: string): Promise<void> {
  await goTo(page, "Strip");
  await clearToasts(page);
  await page.getByRole("button", { name: "Get test mstNEAR" }).click();
  await expectToast(page, "100 test mstNEAR received");
  await page.getByLabel("Amount to strip").fill(amount);
  await clearToasts(page);
  await page.getByRole("button", { name: "Strip mstNEAR" }).click();
  await expectToast(page, "Stripped into PT and YT");
}

test("PT market: Alice lists PT at a fixed APY and Bob buys it", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  await page.goto("/strip");
  await faucetAndStrip(page, "20");

  await goTo(page, "Trade");
  await page.getByRole("tab", { name: "PT" }).click();
  await expect(page.getByRole("heading", { name: "Sell PT for a fixed price" })).toBeVisible();
  await page.getByLabel("PT to sell").fill("10");
  await expect(page.getByText("Buyer fixed return")).toBeVisible();
  await clearToasts(page);
  await page.getByRole("button", { name: "List PT" }).click();
  await expectToast(page, "PT listed for sale");
  const mine = page.locator("li").filter({ hasText: "You" }).filter({ has: page.getByRole("button", { name: "Cancel" }) });
  await expect(mine).toContainText("10 PT");

  await selectAccount(page, "bob.testnet");
  await goTo(page, "Strip");
  await clearToasts(page);
  await page.getByRole("button", { name: "Get test mstNEAR" }).click();
  await expectToast(page, "100 test mstNEAR received");
  await goTo(page, "Trade");
  await page.getByRole("tab", { name: "PT" }).click();
  const offer = page.locator("li").filter({ hasText: "alice.testnet" }).filter({ has: page.getByRole("button", { name: /^Buy offer/ }) });
  await expect(offer).toHaveCount(1);
  await clearToasts(page);
  await offer.getByRole("button", { name: /^Buy offer/ }).click();
  await expectToast(page, "Bought PT offer");
  await goTo(page, "Portfolio");
  await expectStat(page, /^PT-mstNEAR-/, 10);

  await selectAccount(page, "alice.testnet");
  await expect.poll(() => readStat(page, /^Sale credit$/)).toBeGreaterThan(0);
  expect(consoleWatch.errors).toEqual([]);
});

test("offer book: a seller can cancel an offer and the YT unlocks", async ({ page }) => {
  await page.goto("/strip");
  await faucetAndStrip(page, "10");
  await goTo(page, "Trade");
  await page.getByLabel("YT to sell").fill("4");
  await clearToasts(page);
  await page.getByRole("button", { name: "List YT" }).click();
  await expectToast(page, "YT listed for sale");
  await goTo(page, "Portfolio");
  await expect(page.getByText(/4 listed for sale/)).toBeVisible();
  await goTo(page, "Trade");
  const mine = page.locator("li").filter({ hasText: "You" }).filter({ has: page.getByRole("button", { name: "Cancel" }) });
  await clearToasts(page);
  await mine.getByRole("button", { name: "Cancel" }).click();
  await expectToast(page, "Offer cancelled");
  await expect(mine).toHaveCount(0);
  await goTo(page, "Portfolio");
  await expect(page.getByText(/0 listed for sale/)).toBeVisible();
});

test("quick fill buys the best seeded maker offer", async ({ page }) => {
  await page.goto("/strip");
  await selectAccount(page, "bob.testnet");
  await clearToasts(page);
  await page.getByRole("button", { name: "Get test mstNEAR" }).click();
  await expectToast(page, "100 test mstNEAR received");
  await goTo(page, "Trade");
  await expect(page.getByRole("heading", { name: "Open YT offers" })).toBeVisible();
  await clearToasts(page);
  await page.getByRole("button", { name: "Quick fill best offer" }).click();
  await expectToast(page, "Bought YT offer");
  await goTo(page, "Portfolio");
  await expect.poll(() => readStat(page, /^YT-mstNEAR-/)).toBeGreaterThan(0);
});

test("strip form validates the amount before any transaction", async ({ page }) => {
  await page.goto("/strip");
  await page.getByRole("button", { name: "Get test mstNEAR" }).click();
  await expect(page.getByText(/Balance 100$/)).toBeVisible();
  const field = page.getByLabel("Amount to strip");
  const strip = page.getByRole("button", { name: "Strip mstNEAR" });

  await field.fill("abc");
  await expect(page.getByRole("alert").filter({ hasText: "Enter a valid number." })).toBeVisible();
  await expect(strip).toBeDisabled();

  await field.fill("1000");
  await expect(page.getByRole("alert").filter({ hasText: "more than your mstNEAR balance" })).toBeVisible();
  await expect(strip).toBeDisabled();

  await field.fill("0.001");
  await expect(page.getByRole("alert").filter({ hasText: /The minimum is/ })).toBeVisible();
  await expect(strip).toBeDisabled();

  await page.getByRole("button", { name: "Max" }).click();
  await expect(field).toHaveValue("100");
  await expect(strip).toBeEnabled();
});

test("settle before maturity shows the countdown and no payout actions are enabled", async ({ page }) => {
  await page.goto("/settle");
  await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Redeem PT" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Claim YT" })).toBeDisabled();
});
