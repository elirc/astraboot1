# Data model

The Prisma schema and initial SQL migration define 21 models: 20
learning/auth/content tables plus `Concept`. Operational IDs use UUIDs;
authored identities (lesson slugs, exercise IDs) are stable strings.
Timestamps use PostgreSQL `timestamptz`. The sections below explain the four
design patterns those tables implement — each is a pattern you will be asked
about in interviews, and each is enforced in the database, not just in
TypeScript.

## 1. Immutable content with an activation pointer

The content chain is `ContentItem` → `ContentVersion` → `ReleaseItem` →
`User.activeReleaseId`:

- `ContentItem` is the identity ("this exercise exists").
- `ContentVersion` stores an immutable payload and checksum, unique on
  `(itemId, version)`. Published content is never edited — a change is a new
  version.
- `ReleaseItem` maps a published release to the exact versions it contains.
- The owner's `activeReleaseId` and its revision change **transactionally**
  with publication: there is no instant where half the new release is live.

Immutability is not a convention here — it's a trigger. From the initial
migration:

```sql
CREATE TRIGGER content_version_immutable BEFORE UPDATE OR DELETE
ON "ContentVersion" FOR EACH ROW EXECUTE FUNCTION protect_content_version();
```

Any UPDATE or DELETE on a content version raises
`'Content versions are immutable'` — even from a future bug, a migration
script, or a psql session. Attempts and review events point at exact
versions, so history stays truthful: what you answered is forever the thing
you actually answered.

**Why this matters**: the alternative (editing content in place) silently
rewrites the meaning of every past attempt. This is the same reasoning as
the snapshot columns on an e-commerce order — per column, you decide
"frozen at the event" vs "always current".

## 2. Idempotency receipts (`MutationReceipt`)

Every mutation carries a `clientEventId`. `mutate()` in `apps/api/src/db.ts`:

1. takes a `FOR UPDATE` lock on the owner's `User` row (all of one owner's
   mutations serialize — acceptable for a private single-user app, and the
   code comments say exactly that);
2. looks up `(userId, clientEventId)` in `MutationReceipt`;
3. on a hit with the **same** canonical request hash, replays the stored
   JSON response (a retry is harmless); on a hit with a **different** hash,
   returns 409 `IDEMPOTENCY_CONFLICT` (the client reused an event ID);
4. otherwise runs the domain write and inserts the receipt **in the same
   transaction** — domain change and receipt commit together or not at all.

`XpAward` has its own `(userId, awardKey)` unique constraint as a second,
independent guard: `award()` is an upsert whose update branch does nothing,
so "first exercise pass earns 10 XP" can survive even a code path that calls
it twice.

## 3. Revisions for optimistic concurrency

`ExerciseDraft`, `Note`, `ReviewState` and `MissionProgress` carry integer
revisions (`LessonProgress` has a similar `version` counter, incremented on
update). A write presents the revision it read; a mismatch is
a 409 `REVISION_CONFLICT` ("changed on another device") and the client keeps
its draft. `DraftSnapshot` retains the twenty prior draft sources (pruned in
the same transaction as the write that adds the twenty-first).
`PlacementAttempt` keeps `qualified` and `practiceOnly` as separate recorded
facts. `RevealEvent` preserves assistance evidence across editor resets.

## 4. Constraints the database owns

Foreign keys enforce every relational reference. SQL `CHECK` constraints
bound note and source lengths, review steps, and require positive versions
and XP. The rule of thumb this schema follows: anything that must be true
*regardless of which code path writes* belongs in the database — uniqueness,
immutability, bounds — while anything that needs a friendly message is also
validated in Zod at the route boundary. When you see the same rule in both
places, that's intentional defense in depth, not duplication.

## Retention and operations

Learning history and mutation receipts are retained indefinitely.
Maintenance currently prunes expired/revoked sessions only. Backups use
`pg_dump` and a separately tested restore — the JSON export in
`personal.ts` is a user-facing data copy, not the backup strategy.

**Verify it yourself**: open `prisma/migrations/` and find (a) the
`content_version_immutable` trigger, (b) one `CHECK` constraint on a length,
and (c) the unique index behind `XpAward`. **Check**: you can explain, for
each, what bug it stops that TypeScript alone would miss.
