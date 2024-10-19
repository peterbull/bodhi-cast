import { Spot } from "../App";

interface SpotTableProps {
  filteredSpots: Spot[];
  handleGlobeZoom: (spot: Spot) => void;
}
export function SpotTable({ filteredSpots, handleGlobeZoom }: SpotTableProps) {
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
        {filteredSpots.map((spot) => (
          <tr
            className="hover:text-[#95f2f7] text-[#03e9f4] hover:font-normal justify-left text-center text-s font-thin border-0 bg-gray-900 divide-gray-200"
            key={spot.id}
            onClick={() => handleGlobeZoom(spot)}
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
