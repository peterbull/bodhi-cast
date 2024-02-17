import PrimaryWaveForecast from "./PrimaryWaveForecast";
import SwellWaveForecast from "./SwellWaveForecast";
import WindWaveForecast from "./WindWaveForecast";
import WindForecast from "./WindForecast";

const SwellTable: React.FC<any> = ({ spotForecast }) => {
  const timeKeys = [
    "12 a.m.",
    "3 a.m.",
    "6 a.m.",
    "9 a.m.",
    "12 p.m.",
    "3 p.m.",
    "6 p.m.",
    "9 p.m.",
  ];

  return (
    <>
      <h1 className="text-[#03e9f4] text-2xl text-center pt-4">
        SWELL FORECAST
      </h1>
      <table className="mx-auto text-center divide-y divide-gray-500">
        <thead>
          <tr>
            <th
              colSpan={1}
              className="w-1/12 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
            ></th>
            <th
              colSpan={3}
              className="w-1/5 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
            >
              Primary Waves
            </th>
            <th
              colSpan={3}
              className="w-1/5 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
            >
              Secondary Swell
            </th>
            <th
              colSpan={3}
              className="w-1/5 px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider"
            >
              Wind Waves
            </th>
            <th
              colSpan={2}
              className="w-1/5 px-6 py-3 text-center text-xs font-medium
                    text-gray-400 uppercase tracking-wider"
            >
              Wind Report
            </th>
          </tr>
        </thead>
        <tbody>
          {Array(spotForecast.length)
            .fill(null)
            .map((_, index) => (
              <tr
                className="text-center text-s text-[#03e9f4] font-thin border-0 bg-gray-900 divide-gray-200"
                key={index}
              >
                <td className="py-6 font-normal">{timeKeys[index]}</td>
                <PrimaryWaveForecast
                  hourlyIndex={index}
                  spotForecast={spotForecast}
                />
                <SwellWaveForecast
                  hourlyIndex={index}
                  spotForecast={spotForecast}
                />
                <WindWaveForecast
                  hourlyIndex={index}
                  spotForecast={spotForecast}
                />
                <WindForecast hourlyIndex={index} spotForecast={spotForecast} />
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
};

export default SwellTable;
