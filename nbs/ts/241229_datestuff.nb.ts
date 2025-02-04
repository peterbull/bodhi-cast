
//#nbts@code
/// <reference lib="dom" />
import { JSDOM } from "npm:jsdom";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

//#nbts@code
function formatDateYYYYMMDD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
type Epoch = "00" | "06" | "12" | "18";
const date = new Date();
const formattedDate = formatDateYYYYMMDD(date);
const epoch: Epoch = "00";
const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.${formattedDate}/${epoch}/wave/gridded/`;

//#nbts@code
const res = await fetch(url);

//#nbts@code
const html = await res.text();

//#nbts@code
const dom = new JSDOM(html);

//#nbts@code
dom.window.document.querySelectorAll("a");

//#nbts@code
