
import { useSpotForecasts } from "@/hooks/useSpotForecasts";
import { useSpots } from "@/hooks/useSpots";
import { useParams } from "@tanstack/react-router";
import { Arrow } from "./Arrow";
import { WindSpeedUnitType } from "@/types";


const speedConversion: Record<WindSpeedUnitType, number> = {
  mph: 2.23694,
  mps: 1
}

interface WindForecastDataProps {
  intervalIdx: number;
  windUnit?: WindSpeedUnitType;
}


export function WindForecastData({windUnit, intervalIdx }: WindForecastDataProps) {
  const { spotId } = useParams({
    from: '/spots/$spotId',
  })
  const { spot } = useSpots(Number(spotId));
  const { spotForecasts } = useSpotForecasts(spot);
  const unit = windUnit ?? WindSpeedUnitType.MILES_PER_HOUR
  const windSpeed = ( Number(spotForecasts[intervalIdx].ws) * speedConversion[unit] ).toFixed(1)
  const windDir = Number(spotForecasts[intervalIdx].wdir)


  return (
    <>
      <td className="py-2 text-center">{windSpeed} {unit}</td>
      <td className="py-2">
        <Arrow rotation={windDir}/> 
      </td>
    </>
  );
};

