
//#nbts@mark
// https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation
//#nbts@code
interface SelfLink {
  self: string;
}

interface Station {
  tidal: boolean;
  greatlakes: boolean;
  shefcode: string;
  details: SelfLink;
  sensors: SelfLink;
  floodlevels: SelfLink;
  datums: SelfLink;
  supersededdatums: SelfLink;
  harmonicConstituents: SelfLink;
  benchmarks: SelfLink;
  tidePredOffsets: SelfLink;
  ofsMapOffsets: SelfLink;
  state: string;
  timezone: string;
  timezonecorr: number;
  observedst: boolean;
  stormsurge: boolean;
  nearby: SelfLink;
  forecast: boolean;
  outlook: boolean;
  HTFhistorical: boolean;
  nonNavigational: boolean;
  id: string;
  name: string;
  lat: number;
  lng: number;
  affiliations: string;
  portscode: string | null;
  products: SelfLink;
  disclaimers: SelfLink;
  notices: SelfLink;
  self: string;
  expand: string;
  tideType: string;
}

interface StationsResponse {
  count: number;
  units: null;
  stations: Station[];
}

//#nbts@code
const res = await fetch(
  `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json`
);

//#nbts@code
const data: StationsResponse = await res.json();

//#nbts@code
async function writeJsonToFile(data: unknown, filename: string): Promise<void> {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await Deno.writeTextFile(filename, jsonString);
    console.log(`Data written to ${filename}`);
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
}

//#nbts@code
await writeJsonToFile(data, "./data/stations.json");

//#nbts@code
const BASE_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";

//#nbts@code
interface NOAARequest {
  station: string;
  date: "today" | "latest" | "recent" | string;
  product: string;
  datum?: string;
  units: "english" | "metric";
  time_zone: "gmt" | "lst" | "lst_ldt";
  format: "json" | "xml" | "csv";
  interval?: string;
  application?: string;
}

//#nbts@code
type WaterLevelMeasurement = {
  /** Timestamp of the measurement in ISO format (YYYY-MM-DD HH:mm) */
  t: string;

  /**
   * Value of the water level measurement
   * Typically in meters or feet above a reference point
   */
  v: string;

  /**
   * Standard deviation/sigma of the measurement
   * Represents uncertainty/precision of the measurement
   */
  s: string;

  /**
   * Flags for data quality/processing
   * Comma-separated values indicating various quality control checks
   * Format: "flag1,flag2,flag3,flag4"
   */
  f: string;

  /**
   * Quality indicator of the measurement
   * p = preliminary/provisional data
   * Other possible values could include:
   * v = verified
   * e = estimated
   * etc.
   */
  q: "p" | "v" | "e" | string;
};

//#nbts@code
type AirTempMeasurement = {
  /** Timestamp of the measurement in ISO format (YYYY-MM-DD HH:mm) */
  t: string;

  /**
   * Temperature value
   * Typically in degrees Fahrenheit or Celsius
   */
  v: string;

  /**
   * Flags for data quality/processing
   * Comma-separated values indicating various quality control checks
   * Format: "flag1,flag2,flag3"
   */
  f: string;
};

//#nbts@code
type WaterTempMeasurement = {
  /** Timestamp of the measurement in ISO format (YYYY-MM-DD HH:mm) */
  t: string;

  /**
   * Water temperature value
   * Typically in degrees Fahrenheit or Celsius
   */
  v: string;

  /**
   * Flags for data quality/processing
   * Comma-separated values indicating various quality control checks
   * Format: "flag1,flag2,flag3"
   */
  f: string;
};

//#nbts@code
type WindMeasurement = {
  /** Timestamp of the measurement in ISO format (YYYY-MM-DD HH:mm) */
  t: string;

  /**
   * Sustained wind speed
   * Typically in mph or knots
   */
  s: string;

  /**
   * Wind direction in degrees
   * 0-360 degrees where 0/360 is North
   */
  d: string;

  /**
   * Cardinal/intercardinal wind direction
   * N, NE, E, SE, S, SW, W, NW
   */
  dr: "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

  /**
   * Wind gust speed
   * Typically in mph or knots
   */
  g: string;

  /**
   * Flags for data quality/processing
   * Comma-separated values indicating various quality control checks
   * Format: "flag1,flag2"
   */
  f: string;
};

//#nbts@code
type SensorType = "waterLevel" | "airTemp" | "waterTemp" | "wind";

type Metadata = {
  id: string;
  name: string;
  lat: string | number;
  lon: string | number;
};
type ProductMessage = {
  message: string;
};

type ProductResponseError = {
  error: ProductMessage;
};

type ProductResponseSuccess = {
  metadata: Metadata;
  data:
    | WindMeasurement[]
    | WaterLevelMeasurement[]
    | WaterTempMeasurement[]
    | AirTempMeasurement[];
};
type ProductResponse = ProductResponseSuccess | ProductResponseError;

type SensorData = {
  waterLevel: ProductResponse;
  airTemp: ProductResponse;
  waterTemp: ProductResponse;
  wind: ProductResponse;
};

//#nbts@code
async function getStationData(stationId: string): Promise<SensorData> {
  const baseParams = {
    station: stationId,
    date: "today",
    units: "english",
    time_zone: "lst_ldt",
    format: "json",
    application: "bohdi-cast",
  };

  try {
    // Get water level data
    const waterLevelUrl = new URL(BASE_URL);
    waterLevelUrl.search = new URLSearchParams({
      ...baseParams,
      product: "water_level",
      datum: "MLLW",
    }).toString();

    // Get air temperature
    const airTempUrl = new URL(BASE_URL);
    airTempUrl.search = new URLSearchParams({
      ...baseParams,
      product: "air_temperature",
    }).toString();

    // Get water temperature
    const waterTempUrl = new URL(BASE_URL);
    waterTempUrl.search = new URLSearchParams({
      ...baseParams,
      product: "water_temperature",
    }).toString();

    // Get wind data
    const windUrl = new URL(BASE_URL);
    windUrl.search = new URLSearchParams({
      ...baseParams,
      product: "wind",
    }).toString();

    // Fetch all data in parallel
    const [waterLevel, airTemp, waterTemp, wind] = await Promise.all([
      fetch(waterLevelUrl),
      fetch(airTempUrl),
      fetch(waterTempUrl),
      fetch(windUrl),
    ]);

    return {
      waterLevel: await waterLevel.json(),
      airTemp: await airTemp.json(),
      waterTemp: await waterTemp.json(),
      wind: await wind.json(),
    };
  } catch (error) {
    console.error("Error fetching NOAA data:", error);
    throw error;
  }
}

//#nbts@code
const stationRes = await getStationData("8639348");

//#nbts@code

//#nbts@code
await writeJsonToFile(stationRes, "./data/stationResponse.json");
