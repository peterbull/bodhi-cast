import React, { useEffect, useState } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-dark.jpg";
import { SwellData } from "../App";

const GlobeSwell: React.FC<{ swellData: SwellData[] }> = ({ swellData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Set up an interval to cycle through the swell data
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % swellData.length);
    }, 1000); // Cycle every 5 seconds, adjust as needed

    // Clear the interval when the component is unmounted
    return () => clearInterval(interval);
  }, [swellData.length]); // Rerun the effect only if swellData.length changes

  // Get the current set of locations to display
  const currentData = swellData[currentIndex];
  console.log(currentData);

  return (
    <Globe
      globeImageUrl={globeImageUrl}
      // Pass only the current set of locations
      heatmapsData={[currentData.locations]}
      heatmapPointLat="lat"
      heatmapPointLng="lon"
      heatmapPointWeight="swell"
      heatmapTopAltitude={currentData.maxSwell * 0.1}
      // Transition duration for the heatmaps to animate changes
      heatmapsTransitionDuration={0}
      enablePointerInteraction={true}
    />
  );
};

export default GlobeSwell;
