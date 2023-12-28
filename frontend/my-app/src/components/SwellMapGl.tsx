import { useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import Map, { Source, Layer, useMap } from "react-map-gl";
import type { CircleLayer, FillLayer } from "react-map-gl";
import type { FeatureCollection, GeoJsonProperties } from "geojson";

const layerStyle: CircleLayer = {
  id: "point",
  type: "circle",
  paint: {
    "circle-radius": 10,
    "circle-color": "#007cbf",
  },
};

const heatmapLayerStyle: any = {
  id: "wave-heatmap",
  type: "heatmap",
  paint: {
    "heatmap-weight": {
      property: "swellWaveHeight",
      type: "exponential",
      stops: [
        [0, 0],
        [6, 1],
      ],
    },
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "blue",
      1,
      "red",
    ],
    "heatmap-radius": 20,
    "heatmap-opacity": 0.4,
  },
};

const choroplethLayerStyle: FillLayer = {
  id: "choropleth",
  type: "fill",
  paint: {
    "fill-color": [
      "interpolate",
      ["linear"],
      ["get", "swellWaveHeight"],
      0,
      "blue",
      5,
      "green",
      10,
      "red",
    ],
    "fill-opacity": 0.8,
  },
};

const SwellMapGl: React.FC<any> = ({ currentSpot, tileData, zoom }): any => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2023-12-24T00:00:00+00:00");
  const map = useMap();

  const geojson: FeatureCollection = {
    type: "FeatureCollection",
    features: tileData.map((data: any) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [data.longitude, data.latitude] },
      properties: {
        swellWaveHeight: data.swell,
        swellWaveDirection: data.dirpw,
        forecastDate: data.valid_time,
      },
    })),
  };

  const dateFilter = ["==", ["get", "forecastDate"], selectedDate];

  const heatmapLayerWithFilter: any = {
    ...heatmapLayerStyle,
    filter: dateFilter,
  };

  const choroplethLayerWithFilter: any = {
    ...choroplethLayerStyle,
    filter: dateFilter,
  };

  return (
    <Map
      mapLib={import("mapbox-gl")}
      initialViewState={{
        longitude: currentSpot.longitude,
        latitude: currentSpot.latitude,
        zoom: zoom,
      }}
      mapStyle="mapbox://styles/mapbox/standard"
      mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
      onLoad={() => setMapLoaded(true)}
    >
      {mapLoaded && (
        <Source id="my-data" type="geojson" data={geojson}>
          <Layer {...choroplethLayerWithFilter} />
          {/* <Layer {...layerStyle} /> */}
        </Source>
      )}
    </Map>
  );
};

export default SwellMapGl;
