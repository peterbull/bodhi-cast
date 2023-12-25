import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet";
import iconMarker from "leaflet/dist/images/marker-icon.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import L from "leaflet";
import React from "react";
import { SwellData, Coord } from "../App";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

const SwellMap: React.FC<{ swellData: SwellData }> = ({ swellData }) => {
  return (
    <MapContainer center={[36.83054488384606, -75.96902159539191]} zoom={13}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        noWrap={true}
      />
    </MapContainer>
  );
};

export default SwellMap;
