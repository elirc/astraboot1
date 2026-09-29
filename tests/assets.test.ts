import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createApp } from "../apps/api/src/app";
import { db, hash } from "../apps/api/src/db";
import {
  packageSchema,
  validatePackage,
} from "../packages/contracts/src/content";

const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;
integration("immutable published downloads", () => {
  it("rejects duplicate or reassigned asset IDs and retains archived downloads", async () => {
    if (
      process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL ||
      !new URL(process.env.TEST_DATABASE_URL!).pathname.includes("_test")
    )
      throw new Error("Dedicated disposable test database required.");
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.LOG_LEVEL = "warn";
    const app = await createApp();
    try {
      const suffix = randomUUID().slice(0, 8);
      const owner = await db.user.create({
        data: {
          normalizedEmail: "assets-" + suffix + "@example.test",
          passwordHash: "synthetic-session-only",
        },
      });
      const token = randomUUID(),
        csrf = randomUUID();
      await db.session.create({
        data: {
          userId: owner.id,
          tokenHash: hash(token),
          csrfSecret: csrf,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const request = (route: string, body?: object) =>
        app.inject({
          method: body ? "POST" : "GET",
          url: "/api/v1" + route,
          headers: {
            cookie: "devpractice=" + token,
            origin: "http://localhost:3000",
            "x-csrf-token": csrf,
          },
          ...(body ? { payload: body } : {}),
        });
      const manifest = JSON.parse(
        await readFile("projects/support-desk/releases/manifest.json", "utf8"),
      ) as { assets: { id: string; path: string; checksum: string }[] };
      const asset = { ...manifest.assets[0]!, id: "asset-" + suffix };
      const pkg = packageSchema.parse(
        JSON.parse(
          await readFile("curriculum/fixtures/chapter-01.json", "utf8"),
        ),
      );
      pkg.packageId = "asset-test-" + suffix;
      pkg.assets = [asset];
      const publishPackage = async (
        version: number,
        assets: typeof pkg.assets,
      ) => {
        const active = (
          await db.user.findUniqueOrThrow({ where: { id: owner.id } })
        ).activeReleaseId;
        const next = {
          ...pkg,
          packageVersion: version,
          baseReleaseId: active,
          assets,
        };
        const imported = await request("/content/imports", {
          clientEventId: randomUUID(),
          package: next,
        });
        expect(imported.statusCode, imported.body).toBe(200);
        return request(
          "/content/imports/" + imported.json().data.id + "/publish",
          {
            clientEventId: randomUUID(),
            checksum: imported.json().data.checksum,
          },
        );
      };
      const initial = await publishPackage(1, [asset]);
      expect(initial.statusCode, initial.body).toBe(200);
      const original = await request("/assets/" + asset.id);
      expect(original.statusCode, original.body).toBe(200);
      const duplicate = { ...pkg, packageVersion: 2, assets: [asset, asset] };
      expect(packageSchema.safeParse(duplicate).success).toBe(false);
      expect(validatePackage(duplicate).ok).toBe(false);
      expect(
        (
          await request("/content/imports", {
            clientEventId: randomUUID(),
            package: duplicate,
          })
        ).statusCode,
      ).toBe(422);
      for (const [index, changed] of [
        { ...asset, checksum: "0".repeat(64) },
        { ...asset, path: "assets/reassigned.zip" },
      ].entries()) {
        const rejected = await publishPackage(index + 2, [changed]);
        expect(rejected.statusCode, rejected.body).toBe(409);
        expect(rejected.json().error.code).toBe("ASSET_VERSION_CONFLICT");
        expect(
          (await db.user.findUniqueOrThrow({ where: { id: owner.id } }))
            .activeReleaseId,
        ).toBe(initial.json().data.releaseId);
      }
      expect((await publishPackage(4, [asset])).statusCode).toBe(200);
      expect((await publishPackage(5, [])).statusCode).toBe(200);
      const archived = await request("/assets/" + asset.id);
      expect(archived.statusCode, archived.body).toBe(200);
      expect(archived.rawPayload.equals(original.rawPayload)).toBe(true);
    } finally {
      await app.close();
      await db.$disconnect();
    }
  }, 180000);
});
