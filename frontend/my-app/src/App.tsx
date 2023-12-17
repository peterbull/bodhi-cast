import "./App.css";
import { useEffect, useState } from "react";

import { MapContainer, Marker, TileLayer, Popup } from "react-leaflet";

//CSS and marker image fix for Leaflet map
import "leaflet/dist/leaflet.css";
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import L from "leaflet";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

function App() {
  interface Coord {
    lat: number;
    lon: number;
  }

  const [swell, setSwell] = useState<Coord[]>([]);

  useEffect(() => {
    const fetchSwell = async () => {
      try {
        const date = "20231216";
        const res = await fetch(`http://localhost:8000/locations/${date}`);
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
      <MapContainer center={[36.83054488384606, -75.96902159539191]} zoom={13}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {Object.keys(swell).length > 0 &&
          swell.slice(0, 100).map((coord: Coord) => {
            return (
              <Marker
                key={`${coord.lat}-${coord.lon}`}
                position={[coord.lat, coord.lon]}
              >
                <Popup key={`${coord.lat}-${coord.lon}`}>
                  {`Lat: ${coord.lat}, Lon: ${coord.lon}`}
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}

export default App;
