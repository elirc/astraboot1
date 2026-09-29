# 0001 — Modular monolith

Accepted: React + strict TypeScript + Vite, Fastify on Node, PostgreSQL with Prisma, immutable content and transactional learning events. Workspace was empty. No repository instructions were present.

The Sites skill was inspected for feasibility. Its Cloudflare Worker deployment and generated Vinext/auth starter conflict with the explicit Node service, PostgreSQL TCP, Vite and password-session specification. The supplied contract takes precedence: retain the requested architecture and package a Node container instead. No Sites project is created.

Node 24 LTS is the production baseline (official release table checked 2026-09-09). Local installed Node 22.16 is supported by the selected dependencies; a later Node 24 verification remains required. Dependencies are pinned, with versions recorded in package.json and pnpm-lock.yaml.

Sources: https://nodejs.org/en/about/previous-releases ; https://github.com/justjake/quickjs-emscripten ; https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
