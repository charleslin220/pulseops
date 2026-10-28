# PulseOps contributor boundaries

This is an independent portfolio project. Never inspect, import, copy, or reuse Beeks/vivo source, assets, credentials, configuration, or proprietary designs. Use only this repository, public dependencies, and explicitly provided non-proprietary material.

The owner authorised the recruiter-first MVP, public read-only dashboard/event explorer, GitHub publication and Vercel deployment on 2026-10-19. Preserve authenticated Phase 1 functionality. Incident workflows, live simulation and realtime remain deferred. Synthetic fixtures are not a live simulator.

Backend: modular Go monolith, chi/net/http, pgx, PostgreSQL. Frontend: React, TypeScript, Vite, Material UI, TanStack Query, React Router. Preserve server-managed cookie sessions; never put tokens in browser storage. Scope every event query to the authenticated user's organisation. Enforce role permissions on the server.

Never commit secrets or generated binaries. Use environment configuration. Run gofmt, go vet, go test, frontend format/lint/test/build after relevant changes. Integration tests require a dedicated disposable database. Document skipped checks truthfully. Deployment of this MVP is authorised; do not introduce paid services or incident workflow scope without instruction.

On 2026-10-28 the owner authorised the next investigation phase, continuing the existing GitHub/Vercel release workflow. v0.3 adds service investigations, window comparisons and correlated synthetic scenarios. Scale/hardening and incident workflows remain on the roadmap.
