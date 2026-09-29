-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" UUID NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "preferencesRevision" INTEGER NOT NULL DEFAULT 0,
    "activeReleaseRevision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeReleaseId" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "userId" UUID NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContentItem" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContentVersion" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "masteryRevision" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContentRelease" (
    "id" UUID NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageVersion" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "snapshot" JSONB NOT NULL,
    "validationSummary" JSONB NOT NULL,
    "baseReleaseId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3),
    "ownerId" UUID NOT NULL,

    CONSTRAINT "ContentRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReleaseItem" (
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "releaseId" UUID NOT NULL,
    "itemId" TEXT NOT NULL,
    "versionId" UUID NOT NULL,

    CONSTRAINT "ReleaseItem_pkey" PRIMARY KEY ("releaseId","itemId")
);

-- CreateTable
CREATE TABLE "public"."Concept" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Attempt" (
    "id" UUID NOT NULL,
    "clientEventId" UUID NOT NULL,
    "source" TEXT,
    "answer" JSONB,
    "outcome" TEXT NOT NULL,
    "gradingOrigin" TEXT NOT NULL,
    "assistance" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "exerciseVersionId" UUID NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RevealEvent" (
    "id" UUID NOT NULL,
    "clientEventId" UUID NOT NULL,
    "masteryRevision" INTEGER NOT NULL,
    "revealKind" TEXT NOT NULL,
    "hintIndex" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "RevealEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonProgress" (
    "status" TEXT NOT NULL,
    "readAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "userId" UUID NOT NULL,
    "lessonId" TEXT NOT NULL,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("userId","lessonId")
);

