import { defineConfig } from "@playwright/test";
const cache = process.env.LOCALAPPDATA + "/ms-playwright";
const existing = process.env.USE_EXISTING_BROWSERS === "1";
export default defineConfig({
  workers: 1,
  testDir: "tests/browser",
  timeout: 45000,
  use: { baseURL: "http://127.0.0.1:5178", trace: "retain-on-failure" },
  reporter: [["list"]],
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        ...(existing
          ? {
              launchOptions: {
                executablePath:
                  cache + "/chromium-1243/chrome-win64/chrome.exe",
              },
            }
          : {}),
      },
    },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        ...(existing
          ? {
              launchOptions: {
                executablePath: cache + "/firefox-1543/firefox/firefox.exe",
              },
            }
          : {}),
      },
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        ...(existing
          ? {
              launchOptions: {
                executablePath: cache + "/webkit-2359/Playwright.exe",
              },
            }
          : {}),
      },
    },
  ],
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --config apps/web/vite.config.ts",
    url: "http://127.0.0.1:5178/runner-test.html",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
