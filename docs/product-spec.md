Personal Web Development Learning Platform

Full specification and detailed implementation plan

Prepared for Eli Rubin-Calvert and the implementing coding model
Version 1.0  |  9 September 2026

A complete handoff for a private learning app using React, TypeScript, Node.js, and PostgreSQL, with browser exercises, VS Code projects, synced progress, and a later C# and .NET curriculum.

Contents

1 Purpose and instructions for the implementing model

2 Product outcomes and release boundaries

3 Learning model and progression

4 User experience and screen specification

5 Architecture and implementation defaults

6 Authentication and owner access

7 Browser exercise execution

8 Data model and invariants

9 API and synchronization contract

10 Content packages and authoring workflow

11 V1 curriculum inventory

12 Expansion curriculum

13 Project missions and runnable repositories

14 Platform testing and quality gates

15 Deployment and operations

16 Detailed implementation backlog

17 Documentation and engineering learning materials

18 Prompts for implementation and content generation

19 Definition of done and traceability

20 Technical references and maintenance checks

1 Purpose and instructions for the implementing model

Build a private, responsive learning web application for one owner who wants practical mid-level web application engineering skills. The learning experience is inspired by the general lesson and challenge pattern of Boot.dev, but uses original content, interface design, terminology, and assets. Do not copy another product’s proprietary curriculum or branding.

This document is the implementation contract. It contains the approved requirements, selected implementation defaults, release boundaries, curriculum inventory, data and API contracts, testing gates, and execution instructions. It is a specification, not a claim that the application or lessons have already been built.

The owner has software development experience but wants to strengthen fundamentals, independent problem solving, debugging, testing, and engineering judgment. Do not assume years of experience mean mastery. Also do not make the owner repeat known material. Start with accessible explanations and let the owner skip ahead or take placement challenges.

Read this entire document before editing code. Preserve every approved requirement. Implement working vertical slices, then expand content. Make ordinary implementation decisions using the defaults below and record material departures in an architecture decision record. Ask only when a missing credential, external action, incompatible existing repository, or genuinely contradictory requirement prevents progress. Do not repeatedly restart product discovery.

1.1 Authority and scope

The user explicitly approved React, TypeScript, a Node.js backend, and a relational database; Node.js and TypeScript learning first, C# and .NET later; browser practice plus VS Code projects; fundamentals with skipping; pregenerated content without a paid AI API; and laptop and phone synchronization.

Specific libraries, algorithms, content counts, endpoints, and deployment defaults in this document are implementation decisions chosen to make the handoff actionable. They are not additional preferences attributed to the user. Follow them unless repository evidence or a failed feasibility check justifies a documented adjustment. Preserve the approved stack and product behavior when adjusting a library.

The first usable release is V1. V2 and V3 are explicitly specified expansion releases, not excuses to leave V1 incomplete. Deliver and verify V1 before working through the expansions. Do not label the entire Node.js and .NET curriculum complete when only V1 exists.

1.2 Nonnegotiable requirements

A private account synchronizes learning progress, notes, bookmarks, and browser code across laptop and phone.

All lessons, hints, solutions, rubrics, and explanations are stored content. No runtime LLM call is required anywhere in the core product.

Existing AI subscriptions are used outside the app to author content through the owner’s normal chat or coding workflow. Do not scrape subscription sessions, store subscription credentials, or pretend a subscription is an API entitlement.

Browser exercises and VS Code assignments are both first-class learning activities.

The main sequence is JavaScript and TypeScript, React, Node.js, SQL and production practice, followed by C# and .NET. Shared frontend knowledge carries forward.

Skipping remains available. Completion, placement evidence, assistance used, and retained understanding are distinct records.

Mixed projects include creating new features, extending existing code, investigating defects, and refactoring with regression tests.

No public registration, billing, social feed, paid content marketplace, live AI chat, or public code execution service is required.

The end product contains real lessons and exercises. A polished shell with empty chapters or duplicated filler does not satisfy the specification.

1.3 Completion language

Use precise labels in reports: implemented, verified, content authored, content validated, deferred to V2, deferred to V3, or blocked with a concrete reason. A screenshot proves layout, not persistence. A green reference solution proves one implementation passes, not that the grader rejects incorrect implementations. A client-reported pass is learning feedback, not a proctored certificate.

2 Product outcomes and release boundaries

2.1 Success scenarios

Scenario A: The owner reads a lesson on the phone, answers two questions, writes a note, and bookmarks a concept. On the laptop, after signing in and refreshing or refocusing, the same progress and note appear. The owner completes a browser exercise, reveals a hint, and sees an assisted completion recorded once.

Scenario B: The owner opens a VS Code mission, downloads a versioned starter, runs its baseline checks, implements the requirement, and runs the mission checks locally. The app stores the owner’s completion report and optional repository URL. It clearly labels the report as self-reported rather than independently verified.

Scenario C: The owner imports a corrected content package. Preview identifies changed and new items. Publication activates the entire release atomically. Existing attempts still point to the versions they used; notes and bookmarks remain attached to stable item IDs; updated explanations appear without erasing prior progress.

Scenario D: Two devices edit the same note. The second stale save receives a conflict response, preserves both texts, and allows the owner to choose or merge. A network retry never duplicates completion credit, review history, or XP.

Scenario E: The owner opens a chapter out of order. The app explains suggested prerequisites but permits entry. A placement challenge can mark chapter objectives as placed out; opening a chapter or clicking skip does not create mastery evidence.

2.2 Release inventory

Release

Required platform and content

V1 usable course

Full core platform; 12 chapters; 36 lessons; 108 lesson exercises; 72 review cards; 12 placement assessments containing 60 additional items; 3 runnable support-desk missions

V2 deeper Node.js practice

8 additional chapters; 24 additional lessons; 72 additional lesson exercises; 48 additional cards; 8 placement assessments with 40 items; 5 additional missions spanning support desk and inventory

V3 C# and .NET

10 additional chapters; 30 additional lessons; 90 additional lesson exercises; 60 additional cards; 10 placement assessments with 50 items; 4 .NET missions

Later optional expansion

Next.js, Angular, advanced browser previews, offline learning, stronger local verification, and further original exercise variants

Combined V1 through V3 baseline: 30 chapters, 90 lessons, 270 lesson exercises, 180 review cards, 150 placement items, and 12 project missions. Placement items and review cards are not counted as lesson exercises. These are authored minimums for the defined releases, not a promise that a count alone establishes learning quality. The architecture must also accommodate 1,000 lessons and 10,000 exercises without loading all content at once.

V1 introduces the whole basic workflow but is not a claim of comprehensive Node.js expertise. V2 deliberately deepens persistence, reliability, security, and maintenance before V3 compares implementations in .NET.

2.3 Deferred features

Defer live AI tutoring, voice coaching, browser execution of arbitrary npm projects, browser .NET compilation, arbitrary shell execution, multiuser organizations, leaderboards, subscriptions, a custom VS Code extension, automatic GitHub write access, sophisticated adaptive models, a vector database, and microservices. None is required to fulfill the current learning goal.

The app must not market account synchronization as a zero-cost hosting promise. No AI API cost is required; ordinary hosting, storage, domain, or identity-provider costs depend on the chosen deployment. Do not provision paid services without the owner’s authorization.

3 Learning model and progression

3.1 Content hierarchy

Track contains ordered chapters. Chapter contains three initial lessons, a placement assessment, and links to relevant missions. Lesson teaches one to three explicit learning objectives and contains an explanation, a worked example, three exercises, and review-card links. Exercises can reference several concept IDs but must identify one primary objective. Missions apply multiple concepts to a business repository.

Concept IDs are stable, technology-aware identifiers such as js.array-filter, ts.narrowing, http.status-codes, sql.transactions, and dotnet.dependency-injection. Shared concepts such as auth.resource-ownership can appear in both backend tracks. A graph of suggested prerequisites guides recommendations; it never blocks manual navigation. Cyclic prerequisites are rejected during content validation.

3.2 Standard lesson structure

Each lesson contains a business context, observable objectives, a plain-language explanation, an annotated example, three practice activities, common mistakes, a concise summary, two retrieval cards, and source references when teaching externally documented behavior. Explanations should generally take five to ten minutes; exercises vary from two to fifteen minutes. These are estimates, not enforced timers.

Use the progression recognize, explain, apply, debug, and transfer. Do not reduce learning to memorizing definitions or guessing multiple-choice answers. Multiple-choice distractors must represent plausible misconceptions and have answer-specific explanations.

3.3 Exercise types and grading

Type

Required behavior and grading

Single or multiple choice

Server checks selected stable option IDs against the pinned version; multiple choice uses exact set equality in V1

Predict output

Select or enter an output; deterministic normalization is explicitly defined by the exercise

Code reading and bug identification

Select lines or choices and optionally explain; objective portion is checked and explanation uses a rubric

JavaScript or TypeScript function

Bounded function exercises run in the browser interpreter; behavioral cases compare structured results

Short explanation or design review

Show criteria and a model answer after submission; owner self-assesses; no fake automated semantic grading

Local project task

Run the real toolchain in VS Code; track checklist, notes, repository reference, and self-reported results

V1 SQL exercises are code reading, query reasoning, and local database tasks. Do not pretend a browser SQLite runner exactly reproduces PostgreSQL or SQL Server behavior. HTML, CSS, React rendering, real Node APIs, network calls, filesystem use, and C# compilation are practiced locally; browser lessons still teach and assess their concepts.

3.4 Completion and evidence rules

Maintain separate lesson status and exercise evidence. Lesson status is not_started, in_progress, completed, or skipped. Explicit lesson completion requires reading acknowledgment and a passing result on each required objective exercise; rubric activities require a self-assessment. A chapter may be marked placed_out through a qualifying placement result without completing its lessons.

Exercise evidence records outcome, assistance, grading origin, content version, and time. Assistance is none, hints, or solution_viewed. Grading origin is server_objective, browser_automated, or self_reported. Capture assistance on the attempt and retain lifetime reveal history for transparency.

