import { updateWaveMeasurements } from "./db/queries";
import { getMeanGlobalForecastUrls } from "./utils";
import { EccodesWrapper } from "eccodes-ts";
async function main() {
  const links = await getMeanGlobalForecastUrls();
  const wrapper = new EccodesWrapper(links[0]); // just get first link for now
  console.log("pause");
  const swh = await wrapper.getSignificantWaveHeight({ addLatLon: true });
  console.log("swh", swh);
  await updateWaveMeasurements(swh);
  return links;
}

await main();
