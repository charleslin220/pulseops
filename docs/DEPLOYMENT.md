# Vercel deployment

The repository root is the Vercel project root. `vercel.json` builds `frontend/dist`; `api/index.go` adapts the existing Go handler to Vercel Functions through the root Go module. The backend module remains usable independently and in Docker. API routes are same-origin, not cross-origin proxies.

Use a dedicated PostgreSQL database. The hosted first release uses the Neon free plan. Set `DATABASE_URL` to the TLS-enabled pooled connection string and `APP_ORIGIN` to the canonical HTTPS site origin in Vercel environment settings. No database credential is compiled into the browser. Production cookies are always Secure.

Before deploying a fresh environment, apply schema and fixture commands from `backend`, with DATABASE_URL set to a direct connection string:

```sh
go run ./cmd/pulseops migrate
go run ./cmd/pulseops seed-demo
```

Do not run migrations or seeding on public requests or on every function cold start. The public fixture seed is idempotent and separate from private demo user creation. No shared login credentials are published, and hosted private demo accounts are not seeded by default. The sign-in implementation remains available for configured private accounts; recruiters use the anonymous dashboard.

For a first verified release, deploy a production build without assigning its public alias, test it, then promote it. Keep preview protection enabled. Future preview databases should be separate Neon branches; this release has no public writes.

## Known limits

- Fixed 24-hour synthetic snapshot, six services, 1,728 events. No live polling or event generation worker.
- The bounded public JSON document is persisted in PostgreSQL. Filtering and aggregation occur in Go, not in browser JavaScript. Responses contain at most 50 events; large-scale SQL filtering and cursor pagination are roadmap work.
- Function instances use a pool capped at three database connections. Global traffic controls and broader abuse protection should be added before increasing exposure substantially.
- Login has a concurrency limit, not a comprehensive brute-force rate limiter. No real customer data is hosted.
- Do not reuse demo account passwords or local `.env` credentials for cloud services.
