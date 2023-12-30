import { MapContainer, TileLayer, Popup, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect } from "react";
import { format } from "date-fns";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon, map } from "leaflet";
import HourlyForecast from "./HourlyForecast";

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

    useEffect(() => {
      const zoomend = () => {
        const currentZoom = map.getZoom();
        console.log(currentZoom);
        if (currentZoom <= 7) {
          map.flyTo(spotCoords, 2.5, { duration: 3.5 });
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
    <div className="flex">
      <div className="w-1/2 h-screen">
        <MapContainer center={spotCoords} zoom={zoom} key={currentComponent}>
          <MapEvents />
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
      </div>
      <div className="w-1/2 h-screen bg-gray-50">
        {currentSpot && currentSpot.latitude && (
          <>
            <h1 className="text-3xl font-thin text-center">
              {currentSpot.spot_name}
            </h1>
            <h3 className="text-xl font-extralight text-center">
              {currentSpot.street_address}
            </h3>
          </>
        )}
        <table>
          {spotForecast.length > 0 && (
            <>
              <HourlyForecast hourlyIndex={0} spotForecast={spotForecast} />
            </>
          )}
        </table>
      </div>
    </div>
  );
};

export default SwellMap;
