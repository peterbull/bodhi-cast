
//#nbts@code
import { readFile, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream, readFileSync } from "node:fs";
import { GRIB } from "vgrib2";
import * as noaa_gfs from "noaa-gfs-js";

//#nbts@code
const date = new Date();

//#nbts@code
const formattedDate = `${date.getUTCFullYear()}${String(
  date.getMonth() + 1
).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;

//#nbts@code
formattedDate;

//#nbts@code
await Deno.mkdir("./data", { recursive: true });

//#nbts@code
const response = await fetch(
  `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.20241212/00/wave/gridded/gefs.wave.t00z.mean.global.0p25.f045.grib2`
);

//#nbts@code
response.body;

//#nbts@code
const datapath = "./data/gefs.wave.grib2";

//#nbts@code
const fileStream = await Deno.create(datapath);
if (response.body) {
  for await (const chunk of response.body) {
    await fileStream.write(chunk);
  }
}
fileStream.close();

//#nbts@code
const data = readFileSync(datapath);

//#nbts@code
const res = await noaa_gfs.get_gfs_data(
  "0p25", // Options are 0p25, 0p50, or 1p00
  new Date(Date.now() - 86400000)
    .toISOString()
    .split("T")[0]
    .replaceAll("-", ""), // YYYMMDD format date
  "00", // Every 6 hours. 00, 06, 12, or 18
  [40.5, 40.5], // Lat range
  [-74, -74], // Lon range
  5, // Number of 8 hour  fwd increments to include in addition to the forecast time
  "rh2m", // The requested data item
  true // Whether or not to convert the times into dates or keep as NOAA formatted times (see below for more details)
);

//#nbts@code
res;

//#nbts@code
const grib = GRIB.parseNoLookup(data);

//#nbts@code
grib;

//#nbts@code
