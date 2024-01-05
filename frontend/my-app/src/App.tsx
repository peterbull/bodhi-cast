import "./App.css";
import { useEffect, useState } from "react";

import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";

function App() {
  const [spots, setSpots] = useState([]);
  const [zoom, setZoom] = useState([]);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const [spotForecast, setSpotForecast] = useState<any>([]);

  useEffect(() => {
    const fetchAllSpots = async () => {
      try {
        const res = await fetch(
          `http://${process.env.REACT_APP_BACKEND_HOST}:${process.env.REACT_APP_BACKEND_PORT}/spots`
        );
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
      const fetchSpotForecast = async () => {
        try {
          const now = new Date();
          const date =
            now.getUTCFullYear().toString() +
            (now.getUTCMonth() + 1).toString().padStart(2, "0") +
            now.getUTCDate().toString().padStart(2, "0");
          const res = await fetch(
            `http://${process.env.REACT_APP_BACKEND_HOST}:${process.env.REACT_APP_BACKEND_PORT}/forecasts/spots/${date}/${currentSpot.latitude}/${currentSpot.longitude}/`
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
        currentSpot={currentSpot}
        setCurrentSpot={setCurrentSpot}
        spotForecast={spotForecast}
      />
    </ComponentMapProvider>
  );
}

export default App;
