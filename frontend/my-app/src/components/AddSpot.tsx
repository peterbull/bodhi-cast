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

const AddSpot: React.FC<any> = ({
  spotClick,
  setSpotClick,
  setCurrentComponent,
}) => {
  const spotCoords: [number, number] = [spotClick[0], spotClick[1]];
  const [scrollWheelZoom, setScrollWheelZoom] = useState(false);
  const [spotName, setSpotName] = useState("");
  const [spotLocation, setSpotLocation] = useState("");

  const MapEvents: React.FC<any> = (): any => {
    const map = useMap();

    useMapEvents({
      click: (e) => {
        setScrollWheelZoom(true);
        setSpotClick([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log(`Name: ${spotName}, Address: ${spotLocation}`);
  };

  const handleButtonClick = (e: any) => {
    e.target.blur();
  };

  return (
    <>
      <div className="flex flex-col">
        <div className="w-full overflow-x-hidden">
          <MapContainer center={spotCoords} zoom={8}>
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
      <div className="w-full overflow-x-auto bg-gray-900">
        <div className="flex justify-center items-center h-full pt-4">
          <button
            onClick={() => setCurrentComponent("GlobeSpots")}
            className="text-[#03e9f4] border-2 border-[#03e9f4] rounded px-6 py-2"
          >
            RETURN TO MAP
          </button>
        </div>
        <div className="text-[#03e9f4] font-thin text-center">
          <p className="pt-4">
            Current Selection:{" "}
            {spotClick.length > 0
              ? `${spotClick[0].toFixed(2)},${" "}
              ${spotClick[1].toFixed(2)}`
              : `None`}
          </p>
        </div>
        <form
          className="text-[#03e9f4] font-thin flex justify-center bg-gray-900 items-center pt-4"
          onSubmit={handleSubmit}
        >
          <label className="px-4">
            Spot Name:
            <input
              className="border-[#03e9f4] focus:outline-none border-2 rounded bg-gray-900"
              type="text"
              placeholder="Spot Name"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
            />
          </label>
          <label className="px-4">
            Location:
            <input
              className="border-[#03e9f4] focus:outline-none border-2 rounded bg-gray-900"
              type="text"
              placeholder="Spot Location"
              value={spotLocation}
              onChange={(e) => setSpotLocation(e.target.value)}
            />
          </label>
          <input
            type="submit"
            value="Submit"
            className="border-2 border-[#03e9f4] focus:outline-none focus:text-[#95f2f7] hover:text-[#95f2f7] hover:font-normal focus:bg-[#00f2ffbd] rounded px-6"
            onClick={handleButtonClick}
          />
        </form>
      </div>
    </>
  );
};

export default AddSpot;