If a reference solution has ever been revealed for the same exercise and mastery revision, later passes on that same item do not become fresh independent evidence just because the owner resets the editor. A different authored variant or placement item can provide new evidence. Do not erase old assisted attempts when a later independent attempt succeeds.

Concept status is unseen, practicing, demonstrated, retained, or review_due. Demonstrated requires two passing objective activities on distinct item IDs, without hints or solution reveal, at least one being application or debugging rather than recall. Browser checks qualify as personal learning evidence but retain their grading-origin label. Self-assessed design responses do not alone satisfy this rule. Retained requires demonstrated plus two successful due reviews on separate UTC dates, the second at least seven days after the first. An overdue review changes retained to review_due without deleting history. These are configurable product heuristics, not validated scientific measurements of competence.

3.5 Placement assessments

Each chapter has five separately authored items covering all chapter objectives. No hints or solutions appear until submission. Qualification requires at least four correct answers out of five plus every item flagged critical passing. Include at least one application, code-reading, or debugging task; use a browser coding task where the chapter’s concepts fit the runner.

Passing grants placed_out status and separate placement evidence. It does not claim the owner has completed every exercise or retained the material. Once answers are revealed, repeat attempts on that same assessment version are practice only. Author an alternate version later if fresh placement evidence is needed. Manual skipping remains available regardless of score.

3.6 Review scheduling

Use a small deterministic scheduler in V1 rather than introducing a learning-science library prematurely. Each card has step 0 through 5, dueAt, lastReviewedAt, and revision. Successful Good responses advance one step through intervals of 1, 3, 7, 14, and 30 days, capped at 30 days. Easy advances two steps, capped at 5. Hard keeps the step and schedules one day later. Again resets to step 0 and schedules ten minutes later. All intervals are measured from the server acceptance time.

Introduce a lesson’s cards on first completion, or through an explicit Add to review action on that lesson; importing content alone does not enroll every card. A newly introduced card starts at step 0 and is immediately due. An incorrect objectively graded card forces Again; a correct answer allows Hard, Good, or Easy. For a free-recall card, the owner reveals the answer then self-rates. Such ratings schedule practice but remain self-reported evidence. Objective retained evidence uses correct checked reviews; self-rated reviews appear separately.

The queue orders overdue cards first, then newly introduced cards, with a default visible batch of twenty and an explicit continue option. No daily cap hides remaining work. A repeated request with the same event ID returns the original result. A second device submitting against an outdated card revision receives a conflict and refreshes instead of moving the schedule twice.

3.7 Gamification

Award 10 XP for a first accepted pass per lesson-exercise mastery revision, whether assisted or independent; award 20 XP for first lesson completion and 50 XP for first mission completion. Do not award XP for opening pages, retries, importing content, repeated review clicks, manual skips, or placement alone. Keep XP separate from mastery and expose assistance in progress views.

Use a unique award key to prevent duplication. Level is floor(totalXP / 250) + 1. Do not gate lessons behind XP. Optional streaks are deferred; chapter progress and milestones supply the initial motivation without timezone-related streak complexity.

4 User experience and screen specification

4.1 Navigation and visual system

Use the working title DevPractice, easily changed through one application configuration field. The visual direction is a quiet developer workspace with clear typography and light gamification. Use a neutral background, high-contrast text, one restrained accent color, and visible state labels. Avoid excessive badges, animations, gradients, decorative dashboards, and game mechanics that obscure lessons.

Implement desktop sidebar navigation and mobile navigation with Today, Learn, Review, Projects, and More. More contains Progress, Notes, Content, and Settings. Use CSS Modules and CSS custom properties; Tailwind is not needed. Provide light and dark themes with system preference as the initial default. Respect reduced motion. Never communicate correctness through color alone.

4.2 Route inventory

Route

Required content and actions

/login

Owner sign-in, generic failure messages, accessible form

/today

Resume activity, due reviews, active mission, clear empty and loading states

/learn

Track and chapter list, filters, completion and placement labels

/learn/chapters/:chapterId

Objectives, prerequisites, lessons, placement entry, related missions

/learn/lessons/:lessonId

Explanation, examples, exercises, notes, bookmarks, previous and next

/practice/:exerciseId

Focused editor or answer form, run/check, output, hints, solution, save state

/placement/:chapterId

Assessment instructions, item navigation, submit and results

/review

Due queue, answer reveal, rating, progress through the session

/projects

Missions filtered by release, stack, project, and work type

/projects/:missionId

Brief, prerequisites, setup, starter download, checklist, hints, verification, report

/progress

Completion, concept evidence, assistance history, placement, and XP

/notes

Search notes and bookmarks; open associated content

/content

Owner import, validation issues, release preview, publish, release history

/settings

Account, timezone, theme, export, session revocation

4.3 Lesson workspace

Desktop uses an explanation panel and practice panel, with adjustable proportions only if straightforward. Mobile uses Instruction, Practice, and Results tabs, preserving input when switching. Code blocks scroll horizontally inside their container; the page itself must not overflow. Explain unavailable local-only execution with an actionable mission link.

Display a small save indicator: Saving, Saved, Unsaved, or Conflict. The app never says Saved before server acknowledgment. A failed save preserves editor content and provides Retry. If the owner navigates with unsaved changes, offer to stay or leave; do not silently discard the draft.

Hints reveal in order and record which hints were viewed. The solution requires an explicit Reveal solution action with a brief explanation that the attempt will be recorded as solution-assisted. Do not add a blocking confirmation modal for every hint. Reset starter requires confirmation if it would replace unsaved code and creates a recoverable draft snapshot.

4.4 Project workspace

Every mission shows business context, expected outcome, relevant files, pinned starter version, setup commands, baseline checks, acceptance criteria, progressive hints, solution explanation, and a completion form. Provide standard repository URLs and downloadable starter archives; a VS Code deep link may be optional convenience, never the only way to open work.

The completion form records checklist responses, optional repository URL, optional commit hash, notes, reported test command, and reported outcome. The app does not clone private repositories or run code from a supplied URL. Links do not automatically authenticate or grant write access. The first version needs no extension or local bridge.

4.5 Accessibility and responsive acceptance

Support a 360 CSS-pixel viewport without page-level horizontal scrolling, except inside code containers. Primary actions have at least 44 by 44 CSS-pixel touch targets. Use semantic headings, explicit form labels, visible keyboard focus, accessible status messages, and dialogs with correct focus behavior. Correctness states include text and icons. Check contrast against WCAG AA criteria during implementation rather than assuming the palette passes.

The editor must not trap keyboard focus and must have a plain textarea fallback. On mobile, expose explicit Run and Save actions without requiring keyboard shortcuts. Screen reader announcements summarize results without reading every console line. Test browser navigation, Back behavior, loading, empty, error, session-expired, and conflict states, not only successful desktop screens.

5 Architecture and implementation defaults

5.1 Selected components

Concern

Default selection

Repository

pnpm workspace monorepo with an explicit lockfile

Frontend

React, TypeScript strict mode, Vite, React Router

API

Node.js LTS and Fastify with explicit request validation

Persistence

PostgreSQL and Prisma migrations

Server state

TanStack Query; ordinary React state for local UI

Validation

Zod for content and application payload validation

Styling

CSS Modules and shared CSS variables

Editor

CodeMirror loaded only on practice routes; textarea fallback

Browser code

QuickJS compiled to WebAssembly in a dedicated Web Worker

Unit and integration checks

Vitest, React Testing Library, API integration tests against PostgreSQL

End-to-end checks

Playwright with isolated database fixtures

Local environment

Docker Compose for PostgreSQL; documented app start commands

Deployment shape

One Node web service serving the built frontend and /api, plus PostgreSQL

Choose compatible stable package versions during setup, pin them, and record the tested versions. Node.js 24 LTS is the baseline as of this specification date; recheck supported releases when implementation starts. Use a currently supported .NET LTS for V3; .NET 10 is the documented baseline at this date. Do not write unverified patch numbers into the specification. See the official references in section 20.

5.2 Module boundaries

apps/web owns routes, components, editor integration, and browser workers. apps/api owns authentication, access checks, content publication, progress persistence, review scheduling, and exports. packages/contracts owns shared static schemas and DTOs. packages/content-tools owns validation and package build commands. packages/learning-core owns pure evidence, scheduling, and XP rules. packages/runner owns the bounded execution protocol. prisma owns database schema and migrations. curriculum owns authored JSON packages and source notes. projects owns independently runnable learning repositories or source directories used to produce starter archives. docs owns architecture, operations, content authoring, and handoff material.

Use feature modules within the API: auth, curriculum, attempts, progress, reviews, notes, missions, imports, and exports. Route handlers validate input and call focused services. Database transactions live at the service boundary. Do not add generic repository wrappers, an event bus, CQRS infrastructure, Redis, or an abstraction layer for multiple databases without a demonstrated requirement.

This is an ordinary modular monolith. The platform database is separate from each learning project’s database. A beginner’s intentionally broken practice query must never run against the platform’s learning records.

5.3 Version and dependency policy

Commit the package manager lockfile, runtime version file, migration history, and project SDK pins. Avoid floating latest dependencies in examples and starter repositories. Use the same content runner locally and in browser validation where practical. Verify incompatible peer dependencies before selecting a package release. If a dependency blocks the project, document the reason and replacement; do not silently switch the approved language or application stack.

Fastify’s compiled route schemas must be application-authored static schemas. Imported course data is validated by the fixed content schema and must never become executable route-validator code. TypeScript strict checking is enabled; do not use broad any casts or ts-ignore to force a passing build. Official behavior references are provided in section 20.

6 Authentication and owner access

V1 uses one bootstrap owner account with a password and database-backed sessions. No public signup or invitation flow is required. A local administration command creates the owner using an interactive password prompt or a properly injected secret. Do not log the password, commit it, or pass it as a visible command-line argument. A second local administrative command resets the password and revokes existing sessions; email-based recovery is deferred.

Use a maintained password-hashing implementation with Argon2id and parameters selected from current library and OWASP guidance at implementation time. Do not invent cryptography. Generate a cryptographically random opaque session token, store only its hash in PostgreSQL, and set the cookie as HttpOnly, Secure in production, SameSite=Lax, host-only, and Path=/. Use a __Host- prefixed cookie in HTTPS production. No tokens in localStorage.

