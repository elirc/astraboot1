# Implementation checklist

Updated 2026-09-09. V1 final release verification is in progress; V2/V3 implementation has not started.

| Phase | State | Evidence or remaining gate |
| --- | --- | --- |
| P0 architecture and contracts | Implemented, verified | Specification, pinned dependencies, schemas, three migrations, bounded runner |
| P1 durable learning workflow | Implemented, verified | Current PostgreSQL acceptance: attempts, reviews, placement, service restart, owner isolation |
| P2 synchronization and personal records | Implemented | Revision conflicts, idempotency, owner-scoped local recovery, notes/bookmarks; final changed-source browser checks pending |
| P3 projects and packaging | Implemented | Current v4 archives and frozen external reference install pass; fresh reference and starter execution checks in progress |
| P4 full V1 curriculum | Authored, validated | Package version 5: 244 items, 36 lessons, 108 exercises, 72 cards, 60 placement items, 3 missions; 28 references pass, 57 mutants rejected, no warnings |
| P5 hardening and release | In progress | TypeScript/lint pass; 28 unique unit/API checks covered by passing integrated/focused runs; final browser, current mission execution, production restart and release handoff remain |
| P6 deeper Node.js | Pending V1 exit | N13–N20, 24 lessons, 72 exercises, 48 cards, 8 assessments, M04–M08 |
| P7 C#/.NET | Pending V2 exit | D01–D10, 30 lessons, 90 exercises, 60 cards, 10 assessments, M09–M12 |

Current checks use verified Node 24.21.0 and native PostgreSQL 18.1. Backup/restore matched all rows in 22 tables. Contrast and scale measurements are recorded; measured performance misses remain visible. Container execution and hosted deployment are unverified. No unrelated applications or databases were changed.

See platform-verification.json, content-verification.json, backup-verification.json, contrast-verification.json, performance-verification.json, and the finite gate in release-review-criteria.md. Historical mission/browser evidence is distinguished from the current reruns in testing.md.
