
//#nbts@code
import { EccodesWrapper } from "npm:eccodes-ts";
import { getMeanGlobalForecastUrls } from "../../typeflow/src/utils.ts";
import { drizzle } from "npm:drizzle-orm/node-postgres";
import { sql, SQL, and, eq, or, inArray } from "npm:drizzle-orm";
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
const wrapper = new EccodesWrapper(links[0]);

//#nbts@code
export const db = drizzle(DATABASE_URL);

//#nbts@code
const swh = await wrapper.getSignificantWaveHeight({ addLatLon: true });

//#nbts@mark
// - `dataTime` is which of the 4 daily runs this is from [00, 06, 12, 18]
// - `forecastTime` is how far in the future the forecast is for, in intervals of 3-6 hrs, up to ~240 or more
//#nbts@code
swh;

//#nbts@code
swh.length;

//#nbts@code
swh[0];

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
const exampleEntry = swh[0].values[0];
exampleEntry;

//#nbts@code
const testPointId = (
  await db
    .select({
      id: forecastPoints.id,
      location: forecastPoints.location,
    })
    .from(forecastPoints)
    .where(
      and(
        eq(forecastPoints.latitude, exampleEntry.lat),
        eq(forecastPoints.longitude, exampleEntry.lon)
      )
    )
    .limit(1)
)[0];

//#nbts@code
testPointId.location;

//#nbts@code
swh[0];

//#nbts@code
const BATCH_SIZE = 1000;
console.log(`Starting process at ${new Date().toISOString()}`);

const chunk = <T>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};

await db.execute(sql`
  CREATE TEMP TABLE temp_coordinates (
    latitude double precision,
    longitude double precision
  );
  CREATE INDEX ON temp_coordinates (latitude, longitude);
`);

const processChunk = async (coordinates: (typeof swh)[0]["values"]) => {
  await db.execute(sql`TRUNCATE temp_coordinates`);

  const coordValues = coordinates.map((c) => `(${c.lat}, ${c.lon})`).join(", ");

  await db.execute(sql`
    INSERT INTO temp_coordinates (latitude, longitude)
    VALUES ${sql.raw(coordValues)}
  `);

  const points = await db.execute<{
    id: number;
    latitude: number;
    longitude: number;
  }>(sql`
    SELECT DISTINCT fp.id, fp.latitude, fp.longitude
    FROM forecast_points fp
    JOIN temp_coordinates tc 
    ON fp.latitude = tc.latitude 
    AND fp.longitude = tc.longitude
  `);

  if (!points.rows?.length) {
    return;
  }

  const measurements = points.rows.map((point) => ({
    pointId: point.id,
    dataDate: intToDate(swh[0].dataDate),
    dataTime: swh[0].dataTime,
    forecastTime: swh[0].forecastTime,
    swh:
      coordinates.find(
        (c) => c.lat === point.latitude && c.lon === point.longitude
      )?.value ?? null,
  }));

  await db
    .insert(waveMeasurements)
    .values(measurements)
    .onConflictDoUpdate({
      target: [
        waveMeasurements.pointId,
        waveMeasurements.dataDate,
        waveMeasurements.dataTime,
        waveMeasurements.forecastTime,
      ],
      set: {
        swh: sql`EXCLUDED.swh`,
        entryUpdated: sql`EXCLUDED.entry_updated`,
      },
    });

  return measurements.length;
};

let processed = 0;
const totalCoordinates = swh[0].values.length;
const chunks = chunk(swh[0].values, BATCH_SIZE);

console.log(
  `Processing ${totalCoordinates} coordinates in ${chunks.length} chunks`
);

try {
  for (let i = 0; i < chunks.length; i++) {
    try {
      console.time(`Chunk ${i + 1}/${chunks.length}`);
      const insertedCount = await processChunk(chunks[i]);
      processed += insertedCount || 0;

      console.timeEnd(`Chunk ${i + 1}/${chunks.length}`);
      console.log(
        `Processed ${processed}/${totalCoordinates} coordinates (${Math.round(
          (processed / totalCoordinates) * 100
        )}%)`
      );

      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
    }
  }
} finally {
  await db.execute(sql`DROP TABLE IF EXISTS temp_coordinates`);
  console.log(`Finished at ${new Date().toISOString()}`);
}

//#nbts@code
