import Fastify from "fastify";
import { AsyncTask, SimpleIntervalJob, ToadScheduler } from "toad-scheduler";
import { updateWaveMeasurements } from "./db/queries";
import { getMeanGlobalForecastUrls } from "./utils";
import { EccodesWrapper } from "eccodes-ts";

const server = Fastify({
  logger: true,
});

const scheduler = new ToadScheduler();

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

async function updateWaveData() {
  try {
    const links = await getMeanGlobalForecastUrls();
    const singleLink = links[0];

    // await updateSwellWaveHeight(singleLink);
    // await updatePrimaryWavePeriod(singleLink);

    server.log.info("Wave data updated successfully");
  } catch (error) {
    server.log.error("Error updating wave data:", error);
  }
}
const task = new AsyncTask(
  "wave-data-update",
  async () => {
    await updateWaveData();
  },
  (err: Error) => {
    server.log.error("Task failed:", err);
  }
);

const job = new SimpleIntervalJob(
  {
    seconds: 30, // For testing: run every 30 seconds
    runImmediately: true,
  },
  task
);

server.get("/health", async () => {
  return { status: "ok" };
});

server.get("/trigger-update", async () => {
  await updateWaveData();
  console.log("updating");
  return { status: "update triggered" };
});

const start = async () => {
  try {
    scheduler.addSimpleIntervalJob(job);

    await server.listen({
      port: 3000,
      host: "0.0.0.0",
    });

    server.log.info("Server running on port 3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

process.on("SIGINT", async () => {
  scheduler.stop();
  await server.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  scheduler.stop();
  await server.close();
  process.exit(0);
});

start();
