# Codebase tour

A pnpm monorepo: two apps, four packages, one Prisma schema. Read this map
first, then walk the two traces below — they cross every layer the map names.

- `apps/web/src`: responsive React routes, TanStack Query, CodeMirror fallback, and the worker adapter.
- `apps/api/src/auth.ts`: password verification, cookies, CSRF, and session lifecycle.
- `apps/api/src/content.ts`: content reads, validation previews, immutable publication and activation.
- `apps/api/src/learning.ts`: attempts, reveal history, completion, placement, review and evidence.
- `apps/api/src/personal.ts`: drafts, notes, bookmarks, reports, settings and export.
- `apps/api/src/db.ts`: the two helpers everything else leans on — `mutate` (idempotency receipts) and `award` (unique XP). Nineteen lines; read them before either trace.
- `packages/contracts`: fixed Zod schemas. Uploaded data never becomes executable route schemas.
- `packages/learning-core`: deterministic grading, scheduling and concept heuristics — the entire learning brain is 29 lines of pure functions in `src/index.ts`, which is why it's the most testable code in the repo.
- `packages/runner`: semantic TypeScript checking and QuickJS execution.
- `packages/content-tools`: CLI validation and snapshot assembly.
- `prisma`: schema, foreign keys, indexes and append-only content-version migration.
- `curriculum/fixtures`: the first original chapter package.

A note on reading style: the API source is written in a deliberately dense,
few-lines-per-route style (`learning.ts` holds eight routes in ~10 long
lines). When a route is hard to follow, paste it through Prettier in a
scratch buffer — the behavior is in the order of the awaits, not the layout.

## Trace 1: completing a lesson

1. **LessonPage** (apps/web) sends `POST /api/v1/lessons/:id/complete` with a
   session cookie, the CSRF token, and a `clientEventId`.
2. The route (`learning.ts`, the `lessons/:id/:action` block) parses the body
   with a **strict** Zod schema — unknown fields are rejected, not ignored.
3. `mutate(...)` in `db.ts` opens one transaction and takes a `FOR UPDATE`
   lock on the owner's `User` row. Every private-account mutation serializes
   on that row — crude, and fine for a single-user app; the comment in
   `db.ts` says so explicitly.
4. Inside the transaction, `mutate` looks up a `MutationReceipt` for this
   `clientEventId`. If one exists with the same request hash, the stored
   response is replayed — a retried request cannot complete a lesson twice.
   Same event ID with *different* data is a 409 `IDEMPOTENCY_CONFLICT`.
5. The handler requires `readAcknowledged`, then loops over the lesson's
   `exerciseIds` checking each has a **passed attempt at the current
   `masteryRevision`** — a pass on an outdated version of the exercise does
   not count (`PRACTICE_REQUIRED` otherwise).
6. `award(tx, owner, 'lesson:'+id, 20, ...)` inserts XP through an upsert on
   the unique `(userId, awardKey)` constraint — completing again later can
   never double-award, because the update branch is `{}` (a no-op).
7. Review cards are enrolled, `LessonProgress` is upserted, the receipt is
   written, and only then does the transaction commit.
8. The web client invalidates its queries on the response. "Saved" appears
   only after server acknowledgment — the UI never optimistically claims a
   completion.

## Trace 2: how an attempt is graded

`POST /api/v1/attempts` (`learning.ts`) decides among **three grading
origins**, and the choice is the most interview-worthy design in the repo:

- `function-cases` grading → `browser_automated`: the browser ran the code in
  the QuickJS runner and reports which cases passed; the server checks that
  report's shape and bounds (max 25 case IDs, 60s duration).
- `rubric` grading → `self_reported`: passing requires the learner's own
  `selfAssessment === true` plus a non-empty written answer.
- everything else → `server_objective`: the server grades the answer itself
  with `gradeAnswer` from `packages/learning-core`.

Before grading, the handler reads `RevealEvent`s for this item at this
`masteryRevision`: if the solution was ever revealed, every later attempt is
permanently marked `solution_viewed`. Resetting the editor does not reset
evidence — that's why reveal history is its own table instead of UI state.

Why it matters downstream: `conceptStatus` (learning-core) only counts
evidence where `assistance === 'none'` and `origin !== 'self_reported'`.
Self-assessment and assisted passes still earn XP, but they can never
demonstrate mastery of a concept.

## Practice assignment

Trace a stale draft from `apps/web/src/use-draft.ts` to `personal.ts` and
identify the revision check that prevents overwriting. **Check**: you can
name the error code the API returns for a stale draft write, and say which
table's `revision` column it compares against. Then write down (don't build)
a test plan for typing during an in-flight save: what should win, and which
existing mechanism — the draft revision or the mutation receipt — decides it?
