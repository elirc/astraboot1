import type { FastifyInstance, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import argon2 from "argon2";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db, hash, AppError } from "./db";
import { loginThrottleConfig } from "./config";
const secret = () => randomBytes(32).toString("hex");
export const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
const production = process.env.NODE_ENV === "production";
export const cookieName = production
  ? "__Host-devpractice"
  : process.env.AUTH_COOKIE_NAME || "devpractice";
const options = {
  path: "/",
  httpOnly: true,
  secure: production,
  sameSite: "lax" as const,
};
const origin = () => process.env.APP_ORIGIN || "http://localhost:4310";
const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
declare module "fastify" {
  interface FastifyRequest {
    ownerId: string;
    sessionId: string;
    csrfToken: string;
  }
}
export async function auth(app: FastifyInstance) {
  const throttle = loginThrottleConfig(process.env);
  await app.register(cookie);
  app.decorateRequest("ownerId", "");
  app.decorateRequest("sessionId", "");
  app.decorateRequest("csrfToken", "");
  const preSessions = new Map<string, { token: string; expires: number }>();
  const failures = new Map<string, { count: number; expires: number }>();
  const dummy = await argon2.hash(secret(), passwordOptions);
  app.addHook("preHandler", async (req) => {
    const pathname = req.routeOptions.url;
    if (
      typeof pathname !== "string" ||
      !pathname.startsWith("/api/v1") ||
      ["/api/v1/health/live", "/api/v1/health/ready"].includes(pathname) ||
      ["/api/v1/auth/csrf", "/api/v1/auth/login"].includes(pathname)
    )
      return;
    const token = req.cookies[cookieName];
    const session = token
      ? await db.session.findUnique({ where: { tokenHash: hash(token) } })
      : null;
    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      now.getTime() - session.lastSeenAt.getTime() >
        Number(process.env.SESSION_IDLE_DAYS || 7) * 86400000
    )
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Sign in to continue. Your unsaved work remains in this tab.",
      );
    req.ownerId = session.userId;
    req.sessionId = session.id;
    req.csrfToken = session.csrfSecret;
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      checkOrigin(req);
      if (
        !safeEqual(
          String(req.headers["x-csrf-token"] ?? ""),
          session.csrfSecret,
        )
      )
        throw new AppError(
          403,
          "CSRF_REJECTED",
          "Refresh your session and try again.",
        );
    }
    if (now.getTime() - session.lastSeenAt.getTime() > 300000)
      await db.session.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
  });
  app.get("/api/v1/auth/csrf", async (_req, reply) => {
    const now = Date.now();
    for (const [id, p] of preSessions)
      if (p.expires < now) preSessions.delete(id);
    if (preSessions.size > 10000) preSessions.clear();
    const id = secret(),
      token = secret();
    preSessions.set(id, { token, expires: now + 600000 });
    reply.setCookie("devpractice-pre", id, { ...options, maxAge: 600 });
    return { data: { csrfToken: token } };
  });
  app.post("/api/v1/auth/login", async (req, reply) => {
    checkOrigin(req);
    const body = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(1).max(1024),
        csrfToken: z.string().length(64),
      })
      .strict()
      .parse(req.body);
    const preId = req.cookies["devpractice-pre"] ?? "";
    const pre = preSessions.get(preId);
    if (
      !pre ||
      pre.expires < Date.now() ||
      !safeEqual(pre.token, body.csrfToken)
    )
      throw new AppError(
        403,
        "CSRF_REJECTED",
        "Refresh sign-in and try again.",
      );
    const email = body.email.trim().toLowerCase();
    const keys = ["email:" + email, "address:" + req.ip];
    const now = Date.now();
    for (const [key, f] of failures) if (f.expires < now) failures.delete(key);
    if (keys.some((k) => (failures.get(k)?.count ?? 0) >= throttle.maxFailures))
      throw new AppError(
        429,
        "RATE_LIMITED",
        "Too many sign-in attempts. Wait for the sign-in window to expire and try again.",
      );
    const user = await db.user.findUnique({
      where: { normalizedEmail: email },
    });
    const valid = await argon2.verify(
      user?.passwordHash ?? dummy,
      body.password,
    );
    if (!user || !valid) {
      for (const key of keys) {
        const prior = failures.get(key);
        failures.set(key, {
          count: (prior?.count ?? 0) + 1,
          expires: prior?.expires ?? now + throttle.windowMs,
        });
      }
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    }
    preSessions.delete(preId);
    keys.forEach((k) => failures.delete(k));
    const token = secret(),
      csrfSecret = secret();
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: hash(token),
        csrfSecret,
        expiresAt: new Date(
          now + Number(process.env.SESSION_ABSOLUTE_DAYS || 30) * 86400000,
        ),
      },
    });
    reply
      .setCookie(cookieName, token, { ...options, maxAge: 30 * 86400 })
      .clearCookie("devpractice-pre", { path: "/" });
    return {
      data: { id: user.id, email: user.normalizedEmail, csrfToken: csrfSecret },
    };
  });
  app.get("/api/v1/auth/me", async (req) => {
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    return {
      data: {
        id: user.id,
        email: user.normalizedEmail,
        theme: user.theme,
        timezone: user.timezone,
        csrfToken: req.csrfToken,
      },
    };
  });
  app.post("/api/v1/auth/logout", async (req, reply) => {
    await db.session.update({
      where: { id: req.sessionId },
      data: { revokedAt: new Date() },
    });
    reply.clearCookie(cookieName, { path: "/" });
    return { data: { ok: true } };
  });
  app.post("/api/v1/auth/revoke-all", async (req, reply) => {
    const { password } = z
      .object({ password: z.string().max(1024) })
      .strict()
      .parse(req.body);
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.ownerId },
    });
    if (!(await argon2.verify(user.passwordHash, password)))
      throw new AppError(401, "INVALID_CREDENTIALS", "Password is incorrect.");
    await db.session.updateMany({
      where: { userId: req.ownerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    reply.clearCookie(cookieName, { path: "/" });
    return { data: { ok: true } };
  });
}
function checkOrigin(req: FastifyRequest) {
  if (req.headers.origin !== origin())
    throw new AppError(
      403,
      "ORIGIN_REJECTED",
      "This request did not come from the application.",
    );
}
