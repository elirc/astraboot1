import { writeFile } from "node:fs/promises";
import { createApp } from "../apps/api/src/app";
import { db } from "../apps/api/src/db";
const paths: Record<string, Record<string, unknown>> = {};
const lists = new Set([
  "/curriculum",
  "/notes",
  "/bookmarks",
  "/activity",
  "/attempts",
  "/placement-attempts",
  "/content/releases",
]);
const error = {
  description: "Request rejected; stable error code and request ID.",
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" } },
  },
};
const app = await createApp((route) => {
  if (!route.url.startsWith("/api/v1/")) return;
  const url = route.url.replace("/api/v1", "").replace(/:([A-Za-z]+)/g, "{$1}");
  for (const method of [route.method].flat()) {
    if (method === "HEAD" || method === "OPTIONS") continue;
    const mutation = method !== "GET",
      publicRoute =
        url.startsWith("/health/") ||
        ["/auth/csrf", "/auth/login"].includes(url);
    const parameters: unknown[] = [
      ...[...url.matchAll(/\{([^}]+)\}/g)].map((m) => ({
        name: m[1],
        in: "path",
        required: true,
        schema: { type: "string" },
      })),
      ...(lists.has(url)
        ? [
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              name: "cursor",
              in: "query",
              schema: { type: "string", maxLength: 500 },
            },
          ]
        : []),
    ];
    if (["/curriculum", "/notes", "/bookmarks"].includes(url))
      parameters.push({ name: "q", in: "query", schema: { type: "string" }, description: "Case-insensitive search applied before pagination." });
    if (url === "/curriculum")
      parameters.push({ name: "track", in: "query", schema: { type: "string" }, description: "Stable published track ID." });
    if (mutation) {
      parameters.push({
        name: "Origin",
        in: "header",
        required: true,
        schema: { type: "string" },
        description: "Exact application origin.",
      });
      if (!publicRoute)
        parameters.push({
          name: "X-CSRF-Token",
          in: "header",
          required: true,
          schema: { type: "string" },
          description: "Session-bound token from /auth/me.",
        });
    }
    (paths[url] ??= {})[method.toLowerCase()] = {
      operationId: method.toLowerCase() + url.replace(/[^a-zA-Z0-9]/g, "_"),
      summary: method + " " + url,
      description:
        "See docs/api.md and the application-owned Zod contracts for operation-specific input fields and revision rules.",
      security: publicRoute ? [] : [{ ownerSession: [] }],
      parameters,
      ...(mutation
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object" } } },
            },
          }
        : {}),
      responses: {
        200: {
          description:
            "Accepted. Most routes return data; export returns its versioned export envelope.",
          content: url.startsWith("/assets/")
            ? {
                "application/zip": {
                  schema: { type: "string", format: "binary" },
                },
              }
            : {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {},
                      meta: { $ref: "#/components/schemas/PageMeta" },
                    },
                  },
                },
              },
        },
        400: error,
        401: error,
        403: error,
        404: error,
        409: error,
        413: error,
        422: error,
        429: error,
        500: error,
      },
    };
  }
});
await app.ready();
await app.close();
await db.$disconnect();
await writeFile(
  "docs/openapi.json",
  JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "DevPractice private owner API",
        version: "1.0.0",
        description:
          "Generated route inventory and shared transport contract. Operation-specific Zod schemas live beside handlers; detailed examples are maintained in docs/api.md.",
      },
      servers: [{ url: "/api/v1" }],
      paths,
      components: {
        securitySchemes: {
          ownerSession: {
            type: "apiKey",
            in: "cookie",
            name: "__Host-devpractice",
            description:
              "Production HTTPS cookie. Local development uses devpractice.",
          },
        },
        schemas: {
          PageMeta: {
            type: "object",
            properties: { nextCursor: { type: ["string", "null"] } },
          },
          Error: {
            type: "object",
            required: ["error"],
            properties: {
              error: {
                type: "object",
                required: ["code", "message", "requestId"],
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                  requestId: { type: "string" },
                  fieldErrors: {},
                },
              },
            },
          },
        },
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Generated OpenAPI transport contract for " +
    Object.keys(paths).length +
    " paths.",
);
