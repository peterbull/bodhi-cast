import React from "react";

const HourlyForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const includedKeys = [
    "swh",
    "perpw",
    "dirpw",
    "swell",
    "swper",
    "shww",
    "mpww",
    "wvdir",
    "ws",
    "wdir",
  ];

  return (
    <>
      <tr key={spotForecast[hourlyIndex].id}>
        {Object.entries(spotForecast[hourlyIndex])
          .filter(([key]) => includedKeys.includes(key))
          .map(([key, data], index) => (
            <td key={`data-${index}`}>{JSON.stringify(data)}</td>
          ))}
      </tr>
    </>
  );
};

export default HourlyForecast;
