import React from "react";

const HourlyForecast: React.FC<any> = ({ spotForecast, hourlyIndex }) => {
  return (
    <>
      <tr>
        {Object.keys(spotForecast[hourlyIndex]).map((key: string) => (
          <th key={key}>{key}</th>
        ))}
      </tr>

      <tr key={spotForecast[hourlyIndex].id}>
        {Object.values(spotForecast[hourlyIndex]).map(
          (data: any, index: number) => (
            <td key={`data-${index}`}>{JSON.stringify(data)}</td>
          )
        )}
      </tr>
    </>
  );
};

export default HourlyForecast;
