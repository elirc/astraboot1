import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { passwordOptions } from "../../apps/api/src/auth";
import { importPackage, publish } from "../../apps/api/src/content";
import { db } from "../../apps/api/src/db";
import { packageSchema } from "../../packages/contracts/src/content";

test.skip(
  !process.env.TEST_DATABASE_URL,
  "Dedicated PostgreSQL database required.",
);

test("unsaved notes recover without duplicate creates or lost newer typing", async ({
  page,
}) => {
  test.setTimeout(120000);
  if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL)
    throw new Error("Use the disposable database.");

  const email = randomUUID() + "@example.test";
  const password = "Synthetic-recovery-password-739!";
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
    { timeout: 120000 },
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/notes");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);

  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Title").fill("Recovered note");
  await page
    .getByLabel("Note", { exact: true })
    .fill("Body kept across reload");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.keys(localStorage).some(
          (key) =>
            key.includes(":note:new") &&
            localStorage.getItem(key)?.includes("Body kept across reload"),
        ),
      ),
    )
    .toBe(true);

  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue(
    "Body kept across reload",
  );

  const createEventIds: string[] = [];
  let loseFirstResponse = true;
  await page.route("**/api/v1/notes", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const body = route.request().postDataJSON() as { clientEventId: string };
    createEventIds.push(body.clientEventId);
    if (!loseFirstResponse) return route.continue();
    loseFirstResponse = false;
    await route.fetch();
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByLabel("Title")).toBeEnabled();
  await expect(page.getByLabel("Note", { exact: true })).toHaveValue(
    "Body kept across reload",
  );
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByRole("heading", { name: "Edit note" })).toBeVisible();
  expect(createEventIds).toHaveLength(2);
  expect(createEventIds[1]).toBe(createEventIds[0]);
  expect(
    await db.note.count({
      where: { userId: user.id, title: "Recovered note", deletedAt: null },
    }),
  ).toBe(1);
  await page.unroute("**/api/v1/notes");

  const lesson = pkg.items.find((item) => item.kind === "lesson");
  if (!lesson || lesson.kind !== "lesson") throw new Error("Lesson missing");
  await page.goto("/learn/lessons/" + lesson.id);
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  const quickNote = page.getByLabel("Capture a thought");
  await quickNote.fill("Submitted body");

  let releaseRequest!: () => void;
  let markRequestSeen!: () => void;
  const requestSeen = new Promise<void>((resolve) => {
    markRequestSeen = resolve;
  });
  const requestReleased = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/v1/notes", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    markRequestSeen();
    await requestReleased;
    await route.continue();
  });
  await page.getByRole("button", { name: "Save note" }).click();
  await requestSeen;
  await quickNote.fill("Newer body typed while saving");
  releaseRequest();
  await expect
    .poll(() =>
      db.note.count({
        where: {
          userId: user.id,
          contentItemId: lesson.id,
          body: "Submitted body",
          deletedAt: null,
        },
      }),
    )
    .toBe(1);
  await expect(quickNote).toHaveValue("Newer body typed while saving");
  await page.unroute("**/api/v1/notes");

  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page.getByLabel("Capture a thought")).toHaveValue(
    "Newer body typed while saving",
  );
  const recoveryKeys = await page.evaluate(() => Object.keys(localStorage));
  expect(
    recoveryKeys.some((key) => key.startsWith("devpractice:" + user.id + ":")),
  ).toBe(true);

  const chapter = pkg.items.find(
    (item) => item.kind === "chapter" && item.lessonIds.includes(lesson.id),
  );
  if (!chapter || chapter.kind !== "chapter" || chapter.lessonIds.length < 2)
    throw new Error("Adjacent lesson missing");
  const nextLessonId = chapter.lessonIds[1];
  await page.getByLabel("Capture a thought").fill("Same text across lessons");

  let releaseNavigationSave!: () => void;
  let markNavigationSaveSeen!: () => void;
  const navigationSaveSeen = new Promise<void>((resolve) => {
    markNavigationSaveSeen = resolve;
  });
  const navigationSaveReleased = new Promise<void>((resolve) => {
    releaseNavigationSave = resolve;
  });
  await page.route("**/api/v1/notes", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    markNavigationSaveSeen();
    await navigationSaveReleased;
    await route.continue();
  });
  await page.getByRole("button", { name: "Save note" }).click();
  await navigationSaveSeen;
  await page.getByRole("button", { name: "Instruction", exact: true }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("link", { name: /Next lesson/ }).click();
  await expect(page).toHaveURL(
    new RegExp("/learn/lessons/" + nextLessonId + "$"),
  );
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByLabel("Capture a thought").fill("Same text across lessons");
  releaseNavigationSave();
  await expect
    .poll(() =>
      db.note.count({
        where: {
          userId: user.id,
          contentItemId: lesson.id,
          body: "Same text across lessons",
          deletedAt: null,
        },
      }),
    )
    .toBe(1);
  await expect(page.getByLabel("Capture a thought")).toHaveValue(
    "Same text across lessons",
  );
  await expect
    .poll(() =>
      page.evaluate(
        ({ nextLessonId, expected }) =>
          Object.entries(localStorage).some(
            ([key, value]) =>
              key.endsWith(":lesson-note:" + nextLessonId) &&
              value.includes(expected),
          ),
        { nextLessonId, expected: "Same text across lessons" },
      ),
    )
    .toBe(true);
});
