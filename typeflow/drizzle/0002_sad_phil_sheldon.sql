CREATE TABLE "forecast_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"location" geometry(point),
	"latitude" double precision,
	"longitude" double precision
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
DROP TABLE "wave_forecast" CASCADE;--> statement-breakpoint
ALTER TABLE "wave_measurements" ADD CONSTRAINT "wave_measurements_point_id_forecast_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."forecast_points"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_forecast_points_location" ON "forecast_points" USING gist ("location");--> statement-breakpoint
CREATE INDEX "idx_wave_measurements_point_time" ON "wave_measurements" USING btree ("point_id","time");