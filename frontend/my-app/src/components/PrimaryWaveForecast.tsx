import React from "react";

const PrimaryWaveForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const heightKey = "swh";
  const timeKey = "perpw";
  const directionKey = "dirpw";

  return (
    <>
      <td>
        {(parseFloat(spotForecast[hourlyIndex][heightKey]) * 3.281).toFixed(1)}
      </td>
      <td>ft</td>
      <td>{spotForecast[hourlyIndex][timeKey].toFixed(1)}</td>
      <td>s</td>
      <td></td>
    </>
  );
};

export default PrimaryWaveForecast;
