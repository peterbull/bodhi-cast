import React, { useEffect, useState } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import { SwellData } from "../App";

const GlobeSwell: React.FC<{ swellData: SwellData }> = ({ swellData }) => {
  return (
    <Globe
      globeImageUrl={globeImageUrl}
      heatmapsData={[swellData.locations]}
      heatmapPointLat="lat"
      heatmapPointLng="lon"
      heatmapPointWeight="swell"
      heatmapTopAltitude={swellData.maxSwell * 0.1}
      heatmapsTransitionDuration={0}
      enablePointerInteraction={true}
    />
  );
};

export default GlobeSwell;
