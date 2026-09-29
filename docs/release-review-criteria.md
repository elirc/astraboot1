# Release review criteria

This is Astra's source-review and acceptance plan, not certification of pending runs. Record the V1 checkpoint before P6 implementation; verified V2 precedes P7.

## Finite V1 closure gate

1. Show an active mission on Today using existing progress.missions data, with an in-progress mission link and an empty state (the /today contract and P2-04).
2. Record successful typecheck, lint, and integrated unit/API results on final source. Preserve successful unaffected checks; a test-only correction can receive a focused rerun. Interrupted processes and absent exit codes are not passes.
3. Validate the actual V1 package version 5 and v4 mission assets: 12 chapters, 36 lessons, 108 exercises, 72 cards, 12 assessments/60 placement items, and three missions. Record reference, starter, mutant, and checksum results.
4. Complete fresh isolated mission installation, passing baselines, intended starter acceptance failures, and passing references. ZIP readability alone does not establish runnable setup. Record runtime and asset versions.
5. Complete final browser recovery/navigation, placement, principal journey, bounded runner, and 360-pixel checks. Record mobile loading measurements and actual visual inspection separately.
6. Rebuild production output after verification-mode browser work. Verify the runner harness is absent and complete production sign-in, learning, service restart, and persistence smoke on the selected Node runtime.
7. Reconcile handoff, checklist, testing, operations, content, mission, and review documents with final evidence. Freeze verified V1 and record package version, asset checksums, source identification, commands, results, and limitations.

Successful unaffected evidence does not need continual repetition. The existing 22-table backup/restore comparison is not invalidated merely by more synthetic test rows; revisit it if schema, backup, or restore behavior changes. Historical passes do not certify subsequently changed source or archives.

## A01 noncanonical URL assertion

Keep unauthenticated GET /api/v1/progress at exactly 401. For /api/v1/%70rogress, /api/v1//progress, and /api/v1/%2e/progress, accept only 401, 403, or 404, require an error payload, and reject a data property.

The 403 allowance follows inspected dependency source, not a relaxed authentication requirement. When dist/client exists, app.ts registers the static catch-all. @fastify/static 10.1.3 rejects noncanonical dot/empty path segments before static serving; its own tests expect 403 for equivalent attempts to bypass a more-specific route guard. The application preserves that status. Do not normalize requests to bypass this rejection or admit success/5xx responses to the test.

## Evidence boundaries and environment limits

- Source review describes inspected code; runtime checks establish observed behavior in their recorded environment. Screenshots, ZIP readability, passing references, and schema counts prove different things.
- Performance misses are allowed by specification section 14.3 when measurements and concrete causes are recorded. Do not mark missed targets as passed.
- Docker engine access can leave container execution unverified while local production startup and persistence are verified. Keep those claims separate.
- Hosted deployment, provider TLS, persistent hosting, and scheduled production backups require an actual destination. Missing access does not require unfinished local source or prevent expansion after the local checkpoint with explicit limitations.
- Remaining dependency advisories stay visible with assessed reachability. This is not a clean audit or penetration test.
- Browser checks and mission reports retain browser-automated and self-reported labels. No runtime LLM credential is required.

## V2/V3 chapter review

Review original content chapter by chapter against N13-N20 and D01-D10 in the specification.

- Require three substantive lessons, nine exercises, six cards, and five separately authored placement items per chapter.
- Lessons need observable objectives, clear explanations, original worked business examples, common mistakes, summaries, and checked primary references for external behavior.
- Activities must assess their stated objectives. Distractors represent plausible mistakes with answer-specific explanations. Three hints provide progressively useful guidance. Rubrics contain explicit criteria and model answers; self-assessment is labeled honestly.
- Each lesson has one recall and one transfer/debugging card. Placement covers every chapter objective, includes application/debugging, enforces critical items, and does not copy lesson exercises under new IDs.
- Runnable JS/TS references pass, starters fail meaningfully, and deliberate incorrect variants are rejected. Check boundaries and input mutation where required. V1 numerical diversity minima apply to V1; do not invent browser-function quotas for C#.
- C# execution remains local. Distinguish in-memory LINQ from EF-translated queries and explain meaningful Node/.NET differences, including cancellation and failure handling.
- Reject duplicated filler and cosmetic noun substitutions. Counts and structural validation do not establish teaching quality.

## Mission review

Every mission needs an isolated reproducible starter, lockfile or SDK pin, environment example, seed data, explicit baseline and acceptance commands, explained reference solution, and matching immutable assets. Baselines pass before implementation; acceptance checks fail for the intended missing behavior; references pass both using the actual required database and toolchain.

| Mission | Required distinguishing evidence |
| --- | --- |
| M04 | Stable search/cursor pages without duplicates under the documented fixture |
| M05 | Measured N+1 query reduction with unchanged returned behavior |
| M06 | Product, stock-movement, order quantity, and relationship invariants |
| M07 | Concurrent duplicates, request-hash mismatch, original-response replay, rollback |
| M08 | Persisted job state, injected failure, retry, no duplicate committed effects |
| M09 | ASP.NET API contract parity with the existing React frontend |
| M10 | EF projection/tracking correction, generated SQL, preserved ownership |
| M11 | Conflicting edits, concurrency-token handling, transaction rollback |
| M12 | Observable cancellation and restart/failure behavior compared with Node |

Use repeatable external-service fixtures for success, timeout, malformed response, duplicate webhook, and retry cases. Do not require paid live services. Define delivery guarantee boundaries; do not claim unspecified exactly-once execution.

## Cumulative release acceptance

| Snapshot | Chapters | Lessons | Exercises | Cards | Placement items | Missions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V1 | 12 | 36 | 108 | 72 | 60 | 3 |
| V1 + V2 | 20 | 60 | 180 | 120 | 100 | 8 |
| V1 + V2 + V3 | 30 | 90 | 270 | 180 | 150 | 12 |

Count each release's additions independently so later content cannot conceal an earlier deficit. Preserve prior item versions, attempts, notes, bookmarks, and asset downloads. Verify sequential publication, prior-release activation, synchronization, and project setup before each expansion checkpoint. Package versions advance independently of mission asset revisions.
