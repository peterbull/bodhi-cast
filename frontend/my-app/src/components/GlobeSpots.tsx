import React, { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import globeSpecularMap from "../img/earth-water.png";
import globeEarthTopology from "../img/earth-topology.png";
import globeEarthNightSky from "../img/night-sky.png";
import { MeshPhongMaterial, TextureLoader, Color } from "three";

const GlobeSpots: React.FC<any> = ({
  setCurrentComponent,
  currentSpot,
  setCurrentSpot,
  spots,
}) => {
  const globeEl = useRef<any>();

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({
        lat: currentSpot ? currentSpot.latitude : spots[0].latitude,
        lng: currentSpot ? currentSpot.longitude : spots[0].longitude,
        altitude: 1.8,
      });
    }
  });

  return spots.length > 0 ? (
    <>
      <Globe
        ref={globeEl}
        globeImageUrl={globeImageUrl}
        labelsData={spots}
        labelLat="latitude"
        labelLng="longitude"
        labelText="spot_name"
        labelSize={0.0}
        labelDotRadius={0.4}
        labelColor={() => "rgba(164, 255, 61, 0.5)"}
        labelLabel={(spot: any) =>
          `<div>
          <b>${spot.spot_name}</b>
        </div>`
        }
        onLabelClick={(label: any) => {
          globeEl.current.pointOfView(
            {
              lat: label.latitude,
              lng: label.longitude,
              altitude: 0.1,
            },
            2500
          );
          setCurrentSpot(spots.find((spot: any) => spot.id === label.id));
          setTimeout(() => {
            setCurrentComponent("SwellMap");
          }, 2500);
        }}
      />
    </>
  ) : (
    <p>Loading...</p>
  );
};

export default GlobeSpots;
