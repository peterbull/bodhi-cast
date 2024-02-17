import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from "react";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon } from "leaflet";
import SwellTable from "./SwellTable";
import SwellSim from "./SwellSim";
import CurrentStationData from "./CurrentStationData";
import Loading from "./Loading";

const SwellMap: React.FC<any> = ({
  currentSpot,
  spotForecast,
  zoom,
  currentComponent,
  setCurrentComponent,
}) => {
  const spotCoords: [number, number] = [
    currentSpot.latitude,
    currentSpot.longitude,
  ];

  const MapEvents: React.FC<any> = (): any => {
    const map = useMap();

    useMapEvents({
      click: () => {
        map.scrollWheelZoom.enable();
      },
    });

    // Return to globe map on zoom out
    useEffect(() => {
      const zoomend = () => {
        const currentZoom = map.getZoom();
        console.log(currentZoom);
        if (currentZoom <= 7) {
          map.flyTo(spotCoords, 2.1, { duration: 3.5 });
          setTimeout(() => {
            setCurrentComponent("GlobeSpots");
          }, 3500);
        }
      };

      map.on("zoomend", zoomend);

      // Clean up map component on unmount
      return () => {
        map.off("zoomend", zoomend);
      };
    }, [map]);

    return null;
  };

  return (
    <div className="flex flex-col">
      <div className="w-full overflow-x-hidden">
        <MapContainer
          center={spotCoords}
          zoom={zoom}
          key={currentComponent}
          scrollWheelZoom={false}
        >
          <MapEvents />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
          {/* <D3SwellVis currentSpot={currentSpot} /> */}
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
      </div>
      <div className="w-full overflow-x-auto bg-gray-900">
        {currentSpot && currentSpot.latitude && (
          <>
            <div className="flex justify-center items-center h-full pt-4">
              <button
                onClick={() => setCurrentComponent("GlobeSpots")}
                className="text-[#03e9f4] uppercase-tracking-[4px] border-2 border-[#03e9f4] rounded px-6 py-2"
              >
                RETURN TO MAP
              </button>
            </div>
            <h1 className="text-[#03e9f4] text-3xl font-thin text-center">
              {currentSpot.spot_name}
            </h1>
            <h3 className="text-[#03e9f4] text-xl font-extralight text-center">
              {currentSpot.street_address}
            </h3>
          </>
        )}

        {spotForecast.length > 0 ? (
          <>
            <SwellSim spotForecast={spotForecast} />
            <SwellTable spotForecast={spotForecast} />
            <CurrentStationData
              currentSpot={currentSpot}
              spotCoords={spotCoords}
            />
          </>
        ) : (
          <Loading />
        )}
      </div>
    </div>
  );
};

export default SwellMap;
