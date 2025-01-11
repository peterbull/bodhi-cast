import Globe, { GlobeMethods } from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";

export function GlobeView() {
    return (
          <Globe
            // ref={globeEl}
            // height={globeSize.height}
            globeImageUrl={globeImageUrl}
            backgroundColor="rgb(15 23 42)"
            // onGlobeClick={handleGlobeClick}
          />
    )
}