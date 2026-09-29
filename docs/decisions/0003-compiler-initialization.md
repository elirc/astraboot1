# ADR 0003: Separate compiler loading from exercise execution

Status: accepted source configuration; measured mobile cold-load verification remains pending.

The specification (§7.2) starts with a ten-second worker initialization timeout and explicitly allows tuning after implementation. Practice and placement now allow sixty seconds to initialize the JavaScript/TypeScript worker. Once the worker is ready, exercise execution retains its two-second QuickJS interrupt limit and the UI's five-second execution watchdog. Stop terminates the worker; loading does not grant the submitted program extra execution time.

The final V1 verification build before the route-completeness fixes emitted a 6,761.15 kB lazy TypeScript environment asset. Transferring that raw size at 4 Mbps takes about 13.5 seconds before latency, parsing, or compilation. This is a size/bandwidth estimate, not a measured browser initialization duration; compression, caching, and the deployment transport change actual transfer cost. A ten-second initialization deadline can therefore reject a valid cold start before any learner code executes. The sixty-second loading allowance is a conservative tuning choice for this local implementation.

The browser harness keeps its separate twelve-second outer test deadline. It is verification-only and excluded from production artifacts. The mobile measurement record must report observed cold-load behavior independently and must not describe this estimate as a passed performance target. Revisit the initialization allowance when measured deployed loading behavior warrants a change.
