# Phase 1 architecture decisions

## Approved recruiter-first extension

The owner authorised a core public demo, GitHub publication and Vercel deployment after reviewing the redesign proposal. The existing stack and authentication remain. Delivery is intentionally smaller than the full proposal: 24-hour fixed dataset, API-side filtering of a bounded Postgres JSON document, semantic paginated tables, and mean latency rather than percentile aggregation. No live simulator, incident workflow or writable public session was introduced. These incremental choices are documented in docs/RECRUITER-MVP.md and ROADMAP.md.

The earlier approval is confirmed by the supplied conversation, but its complete architecture response was not retrievable. These entries record the explicit architecture in the current request and implementation choices, not a claimed reconstruction of the original eight decisions.

1. Modular Go monolith using chi/net/http: small deployment unit, explicit module boundaries.
2. PostgreSQL with pgx and versioned SQL migrations: actual persistence and visible SQL access patterns.
3. React/TypeScript/Vite with Material UI: accessible component foundations and a fast local workflow.
4. TanStack Query and React Router: server state and navigation have distinct ownership.
5. Opaque server-managed cookie sessions: revocable sessions, no browser-stored bearer tokens.
6. Organisation-scoped SQL and server role checks: authenticated identity is the sole tenant source. No RLS in this phase; integration tests guard the boundary.
7. Same-origin REST with exact Origin checks for JSON mutations: CSRF protection for this topology. WebSocket is deferred.
8. Independent synthetic fixtures and CI: repeatable demonstrations without employer data. No simulator until separately authorised.

Additional constraints: Secure cookies default on; HTTP loopback requires explicit opt-out. Bcrypt cost 12 is used with a 72-byte maximum. Event reads are bounded to 100 newest records. Deployment is out of scope.

## v0.3 investigation choices

The next-phase request on 2026-10-28 prioritises a complete investigation journey: services, range selection, comparison and related evidence. Existing libraries and bounded data remain sufficient. Comparisons require complete historical coverage and five-minute aligned intervals; no missing baseline is represented as zero. Larger SQL-backed datasets and infrastructure hardening remain separate future milestones. No original stack or session decision changed.
