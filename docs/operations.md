# Operations

The deployment shape is one Node web service plus PostgreSQL. The Dockerfile serves the built React app and API together. Use HTTPS via the hosting provider or a reverse proxy. No hosting account or paid infrastructure has been provisioned.

## Configuration

NODE_ENV=production enables Secure __Host-devpractice session cookies. APP_ORIGIN must exactly match the external HTTPS origin. PORT defaults to 4310 locally; the container explicitly uses 3000. DATABASE_URL is server-only. LOG_LEVEL controls structured request logs. SESSION_ABSOLUTE_DAYS and SESSION_IDLE_DAYS default to 30 and 7. LOGIN_MAX_FAILURES defaults to 5 and LOGIN_WINDOW_MINUTES to 15; both account and source-address buckets enforce the configured limit. Values must be whole numbers (1-1000 failures, 1-1440 minutes); invalid values prevent startup. Limits are read at service startup and counters are in memory for this single-service deployment. Import limit is currently fixed at 10 MiB in the route; runner bounds are in packages/runner/src/index.ts.

Keep database credentials, owner passwords, cookies and CSRF secrets outside client bundles and version control. The local test password belongs only to a loopback disposable database.

## Release

Run formatting, lint, typecheck, unit tests, PostgreSQL acceptance, browser checks, content validation and build. Verify exact V1 counts with --v1. Build the image, back up the database, apply pnpm db:migrate, then start the service and check /api/v1/health/ready plus owner sign-in and the principal learning journey. Record image version, migration and active content release.

A prior content release can be activated in Content without deleting later attempts. Application rollback is safe only when the old application supports the migrated schema. Restoring a database backup is a separate recovery operation that can discard newer records.

## Backup and restore

Schedule pg_dump --format=custom daily; keep at least seven daily backups outside the app container. Back up immutable starter assets with their checksums. Use injected PostgreSQL environment variables, not passwords in shell arguments.

Restore into a **new empty database** with pg_restore --no-owner. Verify schema migration history, table counts and foreign-key integrity. Configure application secrets, start the service, and verify owner login and the active release. Test recovery before relying on the 24-hour recovery point / four-hour recovery time targets. JSON progress export is portability, not a replacement for a database backup.

## Verified local environment

Docker Desktop is installed, but container engine readiness has not yet been established. Integration checks use an isolated real PostgreSQL database bound to 127.0.0.1:5439 with synthetic records under ignored `.data/postgres-test`. Earlier checks used the portable PostgreSQL 18.4 runtime from `embedded-postgres`; the current preserved data directory is running PostgreSQL 18.1 from the installed PostgreSQL 18 binaries. `compose.yaml` retains PostgreSQL 17.6 as its documented baseline; it has not been verified in this environment.

Node 24.21.0 was downloaded from the official distribution and verified against its SHA256 manifest. All three Prisma migrations are applied to the disposable database. `scripts/verify-backup.mjs` exports a repeatable-read snapshot, restores into a new database, and compares every row across all 22 public tables; the fresh check passed and is recorded in `backup-verification.json`. The check does not overwrite the source database.

The 1,002-lesson/10,000-exercise scale fixture runs read benchmarks outside the V1 import cap. The latest p95 measurements exceed the 500 ms goal for all four measured routes: curriculum 2,195 ms, progress 10,552 ms, activity 576 ms, and lesson 967 ms. `performance-verification.json` records exact response sizes and timings, and `performance-profile.json` records database round trips and event-loop delay on the heavily shared Windows host. These are measured limits, not hosted performance guarantees.

Keep these synthetic test credentials and database files out of version control. A real owner deployment uses its own database, secrets, backups and HTTPS origin. No hosted service or paid infrastructure has been provisioned.