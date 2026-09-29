CREATE TABLE "User" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL);
CREATE TABLE "Ticket" ("id" TEXT PRIMARY KEY, "ownerId" TEXT NOT NULL REFERENCES "User"("id"),"title" TEXT NOT NULL CHECK(length(btrim("title")) BETWEEN 1 AND 120),"body" TEXT NOT NULL CHECK(length("body") <= 2000),"status" TEXT NOT NULL DEFAULT 'open' CHECK("status" IN ('open','pending','closed')),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "Comment" ("id" TEXT PRIMARY KEY,"ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,"body" TEXT NOT NULL CHECK(length(btrim("body")) BETWEEN 1 AND 2000),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "Ticket_ownerId_createdAt_id_idx" ON "Ticket"("ownerId","createdAt","id");
CREATE INDEX "Comment_ticketId_createdAt_id_idx" ON "Comment"("ticketId","createdAt","id");
