import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { db, hash } from "../apps/api/src/db";
import { Prisma } from "@prisma/client";
import { createApp } from "../apps/api/src/app";
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
)
  throw new Error("Disposable database required");
process.env.LOG_LEVEL = "warn";
const owner = await db.user.findFirstOrThrow({
  where: { normalizedEmail: { startsWith: "scale-" } },
  orderBy: { createdAt: "desc" },
});
const releaseId = owner.activeReleaseId!;
const probes = [];
for (let n = 0; n < 10; n++) {
  const start = performance.now();
  await db.$queryRaw`SELECT 1`;
  probes.push(Math.round(performance.now() - start));
}
const plan = await db.$queryRaw(
  Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT v."itemId",v."masteryRevision",v.payload->'conceptIds' AS "conceptIds",v.payload->>'cognitiveLevel' AS level,a.assistance,a."gradingOrigin" AS origin,bool_or(a.outcome='passed') AS passed,min(a."createdAt") AS at FROM "Attempt" a JOIN "ContentVersion" v ON v.id=a."exerciseVersionId" JOIN "ReleaseItem" r ON r."itemId"=v."itemId" AND r."releaseId"=${releaseId}::uuid JOIN "ContentVersion" cv ON cv.id=r."versionId" AND cv."masteryRevision"=v."masteryRevision" WHERE a."userId"=${owner.id}::uuid GROUP BY v."itemId",v."masteryRevision",v.payload->'conceptIds',v.payload->>'cognitiveLevel',a.assistance,a."gradingOrigin"`,
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
const app = await createApp();
const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();
const samples = [];
try {
  for (let n = 0; n < 3; n++) {
    const start = performance.now(),
      cpu = process.cpuUsage();
    const response = await app.inject({
      url: "/api/v1/progress",
      headers: { cookie: "devpractice=" + token },
    });
    const used = process.cpuUsage(cpu);
    samples.push({
      status: response.statusCode,
      wallMs: Math.round(performance.now() - start),
      cpuMs: Math.round((used.user + used.system) / 1000),
    });
  }
  histogram.disable();
  await writeFile(
    "docs/performance-profile.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        node: process.version,
        selectOneRoundtripMs: probes,
        contributionQueryPlan: plan,
        progressRequests: samples,
        eventLoopDelay: {
          meanMs: Math.round(histogram.mean / 1e6),
          p95Ms: Math.round(histogram.percentile(95) / 1e6),
          maxMs: Math.round(histogram.max / 1e6),
        },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        selectOneRoundtripMs: probes,
        samples,
        eventLoopDelayP95Ms: Math.round(histogram.percentile(95) / 1e6),
      },
      null,
      2,
    ),
  );
} finally {
  await app.close();
  await db.$disconnect();
}
