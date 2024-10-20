import React, { useContext, useState } from "react";
import { ComponentMapContext } from "../contexts/ComponentMapProvider";
import { ActiveComponent } from "../types/types";

const ComponentWrapper: React.FC<any> = (props: any) => {
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
