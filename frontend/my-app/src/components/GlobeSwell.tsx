import React from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-dark.jpg";
import { SwellData } from "../App";

const GlobeSwell: React.FC<SwellData> = ({ locations, maxSwell }) => {
  console.log(locations);
  return (
    <Globe
      globeImageUrl={globeImageUrl}
      heatmapsData={[locations]}
      heatmapPointLat="lat"
      heatmapPointLng="lon"
      heatmapPointWeight="avg_swell"
      heatmapTopAltitude={maxSwell * 0.1}
      heatmapsTransitionDuration={10}
      enablePointerInteraction={false}
    />
  );
};

export default GlobeSwell;
