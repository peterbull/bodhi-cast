CREATE TABLE "forecast_points" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"location" geometry(point) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "wave_measurements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"point_id" integer NOT NULL,
	"time" timestamp with time zone,
	"step" interval,
	"data_time" integer,
	"forecast_time" integer,
	"data_date" timestamp with time zone,
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
ALTER TABLE "wave_measurements" ADD CONSTRAINT "wave_measurements_point_id_forecast_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."forecast_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_spots_location" ON "spots" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_station_inventory_location_gist" ON "station_inventory" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_wave_measurements_point_time" ON "wave_measurements" USING btree ("point_id","time");

INSERT INTO
	forecast_points (latitude, longitude, location)
SELECT
	lat.n as latitude,
	lon.n as longitude,
	ST_SetSRID (
		ST_MakePoint (lon.n, lat.n),
		4326
	) as location
FROM (
		SELECT generate_series(-90, 90, 0.25) as n
	) lat, (
		SELECT generate_series(-180, 180, 0.25) as n
	) lon;