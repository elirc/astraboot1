# Release plan

The requested scope is the complete platform and V1–V3 curriculum. V1 must pass its release gates before V2 implementation starts; V2 must pass before V3. A working V1 is not completion of the whole request.

## Current work allocation

- Lead: architecture, sequencing, integration review, runtime recovery, and release evidence.
- Frontend audit: session recovery, unsaved input, reconnect behavior, navigation, and stale runner results.
- API audit: ownership, grading, evidence, immutable content, archival preservation, and idempotency.
- Mission audit: reproducible setup, baseline/mission checks, intentional defects, and archive packaging.

Each audit owns a separate file area. Findings are reviewed before integration; generated archives and snapshots are rebuilt after source changes settle.

## V1 exit gates

1. Restore the damaged dependency and disposable PostgreSQL installations from pinned versions. Preserve database files. Verify readiness before interpreting further test failures.
2. Complete the three source audits, review their changes, and run strict type checking and lint on the integrated source.
3. Apply all migrations and run the complete unit/API suite, including archived chapter preservation, current mastery evidence, pagination, and authentication edge cases.
4. Rebuild trusted mission archives and the full V1 snapshot. Validate 36 lessons, 108 exercises, 72 cards, 60 placement items, and three missions; rerun every runnable solution and mutant.
5. Verify clean archive installation, baseline success, intended starter failures, and passing reference checks. Exercise the same ticket workflow through mock and HTTP adapters.
6. Run browser journeys in Chromium, Firefox, and WebKit. Verify mobile layout, keyboard access, coding placement, worker isolation, persisted learning, and recovery behavior.
7. Measure warm API behavior on at least 1,000 lessons and 10,000 exercises, with substantial attempt history. Record measured results and environment limitations rather than asserting a universal latency guarantee.
8. Build the production artifact, check owner sign-in and persisted records in production mode, and verify that the browser test harness is absent. Verify Node 24 separately from the already-tested Node 22 environment.
9. Restore a fresh PostgreSQL backup into a new database and compare records after the final migrations. Update setup, operations, verification, and continuation documents.
10. Record a reviewable V1 checkpoint. Hosting-provider deployment requires a supplied destination; lack of hosted deployment must remain explicit.

## V2: deeper Node.js

Follow the approved N13–N20 inventory in product-spec.md. Deliver 24 additional lessons, 72 exercises, 48 cards, eight assessments, and M04–M08. First implement N13–N16 with M04, M06, and M07; then N17–N20 with M05 and M08. Verify database transactions, query/pagination behavior, idempotency, failure injection, and measured query behavior against real PostgreSQL.

Publish a versioned V2 release only after content and mission gates pass. Rerun preservation, synchronization, publication, and setup regressions with existing V1 learning records.

## V3: C# and .NET

Pin a supported .NET LTS SDK and create reproducible ASP.NET Core, EF Core, and xUnit projects. Follow D01–D10 in product-spec.md: D01–D05 with M09, then D06–D10 with M10–M12. Deliver 30 lessons, 90 exercises, 60 cards, ten assessments, and four missions.

Verify reference builds and tests, frontend contract parity, SQL behavior, cancellation, ownership, transactions, and deployment instructions. Explain meaningful Node/.NET differences in the authored lessons. Publish V3 and rerun the shared platform gates.

The combined minimum is 30 chapters, 90 lessons, 270 lesson exercises, 180 review cards, 150 placement items, and 12 working missions.