Sessions have a 30-day absolute lifetime and a 7-day idle lifetime. Update lastSeenAt no more than once per five minutes to limit writes. Login creates a new token; logout revokes the current token; password reset and revoke-all revoke all sessions. Use generic authentication failures and a configurable sign-in limit with an initial default of five failed attempts per fifteen minutes per account and source address. Avoid a permanent lockout that the owner cannot recover from.

All application data routes require authentication and resource ownership checks. The runner receives only exercise material, never the session token or authenticated API wrappers. Every authenticated state-changing request checks Origin and a session-bound CSRF token. Login validates Origin and a short-lived pre-session CSRF token obtained from GET /auth/csrf before credentials are submitted. SameSite is defense in depth, not the entire CSRF control. Serve the frontend and API under the same origin to simplify cookies and avoid credentialed cross-origin access.

An expired session leaves unsaved editor text visible and asks the owner to sign in again. Do not destroy drafts during an authentication failure. Validate every object ID against owner scope even though public signup is disabled; test with a second synthetic user to detect missing access checks.

7 Browser exercise execution

7.1 Supported execution contract

V1 code exercises are single-file JavaScript or TypeScript functions with JSON-serializable inputs and results. They have one named entrypoint, static test-case data, and no arbitrary imports. They do not receive DOM APIs, Node APIs, filesystem APIs, sockets, fetch, browser storage, or access to platform services. Network and asynchronous HTTP behavior is taught through prepared traces and local missions in V1.

QuickJS provides an interpreter boundary inside a dedicated Web Worker. Only trusted worker code runs in the browser’s host JavaScript environment. Learner source is passed to the interpreter, never to host eval, new Function, a generated module, or the application’s main window. A Web Worker alone is not the security boundary; the interpreter and lack of exposed host capabilities are essential.

Start each run with a fresh runtime and dispose it afterward. Expose only bounded console capture and the minimum adapter needed to call the named function with copied JSON values. Keep expected results and comparison logic in trusted worker code; do not inject a mutable test-result object the learner can overwrite. Since this is browser-side personal practice, a technically skilled owner can still alter client reports. Do not describe the system as tamper-proof or use it for certification.

7.2 TypeScript behavior

TypeScript exercises use a virtual single-file compiler environment with bundled standard declaration files. Run syntactic and semantic diagnostics before emitting JavaScript. Disallow imports in V1 and clearly state the supported language target. A type error returns compile_error and cannot receive a pass. Transpiling away types alone does not satisfy TypeScript grading.

Load the compiler and interpreter only when needed. Give initialization a visible loading state and a separate ten-second timeout with Retry. Once initialized, each run has a default two-second execution budget, 64 KiB source limit, at most twenty-five cases, 64 KiB serialized input and output limits, at most one hundred console lines, and 16 KiB total console output. These are configurable starting limits and must be tuned against actual mobile-browser checks.

Set interpreter memory and stack limits and add an outer worker watchdog that terminates a stuck run. Treat memory limits as a capability to verify on the pinned runtime, not a browser-wide memory guarantee. Check current upstream issues during the runner spike. If reliable bounded execution cannot be demonstrated, the browser-code gate remains incomplete; do not fall back to main-thread eval.

7.3 Runner messages

Request fields: protocolVersion, runId, exerciseId, exerciseVersionId, source, language, entrypoint, and approved limits. The worker receives a trusted, pinned test-case definition from the app’s runner adapter. Response fields: protocolVersion, runId, status, durationMs, diagnostics, bounded console output, and case results. Status is passed, failed, compile_error, runtime_error, timed_out, cancelled, or unsupported.

Accept responses only from the active worker and matching runId. A cancelled or superseded run cannot update the current result. Limit and validate message sizes on both sides. Display errors as text, never injected HTML. Pressing Stop terminates the worker and preserves the code draft. A new run creates a clean runtime even after an error.

7.4 Proof required before release

Verify a correct function, an incorrect boundary case, syntax error, TypeScript type error, thrown exception, recursion, infinite loop, oversized output, excessive allocation, attempted host access, repeated runs, cancellation, and stale responses. Confirm the application remains usable and no authenticated requests originate from learner code. Repeat the representative runner checks in Chromium, Firefox, and WebKit; perform a real iPhone Safari check if available and document if only emulation was possible.

Arbitrary HTML previews and React execution are deferred. If added later, serve them from a credential-free separate origin with a restricted sandbox and a reviewed message protocol. Never combine a same-origin executable iframe with privileges that let it reach the authenticated application. See the MDN reference in section 20.

8 Data model and invariants

Use PostgreSQL timestamps with timezone, generated server-side UTC timestamps, UUIDs for operational records, and stable string identifiers for authored content. Store personal preferences such as display timezone separately; never depend on a client clock for ordering changes. Unless stated otherwise, every owner record includes userId, createdAt, and updatedAt. Use database constraints as well as application validation.

8.1 Core tables

Table

Essential columns and relationships

User

id, normalizedEmail unique, passwordHash, timezone, theme, preferencesRevision, activeReleaseId, activeReleaseRevision, createdAt

Session

id, userId, tokenHash unique, csrfSecret, createdAt, lastSeenAt, expiresAt, revokedAt

ContentItem

id stable string, kind, createdAt; identities are never reused for a different concept

ContentVersion

id UUID, itemId, version integer, masteryRevision integer, payload JSONB, checksum; unique itemId plus version

ContentRelease

id, packageId, packageVersion, ownerId, checksum, state, validationSummary, createdAt, publishedAt

ReleaseItem

releaseId, itemId, versionId; unique releaseId plus itemId; indexed item kind and ordering fields

Concept

id stable string, title, description; content links refer to these identities

Attempt

id, userId, clientEventId, exerciseVersionId, sourceSnapshot or answer JSON, outcome, gradingOrigin, assistance, result JSON, createdAt

RevealEvent

id, userId, itemId, masteryRevision, revealKind, hintIndex nullable, clientEventId, createdAt

LessonProgress

userId, lessonId, status, startedAt, completedAt, version integer; unique userId plus lessonId

PlacementAttempt

id, userId, assessmentVersionId, clientEventId, submittedAnswers, score, qualified, practiceOnly, createdAt

ExerciseDraft

id, userId, exerciseId, contentVersionId, source, revision, updatedAt; unique userId plus exerciseId

DraftSnapshot

id, draftId, source, baseRevision, reason, createdAt; bounded recoverable history

ReviewState

userId, cardId, step, dueAt, lastReviewedAt, revision; unique userId plus cardId

ReviewEvent

id, userId, cardVersionId, clientEventId, rating, correctness nullable, gradingOrigin, fromRevision, createdAt

Note

id, userId, contentItemId nullable, title, body, revision, deletedAt nullable

Bookmark

userId, contentItemId, createdAt; unique userId plus contentItemId

MissionProgress

userId, missionId, checklist JSON, status, repositoryUrl, commitHash, report JSON, revision

XpAward

id, userId, awardKey, amount, reason, createdAt; unique userId plus awardKey

ActivityEvent

id, userId, kind, contentItemId, relatedRecordId, createdAt; indexed userId plus createdAt

MutationReceipt

userId, clientEventId, operation, requestHash, response JSON, createdAt; unique userId plus clientEventId

Use explicit foreign keys for all relational identifiers, including content version references. ContentVersion payload stores the typed authored definition; important filtering fields such as kind, chapter membership, sort order, and primary concept can be projected into indexed columns or a small release catalog during publication. Do not repeatedly scan every JSON document to render a curriculum page.

ActivityEvent supplies the recent-activity feed and is not a general-purpose event-sourcing architecture. Derive concept status from attempts, reveals, and reviews in V1; add a rebuildable projection only if measured performance requires it. Avoid storing several contradictory versions of mastery as independently editable fields.

8.2 Content history

Attempts point to immutable ContentVersion rows. Lessons, drafts, notes, and bookmarks point to stable ContentItem IDs, with draft content-version references for starter compatibility. A published release is an immutable map of IDs to versions. The activeReleaseId changes inside the same transaction that marks a release published. In-flight attempts may finish against their loaded published version, even after a newer release is active; display a content-updated notice afterward.

Changing spelling or clarifying an explanation increments content version but preserves masteryRevision. Changing the required behavior, grading cases, objectives, or solution increments masteryRevision. Old evidence remains visible, while the new revision may require new practice. A previously completed lesson retains its history and shows Updated practice available when its required exercise mastery revisions change; new practice has its own evidence rather than rewriting the original completion. Editorial updates do not erase XP or learning history. Never recycle an old version number with different bytes.

Removing content from a release archives it from ordinary navigation but retains its historical record. Bookmarks and notes show Archived content with the previous version available. Rollback selects an earlier published release through an explicit action; it does not delete intervening attempts.

8.3 Ownership and constraints

ContentRelease has a unique ownerId plus packageId plus packageVersion constraint; a matching checksum is a replay and a different checksum is a version conflict. Required indexes include Attempt(userId, exerciseVersionId, createdAt), ReviewState(userId, dueAt), Note(userId, updatedAt), MissionProgress(userId, status), ActivityEvent(userId, createdAt, id), and ReleaseItem(releaseId, itemId). Add unique constraints for all idempotency and XP keys. Normalized email must be unique; preserve a display form separately if needed.

Draft source and attempt source each have a 64 KiB limit. Note body has a 20,000-character limit; note title has a 200-character limit. Repository URLs accept only http or https and are stored as links, never fetched by the server. Put size checks before expensive parsing. Never persist credentials embedded in a submitted repository URL; reject URLs with a username or password component.

Retain attempts and content history by default because they are the learning record. Keep the most recent twenty draft snapshots per exercise and prune older snapshots. Clean expired sessions and mutation receipts with a scheduled maintenance command. Keep mutation receipts for at least thirty days; durable unique event IDs in the underlying event tables prevent duplicates beyond that period.

9 API and synchronization contract

9.1 Common rules

