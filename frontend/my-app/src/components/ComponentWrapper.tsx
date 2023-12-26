import React, { useContext, useEffect, useState } from "react";
import { ComponentMapContext } from "../contexts/ComponentMapProvider";

const ComponentWrapper: React.FC = (props) => {
  const { componentMap, setComponentMap } = useContext(ComponentMapContext);
  const [currentComponent, setCurrentComponent] = useState("GlobeSpots");
  const CurrentComponent = componentMap[currentComponent];

  return CurrentComponent ? <CurrentComponent /> : <p>Loading...</p>;
};

export default ComponentWrapper;
