import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { db, hash } from "../../apps/api/src/db";
import { importPackage, publish } from "../../apps/api/src/content";
import { packageSchema } from "../../packages/contracts/src/content";
test("records primary lesson content loading on simulated fast 4G", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Network emulation uses Chromium CDP.");
  test.skip(
    !process.env.TEST_DATABASE_URL,
    "Requires disposable PostgreSQL and local API.",
  );
  test.setTimeout(180000);
  if (
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL!).pathname.includes("_test")
  )
    throw new Error("Use the disposable test database.");
  const owner = await db.user.create({
    data: {
      normalizedEmail: "mobile-profile-" + randomUUID() + "@example.test",
      passwordHash: "synthetic-session-fixture-only",
    },
  });
  const pkg = packageSchema.parse(
    JSON.parse(await readFile("curriculum/fixtures/chapter-01.json", "utf8")),
  );
  await db.$transaction(
    async (tx) => {
      const r = await importPackage(tx, owner.id, pkg);
      await publish(tx, owner.id, r.id, r.checksum);
    },
    { timeout: 120000 },
  );
  const token = randomUUID();
  await db.session.create({
    data: {
      userId: owner.id,
      tokenHash: hash(token),
      csrfSecret: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  await page
    .context()
    .addCookies([
      {
        name: "devpractice",
        value: token,
        url: "http://127.0.0.1:5178",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  await page.setViewportSize({ width: 360, height: 780 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 4_000_000 / 8,
    uploadThroughput: 1_000_000 / 8,
    connectionType: "cellular4g",
  });
  const started = performance.now();
  await page.goto("/learn/lessons/v1-l01");
  await expect(
    page.getByRole("heading", { name: "Follow a browser request" }),
  ).toBeVisible({ timeout: 30000 });
  const visibleMs = Math.round(performance.now() - started);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/mobile-lesson-verification.png",
    fullPage: true,
  });
  await writeFile(
    "docs/mobile-performance-verification.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        browser: "Chromium",
        viewport: { width: 360, height: 780 },
        route: "/learn/lessons/v1-l01",
        network: {
          latencyMs: 150,
          downloadMbps: 4,
          uploadMbps: 1,
          cache: "disabled",
          cpuThrottle: "none",
        },
        visiblePrimaryContentMs: visibleMs,
        targetMs: 3000,
        withinTarget: visibleMs < 3000,
        limitations: [
          "One cold-page measurement against a local API on a shared Windows host; network throttling is simulated.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  await cdp.detach();
});
