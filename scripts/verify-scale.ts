import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createApp } from "../apps/api/src/app";
import { db, hash, json } from "../apps/api/src/db";
import { packageSchema, type Item } from "../packages/contracts/src/content";
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
)
  throw new Error("Matching disposable test database required.");
const databaseVersion = (
  await db.$queryRaw<{ version: string }[]>`SELECT version()`
).at(0)?.version;
process.env.LOG_LEVEL = "warn";
const reusedOwner = process.argv.includes("--reuse")
  ? await db.user.findFirstOrThrow({
      where: { normalizedEmail: { startsWith: "scale-" } },
      orderBy: { createdAt: "desc" },
    })
  : null;
const prefix = reusedOwner
    ? reusedOwner.normalizedEmail.split("@")[0]!
    : "scale-" + randomUUID().slice(0, 8),
  pkg = packageSchema.parse(
    JSON.parse(await readFile("curriculum/fixtures/chapter-01.json", "utf8")),
  );
const chapter = pkg.items.find((i) => i.kind === "chapter")!,
  lesson = pkg.items.find((i) => i.kind === "lesson")!,
  exercise = pkg.items.find((i) => i.kind === "exercise")!;
if (
  chapter.kind !== "chapter" ||
  lesson.kind !== "lesson" ||
  exercise.kind !== "exercise"
)
  throw new Error("Fixtures missing.");
const templateTrack = pkg.items.find((i) => i.kind === "track")!,
  templateAssessment = pkg.items.find((i) => i.kind === "assessment")!,
  templateCard = pkg.items.find((i) => i.kind === "review_card")!;
if (
  templateTrack.kind !== "track" ||
  templateAssessment.kind !== "assessment" ||
  templateCard.kind !== "review_card"
)
  throw new Error("Scale templates missing.");
const items: Item[] = [];
const chapterId = (n: number) => prefix + "-ch" + String(n).padStart(3, "0"),
  lessonId = (n: number) => prefix + "-l" + String(n).padStart(4, "0"),
  exerciseId = (n: number) => prefix + "-e" + String(n).padStart(5, "0");
items.push({
  ...templateTrack,
  id: prefix + "-track",
  chapterIds: Array.from({ length: 334 }, (_, n) => chapterId(n)),
  prerequisiteIds: [],
});
for (let c = 0; c < 334; c++) {
  const assessmentId = prefix + "-a" + c;
  items.push({
    ...chapter,
    id: chapterId(c),
    title: "Scale chapter " + c,
    lessonIds: Array.from({ length: 3 }, (_, n) => lessonId(c * 3 + n)),
    sequence: c + 1,
    trackId: prefix + "-track",
    assessmentId,
    prerequisiteIds: [],
  });
  items.push({
    ...templateAssessment,
    id: assessmentId,
    chapterId: chapterId(c),
    items: templateAssessment.items.map((i, n) => ({
      ...i,
      id: assessmentId + "-p" + n,
    })),
    prerequisiteIds: [],
  });
}
for (let l = 0; l < 1002; l++) {
  const cards = [prefix + "-r" + l + "a", prefix + "-r" + l + "b"];
  items.push({
    ...lesson,
    id: lessonId(l),
    chapterId: chapterId(Math.floor(l / 3)),
    exerciseIds: Array.from({ length: 3 }, (_, n) => exerciseId(l * 3 + n)),
    reviewCardIds: cards,
    prerequisiteIds: [],
  });
  for (const id of cards)
    items.push({
      ...templateCard,
      id,
      lessonId: lessonId(l),
      prerequisiteIds: [],
    });
}
for (let e = 0; e < 10000; e++)
  items.push({
    ...exercise,
    id: exerciseId(e),
    lessonId: lessonId(Math.floor(e / 3) % 1002),
    prerequisiteIds: [],
  });
console.log("Preparing synthetic scale fixture.");
const owner =
  reusedOwner ??
  (await db.user.create({
    data: {
      normalizedEmail: prefix + "@example.test",
      passwordHash: "synthetic-performance-session-only",
    },
  }));
