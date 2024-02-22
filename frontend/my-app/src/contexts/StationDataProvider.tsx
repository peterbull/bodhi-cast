import React, { useState, useMemo } from "react";

export const StationDataContext = React.createContext<any>({
  stationData: {},
  setStationData: () => {},
});

/**
 * Provides station data to its children components.
 * @param children - The child components to render.
 * @returns The StationDataProvider component.
 */
export const StationDataProvider: any = ({ children }: any) => {
  const [stationData, setStationData] = useState<any[]>([]);
  const value = useMemo(() => ({ stationData, setStationData }), [stationData]);

  return (
    <StationDataContext.Provider value={value}>
      {children}
    </StationDataContext.Provider>
  );
};
