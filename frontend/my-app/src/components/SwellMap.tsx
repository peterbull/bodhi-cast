import {
  MapContainer,
  TileLayer,
  Popup,
  Marker,
  useMap,
  LayerGroup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect } from "react";
import * as d3 from "d3";
import L from "leaflet";

import markerIconPng from "leaflet/dist/images/marker-icon.png";
import { Icon } from "leaflet";

const SwellOverlay: any = ({ tileData }: any) => {
  const map = useMap();

  useEffect(() => {
    const svgLayer = L.svg();
    svgLayer.addTo(map);
    console.log(svgLayer);
    const svg = d3.select((svgLayer as any)._container).select("svg");

    tileData.forEach((data: any) => {
      const position = new L.LatLng(data.latitude, data.longitude);
      const point = map.latLngToLayerPoint(position);
      svg
        .append("circle")
        .attr("cx", point.x)
        .attr("cy", point.y)
        .attr("r", 10)
        .attr("fill", "blue");
    });

    map.on("moveend", () => {
      // Update D3 elements
    });
  }, [map, tileData]);

  useEffect(() => {
    const svgLayer = L.svg();
    svgLayer.addTo(map);
    const svg = d3.select((svgLayer as any)._container).select("svg");
    const g = svg.append("g").attr("class", "leaflet-zoom-hide");
    const position = new L.LatLng(36.83, -75.96);
    const point = map.latLngToLayerPoint(position);

    g.append("circle")
      .attr("cx", point.x)
      .attr("cy", point.y)
      .attr("r", 200)
      .attr("fill", "blue");
  }, [map]);
};

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
      <LayerGroup>
        <SwellOverlay tileData={tileData} />
      </LayerGroup>
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
