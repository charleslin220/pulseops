# Roadmap

PulseOps is an actively evolving engineering portfolio. This roadmap distinguishes shipped capabilities from planned work.

## v0.2 — Recruiter-first core demo

- [x] Anonymous operational dashboard
- [x] Consistent synthetic service metrics and events persisted to Postgres
- [x] Search, filters, date ranges, sorting, pagination and event details
- [x] Responsive layout, keyboard-operable controls and automated accessibility checks
- [x] Preserve private session authentication and tenant isolation
- [x] Vercel-compatible Go API adapter and database provisioning
- [x] Go/Postgres, component and browser test coverage

## Next — Investigation depth

- [ ] Larger versioned datasets with SQL filtering and cursor pagination
- [ ] Service detail pages and related-event timelines
- [ ] Chart brushing and comparison windows
- [ ] Multi-select facets and accessible virtualised tables where measured useful
- [ ] Additional regional outage and recovery scenarios
- [ ] Manual screen-reader audit and documented performance budgets
- [ ] Dedicated least-privilege database roles and stronger login abuse protection

## Later — Workflow

- [ ] Incident state machine, assignment and activity history
- [ ] Isolated writable demo sessions with expiry and reset
- [ ] Continuous event simulator and realtime delivery

Later milestones require deliberate scope review. No mock controls imply these features already exist.
