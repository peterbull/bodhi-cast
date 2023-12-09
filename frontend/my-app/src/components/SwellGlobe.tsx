import React from "react";
import Globe from "react-globe.gl";

const SwellGlobe = () => {
  const N = 300;
  const gData = [...Array(N).keys()].map(() => ({
    lat: (Math.random() - 0.5) * 160,
    lng: (Math.random() - 0.5) * 360,
    weight: Math.random(),
  }));

  return (
    <div>
      <Globe
        heatmapsData={[gData]}
        heatmapPointLat="lat"
        heatmapPointLng="lng"
        heatmapPointWeight="weight"
        heatmapTopAltitude={0.7}
        heatmapsTransitionDuration={3000}
        enablePointerInteraction={false}
      />
    </div>
  );
};

export default SwellGlobe;
