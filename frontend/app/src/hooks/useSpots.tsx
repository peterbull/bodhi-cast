import { useQuery } from "@tanstack/react-query";
import { create } from "zustand";

export type Spot = {
  id: number;
  latitude: number;
  longitude: number;
  spot_name: string;
  street_address: string;
};

interface SpotStore {
  currentSpot: Spot | null;
  setCurrentSpot: (spot: Spot | null) => void;
}

const useSpotStore = create<SpotStore>((set) => ({
  currentSpot: null,
  setCurrentSpot: (spot) => set({ currentSpot: spot }),
}));

async function fetchSpot(spotId: number): Promise<Spot> {
  const res = await fetch(
    `${import.meta.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/spots/${spotId}`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

async function fetchSpots(): Promise<Spot[]> {
  const res = await fetch(
    `${import.meta.env.REACT_APP_BACKEND_URL ?? "http://localhost:8000"}/spots`
  );
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = await res.json();
  return data;
}

export function useSpots(spotId?: number) {
  const spotsQuery = useQuery({ 
    queryKey: ["spots"], 
    queryFn: fetchSpots 
  });

  const spotQuery = useQuery({
    queryKey: ["spot", spotId],
    queryFn: () => fetchSpot(spotId!),
    enabled: !!spotId,
  });

  const currentSpot = useSpotStore((state) => state.currentSpot);
  const setCurrentSpot = useSpotStore((state) => state.setCurrentSpot);

  return {
    // List of spots
    spots: spotsQuery.data ?? [],
    spotsLoading: spotsQuery.isLoading,
    spotsError: spotsQuery.isError,

    // Single spot
    spot: spotQuery.data,
    spotLoading: spotQuery.isLoading,
    spotError: spotQuery.isError,
    spotErrorMessage: spotQuery.error,

    // Current selected spot
    currentSpot,
    setCurrentSpot,
  };
}
