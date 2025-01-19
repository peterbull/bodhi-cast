import {
  pgTable,
  boolean,
  doublePrecision,
  timestamp,
  interval,
  geometry,
  bigserial,
  integer,
  text,
  serial,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

export const forecastPoints = pgTable("forecast_points", {
  id: bigserial("id", { mode: "number" }).primaryKey().notNull(),
  location: geometry("location", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

export const waveMeasurements = pgTable(
  "wave_measurements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey().notNull(),
    pointId: integer("point_id")
      .references(() => forecastPoints.id)
      .notNull(),

    dataTime: integer("data_time"),
    forecastTime: integer("forecast_time"),
    dataDate: timestamp("data_date", { withTimezone: true }),

    // Wave measurements
    swh: doublePrecision("swh"),
    perpw: doublePrecision("perpw"),
    dirpw: doublePrecision("dirpw"),
    shww: doublePrecision("shww"),
    mpww: doublePrecision("mpww"),
    wvdir: doublePrecision("wvdir"),

    // Wind measurements
    ws: doublePrecision("ws"),
    wdir: doublePrecision("wdir"),

    // Swell measurements
    swell: doublePrecision("swell"),
    swper: doublePrecision("swper"),

    entryUpdated: timestamp("entry_updated", { withTimezone: true }),
  },
  (table) => [
    index("idx_wave_measurements_point_time").on(table.pointId, table.dataDate),
    uniqueIndex("unique_measurement_constraint").on(
      table.pointId,
      table.dataDate,
      table.dataTime,
      table.forecastTime
    ),
  ]
);

export const spots = pgTable(
  "spots",
  {
    id: integer("id").primaryKey(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    spotName: text("spot_name"),
    streetAddress: text("street_address"),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),
  },
  (table) => [index("idx_spots_location").using("gist", table.location)]
);

export const stationInventory = pgTable(
  "station_inventory",
  {
    id: integer("id").primaryKey(),
    stationId: integer("station_id"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    hasWaterLevel: boolean("has_water_level"),
    hasWind: boolean("has_wind"),
    hasAirTemperature: boolean("has_air_temperature"),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),
    entryUpdated: timestamp("entry_updated", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
  },
  (table) => [
    index("idx_station_inventory_location_gist").using("gist", table.location),
  ]
);
