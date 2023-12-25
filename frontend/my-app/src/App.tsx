import "./App.css";
import { useEffect, useState } from "react";

import Globe from "react-globe.gl";
import GlobeSpots from "./components/GlobeSpots";
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
  const [spots, setSpots] = useState<any>([]);

  useEffect(() => {
    const fetchSwell = async () => {
      try {
        const date = "20231224";
        const degrees = "5";
        const res = await fetch(
          `http://localhost:8000/forecasts/gridded/${degrees}/${date}`
        );
        const data = await res.json();
        setSwellData(data);
      } catch (error) {
        console.error("Error fetching swell data:", error);
      }
    };

    const fetchAllSpots = async () => {
      try {
        const res = await fetch("http://localhost:8000/spots");
        const data = await res.json();
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spot data:", error);
      }
    };

    fetchSwell();
    fetchAllSpots();
  }, []);

  return (
    <ComponentMapProvider>
      <div>{spots.length > 0 && <GlobeSpots spots={spots} />}</div>
    </ComponentMapProvider>
  );
}

export default App;
