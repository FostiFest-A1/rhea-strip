import { expect, test, type Page } from "@playwright/test";

const runningAnimations = (page: Page, selector: string): Promise<string[]> =>
  page.evaluate((target) => {
    const root = document.querySelector(target);
    const animations = root ? root.getAnimations({ subtree: true }) : [];
    return animations
      .filter((animation) => animation.playState === "running")
      .map((animation) => (animation instanceof CSSAnimation ? animation.animationName : animation.constructor.name));
  }, selector);

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the landing hero runs no animation and its dot canvas is static", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1200);
    const running = await runningAnimations(page, "#top");
    expect(running, `running animations in the hero: ${running.join(", ")}`).toEqual([]);
    const media = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(media).toBe(true);
    const frames = await page.evaluate(async () => {
      const canvas = document.querySelector<HTMLCanvasElement>("#top canvas");
      if (!canvas) return null;
      const first = canvas.toDataURL();
      await new Promise((resolve) => setTimeout(resolve, 700));
      return { same: first === canvas.toDataURL() };
    });
    if (frames !== null) expect(frames.same, "hero canvas changed between frames").toBe(true);
    await page.screenshot({ path: "artifacts/reduced-motion-hero.png" });
  });

  test("the whole landing page runs no CSS animation", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    const running = await runningAnimations(page, "body");
    expect(running, `running animations on the page: ${running.join(", ")}`).toEqual([]);
  });

  for (const path of ["/strip", "/trade", "/portfolio", "/settle"]) {
    test(`${path} runs no looping animation`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1200);
      const running = await runningAnimations(page, "body");
      expect(running, `running animations on ${path}: ${running.join(", ")}`).toEqual([]);
    });
  }
});

test.describe("default motion", () => {
  test("the landing hero does animate, so the reduced-motion check is meaningful", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const running = await runningAnimations(page, "body");
    expect(running.length).toBeGreaterThan(0);
  });
});
