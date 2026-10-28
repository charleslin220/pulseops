# Investigation depth — v0.3

## Delivered

Services now connect platform health to a service-specific investigation. Recruiters can select a window, compare it with the preceding equal-duration interval, drag across a chart, inspect significant changes and follow an exact correlation ID across services. URL parameters preserve the investigation on reload and browser navigation. Date controls provide a keyboard alternative to chart brushing.

The `aurora-v2` fixture adds a US East connectivity outage affecting Identity and Notifications from 18 October 22:05 to 23:00 UTC, followed by recovery at 23:05. The shared `scenario-us-east-outage` correlation identifies 24 critical observations and two recovery events. Both service metrics and event records are generated from the same conditions. Checkout's existing deployment/degradation/recovery scenario remains intact.

## Data and boundaries

- Snapshot remains 24 hours, six services, 1,728 metric points and 1,728 events.
- All time filters use `(from, to]`. Adjacent comparison windows never count a boundary sample twice. The old inclusive lower bound was corrected so an hour contains 12 five-minute samples.
- Service windows must be 5 minutes to 24 hours, within the snapshot, on five-minute boundaries. Comparison shifts the preceding window to the selected timestamps; it is not a second current measurement.
- Missing history returns `previous: null`. The interface does not turn missing observations into zero values.
- Service status describes the end of the selected window, not aggregate health across the whole window.
- Timelines omit routine health checks, are chronological and bounded to 100 changes. Full event inspection remains paginated.
- Public endpoints remain read-only. Only the fixed demo version is loaded; no user-supplied tenant or dataset version selects data. Unknown and duplicate query keys are rejected.

## Release and rollback

Seed `aurora-v2` explicitly before deploying the code that reads it. Seeding is idempotent and inserts a new version without overwriting `aurora-v1`; the old deployment can still read its original fixture. No private user seeding or destructive migration is required. API and browser deployment remains the same Go/React stack.

## Validation and practical limits

Go tests cover disjoint window boundaries, weighted averages, missing baselines, input validation, exact correlation and scenario recovery. Real disposable PostgreSQL tests cover public reads and preserved authentication/tenant isolation. Eight Playwright flows cover the existing MVP plus regional investigation, comparison history, public API restrictions and actual mouse chart brushing/mobile accessibility. Six existing frontend component tests remain green. Format, lint, Go vet and production builds are required.

Desktop and mobile layouts were visually reviewed. Automated WCAG A/AA checks do not replace a manual screen-reader audit. The lazy chart bundle is approximately 578 kB minified (197 kB gzip), above Vite's advisory 500 kB threshold; the warning is retained. Service JSON responses are bounded to 288 points and 100 timeline events. SQL filtering, larger datasets, multi-select facets, infrastructure hardening and ongoing monitoring remain explicit follow-up work.
