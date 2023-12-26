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

    fetchSwell();
  }, []);

  return (
    <ComponentMapProvider>
      {spots.length > 0 && <ComponentWrapper />}
    </ComponentMapProvider>
  );
}

export default App;
