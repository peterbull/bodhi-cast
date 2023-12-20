import "./App.css";
import { useEffect, useState } from "react";

//CSS and marker image fix for Leaflet map
import "leaflet/dist/leaflet.css";
import Globe from "react-globe.gl";
import GlobeSwell from "./components/GlobeSwell";
import SwellMap from "./components/SwellMap";

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
  const [currentComponent, setCurrentComponent] = useState<
    "SwellMap" | "GlobeSwell" | null
  >(null);

  useEffect(() => {
    const fetchSwell = async () => {
      try {
        const date = "20231218";
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
    <div>
      <button
        onClick={() => {
          setCurrentComponent("SwellMap");
        }}
      >
        Show Swell Map
      </button>
      <button
        onClick={() => {
          setCurrentComponent("GlobeSwell");
        }}
      >
        Show Globe Swell Map
      </button>
      {swellData.length > 0 && currentComponent === "SwellMap" && (
        <SwellMap swellData={swellData[0]} />
      )}
      {swellData.length > 0 && currentComponent === "GlobeSwell" && (
        <GlobeSwell swellData={swellData[0]} />
      )}
    </div>
  );
}

export default App;
