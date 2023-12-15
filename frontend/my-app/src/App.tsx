import "./App.css";

import { MapContainer, TileLayer } from "react-leaflet";

function App() {
  return (
    <div>
      <p>testing</p>
      <MapContainer
        center={[48.860770272151804, 2.3435901324493194]}
        zoom={13}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </MapContainer>
    </div>
  );
}

export default App;
