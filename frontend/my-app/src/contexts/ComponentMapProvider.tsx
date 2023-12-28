import React, { useState } from "react";
import SwellMap from "../components/SwellMap";
import GlobeSpots from "../components/GlobeSpots";
import GlobeBump from "../components/GlobeBump";
import SwellMapGl from "../components/SwellMapGl";
import SwellMapThree from "../components/SwellMapThree";

export const ComponentMapContext = React.createContext<any>({
  componentMap: {},
  setComponentMap: () => {},
});

export const ComponentMapProvider: any = ({ children }: any) => {
  const [componentMap, setComponentMap] = useState<any>({
    SwellMap,
    SwellMapGl,
    SwellMapThree,
    GlobeBump,
    GlobeSpots,
  });

  return (
    <ComponentMapContext.Provider value={{ componentMap, setComponentMap }}>
      {children}
    </ComponentMapContext.Provider>
  );
};
