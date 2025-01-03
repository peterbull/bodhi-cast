
//#nbts@code
import { EccodesWrapper } from "npm:eccodes-ts";
import { getMeanGlobalForecastUrls } from "../../typeflow/src/utils.ts";
import { drizzle } from "npm:drizzle-orm/node-postgres";
import { sql, SQL } from "npm:drizzle-orm";
import { DATABASE_URL } from "../../typeflow/src/db/index.ts";
import { LocationForecast } from "npm:eccodes-ts";
import { waveForecast } from "../../typeflow/src/db/schema.ts";

//#nbts@code
const links = await getMeanGlobalForecastUrls();

//#nbts@code
const res = await fetch(links[12]);

//#nbts@code
export const db = drizzle(DATABASE_URL);

//#nbts@code
res;

//#nbts@code
const wrapper = new EccodesWrapper(res.body);

//#nbts@code
const data = await wrapper.readToJson();

//#nbts@code
const swh = await wrapper.getSignificantWaveHeight({ addLatLon: true });

//#nbts@mark
// - `dataTime` is which of the 4 daily runs this is from [00, 06, 12, 18]
// - `forecastTime` is how far in the future the forecast is for, in intervals of 3-6 hrs, up to ~240 or more
//#nbts@code
swh;

//#nbts@code
/**
 * Converts integer date (YYYYMMDD) and time (HHMM) to Date object
 * @param dateInt - Integer date in YYYYMMDD format (e.g., 20250103)
 * @returns Date object
 * @throws Error if date or time format is invalid
 */
export function intToDate(dateInt: number): Date {
  if (!Number.isInteger(dateInt) || dateInt.toString().length !== 8) {
    throw new Error(`Invalid date format: ${dateInt}. Expected YYYYMMDD`);
  }

  const year = Math.floor(dateInt / 10000);
  const month = Math.floor((dateInt % 10000) / 100) - 1; // 0-based month
  const day = dateInt % 100;

  const date = new Date(year, month, day);

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date/time combination: ${dateInt}`);
  }

  return date;
}

//#nbts@code
intToDate(swh[0].dataDate);

//#nbts@code
swh[0].values;

//#nbts@code
async function addPointLocations(batch: PointLocation[]) {
  await db.insert(waveForecast).values(batch);
}

//#nbts@code
export interface PointLocation {
  latitude: number;
  longitude: number;
  location: SQL;
}

let batch: PointLocation[] = [];
let processed = 0;

for (const point of swh[0].values as LocationForecast[]) {
  batch.push({
    latitude: point.lat,
    longitude: point.lon,
    location: sql`ST_SetSRID(ST_MakePoint(${point.lon}, ${point.lat}), 4326)`,
  });
  processed++;
  if (processed === 5000) {
    await addPointLocations(batch);
    batch = [];
    processed = 0;
  }
}

if (batch.length > 0) {
  await addPointLocations(batch);
}

//#nbts@code