-- CreateTable
CREATE TABLE "public"."PlacementAttempt" (
    "id" UUID NOT NULL,
    "clientEventId" UUID NOT NULL,
    "submittedAnswers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "qualified" BOOLEAN NOT NULL,
    "practiceOnly" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "assessmentVersionId" UUID NOT NULL,

    CONSTRAINT "PlacementAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExerciseDraft" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" UUID NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "contentVersionId" UUID NOT NULL,

    CONSTRAINT "ExerciseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DraftSnapshot" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "baseRevision" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draftId" UUID NOT NULL,

    CONSTRAINT "DraftSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReviewState" (
    "step" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "userId" UUID NOT NULL,
    "cardId" TEXT NOT NULL,

    CONSTRAINT "ReviewState_pkey" PRIMARY KEY ("userId","cardId")
);

-- CreateTable
CREATE TABLE "public"."ReviewEvent" (
    "id" UUID NOT NULL,
    "clientEventId" UUID NOT NULL,
    "rating" TEXT NOT NULL,
    "correctness" BOOLEAN,
    "gradingOrigin" TEXT NOT NULL,
    "fromRevision" INTEGER NOT NULL,
    "wasDue" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "cardVersionId" UUID NOT NULL,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Note" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" UUID NOT NULL,
    "contentItemId" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bookmark" (
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "contentItemId" TEXT NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("userId","contentItemId")
);

-- CreateTable
CREATE TABLE "public"."MissionProgress" (
    "checklist" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "repositoryUrl" TEXT,
    "commitHash" TEXT,
    "report" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" UUID NOT NULL,
    "missionId" TEXT NOT NULL,

    CONSTRAINT "MissionProgress_pkey" PRIMARY KEY ("userId","missionId")
);

-- CreateTable
CREATE TABLE "public"."XpAward" (
    "id" UUID NOT NULL,
    "awardKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "XpAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityEvent" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "relatedRecordId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "contentItemId" TEXT,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MutationReceipt" (
    "clientEventId" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "MutationReceipt_pkey" PRIMARY KEY ("userId","clientEventId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_normalizedEmail_key" ON "public"."User"("normalizedEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_itemId_version_key" ON "public"."ContentVersion"("itemId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRelease_ownerId_packageId_packageVersion_key" ON "public"."ContentRelease"("ownerId", "packageId", "packageVersion");

-- CreateIndex
CREATE INDEX "ReleaseItem_releaseId_kind_sequence_itemId_idx" ON "public"."ReleaseItem"("releaseId", "kind", "sequence", "itemId");

-- CreateIndex
CREATE INDEX "Attempt_userId_exerciseVersionId_createdAt_idx" ON "public"."Attempt"("userId", "exerciseVersionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_clientEventId_key" ON "public"."Attempt"("userId", "clientEventId");

-- CreateIndex
CREATE INDEX "RevealEvent_userId_itemId_masteryRevision_idx" ON "public"."RevealEvent"("userId", "itemId", "masteryRevision");

-- CreateIndex
CREATE UNIQUE INDEX "RevealEvent_userId_clientEventId_key" ON "public"."RevealEvent"("userId", "clientEventId");

-- CreateIndex
CREATE UNIQUE INDEX "PlacementAttempt_userId_clientEventId_key" ON "public"."PlacementAttempt"("userId", "clientEventId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseDraft_userId_exerciseId_key" ON "public"."ExerciseDraft"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "ReviewState_userId_dueAt_idx" ON "public"."ReviewState"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewEvent_userId_clientEventId_key" ON "public"."ReviewEvent"("userId", "clientEventId");

-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_idx" ON "public"."Note"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "MissionProgress_userId_status_idx" ON "public"."MissionProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "XpAward_userId_awardKey_key" ON "public"."XpAward"("userId", "awardKey");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_id_idx" ON "public"."ActivityEvent"("userId", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_activeReleaseId_fkey" FOREIGN KEY ("activeReleaseId") REFERENCES "public"."ContentRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentVersion" ADD CONSTRAINT "ContentVersion_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentRelease" ADD CONSTRAINT "ContentRelease_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReleaseItem" ADD CONSTRAINT "ReleaseItem_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "public"."ContentRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReleaseItem" ADD CONSTRAINT "ReleaseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReleaseItem" ADD CONSTRAINT "ReleaseItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "public"."ContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Attempt" ADD CONSTRAINT "Attempt_exerciseVersionId_fkey" FOREIGN KEY ("exerciseVersionId") REFERENCES "public"."ContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RevealEvent" ADD CONSTRAINT "RevealEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RevealEvent" ADD CONSTRAINT "RevealEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementAttempt" ADD CONSTRAINT "PlacementAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlacementAttempt" ADD CONSTRAINT "PlacementAttempt_assessmentVersionId_fkey" FOREIGN KEY ("assessmentVersionId") REFERENCES "public"."ContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExerciseDraft" ADD CONSTRAINT "ExerciseDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExerciseDraft" ADD CONSTRAINT "ExerciseDraft_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExerciseDraft" ADD CONSTRAINT "ExerciseDraft_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "public"."ContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DraftSnapshot" ADD CONSTRAINT "DraftSnapshot_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "public"."ExerciseDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewState" ADD CONSTRAINT "ReviewState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewState" ADD CONSTRAINT "ReviewState_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewEvent" ADD CONSTRAINT "ReviewEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReviewEvent" ADD CONSTRAINT "ReviewEvent_cardVersionId_fkey" FOREIGN KEY ("cardVersionId") REFERENCES "public"."ContentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bookmark" ADD CONSTRAINT "Bookmark_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionProgress" ADD CONSTRAINT "MissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MissionProgress" ADD CONSTRAINT "MissionProgress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."XpAward" ADD CONSTRAINT "XpAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityEvent" ADD CONSTRAINT "ActivityEvent_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "public"."ContentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MutationReceipt" ADD CONSTRAINT "MutationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth for externally supplied bounded text and scheduler state.
ALTER TABLE "ExerciseDraft" ADD CONSTRAINT "draft_source_bytes" CHECK (octet_length(source) <= 65536);
ALTER TABLE "Attempt" ADD CONSTRAINT "attempt_source_bytes" CHECK (source IS NULL OR octet_length(source) <= 65536);
ALTER TABLE "Note" ADD CONSTRAINT "note_body_length" CHECK (char_length(body) <= 20000);
ALTER TABLE "ReviewState" ADD CONSTRAINT "review_step_range" CHECK (step BETWEEN 0 AND 5);
ALTER TABLE "XpAward" ADD CONSTRAINT "xp_positive" CHECK (amount > 0);
ALTER TABLE "ContentVersion" ADD CONSTRAINT "content_positive_versions" CHECK (version > 0 AND "masteryRevision" > 0);
CREATE FUNCTION protect_content_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Content versions are immutable'; END; $$;
CREATE TRIGGER content_version_immutable BEFORE UPDATE OR DELETE ON "ContentVersion" FOR EACH ROW EXECUTE FUNCTION protect_content_version();
