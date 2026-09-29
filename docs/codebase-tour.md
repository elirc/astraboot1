# Codebase tour

- apps/web/src: responsive React routes, TanStack Query, CodeMirror fallback, and the worker adapter.
- apps/api/src/auth.ts: password verification, cookies, CSRF, and session lifecycle.
- apps/api/src/content.ts: content reads, validation previews, immutable publication and activation.
- apps/api/src/learning.ts: attempts, reveal history, completion, placement, review and evidence.
- apps/api/src/personal.ts: drafts, notes, bookmarks, reports, settings and export.
- packages/contracts: fixed Zod schemas. Uploaded data never becomes executable route schemas.
- packages/learning-core: deterministic grading, scheduling and concept heuristics.
- packages/runner: semantic TypeScript checking and QuickJS execution.
- packages/content-tools: CLI validation and snapshot assembly.
- prisma: schema, foreign keys, indexes and append-only content-version migration.
- curriculum/fixtures: the first original chapter package.

A completion starts in LessonPage, sends session-bound CSRF, enters the owner-scoped transaction, checks required current-revision passes, inserts unique XP, introduces review cards and stores lesson status. The response invalidates queries. Saved appears only after server acknowledgment.

Practice assignment: trace a stale draft from use-draft.ts to personal.ts and identify the revision that prevents overwriting. Add a test for typing during an in-flight save.
