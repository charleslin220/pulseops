# Roadmap

PulseOps is an evolving engineering portfolio. Checked items are shipped capabilities, not mock controls.

## v0.2 — Recruiter-first core demo

- [x] Anonymous operational dashboard and real PostgreSQL-backed synthetic data
- [x] Search, filters, date ranges, sorting, pagination and event details
- [x] Responsive UI, private sessions and tenant isolation
- [x] Vercel Go adapter, GitHub integration and automated checks

## v0.3 — Investigation depth

- [x] Searchable service directory and service detail routes
- [x] Selected-window metrics and previous equal-length comparisons
- [x] Chart range brushing with keyboard-accessible date controls
- [x] URL-backed ranges, reload/back navigation and comparison toggles
- [x] Significant-change timelines and exact cross-service correlation
- [x] Versioned US East outage and recovery scenario
- [x] Boundary, baseline-coverage, database and browser regression checks

## Next — Scale and hardening

- [ ] Larger datasets with indexed SQL filtering and cursor pagination
- [ ] Multi-select facets and virtualisation where measurement justifies it
- [ ] Dedicated least-privilege database roles and stronger login abuse protection
- [ ] Manual screen-reader audit and broader browser coverage
- [ ] Smaller chart bundles and automated performance budgets

## Later — Workflow

- [ ] Incident state machine, assignment and activity history
- [ ] Isolated writable demo sessions with expiry and reset
- [ ] Continuous simulator and realtime delivery

v0.3 completes an investigation workflow using the existing bounded corpus; it does not claim database-scale search or a live simulator. Further schema and access changes should remain deliberate and tested.
