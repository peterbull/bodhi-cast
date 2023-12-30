import "./App.css";
import { useContext, useEffect, useState } from "react";

import ComponentWrapper from "./components/ComponentWrapper";
import { ComponentMapProvider } from "./contexts/ComponentMapProvider";

export interface Coord {
  lat: number;
  lon: number;
  swell: number;
}

export interface SwellData {
  time: string;
  step: string;
  maxSwell: number;
  locations: Coord[];
}

function App() {
  const [swellData, setSwellData] = useState<SwellData[]>([]);
  const [spots, setSpots] = useState([]);
  const [currentSpot, setCurrentSpot] = useState<any>(null);
  const [tileData, setTileData] = useState<any>([]);
  const [zoom, setZoom] = useState<any>(15);
  const [spotForecast, setSpotForecast] = useState<any>([]);

  useEffect(() => {
    const fetchAllSpots = async () => {
      try {
        const res = await fetch("http://localhost:8000/spots");
        const data = await res.json();
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spot data:", error);
      }
    };

    fetchAllSpots();
  }, []);

  // useEffect(() => {
  //   const fetchSwell = async () => {
  //     try {
  //       const date = "20231224";
  //       const degrees = "5";
  //       const res = await fetch(
  //         `http://localhost:8000/forecasts/gridded/${degrees}/${date}`
  //       );
  //       const data = await res.json();
  //       setSwellData(data);
  //     } catch (error) {
  //       console.error("Error fetching swell data:", error);
  //     }
  //   };

  //   fetchSwell();
  // }, []);

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
            `http://localhost:8000/forecasts/spots/${date}/${currentSpot.latitude}/${currentSpot.longitude}/`
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

  // useEffect(() => {
  //   if (currentSpot) {
  //     const fetchTileData = async () => {
  //       try {
  //         const date = "20231224";
  //         const res = await fetch(
  //           `http://localhost:8000/forecasts/tiles/${date}/${currentSpot.latitude}/${currentSpot.longitude}/${zoom}`
  //         );
  //         const data = await res.json();
  //         setTileData(data);
  //       } catch (error) {
  //         console.error(error);
  //       }
  //     };

  //     fetchTileData();
  //   }
  // }, [currentSpot, zoom]);

  return (
    <ComponentMapProvider>
      <ComponentWrapper
        spots={spots}
        swellData={swellData}
        currentSpot={currentSpot}
        setCurrentSpot={setCurrentSpot}
        zoom={zoom}
        tileData={tileData}
        spotForecast={spotForecast}
      />
    </ComponentMapProvider>
  );
}

export default App;
