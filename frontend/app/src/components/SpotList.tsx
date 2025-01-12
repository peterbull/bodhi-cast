import { useSearch } from "@/hooks/useSearch";
import { useSpots } from "@/hooks/useSpots";

export function SpotList() {
  const { spots, spotsLoading } = useSpots();
  const { searchQuery } = useSearch();
  if (spotsLoading) {
    return <div className="text-center ">Loading...</div>;
  }

  return (
    <table className="mx-auto text-center divide-y divide-gray-500 min-h-96">
      <thead>
        <tr className="w-1/12 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
          <th colSpan={1}>NAME</th>
          <th colSpan={1}>LOCATION</th>
          <th colSpan={1}>LAT</th>
          <th colSpan={1}>LON</th>
        </tr>
      </thead>
      <tbody>
        {spots
          .filter((spot) => 
              spot.spot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              spot.street_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
              spot.latitude.toString().includes(searchQuery) ||
              spot.longitude.toString().includes(searchQuery)
            )
          .map((spot) => (
            <tr
              className="hover:text-lightneon text-neon hover:font-normal justify-left text-center text-s font-thin border-0  divide-gray-200"
              key={spot.id}
              onClick={() => null}
            >
            <td className="py-2 px-2 cursor-pointer">{spot.spot_name}</td>
            <td className="py-2 px-2 cursor-pointer">{spot.street_address}</td>
            <td className="py-2 px-2 cursor-pointer">
              {spot.latitude.toFixed(2)}
            </td>
            <td className="py-2 px-2 cursor-pointer">
              {spot.longitude.toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
