import React, { useContext, useState } from "react";
import { ComponentMapContext } from "../contexts/ComponentMapProvider";

const ComponentWrapper: React.FC<any> = (props: any) => {
  const { componentMap } = useContext(ComponentMapContext);
  const [currentComponent, setCurrentComponent] = useState("GlobeSpots");
  const CurrentComponent = componentMap[currentComponent];

  return CurrentComponent ? (
    <CurrentComponent {...props} setCurrentComponent={setCurrentComponent} />
  ) : (
    <p>Loading...</p>
  );
};

export default ComponentWrapper;
