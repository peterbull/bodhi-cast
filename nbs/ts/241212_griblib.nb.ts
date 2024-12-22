
//#nbts@code
import { readFile, writeFile } from "node:fs/promises";
import { createReadStream, createWriteStream, readFileSync } from "node:fs";
import { EccodesWrapper } from "eccodes-ts";

//#nbts@code
const date = new Date();
const formattedDate = `${date.getUTCFullYear()}${String(
  date.getMonth() + 1
).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;

//#nbts@code
await Deno.mkdir("./data", { recursive: true });

//#nbts@code
const response = await fetch(
  `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.${formattedDate}/00/wave/gridded/gefs.wave.t00z.mean.global.0p25.f045.grib2`
);

//#nbts@code
response.body;

//#nbts@code
const datapath = "./data/gefs.wave.grib2";

//#nbts@code
const eccodes = new EccodesWrapper("./data/gefs.wave.grib2");

//#nbts@code
await eccodes.readToJson({ addLatLon: true });

//#nbts@code
res;

//#nbts@code