Use JSON over same-origin HTTPS under /api/v1. Generate OpenAPI documentation from application-owned route definitions or a maintained static contract. Return timestamps as ISO 8601 UTC strings. Paginated lists use an opaque cursor with a stable sort key, default limit twenty and maximum one hundred. Do not expose database implementation details in errors.

Success responses use { data, meta? }. Errors use { error: { code, message, fieldErrors?, requestId } }. Use 400 for malformed input, 401 for expired or missing session, 403 for access rejection, 404 for unavailable resources, 409 for revision or idempotency conflicts, 413 for size limits, 422 for structurally readable but invalid content, and 429 for rate limits. Use 500 for unexpected server failures with a generic message and logged requestId.

All learning and content mutations have an explicit clientEventId UUID or Idempotency-Key header. Authentication lifecycle operations use their own session semantics and do not store raw authentication responses in MutationReceipt. A repeated ID with the same canonical request body returns the original result; the same ID with different content returns IDEMPOTENCY_CONFLICT. Store the successful receipt and the domain changes in one transaction. Failed validation does not create a success receipt.

9.2 Endpoint inventory

Method and path

Behavior

GET /auth/csrf

Establish short-lived pre-session CSRF state and return a token for login

POST /auth/login

Validate credentials, create session, return owner summary and CSRF token

POST /auth/logout

Revoke current session and clear cookie

GET /auth/me

Return account, preferences, expiry, and CSRF token

POST /auth/revoke-all

Reauthenticate with current password, revoke every session

GET /curriculum

Paginated or track-filtered active release catalog with owner progress

GET /chapters/:id

Chapter metadata, objectives, lesson summaries, placement availability

GET /lessons/:id

Current published lesson payload and referenced exercise summaries

GET /exercises/:id

Public exercise prompt, starter, runner cases, and saved draft; omit solution fields

POST /exercises/:id/reveals

Record hint or solution reveal, return the requested stored content

POST /attempts

Submit objective answers or bounded browser results against an immutable version

POST /lessons/:id/complete

Validate required exercise responses and record completion atomically

POST /lessons/:id/review-cards

Idempotently enroll the lesson’s cards without changing lesson completion

POST /lessons/:id/skip

Record skipped status; preserve prior evidence and XP

GET and PUT /drafts/:exerciseId

Read or save source with expectedRevision

GET /drafts/:exerciseId/snapshots

Return bounded recoverable draft history

GET and POST /placements/:chapterId

GET returns assessment prompts without answers; POST grades, flags practice-only repeats, and records placement

GET /reviews/due

Return cards due now and a server timestamp

POST /reviews/:cardId/responses

Check revision, grade if objective, schedule once, return new state

GET /progress

Return completion, assistance, concept evidence, placement, and XP summaries

GET /activity

Paginated server-ordered recent activity for Today and history

GET and POST /notes

List or create an owner note

PATCH and DELETE /notes/:id

Revision-checked update or soft deletion

GET /bookmarks

List bookmarked items including archived references

PUT and DELETE /bookmarks/:itemId

Idempotent add or remove

GET /missions and /missions/:id

Mission catalog or current mission plus progress

POST /missions/:id/reveals

Record a hint or reference-solution reveal and return the requested stored content

PUT /missions/:id/progress

Revision-checked checklist, report, and self-reported completion

POST /content/imports

Validate and persist a draft package, return draft ID and change summary

GET /content/imports/:id

Validation report and preview metadata

POST /content/imports/:id/publish

Recheck checksum and base release; atomically publish

GET /content/releases

List prior releases and current selection

POST /content/releases/:id/activate

Explicitly restore a prior published release with revision check

GET /exports/progress

Download versioned JSON of owner learning records and content references

GET and PATCH /settings

Read or revision-check updates to preferences

GET /health/live and /health/ready

Minimal process and database readiness; expose no secrets

Owner access is required for imports, release activation, exports, and learning data. Production health endpoints return only minimal status. The manifest and exercise APIs must deliberately exclude stored model answers from ordinary payloads, though browser-delivered test cases are inspectable and are not advertised as secret.

9.3 Attempt payload example

The following is a contract example; version UUIDs are illustrative placeholders to be replaced by real published identifiers during implementation.

{

  "clientEventId": "5c00bef3-3d09-421b-93e3-e6b1d0c052e0",

  "exerciseId": "js-arrays-filter-open",

  "exerciseVersionId": "fa0656e8-cb46-4c56-8c48-8f7ed3ea5841",

  "source": "function countOpen(tickets) { return tickets.filter(t => t.status === 'open').length; }",

  "gradingOrigin": "browser_automated",

  "runnerResult": {

    "status": "passed",

    "passedCaseIds": ["empty", "mixed", "all-closed"],

    "durationMs": 18

  }

}

The server derives userId, assistance, accepted case IDs, XP, and timestamps. It does not trust supplied ownership, XP totals, or mastery states. It validates that the version belongs to the stated exercise and that reported case IDs match that definition. It stores browser outcome as client-reported automated evidence without running learner source on the application server. Server-objective submissions contain answer data instead of runnerResult.

9.4 Save and conflict semantics

Autosave drafts and notes after one second of inactivity, with a maximum of one in-flight write per document. Each write carries expectedRevision; successful writes increment revision. If the owner keeps typing during a save, queue the newest text after acknowledgment rather than sending stale intermediate writes concurrently.

On a conflict, retain the unsaved local text and show the server text with timestamps. Offer Keep server, Save my version after review, or Merge manually. Saving the chosen text uses the server’s current revision. No last-write-wins policy for notes or code drafts. A stale DELETE must also fail with a conflict; a stale client cannot resurrect a deleted note accidentally.

Append-only activities merge through unique event IDs. Lesson completion is monotonic except a future explicit reset operation; skip on an already completed lesson preserves completed status; ordinary sync cannot revert completed to not_started. Review scheduling uses a version-checked transaction. Mission checklists and preferences use expectedRevision like notes. Refresh active queries on focus and reconnect, and poll Today and progress every thirty seconds while visible. Cross-device updates should appear within thirty seconds or immediately after focus/refetch under a healthy connection. WebSockets are unnecessary for V1.

Connection loss shows Unsaved and preserves data in the current tab; a per-user recovery draft may be stored in IndexedDB. This is a crash-recovery convenience, not full offline learning. Recovery drafts must show their unsynced status, use owner-specific keys, and be cleared from visible state at logout. After reconnect, fetch the current revision before replaying a save. Never automatically replay a stale review rating.

10 Content packages and authoring workflow

10.1 Source format

Use a versioned JSON envelope with Markdown strings for prose. Render Markdown with raw HTML disabled and a safe link policy. Do not execute MDX, imported JavaScript components, scripts, or arbitrary expressions embedded in content. V1 uploads are a single JSON file capped at 10 MiB, with at most two thousand items per package. Starter archives are separately built trusted release assets, not code executed during upload.

Envelope fields are schemaVersion, packageId, packageVersion, baseReleaseId nullable, mode, title, items, and assets. V1 accepts mode=snapshot: a complete desired release manifest. To add a chapter, the content build command combines existing authored packages and the new chapter into a new snapshot. The UI must explain this behavior so an owner does not mistake a partial chapter file for a whole replacement release.

Each item is a discriminated union keyed by kind: track, chapter, lesson, exercise, review_card, assessment, or mission. Shared required fields are id, version, masteryRevision, title, conceptIds, prerequisiteIds, and bodyMarkdown. Kind-specific schemas require all referenced IDs, sequence values, objectives, answer definitions, or mission metadata. Stable IDs match lowercase letters, digits, and hyphens, up to eighty characters. Concept IDs permit dots as well.

Runtime fields such as ownerId, progress, XP, and publishedAt are forbidden in authored item payloads. Ignore no unknown fields silently: validation identifies unsupported fields and schema versions. Exercise variants must have their own stable IDs rather than overwriting an old exercise’s history.

10.2 Required authored fields

Kind

Additional mandatory fields

Track

chapterIds ordered, description, targetOutcomes

Chapter

trackId, lessonIds ordered, assessmentId, objectiveIds, missionIds

Lesson

chapterId, objectives, estimatedMinutes, workedExampleMarkdown, commonMistakes, exerciseIds, reviewCardIds, references

Exercise

lessonId, type, difficulty, promptMarkdown, hints, solution, grading definition, estimatedMinutes

Review card

lessonId, type, promptMarkdown, answer, explanation, gradingOrigin, primaryConceptId

Assessment

chapterId, five items with stable IDs, objective IDs, critical flags and grading definitions, qualification rules, answer explanations

Mission

projectId, workType, stack, starterAssetId, starterCommit, setup, baselineChecks, acceptanceCriteria, verificationCommands, hints, solutionMarkdown, reflectionRubric

Within an exercise, solution contains explanationMarkdown and either code or modelAnswer. Each of three hints must add useful information: conceptual direction, relevant mechanism, then near-solution guidance. Do not repeat the answer three times. Grading definitions are static data, not arbitrary host code. Function exercises use entrypoint, language, starterCode, and cases with JSON inputs and expected JSON results.

10.3 Complete example exercise record

This record illustrates one function exercise within a full snapshot. Referenced lessons and concepts must exist in that snapshot or the approved concept catalog. It is not presented as a standalone publishable course package.

{

  "kind": "exercise",

  "id": "js-arrays-filter-open",

  "version": 1,

  "masteryRevision": 1,

  "title": "Count open support tickets",

  "conceptIds": ["js.array-filter"],

  "prerequisiteIds": [],

  "bodyMarkdown": "Practice selecting records without changing the input.",

  "lessonId": "v1-l08",

  "type": "function",

  "difficulty": "foundation",

  "estimatedMinutes": 6,

  "promptMarkdown": "Return the number of tickets whose status is exactly open. Do not mutate the input. Status comparisons are case-sensitive.",

  "hints": [

    "Separate selecting matching tickets from counting them.",

    "Array.filter returns a new array containing matching records.",

    "Filter by ticket.status === 'open', then read the resulting length."

  ],

  "solution": {

    "code": "function countOpen(tickets) { return tickets.filter(ticket => ticket.status === 'open').length; }",

    "explanationMarkdown": "Filtering selects matching records without changing the original array. The resulting length is the count. An empty input produces zero. A loop with a counter is also valid."

  },

  "grading": {

    "kind": "function-cases",

    "language": "javascript",

    "entrypoint": "countOpen",

    "starterCode": "function countOpen(tickets) { return 0; }",

    "assertInputUnchanged": true,

    "cases": [

      {"id": "empty", "args": [[]], "expected": 0},

      {"id": "mixed", "args": [[{"status":"open"},{"status":"closed"},{"status":"open"}]], "expected": 2},

      {"id": "all-closed", "args": [[{"status":"closed"}]], "expected": 0}

    ]

  }

}

