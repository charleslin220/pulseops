CREATE TABLE organisations (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE users (
 id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id),
 email text UNIQUE NOT NULL, password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','operator','viewer'))
);
CREATE TABLE sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE events (
 id uuid PRIMARY KEY, organisation_id uuid NOT NULL REFERENCES organisations(id),
 source text NOT NULL, severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
 message text NOT NULL, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_tenant_time_idx ON events(organisation_id, occurred_at DESC, id DESC);
