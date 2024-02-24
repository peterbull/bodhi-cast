import React, { useContext, useState } from "react";
import { ComponentMapContext } from "../contexts/ComponentMapProvider";

/**
 * Wrapper component that dynamically renders a component based on the currentComponent state.
 *
 * @component
 * @example
 * // Usage:
 * <ComponentWrapper />
 *
 * @param {any} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
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
