import React from "react";

const WindWaveForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const windWaveHeight = (
    parseFloat(spotForecast[hourlyIndex]["shww"]) * 3.281
  ).toFixed(1);
  const windWavePeriod = spotForecast[hourlyIndex]["mpww"].toFixed(1);
  const windWaveDirection = parseFloat(spotForecast[hourlyIndex]["wvdir"]);

  return (
    <>
      <td className="py-2 text-right">{windWaveHeight} ft</td>
      <td className="py-2">{windWavePeriod} s</td>
      <td className="py-2">
        <svg
          width="12"
          height="18"
          viewBox="0 0 8 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `rotate(${windWaveDirection}deg)` }}
        >
          <path
            d="M6.903 11.059 3.5 0 .097 11.059A1.5 1.5 0 0 0 1.531 13h3.938a1.5 1.5 0 0 0 1.434-1.941Z"
            fill="#171717"
          ></path>
        </svg>
      </td>
    </>
  );
};

export default WindWaveForecast;
