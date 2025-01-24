import { updateWaveMeasurements } from "./db/queries";
import { getMeanGlobalForecastUrls } from "./utils";
import { EccodesWrapper } from "eccodes-ts";
import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";

const server: FastifyInstance = Fastify({
  logger: true,
});

server.register(cors, {
  origin: true,
});

server.get("/health", async (request, reply) => {
  return { status: "ok" };
});

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

const start = async () => {
  try {
    await server.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`Server listening on ${server.server.address()}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
