DROP INDEX "idx_wave_measurements_point_time";--> statement-breakpoint
CREATE UNIQUE INDEX "unique_measurement_constraint" ON "wave_measurements" USING btree ("data_date","data_time","forecast_time");--> statement-breakpoint
CREATE INDEX "idx_wave_measurements_point_time" ON "wave_measurements" USING btree ("point_id","data_date");--> statement-breakpoint
ALTER TABLE "wave_measurements" DROP COLUMN "time";--> statement-breakpoint
ALTER TABLE "wave_measurements" DROP COLUMN "step";