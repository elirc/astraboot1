import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, mutate, AppError, award, json } from "./db";
import { versionFor, pageInput, decodeCursor, nextCursor } from "./content";
import {
  mutation,
  revisionMutation,
  repositoryUrl,
} from "../../../packages/contracts/src/content";
const getId = (p: unknown) => z.object({ id: z.string() }).parse(p).id;
const exportRows = z.array(z.record(z.unknown()));
export const progressExportSchema = z
  .object({
    schemaVersion: z.literal(1),
    exportedAt: z.string().datetime(),
    data: z
      .object({
        attempts: exportRows,
        reveals: exportRows,
        lessons: exportRows,
        placements: exportRows,
        drafts: exportRows,
        reviews: exportRows,
        reviewEvents: exportRows,
        notes: exportRows,
        bookmarks: exportRows,
        missions: exportRows,
        xp: exportRows,
        activity: exportRows,
        versions: exportRows,
      })
      .strict(),
  })
  .strict();
/** Resolve only content the owner has published; never expose another owner's draft. */
async function contentLinks(ownerId: string, ids: string[]) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: ownerId },
    select: { activeReleaseId: true },
  });
  const rows = ids.length
    ? await db.releaseItem.findMany({
        where: {
          itemId: { in: ids },
          releaseIdRef: { ownerId, state: "published" },
        },
        orderBy: [{ versionIdRef: { version: "desc" } }, { releaseId: "asc" }],
        select: {
          itemId: true,
          title: true,
          kind: true,
          parentId: true,
          releaseId: true,
        },
      })
    : [];
  const links = new Map<
    string,
    {
      id: string;
      title: string;
      kind: string;
      parentId: string | null;
      archived: boolean;
    }
  >();
  for (const row of rows) {
    if (!links.has(row.itemId) || row.releaseId === user.activeReleaseId)
      links.set(row.itemId, {
        id: row.itemId,
        title: row.title,
        kind: row.kind,
        parentId: row.parentId,
        archived: row.releaseId !== user.activeReleaseId,
      });
  }
  return links;
}
export async function personalRoutes(app: FastifyInstance) {
  app.get("/api/v1/drafts/:id", async (req) => {
    const id = getId(req.params);
    await versionFor(db, req.ownerId, id);
    return {
      data: await db.exerciseDraft.findUnique({
        where: { userId_exerciseId: { userId: req.ownerId, exerciseId: id } },
      }),
    };
  });
  app.put("/api/v1/drafts/:id", async (req) => {
    const id = getId(req.params);
    const body = revisionMutation
      .extend({
        source: z.string().max(65536),
        contentVersionId: z.string().uuid(),
        reason: z.enum(["save", "reset", "merge"]).default("save"),
      })
      .strict()
      .parse(req.body);
    if (Buffer.byteLength(body.source) > 65536)
      throw new AppError(413, "TOO_LARGE", "Source exceeds 64 KiB.");
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "draft:" + id,
        body,
        async (tx) => {
          await versionFor(tx, req.ownerId, id, body.contentVersionId);
          const old = await tx.exerciseDraft.findUnique({
            where: {
              userId_exerciseId: { userId: req.ownerId, exerciseId: id },
            },
          });
          if ((old?.revision ?? 0) !== body.expectedRevision)
            throw new AppError(
              409,
              "REVISION_CONFLICT",
              "This draft changed on another device.",
              old,
            );
          if (old) {
            await tx.draftSnapshot.create({
              data: {
                draftId: old.id,
                source: old.source,
                baseRevision: old.revision,
                reason: body.reason,
              },
            });
            const prune = await tx.draftSnapshot.findMany({
              where: { draftId: old.id },
              orderBy: { createdAt: "desc" },
              skip: 20,
              select: { id: true },
            });
            await tx.draftSnapshot.deleteMany({
              where: { id: { in: prune.map((s) => s.id) } },
            });
          }
          return tx.exerciseDraft.upsert({
            where: {
              userId_exerciseId: { userId: req.ownerId, exerciseId: id },
            },
            create: {
              userId: req.ownerId,
              exerciseId: id,
              source: body.source,
              contentVersionId: body.contentVersionId,
            },
            update: {
              source: body.source,
              contentVersionId: body.contentVersionId,
              revision: { increment: 1 },
            },
          });
        },
      ),
    };
  });
  app.get("/api/v1/drafts/:id/snapshots", async (req) => {
    const draft = await db.exerciseDraft.findUnique({
      where: {
        userId_exerciseId: {
          userId: req.ownerId,
          exerciseId: getId(req.params),
        },
      },
    });
    return {
      data: draft
        ? await db.draftSnapshot.findMany({
            where: { draftId: draft.id },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : [],
    };
  });
  app.get("/api/v1/notes", async (req) => {
    const { limit, cursor, q } = pageInput(req.query);
    const rows = await db.note.findMany({
      where: {
        userId: req.ownerId,
        deletedAt: null,
        ...(cursor ? { id: { gt: decodeCursor(cursor) } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                { body: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
      take: limit + 1,
    });
    const links = await contentLinks(
      req.ownerId,
      rows
        .slice(0, limit)
        .flatMap((note) => (note.contentItemId ? [note.contentItemId] : [])),
    );
    return {
      data: rows
        .slice(0, limit)
        .map((note) => ({
          ...note,
          content: note.contentItemId
            ? (links.get(note.contentItemId) ?? null)
            : null,
        })),
      meta: {
        nextCursor:
          rows.length > limit ? nextCursor(rows[limit - 1]!.id) : null,
      },
    };
  });
  app.post("/api/v1/notes", async (req) => {
    const body = mutation
      .extend({
        title: z.string().min(1).max(200),
        body: z.string().max(20000),
        contentItemId: z.string().nullable().default(null),
      })
      .strict()
      .parse(req.body);
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "note:create",
        body,
        async (tx) => {
          if (body.contentItemId)
            await versionFor(tx, req.ownerId, body.contentItemId);
          return tx.note.create({
            data: {
              userId: req.ownerId,
              title: body.title,
              body: body.body,
              contentItemId: body.contentItemId,
            },
          });
        },
      ),
    };
  });
  for (const method of ["PATCH", "DELETE"] as const)
    app.route({
      method,
      url: "/api/v1/notes/:id",
      handler: async (req) => {
        const id = getId(req.params);
        const body = revisionMutation
          .extend({
            title: z.string().min(1).max(200).optional(),
            body: z.string().max(20000).optional(),
          })
          .strict()
          .parse(req.body);
        return {
          data: await mutate(
            req.ownerId,
            body.clientEventId,
            "note:" + method + ":" + id,
            body,
            async (tx) => {
              const note = await tx.note.findFirst({
                where: { id, userId: req.ownerId },
              });
              if (!note)
                throw new AppError(404, "NOT_FOUND", "Note unavailable.");
              if (note.revision !== body.expectedRevision || note.deletedAt)
                throw new AppError(
                  409,
                  "REVISION_CONFLICT",
                  "This note changed or was deleted on another device.",
                  note,
                );
              return tx.note.update({
                where: { id },
                data:
                  method === "DELETE"
                    ? { deletedAt: new Date(), revision: { increment: 1 } }
                    : {
                        title: body.title,
                        body: body.body,
                        revision: { increment: 1 },
                      },
              });
            },
          ),
        };
      },
    });
  app.get("/api/v1/bookmarks", async (req) => {
    const { limit, cursor, q } = pageInput(req.query);
    const rows = await db.bookmark.findMany({
      where: {
        userId: req.ownerId,
        ...(cursor ? { contentItemId: { gt: decodeCursor(cursor) } } : {}),
        ...(q
          ? {
              OR: [
                {
                  contentItemId: { contains: q, mode: "insensitive" as const },
                },
                {
                  contentItemIdRef: {
                    ReleaseItem_itemId: {
                      some: {
                        title: { contains: q, mode: "insensitive" as const },
                        releaseIdRef: {
                          ownerId: req.ownerId,
                          state: "published",
                        },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { contentItemId: "asc" },
      take: limit + 1,
    });
    const links = await contentLinks(
      req.ownerId,
      rows.slice(0, limit).map((row) => row.contentItemId),
    );
    return {
      data: rows.slice(0, limit).map((row) => ({
        contentItemId: row.contentItemId,
        kind: links.get(row.contentItemId)?.kind ?? "unknown",
        title: links.get(row.contentItemId)?.title ?? row.contentItemId,
        parentId: links.get(row.contentItemId)?.parentId ?? null,
        archived: links.get(row.contentItemId)?.archived ?? true,
      })),
      meta: {
        nextCursor:
          rows.length > limit
            ? nextCursor(rows[limit - 1]!.contentItemId)
            : null,
      },
    };
  });
  for (const method of ["PUT", "DELETE"] as const)
    app.route({
      method,
      url: "/api/v1/bookmarks/:id",
      handler: async (req) => {
        const id = getId(req.params);
        const body = mutation.strict().parse(req.body);
        return {
          data: await mutate(
            req.ownerId,
            body.clientEventId,
            "bookmark:" + method + ":" + id,
            body,
            async (tx) => {
              if (method === "DELETE") {
                await tx.bookmark.deleteMany({
                  where: { userId: req.ownerId, contentItemId: id },
                });
                return { bookmarked: false };
              }
              await versionFor(tx, req.ownerId, id);
              await tx.bookmark.upsert({
                where: {
                  userId_contentItemId: {
                    userId: req.ownerId,
                    contentItemId: id,
                  },
                },
                create: { userId: req.ownerId, contentItemId: id },
                update: {},
              });
              return { bookmarked: true };
            },
          ),
        };
      },
    });
  app.get("/api/v1/missions/:id/progress", async (req) => ({
    data: await db.missionProgress.findUnique({
      where: {
        userId_missionId: { userId: req.ownerId, missionId: getId(req.params) },
      },
    }),
  }));
  app.put("/api/v1/missions/:id/progress", async (req) => {
    const id = getId(req.params);
    const body = revisionMutation
      .extend({
        checklist: z.array(z.boolean()).max(100),
        status: z.enum(["in_progress", "completed"]),
        repositoryUrl: repositoryUrl.optional(),
        commitHash: z
          .string()
          .regex(/^[a-f0-9]{7,64}$|^$/)
          .optional(),
        report: z
          .object({
            notes: z.string().max(20000),
            command: z.string().max(1000),
            outcome: z.string().max(2000),
          })
          .strict(),
      })
      .strict()
      .parse(req.body);
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "mission:" + id,
        body,
        async (tx) => {
          const { item } = await versionFor(tx, req.ownerId, id);
          if (item.kind !== "mission")
            throw new AppError(400, "WRONG_KIND", "Expected mission.");
          const old = await tx.missionProgress.findUnique({
            where: { userId_missionId: { userId: req.ownerId, missionId: id } },
          });
          if ((old?.revision ?? 0) !== body.expectedRevision)
            throw new AppError(
              409,
              "REVISION_CONFLICT",
              "Mission report changed on another device.",
              old,
            );
          if (
            body.status === "completed" &&
            (body.checklist.length !== item.acceptanceCriteria.length ||
              !body.checklist.every(Boolean) ||
              !body.report.command ||
              !body.report.outcome)
          )
            throw new AppError(
              400,
              "CHECKLIST_REQUIRED",
              "Complete each criterion and report the command and outcome.",
            );
          const data = {
            checklist: json(body.checklist),
            status: old?.status === "completed" ? "completed" : body.status,
            repositoryUrl: body.repositoryUrl,
            commitHash: body.commitHash,
            report: json({ ...body.report, gradingOrigin: "self_reported" }),
          };
          const saved = await tx.missionProgress.upsert({
            where: { userId_missionId: { userId: req.ownerId, missionId: id } },
            create: { userId: req.ownerId, missionId: id, ...data },
            update: { ...data, revision: { increment: 1 } },
          });
          if (body.status === "completed")
            await award(
              tx,
              req.ownerId,
              "mission:" + id,
              50,
              "First self-reported mission completion",
            );
          return saved;
        },
      ),
    };
  });
  app.get("/api/v1/activity", async (req) => {
    const { limit, cursor } = pageInput(req.query);
    const rows = await db.activityEvent.findMany({
      where: { userId: req.ownerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: decodeCursor(cursor) }, skip: 1 } : {}),
    });
    return {
      data: rows.slice(0, limit),
      meta: {
        nextCursor:
          rows.length > limit ? nextCursor(rows[limit - 1]!.id) : null,
      },
    };
  });
  app.get("/api/v1/settings", async (req) => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    return {
      data: {
        email: user.normalizedEmail,
        timezone: user.timezone,
        theme: user.theme,
        revision: user.preferencesRevision,
      },
    };
  });
  app.patch("/api/v1/settings", async (req) => {
    const body = revisionMutation
      .extend({
        timezone: z.string().refine((t) => {
          try {
            new Intl.DateTimeFormat("en", { timeZone: t });
            return true;
          } catch {
            return false;
          }
        }, "Unknown timezone"),
        theme: z.enum(["light", "dark", "system"]),
      })
      .strict()
      .parse(req.body);
    return {
      data: await mutate(
        req.ownerId,
        body.clientEventId,
        "settings",
        body,
        async (tx) => {
          const result = await tx.user.updateMany({
            where: {
              id: req.ownerId,
              preferencesRevision: body.expectedRevision,
            },
            data: {
              timezone: body.timezone,
              theme: body.theme,
              preferencesRevision: { increment: 1 },
            },
          });
          if (!result.count)
            throw new AppError(
              409,
              "REVISION_CONFLICT",
              "Settings changed on another device.",
            );
          return {
            timezone: body.timezone,
            theme: body.theme,
            revision: body.expectedRevision + 1,
          };
        },
      ),
    };
  });
  app.get("/api/v1/exports/progress", async (req, reply) => {
    const where = { userId: req.ownerId };
    const [
      attempts,
      reveals,
      lessons,
      placements,
      drafts,
      reviews,
      reviewEvents,
      notes,
      bookmarks,
      missions,
      xp,
      activity,
    ] = await Promise.all([
      db.attempt.findMany({ where }),
      db.revealEvent.findMany({ where }),
      db.lessonProgress.findMany({ where }),
      db.placementAttempt.findMany({ where }),
      db.exerciseDraft.findMany({ where }),
      db.reviewState.findMany({ where }),
      db.reviewEvent.findMany({ where }),
      db.note.findMany({ where }),
      db.bookmark.findMany({ where }),
      db.missionProgress.findMany({ where }),
      db.xpAward.findMany({ where }),
      db.activityEvent.findMany({ where }),
    ]);
    const versions = await db.contentVersion.findMany({
      where: {
        ReleaseItem_versionId: {
          some: { releaseIdRef: { ownerId: req.ownerId, state: "published" } },
        },
      },
      select: {
        id: true,
        itemId: true,
        version: true,
        masteryRevision: true,
        checksum: true,
      },
    });
    reply.header(
      "Content-Disposition",
      'attachment; filename="devpractice-progress.json"',
    );
    return progressExportSchema.parse({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        attempts,
        reveals,
        lessons,
        placements,
        drafts,
        reviews,
        reviewEvents,
        notes,
        bookmarks,
        missions,
        xp,
        activity,
        versions,
      },
    });
  });
  app.get("/api/v1/assets/:id", async (req, reply) => {
    const id = getId(req.params);
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    const releases = await db.contentRelease.findMany({
      where: { ownerId: req.ownerId, state: "published" },
      orderBy: [{ publishedAt: "asc" }, { id: "asc" }],
      select: { snapshot: true },
    });
    const { packageSchema } = await import(
      "../../../packages/contracts/src/content"
    );
    const asset = releases
      .flatMap((r) => packageSchema.parse(r.snapshot).assets)
      .find((a) => a.id === id);
    if (!asset || !user.activeReleaseId)
      throw new AppError(404, "NOT_FOUND", "Asset unavailable.");
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(asset.path);
    const { createHash } = await import("node:crypto");
    if (createHash("sha256").update(buffer).digest("hex") !== asset.checksum)
      throw new AppError(
        500,
        "ASSET_CHECKSUM",
        "Starter asset verification failed.",
      );
    reply
      .header("Content-Disposition", 'attachment; filename="' + id + '.zip"')
      .type("application/zip");
    return buffer;
  });
}
