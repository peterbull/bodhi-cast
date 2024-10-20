export type FormattedDate = string & { readonly brand: unique symbol };

export type Spot = {
  id: number;
  latitude: number;
  longitude: number;
  spot_name: string;
  street_address: string;
};

export type SpotForecast = {
  dirpw: number | null;
  distance: number;
  id: number;
  location: string;
  mpww: number | null;
  perpw: number | null;
  shww: number | null;
  swell: number | null;
  swh: number | null;
  swper: number | null;
  time: string;
  valid_time: string;
  wdir: number | null;
  ws: number | null;
  wvdir: number | null;
};

export type ActiveComponent = "GlobeSpots" | "AddSpot" | "GlobeSwell";

export type GlobeSize = {
  width: number;
  height: number;
};
