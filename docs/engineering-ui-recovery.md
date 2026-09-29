# UI recovery behavior

DevPractice preserves unsaved exercise drafts, notebook notes, and lesson quick notes in browser storage. Recovery keys include the authenticated owner ID, so a different owner in the same browser does not receive another owner's recovered text.

Exercise drafts store their server base revision. Reopening a matching revision resumes autosave; a changed server revision opens the existing conflict UI with both versions preserved. Network failures retain the local copy, and online or same-owner session restoration retries the save. Coding results are cleared when either editor changes, and editing during a worker run cancels that run before it can display or submit stale results.

Notebook note creates retain their client event ID across identical retries. If the server committed a create but its response was lost, retrying returns the original mutation result instead of creating a duplicate. Revision-conflict UI is shown only when a 409 contains a valid note revision; unrelated 409 responses remain recoverable errors. Lesson quick-note saves are serialized. Text typed while a request is pending remains in the editor and recovery storage, and lesson routes use keyed workspaces so a late response from one lesson cannot clear another lesson's text.

Session restoration events fire only when the newly authenticated owner matches the owner whose workspace is mounted. Active server queries are invalidated after reauthentication. Placement, mission, lesson, and practice workspaces reset state at their route or content-version boundaries.

The implementation lives in:

- `apps/web/src/api.ts`
- `apps/web/src/main.tsx`
- `apps/web/src/use-draft.ts`
- `apps/web/src/practice.tsx`
- `apps/web/src/placement-code.tsx`
- `apps/web/src/personal-pages.tsx`
- `apps/web/src/learning-pages.tsx`

`tests/browser/recovery.spec.ts` covers reload recovery, lost-response create idempotency, edits during a delayed quick-note save, and navigation while a save is pending. These scenarios are authored for the disposable PostgreSQL browser environment; execution status must be reported from the integrated test run rather than inferred from source review.
