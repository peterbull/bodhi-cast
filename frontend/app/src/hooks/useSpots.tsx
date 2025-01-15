import { useQuery } from "@tanstack/react-query";

export type Spot = {
  id: number;
  latitude: number;
  longitude: number;
  spot_name: string;
  street_address: string;
};

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

export function useSpot(spotId: number) {
  const spotQuery = useQuery({
    queryKey: ["spot", spotId],
    queryFn: () => fetchSpot(spotId),
    enabled: !!spotId, 
  });

  return {
    spot: spotQuery.data,
    isLoading: spotQuery.isLoading,
    isError: spotQuery.isError,
    error: spotQuery.error,
  };
}

export function useSpots() {
  const spotsQuery = useQuery({ queryKey: ["spots"], queryFn: fetchSpots });
  
  return {
    spots: spotsQuery.data ?? [],
    spotsLoading: spotsQuery.isLoading,
    spotsError: spotsQuery.isError,
  };
}
