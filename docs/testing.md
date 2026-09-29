# Verification record

V1 content is authored and validated. The final browser, current mission execution, and production restart gates remain in progress. V2/V3 implementation has not started. A historical pass does not certify a later source change.

## Current evidence

- The frozen root install and Prisma client generation passed. Checks use SHA-verified Node 24.21.0 and native PostgreSQL 18.1, with all three migrations applied to the preserved disposable database.
- Strict TypeScript and ESLint passed with recorded exit code 0. The later Today active-mission link is included in the pending final frontend checks.
- The integrated Vitest run passed 27 of 28 tests. One malformed-path assertion expected only 401/404, but patched static middleware deliberately returned 403. Astra inspected the middleware and its regression tests. The corrected assertion requires a 401/403/404 denial, an error, and no data; the canonical protected route still requires exactly 401. Both selected A01 tests passed on rerun. All 28 unique checks therefore have passing coverage across these runs; no single all-green full-suite invocation is claimed. See platform-verification.json.
- Current V1 package version 5, using mission asset revision v4, passed validation: 244 items, 12 chapters, 36 lessons, 108 exercises, 72 cards, 60 placement items and three missions. All 28 runnable references passed, 57 incorrect variants were rejected, and archive checksums matched without warnings. See content-verification.json.
- All 24 current and retained ZIP archives passed standard readability, checksum and safety checks. Rebuilding current v4 archives from unchanged inputs preserved their bytes. The external fresh reference frozen install and client generation passed; current reference and starter execution is recorded separately by the mission gate.
- The verification Vite build passed: 282 modules. The final rebuild includes the subsequent Today active-mission link. OpenAPI transport documentation was regenerated successfully.
- Backup/restore matched every row across all 22 tables, including migration history. See backup-verification.json. Additional synthetic test records do not invalidate this check.
- All 24 light/dark text, control-boundary and focus contrast pairs passed. This is token verification, not a complete accessibility certification.
- The scale benchmark used 1,002 lessons, 10,000 exercises and 10,000 attempts. After the track metadata change, current p95 is curriculum 2,195 ms, progress 10,552 ms, activity 576 ms, and lesson 967 ms. None met the 500 ms target on this shared host. Earlier measurements were lower; the unchanged progress route also slowed substantially. Raw timings, sizes and shared-host profiling limits are in performance-verification.json and performance-profile.json. Mobile cold-load measurement and visual inspection remain part of the browser gate.
- Direct Fastify/static/Router dependency advisories were addressed. Two high Prisma CLI configuration dependency advisories remain documented in dependency-verification.md; a clean dependency audit is not claimed.

Astra's asset-identity and delayed-note findings are addressed in source. The immutable-download regression passed. Changed-source browser recovery tests remain part of the final matrix. See review-v1.md and release-review-criteria.md.

## Reproduce

Use Node 24.21.0 and pnpm 10.17.1. Run `pnpm install --frozen-lockfile` and `pnpm db:generate`. Set `DATABASE_URL` and `TEST_DATABASE_URL` to the same dedicated disposable PostgreSQL database, apply migrations, then run `pnpm test`. Skipped integration suites are not persistence evidence. Synthetic records remain available for inspection.

Run `pnpm typecheck`, `pnpm lint`, and `pnpm content:validate curriculum/snapshot.json --v1`. The production import limit remains 2,000 items and 10 MiB; the scale fixture bypasses the count limit solely for read-path measurement.

For browser checks, start the API on 127.0.0.1:4310 with `APP_ORIGIN=http://127.0.0.1:5178` and the disposable database. Install Playwright browsers, then run `pnpm test:e2e`. Playwright uses one worker. `USE_EXISTING_BROWSERS=1` selects the already-installed Windows executables on this machine. The simulated 4G measurement uses Chromium CDP; the other engines skip that measurement only. No physical iPhone test is claimed.

After browser verification, run `pnpm build` to replace the verification artifact. `scripts/production-smoke.ts` requires matching disposable database variables. It starts its own production server, checks sign-in and learning, writes a note, stops and restarts the actual process, then verifies persistence with a new session. Its loopback cookie handling does not verify provider TLS. The production artifact must exclude the runner test harness.

Extract mission acceptance copies outside the platform workspace before invoking pnpm. The standalone reference declares `packages: ['.']`; mission lockfile updates also run in an isolated external directory. A previous nested install resolved the ancestor workspace and removed root dependencies. The frozen root repair completed afterward. See engineering-content-identity.md. Reference solutions must pass baseline and acceptance commands; starter acceptance must fail for its documented task while baseline passes.

## Historical evidence and limits

Before the latest recovery and dependency changes, the original durable learning journey, mobile layout and bounded runner scenarios each passed in Chromium, Firefox and WebKit across prior runs. Reference missions passed six UI and eight PostgreSQL/security tests, mock and real-HTTP phone journeys, typecheck and build. Original starters reproduced their intended failures. Those results remain historical until the relevant current reruns complete.

Interrupted processes and null exit codes are not counted as passes. PostgreSQL completed crash recovery and currently accepts connections. Container execution remains unverified: the bounded Docker probe timed out and service startup returned an OS service-access error. No hosted deployment, provider TLS, or production backup schedule has been provisioned. These environment limits are separate from local source completion.
