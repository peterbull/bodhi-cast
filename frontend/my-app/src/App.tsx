import "./App.css";
import { useEffect, useState } from "react";
import { useSpotsContext } from "./hooks/useSpot";
import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";
import { FormattedDate, Spot, SpotForecast } from "./types/types";

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
  const [zoom, setZoom] = useState<number>(13);
  const [currentSpot, setCurrentSpot] = useState<Spot | undefined>(undefined);
  const [spotForecast, setSpotForecast] = useState<SpotForecast[]>([]);
  const [spotClick, setSpotClick] = useState<[number, number]>([0, 0]);
  const { spots } = useSpotsContext();

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
