import { expect, type Locator, type Page } from "@playwright/test";

export const routes = [
  { path: "/", heading: /Split yield from principal/i },
  { path: "/strip", heading: /Split mstNEAR into PT and YT/i },
  { path: "/trade", heading: /./ },
  { path: "/portfolio", heading: /./ },
  { path: "/settle", heading: /./ },
] as const;

export const viewports = [390, 810, 1200, 1440] as const;

export type ConsoleWatch = {
  errors: string[];
  warnings: string[];
};

export function watchConsole(page: Page): ConsoleWatch {
  const watch: ConsoleWatch = { errors: [], warnings: [] };
  page.on("console", (message) => {
    if (message.type() === "error") watch.errors.push(`${message.text()} @ ${message.location().url}`);
    if (message.type() === "warning") watch.warnings.push(message.text());
  });
  page.on("pageerror", (error) => {
    watch.errors.push(`pageerror: ${error.message}`);
  });
  return watch;
}

export function parseNumber(text: string): number {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned.startsWith("<")) return 0;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) throw new Error(`not a number: "${text}"`);
  return value;
}

export function statValue(page: Page, label: RegExp): Locator {
  return page
    .locator("p")
    .filter({ hasText: label })
    .locator("xpath=following-sibling::p[1]/span[1]")
    .first();
}

export async function readStat(page: Page, label: RegExp): Promise<number> {
  const locator = statValue(page, label);
  await expect(locator).toBeVisible();
  return parseNumber((await locator.innerText()).trim());
}

export async function selectAccount(page: Page, account: "alice.testnet" | "bob.testnet" | "maker.testnet"): Promise<void> {
  await page.getByLabel("Acting as").selectOption(account);
}

export async function goTo(page: Page, label: "Strip" | "Trade" | "Portfolio" | "Settle"): Promise<void> {
  const nav = page.getByRole("navigation", { name: "Primary" });
  await nav.getByRole("link", { name: label, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${label.toLowerCase()}$`));
}

export async function clearToasts(page: Page): Promise<void> {
  const dismiss = page.getByRole("button", { name: "Dismiss notification" });
  while ((await dismiss.count()) > 0) await dismiss.first().click();
}

export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
  await expect(page.getByRole("status").filter({ hasText: message }).first()).toBeVisible();
}

export async function expectStat(page: Page, label: RegExp, expected: number, digits = 3): Promise<void> {
  await expect.poll(() => readStat(page, label), { message: `${label} should become ${expected}` }).toBeCloseTo(expected, digits);
}

export async function openDemoClock(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: "Demo clock" });
  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
  await expect(page.locator("#dev-clock-panel")).toBeVisible();
}

export async function closeDemoClock(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: "Demo clock" });
  if ((await trigger.getAttribute("aria-expanded")) === "true") await trigger.click();
  await expect(page.locator("#dev-clock-panel")).toHaveCount(0);
}

export async function horizontalOverflow(page: Page): Promise<{ scrollWidth: number; clientWidth: number; offenders: string[] }> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const limit = doc.clientWidth;
    const offenders: string[] = [];
    const all = document.body.querySelectorAll<HTMLElement>("*");
    for (const element of all) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right > limit + 1 || rect.left < -1) {
        const style = getComputedStyle(element);
        if (style.position === "fixed") continue;
        let clipped = false;
        let parent: HTMLElement | null = element.parentElement;
        while (parent && parent !== document.body) {
          const overflowX = getComputedStyle(parent).overflowX;
          if (overflowX === "hidden" || overflowX === "clip" || overflowX === "auto" || overflowX === "scroll") {
            clipped = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (!clipped && offenders.length < 8) {
          const id = element.id ? `#${element.id}` : "";
          const cls = typeof element.className === "string" ? element.className.split(" ").slice(0, 3).join(".") : "";
          offenders.push(`${element.tagName.toLowerCase()}${id}.${cls} right=${Math.round(rect.right)}`);
        }
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: limit, offenders };
  });
}