const release = reusedOwner
  ? await db.contentRelease.findUniqueOrThrow({
      where: { id: reusedOwner.activeReleaseId! },
    })
  : await db.contentRelease.create({
      data: {
        ownerId: owner.id,
        packageId: prefix,
        packageVersion: 1,
        checksum: hash(prefix),
        state: "published",
        publishedAt: new Date(),
        snapshot: {
          syntheticScaleFixture: true,
          importLimitBypassedForReadBenchmark: true,
        },
        validationSummary: {},
      },
    });
if (!reusedOwner)
  for (let start = 0; start < items.length; start += 250) {
    const batch = items.slice(start, start + 250),
      versions = batch.map((item) => ({
        id: randomUUID(),
        itemId: item.id,
        version: 1,
        masteryRevision: 1,
        payload: json(item),
        checksum: hash(JSON.stringify(item)),
      }));
    await db.$transaction(
      async (tx) => {
        await tx.contentItem.createMany({
          data: batch.map((i) => ({ id: i.id, kind: i.kind })),
        });
        await tx.contentVersion.createMany({ data: versions });
        const practiceVersions = versions.filter(
          (v) => batch.find((i) => i.id === v.itemId)?.kind === "exercise",
        );
        if (practiceVersions.length)
          await tx.attempt.createMany({
            data: practiceVersions.map((v) => ({
              userId: owner.id,
              exerciseVersionId: v.id,
              clientEventId: randomUUID(),
              outcome: "passed",
              gradingOrigin: "server_objective",
              assistance: "none",
              answer: ["option-1"],
              result: { syntheticBenchmark: true },
            })),
          });
        await tx.releaseItem.createMany({
          data: batch.map((i, n) => ({
            releaseId: release.id,
            itemId: i.id,
            versionId: versions[n]!.id,
            kind: i.kind,
            title: i.title,
            parentId:
              i.kind === "chapter"
                ? i.trackId
                : i.kind === "lesson"
                  ? i.chapterId
                  : i.kind === "exercise"
                    ? i.lessonId
                    : null,
            sequence: i.kind === "chapter" ? i.sequence : 0,
          })),
        });
      },
      { timeout: 30000 },
    );
  }
await db.$executeRawUnsafe(
  'ANALYZE "Attempt", "ContentVersion", "ReleaseItem"',
);
console.log("Scale records ready; measuring warm requests.");
await db.user.update({
  where: { id: owner.id },
  data: { activeReleaseId: release.id },
});
const token = randomUUID();
await db.session.create({
  data: {
    userId: owner.id,
    tokenHash: hash(token),
    csrfSecret: randomUUID(),
    expiresAt: new Date(Date.now() + 3600000),
  },
});
const app = await createApp();
const results = [];
try {
  for (const route of [
    "/curriculum",
    "/progress",
    "/activity",
    "/lessons/" + lessonId(0),
  ]) {
    const values: number[] = [];
    let bytes = 0;
    for (let n = 0; n < 12; n++) {
      const start = performance.now();
      const response = await app.inject({
        url: "/api/v1" + route,
        headers: { cookie: "devpractice=" + token },
      });
      const elapsed = performance.now() - start;
      assert.equal(response.statusCode, 200, response.body);
      bytes = Buffer.byteLength(response.body);
      if (route === "/curriculum")
        assert.equal(response.json().data.length, 20);
      if (route === "/progress")
        assert.equal(response.json().data.totalLessonCount, 1002);
      if (n >= 2) values.push(elapsed);
    }
    values.sort((a, b) => a - b);
    results.push({
      route,
      responseBytes: bytes,
      samples: values.length,
      p50Ms: Math.round(values[4]!),
      p95Ms: Math.round(values[9]!),
      targetMs: 500,
      withinTarget: values[9]! < 500,
    });
  }
  await writeFile(
    "docs/performance-verification.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        node: process.version,
        database: databaseVersion,
        fixture: {
          chapters: 334,
          lessons: 1002,
          exercises: 10000,
          attempts: 10000,
        },
        method:
          "Optimizer statistics refreshed; two warmups then ten sequential Fastify requests per route; wall-clock includes database calls. Today uses progress, curriculum, and activity.",
        limitations: [
          "Synthetic database fixture bypasses the 2,000-item import limit to isolate read-path scaling. It is not a publishable curriculum package.",
          "One synthetic attempt per exercise; no concurrent users. Host also runs unrelated applications.",
        ],
        results,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await app.close();
  await db.$disconnect();
}
