# DevPractice

A private web-development learning workspace built with React, TypeScript, Fastify, PostgreSQL, and an isolated QuickJS browser runner. Normal use needs no AI API key.

The authored V1 course contains **12 chapters, 36 lessons, 108 exercises, 72 review cards, 60 placement items, and 3 downloadable project missions**. The current V1 package passes content validation: 28 runnable solutions and 57 rejected incorrect variants, with verified archive checksums. All 28 unique unit/API checks have passing coverage across the integrated run and focused assertion-correction rerun; TypeScript and lint pass. Final release verification is tracked in [the checklist](docs/implementation-checklist.md); deeper Node.js (V2) and C#/.NET (V3) are still pending.

## Start locally

Use Node 24 LTS and pnpm 10.17.1. The checked-in lockfile pins dependencies. Local checks also ran on Node 22.16.0. On Windows use `pnpm.cmd` when PowerShell blocks script shims.

1. Copy `.env.example` to `.env` and review its local configuration.
2. Run `pnpm install --frozen-lockfile`.
3. Run `docker compose up -d db`, or provide an existing PostgreSQL database in `DATABASE_URL`.
4. Run `pnpm db:generate`, then `pnpm db:migrate`.
5. Run `pnpm owner:create`. Enter your email and a password of at least 12 characters. Password entry is hidden. There is no public signup.
6. Run `pnpm db:seed` to publish the complete V1 snapshot and register its packaged mission assets.
7. Run `pnpm build`, then `pnpm start`. Open **http://localhost:4310** and sign in.

For hot reload use `pnpm dev` and **http://127.0.0.1:5178**. The launcher sets the matching API origin. Production requires HTTPS and an exact `APP_ORIGIN`.

The initial seed targets the bootstrap owner. On a database that already has a published course, use Content → Import to preview a new snapshot with the current `baseReleaseId`, then publish. Importing a partial chapter does not append it automatically.

## What works

- Private owner sessions, CSRF protection, session recovery, and password reset/revocation commands.
- Chapter navigation, lesson reading, objective/rubric exercises, bounded JavaScript and type-checked TypeScript practice.
- Autosaved code with revision conflicts and recoverable snapshots; notes, bookmarks, and timezone/theme preferences.
- Separate completion, placement, assistance, concept evidence, spaced review, and idempotent XP.
- Validated content preview, atomic publication, immutable versions, archived records, and prior-release activation.
- Three support-ticket missions with versioned starter/reference ZIPs, tests, checklists, and self-reported completion.
- Paginated history and content lists, portable JSON export, database-backed persistence.

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm typecheck && pnpm lint` | Static verification |
| `pnpm test` | Unit tests; API suites run when test DB variables are set |
| `pnpm content:validate curriculum/snapshot.json --v1` | Validate V1 content, solutions, mutants, and asset checksums |
| `pnpm content:assemble` | Rebuild mission archives and assemble authored V1 chapters |
| `pnpm test:e2e` | Build the verification harness and run browser acceptance |
| `pnpm api:docs` | Regenerate the OpenAPI route/transport contract |
| `pnpm owner:reset` | Reset owner password and revoke all sessions |
| `pnpm maintenance` | Remove expired sessions while retaining learning history |

See [testing](docs/testing.md), [content authoring](docs/content-authoring.md), [operations](docs/operations.md), [codebase tour](docs/codebase-tour.md), and [handoff](docs/handoff.md). The complete requested specification is preserved in [product-spec.md](docs/product-spec.md).

Docker configuration is provided. Container execution remains unverified in this environment. Current database acceptance uses real PostgreSQL 18.1 on Windows; earlier checks used 18.4. No hosted deployment has been provisioned.
