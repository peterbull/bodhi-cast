
//#nbts@code
import { EccodesWrapper } from "npm:eccodes-ts";
import { getMeanGlobalForecastUrls } from "../../typeflow/src/utils.ts";
import { drizzle } from "npm:drizzle-orm/node-postgres";
import { sql, SQL, and, eq, or } from "npm:drizzle-orm";
import { DATABASE_URL } from "../../typeflow/src/db/index.ts";
import {
  LocationForecast,
  WaveParameter,
  BaseGrib2Message,
} from "npm:eccodes-ts";
import {
  forecastPoints,
  waveMeasurements,
} from "../../typeflow/src/db/schema.ts";

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

//#nbts@code
const swh = await wrapper.getSignificantWaveHeight({ addLatLon: true });

//#nbts@mark
// - `dataTime` is which of the 4 daily runs this is from [00, 06, 12, 18]
// - `forecastTime` is how far in the future the forecast is for, in intervals of 3-6 hrs, up to ~240 or more
//#nbts@code
swh.length;

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

  return new Date(date);
}

//#nbts@code
intToDate(swh[0].dataDate);

//#nbts@code
