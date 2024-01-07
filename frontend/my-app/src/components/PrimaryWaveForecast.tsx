import React from "react";

const PrimaryWaveForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const primaryWaveHeight = (
    parseFloat(spotForecast[hourlyIndex]["swh"]) * 3.281
  ).toFixed(1);
  const primaryWavePeriod = spotForecast[hourlyIndex]["perpw"].toFixed(1);
  const primaryWaveDirection = parseFloat(spotForecast[hourlyIndex]["dirpw"]);

  return (
    <>
      <td className="py-2 text-right">{primaryWaveHeight} ft</td>
      <td className="py-2">{primaryWavePeriod} s</td>
      <td className="py-2">
        <svg
          width="12"
          height="18"
          viewBox="0 0 8 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `rotate(${primaryWaveDirection + 180}deg)` }}
        >
          <path
            d="M6.903 11.059 3.5 0 .097 11.059A1.5 1.5 0 0 0 1.531 13h3.938a1.5 1.5 0 0 0 1.434-1.941Z"
            fill="#03e9f4"
          ></path>
        </svg>
      </td>
    </>
  );
};

export default PrimaryWaveForecast;
