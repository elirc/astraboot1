# Content authoring

## Source and assembly

`curriculum/authoring/chapter-02.mjs` through `chapter-12.mjs` contain original lesson prose, worked examples, exercises, retrieval cards, and independently authored placement problems. The complete first chapter is in `curriculum/fixtures/chapter-01.json`. Shared factories in `helpers.mjs` supply structure; they do not substitute counts for authored teaching content. `placement-coding.mjs` adds separate runnable placement tasks. `missions.mjs` supplies the mission instructions.

Run `pnpm content:assemble` to rebuild the six current trusted mission ZIPs and assemble `curriculum/snapshot.json`. The builder reads the current `assetVersion` from the release manifest, so repeating the command produces the same bytes. To issue a changed archive, run `node scripts/build-missions.mjs --asset-version vN` with a new version, then `node scripts/build-curriculum.mjs`. Run `pnpm content:validate curriculum/snapshot.json --v1` before publication. The current validated V1 has 244 items: one track, 12 chapters, 36 lessons, 108 exercises, 72 cards, 12 five-item assessments, and 3 missions.

The validator checks strict schemas, duplicate IDs and fingerprints, references, parent-child relationships, prerequisite cycles, empty content, case quality, and asset checksums. All runnable reference solutions must pass; starters must fail; explicit incorrect mutants must fail. TypeScript is checked semantically before execution. Current V1 checks 28 runnable lesson/placement tasks and rejects 57 mutants without warnings.

## Versioned imports

The schema is `packages/contracts/src/content.ts`. An envelope uses schemaVersion 1, mode snapshot, stable packageId, increasing packageVersion, nullable baseReleaseId, complete items, and trusted ZIP asset metadata with SHA-256 checksums. Unknown fields are rejected. The importer accepts at most 10 MiB and 2,000 items.

For incremental authoring, `pnpm content:build existing.json new-chapter.json` merges sources into a complete desired snapshot. Include the updated track and reciprocal parent/child links. Set baseReleaseId to the owner's active release before import. Do not upload a chapter alone expecting it to append to the active manifest.

Content → Import previews added, changed, archived, unchanged, and mastery-changed IDs. Publication is atomic and checks the preview checksum and current base release. Competing publication returns 409. Activating a prior published release preserves later attempts.

Editorial changes increment version. Changed grading, solution, objective mapping, or learning behavior also increment masteryRevision. Content versions are immutable. Attempts remain pinned to their original version; notes and bookmarks attach to stable IDs. Old mastery evidence does not silently count for changed practice.

## Safety and mission assets

Raw HTML is disabled; MDX, scripts, unsafe Markdown links, arbitrary filesystem paths, and unregistered assets are rejected. Import never executes package scripts or learner code.

Mission archives come from `projects/support-desk/reference` via `scripts/build-missions.mjs`. The builder injects each intentional starter defect and pins setup/test commands, dependency lockfiles, and checksums. Generated clients, private `.env*` files other than `.env.example`, dependencies, and test output are excluded. Mutable release evidence is kept outside the immutable ZIPs in `docs/mission-verification.json`. The release manifest names six current assets and retains checksums for earlier immutable versions; `scripts/verify-archives.ps1` checks both sets and reads every entry with the standard Windows ZIP reader.

After changing an already published asset, issue a new versioned asset ID. Assembly derives mission download IDs from the manifest version and increments each affected mission's content version and mastery revision; the curriculum package version advances with it. Never replace an immutable published artifact in place.
