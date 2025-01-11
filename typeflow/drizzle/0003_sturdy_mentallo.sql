DROP INDEX "idx_forecast_points_location";--> statement-breakpoint
ALTER TABLE "forecast_points" ALTER COLUMN "id" SET DATA TYPE bigserial;--> statement-breakpoint
ALTER TABLE "forecast_points" ALTER COLUMN "location" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "forecast_points" ALTER COLUMN "latitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "forecast_points" ALTER COLUMN "longitude" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_forecast_points_location" ON "forecast_points" USING gist ("location");