# Move from the original stack

The original Python/FastAPI service, Airflow DAGs, Celery, Redis, Kafka, experimental TypeScript ETL, and duplicate React applications have been removed from the current checkout. Their source, deployment files, and old assets remain available in Git. See [project history](../README.md#project-history) for the migration commits and the last pre-rewrite revision.

The replacement consists of `server/` (Rust), `web/` (React), and `compose.yaml` with optional local or public deployment overrides. `server/catalog.json` preserves the original 1,320 seed entries; the database removes exact duplicate name/coordinate entries at insertion. These records begin unfollowed, so starting the app does not download every region.

Removing the old source does not change existing database tables, containers, or volumes. Preserve the old database and revision before switching an existing installation.

## Safe sequence

1. Back up the old PostgreSQL/PostGIS database and save the old application revision.
2. Start the new database with the new Compose project. It uses a separate named volume.
3. Start Bodhi Cast. Initialization creates the `bodhi` schema and imports the catalog.
4. Import custom locations, then follow only the spots you need. The new service fetches fresh forecasts and observations.
5. Verify a full outlook, station observations, restart recovery, and backups before switching traffic.
6. Stop the old services yourself when ready. Do not remove their volumes until the rollback window has passed.

The Rust application can also use an existing PostGIS database: it creates `bodhi.*` and leaves legacy `public.spots`, `public.wave_forecast`, and `public.station_inventory` intact. Ensure the database role can create the schema and PostGIS is installed. Using a separate database gives the cleanest rollback.

## Export custom spots

Against the old database, export a JSON array with:

```sql
SELECT COALESCE(json_agg(json_build_object(
  'spot_name', spot_name,
  'street_address', COALESCE(street_address, ''),
  'latitude', latitude,
  'longitude', longitude
)), '[]'::json)
FROM public.spots;
```

Save the single JSON result as `spots.json`, then run the new `import-spots` command with the new database URL. Existing name/coordinate pairs are left intact. Spot IDs are assigned by the new database, so old bookmarks based on numeric IDs must be updated.

Global forecast grids and Redis caches are not migrated. They are transient provider data. Keep their old backups if historical data matters; the replacement retains a compact rolling forecast for followed spots rather than the global historical store.

The new frontend uses `/api/*`. The basic `/spots`, `/spots/{id}`, and `/addspot` aliases exist for tooling, but the old forecast and station response contracts are not supported. Retire old clients when switching traffic.

## Rollback

Keep the old revision and its database volumes. Stop the new app, restore the old source revision in a separate checkout, and start its original Compose stack against the preserved old data. The new `bodhi` schema/volume does not replace legacy tables. Avoid running both apps on the same host ports.
