import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useContext } from "react";
import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon } from "leaflet";
import { StationDataContext } from "../contexts/StationDataProvider";

const LeafletMap: React.FC<any> = ({
  currentComponent,
  currentSpot,
  setCurrentComponent,
  spotCoords,
}) => {
  const zoom = 13;
  const { stationData } = useContext(StationDataContext);
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
        if (currentZoom <= 0) {
          map.flyTo(spotCoords, 2.1, { duration: 0.5 });
          setTimeout(() => {
            setCurrentComponent("GlobeSpots");
          }, 500);
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
    <div className="w-full overflow-x-hidden">
      {stationData.length > 0 ? (
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
          {stationData.map((station: any) => (
            <Marker
              key={station.metadata.id}
              position={[station.metadata.lat, station.metadata.lon]}
              icon={
                new Icon({
                  iconUrl: markerIconPng,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                })
              }
            >
              <Popup
                key={station.metadata.id}
                position={[station.metadata.lat, station.metadata.lon]}
                offset={[0, -41]}
              >
                {station.metadata.name}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
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
      )}
    </div>
  );
};

export default LeafletMap;
