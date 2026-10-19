# Current product scope

The recruiter-first v0.2 release extends the foundation with a public dashboard, filtered event explorer and Vercel deployment. See [RECRUITER-MVP.md](RECRUITER-MVP.md) for the current acceptance criteria and limitations. The original foundation requirements below remain applicable to private workspaces.

# Product requirements — Phase 1

Audience: operations users reviewing synthetic service events in their own organisation; hiring reviewers evaluating a complete frontend-to-database slice.

Acceptance criteria:
- Login validates a stored password hash and issues a server-managed session cookie.
- Login errors do not distinguish an unknown email from a wrong password.
- A returning authenticated user can load their identity and events.
- Event queries are organisation-scoped on the server, regardless of URL parameters.
- Admin, operator, and viewer can read; unknown roles cannot.
- Logout revokes the session and clears browser state.
- The UI exposes loading, empty, service failure, expired session, and retry states.
- Fresh PostgreSQL can be migrated and seeded with two independent organisations.
- Repeat migration/seed runs preserve existing records.
- CI covers backend and frontend checks, including real PostgreSQL isolation.

Non-goals: incidents, assignment, event generation loops, realtime, analytics, deployment, invitations, organisation switching, password recovery, and role editing. Seed fixtures alone provide synthetic Phase 1 events.
