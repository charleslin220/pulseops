# Architecture

## Recruiter MVP extension (v0.2)

The default entry point is now a public read-only dashboard. `internal/demo` resolves a fixed synthetic dataset version from its own Postgres table; it never reads authenticated tenant data. The HTTP API filters the bounded 1,728-event corpus and returns 50-row pages. This deliberate first-release trade-off is documented in docs/RECRUITER-MVP.md; it is not a claim of large-scale SQL search.

`backend/hosting` composes public and authenticated handlers. `api/index.go` is a thin Vercel Functions adapter importing the existing Go module through a root module replacement. The application remains a modular Go monolith, with no Node backend rewrite. The original native entry point and Compose configuration remain usable.

The frontend separates dashboard, explorer, shared presentation, chart adapter and legacy authenticated workspace. Routes and charts are lazy-loaded. TanStack Query manages API state; URL parameters retain investigation filters. ECharts renders only client-visible metric data, never credentials.

See docs/DEPLOYMENT.md for cloud environment and limitations. The following describes the preserved authenticated foundation.

Browser → same-origin Vite development proxy or Nginx → chi HTTP API → pgx pool → PostgreSQL.

`backend/cmd/pulseops` owns configuration, lifecycle, and explicit migrate/seed commands. `internal/httpapi` owns transport validation, sessions, CSRF policy and role checks; it depends on a narrow repository interface. `internal/data` owns parameterised queries, schema and deterministic fixtures. This is a modular monolith, not a collection of services.

`frontend/src/api.ts` centralises credentialed API calls and errors. TanStack Query owns fetched server state and invalidation; React Router owns navigation. Material UI provides responsive forms and semantic event cards. Session identity is memory-only and revalidated after reload.

Tables: organisations → users → sessions; organisations → events. The user currently has one organisation. Roles are constrained in SQL and checked server-side. Queries use the current database user's organisation from a valid session, not a client organisation field. Session lookup reflects current role/organisation changes immediately. PostgreSQL RLS is not enabled; tenant isolation is enforced in the repository query and tested with two tenants. Future query paths must preserve that invariant.

Migrations are embedded, transactional, and tracked in schema_migrations. A PostgreSQL advisory transaction lock serialises migration runs. Runtime startup does not mutate the schema; Compose runs a separate migration job. Migration rollback is intentionally not automated in this phase.

The health endpoint is process liveness only. Database startup is checked with Ping; API database failures return 503. Request headers/bodies and passwords are not logged. Eight-hour sessions have no sliding refresh. Expired rows are ignored but require future cleanup.

## Investigation depth (v0.3)

The public module now serves service-level investigation windows, previous-window summaries and bounded significant-change timelines. Exact correlation filters connect public events across services. aurora-v2 is an immutable additive fixture version; the existing table and private tenant schema are unchanged. Time intervals use (from, to] to prevent overlapping comparisons. See docs/INVESTIGATION.md for semantics and deployment order.
