ALTER TABLE "wave_forecast" ADD COLUMN "data_time" integer;--> statement-breakpoint
ALTER TABLE "wave_forecast" ADD COLUMN "forecast_time" integer;--> statement-breakpoint
ALTER TABLE "wave_forecast" ADD COLUMN "data_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wave_forecast" DROP COLUMN "valid_time";