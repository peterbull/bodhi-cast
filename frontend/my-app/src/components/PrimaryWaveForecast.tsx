import React from "react";

const PrimaryWaveForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const heightKey = "swh";
  const timeKey = "perpw";
  const directionKey = "dirpw";

  const direction = parseFloat(spotForecast[hourlyIndex]["directionKey"]);

  return (
    <>
      <td>
        {(parseFloat(spotForecast[hourlyIndex][heightKey]) * 3.281).toFixed(1)}
      </td>
      <td>ft</td>
      <td>{spotForecast[hourlyIndex][timeKey].toFixed(1)}</td>
      <td>s</td>
      <td>
        <svg
          width="12"
          height="18"
          viewBox="0 0 8 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `rotate(${direction}deg)` }}
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

export default PrimaryWaveForecast;
