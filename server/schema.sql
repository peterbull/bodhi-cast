CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS bodhi;
CREATE TABLE IF NOT EXISTS bodhi.spots (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spot_name text NOT NULL CHECK (length(spot_name) BETWEEN 1 AND 160),
    street_address text NOT NULL DEFAULT '',
    latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    location geography(Point,4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography) STORED,
    watched boolean NOT NULL DEFAULT false,
    UNIQUE (spot_name, latitude, longitude)
);
CREATE INDEX IF NOT EXISTS spots_location ON bodhi.spots USING gist(location);
CREATE TABLE IF NOT EXISTS bodhi.forecasts (
    spot_id bigint NOT NULL REFERENCES bodhi.spots(id),
    model_time timestamptz NOT NULL,
    valid_time timestamptz NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (spot_id, model_time, valid_time)
);
CREATE INDEX IF NOT EXISTS forecasts_valid_time ON bodhi.forecasts(valid_time);
CREATE TABLE IF NOT EXISTS bodhi.stations (
    id text PRIMARY KEY,
    name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    location geography(Point,4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography) STORED,
    observations jsonb NOT NULL DEFAULT '{}',
    updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS stations_location ON bodhi.stations USING gist(location);
CREATE TABLE IF NOT EXISTS bodhi.jobs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dedupe_key text NOT NULL UNIQUE,
    spec jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed')),
    attempts integer NOT NULL DEFAULT 0,
    available_at timestamptz NOT NULL DEFAULT now(),
    lease_until timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_ready ON bodhi.jobs(available_at,id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS jobs_lease ON bodhi.jobs(lease_until) WHERE status='running';
