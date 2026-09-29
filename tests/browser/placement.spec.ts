import argon2 from "argon2";
import { passwordOptions } from "../../apps/api/src/auth";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db } from "../../apps/api/src/db";
import { importPackage, publish } from "../../apps/api/src/content";
import { packageSchema } from "../../packages/contracts/src/content";
test.skip(
  !process.env.TEST_DATABASE_URL,
  "Dedicated PostgreSQL database required.",
);
test("coding placement uses the isolated runner and editing invalidates a previous pass", async ({
  page,
}) => {
  test.setTimeout(180000);
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL)
    throw new Error("Use the disposable database.");
  const email = randomUUID() + "@example.test",
    password = "Synthetic-placement-password-739!";
  const user = await db.user.create({
    data: {
      normalizedEmail: email,
      passwordHash: await argon2.hash(password, passwordOptions),
    },
  });
  const pkg = packageSchema.parse(
    JSON.parse(await readFile("curriculum/snapshot.json", "utf8")),
  );
  await db.$transaction(
    async (tx) => {
      const r = await importPackage(tx, user.id, pkg);
      await publish(tx, user.id, r.id, r.checksum);
    },
    { timeout: 120000 },
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little progress, every day." }),
  ).toBeVisible({ timeout: 20000 });
  await page.goto("/placement/v1-ch02");
  const assessment = pkg.items.find((i) => i.id === "v1-ch02-placement");
  if (assessment?.kind !== "assessment") throw new Error("Assessment missing");
  const coding = assessment.items.find(
    (i) => i.grading.kind === "function-cases",
  )!;
  await page
    .getByLabel("javascript assessment code")
    .fill(coding.solution.code!);
  await page.getByRole("button", { name: "Run assessment code" }).click();
  await expect(page.getByText(/7\/7 cases passed/)).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByLabel("javascript assessment code")
    .fill("function requestedSeats(){return null;}");
  await expect(page.getByText(/7\/7 cases passed/)).toHaveCount(0);
  for (const item of assessment.items) {
    if (item.grading.kind !== "choice") continue;
    const option = item.grading.options.find(
      (o) =>
        item.grading.kind === "choice" &&
        item.grading.correctIds.includes(o.id),
    );
    if (!option) throw new Error("Choice missing");
    await page.getByLabel(option.text, { exact: true }).check();
  }
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(
    page.getByText("4/5 · Chapter placed out", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  const attempt = await db.placementAttempt.findFirstOrThrow({
    where: { userId: user.id },
  });
  expect(attempt.itemResults).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: coding.id,
        passed: false,
        gradingOrigin: "browser_automated",
      }),
    ]),
  );
});
