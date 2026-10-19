# REST contract v1 (Phase 1)

All paths use `/api`; responses are JSON except successful logout. Errors: `{ "error": "human-readable message" }`. Responses are `Cache-Control: no-store`. No CORS access is granted.

| Method/path | Request | Success | Failure |
| --- | --- | --- | --- |
| GET /health | none | 200 `{ "status": "ok" }` (liveness only) | — |
| POST /auth/login | `{ "email": "…", "password": "…" }` | 200 User + Set-Cookie | 400 malformed, 401 invalid credentials, 403 Origin/type, 429 concurrency limit, 503 database |
| POST /auth/logout | `{}` | 204 + cleared cookie; stored session deleted | 403 Origin/type, 503 database |
| GET /auth/me | session cookie | 200 User | 401 missing/expired, 503 database |
| GET /events | session cookie | 200 `{ "events": [Event] }` | 401 session, 403 role, 503 database |

User: `id`, `organisationId`, `email`, `role` (admin/operator/viewer). Event: `id`, `source`, `severity` (info/warning/critical), `message`, `occurredAt` (RFC3339 timestamp).

POST requires `Origin` exactly equal to APP_ORIGIN and `Content-Type: application/json` (charset suffix accepted). Cookies are issued by the server; no token appears in JSON. Login accepts at most 4096 body bytes, rejects unknown JSON fields/trailing data, normalises email, and rejects passwords over 72 bytes.

Events returns a non-null array, limited to 100 in descending occurredAt/id order. There are no write/filter/pagination endpoints. Any organisationId query parameter has no effect; only authenticated tenant scope is used.

## Public demo API (v0.2)

No session is required. GET `/api/demo/dashboard` returns the snapshot summary, services, time-series points, severity distribution and recent events. GET `/api/demo/events` returns `events`, `total`, `page`, `pageSize` (50), `services` and `referenceTime`.

Supported filters: `q` (up to 120 characters), `service`, `region`, `severity` (info/warning/critical), `from`/`to` (RFC3339 UTC; maximum seven-day interval), `sort` (newest/oldest), and `page` (1–10000). Unknown filter names and invalid values return 400. Mutating methods return 405. Public handlers load only the fixed `aurora-v1` synthetic dataset; they do not read sessions or private organisation events.

Dates refer to the fixed 19 October 2026 demonstration snapshot, not live monitoring. The first release filters a bounded JSONB dataset in Go. Large-scale SQL filtering is on the roadmap.
