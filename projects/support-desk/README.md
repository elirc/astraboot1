# Support-desk training repositories

The reference source in `reference/` implements the three V1 missions. It uses fictional identity headers and loopback servers for local training; it does not claim production authentication.

The release builder creates independent starter and reference archives for M01 (interface), M02 (persistent API), and M03 (ownership repair). Each archive includes its own pinned package manifest and lock, setup guide, fixture data, baseline tests, and separate mission tests. `pnpm content:assemble` repeats the current manifest version; use a new explicit `node scripts/build-missions.mjs --asset-version vN` when archive inputs change, then rebuild the curriculum. Published ZIP bytes are immutable, and the manifest retains checksums for older versions.

The intentional M03 flaw is introduced only into its generated training starter policy file. The learning platform never imports this code.

Run the reference UI checks from `reference/` with `pnpm test:baseline` and `pnpm test:mission`. API and security checks require an explicitly configured disposable database ending in `_test`; see the generated repository README. Verification results are recorded separately in `docs/mission-verification.json` after the commands actually run.

The reference is a standalone pnpm workspace (`packages: ['.']`). This boundary is required on Windows: without an explicit self-package, pnpm invoked under this nested directory can discover the platform workspace and offer to replace its root `node_modules`. Release acceptance still extracts each ZIP into a dedicated directory outside the platform workspace before running `pnpm install --frozen-lockfile`; only the generated standalone lockfile is copied back during dependency updates.
