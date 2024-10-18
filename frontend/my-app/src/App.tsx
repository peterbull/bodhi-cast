import "./App.css";
import { useEffect, useState } from "react";

import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";

//
//
function App() {
  const [spots, setSpots] = useState([]);
  const [zoom, setZoom] = useState(13);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const [spotForecast, setSpotForecast] = useState<any>([]);
  const [spotClick, setSpotClick] = useState<any>([0, 0]);

  useEffect(() => {
    /**
     * Fetches all spots from the backend API and updates the state with the retrieved data.
     * @returns {Promise<void>} A promise that resolves when the spots are fetched and the state is updated.
     */
    const fetchAllSpots = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/spots`);
        const data = await res.json();
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
       * @returns {Promise<void>} A promise that resolves when the spot forecast is fetched and set in the state.
       */
      const fetchSpotForecast = async () => {
        try {
          const now = new Date();
          const date =
            now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, "0") +
            now.getDate().toString().padStart(2, "0");
          const res = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/forecasts/nearest/${date}/${currentSpot.latitude}/${currentSpot.longitude}`,
          );
          const data = await res.json();
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
