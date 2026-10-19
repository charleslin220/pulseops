# Recruiter MVP — release scope

Implemented: anonymous dashboard, service/time scoping, three chart metrics, severity drill-down, service health links, recent activity, scenario preset, searchable/filterable/sortable paginated events, detail drawer, engineering notes, responsive navigation, preserved authenticated workspace.

The user prioritised the first demonstrable ongoing project over the full redesign. Changes from the larger proposal are explicit:

- 24 hours and 1,728 events, rather than seven days and 20,000 events.
- A bounded database-backed JSON dataset, rather than separate public metric/event tables. The backend owns queries and restrictions; this is not a hardcoded frontend dashboard.
- Semantic 50-row table pages rather than a new headless table dependency or virtualisation. At this size, bounded rendering is simpler and accessible.
- Mean latency, correctly request-weighted, instead of percentile metrics requiring mergeable histograms.
- No service detail route, chart brushing, writable sessions, incident workflow or realtime in this release.

All services and records are fictional and independently generated. The read-only API knows only a fixed published dataset version. It ignores cookies, rejects tenant overrides and exposes no mutation route. Private tenant SQL and existing session checks remain intact.

The initial demo schema is created transactionally by the explicit `seed-demo` provisioning command; the existing authenticated schema remains under migration 001. Move future demo schema changes into versioned migrations before changing the fixture format.

## Dataset semantics

Reference time is fixed at 2026-10-19 12:00 UTC. Five-minute points end at this reference. Error rate is the ratio of total failed to total requests. Mean latency uses request-weighted averaging. Service status is computed from the latest point within the selected range; missing data gives unknown status. Deployment/recovery markers and degradation metrics share a deterministic timeline.

## Verification

Release checks include Go unit tests, real disposable Postgres tests for public/private access, React component tests, and Playwright against the Go API and actual Postgres data. Playwright covers anonymous investigation, empty state and reload, private API rejection, public write rejection, mobile layout, and automated accessibility. See GitHub Actions for reproducible check results. Automated accessibility is not a substitute for a complete manual screen-reader audit.
