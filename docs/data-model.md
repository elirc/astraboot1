# Data model

Prisma schema and initial SQL migration define 20 learning/auth/content tables plus Concept. Operational IDs use UUIDs; authored identities are stable strings. Timestamps use PostgreSQL timestamptz.

ContentItem identifies an item. ContentVersion stores an immutable payload and checksum with unique itemId/version. ReleaseItem maps an immutable published release to versions. Owner activeReleaseId and its revision change transactionally with publication. Attempt and review events point to exact versions; notes, bookmarks, drafts and lesson status use stable identities.

MutationReceipt stores canonical operation/body hashes and successful JSON responses. Owner-row locking serializes private-account mutations before checking receipts. Domain writes and receipts commit together; failed validation leaves neither. XpAward has a separate unique owner/awardKey constraint.

ExerciseDraft and Note have revisions. DraftSnapshot retains twenty prior sources. ReviewState uses a revision and next due date. PlacementAttempt retains qualified and practiceOnly separately. RevealEvent preserves assistance across editor resets. MissionProgress reports remain self-reported.

Foreign keys enforce relational references. SQL checks bound note and source length, review step and positive versions/XP. A database trigger rejects content-version UPDATE/DELETE. Removing release membership through a future explicit archival operation must preserve referenced versions.

Learning history and mutation receipts are retained. Maintenance currently prunes expired/revoked sessions only. Backups use pg_dump and a separately tested restore, not JSON export.
