import React from "react";

const WindForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  // Wind speed is initially provided in meters/second
  const windSpeed = (
    parseFloat(spotForecast[hourlyIndex]["ws"]) * 2.23694
  ).toFixed(1);
  const windDirection = parseFloat(spotForecast[hourlyIndex]["wdir"]);

  return (
    <>
      <td className="py-2 text-right">{windSpeed} mph</td>
      <td className="py-2 px-3">
        <svg
          width="12"
          height="18"
          viewBox="0 0 8 13"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transform: `rotate(${windDirection}deg)` }}
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

export default WindForecast;
