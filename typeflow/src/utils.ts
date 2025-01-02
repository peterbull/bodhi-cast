import { JSDOM } from "jsdom";

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
