import React from "react";

const SwellWaveForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const swellWaveHeight = (
    parseFloat(spotForecast[hourlyIndex]["swell"]) * 3.281
  ).toFixed(1);
  const swellWavePeriod = spotForecast[hourlyIndex]["swper"].toFixed(1);
  const swellWaveDirection = parseFloat(spotForecast[hourlyIndex]["dirpw"]);

  return (
    <>
      <td>{swellWaveHeight} ft</td>
      <td>{swellWavePeriod} s</td>
      <td>
        <svg
          width="12"
          height="18"
          viewBox="0 0 8 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `rotate(${swellWaveDirection}deg)` }}
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

export default SwellWaveForecast;
