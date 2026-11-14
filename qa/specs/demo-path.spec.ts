import { expect, test } from "@playwright/test";
import { externalBaseUrl } from "../support/env";
import {
  clearToasts,
  expectStat,
  expectToast,
  goTo,
  closeDemoClock,
  openDemoClock,
  parseNumber,
  readStat,
  selectAccount,
  statValue,
  watchConsole,
} from "../support/app";

test.describe.configure({ mode: "serial" });

test.skip(externalBaseUrl !== undefined, "the demo path runs against the in-memory fake chain started by pnpm dev");

const shot = (name: string) => `artifacts/demo-${name}.png`;

test("demo path: faucet, strip, sell future yield, buy, withdraw, mature, settle, redeem, claim @fake-only", async ({ page }) => {
  const consoleWatch = watchConsole(page);
  const figures: Record<string, number> = {};

  await test.step("1. landing shows the pitch, the mock label and the series card", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Split yield from principal");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Trade");
    await expect(page.getByText("Mock stNEAR, demo clock").first()).toBeVisible();
    await expect(page.getByText("Mainnet stNEAR price").first()).toBeVisible();
    await expect(page.getByText(/Maturity in/).first()).toBeVisible();
    await page.screenshot({ path: shot("1-landing") });
    await page.locator("#top").getByRole("link", { name: "Launch app" }).click();
    await expect(page).toHaveURL(/\/strip$/);
  });

  await test.step("2. strip: Alice gets 100 test mstNEAR and strips 10 into PT and YT", async () => {
    await expect(page.getByLabel("Acting as")).toHaveValue("alice.testnet");
    await expect(page.getByText("Mock stNEAR, demo clock").first()).toBeVisible();
    await expect(page.getByText(/Balance 0$/)).toBeVisible();

    await clearToasts(page);
    await page.getByRole("button", { name: "Get test mstNEAR" }).click();
    await expectToast(page, "100 test mstNEAR received");
    await expect(page.getByText(/Balance 100$/)).toBeVisible();

    await page.getByLabel("Amount to strip").fill("10");
    await expect(page.getByText(/You receive PT and YT worth/)).toBeVisible();
    const previewText = await page.getByText(/You receive PT and YT worth/).innerText();
    const previewMatch = /worth ([\d.,]+) NEAR each/.exec(previewText);
    expect(previewMatch).not.toBeNull();
    figures.stripped = parseNumber(previewMatch?.[1] ?? "");
    expect(figures.stripped).toBeGreaterThan(10);
    await page.screenshot({ path: shot("2a-strip-preview") });

    await clearToasts(page);
    await page.getByRole("button", { name: "Strip mstNEAR" }).click();
    await expectToast(page, "Stripped into PT and YT");
    const received = page.getByRole("heading", { name: "You received" }).locator("xpath=..");
    await expect(received).toContainText(/[\d.]+ PT/);
    await expect(received).toContainText(/[\d.]+ YT/);
    const receivedPt = /([\d.,]+) PT/.exec(await received.innerText());
    figures.receivedCard = parseNumber(receivedPt?.[1] ?? "");
    await expect(page.getByText("All steps confirmed.")).toBeVisible();
    await expect(page.getByText(/Balance 90$/)).toBeVisible();
    await page.screenshot({ path: shot("2b-strip-success") });
  });

  await test.step("3. trade: Alice sells 5 YT; the APY slider moves the upfront preview", async () => {
    await goTo(page, "Trade");
    await expect(page.getByRole("heading", { level: 2, name: /Sell\s+future\s+yield/i })).toBeVisible();
    await page.getByLabel("YT to sell").fill("5");

    const receive = page.locator("dt", { hasText: "You receive now" }).locator("xpath=following-sibling::dd[1]");
    await expect(receive).toContainText("mstNEAR");
    const before = parseNumber((await receive.innerText()).replace("mstNEAR", ""));
    await page.getByRole("slider", { name: /Implied APY you accept/ }).fill("20");
    await expect
      .poll(async () => parseNumber((await receive.innerText()).replace("mstNEAR", "")), { message: "the preview follows the APY slider" })
      .not.toBe(before);
    await page.getByRole("slider", { name: /Implied APY you accept/ }).fill("8");
    await expect
      .poll(async () => parseNumber((await receive.innerText()).replace("mstNEAR", "")))
      .toBeCloseTo(before, 3);
    figures.ask = parseNumber((await receive.innerText()).replace("mstNEAR", ""));
    expect(figures.ask).toBeGreaterThan(0);
    await page.screenshot({ path: shot("3a-sell-yield") });

    await clearToasts(page);
    await page.getByRole("button", { name: "List YT" }).click();
    await expectToast(page, "YT listed for sale");
    const mine = page.locator("li").filter({ hasText: "You" }).filter({ has: page.getByRole("button", { name: "Cancel" }) });
    await expect(mine).toHaveCount(1);
    await expect(mine).toContainText("5 YT");
    await page.screenshot({ path: shot("3b-offer-listed") });
  });

  await test.step("3b. the demo clock moves one minute so Alice has earned interest before the fill", async () => {
    await openDemoClock(page);
    await page.getByRole("button", { name: "+1 minute" }).click();
    await closeDemoClock(page);
    await goTo(page, "Portfolio");
    figures.actualPy = await readStat(page, /^YT-mstNEAR-/);
    expect(figures.actualPy).toBeCloseTo(figures.stripped ?? 0, 1);
    expect(await readStat(page, /^PT-mstNEAR-/)).toBe(figures.actualPy);
    const drift = Math.abs((figures.receivedCard ?? 0) - figures.actualPy);
    test.info().annotations.push({ type: "receipt-vs-balance", description: `receipt card ${figures.receivedCard}, portfolio ${figures.actualPy}, drift ${drift.toFixed(4)}` });
    await expect(page.getByText(/5 listed for sale/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your open offers" })).toBeVisible();
  });

  await test.step("4. Bob gets mstNEAR and buys Alice's offer", async () => {
    await selectAccount(page, "bob.testnet");
    await goTo(page, "Strip");
    await clearToasts(page);
    await page.getByRole("button", { name: "Get test mstNEAR" }).click();
    await expectToast(page, "100 test mstNEAR received");
    await goTo(page, "Trade");
    const aliceOffer = page.locator("li").filter({ hasText: "alice.testnet" }).filter({ has: page.getByRole("button", { name: /^Buy offer/ }) });
    await expect(aliceOffer).toHaveCount(1);
    await expect(aliceOffer).toContainText("5 YT");
    await page.screenshot({ path: shot("4a-bob-sees-offer") });
    await clearToasts(page);
    await aliceOffer.getByRole("button", { name: /^Buy offer/ }).click();
    await expectToast(page, "Bought YT offer");
    await expect(page.locator("li").filter({ hasText: "alice.testnet" })).toHaveCount(0);

    await goTo(page, "Portfolio");
    expect(await readStat(page, /^YT-mstNEAR-/)).toBeCloseTo(5, 3);
    const mst = await readStat(page, /^mstNEAR$/);
    expect(mst).toBeCloseTo(100 - (figures.ask ?? 0), 2);
    await page.screenshot({ path: shot("4b-bob-portfolio") });
  });

  await test.step("5. Alice withdraws her sale proceeds", async () => {
    await selectAccount(page, "alice.testnet");
    await expect(page.getByText("Sale credit")).toBeVisible();
    const credit = await readStat(page, /^Sale credit$/);
    expect(credit).toBeCloseTo(figures.ask ?? 0, 3);
    const mstBefore = await readStat(page, /^mstNEAR$/);
    expect(await readStat(page, /^YT-mstNEAR-/)).toBeCloseTo((figures.actualPy ?? 0) - 5, 3);
    expect(await readStat(page, /^PT-mstNEAR-/)).toBeCloseTo(figures.actualPy ?? 0, 3);
    const accruedText = await page.getByText("YT yield accrued").locator("xpath=following-sibling::p[1]").innerText();
    figures.aliceAccruedAtFill = parseNumber(accruedText.replace("mstNEAR", ""));
    expect(figures.aliceAccruedAtFill, "Alice keeps the interest earned before the fill").toBeGreaterThan(0);
    await clearToasts(page);
    await page.getByRole("button", { name: "Withdraw" }).click();
    await expectToast(page, "Sale proceeds withdrawn");
    await expect.poll(() => readStat(page, /^Sale credit$/)).toBe(0);
    const mstAfter = await readStat(page, /^mstNEAR$/);
    expect(mstAfter - mstBefore).toBeCloseTo(credit, 3);
    figures.aliceMstAfterWithdraw = mstAfter;
    await page.screenshot({ path: shot("5-alice-withdrew") });
  });

  await test.step("6. the demo clock jumps to maturity and settle runs by itself", async () => {
    await openDemoClock(page);
    await page.getByRole("button", { name: "Jump to maturity" }).click();
    await closeDemoClock(page);
    await goTo(page, "Settle");
    await expect(page.getByText("Series settled").first()).toBeVisible();
    await expect(page.getByText("Settled", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Redeem PT" })).toBeEnabled();
    await page.screenshot({ path: shot("6-settled") });
  });

  await test.step("7. Alice redeems PT and claims her YT yield", async () => {
    const mstBefore = figures.aliceMstAfterWithdraw ?? 0;
    const claimable = await readStat(page, /^YT yield to claim$/);
    expect(claimable).toBeGreaterThanOrEqual((figures.aliceAccruedAtFill ?? 0) - 1e-6);
    figures.aliceClaim = claimable;
    await clearToasts(page);
    await page.getByRole("button", { name: "Redeem PT" }).click();
    await expectToast(page, "PT redeemed for mstNEAR");
    await clearToasts(page);
    await page.getByRole("button", { name: "Claim YT" }).click();
    await expectToast(page, "YT yield claimed");
    await expect(page.getByRole("heading", { name: "All settled" })).toBeVisible();
    await goTo(page, "Portfolio");
    await expectStat(page, /^PT-mstNEAR-/, 0);
    await expectStat(page, /^YT-mstNEAR-/, 0);
    const mstEnd = await readStat(page, /^mstNEAR$/);
    expect(mstEnd).toBeGreaterThan(mstBefore);
    figures.aliceEnd = mstEnd;
    await page.screenshot({ path: shot("7-alice-final") });
  });

  await test.step("8. Bob claims the yield accrued since his fill", async () => {
    await selectAccount(page, "bob.testnet");
    await goTo(page, "Portfolio");
    const mstBefore = await readStat(page, /^mstNEAR$/);
    await goTo(page, "Settle");
    const claimable = await readStat(page, /^YT yield to claim$/);
    expect(claimable).toBeGreaterThan(0);
    expect(claimable).toBeLessThan(figures.aliceClaim ?? Number.POSITIVE_INFINITY);
    await clearToasts(page);
    await page.getByRole("button", { name: "Claim YT" }).click();
    await expectToast(page, "YT yield claimed");
    await goTo(page, "Portfolio");
    await expectStat(page, /^YT-mstNEAR-/, 0);
    const mstEnd = await readStat(page, /^mstNEAR$/);
    expect(mstEnd).toBeGreaterThan(mstBefore);
    figures.bobEnd = mstEnd;
    await page.screenshot({ path: shot("8-bob-final") });
  });

  await test.step("9. end state: Alice holds only mstNEAR, worth at least what she started with", async () => {
    await selectAccount(page, "alice.testnet");
    await expectStat(page, /^PT-mstNEAR-/, 0);
    await expectStat(page, /^YT-mstNEAR-/, 0);
    await expectStat(page, /^Sale credit$/, 0);
    const aliceEnd = await readStat(page, /^mstNEAR$/);
    expect(aliceEnd).toBeGreaterThan(99.9);
    await expect(statValue(page, /^mstNEAR$/)).toBeVisible();
  });

  test.info().annotations.push({ type: "figures", description: JSON.stringify(figures) });
  expect(consoleWatch.errors, "no console errors on the demo path").toEqual([]);
});
