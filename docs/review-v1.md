# V1 independent review and hardening

Astra independently inspected the V1 implementation on 2026-09-09. This was a read-only source review, not a separate runtime certification.

Two concrete findings were accepted:

- A04/A14: a delayed lesson quick-note save could clear newer text typed while the request was pending. The frontend fix serializes saves and retains text newer than the submitted version; delayed-response browser coverage verifies recovery.
- A09/A10: uploaded asset manifests could duplicate an ID or reassign a published ID to different bytes. Package validation now rejects duplicate asset IDs. Publication rejects changed paths or checksums for a previously published ID, and download lookup has deterministic ordering. A PostgreSQL regression covers rejection, unchanged activation after failure, identical reuse, and archived downloads.

The reviewer also checked the owner-row mutation lock and receipt boundary, immutable content versions, mastery-revision enforcement, and competing base-release checks. No additional blocker was reported in the inspected source. Passing test results are recorded separately; this note does not claim unexecuted checks passed.

The review supplied the P6/P7 work breakdown: cumulative snapshots preserving V1 history; deeper Node persistence, transactions, reliability and security; then a pinned supported .NET toolchain with equivalent React contracts, EF Core, transactions, ownership and cancellation. Each release remains gated on its own content and runnable-project checks.