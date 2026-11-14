import { defineConfig } from "@playwright/test";
import { baseUrl, externalBaseUrl, port } from "./support/env";

export default defineConfig({
  testDir: "./specs",
  outputDir: "./artifacts/test-results",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "./artifacts/html-report", open: "never" }]],
  use: {
    baseURL: baseUrl,
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chrome", use: { channel: "chrome" } }],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `pnpm --dir .. dev -p ${port}`,
        url: baseUrl,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
