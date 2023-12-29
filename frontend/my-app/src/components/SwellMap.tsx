import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React from "react";
import { format } from "date-fns";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon } from "leaflet";

const SwellMap: React.FC<any> = ({
  currentSpot,
  spotForecast,
  tileData,
  zoom,
}) => {
  const spotCoords: [number, number] = [
    currentSpot.latitude,
    currentSpot.longitude,
  ];

  const currentDate = format(new Date(), "yyyy-MM-dd") + "T00:00:00+00:00";
  const filteredTileData =
    tileData.length > 0
      ? tileData.filter((data: any) => data.valid_time === currentDate)
      : [];

  return (
    <div className="flex">
      <div className="w-1/2 h-screen">
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
      </div>
      {spotForecast.length > 0 ? (
        <p>{JSON.stringify(spotForecast[0])} Loaded Successfully</p>
      ) : (
        <p>Loading Spot Forecast...</p>
      )}
      {tileData.length > 0 ? (
        <div className="w-1/2 h-screen bg-gray-50">
          <h1 className="text-3xl font-thin text-center">
            {currentSpot.spot_name}
          </h1>
          <h3 className="text-xl font-extralight text-center">
            {currentSpot.street_address}
          </h3>
          <table>
            <thead>
              <tr>
                {Object.keys(filteredTileData[0]).map((key: string) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTileData.map((data: any) => (
                <tr key={data.id}>
                  {Object.values(data).map((item: any) => (
                    <td>{item}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default SwellMap;