For stronger coverage in the authored release, add an uppercase Open case and an all-open case. The contract example above is intentionally small; the content verification gate must reject an always-zero mutant, a count-all mutant, and an input-mutating mutant. Equality is structural JSON equality with array order preserved; object property order is irrelevant. Number comparisons are exact unless the item explicitly specifies a tolerance. Inputs are copied independently per case and compared afterward when assertInputUnchanged is true.

10.4 Validation and publication

Validation checks schema shape, unique IDs and versions, allowed kinds, required fields, valid references, prerequisite cycles, sequence ordering, concept coverage, duplicate content fingerprints, broken local asset references, supported runner features, correct answers, solution behavior, and expected starter behavior. A code starter normally fails at least one case; an explicit read-only worked example is the documented exception.

The content CLI runs reference functions and deliberate incorrect variants through the same runner contract. Locally executable project solutions are checked in a disposable environment without production secrets. The production import endpoint never runs arbitrary package scripts or shell commands. It performs structural validation and supported bounded checks only; project solution verification is a separate build-time gate whose report is included in the package metadata.

The import UI displays added, changed, archived, and unchanged items; mastery revisions affected; warnings; blocking errors; and the current release against which the draft was built. Draft import does not affect learners. Publish requires the owner’s explicit action, a matching package checksum, and an unchanged base release. A competing publication produces 409 rather than silently replacing newer content. Publication writes all new versions, membership rows, and the active release pointer atomically.

Limit raw Markdown links to http, https, and approved relative paths; reject javascript and data links. Assets use bundled relative asset IDs, never arbitrary filesystem paths. Reject path traversal and unknown assets. Keep imports as data: no eval, dynamic MDX compilation, npm install hooks, or schema-generated server code from uploaded content.

10.5 AI-assisted content production

The owner supplies a chapter brief and the schema to an existing AI chat or coding subscription. The model generates original lesson content, tests, hints, explanations, and review cards into a branch or a local package file. The content CLI validates the package and reports exact JSON paths and item IDs for failures. The author fixes issues, reviews the teaching quality, and imports the accepted package.

Generate one chapter at a time. First approve the objectives and exercise inventory; then author the lesson bodies; then implement solutions and behavioral cases; finally review distractors, misconceptions, and references. Increasing volume must not precede a stable schema and demonstrated grader quality. This workflow requires no live inference endpoint in the app.

11 V1 curriculum inventory

Every row below is one lesson with exactly three required lesson exercises. Assign IDs v1-l01 through v1-l36 and exercise IDs derived from the lesson plus e1, e2, and e3, except intentionally descriptive stable IDs such as the example in section 10. The catalog records the actual mapping. Each lesson also gets two review cards and belongs to one chapter assessment. Keep the lesson title human-readable even when the stable ID is mechanical.

11.1 Chapters 1 through 4

Chapter 1 covers the web workflow. L01 follows a browser request to a server: label the request path, identify a response body, explain client versus server responsibility. L02 covers Git and project commands: identify changed files, choose a safe commit sequence, diagnose a failing package script. L03 covers debugging from evidence: read a stack trace, choose the next diagnostic step, explain a minimal reproduction.

Chapter 2 covers JavaScript values and control flow. L04 covers values and coercion: predict equality behavior, repair an explicit conversion function, identify a misleading truthiness check. L05 covers branching and boundaries: predict a branch, implement a priority classifier, repair an off-by-one condition. L06 covers functions and scope: trace variable scope, implement a small pure function, identify a mutation-related defect.

Chapter 3 covers records and collections. L07 covers objects and immutable changes: read a nested record, implement a safe field update, explain shallow copying. L08 covers array selection and transformation: predict filter output, implement countOpen, repair an incorrect map/filter combination. L09 covers lookup and aggregation: choose a suitable collection, implement grouping or counting, diagnose a missing-record assumption.

Chapter 4 covers asynchronous behavior and HTTP. L10 covers promises and async/await: order a prepared execution trace, identify a missing await, explain error propagation. L11 covers requests and status codes: match method to operation, classify a validation response, repair a supplied response-handling snippet through a reading task. L12 covers failures and cancellation: identify a race in a prepared trace, select a retryable failure, explain how stale responses affect the UI.

11.2 Chapters 5 through 8

Chapter 5 covers TypeScript. L13 covers types and nullability: identify a type error, implement a typed formatter, repair unsafe optional access. L14 covers unions and narrowing: discriminate an API state, implement an exhaustive status label, explain a cast that hides a defect. L15 covers interfaces and reusable functions: compare structural shapes, implement a constrained helper, distinguish compile-time checks from runtime validation.

Chapter 6 covers web interface fundamentals. L16 covers semantic HTML and forms: choose associated labels, identify a keyboard-navigation defect, explain native form behavior. L17 covers CSS layout and responsiveness: predict a layout from a prepared example, repair a narrow-screen style in a local mini-task with self-assessment, identify page overflow. L18 covers accessibility states: diagnose a color-only error, choose a useful accessible name, review focus behavior against a rubric.

Chapter 7 covers React fundamentals. L19 covers components and props: trace rendered output, identify a missing stable key, explain component responsibility. L20 covers state updates: predict a stale update, implement a pure state-transition function in the browser, diagnose accidental mutation. L21 covers effects and derived state: classify an unnecessary effect, repair a dependency mistake through code review, explain when data can be derived during render.

Chapter 8 covers React forms and API data. L22 covers controlled forms: trace input state, implement a pure field-validation helper, diagnose submission state. L23 covers server data: identify loading and empty states, implement a response-mapping function, review stale data behavior. L24 covers accessible feature composition: order a feature’s states, review a ticket-detail interface against a rubric, explain a component integration test.

11.3 Chapters 9 through 12

Chapter 9 covers Node.js APIs. L25 covers route boundaries: map a request to handler stages, implement a pure parameter parser, review separation of route and business logic. L26 covers runtime validation: classify invalid input, implement a bounded validation helper, explain why TypeScript alone cannot validate HTTP data. L27 covers errors and contracts: choose response statuses, implement a pure error-to-response mapping, diagnose accidental stack-trace disclosure.

Chapter 10 covers relational persistence. L28 covers data modeling: identify primary and foreign keys, choose a ticket-comment relationship, explain a uniqueness constraint. L29 covers queries and pagination: predict a SELECT result, identify unstable ordering, review a query against duplicate and empty cases. L30 covers migrations and transactions: order a safe migration workflow, identify partial-write failure, explain transaction boundaries in a local repository example.

Chapter 11 covers authentication and permissions. L31 distinguishes identity and access: classify authentication versus authorization, identify an insecure ownership check, explain session handling. L32 covers resource ownership: implement a pure canEditTicket policy, review a cross-user access bug, identify required regression cases. L33 covers safe request handling: identify CSRF defenses, detect sensitive log data, review a failed-login flow.

Chapter 12 covers verification and operation. L34 covers meaningful testing: choose boundary cases, implement a small testable function, critique a test that mirrors the implementation. L35 covers logs and configuration: follow a request ID, diagnose missing configuration, separate useful logs from secrets. L36 covers shipping and maintenance: order checks and migrations, analyze a failed deployment scenario, explain a rollback and recovery plan.

11.4 Inventory checks

This produces 36 lessons and 108 required lesson exercises. A local mini-task in a lesson is a short rubric exercise and is not counted as one of the three substantial project missions. Make the third exercises in L05, L08, and L13 runnable function-repair tasks as well as their listed implementation exercises. Ensure at least twenty lesson exercises are runnable JavaScript or TypeScript function tasks, at least twenty-four involve debugging or code review, and at least twelve require a short explanation with a rubric. These categories may overlap; do not silently convert everything into multiple choice to hit the count.

The 72 review cards include one recall card and one transfer, code-reading, or debugging card per lesson. Placement assessments use separately authored items, not copies of the lesson exercises. Every chapter should contain references to official documentation where external behavior matters. The content production process must check references and technology versions when authoring, rather than treating this inventory as complete teaching text.

12 Expansion curriculum

12.1 V2 deeper Node.js and production practice

Each of the following eight chapters contains three lessons, nine lesson exercises, six review cards, and a five-item placement assessment.

Chapter

Three lesson subjects and application

N13 persistence depth

Index selection and query plans; cursor pagination; optimistic concurrency on edited records

N14 transaction correctness

Multi-table invariants; isolation and locking; idempotent order submission

N15 API evolution

Filtering and versioned contracts; pagination compatibility; safe schema and API changes

N16 background work

Job state machines; retries with backoff; idempotency and interrupted work

N17 security depth

Resource-scoped permissions; input and output boundaries; dependency and secret handling

N18 integration testing

Database-backed tests; contract tests with third-party mocks; failure injection

N19 frontend depth

Complex forms; large list performance; accessible async interactions

N20 operations and review

Structured diagnostics; deployment recovery; code review and change proposals

Include external-service fixtures with success, timeout, malformed response, duplicate webhook, and retry cases. Use mocks for repeatable teaching; live paid services are not required. Introduce Redis, queues, or cloud services only in optional comparisons unless a later explicit scope change requires them.

12.2 V3 C# and .NET

Each of the following ten chapters contains three lessons, nine exercises, six review cards, and a five-item placement assessment. C# execution happens locally with the pinned .NET SDK; browser work covers reading, prediction, and conceptual checks.

Chapter

Three lesson subjects and comparison

D01 C# fundamentals

Values and nullability; control flow and methods; TypeScript-to-C# differences

