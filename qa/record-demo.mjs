// Records the demo scenes of the Rhea Strip video against the running app in testnet mode.
// Usage: node qa/record-demo.mjs [--base http://localhost:3000] [c01 c02 ...]
// Each scene is its own recording context, written to video/clips/<scene>.webm.
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const CLIPS = join(root, "video", "clips");
const TMP = join(root, "video", "clips", ".tmp");
mkdirSync(TMP, { recursive: true });

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : "http://localhost:3000";
const wanted = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--base");

const VIEWPORT = { width: 1600, height: 900 };
const ALICE = "rhea-strip-alice.testnet";
const BOB = "rhea-strip-bob.testnet";
const TX_TIMEOUT = 150_000;

const INIT = (account) => `
(() => {
  try { ${account ? `localStorage.setItem('rhea.demoAccount', ${JSON.stringify(account)});` : `localStorage.removeItem('rhea.demoAccount');`} } catch {}
  const add = () => {
    if (document.getElementById('__cur')) return;
    const style = document.createElement('style');
    style.textContent = 'nextjs-portal{display:none!important}*{caret-color:#fe3d70}';
    document.head.appendChild(style);
    const d = document.createElement('div');
    d.id = '__cur';
    d.style.cssText = 'position:fixed;z-index:2147483647;width:24px;height:24px;border-radius:50%;background:rgba(254,61,112,.8);border:2px solid #fff;box-shadow:0 0 20px rgba(254,61,112,.75);pointer-events:none;left:-60px;top:-60px;transform:translate(-50%,-50%);transition:transform .12s ease';
    document.documentElement.appendChild(d);
    addEventListener('mousemove', e => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; }, true);
    addEventListener('mousedown', () => { d.style.transform = 'translate(-50%,-50%) scale(.65)'; }, true);
    addEventListener('mouseup', () => { d.style.transform = 'translate(-50%,-50%) scale(1)'; }, true);
  };
  if (document.head) add(); else addEventListener('DOMContentLoaded', add);
})();`;

const wait = (page, ms) => page.waitForTimeout(ms);

async function glide(page, locator, steps = 28) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("no bounding box for glide");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps });
}

async function press(page, locator) {
  await glide(page, locator);
  await wait(page, 300);
  await page.mouse.down();
  await wait(page, 90);
  await page.mouse.up();
}

async function typeInto(page, locator, text) {
  await press(page, locator);
  await page.keyboard.type(text, { delay: 260 });
}

const nav = (page) => page.getByRole("navigation", { name: "Primary" });

async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
  await page.mouse.move(VIEWPORT.width * 0.62, VIEWPORT.height * 0.55);
}

async function switchTo(page, label) {
  await press(page, nav(page).getByRole("button", { name: "Switch account" }));
  await page.locator("dialog[open]").waitFor();
  await wait(page, 700);
  await press(page, page.locator("dialog[open]").getByRole("button", { name: new RegExp(label) }));
  await page.locator("dialog[open]").waitFor({ state: "hidden" });
  await wait(page, 1200);
}

function maturityMs() {
  return JSON.parse(readFileSync(join(root, "deployments", "testnet.json"), "utf8")).maturityMs;
}

