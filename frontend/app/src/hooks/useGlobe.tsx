
import { GlobeMethods } from 'react-globe.gl';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const GLOBE_KEY = 'globeRef';
const GLOBE_HEIGHT_KEY = 'globeHeight';

let globeRefValue: GlobeMethods | undefined;

export function useGlobe() {
  const queryClient = useQueryClient();

  const { data: height } = useQuery<number>({
    queryKey: [GLOBE_HEIGHT_KEY],
    queryFn: () => 500,
    staleTime: Infinity,
  });

  const setGlobeRef = (ref: GlobeMethods | undefined) => {
    globeRefValue = ref;
  };

  const setHeight = (newHeight: number) => {
    queryClient.setQueryData([GLOBE_HEIGHT_KEY], newHeight);
  };

  return { 
    globeRef: globeRefValue, 
    setGlobeRef,
    height,
    setHeight
  };
}