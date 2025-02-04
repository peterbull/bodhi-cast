import { JSDOM } from "jsdom";

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

export function formatDateYYYYMMDD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export type Epoch = "00" | "06" | "12" | "18";

export async function getMeanGlobalForecastUrls(): Promise<string[]> {
  const date = new Date();
  const formattedDate = formatDateYYYYMMDD(date);
  const epoch: Epoch = "00";
  const url = `https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.${formattedDate}/${epoch}/wave/gridded/`;
  const res = await fetch(url);
  const html = await res.text();
  const dom = new JSDOM(html);
  const aTags = dom.window.document.querySelectorAll("a");
  const pattern = /.*\.mean\.global\.0p25\.f\d{3}\.grib2/;
  const links = Array.from(aTags)
    .map((tag) => tag.href)
    .filter((link) => pattern.test(link));
  const fullLinks = links.map((link) => url + link);
  return fullLinks;
}
