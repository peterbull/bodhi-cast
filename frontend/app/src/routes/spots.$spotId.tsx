import SwellSim from '@/components/SwellSim';
import { useSpotForecasts } from '@/hooks/useSpotForecasts';
import { useSpots } from '@/hooks/useSpots';
import { createFileRoute, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/spots/$spotId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { spotId } = useParams({
        from: '/spots/$spotId',
  });
  const id = Number(spotId)
  const { spot } = useSpots(id)
  const { spotForecasts } = useSpotForecasts(spot);
  
  return (
    <SwellSim />
  )
}
