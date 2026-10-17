CREATE TABLE IF NOT EXISTS bodhi.users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    google_subject text NOT NULL UNIQUE CHECK (length(google_subject) BETWEEN 1 AND 255),
    email text NOT NULL CHECK (length(email) BETWEEN 1 AND 320),
    name text NOT NULL CHECK (length(name) <= 200),
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bodhi.spots ADD COLUMN IF NOT EXISTS owner_user_id bigint REFERENCES bodhi.users(id);
ALTER TABLE bodhi.spots DROP CONSTRAINT IF EXISTS spots_spot_name_latitude_longitude_key;
CREATE UNIQUE INDEX IF NOT EXISTS public_spots_unique ON bodhi.spots(spot_name,latitude,longitude) WHERE owner_user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS private_spots_unique ON bodhi.spots(owner_user_id,spot_name,latitude,longitude) WHERE owner_user_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS bodhi.user_follows (
    user_id bigint NOT NULL REFERENCES bodhi.users(id),
    spot_id bigint NOT NULL REFERENCES bodhi.spots(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id,spot_id)
);
CREATE INDEX IF NOT EXISTS user_follows_spot ON bodhi.user_follows(spot_id);
CREATE TABLE IF NOT EXISTS bodhi.sessions (
    token_hash text PRIMARY KEY,
    user_id bigint NOT NULL REFERENCES bodhi.users(id),
    expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON bodhi.sessions(expires_at);
CREATE TABLE IF NOT EXISTS bodhi.login_attempts (
    state_hash text PRIMARY KEY,
    nonce text NOT NULL,
    pkce_verifier text NOT NULL,
    return_path text NOT NULL,
    expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes'
);
CREATE INDEX IF NOT EXISTS login_attempts_expiry ON bodhi.login_attempts(expires_at);
