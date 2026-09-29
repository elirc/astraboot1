import { test, expect as baseExpect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import argon2 from "argon2";
import { db } from "../../apps/api/src/db";
import { passwordOptions } from "../../apps/api/src/auth";
import { importPackage, publish } from "../../apps/api/src/content";
import { packageSchema } from "../../packages/contracts/src/content";
const expect = baseExpect.configure({ timeout: 20000 });
test.skip(
  !process.env.TEST_DATABASE_URL,
  "Requires disposable PostgreSQL and API on port 4310.",
);
test("A02/A12 complete a lesson and see its persisted note from a second browser context", async ({
  browser,
}) => {
  test.setTimeout(180000);
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL)
    throw new Error("Use only the disposable test database.");
  const email = "browser-" + randomUUID() + "@example.test",
    password = "Synthetic-browser-password-84!";
  const user = await db.user.create({
    data: {
      normalizedEmail: email,
      passwordHash: await argon2.hash(password, passwordOptions),
    },
  });
  const pkg = packageSchema.parse(
    JSON.parse(await readFile("curriculum/fixtures/chapter-01.json", "utf8")),
  );
  await db.$transaction(
    async (tx) => {
      const release = await importPackage(tx, user.id, pkg);
      await publish(tx, user.id, release.id, release.checksum);
    },
    { timeout: 60000 },
  );
  const phone = await browser.newContext({
    viewport: { width: 360, height: 780 },
  });
  const laptop = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const mobile = await phone.newPage(),
    desktop = await laptop.newPage();
  async function signIn(page: typeof mobile) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "A little progress, every day." }),
    ).toBeVisible();
  }
  await signIn(mobile);
  await mobile.goto("/learn/lessons/v1-l01");
  await expect(
    mobile.getByRole("heading", { name: "Follow a browser request" }),
  ).toBeVisible();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mobile.getByRole("button", { name: "Practice", exact: true }).click();
  await mobile
    .getByLabel("Capture a thought")
    .fill("A hidden button does not enforce ownership.");
  await mobile.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(mobile.getByText("Note saved.", { exact: true })).toBeVisible();
  for (const [id, choice] of [
    [
      "v1-l01-e1",
      "Browser → API route → access check and data read → response → render",
    ],
    ["v1-l01-e2", '{"title":"Printer offline"}'],
  ]) {
    await mobile.goto("/practice/" + id);
    if (id === "v1-l01-e1") {
      await mobile.getByRole("button", { name: "Reveal next hint" }).click();
      await expect(mobile.getByText("Hint 1", { exact: true })).toBeVisible();
    }
    await mobile.getByLabel(choice!).check();
    await mobile.getByRole("button", { name: "Check response" }).click();
    await expect(mobile.getByText(/✓ Passed/)).toBeVisible();
  }
  await mobile.goto("/practice/v1-l01-e3");
  await mobile
    .getByLabel("Explain your reasoning")
    .fill(
      "The server checks authenticated ownership, since another client can bypass a hidden button.",
    );
  await mobile.getByLabel("My response meets these criteria.").check();
  await mobile.getByRole("button", { name: "Check response" }).click();
  await expect(mobile.getByText(/✓ Passed/)).toBeVisible();
  await mobile.goto("/learn/lessons/v1-l01");
  await mobile
    .getByLabel("I’ve read the explanation and worked example.")
    .check();
  const [completion] = await Promise.all([
    mobile.waitForResponse((r) => r.url().endsWith("/lessons/v1-l01/complete")),
    mobile
      .getByRole("button", { name: "Complete lesson", exact: true })
      .click(),
  ]);
  expect(completion.status()).toBe(200);
  await signIn(desktop);
  await desktop.goto("/notes");
  await expect(
    desktop.getByText("A hidden button does not enforce ownership."),
  ).toBeVisible();
  await desktop.goto("/progress");
  await expect(desktop.getByText("50 XP", { exact: true })).toBeVisible();
  await mobile.goto("/review");
  await expect(mobile.getByLabel("Your recall")).toBeVisible();
  await mobile
    .getByLabel("Your recall")
    .fill("The server enforces ownership before returning the ticket.");
  await mobile
    .getByRole("button", { name: "Reveal answer", exact: true })
    .click();
  await expect(
    mobile.getByRole("button", { name: "Good", exact: true }),
  ).toBeEnabled();
  await mobile.getByRole("button", { name: "Good", exact: true }).click();
  await expect(mobile.getByText(/1 reviewed this session/)).toBeVisible();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await phone.close();
  await laptop.close();
});
