import React, { useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import globeImageUrl from "../img/earth-blue-marble.jpg";
import globeSpecularMap from "../img/earth-water.png";
import globeEarthTopology from "../img/earth-topology.png";
import globeEarthNightSky from "../img/night-sky.png";
import { MeshPhongMaterial, TextureLoader, Color } from "three";

const globeMaterial = new MeshPhongMaterial();
globeMaterial.bumpScale = 10;
new TextureLoader().load(globeSpecularMap, (texture) => {
  globeMaterial.specularMap = texture;
  globeMaterial.specular = new Color("grey");
  globeMaterial.shininess = 15;
});

const GlobeSpots: React.FC<any> = ({
  setCurrentComponent,
  currentSpot,
  setCurrentSpot,
  spots,
}) => {
  const globeEl = useRef<any>();
  useEffect(() => {
    if (globeEl.current) {
      const directionalLight = globeEl.current
        .lights()
        .find((obj3d: any) => obj3d.type === "DirectionalLight");
      directionalLight && directionalLight.position.set(1, 1, 1); // change light position to see the specularMap's effect
    }
  }, []);

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
        globeMaterial={globeMaterial}
        globeImageUrl={globeImageUrl}
        bumpImageUrl={globeEarthTopology}
        backgroundImageUrl={globeEarthNightSky}
        labelsData={spots}
        labelLat="latitude"
        labelLng="longitude"
        labelText="spot_name"
        labelSize={0.0}
        labelDotRadius={0.1}
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
