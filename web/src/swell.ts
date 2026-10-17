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
