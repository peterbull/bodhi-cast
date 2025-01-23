import { updateWaveMeasurements } from "./db/queries";
import { getMeanGlobalForecastUrls } from "./utils";
import { EccodesWrapper } from "eccodes-ts";

function createWrapper(url: string) {
  return new EccodesWrapper(url);
}

async function updateSwellWaveHeight(url: string) {
  const wrapper = createWrapper(url);
  const swh = await wrapper.getSignificantWaveHeight({ addLatLon: true });
  await updateWaveMeasurements(swh);
}

async function updatePrimaryWavePeriod(url: string) {
  const wrapper = createWrapper(url);
  const perpw = await wrapper.getPrimaryWavePeriod({ addLatLon: true });
  await updateWaveMeasurements(perpw);
}

async function main() {
  const links = await getMeanGlobalForecastUrls();
  const singleLink = links[0];

  await updateSwellWaveHeight(singleLink);
  await updatePrimaryWavePeriod(singleLink);
  return links;
}

await main();
