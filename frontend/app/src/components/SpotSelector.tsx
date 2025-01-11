import { useSpots } from "../hooks/useSpots";

export function SpotSelector() {
  const { spots, spotsLoading } = useSpots();

  if (spotsLoading) {
    return <div className="text-center ">Loading...</div>;
  }

  return (
    <>
      <p>test</p>
      <p>{JSON.stringify(spots)}</p>
    </>
  );
}
