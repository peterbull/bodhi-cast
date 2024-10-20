import { useState, useEffect, createContext, useContext } from "react";
import { Spot, SpotForecast, FormattedDate } from "../types/types";

function getFormattedDate(): FormattedDate {
  /**
   * Returns the date as a string formatted YYYYMMDD
   */
  const now: Date = new Date();

  return (now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0")) as FormattedDate;
}

function useSpot() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [currentSpot, setCurrentSpot] = useState<Spot | undefined>(undefined);
  const [spotForecast, setSpotForecast] = useState<SpotForecast[]>([]);

  const fetchAllSpots = async (): Promise<Spot[]> => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/spots`,
      );
      const data: Spot[] = await res.json();
      return data;
    } catch (error) {
      console.error("Error fetching spot data:", error);
      return [];
    }
  };

  const fetchSpotForecast = async (
    currentSpot: Spot,
  ): Promise<SpotForecast[]> => {
    try {
      const date = getFormattedDate();
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/forecasts/nearest/${date}/${currentSpot.latitude}/${currentSpot.longitude}`,
      );
      const data: SpotForecast[] = await res.json();
      return data;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchAllSpots();
      setSpots(data);
    };
    fetchData();
  }, []);

  // Set the forecast data for the currently selected spot
  useEffect(() => {
    const fetchSpotForecastData = async (currentSpot: Spot) => {
      const data = await fetchSpotForecast(currentSpot);
      setSpotForecast(data);
    };
    if (currentSpot) {
      setSpotForecast([]);
      fetchSpotForecastData(currentSpot);
    }
  }, [currentSpot]);

  return {
    spots,
    setSpots,
    currentSpot,
    setCurrentSpot,
    spotForecast,
    setSpotForecast,
  };
}

const SpotsContext = createContext<ReturnType<typeof useSpot> | undefined>(
  undefined,
);

export const SpotsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const contextItemsState = useSpot();

  return (
    <SpotsContext.Provider value={contextItemsState}>
      {children}
    </SpotsContext.Provider>
  );
};

export function useSpotsContext() {
  const context = useContext(SpotsContext);
  if (context === undefined) {
    throw new Error(
      "useSpotsContext must be used within a SpotsContext provider",
    );
  }
  return context;
}
