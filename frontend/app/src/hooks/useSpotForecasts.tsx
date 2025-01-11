import { useQuery } from "@tanstack/react-query";
import { Spot } from "./useSpots";
import { getFormattedDate } from "../utils";

export type SpotForecast = {
  id: number;
  time: string;
  valid_time: string;
  dirpw: number | null;
  distance: number;
  location: string;
  mpww: number | null;
  perpw: number | null;
  shww: number | null;
  swell: number | null;
  swh: number | null;
  swper: number | null;
  wdir: number | null;
  ws: number | null;
  wvdir: number | null;
};

async function fetchSpotForecasts(spot: Spot): Promise<SpotForecast[]> {
  try {
    const date = getFormattedDate();
    const res = await fetch(
      `${
        import.meta.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"
      }/forecasts/nearest/${date}/${spot.latitude}/${spot.longitude}`
    );
    if (!res.ok) {
      throw new Error("Network response was not ok");
    }
    const data: SpotForecast[] = await res.json();
    return data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function useSpotForecasts(spot: Spot) {
  const spotForecasts = useQuery({
    queryKey: ["spotForecasts", spot.id],
    queryFn: () => fetchSpotForecasts(spot),
    enabled: Boolean(spot),
  });

  return {
    spotForecasts: spotForecasts.data ?? [],
    spotForecastsLoading: spotForecasts.isLoading,
    spotForecastsError: spotForecasts.isError,
  };
}
