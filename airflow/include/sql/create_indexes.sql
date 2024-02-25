CREATE INDEX IF NOT EXISTS spots_location_idx ON spots USING gist(location);
CREATE INDEX IF NOT EXISTS wave_forecast_location_idx ON wave_forecast USING gist(location);

CREATE INDEX IF NOT EXISTS station_inventory_location_idx ON station_inventory USING gist(location);