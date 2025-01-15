import { useSpotForecasts } from '@/hooks/useSpotForecasts';
import { useSpot } from '@/hooks/useSpots';
import { createFileRoute, useParams } from '@tanstack/react-router'
export const Route = createFileRoute('/spots/$spotId')({
  component: RouteComponent,
  
})

function RouteComponent() {
  const { spotId } = useParams({
        from: '/spots/$spotId',
  });
  const id = Number(spotId)
  const { spot } = useSpot(id)
  const { spotForecasts } = useSpotForecasts(spot);
  
  return <div>{`hello ${spot?.spot_name}, here are some ${JSON.stringify(spotForecasts[0])}`}</div>
}
