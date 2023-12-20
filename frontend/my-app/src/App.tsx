import "./App.css";
import { useEffect, useState } from "react";

import { MapContainer, Marker, TileLayer, Popup } from "react-leaflet";

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
  useEffect(() => {
    const fetchSwell = async () => {
      try {
        const date = "20231218";
        const degrees = "20";
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
      {swellData.length > 0 && <SwellMap swellData={swellData[0]} />}
      {/* {Object.keys(swellData).length > 0 && <p>{JSON.stringify(swellData)}</p>} */}
      {/* {swellData.length > 0 && <GlobeSwell swellData={swellData} />} */}
    </div>
  );
}

export default App;
