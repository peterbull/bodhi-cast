import { useSpots } from "../hooks/useSpots";

export function SpotSelector() {
  const { spotsArray } = useSpots();

  return <p>{JSON.stringify(spotsArray)}</p>;
}
