import assert from "node:assert/strict";
import test from "node:test";
import { seaState, waveNumber } from "../src/swell.ts";

test("swell preserves its period while shortening in shallow water", () => {
  for (const period of [2, 5, 8, 12, 20]) {
    let previous = Infinity;
    for (const depth of [0.1, 0.5, 2, 10, 40, 500]) {
      const k = waveNumber(period, depth);
      assert.ok(Number.isFinite(k) && k > 0 && k <= previous);
      const omegaSquared = ((2 * Math.PI) / period) ** 2;
      assert.ok(
        Math.abs(9.81 * k * Math.tanh(k * depth) - omegaSquared) < 1e-8,
      );
      previous = k;
    }
  }
});

test("deep swell converges to deep-water wavelength", () => {
  const k = waveNumber(12, 1000);
  assert.ok(Math.abs((2 * Math.PI) / k - (9.81 * 144) / (2 * Math.PI)) < 0.001);
});

const spot = {
  id: 1,
  latitude: 36.8,
  longitude: -76,
  spot_name: "Test",
  street_address: "",
  watched: true,
};
const forecast = {
  time: "2026-10-17T12:00:00Z",
  valid_time: "2026-10-17T18:00:00Z",
  latitude: 36.8,
  longitude: -75.75,
  distance: 20,
  swh: 2.4384,
  perpw: 8,
  dirpw: 80,
  shww: 2.4384,
  mpww: 8,
  wvdir: 80,
  ws: 15,
  wdir: 20,
  swells: [],
};

test("NOAA significant height sets surface variance and scales linearly", () => {
  for (const feet of [2, 4, 8, 12]) {
    const swh = feet * 0.3048;
    const state = seaState({ ...forecast, swh, shww: swh }, spot);
    const variance = [0, 1, 2, 3].reduce(
      (sum, i) => sum + state.waves[i * 3] ** 2 / 2,
      0,
    );
    assert.ok(Math.abs(4 * Math.sqrt(variance) - swh) < 1e-6);
    assert.equal(
      state.waves[10],
      8,
      "Wind sea retains its slot without swell partitions",
    );
    assert.ok(
      [...state.nearNumbers, ...state.farNumbers, ...state.amplitudes].every(
        Number.isFinite,
      ),
    );
  }
});

test("partition rounding cannot inflate total height, and missing periods use the primary period", () => {
  const state = seaState(
    {
      ...forecast,
      swh: 2,
      shww: 2,
      mpww: null,
      swells: [{ height: 2, period: 12, direction: 90 }],
    },
    spot,
  );
  const variance = [0, 1, 2, 3].reduce(
    (sum, i) => sum + state.waves[i * 3] ** 2 / 2,
    0,
  );
  assert.ok(Math.abs(4 * Math.sqrt(variance) - 2) < 1e-6);
  assert.equal(state.waves[10], 8);
});
