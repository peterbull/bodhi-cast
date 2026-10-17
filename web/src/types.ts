export interface Spot {
  id: number;
  latitude: number;
  longitude: number;
  spot_name: string;
  street_address: string;
  watched: boolean;
}
export interface Swell {
  height: number | null;
  period: number | null;
  direction: number | null;
}
export interface Forecast {
  time: string;
  valid_time: string;
  latitude: number;
  longitude: number;
  distance: number;
  swh: number | null;
  perpw: number | null;
  dirpw: number | null;
  shww: number | null;
  mpww: number | null;
  wvdir: number | null;
  ws: number | null;
  wdir: number | null;
  swells: Swell[];
}
export interface ForecastResponse {
  points: Forecast[];
  stale: boolean;
  source: string;
}
export interface Observation {
  t: string;
  v?: string;
  s?: string;
  d?: string;
  g?: string;
}
export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance: number;
  observations: Partial<
    Record<
      "water_level" | "wind" | "air_temperature" | "water_temperature",
      Observation
    >
  >;
  updated_at: string | null;
}
export interface Status {
  jobs: {
    status: "pending" | "running" | "succeeded" | "failed";
    count: number;
  }[];
  last_forecast_update: string | null;
  latest_model: string | null;
  errors: { id: number; error: string; at: string }[];
}
export interface Capabilities {
  can_write: boolean;
  requires_token: boolean;
  max_watched_spots: number;
}
export type Units = "metric" | "imperial";
