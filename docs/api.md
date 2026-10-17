# HTTP API

All measurements use SI units: meters, seconds, meters per second, degrees true, Celsius, and meters for geographic distances. Timestamps are UTC ISO 8601 except raw CO-OPS observation timestamps, which are NOAA's `YYYY-MM-DD HH:MM` in GMT. Missing measurements are null.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/healthz` | Process version and database health |
| GET | `/api/capabilities` | Account, CSRF token, editing access, follow limit |
| GET | `/api/auth/google?spot=286` | Start Google sign-in; optional spot to return to |
| GET | `/api/auth/google/callback` | Single-use OAuth callback |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/status` | Queue counts, latest model/update times, recent errors |
| GET | `/api/spots` | Catalog with coordinates and followed state |
| GET | `/api/spots/{id}` | One spot, or 404 |
| POST | `/api/spots` | Create and follow a spot; existing exact match is followed |
| PUT | `/api/spots/{id}/watch` | Set `{ "watched": true }` or false |
| GET | `/api/spots/{id}/forecasts` | `{ points, stale, source }` |
| GET | `/api/spots/{id}/stations` | Up to five stations within 200 km, nearest first |
| POST | `/api/jobs/retry` | Requeue failed jobs |

In Google sign-in mode, writes require a valid session cookie, an `Origin` matching `BODHI_PUBLIC_URL`, and the `X-CSRF-Token` returned by `/api/capabilities`. Private spot URLs return 404 to other accounts and anonymous users, including forecast and station endpoints. Responses are not cached. Job retries remain a server operation. Legacy installations without Google sign-in can use `Authorization: Bearer TOKEN` or explicit `--allow-writes` on a trusted network. Requests are limited to 16 KiB and must use JSON for bodies. New spots require `spot_name`, `latitude`, and `longitude`, with optional `street_address`. Names and coordinates are validated; the database enforces the follow limit under a per-account transaction lock. Each user can follow 20 spots and create 100 custom spots. New accounts start with a copy of the featured public follows; later changes are independent.

Forecast `time` is the model initialization, and `valid_time` is the forecast target. `latitude`, `longitude`, and `distance` identify the sampled wet model point. `swh`, `perpw`, and `dirpw` describe combined wave height, primary wave period, and primary direction. `shww`, `mpww`, and `wvdir` describe wind waves. `ws` and `wdir` describe wind. `swells` contains height/period/direction objects in NOAA's ensemble-mean record order. Directions absent from the provider remain null.

The API reads cached PostgreSQL records. A forecast GET never starts a synchronous provider download.
