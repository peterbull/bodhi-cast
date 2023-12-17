import "./App.css";
import { useEffect, useState } from "react";

import { MapContainer, Marker, TileLayer, Popup } from "react-leaflet";

//CSS and marker image fix for Leaflet map
import "leaflet/dist/leaflet.css";
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import L from "leaflet";
import Globe from "react-globe.gl";
import GlobeSwell from "./components/GlobeSwell";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

export interface Coord {
  lat: number;
  lon: number;
  swell: number;
}

export interface SwellData {
  locations: Coord[];
  maxSwell: number;
}

function App() {
  const [swellData, setSwellData] = useState<SwellData>({
    locations: [],
    maxSwell: 0,
  });
  useEffect(() => {
    const fetchSwell = async () => {
      try {
        const date = "20231216";
        const degrees = "1";
        const res = await fetch(
          `http://localhost:8000/locations/gridded/${degrees}/${date}`
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
      {/*  
    //   <MapContainer center={[36.83054488384606, -75.96902159539191]} zoom={13}>
    //     <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    //     {swellData.locations.length > 0 &&
    //       swellData.locations.slice(0, 100).map((coord: Coord) => {
    //         return (
    //           <Marker
    //             key={`${coord.lat}-${coord.lon}`}
    //             position={[coord.lat, coord.lon]}
    //           >
    //             <Popup key={`${coord.lat}-${coord.lon}`}>
    //               {`Lat: ${coord.lat}, Lon: ${coord.lon}`}
    //             </Popup>
    //           </Marker>
    //         );
    //       })}
    //   </MapContainer>
    */}
      {swellData.locations.length > 0 && <GlobeSwell {...swellData} />}
    </div>
  );
}

export default App;
