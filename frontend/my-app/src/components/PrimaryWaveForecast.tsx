import React from "react";

const PrimaryWaveForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  const includedKeys = ["swh", "perpw", "dirpw"];

  return (
    <>
      {Object.entries(spotForecast[hourlyIndex])
        .filter(([key]) => includedKeys.includes(key))
        .map(([key, data], index) => (
          <td key={`data-${index}`}>{JSON.stringify(data)}</td>
        ))}
    </>
  );
};

export default PrimaryWaveForecast;
