import { db } from "./index";
import { intToDate } from "../utils";
import { sql, SQL, and, eq, or, inArray } from "drizzle-orm";
import { waveMeasurements } from "./schema";
import { WaveParameter, WithLatLon } from "eccodes-ts";

export async function updateWaveMeasurements(
  forecastParameter: WithLatLon<WaveParameter>[]
) {
  const BATCH_SIZE = 1000;
  console.log(`Starting process at ${new Date().toISOString()}`);
  const shortName = forecastParameter[0].shortName;
  console.log("param name", shortName);
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

  const processChunk = async (
    coordinates: (typeof forecastParameter)[0]["values"]
  ) => {
    await db.execute(sql`TRUNCATE temp_coordinates`);
    const coordValues = coordinates
      .map((c) => `(${c.lat}, ${c.lon})`)
      .join(", ");

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
      dataDate: intToDate(forecastParameter[0].dataDate),
      dataTime: forecastParameter[0].dataTime,
      forecastTime: forecastParameter[0].forecastTime,
      [shortName]:
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
          [shortName]: sql.raw(`EXCLUDED.${shortName}`),
          entryUpdated: sql`EXCLUDED.entry_updated`,
        },
      });

    return measurements.length;
  };

  let processed = 0;
  const totalCoordinates = forecastParameter[0].values.length;
  const chunks = chunk(forecastParameter[0].values, BATCH_SIZE);

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
}
