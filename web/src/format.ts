import type { Forecast, Spot, Units } from "./types";

export const number = (value: number | null | undefined, digits = 1) =>
  value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
export const height = (value: number | null | undefined, units: Units) =>
  number(value == null ? null : value * (units === "imperial" ? 3.28084 : 1));
export const speed = (value: number | null | undefined, units: Units) =>
  number(value == null ? null : value * (units === "imperial" ? 1.943844 : 1));
export const dayKey = (value: string) =>
  new Date(value).toLocaleDateString("en-CA");
export function compass(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const direction = ((value % 360) + 360) % 360;
  const label = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ][Math.round(direction / 22.5) % 16];
  return `${label} ${Math.round(direction)}°`;
}
export function matchesSpot(
  spot: Pick<Spot, "spot_name" | "street_address">,
  query: string,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const haystack = normalize(`${spot.spot_name} ${spot.street_address}`);
  return normalize(query)
    .split(/\s+/)
    .every((token) => haystack.includes(token));
}
export function readSpotId(search: string): number | null {
  const value = new URLSearchParams(search).get("spot");
  if (!value || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
export function resolveSpot(spots: Spot[], requested: number | null) {
  return (
    spots.find((spot) => spot.id === requested) ??
    spots.find((spot) => spot.watched) ??
    spots.find((spot) => spot.spot_name === "1st Street Jetty") ??
    spots[0]
  );
}
export function waveRange(points: Pick<Forecast, "swh">[], units: Units) {
  const values = points.flatMap((p) =>
    p.swh != null && Number.isFinite(p.swh) ? [p.swh] : [],
  );
  if (!values.length) return "—";
  const min = height(Math.min(...values), units),
    max = height(Math.max(...values), units);
  return min === max ? min : `${min}–${max}`;
}

export function readUnitPreference(): { units: Units; notice: string } {
  try {
    return {
      units:
        localStorage.getItem("bodhi.units") === "metric"
          ? "metric"
          : "imperial",
      notice: "",
    };
  } catch {
    return {
      units: "imperial",
      notice:
        "Your unit preference will apply for this visit; browser storage is unavailable.",
    };
  }
}
