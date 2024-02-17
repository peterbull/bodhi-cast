import "leaflet/dist/leaflet.css";
import React, { useEffect, useState } from "react";
import SwellTable from "./SwellTable";
import SwellSim from "./SwellSim";
import CurrentStationData from "./CurrentStationData";
import Loading from "./Loading";
import LeafletMap from "./LeafletMap";
import { StationDataProvider } from "../contexts/StationDataProvider";

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

  return (
    <div className="flex flex-col">
      <LeafletMap
        zoom={zoom}
        currentComponent={currentComponent}
        currentSpot={currentSpot}
        setCurrentComponent={setCurrentComponent}
        spotCoords={spotCoords}
      />
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
            <StationDataProvider>
              <LeafletMap
                zoom={9}
                currentComponent={currentComponent}
                currentSpot={currentSpot}
                setCurrentComponent={setCurrentComponent}
                spotCoords={spotCoords}
              />
              <CurrentStationData
                currentSpot={currentSpot}
                spotCoords={spotCoords}
              />
            </StationDataProvider>
          </>
        ) : (
          <Loading />
        )}
      </div>
    </div>
  );
};

export default SwellMap;
