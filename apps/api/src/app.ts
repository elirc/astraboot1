import Fastify, { type RouteOptions } from "fastify";
import fastifyStatic from "@fastify/static";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { ZodError } from "zod";
import { auth } from "./auth";
import { contentRoutes } from "./content";
import { learningRoutes } from "./learning";
import { personalRoutes } from "./personal";
import { db, AppError } from "./db";
export async function createApp(onRoute?: (route: RouteOptions) => void) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      redact: [
        "req.headers.cookie",
        "req.headers.authorization",
        "req.headers.x-csrf-token",
      ],
    },
    bodyLimit: 100000,
  });
  if (onRoute) app.addHook("onRoute", onRoute);
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({
          error: {
            code: "INVALID_INPUT",
            message: "Check the submitted fields.",
            fieldErrors: error.flatten(),
            requestId: req.id,
          },
        });
    if (error instanceof AppError)
      return reply
        .code(error.status)
        .send({
          error: {
            code: error.code,
            message: error.message,
            fieldErrors: error.details,
            requestId: req.id,
          },
        });
    const candidate =
      error instanceof Error && "statusCode" in error
        ? error.statusCode
        : undefined;
    const status =
      typeof candidate === "number" &&
      Number.isInteger(candidate) &&
      candidate >= 400 &&
      candidate <= 599
        ? candidate
        : 500;
    req.log.error(
      {
        err:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : { name: "UnknownError", message: "Non-Error thrown" },
        requestId: req.id,
      },
      "Request failed",
    );
    return reply
      .code(status)
      .send({
        error: {
          code: status === 413 ? "TOO_LARGE" : "SERVER_ERROR",
          message:
            status === 413
              ? "Upload exceeds the size limit."
              : "The request could not be completed.",
          requestId: req.id,
        },
      });
  });
  app.addHook("onSend", async (req, reply, payload) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "same-origin")
      .header("X-Frame-Options", "DENY")
      .header(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      );
    if (req.url.startsWith("/api")) reply.header("Cache-Control", "no-store");
    return payload;
  });
  app.get("/api/v1/health/live", async () => ({ data: { status: "ok" } }));
  app.get("/api/v1/health/ready", async () => {
    await db.$queryRaw`SELECT 1`;
    return { data: { status: "ok" } };
  });
  await auth(app);
  await contentRoutes(app);
  await learningRoutes(app);
  await personalRoutes(app);
  const client = resolve("dist/client");
  if (existsSync(client)) {
    await app.register(fastifyStatic, { root: client });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api")
        ? reply
            .code(404)
            .send({
              error: {
                code: "NOT_FOUND",
                message: "Route unavailable.",
                requestId: req.id,
              },
            })
        : reply.sendFile("index.html"),
    );
  }
  return app;
}
