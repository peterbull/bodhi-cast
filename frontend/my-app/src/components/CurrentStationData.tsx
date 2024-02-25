import { useEffect, useState, useContext } from "react";
import Loading from "./Loading";
import { StationDataContext } from "../contexts/StationDataProvider";

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

// Unit conversion functions:
const metersToMiles = (data: any) => {
  return data * 0.000621;
};

const metersToFeet = (data: any) => {
  if (!data || isNaN(Number(data))) {
    return false;
  }
  return (data * 3.28084).toFixed(2);
};

const celciusToFarenheit = (data: any) => {
  if (!data || isNaN(Number(data))) {
    return false;
  }
  return (data * (9 / 5) + 32).toFixed(1);
};

const metersPerSecondToKnots = (data: any) => {
  if (!data || isNaN(Number(data))) {
    return false;
  }
  return (data * 1.943844).toFixed(1);
};

const CurrentStationData: React.FC<any> = ({ currentSpot, spotCoords }) => {
  const { stationData, setStationData } = useContext(StationDataContext);
  /**
   * Fetches station data from the backend API based on the provided spot coordinates.
   * @returns {Promise<void>} A promise that resolves when the station data is fetched and processed.
   */
  const fetchStationData: any = async () => {
    try {
      const range = "170000"; // Radius to search for stations in meters
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
    } catch (error) {
      console.error("Failed to fetch station data:", error);
    }
  };

  // Fetches station data periodically to ensure latest available weather data rendered
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
        <>
          <h3 className="text-[#03e9f4] text-xl font-extralight text-center pt-1 pb-4">
            Last Updated: {formatDate(stationData[0].entry_created)}
          </h3>
          <table className="mx-auto text-center divide-y divide-gray-500">
            <thead>
              <tr className="w-1/12 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                <td className="px-2" colSpan={1}>
                  STATION NAME
                </td>
                <td className="px-2" colSpan={1}>
                  LAT
                </td>
                <td className="px-2" colSpan={1}>
                  LON
                </td>
                <td className="px-2" colSpan={1}>
                  DISTANCE
                </td>
                <td className="px-2" colSpan={1}>
                  WATER LEVEL
                </td>
                <td className="px-2" colSpan={1}>
                  AIR TEMP
                </td>
                <td className="px-2" colSpan={1}>
                  WIND
                </td>
                <td className="px-2" colSpan={1}>
                  WATER TEMP
                </td>
              </tr>
            </thead>
            <tbody>
              {stationData.map((station: any) => (
                <tr
                  className="hover:text-[#95f2f7] text-[#03e9f4] hover:font-normal justify-left text-center text-s font-thin border-0 bg-gray-900 divide-gray-200"
                  key={station.metadata.id}
                >
                  <td className="py-2 px-2 cursor-pointer">
                    {station.metadata.name}
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {station.metadata.lat.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {station.metadata.lon.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {metersToMiles(station.distance).toFixed(1)} mi
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {metersToFeet(station.data.water_level?.[0]?.v) || "-"} ft
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {celciusToFarenheit(station.data.air_temperature?.[0]?.v) ||
                      "-"}{" "}
                    f
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {metersPerSecondToKnots(station.data.wind?.[0]?.s) || "-"}{" "}
                    kts {station.data.wind?.[0]?.dr || "-"}
                  </td>
                  <td className="py-2 px-2 cursor-pointer">
                    {celciusToFarenheit(
                      station.data.water_temperature?.[0]?.v
                    ) || "-"}{" "}
                    f
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="text-[#03e9f4] font-thin text-center py-40">
          No Nearby Stations Found
        </p>
      )}
    </div>
  );
};

export default CurrentStationData;
