import React, { useState, useMemo, useEffect } from "react";

export const StationDataContext = React.createContext<any>({
  stationData: {},
  setStationData: () => {},
});

export const StationDataProvider: any = ({ children }: any) => {
  const [stationData, setStationData] = useState<any[]>([]);
  const value = useMemo(() => ({ stationData, setStationData }), [stationData]);

  return (
    <StationDataContext.Provider value={value}>
      {children}
    </StationDataContext.Provider>
  );
};
