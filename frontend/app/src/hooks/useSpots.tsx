import { useQuery } from "@tanstack/react-query";

export type Spot = {
  id: number;
  latitude: number;
  longitude: number;
  spot_name: string;
  street_address: string;
};

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

export function useSpots() {
  const spotsQuery = useQuery({ queryKey: ["spots"], queryFn: fetchSpots });

  return {
    spotsArray: spotsQuery.data ?? [],
  };
}
