# Handoff

Read `product-spec.md`, then `implementation-checklist.md` and `testing.md`. This is an implemented application with a fully authored V1 curriculum; do not restart the project or repeat product discovery.

The default bootstrap seed publishes `curriculum/snapshot.json`, including all twelve chapters and three mission downloads. Authoring sources, immutable content semantics, runner constraints, and actual verification evidence are documented alongside the implementation.

The user's request covers the entire project. Complete and verify the P5 V1 exit before starting P6, then complete P6 before P7. V2 and V3 are not yet authored or implemented. Do not describe the whole Node.js/.NET curriculum as complete.

Current final gates: latest browser matrix; clean archive installation; production bundle smoke; scale measurements; fresh backup/restore after final migrations; final formatting and documentation. Hosting-provider deployment needs a supplied destination/account; Docker image execution has not been verified because the local engine is unavailable.

All current database test records are synthetic. The portable local database under ignored `.data` and `.tools` is a development workaround, not the production deployment. Do not commit test databases, credentials, generated clients, dependency folders, or browser traces.

## Current continuation evidence and installation boundary

The current runtime was restored with frozen pnpm dependencies and Prisma generation; all three migrations are applied. Fresh backup/restore matched all rows in 22 tables. Scale and theme-contrast measurements are complete, with documented latency target misses. Independent Astra review found asset-ID reuse and delayed quick-note data loss; fixes and regression tests are now present, pending the integrated rerun.

A mission `pnpm install --lockfile-only` run from the nested reference directory discovered the platform workspace and prompted removal of the root node_modules. Missing scoped packages were subsequently confirmed. Root frozen dependencies are being repaired again. Do not run standalone mission installs underneath the ancestor platform workspace without a verified independent workspace boundary. Extract and install in an isolated temporary directory outside the repository; copy only the intended lockfile/artifacts back. A module-removal prompt naming another project must be treated as a failed isolation check, even if the command later exits zero without progress.

Several foreground Node processes also ended without diagnostics. Current verification writes durable stdout/stderr/exit records under ignored .data/check-* through .data/run-check.ps1. A null native exit code is not a pass. Docker service startup failed with a service-access error; Node production packaging can still be verified against the real disposable PostgreSQL server.
## Current root checkpoint

Root V1 checks completed: strict TypeScript and lint exit 0; integrated unit/API 27/28 followed by corrected A01 2/2, giving passing coverage for all 28 unique checks; content package version 5 / asset revision v4 validated 244 items, 28 references, 57 rejected mutants, no warnings; OpenAPI generator exit 0. Durable records: docs/platform-verification.json and docs/content-verification.json. Current testing.md and implementation-checklist.md distinguish pending frontend/mission/production work from passed gates.

The Today active-mission link is implemented and Astra reviewed it. Frontend owns the final verification rebuild and full browser matrix with screenshot inspection. Mission owns current external reference and starter execution: migration, M03 baseline/security, typecheck and Vite passed; shared M01/M02 checks and starter execution continue. Root's heavy processes are finished. After browser completion, .data/run-check.ps1 production-build now runs a fresh incremental typecheck, production Vite build, and API bundle; then production-smoke runs real process restart/persistence. Do not overwrite dist while browser verification is active.

Git was initialized on main; no commit yet. .gitattributes preserves exact authored bytes across checkouts so immutable archive inputs are not converted. .dockerignore excludes root/nested environment variants and nested dependency trees while retaining examples. No environment secrets were added.

V2/V3 implementation remains pending the finite V1 exit gate. Astra's release-review-criteria.md and dotnet-toolchain-plan.md contain the expansion plan and primary-source toolchain evidence. The required SQL Server/T-SQL comparison is assigned substantively to D10's third lesson alongside equivalent Node/.NET design review; keep all 30 defined V3 subjects and the approved baseline counts. Optional Next.js/Angular are not baseline requirements.
## Continuation checkpoint: route completeness and database diagnosis

The database had not disappeared during the aborted browser run: native PostgreSQL PID26952 remained alive and listening on 5439. A two-second pg_isready probe timed out; a fifteen-second probe accepted connections. No database restart/reset was performed in this continuation. Test-only Prisma connect_timeout=30 is recorded for subsequent focused API verification. Preserve the isolated data directory and unrelated services.

Astra consolidated seven explicit V1 omissions before the final build: published track metadata/list, all four project filters, mission prerequisites, notebook bookmark search and associated-content navigation, draft base/current-release preview, local-only practice mission links, and configurable sign-in throttling. Sol frontend owns the six UI groups. Root implemented the supporting API metadata/search and validated LOGIN_MAX_FAILURES/LOGIN_WINDOW_MINUTES with defaults five/fifteen. Root source review is clear; six focused checks passed on Node24 with real PostgreSQL (config three plus A22/A23/A24), recorded in platform-verification.json and ignored .data/final-api.json. This is additional passing coverage, not a new single full-suite run. Final frontend typecheck/lint/browser work remains pending.

ADR0003 documents the sixty-second compiler loading allowance using a raw asset-size/bandwidth estimate, explicitly not a measured cold-load claim. Execution remains bounded separately. Mission guarded draft-v6 now passed six interface checks, including immediate list/detail cancellation, and Astra accepted the source. Mission agent is minting v6/package7, then verifying all thirty-six retained/current ZIPs and deterministic bytes. Final content validation must use that actual snapshot, replacing the earlier v4/package5 record.

V1 freeze, production rebuild/restart smoke, and final browser matrix are still pending. V2 and V3 implementation has not started. The user requested the entire project, including all thirty chapters and twelve missions; do not end at V1.

Scale rerun after track metadata completed exit0 at 2026-09-10T00:17:30Z using --reuse. All four current p95 timings miss500ms: curriculum2195/progress10552/activity576/lesson967. Full raw record updated; do not reuse the earlier activity-pass statement. Unchanged routes also slowed; prior host profile is supporting context, not a new attribution measurement.
