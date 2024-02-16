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
import PrimaryWaveForecast from "./PrimaryWaveForecast";
import SwellWaveForecast from "./SwellWaveForecast";
import WindWaveForecast from "./WindWaveForecast";
import WindForecast from "./WindForecast";
import SwellSim from "./SwellSim";

const SwellMap: React.FC<any> = ({
  currentSpot,
  spotForecast,
  zoom,
  currentComponent,
  setCurrentComponent,
}) => {
  const [stationData, setStationData] = useState([]);
  const spotCoords: [number, number] = [
    currentSpot.latitude,
    currentSpot.longitude,
  ];

  const fetchStationData: any = async () => {
    try {
      const range = "300000";
      const lat = spotCoords[0];
      const lng = spotCoords[1];
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/current/spots/${range}/${lat}/${lng}`
      );
      const data = await res.json();

      setStationData(data);
      console.log(data);
    } catch (error) {
      console.error("Failed to fetch station data:", error);
    }
  };

  useEffect(() => {
    fetchStationData(); // fetch on mount
    const interval = setInterval(fetchStationData, 360000); // fetch every 6 mins
    return () => clearInterval(interval); // clean up on unmount to prevent mem leaks, etc.
  }, []);

  const timeKeys = [
    "12 a.m.",
    "3 a.m.",
    "6 a.m.",
    "9 a.m.",
    "12 p.m.",
    "3 p.m.",
    "6 p.m.",
    "9 p.m.",
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
            <table className="mx-auto text-center divide-y divide-gray-500">
              <thead>
                <tr>
                  <th
                    colSpan={1}
                    className="w-1/12 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
                  ></th>
                  <th
                    colSpan={3}
                    className="w-1/5 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Primary Waves
                  </th>
                  <th
                    colSpan={3}
                    className="w-1/5 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Secondary Swell
                  </th>
                  <th
                    colSpan={3}
                    className="w-1/5 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
                  >
                    Wind Waves
                  </th>
                  <th
                    colSpan={2}
                    className="w-1/5 px-6 py-3 text-center text-xs font-medium
                    text-gray-400 uppercase tracking-wider"
                  >
                    Wind Report
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array(spotForecast.length)
                  .fill(null)
                  .map((_, index) => (
                    <tr
                      className="text-center text-s text-[#03e9f4] font-thin border-0 bg-gray-900 divide-gray-200"
                      key={index}
                    >
                      <td className="py-6 font-normal">{timeKeys[index]}</td>
                      <PrimaryWaveForecast
                        hourlyIndex={index}
                        spotForecast={spotForecast}
                      />
                      <SwellWaveForecast
                        hourlyIndex={index}
                        spotForecast={spotForecast}
                      />
                      <WindWaveForecast
                        hourlyIndex={index}
                        spotForecast={spotForecast}
                      />
                      <WindForecast
                        hourlyIndex={index}
                        spotForecast={spotForecast}
                      />
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        ) : (
          <div className="flex justify-center items-center h-half h-screen transform -translate-y-16 animate-pulse">
            <p className="text-[#03e9f4] text-center text-s font-thin">
              Loading...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwellMap;
