# Bodhi Cast

A surf forecast app with a Rust service, a React/TypeScript frontend, and PostgreSQL/PostGIS. The Rust process serves the UI, exposes the API, and runs a persistent background job queue. Kafka, Airflow, Celery, Redis, and Python are no longer part of the runtime.

Browse the original surf-spot catalog, follow the breaks you care about, and see a three-day ocean outlook with nearby NOAA observations. The beach view uses forecast wave energy, period, and direction to render a lightweight ocean scene.

## Quick start

Install Docker with Compose. The official PostGIS image runs as amd64; Docker Desktop uses emulation on Apple Silicon. A cloud server with an x86 CPU runs it natively.

1. Copy `.env.example` to `.env`.
2. Generate a password with `openssl rand -hex 24`, then put it in `.env` as `BODHI_DB_PASSWORD`. Use the hex output so it is safe to include in the connection URL.
3. Run:

```sh
docker compose -f compose.yaml -f compose.local.yaml up --build -d
```

Open http://localhost:8000. Follow a spot to begin collecting forecasts. The first download starts within a minute. Points appear progressively; a complete three-day outlook for one region takes a few minutes. The initial catalog does not trigger a global import.

`compose.local.yaml` permits local editing. The app and database ports bind to loopback. For an Internet-facing server, use the token-protected HTTPS configuration in [the deployment guide](docs/deployment.md).

## Local development

Required: Rust 1.92 or newer, Node 24, pnpm 12, and PostgreSQL 17 with PostGIS 3.5. The locked dependencies and supplied Docker build use Rust 1.98. The workspace applies a seven-day minimum release age to JavaScript dependencies.

Start only the database:

```sh
docker compose -f compose.yaml up -d db
pnpm install --frozen-lockfile
pnpm build
```

Set `DATABASE_URL` in your shell to the local PostGIS connection, then run:

```sh
cargo run --release -- serve --allow-writes
```

For frontend hot reload, run `pnpm dev` in another terminal and visit http://localhost:5173. Vite proxies `/api` to the Rust server on port 8000. Production serves the UI and API from the same origin.

The server defaults to read-only access. Use `--allow-writes` on a trusted local machine. Public deployments use Google sign-in with `--google-client-file /path/to/google-client.json --public-url https://bodhicast.com`. Each account has its own followed spots and private custom locations. See [Google sign-in setup](docs/accounts.md). The legacy `--write-token-file` mode remains available for single-owner installations; it cannot be combined with Google sign-in.

## Data and resource use

- **Forecasts:** NOAA GEFS Wave, 0.25° ensemble mean. The scheduler considers four UTC runs daily with a six-hour publication allowance. Each request covers a small region around followed spots. Nearby spots share a request. Downloads are sequential and separated by at least 10 seconds, as required by [NOAA's regional-filter guidance](https://nomads.ncep.noaa.gov/info.php?page=gribfilter).
- **Storage:** Only forecasts sampled at the nearest wet grid cell for each followed spot are retained. No global grid is written to PostgreSQL. Missing values remain null. Model time and valid time are distinct. Each valid time uses the newest available run, so progressive updates retain useful older coverage.
- **Limits:** At most 20 followed spots, 72 forecast hours by default, 8 MiB per response, 200,000 grid cells per field, one ingestion worker, and four-minute job timeouts. `serve --horizon 168` extends the outlook; higher horizons increase download time and storage. Forecast steps are three hours through hour 240 and six hours afterward, matching the NOAA feed.
- **Queue:** PostgreSQL deduplication, `FOR UPDATE SKIP LOCKED`, leases, exponential retry backoff, and eight attempts. An advisory lock keeps a single ingester active. Pending jobs and successful checkpoints survive restarts. Worker failure stops the service so the supervisor can restart it.
- **Retention:** Hourly cleanup keeps two days of past forecast points and four days of job history. Future forecasts remain. Followed spots and the catalog are not removed. Unfollowing stops new downloads; existing points age out normally.
- **Observations:** NOAA CO-OPS inventory and up to three nearby stations per followed spot, refreshed every 10 minutes. Water level, wind, air temperature, and water temperature are collected when available. Each observation keeps its original timestamp; unavailable products do not erase prior data. The UI identifies old measurements. Coverage is primarily in the United States.
- **Coverage:** The wave model represents the open ocean, not local breaking surf. No forecast is substituted from more than 100 km away. Inland and Great Lakes spots may have no coverage. Individual swell directions are absent from the ensemble-mean source and remain unknown.

The PostgreSQL schema is named `bodhi`. PostGIS geography columns and GiST indexes support nearby-station searches. The legacy `public` tables are not changed by application initialization. See [migration](docs/migration.md) before switching an existing installation.

## Beach view

The renderer uses a small WebGL shader with deep-water dispersion, directional swell and wind-wave components, reflection, and an illustrative beach. Component energy is scaled from significant wave height. The view faces toward the nearest wet forecast point; it does not infer a real shoreline model or nearshore bathymetry. Lighting is illustrative daylight, not a solar or weather observation.

Select a forecast time to change the scene, then choose **Open beach view** to expand it. Rendering is capped near 30 frames per second, 1440 pixels wide, and 1.05 million pixels. It pauses offscreen, in background tabs, or when paused by the user, and starts still when reduced motion is requested. The forecast table remains usable when WebGL is unavailable.

## Commands

```sh
cargo run --release -- serve --help
cargo run --release -- sync
cargo run --release -- jobs
cargo run --release -- jobs --retry-failed
cargo run --release -- import-spots /path/to/spots.json
```

`sync` queues current jobs; it does not start a second worker. `serve --no-worker` runs only the API/UI. `import-spots` accepts an array with `spot_name`, `street_address`, `latitude`, and `longitude`; it preserves existing spots and does not automatically follow every imported location.

## Checks

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
pnpm test
pnpm build
```

Database integration tests require a **dedicated test database**, separate from your app database:

```sh
BODHI_TEST_DATABASE_URL='postgresql://USER:PASSWORD@localhost:5438/DEDICATED_TEST_DB' \
  cargo test --test postgis -- --ignored
```

The integration suite changes only that test database's `bodhi` schema. It checks real PostGIS distances, idempotent writes, concurrent claims, retry backoff, expired-lease recovery, and API validation/access control. The GRIB fixture tests run offline; fixture provenance and independent ecCodes checks are in `server/tests/fixtures/README.md`.

## License

Apache 2.0. See [LICENSE](LICENSE).
