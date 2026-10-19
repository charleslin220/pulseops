# Recruiter MVP verification — 20 October 2026

## Completed locally

- `go vet ./...` and backend Go unit tests passed.
- Real PostgreSQL integration tests passed against a dedicated disposable Docker database: authentication/session lifecycle, tenant isolation, and idempotent public demo seeding/read access.
- Root serverless adapter compilation passed.
- `npm run lint`, `npm run format:check`, `npm test` (6 tests) and `npm run build` passed.
- `npx playwright test` passed all 4 Chromium workflows: anonymous investigation/search/details, protected private API/public read-only enforcement, mobile navigation/accessibility, and slow-loading/API-error/retry recovery.
- Automated axe WCAG 2 A/AA checks found zero violations on the desktop dashboard and mobile explorer. This is not a claim of full accessibility certification.
- npm installation reported zero known vulnerabilities.

## Release checks

Vercel production builds pass using the React bundle and Go adapter. The dedicated Neon free database was migrated and seeded with the independent synthetic public dataset. No private demo accounts or shared passwords were created in production.

Initial cloud checks identified Vercel's named rewrite capture as an unexpected application filter. The hosting adapter strips that transport-only parameter; backend tenant-override rejection remains covered by the browser suite.

## Limits

The lazy ECharts chunk is approximately 505 kB minified (172 kB gzip) and triggers the build-size warning. Further chart optimisation is on the roadmap. The complete revised Docker Compose startup was not revalidated; individual backend/database integration and hosted builds were validated. Browser coverage currently targets Chromium, with desktop/mobile viewports. Continuous external uptime monitoring and public API rate limits are not configured.

Earlier Phase 1 checks are retained separately in VALIDATION.md for historical context.

## Production verification

The public production URL https://pulseops-nine.vercel.app passed all four Playwright workflows without Vercel credentials. The deployment for commit ab36704 is READY, with its Go function in London (lhr1). GitHub Actions for the initial release passed all three jobs: backend, frontend, and browser. The GitHub repository is connected to Vercel for main-branch deployments.

The loading state accessibility issue detected during cloud testing was corrected and covered with a dedicated regression flow.
