import { getMeanGlobalForecastUrls } from "./utils";

async function main() {
  const links = await getMeanGlobalForecastUrls();
  console.log("sample links", links.slice(0, 5));
  return links;
}

await main();
