import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, type Tx, AppError, hash, json, mutate } from "./db";
import {
  itemSchema,
  validatePackage,
  publicItem,
  mutation,
  revisionMutation,
  type Item,
  type ContentPackage,
} from "../../../packages/contracts/src/content";
import { canonical } from "../../../packages/learning-core/src/index";
export async function versionFor(
  tx: Tx,
  userId: string,
  id: string,
  versionId?: string,
) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const membership = await tx.releaseItem.findFirst({
    where: versionId
      ? {
          itemId: id,
          versionId,
          releaseIdRef: { ownerId: userId, state: "published" },
        }
      : {
          itemId: id,
          releaseId:
            user.activeReleaseId ?? "00000000-0000-0000-0000-000000000000",
        },
    include: { versionIdRef: true },
  });
  if (!membership)
    throw new AppError(404, "NOT_FOUND", "Content is unavailable.");
  return {
    row: membership.versionIdRef,
    item: itemSchema.parse(membership.versionIdRef.payload),
  };
}
export function diff(oldItems: Item[], items: Item[]) {
  const old = new Map(oldItems.map((i) => [i.id, i]));
  const next = new Map(items.map((i) => [i.id, i]));
  return {
    added: items.filter((i) => !old.has(i.id)).map((i) => i.id),
    changed: items
      .filter((i) => old.has(i.id) && canonical(old.get(i.id)) !== canonical(i))
      .map((i) => i.id),
    archived: oldItems.filter((i) => !next.has(i.id)).map((i) => i.id),
    unchanged: items
      .filter((i) => canonical(old.get(i.id)) === canonical(i))
      .map((i) => i.id),
    masteryChanged: items
      .filter(
        (i) =>
          old.has(i.id) && old.get(i.id)!.masteryRevision !== i.masteryRevision,
      )
      .map((i) => i.id),
  };
}
function gradingBehavior(
  grading: Extract<Item, { kind: "exercise" }>["grading"],
) {
  if (grading.kind === "choice")
    return {
      kind: grading.kind,
      multiple: grading.multiple,
      options: grading.options.map((option) => ({
        id: option.id,
        text: option.text,
      })),
      correctIds: grading.correctIds,
    };
  if (grading.kind === "text") return grading;
  if (grading.kind === "rubric")
    return {
      kind: grading.kind,
      criteria: grading.criteria,
      modelAnswer: grading.modelAnswer,
    };
  return {
    kind: grading.kind,
    language: grading.language,
    entrypoint: grading.entrypoint,
    starterCode: grading.starterCode,
    assertInputUnchanged: grading.assertInputUnchanged,
    cases: grading.cases,
  };
}
function solutionBehavior(solution: { code?: string; modelAnswer?: string }) {
  return { code: solution.code, modelAnswer: solution.modelAnswer };
}
function masteryBehavior(item: Item) {
  if (item.kind === "exercise")
    return {
      grading: gradingBehavior(item.grading),
      solution: solutionBehavior(item.solution),
      conceptIds: item.conceptIds,
      primaryConceptId: item.primaryConceptId,
      cognitiveLevel: item.cognitiveLevel,
    };
  if (item.kind === "review_card")
    return {
      grading: gradingBehavior(item.grading),
      answer: item.answer,
      conceptIds: item.conceptIds,
      primaryConceptId: item.primaryConceptId,
    };
  if (item.kind === "assessment")
    return {
      conceptIds: item.conceptIds,
      qualification: item.qualification,
      items: item.items.map((i) => ({
        id: i.id,
        objectiveIds: i.objectiveIds,
        critical: i.critical,
        type: i.type,
        primaryConceptId: i.primaryConceptId,
        cognitiveLevel: i.cognitiveLevel,
        grading: gradingBehavior(i.grading),
        solution: solutionBehavior(i.solution),
      })),
    };
  if (item.kind === "lesson")
    return {
      conceptIds: item.conceptIds,
      objectives: item.objectives,
      exerciseIds: item.exerciseIds,
      reviewCardIds: item.reviewCardIds,
    };
  if (item.kind === "chapter")
    return {
      conceptIds: item.conceptIds,
      objectiveIds: item.objectiveIds,
      assessmentId: item.assessmentId,
      lessonIds: item.lessonIds,
    };
  if (item.kind === "mission")
    return {
      conceptIds: item.conceptIds,
      starterAssetId: item.starterAssetId,
      starterCommit: item.starterCommit,
      acceptanceCriteria: item.acceptanceCriteria,
      verificationCommands: item.verificationCommands,
      reflectionRubric: item.reflectionRubric,
      solutionMarkdown: item.solutionMarkdown,
    };
  return null;
}
export async function publish(
  tx: Tx,
  userId: string,
  releaseId: string,
  checksum: string,
) {
  const release = await tx.contentRelease.findFirst({
    where: { id: releaseId, ownerId: userId },
  });
  if (!release) throw new AppError(404, "NOT_FOUND", "Import unavailable.");
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (release.state === "published") return { releaseId: release.id };
  if (user.activeReleaseId !== release.baseReleaseId)
    throw new AppError(
      409,
      "BASE_RELEASE_CONFLICT",
      "The active release changed. Build a new snapshot against the current release.",
    );
  if (checksum !== release.checksum)
    throw new AppError(
      409,
      "CHECKSUM_CONFLICT",
      "The preview checksum changed.",
    );
  const validated = validatePackage(release.snapshot);
  if (!validated.ok)
    throw new AppError(
      422,
      "INVALID_CONTENT",
      "Content validation failed.",
      validated.issues,
    );
  // A download identity must retain its original bytes across archived releases.
  const priorReleases = await tx.contentRelease.findMany({
    where: { ownerId: userId, state: "published" },
    select: { snapshot: true },
  });
  const assets = new Map(
    validated.package.assets.map((asset) => [asset.id, asset]),
  );
  for (const prior of priorReleases) {
    const parsed = validatePackage(prior.snapshot);
    if (!parsed.ok)
      throw new AppError(
        500,
        "INVALID_PUBLISHED_CONTENT",
        "Published content failed validation.",
      );
    for (const old of parsed.package.assets) {
      const next = assets.get(old.id);
      if (next && (next.path !== old.path || next.checksum !== old.checksum))
        throw new AppError(
          409,
          "ASSET_VERSION_CONFLICT",
          "A published asset ID cannot be reused with different bytes or path: " +
            old.id,
        );
    }
  }
  for (const item of validated.package.items) {
    const bytes = hash(canonical(item));
    const existing = await tx.contentVersion.findUnique({
      where: { itemId_version: { itemId: item.id, version: item.version } },
    });
    if (existing && existing.checksum !== bytes)
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "A content version cannot be reused with different bytes: " + item.id,
      );
    const identity = await tx.contentItem.findUnique({
      where: { id: item.id },
    });
    if (identity && identity.kind !== item.kind)
      throw new AppError(
        409,
        "IDENTITY_CONFLICT",
        "A stable identity cannot change kind.",
      );
    const latest = await tx.contentVersion.findFirst({
      where: { itemId: item.id },
      orderBy: { version: "desc" },
    });
    if (latest && !existing) {
      const previous = itemSchema.parse(latest.payload);
      if (
        item.version <= latest.version ||
        item.masteryRevision < latest.masteryRevision
      )
        throw new AppError(
          409,
          "VERSION_CONFLICT",
          "Versions must increase: " + item.id,
        );
      if (
        canonical(masteryBehavior(previous)) !==
          canonical(masteryBehavior(item)) &&
        item.masteryRevision === latest.masteryRevision
      )
        throw new AppError(
          422,
          "MASTERY_REVISION_REQUIRED",
          "Changed grading, solution, objectives, or completion criteria requires a new mastery revision: " +
            item.id,
        );
    }
    await tx.contentItem.upsert({
      where: { id: item.id },
      create: { id: item.id, kind: item.kind },
      update: {},
    });
    const version =
      existing ??
      (await tx.contentVersion.create({
        data: {
          itemId: item.id,
          version: item.version,
          masteryRevision: item.masteryRevision,
          payload: json(item),
          checksum: bytes,
        },
      }));
    await tx.releaseItem.create({
      data: {
        releaseId: release.id,
        itemId: item.id,
        versionId: version.id,
        kind: item.kind,
        title: item.title,
        parentId:
          "lessonId" in item
            ? item.lessonId
            : "chapterId" in item
              ? item.chapterId
              : "trackId" in item
                ? item.trackId
                : null,
        sequence: "sequence" in item ? item.sequence : 0,
      },
    });
    for (const id of item.conceptIds)
      await tx.concept.upsert({
        where: { id },
        create: { id, title: id, description: "Authored curriculum concept" },
        update: {},
      });
  }
  await tx.contentRelease.update({
    where: { id: release.id },
    data: { state: "published", publishedAt: new Date() },
  });
  await tx.user.update({
    where: { id: userId },
    data: {
      activeReleaseId: release.id,
      activeReleaseRevision: { increment: 1 },
    },
  });
  return { releaseId: release.id };
}
export async function importPackage(
  tx: Tx,
  userId: string,
  pkg: ContentPackage,
) {
  const result = validatePackage(pkg);
  if (!result.ok)
    throw new AppError(
      422,
      "INVALID_CONTENT",
      "Content validation failed.",
      result.issues,
    );
  const checksum = hash(canonical(pkg));
  const prior = await tx.contentRelease.findUnique({
    where: {
      ownerId_packageId_packageVersion: {
        ownerId: userId,
        packageId: pkg.packageId,
        packageVersion: pkg.packageVersion,
      },
    },
  });
  if (prior) {
    if (prior.checksum !== checksum)
      throw new AppError(
        409,
        "VERSION_CONFLICT",
        "Package version already has different content.",
      );
    return prior;
  }
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const previous = user.activeReleaseId
    ? await tx.contentRelease.findUnique({
        where: { id: user.activeReleaseId },
      })
    : null;
  const old = previous ? validatePackage(previous.snapshot) : null;
  const summary = diff(old?.ok ? old.package.items : [], pkg.items);
  return tx.contentRelease.create({
    data: {
      ownerId: userId,
      packageId: pkg.packageId,
      packageVersion: pkg.packageVersion,
      baseReleaseId: pkg.baseReleaseId,
      checksum,
      snapshot: json(pkg),
      validationSummary: json(summary),
    },
  });
}
export function pageInput(query: unknown) {
  return z
    .object({
      cursor: z.string().max(500).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      track: z.string().optional(),
      q: z.string().max(200).optional(),
    })
    .parse(query);
}
export const nextCursor = (id: string) => Buffer.from(id).toString("base64url");
export function decodeCursor(cursor?: string) {
  return cursor ? Buffer.from(cursor, "base64url").toString("utf8") : undefined;
}
export async function contentRoutes(app: FastifyInstance) {
  app.get("/api/v1/curriculum", async (req) => {
    const { limit, cursor, track, q } = pageInput(req.query);
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    const releaseId =
      user.activeReleaseId ?? "00000000-0000-0000-0000-000000000000";
    const tracks = await db.releaseItem.findMany({
      where: { releaseId, kind: "track" },
      orderBy: [{ sequence: "asc" }, { itemId: "asc" }],
      include: { versionIdRef: true },
    });
    const cursorId = cursor ? decodeCursor(cursor) : undefined;
    if (
      cursorId &&
      !(await db.releaseItem.findFirst({
        where: { releaseId, itemId: cursorId, kind: "chapter" },
        select: { itemId: true },
      }))
    )
      throw new AppError(
        400,
        "INVALID_CURSOR",
        "Curriculum cursor unavailable.",
      );
    const chapters = await db.releaseItem.findMany({
      where: {
        releaseId,
        kind: "chapter",
        ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
        ...(track ? { parentId: track } : {}),
        ...(cursorId ? { itemId: { gt: cursorId } } : {}),
      },
      take: limit + 1,
      orderBy: { itemId: "asc" },
      include: { versionIdRef: true },
    });
    const page = chapters.slice(0, limit);
    const chapterItems = page
      .map((c) => itemSchema.parse(c.versionIdRef.payload))
      .filter(
        (item): item is Extract<Item, { kind: "chapter" }> =>
          item.kind === "chapter",
      );
    const lessonIds = chapterItems.flatMap((item) => item.lessonIds);
    const assessmentIds = chapterItems.map((item) => item.assessmentId);
    const currentAssessments = assessmentIds.length
      ? await db.releaseItem.findMany({
          where: {
            releaseId,
            itemId: { in: assessmentIds },
            kind: "assessment",
          },
          select: {
            itemId: true,
            versionIdRef: { select: { masteryRevision: true } },
          },
        })
      : [];
    const [progress, placements] = await Promise.all([
      lessonIds.length
        ? db.lessonProgress.findMany({
            where: { userId: req.ownerId, lessonId: { in: lessonIds } },
          })
        : [],
      currentAssessments.length
        ? db.placementAttempt.findMany({
            where: {
              userId: req.ownerId,
              qualified: true,
              assessmentVersionIdRef: {
                OR: currentAssessments.map((a) => ({
                  itemId: a.itemId,
                  masteryRevision: a.versionIdRef.masteryRevision,
                })),
              },
            },
            select: {
              assessmentVersionIdRef: {
                select: { itemId: true, masteryRevision: true },
              },
            },
          })
        : [],
    ]);
    const placed = new Set(
      placements.map(
        (p) =>
          p.assessmentVersionIdRef.itemId +
          ":" +
          p.assessmentVersionIdRef.masteryRevision,
      ),
    );
    return {
      data: page.map((c, index) => {
        const item = chapterItems[index]!;
        const assessment = currentAssessments.find(
          (a) => a.itemId === item.assessmentId,
        );
        return {
          ...publicItem(item),
          progress: progress.filter((p) => item.lessonIds.includes(p.lessonId)),
          placedOut: Boolean(
            assessment &&
              placed.has(
                assessment.itemId +
                  ":" +
                  assessment.versionIdRef.masteryRevision,
              ),
          ),
        };
      }),
      meta: {
        nextCursor:
          chapters.length > limit
            ? nextCursor(chapters[limit - 1]!.itemId)
            : null,
        tracks: tracks.map((track) =>
          publicItem(itemSchema.parse(track.versionIdRef.payload)),
        ),
        activeReleaseId: user.activeReleaseId,
      },
    };
  });
  for (const [route, kind] of [
    ["chapters", "chapter"],
    ["lessons", "lesson"],
    ["exercises", "exercise"],
    ["missions", "mission"],
  ] as const) {
    app.get("/api/v1/" + route + "/:id", async (req) => {
      const { id } = z.object({ id: z.string() }).parse(req.params);
      const { row, item } = await versionFor(db, req.ownerId, id);
      if (item.kind !== kind)
        throw new AppError(404, "NOT_FOUND", "Content unavailable.");
      return { data: { ...publicItem(item), versionId: row.id } };
    });
  }
  app.get("/api/v1/archive/:id", async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const entry = await db.releaseItem.findFirst({
      where: {
        itemId: id,
        releaseIdRef: { ownerId: req.ownerId, state: "published" },
      },
      include: { versionIdRef: true },
      orderBy: { versionIdRef: { version: "desc" } },
    });
    if (!entry)
      throw new AppError(404, "NOT_FOUND", "Archived content unavailable.");
    return {
      data: {
        ...publicItem(itemSchema.parse(entry.versionIdRef.payload)),
        archived: true,
      },
    };
  });
  app.get("/api/v1/missions", async (req) => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    const entries = await db.releaseItem.findMany({
      where: {
        releaseId:
          user.activeReleaseId ?? "00000000-0000-0000-0000-000000000000",
        kind: "mission",
      },
      include: { versionIdRef: true },
      orderBy: { itemId: "asc" },
    });
    const progress = await db.missionProgress.findMany({
      where: { userId: req.ownerId },
    });
    return {
      data: entries.map((e) => ({
        ...publicItem(itemSchema.parse(e.versionIdRef.payload)),
        progress: progress.find((p) => p.missionId === e.itemId) ?? null,
      })),
    };
  });
  app.post("/api/v1/content/imports", { bodyLimit: 10485760 }, async (req) => {
    const body = mutation
      .extend({ package: z.unknown() })
      .strict()
      .parse(req.body);
    const parsed = validatePackage(body.package);
    if (!parsed.ok)
      throw new AppError(
        422,
        "INVALID_CONTENT",
        "Content validation failed.",
        parsed.issues,
      );
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "import",
        body,
        (tx) => importPackage(tx, req.ownerId, parsed.package),
      ),
    };
  });
  app.get("/api/v1/content/imports/:id", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const draft = await db.contentRelease.findFirst({
      where: { id, ownerId: req.ownerId },
    });
    if (!draft) throw new AppError(404, "NOT_FOUND", "Import unavailable.");
    const { snapshot: _snapshot, ...preview } = draft;
    return { data: preview };
  });
  app.post("/api/v1/content/imports/:id/publish", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = mutation
      .extend({ checksum: z.string() })
      .strict()
      .parse(req.body);
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "publish:" + id,
        body,
        (tx) => publish(tx, req.ownerId, id, body.checksum),
        300000,
      ),
    };
  });
  app.get("/api/v1/content/releases", async (req) => {
    const { limit, cursor } = pageInput(req.query);
    const cursorId = cursor
      ? z.string().uuid().parse(decodeCursor(cursor))
      : undefined;
    if (
      cursorId &&
      !(await db.contentRelease.findFirst({
        where: { id: cursorId, ownerId: req.ownerId },
        select: { id: true },
      }))
    )
      throw new AppError(400, "INVALID_CURSOR", "Release cursor unavailable.");
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    const rows = await db.contentRelease.findMany({
      where: { ownerId: req.ownerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: {
        id: true,
        packageVersion: true,
        packageId: true,
        state: true,
        checksum: true,
        createdAt: true,
        validationSummary: true,
      },
    });
    return {
      data: rows.slice(0, limit),
      meta: {
        nextCursor:
          rows.length > limit ? nextCursor(rows[limit - 1]!.id) : null,
        activeReleaseId: user.activeReleaseId,
        revision: user.activeReleaseRevision,
      },
    };
  });
  app.post("/api/v1/content/releases/:id/activate", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = revisionMutation.strict().parse(req.body);
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "activate:" + id,
        body,
        async (tx) => {
          const release = await tx.contentRelease.findFirst({
            where: { id, ownerId: req.ownerId, state: "published" },
          });
          if (!release)
            throw new AppError(
              404,
              "NOT_FOUND",
              "Published release unavailable.",
            );
          const changed = await tx.user.updateMany({
            where: {
              id: req.ownerId,
              activeReleaseRevision: body.expectedRevision,
            },
            data: {
              activeReleaseId: id,
              activeReleaseRevision: { increment: 1 },
            },
          });
          if (!changed.count)
            throw new AppError(
              409,
              "REVISION_CONFLICT",
              "The active release has changed.",
            );
          return { activeReleaseId: id };
        },
      ),
    };
  });
}