const scenes = {
  async c01(page, mark) {
    await open(page, "/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await wait(page, 3000);
    for (let i = 0; i < 5; i += 1) {
      await page.mouse.wheel(0, 16);
      await wait(page, 1700);
    }
  },
  async c02(page, mark) {
    await open(page, "/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await wait(page, 1500);
    await page.evaluate(() => document.querySelector("#markets")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    await page.getByText("Mock stNEAR, demo clock").first().waitFor();
    await wait(page, 9000);
  },
  async c03(page, mark) {
    await open(page, "/strip");
    await nav(page).getByRole("button", { name: /^Connect$/ }).waitFor();
    await wait(page, 1800);
    await press(page, nav(page).getByRole("button", { name: /^Connect$/ }));
    await page.locator("dialog[open]").waitFor();
    await wait(page, 2200);
    await press(page, page.locator("dialog[open]").getByRole("button", { name: /Alice/ }));
    await nav(page).getByRole("button", { name: "Switch account" }).waitFor();
    await page.getByText(/Balance [\d.,]+/).first().waitFor({ timeout: 30_000 });
    await wait(page, 3000);
  },
  async c04(page, mark) {
    await open(page, "/strip");
    await page.getByText(/Balance [\d.,]+/).first().waitFor({ timeout: 30_000 });
    await wait(page, 1500);
    await typeInto(page, page.getByLabel("Amount to strip"), "10");
    await page.getByText(/You receive PT and YT worth/).waitFor();
    await wait(page, 3500);
    await press(page, page.getByRole("button", { name: "Strip mstNEAR" }));
    mark("ws");
    await page.getByText("All steps confirmed.").waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 4500);
  },
  async c05(page, mark) {
    await open(page, "/trade");
    await page.getByRole("heading", { level: 2, name: /Sell\s+future\s+yield/i }).waitFor({ timeout: 30_000 });
    await wait(page, 1800);
    await typeInto(page, page.getByLabel("YT to sell"), "5");
    await wait(page, 1500);
    const slider = page.getByRole("slider", { name: /Implied APY you accept/ });
    await glide(page, slider);
    for (const v of ["10", "12", "14", "16", "18", "20", "16", "12", "8"]) {
      await slider.fill(v);
      await wait(page, 380);
    }
    await wait(page, 1200);
    await press(page, page.getByRole("button", { name: "List YT" }));
    mark("ws");
    await page.getByText("YT listed for sale").first().waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 4500);
  },
  async c06(page, mark) {
    await open(page, "/trade");
    const buttons = page.locator('button[aria-label^="Buy offer"]');
    await buttons.first().waitFor({ timeout: 30_000 });
    await wait(page, 2200);
    const labels = await buttons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
    const ids = labels.map((l) => Number(/Buy offer (\d+)/.exec(l)?.[1] ?? "-1"));
    const newest = Math.max(...ids);
    const target = page.locator(`button[aria-label^="Buy offer ${newest}"]`);
    await glide(page, target);
    await wait(page, 1600);
    await press(page, target);
    mark("ws");
    await page.getByText("Bought YT offer").first().waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 4500);
  },
  async c07(page, mark) {
    await open(page, "/portfolio");
    await page.getByText("Sale credit").first().waitFor({ timeout: 30_000 });
    await wait(page, 4500);
    await press(page, page.getByRole("button", { name: "Withdraw" }));
    mark("ws");
    await page.getByText("Sale proceeds withdrawn").first().waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 3500);
  },
  async c08(page, mark) {
    await open(page, "/settle");
    mark("ws");
    await page.getByText("Settled", { exact: true }).first().waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 3000);
    await press(page, page.getByRole("button", { name: "Redeem PT" }));
    mark("ws");
    await page.getByText("PT redeemed for mstNEAR").first().waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 1500);
    await press(page, page.getByRole("button", { name: "Claim YT" }));
    mark("ws");
    await page.getByRole("heading", { name: "All settled" }).waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 3000);
    await switchTo(page, "Bob");
    const claim = page.getByRole("button", { name: "Claim YT" });
    await claim.waitFor({ timeout: 60_000 });
    await wait(page, 2000);
    await press(page, claim);
    mark("ws");
    await page.getByRole("heading", { name: "All settled" }).waitFor({ timeout: TX_TIMEOUT });
    mark("we");
    await wait(page, 4000);
  },
  async c09(page, mark) {
    await open(page, "/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await wait(page, 9000);
  },
};

const ACCOUNT = { c01: null, c02: null, c03: null, c04: ALICE, c05: ALICE, c06: BOB, c07: ALICE, c08: ALICE, c09: null };

async function record(browser, name) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: TMP, size: VIEWPORT },
    reducedMotion: "no-preference",
  });
  await context.addInitScript(INIT(ACCOUNT[name]));
  const page = await context.newPage();
  const started = Date.now();
  const marks = [];
  const mark = (label) => marks.push({ label, t: (Date.now() - started) / 1000 });
  let failure = null;
  try {
    await scenes[name](page, mark);
  } catch (error) {
    failure = error;
    await page.screenshot({ path: join(TMP, `${name}-failure.png`) }).catch(() => {});
  }
  const video = page.video();
  await context.close();
  const path = await video.path();
  if (failure) {
    console.error(`${name} FAILED after ${((Date.now() - started) / 1000).toFixed(1)}s: ${failure.message.split("\n")[0]}`);
    rmSync(path, { force: true });
    throw failure;
  }
  const out = join(CLIPS, `${name}.webm`);
  renameSync(path, out);
  writeFileSync(join(CLIPS, `${name}.json`), JSON.stringify({ marks, total: (Date.now() - started) / 1000 }, null, 2));
  console.log(`${name} recorded in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${out}`);
}

async function warm(browser) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  await context.addInitScript(INIT(ALICE));
  const page = await context.newPage();
  for (const path of ["/", "/strip", "/trade", "/portfolio", "/settle"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
  }
  await context.close();
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  await warm(browser);
  const list = wanted.length > 0 ? wanted : Object.keys(scenes);
  for (const name of list) {
    if (!scenes[name]) throw new Error(`unknown scene ${name}`);
    if (name === "c08") {
      const wait_ms = maturityMs() + 25_000 - Date.now();
      if (wait_ms > 0) {
        console.log(`waiting ${(wait_ms / 1000).toFixed(0)}s for maturity before c08`);
        await new Promise((done) => setTimeout(done, wait_ms));
      }
    }
    await record(browser, name);
  }
} finally {
  await browser.close();
}
