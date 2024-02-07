import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  useMap,
  useMapEvents,
  Marker,
  TileLayer,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon } from "leaflet";

const AddSpot: React.FC<any> = ({ spotClick, setSpotClick }) => {
  const spotCoords: [number, number] = [spotClick[0], spotClick[1]];
  const MapEvents: React.FC<any> = (): any => {
    const map = useMap();

    useMapEvents({
      click: () => {
        map.scrollWheelZoom.enable();
      },
    });
    return null;
  };

  console.log("placeholder");

  return (
    <div className="flex flex-col">
      <div className="w-full overflow-x-hidden">
        <MapContainer center={spotCoords} zoom={8} scrollWheelZoom={false}>
          <MapEvents onClick={useMapEvents} />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
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
              Current Selection:
              <br />
              {spotCoords[0]}, {spotCoords[1]}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
};

export default AddSpot;
