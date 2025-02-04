import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import { useEffect, useRef } from 'react';
import { useGlobe } from "@/hooks/useGlobe";
import type { GlobeMethods } from 'react-globe.gl';

export function GlobeView() {
  const globeRef = useRef<GlobeMethods>(null!);
  const { setGlobeRef, height} = useGlobe();

  useEffect(() => {
    if (globeRef.current) {
      setGlobeRef(globeRef.current);
    }
      globeRef.current.pointOfView({lat: 31, lng: -76, altitude: 1.6})
      globeRef.current.controls().enableZoom = false;
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
  }, [setGlobeRef]);

  return (
    <Globe
      ref={globeRef}
      height={height}
      globeImageUrl={globeImageUrl}
      backgroundColor="rgb(15 23 42)"
    />
  );
}