D02 C# modeling

Records and classes; interfaces and composition; collections and generics

D03 LINQ

Filtering and projection; grouping and aggregation; deferred execution pitfalls

D04 asynchronous C#

Tasks and async/await; cancellation tokens; exceptions and async boundaries

D05 ASP.NET Core

Routing and binding; middleware and dependency injection; validation and error contracts

D06 EF Core

Entities and relationships; migrations; tracking, projection, and generated SQL

D07 data correctness

Transactions; concurrency tokens; indexes and query performance

D08 security

Authentication schemes; authorization policies; resource ownership checks

D09 testing

Unit tests with xUnit; API integration tests; database-backed regression tests

D10 operation and comparison

Configuration and logs; background services and deployment; equivalent Node and .NET design review

Use PostgreSQL for the default .NET learning projects to isolate language and framework differences. Add an explicit SQL Server and T-SQL comparison lesson later, including dialect and provider differences, without requiring the platform database to change. Distinguish LINQ over in-memory collections from queries translated by EF Core. Do not teach legacy ASP.NET or .NET Framework as the default modern backend path.

12.3 Optional framework extensions

Next.js can extend the React track with routing, rendering boundaries, server data, and deployment. Angular can extend it with templates, dependency injection, forms, and reactive streams. Neither belongs in the V1 dependency graph. Add them as original, versioned learning packages after the Node and .NET goals are working; do not fragment fundamentals across several frontend frameworks prematurely.

13 Project missions and runnable repositories

13.1 Repository conventions

Each mission includes a reproducible starter snapshot and a separately identified reference solution. Use branches, tags, or generated archives with checksums; document the exact source commit once real commits exist. Never invent commit hashes in authored mission content. A starter must include its own README, package lockfile or SDK pin, environment example, seed data, baseline tests, mission tests, and troubleshooting instructions.

Baseline checks verify that the starter runs. Mission acceptance tests are expected to fail before the feature or repair is implemented. Put them in separate named commands so the owner can distinguish an intentionally incomplete assignment from a broken development setup. Reference solutions must pass both sets. Do not leave dependency installation, database creation, or test commands implicit.

Use clearly fictional users, tickets, and business records. A mission’s intentional defect belongs only in the training repository, never in the platform. No real credentials, customer data, or live destructive integrations. A fresh checkout must reproduce the defect or incomplete behavior before the solution is revealed.

13.2 V1 mission M01 support ticket interface

Work type: build from a scaffold. Prerequisites: chapters 1 through 8. The scaffold includes a React app, fixture data, an API adapter interface, and baseline checks. The owner implements a ticket list, status filter, create-ticket form, and ticket-detail view using a supplied mock API.

Acceptance criteria: title is required and trimmed; validation errors are associated with inputs; submitting disables duplicate submission; loading, empty, error, and success states are visible; filtering does not mutate fixtures; ticket detail is routable; keyboard navigation reaches all controls; a 360-pixel viewport has no page overflow. Include a regression case for a whitespace-only title and a delayed response. Testing emphasizes behavior through React Testing Library and a small Playwright journey.

Three hints address state ownership, validation boundaries, and coordinating success with query refresh. The solution explains component boundaries, derived state, and why a shared API adapter makes the later backend connection easier. Reflection asks the owner to explain what belongs in component state versus server state.

13.3 V1 mission M02 persistent ticket API

Work type: extend a scaffold. Prerequisites: chapters 9 and 10 plus M01 or equivalent experience. Provide a working Node API scaffold, PostgreSQL service, Prisma setup, and synthetic owner identity supplied by the training fixture. The assignment implements ticket creation, list pagination, details, and comments, then connects M01’s interface through its API adapter.

Acceptance criteria: POST validates title and body; GET list uses deterministic ordering by createdAt then id and bounded page size; unknown ticket returns 404; comment references an existing ticket; invalid input changes no rows; migrations apply to an empty database; seed is repeatable; the frontend handles API errors; database integration tests cover empty, multiple-page, and missing-record cases. Public-facing authentication is not claimed complete in this starter; identity fixtures are explicitly training scaffolding.

The reference solution explains HTTP contracts, transaction boundaries, foreign keys, and why TypeScript does not replace runtime validation. Include an exercise to inspect generated SQL. Reflection asks which rules belong in API validation versus database constraints.

13.4 V1 mission M03 ownership defect and regression

Work type: repair existing code. Prerequisites: chapters 11 and 12 and M02. Provide a runnable support-desk version with two fictional users and an intentional route that fetches a ticket by ID without checking ownership. Baseline behavior is reproducible; mission security tests fail before the fix.

Acceptance criteria: one user cannot view, edit, or comment on another user’s ticket; list queries are owner-scoped; route behavior consistently follows the mission’s documented 404 policy for inaccessible resources; no foreign data appears in error details; owner operations still work; regression tests cover all affected endpoints; logs retain a request ID without sensitive content. A superficial UI-only restriction does not pass.

The owner writes a short defect explanation, describes the access-control boundary, and identifies how the regression test would have prevented the issue. The reference solution demonstrates scoped queries or a focused policy service, not a framework rewrite.

13.5 V2 and V3 mission inventory

Mission

Assignment and verification focus

M04 support desk

Extend search and stable cursor pagination; demonstrate no duplicates across pages under the documented fixture

M05 support desk

Investigate an N+1 query pattern; compare query counts and preserve returned behavior

M06 inventory

Build products, stock movements, and orders; enforce quantity and relationship invariants

M07 inventory

Repair duplicate order submission with idempotency and transaction handling; test concurrent duplicates and payload mismatch

M08 inventory

Add a retryable background report job; persist job state, inject failure, and prove reruns do not duplicate committed effects

M09 .NET support desk

Build equivalent ticket API endpoints in ASP.NET Core and connect the existing React frontend

M10 .NET support desk

Repair EF Core projection and tracking issues; verify SQL behavior and resource ownership

M11 .NET inventory

Implement transaction and concurrency handling with EF Core; test conflicting edits and rollback

M12 .NET comparison

Implement a cancellable background workflow and compare operation, tests, and failure handling with the Node version

M07 defines an idempotency key scoped to the fictional user and operation, with a stored request hash and replayed original response. M08 and M12 use small database-backed job records before introducing external queue infrastructure. Make any delivery guarantees explicit; never label a retrying system exactly once without defining the boundary and evidence.

14 Platform testing and quality gates

14.1 Testing strategy

Test business rules and meaningful failure modes. Unit tests cover scheduling, evidence classification, XP uniqueness, grade comparisons, and content-diff classification. API integration tests use a real disposable PostgreSQL database with migrations. Frontend component tests cover interactive states and accessible forms. End-to-end tests cover a small set of complete user journeys. Do not replace persistence tests with mocked repositories and then claim synchronization works.

Use deterministic fixtures and controlled clocks. Tests must run repeatedly without depending on external AI services, third-party APIs, or a production database. A test that merely asserts copied implementation constants is insufficient. Avoid brittle whole-page snapshots; assert behavior and use targeted visual inspection for layout.

14.2 Release acceptance scenarios

ID

Verification and expected result

A01 account isolation

Two synthetic users request one another’s notes, drafts, attempts, imports, and reports; every cross-owner request is denied

A02 durable progress

Complete a lesson, restart the service, sign in from a second browser context, and verify the stored result

A03 idempotent credit

Submit the same completion or attempt twice; one event and one XP award exist

A04 conflicting draft

Two contexts edit the same revision; second save conflicts and both texts remain recoverable

A05 review concurrency

Two contexts submit the same card revision; only one schedules it, and a retry returns its original result

A06 assistance integrity

Reveal a solution, reset starter, and pass; history still shows solution assistance for that mastery revision

A07 runner isolation

Infinite loop, host access, excessive output, and cancellation leave the main app usable and expose no authenticated capability

A08 TypeScript verification

A runtime-correct but type-invalid solution fails the compiler gate

A09 content atomicity

Invalid reference blocks publication; a valid update preserves attempts; competing publish returns conflict

A10 archived content

Removing a lesson from the active release preserves its notes, bookmarks, and historical attempts

A11 placement

Four of five correct with required critical items passing qualifies; revealed repeat is practice only; skip remains available

A12 mobile use

Login, read, answer, reveal a hint, write a note, and review at 360 pixels without lost input or inaccessible actions

A13 project reproducibility

Fresh starter installs, baseline passes, mission checks fail for the intended reason, reference solution passes

A14 network recovery

Interrupted save shows Unsaved; reconnect fetches current revision; no silent overwrite or duplicate completion occurs

A15 export and restore

Export parses against its schema; a database backup restores into a clean environment with the same record counts and relationships

A16 no AI dependency

Core journeys succeed with no LLM credentials configured and no runtime requests to inference providers

A17 content quantity and quality

Release inventory matches minimums; reference solutions pass; representative incorrect variants fail; no empty lesson bodies

A18 release activation

Earlier published release can be selected without deleting newer-version attempts; new content does not receive old mastery automatically

Do not weaken a test to accommodate an observed defect without first checking the requirement. Record the reason for any intentionally changed assertion. The model must fix the implementation when a gate uncovers a real requirement failure.

14.3 Performance targets

Treat these as initial engineering targets measured in a documented test environment, not universal speed guarantees. Today, curriculum, and progress API responses should have p95 below 500 ms on the seeded 1,000-lesson and 10,000-exercise catalog with a warm service. Paginate history and notes. Measure initial mobile-page loading on a recorded network profile; target visible primary content within three seconds on simulated fast 4G.

Keep the editor, compiler, and interpreter out of the initial dashboard bundle. Report compressed initial JavaScript size and target under 300 KiB where feasible. Lazy-load heavy exercise dependencies with a visible progress state. If a target is missed, record the measurement and concrete cause rather than pretending it passed. Avoid premature caching that makes content-version correctness harder.

15 Deployment and operations

15.1 Environments

Local development runs the web app, API, and a disposable PostgreSQL database with documented commands. Automated checks use a separate test database. Production runs one containerized Node service and PostgreSQL with HTTPS, persistent storage, and database backups. Serve the frontend and /api under one origin; content and WASM assets can be served from the same deployment using strict cache policies.

