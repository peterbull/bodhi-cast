import type { Forecast, Spot } from "./types";

export function waveNumber(period: number, depth: number): number {
  const omega = (2 * Math.PI) / Math.max(period, 2);
  const h = Math.max(depth, 0.1);
  const target = (omega * omega) / 9.81;
  let k = Math.max(target, Math.sqrt(target / h));
  // Finite-depth dispersion: omega² = g k tanh(k h).
  for (let i = 0; i < 8; i++) {
    const t = Math.tanh(k * h);
    k -= (k * t - target) / (t + k * h * (1 - t * t));
  }
  return k;
}

function groupVelocity(period: number, depth: number, k: number): number {
  const kh = k * depth;
  const correction = kh > 20 ? 0 : (2 * kh) / Math.sinh(2 * kh);
  return (Math.PI / (period * k)) * (1 + correction);
}

export function seaState(point: Forecast, spot: Spot) {
  const latitude = (spot.latitude * Math.PI) / 180;
  const gridLatitude = (point.latitude * Math.PI) / 180;
  const delta = ((point.longitude - spot.longitude) * Math.PI) / 180;
  const offshore = Math.atan2(
    Math.sin(delta) * Math.cos(gridLatitude),
    Math.cos(latitude) * Math.sin(gridLatitude) -
      Math.sin(latitude) * Math.cos(gridLatitude) * Math.cos(delta),
  );
  const components = Array.from({ length: 2 }, (_, i) => ({
    height: Math.max(0, point.swells[i]?.height ?? 0),
    period: point.swells[i]?.period ?? point.perpw ?? 8,
    direction: point.swells[i]?.direction ?? point.dirpw ?? 0,
  }));
  const windHeight = Math.max(0, point.shww ?? 0);
  const partitionEnergy = components.reduce(
    (sum, c) => sum + c.height ** 2,
    windHeight ** 2,
  );
  const significantHeight = Math.max(
    0,
    point.swh ?? Math.sqrt(partitionEnergy),
  );
  const primaryHeight = Math.sqrt(
    Math.max(0, significantHeight ** 2 - partitionEnergy),
  );
  const energyScale =
    partitionEnergy > significantHeight ** 2
      ? significantHeight / Math.sqrt(partitionEnergy)
      : 1;
  const all = [
    {
      height: primaryHeight,
      period: point.perpw ?? 8,
      direction: point.dirpw ?? 0,
    },
    ...components,
    {
      height: windHeight,
      period: point.mpww ?? point.perpw ?? 8,
      direction: point.wvdir ?? point.dirpw ?? 0,
    },
  ];
  const waves = new Float32Array(12),
    nearNumbers = new Float32Array(16),
    farNumbers = new Float32Array(12),
    amplitudes = new Float32Array(16);
  all.forEach((component, i) => {
    const period = Math.max(component.period, 2);
    const omega = (2 * Math.PI) / period;
    const deepK = (omega * omega) / 9.81;
    const direction = ((component.direction + 180) * Math.PI) / 180 - offshore;
    const alongshore = deepK * Math.sin(direction) * 0.8;
    waves[i * 3] = (component.height * energyScale) / (2 * Math.sqrt(2));
    waves[i * 3 + 1] = period;
    waves[i * 3 + 2] = direction;
    [0, 24, 96, 320, 1000].forEach((distance, j) => {
      const depth = Math.max(
        0.5,
        0.04 * distance + 0.22 * (1 - Math.exp(-distance * 0.12)),
      );
      const k = waveNumber(period, depth);
      const crossShore = Math.sqrt(
        Math.max(0, k * k - alongshore * alongshore),
      );
      const shoaling = Math.sqrt(
        9.81 / (2 * omega) / groupVelocity(period, depth, k),
      );
      if (j < 4) {
        nearNumbers[i * 4 + j] = crossShore;
        amplitudes[i * 4 + j] = shoaling;
      } else {
        farNumbers[i * 3] = crossShore;
        farNumbers[i * 3 + 1] = alongshore;
        farNumbers[i * 3 + 2] = shoaling;
      }
    });
  });
  return { waves, nearNumbers, farNumbers, amplitudes, significantHeight };
}
