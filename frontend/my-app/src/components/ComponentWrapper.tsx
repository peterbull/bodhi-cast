import React, { useContext, useState } from "react";
import { ComponentMapContext } from "../contexts/ComponentMapProvider";
import { ActiveComponent, Spot, SpotForecast } from "../types/types";

interface ComponentWrapperProps {
  spots: Spot[];
  currentSpot: Spot;
  setCurrentSpot: React.Dispatch<React.SetStateAction<Spot>>;
  spotForecast: SpotForecast;
  spotClick: [number, number];
  setSpotClick: React.Dispatch<React.SetStateAction<[number, number]>>;
}

const ComponentWrapper: React.FC<any> = (props: ComponentWrapperProps) => {
  const { componentMap } = useContext(ComponentMapContext);
  const [currentComponent, setCurrentComponent] =
    useState<ActiveComponent>("GlobeSpots");
  const CurrentComponent = componentMap[currentComponent];

  return CurrentComponent ? (
    <CurrentComponent {...props} setCurrentComponent={setCurrentComponent} />
  ) : (
    <p>Loading...</p>
  );
};

export default ComponentWrapper;
