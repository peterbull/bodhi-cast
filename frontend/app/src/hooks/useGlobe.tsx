import { Spot } from '@/hooks/useSpots';
import { GlobeMethods } from 'react-globe.gl';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const GLOBE_KEY = 'globeRef';
const GLOBE_HEIGHT_KEY = 'globeHeight';

let globeRef: GlobeMethods | undefined;

export function useGlobe() {
  const queryClient = useQueryClient();

  const { data: height } = useQuery<number>({
    queryKey: [GLOBE_HEIGHT_KEY],
    queryFn: () => 500,
    staleTime: Infinity,
  });

  const setGlobeRef = (ref: GlobeMethods | undefined) => {
    globeRef = ref;
  };

  const setHeight = (newHeight: number) => {
    queryClient.setQueryData([GLOBE_HEIGHT_KEY], newHeight);
  };



 const globeZoom = (spot: Spot, altitude: number, ms: number) => {
    if (globeRef && spot) {
      globeRef.pointOfView(
        {
          lat: spot.latitude,
          lng: spot.longitude,
          altitude: altitude,
        },
        ms
      );
    }
  };

  return { 
    globeRef, 
    setGlobeRef,
    height,
    setHeight,
    globeZoom
  };
}