CREATE TABLE "spots" (
	"id" integer PRIMARY KEY NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"spot_name" text,
	"street_address" text,
	"location" geometry(point)
);
--> statement-breakpoint
CREATE TABLE "station_inventory" (
	"id" integer PRIMARY KEY NOT NULL,
	"station_id" integer,
	"latitude" double precision,
	"longitude" double precision,
	"has_water_level" boolean,
	"has_wind" boolean,
	"has_air_temperature" boolean,
	"location" geometry(point),
	"entry_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wave_forecast" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"location" geometry(point),
	"latitude" double precision,
	"longitude" double precision,
	"time" timestamp with time zone,
	"step" interval,
	"valid_time" timestamp with time zone,
	"swh" double precision,
	"perpw" double precision,
	"dirpw" double precision,
	"shww" double precision,
	"mpww" double precision,
	"wvdir" double precision,
	"ws" double precision,
	"wdir" double precision,
	"swell" double precision,
	"swper" double precision,
	"entry_updated" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "idx_spots_location" ON "spots" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_station_inventory_location" ON "station_inventory" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_wave_forecast_location" ON "wave_forecast" USING gist ("location");--> statement-breakpoint
CREATE INDEX "wave_forecast_location_idx" ON "wave_forecast" USING gist ("location");