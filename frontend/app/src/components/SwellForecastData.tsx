import { useSpotForecasts } from "@/hooks/useSpotForecasts";
import { useSpots } from "@/hooks/useSpots";
import { useParams } from "@tanstack/react-router";
import { Arrow } from "./Arrow";
import { HeightUnitType, WaveForecastType } from "@/types";

export type intervalIdx = 0 | 1 | 2 | 3 | 4 | 5

const heightConversion: Record<HeightUnitType, number> = {
  ft: 3.281,
  m: 1
}

interface SwellForecastItemProps {
  forecastType: WaveForecastType;
  intervalIdx: number;
  heightUnit?: HeightUnitType;
}


export function SwellForecastData({forecastType, heightUnit, intervalIdx }: SwellForecastItemProps) {
  const { spotId } = useParams({
    from: '/spots/$spotId',
  })
  const { spot } = useSpots(Number(spotId));
  const { spotForecasts } = useSpotForecasts(spot);
  const conversionUnit = heightUnit ? heightConversion[heightUnit] : 1; 

  const getForecastKeys = (type: WaveForecastType) => {
    switch(type) {
      case WaveForecastType.PRIMARY:
        return ['swh', 'perpw', 'dirpw'] as const
      case WaveForecastType.SECONDARY:
        return ['swell', 'swper', 'dirpw'] as const
      default:
        return ['swh', 'perpw', 'dirpw'] as const 
    }
  }

  function convertForecastItem(idx: number, conversionUnit?: number) {
    const forecastKey = getForecastKeys(forecastType)[idx]
    const forecastValue = Number(spotForecasts[intervalIdx]?.[forecastKey]) || 0;
    const convertedForecastHeight = forecastValue * (conversionUnit ?? 1);
    return convertedForecastHeight
  }

  const waveHeight = convertForecastItem(0, conversionUnit).toFixed(1);
  const wavePeriod = convertForecastItem(1).toFixed(1);
  const windDir = convertForecastItem(2);

  return (
    <>
      <td className="py-2 text-right">{waveHeight} {heightUnit}</td>
      <td className="py-2">{wavePeriod} s</td>
      <td className="py-2">
        <Arrow rotation={windDir}/> 
      </td>
    </>
  );
};