Select a hosting provider based on the owner’s available environment when implementation reaches deployment. Provider selection does not change the application contract. Do not create paid accounts or infrastructure merely because a particular provider appears in an example. If deployment credentials are unavailable, finish the deployable container, configuration examples, migration procedure, and local verification before reporting the specific missing access.

15.2 Configuration contract

Document NODE_ENV, PORT, APP_ORIGIN, DATABASE_URL, AUTH_COOKIE_NAME, session lifetime settings, import size limit, runner limits, and log level. Only genuinely public configuration belongs in the frontend build. Database URLs, password material, CSRF secrets, and session tokens never enter client bundles. The owner bootstrap command is an administrative tool, not an unauthenticated production endpoint.

Use structured request logs with requestId, route, status, duration, and a non-sensitive owner reference. Exclude passwords, cookies, CSRF tokens, note bodies, learner source, and full request payloads by default. Log import failures with item IDs and validation paths without dumping the uploaded package. Provide useful errors to the owner and diagnostic details in server logs.

15.3 Backup and recovery

Back up PostgreSQL daily and retain at least seven daily backups initially. Keep backups outside the running application container. Set an initial recovery objective of at most twenty-four hours of data loss and a documented restore process that can be performed within four hours; test these objectives rather than claiming an SLA. Preserve content release assets with matching checksums so starter downloads remain usable.

Provide a human-readable recovery runbook: restore database into a clean instance, restore matching assets, run migration compatibility checks, configure secrets, start the service, verify owner login and active release, and compare record counts. Application JSON export is a portability feature; it is not a replacement for a consistent database backup.

15.4 Release procedure

Run formatting, lint, type checks, business-rule tests, API integration tests, representative end-to-end checks, content validation, and production build. Build a versioned container. Back up production before applying migrations. Prefer additive migrations and separate removal steps; never automatically drop learner history. Apply the migration, start the new service, verify readiness and the principal learning flow, and monitor errors. Record application commit, migration version, content release ID, and rollback instructions.

Rollback application code only when its database compatibility is known. Restoring a database backup is a distinct recovery action with possible data loss; do not call it an ordinary rollback without explaining the consequence. Do not deploy merely to prepare this specification; deployment belongs to the later implementation workflow.

16 Detailed implementation backlog

The tickets below are ordered by dependency, not by optimistic calendar estimates. Each ticket must have an owner-visible result, a verification record, and an updated status in docs/implementation-checklist.md. Keep commits focused on one coherent change. The implementation model should continue through authorized work instead of stopping after scaffolding or the first screenshot.

16.1 Phase P0 foundations and feasibility

P0-01 Repository assessment. Inspect the working directory, existing instructions, stack, package manager, and version-control state. Preserve unrelated work. Create docs/product-spec.md from this specification, docs/implementation-checklist.md, and docs/decisions/0001-architecture.md. If the repository is empty, create the workspace structure from section 5. Acceptance: the model can identify what exists, what will be created, and the approved stack without guessing. Dependency: none.

P0-02 Toolchain and local setup. Pin a supported Node LTS and compatible dependencies; initialize React, the API, shared contracts, PostgreSQL, Prisma, formatting, linting, and strict type checking. Add .env.example, a root README, and commands for dev, build, typecheck, lint, test, db:migrate, db:seed, and content:validate. Acceptance: a fresh clone can start the app and database using documented commands. Dependency: P0-01.

P0-03 Runner feasibility spike. Build a minimal worker/interpreter adapter with one JS function, one TS function, compile diagnostics, stop, timeout, console limits, and no exposed network or storage. Verify on Chromium and WebKit before connecting it to the product. Acceptance: A07 and A08 representative checks pass; current runtime limitations and pinned versions are recorded. Dependency: P0-02. Do not proceed by substituting unsafe host eval if this spike fails.

P0-04 Contract fixtures. Implement content and mutation schemas, a tiny complete one-chapter package, representative valid and invalid imports, and database migrations for owner, release, content, and session records. Acceptance: malformed references, unknown fields, duplicate versions, and prerequisite cycles return actionable validation errors. Dependency: P0-02.

Phase P0 exit: reproducible development environment, proven bounded runner path, valid content schema, and a recorded architecture decision. This is a foundation milestone, not a usable course release.

16.2 Phase P1 first complete learning journey

P1-01 Owner authentication. Implement bootstrap and reset commands, password hashing, database sessions, cookie policy, CSRF controls, logout, and protected routes. Acceptance: A01 authentication subset passes; session expiry preserves an unsaved editor state. Dependency: P0-04.

P1-02 Navigation and catalog. Build responsive navigation, Today, chapter list, lesson list, lesson reader, loading and error states, and theme tokens. Read real versioned fixture content through the API. Acceptance: the first chapter can be navigated by keyboard and on a 360-pixel viewport; no hardcoded dashboard counts. Dependency: P1-01 and P0-04.

P1-03 Exercises and reveals. Implement choice, prediction, rubric, and function exercise renderers. Integrate the proven runner and persisted hint/solution reveal events. Acceptance: each renderer accepts a response, displays prepared feedback, and accurately labels grading origin and assistance. Dependency: P0-03 and P1-02.

P1-04 Attempts and completion. Persist attempts, implement required-exercise completion checks, idempotent XP awards, skip, and chapter progress. Acceptance: A02, A03, and A06 pass on the first complete lesson. Dependency: P1-03.

Phase P1 exit: owner logs in, reads one real lesson, completes mixed exercises, refreshes, and sees durable progress on a second browser context. Do not expand to dozens of lessons before this works.

16.3 Phase P2 sync and learning evidence

P2-01 Draft and note persistence. Implement debounced saves, expectedRevision checks, recoverable snapshots, conflict UI, and note deletion semantics. Acceptance: A04 and A14 pass for both code and notes. Dependency: P1-04.

P2-02 Evidence and placement. Implement concept evidence derivation, assistance history, placed-out status, and five-item assessments with practice-only repeats. Acceptance: A06 and A11 pass with deterministic fixtures; skipping does not create mastery. Dependency: P1-04.

P2-03 Review engine. Implement cards, scheduling, ratings, controlled-clock tests, due queue, and optimistic concurrency. Acceptance: A05 passes; wrong objective answers force Again; same-event retries do not advance the schedule twice. Dependency: P2-02.

P2-04 Today and progress. Combine resume activity, reviews, active mission placeholder, notes, bookmarks, evidence, and XP using live owner data. Add focus/reconnect refresh and polling only while visible. Acceptance: two devices converge within the documented sync window; no invented statistics. Dependency: P2-01 through P2-03.

Phase P2 exit: everyday learning, recall, and cross-device continuity work with accurate evidence labels and safe conflict handling.

16.4 Phase P3 projects and content operations

P3-01 Mission workflow. Build the project catalog, mission reader, versioned starter download links, checklist, reference-solution reveal, and self-reported completion form. Acceptance: reported local results are never labeled server-verified; repository links are validated but not fetched. Dependency: P2-04.

P3-02 Support-desk repositories. Author M01, M02, and M03 starters, baseline and mission checks, reference solutions, seed data, and troubleshooting. Acceptance: A13 passes for each mission in a fresh environment; three real archives or source references are available. Dependency: P3-01.

P3-03 Content build CLI. Implement chapter assembly into a snapshot, schema validation, reference checks, duplicate reports, solution checks, mutant checks, and inventory counts. Acceptance: intentionally broken packages fail with item-specific diagnostics and nonzero exit codes. Dependency: P0-04 and P1-03.

P3-04 Import and publication UI. Implement draft upload, preview, diff, publish transaction, base-release conflict, archived references, and prior-release activation. Acceptance: A09, A10, and A18 pass. Dependency: P3-03 and P2-01.

Phase P3 exit: the owner can add original content and work through real VS Code missions without an AI API or custom editor extension.

16.5 Phase P4 initial curriculum production

P4-01 Author chapters 1 through 4. Produce twelve lessons, thirty-six lesson exercises, twenty-four cards, and four placement assessments. Validate references and examples; run available code solutions and incorrect variants. Acceptance: chapter-level inventory and quality checks pass. Dependency: P3-03.

P4-02 Author chapters 5 through 8. Produce the next twelve lessons with matching exercise, card, and assessment counts. Verify TS diagnostics, local React assignments, and accessibility explanations. Acceptance: no browser exercise requires unsupported DOM, imports, or network capabilities. Dependency: P4-01 for instructional continuity.

P4-03 Author chapters 9 through 12. Produce the remaining twelve lessons and align them with M02 and M03. Verify SQL examples against the project database and security examples against actual tests. Acceptance: instructions match repository filenames, commands, and starter behavior. Dependency: P4-02 and P3-02.

P4-04 Editorial and teaching review. Check each lesson for objectives, understandable explanation, original worked example, useful hints, meaningful incorrect-answer feedback, source references, and concept links. Check the exercise diversity minimums and all inventory counts. Acceptance: A17 passes and the published release contains no placeholder bodies, copied filler, or unreachable required items. Dependency: P4-01 through P4-03.

Phase P4 exit: V1 content is fully authored and validated. The specification’s curriculum inventory alone is not a substitute for this work.

16.6 Phase P5 hardening and V1 release

P5-01 End-to-end verification. Run all applicable A01 through A18 scenarios, browser checks, performance measurements, and mobile visual review. Fix observed defects. Acceptance: required gates pass with recorded commands, fixtures, and results; limitations are specific and visible. Dependency: P4-04 and P3-04.

P5-02 Export and recovery. Implement versioned progress export, session maintenance, database backups, and the restore runbook. Restore a real test backup into a clean environment. Acceptance: A15 passes and the owner can locate export and recovery instructions. Dependency: P5-01 for release-shaped data.

P5-03 Production packaging. Build a container, readiness checks, environment reference, migration command, release checklist, and rollback notes. Use authorized hosting access if available; otherwise report the exact missing credential after local packaging succeeds. Acceptance: production-mode startup and the principal journey pass in a clean environment. Dependency: P5-02.

