import {
  pgTable,
  boolean,
  bigint,
  doublePrecision,
  timestamp,
  interval,
  geometry,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

export const waveForecast = pgTable(
  "wave_forecast",
  {
    id: bigint("id", { mode: "number" })
      .primaryKey()
      .notNull()
      .default(sql`nextval('wave_forecast_id_seq')`),

    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }),

    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    time: timestamp("time", { withTimezone: true }),
    step: interval("step"),
    validTime: timestamp("valid_time", { withTimezone: true }),
    swh: doublePrecision("swh"),
    perpw: doublePrecision("perpw"),
    dirpw: doublePrecision("dirpw"),
    shww: doublePrecision("shww"),
    mpww: doublePrecision("mpww"),
    wvdir: doublePrecision("wvdir"),
    ws: doublePrecision("ws"),
    wdir: doublePrecision("wdir"),
    swell: doublePrecision("swell"),
    swper: doublePrecision("swper"),
    entryUpdated: timestamp("entry_updated", { withTimezone: true }),
  },
  (table) => [
    index("idx_wave_forecast_location").using("gist", table.location),
    index("wave_forecast_location_idx").using("gist", table.location),
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

// Station Inventory table
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
    index("idx_station_inventory_location").using("gist", table.location),
  ]
);
