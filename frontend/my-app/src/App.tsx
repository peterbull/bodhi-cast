import "./App.css";
import { useEffect, useState } from "react";

import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";

export type FormattedDate = string & { readonly brand: unique symbol };

export type Spot = {
  id: number;
  latitude: number;
  longitude: number;
  spot_name: string;
  street_address: string;
};

export type SpotForecast = {
  dirpw: number | null;
  distance: number;
  id: number;
  location: string;
  mpww: number | null;
  perpw: number | null;
  shww: number | null;
  swell: number | null;
  swh: number | null;
  swper: number | null;
  time: string;
  valid_time: string;
  wdir: number | null;
  ws: number | null;
  wvdir: number | null;
};
function getFormattedDate(): FormattedDate {
  /**
   * Returns the date as a string formatted YYYYMMDD
   */
  const now: Date = new Date();

  return (now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0")) as FormattedDate;
}
function App() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [zoom, setZoom] = useState<number>(13);
  const [currentSpot, setCurrentSpot] = useState<Spot | null>(null);
  const [spotForecast, setSpotForecast] = useState<SpotForecast[]>([]);
  const [spotClick, setSpotClick] = useState<any>([0, 0]);

  useEffect(() => {
    /**
     * Fetches all spots from the backend API and updates the state with the retrieved data.
     */
    const fetchAllSpots = async (): Promise<void> => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/spots`,
        );
        const data: Spot[] = await res.json();
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spot data:", error);
      }
    };

    fetchAllSpots();
  }, []);

  useEffect(() => {
    if (currentSpot) {
      setSpotForecast([]);
      /**
       * Fetches the spot forecast from the backend API based on the current spot's latitude and longitude.
       * The forecast is fetched for the current date.
       */
      const fetchSpotForecast = async (): Promise<void> => {
        try {
          const date = getFormattedDate();
          const res = await fetch(
            `${process.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/forecasts/nearest/${date}/${currentSpot.latitude}/${currentSpot.longitude}`,
          );
          const data: SpotForecast[] = await res.json();
          setSpotForecast(data);
        } catch (error) {
          console.error(error);
        }
      };

      fetchSpotForecast();
    }
  }, [currentSpot]);

  return (
    <ComponentMapProvider>
      <ComponentWrapper
        spots={spots}
        zoom={zoom}
        currentSpot={currentSpot}
        setCurrentSpot={setCurrentSpot}
        spotForecast={spotForecast}
        spotClick={spotClick}
        setSpotClick={setSpotClick}
      />
    </ComponentMapProvider>
  );
}

export default App;