P5-04 Handoff. Update README, architecture notes, content authoring guide, learning algorithms, API contract, data model, operations runbook, known limitations, and next-release backlog. Acceptance: a new coding model can resume without needing the original chat or guessing which tests passed. Dependency: P5-03.

Phase P5 exit: V1 definition of done is satisfied. Do not call V2 or V3 complete. If the owner authorized only a V1 implementation session, this is the stopping point with a complete handoff.

16.7 Phase P6 Node.js expansion

P6-01 Author N13 through N16 and missions M04, M06, and M07. Validate query, pagination, transaction, and idempotency examples using real PostgreSQL tests. P6-02 author N17 through N20 and missions M05 and M08. Include measured query behavior and failure-injection results. P6-03 publish the validated V2 release and rerun regression gates for content updates, archived history, synchronization, and project setup.

Acceptance: twenty-four additional lessons, seventy-two lesson exercises, forty-eight cards, eight assessments, and five working missions are delivered. The app continues to work with old V1 attempts and notes. Dependency: V1 release complete.

16.8 Phase P7 C# and .NET expansion

P7-01 Pin the supported .NET SDK and create a reproducible ASP.NET Core, EF Core, and xUnit starter. P7-02 author D01 through D05 and M09. P7-03 author D06 through D10 and M10 through M12. P7-04 verify comparable frontend behavior, SQL examples, cancellation, access controls, transactions, and deployment instructions; publish V3.

Acceptance: thirty additional lessons, ninety lesson exercises, sixty cards, ten assessments, and four .NET missions are delivered. Local dotnet build and dotnet test pass on reference solutions. Node and .NET differences are explained rather than mechanically translating syntax. Dependency: V2 course and shared project contracts complete.

17 Documentation and engineering learning materials

The platform’s own repository should teach the owner how it works. Create docs/codebase-tour.md explaining the main folders, a request’s path through the application, the data flow for completion, and where to make common changes. Create docs/learning-algorithms.md covering evidence, reviews, placement, and XP with concrete examples. Create docs/content-authoring.md with the schema, one validated chapter, commands, and publication workflow.

Create docs/operations.md, docs/testing.md, docs/api.md, docs/data-model.md, and docs/decisions with short architecture records. Each significant implementation milestone gets a concise engineering note: business problem, alternatives considered, selected approach, changed modules, tests run, observed failure cases, and a small practice assignment for the owner.

Provide concise decision summaries and evidence, not private internal chain-of-thought. Do not fabricate a deliberation transcript or a multiagent review. If a second model independently reviews the work later, record its actual findings and the resulting fixes.

Keep docs aligned with the code. Commands must run, filenames must exist, and examples must use the pinned dependencies. Avoid producing hundreds of generic markdown pages that say little about the actual repository. A shorter accurate explanation of a real change is more useful than boilerplate senior-engineering advice.

18 Prompts for implementation and content generation

18.1 Kickoff prompt for the implementing model

Use the following text with this entire document attached or placed in the repository.

Implement the Personal Web Development Learning Platform according to the attached specification. Read it fully and treat the approved requirements as constraints. Begin with repository inspection, preserve existing work, and execute the P0 through P5 V1 backlog in dependency order. Build real functionality and authored learning content, not only a UI scaffold. Use the approved React, TypeScript, Node.js, and relational-database architecture with the defaults in the specification unless a concrete compatibility issue requires a documented adjustment.

Do not add a runtime AI dependency. Do not replace the bounded browser interpreter with host eval or server-side execution of learner code. Preserve stable content IDs and immutable versions. Implement server persistence, idempotency, owner checks, and conflict handling before claiming device sync works. Label project results as self-reported and browser checks as browser-automated.

Maintain docs/implementation-checklist.md and docs/handoff.md as you work. After each milestone, record completed ticket IDs, changed modules, commands actually run, observed results, remaining defects, and the next task. Continue through routine reversible implementation work. Ask only when a specific missing credential or incompatible requirement blocks a necessary action. Do not ask the owner to reconfirm decisions already contained here.

Use meaningful tests from the acceptance matrix. Do not weaken tests to conceal defects. Generate curriculum in chapter-sized batches, validate solutions and incorrect variants, and publish only after the content gates pass. Keep V2 and V3 visible in the backlog; V1 completion does not mean the entire curriculum is finished. Finish with a working V1, setup instructions, verified content counts, test evidence, and a precise list of any remaining limitations.

18.2 Continuation prompt

Read docs/product-spec.md, docs/implementation-checklist.md, docs/handoff.md, the applicable repository instructions, and the recent git history. Identify the next incomplete ticket and verify the present state before changing it. Resume from that ticket without rebuilding completed modules. Preserve approved architecture and learning rules. If documentation and code disagree, inspect tests and behavior, repair the discrepancy, and record what changed. Do not claim earlier checks passed unless their evidence exists or you rerun the necessary check.

18.3 Chapter generation prompt

Author one original chapter for this learning platform using the supplied schema, chapter objectives, neighboring chapter context, and existing stable ID catalog. Produce three lessons, nine lesson exercises, six review cards, and one five-item placement assessment. Each lesson needs an accessible explanation, realistic business example, common mistakes, references, and explicit concept links. Include varied practice: code reading, implementation where supported, debugging, and explanation with a rubric.

Every exercise needs three progressive hints, a correct reference solution, an explanation of why it works, and meaningful feedback for plausible mistakes. Runnable functions must obey the supported single-file JSON-input contract. Include boundary cases and incorrect variants that the grader must reject. Do not call external APIs, require paid services, use unsupported runtime features, or copy another course’s content. Run content validation and available solution checks, report exact results, and fix errors before marking the chapter ready. Return a chapter source package for the build tool; do not publish directly without the owner’s content-publication action.

18.4 Implementation review prompt

Review the repository against this specification and the acceptance matrix. Prioritize missing behavior, data loss, owner-access defects, unsafe code execution, incorrect grading, content-update regressions, misleading completion claims, and broken project setup. Inspect the relevant code and run focused checks. For each finding, report severity, affected requirement or acceptance ID, reproduction, expected versus actual behavior, and a concrete fix. Distinguish verified defects from unresolved questions. Do not produce generic recommendations disconnected from the repository.

19 Definition of done and traceability

19.1 V1 definition of done

Owner sign-in and protected routes work in production mode.

The curriculum, lesson, practice, review, project, progress, note, content, and settings flows are functional with persisted data.

Code exercises use the proven bounded runner and type checking; unsupported workloads lead to local assignments.

Cross-device changes converge, conflicting text is preserved, and retries do not duplicate learning events or XP.

Hint and solution reveals affect evidence accurately; skip, placement, completion, and retention remain distinct.

Content packages validate, preview, publish atomically, preserve version history, and support prior-release activation.

V1 includes all 36 lessons, 108 lesson exercises, 72 cards, 60 placement items, and three runnable missions with explained solutions.

Meaningful platform tests, content checks, starter and solution checks, mobile inspection, and a backup restore have passed.

No AI API credential is necessary for normal use. Hosting configuration and any access limitation are documented.

Setup, architecture, content authoring, operations, and model continuation instructions match the implemented repository.

19.2 Requirement mapping

Requirement

Specification sections

Main tickets and checks

Hybrid browser and VS Code learning

3, 7, 13

P0-03, P1-03, P3-01/02; A07, A08, A13

Fundamentals with skipping

3, 11

P2-02, P4-01/04; A11

Node first and .NET later

11, 12, 16

P4, P6, P7; release inventory checks

Pregenerated content with no AI API

2, 10, 18

P3-03/04, P4; A16, A17

Laptop and phone synchronization

4, 8, 9

P2-01/04; A02, A04, A05, A12, A14

Safe content updates

8, 10

P3-04; A09, A10, A18

Practical engineering skills

11, 12, 13, 17

P3-02, P4, P6, P7; A13, A17

Private personal use

6, 8, 15

P1-01, P5; A01, A15

19.3 Known design limits

Browser results are inspectable and client-reported; the product is for personal learning. Project outcomes are self-reported in V1. The retention algorithm is a transparent heuristic. Full offline learning is deferred. Browser coding supports a constrained function environment, not an entire web IDE. V1 is a broad foundation course; production depth and .NET are explicit later releases. The document defines the implementation and content work but does not contain the final authored lesson bodies or implemented application.

20 Technical references and maintenance checks

These primary sources support the technical defaults and security boundaries. Consult the current official version during implementation, pin the tested dependency versions, and record deviations. The product’s curriculum, counts, algorithms, and release design are original planning decisions, not claims sourced from these references.

Node.js recommends supported LTS releases for production. Recheck the release table before selecting the runtime. Official source: https://nodejs.org/en/about/previous-releases and the release repository at https://github.com/nodejs/node/releases.

Microsoft’s .NET support documentation identifies supported releases and their lifecycle. Use a supported LTS SDK for the .NET course and record it in global.json. Official source: https://learn.microsoft.com/en-us/dotnet/core/releases-and-support.

Fastify documents schema-based validation and serialization. Use application-authored schemas rather than compiling uploaded lesson data as route schemas. Official source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/.

TypeScript’s strict option enables stronger checking; the runner must perform semantic diagnostics rather than treating transpilation as validation. Official source: https://www.typescriptlang.org/tsconfig/strict.html.

QuickJS Emscripten documents interpreter contexts, exposed host functions, and runtime limits. The runner spike must verify the chosen build’s behavior and review current limitations. Project source: https://github.com/justjake/quickjs-emscripten. Runtime API reference: https://github.com/justjake/quickjs-emscripten/blob/main/doc/quickjs-emscripten-core/classes/QuickJSAsyncRuntime.md.

OWASP describes session-cookie controls and CSRF prevention, including the fact that SameSite is defense in depth. Security references: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html and https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html.

MDN documents iframe sandbox behavior and warns about combining script execution and same-origin privileges for same-origin content. This informs the deferred HTML-preview boundary. Browser reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe.

Prisma documents transaction behavior. Use transactions and database constraints for compound mutations, and verify revision-update semantics against the selected Prisma version. Official source: https://www.prisma.io/docs/orm/fundamentals/transactions.