import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
import { passwordOptions } from "../apps/api/src/auth";
import { progressExportSchema } from "../apps/api/src/personal";
import { importPackage, publish } from "../apps/api/src/content";
import {
  packageSchema,
  type ContentPackage,
} from "../packages/contracts/src/content";
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration("PostgreSQL API acceptance", () => {
  let app: FastifyInstance;
  let ownerId: string;
  let otherId: string;
  let cookie = "";
  let csrf = "";
  let otherCookie = "";
  let otherCsrf = "";
  let pkg: ContentPackage;
  const email = "owner-" + randomUUID() + "@example.test";
  const otherEmail = "other-" + randomUUID() + "@example.test";
  const password = "Synthetic-test-password-739!";
  const call = (
    path: string,
    body?: object,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = body ? "POST" : "GET",
    foreign = false,
  ) =>
    app.inject({
      method,
      url: "/api/v1" + path,
      headers: {
        cookie: foreign ? otherCookie : cookie,
        origin: "http://localhost:3000",
        "x-csrf-token": foreign ? otherCsrf : csrf,
      },
      ...(body ? { payload: body } : {}),
    });
  async function login(email: string) {
    const pre = await app.inject({ url: "/api/v1/auth/csrf" });
    const preCookie = pre.cookies.map((c) => c.name + "=" + c.value).join("; ");
    const result = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { origin: "http://localhost:3000", cookie: preCookie },
      payload: { email, password, csrfToken: pre.json().data.csrfToken },
    });
    expect(result.statusCode).toBe(200);
    return {
      cookie: result.cookies
        .filter((c) => c.name === "devpractice")
        .map((c) => c.name + "=" + c.value)
        .join("; "),
      csrf: result.json().data.csrfToken,
    };
  }
  beforeAll(async () => {
    if (process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL)
      throw new Error(
        "Set DATABASE_URL to the dedicated TEST_DATABASE_URL. Tests never target the owner database.",
      );
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.LOG_LEVEL = "silent";
    app = await createApp();
    pkg = packageSchema.parse(
      JSON.parse(await readFile("curriculum/fixtures/chapter-01.json", "utf8")),
    );
    const passwordHash = await argon2.hash(password, passwordOptions);
    ownerId = (
      await db.user.create({ data: { normalizedEmail: email, passwordHash } })
    ).id;
    otherId = (
      await db.user.create({
        data: { normalizedEmail: otherEmail, passwordHash },
      })
    ).id;
    for (const id of [ownerId, otherId])
      await db.$transaction(
        async (tx) => {
          const release = await importPackage(tx, id, pkg);
          await publish(tx, id, release.id, release.checksum);
        },
        { timeout: 60000 },
      );
    ({ cookie, csrf } = await login(email));
    const other = await login(otherEmail);
    otherCookie = other.cookie;
    otherCsrf = other.csrf;
  }, 120000);
  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
  });
  it("A01 rejects unauthenticated and cross-owner note changes and CSRF", async () => {
    expect((await app.inject({ url: "/api/v1/progress" })).statusCode).toBe(
      401,
    );
    for (const url of [
      "/api/v1/%70rogress",
      "/api/v1//progress",
      "/api/v1/%2e/progress",
    ]) {
      const response = await app.inject({ url });
      /* Static middleware also rejects noncanonical paths with 403 before serving a file. */ expect(
        [401, 403, 404],
        url,
      ).toContain(response.statusCode);
      expect(response.json()).toHaveProperty("error");
      expect(response.json()).not.toHaveProperty("data");
    }
    const n = await call("/notes", {
      clientEventId: randomUUID(),
      title: "Owner note",
      body: "Private thinking",
      contentItemId: "v1-l01",
    });
    expect(n.statusCode).toBe(200);
    expect(
      (
        await call(
          "/notes/" + n.json().data.id,
          {
            clientEventId: randomUUID(),
            expectedRevision: 1,
            body: "Cross-owner edit",
          },
          "PATCH",
          true,
        )
      ).statusCode,
    ).toBe(404);
    const wrong = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: { cookie, origin: "http://evil.example", "x-csrf-token": csrf },
      payload: { clientEventId: randomUUID(), title: "X", body: "X" },
    });
    expect(wrong.statusCode).toBe(403);
  });
  it("A01 scopes drafts, attempts, and imports to the owner", async () => {
    const draftExercise = (await call("/exercises/v1-l01-e2")).json().data;
    expect(
      (
        await call(
          "/drafts/v1-l01-e2",
          {
            clientEventId: randomUUID(),
            contentVersionId: draftExercise.versionId,
            expectedRevision: 0,
            source: "owner-only draft",
          },
          "PUT",
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (await call("/drafts/v1-l01-e2", undefined, "GET", true)).json().data,
    ).toBeNull();
    const exercise = (await call("/exercises/v1-l01-e1")).json().data;
    const ownerAttempt = await call("/attempts", {
      clientEventId: randomUUID(),
      exerciseId: exercise.id,
      exerciseVersionId: exercise.versionId,
      answer: ["option-1"],
    });
    expect(ownerAttempt.statusCode).toBe(200);
    const ownerAttemptId = ownerAttempt.json().data.id;
    const before = await db.attempt.count({ where: { userId: ownerId } });
    const foreignAttempt = await call(
      "/attempts",
      {
        clientEventId: randomUUID(),
        exerciseId: exercise.id,
        exerciseVersionId: exercise.versionId,
        answer: ["option-1"],
      },
      "POST",
      true,
    );
    expect(foreignAttempt.statusCode).toBe(200);
    expect(await db.attempt.count({ where: { userId: ownerId } })).toBe(before);
    expect(
      (await call("/attempts", undefined, "GET", true))
        .json()
        .data.some((attempt: { id: string }) => attempt.id === ownerAttemptId),
    ).toBe(false);
    const release = await db.contentRelease.findFirstOrThrow({
      where: { ownerId },
    });
    expect(
      (await call("/content/imports/" + release.id, undefined, "GET", true))
        .statusCode,
    ).toBe(404);
  });
  it("A03 idempotency replays once and detects payload mismatch", async () => {
    const version = (await call("/exercises/v1-l01-e1")).json().data.versionId;
    const body = {
      clientEventId: randomUUID(),
      exerciseId: "v1-l01-e1",
      exerciseVersionId: version,
      answer: ["option-1"],
    };
    const [a, b] = await Promise.all([
      call("/attempts", body),
      call("/attempts", body),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.json()).toEqual(a.json());
    expect(
      await db.attempt.count({
        where: { userId: ownerId, clientEventId: body.clientEventId },
      }),
    ).toBe(1);
    expect(
      await db.xpAward.count({
        where: { userId: ownerId, awardKey: "exercise:v1-l01-e1:1" },
      }),
    ).toBe(1);
    expect(
      (await call("/attempts", { ...body, answer: ["option-2"] })).statusCode,
    ).toBe(409);
  });
  it("A04 conflicts preserve current draft and the local payload", async () => {
    const version = (await call("/exercises/v1-l01-e1")).json().data.versionId;
    const base = { contentVersionId: version, expectedRevision: 0 };
    const a = await call(
      "/drafts/v1-l01-e1",
      { ...base, clientEventId: randomUUID(), source: "device A" },
      "PUT",
    );
    expect(a.statusCode).toBe(200);
    const b = await call(
      "/drafts/v1-l01-e1",
      { ...base, clientEventId: randomUUID(), source: "device B" },
      "PUT",
    );
    expect(b.statusCode).toBe(409);
    expect(b.json().error.fieldErrors.source).toBe("device A");
    expect((await call("/drafts/v1-l01-e1")).json().data.source).toBe(
      "device A",
    );
  });
  it("A06 solution assistance survives later independent-looking attempts", async () => {
    const ex = (await call("/exercises/v1-l01-e2")).json().data;
    await call("/exercises/v1-l01-e2/reveals", {
      clientEventId: randomUUID(),
      versionId: ex.versionId,
      revealKind: "solution",
    });
    const result = await call("/attempts", {
      clientEventId: randomUUID(),
      exerciseId: ex.id,
      exerciseVersionId: ex.versionId,
      answer: ["option-1"],
    });
    expect(result.json().data.assistance).toBe("solution_viewed");
  });
  it("A02 lesson survives service restart and another session", async () => {
    for (const exerciseId of ["v1-l01-e1", "v1-l01-e2"]) {
      const exercise = (await call("/exercises/" + exerciseId)).json().data;
      expect(
        (
          await call("/attempts", {
            clientEventId: randomUUID(),
            exerciseId,
            exerciseVersionId: exercise.versionId,
            answer: ["option-1"],
          })
        ).statusCode,
      ).toBe(200);
    }
    const ex = (await call("/exercises/v1-l01-e3")).json().data;
    expect(
      (
        await call("/attempts", {
          clientEventId: randomUUID(),
          exerciseId: ex.id,
          exerciseVersionId: ex.versionId,
          answer:
            "The API checks the owner because a direct request bypasses the UI.",
          selfAssessment: true,
        })
      ).statusCode,
    ).toBe(200);
    const done = await call("/lessons/v1-l01/complete", {
      clientEventId: randomUUID(),
      readAcknowledged: true,
    });
    expect(done.statusCode, done.body).toBe(200);
    await app.close();
    app = await createApp();
    ({ cookie, csrf } = await login(email));
    const progress = await call("/progress");
    expect(progress.statusCode, progress.body).toBe(200);
    expect(
      progress
        .json()
        .data.lessons.find((l: { lessonId: string }) => l.lessonId === "v1-l01")
        .status,
    ).toBe("completed");
    await call("/lessons/v1-l01/skip", { clientEventId: randomUUID() });
    expect(
      (await call("/progress"))
        .json()
        .data.lessons.find((l: { lessonId: string }) => l.lessonId === "v1-l01")
        .status,
    ).toBe("completed");
  }, 60000);
  it("A05 one review revision schedules once and wrong answers force Again", async () => {
    await call("/lessons/v1-l02/review-cards", { clientEventId: randomUUID() });
    const card = (await call("/reviews/due"))
      .json()
      .data.find((c: { id: string }) => c.id === "v1-l02-r2");
    const body = {
      clientEventId: randomUUID(),
      versionId: card.versionId,
      expectedRevision: card.state.revision,
      rating: "Easy",
      answer: ["option-2"],
    };
    const accepted = await call("/reviews/" + card.id + "/responses", body);
    expect(accepted.json().data.appliedRating).toBe("Again");
    expect(
      (await call("/reviews/" + card.id + "/responses", body)).json(),
    ).toEqual(accepted.json());
    expect(
      (
        await call("/reviews/" + card.id + "/responses", {
          ...body,
          clientEventId: randomUUID(),
        })
      ).statusCode,
    ).toBe(409);
  });
  it("A11 placement qualifies once, repeat is practice only", async () => {
    const assessment = (await call("/placements/v1-ch01")).json().data;
    const body = {
      clientEventId: randomUUID(),
      assessmentId: assessment.id,
      versionId: assessment.versionId,
      answers: Object.fromEntries(
        assessment.items.map((i: { id: string }) => [i.id, ["option-1"]]),
      ),
      browserResults: {},
    };
    expect(
      (await call("/placements/v1-ch01", body)).json().data.qualified,
    ).toBe(true);
    expect(
      (
        await call("/placements/v1-ch01", {
          ...body,
          clientEventId: randomUUID(),
        })
      ).json().data.practiceOnly,
    ).toBe(true);
  });
  it("A09/A18 editorial update preserves attempts and competing publication conflicts", async () => {
    const user = await db.user.findUniqueOrThrow({ where: { id: ownerId } });
    const next = structuredClone(pkg);
    next.packageVersion = 2;
    next.baseReleaseId = user.activeReleaseId;
    const lesson = next.items.find((i) => i.id === "v1-l01")!;
    lesson.version = 2;
    lesson.bodyMarkdown +=
      "\n\nCheck the response before changing the database.";
    const imported = (
      await call("/content/imports", {
        clientEventId: randomUUID(),
        package: next,
      })
    ).json().data;
    expect(
      (
        await call("/content/imports/" + imported.id + "/publish", {
          clientEventId: randomUUID(),
          checksum: imported.checksum,
        })
      ).statusCode,
    ).toBe(200);
    const count = await db.attempt.count({ where: { userId: ownerId } });
    const stale = { ...next, packageVersion: 3 };
    const another = (
      await call("/content/imports", {
        clientEventId: randomUUID(),
        package: stale,
      })
    ).json().data;
    expect(
      (
        await call("/content/imports/" + another.id + "/publish", {
          clientEventId: randomUUID(),
          checksum: another.checksum,
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await call("/content/releases/" + user.activeReleaseId + "/activate", {
          clientEventId: randomUUID(),
          expectedRevision: user.activeReleaseRevision + 1,
        })
      ).statusCode,
    ).toBe(200);
    expect(await db.attempt.count({ where: { userId: ownerId } })).toBe(count);
  });
  it("A15 export omits authentication material", async () => {
    const response = await call("/exports/progress");
    expect(response.statusCode).toBe(200);
    expect(progressExportSchema.parse(response.json()).schemaVersion).toBe(1);
    expect(response.body).not.toContain("passwordHash");
    expect(response.body).not.toContain("tokenHash");
    expect(response.body).not.toContain("csrfSecret");
  });

  it("A20 history pages are bounded, disjoint, and owner scoped", async () => {
    const first = await call("/attempts?limit=2");
    expect(first.statusCode).toBe(200);
    expect(first.json().data).toHaveLength(2);
    expect(first.json().data[0]).not.toHaveProperty("source");
    const cursor = first.json().meta.nextCursor;
    expect(cursor).toBeTruthy();
    const second = await call(
      "/attempts?limit=2&cursor=" + encodeURIComponent(cursor),
    );
    expect(second.statusCode).toBe(200);
    expect(
      second
        .json()
        .data.every(
          (a: { id: string }) =>
            !first.json().data.some((b: { id: string }) => b.id === a.id),
        ),
    ).toBe(true);
    expect(
      (
        await call(
          "/attempts?cursor=" + encodeURIComponent(cursor),
          undefined,
          "GET",
          true,
        )
      ).statusCode,
    ).toBe(400);
    const progress = await call("/progress?lessonId=v1-l01");
    expect(progress.statusCode).toBe(200);
    expect(progress.json().data.totalLessonCount).toBe(3);
    expect(
      progress
        .json()
        .data.exercisePasses.some(
          (a: { itemId: string }) => a.itemId === "v1-l01-e1",
        ),
    ).toBe(true);
    expect(
      progress
        .json()
        .data.concepts.some(
          (c: { independentItems: number }) => c.independentItems > 0,
        ),
    ).toBe(true);
  });
  it("A21 rejects malformed CSRF, expires sessions, and retains recovery access", async () => {
    const bad = await app.inject({
      method: "POST",
      url: "/api/v1/notes",
      headers: {
        cookie,
        origin: "http://localhost:3000",
        "x-csrf-token": "é".repeat(64),
      },
      payload: { clientEventId: randomUUID(), title: "Must fail", body: "X" },
    });
    expect(bad.statusCode).toBe(403);
    const separate = await login(email);
    const { hash } = await import("../apps/api/src/db");
    const token = separate.cookie.split("=")[1]!;
    await db.session.update({
      where: { tokenHash: hash(token) },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (
        await app.inject({
          url: "/api/v1/progress",
          headers: { cookie: separate.cookie },
        })
      ).statusCode,
    ).toBe(401);
    expect((await call("/progress")).statusCode).toBe(200);
  });
  it("A22 login throttle rejects the sixth failed attempt", async () => {
    const pre = await app.inject({ url: "/api/v1/auth/csrf" });
    const headers = {
      origin: "http://localhost:3000",
      cookie: pre.cookies.map((c) => c.name + "=" + c.value).join("; "),
    };
    for (let n = 0; n < 6; n++) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        headers,
        payload: {
          email: "absent-" + randomUUID() + "@example.test",
          password: "incorrect",
          csrfToken: pre.json().data.csrfToken,
        },
      });
      expect(response.statusCode).toBe(n === 5 ? 429 : 401);
    }
    expect((await call("/progress")).statusCode).toBe(200);
  });

  it("A23 configurable login throttling preserves account and address buckets", async () => {
    const priorLimit = process.env.LOGIN_MAX_FAILURES;
    const priorWindow = process.env.LOGIN_WINDOW_MINUTES;
    let limited: FastifyInstance | undefined;
    try {
      process.env.LOGIN_MAX_FAILURES = "2";
      process.env.LOGIN_WINDOW_MINUTES = "1";
      limited = await createApp();
      const pre = await limited.inject({ url: "/api/v1/auth/csrf" });
      const headers = {
        origin: "http://localhost:3000",
        cookie: pre.cookies.map((c) => c.name + "=" + c.value).join("; "),
      };
      const attempt = (address: string, email: string) =>
        limited!.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          remoteAddress: address,
          headers,
          payload: {
            email,
            password: "incorrect",
            csrfToken: pre.json().data.csrfToken,
          },
        });
      const absent = "throttle-" + randomUUID() + "@example.test";
      expect((await attempt("127.0.0.2", absent)).statusCode).toBe(401);
      expect((await attempt("127.0.0.3", absent)).statusCode).toBe(401);
      expect((await attempt("127.0.0.4", absent)).statusCode).toBe(429);
      for (let n = 0; n < 3; n++)
        expect(
          (await attempt("127.0.0.5", randomUUID() + "@example.test"))
            .statusCode,
        ).toBe(n === 2 ? 429 : 401);
    } finally {
      if (priorLimit === undefined) delete process.env.LOGIN_MAX_FAILURES;
      else process.env.LOGIN_MAX_FAILURES = priorLimit;
      if (priorWindow === undefined) delete process.env.LOGIN_WINDOW_MINUTES;
      else process.env.LOGIN_WINDOW_MINUTES = priorWindow;
      await limited?.close();
    }
  });

  it("A24 published tracks and notebook search work before pagination with owner-scoped links", async () => {
    const curriculum = await call("/curriculum?limit=1");
    const tracks = pkg.items.filter((i) => i.kind === "track");
    expect(
      curriculum.json().meta.tracks.map((t: { id: string }) => t.id),
    ).toEqual(tracks.map((t) => t.id));
    expect(
      (await call("/curriculum?track=unpublished-track")).json().data,
    ).toEqual([]);
    const lessons = pkg.items.filter((i) => i.kind === "lesson");
    for (const lesson of lessons)
      expect(
        (
          await call(
            "/bookmarks/" + lesson.id,
            { clientEventId: randomUUID() },
            "PUT",
          )
        ).statusCode,
      ).toBe(200);
    const first = (await call("/bookmarks?limit=1")).json();
    expect(first.data).toHaveLength(1);
    expect(first.meta.nextCursor).toBeTruthy();
    const last = lessons[lessons.length - 1]!;
    const search = (
      await call("/bookmarks?limit=1&q=" + encodeURIComponent(last.id))
    ).json();
    expect(
      search.data.map((row: { contentItemId: string }) => row.contentItemId),
    ).toEqual([last.id]);
    expect(search.data[0]).toMatchObject({
      title: last.title,
      kind: "lesson",
      archived: false,
    });
    const byTitle = (
      await call("/bookmarks?q=" + encodeURIComponent(last.title))
    ).json();
    expect(
      byTitle.data.some(
        (row: { contentItemId: string }) => row.contentItemId === last.id,
      ),
    ).toBe(true);
    expect(
      (
        await call(
          "/bookmarks?q=" + encodeURIComponent(last.id),
          undefined,
          "GET",
          true,
        )
      ).json().data,
    ).toEqual([]);
    const title = "Associated note " + randomUUID();
    await call("/notes", {
      clientEventId: randomUUID(),
      title,
      body: "Open the associated lesson.",
      contentItemId: last.id,
    });
    const note = (await call("/notes?q=" + encodeURIComponent(title))).json()
      .data[0];
    expect(note.content).toMatchObject({
      id: last.id,
      kind: "lesson",
      title: last.title,
      archived: false,
    });
    expect(
      (
        await call(
          "/notes?q=" + encodeURIComponent(title),
          undefined,
          "GET",
          true,
        )
      ).json().data,
    ).toEqual([]);
  });
});
