# API contract

JSON endpoints are under /api/v1. Success uses {data,meta?}; errors use {error:{code,message,fieldErrors?,requestId}}. Authenticated mutations check exact Origin plus a session-bound X-CSRF-Token and require a clientEventId UUID. Matching replays return the original successful response; mismatched reuse returns 409.

Auth: GET /auth/csrf; POST /auth/login; GET /auth/me; POST /auth/logout; POST /auth/revoke-all. Login includes the pre-session token in its body. Password reset is a local administration command.

Content: GET /curriculum, /chapters/:id, /lessons/:id, /exercises/:id, /missions and /missions/:id. Ordinary reads omit hints, model answers and objective answer keys. GET /archive/:id reads historical owner-accessible content.

Learning: POST /attempts; POST /exercises/:id/reveals; POST /lessons/:id/{complete,skip,review-cards}; GET/POST /placements/:id; GET /reviews/due; POST /reviews/:id/{reveal,responses}; GET /progress, /attempts, /placement-attempts and /activity.

Personal records: GET/PUT /drafts/:id and GET /drafts/:id/snapshots; GET/POST /notes and PATCH/DELETE /notes/:id; GET /bookmarks and PUT/DELETE /bookmarks/:id; GET/PUT /missions/:id/progress; GET/PATCH /settings; GET /exports/progress.

Content operations: POST /content/imports with {clientEventId,package}; GET /content/imports/:id; POST /content/imports/:id/publish with {clientEventId,checksum}; GET /content/releases; POST /content/releases/:id/activate with expectedRevision.

Revision-checked saves carry expectedRevision. New records use zero; accepted saves increment it. 409 responses preserve the current server record in fieldErrors for the conflict UI. Note deletion is soft and also revision checked. All timestamps originate on the server.

Health: GET /health/live and /health/ready. These return minimal status; readiness checks PostgreSQL.

The exact maintained schemas are in packages/contracts and the route modules. Run pnpm api:docs to generate docs/openapi.json from registered Fastify routes. It documents the route inventory, shared envelopes, pagination, Origin/CSRF headers, and session security. Operation-specific Zod request schemas remain beside handlers. Paginated collections use a default limit of 20, maximum 100, and opaque nextCursor values. /progress optionally accepts lessonId and returns compact current evidence rather than loading every exercise source.

GET /curriculum accepts q and track before cursor pagination; meta.tracks contains the active published track payloads independently of the current chapter search/filter, alongside activeReleaseId. Empty searches still expose available tracks.

GET /bookmarks accepts q before pagination. Search matches stable content IDs and titles from releases published by this owner, including historical titles. Rows return current title/kind/parentId when active, otherwise the latest owner-published title and archived: true. GET /notes accepts q over note title/body; list rows additionally include content: null or {id,kind,title,parentId,archived} for associated-content navigation. Unattached notes stay valid, and note mutation response shapes are unchanged. Draft or other-owner content never supplies navigation metadata.
