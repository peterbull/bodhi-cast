import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React from "react";

import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon } from "leaflet";

const SwellMap: React.FC<any> = ({ currentSpot, tileData, zoom }) => {
  const spotCoords: [number, number] = [
    currentSpot.latitude,
    currentSpot.longitude,
  ];

  return (
    <MapContainer center={spotCoords} zoom={zoom}>
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        noWrap={true}
      />
      <Marker
        position={spotCoords}
        icon={
          new Icon({
            iconUrl: markerIconPng,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          })
        }
      >
        <Popup position={spotCoords} offset={[0, -41]}>
          {currentSpot.spot_name}
          <br />
          {currentSpot.latitude}, {currentSpot.longitude}
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default SwellMap;
