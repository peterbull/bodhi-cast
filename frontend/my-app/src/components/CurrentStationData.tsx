import { useEffect, useState } from "react";
import Loading from "./Loading";

const formatDate = (dateString: any) => {
  const date = new Date(dateString);

  // Format the date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  // Format the time as HH:MM:SS
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  const formattedTime = `${hours}:${minutes}:${seconds}`;

  // Combine the date and time with a space
  return `${formattedDate} ${formattedTime}`;
};

const metersToMiles = (data: any) => {
  return data * 0.000621;
};

const CurrentStationData: React.FC<any> = ({ currentSpot, spotCoords }) => {
  const [stationData, setStationData] = useState([]);
  const fetchStationData: any = async () => {
    try {
      const range = "300000";
      const lat = spotCoords[0];
      const lng = spotCoords[1];
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/current/spots/${range}/${lat}/${lng}`
      );
      const data = await res.json();

      const transformedData = data.map((item: any) => ({
        ...item,
        metadata: {
          ...item.metadata,
          lat: parseFloat(item.metadata.lat),
          lon: parseFloat(item.metadata.lon),
        },
      }));

      setStationData(transformedData);
      console.log(transformedData);
    } catch (error) {
      console.error("Failed to fetch station data:", error);
    }
  };

  useEffect(() => {
    fetchStationData(); // fetch on mount
    const interval = setInterval(fetchStationData, 360000); // fetch every 6 mins
    return () => clearInterval(interval); // clean up on unmount to prevent mem leaks, etc.
  }, []);

  return (
    <div>
      <h1 className="text-[#03e9f4] text-2xl text-center pt-4">
        NEARBY WEATHER STATIONS
      </h1>

      {stationData.length > 0 ? (
        <table className="mx-auto text-center divide-y divide-gray-500">
          <thead>
            <tr className="w-1/12 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              <th colSpan={1}>STATION NAME</th>
              <th colSpan={1}>LAT</th>
              <th colSpan={1}>LON</th>
              <th colSpan={1}>LAST UPDATED</th>
              <th colSpan={1}>MILES</th>
            </tr>
          </thead>
          <tbody>
            {stationData.map((spot: any) => (
              <tr
                className="hover:text-[#95f2f7] text-[#03e9f4] hover:font-normal justify-left text-center text-s font-thin border-0 bg-gray-900 divide-gray-200"
                key={spot.metadata.id}
              >
                <td className="py-2 px-2 cursor-pointer">
                  {spot.metadata.name}
                </td>
                <td className="py-2 px-2 cursor-pointer">
                  {spot.metadata.lat.toFixed(2)}
                </td>
                <td className="py-2 px-2 cursor-pointer">
                  {spot.metadata.lon.toFixed(2)}
                </td>
                <td className="py-2 px-2 cursor-pointer">
                  {formatDate(spot.entry_created)}
                </td>
                <td className="py-2 px-2 cursor-pointer">
                  {metersToMiles(spot.distance).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Loading />
      )}
    </div>
  );
};

export default CurrentStationData;
