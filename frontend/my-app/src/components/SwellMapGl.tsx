import * as React from "react";
import Map, { Source, Layer } from "react-map-gl";
import type { CircleLayer } from "react-map-gl";
import type { FeatureCollection } from "geojson";

const layerStyle: CircleLayer = {
  id: "point",
  type: "circle",
  paint: {
    "circle-radius": 10,
    "circle-color": "#007cbf",
  },
};

const SwellMapGl: React.FC<any> = ({ currentSpot, tileData, zoom }): any => {
  const [mapLoaded, setMapLoaded] = React.useState(false);

  const geojson: FeatureCollection = {
    type: "FeatureCollection",
    features: tileData.map((data: any) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [data.longitude, data.latitude] },
    })),
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
          <Layer {...layerStyle} />
        </Source>
      )}
    </Map>
  );
};

export default SwellMapGl;
