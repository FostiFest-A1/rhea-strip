import { expect, test } from "@playwright/test";
import { routes } from "../support/app";

type A11yReport = {
  lang: string;
  mains: number;
  h1s: number;
  unnamed: string[];
  unlabelled: string[];
  imagesWithoutAlt: string[];
  duplicateIds: string[];
};

const audit = (): A11yReport => {
  const describe = (element: Element): string => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}[${(element.textContent ?? "").trim().slice(0, 30)}]`;
  const hasName = (element: Element): boolean => {
    if (element.getAttribute("aria-label")?.trim()) return true;
    if (element.getAttribute("aria-labelledby")) return true;
    if ((element.textContent ?? "").trim().length > 0) return true;
    if (element.querySelector("img[alt]:not([alt=''])")) return true;
    return false;
  };
  const unnamed = Array.from(document.querySelectorAll("button, a[href]")).filter((e) => !hasName(e)).map(describe);
  const unlabelled = Array.from(document.querySelectorAll("input, select, textarea"))
    .filter((e) => {
      const input = e as HTMLInputElement;
      if (input.type === "hidden") return false;
      if (e.getAttribute("aria-label") || e.getAttribute("aria-labelledby")) return false;
      return !(input.labels && input.labels.length > 0);
    })
    .map(describe);
  const imagesWithoutAlt = Array.from(document.querySelectorAll("img:not([alt])")).map(describe);
  const seen = new Map<string, number>();
  for (const element of document.querySelectorAll("[id]")) seen.set(element.id, (seen.get(element.id) ?? 0) + 1);
  const duplicateIds = Array.from(seen.entries()).filter(([, count]) => count > 1).map(([id]) => id);
  return {
    lang: document.documentElement.lang,
    mains: document.querySelectorAll("main").length,
    h1s: document.querySelectorAll("h1").length,
    unnamed,
    unlabelled,
    imagesWithoutAlt,
    duplicateIds,
  };
};

for (const route of routes) {
  test(`${route.path} basic accessibility audit`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    const report = await page.evaluate(audit);
    expect(report.lang).toBe("en");
    expect(report.mains).toBe(1);
    expect(report.h1s).toBe(1);
    expect(report.unnamed, `controls without an accessible name: ${report.unnamed.join(", ")}`).toEqual([]);
    expect(report.unlabelled, `form fields without a label: ${report.unlabelled.join(", ")}`).toEqual([]);
    expect(report.imagesWithoutAlt, `images without alt: ${report.imagesWithoutAlt.join(", ")}`).toEqual([]);
    expect(report.duplicateIds, `duplicate ids: ${report.duplicateIds.join(", ")}`).toEqual([]);
  });
}

test("keyboard: tab order reaches the primary navigation with a visible focus outline", async ({ page }) => {
  await page.goto("/strip");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
    return { tag: element.tagName, outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
  });
  expect(focused).not.toBeNull();
  expect(focused?.outline === "solid" || (focused?.shadow ?? "none") !== "none").toBe(true);
});

test("toasts and transaction results are exposed as status regions", async ({ page }) => {
  await page.goto("/strip");
  await expect(page.getByRole("status")).not.toHaveCount(0);
});
