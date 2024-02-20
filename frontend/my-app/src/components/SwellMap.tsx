import "leaflet/dist/leaflet.css";
import React, { useRef } from "react";
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
  const stationDataRef = useRef<any>(null);
  const jumpButtonRef = useRef<any>(null);

  const spotCoords: [number, number] = [
    currentSpot.latitude,
    currentSpot.longitude,
  ];

  const scrollToElement = () => {
    stationDataRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    if (jumpButtonRef.current) {
      jumpButtonRef.current.blur();
    }
  };

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
        {currentSpot && currentSpot.id && (
          <>
            <div className="flex justify-center items-center h-full pt-4">
              <button
                onClick={() => setCurrentComponent("GlobeSpots")}
                className="text-[#03e9f4] focus:text-[#95f2f7] hover:text-[#bff7fa] hover:font-medium focus:bg-[#00f2ffbd] uppercase-tracking-[4px] border-2 border-[#03e9f4] rounded px-6 py-2 mx-4"
              >
                RETURN TO MAIN MAP
              </button>
              <button
                ref={jumpButtonRef}
                onClick={scrollToElement}
                className="text-[#03e9f4] focus:text-[#95f2f7] hover:text-[#95f2f7] hover:font-normal focus:bg-[#00f2ffbd] uppercase-tracking-[4px] border-2 border-[#03e9f4] rounded px-6 py-2 mx-4"
              >
                JUMP TO STATION DATA
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
          </>
        ) : (
          <Loading />
        )}
        <StationDataProvider>
          <LeafletMap
            zoom={7}
            currentComponent={currentComponent}
            currentSpot={currentSpot}
            setCurrentComponent={setCurrentComponent}
            spotCoords={spotCoords}
          />

          <div ref={stationDataRef}></div>
          <CurrentStationData
            currentSpot={currentSpot}
            spotCoords={spotCoords}
          />
        </StationDataProvider>
      </div>
    </div>
  );
};

export default SwellMap;
