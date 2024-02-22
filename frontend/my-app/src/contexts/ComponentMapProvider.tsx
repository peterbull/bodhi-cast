import React, { useState } from "react";
import SwellMap from "../components/SwellMap";
import GlobeSpots from "../components/GlobeSpots";
import AddSpot from "../components/AddSpot";

export const ComponentMapContext = React.createContext<any>({
  componentMap: {},
  setComponentMap: () => {},
});

/**
 * Provides a context for managing a component which component will render.
 * @param children - The child components.
 * @returns The component map provider.
 */
export const ComponentMapProvider: any = ({ children }: any) => {
  const [componentMap, setComponentMap] = useState<any>({
    SwellMap,
    GlobeSpots,
    AddSpot,
  });

  return (
    <ComponentMapContext.Provider value={{ componentMap, setComponentMap }}>
      {children}
    </ComponentMapContext.Provider>
  );
};
