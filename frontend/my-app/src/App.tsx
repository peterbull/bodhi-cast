import "./App.css";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

import { MapContainer, TileLayer } from "react-leaflet";

function App() {
  const [swell, setSwell] = useState([]);

  useEffect(() => {
    const fetchSwell = async () => {
      try {
        const date = "20231208";
        const res = await fetch(
          `http://localhost:8000/waveforecast/swell/${date}`
        );
        const data = await res.json();
        setSwell(data);
      } catch (error) {
        console.error("Error fetching swell data:", error);
      }
    };

    fetchSwell();
  }, []);

  return (
    <div>
      <p>testing</p>
      {Object.keys(swell).length > 0 ? (
        <h1>{JSON.stringify(swell)}</h1>
      ) : (
        <h3>Loading...</h3>
      )}
      <MapContainer center={[48.860770272151804, 2.3435901324493194]} zoom={13}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      </MapContainer>
    </div>
  );
}

export default App;
