import { useState, useEffect, createContext, useContext } from "react";
import { Spot } from "../types/types";

function useSpot() {
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    const fetchAllSpots = async (): Promise<void> => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/spots`,
        );
        const data: Spot[] = await res.json();
        setSpots(data);
      } catch (error) {
        console.error("Error fetching spot data:", error);
      }
    };

    fetchAllSpots();
  }, []);

  return { spots };
}

const SpotsContext = createContext<ReturnType<typeof useSpot> | undefined>(
  undefined,
);

export const SpotsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const contextItemsState = useSpot();

  return (
    <SpotsContext.Provider value={contextItemsState}>
      {children}
    </SpotsContext.Provider>
  );
};

export function useSpotsContext() {
  const context = useContext(SpotsContext);
  if (context === undefined) {
    throw new Error(
      "useSpotsContext must be used within a SpotsContext provider",
    );
  }
  return context;
}
