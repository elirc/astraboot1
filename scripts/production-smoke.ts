import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { readFile, writeFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import argon2 from "argon2";
import { db } from "../apps/api/src/db";
import { passwordOptions } from "../apps/api/src/auth";
import { importPackage, publish } from "../apps/api/src/content";
import { packageSchema } from "../packages/contracts/src/content";
if (
  !process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
)
  throw new Error("Explicit matching disposable test database required.");
if (!new URL(process.env.TEST_DATABASE_URL).pathname.includes("_test"))
  throw new Error("Disposable database name must contain _test.");
assert.equal(
  await access("dist/client/runner-test.html").then(
    () => true,
    () => false,
  ),
  false,
  "Production artifact must exclude the runner test harness.",
);
const fixture = packageSchema.parse(
  JSON.parse(await readFile("curriculum/fixtures/chapter-01.json", "utf8")),
);
const prefix = "production-" + randomUUID().slice(0, 8) + "-";
const ids = new Set(
  fixture.items.flatMap((item) => [
    item.id,
    ...(item.kind === "assessment" ? item.items.map((i) => i.id) : []),
  ]),
);
function rewrite(value: unknown): unknown {
  if (typeof value === "string") return ids.has(value) ? prefix + value : value;
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, rewrite(v)]),
    );
  return value;
}
const pkg = packageSchema.parse({
  ...(rewrite(fixture) as object),
  packageId: prefix + fixture.packageId,
});
const lesson = pkg.items.find((item) => item.id === prefix + "v1-l01");
assert(lesson?.kind === "lesson");
const socket = createServer();
await new Promise<void>((resolve) => socket.listen(0, "127.0.0.1", resolve));
const port = (socket.address() as { port: number }).port;
await new Promise<void>((resolve, reject) =>
  socket.close((error) => (error ? reject(error) : resolve())),
);
const origin = "https://devpractice.example.test",
  base = "http://127.0.0.1:" + port;
const email = prefix + "@example.test",
  password = randomUUID() + randomUUID();
const owner = await db.user.create({
  data: {
    normalizedEmail: email,
    passwordHash: await argon2.hash(password, passwordOptions),
  },
});
await db.$transaction(
  async (tx) => {
    const release = await importPackage(tx, owner.id, pkg);
    await publish(tx, owner.id, release.id, release.checksum);
  },
  { timeout: 120000 },
);
let child: ChildProcess | undefined;
let childErrors = "";
async function start() {
  child = spawn(process.execPath, ["dist/server/main.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      APP_ORIGIN: origin,
      LOG_LEVEL: "warn",
    },
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
  child.stderr?.on("data", (chunk) => {
    childErrors = (childErrors + String(chunk)).slice(-16000);
  });
  for (let n = 0; n < 180; n++) {
    if (child.exitCode !== null)
      throw new Error("Production service exited: " + childErrors);
    try {
      const response = await fetch(base + "/api/v1/health/ready");
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error("Production readiness timed out: " + childErrors);
}
async function stop() {
  const current = child;
  if (!current || current.exitCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Production child did not stop")),
      15000,
    );
    current.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    current.kill();
  });
  child = undefined;
}
async function signIn() {
  const pre = await fetch(base + "/api/v1/auth/csrf");
  assert.equal(pre.status, 200);
  const preCookie = pre.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const preBody = (await pre.json()) as { data: { csrfToken: string } };
  const response = await fetch(base + "/api/v1/auth/login", {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: preCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      csrfToken: preBody.data.csrfToken,
    }),
  });
  assert.equal(response.status, 200);
  const sessionCookie = response.headers
    .getSetCookie()
    .find((c) => c.startsWith("__Host-devpractice="));
  assert(sessionCookie);
  for (const attribute of ["Secure", "HttpOnly", "Path=/", "SameSite=Lax"])
    assert(sessionCookie.includes(attribute), attribute);
  const session = (await response.json()) as { data: { csrfToken: string } };
  return {
    Origin: origin,
    Cookie: sessionCookie.split(";")[0]!,
    "Content-Type": "application/json",
    "X-CSRF-Token": session.data.csrfToken,
  };
}
async function post(
  route: string,
  headers: Record<string, string>,
  body: object,
) {
  const response = await fetch(base + "/api/v1" + route, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}
try {
  await start();
  const root = await fetch(base + "/");
  assert.equal(root.status, 200);
  assert.match(await root.text(), /id="root"/);
  assert.match(
    root.headers.get("content-security-policy") ?? "",
    /frame-ancestors 'none'/,
  );
  const headers = await signIn();
  for (const exerciseId of lesson.exerciseIds) {
    const item = pkg.items.find((i) => i.id === exerciseId);
    assert(item?.kind === "exercise");
    const response = await fetch(base + "/api/v1/exercises/" + exerciseId, {
      headers,
    });
    assert.equal(response.status, 200);
    const version = (await response.json()) as { data: { versionId: string } };
    assert(
      item.grading.kind === "choice" || item.grading.kind === "rubric",
      "Smoke fixture uses objective and rubric activities",
    );
    const answer =
      item.grading.kind === "choice"
        ? item.grading.correctIds
        : item.grading.modelAnswer;
    const result = await post("/attempts", headers, {
      clientEventId: randomUUID(),
      exerciseId,
      exerciseVersionId: version.data.versionId,
      answer,
      ...(item.grading.kind === "rubric" ? { selfAssessment: true } : {}),
    });
    assert.equal(result.data.passed, true);
  }
  await post("/lessons/" + lesson.id + "/complete", headers, {
    clientEventId: randomUUID(),
    readAcknowledged: true,
  });
  await post("/notes", headers, {
    clientEventId: randomUUID(),
    title: "Production smoke",
    body: "Synthetic persistence check",
    contentItemId: lesson.id,
  });
  await stop();
  await start();
  const newSession = await signIn();
  assert.notEqual(newSession.Cookie, headers.Cookie);
  const progress = await fetch(base + "/api/v1/progress", {
    headers: newSession,
  });
  assert.equal(progress.status, 200);
  const progressBody = (await progress.json()) as {
    data: { lessons: { lessonId: string; status: string }[]; totalXP: number };
  };
  assert.equal(
    progressBody.data.lessons.find((l) => l.lessonId === lesson.id)?.status,
    "completed",
  );
  assert.equal(progressBody.data.totalXP, 50);
  const notes = await fetch(base + "/api/v1/notes", { headers: newSession });
  assert.equal(notes.status, 200);
  assert(
    ((await notes.json()) as { data: { title: string }[] }).data.some(
      (n) => n.title === "Production smoke",
    ),
  );
  assert.equal(notes.headers.get("cache-control"), "no-store");
  await post("/auth/logout", newSession, {});
  assert.equal(
    (await fetch(base + "/api/v1/notes", { headers: newSession })).status,
    401,
  );
  await writeFile(
    "docs/production-verification.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        node: process.version,
        mode: "production",
        artifact: "dist/server/main.js + dist/client",
        checks: [
          "readiness with real PostgreSQL",
          "static frontend and CSP",
          "runner test harness excluded",
          "owner login and Secure HttpOnly __Host session cookie",
          "objective and rubric attempts",
          "lesson completion and 50 XP",
          "CSRF-protected note persistence",
          "actual child process stop and restart",
          "fresh owner session retains completed lesson, XP, and note",
          "no-store API responses",
          "logout revocation",
        ],
        limits: [
          "Loopback HTTP transport with explicit cookie handling; TLS termination and hosting-provider deployment were not exercised.",
        ],
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Production bundle, service restart, and persisted learning smoke passed.",
  );
} finally {
  await stop();
  await db.$disconnect();
}
