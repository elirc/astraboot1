# Dependency verification

The 2026-09-09 registry audit identified advisories in the originally pinned Fastify, static serving, and React Router versions. The root project now pins Fastify 5.12.3, @fastify/static 10.1.3, and react-router-dom 7.18.3 with a regenerated pnpm lockfile. These versions exceed the maintainers' patched ranges. Authentication is checked against the matched API route, with encoded/noncanonical-path regression coverage.

A subsequent `pnpm audit --prod --json` reported zero critical, moderate, or low advisories and two high advisories: effect 3.16.12 and deepmerge-ts 7.1.5. Both enter through Prisma 6.16.2's command-line configuration package. The platform does not import Effect or DeepmergeTS in its HTTP handlers or execute uploaded content as Prisma configuration. Prisma commands use repository-owned configuration. These remaining CLI dependencies have not been forced across a major version override; the audit is not clean and no claim of zero vulnerabilities is made.

This is a dependency and source-reachability check, not penetration testing. Raw audit output is retained locally under `.data/dependency-audit.json`. Mission ZIPs retain their original checksums; patched reference dependencies are distributed under a new immutable asset revision.

Maintainer references:

- https://github.com/fastify/fastify/security/advisories/GHSA-w2qp-rph6-63g4
- https://github.com/fastify/fastify-static/security/advisories/GHSA-8pvw-jcv7-9cmj
- https://github.com/remix-run/react-router/releases/tag/react-router@7.18.0
- https://github.com/Effect-TS/effect/security/advisories/GHSA-38f7-945m-qr2g
- https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx