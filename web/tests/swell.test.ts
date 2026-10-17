import assert from "node:assert/strict";
import test from "node:test";
import { waveNumber } from "../src/swell.ts";

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
