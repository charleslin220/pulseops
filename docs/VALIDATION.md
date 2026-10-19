# Historical Phase 1 validation

This file records the original foundation checks. See [RELEASE-VALIDATION.md](RELEASE-VALIDATION.md) for the current public MVP verification.

# Phase 1 validation — 2026-10-19

## Environment and provenance

Implementation was prepared in the permitted workspace, then copied to the requested independent PulseOps repository. No Beeks/vivo assets, source, credentials, or configuration were inspected or reused. The referenced chat confirmed Phase 1 approval but did not expose the complete architecture response; the current explicit user requirements governed implementation.

Windows; Node v24.16.0; npm 11.13.0. Go 1.25.3 was downloaded to a separate workspace tooling directory for verification; it is not installed globally or included in the repository. Docker, PostgreSQL and system Go were absent. Public dependency downloads initially failed/stalled under network restrictions and succeeded through approved network access.

## Commands and actual results

| Command | Result |
| --- | --- |
| `go mod tidy` | PASS; go.sum generated |
| `gofmt -w backend` then `gofmt -l backend` | PASS; final listing empty |
| `go vet ./...` (backend) | PASS; exit 0, no diagnostics |
| `go build ./cmd/pulseops` (backend) | PASS; exit 0, binary excluded from delivery |
| `go test -v ./...` (backend) | PASS: TestSecurity and all 9 subtests; real Postgres test SKIPPED |
| `npm install` | PASS; lockfile generated; initial test-tool dependency advisories subsequently fixed |
| `npm install --save-dev vitest@latest vite@latest @vitejs/plugin-react@latest` | PASS; audit reports 0 vulnerabilities across 303 packages |
| `npm run format` / `npm run format:check` | PASS: All matched files use Prettier code style |
| `npm run lint` | PASS; no diagnostics |
| `npm test` | PASS: 1 test file, 6 tests, Vitest 5.0.5 |
| `npm run build` | PASS: TypeScript + Vite 8.3.4; 950 modules transformed |

Go commands used the workspace-local Go executable and workspace-local GOPATH/GOCACHE. Frontend commands ran in `frontend`. No credentials were printed.

Backend output excerpt:

```text
--- PASS: TestSecurity
    --- PASS: anonymous_rejected
    --- PASS: tenant_query_cannot_override_session
    --- PASS: unknown_role_denied
    --- PASS: expired_session_denied
    --- PASS: cross_site_login_denied
    --- PASS: missing_origin_denied
    --- PASS: bad_password_rejected
    --- PASS: secure_session_issued
    --- PASS: logout_revokes_session
--- SKIP: TestPostgresVerticalSlice (TEST_DATABASE_URL not set)
PASS
ok pulseops/internal/httpapi 1.250s
```

Final frontend output excerpt:

```text
Test Files  1 passed (1)
Tests       6 passed (6)
Duration    3.48s
dist/index.html                  0.38 kB | gzip: 0.26 kB
dist/assets/index-UveMi9Y4.js    521.70 kB | gzip: 161.70 kB
```

Initial frontend test failures were corrected: the login test now matches required-field labels and routes mocked fetch responses by endpoint, accommodating identity revalidation after login. No final test failure remains. Prettier ignores generated output.

## Unverified checks and remaining risks

- No local PostgreSQL: SQL migration/seed execution, persistence and real tenant isolation were not exercised here. The integration test covers those operations, two tenants, hashed sessions, login/me/events/logout and revoked-cookie rejection; CI is configured to run it using a disposable PostgreSQL 17 service. This configuration has not been executed on GitHub.
- Docker absent: Compose startup, Docker image builds, Nginx proxying and full browser-to-database flow were not run. Component tests use mocked network responses, not a live backend.
- Race detection is configured for Linux CI; not run locally (Windows toolchain has no configured C compiler).
- Build succeeds with a warning for a JavaScript chunk above 500 kB. Final compressed size is about 162 kB. Route/vendor splitting remains an optimisation, not a Phase 1 acceptance failure.
- npm reports zero known advisories after updates; this is not a complete security audit. ESLint 9 emitted an upstream support deprecation warning. Go/container vulnerability scanning was not performed.
- Production hardening is deferred: TLS, stronger brute-force controls, least-privilege database roles, expiry cleanup and operations controls. HTTP insecure cookies are restricted to explicit loopback development configuration.

## Phase 2 gate

Run the database integration test and Compose/browser smoke flow in an environment with PostgreSQL/Docker, review the results, then obtain explicit Phase 2 approval. Agree incident states, permissions and activity-history requirements before implementing that phase. No Phase 2 feature, simulator, realtime, analytics or deployment was added.

## Files delivered

- Backend: `cmd/pulseops/main.go`; `internal/data/data.go`; `internal/data/migrations/001_initial.sql`; `internal/httpapi/api.go`, `api_test.go`, `integration_test.go`; `go.mod`, `go.sum`, Dockerfile and Docker ignore rules.
- Frontend: `src/App.tsx`, `src/main.tsx`, `src/api.ts`, `src/App.test.tsx`; Vite/TypeScript/ESLint/Prettier configuration; package manifest/lock; HTML entry; Dockerfile, Nginx configuration and Docker ignore rules.
- Repository: `compose.yaml`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`, `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`, `docs/PRD.md`, `docs/API.md`, this validation report.

Public references used: [bcrypt package API](https://pkg.go.dev/golang.org/x/crypto/bcrypt), [Vite requirements](https://vite.dev/guide/). Security fixes were selected from the npm audit report and verified by a clean subsequent dependency audit.

